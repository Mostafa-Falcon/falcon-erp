'use client';

import React, { useEffect, useMemo, useState } from'react';
import { Suspense } from'react';
import { AppShell } from'@/components/layout/AppShell';
import { Input } from'@/components/ui/input';
import { Button } from'@/components/ui/button';
import { useSessionStore } from'@/core/state/useSessionStore';
import { TreasuryRepository } from'@/modules/treasury/treasury_repository';
import { formatNumber } from'@/lib/format';
import { toast } from'sonner';
import {
 RefreshCw,
 Printer,
 FileText,
 FileSpreadsheet,
 SlidersHorizontal,
 Search,
 Plus,
 Minus,
 Wallet,
 ArrowUpCircle,
 ArrowDownCircle,
 X,
 User,
 CreditCard,
 Banknote,
 Hash,
 Calendar,
 MessageSquare,
 ChevronRight,
 ChevronLeft,
 FilterX,
 RotateCcw
} from'lucide-react';
import type { Contact, FinancialVoucher, Treasury, User as AppUser } from'@/types';

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
 DialogDescription,
 DialogFooter,
} from'@/components/ui/dialog';
import { Label } from'@/components/ui/label';
import { Badge } from'@/components/ui/badge';
import { Card, CardContent } from'@/components/ui/card';
import {
 Table,
 TableBody,
 TableCell,
 TableHead,
 TableHeader,
 TableRow,
} from'@/components/ui/table';

