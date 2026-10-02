'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { AppShell } from '@/components/layout/AppShell';
import { db } from '@/core/db/app_database';
import { DigitalWalletRepository } from '@/modules/mobile/digital_wallet_repository';
import { useSessionStore } from '@/core/state/useSessionStore';
import { formatNumber, formatDateTime } from '@/lib/format';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Wallet,
  Plus,
  Search,
  CheckCircle2,
  Phone,
  Coins,
  Loader2,
  TrendingUp,
  Receipt,
} from 'lucide-react';
import type {
  DigitalWalletTransaction,
  WalletServiceType,
  Treasury,
} from '@/types';
import { toast } from 'sonner';

const SERVICE_LABELS: Record<WalletServiceType, string> = {
  vodafone_cash_deposit: 'تحويل / إيداع فودافون كاش',
  vodafone_cash_withdraw: 'سحب فودافون كاش من عميل',
  instapay_transfer: 'تحويل إنستاباي InstaPay',
  fawry_payment: 'مدفوعات فوري Fawry',
  topup_recharge: 'شحن رصيد كروت / تطاير',
  other_wallet_service: 'خدمات تحويل رقمي أخرى',
};

export default function WalletsPage() {
  const { currentUser, activeShift } = useSessionStore();
  const orgId = currentUser?.org_id || '';

  const [transactions, setTransactions] = useState<DigitalWalletTransaction[]>([]);
  const [treasuries, setTreasuries] = useState<Treasury[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const [searchQuery, setSearchQuery] = useState('');
  const [serviceFilter, setServiceFilter] = useState<string>('all');

  // Modal
  const [isNewTxOpen, setIsNewTxOpen] = useState(false);
  const [serviceType, setServiceType] = useState<WalletServiceType>('vodafone_cash_deposit');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [amount, setAmount] = useState('');
  const [commissionAmount, setCommissionAmount] = useState('');
  const [targetTreasuryId, setTargetTreasuryId] = useState('');
  const [referenceNumber, setReferenceNumber] = useState('');
  const [notes, setNotes] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  const loadData = async () => {
    if (!orgId) return;
    setIsLoading(true);
    try {
      const [txList, trList] = await Promise.all([
        DigitalWalletRepository.getTransactions(orgId),
        db.treasuries.where('org_id').equals(orgId).and((t) => t.is_active).toArray(),
      ]);

      setTransactions(txList);
      setTreasuries(trList);
      if (trList.length > 0) setTargetTreasuryId(trList.find((t) => t.is_default)?.id || trList[0].id);
    } catch (err) {
      console.error('Error loading wallet transactions:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [orgId]);

  const filteredTransactions = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return transactions.filter((t) => {
      const matchesSearch =
        !q ||
        (t.phone_number || '').includes(q) ||
        (t.reference_number || '').toLowerCase().includes(q) ||
        t.service_label.toLowerCase().includes(q);

      const matchesService = serviceFilter === 'all' || t.service_type === serviceFilter;

      return matchesSearch && matchesService;
    });
  }, [transactions, searchQuery, serviceFilter]);

  const totalCommissions = useMemo(() => {
    return filteredTransactions.reduce((sum, t) => sum + (t.commission_amount || 0), 0);
  }, [filteredTransactions]);

  const handleExecuteTransaction = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser || !amount || parseFloat(amount) <= 0) {
      toast.error('يرجى كتابة مبلغ التحويل/الشحن بشكل صحيح');
      return;
    }
    if (!targetTreasuryId) {
      toast.error('يرجى اختيار المحفظة / الخزينة');
      return;
    }

    try {
      setIsSaving(true);
      await DigitalWalletRepository.executeTransaction({
        orgId,
        branchId: currentUser.branch_id || '',
        shiftId: activeShift?.id || null,
        treasuryId: targetTreasuryId,
        serviceType,
        serviceLabel: SERVICE_LABELS[serviceType],
        phoneNumber: phoneNumber.trim(),
        amount: parseFloat(amount) || 0,
        commissionAmount: parseFloat(commissionAmount) || 0,
        referenceNumber: referenceNumber.trim(),
        notes: notes.trim(),
        userId: currentUser.id,
      });

      toast.success(`تم تنفيذ عملية الشحن/التحويل (${SERVICE_LABELS[serviceType]}) بنجاح وتأكيد الربح`);
      setIsNewTxOpen(false);
      setPhoneNumber('');
      setAmount('');
      setCommissionAmount('');
      setReferenceNumber('');
      setNotes('');
      loadData();
    } catch (err: any) {
      toast.error(err?.message || 'تعذر تنفيذ حركة الشحن');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <AppShell
      title="المحافظ الرقمية وخدمات الشحن والتحويل"
      subtitle="إدارة حركات فودافون كاش، إنستاباي، فوري، شحن الرصيد، وتسجيل عمولات المحل تلقائياً"
      actions={
        <div className="flex items-center gap-3">
          <div className="px-4 py-2 rounded-2xl bg-purple-50 dark:bg-purple-950/40 border border-purple-200 dark:border-purple-800 text-right">
            <span className="text-3xs text-purple-600 dark:text-purple-300 font-bold block">إجمالي العمولات والأرباح:</span>
            <span className="font-mono font-black text-sm text-purple-700 dark:text-purple-300">
              {formatNumber(totalCommissions)} ج.م
            </span>
          </div>

          <Button
            onClick={() => setIsNewTxOpen(true)}
            className="h-11 px-5 rounded-2xl bg-purple-600 hover:bg-purple-700 text-white font-black text-xs flex items-center gap-2 shadow-md hover:shadow-lg transition-all cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>تنفيذ عملية شحن / تحويل جديدة</span>
          </Button>
        </div>
      }
    >
      <div className="space-y-6 text-right" dir="rtl">

      {/* Toolbar */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div className="relative sm:col-span-2">
          <Search className="w-4 h-4 text-slate-400 absolute right-3.5 top-1/2 -translate-y-1/2" />
          <Input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="ابحث برقم هاتف الزبون، رقم المرجع، أو اسم الخدمة..."
            className="pr-10 h-11 rounded-2xl bg-surface text-xs font-semibold border-slate-200 dark:border-slate-800"
          />
        </div>

        <Select value={serviceFilter} onValueChange={setServiceFilter}>
          <SelectTrigger className="h-11 rounded-2xl bg-surface text-xs font-bold border-slate-200 dark:border-slate-800">
            <SelectValue placeholder="تصفية بنوع الخدمة..." />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">كافة الخدمات</SelectItem>
            {Object.entries(SERVICE_LABELS).map(([key, label]) => (
              <SelectItem key={key} value={key}>
                {label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Table List */}
      {isLoading ? (
        <div className="py-20 text-center text-xs font-bold text-slate-400 flex flex-col items-center gap-2">
          <Loader2 className="w-7 h-7 animate-spin text-purple-500" />
          <span>جاري تحميل حركات المحافظ والشحن...</span>
        </div>
      ) : filteredTransactions.length === 0 ? (
        <div className="py-16 text-center text-xs font-bold text-slate-400 bg-surface rounded-3xl border border-slate-200 dark:border-slate-800">
          لا توجد حركات شحن/تحويل مطابقة لبيانات البحث
        </div>
      ) : (
        <div className="border border-slate-200 dark:border-slate-800 rounded-3xl overflow-hidden bg-surface shadow-xs">
          <div className="overflow-x-auto">
            <table className="w-full text-right text-xs">
              <thead className="bg-slate-50 dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 text-2xs font-bold text-slate-500">
                <tr>
                  <th className="py-3 px-4">اسم الخدمة</th>
                  <th className="py-3 px-3">رقم الهاتف</th>
                  <th className="py-3 px-3">رقم العملية / المرجع</th>
                  <th className="py-3 px-3 text-center">التاريخ والتوقيت</th>
                  <th className="py-3 px-3 text-center">عمولة المحل</th>
                  <th className="py-3 px-4 text-left">مبلغ التحويل / المحصل</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800 font-medium">
                {filteredTransactions.map((t) => (
                  <tr key={t.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-900/50 transition-colors">
                    <td className="py-3 px-4 font-bold text-slate-900 dark:text-white flex items-center gap-2">
                      <Wallet className="w-4 h-4 text-purple-500 shrink-0" />
                      <span>{t.service_label}</span>
                    </td>
                    <td className="py-3 px-3 font-mono font-bold text-slate-800 dark:text-slate-200">
                      {t.phone_number || '—'}
                    </td>
                    <td className="py-3 px-3 font-mono text-slate-400">
                      {t.reference_number || '—'}
                    </td>
                    <td className="py-3 px-3 text-center text-slate-500 font-medium text-2xs">
                      {formatDateTime(t.created_at)}
                    </td>
                    <td className="py-3 px-3 text-center font-mono font-black text-purple-600 dark:text-purple-400">
                      +{formatNumber(t.commission_amount)} ج.م
                    </td>
                    <td className="py-3 px-4 text-left font-mono">
                      <span className="font-black text-slate-900 dark:text-white text-sm">
                        {formatNumber(t.amount)} ج.م
                      </span>
                      <span className="block text-3xs text-slate-400">
                        محصل من العميل: {formatNumber(t.total_collected)} ج.م
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Modal: New Wallet Transaction */}
      <Dialog open={isNewTxOpen} onOpenChange={setIsNewTxOpen}>
        <DialogContent className="max-w-md p-6 rounded-3xl bg-surface text-right" dir="rtl">
          <DialogHeader className="pb-2 border-b border-slate-100 dark:border-slate-800">
            <DialogTitle className="text-base font-black flex items-center gap-2 text-purple-600">
              <Wallet className="w-5 h-5 text-purple-500" />
              <span>تنفيذ حركة شحن / تحويل كاش جديدة</span>
            </DialogTitle>
          </DialogHeader>

          <form onSubmit={handleExecuteTransaction} className="space-y-3 text-xs pt-2">
            <div className="space-y-1">
              <Label className="font-bold">اختر نوع الخدمة *</Label>
              <Select value={serviceType} onValueChange={(val) => setServiceType(val as WalletServiceType)}>
                <SelectTrigger className="h-10 rounded-xl bg-slate-50 dark:bg-slate-900 font-bold">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(SERVICE_LABELS).map(([key, label]) => (
                    <SelectItem key={key} value={key}>
                      {label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1">
              <Label className="font-bold">رقم هاتف العميل / المحفظة *</Label>
              <Input
                required
                value={phoneNumber}
                onChange={(e) => setPhoneNumber(e.target.value)}
                placeholder="01xxxxxxxx..."
                className="h-10 rounded-xl bg-slate-50 dark:bg-slate-900 font-mono"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label className="font-bold">مبلغ الشحن / التحويل (ج.م) *</Label>
                <Input
                  type="number"
                  step="any"
                  required
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  placeholder="0.00"
                  className="h-10 rounded-xl bg-slate-50 dark:bg-slate-900 font-mono text-center font-bold"
                />
              </div>

              <div className="space-y-1">
                <Label className="font-bold">عمولة المحل / الربح (ج.م)</Label>
                <Input
                  type="number"
                  step="any"
                  value={commissionAmount}
                  onChange={(e) => setCommissionAmount(e.target.value)}
                  placeholder="0.00"
                  className="h-10 rounded-xl bg-purple-50 dark:bg-purple-950/40 text-purple-600 font-mono text-center font-black"
                />
              </div>
            </div>

            <div className="space-y-1">
              <Label className="font-bold">المحفظة / الخزينة المستخدمة *</Label>
              <Select value={targetTreasuryId} onValueChange={setTargetTreasuryId}>
                <SelectTrigger className="h-10 rounded-xl bg-slate-50 dark:bg-slate-900 font-bold">
                  <SelectValue placeholder="اختر الخزينة..." />
                </SelectTrigger>
                <SelectContent>
                  {treasuries.map((t) => (
                    <SelectItem key={t.id} value={t.id}>
                      {t.name} ({formatNumber(t.current_balance)} ج.م)
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1">
              <Label className="font-bold">رقم العملية / المرجع (اختياري)</Label>
              <Input
                value={referenceNumber}
                onChange={(e) => setReferenceNumber(e.target.value)}
                placeholder="مثال: TRX-9901..."
                className="h-10 rounded-xl bg-slate-50 dark:bg-slate-900 font-mono"
              />
            </div>

            <div className="pt-3 flex justify-end gap-2 border-t border-slate-100 dark:border-slate-800">
              <Button type="button" variant="outline" onClick={() => setIsNewTxOpen(false)}>
                إلغاء
              </Button>
              <Button type="submit" disabled={isSaving} className="bg-purple-600 hover:bg-purple-700 text-white font-bold">
                تأكيد العملية
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
    </AppShell>
  );
}
