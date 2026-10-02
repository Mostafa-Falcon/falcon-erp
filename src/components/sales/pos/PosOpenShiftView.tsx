'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import {
  Lock,
  Wallet,
  XCircle,
  Loader2,
  HardDrive,
  User,
  ArrowRight,
  ShieldCheck,
  Building2,
} from 'lucide-react';
import { toast } from 'sonner';
import { SalesRepository } from '@/modules/sales/sales_repository';
import { TreasuryRepository } from '@/modules/treasury/treasury_repository';
import type { CashierShift, Treasury, User as UserType } from '@/types';

interface PosOpenShiftViewProps {
  currentUser: UserType | null;
  orgId: string;
  branchId: string;
  treasuries: Treasury[];
  onShiftOpened: (shift: CashierShift) => void;
}

export function PosOpenShiftView({
  currentUser,
  orgId,
  branchId,
  treasuries,
  onShiftOpened,
}: PosOpenShiftViewProps) {
  const router = useRouter();

  const [availableTreasuries, setAvailableTreasuries] = useState<Treasury[]>(treasuries);
  const [selectedTreasuryId, setSelectedTreasuryId] = useState<string>('');
  const [openingBalance, setOpeningBalance] = useState<string>('0');
  const [isBusy, setIsBusy] = useState<boolean>(false);

  // Initialize or auto-heal default treasury
  useEffect(() => {
    let isMounted = true;

    async function initTreasury() {
      try {
        const { db } = await import('@/core/db/app_database');
        let list = treasuries.length > 0 ? treasuries : [];

        if (list.length === 0 && orgId) {
          list = await db.treasuries
            .where('org_id')
            .equals(orgId)
            .and((t) => t.is_active)
            .toArray();

          if (list.length === 0) {
            const def = await TreasuryRepository.ensureDefaultTreasury({
              orgId,
              branchId: branchId || undefined,
            });
            list = [def];
          }
        }

        if (isMounted) {
          setAvailableTreasuries(list);
          if (!selectedTreasuryId && list.length > 0) {
            const def = list.find((t) => t.is_default) || list[0];
            setSelectedTreasuryId(def.id);
          }
        }
      } catch (err) {
        console.warn('PosOpenShiftView initTreasury warning:', err);
      }
    }

    initTreasury();

    return () => {
      isMounted = false;
    };
  }, [orgId, branchId, treasuries, selectedTreasuryId]);

  const selectedTreasury = availableTreasuries.find((t) => t.id === selectedTreasuryId);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser || !orgId) {
      toast.error('بيانات المستخدم غير مكتملة');
      return;
    }

    let targetTreasuryId = selectedTreasuryId;
    if (!targetTreasuryId && availableTreasuries.length > 0) {
      targetTreasuryId = availableTreasuries[0].id;
      setSelectedTreasuryId(targetTreasuryId);
    }

    if (!targetTreasuryId) {
      toast.error('يرجى تحديد حساب درج الكاشير للبدء');
      return;
    }

    const parsedBalance = parseFloat(openingBalance.replace(/,/g, ''));
    if (isNaN(parsedBalance) || parsedBalance < 0) {
      toast.error('يرجى إدخال رصيد افتتاحي صحيح (صفر أو أكثر)');
      return;
    }

    try {
      setIsBusy(true);

      const targetBranchId = branchId || currentUser.branch_id || '';

      // Check if user already has an active open shift
      const existing = await SalesRepository.getCurrentOpenShift(currentUser.id, targetBranchId, orgId);
      if (existing) {
        toast.info(`توجد وردية نشطة بالفعل لهذا الكاشير (#${existing.shift_number})`);
        onShiftOpened(existing);
        return;
      }

      // Open shift with real production data
      const shift = await SalesRepository.openShift({
        orgId,
        branchId: targetBranchId,
        userId: currentUser.id,
        treasuryId: targetTreasuryId,
        openingBalance: parsedBalance,
      });

      toast.success(`تم استلام العهدة وفتح الوردية رقم #${shift.shift_number} بنجاح!`);
      onShiftOpened(shift);
    } catch (err: any) {
      console.error('Error opening shift:', err);
      toast.error(err?.message || 'حدث خطأ أثناء فتح الوردية');
    } finally {
      setIsBusy(false);
    }
  };

  return (
    <div className="flex-1 flex items-center justify-center p-4 sm:p-6 bg-app dark:bg-[#090d16] select-none min-h-[calc(100vh-4rem)]">
      <div className="max-w-md w-full bg-surface rounded-2xl p-6 sm:p-8 shadow-xl border border-slate-200/80 dark:border-slate-800 text-center flex flex-col items-center gap-5 animate-in fade-in zoom-in-95 duration-200">
        {/* Modern Lock Icon */}
        <div className="w-16 h-16 rounded-2xl bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-200/80 dark:border-emerald-800/60 flex items-center justify-center text-emerald-600 dark:text-emerald-400 shadow-sm shrink-0">
          <Lock className="w-8 h-8 stroke-[2.2]" />
        </div>

        {/* Headings */}
        <div className="space-y-1">
          <h2 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white tracking-tight">
            استلام عهدة / فتح الوردية
          </h2>
          <p className="text-xs sm:text-sm font-semibold text-slate-500 dark:text-slate-400">
            حدد الخزينة ورصيد بداية الدرج لبدء عمليات البيع
          </p>
        </div>

        {/* Cashier Context Info */}
        {currentUser && (
          <div className="w-full flex items-center justify-between px-3.5 py-2 rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200/80 dark:border-slate-800 text-xs">
            <div className="flex items-center gap-1.5 text-slate-500 dark:text-slate-400 font-medium">
              <User className="w-3.5 h-3.5" />
              <span>الكاشير:</span>
              <span className="font-bold text-slate-900 dark:text-white">
                {currentUser.full_name || currentUser.username}
              </span>
            </div>
            <span className="inline-flex items-center gap-1 text-3xs font-bold px-2 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-950/80 text-emerald-700 dark:text-emerald-300">
              <ShieldCheck className="w-3 h-3" />
              نشط
            </span>
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} className="w-full space-y-4">
          {/* 1. الحساب المستهدف (الدرج) */}
          <div className="text-right">
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5 pr-0.5">
              حساب الخزينة / الدرج المستهدف
            </label>
            <div className="bg-slate-50 dark:bg-slate-900/60 border border-slate-200/80 dark:border-slate-800 rounded-xl p-3 flex items-center justify-between shadow-2xs">
              <div className="flex flex-col flex-1 min-w-0 pr-1">
                {availableTreasuries.length > 1 ? (
                  <select
                    value={selectedTreasuryId}
                    onChange={(e) => {
                      const newId = e.target.value;
                      setSelectedTreasuryId(newId);
                      const t = availableTreasuries.find((x) => x.id === newId);
                      if (t) setOpeningBalance(String(t.current_balance ?? 0));
                    }}
                    className="bg-transparent font-bold text-xs sm:text-sm text-slate-900 dark:text-white outline-none cursor-pointer"
                  >
                    {availableTreasuries.map((t) => (
                      <option key={t.id} value={t.id} className="text-slate-900 dark:bg-slate-900">
                        {t.name} (رصيد مسجل: {Number(t.current_balance || 0).toFixed(2)} ج.م)
                      </option>
                    ))}
                  </select>
                ) : (
                  <span className="text-xs sm:text-sm font-bold text-slate-900 dark:text-white">
                    {selectedTreasury?.name || 'درج الكاشير الرئيسي'}
                  </span>
                )}
              </div>
              <div className="w-8 h-8 rounded-lg bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0">
                <Wallet className="w-4 h-4" />
              </div>
            </div>
          </div>

          {/* 2. الرصيد الافتتاحي بالدرج حالياً */}
          <div className="text-right space-y-1.5">
            <div className="flex items-center justify-between pr-0.5">
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">
                الرصيد الافتتاحي بالدرج (العهدة المستلمة)
              </label>
              {selectedTreasury && (
                <span className="text-3xs font-medium text-slate-400 font-mono">
                  (المسجل: {Number(selectedTreasury.current_balance || 0).toFixed(2)} ج.م)
                </span>
              )}
            </div>
            <div className="relative flex items-center h-12 rounded-xl bg-surface border border-slate-300 dark:border-slate-700 focus-within:border-emerald-500 focus-within:ring-2 focus-within:ring-emerald-500/20 shadow-2xs px-3 transition-all">
              {/* Clear button (Left side in RTL) */}
              {openingBalance && openingBalance !== '0' && (
                <button
                  type="button"
                  onClick={() => setOpeningBalance('0')}
                  className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer p-1"
                >
                  <XCircle className="w-4 h-4" />
                </button>
              )}

              {/* Input in Center */}
              <input
                type="number"
                step="any"
                min="0"
                value={openingBalance}
                onChange={(e) => setOpeningBalance(e.target.value)}
                onFocus={(e) => e.target.select()}
                placeholder="0.00"
                className="w-full text-center font-mono font-black text-base sm:text-lg text-slate-900 dark:text-white bg-transparent focus:outline-none"
              />

              {/* Currency Badge (Right side in RTL) */}
              <div className="text-xs font-bold text-slate-400 shrink-0 pl-1">
                ج.م
              </div>
            </div>
          </div>

          {/* 3. زر تأكيد الاستلام وفتح الوردية */}
          <button
            type="submit"
            disabled={isBusy}
            className="w-full h-11 rounded-xl bg-emerald-600 hover:bg-emerald-700 active:scale-[0.99] text-white font-bold text-sm flex items-center justify-center gap-2 shadow-sm transition-all cursor-pointer disabled:opacity-50"
          >
            {isBusy ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>جاري فتح الوردية...</span>
              </>
            ) : (
              <span>تأكيد استلام العهدة وفتح الوردية</span>
            )}
          </button>

          {/* 4. رابط العودة للرئيسية */}
          <div className="pt-1">
            <button
              type="button"
              onClick={() => router.push('/')}
              className="inline-flex items-center gap-1.5 text-xs font-medium text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white transition-colors cursor-pointer"
            >
              <ArrowRight className="w-3.5 h-3.5" />
              <span>العودة إلى لوحة المتابعة الرئيسية</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}