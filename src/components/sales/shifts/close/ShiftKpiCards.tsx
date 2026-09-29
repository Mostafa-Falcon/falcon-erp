import React from'react';
import { Wallet, Receipt, RotateCcw, Coins, ArrowUpRight, ArrowDownLeft } from'lucide-react';
import { formatNumber } from'@/lib/format';
import type { ShiftFinancialMetrics } from'./types';

interface ShiftKpiCardsProps {
 metrics: ShiftFinancialMetrics;
}

export function ShiftKpiCards({ metrics }: ShiftKpiCardsProps) {
 return (
 <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
 {/* Card 1: الرصيد المتوقع في الدرج */}
 <div className="relative overflow-hidden p-5 rounded-2xl bg-gradient-to-br from-emerald-50/90 via-emerald-50/40 to-white dark:from-emerald-950/30 dark:via-[#111827] dark:to-[#111827] border-2 border-emerald-500/80 dark:border-emerald-500/50 shadow-xs flex items-center justify-between">
 <div className="space-y-1.5">
 <div className="flex items-center gap-1.5">
 <span className="text-xs sm:text-sm font-black text-emerald-800 dark:text-emerald-300">
 الرصيد المتوقع في الدرج
 </span>
 </div>
 <div className="text-xl sm:text-2xl font-black font-mono text-emerald-700 dark:text-emerald-400">
 {formatNumber(metrics.expectedDrawerCash)}{''}
 <span className="text-xs font-bold font-sans text-emerald-600/80 dark:text-emerald-400/80">ج.م</span>
 </div>
 <span className="text-2xs font-semibold text-emerald-600/90 dark:text-emerald-400/90 block">
 رصيد العهدة النقدية الفعلية المفترضة
 </span>
 </div>
 <div className="w-12 h-12 rounded-2xl bg-emerald-600 text-white flex items-center justify-center shadow-md shadow-emerald-600/20 shrink-0">
 <Wallet className="w-6 h-6"/>
 </div>
 </div>

 {/* Card 2: صافي المبيعات */}
 <div className="p-5 rounded-2xl bg-surface border border-slate-200/90 dark:border-slate-800 shadow-2xs flex items-center justify-between">
 <div className="space-y-1.5">
 <span className="text-xs sm:text-sm font-black text-slate-600 dark:text-slate-300">
 صافي المبيعات
 </span>
 <div className="text-xl sm:text-2xl font-black font-mono text-slate-900 dark:text-white">
 {formatNumber(metrics.netSales)}{''}
 <span className="text-xs font-bold font-sans text-slate-400">ج.م</span>
 </div>
 <span className="text-2xs font-semibold text-slate-400 block">
 إجمالي الفواتير بعد خصم المرتجع
 </span>
 </div>
 <div className="w-12 h-12 rounded-2xl bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 flex items-center justify-center border border-blue-200/50 dark:border-blue-900/50 shrink-0">
 <Receipt className="w-6 h-6"/>
 </div>
 </div>

 {/* Card 3: إجمالي المرتجعات */}
 <div className="p-5 rounded-2xl bg-surface border border-slate-200/90 dark:border-slate-800 shadow-2xs flex items-center justify-between">
 <div className="space-y-1.5">
 <span className="text-xs sm:text-sm font-black text-slate-600 dark:text-slate-300">
 إجمالي المرتجعات
 </span>
 <div className="text-xl sm:text-2xl font-black font-mono text-rose-600 dark:text-rose-400">
 {formatNumber(metrics.totalReturnAmount)}{''}
 <span className="text-xs font-bold font-sans text-rose-400">ج.م</span>
 </div>
 <span className="text-2xs font-semibold text-slate-400 block">
 مجموع الإرجاع بالوردية
 </span>
 </div>
 <div className="w-12 h-12 rounded-2xl bg-rose-50 dark:bg-rose-950/60 text-rose-600 dark:text-rose-400 flex items-center justify-center border border-rose-200/50 dark:border-rose-900/50 shrink-0">
 <RotateCcw className="w-6 h-6"/>
 </div>
 </div>

 {/* Card 4: التحصيلات والمصروفات */}
 <div className="p-5 rounded-2xl bg-surface border border-slate-200/90 dark:border-slate-800 shadow-2xs flex items-center justify-between">
 <div className="space-y-1.5">
 <span className="text-xs sm:text-sm font-black text-slate-600 dark:text-slate-300">
 التحصيلات والمصروفات
 </span>
 <div className="text-sm sm:text-base font-black font-mono text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
 <span className="text-emerald-600 dark:text-emerald-400 flex items-center gap-0.5">
 <ArrowUpRight className="w-3.5 h-3.5"/>
 +{formatNumber(metrics.customerDebtCollections)}
 </span>
 <span className="text-slate-300 dark:text-slate-700">/</span>
 <span className="text-rose-600 dark:text-rose-400 flex items-center gap-0.5">
 <ArrowDownLeft className="w-3.5 h-3.5"/>
 -{formatNumber(metrics.cashExpenses + metrics.supplierPayments)}
 </span>
 </div>
 <span className="text-2xs font-semibold text-slate-400 block">
 حركات السندات والمصاريف
 </span>
 </div>
 <div className="w-12 h-12 rounded-2xl bg-purple-50 dark:bg-purple-950/60 text-purple-600 dark:text-purple-400 flex items-center justify-center border border-purple-200/50 dark:border-purple-900/50 shrink-0">
 <Coins className="w-6 h-6"/>
 </div>
 </div>
 </div>
 );
}