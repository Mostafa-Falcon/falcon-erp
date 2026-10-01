'use client';

import React, { useEffect, useMemo, useState, Suspense } from'react';
import Link from'next/link';
import { AppShell } from'@/components/layout/AppShell';
import { Button } from'@/components/ui/button';
import { Badge } from'@/components/ui/badge';
import { Input } from'@/components/ui/input';
import { Card, CardContent } from'@/components/ui/card';
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
 Dialog,
 DialogContent,
 DialogHeader,
 DialogTitle,
} from'@/components/ui/dialog';
import {
 Plus,
 Search,
 FileText,
 Printer,
 CheckCircle,
 XCircle,
 Eye,
 Clock,
 Building2,
 DollarSign,
} from'lucide-react';
import { useSessionStore } from'@/core/state/useSessionStore';
import { QuotationsRepository } from'@/modules/sales/quotations_repository';
import { formatNumber } from'@/lib/format';
import type { Quotation, QuotationItem, QuotationStatus } from'@/types';
import { toast } from'sonner';

function QuotesContent() {
 const { currentUser } = useSessionStore();
 const orgId = currentUser?.org_id ||'';

 const [quotations, setQuotations] = useState<Quotation[]>([]);
 const [isLoading, setIsLoading] = useState(true);
 const [search, setSearch] = useState('');
 const [statusFilter, setStatusFilter] = useState<string>('all');

 // Detail Modal
 const [selectedQuote, setSelectedQuote] = useState<Quotation | null>(null);
 const [selectedItems, setSelectedItems] = useState<QuotationItem[]>([]);
 const [isDetailOpen, setIsDetailOpen] = useState(false);

 const loadData = async () => {
 if (!orgId) return;
 try {
 setIsLoading(true);
 const list = await QuotationsRepository.getQuotations(orgId);
 setQuotations(list);
 } catch (err) {
 console.error(err);
 toast.error('حدث خطأ أثناء تحميل عروض الأسعار');
 } finally {
 setIsLoading(false);
 }
 };

 useEffect(() => {
 loadData();
 }, [orgId]);

 const filteredQuotations = useMemo(() => {
 return quotations.filter((q) => {
 const matchSearch =
 q.quotation_number.toLowerCase().includes(search.toLowerCase()) ||
 (q.customer_name && q.customer_name.toLowerCase().includes(search.toLowerCase()));
 const matchStatus = statusFilter ==='all'|| q.status === statusFilter;
 return matchSearch && matchStatus;
 });
 }, [quotations, search, statusFilter]);

 const stats = useMemo(() => {
 const totalCount = quotations.length;
 const pendingCount = quotations.filter((q) => q.status ==='pending').length;
 const acceptedCount = quotations.filter((q) => q.status ==='accepted').length;
 const totalValue = quotations.reduce((acc, q) => acc + q.total, 0);
 return { totalCount, pendingCount, acceptedCount, totalValue };
 }, [quotations]);

 const handleOpenDetail = async (q: Quotation) => {
 setSelectedQuote(q);
 setIsDetailOpen(true);
 try {
 const items = await QuotationsRepository.getQuotationItems(q.id);
 setSelectedItems(items);
 } catch (e) {
 console.error(e);
 toast.error('تعذر تحميل تفاصيل الأصناف');
 }
 };

 const handleStatusChange = async (id: string, status: QuotationStatus) => {
 try {
 await QuotationsRepository.updateStatus(id, status);
 toast.success('تم تحديث حالة عرض السعر بنجاح');
 loadData();
 if (selectedQuote && selectedQuote.id === id) {
 setSelectedQuote((prev) => (prev ? { ...prev, status } : null));
 }
 } catch (err) {
 console.error(err);
 toast.error('فشل تحديث حالة عرض السعر');
 }
 };

 const handleConvertToInvoice = async (quote: Quotation) => {
 if (!currentUser) return;
 try {
 const items = await QuotationsRepository.getQuotationItems(quote.id);
 if (!items || items.length === 0) {
 toast.error('لا توجد أصناف في عرض السعر هذا');
 return;
 }

 const { db } = await import('@/core/db/app_database');
 const { SalesRepository } = await import('@/modules/sales/sales_repository');
 const warehouse = (await db.warehouses.where('org_id').equals(orgId).first()) || { id: currentUser.branch_id ||'' };
 const treasury = (await db.treasuries.where('org_id').equals(orgId).first()) || { id:'' };

 const createdInvoice = await SalesRepository.createSalesInvoice({
 orgId,
 branchId: quote.branch_id || currentUser.branch_id ||'',
 warehouseId: warehouse.id,
 customerId: quote.customer_id || null,
 items: items.map((it) => ({
 productId: it.product_id,
 unitId: it.unit_id ||'',
 conversionFactor: it.conversion_factor || 1,
 quantity: it.quantity,
 unitPrice: it.unit_price,
 unitCost: it.unit_cost || 0,
 })),
 paymentType:'credit',
 treasuryId: treasury.id,
 userId: currentUser.id,
 notes:`تحويل تلقائي من عرض سعر #${quote.quotation_number}`,
 });

 await QuotationsRepository.updateStatus(quote.id,'accepted');
 toast.success(`تم تحويل عرض السعر #${quote.quotation_number} إلى فاتورة مبيعات #${createdInvoice.invoice_number} بنجاح!`);
 loadData();
 setIsDetailOpen(false);
 } catch (e: any) {
 console.error(e);
 toast.error(e?.message ||'فشل تحويل عرض السعر إلى فاتورة مبيعات');
 }
 };

 const getStatusBadge = (status: QuotationStatus) => {
 switch (status) {
 case'accepted':
 return <Badge className="bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-400">مقبول</Badge>;
 case'rejected':
 return <Badge className="bg-rose-100 text-rose-800 dark:bg-rose-950/60 dark:text-rose-400">مرفوض</Badge>;
 case'expired':
 return <Badge className="bg-slate-100 text-slate-800 dark:bg-slate-800 dark:text-slate-400">منتهي</Badge>;
 case'pending':
 default:
 return <Badge className="bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-400">قيد الانتظار</Badge>;
 }
 };

 return (
 <div className="p-6 space-y-6 max-w-[1600px] mx-auto">
 {/* Header */}
 <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
 <div>
 <h1 className="text-2xl font-black text-slate-900 dark:text-white flex items-center gap-2">
 <FileText className="w-7 h-7 text-primary"/>
 عروض الأسعار (Quotations)
 </h1>
 <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
 إدارة عروض الأسعار والتقديرات المقدمة للعملاء وتحويلها لفواتير
 </p>
 </div>
 <Link href="/sales/quotes/new">
 <Button className="bg-primary hover:bg-blue-700 text-white font-bold gap-2">
 <Plus className="w-4 h-4"/>
 إنشاء عرض سعر جديد
 </Button>
 </Link>
 </div>

 {/* Summary Cards */}
 <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
 <Card className="bg-surface border-slate-200 dark:border-slate-800 shadow-xs">
 <CardContent className="p-4 flex items-center justify-between">
 <div>
 <p className="text-xs font-bold text-slate-500">إجمالي عروض الأسعار</p>
 <p className="text-2xl font-black text-slate-900 dark:text-white mt-1">{stats.totalCount}</p>
 </div>
 <div className="w-10 h-10 rounded-xl bg-blue-50 dark:bg-blue-950/50 flex items-center justify-center text-primary">
 <FileText className="w-5 h-5"/>
 </div>
 </CardContent>
 </Card>

 <Card className="bg-surface border-slate-200 dark:border-slate-800 shadow-xs">
 <CardContent className="p-4 flex items-center justify-between">
 <div>
 <p className="text-xs font-bold text-slate-500">العروض المعلقة</p>
 <p className="text-2xl font-black text-amber-600 dark:text-amber-400 mt-1">{stats.pendingCount}</p>
 </div>
 <div className="w-10 h-10 rounded-xl bg-amber-50 dark:bg-amber-950/50 flex items-center justify-center text-amber-600">
 <Clock className="w-5 h-5"/>
 </div>
 </CardContent>
 </Card>

 <Card className="bg-surface border-slate-200 dark:border-slate-800 shadow-xs">
 <CardContent className="p-4 flex items-center justify-between">
 <div>
 <p className="text-xs font-bold text-slate-500">العروض المقبولة</p>
 <p className="text-2xl font-black text-emerald-600 dark:text-emerald-400 mt-1">{stats.acceptedCount}</p>
 </div>
 <div className="w-10 h-10 rounded-xl bg-emerald-50 dark:bg-emerald-950/50 flex items-center justify-center text-emerald-600">
 <CheckCircle className="w-5 h-5"/>
 </div>
 </CardContent>
 </Card>

 <Card className="bg-surface border-slate-200 dark:border-slate-800 shadow-xs">
 <CardContent className="p-4 flex items-center justify-between">
 <div>
 <p className="text-xs font-bold text-slate-500">القيمة الإجمالية</p>
 <p className="text-2xl font-black text-slate-900 dark:text-white mt-1">{formatNumber(stats.totalValue)} د.ع</p>
 </div>
 <div className="w-10 h-10 rounded-xl bg-purple-50 dark:bg-purple-950/50 flex items-center justify-center text-purple-600">
 <DollarSign className="w-5 h-5"/>
 </div>
 </CardContent>
 </Card>
 </div>

 {/* Filter Bar */}
 <Card className="bg-surface border-slate-200 dark:border-slate-800">
 <CardContent className="p-4 flex flex-col md:flex-row gap-4 items-center justify-between">
 <div className="relative flex-1 w-full">
 <Search className="w-4 h-4 absolute right-3 top-1/2 -translate-y-1/2 text-slate-400"/>
 <Input
 placeholder="البحث برقم عرض السعر أو اسم العميل..."
 value={search}
 onChange={(e) => setSearch(e.target.value)}
 className="pr-9 h-10 text-xs font-bold"
 />
 </div>

 <div className="flex items-center gap-3 w-full md:w-auto">
 <Select value={statusFilter} onValueChange={setStatusFilter}>
 <SelectTrigger className="w-[180px] h-10 text-xs font-bold">
 <SelectValue placeholder="حالة عرض السعر"/>
 </SelectTrigger>
 <SelectContent>
 <SelectItem value="all">كل الحالات</SelectItem>
 <SelectItem value="pending">قيد الانتظار</SelectItem>
 <SelectItem value="accepted">مقبول</SelectItem>
 <SelectItem value="rejected">مرفوض</SelectItem>
 <SelectItem value="expired">منتهي</SelectItem>
 </SelectContent>
 </Select>
 </div>
 </CardContent>
 </Card>

 {/* Table */}
 <Card className="bg-surface border-slate-200 dark:border-slate-800 overflow-hidden">
 <Table>
 <TableHeader className="bg-slate-50 dark:bg-slate-800/50">
 <TableRow>
 <TableHead className="text-right font-black">رقم عرض السعر</TableHead>
 <TableHead className="text-right font-black">العميل</TableHead>
 <TableHead className="text-right font-black">تاريخ الإنشاء</TableHead>
 <TableHead className="text-right font-black">صالح لغاية</TableHead>
 <TableHead className="text-right font-black">الإجمالي</TableHead>
 <TableHead className="text-center font-black">الحالة</TableHead>
 <TableHead className="text-center font-black">الإجراءات</TableHead>
 </TableRow>
 </TableHeader>
 <TableBody>
 {isLoading ? (
 <TableRow>
 <TableCell colSpan={7} className="text-center py-8 text-slate-500">
 جاري تحميل عروض الأسعار...
 </TableCell>
 </TableRow>
 ) : filteredQuotations.length === 0 ? (
 <TableRow>
 <TableCell colSpan={7} className="text-center py-8 text-slate-500 font-bold">
 لا توجد عروض أسعار مطابقة للبحث
 </TableCell>
 </TableRow>
 ) : (
 filteredQuotations.map((q) => (
 <TableRow key={q.id} className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40">
 <TableCell className="font-bold text-slate-900 dark:text-white">
 {q.quotation_number}
 </TableCell>
 <TableCell className="font-bold text-slate-700 dark:text-slate-300">
 {q.customer_name ||'عميل عام (نقدي)'}
 </TableCell>
 <TableCell className="text-xs text-slate-500">
 {new Date(q.created_at).toLocaleDateString('ar-EG')}
 </TableCell>
 <TableCell className="text-xs text-slate-500">
 {q.valid_until ? new Date(q.valid_until).toLocaleDateString('ar-EG') :'غير محدد'}
 </TableCell>
 <TableCell className="font-black text-slate-900 dark:text-white">
 {formatNumber(q.total)} د.ع
 </TableCell>
 <TableCell className="text-center">
 {getStatusBadge(q.status)}
 </TableCell>
 <TableCell className="text-center">
 <div className="flex items-center justify-center gap-1">
 <Button
 size="xs"
 variant="ghost"
 onClick={() => handleOpenDetail(q)}
 title="عرض التفاصيل"
 >
 <Eye className="w-4 h-4 text-slate-600 dark:text-slate-300"/>
 </Button>
 {q.status ==='pending'&& (
 <>
 <Button
 size="xs"
 variant="ghost"
 className="text-emerald-600 hover:text-emerald-700"
 onClick={() => handleStatusChange(q.id,'accepted')}
 title="قبول عرض السعر"
 >
 <CheckCircle className="w-4 h-4"/>
 </Button>
 <Button
 size="xs"
 variant="ghost"
 className="text-rose-600 hover:text-rose-700"
 onClick={() => handleStatusChange(q.id,'rejected')}
 title="رفض"
 >
 <XCircle className="w-4 h-4"/>
 </Button>
 </>
 )}
 </div>
 </TableCell>
 </TableRow>
 ))
 )}
 </TableBody>
 </Table>
 </Card>

 {/* Details Dialog */}
 <Dialog open={isDetailOpen} onOpenChange={setIsDetailOpen}>
 <DialogContent className="max-w-3xl">
 <DialogHeader>
 <DialogTitle className="flex items-center justify-between">
 <span>تفاصيل عرض السعر: {selectedQuote?.quotation_number}</span>
 {selectedQuote && getStatusBadge(selectedQuote.status)}
 </DialogTitle>
 </DialogHeader>

 {selectedQuote && (
 <div className="space-y-4">
 <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 bg-slate-50 dark:bg-slate-800/50 p-3 rounded-xl text-xs">
 <div>
 <span className="text-slate-500 font-bold block">العميل:</span>
 <span className="font-black text-slate-900 dark:text-white">{selectedQuote.customer_name ||'عميل عام'}</span>
 </div>
 <div>
 <span className="text-slate-500 font-bold block">التاريخ:</span>
 <span className="font-black text-slate-900 dark:text-white">{new Date(selectedQuote.created_at).toLocaleString('ar-EG')}</span>
 </div>
 <div>
 <span className="text-slate-500 font-bold block">صالح لغاية:</span>
 <span className="font-black text-slate-900 dark:text-white">{selectedQuote.valid_until ? new Date(selectedQuote.valid_until).toLocaleDateString('ar-EG') :'غير محدد'}</span>
 </div>
 </div>

 {/* Items Table */}
 <div className="border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden">
 <Table>
 <TableHeader className="bg-slate-100 dark:bg-slate-800">
 <TableRow>
 <TableHead className="text-right font-black">الصنف</TableHead>
 <TableHead className="text-center font-black">الكمية</TableHead>
 <TableHead className="text-right font-black">السعر</TableHead>
 <TableHead className="text-right font-black">الخصم</TableHead>
 <TableHead className="text-right font-black">الإجمالي</TableHead>
 </TableRow>
 </TableHeader>
 <TableBody>
 {selectedItems.map((item) => (
 <TableRow key={item.id}>
 <TableCell className="font-bold">{item.product_name}</TableCell>
 <TableCell className="text-center font-bold">{item.quantity}</TableCell>
 <TableCell>{formatNumber(item.unit_price)} د.ع</TableCell>
 <TableCell>{formatNumber(item.discount_amount)} د.ع</TableCell>
 <TableCell className="font-black">{formatNumber(item.total)} د.ع</TableCell>
 </TableRow>
 ))}
 </TableBody>
 </Table>
 </div>

 {/* Summary & Actions */}
 <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs border-t pt-3">
 <Button
 type="button"
 onClick={() => handleConvertToInvoice(selectedQuote)}
 className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs gap-1.5 cursor-pointer"
 >
 <CheckCircle className="w-4 h-4" />
 <span>تحويل إلى فاتورة مبيعات ومخصوم مخزنياً</span>
 </Button>

 <div className="flex flex-col items-end gap-1 font-semibold">
 <div className="flex justify-between w-60">
 <span className="text-slate-500">المجموع الفرعي:</span>
 <span className="font-mono">{formatNumber(selectedQuote.subtotal)} ج.م</span>
 </div>
 {selectedQuote.discount_amount > 0 && (
 <div className="flex justify-between w-60 text-rose-600">
 <span>إجمالي الخصم:</span>
 <span className="font-mono">-{formatNumber(selectedQuote.discount_amount)} ج.م</span>
 </div>
 )}
 <div className="flex justify-between w-60 text-base font-black border-t pt-1 text-primary">
 <span>الإجمالي النهائي:</span>
 <span className="font-mono text-emerald-600">{formatNumber(selectedQuote.total)} ج.م</span>
 </div>
 </div>
 </div>
 </div>
 )}
 </DialogContent>
 </Dialog>
 </div>
 );
}

export default function QuotesPage() {
 return (
 <AppShell>
 <Suspense fallback={<div className="p-8 text-center">جاري التحميل...</div>}>
 <QuotesContent />
 </Suspense>
 </AppShell>
 );
}