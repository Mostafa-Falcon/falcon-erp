'use client';

import React, { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
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
import { Wallet, Loader2 } from 'lucide-react';
import { DigitalWalletRepository } from '@/modules/mobile/digital_wallet_repository';
import type { WalletServiceType, Treasury, CashierShift, User as UserType } from '@/types';
import { toast } from 'sonner';

interface PosDigitalWalletModalProps {
  isOpen: boolean;
  onClose: () => void;
  activeShift: CashierShift | null;
  currentUser: UserType | null;
  treasuries: Treasury[];
  onProcessed: () => void;
}

const SERVICE_LABELS: Record<WalletServiceType, string> = {
  vodafone_cash_deposit: 'تحويل / إيداع فودافون كاش',
  vodafone_cash_withdraw: 'سحب فودافون كاش من عميل',
  instapay_transfer: 'تحويل إنستاباي InstaPay',
  fawry_payment: 'مدفوعات فوري Fawry',
  topup_recharge: 'شحن رصيد كروت / تطاير',
  other_wallet_service: 'خدمات تحويل رقمي أخرى',
};

export function PosDigitalWalletModal({
  isOpen,
  onClose,
  activeShift,
  currentUser,
  treasuries,
  onProcessed,
}: PosDigitalWalletModalProps) {
  const [serviceType, setServiceType] = useState<WalletServiceType>('vodafone_cash_deposit');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [amount, setAmount] = useState('');
  const [commissionAmount, setCommissionAmount] = useState('');
  const [targetTreasuryId, setTargetTreasuryId] = useState(
    activeShift?.treasury_id || treasuries[0]?.id || ''
  );
  const [isSaving, setIsSaving] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser || !amount || parseFloat(amount) <= 0) {
      toast.error('يرجى كتابة مبلغ تحويل كاش بشكل صحيح');
      return;
    }
    if (!targetTreasuryId) {
      toast.error('يرجى اختيار الخزينة / المحفظة');
      return;
    }

    try {
      setIsSaving(true);
      await DigitalWalletRepository.executeTransaction({
        orgId: currentUser.org_id,
        branchId: currentUser.branch_id || '',
        shiftId: activeShift?.id || null,
        treasuryId: targetTreasuryId,
        serviceType,
        serviceLabel: SERVICE_LABELS[serviceType],
        phoneNumber: phoneNumber.trim(),
        amount: parseFloat(amount) || 0,
        commissionAmount: parseFloat(commissionAmount) || 0,
        userId: currentUser.id,
      });

      toast.success(`تم تنفيذ حركة الشحن/التحويل للكاشير بنجاح وتحديث الوردية`);
      onProcessed();
      onClose();
      setPhoneNumber('');
      setAmount('');
      setCommissionAmount('');
    } catch (err: any) {
      toast.error(err?.message || 'تعذر تنفيذ الحركة');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-md p-6 rounded-3xl bg-surface text-right" dir="rtl">
        <DialogHeader className="pb-2 border-b border-slate-100 dark:border-slate-800">
          <DialogTitle className="text-base font-black flex items-center gap-2 text-purple-600">
            <Wallet className="w-5 h-5 text-purple-500" />
            <span>شحن / تحويل كاش سريع من الكاشير</span>
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-3 text-xs pt-2">
          <div className="space-y-1">
            <Label className="font-bold">نوع الخدمة</Label>
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
            <Label className="font-bold">رقم الهاتف *</Label>
            <Input
              required
              value={phoneNumber}
              onChange={(e) => setPhoneNumber(e.target.value)}
              placeholder="01xxxxxxxx..."
              className="h-10 rounded-xl font-mono text-center"
            />
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div className="space-y-1">
              <Label className="font-bold">مبلغ الخدمة (ج.م) *</Label>
              <Input
                type="number"
                step="any"
                required
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="0.00"
                className="h-10 rounded-xl font-mono text-center font-black"
              />
            </div>

            <div className="space-y-1">
              <Label className="font-bold">عمولة المحل (ج.م)</Label>
              <Input
                type="number"
                step="any"
                value={commissionAmount}
                onChange={(e) => setCommissionAmount(e.target.value)}
                placeholder="0.00"
                className="h-10 rounded-xl font-mono text-center font-black text-purple-600 bg-purple-50/50"
              />
            </div>
          </div>

          <div className="pt-2 flex justify-end gap-2 border-t border-slate-100 dark:border-slate-800">
            <Button type="button" variant="outline" onClick={onClose} className="rounded-xl">
              إلغاء
            </Button>
            <Button type="submit" disabled={isSaving} className="bg-purple-600 hover:bg-purple-700 text-white font-bold rounded-xl">
              {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : 'تأكيد السحب/الشحن'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
