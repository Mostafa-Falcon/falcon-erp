'use client';

import React from'react';
import { Button } from'@/components/ui/button';
import { AlertTriangle, Clock, X, Star, SlidersHorizontal, ChevronUp, ChevronDown } from'lucide-react';
import { cn } from'@/lib/utils';
import type { QuickFilterType, CatalogStats } from'./types';

interface ItemFilterTabsProps {
 quickFilter: QuickFilterType;
 setQuickFilter: (tab: QuickFilterType) => void;
 stats: CatalogStats;
 showAdvancedFilter: boolean;
 setShowAdvancedFilter: (show: boolean) => void;
}

export function ItemFilterTabs({
 quickFilter,
 setQuickFilter,
 stats,
 showAdvancedFilter,
 setShowAdvancedFilter,
}: ItemFilterTabsProps) {
 return (
 <div className="flex flex-wrap items-center justify-between gap-3 bg-surface p-3 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-xs">
 <div className="flex flex-wrap items-center gap-2">
 <Button
 variant="ghost"
 size="sm"
 onClick={() => setQuickFilter('all')}
 className={cn(
'h-9 px-4 text-xs font-black rounded-xl transition-all',
 quickFilter ==='all'
 ?'bg-blue-600 text-white shadow-xs hover:bg-blue-700'
 :'bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-100'
 )}
 >
 الكل ({stats.total})
 </Button>

 <Button
 variant="ghost"
 size="sm"
 onClick={() => setQuickFilter('low_stock')}
 className={cn(
'h-9 px-4 text-xs font-black rounded-xl transition-all flex items-center gap-1.5',
 quickFilter ==='low_stock'
 ?'bg-red-600 text-white shadow-xs hover:bg-red-700'
 :'bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-100'
 )}
 >
 <AlertTriangle className="w-3.5 h-3.5 text-red-500"/>
 <span>النواقص ({stats.lowStockCount})</span>
 </Button>

 <Button
 variant="ghost"
 size="sm"
 onClick={() => setQuickFilter('near_expiry')}
 className={cn(
'h-9 px-4 text-xs font-black rounded-xl transition-all flex items-center gap-1.5',
 quickFilter ==='near_expiry'
 ?'bg-amber-600 text-white shadow-xs hover:bg-amber-700'
 :'bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-100'
 )}
 >
 <Clock className="w-3.5 h-3.5 text-amber-500"/>
 <span>قربت تنتهي ({stats.nearExpiryCount})</span>
 </Button>

 <Button
 variant="ghost"
 size="sm"
 onClick={() => setQuickFilter('out_of_stock')}
 className={cn(
'h-9 px-4 text-xs font-black rounded-xl transition-all flex items-center gap-1.5',
 quickFilter ==='out_of_stock'
 ?'bg-slate-800 text-white shadow-xs dark:bg-slate-700'
 :'bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-100'
 )}
 >
 <X className="w-3.5 h-3.5"/>
 <span>خارج المخزون ({stats.outOfStockCount})</span>
 </Button>

 <Button
 variant="ghost"
 size="sm"
 onClick={() => setQuickFilter('quick_pos')}
 className={cn(
'h-9 px-4 text-xs font-black rounded-xl transition-all flex items-center gap-1.5',
 quickFilter ==='quick_pos'
 ?'bg-[#558b2f] text-white shadow-xs hover:bg-[#436d25]'
 :'bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-100'
 )}
 >
 <Star className="w-3.5 h-3.5 text-amber-400 fill-amber-400"/>
 <span>الأصناف السريعة</span>
 </Button>
 </div>

 {/* Toggle Advanced Filter Button */}
 <Button
 variant="outline"
 size="sm"
 onClick={() => setShowAdvancedFilter(!showAdvancedFilter)}
 className={cn(
'h-9 px-4 text-xs font-black rounded-xl border-slate-200 dark:border-slate-800 flex items-center gap-2',
 showAdvancedFilter &&'bg-slate-100 dark:bg-slate-800 border-[#558b2f] text-[#558b2f]'
 )}
 >
 <SlidersHorizontal className="w-3.5 h-3.5"/>
 <span>تصفية متقدمة</span>
 {showAdvancedFilter ? <ChevronUp className="w-3.5 h-3.5"/> : <ChevronDown className="w-3.5 h-3.5"/>}
 </Button>
 </div>
 );
}