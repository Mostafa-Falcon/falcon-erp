'use client';

import React from 'react';
import { Users, TrendingDown, Wallet } from 'lucide-react';
import { formatNumber } from '@/lib/format';

interface CustomersKpiCardsProps {
    totalCustomers: number;
    totalDebt: number;
    totalCredit: number;
}

export function CustomersKpiCards({
    totalCustomers,
    totalDebt,
    totalCredit,
}: CustomersKpiCardsProps) {
    return (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Card 1: إجمالي العملاء */}
            <div className="bg-surface rounded-3xl border border-slate-200/80 dark:border-slate-800 p-5 shadow-xs flex items-center justify-between">
                <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-2xl bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400 flex items-center justify-center shadow-inner">
                        <Users className="w-6 h-6" />
                    </div>
                    <div>
                        <span className="text-xs font-bold text-slate-400 block mb-1">إجمالي العملاء</span>
                        <span className="text-2xl font-black text-blue-600 dark:text-blue-400 font-mono">
                            {totalCustomers}
                        </span>
                    </div>
                </div>
            </div>

            {/* Card 2: إجمالي المديونيات */}
            <div className="bg-surface rounded-3xl border border-slate-200/80 dark:border-slate-800 p-5 shadow-xs flex items-center justify-between">
                <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-2xl bg-rose-50 dark:bg-rose-950/40 text-rose-600 dark:text-rose-400 flex items-center justify-center shadow-inner">
                        <TrendingDown className="w-6 h-6" />
                    </div>
                    <div>
                        <span className="text-xs font-bold text-slate-400 block mb-1">إجمالي المديونيات</span>
                        <span className="text-2xl font-black text-rose-600 dark:text-rose-400 font-mono tracking-tight" dir="ltr">
                            {formatNumber(totalDebt)} ج.م
                        </span>
                    </div>
                </div>
            </div>

            {/* Card 3: رصيد مقدم (دائن) */}
            <div className="bg-surface rounded-3xl border border-slate-200/80 dark:border-slate-800 p-5 shadow-xs flex items-center justify-between">
                <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shadow-inner">
                        <Wallet className="w-6 h-6" />
                    </div>
                    <div>
                        <span className="text-xs font-bold text-slate-400 block mb-1">رصيد مقدم (دائن)</span>
                        <span className="text-2xl font-black text-emerald-600 dark:text-emerald-400 font-mono tracking-tight" dir="ltr">
                            {formatNumber(totalCredit)} ج.م
                        </span>
                    </div>
                </div>
            </div>
        </div>
    );
}