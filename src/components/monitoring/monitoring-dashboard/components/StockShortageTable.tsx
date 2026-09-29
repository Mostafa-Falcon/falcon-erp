import React from'react';
import {
 AlertTriangle,
 Printer,
 Download,
 Search,
 SlidersHorizontal,
 Package,
 CheckCircle2,
 ChevronRight,
 ChevronLeft,
} from'lucide-react';
import type { StockAlertItem } from'../types';
import {
 Select,
 SelectContent,
 SelectItem,
 SelectTrigger,
 SelectValue,
} from'@/components/ui/select';

interface StockShortageTableProps {
 stockShortages: StockAlertItem[];
 filteredShortages: StockAlertItem[];
 shortageSearch: string;
 setShortageSearch: (val: string) => void;
}

export const StockShortageTable: React.FC<StockShortageTableProps> = ({
 stockShortages,
 filteredShortages,
 shortageSearch,
 setShortageSearch,
}) => {
 return (
 <div className="bg-surface rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-xs p-5 flex flex-col gap-4">
 {/* Header & Badges */}
 <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100 dark:border-slate-800/80">
 <div className="flex items-center gap-2.5">
 <AlertTriangle className="w-5 h-5 text-rose-500"/>
 <h2 className="font-black text-sm text-slate-900 dark:text-white">
 تقرير تنبيه نواقص المخزون والأصناف الحرجة
 </h2>
 <span className="px-2 py-0.5 rounded-full bg-rose-50 dark:bg-rose-950/50 text-rose-600 dark:text-rose-400 font-bold text-3xs">
 {stockShortages.length} صنف
 </span>
 </div>

 {/* Export Actions Toolbar */}
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

 {/* Filter Controls Row */}
 <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
 <div className="relative w-full sm:w-72">
 <Search className="w-4 h-4 text-slate-400 absolute right-3 top-1/2 -translate-y-1/2"/>
 <input
 type="text"
 value={shortageSearch}
 onChange={(e) => setShortageSearch(e.target.value)}
 placeholder="بحث سريع في الأصناف..."
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
 <SelectItem value="100"className="text-xs font-bold cursor-pointer py-1 px-2">100</SelectItem>
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

 {/* Shortages Data Table */}
 <div className="overflow-x-auto rounded-xl border border-slate-100 dark:border-slate-800">
 <table className="w-full text-right text-xs">
 <thead className="bg-slate-50 dark:bg-slate-900/60 text-slate-600 dark:text-slate-300 font-bold border-b border-slate-200/80 dark:border-slate-800">
 <tr>
 <th className="py-3 px-4">الصنف / الرمز</th>
 <th className="py-3 px-4">الرصيد المتبقي</th>
 <th className="py-3 px-4">حد الأمان</th>
 <th className="py-3 px-4">سعر الشراء</th>
 <th className="py-3 px-4">سعر البيع</th>
 </tr>
 </thead>
 <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
 {filteredShortages.length === 0 ? (
 <tr>
 <td colSpan={5} className="py-10 text-center text-slate-400">
 <div className="flex flex-col items-center justify-center gap-2">
 <CheckCircle2 className="w-8 h-8 text-emerald-500"/>
 <span className="font-bold text-slate-600 dark:text-slate-300">
 المخزون آمن ومكتمل
 </span>
 <span className="text-2xs text-slate-400">
 لا توجد أصناف تحت حد الأمان في المستودع حالياً
 </span>
 </div>
 </td>
 </tr>
 ) : (
 filteredShortages.map((item) => (
 <tr
 key={item.id}
 className="hover:bg-slate-50/70 dark:hover:bg-slate-800/40 transition-colors font-medium"
 >
 <td className="py-3 px-4 text-slate-900 dark:text-white font-bold flex items-center gap-2">
 <span className="w-6 h-6 rounded-md bg-rose-50 dark:bg-rose-950/40 text-rose-500 flex items-center justify-center text-xs">
 <Package className="w-3.5 h-3.5"/>
 </span>
 <div className="flex flex-col">
 <span>{item.name}</span>
 <span className="text-3xs text-slate-400 font-mono">{item.sku}</span>
 </div>
 </td>
 <td className="py-3 px-4">
 <span className="px-2.5 py-1 rounded-md bg-rose-50 dark:bg-rose-950/50 text-rose-600 dark:text-rose-400 font-bold text-2xs">
 {item.remainingStock} وحدة
 </span>
 </td>
 <td className="py-3 px-4 text-slate-700 dark:text-slate-300 font-bold">
 {item.safetyLimit} وحدة
 </td>
 <td className="py-3 px-4 text-slate-700 dark:text-slate-300 font-bold">
 {item.purchasePrice.toFixed(2)} ج.م
 </td>
 <td className="py-3 px-4 text-blue-600 dark:text-blue-400 font-black">
 {item.salePrice.toFixed(2)} ج.م
 </td>
 </tr>
 ))
 )}
 </tbody>
 </table>
 </div>

 {/* Table Pagination Footer */}
 <div className="flex items-center justify-between pt-2 text-xs font-semibold text-slate-500">
 <span>
 عرض 1 إلى {filteredShortages.length} من إجمالي {stockShortages.length} صنف
 </span>
 <div className="flex items-center gap-1.5">
 <button className="w-7 h-7 rounded-lg border border-slate-200 dark:border-slate-700 flex items-center justify-center text-slate-400 hover:text-slate-800 cursor-pointer">
 <ChevronRight className="w-4 h-4"/>
 </button>
 <span className="px-2.5 py-1 rounded-lg bg-blue-50 dark:bg-blue-950/50 text-blue-600 dark:text-blue-400 font-bold">
 1 / 1
 </span>
 <button className="w-7 h-7 rounded-lg border border-slate-200 dark:border-slate-700 flex items-center justify-center text-slate-400 hover:text-slate-800 cursor-pointer">
 <ChevronLeft className="w-4 h-4"/>
 </button>
 </div>
 </div>
 </div>
 );
};