'use client';

import React, { useState, useEffect, useTransition } from 'react';
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
import { Switch } from '@/components/ui/switch';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  DataResetRepository,
  type ResetPreviewResult,
} from '@/modules/settings/data_reset_repository';
import { SettingsRepository } from '@/modules/settings/settings_repository';
import type { Branch } from '@/types';
import { toast } from 'sonner';
import {
  AlertTriangle,
  Calendar,
  Trash2,
  Building2,
  Layers,
  ArrowDownCircle,
  ArrowUpCircle,
  FileSpreadsheet,
  CheckCircle2,
  Coins,
  Warehouse,
  Users,
  Lock,
} from 'lucide-react';

interface ResetPeriodModalProps {
  isOpen: boolean;
  onClose: () => void;
  orgId: string;
  userId?: string;
  userName?: string;
  currency?: string;
  onSuccess?: () => void;
}

type PresetPeriod = 'today' | 'last7days' | 'thisMonth' | 'lastMonth' | 'thisYear' | 'custom';

export const ResetPeriodModal: React.FC<ResetPeriodModalProps> = ({
  isOpen,
  onClose,
  orgId,
  userId,
  userName,
  currency = 'ج.م',
  onSuccess,
}) => {
  // Target & Period selection
  const [targetType, setTargetType] = useState<'sales' | 'purchases' | 'both'>('sales');
  const [presetPeriod, setPresetPeriod] = useState<PresetPeriod>('thisMonth');
  const [fromDate, setFromDate] = useState<string>('');
  const [toDate, setToDate] = useState<string>('');

  // Branch
  const [branches, setBranches] = useState<Branch[]>([]);
  const [selectedBranchId, setSelectedBranchId] = useState<string>('all');

  // Advanced Ledger & Stock options
  const [revertStock, setRevertStock] = useState<boolean>(false);
  const [revertTreasury, setRevertTreasury] = useState<boolean>(true);
  const [recalculateBalances, setRecalculateBalances] = useState<boolean>(true);

  // Security confirmation
  const [confirmKeyword, setConfirmKeyword] = useState<string>('');

  // Preview state
  const [preview, setPreview] = useState<ResetPreviewResult | null>(null);
  const [isLoadingPreview, setIsLoadingPreview] = useState<boolean>(false);
  const [isExecuting, setIsExecuting] = useState<boolean>(false);
  const [, startTransition] = useTransition();

  // Helper to get formatted YYYY-MM-DD
  const formatDateToYMD = (d: Date): string => {
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  // Set date bounds according to preset
  const applyPreset = (preset: PresetPeriod) => {
    setPresetPeriod(preset);
    const now = new Date();

    if (preset === 'today') {
      const todayStr = formatDateToYMD(now);
      setFromDate(todayStr);
      setToDate(todayStr);
    } else if (preset === 'last7days') {
      const past = new Date();
      past.setDate(now.getDate() - 6);
      setFromDate(formatDateToYMD(past));
      setToDate(formatDateToYMD(now));
    } else if (preset === 'thisMonth') {
      const firstDay = new Date(now.getFullYear(), now.getMonth(), 1);
      setFromDate(formatDateToYMD(firstDay));
      setToDate(formatDateToYMD(now));
    } else if (preset === 'lastMonth') {
      const firstDayLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      const lastDayLastMonth = new Date(now.getFullYear(), now.getMonth(), 0);
      setFromDate(formatDateToYMD(firstDayLastMonth));
      setToDate(formatDateToYMD(lastDayLastMonth));
    } else if (preset === 'thisYear') {
      const firstDayYear = new Date(now.getFullYear(), 0, 1);
      setFromDate(formatDateToYMD(firstDayYear));
      setToDate(formatDateToYMD(now));
    }
  };

  // Load branches and initialize dates on open
  useEffect(() => {
    if (isOpen && orgId) {
      applyPreset('thisMonth');
      setConfirmKeyword('');
      SettingsRepository.getBranches(orgId).then((brs) => setBranches(brs));
    }
  }, [isOpen, orgId]);

  // Load preview data whenever parameters change
  useEffect(() => {
    if (!isOpen || !orgId || !fromDate || !toDate) return;

    let isMounted = true;
    setIsLoadingPreview(true);

    const timer = setTimeout(async () => {
      try {
        const result = await DataResetRepository.previewResetCount({
          orgId,
          branchId: selectedBranchId,
          targetType,
          fromDate,
          toDate,
        });
        if (isMounted) {
          setPreview(result);
        }
      } catch (err) {
        console.error('Failed to preview reset count:', err);
      } finally {
        if (isMounted) setIsLoadingPreview(false);
      }
    }, 250);

    return () => {
      isMounted = false;
      clearTimeout(timer);
    };
  }, [isOpen, orgId, selectedBranchId, targetType, fromDate, toDate]);

  // Execute the reset
  const handleExecuteReset = async () => {
    if (confirmKeyword.trim() !== 'تصفير') {
      toast.error('يرجى كتابة كلمة "تصفير" في حقل التأكيد للمتابعة');
      return;
    }

    if (!fromDate || !toDate) {
      toast.error('يرجى تحديد بداية ونهاية الفترة الزمنية بدقة');
      return;
    }

    try {
      setIsExecuting(true);
      const res = await DataResetRepository.executeDateRangeReset({
        orgId,
        branchId: selectedBranchId,
        targetType,
        fromDate,
        toDate,
        revertStock,
        revertTreasury,
        recalculateBalances,
        userId,
        userName,
      });

      if (res.success) {
        toast.success(res.message || 'تم تصفير البيانات المحددة بنجاح');
        startTransition(() => {
          if (onSuccess) onSuccess();
          onClose();
        });
      } else {
        toast.error(res.message || 'حدث خطأ أثناء تصفير العمليات');
      }
    } catch (err) {
      console.error('Error executing date range reset:', err);
      toast.error('حدث خطأ أثناء تصفير العمليات. يرجى مراجعة السجلات');
    } finally {
      setIsExecuting(false);
    }
  };

  const totalInvoicesCount =
    (preview?.salesInvoicesCount || 0) + (preview?.purchaseInvoicesCount || 0);

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !isExecuting && !open && onClose()}>
      <DialogContent className="max-w-2xl max-h-[92vh] overflow-y-auto p-6 text-right rounded-3xl" dir="rtl">
        <DialogHeader className="space-y-2 border-b border-slate-100 dark:border-slate-800 pb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-50 dark:bg-amber-950/40 text-amber-600 flex items-center justify-center shrink-0 shadow-xs border border-amber-200/50 dark:border-amber-800/30">
              <Trash2 className="w-5 h-5 text-amber-600" />
            </div>
            <div>
              <DialogTitle className="text-base font-black text-slate-900 dark:text-white flex items-center gap-2">
                تصفير المبيعات والمشتريات لفترة محددة
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-red-100 dark:bg-red-950/60 text-red-700 dark:text-red-400 font-bold border border-red-200 dark:border-red-900/40">
                  إجراء حساس
                </span>
              </DialogTitle>
              <DialogDescription className="text-xs font-semibold text-slate-400 mt-0.5">
                حذف الفواتير والعمليات بدقة مع الحفاظ الكامل على كروت المنتجات والأصناف وجهات التعامل.
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="space-y-5 pt-2">
          {/* Target Type Selector */}
          <div className="space-y-2">
            <Label className="text-xs font-black text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
              <Layers className="w-3.5 h-3.5 text-blue-500" />
              تحديد العمليات المراد تصفيرها
            </Label>
            <div className="grid grid-cols-3 gap-2.5">
              <button
                type="button"
                onClick={() => setTargetType('sales')}
                className={`flex flex-col items-center justify-center p-3 rounded-xl border text-xs font-black transition-all cursor-pointer ${
                  targetType === 'sales'
                    ? 'border-blue-600 bg-blue-50/70 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300 shadow-xs'
                    : 'border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-900 text-slate-600 dark:text-slate-400'
                }`}
              >
                <ArrowDownCircle className="w-5 h-5 mb-1 text-emerald-500" />
                المبيعات فقط
              </button>

              <button
                type="button"
                onClick={() => setTargetType('purchases')}
                className={`flex flex-col items-center justify-center p-3 rounded-xl border text-xs font-black transition-all cursor-pointer ${
                  targetType === 'purchases'
                    ? 'border-blue-600 bg-blue-50/70 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300 shadow-xs'
                    : 'border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-900 text-slate-600 dark:text-slate-400'
                }`}
              >
                <ArrowUpCircle className="w-5 h-5 mb-1 text-blue-500" />
                المشتريات فقط
              </button>

              <button
                type="button"
                onClick={() => setTargetType('both')}
                className={`flex flex-col items-center justify-center p-3 rounded-xl border text-xs font-black transition-all cursor-pointer ${
                  targetType === 'both'
                    ? 'border-amber-600 bg-amber-50/70 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 shadow-xs'
                    : 'border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-900 text-slate-600 dark:text-slate-400'
                }`}
              >
                <FileSpreadsheet className="w-5 h-5 mb-1 text-amber-500" />
                المبيعات والمشتريات معاً
              </button>
            </div>
          </div>

          {/* Period Presets & Date Inputs */}
          <div className="space-y-3 bg-slate-50/70 dark:bg-slate-900/40 p-4 rounded-2xl border border-slate-200/70 dark:border-slate-800">
            <div className="flex items-center justify-between">
              <Label className="text-xs font-black text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                <Calendar className="w-3.5 h-3.5 text-blue-500" />
                الفترة الزمنية المستهدفة
              </Label>
              <div className="flex flex-wrap gap-1">
                {(
                  [
                    { id: 'today', label: 'اليوم' },
                    { id: 'last7days', label: 'آخر 7 أيام' },
                    { id: 'thisMonth', label: 'الشهر الحالي' },
                    { id: 'lastMonth', label: 'الشهر الماضي' },
                    { id: 'thisYear', label: 'العام الحالي' },
                  ] as const
                ).map((preset) => (
                  <button
                    key={preset.id}
                    type="button"
                    onClick={() => applyPreset(preset.id)}
                    className={`px-2 py-1 rounded-lg text-[10px] font-bold transition-all cursor-pointer ${
                      presetPeriod === preset.id
                        ? 'bg-blue-600 text-white shadow-xs'
                        : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-700 hover:bg-slate-100'
                    }`}
                  >
                    {preset.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
              <div className="space-y-1">
                <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400">من تاريخ</span>
                <Input
                  type="date"
                  value={fromDate}
                  onChange={(e) => {
                    setFromDate(e.target.value);
                    setPresetPeriod('custom');
                  }}
                  className="h-9 bg-white dark:bg-slate-800 text-xs font-bold"
                />
              </div>
              <div className="space-y-1">
                <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400">إلى تاريخ</span>
                <Input
                  type="date"
                  value={toDate}
                  onChange={(e) => {
                    setToDate(e.target.value);
                    setPresetPeriod('custom');
                  }}
                  className="h-9 bg-white dark:bg-slate-800 text-xs font-bold"
                />
              </div>
            </div>

            {/* Branch Selector */}
            <div className="space-y-1 pt-1">
              <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400 flex items-center gap-1">
                <Building2 className="w-3.5 h-3.5 text-slate-400" />
                الفرع المستهدف
              </span>
              <Select value={selectedBranchId} onValueChange={setSelectedBranchId}>
                <SelectTrigger className="h-9 bg-white dark:bg-slate-800 text-xs font-bold">
                  <SelectValue placeholder="اختر الفرع" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">كافة الفروع</SelectItem>
                  {branches.map((b) => (
                    <SelectItem key={b.id} value={b.id}>
                      {b.name} ({b.code})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Live Statistics Preview */}
          <div className="bg-blue-50/40 dark:bg-blue-950/20 border border-blue-200/60 dark:border-blue-900/40 p-3.5 rounded-2xl space-y-2">
            <div className="flex items-center justify-between">
              <h4 className="text-xs font-black text-blue-950 dark:text-blue-300 flex items-center gap-1.5">
                <CheckCircle2 className="w-4 h-4 text-blue-600" />
                معاينة العمليات التي سيتم تصفيرها في هذه الفترة
              </h4>
              {isLoadingPreview && (
                <div className="w-3.5 h-3.5 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
              )}
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-1 text-center">
              {(targetType === 'sales' || targetType === 'both') && (
                <div className="bg-white dark:bg-slate-800/80 p-2.5 rounded-xl border border-slate-200/60 dark:border-slate-700/60">
                  <span className="text-[10px] font-bold text-slate-400 block">فواتير مبيعات</span>
                  <span className="text-sm font-black text-slate-900 dark:text-white">
                    {preview?.salesInvoicesCount ?? 0}
                  </span>
                  <span className="text-[9px] text-slate-400 block mt-0.5">
                    {((preview?.salesInvoicesTotal || 0)).toLocaleString()} {currency}
                  </span>
                </div>
              )}

              {(targetType === 'sales' || targetType === 'both') && (
                <div className="bg-white dark:bg-slate-800/80 p-2.5 rounded-xl border border-slate-200/60 dark:border-slate-700/60">
                  <span className="text-[10px] font-bold text-slate-400 block">مرتجعات مبيعات</span>
                  <span className="text-sm font-black text-slate-900 dark:text-white">
                    {preview?.salesReturnsCount ?? 0}
                  </span>
                  <span className="text-[9px] text-slate-400 block mt-0.5">
                    {((preview?.salesReturnsTotal || 0)).toLocaleString()} {currency}
                  </span>
                </div>
              )}

              {(targetType === 'purchases' || targetType === 'both') && (
                <div className="bg-white dark:bg-slate-800/80 p-2.5 rounded-xl border border-slate-200/60 dark:border-slate-700/60">
                  <span className="text-[10px] font-bold text-slate-400 block">فواتير مشتريات</span>
                  <span className="text-sm font-black text-slate-900 dark:text-white">
                    {preview?.purchaseInvoicesCount ?? 0}
                  </span>
                  <span className="text-[9px] text-slate-400 block mt-0.5">
                    {((preview?.purchaseInvoicesTotal || 0)).toLocaleString()} {currency}
                  </span>
                </div>
              )}

              {(targetType === 'purchases' || targetType === 'both') && (
                <div className="bg-white dark:bg-slate-800/80 p-2.5 rounded-xl border border-slate-200/60 dark:border-slate-700/60">
                  <span className="text-[10px] font-bold text-slate-400 block">مرتجعات مشتريات</span>
                  <span className="text-sm font-black text-slate-900 dark:text-white">
                    {preview?.purchaseReturnsCount ?? 0}
                  </span>
                  <span className="text-[9px] text-slate-400 block mt-0.5">
                    {((preview?.purchaseReturnsTotal || 0)).toLocaleString()} {currency}
                  </span>
                </div>
              )}

              <div className="bg-white dark:bg-slate-800/80 p-2.5 rounded-xl border border-slate-200/60 dark:border-slate-700/60">
                <span className="text-[10px] font-bold text-slate-400 block">حركات المخزون</span>
                <span className="text-sm font-black text-slate-900 dark:text-white">
                  {preview?.inventoryTransactionsCount ?? 0}
                </span>
                <span className="text-[9px] text-slate-400 block mt-0.5">سجل حركة</span>
              </div>

              <div className="bg-white dark:bg-slate-800/80 p-2.5 rounded-xl border border-slate-200/60 dark:border-slate-700/60">
                <span className="text-[10px] font-bold text-slate-400 block">القيود المحاسبية</span>
                <span className="text-sm font-black text-slate-900 dark:text-white">
                  {preview?.journalEntriesCount ?? 0}
                </span>
                <span className="text-[9px] text-slate-400 block mt-0.5">قيد يومية</span>
              </div>
            </div>
          </div>

          {/* Advanced Ledger Options */}
          <div className="space-y-3 border-t border-slate-100 dark:border-slate-800 pt-3">
            <h4 className="text-xs font-black text-slate-700 dark:text-slate-300">
              خيارات المعالجة المحاسبية والمخزنية
            </h4>

            <div className="space-y-2">
              <div className="flex items-center justify-between p-2.5 rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200/60 dark:border-slate-800">
                <div className="space-y-0.5">
                  <div className="text-xs font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                    <Warehouse className="w-3.5 h-3.5 text-indigo-500" />
                    عكس كميات المخزون المستهلكة/المضافة
                  </div>
                  <p className="text-[10px] text-slate-400">
                    عند التفعيل يتم إعادة كميات المبيعات للمستودع وخصم كميات المشتريات. (عطله إن كنت ترغب في الإبقاء على كميات الجرد الحالية).
                  </p>
                </div>
                <Switch checked={revertStock} onCheckedChange={setRevertStock} />
              </div>

              <div className="flex items-center justify-between p-2.5 rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200/60 dark:border-slate-800">
                <div className="space-y-0.5">
                  <div className="text-xs font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                    <Coins className="w-3.5 h-3.5 text-amber-500" />
                    عكس حركة النقدية في الخزينة
                  </div>
                  <p className="text-[10px] text-slate-400">
                    خصم المبيعات النقدية واسترداد المشتريات النقدية من رصيد الخزينة المسجل.
                  </p>
                </div>
                <Switch checked={revertTreasury} onCheckedChange={setRevertTreasury} />
              </div>

              <div className="flex items-center justify-between p-2.5 rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200/60 dark:border-slate-800">
                <div className="space-y-0.5">
                  <div className="text-xs font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                    <Users className="w-3.5 h-3.5 text-emerald-500" />
                    إعادة احتساب أرصدة العملاء والموردين بدقة
                  </div>
                  <p className="text-[10px] text-slate-400">
                    حذف الفواتير الآجلة من كشوف الحسابات وتصحيح المديونيات والاستحقاقات.
                  </p>
                </div>
                <Switch checked={recalculateBalances} onCheckedChange={setRecalculateBalances} />
              </div>
            </div>
          </div>

          {/* Safety Confirmation Step */}
          <div className="bg-red-50/60 dark:bg-red-950/20 border border-red-200/70 dark:border-red-900/50 p-4 rounded-2xl space-y-3">
            <div className="flex items-center gap-2 text-red-600 dark:text-red-400 font-black text-xs">
              <AlertTriangle className="w-4 h-4 shrink-0" />
              تأكيد حاسم لمنع الحذف العرضي
            </div>
            <p className="text-[11px] text-red-700/80 dark:text-red-400/80 leading-relaxed font-medium">
              سيتم حذف جميع الفواتير والمرتجعات المطابقة في الفترة المحددة نهائياً من قاعدة البيانات المحلية وقاعدة البيانات السحابية فور المزامنة.
            </p>

            <div className="space-y-1.5 pt-1">
              <Label className="text-[11px] font-black text-slate-700 dark:text-slate-300">
                لتأكيد العملية، اكتب كلمة <span className="text-red-600 font-extrabold underline">تصفير</span> في الحقل أدناه:
              </Label>
              <Input
                type="text"
                value={confirmKeyword}
                onChange={(e) => setConfirmKeyword(e.target.value)}
                placeholder="اكتب: تصفير"
                className="h-10 bg-white dark:bg-slate-900 border-red-200 dark:border-red-900/60 text-xs font-black text-red-600 placeholder:text-slate-300"
              />
            </div>
          </div>
        </div>

        {/* Modal Actions */}
        <div className="flex items-center justify-end gap-2.5 pt-4 border-t border-slate-100 dark:border-slate-800">
          <Button
            variant="outline"
            onClick={onClose}
            disabled={isExecuting}
            className="text-xs font-bold rounded-xl cursor-pointer"
          >
            إلغاء
          </Button>

          <Button
            onClick={handleExecuteReset}
            disabled={
              isExecuting ||
              confirmKeyword.trim() !== 'تصفير' ||
              totalInvoicesCount === 0 ||
              !fromDate ||
              !toDate
            }
            className="bg-red-600 hover:bg-red-700 text-white text-xs font-black px-5 rounded-xl flex items-center gap-2 cursor-pointer shadow-md shadow-red-500/10 disabled:opacity-50"
          >
            {isExecuting ? (
              <>
                <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                جاري تصفير البيانات...
              </>
            ) : (
              <>
                <Lock className="w-3.5 h-3.5" />
                تأكيد تصفير {totalInvoicesCount} فاتورة الآن
              </>
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};
