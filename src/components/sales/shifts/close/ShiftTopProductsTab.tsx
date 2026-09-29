import React, { useState } from'react';
import { ShoppingBag, Layers, Receipt, Search, Award } from'lucide-react';
import { Input } from'@/components/ui/input';
import { formatNumber } from'@/lib/format';
import type { TopProductItem } from'./types';

interface ShiftTopProductsTabProps {
 topProducts: TopProductItem[];
 totalSoldQty: number;
 totalSoldRevenue: number;
}

export function ShiftTopProductsTab({
 topProducts,
 totalSoldQty,
 totalSoldRevenue,
}: ShiftTopProductsTabProps) {
 const [searchTerm, setSearchTerm] = useState('');

 const filteredProducts = topProducts.filter(
 (item) =>
 item.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
 item.barcode.toLowerCase().includes(searchTerm.toLowerCase())
 );

 return (
 <div className="space-y-6 animate-in fade-in duration-200">
 {/* Top summary KPIs */}
 <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
 <div className="p-5 rounded-2xl bg-surface border border-slate-200/90 dark:border-slate-800 shadow-2xs flex items-center justify-between">
 <div className="space-y-1">
 <span className="text-xs font-bold text-slate-400 block">إجمالي عدد القطع المباعة</span>
 <div className="text-xl sm:text-2xl font-black font-mono text-slate-900 dark:text-white">
 {formatNumber(totalSoldQty)}{''}
 <span className="text-xs font-sans font-bold text-slate-400">قطعة</span>
 </div>
 </div>
 <div className="w-12 h-12 rounded-2xl bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 flex items-center justify-center border border-blue-200/50 dark:border-blue-900/50 shrink-0">
 <ShoppingBag className="w-6 h-6"/>
 </div>
 </div>

 <div className="p-5 rounded-2xl bg-surface border border-slate-200/90 dark:border-slate-800 shadow-2xs flex items-center justify-between">
 <div className="space-y-1">
 <span className="text-xs font-bold text-slate-400 block">تنوع الأصناف المباعة</span>
 <div className="text-xl sm:text-2xl font-black font-mono text-purple-600 dark:text-purple-400">
 {topProducts.length}{''}
 <span className="text-xs font-sans font-bold text-purple-400">صنف مختلف</span>
 </div>
 </div>
 <div className="w-12 h-12 rounded-2xl bg-purple-50 dark:bg-purple-950/60 text-purple-600 dark:text-purple-400 flex items-center justify-center border border-purple-200/50 dark:border-purple-900/50 shrink-0">
 <Layers className="w-6 h-6"/>
 </div>
 </div>

 <div className="p-5 rounded-2xl bg-surface border border-slate-200/90 dark:border-slate-800 shadow-2xs flex items-center justify-between">
 <div className="space-y-1">
 <span className="text-xs font-bold text-slate-400 block">إيراد بنود الأصناف الإجمالي</span>
 <div className="text-xl sm:text-2xl font-black font-mono text-emerald-600 dark:text-emerald-400">
 {formatNumber(totalSoldRevenue)}{''}
 <span className="text-xs font-sans font-bold text-emerald-500">ج.م</span>
 </div>
 </div>
 <div className="w-12 h-12 rounded-2xl bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 flex items-center justify-center border border-emerald-200/50 dark:border-emerald-900/50 shrink-0">
 <Receipt className="w-6 h-6"/>
 </div>
 </div>
 </div>

 {/* Top Products Table Container */}
 <div className="bg-surface rounded-2xl border border-slate-200/90 dark:border-slate-800 shadow-2xs overflow-hidden">
 <div className="p-4 sm:p-5 border-b border-slate-100 dark:border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
 <div className="flex items-center gap-2.5">
 <div className="w-8 h-8 rounded-xl bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 flex items-center justify-center">
 <Award className="w-4 h-4"/>
 </div>
 <div>
 <h3 className="font-black text-sm sm:text-base text-slate-900 dark:text-white">
 ترتيب الأصناف الأكثر طلباً وحركة أثناء الوردية
 </h3>
 <span className="text-2xs text-slate-400 font-semibold">
 بيان تفصيلي بالكميات المباعة والرصيد المتبقي
 </span>
 </div>
 </div>

 {/* Quick Search */}
 <div className="relative w-full sm:w-64">
 <Search className="w-4 h-4 text-slate-400 absolute right-3 top-1/2 -translate-y-1/2"/>
 <Input
 value={searchTerm}
 onChange={(e) => setSearchTerm(e.target.value)}
 placeholder="بحث باسم الصنف أو الباركود..."
 className="h-10 pr-9 pl-3 text-xs rounded-xl bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-slate-800 focus-visible:ring-blue-500"
 />
 </div>
 </div>

 <div className="overflow-x-auto">
 <table className="w-full text-right text-xs sm:text-sm">
 <thead>
 <tr className="bg-slate-50/70 dark:bg-slate-900/60 border-b border-slate-200/80 dark:border-slate-800 text-slate-400 font-bold">
 <th className="py-3.5 px-4 text-center w-12">#</th>
 <th className="py-3.5 px-4">الصنف</th>
 <th className="py-3.5 px-4 text-center">الباركود</th>
 <th className="py-3.5 px-4 text-center">الوحدة</th>
 <th className="py-3.5 px-4 text-center">السعر</th>
 <th className="py-3.5 px-4 text-center">الرصيد السابق</th>
 <th className="py-3.5 px-4 text-center">الكمية المباعة</th>
 <th className="py-3.5 px-4 text-center">المتبقي بالمخزن</th>
 <th className="py-3.5 px-4 text-left">إجمالي الإيراد</th>
 </tr>
 </thead>
 <tbody className="divide-y divide-slate-100 dark:divide-slate-800/80 font-semibold">
 {filteredProducts.length === 0 ? (
 <tr>
 <td colSpan={9} className="py-16 text-center text-slate-400">
 لا توجد أصناف تطابق البحث أو لم يتم تسجيل مبيعات في هذه الوردية
 </td>
 </tr>
 ) : (
 filteredProducts.map((item, idx) => {
 const isTop1 = idx === 0 && !searchTerm;
 const isTop2 = idx === 1 && !searchTerm;
 const isTop3 = idx === 2 && !searchTerm;

 return (
 <tr
 key={item.id}
 className="hover:bg-slate-50/70 dark:hover:bg-slate-800/40 transition-colors"
 >
 <td className="py-3.5 px-4 text-center font-bold text-slate-400 font-mono">
 {isTop1 ? (
 <span className="text-base"title="المركز الأول">🥇</span>
 ) : isTop2 ? (
 <span className="text-base"title="المركز الثاني">🥈</span>
 ) : isTop3 ? (
 <span className="text-base"title="المركز الثالث">🥉</span>
 ) : (
 idx + 1
 )}
 </td>
 <td className="py-3.5 px-4 font-black text-slate-900 dark:text-white">
 {item.name}
 </td>
 <td className="py-3.5 px-4 text-center font-mono text-slate-400 text-xs">
 {item.barcode}
 </td>
 <td className="py-3.5 px-4 text-center">
 <span className="px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 text-xs font-semibold">
 {item.unitName}
 </span>
 </td>
 <td className="py-3.5 px-4 text-center font-mono text-slate-700 dark:text-slate-300 font-bold">
 {formatNumber(item.price)} ج.م
 </td>
 <td className="py-3.5 px-4 text-center font-mono text-slate-500 font-bold">
 {item.stockBefore}
 </td>
 <td className="py-3.5 px-4 text-center">
 <span className="font-mono font-black text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/40 px-3 py-1 rounded-xl border border-emerald-200/60 dark:border-emerald-800/60">
 {item.qtySold}
 </span>
 </td>
 <td className="py-3.5 px-4 text-center">
 <span
 className={`font-mono text-xs font-bold px-2.5 py-1 rounded-lg border ${
 item.stockRemaining <= 5
 ?'bg-rose-50 text-rose-600 border-rose-200/60 dark:bg-rose-950/40 dark:border-rose-800/60'
 :'bg-slate-100 text-slate-700 border-slate-200/60 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700/60'
 }`}
 >
 {item.stockRemaining}
 </span>
 </td>
 <td className="py-3.5 px-4 text-left font-mono font-black text-blue-600 dark:text-blue-400 text-sm">
 {formatNumber(item.totalRevenue)} ج.م
 </td>
 </tr>
 );
 })
 )}
 </tbody>
 </table>
 </div>
 </div>
 </div>
 );
}