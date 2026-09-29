'use client';

import React, { useEffect, useMemo, useState } from'react';
import { Suspense } from'react';
import { useRouter, useSearchParams } from'next/navigation';
import { AppShell } from'@/components/layout/AppShell';
import { Button } from'@/components/ui/button';
import { Input } from'@/components/ui/input';
import {
 Users,
 Search,
 FilterX,
 FileDown,
 Printer,
 ChevronLeft,
 ChevronRight,
 Eye,
 Edit,
 X,
 Plus,
 Building2,
 Phone,
 Activity,
 UserCheck,
 Handshake,
 ArrowUpRight,
 ArrowDownLeft,
 RefreshCw,
 CheckCircle2,
 XCircle,
 SlidersHorizontal,
 Wallet,
 Scale
} from'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from'@/components/ui/select';
import {
 Table,
 TableBody,
 TableCell,
 TableHead,
 TableHeader,
 TableRow,
} from'@/components/ui/table';
import { Card, CardContent } from'@/components/ui/card';
import { Badge } from'@/components/ui/badge';
import {
 Dialog,
 DialogContent,
 DialogHeader,
 DialogTitle,
} from'@/components/ui/dialog';
import { useSessionStore } from'@/core/state/useSessionStore';
import { ContactsRepository } from'@/modules/contacts/contacts_repository';
import { formatNumber } from'@/lib/format';
import { cn } from'@/lib/utils';
import type { Contact } from'@/types';

export type DirectoryKind ='customer'|'supplier'|'both';

const META: Record<DirectoryKind, {
 title: string;
 subtitle: string;
 gridLabel: string;
 countLabel: string;
 balanceLabel: string;
 addUrl: string;
 addLabel: string;
 badgeLabel: string;
 themeColor:'blue'|'emerald'|'purple';
}> = {
 customer: {
 title:'دليل العملاء',
 subtitle:'إدارة قاعدة بيانات العملاء، متابعة الأرصدة المستحقة، وحدود الائتمان وكشوفات الحساب.',
 gridLabel:'العملاء',
 countLabel:'إجمالي العملاء',
 balanceLabel:'مستحقات على العملاء',
 addUrl:'/contacts/customers/new',
 addLabel:'إضافة عميل جديد',
 badgeLabel:'عميل',
 themeColor:'blue',
 },
 supplier: {
 title:'دليل الموردين',
 subtitle:'إدارة شبكة الموردين، الأرصدة الدائنة، متابعة الفواتير ومستحقات الشراء.',
 gridLabel:'الموردون',
 countLabel:'إجمالي الموردين',
 balanceLabel:'مستحقات للموردين',
 addUrl:'/contacts/suppliers/new',
 addLabel:'إضافة مورد جديد',
 badgeLabel:'مورد',
 themeColor:'emerald',
 },
 both: {
 title:'الموردين والعملاء (حسابات مزدوجة)',
 subtitle:'إدارة جهات التعامل التي تعمل كمورد وعميل في آن واحد مع دمج ومقاصة الأرصدة.',
 gridLabel:'مورد / عميل',
 countLabel:'إجمالي الحسابات المزدوجة',
 balanceLabel:'صافي الأرصدة',
 addUrl:'/contacts/both/new',
 addLabel:'إضافة حساب مزدوج',
 badgeLabel:'حساب مزدوج',
 themeColor:'purple',
 },
};

export function ContactsDirectory({ kind }: { kind: DirectoryKind }) {
 return (
 <Suspense fallback={<div className="p-8 text-center text-xs font-bold text-slate-400">جاري التحميل...</div>}>
 <DirectoryContent kind={kind} />
 </Suspense>
 );
}

