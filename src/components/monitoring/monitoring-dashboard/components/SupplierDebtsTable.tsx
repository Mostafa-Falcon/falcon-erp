import React from'react';
import { Truck, Inbox } from'lucide-react';
import type { ContactDebtItem } from'../types';

interface SupplierDebtsTableProps {
 supplierDebts: ContactDebtItem[];
 filteredSupplierDebts: ContactDebtItem[];
}

export const SupplierDebtsTable: React.FC<SupplierDebtsTableProps> = ({
 supplierDebts,
 filteredSupplierDebts,
}) => {
 return (
 <div className="bg-surface rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-xs p-5 flex flex-col gap-4">
 <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
 <div className="flex items-center gap-2">
 <Truck className="w-4 h-4 text-rose-600"/>
 <h3 className="font-bold text-sm text-slate-900 dark:text-white">
 مستحقات وديون الموردين
 </h3>
 <span className="px-2 py-0.5 rounded-full bg-rose-50 dark:bg-rose-950/50 text-rose-600 dark:text-rose-400 font-bold text-3xs">
 {supplierDebts.length} مورد
 </span>
 </div>
 <div className="flex items-center gap-1.5">
 <button
 onClick={() => window.print()}
 className="h-7 px-2 rounded-md border border-slate-200 dark:border-slate-700 text-3xs font-bold text-slate-500 hover:bg-slate-50 dark:hover:bg-slate-800 cursor-pointer transition-colors"
 >
 طباعة
 </button>
 </div>
 </div>

 {filteredSupplierDebts.length === 0 ? (
 <div className="py-14 flex flex-col items-center justify-center text-center gap-2 text-slate-400">
 <div className="w-14 h-14 rounded-2xl bg-slate-50 dark:bg-slate-900 border border-slate-200/60 dark:border-slate-800 flex items-center justify-center text-slate-300 mb-1">
 <Inbox className="w-7 h-7"/>
 </div>
 <span className="font-bold text-sm text-slate-700 dark:text-slate-300">
 لا توجد مستحقات للموردين
 </span>
 <span className="text-xs text-slate-400">
 جميع حسابات التوريد والموردين مسواة بالكامل
 </span>
 </div>
 ) : (
 <div className="overflow-x-auto rounded-xl border border-slate-100 dark:border-slate-800">
 <table className="w-full text-right text-xs">
 <thead className="bg-slate-50 dark:bg-slate-900/60 text-slate-600 dark:text-slate-300 font-bold border-b border-slate-200/80 dark:border-slate-800">
 <tr>
 <th className="py-2.5 px-3">المورد</th>
 <th className="py-2.5 px-3">الهاتف</th>
 <th className="py-2.5 px-3">المستحق له</th>
 </tr>
 </thead>
 <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
 {filteredSupplierDebts.map((s) => (
 <tr key={s.id} className="hover:bg-slate-50/70 dark:hover:bg-slate-800/40">
 <td className="py-2.5 px-3 font-bold text-slate-900 dark:text-white">{s.name}</td>
 <td className="py-2.5 px-3 text-slate-500 font-mono"dir="ltr">{s.phone ||'-'}</td>
 <td className="py-2.5 px-3 font-black text-amber-600 dark:text-amber-400">{s.balance.toFixed(2)} ج.م</td>
 </tr>
 ))}
 </tbody>
 </table>
 </div>
 )}
 </div>
 );
};