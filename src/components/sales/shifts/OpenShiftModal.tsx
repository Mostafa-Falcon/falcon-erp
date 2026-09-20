'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Clock,
  Store,
  User,
  Coins,
  ArrowRight,
  Plus,
  Loader2,
  ShieldCheck,
  Building2,
  Sparkles,
  Wallet
} from 'lucide-react';
import { SalesRepository } from '@/modules/sales/sales_repository';
import { TreasuryRepository } from '@/modules/treasury/treasury_repository';
import { formatNumber } from '@/lib/format';
import type { CashierShift, Treasury, User as UserType } from '@/types';
import { toast } from 'sonner';

interface OpenShiftModalProps {
  isOpen: boolean;
  onClose?: () => void;
  currentUser: UserType | null;
  orgId: string;
  branchId: string;
  branchName?: string;
  treasuries: Treasury[];
  onShiftOpened: (shift: CashierShift) => void;
}

export function OpenShiftModal({
  isOpen,
  onClose,
  currentUser,
  orgId,
  branchId,
  branchName,
  treasuries,
  onShiftOpened,
}: OpenShiftModalProps) {
  const router = useRouter();

  const [availableTreasuries, setAvailableTreasuries] = useState<Treasury[]>(treasuries);
  const [treasuryId, setTreasuryId] = useState('');
  const [effectiveBranchId, setEffectiveBranchId] = useState(branchId);
  const [effectiveBranchName, setEffectiveBranchName] = useState(branchName || '');
  const [openingBalance, setOpeningBalance] = useState('0');
  const [isBusy, setIsBusy] = useState(false);

  // Sync / Auto-heal data if treasuries or branchId are empty
  useEffect(() => {
    let isMounted = true;

    async function ensureData() {
      try {
        const { db } = await import('@/core/db/app_database');
        const { v4: uuidv4 } = await import('uuid');

        // 1. Resolve branch if not provided
        let resolvedBranchId = branchId || effectiveBranchId;
        if (!resolvedBranchId && orgId) {
          const firstBranch = await db.branches.where('org_id').equals(orgId).first();
          if (firstBranch && isMounted) {
            resolvedBranchId = firstBranch.id;
            setEffectiveBranchId(firstBranch.id);
            setEffectiveBranchName(firstBranch.name);
          }
        } else if (branchName && isMounted) {
          setEffectiveBranchName(branchName);
        }

        // 2. Resolve treasuries
        let currentList = treasuries.length > 0 ? treasuries : [];
        if (currentList.length === 0 && orgId) {
          currentList = await db.treasuries.where('org_id').equals(orgId).and((t) => t.is_active).toArray();
          if (currentList.length === 0) {
            const defaultTreasury = await TreasuryRepository.ensureDefaultTreasury({
              orgId,
              branchId: resolvedBranchId || undefined,
            });
            currentList = [defaultTreasury];
          }
        }

        if (isMounted) {
          setAvailableTreasuries(currentList);
          if (!treasuryId && currentList.length > 0) {
            const def = currentList.find((t) => t.is_default) || currentList[0];
            setTreasuryId(def.id);
          }
        }
      } catch (err) {
        console.warn('OpenShiftModal ensureData warning:', err);
      }
    }

    if (isOpen) {
      ensureData();
    }

    return () => {
      isMounted = false;
    };
  }, [isOpen, treasuries, branchId, branchName, orgId, treasuryId, effectiveBranchId]);

  const selectedTreasury = availableTreasuries.find((t) => t.id === treasuryId);

  const handleOpen = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser) return;

    let targetTreasuryId = treasuryId;
    if (!targetTreasuryId && availableTreasuries.length > 0) {
      targetTreasuryId = availableTreasuries[0].id;
      setTreasuryId(targetTreasuryId);
    }

    if (!targetTreasuryId) {
      toast.error('يرجى تحديد الخزينة المسؤولة عن الوردية');
      return;
    }

    try {
      setIsBusy(true);

      const targetBranchId = effectiveBranchId || branchId || currentUser.branch_id || '';
      const parsedBalance = parseFloat(String(openingBalance).replace(/,/g, '')) || 0;

      // Check if user already has an open shift to recover seamlessly
      const existing = await SalesRepository.getCurrentOpenShift(currentUser.id, targetBranchId, orgId);
      if (existing) {
        toast.info(`توجد وردية مفتوحة بالفعل لهذا الحساب (#${existing.shift_number})، جاري تحويلك...`);
        onShiftOpened(existing);
        return;
      }

      const shift = await SalesRepository.openShift({
        orgId,
        branchId: targetBranchId,
        userId: currentUser.id,
        treasuryId: targetTreasuryId,
        openingBalance: parsedBalance,
      });

      toast.success(`تم فتح الوردية رقم #${shift.shift_number} بنجاح! مبيعات موفقة.`);
      onShiftOpened(shift);
    } catch (err: any) {
      console.error(err);
      toast.error(err?.message || 'حدث خطأ أثناء فتح وردية الكاشير');
    } finally {
      setIsBusy(false);
    }
  };

  const isOwnerOrAdmin = currentUser?.role === 'owner' || currentUser?.role === 'admin' || currentUser?.role === 'super_admin';

  return (
    <Dialog open={isOpen} onOpenChange={(open) => {
      // If forced, do not close on backdrop click unless onClose is called
      if (!open && onClose) onClose();
    }}>
      <DialogContent
        className="max-w-md p-6 rounded-2xl border-slate-200 dark:border-slate-800 bg-white dark:bg-[#131b2e] shadow-2xl text-right"
        dir="rtl"
        onInteractOutside={(e) => e.preventDefault()}
      >
        <DialogHeader className="pb-4 border-b border-slate-100 dark:border-slate-800 space-y-2">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-emerald-50 dark:bg-emerald-950/50 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shadow-inner shrink-0">
              <Clock className="w-6 h-6 animate-pulse" />
            </div>
            <div>
              <DialogTitle className="text-lg font-black text-slate-900 dark:text-white">
                طلب فتح وردية الكاشير
              </DialogTitle>
              <DialogDescription className="text-xs font-semibold text-slate-400 mt-0.5">
                لبدء عمليات البيع وإصدار الفواتير، يرجى تحديد الخزينة ورصيد بداية الدرج
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        {/* User & Branch Context Card */}
        <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200/80 dark:border-slate-800 space-y-2 text-xs">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-slate-600 dark:text-slate-400 font-semibold">
              <User className="w-3.5 h-3.5" />
              <span>الكاشير الحالي:</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="font-black text-slate-900 dark:text-white">
                {currentUser?.full_name || currentUser?.username}
              </span>
              <Badge variant={isOwnerOrAdmin ? 'default' : 'secondary'} className="text-[10px] font-bold">
                {isOwnerOrAdmin ? 'صاحب المنشأة' : 'كاشير'}
              </Badge>
            </div>
          </div>

          <div className="flex items-center justify-between pt-1 border-t border-slate-200/60 dark:border-slate-800/80">
            <div className="flex items-center gap-2 text-slate-600 dark:text-slate-400 font-semibold">
              <Building2 className="w-3.5 h-3.5" />
              <span>الفرع النشط:</span>
            </div>
            <span className="font-bold text-slate-900 dark:text-white">
              {effectiveBranchName || branchName || 'الفرع الرئيسي'}
            </span>
          </div>
        </div>

        {/* Form */}
        <form onSubmit={handleOpen} className="space-y-4 pt-1">
          
          {/* الخزينة */}
          <div className="space-y-1.5">
            <Label htmlFor="shift-treasury" className="text-xs font-bold text-slate-700 dark:text-slate-300">
              الخزينة المسؤولة عن الوردية <span className="text-red-500">*</span>
            </Label>
            <Select value={treasuryId} onValueChange={setTreasuryId}>
              <SelectTrigger id="shift-treasury" className="h-11 rounded-xl text-xs font-bold bg-slate-50/50 dark:bg-slate-900/50 border-slate-200 dark:border-slate-800">
                <SelectValue placeholder="اختر الخزينة..." />
              </SelectTrigger>
              <SelectContent className="rounded-xl border-slate-200 dark:border-slate-800">
                {availableTreasuries.map((t) => (
                  <SelectItem key={t.id} value={t.id}>
                    {t.name} (الرصيد: {formatNumber(t.current_balance)} ج.م)
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* رصيد البداية الافتتاحي */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <Label htmlFor="shift-opening-bal" className="text-xs font-bold text-slate-700 dark:text-slate-300">
                رصيد البداية الافتتاحي (الفكة بالدرج) (ج.م)
              </Label>
              {selectedTreasury && (
                <button
                  type="button"
                  onClick={() => setOpeningBalance(String(selectedTreasury.current_balance || 0))}
                  className="text-[11px] font-bold text-blue-600 dark:text-blue-400 hover:underline cursor-pointer"
                >
                  نسخ رصيد الخزينة ({formatNumber(selectedTreasury.current_balance)})
                </button>
              )}
            </div>
            <Input
              id="shift-opening-bal"
              type="number"
              step="0.01"
              min="0"
              value={openingBalance}
              onChange={(e) => setOpeningBalance(e.target.value)}
              placeholder="0.00"
              className="h-11 rounded-xl text-xs font-bold font-mono text-left bg-slate-50/50 dark:bg-slate-900/50 border-slate-200 dark:border-slate-800 focus:bg-white"
              dir="ltr"
              icon={<Coins className="w-4 h-4" />}
              autoFocus
            />
            <p className="text-[11px] text-slate-400 font-semibold">
              المبلغ النقدي المسلّم لك في بداية الوردية كفكة لبدء التعامل مع الزبائن.
            </p>
          </div>

          {/* Buttons */}
          <div className="space-y-2 pt-2">
            <Button
              type="submit"
              disabled={isBusy}
              className="w-full h-11 bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-bold rounded-xl gap-2 shadow-xs cursor-pointer"
            >
              {isBusy ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
              <span>فتح الوردية وبدء البيع</span>
            </Button>

            <Button
              type="button"
              variant="outline"
              onClick={() => router.push('/')}
              className="w-full h-10 text-xs font-bold rounded-xl text-slate-600 dark:text-slate-400"
            >
              العودة إلى لوحة المتابعة
            </Button>
          </div>

        </form>

      </DialogContent>
    </Dialog>
  );
}
