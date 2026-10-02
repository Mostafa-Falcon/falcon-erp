'use client';

import React, { useState, useEffect, useMemo } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { CreditCard, Search, Loader2 } from 'lucide-react';
import { db } from '@/core/db/app_database';
import { InstallmentsRepository } from '@/modules/sales/installments_repository';
import { formatNumber } from '@/lib/format';
import type { InstallmentPlan, InstallmentSchedule, Treasury, CashierShift, User as UserType } from '@/types';
import { toast } from 'sonner';

interface PosInstallmentModalProps {
  isOpen: boolean;
  onClose: () => void;
  activeShift: CashierShift | null;
  currentUser: UserType | null;
  treasuries: Treasury[];
  onProcessed: () => void;
}

export function PosInstallmentModal({
  isOpen,
  onClose,
  activeShift,
  currentUser,
  treasuries,
  onProcessed,
}: PosInstallmentModalProps) {
  const [plans, setPlans] = useState<InstallmentPlan[]>([]);
  const [unpaidSchedules, setUnpaidSchedules] = useState<InstallmentSchedule[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [selectedSchedule, setSelectedSchedule] = useState<InstallmentSchedule | null>(null);
  const [payAmount, setPayAmount] = useState('');
  const [targetTreasuryId, setTargetTreasuryId] = useState(
    activeShift?.treasury_id || treasuries[0]?.id || ''
  );
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (!isOpen || !currentUser) {
      setPlans([]);
      setUnpaidSchedules([]);
      setSearchQuery('');
      setSelectedSchedule(null);
      return;
    }

    let isMounted = true;
    const loadUnpaid = async () => {
      setIsLoading(true);
      try {
        const [pList, sList] = await Promise.all([
          db.installment_plans.where('org_id').equals(currentUser.org_id).and((p) => p.status === 'active').toArray(),
          db.installment_schedules.where('org_id').equals(currentUser.org_id).filter((s) => s.remaining_amount > 0).toArray(),
        ]);

        if (isMounted) {
          setPlans(pList);
          setUnpaidSchedules(sList);
        }
      } catch (err) {
        console.error('Error loading unpaid installment schedules for POS:', err);
      } finally {
        if (isMounted) setIsLoading(false);
      }
    };

    loadUnpaid();
    return () => {
      isMounted = false;
    };
  }, [isOpen, currentUser]);

  const planMap = useMemo(() => {
    const map: Record<string, InstallmentPlan> = {};
    for (const p of plans) map[p.id] = p;
    return map;
  }, [plans]);

  const filteredSchedules = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return unpaidSchedules.filter((s) => {
      const p = planMap[s.plan_id];
      if (!p) return false;

      if (!q) return true;

      return (
        p.plan_number.toLowerCase().includes(q) ||
        p.customer_name.toLowerCase().includes(q) ||
        p.customer_phone.includes(q)
      );
    });
  }, [unpaidSchedules, planMap, searchQuery]);

  const handlePaySchedule = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedSchedule || !currentUser) return;
    if (!targetTreasuryId) {
      toast.error('يرجى اختيار الخزينة للتحصيل');
      return;
    }

    try {
      setIsSaving(true);
      const { schedule, plan } = await InstallmentsRepository.payScheduleItem({
        scheduleId: selectedSchedule.id,
        amountPaid: parseFloat(payAmount) || selectedSchedule.remaining_amount,
        treasuryId: targetTreasuryId,
        userId: currentUser.id,
      });

      toast.success(`تم تحصيل قسط التقسيط (${schedule.installment_number}) للعميل «${plan.customer_name}» بنجاح!`);
      onProcessed();
      onClose();
      setSelectedSchedule(null);
    } catch (err: any) {
      toast.error(err?.message || 'تعذر سداد القسط');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-lg p-6 rounded-3xl bg-surface text-right" dir="rtl">
        <DialogHeader className="pb-2 border-b border-slate-100 dark:border-slate-800">
          <DialogTitle className="text-base font-black flex items-center gap-2 text-indigo-600">
            <CreditCard className="w-5 h-5 text-indigo-500" />
            <span>سداد قسط تقسيط من الكاشير</span>
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-3 pt-2 text-xs">
          <div className="relative">
            <Search className="w-4 h-4 text-slate-400 absolute right-3.5 top-1/2 -translate-y-1/2" />
            <Input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="ابحث برقم خطة التقسيط، اسم العميل، أو الهاتف..."
              className="pr-10 h-10 rounded-xl bg-slate-50 dark:bg-slate-900 font-semibold"
            />
          </div>

          {isLoading ? (
            <div className="py-10 text-center font-bold text-slate-400 flex flex-col items-center gap-2">
              <Loader2 className="w-6 h-6 animate-spin text-indigo-500" />
              <span>جاري تحميل الأقساط المستحقة...</span>
            </div>
          ) : filteredSchedules.length === 0 ? (
            <div className="py-10 text-center font-bold text-slate-400">
              لا توجد أقساط مستحقة التحصيل مطابقة لبيانات البحث
            </div>
          ) : !selectedSchedule ? (
            <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
              {filteredSchedules.map((s) => {
                const p = planMap[s.plan_id];
                return (
                  <div
                    key={s.id}
                    onClick={() => {
                      setSelectedSchedule(s);
                      setPayAmount(String(s.remaining_amount));
                    }}
                    className="p-3 rounded-2xl border border-slate-200 dark:border-slate-800 bg-surface hover:border-indigo-500 transition-all flex items-center justify-between cursor-pointer group"
                  >
                    <div className="space-y-1">
                      <span className="font-mono font-black text-sm text-slate-900 dark:text-white group-hover:text-indigo-600 block">
                        #{p?.plan_number} — قسط ({s.installment_number}/{p?.number_of_installments})
                      </span>
                      <span className="text-2xs text-slate-500 font-bold block">
                        العميل: {p?.customer_name} ({p?.customer_phone}) — تاريخ الاستحقاق: <span className="font-mono">{s.due_date}</span>
                      </span>
                    </div>

                    <div className="text-left font-mono">
                      <span className="font-black text-indigo-600 text-sm block">
                        {formatNumber(s.remaining_amount)} ج.م
                      </span>
                      <span className="text-3xs text-slate-400 font-bold block">مستحق</span>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <form onSubmit={handlePaySchedule} className="space-y-3 pt-1">
              <div className="p-3 rounded-2xl bg-indigo-50 dark:bg-indigo-950/40 border border-indigo-200 font-bold text-slate-800 dark:text-slate-200">
                سداد قسط العميل: {planMap[selectedSchedule.plan_id]?.customer_name} (قسط #{selectedSchedule.installment_number})
              </div>

              <div className="space-y-1">
                <Label className="font-bold">المبلغ المحصل (ج.م) *</Label>
                <Input
                  type="number"
                  step="any"
                  required
                  value={payAmount}
                  onChange={(e) => setPayAmount(e.target.value)}
                  className="h-11 rounded-xl font-mono text-center font-black text-base text-emerald-600 bg-emerald-50/50"
                />
              </div>

              <div className="pt-2 flex justify-between">
                <Button type="button" variant="outline" onClick={() => setSelectedSchedule(null)}>
                  رجوع للقائمة
                </Button>
                <Button type="submit" disabled={isSaving} className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold">
                  تأكيد سداد القسط
                </Button>
              </div>
            </form>
          )}

          <div className="pt-2 flex justify-end border-t border-slate-100 dark:border-slate-800">
            <Button type="button" variant="outline" onClick={onClose} className="rounded-xl">
              إلغاء
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
