import React from'react';
import { Icons } from'@/components/ui/Icons';
import { TransferStats } from'./types';

interface TransferStatsCardsProps {
 stats: TransferStats;
}

export const TransferStatsCards: React.FC<TransferStatsCardsProps> = ({ stats }) => {
 return (
 <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
 {/* 1. إجمالي التحويلات (Blue) */}
 <div className="bg-surface rounded-2xl p-4 border border-slate-200/80 dark:border-slate-800 shadow-xs flex items-center justify-between">
 <div>
 <span className="text-xs font-bold text-slate-500 dark:text-slate-400 block mb-1">
 إجمالي التحويلات
 </span>
 <span className="text-2xl font-black text-slate-900 dark:text-white">
 {stats.total}
 </span>
 </div>
 <div className="w-11 h-11 rounded-xl bg-blue-50 dark:bg-blue-950/50 text-blue-600 dark:text-blue-400 flex items-center justify-center">
 <Icons.SwapHorizontal />
 </div>
 </div>

 {/* 2. قيد الشحن (Amber) */}
 <div className="bg-surface rounded-2xl p-4 border border-slate-200/80 dark:border-slate-800 shadow-xs flex items-center justify-between">
 <div>
 <span className="text-xs font-bold text-slate-500 dark:text-slate-400 block mb-1">
 قيد الشحن
 </span>
 <span className="text-2xl font-black text-amber-600 dark:text-amber-400">
 {stats.pending}
 </span>
 </div>
 <div className="w-11 h-11 rounded-xl bg-amber-50 dark:bg-amber-950/50 text-amber-600 dark:text-amber-400 flex items-center justify-center">
 <Icons.FileText />
 </div>
 </div>

 {/* 3. تم الشحن (Sky Blue) */}
 <div className="bg-surface rounded-2xl p-4 border border-slate-200/80 dark:border-slate-800 shadow-xs flex items-center justify-between">
 <div>
 <span className="text-xs font-bold text-slate-500 dark:text-slate-400 block mb-1">
 تم الشحن
 </span>
 <span className="text-2xl font-black text-sky-600 dark:text-sky-400">
 {stats.inTransit}
 </span>
 </div>
 <div className="w-11 h-11 rounded-xl bg-sky-50 dark:bg-sky-950/50 text-sky-600 dark:text-sky-400 flex items-center justify-center">
 <Icons.Truck />
 </div>
 </div>

 {/* 4. تم الاستلام (Emerald) */}
 <div className="bg-surface rounded-2xl p-4 border border-slate-200/80 dark:border-slate-800 shadow-xs flex items-center justify-between">
 <div>
 <span className="text-xs font-bold text-slate-500 dark:text-slate-400 block mb-1">
 تم الاستلام
 </span>
 <span className="text-2xl font-black text-emerald-600 dark:text-emerald-400">
 {stats.completed}
 </span>
 </div>
 <div className="w-11 h-11 rounded-xl bg-emerald-50 dark:bg-emerald-950/50 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
 <Icons.Check />
 </div>
 </div>
 </div>
 );
};