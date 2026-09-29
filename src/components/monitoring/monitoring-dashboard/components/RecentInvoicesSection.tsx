import React from'react';
import {
 Layers,
 Search,
 SlidersHorizontal,
 Inbox,
 ChevronRight,
 ChevronLeft,
} from'lucide-react';
import type { RecentInvoiceItem } from'../types';
import {
 Select,
 SelectContent,
 SelectItem,
 SelectTrigger,
 SelectValue,
} from'@/components/ui/select';

interface RecentInvoicesSectionProps {
 recentTab:'sales'|'purchases';
 setRecentTab: (tab:'sales'|'purchases') => void;
 recentSales: RecentInvoiceItem[];
 recentPurchases: RecentInvoiceItem[];
 displayedRecent: RecentInvoiceItem[];
 filteredRecent: RecentInvoiceItem[];
 recentSearch: string;
 setRecentSearch: (val: string) => void;
}

export const RecentInvoicesSection: React.FC<RecentInvoicesSectionProps> = ({
 recentTab,
 setRecentTab,
 recentSales,
 recentPurchases,
 displayedRecent,
 filteredRecent,
 recentSearch,
 setRecentSearch,
}) => {
 return (
 <div className="bg-surface rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-xs p-5 flex flex-col gap-4">
 {/* Header & Tabs */}
 <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100 dark:border-slate-800">
 <div className="flex items-center gap-2.5">
 <Layers className="w-5 h-5 text-blue-600"/>
 <h2 className="font-black text-sm text-slate-900 dark:text-white">
 العمليات والطلبات الأخيرة
 </h2>
 <span className="px-2 py-0.5 rounded-full bg-blue-50 dark:bg-blue-950/50 text-blue-600 dark:text-blue-400 font-bold text-3xs">
 {displayedRecent.length} فاتورة
 </span>
 </div>

 {/* Tab Switcher */}
 <div className="flex items-center gap-2 p-1 bg-slate-100 dark:bg-slate-900 rounded-xl">
 <button
 onClick={() => setRecentTab('sales')}
 className={`h-8 px-3.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
 recentTab ==='sales'
 ?'bg-blue-600 text-white shadow-xs'
 :'text-slate-600 dark:text-slate-400 hover:text-slate-900'
 }`}
 >
 فواتير المبيعات الأخيرة ({recentSales.length})
 </button>
 <button
 onClick={() => setRecentTab('purchases')}
 className={`h-8 px-3.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
 recentTab ==='purchases'
 ?'bg-blue-600 text-white shadow-xs'
 :'text-slate-600 dark:text-slate-400 hover:text-slate-900'
 }`}
 >
 فواتير المشتريات الأخيرة ({recentPurchases.length})
 </button>
 </div>
 </div>

 {/* Toolbar */}
 <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
 <div className="relative w-full sm:w-72">
 <Search className="w-4 h-4 text-slate-400 absolute right-3 top-1/2 -translate-y-1/2"/>
 <input
 type="text"
 value={recentSearch}
 onChange={(e) => setRecentSearch(e.target.value)}
 placeholder="بحث في أرقام الفواتير والأطراف..."
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

 {/* Invoices Table */}
 <div className="overflow-x-auto rounded-xl border border-slate-100 dark:border-slate-800">
 <table className="w-full text-right text-xs">
 <thead className="bg-slate-50 dark:bg-slate-900/60 text-slate-600 dark:text-slate-300 font-bold border-b border-slate-200/80 dark:border-slate-800">
 <tr>
 <th className="py-3 px-4">رقم الفاتورة</th>
 <th className="py-3 px-4">الوقت / التاريخ</th>
 <th className="py-3 px-4">الطرف</th>
 <th className="py-3 px-4">طريقة الدفع</th>
 <th className="py-3 px-4">الإجمالي</th>
 <th className="py-3 px-4">المدفوع / المتبقي</th>
 </tr>
 </thead>
 <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
 {filteredRecent.length === 0 ? (
 <tr>
 <td colSpan={6} className="py-12 text-center text-slate-400">
 <div className="flex flex-col items-center justify-center gap-2">
 <Inbox className="w-7 h-7 text-slate-300"/>
 <span className="font-bold text-slate-600 dark:text-slate-300">
 لا توجد فواتير مسجلة بعد
 </span>
 <span className="text-2xs text-slate-400">
 ستظهر الفواتير فور إتمام أي عملية بيع أو شراء
 </span>
 </div>
 </td>
 </tr>
 ) : (
 filteredRecent.map((inv) => (
 <tr
 key={inv.id}
 className="hover:bg-slate-50/70 dark:hover:bg-slate-800/40 transition-colors font-medium"
 >
 <td className="py-3 px-4 text-slate-900 dark:text-white font-black font-mono">
 {inv.invoiceNumber}
 </td>
 <td className="py-3 px-4 text-slate-500 font-medium">
 {inv.formattedDateTime}
 </td>
 <td className="py-3 px-4 text-slate-800 dark:text-slate-200 font-bold">
 {inv.partyName}
 </td>
 <td className="py-3 px-4">
 <span className="px-2.5 py-0.5 rounded-md bg-emerald-50 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-400 text-2xs font-bold">
 {inv.paymentMethod}
 </span>
 </td>
 <td className="py-3 px-4 text-blue-600 dark:text-blue-400 font-black">
 {inv.total.toFixed(2)} ج.م
 </td>
 <td className="py-3 px-4 text-emerald-600 dark:text-emerald-400 font-bold">
 {inv.remainingAmount.toFixed(2)} ج.م
 </td>
 </tr>
 ))
 )}
 </tbody>
 </table>
 </div>

 {/* Footer */}
 <div className="flex items-center justify-between pt-2 text-xs font-semibold text-slate-500">
 <span>
 عرض 1 إلى {filteredRecent.length} من إجمالي {displayedRecent.length} فواتير
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