function DirectoryContent({ kind }: { kind: DirectoryKind }) {
 const meta = META[kind];
 const router = useRouter();
 const searchParams = useSearchParams();
 const detailId = searchParams.get('id');
 const { currentUser } = useSessionStore();
 const orgId = currentUser?.org_id ||'';

 const [contacts, setContacts] = useState<Contact[]>([]);
 const [detailContact, setDetailContact] = useState<Contact | null>(null);
 const [statement, setStatement] = useState<
 { id: string; reference_type: string; reference_id: string; debit: number; credit: number; balance_after: number; notes?: string; created_at: string }[]
 >([]);
 const [invoices, setInvoices] = useState<
 { id: string; number: string; date: string; total: number; paid: number; remaining: number; status: string }[]
 >([]);
 
 // Filters and Pagination
 const [searchQuery, setSearchQuery] = useState('');
 const [balanceFilter, setBalanceFilter] = useState<'all'|'debit'|'credit'|'zero'>('all');
 const [statusFilter, setStatusFilter] = useState<'all'|'active'|'inactive'>('all');
 const [pageSize, setPageSize] = useState('25');
 const [currentPage, setCurrentPage] = useState(1);
 const [isLoading, setIsLoading] = useState(true);
 const [detailLoading, setDetailLoading] = useState(false);

 const loadData = async () => {
 if (!orgId) return;
 try {
 setIsLoading(true);
 const list = await ContactsRepository.getContacts(orgId, kind);
 setContacts(list);
 } catch (err) {
 console.error('Load contacts error:', err);
 } finally {
 setIsLoading(false);
 }
 };

 useEffect(() => {
 loadData();
 }, [orgId, kind]);

 useEffect(() => {
 if (!detailId || !orgId) return;
 const loadDetail = async () => {
 setDetailLoading(true);
 try {
 const { db } = await import('@/core/db/app_database');
 const contact = await ContactsRepository.getById(detailId);
 if (contact && contact.org_id === orgId) {
 const stmt = await ContactsRepository.getStatement(detailId);
 setStatement(stmt);
 let inv: typeof invoices = [];
 if (contact.type === kind || contact.type ==='both') {
 if (kind ==='customer') {
 inv = (await db.sales_invoices.where('customer_id').equals(detailId).toArray()).map((i) => ({
 id: i.id,
 number: i.invoice_number,
 date: i.invoice_date,
 total: i.total,
 paid: i.paid_amount,
 remaining: i.remaining_amount,
 status: i.status,
 }));
 } else {
 inv = (await db.purchase_invoices.where('supplier_id').equals(detailId).toArray()).map((i) => ({
 id: i.id,
 number: i.system_invoice_number,
 date: i.invoice_date,
 total: i.total,
 paid: i.paid_amount,
 remaining: i.remaining_amount,
 status: i.status,
 }));
 }
 }
 setDetailContact(contact);
 setInvoices(inv);
 } else {
 setDetailContact(null);
 }
 } catch (err) {
 console.error('Load contact detail error:', err);
 } finally {
 setDetailLoading(false);
 }
 };
 loadDetail();
 }, [detailId, orgId, kind]);

 // Reset pagination when search or filters change
 useEffect(() => {
 setCurrentPage(1);
 }, [searchQuery, balanceFilter, statusFilter, pageSize]);

 const filtered = useMemo(() => {
 const q = searchQuery.trim().toLowerCase();
 return [...contacts]
 .filter((c) => {
 // Search filter
 if (q) {
 const nameMatch = (c.name ||'').toLowerCase().includes(q);
 const codeMatch = (c.code ||'').toLowerCase().includes(q);
 const phoneMatch = (c.phone ||'').toLowerCase().includes(q) || (c.mobile ||'').toLowerCase().includes(q);
 if (!nameMatch && !codeMatch && !phoneMatch) return false;
 }
 // Balance filter
 if (balanceFilter ==='debit'&& c.current_balance <= 0) return false;
 if (balanceFilter ==='credit'&& c.current_balance >= 0) return false;
 if (balanceFilter ==='zero'&& c.current_balance !== 0) return false;
 // Status filter
 if (statusFilter ==='active'&& !c.is_active) return false;
 if (statusFilter ==='inactive'&& c.is_active) return false;

 return true;
 })
 .sort((a, b) => a.name.localeCompare(b.name,'ar'));
 }, [contacts, searchQuery, balanceFilter, statusFilter]);

 // Totals for KPIs
 const totals = useMemo(() => {
 let debitSum = 0;
 let creditSum = 0;
 let debitCount = 0;
 let activeCount = 0;
 for (const c of contacts) {
 if (c.current_balance > 0) {
 debitSum += c.current_balance;
 debitCount += 1;
 } else if (c.current_balance < 0) {
 creditSum += Math.abs(c.current_balance);
 }
 if (c.is_active) activeCount += 1;
 }
 return { debitSum, creditSum, debitCount, activeCount, totalBalance: debitSum - creditSum };
 }, [contacts]);

 // Pagination calculation
 const pSize = Number(pageSize) || 25;
 const totalPages = Math.max(1, Math.ceil(filtered.length / pSize));
 const currentPageSafe = Math.min(currentPage, totalPages);
 const paginatedContacts = useMemo(() => {
 const start = (currentPageSafe - 1) * pSize;
 return filtered.slice(start, start + pSize);
 }, [filtered, currentPageSafe, pSize]);

 const hasActiveFilters = searchQuery !==''|| balanceFilter !=='all'|| statusFilter !=='all';

 const resetFilters = () => {
 setSearchQuery('');
 setBalanceFilter('all');
 setStatusFilter('all');
 };

 const handleExportCSV = () => {
 if (filtered.length === 0) return;
 const headers = ['اسم الجهة','الكود','نوع الحساب','الهاتف','الموبايل','الحد الائتماني','الرصيد الحالي','الحالة'];
 const rows = filtered.map((c) => [
`"${(c.name ||'').replace(/"/g,'""')}"`,
`"${c.code ||''}"`,
`"${c.type ==='both'?'عميل ومورد': c.type ==='customer'?'عميل':'مورد'}"`,
`"${c.phone ||''}"`,
`"${c.mobile ||''}"`,
 c.credit_limit || 0,
 c.current_balance || 0,
 c.is_active ?'نشط':'معطل',
 ]);
 const csvContent ='\uFEFF'+ [headers.join(','), ...rows.map((r) => r.join(','))].join('\r\n');
 const blob = new Blob([csvContent], { type:'text/csv;charset=utf-8;'});
 const url = URL.createObjectURL(blob);
 const a = document.createElement('a');
 a.href = url;
 a.download =`contacts_${kind}_${new Date().toISOString().slice(0, 10)}.csv`;
 a.click();
 URL.revokeObjectURL(url);
 };

 const handlePrint = () => {
 window.print();
 };

 const closeDetail = () => {
 if (kind ==='both') router.push('/contacts/both');
 else if (kind ==='customer') router.push('/contacts/customers');
 else router.push('/contacts/suppliers');
 };

 return (
 <AppShell
 title={meta.title}
 subtitle={meta.subtitle}
 actions={
 <Button
 onClick={() => router.push(meta.addUrl)}
 className="h-11 px-5 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white rounded-xl font-bold text-xs gap-2 shadow-md shadow-blue-500/20 transition-all active:scale-95 cursor-pointer"
 >
 <Plus className="w-4 h-4"/>
 <span>{meta.addLabel}</span>
 </Button>
 }
 >
 <div className="space-y-5 text-right"dir="rtl">

 {/* 1. KPIs Cards Section */}
 <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
 {kind ==='both'? (
 <>
 <StatCard
 label="إجمالي الحسابات"
 value={contacts.length}
 icon={<Handshake className="w-5 h-5 text-blue-600 dark:text-blue-400"/>}
 color="blue"
 subLabel="حساب مورد وعميل مسجل"
 isNumber
 />
 <StatCard
 label="إجمالي مديونية الموردين"
 value={totals.creditSum}
 icon={<ArrowUpRight className="w-5 h-5 text-rose-600 dark:text-rose-400"/>}
 color="rose"
 subLabel="مستحق سداده للجهات"
 />
 <StatCard
 label="إجمالي مستحقات العملاء"
 value={totals.debitSum}
 icon={<ArrowDownLeft className="w-5 h-5 text-emerald-600 dark:text-emerald-400"/>}
 color="emerald"
 subLabel="مستحق تحصيله من الجهات"
 />
 <StatCard
 label="الحسابات النشطة"
 value={totals.activeCount}
 icon={<UserCheck className="w-5 h-5 text-amber-600 dark:text-amber-400"/>}
 color="amber"
 subLabel={`من إجمالي ${contacts.length} حساب`}
 isNumber
 />
 </>
 ) : (
 <>
 <StatCard
 label={meta.countLabel}
 value={contacts.length}
 icon={<Users className="w-5 h-5 text-blue-600 dark:text-blue-400"/>}
 color="blue"
 subLabel="إجمالي السجلات بالدليل"
 isNumber
 />
 <StatCard
 label="جهات نشطة للتعامل"
 value={totals.activeCount}
 icon={<UserCheck className="w-5 h-5 text-emerald-600 dark:text-emerald-400"/>}
 color="emerald"
 subLabel={`من إجمالي ${contacts.length} جهة`}
 isNumber
 />
 <StatCard
 label={kind ==='customer'?'مستحقات العملاء (لنا)':'مستحقات الموردين (علينا)'}
 value={kind ==='customer'? totals.debitSum : totals.creditSum}
 icon={<Wallet className="w-5 h-5 text-indigo-600 dark:text-indigo-400"/>}
 color="indigo"
 subLabel="إجمالي الرصيد المالي القائم"
 />
 <StatCard
 label={kind ==='customer'?'عملاء مدينون':'موردون دائنون'}
 value={totals.debitCount}
 icon={<Scale className="w-5 h-5 text-rose-600 dark:text-rose-400"/>}
 color="rose"
 subLabel="حسابات ذات أرصدة غير صفرية"
 isNumber
 />
 </>
 )}
 </div>

 {/* 2. Main Unified Content Card (Toolbar + Table + Pagination) */}
 <div className="bg-surface rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-sm overflow-hidden">

 {/* Unified Toolbar */}
 <div className="p-4 border-b border-slate-100 dark:border-slate-800/80 flex flex-col md:flex-row md:items-center justify-between gap-3 bg-slate-50/40 dark:bg-slate-900/30">
 
 {/* Right: Search & Filters */}
 <div className="flex flex-wrap items-center gap-2.5 flex-1">
 {/* Search Box */}
 <div className="relative flex-1 min-w-[220px] max-w-sm">
 <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none"/>
 <Input
 value={searchQuery}
 onChange={(e) => setSearchQuery(e.target.value)}
 placeholder="بحث بالاسم، الكود، أو الهاتف..."
 className="h-10 pr-9 pl-8 bg-surface border-slate-200 dark:border-slate-800 rounded-xl text-xs font-bold transition-all focus:ring-2 focus:ring-blue-500/20"
 />
 {searchQuery && (
 <button
 onClick={() => setSearchQuery('')}
 className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-0.5"
 title="مسح البحث"
 >
 <X className="w-3.5 h-3.5"/>
 </button>
 )}
 </div>

 {/* Balance Filter */}
 <div className="w-36">
 <Select value={balanceFilter} onValueChange={(v: any) => setBalanceFilter(v)}>
 <SelectTrigger className="w-full h-10 rounded-xl bg-surface border-slate-200 dark:border-slate-800 text-xs font-bold">
 <SelectValue placeholder="حالة الرصيد"/>
 </SelectTrigger>
 <SelectContent className="text-right"dir="rtl">
 <SelectItem value="all">كل الأرصدة</SelectItem>
 <SelectItem value="debit">مدين (لنا مستحقات)</SelectItem>
 <SelectItem value="credit">دائن (علينا مديونية)</SelectItem>
 <SelectItem value="zero">متزن (رصيد صفر)</SelectItem>
 </SelectContent>
 </Select>
 </div>

 {/* Status Filter */}
 <div className="w-32">
 <Select value={statusFilter} onValueChange={(v: any) => setStatusFilter(v)}>
 <SelectTrigger className="w-full h-10 rounded-xl bg-surface border-slate-200 dark:border-slate-800 text-xs font-bold">
 <SelectValue placeholder="الحالة"/>
 </SelectTrigger>
 <SelectContent className="text-right"dir="rtl">
 <SelectItem value="all">كل الحالات</SelectItem>
 <SelectItem value="active">نشط فقط</SelectItem>
 <SelectItem value="inactive">معطل فقط</SelectItem>
 </SelectContent>
 </Select>
 </div>

 {/* Reset Filters */}
 {hasActiveFilters && (
 <Button
 variant="ghost"
 onClick={resetFilters}
 className="h-10 text-rose-500 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/20 text-xs font-bold gap-1 rounded-xl px-2.5"
 >
 <FilterX className="w-3.5 h-3.5"/> مسح الفلاتر
 </Button>
 )}
 </div>

 {/* Left: Actions (Export, Print, Refresh, Rows Count) */}
 <div className="flex items-center gap-2 self-end md:self-auto shrink-0">
 <Button
 variant="outline"
 onClick={handleExportCSV}
 title="تصدير إلى ملف Excel (CSV)"
 className="h-10 border-slate-200 dark:border-slate-800 text-xs font-bold gap-1.5 rounded-xl bg-surface hover:bg-slate-50 text-slate-700 dark:text-slate-200"
 >
 <FileDown className="w-4 h-4 text-emerald-600"/>
 <span className="hidden sm:inline">تصدير</span>
 </Button>

 <Button
 variant="outline"
 onClick={handlePrint}
 title="طباعة الدليل"
 className="h-10 w-10 p-0 border-slate-200 dark:border-slate-800 rounded-xl bg-surface hover:bg-slate-50 text-slate-600 dark:text-slate-300"
 >
 <Printer className="w-4 h-4"/>
 </Button>

 <Button
 variant="outline"
 onClick={loadData}
 title="تحديث البيانات"
 className={cn(
"h-10 w-10 p-0 border-slate-200 dark:border-slate-800 rounded-xl bg-surface hover:bg-slate-50 text-slate-600 dark:text-slate-300",
 isLoading &&"animate-spin text-blue-600"
 )}
 >
 <RefreshCw className="w-4 h-4"/>
 </Button>

 <div className="h-6 w-px bg-slate-200 dark:bg-slate-800 mx-1"/>

 {/* Rows Count Badge */}
 <div className="text-xs font-bold text-slate-500 bg-slate-100 dark:bg-slate-800/70 px-2.5 py-1.5 rounded-lg whitespace-nowrap">
 النتائج: <span className="text-blue-600 dark:text-blue-400 font-black">{filtered.length}</span>
 </div>
 </div>

 </div>

 {/* Directory Table */}
 <div className="overflow-x-auto">
 <Table className="w-full text-right">
 <TableHeader className="bg-slate-50/70 dark:bg-slate-900/50">
 <TableRow>
 <TableHead className="py-3.5 px-5 text-xs font-black">اسم الجهة</TableHead>
 <TableHead className="py-3.5 px-4 w-28 text-xs font-black">الكود</TableHead>
 <TableHead className="py-3.5 px-4 text-xs font-black">الهاتف والتواصل</TableHead>
 <TableHead className="py-3.5 px-4 text-left text-xs font-black">حد الائتمان</TableHead>
 <TableHead className="py-3.5 px-4 text-left text-xs font-black">الرصيد الحالي</TableHead>
 <TableHead className="py-3.5 px-4 text-center w-24 text-xs font-black">الحالة</TableHead>
 <TableHead className="py-3.5 px-5 text-center w-28 text-xs font-black">إجراءات</TableHead>
 </TableRow>
 </TableHeader>
 <TableBody>
 {isLoading ? (
 <TableRow>
 <TableCell colSpan={7} className="py-16 text-center text-muted-foreground font-bold">
 <div className="flex flex-col items-center justify-center gap-2">
 <RefreshCw className="w-6 h-6 animate-spin text-primary"/>
 <span>جاري تحميل البيانات...</span>
 </div>
 </TableCell>
 </TableRow>
 ) : filtered.length === 0 ? (
 <TableRow>
 <TableCell colSpan={7} className="py-16 text-center">
 <div className="max-w-sm mx-auto flex flex-col items-center justify-center">
 <div className="w-16 h-16 rounded-2xl bg-muted flex items-center justify-center text-muted-foreground mb-3">
 <Building2 className="w-8 h-8 opacity-70"/>
 </div>
 <h4 className="text-sm font-black text-foreground mb-1">
 {hasActiveFilters ?'لا توجد نتائج مطابقة للبحث':'لا توجد جهات مسجلة بعد'}
 </h4>
 <p className="text-xs text-muted-foreground mb-4 text-center">
 {hasActiveFilters
 ?'جرب تعديل كلمات البحث أو مسح الفلاتر لعرض كافة البيانات.'
 :'ابدأ بإضافة أول جهة تعامل لمتابعة الحسابات والأرصدة بكل سهولة.'}
 </p>
 {hasActiveFilters ? (
 <Button
 variant="outline"
 onClick={resetFilters}
 className="h-9 text-xs font-bold rounded-xl gap-1.5"
 >
 <FilterX className="w-3.5 h-3.5"/> مسح الفلاتر
 </Button>
 ) : (
 <Button
 onClick={() => router.push(meta.addUrl)}
 className="h-9 px-4 bg-primary hover:bg-primary/90 text-primary-foreground text-xs font-bold rounded-xl gap-1.5"
 >
 <Plus className="w-4 h-4"/> {meta.addLabel}
 </Button>
 )}
 </div>
 </TableCell>
 </TableRow>
 ) : (
 paginatedContacts.map((c) => {
 const isDebit = c.current_balance > 0;
 const isCredit = c.current_balance < 0;
 const isZero = c.current_balance === 0;

 return (
 <TableRow
 key={c.id}
 className={cn(
"hover:bg-muted/40 transition-colors group",
 !c.is_active &&"opacity-60 bg-muted/20"
 )}
 >
 {/* Name & Avatar */}
 <TableCell className="py-3.5 px-5">
 <div className="flex items-center gap-3">
 <div
 className={cn(
"w-9 h-9 rounded-xl flex items-center justify-center text-xs font-black shrink-0 shadow-xs",
 c.type ==='both'
 ?"bg-purple-100 text-purple-700 dark:bg-purple-950/50 dark:text-purple-300"
 : kind ==='customer'
 ?"bg-blue-100 text-blue-700 dark:bg-blue-950/50 dark:text-blue-300"
 :"bg-emerald-100 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300"
 )}
 >
 {(c.name ||'—').charAt(0)}
 </div>
 <div className="flex flex-col">
 <span className="font-black text-foreground group-hover:text-primary transition-colors">
 {c.name}
 </span>
 {c.type ==='both'&& kind !=='both'&& (
 <span className="text-4xs font-black text-purple-600 dark:text-purple-400 mt-0.5">
 عميل ومورد معاً
 </span>
 )}
 </div>
 </div>
 </TableCell>

 {/* Code */}
 <TableCell className="py-3.5 px-4">
 <span className="inline-block px-2 py-0.5 rounded-md bg-muted text-muted-foreground font-mono text-2xs font-bold">
 {c.code ||'—'}
 </span>
 </TableCell>

 {/* Phone */}
 <TableCell className="py-3.5 px-4">
 {c.phone || c.mobile ? (
 <a
 href={`tel:${c.phone || c.mobile}`}
 className="inline-flex items-center gap-1.5 text-muted-foreground hover:text-primary font-mono text-xs font-bold"
 dir="ltr"
 >
 <Phone className="w-3 h-3 text-muted-foreground"/>
 <span>{c.phone || c.mobile}</span>
 </a>
 ) : (
 <span className="text-muted-foreground/50">—</span>
 )}
 </TableCell>

 {/* Credit Limit */}
 <TableCell className="py-3.5 px-4 text-left font-bold text-muted-foreground text-xs">
 {c.credit_limit > 0 ? (
 <span>{formatNumber(c.credit_limit)} <span className="text-3xs">ج.م</span></span>
 ) : (
 <span className="text-muted-foreground/40 font-normal">بلا حد</span>
 )}
 </TableCell>

 {/* Balance */}
 <TableCell className="py-3.5 px-4 text-left">
 <div className="inline-flex flex-col items-end">
 <span
 className={cn(
"font-black text-sm font-mono",
 isDebit &&"text-destructive",
 isCredit &&"text-emerald-600 dark:text-emerald-400",
 isZero &&"text-muted-foreground"
 )}
 >
 {formatNumber(Math.abs(c.current_balance))} <span className="text-3xs font-bold">ج.م</span>
 </span>
 <Badge
 variant="outline"
 className={cn(
"text-4xs font-bold px-1.5 py-0 mt-0.5",
 isDebit &&"border-destructive/30 text-destructive bg-destructive/10",
 isCredit &&"border-emerald-300 text-emerald-700 bg-emerald-50 dark:bg-emerald-950/40 dark:text-emerald-300",
 isZero &&"text-muted-foreground"
 )}
 >
 {isDebit ?'مدين (لنا)': isCredit ?'دائن (علينا)':'متزن'}
 </Badge>
 </div>
 </TableCell>

 {/* Status */}
 <TableCell className="py-3.5 px-4 text-center">
 <Badge
 variant={c.is_active ?"default":"secondary"}
 className="text-3xs font-black"
 >
 {c.is_active ?'نشط':'معطل'}
 </Badge>
 </TableCell>

 {/* Actions */}
 <TableCell className="py-3.5 px-5 text-center">
 <div className="flex items-center justify-center gap-1">
 <Button
 variant="ghost"
 size="icon"
 onClick={() => {
 const baseUrl = kind ==='both'?'/contacts/both': kind ==='customer'?'/contacts/customers':'/contacts/suppliers';
 router.push(`${baseUrl}?id=${c.id}`);
 }}
 className="w-8 h-8 rounded-lg text-muted-foreground hover:text-primary hover:bg-primary/10"
 title="كشف حساب المعاملات"
 >
 <Eye className="w-4 h-4"/>
 </Button>
 <Button
 variant="ghost"
 size="icon"
 onClick={() => router.push(`/contacts/new?edit=${c.id}`)}
 className="w-8 h-8 rounded-lg text-muted-foreground hover:text-amber-600 hover:bg-amber-50 dark:hover:bg-amber-950/30"
 title="تعديل البيانات"
 >
 <Edit className="w-4 h-4"/>
 </Button>
 <Button
 variant="ghost"
 size="icon"
 onClick={async () => {
 await ContactsRepository.setActive(c.id, !c.is_active);
 await loadData();
 }}
 className={cn(
"w-8 h-8 rounded-lg",
 c.is_active
 ?"text-muted-foreground hover:text-destructive hover:bg-destructive/10"
 :"text-muted-foreground hover:text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-950/30"
 )}
 title={c.is_active ?'تعطيل الحساب':'تفعيل الحساب'}
 >
 {c.is_active ? <X className="w-4 h-4"/> : <CheckCircle2 className="w-4 h-4"/>}
 </Button>
 </div>
 </TableCell>
 </TableRow>
 );
 })
 )}
 </TableBody>
 </Table>
 </div>

 {/* Table Footer: Real Pagination & Controls */}
 {filtered.length > 0 && (
 <div className="p-4 bg-slate-50/50 dark:bg-slate-900/40 border-t border-slate-100 dark:border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs font-bold text-slate-500 dark:text-slate-400">
 
 {/* Left: Info & Rows per page */}
 <div className="flex items-center gap-3">
 <span>
 عرض <span className="text-slate-800 dark:text-white font-black">{(currentPageSafe - 1) * pSize + 1}</span> إلى{''}
 <span className="text-slate-800 dark:text-white font-black">{Math.min(currentPageSafe * pSize, filtered.length)}</span> من أصل{''}
 <span className="text-blue-600 dark:text-blue-400 font-black">{filtered.length}</span> جهة
 </span>

 <div className="flex items-center gap-1.5 text-xs mr-2">
 <span className="text-slate-400">لكل صفحة:</span>
 <Select value={pageSize} onValueChange={setPageSize}>
 <SelectTrigger className="w-16 h-8 rounded-lg bg-surface border-slate-200 dark:border-slate-800 text-xs font-bold">
 <SelectValue />
 </SelectTrigger>
 <SelectContent>
 <SelectItem value="10">10</SelectItem>
 <SelectItem value="25">25</SelectItem>
 <SelectItem value="50">50</SelectItem>
 <SelectItem value="100">100</SelectItem>
 </SelectContent>
 </Select>
 </div>
 </div>

 {/* Right: Page Navigation */}
 {totalPages > 1 && (
 <div className="flex items-center gap-1">
 <button
 onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
 disabled={currentPageSafe <= 1}
 className="h-8 px-2.5 rounded-lg border border-slate-200 dark:border-slate-800 bg-surface hover:bg-slate-50 dark:hover:bg-slate-800 disabled:opacity-40 disabled:cursor-not-allowed transition-colors flex items-center gap-1"
 >
 <ChevronRight className="w-4 h-4"/>
 <span className="hidden sm:inline">السابق</span>
 </button>

 <div className="flex items-center gap-1 px-1">
 {Array.from({ length: totalPages }, (_, idx) => idx + 1)
 .filter((p) => p === 1 || p === totalPages || Math.abs(p - currentPageSafe) <= 1)
 .map((p, idx, arr) => {
 const prev = arr[idx - 1];
 return (
 <React.Fragment key={p}>
 {prev && p - prev > 1 && <span className="px-1 text-slate-400">...</span>}
 <button
 onClick={() => setCurrentPage(p)}
 className={cn(
"w-8 h-8 rounded-lg text-xs font-black transition-colors cursor-pointer",
 currentPageSafe === p
 ?"bg-blue-600 text-white shadow-xs"
 :"border border-slate-200 dark:border-slate-800 bg-surface hover:bg-slate-50 text-slate-700 dark:text-slate-200"
 )}
 >
 {p}
 </button>
 </React.Fragment>
 );
 })}
 </div>

 <button
 onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
 disabled={currentPageSafe >= totalPages}
 className="h-8 px-2.5 rounded-lg border border-slate-200 dark:border-slate-800 bg-surface hover:bg-slate-50 dark:hover:bg-slate-800 disabled:opacity-40 disabled:cursor-not-allowed transition-colors flex items-center gap-1"
 >
 <span className="hidden sm:inline">التالي</span>
 <ChevronLeft className="w-4 h-4"/>
 </button>
 </div>
 )}

 </div>
 )}

 </div>

 </div>

 {/* Detail Dialog (Statement & Invoices) */}
 <Dialog open={!!detailId} onOpenChange={(open) => !open && closeDetail()}>
 <DialogContent className="max-w-4xl rounded-3xl p-6 max-h-[90vh] overflow-y-auto"dir="rtl">
 <DialogHeader className="flex flex-row items-center justify-between pb-4 border-b border-slate-100 dark:border-slate-800">
 <div className="flex items-center gap-3.5">
 <div
 className={cn(
"w-11 h-11 rounded-2xl flex items-center justify-center shadow-inner",
 kind ==='customer'
 ?"bg-blue-50 text-blue-600 dark:bg-blue-950/40 dark:text-blue-400"
 : kind ==='supplier'
 ?"bg-emerald-50 text-emerald-600 dark:bg-emerald-950/40 dark:text-emerald-400"
 :"bg-purple-50 text-purple-600 dark:bg-purple-950/40 dark:text-purple-400"
 )}
 >
 <Building2 className="w-5 h-5"/>
 </div>
 <div>
 <DialogTitle className="text-lg font-black text-foreground text-right">
 {detailContact?.name ||'تفاصيل الجهة'}
 </DialogTitle>
 <div className="flex items-center gap-2 mt-0.5">
 <span className="text-3xs font-black bg-muted px-2 py-0.5 rounded-md text-muted-foreground font-mono">
 {detailContact?.code ||'—'}
 </span>
 <Badge variant="outline"className="text-3xs font-bold">
 {detailContact?.type ==='both'?'عميل ومورد': detailContact?.type ==='customer'?'عميل':'مورد'}
 </Badge>
 </div>
 </div>
 </div>
 </DialogHeader>

 {detailLoading || !detailContact ? (
 <div className="py-24 text-center text-muted-foreground text-xs font-bold">
 جاري تحميل الحساب والمعاملات...
 </div>
 ) : (
 <div className="space-y-6 pt-2">
 {/* Balance Cards inside Modal */}
 <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
 <Card className="rounded-2xl border-slate-100 dark:border-slate-800 shadow-none bg-muted/30">
 <CardContent className="p-4">
 <span className="text-3xs font-black text-muted-foreground uppercase tracking-wider block mb-1">
 الرصيد المالي الحالي
 </span>
 <div
 className={cn(
"text-xl font-black font-mono",
 detailContact.current_balance > 0
 ?'text-destructive'
 : detailContact.current_balance < 0
 ?'text-emerald-600 dark:text-emerald-400'
 :'text-muted-foreground'
 )}
 >
 {formatNumber(detailContact.current_balance)} <span className="text-3xs font-bold">ج.م</span>
 </div>
 </CardContent>
 </Card>

 <Card className="rounded-2xl border-slate-100 dark:border-slate-800 shadow-none bg-muted/30">
 <CardContent className="p-4">
 <span className="text-3xs font-black text-muted-foreground uppercase tracking-wider block mb-1">
 الحد الائتماني
 </span>
 <div className="text-xl font-black text-foreground font-mono">
 {formatNumber(detailContact.credit_limit)} <span className="text-3xs font-bold text-muted-foreground">ج.م</span>
 </div>
 </CardContent>
 </Card>

 <Card className="rounded-2xl border-slate-100 dark:border-slate-800 shadow-none bg-muted/30">
 <CardContent className="p-4">
 <span className="text-3xs font-black text-muted-foreground uppercase tracking-wider block mb-1">
 {kind ==='customer'?'فواتير البيع':'فواتير الشراء'}
 </span>
 <div className="text-xl font-black text-primary font-mono">{formatNumber(invoices.length)}</div>
 </CardContent>
 </Card>

 <Card className="rounded-2xl border-slate-100 dark:border-slate-800 shadow-none bg-muted/30">
 <CardContent className="p-4">
 <span className="text-3xs font-black text-muted-foreground uppercase tracking-wider block mb-1">
 إجمالي التعاملات
 </span>
 <div className="text-xl font-black text-emerald-600 dark:text-emerald-400 font-mono">
 {formatNumber(invoices.reduce((a, i) => a + i.total, 0))} <span className="text-3xs font-bold">ج.م</span>
 </div>
 </CardContent>
 </Card>
 </div>

 {detailContact.address && (
 <div className="flex items-center gap-2 text-xs font-bold text-muted-foreground bg-muted/40 rounded-xl px-4 py-3 border border-border">
 <Building2 className="w-4 h-4 text-muted-foreground"/> {detailContact.address}
 </div>
 )}

 <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
 {/* Invoices List */}
 <div className="space-y-3">
 <h4 className="text-sm font-black text-foreground flex items-center gap-2">
 <FileDown className="w-4 h-4 text-primary"/>
 {kind ==='customer'?'سجل فواتير المبيعات':'سجل فواتير المشتريات'}
 </h4>
 <div className="overflow-x-auto rounded-2xl border border-slate-200/80 dark:border-slate-800">
 <Table className="w-full text-right text-xs">
 <TableHeader className="bg-slate-50 dark:bg-slate-900/60">
 <TableRow>
 <TableHead className="py-3 px-4 text-xs font-black">رقم الفاتورة</TableHead>
 <TableHead className="py-3 px-4 text-xs font-black">التاريخ</TableHead>
 <TableHead className="py-3 px-4 text-left text-xs font-black">القيمة</TableHead>
 </TableRow>
 </TableHeader>
 <TableBody>
 {invoices.length === 0 ? (
 <TableRow>
 <TableCell colSpan={3} className="py-10 text-center text-muted-foreground font-bold">
 لا توجد فواتير بعد.
 </TableCell>
 </TableRow>
 ) : (
 invoices.map((i) => (
 <TableRow key={i.id} className="hover:bg-muted/40 transition-colors">
 <TableCell className="py-3 px-4 font-black text-primary">{i.number}</TableCell>
 <TableCell className="py-3 px-4 text-muted-foreground font-mono">
 {new Date(i.date).toLocaleDateString('en-GB')}
 </TableCell>
 <TableCell className="py-3 px-4 text-left font-black font-mono text-foreground">
 {formatNumber(i.total)}
 </TableCell>
 </TableRow>
 ))
 )}
 </TableBody>
 </Table>
 </div>
 </div>

 {/* Account Statement */}
 <div className="space-y-3">
 <h4 className="text-sm font-black text-foreground flex items-center gap-2">
 <Activity className="w-4 h-4 text-emerald-500"/>
 كشف الحساب المصغر
 </h4>
 <div className="overflow-x-auto rounded-2xl border border-slate-200/80 dark:border-slate-800">
 <Table className="w-full text-right text-xs">
 <TableHeader className="bg-slate-50 dark:bg-slate-900/60">
 <TableRow>
 <TableHead className="py-3 px-4 text-xs font-black">التاريخ</TableHead>
 <TableHead className="py-3 px-4 text-xs font-black">البيان</TableHead>
 <TableHead className="py-3 px-4 text-left text-xs font-black">الرصيد</TableHead>
 </TableRow>
 </TableHeader>
 <TableBody>
 {statement.length === 0 ? (
 <TableRow>
 <TableCell colSpan={3} className="py-10 text-center text-muted-foreground font-bold">
 لا توجد حركات حساب بعد.
 </TableCell>
 </TableRow>
 ) : (
 statement.map((s) => (
 <TableRow key={s.id} className="hover:bg-muted/40 transition-colors">
 <TableCell className="py-3 px-4 text-muted-foreground font-mono">
 {new Date(s.created_at).toLocaleDateString('en-GB')}
 </TableCell>
 <TableCell className="py-3 px-4">
 <div className="text-foreground font-medium truncate max-w-[150px]">
 {s.notes || s.reference_type}
 </div>
 <div className="flex items-center gap-2 mt-1">
 {s.debit > 0 && (
 <span className="text-4xs text-destructive bg-destructive/10 px-1.5 py-0.5 rounded font-mono font-bold">
 مدين: {formatNumber(s.debit)}
 </span>
 )}
 {s.credit > 0 && (
 <span className="text-4xs text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/40 px-1.5 py-0.5 rounded font-mono font-bold">
 دائن: {formatNumber(s.credit)}
 </span>
 )}
 </div>
 </TableCell>
 <TableCell className="py-3 px-4 text-left font-black font-mono text-foreground"dir="ltr">
 {formatNumber(s.balance_after)}
 </TableCell>
 </TableRow>
 ))
 )}
 </TableBody>
 </Table>
 </div>
 </div>
 </div>
 </div>
 )}
 </DialogContent>
 </Dialog>
 </AppShell>
 );
}

