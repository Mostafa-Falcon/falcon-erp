'use client';

import React from'react';
import { formatNumber } from'@/lib/format';

interface PurchasedItemRow {
 id: string;
 name: string;
 quantity: number;
 total: number;
 date: string;
}

interface PurchasedItemsTabProps {
 purchasedItems: PurchasedItemRow[];
}

export function PurchasedItemsTab({ purchasedItems }: PurchasedItemsTabProps) {
 return (
 <div className="bg-surface rounded-3xl border border-slate-200/80 dark:border-slate-800 p-5 shadow-xs space-y-4">
 <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
 <div>
 <h3 className="text-sm font-black text-slate-900 dark:text-white">الأصناف المشتراة والمسحوبات</h3>
 <p className="text-xs text-slate-400 mt-0.5">تفاصيل الأصناف والمنتجات التي سحبها العميل وكمياتها</p>
 </div>
 <span className="text-xs font-bold text-slate-400 bg-slate-100 dark:bg-slate-800 px-2.5 py-1 rounded-lg">
 إجمالي {purchasedItems.length} عملية سحب
 </span>
 </div>

 <div className="overflow-x-auto">
 <table className="w-full text-right text-xs">
 <thead>
 <tr className="bg-slate-50 dark:bg-slate-900/60 text-2xs font-black text-slate-400 border-b border-slate-100 dark:border-slate-800">
 <th className="py-3 px-4">اسم الصنف</th>
 <th className="py-3 px-4 text-center">الكمية</th>
 <th className="py-3 px-4 text-left">إجمالي القيمة</th>
 <th className="py-3 px-4">تاريخ الشراء</th>
 </tr>
 </thead>
 <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60 font-bold">
 {purchasedItems.length === 0 ? (
 <tr>
 <td colSpan={4} className="py-12 text-center text-slate-400 font-bold">
 لم يسحب العميل أي أصناف بعد.
 </td>
 </tr>
 ) : (
 purchasedItems.map((item) => (
 <tr key={item.id} className="hover:bg-slate-50/50 transition-colors">
 <td className="py-3 px-4 text-slate-900 dark:text-white font-black">{item.name}</td>
 <td className="py-3 px-4 text-center font-mono font-bold">{item.quantity}</td>
 <td className="py-3 px-4 text-left font-black">{formatNumber(item.total)} ج.م</td>
 <td className="py-3 px-4 text-slate-500 font-mono">
 {item.date ? new Date(item.date).toLocaleDateString('ar-EG') :'—'}
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