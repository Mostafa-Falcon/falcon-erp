import React from'react';
import { Icons } from'@/components/ui/Icons';
import { TransferDraftItem } from'./types';

interface TransferSelectedItemsTableProps {
 items: TransferDraftItem[];
 onUpdateQuantity: (index: number, newQty: number) => void;
 onRemoveItem: (index: number) => void;
}

export const TransferSelectedItemsTable: React.FC<TransferSelectedItemsTableProps> = ({
 items,
 onUpdateQuantity,
 onRemoveItem,
}) => {
 return (
 <div className="bg-surface rounded-2xl border border-slate-200/80 dark:border-slate-800 p-5 sm:p-6 shadow-xs">
 <div className="flex items-center justify-between mb-4 pb-3 border-b border-slate-100 dark:border-slate-800">
 <div className="flex items-center gap-2">
 <div className="w-8 h-8 rounded-lg bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400 flex items-center justify-center">
 <Icons.Layers />
 </div>
 <h2 className="text-sm font-bold text-slate-800 dark:text-slate-100">
 الأصناف المحددة للتحويل ({items.length} صنف)
 </h2>
 </div>
 </div>

 {items.length === 0 ? (
 <div className="py-14 text-center flex flex-col items-center justify-center gap-3 text-slate-400">
 <div className="w-16 h-16 rounded-2xl bg-slate-50 dark:bg-slate-900 flex items-center justify-center text-slate-300 dark:text-slate-600">
 <Icons.Trash />
 </div>
 <span className="text-xs font-bold text-slate-500 dark:text-slate-400">
 لم يتم إضافة أي أصناف حتى الآن
 </span>
 <span className="text-2xs text-slate-400 max-w-sm">
 ابحث عن الأصناف أو المستلزمات أعلاه وحدد الكمية ثم اضغط زر &quot;إضافة&quot; لإدراجها في أمر التحويل.
 </span>
 </div>
 ) : (
 <div className="border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden">
 <div className="overflow-x-auto">
 <table className="w-full text-right border-collapse">
 <thead>
 <tr className="border-b border-slate-100 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-900/40 text-slate-500 dark:text-slate-400 text-xs font-bold">
 <th className="py-3 px-4">#</th>
 <th className="py-3 px-4">اسم الصنف</th>
 <th className="py-3 px-4">الباركود</th>
 <th className="py-3 px-4">الوحدة</th>
 <th className="py-3 px-4 text-center">الكمية المحولة</th>
 <th className="py-3 px-4">الرصيد المتاح</th>
 <th className="py-3 px-4 text-center">إجراء</th>
 </tr>
 </thead>
 <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60 text-xs font-bold text-slate-700 dark:text-slate-200">
 {items.map((item, idx) => (
 <tr
 key={`${item.productId}-${item.unit}-${idx}`}
 className="hover:bg-slate-50/50 dark:hover:bg-slate-900/20"
 >
 <td className="py-3 px-4 text-slate-400 font-mono text-2xs">
 {idx + 1}
 </td>
 <td className="py-3 px-4">
 <span className="text-slate-900 dark:text-white block">
 {item.productName}
 </span>
 </td>
 <td className="py-3 px-4 font-mono text-2xs text-slate-500">
 {item.barcode ||'—'}
 </td>
 <td className="py-3 px-4">
 <span className="px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 text-2xs">
 {item.unit}
 </span>
 </td>
 <td className="py-3 px-4 text-center">
 <div className="inline-flex items-center gap-1">
 <input
 type="number"
 min="1"
 value={item.quantity}
 onChange={(e) =>
 onUpdateQuantity(idx, parseInt(e.target.value) || 1)
 }
 className="w-16 h-8 text-center rounded-lg border border-slate-200 dark:border-slate-800 bg-surface text-xs font-black text-blue-600 dark:text-blue-400 focus:outline-none focus:ring-1 focus:ring-blue-500"
 />
 </div>
 </td>
 <td className="py-3 px-4 text-slate-500">
 {item.availableStock} قطعة
 </td>
 <td className="py-3 px-4 text-center">
 <button
 type="button"
 onClick={() => onRemoveItem(idx)}
 title="حذف من التحويل"
 className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded-lg transition-colors cursor-pointer"
 >
 <Icons.Trash />
 </button>
 </td>
 </tr>
 ))}
 </tbody>
 </table>
 </div>
 </div>
 )}
 </div>
 );
};