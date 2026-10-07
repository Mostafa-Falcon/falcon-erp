'use client';

import React from 'react';
import { User, FileText, ShoppingBag, PackageCheck, CreditCard, Clock } from 'lucide-react';
import { cn } from '@/lib/utils';

export type ProfileTabId = 'profile' | 'statement' | 'sales' | 'inventory' | 'payments' | 'activities';

interface ProfileNavTabsProps {
    activeTab: ProfileTabId;
    onSelectTab: (tab: ProfileTabId) => void;
    counts: {
        statement: number;
        sales: number;
        inventory: number;
        payments: number;
    };
}

export function ProfileNavTabs({
    activeTab,
    onSelectTab,
    counts,
}: ProfileNavTabsProps) {
    const tabs = [
        { id: 'profile' as const, label: 'الملف الشخصي', icon: <User className="w-4 h-4" /> },
        { id: 'statement' as const, label: 'كشف الحساب', icon: <FileText className="w-4 h-4" />, count: counts.statement },
        { id: 'sales' as const, label: 'المبيعات', icon: <ShoppingBag className="w-4 h-4" />, count: counts.sales },
        { id: 'inventory' as const, label: 'تقرير المخزون', icon: <PackageCheck className="w-4 h-4" />, count: counts.inventory },
        { id: 'payments' as const, label: 'المدفوعات', icon: <CreditCard className="w-4 h-4" />, count: counts.payments },
        { id: 'activities' as const, label: 'الأنشطة', icon: <Clock className="w-4 h-4" /> },
    ];

    return (
        <div className="space-y-1 bg-surface rounded-3xl border border-slate-200/80 dark:border-slate-800 p-3 shadow-xs h-fit">
            {tabs.map((tab) => {
                const isActive = activeTab === tab.id;

                return (
                    <button
                        key={tab.id}
                        onClick={() => onSelectTab(tab.id)}
                        className={cn(
                            "w-full flex items-center justify-between px-4 py-3 rounded-2xl text-xs font-black transition-all cursor-pointer",
                            isActive
                                ? "bg-blue-50/80 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400 shadow-xs"
                                : "text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-900/60 hover:text-slate-900 dark:hover:text-white"
                        )}
                    >
                        <div className="flex items-center gap-3">
                            {tab.icon}
                            <span>{tab.label}</span>
                        </div>
                        {tab.count !== undefined && tab.count > 0 && (
                            <span
                                className={cn(
                                    "px-2 py-0.5 rounded-full text-3xs font-mono",
                                    isActive ? "bg-blue-600 text-white" : "bg-slate-100 dark:bg-slate-800 text-slate-500"
                                )}
                            >
                                {tab.count}
                            </span>
                        )}
                    </button>
                );
            })}
        </div>
    );
}