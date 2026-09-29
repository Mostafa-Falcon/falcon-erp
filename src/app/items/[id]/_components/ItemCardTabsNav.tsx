'use client';

import React from'react';
import { Clock, Calendar, Sparkles, ClipboardList } from'lucide-react';
import { cn } from'@/lib/utils';
import type { TabKey } from'./types';

interface ItemCardTabsNavProps {
 activeTab: TabKey;
 setActiveTab: (tab: TabKey) => void;
}

export function ItemCardTabsNav({ activeTab, setActiveTab }: ItemCardTabsNavProps) {
 return (
 <div className="flex items-center gap-6 border-b border-slate-200 dark:border-slate-800 px-2">
 <button
 onClick={() => setActiveTab('movements')}
 className={cn(
'flex items-center gap-2 pb-3 pt-1 text-xs font-black transition-all border-b-2 cursor-pointer',
 activeTab ==='movements'
 ?'border-blue-600 text-blue-600 dark:text-blue-400'
 :'border-transparent text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200'
 )}
 >
 <Clock className="w-4 h-4"/>
 <span>سجل الحركات</span>
 </button>

 <button
 onClick={() => setActiveTab('batches')}
 className={cn(
'flex items-center gap-2 pb-3 pt-1 text-xs font-black transition-all border-b-2 cursor-pointer',
 activeTab ==='batches'
 ?'border-blue-600 text-blue-600 dark:text-blue-400'
 :'border-transparent text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200'
 )}
 >
 <Calendar className="w-4 h-4"/>
 <span>التشغيلات والصلاحية</span>
 </button>

 <button
 onClick={() => setActiveTab('substitutes')}
 className={cn(
'flex items-center gap-2 pb-3 pt-1 text-xs font-black transition-all border-b-2 cursor-pointer',
 activeTab ==='substitutes'
 ?'border-blue-600 text-blue-600 dark:text-blue-400'
 :'border-transparent text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200'
 )}
 >
 <Sparkles className="w-4 h-4"/>
 <span>بدائل الصنف</span>
 </button>

 <button
 onClick={() => setActiveTab('stocktake')}
 className={cn(
'flex items-center gap-2 pb-3 pt-1 text-xs font-black transition-all border-b-2 cursor-pointer',
 activeTab ==='stocktake'
 ?'border-blue-600 text-blue-600 dark:text-blue-400'
 :'border-transparent text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200'
 )}
 >
 <ClipboardList className="w-4 h-4"/>
 <span>الجرد</span>
 </button>
 </div>
 );
}