function StatCard({
 label,
 value,
 icon,
 color,
 subLabel,
 isNumber = false,
}: {
 label: string;
 value: number;
 icon: React.ReactNode;
 color:'blue'|'emerald'|'amber'|'rose'|'indigo';
 subLabel?: string;
 isNumber?: boolean;
}) {
 const colorStyles = {
 blue: {
 bg:'bg-blue-50/80 dark:bg-blue-950/30',
 border:'border-blue-100 dark:border-blue-900/40',
 text:'text-blue-600 dark:text-blue-400',
 bar:'bg-blue-500',
 },
 emerald: {
 bg:'bg-emerald-50/80 dark:bg-emerald-950/30',
 border:'border-emerald-100 dark:border-emerald-900/40',
 text:'text-emerald-600 dark:text-emerald-400',
 bar:'bg-emerald-500',
 },
 amber: {
 bg:'bg-amber-50/80 dark:bg-amber-950/30',
 border:'border-amber-100 dark:border-amber-900/40',
 text:'text-amber-600 dark:text-amber-400',
 bar:'bg-amber-500',
 },
 rose: {
 bg:'bg-rose-50/80 dark:bg-rose-950/30',
 border:'border-rose-100 dark:border-rose-900/40',
 text:'text-rose-600 dark:text-rose-400',
 bar:'bg-rose-500',
 },
 indigo: {
 bg:'bg-indigo-50/80 dark:bg-indigo-950/30',
 border:'border-indigo-100 dark:border-indigo-900/40',
 text:'text-indigo-600 dark:text-indigo-400',
 bar:'bg-indigo-500',
 },
 };

 const currentStyle = colorStyles[color];

 return (
 <div className="relative overflow-hidden bg-surface rounded-2xl border border-slate-200/80 dark:border-slate-800 p-4 sm:p-5 shadow-xs hover:shadow-md hover:border-slate-300 dark:hover:border-slate-700 transition-all duration-200">
 <div className={cn("absolute top-0 right-0 left-0 h-1", currentStyle.bar)} />
 
 <div className="flex items-start justify-between gap-3">
 <div className="flex-1">
 <span className="text-xs font-bold text-slate-500 dark:text-slate-400 block mb-1">{label}</span>
 <div className="flex items-baseline gap-1.5">
 <span className={cn("text-2xl font-black tracking-tight", currentStyle.text)}>
 {isNumber ? value : formatNumber(value)}
 </span>
 {!isNumber && <span className="text-xs font-bold text-slate-400">ج.م</span>}
 </div>
 {subLabel && (
 <span className="text-3xs font-semibold text-slate-400 dark:text-slate-500 block mt-1.5">
 {subLabel}
 </span>
 )}
 </div>

 <div className={cn("w-11 h-11 rounded-xl flex items-center justify-center shrink-0 border shadow-xs", currentStyle.bg, currentStyle.border)}>
 {icon}
 </div>
 </div>
 </div>
 );
}