import React from'react';
import {
 Calendar,
 Printer,
 Download,
 Search,
 SlidersHorizontal,
 CheckCircle2,
} from'lucide-react';
import type { ExpiryAlertItem } from'../types';
import {
 Select,
 SelectContent,
 SelectItem,
 SelectTrigger,
 SelectValue,
} from'@/components/ui/select';

interface ExpiryAlertsTableProps {
 expiryItems: ExpiryAlertItem[];
 filteredExpiry: ExpiryAlertItem[];
 expirySearch: string;
 setExpirySearch: (val: string) => void;
}

export const ExpiryAlertsTable: React.FC<ExpiryAlertsTableProps> = ({
 expiryItems,
 filteredExpiry,
 expirySearch,
 setExpirySearch,
}) => {
 return (
 <div className="bg-surface rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-xs p-5 flex flex-col gap-4">
 {/* Header */}
 <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100 dark:border-slate-800/80">
 <div className="flex items-center gap-2.5">
 <Calendar className="w-5 h-5 text-amber-500"/>
 <h2 className="font-black text-sm text-slate-900 dark:text-white">
 أصناف قاربت على انتهاء الصلاحية (خلال 90 يوم)
 </h2>
 <span className="px-2 py-0.5 rounded-full bg-amber-50 dark:bg-amber-950/50 text-amber-600 dark:text-amber-400 font-bold text-3xs">
 {expiryItems.length} صنف
 </span>
 </div>

 {/* Export Actions */}
 <div className="flex items-center gap-2">
 <button
 onClick={() => window.print()}
 className="h-8 px-2.5 rounded-lg border border-slate-200 dark:border-slate-700 text-2xs font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 flex items-center gap-1.5 transition-colors cursor-pointer"
 >
 <Printer className="w-3.5 h-3.5"/>
 <span>طباعة</span>
 </button>
 <button className="h-8 px-2.5 rounded-lg border border-slate-200 dark:border-slate-700 text-2xs font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 flex items-center gap-1.5 transition-colors cursor-pointer">
 <Download className="w-3.5 h-3.5"/>
 <span>Excel</span>
 </button>
 <button className="h-8 px-2.5 rounded-lg border border-slate-200 dark:border-slate-700 text-2xs font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 flex items-center gap-1.5 transition-colors cursor-pointer">
 <Download className="w-3.5 h-3.5"/>
 <span>CSV</span>
 </button>
 </div>
 </div>

 {/* Filter Toolbar */}
 <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
 <div className="relative w-full sm:w-72">
 <Search className="w-4 h-4 text-slate-400 absolute right-3 top-1/2 -translate-y-1/2"/>
 <input
 type="text"
 value={expirySearch}
 onChange={(e) => setExpirySearch(e.target.value)}
 placeholder="بحث في تواريخ الانتهاء..."
 className="w-full h-8.5 pr-9 pl-3 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-900 text-xs font-semibold text-slate-800 dark:text-slate-200 placeholder:text-slate-400 focus:outline-none focus:ring-1 focus:ring-blue-500"
 />
 </div>

 <div className="flex items-center gap-3">
 <div className="flex items-center gap-2 text-xs text-slate-500 font-semibold">
 <span>عرض</span>
 <div className="w-18">
 <Select defaultValue="25">
 <SelectTrigger className="h-8 rounded-xl border-slate-200 dark:border-slate-700 bg-surface text-xs font-bold">
 <SelectValue placeholder="25"/>
 </SelectTrigger>
 <SelectContent className="z-50 bg-surface border border-slate-200 dark:border-slate-800 rounded-xl shadow-xl min-w-[70px]">
 <SelectItem value="25"className="text-xs font-bold cursor-pointer py-1 px-2">25</SelectItem>
 <SelectItem value="50"className="text-xs font-bold cursor-pointer py-1 px-2">50</SelectItem>
 </SelectContent>
 </Select>
 </div>
 <span>إدخالات</span>
 </div>

 <button className="h-8 px-2.5 rounded-lg border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 text-xs font-bold flex items-center gap-1.5 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors">
 <SlidersHorizontal className="w-3.5 h-3.5"/>
 <span>تخصيص الأعمدة</span>
 </button>
 </div>
 </div>

 {/* Expiry Data Table */}
 <div className="overflow-x-auto rounded-xl border border-slate-100 dark:border-slate-800">
 <table className="w-full text-right text-xs">
 <thead className="bg-slate-50 dark:bg-slate-900/60 text-slate-600 dark:text-slate-300 font-bold border-b border-slate-200/80 dark:border-slate-800">
 <tr>
 <th className="py-3 px-4">الصنف / رقم التشغيلة</th>
 <th className="py-3 px-4">الكمية الحالية</th>
 <th className="py-3 px-4">تاريخ الانتهاء</th>
 <th className="py-3 px-4">المهلة المتبقية</th>
 </tr>
 </thead>
 <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
 {filteredExpiry.length === 0 ? (
 <tr>
 <td colSpan={4} className="py-10 text-center text-slate-400">
 <div className="flex flex-col items-center justify-center gap-2">
 <CheckCircle2 className="w-8 h-8 text-emerald-500"/>
 <span className="font-bold text-slate-600 dark:text-slate-300">
 جميع تواريخ الصلاحية سليمة
 </span>
 <span className="text-2xs text-slate-400">
 لا توجد تشغيلات أو دفعات شارفت على الانتهاء خلال 90 يوم
 </span>
 </div>
 </td>
 </tr>
 ) : (
 filteredExpiry.map((item) => (
 <tr
 key={item.id}
 className="hover:bg-slate-50/70 dark:hover:bg-slate-800/40 transition-colors font-medium"
 >
 <td className="py-3 px-4 text-slate-900 dark:text-white font-extrabold text-sm">
 <div className="flex flex-col">
 <span>{item.name}</span>
 <span className="text-3xs text-slate-400 font-mono">
 Lot: {item.batchNumber}
 </span>
 </div>
 </td>
 <td className="py-3 px-4 text-slate-800 dark:text-slate-200 font-bold">
 {item.currentQuantity} وحدة
 </td>
 <td className="py-3 px-4 text-slate-700 dark:text-slate-300 font-bold"dir="ltr">
 {item.expiryDate}
 </td>
 <td className="py-3 px-4">
 {item.isExpired ? (
 <span className="px-2.5 py-1 rounded-md bg-rose-50 dark:bg-rose-950/50 text-rose-600 dark:text-rose-400 font-bold text-2xs">
 منتهي الصلاحية
 </span>
 ) : (
 <span className="px-2.5 py-1 rounded-md bg-amber-50 dark:bg-amber-950/50 text-amber-600 dark:text-amber-400 font-bold text-2xs">
 {item.daysRemaining} يوم (قريب)
 </span>
 )}
 </td>
 </tr>
 ))
 )}
 </tbody>
 </table>
 </div>
 </div>
 );
};