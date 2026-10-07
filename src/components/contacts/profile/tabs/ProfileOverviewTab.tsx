'use client';

import React from 'react';
import { Phone, ShoppingBag, Coins, CheckCircle2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { formatNumber } from '@/lib/format';
import { cn } from '@/lib/utils';
import type { Contact } from '@/types';

interface ProfileOverviewTabProps {
    customer: Contact;
    stats: {
        totalInvoicesAmount: number;
        totalReceivedPayments: number;
        totalAdvances: number;
        invoicesCount: number;
        uniqueProductsCount: number;
        vouchersCount: number;
    };
    onToggleActive: () => void;
}

export function ProfileOverviewTab({
    customer,
    stats,
    onToggleActive,
}: ProfileOverviewTabProps) {
    return (
        <div className="space-y-5">
            {/* Row 1: بيانات التواصل & نشاط المبيعات */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                {/* Card 1: بيانات التواصل الأساسية */}
                <div className="bg-surface rounded-3xl border border-slate-200/80 dark:border-slate-800 p-5 shadow-xs">
                    <h3 className="text-sm font-black text-slate-900 dark:text-white pb-3 mb-4 border-b border-slate-100 dark:border-slate-800/80 flex items-center justify-between">
                        <span>بيانات التواصل الأساسية</span>
                        <Phone className="w-4 h-4 text-slate-400" />
                    </h3>

                    <div className="space-y-4">
                        <div className="flex items-center justify-between text-xs">
                            <span className="font-bold text-slate-400">رقم الجوال</span>
                            <span className="font-mono font-bold text-slate-800 dark:text-slate-200" dir="ltr">
                                {customer.phone || customer.mobile || 'غير مسجل'}
                            </span>
                        </div>

                        <div className="flex items-center justify-between text-xs">
                            <span className="font-bold text-slate-400">العنوان الحالي</span>
                            <span className="font-bold text-slate-800 dark:text-slate-200">
                                {customer.address || '—'}
                            </span>
                        </div>

                        <div className="flex items-center justify-between text-xs">
                            <span className="font-bold text-slate-400">حد الائتمان المسموح</span>
                            <span className="font-black text-slate-800 dark:text-slate-200">
                                {formatNumber(customer.credit_limit)} ج.م
                            </span>
                        </div>
                    </div>
                </div>

                {/* Card 2: نشاط المبيعات والطلبات */}
                <div className="bg-surface rounded-3xl border border-slate-200/80 dark:border-slate-800 p-5 shadow-xs">
                    <h3 className="text-sm font-black text-slate-900 dark:text-white pb-3 mb-4 border-b border-slate-100 dark:border-slate-800/80 flex items-center justify-between">
                        <span>نشاط المبيعات والطلبات</span>
                        <ShoppingBag className="w-4 h-4 text-blue-500" />
                    </h3>

                    <div className="space-y-4">
                        <div className="flex items-center justify-between text-xs">
                            <span className="font-bold text-slate-400">عدد فواتير المبيعات</span>
                            <span className="font-black text-blue-600 dark:text-blue-400 text-sm">
                                {stats.invoicesCount}
                            </span>
                        </div>

                        <div className="flex items-center justify-between text-xs">
                            <span className="font-bold text-slate-400">عدد الأصناف الفريدة</span>
                            <span className="font-black text-indigo-600 dark:text-indigo-400 text-sm">
                                {stats.uniqueProductsCount}
                            </span>
                        </div>

                        <div className="flex items-center justify-between text-xs">
                            <span className="font-bold text-slate-400">عدد السندات المالية</span>
                            <span className="font-black text-emerald-600 dark:text-emerald-400 text-sm">
                                {stats.vouchersCount}
                            </span>
                        </div>
                    </div>
                </div>
            </div>

            {/* Row 2: الحالة المالية (السلف والمديونية) */}
            <div className="bg-surface rounded-3xl border border-slate-200/80 dark:border-slate-800 p-5 shadow-xs">
                <h3 className="text-sm font-black text-slate-900 dark:text-white pb-3 mb-4 border-b border-slate-100 dark:border-slate-800/80 flex items-center justify-between">
                    <span>الحالة المالية (السلف والمديونية)</span>
                    <Coins className="w-4 h-4 text-amber-500" />
                </h3>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div className="bg-slate-50/70 dark:bg-slate-900/50 rounded-2xl p-4 border border-slate-100 dark:border-slate-800">
                        <span className="text-2xs font-bold text-slate-400 block mb-1">
                            إجمالي المسحوبات (أصناف / فواتير)
                        </span>
                        <div className="text-lg font-black text-blue-600 dark:text-blue-400">
                            {formatNumber(stats.totalInvoicesAmount)} <span className="text-xs font-bold text-slate-400">ج.م</span>
                        </div>
                    </div>

                    <div className="bg-slate-50/70 dark:bg-slate-900/50 rounded-2xl p-4 border border-slate-100 dark:border-slate-800">
                        <span className="text-2xs font-bold text-slate-400 block mb-1">
                            إجمالي السلف (كاش)
                        </span>
                        <div className="text-lg font-black text-rose-600 dark:text-rose-400">
                            {formatNumber(stats.totalAdvances)} <span className="text-xs font-bold text-slate-400">ج.م</span>
                        </div>
                    </div>

                    <div className="bg-slate-50/70 dark:bg-slate-900/50 rounded-2xl p-4 border border-slate-100 dark:border-slate-800">
                        <span className="text-2xs font-bold text-slate-400 block mb-1">
                            إجمالي المدفوعات المستلمة
                        </span>
                        <div className="text-lg font-black text-emerald-600 dark:text-emerald-400">
                            {formatNumber(stats.totalReceivedPayments)} <span className="text-xs font-bold text-slate-400">ج.م</span>
                        </div>
                    </div>
                </div>
            </div>

            {/* Row 3: حالة العميل في النظام */}
            <div className="bg-surface rounded-3xl border border-slate-200/80 dark:border-slate-800 p-5 shadow-xs flex items-center justify-between">
                <div>
                    <h4 className="text-xs font-bold text-slate-400 mb-1">حالة العميل في النظام</h4>
                    <div className="flex items-center gap-2">
                        <span className={cn("w-2.5 h-2.5 rounded-full", customer.is_active ? "bg-emerald-500 animate-pulse" : "bg-rose-500")} />
                        <span className="text-sm font-black text-slate-900 dark:text-white">
                            {customer.is_active ? 'العميل نشط حالياً ويمكنه إجراء عمليات بيع' : 'العميل معطل وموقوف عن البيع الآجل'}
                        </span>
                    </div>
                </div>

                <Button
                    variant="outline"
                    size="sm"
                    onClick={onToggleActive}
                    className="rounded-xl text-xs font-bold"
                >
                    {customer.is_active ? 'تعطيل الحساب' : 'تفعيل الحساب'}
                </Button>
            </div>
        </div>
    );
}