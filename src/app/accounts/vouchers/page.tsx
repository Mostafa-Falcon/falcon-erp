'use client';

import React, { useEffect, useMemo, useState, Suspense } from 'react';
import { AppShell } from '@/components/layout/AppShell';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { useSessionStore } from '@/core/state/useSessionStore';
import { TreasuryRepository } from '@/modules/treasury/treasury_repository';
import { formatNumber } from '@/lib/format';
import { toast } from 'sonner';
import {
  RefreshCw,
  Printer,
  FileSpreadsheet,
  Search,
  Plus,
  Minus,
  Wallet,
  ArrowUpCircle,
  ArrowDownCircle,
  X,
  User,
  RotateCcw,
} from 'lucide-react';
import type { Contact, FinancialVoucher, Treasury, User as AppUser } from '@/types';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { KpiCard } from '@/components/ui/kpi-card';
import { EmptyState } from '@/components/ui/empty-state';

function VouchersContent() {
  const { currentUser } = useSessionStore();
  const orgId = currentUser?.org_id || '';

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
  const [activeModalType, setActiveModalType] = useState<'receipt' | 'payment'>('receipt');

  // New Voucher Form State
  const [vContactId, setVContactId] = useState('');
  const [vTreasuryId, setVTreasuryId] = useState('');
  const [vAmount, setVAmount] = useState('');
  const [vDescription, setVDescription] = useState('');
  const [vTransactionType, setVTransactionType] = useState('partial');
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
      if (tres.length > 0 && !vTreasuryId) {
        setVTreasuryId(tres.find((t) => t.is_default)?.id || tres[0].id);
      }
    } catch (err) {
      console.error('Load vouchers error:', err);
      toast.error('حدث خطأ أثناء تحميل السندات');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [orgId]);

  const stats = useMemo(() => {
    const receipts = vouchers.filter((v) => v.type === 'receipt' && !v.is_reversed);
    const payments = vouchers.filter((v) => v.type === 'payment' && !v.is_reversed);
    const totalReceipts = receipts.reduce((sum, v) => sum + v.amount, 0);
    const totalPayments = payments.reduce((sum, v) => sum + v.amount, 0);

    return {
      count: vouchers.length,
      totalReceipts,
      totalPayments,
      netBalance: totalReceipts - totalPayments,
    };
  }, [vouchers]);

  const filteredVouchers = useMemo(() => {
    return vouchers.filter((v) => {
      const matchesType = typeFilter === 'all' || v.type === typeFilter;
      const contact = contacts.find((c) => c.id === v.contact_id);
      const contactNameVal = contact?.name || '';
      const matchesSearch =
        !searchQuery ||
        v.voucher_no.toLowerCase().includes(searchQuery.toLowerCase()) ||
        v.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
        contactNameVal.toLowerCase().includes(searchQuery.toLowerCase());
      return matchesType && matchesSearch;
    });
  }, [vouchers, typeFilter, searchQuery, contacts]);

  const handleReverse = async (voucher: FinancialVoucher) => {
    if (!currentUser) return;
    const reason = window.prompt('يرجى كتابة سبب عكس السند المالي:');
    if (reason === null) return;
    if (!reason.trim()) {
      toast.error('سبب العكس مطلوب.');
      return;
    }
    setReversingId(voucher.id);
    try {
      const result = await TreasuryRepository.reverseVoucher(voucher.id, reason.trim(), currentUser.id);
      if (!result.success) {
        toast.error(result.error || 'تعذر عكس السند.');
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
        description: vDescription.trim() || (activeModalType === 'receipt' ? 'سند قبض' : 'سند صرف'),
        userId: currentUser.id,
      });
      toast.success(activeModalType === 'receipt' ? 'تم حفظ سند القبض بنجاح' : 'تم حفظ سند الصرف بنجاح');
      setIsVoucherModalOpen(false);
      setVAmount('');
      setVDescription('');
      setVContactId('');
      await loadData();
    } catch (err: any) {
      toast.error(err.message || 'حدث خطأ أثناء حفظ السند');
    } finally {
      setIsBusy(false);
    }
  };

  const contactName = (id?: string | null) => (id ? contacts.find((c) => c.id === id)?.name : 'عميل نقدي');

  return (
    <AppShell
      title="سندات القبض والصرف"
      subtitle="إدارة عمليات التحصيل من العملاء والسداد للموردين وتسوية الخزائن والعهد المالية"
      actions={
        <div className="flex items-center gap-2.5">
          <Button
            onClick={() => {
              setActiveModalType('receipt');
              setIsVoucherModalOpen(true);
            }}
            className="h-10 px-4 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl flex items-center gap-2 shadow-xs hover:shadow-md transition-all cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>سند قبض جديد</span>
          </Button>
          <Button
            onClick={() => {
              setActiveModalType('payment');
              setIsVoucherModalOpen(true);
            }}
            className="h-10 px-4 bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs rounded-xl flex items-center gap-2 shadow-xs hover:shadow-md transition-all cursor-pointer"
          >
            <Minus className="w-4 h-4" />
            <span>سند صرف جديد</span>
          </Button>
        </div>
      }
    >
      <div className="space-y-5 text-right" dir="rtl">
        {/* Metric Cards — Linear / Stripe Style */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <KpiCard
            label="إجمالي المقبوضات (سندات القبض)"
            value={formatNumber(stats.totalReceipts)}
            unit="ج.م"
            variant="emerald"
            icon={<ArrowDownCircle className="w-5 h-5" />}
          />
          <KpiCard
            label="إجمالي المدفوعات (سندات الصرف)"
            value={formatNumber(stats.totalPayments)}
            unit="ج.م"
            variant="rose"
            icon={<ArrowUpCircle className="w-5 h-5" />}
          />
          <KpiCard
            label="صافي حركة الخزائن"
            value={formatNumber(stats.netBalance)}
            unit="ج.م"
            variant="blue"
            icon={<Wallet className="w-5 h-5" />}
          />
        </div>

        {/* Unified Modern Toolbar */}
        <div className="flex flex-wrap items-center justify-between gap-3 bg-surface border border-slate-200/80 dark:border-slate-800/80 p-3.5 rounded-2xl shadow-2xs">
          {/* Right: Search & Type Filter */}
          <div className="flex flex-wrap items-center gap-2.5 flex-1 min-w-[280px]">
            <div className="relative flex-1 max-w-sm">
              <Input
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="بحث برقم السند أو اسم الطرف..."
                className="h-10 pr-9 pl-9 bg-slate-50/70 dark:bg-slate-900/70 text-xs font-semibold rounded-xl border-slate-200/80 dark:border-slate-800"
                icon={<Search className="w-4 h-4 text-slate-400" />}
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            <div className="w-36">
              <Select value={typeFilter} onValueChange={setTypeFilter}>
                <SelectTrigger className="w-full h-10 rounded-xl bg-slate-50/70 dark:bg-slate-900/70 border-slate-200/80 dark:border-slate-800 text-xs font-bold">
                  <SelectValue placeholder="نوع السند" />
                </SelectTrigger>
                <SelectContent className="z-50 bg-popover border border-slate-200 dark:border-slate-800 rounded-xl shadow-xl">
                  <SelectItem value="all">كل السندات</SelectItem>
                  <SelectItem value="receipt">سندات قبض</SelectItem>
                  <SelectItem value="payment">سندات صرف</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {typeFilter !== 'all' && (
              <Button
                variant="ghost"
                onClick={() => setTypeFilter('all')}
                className="h-10 px-2.5 text-xs font-bold text-slate-500 hover:text-destructive"
              >
                إعادة تعيين
              </Button>
            )}
          </div>

          {/* Left: Actions & Page size */}
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="icon"
              onClick={loadData}
              className="h-10 w-10 rounded-xl border-slate-200/80 dark:border-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 cursor-pointer shadow-2xs"
              title="تحديث البيانات"
            >
              <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
            </Button>
            <Button
              variant="outline"
              size="icon"
              onClick={() => window.print()}
              className="h-10 w-10 rounded-xl border-slate-200/80 dark:border-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 cursor-pointer shadow-2xs"
              title="طباعة"
            >
              <Printer className="w-4 h-4" />
            </Button>
            <Button
              variant="outline"
              size="icon"
              onClick={() => toast.info('جاري تصدير السندات إلى Excel...')}
              className="h-10 w-10 rounded-xl border-slate-200/80 dark:border-slate-800 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-950/40 cursor-pointer shadow-2xs"
              title="تصدير Excel"
            >
              <FileSpreadsheet className="w-4 h-4" />
            </Button>

            <div className="h-6 w-px bg-slate-200 dark:bg-slate-800 mx-1" />

            <div className="flex items-center gap-1.5 text-2xs font-bold text-slate-500">
              <span className="hidden sm:inline">عرض</span>
              <Select value={pageSize} onValueChange={setPageSize}>
                <SelectTrigger className="w-20 h-10 rounded-xl bg-slate-50/70 dark:bg-slate-900/70 border-slate-200/80 dark:border-slate-800 text-xs font-bold">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="z-50 bg-popover border border-slate-200 dark:border-slate-800 rounded-xl shadow-xl">
                  <SelectItem value="10">10</SelectItem>
                  <SelectItem value="25">25</SelectItem>
                  <SelectItem value="50">50</SelectItem>
                  <SelectItem value="100">100</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>

        {/* Data Grid Container */}
        <Card className="rounded-2xl border border-slate-200/80 dark:border-slate-800 bg-surface overflow-hidden shadow-2xs">
          <CardContent className="p-0">
            {isLoading ? (
              <div className="py-16 text-center text-xs font-bold text-slate-400">
                جارٍ تحميل السندات المالية...
              </div>
            ) : filteredVouchers.length === 0 ? (
              <EmptyState
                icon={<Wallet className="w-7 h-7 text-slate-400" />}
                title="لا توجد سندات مالية مسجلة"
                description={
                  searchQuery || typeFilter !== 'all'
                    ? 'لم يتم العثور على أي سندات تطابق شروط البحث أو التصفية الحالية.'
                    : 'سجل السندات فارغ حالياً. يمكنك البدء بإنشاء سند قبض للتحصيل أو سند صرف للدفع.'
                }
                action={
                  !searchQuery && typeFilter === 'all'
                    ? {
                        label: 'إنشاء سند قبض جديد',
                        onClick: () => {
                          setActiveModalType('receipt');
                          setIsVoucherModalOpen(true);
                        },
                        icon: <Plus className="w-4 h-4" />,
                      }
                    : undefined
                }
                className="border-none bg-transparent py-16"
              />
            ) : (
              <div className="overflow-x-auto">
                <Table className="w-full text-right">
                  <TableHeader>
                    <TableRow>
                      <TableHead className="py-3.5 pr-5 w-32">رقم السند</TableHead>
                      <TableHead className="py-3.5">التاريخ</TableHead>
                      <TableHead className="py-3.5">الجهة / الطرف</TableHead>
                      <TableHead className="py-3.5 text-center">النوع</TableHead>
                      <TableHead className="py-3.5 text-left">المبلغ</TableHead>
                      <TableHead className="py-3.5 text-center">الحالة</TableHead>
                      <TableHead className="py-3.5 pl-5 text-center w-20">عكس</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredVouchers.map((v) => (
                      <TableRow
                        key={v.id}
                        className={`transition-colors hover:bg-slate-50/70 dark:hover:bg-slate-800/40 ${
                          v.is_reversed ? 'opacity-60 line-through bg-slate-50/50 dark:bg-slate-900/30' : ''
                        }`}
                      >
                        <TableCell className="py-3.5 pr-5 font-black text-slate-900 dark:text-white font-mono text-xs">
                          #{v.voucher_no}
                        </TableCell>
                        <TableCell className="py-3.5 text-slate-500 font-semibold text-xs">
                          {new Date(v.created_at).toLocaleDateString('ar-EG', {
                            year: 'numeric',
                            month: 'short',
                            day: 'numeric',
                          })}
                        </TableCell>
                        <TableCell className="py-3.5 font-bold text-slate-800 dark:text-slate-200 text-xs">
                          <div className="flex items-center gap-2">
                            <div
                              className={`w-6 h-6 rounded-lg flex items-center justify-center shrink-0 ${
                                v.type === 'receipt'
                                  ? 'bg-emerald-50 text-emerald-600 dark:bg-emerald-950/60 dark:text-emerald-400'
                                  : 'bg-rose-50 text-rose-600 dark:bg-rose-950/60 dark:text-rose-400'
                              }`}
                            >
                              {v.type === 'receipt' ? (
                                <ArrowDownCircle className="w-3.5 h-3.5" />
                              ) : (
                                <ArrowUpCircle className="w-3.5 h-3.5" />
                              )}
                            </div>
                            <span>{contactName(v.contact_id)}</span>
                          </div>
                        </TableCell>
                        <TableCell className="py-3.5 text-center">
                          <Badge
                            variant="outline"
                            className={`text-3xs font-extrabold rounded-lg px-2.5 py-0.5 ${
                              v.type === 'receipt'
                                ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-400 border-emerald-200/80 dark:border-emerald-800/80'
                                : 'bg-rose-50 text-rose-700 dark:bg-rose-950/60 dark:text-rose-400 border-rose-200/80 dark:border-rose-800/80'
                            }`}
                          >
                            {v.type === 'receipt' ? 'قبض' : 'صرف'}
                          </Badge>
                        </TableCell>
                        <TableCell
                          className={`py-3.5 text-left font-black text-xs sm:text-sm tabular-nums ${
                            v.type === 'receipt'
                              ? 'text-emerald-600 dark:text-emerald-400'
                              : 'text-rose-600 dark:text-rose-400'
                          }`}
                        >
                          {v.type === 'receipt' ? '+' : '-'}
                          {formatNumber(v.amount)} <span className="text-3xs font-semibold text-slate-400">ج.م</span>
                        </TableCell>
                        <TableCell className="py-3.5 text-center">
                          {v.is_reversed ? (
                            <Badge variant="outline" className="text-slate-400 bg-slate-100 dark:bg-slate-800 text-3xs font-bold rounded-lg px-2 py-0.5">
                              معكوس
                            </Badge>
                          ) : (
                            <Badge variant="outline" className="text-emerald-600 border-emerald-200/80 bg-emerald-50/80 text-3xs font-bold rounded-lg px-2 py-0.5">
                              سارٍ
                            </Badge>
                          )}
                        </TableCell>
                        <TableCell className="py-3.5 pl-5 text-center">
                          {!v.is_reversed && (
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleReverse(v)}
                              disabled={reversingId === v.id}
                              title="عكس السند"
                              className="w-8 h-8 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/40 cursor-pointer mx-auto"
                            >
                              <RotateCcw className={`w-3.5 h-3.5 ${reversingId === v.id ? 'animate-spin' : ''}`} />
                            </Button>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>

                {/* Footer Bar */}
                <div className="p-4 bg-slate-50/50 dark:bg-slate-900/40 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-2xs font-semibold text-muted-foreground">
                  <div>
                    عرض <span className="font-bold text-foreground">{filteredVouchers.length}</span> من إجمالي{' '}
                    <span className="font-bold text-foreground">{stats.count}</span> سند
                  </div>
                  <div className="flex items-center gap-1.5">
                    <Button variant="outline" size="sm" className="h-8 px-3 rounded-lg text-xs font-bold cursor-pointer">
                      السابق
                    </Button>
                    <Button size="sm" className="h-8 px-3 rounded-lg text-xs font-black bg-primary text-white">
                      1
                    </Button>
                    <Button variant="outline" size="sm" className="h-8 px-3 rounded-lg text-xs font-bold cursor-pointer">
                      التالي
                    </Button>
                  </div>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Modal: Create Voucher */}
        <Dialog open={isVoucherModalOpen} onOpenChange={setIsVoucherModalOpen}>
          <DialogContent className="sm:max-w-[500px] p-6 rounded-2xl bg-surface border border-slate-200/80 dark:border-slate-800 shadow-xl" dir="rtl">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
              <div className="flex items-center gap-3">
                <div
                  className={`w-9 h-9 rounded-xl flex items-center justify-center font-bold shadow-xs ${
                    activeModalType === 'receipt'
                      ? 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400'
                      : 'bg-rose-50 dark:bg-rose-950/60 text-rose-600 dark:text-rose-400'
                  }`}
                >
                  {activeModalType === 'receipt' ? <Plus className="w-4 h-4" /> : <Minus className="w-4 h-4" />}
                </div>
                <div>
                  <h3 className="text-sm font-black text-slate-900 dark:text-white">
                    إضافة {activeModalType === 'receipt' ? 'سند قبض' : 'سند صرف'} جديد
                  </h3>
                  <p className="text-2xs text-muted-foreground">
                    {activeModalType === 'receipt' ? 'تحصيل وإيداع بالخزينة' : 'صرف وسحب من الخزينة'}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsVoucherModalOpen(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-4 pt-2">
              {/* Contact Select */}
              <div className="space-y-1.5">
                <Label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                  اسم {activeModalType === 'receipt' ? 'العميل' : 'المورد'} / الجهة
                </Label>
                <Select value={vContactId || 'none'} onValueChange={(val) => setVContactId(val === 'none' ? '' : val)}>
                  <SelectTrigger className="h-10 rounded-xl bg-surface border-slate-200 dark:border-slate-800 text-xs font-bold">
                    <SelectValue placeholder="بدون جهة (نقدي)" />
                  </SelectTrigger>
                  <SelectContent className="rounded-xl shadow-xl max-h-72">
                    <SelectItem value="none">
                      <div className="flex items-center gap-2">
                        <User className="w-4 h-4 text-slate-400" /> بدون جهة (نقدي)
                      </div>
                    </SelectItem>
                    {contacts.map((c) => (
                      <SelectItem key={c.id} value={c.id}>
                        {c.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Amount & Treasury */}
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label className="text-xs font-bold text-slate-700 dark:text-slate-300">المبلغ (ج.م)</Label>
                  <Input
                    type="number"
                    value={vAmount}
                    onChange={(e) => setVAmount(e.target.value)}
                    placeholder="0.00"
                    className="h-10 rounded-xl font-bold"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs font-bold text-slate-700 dark:text-slate-300">الخزينة</Label>
                  <Select value={vTreasuryId} onValueChange={setVTreasuryId}>
                    <SelectTrigger className="h-10 rounded-xl bg-surface border-slate-200 dark:border-slate-800 text-xs font-bold">
                      <SelectValue placeholder="اختر الخزينة" />
                    </SelectTrigger>
                    <SelectContent>
                      {treasuries.map((t) => (
                        <SelectItem key={t.id} value={t.id}>
                          {t.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Description */}
              <div className="space-y-1.5">
                <Label className="text-xs font-bold text-slate-700 dark:text-slate-300">البيان / الملاحظات</Label>
                <textarea
                  value={vDescription}
                  onChange={(e) => setVDescription(e.target.value)}
                  placeholder="سبب الصرف أو استلام المبلغ..."
                  className="w-full min-h-[75px] p-3 rounded-xl bg-surface border border-slate-200 dark:border-slate-800 text-xs font-semibold text-slate-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-primary transition-all"
                />
              </div>

              {/* Actions */}
              <div className="flex items-center gap-2.5 pt-2">
                <Button
                  onClick={handleCreateVoucher}
                  disabled={isBusy}
                  className={`flex-1 h-10 text-white font-bold text-xs rounded-xl shadow-xs transition-all cursor-pointer ${
                    activeModalType === 'receipt'
                      ? 'bg-emerald-600 hover:bg-emerald-700 shadow-emerald-500/20'
                      : 'bg-rose-600 hover:bg-rose-700 shadow-rose-500/20'
                  }`}
                >
                  {isBusy ? 'جاري الحفظ...' : 'حفظ وترحيل السند'}
                </Button>
                <Button
                  onClick={() => setIsVoucherModalOpen(false)}
                  variant="outline"
                  className="h-10 px-4 border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-300 font-bold text-xs rounded-xl hover:bg-slate-50 dark:hover:bg-slate-800 cursor-pointer"
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

export default function VouchersPage() {
  return (
    <Suspense fallback={<div />}>
      <VouchersContent />
    </Suspense>
  );
}