function VouchersContent() {
 const { currentUser } = useSessionStore();
 const orgId = currentUser?.org_id ||'';

 const [vouchers, setVouchers] = useState<FinancialVoucher[]>([]);
 const [treasuries, setTreasuries] = useState<Treasury[]>([]);
 const [contacts, setContacts] = useState<Contact[]>([]);
 const [users, setUsers] = useState<AppUser[]>([]);
 const [isLoading, setIsLoading] = useState(true);

 // Filters & UI State
 const [searchQuery, setSearchQuery] = useState('');
 const [typeFilter, setTypeFilter] = useState('all');
 const [pageSize, setPageSize] = useState('25');
 const [isVoucherModalOpen, setIsVoucherModalOpen] = useState(false);
 const [activeModalType, setActiveModalType] = useState<'receipt'|'payment'>('receipt');

 // New Voucher Form State
 const [vContactId, setVContactId] = useState('');
 const [vTreasuryId, setVTreasuryId] = useState('');
 const [vAmount, setVAmount] = useState('');
 const [vDescription, setVDescription] = useState('');
 const [vTransactionType, setVTransactionType] = useState('partial'); // Example type
 const [isBusy, setIsBusy] = useState(false);
 const [reversingId, setReversingId] = useState<string | null>(null);

 const loadData = async () => {
 if (!orgId) return;
 try {
 setIsLoading(true);
 const { db } = await import('@/core/db/app_database');
 const [vch, tres, cnt, usr] = await Promise.all([
 TreasuryRepository.getVouchers(orgId),
 TreasuryRepository.getTreasuries(orgId),
 db.contacts.where('org_id').equals(orgId).toArray(),
 db.users.where('org_id').equals(orgId).toArray(),
 ]);
 setVouchers(vch);
 setTreasuries(tres);
 setContacts(cnt);
 setUsers(usr);

 const defaultTreasury = tres.find(t => t.is_default)?.id || tres[0]?.id ||'';
 setVTreasuryId(defaultTreasury);
 } catch (err) {
 console.error('Load vouchers error:', err);
 toast.error('حدث خطأ أثناء تحميل البيانات');
 } finally {
 setIsLoading(false);
 }
 };

 useEffect(() => {
 loadData();
 }, [orgId]);

 const filteredVouchers = useMemo(() => {
 return vouchers.filter((v) => {
 const matchesSearch = !searchQuery ||
 v.voucher_no.toLowerCase().includes(searchQuery.toLowerCase()) ||
 v.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
 contacts.find(c => c.id === v.contact_id)?.name.toLowerCase().includes(searchQuery.toLowerCase());

 const matchesType = typeFilter ==='all'|| v.type === typeFilter;

 return matchesSearch && matchesType;
 });
 }, [vouchers, searchQuery, typeFilter, contacts]);

 const stats = useMemo(() => {
 const active = filteredVouchers.filter(v => !v.is_reversed);
 const receipts = active.filter(v => v.type ==='receipt').reduce((a, v) => a + v.amount, 0);
 const payments = active.filter(v => v.type ==='payment').reduce((a, v) => a + v.amount, 0);
 return {
 totalReceipts: receipts,
 totalPayments: payments,
 netBalance: receipts - payments,
 count: filteredVouchers.length
 };
 }, [filteredVouchers]);

 const handleReverse = async (voucher: FinancialVoucher) => {
 if (!currentUser) return;
 const reason = window.prompt('اكتب سبب عكس السند:');
 if (reason === null) return;
 if (!reason.trim()) {
 toast.error('سبب العكس مطلوب.');
 return;
 }
 setReversingId(voucher.id);
 try {
 const result = await TreasuryRepository.reverseVoucher(voucher.id, reason.trim(), currentUser.id);
 if (!result.success) {
 toast.error(result.error ||'تعذر عكس السند.');
 return;
 }
 toast.success('تم عكس السند وترحيل القيد العكسي.');
 await loadData();
 } finally {
 setReversingId(null);
 }
 };

 const handleCreateVoucher = async () => {
 if (!currentUser) return;
 if (!vAmount || Number(vAmount) <= 0) {
 toast.error('يرجى إدخال مبلغ صحيح');
 return;
 }
 if (!vTreasuryId) {
 toast.error('يرجى اختيار الخزينة');
 return;
 }

 setIsBusy(true);
 try {
 await TreasuryRepository.createVoucher({
 orgId,
 type: activeModalType,
 treasuryId: vTreasuryId,
 contactId: vContactId || null,
 amount: Number(vAmount),
 description: vDescription.trim() || (activeModalType ==='receipt'?'سند قبض':'سند صرف'),
 userId: currentUser.id,
 });
 toast.success(activeModalType ==='receipt'?'تم حفظ سند القبض بنجاح':'تم حفظ سند الصرف بنجاح');
 setIsVoucherModalOpen(false);
 setVAmount('');
 setVDescription('');
 setVContactId('');
 await loadData();
 } catch (err: any) {
 toast.error(err.message ||'حدث خطأ أثناء حفظ السند');
 } finally {
 setIsBusy(false);
 }
 };

 const contactName = (id?: string | null) => (id ? contacts.find((c) => c.id === id)?.name :'عميل نقدي');
 const userName = (id: string) => users.find((u) => u.id === id)?.full_name || users.find((u) => u.id === id)?.username ||'—';

 return (
 <AppShell
 title="سندات القبض والدفع"
 subtitle="إدارة عمليات التحصيل من العملاء والسداد للموردين وتسوية العهد المالية"
 actions={
 <div className="flex items-center gap-2">
 <Button
 onClick={() => { setActiveModalType('receipt'); setIsVoucherModalOpen(true); }}
 className="h-11 px-5 bg-emerald-600 hover:bg-emerald-700 text-white font-black text-xs rounded-2xl flex items-center gap-2 shadow-md hover:shadow-lg transition-all cursor-pointer"
 >
 <Plus className="w-4 h-4"/>
 <span>سند قبض جديد</span>
 </Button>
 <Button
 onClick={() => { setActiveModalType('payment'); setIsVoucherModalOpen(true); }}
 className="h-11 px-5 bg-rose-600 hover:bg-rose-700 text-white font-black text-xs rounded-2xl flex items-center gap-2 shadow-md hover:shadow-lg transition-all cursor-pointer"
 >
 <Minus className="w-4 h-4"/>
 <span>سند صرف جديد</span>
 </Button>
 </div>
 }
 >
 <div className="space-y-6 text-right"dir="rtl">

 {/* ==================== SUMMARY CARDS ==================== */}
 <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
 <StatCard label="إجمالي المقبوضات (سندات القبض)"value={stats.totalReceipts} icon={<ArrowDownCircle className="w-6 h-6"/>} color="emerald"/>
 <StatCard label="إجمالي المدفوعات (سندات الصرف)"value={stats.totalPayments} icon={<ArrowUpCircle className="w-6 h-6"/>} color="red"/>
 <StatCard label="صافي حركة الخزينة"value={stats.netBalance} icon={<Wallet className="w-6 h-6"/>} color="blue"/>
 </div>

 {/* ==================== FILTERS & TOOLBAR ==================== */}
 <div className="bg-surface rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-sm overflow-hidden">

 {/* Quick Filters Row */}
 <div className="p-4 border-b border-slate-100 dark:border-slate-800/80 flex flex-wrap items-center justify-between gap-4">
 <div className="flex flex-wrap items-center gap-4">
 <div className="flex items-center gap-2">
 <span className="text-xs font-black text-slate-400">نوع السند</span>
 <Select value={typeFilter} onValueChange={setTypeFilter}>
 <SelectTrigger className="w-32 h-10 rounded-xl bg-slate-50/50 dark:bg-slate-900/50 border-slate-200 dark:border-slate-800 text-xs font-bold">
 <SelectValue />
 </SelectTrigger>
 <SelectContent>
 <SelectItem value="all">الكل</SelectItem>
 <SelectItem value="receipt">قبض</SelectItem>
 <SelectItem value="payment">صرف</SelectItem>
 </SelectContent>
 </Select>
 </div>

 <Button
 variant="ghost"
 onClick={() => { setTypeFilter('all'); setSearchQuery(''); }}
 className="h-10 text-red-500 hover:text-red-600 hover:bg-red-50 text-xs font-bold gap-1.5"
 >
 <FilterX className="w-4 h-4"/> مسح الكل
 </Button>
 </div>

 <div className="flex items-center gap-2 text-xs font-bold text-slate-500">
 <span>عرض</span>
 <Select value={pageSize} onValueChange={setPageSize}>
 <SelectTrigger className="w-16 h-10 rounded-xl bg-slate-50/60 dark:bg-slate-900/60 border-slate-200 dark:border-slate-800 text-xs font-bold">
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
 </div>

 {/* Main Toolbar */}
 <div className="p-4 bg-slate-50/30 dark:bg-slate-900/30 flex flex-wrap items-center justify-between gap-4">
 <div className="flex items-center gap-2">
 <Button
 variant="outline"
 size="icon"
 onClick={loadData}
 className="w-9 h-9 rounded-xl cursor-pointer"
 title="تحديث"
 >
 <RefreshCw className={`w-4 h-4 ${isLoading ?'animate-spin':''}`} />
 </Button>
 <Button
 variant="outline"
 size="icon"
 onClick={() => window.print()}
 className="w-9 h-9 rounded-xl cursor-pointer"
 title="طباعة"
 >
 <Printer className="w-4 h-4"/>
 </Button>
 <Button
 variant="outline"
 size="icon"
 onClick={() => toast.info('جاري تصدير PDF')}
 className="w-9 h-9 rounded-xl cursor-pointer"
 title="تصدير PDF"
 >
 <FileText className="w-4 h-4 text-blue-500"/>
 </Button>
 <Button
 variant="outline"
 size="icon"
 onClick={() => toast.info('جاري تصدير Excel')}
 className="w-9 h-9 rounded-xl cursor-pointer"
 title="تصدير Excel"
 >
 <FileSpreadsheet className="w-4 h-4 text-emerald-600"/>
 </Button>

 <div className="h-6 w-[1px] bg-slate-200 dark:bg-slate-800 mx-2"/>

 <Button variant="outline"className="h-9 border-slate-200 dark:border-slate-800 text-xs font-bold gap-1.5 rounded-xl">
 <SlidersHorizontal className="w-4 h-4"/> تخصيص الأعمدة
 </Button>
 </div>

 <div className="relative group">
 <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 group-focus-within:text-pink-500 transition-colors"/>
 <Input
 value={searchQuery}
 onChange={(e) => setSearchQuery(e.target.value)}
 placeholder="بحث سريع في الجدول..."
 className="h-10 pr-9 w-64 rounded-xl text-xs font-bold"
 />
 <Badge
 variant="secondary"
 className="absolute left-2 top-1/2 -translate-y-1/2 bg-pink-50 text-pink-600 px-1.5 py-0.5 rounded text-3xs font-black"
 >
 {filteredVouchers.length}
 </Badge>
 </div>
 </div>

 {/* ==================== DATA GRID ==================== */}
 <div className="overflow-x-auto">
 <Table className="w-full text-right">
 <TableHeader className="bg-slate-50/50 dark:bg-slate-900/50">
 <TableRow className="border-b border-slate-100 dark:border-slate-800 text-2xs font-black text-slate-400">
 <TableHead className="py-3.5 px-4 text-right">رقم السند</TableHead>
 <TableHead className="py-3.5 px-4 text-center">التاريخ</TableHead>
 <TableHead className="py-3.5 px-4 text-right">الجهة / الطرف</TableHead>
 <TableHead className="py-3.5 px-4 text-center">طريقة الدفع</TableHead>
 <TableHead className="py-3.5 px-4 text-left">المبلغ</TableHead>
 <TableHead className="py-3.5 px-4 text-center">الحالة</TableHead>
 <TableHead className="py-3.5 px-4 text-center w-20">إجراءات</TableHead>
 </TableRow>
 </TableHeader>
 <TableBody className="divide-y divide-slate-50 dark:divide-slate-800/50 text-xs font-bold">
 {filteredVouchers.map((v) => (
 <TableRow key={v.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-900/30 transition-colors">
 <TableCell className="py-3.5 px-4 text-slate-900 dark:text-white font-black font-mono">
 #{v.voucher_no.slice(-3)}
 </TableCell>
 <TableCell className="py-3.5 px-4 text-center text-slate-500 font-medium font-mono">
 {new Date(v.created_at).toLocaleDateString('en-GB')}
 </TableCell>
 <TableCell className="py-3.5 px-4">
 <div className="flex items-center gap-2">
 <div className={`w-6 h-6 rounded-full flex items-center justify-center shrink-0 ${
 v.type ==='receipt'?'bg-emerald-50 text-emerald-600':'bg-red-50 text-red-600'
 }`}>
 {v.type ==='receipt'? <ArrowDownCircle className="w-3.5 h-3.5"/> : <ArrowUpCircle className="w-3.5 h-3.5"/>}
 </div>
 <span className="text-slate-600 dark:text-slate-400">{contactName(v.contact_id)}</span>
 </div>
 </TableCell>
 <TableCell className="py-3.5 px-4 text-center">
 <Badge variant="secondary"className="text-3xs font-bold bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400">
 نقداً
 </Badge>
 </TableCell>
 <TableCell className={`py-3.5 px-4 text-left font-black text-sm font-mono ${v.is_reversed ?'text-slate-300 line-through':'text-[#10b981]'}`}>
 {formatNumber(v.amount)} <span className="text-3xs opacity-70">ج.م</span>
 </TableCell>
 <TableCell className="py-3.5 px-4 text-center">
 {v.is_reversed ? (
 <Badge variant="outline"className="text-slate-500 bg-slate-100 dark:bg-slate-800 text-3xs">
 معكوس
 </Badge>
 ) : (
 <Badge variant="outline"className="text-emerald-600 border-emerald-200 bg-emerald-50 text-3xs">
 سارٍ
 </Badge>
 )}
 </TableCell>
 <TableCell className="py-3.5 px-4 text-center">
 {!v.is_reversed && (
 <Button
 variant="ghost"
 size="icon"
 onClick={() => handleReverse(v)}
 disabled={reversingId === v.id}
 title="عكس السند"
 className="w-7 h-7 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/40 cursor-pointer"
 >
 <RotateCcw className={`w-3.5 h-3.5 ${reversingId === v.id ?'animate-spin':''}`} />
 </Button>
 )}
 </TableCell>
 </TableRow>
 ))}
 {filteredVouchers.length === 0 && (
 <TableRow>
 <TableCell colSpan={7} className="py-16 text-center text-slate-400 font-bold">
 لا توجد سندات متاحة للعرض.
 </TableCell>
 </TableRow>
 )}
 </TableBody>
 </Table>
 </div>

      {/* Footer Bar */}
      <div className="p-4 bg-slate-50/20 dark:bg-slate-900/20 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-2xs font-bold text-slate-400">
        <div>عرض 1 إلى {filteredVouchers.length} من إجمالي {stats.count} سند</div>
        <div className="flex items-center gap-1.5">
          <button className="w-8 h-8 rounded-lg border border-slate-200 dark:border-slate-800 flex items-center justify-center hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer">
            <ChevronRight className="w-3.5 h-3.5" />
          </button>
          <button className="w-8 h-8 rounded-lg bg-primary text-white flex items-center justify-center shadow-sm">1</button>
          <button className="w-8 h-8 rounded-lg border border-slate-200 dark:border-slate-800 flex items-center justify-center hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer">
            <ChevronLeft className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

    </div>

    {/* ==================== CREATE VOUCHER MODAL ==================== */}
    <Dialog open={isVoucherModalOpen} onOpenChange={setIsVoucherModalOpen}>
      <DialogContent className="sm:max-w-[500px] p-0 overflow-hidden border-none rounded-3xl bg-surface dark:bg-slate-950" dir="rtl">
        <div className="p-6 pb-0 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className={`w-10 h-10 rounded-2xl flex items-center justify-center shadow-inner ${
              activeModalType === 'receipt' ? 'bg-emerald-50 dark:bg-emerald-950/50 text-emerald-600 dark:text-emerald-400' : 'bg-red-50 dark:bg-red-950/50 text-red-600 dark:text-red-400'
            }`}>
              {activeModalType === 'receipt' ? <Plus className="w-5 h-5" /> : <Minus className="w-5 h-5" />}
            </div>
            <h3 className="text-base font-black text-slate-900 dark:text-white">
              إضافة {activeModalType === 'receipt' ? 'سند قبض' : 'سند صرف'} جديد
            </h3>
          </div>
          <button onClick={() => setIsVoucherModalOpen(false)} className="w-8 h-8 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-400 flex items-center justify-center hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-6 space-y-5">

          {/* Entity / Contact */}
          <div className="space-y-1.5">
            <Label className="text-xs font-bold text-slate-600 dark:text-slate-400">
              اسم {activeModalType === 'receipt' ? 'العميل' : 'المورد'} / الجهة
            </Label>
            <Select value={vContactId || 'none'} onValueChange={(val) => setVContactId(val === 'none' ? '' : val)}>
              <SelectTrigger className="h-11 rounded-xl bg-slate-50/50 dark:bg-slate-900/50 border-slate-200 dark:border-slate-800 text-xs font-bold">
                <SelectValue placeholder="بدون جهة (نقدي)" />
              </SelectTrigger>
              <SelectContent className="rounded-xl shadow-xl max-h-72">
                <SelectItem value="none">
                  <div className="flex items-center gap-2"><User className="w-4 h-4 text-slate-400" /> بدون جهة (نقدي)</div>
                </SelectItem>
                {contacts.map((c) => (
                  <SelectItem key={c.id} value={c.id}>
                    {c.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Amount & Transaction Type */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label className="text-xs font-bold text-slate-600 dark:text-slate-400">نوع العملية</Label>
              <Select value={vTransactionType} onValueChange={setVTransactionType}>
                <SelectTrigger className="h-11 rounded-xl bg-slate-50/50 dark:bg-slate-900/50 border-slate-200 dark:border-slate-800 text-xs font-bold">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="partial">سداد جزء</SelectItem>
                  <SelectItem value="full">سداد كلي</SelectItem>
                  <SelectItem value="advance">دفعة مقدمة</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-bold text-slate-600 dark:text-slate-400">المبلغ (ج.م)</Label>
              <div className="relative">
                <Input
                  type="number"
                  value={vAmount}
                  onChange={(e) => setVAmount(e.target.value)}
                  placeholder="0.00"
                  className="h-11 bg-slate-50/50 dark:bg-slate-900/50 border-slate-200 dark:border-slate-800 focus:bg-white dark:focus:bg-slate-900 rounded-xl text-sm font-black text-left font-mono text-slate-900 dark:text-white"
                />
              </div>
            </div>
          </div>

          {/* Payment Method */}
          <div className="space-y-1.5">
            <Label className="text-xs font-bold text-slate-600 dark:text-slate-400">طريقة الدفع</Label>
            <Select defaultValue="cash">
              <SelectTrigger className="h-11 rounded-xl bg-slate-50/50 dark:bg-slate-900/50 border-slate-200 dark:border-slate-800 text-xs font-bold">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="cash">نقداً (كاش)</SelectItem>
                <SelectItem value="card">بطاقة (شبكة)</SelectItem>
                <SelectItem value="bank">تحويل بنكي</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Notes */}
          <div className="space-y-1.5">
            <Label className="text-xs font-bold text-slate-600 dark:text-slate-400">البيان / الملاحظات</Label>
            <textarea
              value={vDescription}
              onChange={(e) => setVDescription(e.target.value)}
              placeholder="سبب الصرف أو استلام المبلغ..."
              className="w-full min-h-[80px] p-3 rounded-xl bg-slate-50/50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-800 text-xs font-bold text-slate-900 dark:text-white focus:bg-white dark:focus:bg-slate-900 focus:outline-none focus:ring-1 focus:ring-blue-500 transition-all"
            />
          </div>

          {/* Actions */}
          <div className="flex items-center gap-3 pt-2">
            <Button
              onClick={handleCreateVoucher}
              disabled={isBusy}
              className={`flex-1 h-12 text-white font-black text-sm rounded-2xl shadow-lg transition-all active:scale-95 ${
                activeModalType === 'receipt' ? 'bg-[#10b981] hover:bg-emerald-600 shadow-emerald-500/20' : 'bg-[#ef4444] hover:bg-red-600 shadow-red-500/20'
              }`}
            >
              {isBusy ? 'جاري الحفظ...' : 'حفظ السند'}
            </Button>
            <Button
              onClick={() => setIsVoucherModalOpen(false)}
              variant="outline"
              className="flex-1 h-12 border-slate-200 dark:border-slate-800 text-slate-500 dark:text-slate-300 font-black text-sm rounded-2xl hover:bg-slate-50 dark:hover:bg-slate-800"
            >
              إلغاء
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>

 </div>
 </AppShell>
 );
}

function StatCard({ label, value, icon, color }: { label: string, value: number, icon: React.ReactNode, color:'emerald'|'red'|'blue'}) {
 const colorMap = {
 emerald: {
 accentBg:'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20',
 text:'text-emerald-600 dark:text-emerald-400',
 },
 red: {
 accentBg:'bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20',
 text:'text-rose-600 dark:text-rose-400',
 },
 blue: {
 accentBg:'bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20',
 text:'text-blue-600 dark:text-blue-400',
 },
 };

 const style = colorMap[color];

 return (
 <Card className="rounded-2xl border border-slate-200/80 dark:border-slate-800 bg-surface hover:border-slate-300 dark:hover:border-slate-700 transition-all hover:shadow-md">
 <CardContent className="p-5 flex items-center justify-between gap-3">
 <div className="space-y-1">
 <span className="text-xs font-bold text-slate-500 dark:text-slate-400 block tracking-tight">{label}</span>
 <div className="flex items-baseline gap-1.5">
 <span className={`text-2xl font-black font-mono ${style.text}`}>{formatNumber(value)}</span>
 <span className="text-3xs font-bold text-slate-400">ج.م</span>
 </div>
 </div>
 <div className={`w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 shadow-xs ${style.accentBg}`}>
 {icon}
 </div>
 </CardContent>
 </Card>
 );
}

export default function VouchersPage() {
 return (
 <Suspense fallback={<div />}>
 <VouchersContent />
 </Suspense>
 );
}