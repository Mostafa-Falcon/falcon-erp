'use client';

import React from 'react';
import { formatNumber } from '@/lib/format';
import { cn } from '@/lib/utils';
import type { SalesInvoice } from '@/types';

interface SalesInvoicesTabProps {
    salesInvoices: SalesInvoice[];
}

export function SalesInvoicesTab({ salesInvoices }: SalesInvoicesTabProps) {
    return (
        <div className="bg-surface rounded-3xl border border-slate-200/80 dark:border-slate-800 p-5 shadow-xs space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
                <div>
                    <h3 className="text-sm font-black text-slate-900 dark:text-white">سجل فواتير مبيعات العميل</h3>
                    <p className="text-xs text-slate-400 mt-0.5">سجل كافة عمليات البيع الصادرة باسم العميل وحالات السداد</p>
                </div>
                <span className="text-xs font-bold text-slate-400 bg-slate-100 dark:bg-slate-800 px-2.5 py-1 rounded-lg">
                    إجمالي {salesInvoices.length} فاتورة
                </span>
            </div>

            <div className="overflow-x-auto">
                <table className="w-full text-right text-xs">
                    <thead>
                        <tr className="bg-slate-50 dark:bg-slate-900/60 text-2xs font-black text-slate-400 border-b border-slate-100 dark:border-slate-800">
                            <th className="py-3 px-4">رقم الفاتورة</th>
                            <th className="py-3 px-4">التاريخ</th>
                            <th className="py-3 px-4 text-left">الإجمالي</th>
                            <th className="py-3 px-4 text-left">المدفوع</th>
                            <th className="py-3 px-4 text-left">المتبقي</th>
                            <th className="py-3 px-4 text-center">حالة السداد</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60 font-bold">
                        {salesInvoices.length === 0 ? (
                            <tr>
                                <td colSpan={6} className="py-12 text-center text-slate-400 font-bold">
                                    لا توجد فواتير مبيعات لهذا العميل حتى الآن.
                                </td>
                            </tr>
                        ) : (
                            salesInvoices.map((inv) => (
                                <tr key={inv.id} className="hover:bg-slate-50/50 transition-colors">
                                    <td className="py-3 px-4 font-mono font-black text-blue-600">{inv.invoice_number}</td>
                                    <td className="py-3 px-4 text-slate-500 font-mono">
                                        {new Date(inv.invoice_date).toLocaleDateString('ar-EG')}
                                    </td>
                                    <td className="py-3 px-4 text-left font-black">{formatNumber(inv.total)} ج.م</td>
                                    <td className="py-3 px-4 text-left text-emerald-600 font-black">
                                        {formatNumber(inv.paid_amount)} ج.م
                                    </td>
                                    <td className="py-3 px-4 text-left text-rose-600 font-black">
                                        {formatNumber(inv.remaining_amount)} ج.م
                                    </td>
                                    <td className="py-3 px-4 text-center">
                                        {(() => {
                                            const isPaid = inv.remaining_amount <= 0;
                                            const isPartial = inv.paid_amount > 0 && inv.remaining_amount > 0;
                                            return (
                                                <span
                                                    className={cn(
                                                        "inline-block px-2 py-0.5 rounded-full text-3xs font-black",
                                                        isPaid
                                                            ? "bg-emerald-50 text-emerald-600 dark:bg-emerald-950/40"
                                                            : isPartial
                                                                ? "bg-amber-50 text-amber-600 dark:bg-amber-950/40"
                                                                : "bg-rose-50 text-rose-600 dark:bg-rose-950/40"
                                                    )}
                                                >
                                                    {isPaid ? 'مدفوعة بالكامل' : isPartial ? 'سداد جزئي' : 'آجل بالكامل'}
                                                </span>
                                            );
                                        })()}
                                    </td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    );
}