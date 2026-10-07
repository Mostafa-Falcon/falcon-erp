'use client';

import React from 'react';
import { Search, RefreshCw, X } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';

export type CustomerFilterTab = 'all' | 'debit' | 'inactive';

interface CustomersToolbarProps {
    searchQuery: string;
    onSearchChange: (q: string) => void;
    activeTab: CustomerFilterTab;
    onTabChange: (tab: CustomerFilterTab) => void;
    onRefresh: () => void;
    isLoading: boolean;
}

export function CustomersToolbar({
    searchQuery,
    onSearchChange,
    activeTab,
    onTabChange,
    onRefresh,
    isLoading,
}: CustomersToolbarProps) {
    return (
        <div className="p-4 border-b border-slate-100 dark:border-slate-800/80 flex flex-wrap items-center justify-between gap-4">
            {/* Search Box */}
            <div className="relative flex-1 min-w-[260px] max-w-lg">
                <Search className="absolute right-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
                <Input
                    value={searchQuery}
                    onChange={(e) => onSearchChange(e.target.value)}
                    placeholder="ابحث باسم العميل، الهاتف، أو الكود..."
                    className="h-11 pr-10 pl-8 rounded-2xl bg-slate-50/50 dark:bg-slate-900/50 border-slate-200 dark:border-slate-800 text-xs font-bold transition-all focus:bg-white focus:ring-2 focus:ring-pink-500/20"
                />
                {searchQuery && (
                    <button
                        onClick={() => onSearchChange('')}
                        className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-0.5 cursor-pointer"
                        title="مسح البحث"
                    >
                        <X className="w-3.5 h-3.5" />
                    </button>
                )}
            </div>

            {/* Filter Tabs & Refresh */}
            <div className="flex items-center gap-2">
                <div className="flex items-center p-1 bg-slate-100 dark:bg-slate-900/80 rounded-2xl border border-slate-200/60 dark:border-slate-800">
                    <button
                        onClick={() => onTabChange('all')}
                        className={cn(
                            "px-4 py-2 rounded-xl text-xs font-black transition-all cursor-pointer",
                            activeTab === 'all'
                                ? "bg-white dark:bg-slate-800 text-slate-900 dark:text-white shadow-xs"
                                : "text-slate-500 hover:text-slate-800 dark:hover:text-slate-200"
                        )}
                    >
                        الكل
                    </button>
                    <button
                        onClick={() => onTabChange('debit')}
                        className={cn(
                            "px-4 py-2 rounded-xl text-xs font-black transition-all cursor-pointer",
                            activeTab === 'debit'
                                ? "bg-rose-500 text-white shadow-xs"
                                : "text-slate-500 hover:text-slate-800 dark:hover:text-slate-200"
                        )}
                    >
                        بيع مستحق
                    </button>
                    <button
                        onClick={() => onTabChange('inactive')}
                        className={cn(
                            "px-4 py-2 rounded-xl text-xs font-black transition-all cursor-pointer",
                            activeTab === 'inactive'
                                ? "bg-slate-700 text-white shadow-xs"
                                : "text-slate-500 hover:text-slate-800 dark:hover:text-slate-200"
                        )}
                    >
                        متوقف
                    </button>
                </div>

                <button
                    onClick={onRefresh}
                    className={cn(
                        "w-11 h-11 rounded-2xl border border-slate-200 dark:border-slate-800 bg-surface flex items-center justify-center text-slate-500 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors shadow-xs cursor-pointer",
                        isLoading && "animate-spin text-pink-600"
                    )}
                    title="تحديث البيانات"
                >
                    <RefreshCw className="w-4 h-4" />
                </button>
            </div>
        </div>
    );
}