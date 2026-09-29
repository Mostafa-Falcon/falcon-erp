import React, { useState, useEffect } from 'react';
import { Layers, X, DollarSign, CreditCard, Check } from 'lucide-react';
import { formatNumber } from '@/lib/format';
import { roundMoney } from '@/lib/decimal';
import { toast } from 'sonner';

interface PosSplitPaymentModalProps {
  isOpen: boolean;
  onClose: () => void;
  total: number;
  onConfirm: (cashAmount: number, cardAmount: number) => void;
  isSaving: boolean;
}

export function PosSplitPaymentModal({
  isOpen,
  onClose,
  total,
  onConfirm,
  isSaving,
}: PosSplitPaymentModalProps) {
  const [cashPart, setCashPart] = useState<number>(0);
  const [cardPart, setCardPart] = useState<number>(0);

  useEffect(() => {
    if (isOpen) {
      // Default: half and half or cash portion
      const roundedTotal = roundMoney(total);
      const half = roundMoney(roundedTotal / 2);
      setCashPart(half);
      setCardPart(roundMoney(roundedTotal - half));
    }
  }, [isOpen, total]);

  if (!isOpen) return null;

  const currentSum = roundMoney(cashPart + cardPart);
  const diff = roundMoney(total - currentSum);
  const isMatch = Math.abs(diff) < 0.001;

  const handleCashChange = (val: number) => {
    const valid = Math.max(0, val);
    setCashPart(valid);
    setCardPart(roundMoney(Math.max(0, total - valid)));
  };

  const handleCardChange = (val: number) => {
    const valid = Math.max(0, val);
    setCardPart(valid);
    setCashPart(roundMoney(Math.max(0, total - valid)));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!isMatch) {
      toast.error('مجموع مبالغ النقدية والبطاقة يجب أن يساوي تماماً إجمالي الفاتورة!');
      return;
    }
    onConfirm(cashPart, cardPart);
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-150">
      <div className="bg-surface border border-slate-200 dark:border-slate-800 w-full max-w-md rounded-2xl p-6 shadow-2xl space-y-5">
        <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-xl bg-purple-50 dark:bg-purple-950/50 text-purple-600">
              <Layers className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-base text-slate-900 dark:text-white">الدفع المختلط (نقد + بطاقة)</h3>
              <p className="text-xs text-slate-400">توزيع سداد الفاتورة بين النقد وماكينة الفيزا</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Required Total Banner */}
        <div className="bg-slate-50 dark:bg-slate-800/60 p-3.5 rounded-xl border border-slate-200/80 dark:border-slate-700/80 flex items-center justify-between">
          <span className="text-xs font-bold text-slate-500 dark:text-slate-400">إجمالي الفاتورة المطلوب:</span>
          <span className="text-xl font-black text-blue-600 dark:text-blue-400 font-mono">
            {formatNumber(total)} <span className="text-xs font-normal">ج.م</span>
          </span>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Cash Input */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
              <DollarSign className="w-3.5 h-3.5 text-emerald-600" />
              <span>المبلغ المدفوع نقداً (كاش):</span>
            </label>
            <input
              type="number"
              step="any"
              min="0"
              value={cashPart}
              onChange={(e) => handleCashChange(parseFloat(e.target.value) || 0)}
              className="w-full h-10 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl px-3 text-sm font-black font-mono text-emerald-600 focus:outline-none focus:ring-2 focus:ring-emerald-500"
              required
            />
          </div>

          {/* Card Input */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
              <CreditCard className="w-3.5 h-3.5 text-blue-600" />
              <span>المبلغ المدفوع بالبطاقة (فيزا):</span>
            </label>
            <input
              type="number"
              step="any"
              min="0"
              value={cardPart}
              onChange={(e) => handleCardChange(parseFloat(e.target.value) || 0)}
              className="w-full h-10 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl px-3 text-sm font-black font-mono text-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-500"
              required
            />
          </div>

          {/* Difference & Status */}
          <div
            className={`p-2.5 rounded-xl border text-xs font-bold flex items-center justify-between ${
              isMatch
                ? 'bg-emerald-50 border-emerald-200 text-emerald-700 dark:bg-emerald-950/40 dark:border-emerald-800 dark:text-emerald-400'
                : 'bg-rose-50 border-rose-200 text-rose-700 dark:bg-rose-950/40 dark:border-rose-800 dark:text-rose-400'
            }`}
          >
            <span>{isMatch ? 'المبلغ مطابق تماماً للإجمالي المطلوب' : 'المبلغ غير مطابق للإجمالي:'}</span>
            <span className="font-mono">
              {isMatch ? <Check className="w-4 h-4 inline-block" /> : `${Math.abs(diff)} ج.م ${diff > 0 ? 'متبقي' : 'زيادة'}`}
            </span>
          </div>

          {/* Actions */}
          <div className="flex items-center gap-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 h-10 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 font-bold text-xs hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
            >
              إلغاء
            </button>
            <button
              type="submit"
              disabled={!isMatch || isSaving}
              className="flex-1 h-10 rounded-xl bg-purple-600 hover:bg-purple-700 text-white font-bold text-xs flex items-center justify-center gap-1.5 shadow-xs transition-colors cursor-pointer disabled:opacity-50"
            >
              {isSaving ? 'جارٍ الحفظ...' : 'تأكيد وحفظ الفاتورة (F9)'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
