'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { AppShell } from '@/components/layout/AppShell';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
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
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  RefreshCw,
  Plus,
  ArrowLeftRight,
  Wallet,
  TrendingUp,
  CreditCard,
  Banknote,
  ArrowDownCircle,
  CircleDollarSign,
  Trash2,
} from 'lucide-react';
import { useSessionStore } from '@/core/state/useSessionStore';
import { TreasuryRepository } from '@/modules/treasury/treasury_repository';
import type { Treasury, TreasuryType } from '@/types';
import { toast } from 'sonner';
import { formatNumber } from '@/lib/format';
import { KpiCard } from '@/components/ui/kpi-card';
import { EmptyState } from '@/components/ui/empty-state';
import { Badge } from '@/components/ui/badge';

export default function TreasuriesPage() {
  const { currentUser } = useSessionStore();
  const orgId = currentUser?.org_id || '';
  const userId = currentUser?.id || '';

  const [treasuries, setTreasuries] = useState<Treasury[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [currency, setCurrency] = useState('ج.م');

  // Modals state
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isTransferModalOpen, setIsTransferModalOpen] = useState(false);
  const [isVoucherModalOpen, setIsVoucherModalOpen] = useState(false);
  const [selectedTreasury, setSelectedTreasury] = useState<Treasury | null>(null);

  // Form states
  const [newTreasuryName, setNewTreasuryName] = useState('');
  const [newTreasuryType, setNewTreasuryType] = useState<TreasuryType>('safe');
  const [newTreasuryOpening, setNewTreasuryOpening] = useState('0');
  const [isSaving, setIsSaving] = useState(false);

  // Transfer state
  const [transferFrom, setTransferFrom] = useState('');
  const [transferTo, setTransferTo] = useState('');
  const [transferAmount, setTransferAmount] = useState('');
  const [transferNote, setTransferNote] = useState('');

  // Voucher state (Deposit/Withdraw)
  const [voucherType, setVoucherType] = useState<'receipt' | 'payment'>('receipt');
  const [voucherAmount, setVoucherAmount] = useState('');
  const [voucherNote, setVoucherNote] = useState('');

  const loadData = async () => {
    if (!orgId) return;
    try {
      setIsLoading(true);
      const [list, org] = await Promise.all([
        TreasuryRepository.getTreasuries(orgId),
        import('@/core/db/app_database').then((m) => m.db.organizations.get(orgId)),
      ]);
      setTreasuries(list);
      if (org?.currency === 'EGP') setCurrency('ج.م');
      else if (org?.currency) setCurrency(org.currency);
    } catch (err) {
      console.error('Error loading treasuries:', err);
      toast.error('حدث خطأ أثناء تحميل البيانات المالية');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [orgId]);

  const stats = useMemo(() => {
    const totalBalance = treasuries.reduce((sum, t) => sum + (t.current_balance || 0), 0);
    const defaultTreasury = treasuries.find((t) => t.is_default);
    return {
      totalBalance,
      count: treasuries.length,
      defaultName: defaultTreasury?.name || '—',
    };
  }, [treasuries]);

  const handleCreateTreasury = async () => {
    if (!newTreasuryName.trim()) {
      toast.error('يرجى إدخال اسم الخزينة');
      return;
    }
    setIsSaving(true);
    try {
      await TreasuryRepository.createTreasury({
        orgId,
        name: newTreasuryName.trim(),
        type: newTreasuryType,
        openingBalance: Number(newTreasuryOpening) || 0,
        isDefault: treasuries.length === 0,
      });
      toast.success('تم إنشاء الخزينة بنجاح');
      setIsAddModalOpen(false);
      setNewTreasuryName('');
      setNewTreasuryOpening('0');
      await loadData();
    } catch (err) {
      toast.error('حدث خطأ أثناء إنشاء الخزينة');
    } finally {
      setIsSaving(false);
    }
  };

  const handleTransfer = async () => {
    if (!transferFrom || !transferTo || !transferAmount) {
      toast.error('يرجى إكمال بيانات التحويل');
      return;
    }
    setIsSaving(true);
    try {
      await TreasuryRepository.internalTransfer({
        orgId,
        fromTreasuryId: transferFrom,
        toTreasuryId: transferTo,
        amount: Number(transferAmount),
        description: transferNote || 'تحويل داخلي',
        userId,
      });
      toast.success('تمت عملية التحويل بنجاح');
      setIsTransferModalOpen(false);
      setTransferAmount('');
      setTransferNote('');
      await loadData();
    } catch (err: any) {
      toast.error(err.message || 'حدث خطأ أثناء التحويل');
    } finally {
      setIsSaving(false);
    }
  };

  const handleVoucher = async () => {
    if (!selectedTreasury || !voucherAmount) {
      toast.error('يرجى إدخال المبلغ');
      return;
    }
    setIsSaving(true);
    try {
      await TreasuryRepository.createVoucher({
        orgId,
        userId,
        treasuryId: selectedTreasury.id,
        type: voucherType,
        amount: Number(voucherAmount),
        description: voucherNote || (voucherType === 'receipt' ? 'إيداع رصيد' : 'سحب رصيد'),
      });
      toast.success(voucherType === 'receipt' ? 'تم الإيداع بنجاح' : 'تم السحب بنجاح');
      setIsVoucherModalOpen(false);
      setVoucherAmount('');
      setVoucherNote('');
      await loadData();
    } catch (err) {
      toast.error('حدث خطأ أثناء العملية المالية');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteTreasury = async (id: string) => {
    const confirmed = window.confirm('هل أنت متأكد من حذف هذه الخزينة نهائياً؟ لا يمكن التراجع عن هذا الإجراء.');
    if (!confirmed) return;

    try {
      await TreasuryRepository.deleteTreasury(id, orgId);
      toast.success('تم حذف الخزينة بنجاح');
      await loadData();
    } catch (err: any) {
      toast.error(err.message || 'حدث خطأ أثناء الحذف');
    }
  };

  const headerActions = (
    <div className="flex items-center gap-2.5">
      <Button
        onClick={() => {
          setNewTreasuryType('safe');
          setIsAddModalOpen(true);
        }}
        className="h-10 px-4 bg-primary hover:bg-primary/90 text-white font-bold text-xs rounded-xl flex items-center gap-2 shadow-xs hover:shadow-md transition-all cursor-pointer"
      >
        <Plus className="w-4 h-4" />
        <span>خزينة جديدة</span>
      </Button>

      <Button
        onClick={() => setIsTransferModalOpen(true)}
        variant="outline"
        className="h-10 px-4 border-slate-200/80 dark:border-slate-800 text-slate-700 dark:text-slate-200 font-bold text-xs rounded-xl flex items-center gap-2 hover:bg-slate-50 dark:hover:bg-slate-800 transition-all cursor-pointer"
      >
        <ArrowLeftRight className="w-4 h-4 text-amber-500" />
        <span>تحويل داخلي</span>
      </Button>

      <Button
        onClick={loadData}
        variant="outline"
        size="icon"
        className="h-10 w-10 border-slate-200/80 dark:border-slate-800 text-slate-500 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-800 cursor-pointer shadow-2xs"
        title="تحديث البيانات"
      >
        <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
      </Button>
    </div>
  );

  return (
    <AppShell
      title="الخزائن والبنوك"
      subtitle="إدارة الحسابات النقدية والبنكية، متابعة الأرصدة والتحكم في السيولة المالية للمؤسسة"
      actions={headerActions}
    >
      <div className="space-y-5 text-right" dir="rtl">
        {/* Metric Cards — Linear/Stripe Style */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <KpiCard
            label="إجمالي السيولة النقدية"
            value={formatNumber(stats.totalBalance)}
            unit={currency}
            variant="emerald"
            icon={<Wallet className="w-5 h-5" />}
          />
          <KpiCard
            label="عدد الخزائن والحسابات"
            value={stats.count}
            unit="حساب مالي"
            variant="blue"
            icon={<CircleDollarSign className="w-5 h-5" />}
          />
          <KpiCard
            label="الخزينة الافتراضية"
            value={stats.defaultName}
            variant="indigo"
            icon={<Banknote className="w-5 h-5" />}
          />
        </div>

        {/* Treasuries List */}
        <div className="space-y-3">
          {isLoading ? (
            <div className="py-20 flex flex-col items-center justify-center gap-3">
              <div className="w-8 h-8 border-3 border-primary border-t-transparent rounded-full animate-spin" />
              <span className="text-xs font-bold text-slate-400">جاري تحميل الحسابات المالية...</span>
            </div>
          ) : treasuries.length === 0 ? (
            <EmptyState
              icon={<Wallet className="w-7 h-7 text-slate-400" />}
              title="لا توجد خزائن أو حسابات مسجلة"
              description="ابدأ بإضافة أول خزينة للمؤسسة لإدارة معاملاتك المالية النقدية والبنكية."
              action={{
                label: 'إضافة أول خزينة الآن',
                onClick: () => {
                  setNewTreasuryType('safe');
                  setIsAddModalOpen(true);
                },
                icon: <Plus className="w-4 h-4" />,
              }}
            />
          ) : (
            treasuries.map((t) => (
              <div
                key={t.id}
                className="bg-surface rounded-2xl border border-slate-200/80 dark:border-slate-800 p-4.5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-2xs hover:shadow-xs transition-all group"
              >
                <div className="flex items-center gap-3.5">
                  <div
                    className={`w-11 h-11 rounded-xl flex items-center justify-center shrink-0 shadow-2xs transition-transform group-hover:scale-105 ${
                      t.type === 'bank'
                        ? 'bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 border border-blue-200/50 dark:border-blue-800/50'
                        : t.type === 'pos_terminal'
                        ? 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 border border-emerald-200/50 dark:border-emerald-800/50'
                        : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200/50 dark:border-slate-700/50'
                    }`}
                  >
                    {t.type === 'bank' ? (
                      <CircleDollarSign className="w-5 h-5" />
                    ) : t.type === 'pos_terminal' ? (
                      <CreditCard className="w-5 h-5" />
                    ) : (
                      <Banknote className="w-5 h-5" />
                    )}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h4 className="text-sm font-black text-slate-900 dark:text-white">{t.name}</h4>
                      {t.is_default && (
                        <Badge variant="outline" className="text-4xs font-black bg-blue-50 dark:bg-blue-950/60 text-primary border-blue-200/60">
                          الافتراضية
                        </Badge>
                      )}
                    </div>
                    <p className="text-3xs font-semibold text-slate-400 mt-0.5">
                      كود الحساب: {t.account_code || '—'}
                    </p>
                  </div>
                </div>

                <div className="flex items-center justify-between sm:justify-end gap-4 sm:gap-6 pt-2 sm:pt-0 border-t sm:border-t-0 border-slate-100 dark:border-slate-800">
                  <div className="text-right sm:text-left">
                    <span className="text-4xs font-bold text-slate-400 block sm:hidden">الرصيد الحالي</span>
                    <span
                      className={`text-lg font-black tabular-nums ${
                        t.current_balance < 0 ? 'text-rose-600 dark:text-rose-400' : 'text-emerald-600 dark:text-emerald-400'
                      }`}
                    >
                      {formatNumber(t.current_balance)} <span className="text-3xs font-bold text-slate-400">{currency}</span>
                    </span>
                  </div>

                  <div className="flex items-center gap-2">
                    <Button
                      onClick={() => {
                        setSelectedTreasury(t);
                        setVoucherType('receipt');
                        setIsVoucherModalOpen(true);
                      }}
                      variant="outline"
                      className="h-9 px-3 border-slate-200/80 dark:border-slate-800 text-primary hover:bg-primary/10 font-bold text-xs rounded-xl flex items-center gap-1.5 cursor-pointer shadow-2xs"
                    >
                      <ArrowDownCircle className="w-3.5 h-3.5" />
                      <span>إيداع</span>
                    </Button>

                    <Button
                      onClick={() => {
                        setTransferFrom(t.id);
                        setIsTransferModalOpen(true);
                      }}
                      variant="outline"
                      className="h-9 px-3 border-slate-200/80 dark:border-slate-800 text-amber-600 hover:bg-amber-50 dark:hover:bg-amber-950/40 font-bold text-xs rounded-xl flex items-center gap-1.5 cursor-pointer shadow-2xs"
                    >
                      <ArrowLeftRight className="w-3.5 h-3.5" />
                      <span>تحويل</span>
                    </Button>

                    {!t.is_default && (
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleDeleteTreasury(t.id)}
                        className="h-9 w-9 text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded-xl cursor-pointer"
                        title="حذف الخزينة"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    )}
                  </div>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Modals */}
        {/* 1. Add Treasury Modal */}
        <Dialog open={isAddModalOpen} onOpenChange={setIsAddModalOpen}>
          <DialogContent className="sm:max-w-[420px] rounded-2xl p-6" dir="rtl">
            <DialogHeader>
              <div className="flex items-center gap-2 text-primary mb-1">
                <Wallet className="w-5 h-5" />
                <DialogTitle className="text-base font-black text-slate-900 dark:text-white">
                  إضافة خزينة / حساب مالي جديد
                </DialogTitle>
              </div>
              <DialogDescription className="text-xs text-muted-foreground">
                سيتم إنشاء حساب مالي جديد لإدارة المعاملات النقدية أو البنكية.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-3.5 pt-2">
              <div className="space-y-1.5">
                <Label className="text-xs font-bold text-slate-700 dark:text-slate-300">اسم الخزينة / الحساب</Label>
                <Input
                  value={newTreasuryName}
                  onChange={(e) => setNewTreasuryName(e.target.value)}
                  placeholder="مثال: الخزينة الرئيسية، حساب بنك مصر"
                  className="h-10 text-xs font-bold rounded-xl"
                />
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-bold text-slate-700 dark:text-slate-300">نوع الحساب</Label>
                <Select value={newTreasuryType} onValueChange={(v: any) => setNewTreasuryType(v)}>
                  <SelectTrigger className="h-10 text-xs font-bold rounded-xl">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="safe">خزينة نقدية (Safe)</SelectItem>
                    <SelectItem value="bank">حساب بنكي (Bank)</SelectItem>
                    <SelectItem value="pos_terminal">ماكينة دفع / عهدة كاشير (POS)</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-bold text-slate-700 dark:text-slate-300">الرصيد الافتتاحي</Label>
                <Input
                  type="number"
                  value={newTreasuryOpening}
                  onChange={(e) => setNewTreasuryOpening(e.target.value)}
                  className="h-10 text-xs font-bold rounded-xl"
                />
              </div>
            </div>

            <DialogFooter className="mt-4 gap-2">
              <Button variant="outline" onClick={() => setIsAddModalOpen(false)} className="h-10 px-4 font-bold text-xs rounded-xl cursor-pointer">
                إلغاء
              </Button>
              <Button onClick={handleCreateTreasury} disabled={isSaving} className="h-10 px-5 bg-primary hover:bg-primary/90 text-white font-bold text-xs rounded-xl cursor-pointer shadow-xs">
                {isSaving ? 'جاري الحفظ...' : 'إنشاء الحساب'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* 2. Internal Transfer Modal */}
        <Dialog open={isTransferModalOpen} onOpenChange={setIsTransferModalOpen}>
          <DialogContent className="sm:max-w-[440px] rounded-2xl p-6" dir="rtl">
            <DialogHeader>
              <div className="flex items-center gap-2 text-amber-500 mb-1">
                <ArrowLeftRight className="w-5 h-5" />
                <DialogTitle className="text-base font-black text-slate-900 dark:text-white">تحويل مالي داخلي</DialogTitle>
              </div>
              <DialogDescription className="text-xs text-muted-foreground">
                نقل الأموال بين الخزائن والحسابات البنكية للمؤسسة مع تسجيل قيود التحويل.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-3.5 pt-2">
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label className="text-xs font-bold text-slate-700 dark:text-slate-300">من (المصدر)</Label>
                  <Select value={transferFrom} onValueChange={setTransferFrom}>
                    <SelectTrigger className="h-10 text-xs font-bold rounded-xl">
                      <SelectValue placeholder="اختر الخزينة" />
                    </SelectTrigger>
                    <SelectContent>
                      {treasuries.map((t) => (
                        <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs font-bold text-slate-700 dark:text-slate-300">إلى (المستلم)</Label>
                  <Select value={transferTo} onValueChange={setTransferTo}>
                    <SelectTrigger className="h-10 text-xs font-bold rounded-xl">
                      <SelectValue placeholder="اختر الخزينة" />
                    </SelectTrigger>
                    <SelectContent>
                      {treasuries.map((t) => (
                        <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-bold text-slate-700 dark:text-slate-300">المبلغ ({currency})</Label>
                <Input
                  type="number"
                  value={transferAmount}
                  onChange={(e) => setTransferAmount(e.target.value)}
                  placeholder="0.00"
                  className="h-10 text-sm font-black text-amber-600 dark:text-amber-400 rounded-xl"
                />
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-bold text-slate-700 dark:text-slate-300">بيان / ملاحظات التحويل</Label>
                <Input
                  value={transferNote}
                  onChange={(e) => setTransferNote(e.target.value)}
                  placeholder="اكتب سبب التحويل..."
                  className="h-10 text-xs font-semibold rounded-xl"
                />
              </div>
            </div>

            <DialogFooter className="mt-4 gap-2">
              <Button variant="outline" onClick={() => setIsTransferModalOpen(false)} className="h-10 px-4 font-bold text-xs rounded-xl cursor-pointer">
                إلغاء
              </Button>
              <Button onClick={handleTransfer} disabled={isSaving} className="h-10 px-5 bg-amber-500 hover:bg-amber-600 text-white font-bold text-xs rounded-xl cursor-pointer shadow-xs">
                {isSaving ? 'جاري التحويل...' : 'تأكيد التحويل الآن'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* 3. Voucher Modal (Deposit/Withdraw) */}
        <Dialog open={isVoucherModalOpen} onOpenChange={setIsVoucherModalOpen}>
          <DialogContent className="sm:max-w-[400px] rounded-2xl p-6" dir="rtl">
            <DialogHeader>
              <div className="flex items-center gap-2 text-primary mb-1">
                <TrendingUp className="w-5 h-5" />
                <DialogTitle className="text-base font-black text-slate-900 dark:text-white">
                  {voucherType === 'receipt' ? 'إيداع رصيد نقدي' : 'سحب رصيد نقدي'}
                </DialogTitle>
              </div>
              <DialogDescription className="text-xs text-muted-foreground">
                {voucherType === 'receipt' ? 'إضافة مبلغ مالي إلى رصيد: ' : 'خصم مبلغ مالي من رصيد: '}
                <span className="font-bold text-foreground">{selectedTreasury?.name}</span>
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-3.5 pt-2">
              <div className="space-y-1.5">
                <Label className="text-xs font-bold text-slate-700 dark:text-slate-300">المبلغ ({currency})</Label>
                <Input
                  type="number"
                  value={voucherAmount}
                  onChange={(e) => setVoucherAmount(e.target.value)}
                  placeholder="0.00"
                  className="h-10 text-sm font-black text-primary rounded-xl"
                />
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-bold text-slate-700 dark:text-slate-300">البيان</Label>
                <Input
                  value={voucherNote}
                  onChange={(e) => setVoucherNote(e.target.value)}
                  placeholder="مثال: رصيد افتتاحي، تغذية نقدية..."
                  className="h-10 text-xs font-semibold rounded-xl"
                />
              </div>
            </div>

            <DialogFooter className="mt-4 gap-2">
              <Button variant="outline" onClick={() => setIsVoucherModalOpen(false)} className="h-10 px-4 font-bold text-xs rounded-xl cursor-pointer">
                إلغاء
              </Button>
              <Button onClick={handleVoucher} disabled={isSaving} className="h-10 px-5 bg-primary hover:bg-primary/90 text-white font-bold text-xs rounded-xl cursor-pointer shadow-xs">
                {isSaving ? 'جاري التنفيذ...' : 'تأكيد العملية'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </AppShell>
  );
}