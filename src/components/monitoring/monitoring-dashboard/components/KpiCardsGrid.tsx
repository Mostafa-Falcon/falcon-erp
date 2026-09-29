import React from'react';
import {
 ShoppingCart,
 DollarSign,
 FileText,
 RotateCcw,
 ShoppingBag,
 Zap,
 Wallet,
} from'lucide-react';
import type { KpiData } from'../types';

interface KpiCardsGridProps {
 kpis: KpiData;
}

export const KpiCardsGrid: React.FC<KpiCardsGridProps> = ({ kpis }) => {
 return (
 <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 w-full">
 {/* Row 1, Card 1: إجمالي المبيعات */}
 <div className="bg-surface rounded-2xl p-4 border border-slate-200/80 dark:border-slate-800 shadow-xs flex items-center justify-between border-r-4 border-r-blue-600">
 <div className="flex flex-col">
 <span className="text-xs font-bold text-slate-500 dark:text-slate-400 mb-1">
 إجمالي المبيعات
 </span>
 <div className="flex items-baseline gap-1">
 <span className="text-xl font-black text-slate-900 dark:text-white">
 {kpis.totalSales.toLocaleString('en-US', {
 minimumFractionDigits: 2,
 maximumFractionDigits: 2,
 })}
 </span>
 <span className="text-xs font-bold text-slate-500">ج.م</span>
 </div>
 </div>
 <div className="w-12 h-12 rounded-xl bg-blue-50 dark:bg-blue-950/50 text-blue-600 dark:text-blue-400 flex items-center justify-center shadow-2xs">
 <ShoppingCart className="w-6 h-6"/>
 </div>
 </div>

 {/* Row 1, Card 2: صافي الأرباح */}
 <div className="bg-surface rounded-2xl p-4 border border-slate-200/80 dark:border-slate-800 shadow-xs flex items-center justify-between border-r-4 border-r-emerald-500">
 <div className="flex flex-col">
 <span className="text-xs font-bold text-slate-500 dark:text-slate-400 mb-1">
 صافي الأرباح الفعلي
 </span>
 <div className="flex items-baseline gap-1">
 <span className="text-xl font-black text-slate-900 dark:text-white">
 {kpis.netProfit.toLocaleString('en-US', {
 minimumFractionDigits: 2,
 maximumFractionDigits: 2,
 })}
 </span>
 <span className="text-xs font-bold text-slate-500">ج.م</span>
 </div>
 </div>
 <div className="w-12 h-12 rounded-xl bg-emerald-50 dark:bg-emerald-950/50 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shadow-2xs">
 <DollarSign className="w-6 h-6"/>
 </div>
 </div>

 {/* Row 1, Card 3: المبيعات الآجلة */}
 <div className="bg-surface rounded-2xl p-4 border border-slate-200/80 dark:border-slate-800 shadow-xs flex items-center justify-between border-r-4 border-r-amber-500">
 <div className="flex flex-col">
 <span className="text-xs font-bold text-slate-500 dark:text-slate-400 mb-1">
 المبيعات الآجلة
 </span>
 <div className="flex items-baseline gap-1">
 <span className="text-xl font-black text-slate-900 dark:text-white">
 {kpis.creditSales.toLocaleString('en-US', {
 minimumFractionDigits: 2,
 maximumFractionDigits: 2,
 })}
 </span>
 <span className="text-xs font-bold text-slate-500">ج.م</span>
 </div>
 </div>
 <div className="w-12 h-12 rounded-xl bg-amber-50 dark:bg-amber-950/50 text-amber-600 dark:text-amber-400 flex items-center justify-center shadow-2xs">
 <FileText className="w-6 h-6"/>
 </div>
 </div>

 {/* Row 1, Card 4: إجمالي مرتجع المبيعات */}
 <div className="bg-surface rounded-2xl p-4 border border-slate-200/80 dark:border-slate-800 shadow-xs flex items-center justify-between border-r-4 border-r-rose-500">
 <div className="flex flex-col">
 <span className="text-xs font-bold text-slate-500 dark:text-slate-400 mb-1">
 إجمالي مرتجع المبيعات
 </span>
 <div className="flex items-baseline gap-1">
 <span className="text-xl font-black text-slate-900 dark:text-white">
 {kpis.salesReturns.toLocaleString('en-US', {
 minimumFractionDigits: 2,
 maximumFractionDigits: 2,
 })}
 </span>
 <span className="text-xs font-bold text-slate-500">ج.م</span>
 </div>
 </div>
 <div className="w-12 h-12 rounded-xl bg-rose-50 dark:bg-rose-950/50 text-rose-600 dark:text-rose-400 flex items-center justify-center shadow-2xs">
 <RotateCcw className="w-6 h-6"/>
 </div>
 </div>

 {/* Row 2, Card 5: إجمالي المشتريات */}
 <div className="bg-surface rounded-2xl p-4 border border-slate-200/80 dark:border-slate-800 shadow-xs flex items-center justify-between border-r-4 border-r-sky-500">
 <div className="flex flex-col">
 <span className="text-xs font-bold text-slate-500 dark:text-slate-400 mb-1">
 إجمالي المشتريات
 </span>
 <div className="flex items-baseline gap-1">
 <span className="text-xl font-black text-slate-900 dark:text-white">
 {kpis.totalPurchases.toLocaleString('en-US', {
 minimumFractionDigits: 2,
 maximumFractionDigits: 2,
 })}
 </span>
 <span className="text-xs font-bold text-slate-500">ج.م</span>
 </div>
 </div>
 <div className="w-12 h-12 rounded-xl bg-sky-50 dark:bg-sky-950/50 text-sky-600 dark:text-sky-400 flex items-center justify-center shadow-2xs">
 <ShoppingBag className="w-6 h-6"/>
 </div>
 </div>

 {/* Row 2, Card 6: إجمالي مرتجع المشتريات */}
 <div className="bg-surface rounded-2xl p-4 border border-slate-200/80 dark:border-slate-800 shadow-xs flex items-center justify-between border-r-4 border-r-red-500">
 <div className="flex flex-col">
 <span className="text-xs font-bold text-slate-500 dark:text-slate-400 mb-1">
 إجمالي مرتجع المشتريات
 </span>
 <div className="flex items-baseline gap-1">
 <span className="text-xl font-black text-slate-900 dark:text-white">
 {kpis.purchasesReturns.toLocaleString('en-US', {
 minimumFractionDigits: 2,
 maximumFractionDigits: 2,
 })}
 </span>
 <span className="text-xs font-bold text-slate-500">ج.م</span>
 </div>
 </div>
 <div className="w-12 h-12 rounded-xl bg-red-50 dark:bg-red-950/50 text-red-600 dark:text-red-400 flex items-center justify-center shadow-2xs">
 <RotateCcw className="w-6 h-6"/>
 </div>
 </div>

 {/* Row 2, Card 7: المصروفات */}
 <div className="bg-surface rounded-2xl p-4 border border-slate-200/80 dark:border-slate-800 shadow-xs flex items-center justify-between border-r-4 border-r-orange-500">
 <div className="flex flex-col">
 <span className="text-xs font-bold text-slate-500 dark:text-slate-400 mb-1">
 المصروفات
 </span>
 <div className="flex items-baseline gap-1">
 <span className="text-xl font-black text-slate-900 dark:text-white">
 {kpis.expenses.toLocaleString('en-US', {
 minimumFractionDigits: 2,
 maximumFractionDigits: 2,
 })}
 </span>
 <span className="text-xs font-bold text-slate-500">ج.م</span>
 </div>
 </div>
 <div className="w-12 h-12 rounded-xl bg-orange-50 dark:bg-orange-950/50 text-orange-600 dark:text-orange-400 flex items-center justify-center shadow-2xs">
 <Zap className="w-6 h-6"/>
 </div>
 </div>

 {/* Row 2, Card 8: التحصيلات النقدية */}
 <div className="bg-surface rounded-2xl p-4 border border-slate-200/80 dark:border-slate-800 shadow-xs flex items-center justify-between border-r-4 border-r-purple-600">
 <div className="flex flex-col">
 <span className="text-xs font-bold text-slate-500 dark:text-slate-400 mb-1">
 الرصيد النقدي بالخزائن
 </span>
 <div className="flex items-baseline gap-1">
 <span className="text-xl font-black text-slate-900 dark:text-white">
 {kpis.cashCollected.toLocaleString('en-US', {
 minimumFractionDigits: 2,
 maximumFractionDigits: 2,
 })}
 </span>
 <span className="text-xs font-bold text-slate-500">ج.م</span>
 </div>
 </div>
 <div className="w-12 h-12 rounded-xl bg-purple-50 dark:bg-purple-950/50 text-purple-600 dark:text-purple-400 flex items-center justify-center shadow-2xs">
 <Wallet className="w-6 h-6"/>
 </div>
 </div>
 </div>
 );
};