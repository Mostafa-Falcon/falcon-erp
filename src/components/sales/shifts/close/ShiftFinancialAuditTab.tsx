import React from'react';
import {
 Coins,
 CreditCard,
 Banknote,
 FileText,
 ArrowUpRight,
 ArrowDownLeft,
 CircleDot,
} from'lucide-react';
import { formatNumber } from'@/lib/format';
import type { ShiftFinancialMetrics } from'./types';

interface ShiftFinancialAuditTabProps {
 metrics: ShiftFinancialMetrics;
}

export function ShiftFinancialAuditTab({ metrics }: ShiftFinancialAuditTabProps) {
 const cashNet = metrics.totalCashSales - metrics.totalCashReturns;

 return (
 <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 animate-in fade-in duration-200">
 {/* Right: حساب رصيد الدرج المتوقع (Cash Flow Ledger) */}
 <div className="bg-surface p-5 sm:p-6 rounded-2xl border border-slate-200/90 dark:border-slate-800 shadow-2xs space-y-4">
 <div className="flex items-center justify-between pb-3.5 border-b border-slate-100 dark:border-slate-800">
 <div className="flex items-center gap-2.5">
 <div className="w-8 h-8 rounded-xl bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 flex items-center justify-center">
 <Coins className="w-4 h-4"/>
 </div>
 <div>
 <h3 className="text-sm sm:text-base font-black text-slate-900 dark:text-white">
 حساب تدفق النقدية للدرج (Cash Flow)
 </h3>
 <span className="text-2xs text-slate-400 font-semibold">
 كشف تفصيلي لحركات النقدية الداخلة والخارجة
 </span>
 </div>
 </div>
 <span className="text-2xs font-mono font-bold px-2 py-0.5 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
 كشف الوردية
 </span>
 </div>

 <div className="space-y-2.5 text-xs sm:text-sm font-semibold">
 {/* Row 1: رصيد فتح الوردية */}
 <div className="p-3 rounded-xl bg-slate-50/70 dark:bg-slate-900/50 border border-slate-100 dark:border-slate-800/80 flex items-center justify-between">
 <div className="flex items-center gap-2 text-slate-700 dark:text-slate-300">
 <CircleDot className="w-3.5 h-3.5 text-slate-400"/>
 <span>رصيد فتح الوردية (العهدة الابتدائية)</span>
 </div>
 <span className="font-mono font-black text-slate-900 dark:text-white">
 {formatNumber(metrics.openingBalance)} ج.م
 </span>
 </div>

 {/* Row 2: المبيعات النقدية الصافية */}
 <div className="p-3 rounded-xl bg-emerald-50/40 dark:bg-emerald-950/20 border border-emerald-100/80 dark:border-emerald-900/40 flex items-center justify-between">
 <div className="flex items-center gap-2 text-emerald-800 dark:text-emerald-300">
 <ArrowUpRight className="w-3.5 h-3.5 text-emerald-600"/>
 <span>المبيعات النقدية الإجمالية</span>
 </div>
 <span className="font-mono font-black text-emerald-600 dark:text-emerald-400">
 +{formatNumber(metrics.totalCashSales)} ج.م
 </span>
 </div>

 {/* Row 3: تحصيلات الديون من العملاء */}
 <div className="p-3 rounded-xl bg-emerald-50/40 dark:bg-emerald-950/20 border border-emerald-100/80 dark:border-emerald-900/40 flex items-center justify-between">
 <div className="flex items-center gap-2 text-emerald-800 dark:text-emerald-300">
 <ArrowUpRight className="w-3.5 h-3.5 text-emerald-600"/>
 <span>تحصيلات الديون وسندات القبض</span>
 </div>
 <span className="font-mono font-black text-emerald-600 dark:text-emerald-400">
 +{formatNumber(metrics.customerDebtCollections)} ج.م
 </span>
 </div>

 {/* Row 4: المرتجعات النقدية المسددة */}
 <div className="p-3 rounded-xl bg-rose-50/40 dark:bg-rose-950/20 border border-rose-100/80 dark:border-rose-900/40 flex items-center justify-between">
 <div className="flex items-center gap-2 text-rose-800 dark:text-rose-300">
 <ArrowDownLeft className="w-3.5 h-3.5 text-rose-600"/>
 <span>المرتجعات النقدية المسددة للعملاء</span>
 </div>
 <span className="font-mono font-black text-rose-600 dark:text-rose-400">
 -{formatNumber(metrics.totalCashReturns)} ج.م
 </span>
 </div>

 {/* Row 5: المصروفات النقدية الخارجة */}
 <div className="p-3 rounded-xl bg-rose-50/40 dark:bg-rose-950/20 border border-rose-100/80 dark:border-rose-900/40 flex items-center justify-between">
 <div className="flex items-center gap-2 text-rose-800 dark:text-rose-300">
 <ArrowDownLeft className="w-3.5 h-3.5 text-rose-600"/>
 <span>المصروفات النثرية والتشغيلية</span>
 </div>
 <span className="font-mono font-black text-rose-600 dark:text-rose-400">
 -{formatNumber(metrics.cashExpenses)} ج.م
 </span>
 </div>

 {/* Row 6: المدفوعات النقدية للموردين */}
 <div className="p-3 rounded-xl bg-rose-50/40 dark:bg-rose-950/20 border border-rose-100/80 dark:border-rose-900/40 flex items-center justify-between">
 <div className="flex items-center gap-2 text-rose-800 dark:text-rose-300">
 <ArrowDownLeft className="w-3.5 h-3.5 text-rose-600"/>
 <span>سندات صرف ودفعات الموردين</span>
 </div>
 <span className="font-mono font-black text-rose-600 dark:text-rose-400">
 -{formatNumber(metrics.supplierPayments)} ج.م
 </span>
 </div>
 </div>

 {/* Expected Cash Drawer Footer */}
 <div className="pt-3 border-t border-slate-200/90 dark:border-slate-800">
 <div className="p-4 rounded-xl bg-gradient-to-br from-emerald-500/10 via-emerald-500/5 to-transparent border border-emerald-500/30 flex items-center justify-between">
 <div>
 <span className="font-black text-slate-900 dark:text-white text-xs sm:text-sm block">
 إجمالي النقدية المتوقعة في الدرج:
 </span>
 <span className="text-2xs font-semibold text-slate-400">
 (رصيد الافتتاح + الداخل - الخارج)
 </span>
 </div>
 <span className="font-mono font-black text-emerald-600 dark:text-emerald-400 text-lg sm:text-2xl">
 {formatNumber(metrics.expectedDrawerCash)} ج.م
 </span>
 </div>
 </div>
 </div>

 {/* Left: تفصيل المبيعات حسب طريقة الدفع */}
 <div className="bg-surface p-5 sm:p-6 rounded-2xl border border-slate-200/90 dark:border-slate-800 shadow-2xs space-y-4 flex flex-col justify-between">
 <div className="space-y-4">
 <div className="flex items-center justify-between pb-3.5 border-b border-slate-100 dark:border-slate-800">
 <div className="flex items-center gap-2.5">
 <div className="w-8 h-8 rounded-xl bg-purple-50 dark:bg-purple-950/60 text-purple-600 dark:text-purple-400 flex items-center justify-center">
 <CreditCard className="w-4 h-4"/>
 </div>
 <div>
 <h3 className="text-sm sm:text-base font-black text-slate-900 dark:text-white">
 تفصيل المبيعات حسب طرق الدفع
 </h3>
 <span className="text-2xs text-slate-400 font-semibold">
 توزيع إيرادات الفواتير على قنوات الدفع
 </span>
 </div>
 </div>
 </div>

 <div className="overflow-x-auto">
 <table className="w-full text-right text-xs sm:text-sm">
 <thead>
 <tr className="border-b border-slate-200/80 dark:border-slate-800 text-slate-400 font-bold bg-slate-50/60 dark:bg-slate-900/50">
 <th className="py-2.5 px-3">طريقة الدفع</th>
 <th className="py-2.5 px-3 text-center">المبيعات</th>
 <th className="py-2.5 px-3 text-center">المرتجعات</th>
 <th className="py-2.5 px-3 text-left">الصافي</th>
 </tr>
 </thead>
 <tbody className="divide-y divide-slate-100 dark:divide-slate-800/80 font-semibold">
 {/* Cash */}
 <tr className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30 transition-colors">
 <td className="py-3 px-3">
 <div className="flex items-center gap-2">
 <div className="w-7 h-7 rounded-lg bg-emerald-50 dark:bg-emerald-950/50 text-emerald-600 flex items-center justify-center shrink-0">
 <Banknote className="w-3.5 h-3.5"/>
 </div>
 <span className="text-slate-900 dark:text-white font-bold">النقدية (كاش)</span>
 </div>
 </td>
 <td className="py-3 px-3 font-mono text-center text-slate-900 dark:text-white font-bold">
 {formatNumber(metrics.totalCashSales)} ج.م
 </td>
 <td className="py-3 px-3 font-mono text-center text-rose-600 font-bold">
 {metrics.totalCashReturns > 0 ?`-${formatNumber(metrics.totalCashReturns)} ج.م`:'0.00'}
 </td>
 <td className="py-3 px-3 font-mono text-left font-black text-emerald-600 dark:text-emerald-400">
 {formatNumber(cashNet)} ج.م
 </td>
 </tr>

 {/* Card */}
 <tr className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30 transition-colors">
 <td className="py-3 px-3">
 <div className="flex items-center gap-2">
 <div className="w-7 h-7 rounded-lg bg-blue-50 dark:bg-blue-950/50 text-blue-600 flex items-center justify-center shrink-0">
 <CreditCard className="w-3.5 h-3.5"/>
 </div>
 <span className="text-slate-900 dark:text-white font-bold">البطاقة (فيزا / ماستركارد)</span>
 </div>
 </td>
 <td className="py-3 px-3 font-mono text-center text-slate-900 dark:text-white font-bold">
 {formatNumber(metrics.totalCardSales)} ج.م
 </td>
 <td className="py-3 px-3 font-mono text-center text-slate-400">0.00</td>
 <td className="py-3 px-3 font-mono text-left font-black text-blue-600 dark:text-blue-400">
 {formatNumber(metrics.totalCardSales)} ج.م
 </td>
 </tr>

 {/* Credit */}
 <tr className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30 transition-colors">
 <td className="py-3 px-3">
 <div className="flex items-center gap-2">
 <div className="w-7 h-7 rounded-lg bg-amber-50 dark:bg-amber-950/50 text-amber-600 flex items-center justify-center shrink-0">
 <FileText className="w-3.5 h-3.5"/>
 </div>
 <span className="text-slate-900 dark:text-white font-bold">الآجل (حسابات العملاء)</span>
 </div>
 </td>
 <td className="py-3 px-3 font-mono text-center text-slate-900 dark:text-white font-bold">
 {formatNumber(metrics.totalCreditSales)} ج.م
 </td>
 <td className="py-3 px-3 font-mono text-center text-slate-400">0.00</td>
 <td className="py-3 px-3 font-mono text-left font-black text-amber-600 dark:text-amber-400">
 {formatNumber(metrics.totalCreditSales)} ج.م
 </td>
 </tr>
 </tbody>
 </table>
 </div>
 </div>

 {/* Invoice Total Summary Footer */}
 <div className="pt-3 border-t border-slate-200/90 dark:border-slate-800">
 <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 flex items-center justify-between text-xs sm:text-sm font-black">
 <div>
 <span className="text-slate-900 dark:text-white block">إجمالي قيمة فواتير المبيعات:</span>
 <span className="text-2xs font-semibold text-slate-400">
 (كاش + فيزا + آجل)
 </span>
 </div>
 <span className="font-mono text-blue-600 dark:text-blue-400 text-base sm:text-xl">
 {formatNumber(metrics.totalInvoiceSales)} ج.م
 </span>
 </div>
 </div>
 </div>
 </div>
 );
}