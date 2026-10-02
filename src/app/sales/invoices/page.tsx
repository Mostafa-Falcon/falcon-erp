'use client';

import React, { useEffect, useMemo, useState } from'react';
import { Suspense } from'react';
import Link from'next/link';
import { useRouter } from 'next/navigation';
import { AppShell } from'@/components/layout/AppShell';
import { Button } from'@/components/ui/button';
import { Badge } from'@/components/ui/badge';
import { Input } from'@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { KpiCard } from '@/components/ui/kpi-card';
import { EmptyState } from '@/components/ui/empty-state';
import {
 Table,
 TableBody,
 TableCell,
 TableHead,
 TableHeader,
 TableRow,
} from'@/components/ui/table';
import {
 Select,
 SelectContent,
 SelectItem,
 SelectTrigger,
 SelectValue,
} from'@/components/ui/select';
import {
 DropdownMenu,
 DropdownMenuContent,
 DropdownMenuItem,
 DropdownMenuSeparator,
 DropdownMenuTrigger,
} from'@/components/ui/dropdown-menu';
import {
 Plus,
 History,
 Printer,
 FileText,
 FileSpreadsheet,
 SlidersHorizontal,
 Columns,
 ScanBarcode,
 MoreVertical,
 Eye,
 Edit3,
 Trash2,
 User,
 DollarSign,
 Receipt,
 Info,
 ChevronLeft,
 ShoppingBag,
 CheckCircle2,
 Clock,
 ChevronRight,
 ChevronsLeft,
 ChevronsRight,
 RotateCcw,
} from'lucide-react';
import { useSessionStore } from'@/core/state/useSessionStore';
import { SalesRepository } from'@/modules/sales/sales_repository';
import { db } from'@/core/db/app_database';
import { formatNumber } from'@/lib/format';
import type { Contact, Product, SalesInvoice, Treasury, Unit, Warehouse, User as UserType } from'@/types';
import { toast } from'sonner';
import { InvoiceDetailModal } from'@/components/sales/invoices/InvoiceDetailModal';
import { EditInvoiceModal } from'@/components/sales/invoices/EditInvoiceModal';
import { DeleteInvoiceDialog } from'@/components/sales/invoices/DeleteInvoiceDialog';

