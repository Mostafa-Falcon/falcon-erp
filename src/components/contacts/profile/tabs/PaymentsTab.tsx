'use client';

import React from'react';
import { Receipt, Banknote } from'lucide-react';
import { Button } from'@/components/ui/button';
import { formatNumber } from'@/lib/format';
import { cn } from'@/lib/utils';
import type { FinancialVoucher } from'@/types';

interface PaymentsTabProps {
 vouchers: FinancialVoucher[];
 onOpenReceiptModal: () => void;
 onOpenPaymentModal: () => void;
}

export function PaymentsTab({
 vouchers,
 onOpenReceiptModal,
 onOpenPaymentModal,
}: PaymentsTabProps) {
 return (
 <div className="bg-surface rounded-3xl border border-slate-200/80 dark:border-slate-800 p-5 shadow-xs space-y-4">
 <div className="flex flex-wrap items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800 gap-3">
 <div>
 <h3 className="text-sm font-black text-slate-900 dark:text-white">سندات القبض والصرف المسجلة</h3>
 <p className="text-xs text-slate-400 mt-0.5">سجل الدفعات النقدية والتحصيلات والسلف المالية</p>
 </div>

 <div className="flex items-center gap-2">
 <Button
 size="sm"
 onClick={onOpenReceiptModal}
 className="h-9 px-3.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold gap-1.5 shadow-sm shadow-emerald-500/20 cursor-pointer"
 >
 <Receipt className="w-3.5 h-3.5"/>
 <span>سند قبض جديد</span>
 </Button>

 <Button
 size="sm"
 onClick={onOpenPaymentModal}
 className="h-9 px-3.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold gap-1.5 shadow-sm shadow-indigo-500/20 cursor-pointer"
 >
 <Banknote className="w-3.5 h-3.5"/>
 <span>سند صرف سلفة</span>
 </Button>
 </div>
 </div>

 <div className="overflow-x-auto">
 <table className="w-full text-right text-xs">
 <thead>
 <tr className="bg-slate-50 dark:bg-slate-900/60 text-2xs font-black text-slate-400 border-b border-slate-100 dark:border-slate-800">
 <th className="py-3 px-4">رقم السند</th>
 <th className="py-3 px-4">النوع</th>
 <th className="py-3 px-4">البيان</th>
 <th className="py-3 px-4 text-left">المبلغ</th>
 <th className="py-3 px-4">التاريخ</th>
 </tr>
 </thead>
 <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60 font-bold">
 {vouchers.length === 0 ? (
 <tr>
 <td colSpan={5} className="py-12 text-center text-slate-400 font-bold">
 لا توجد سندات مالية مسجلة للعميل حتى الآن.
 </td>
 </tr>
 ) : (
 vouchers.map((v) => (
 <tr key={v.id} className="hover:bg-slate-50/50 transition-colors">
 <td className="py-3 px-4 font-mono font-black text-blue-600">{v.voucher_no}</td>
 <td className="py-3 px-4">
 <span
 className={cn(
"inline-block px-2 py-0.5 rounded-full text-3xs font-black",
 v.type ==='receipt'
 ?"bg-emerald-50 text-emerald-600 dark:bg-emerald-950/40"
 :"bg-rose-50 text-rose-600 dark:bg-rose-950/40"
 )}
 >
 {v.type ==='receipt'?'قبض نقدي':'صرف نقدي'}
 </span>
 </td>
 <td className="py-3 px-4 text-slate-700 dark:text-slate-300">{v.description ||'—'}</td>
 <td className="py-3 px-4 text-left font-mono font-black">{formatNumber(v.amount)} ج.م</td>
 <td className="py-3 px-4 text-slate-500 font-mono">
 {new Date(v.created_at).toLocaleDateString('ar-EG')}
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