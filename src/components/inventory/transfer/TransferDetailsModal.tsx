import React from'react';
import { StockTransfer } from'@/types';
import { Icons } from'@/components/ui/Icons';
import { TRANSFER_STATUS_LABELS } from'@/lib/format';

interface TransferDetailsModalProps {
 transfer: StockTransfer | null;
 branchMap: Record<string, string>;
 warehouseMap: Record<string, string>;
 onClose: () => void;
}

export const TransferDetailsModal: React.FC<TransferDetailsModalProps> = ({
 transfer,
 branchMap,
 warehouseMap,
 onClose,
}) => {
 if (!transfer) return null;

 const getBranchName = (type:'from'|'to') => {
 if (type ==='from') {
 if (transfer.from_branch_id && branchMap[transfer.from_branch_id]) return branchMap[transfer.from_branch_id];
 if (transfer.from_warehouse_id && warehouseMap[transfer.from_warehouse_id]) return warehouseMap[transfer.from_warehouse_id];
 return'الفرع الرئيسي';
 } else {
 if (transfer.to_branch_id && branchMap[transfer.to_branch_id]) return branchMap[transfer.to_branch_id];
 if (transfer.to_warehouse_id && warehouseMap[transfer.to_warehouse_id]) return warehouseMap[transfer.to_warehouse_id];
 return'فرع غير محدد';
 }
 };

 return (
 <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200">
 <div className="bg-surface w-full max-w-2xl rounded-2xl border border-slate-200 dark:border-slate-800 shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
 {/* Modal Header */}
 <div className="p-4 sm:p-5 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
 <div className="flex items-center gap-2.5">
 <div className="w-9 h-9 rounded-xl bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400 flex items-center justify-center">
 <Icons.SwapHorizontal />
 </div>
 <div>
 <h3 className="text-sm font-bold text-slate-800 dark:text-white">
 تفاصيل التحويل المخزني
 </h3>
 <p className="text-2xs font-mono text-slate-400">
 {transfer.transfer_no}
 </p>
 </div>
 </div>
 <button
 type="button"
 onClick={onClose}
 className="w-8 h-8 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-500 hover:text-slate-800 dark:hover:text-white flex items-center justify-center cursor-pointer"
 >
 <Icons.X />
 </button>
 </div>

 {/* Modal Body */}
 <div className="p-5 overflow-y-auto flex flex-col gap-4">
 <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-slate-50 dark:bg-slate-900/60 p-3.5 rounded-xl border border-slate-100 dark:border-slate-800 text-xs">
 <div>
 <span className="text-slate-400 block text-2xs">من الفرع</span>
 <span className="font-bold text-slate-700 dark:text-slate-300">
 {getBranchName('from')}
 </span>
 </div>
 <div>
 <span className="text-slate-400 block text-2xs">إلى الفرع</span>
 <span className="font-bold text-slate-700 dark:text-slate-300">
 {getBranchName('to')}
 </span>
 </div>
 <div>
 <span className="text-slate-400 block text-2xs">الحالة</span>
 <span className="font-bold text-blue-600 dark:text-blue-400">
 {TRANSFER_STATUS_LABELS[transfer.status] || transfer.status}
 </span>
 </div>
 <div>
 <span className="text-slate-400 block text-2xs">التاريخ</span>
 <span className="font-bold text-slate-700 dark:text-slate-300">
 {new Date(transfer.created_at).toLocaleDateString('ar-EG')}
 </span>
 </div>
 </div>

 {transfer.notes && (
 <div className="bg-amber-50/50 dark:bg-amber-950/20 border border-amber-200/40 dark:border-amber-800/30 p-3 rounded-xl text-xs text-amber-800 dark:text-amber-300">
 <span className="font-bold block mb-0.5">ملاحظات / سبب التحويل:</span>
 {transfer.notes}
 </div>
 )}

 <div>
 <h4 className="text-xs font-bold text-slate-700 dark:text-slate-300 mb-2">
 الأصناف المحولة ({transfer.items?.length || 0})
 </h4>
 <div className="border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden">
 <table className="w-full text-right text-xs">
 <thead className="bg-slate-50 dark:bg-slate-900/50 text-slate-500 font-bold border-b border-slate-200 dark:border-slate-800">
 <tr>
 <th className="py-2.5 px-3">#</th>
 <th className="py-2.5 px-3">الصنف</th>
 <th className="py-2.5 px-3">الوحدة</th>
 <th className="py-2.5 px-3">الكمية</th>
 <th className="py-2.5 px-3">التشغيلة</th>
 </tr>
 </thead>
 <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60 font-bold text-slate-700 dark:text-slate-200">
 {transfer.items?.map((it, idx) => (
 <tr key={it.id || idx}>
 <td className="py-2 px-3 text-slate-400">{idx + 1}</td>
 <td className="py-2 px-3">{it.product_name || it.product_id}</td>
 <td className="py-2 px-3 text-slate-500">{it.unit_name ||'قطعة'}</td>
 <td className="py-2 px-3 text-blue-600 dark:text-blue-400">
 {it.quantity}
 </td>
 <td className="py-2 px-3 font-mono text-2xs text-slate-400">
 {it.batch_number ||'—'}
 </td>
 </tr>
 ))}
 </tbody>
 </table>
 </div>
 </div>
 </div>

 {/* Modal Footer */}
 <div className="p-3.5 border-t border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/40 flex justify-end">
 <button
 type="button"
 onClick={onClose}
 className="px-4 py-1.5 bg-slate-200 dark:bg-slate-800 hover:bg-slate-300 text-xs font-bold rounded-xl cursor-pointer"
 >
 إغلاق
 </button>
 </div>
 </div>
 </div>
 );
};