function InvoicesContent() {
 const router = useRouter();
 const { currentUser, activeBranchId } = useSessionStore();
 const orgId = currentUser?.org_id ||'';
 const branchId = activeBranchId || currentUser?.branch_id ||'';

 const [invoices, setInvoices] = useState<SalesInvoice[]>([]);
 const [products, setProducts] = useState<Product[]>([]);
 const [units, setUnits] = useState<Unit[]>([]);
 const [treasuries, setTreasuries] = useState<Treasury[]>([]);
 const [warehouses, setWarehouses] = useState<Warehouse[]>([]);
 const [customers, setCustomers] = useState<Contact[]>([]);
 const [users, setUsers] = useState<UserType[]>([]);
 const [isLoading, setIsLoading] = useState(true);

 // Filters
 const [search, setSearch] = useState('');
 const [datePeriod, setDatePeriod] = useState<string>('all');
 const [pageSize, setPageSize] = useState<number>(25);
 const [currentPage, setCurrentPage] = useState<number>(1);
 const [isArchiveMode, setIsArchiveMode] = useState<boolean>(false);

 // Modal States
 const [selectedInvoiceForDetail, setSelectedInvoiceForDetail] = useState<SalesInvoice | null>(null);
 const [selectedInvoiceForEdit, setSelectedInvoiceForEdit] = useState<SalesInvoice | null>(null);
 const [selectedInvoiceForDelete, setSelectedInvoiceForDelete] = useState<SalesInvoice | null>(null);

 const loadData = async () => {
 if (!orgId) return;
 try {
 setIsLoading(true);
 const [invList, prods, unts, tres, whs, custs, usrs] = await Promise.all([
 isArchiveMode
 ? SalesRepository.getDeletedSalesInvoices(orgId, branchId || undefined)
 : SalesRepository.getSalesInvoices(orgId, { branchId: branchId || undefined, includeDeleted: false }),
 db.products.where('org_id').equals(orgId).toArray(),
 db.units.where('org_id').equals(orgId).toArray(),
 db.treasuries.where('org_id').equals(orgId).toArray(),
 db.warehouses.where('org_id').equals(orgId).toArray(),
 db.contacts.where('org_id').equals(orgId).toArray(),
 db.users.where('org_id').equals(orgId).toArray(),
 ]);

 setInvoices(invList);
 setProducts(prods);
 setUnits(unts);
 setTreasuries(tres);
 setWarehouses(whs);
 setCustomers(custs);
 setUsers(usrs);
 } catch (err) {
 console.error(err);
 toast.error('حدث خطأ أثناء تحميل فواتير المبيعات');
 } finally {
 setIsLoading(false);
 }
 };

 useEffect(() => {
 loadData();
 }, [orgId, branchId, isArchiveMode]);

 // Helpers
 const getCustomerName = (customerId?: string | null) => {
 if (!customerId) return'زبون نقدي';
 const c = customers.find((x) => x.id === customerId);
 return c ? c.name :'زبون نقدي';
 };

 const getUserName = (userId?: string | null) => {
 if (!userId) return'المسؤول';
 const u = users.find((x) => x.id === userId);
 return u ? u.full_name || u.username :'المسؤول';
 };

 const formatInvoiceDate = (dateStr?: string) => {
 if (!dateStr) return'—';
 try {
 const d = new Date(dateStr);
 return d.toLocaleDateString('ar-EG', {
 year:'numeric',
 month:'2-digit',
 day:'2-digit',
 });
 } catch {
 return dateStr;
 }
 };

 // Filtered list
 const filteredInvoices = useMemo(() => {
 return invoices.filter((inv) => {
 // Date Filter
 if (datePeriod !=='all') {
 const invDate = new Date(inv.created_at || inv.invoice_date);
 const today = new Date();

 if (datePeriod ==='today') {
 if (invDate.toDateString() !== today.toDateString()) return false;
 } else if (datePeriod ==='yesterday') {
 const yest = new Date();
 yest.setDate(yest.getDate() - 1);
 if (invDate.toDateString() !== yest.toDateString()) return false;
 } else if (datePeriod ==='week') {
 const weekAgo = new Date();
 weekAgo.setDate(weekAgo.getDate() - 7);
 if (invDate < weekAgo) return false;
 } else if (datePeriod ==='month') {
 if (invDate.getMonth() !== today.getMonth() || invDate.getFullYear() !== today.getFullYear()) {
 return false;
 }
 }
 }

 // Search
 if (search.trim()) {
 const q = search.trim().toLowerCase();
 const numMatch = inv.invoice_number.toLowerCase().includes(q);
 const custMatch = getCustomerName(inv.customer_id).toLowerCase().includes(q);
 const userMatch = getUserName(inv.created_by).toLowerCase().includes(q);
 return numMatch || custMatch || userMatch;
 }

 return true;
 });
 }, [invoices, datePeriod, search, customers, users]);

 // Financial summary
 const { totalSales, paidSales, remainingSales } = useMemo(() => {
 let total = 0;
 let paid = 0;
 let remaining = 0;
 for (const inv of filteredInvoices) {
 total += inv.total || 0;
 paid += inv.paid_amount || 0;
 remaining += inv.remaining_amount || 0;
 }
 return { totalSales: total, paidSales: paid, remainingSales: remaining };
 }, [filteredInvoices]);

 // Pagination
 const totalPages = Math.max(1, Math.ceil(filteredInvoices.length / pageSize));
 const paginatedInvoices = useMemo(() => {
 const start = (currentPage - 1) * pageSize;
 return filteredInvoices.slice(start, start + pageSize);
 }, [filteredInvoices, currentPage, pageSize]);

 return (
 <AppShell
 title={isArchiveMode ? 'أرشيف فواتير المبيعات المحذوفة' : 'فواتير البيع'}
 subtitle="سجل فواتير المبيعات الصادرة، التحصيلات النقدية والآجلة، وتتبع المدفوعات"
 actions={
 <div className="flex items-center gap-2">
 <Link href="/sales/pos">
 <Button
 type="button"
 className="h-10 px-4 rounded-xl bg-primary hover:bg-primary/90 text-white font-bold text-xs flex items-center gap-1.5 shadow-xs hover:shadow-md transition-all cursor-pointer"
 >
 <Plus className="w-4 h-4"/>
 <span>فاتورة جديدة</span>
 </Button>
 </Link>
 <Button
 type="button"
 variant={isArchiveMode ? 'default' : 'outline'}
 onClick={() => {
 setIsArchiveMode(!isArchiveMode);
 setCurrentPage(1);
 }}
 className="h-10 px-3.5 rounded-xl font-bold text-xs flex items-center gap-1.5 shadow-xs transition-all cursor-pointer"
 >
 <History className="w-3.5 h-3.5 text-primary"/>
 <span>{isArchiveMode ? 'العودة للفواتير النشطة' : 'أرشيف المحذوفات'}</span>
 </Button>
 </div>
 }
 >
 <div className="space-y-5 select-none" dir="rtl">
 {/* KPI Cards — Unified Design System */}
 <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
 <KpiCard
 label="إجمالي الفواتير الصادرة"
 value={filteredInvoices.length}
 unit="فاتورة"
 variant="blue"
 icon={<Receipt className="w-5 h-5"/>}
 />
 <KpiCard
 label="إجمالي قيمة المبيعات"
 value={formatNumber(totalSales)}
 unit="ج.م"
 variant="indigo"
 icon={<ShoppingBag className="w-5 h-5"/>}
 />
 <KpiCard
 label="المحصل نقداً / تحويل"
 value={formatNumber(paidSales)}
 unit="ج.م"
 variant="emerald"
 icon={<CheckCircle2 className="w-5 h-5"/>}
 />
 <KpiCard
 label="المتبقي على العملاء (آجل)"
 value={formatNumber(remainingSales)}
 unit="ج.م"
 variant="amber"
 icon={<Clock className="w-5 h-5"/>}
 />
 </div>
 {/* Filter Bar */}
 <div className="flex flex-wrap items-center gap-3 justify-start">
 <Button
 type="button"
 variant="destructive"
 size="sm"
 onClick={() => {
 setSearch('');
 setDatePeriod('all');
 setCurrentPage(1);
 }}
 className="h-9 px-4 rounded-xl bg-rose-500 hover:bg-rose-600 text-white font-bold text-xs shadow-xs cursor-pointer flex items-center gap-1.5"
 >
 <RotateCcw className="w-3.5 h-3.5"/>
 <span>مسح الكل</span>
 </Button>

 <div className="flex items-center gap-2">
 <span className="text-xs font-bold text-slate-600 dark:text-slate-400">الفترة الزمنية:</span>
 <Select
 value={datePeriod}
 onValueChange={(val) => {
 setDatePeriod(val);
 setCurrentPage(1);
 }}
 >
 <SelectTrigger className="h-9 w-40 rounded-xl bg-surface border-slate-200 dark:border-slate-800 text-xs font-bold shadow-xs">
 <SelectValue placeholder="اختر الفترة"/>
 </SelectTrigger>
 <SelectContent>
 <SelectItem value="all">الكل 📅</SelectItem>
 <SelectItem value="today">اليوم</SelectItem>
 <SelectItem value="yesterday">أمس</SelectItem>
 <SelectItem value="week">آخر 7 أيام</SelectItem>
 <SelectItem value="month">هذا الشهر</SelectItem>
 </SelectContent>
 </Select>
 </div>
 </div>

 {/* Main Table Card */}
 <Card className="rounded-2xl border border-slate-200/90 dark:border-slate-800 shadow-xs bg-surface overflow-hidden">
 {/* Table Toolbar */}
 <div className="p-3.5 border-b border-slate-100 dark:border-slate-800/80 flex flex-wrap items-center justify-between gap-3">
 <div className="flex items-center gap-2">
 <Button
 type="button"
 variant="outline"
 size="icon"
 onClick={() => window.print()}
 title="طباعة"
 className="w-8 h-8 rounded-lg"
 >
 <Printer className="w-4 h-4 text-slate-600 dark:text-slate-300"/>
 </Button>

 <Button
 type="button"
 variant="outline"
 size="icon"
 onClick={() => toast.info('جاري تصدير PDF')}
 title="تصدير PDF"
 className="w-8 h-8 rounded-lg border-pink-200 dark:border-pink-900/50 text-pink-600 bg-pink-50/50 dark:bg-pink-950/40 hover:bg-pink-100"
 >
 <FileText className="w-4 h-4"/>
 </Button>

 <Button
 type="button"
 variant="outline"
 size="icon"
 onClick={() => toast.info('جاري تصدير Excel')}
 title="تصدير Excel"
 className="w-8 h-8 rounded-lg border-emerald-200 dark:border-emerald-900/50 text-emerald-600 bg-emerald-50/50 dark:bg-emerald-950/40 hover:bg-emerald-100"
 >
 <FileSpreadsheet className="w-4 h-4"/>
 </Button>

 <Button
 type="button"
 variant="outline"
 size="icon"
 title="خيارات العرض"
 className="w-8 h-8 rounded-lg"
 >
 <SlidersHorizontal className="w-4 h-4 text-slate-600 dark:text-slate-300"/>
 </Button>
 </div>

 <div className="flex flex-wrap items-center gap-3">
 <Button
 type="button"
 variant="outline"
 size="sm"
 onClick={() => toast.info('تخصيص الأعمدة متاح')}
 className="h-8 px-3 rounded-lg text-xs font-bold flex items-center gap-1.5"
 >
 <Columns className="w-3.5 h-3.5"/>
 <span>تخصيص الأعمدة</span>
 </Button>

 <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-600 dark:text-slate-400">
 <span>عرض</span>
 <Select
 value={String(pageSize)}
 onValueChange={(val) => {
 setPageSize(Number(val));
 setCurrentPage(1);
 }}
 >
 <SelectTrigger className="h-8 w-20 rounded-lg text-xs font-bold">
 <SelectValue />
 </SelectTrigger>
 <SelectContent>
 <SelectItem value="10">10</SelectItem>
 <SelectItem value="25">25</SelectItem>
 <SelectItem value="50">50</SelectItem>
 <SelectItem value="100">100</SelectItem>
 </SelectContent>
 </Select>
 <span>إدخالات</span>
 </div>

 {/* Fast search input */}
 <div className="relative flex items-center">
 <Input
 type="text"
 value={search}
 onChange={(e) => {
 setSearch(e.target.value);
 setCurrentPage(1);
 }}
 placeholder="بحث سريع في الجدول..."
 className="h-8 w-52 sm:w-64 pr-8 pl-12 rounded-lg text-xs font-semibold"
 />
 <ScanBarcode className="w-3.5 h-3.5 text-slate-400 absolute right-2.5 pointer-events-none"/>
 <Badge
 variant="secondary"
 className="absolute left-1.5 h-5 px-1.5 text-3xs font-mono font-bold bg-pink-50 dark:bg-pink-950/50 text-pink-600 border-pink-200 dark:border-pink-900/50"
 >
 {filteredInvoices.length}
 </Badge>
 </div>
 </div>
 </div>

 {/* Table Element */}
 {isLoading ? (
 <div className="py-20 text-center text-xs font-bold text-slate-400">
 جاري تحميل فواتير المبيعات...
 </div>
 ) : filteredInvoices.length === 0 ? (
  <div className="p-4">
    <EmptyState
      icon={<Receipt className="w-7 h-7 text-slate-400" />}
      title={isArchiveMode ? 'لا توجد فواتير محذوفة في الأرشيف' : 'لا توجد فواتير مبيعات مسجلة مطابقة للبحث'}
      description={isArchiveMode ? 'سجل الأرشيف نظيف ولا توجد أي فواتير تم حذفها.' : 'ابدأ بإنشاء أول فاتورة مبيعات عبر الكاشير أو نقطة البيع السريعة.'}
      action={!isArchiveMode ? {
        label: "فاتورة جديدة (POS)",
        icon: <Plus className="w-4 h-4" />,
        onClick: () => router.push('/sales/pos'),
      } : undefined}
    />
  </div>
) : (
 <div className="overflow-x-auto min-h-[350px]">
 <Table className="text-right text-xs">
 <TableHeader className="bg-slate-50/70 dark:bg-slate-900/50">
 <TableRow className="border-b border-slate-200/80 dark:border-slate-800">
 <TableHead className="text-right py-3 px-4 font-bold text-slate-600 dark:text-slate-300">
 رقم الفاتورة
 </TableHead>
 <TableHead className="text-right py-3 px-3 font-bold text-slate-600 dark:text-slate-300">
 العميل
 </TableHead>
 <TableHead className="text-right py-3 px-3 font-bold text-slate-600 dark:text-slate-300">
 التاريخ
 </TableHead>
 <TableHead className="text-right py-3 px-3 font-bold text-slate-600 dark:text-slate-300">
 طريقة الدفع
 </TableHead>
 <TableHead className="text-right py-3 px-3 font-bold text-slate-600 dark:text-slate-300">
 الإجمالي
 </TableHead>
 <TableHead className="text-right py-3 px-3 font-bold text-slate-600 dark:text-slate-300">
 بواسطة
 </TableHead>
 <TableHead className="text-center py-3 px-3 w-20 font-bold text-slate-600 dark:text-slate-300">
 الإجراءات
 </TableHead>
 </TableRow>
 </TableHeader>
 <TableBody className="divide-y divide-slate-100 dark:divide-slate-800/80 font-bold">
 {paginatedInvoices.map((inv) => (
 <TableRow
 key={inv.id}
 className="hover:bg-slate-50/70 dark:hover:bg-slate-800/40 transition-colors"
 >
 {/* رقم الفاتورة */}
 <TableCell className="py-3.5 px-4 font-mono font-black text-pink-600 dark:text-pink-400">
 {inv.invoice_number}
 </TableCell>

 {/* العميل */}
 <TableCell className="py-3.5 px-3">
 <div className="flex items-center gap-2">
 <div className="w-6 h-6 rounded-full bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 flex items-center justify-center shrink-0">
 <User className="w-3.5 h-3.5"/>
 </div>
 <span className="text-slate-800 dark:text-slate-200 font-bold">
 {getCustomerName(inv.customer_id)}
 </span>
 </div>
 </TableCell>

 {/* التاريخ */}
 <TableCell className="py-3.5 px-3 font-mono text-slate-600 dark:text-slate-400">
 {formatInvoiceDate(inv.created_at || inv.invoice_date)}
 </TableCell>

 {/* طريقة الدفع */}
 <TableCell className="py-3.5 px-3">
 <Badge
 variant="secondary"
 className={`text-3xs font-bold ${
 inv.payment_type ==='cash'
 ?'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800'
 : inv.payment_type ==='card'
 ?'bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-400 border border-blue-200 dark:border-blue-800'
 : inv.payment_type ==='split'
 ?'bg-purple-50 dark:bg-purple-950/40 text-purple-700 dark:text-purple-400 border border-purple-200 dark:border-purple-800'
 :'bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-400 border border-amber-200 dark:border-amber-800'
 }`}
 >
 {inv.payment_type ==='cash'
 ?'نقدي'
 : inv.payment_type ==='card'
 ?'بطاقة'
 : inv.payment_type ==='split'
 ?'سداد جزئي'
 :'آجل'}
 </Badge>
 </TableCell>

 {/* الإجمالي */}
 <TableCell className="py-3.5 px-3 font-mono font-black text-slate-900 dark:text-white">
 {formatNumber(inv.total)} ج.م
 </TableCell>

 {/* بواسطة */}
 <TableCell className="py-3.5 px-3 text-slate-700 dark:text-slate-300">
 {getUserName(inv.created_by)}
 </TableCell>

 {/* الإجراءات عبر DropdownMenu */}
 <TableCell className="py-3.5 px-3 text-center">
 <DropdownMenu>
 <DropdownMenuTrigger asChild>
 <Button
 variant="ghost"
 size="icon"
 className="w-8 h-8 rounded-lg text-slate-500 hover:text-slate-900 dark:hover:text-white cursor-pointer"
 >
 <MoreVertical className="w-4 h-4"/>
 </Button>
 </DropdownMenuTrigger>
 <DropdownMenuContent align="end"className="w-40 text-right">
 <DropdownMenuItem
 onClick={() => setSelectedInvoiceForDetail(inv)}
 className="cursor-pointer flex items-center justify-between font-bold"
 >
 <span>عرض التفاصيل</span>
 <Eye className="w-4 h-4 text-pink-600"/>
 </DropdownMenuItem>

 {!inv.is_deleted && inv.status !=='cancelled'&& (
 <DropdownMenuItem
 onClick={() => setSelectedInvoiceForEdit(inv)}
 className="cursor-pointer flex items-center justify-between font-bold"
 >
 <span>تعديل</span>
 <Edit3 className="w-4 h-4 text-blue-600"/>
 </DropdownMenuItem>
 )}

 {!inv.is_deleted && inv.status !=='cancelled'&& (
 <>
 <DropdownMenuSeparator />
 <DropdownMenuItem
 onClick={() => setSelectedInvoiceForDelete(inv)}
 className="cursor-pointer flex items-center justify-between font-bold text-rose-600 focus:text-rose-600 focus:bg-rose-50 dark:focus:bg-rose-950/40"
 >
 <span>حذف الفاتورة</span>
 <Trash2 className="w-4 h-4 text-rose-600"/>
 </DropdownMenuItem>
 </>
 )}
 </DropdownMenuContent>
 </DropdownMenu>
 </TableCell>
 </TableRow>
 ))}
 </TableBody>
 </Table>
 </div>
 )}

 {/* Table Footer Pagination */}
 <div className="p-3.5 border-t border-slate-100 dark:border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs font-semibold text-slate-500 dark:text-slate-400">
 <div className="flex items-center gap-1.5">
 <Info className="w-3.5 h-3.5 text-slate-400"/>
 <span>
 عرض {filteredInvoices.length === 0 ? 0 : (currentPage - 1) * pageSize + 1} إلى{''}
 {Math.min(currentPage * pageSize, filteredInvoices.length)} من إجمالي {filteredInvoices.length} فاتورة مبيعات
 </span>
 </div>

 <div className="flex items-center gap-1">
 <Button
 variant="outline"
 size="icon"
 disabled={currentPage === 1}
 onClick={() => setCurrentPage(1)}
 className="w-8 h-8 rounded-lg cursor-pointer"
 title="الصفحة الأولى"
 >
 <ChevronsRight className="w-4 h-4"/>
 </Button>
 <Button
 variant="outline"
 size="icon"
 disabled={currentPage === 1}
 onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
 className="w-8 h-8 rounded-lg cursor-pointer"
 title="السابق"
 >
 <ChevronRight className="w-4 h-4"/>
 </Button>
 <Badge
 variant="secondary"
 className="px-3 h-8 flex items-center justify-center rounded-lg bg-pink-50 dark:bg-pink-950/40 border border-pink-200 dark:border-pink-900/50 text-pink-600 font-bold font-mono"
 >
 {currentPage} / {totalPages}
 </Badge>
 <Button
 variant="outline"
 size="icon"
 disabled={currentPage >= totalPages}
 onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
 className="w-8 h-8 rounded-lg cursor-pointer"
 title="التالي"
 >
 <ChevronLeft className="w-4 h-4"/>
 </Button>
 <Button
 variant="outline"
 size="icon"
 disabled={currentPage >= totalPages}
 onClick={() => setCurrentPage(totalPages)}
 className="w-8 h-8 rounded-lg cursor-pointer"
 title="الصفحة الأخيرة"
 >
 <ChevronsLeft className="w-4 h-4"/>
 </Button>
 </div>
 </div>
 </Card>

 {/* Modals */}
 <InvoiceDetailModal
 invoice={selectedInvoiceForDetail}
 isOpen={Boolean(selectedInvoiceForDetail)}
 onClose={() => setSelectedInvoiceForDetail(null)}
 products={products}
 units={units}
 customers={customers}
 treasuries={treasuries}
 users={users}
 warehouses={warehouses}
 />

 <EditInvoiceModal
 invoice={selectedInvoiceForEdit}
 isOpen={Boolean(selectedInvoiceForEdit)}
 onClose={() => setSelectedInvoiceForEdit(null)}
 currentUser={currentUser}
 products={products}
 units={units}
 customers={customers}
 onUpdated={() => loadData()}
 />

 <DeleteInvoiceDialog
 invoice={selectedInvoiceForDelete}
 isOpen={Boolean(selectedInvoiceForDelete)}
 onClose={() => setSelectedInvoiceForDelete(null)}
 currentUser={currentUser}
 onDeleted={() => loadData()}
 />
 </div>
 </AppShell>
 );
}

export default function InvoicesPage() {
 return (
 <Suspense fallback={<div />}>
 <InvoicesContent />
 </Suspense>
 );
}