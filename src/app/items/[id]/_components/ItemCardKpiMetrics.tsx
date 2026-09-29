'use client';

import React from'react';
import { formatNumber } from'@/lib/format';

interface ItemCardKpiMetricsProps {
 totalPurchases: number;
 totalSales: number;
 totalDamaged: number;
 stockBreakdownText: string;
}

export function ItemCardKpiMetrics({
 totalPurchases,
 totalSales,
 totalDamaged,
 stockBreakdownText,
}: ItemCardKpiMetricsProps) {
 return (
 <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
 {/* إجمالي المشتريات */}
 <div className="bg-surface p-4 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-xs flex flex-col justify-between">
 <span className="text-xs font-black text-slate-400">إجمالي المشتريات</span>
 <span className="text-2xl font-black text-blue-600 dark:text-blue-400 font-mono mt-1">
 {formatNumber(totalPurchases)}
 </span>
 </div>

 {/* إجمالي المبيعات */}
 <div className="bg-surface p-4 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-xs flex flex-col justify-between">
 <span className="text-xs font-black text-slate-400">إجمالي المبيعات</span>
 <span className="text-2xl font-black text-emerald-600 dark:text-emerald-400 font-mono mt-1">
 {formatNumber(totalSales)}
 </span>
 </div>

 {/* إجمالي الهالك */}
 <div className="bg-surface p-4 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-xs flex flex-col justify-between">
 <span className="text-xs font-black text-slate-400">إجمالي الهالك</span>
 <span className="text-2xl font-black text-red-600 dark:text-red-400 font-mono mt-1">
 {formatNumber(totalDamaged)}
 </span>
 </div>

 {/* المخزون الحالي */}
 <div className="bg-[#f0f7ff] dark:bg-blue-950/20 p-4 rounded-2xl border border-blue-100 dark:border-blue-900/40 shadow-xs flex flex-col justify-between">
 <span className="text-xs font-black text-blue-600 dark:text-blue-300">المخزون الحالي</span>
 <span className="text-xl font-black text-blue-700 dark:text-blue-300 font-mono mt-1">
 {stockBreakdownText}
 </span>
 </div>
 </div>
 );
}