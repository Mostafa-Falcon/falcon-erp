'use client';

import React from'react';
import {
 ChevronLeft,
 ChevronRight,
 ChevronsLeft,
 ChevronsRight,
} from'lucide-react';
import { formatNumber } from'@/lib/format';

interface CustomersPaginationProps {
 netDebt: number;
 totalFilteredCount: number;
 currentPage: number;
 totalPages: number;
 pageSize: number;
 onPageChange: (page: number) => void;
}

export function CustomersPagination({
 netDebt,
 totalFilteredCount,
 currentPage,
 totalPages,
 pageSize,
 onPageChange,
}: CustomersPaginationProps) {
 const fromIndex = totalFilteredCount === 0 ? 0 : (currentPage - 1) * pageSize + 1;
 const toIndex = Math.min(currentPage * pageSize, totalFilteredCount);

 return (
 <div className="p-4 bg-slate-50/50 dark:bg-slate-900/40 border-t border-slate-100 dark:border-slate-800 flex flex-col md:flex-row items-center justify-between gap-4">
 {/* Right: صافي المديونية */}
 <div className="flex items-center gap-2">
 <span className="text-xs font-bold text-slate-500">صافي المديونية المستحقة على العملاء:</span>
 <span className="text-sm font-black text-rose-600 font-mono tracking-tight"dir="ltr">
 {formatNumber(netDebt)} ج.م
 </span>
 </div>

 {/* Center: عدد العناصر المعروضة */}
 <div className="text-xs font-bold text-slate-400">
 عرض {fromIndex} إلى {toIndex} من إجمالي {totalFilteredCount} العميل
 </div>

 {/* Left: أزرار الترقيم */}
 {totalPages > 1 && (
 <div className="flex items-center gap-1">
 <button
 onClick={() => onPageChange(1)}
 disabled={currentPage <= 1}
 className="w-8 h-8 rounded-xl border border-slate-200 dark:border-slate-800 bg-surface flex items-center justify-center hover:bg-slate-50 dark:hover:bg-slate-800 disabled:opacity-30 disabled:cursor-not-allowed text-xs transition-colors cursor-pointer"
 title="الصفحة الأولى"
 >
 <ChevronsRight className="w-4 h-4"/>
 </button>

 <button
 onClick={() => onPageChange(currentPage - 1)}
 disabled={currentPage <= 1}
 className="w-8 h-8 rounded-xl border border-slate-200 dark:border-slate-800 bg-surface flex items-center justify-center hover:bg-slate-50 dark:hover:bg-slate-800 disabled:opacity-30 disabled:cursor-not-allowed text-xs transition-colors cursor-pointer"
 title="السابق"
 >
 <ChevronRight className="w-4 h-4"/>
 </button>

 <div className="px-3 py-1 bg-pink-50 dark:bg-pink-950/40 text-pink-600 dark:text-pink-400 rounded-xl text-xs font-black font-mono border border-pink-100 dark:border-pink-900/40">
 {currentPage} / {totalPages}
 </div>

 <button
 onClick={() => onPageChange(currentPage + 1)}
 disabled={currentPage >= totalPages}
 className="w-8 h-8 rounded-xl border border-slate-200 dark:border-slate-800 bg-surface flex items-center justify-center hover:bg-slate-50 dark:hover:bg-slate-800 disabled:opacity-30 disabled:cursor-not-allowed text-xs transition-colors cursor-pointer"
 title="التالي"
 >
 <ChevronLeft className="w-4 h-4"/>
 </button>

 <button
 onClick={() => onPageChange(totalPages)}
 disabled={currentPage >= totalPages}
 className="w-8 h-8 rounded-xl border border-slate-200 dark:border-slate-800 bg-surface flex items-center justify-center hover:bg-slate-50 dark:hover:bg-slate-800 disabled:opacity-30 disabled:cursor-not-allowed text-xs transition-colors cursor-pointer"
 title="الصفحة الأخيرة"
 >
 <ChevronsLeft className="w-4 h-4"/>
 </button>
 </div>
 )}
 </div>
 );
}