'use client';

import React, { useEffect, useMemo, useState } from'react';
import { AppShell } from'@/components/layout/AppShell';
import { Button } from'@/components/ui/button';
import { useSessionStore } from'@/core/state/useSessionStore';
import { SalesRepository } from'@/modules/sales/sales_repository';
import { TreasuryRepository } from'@/modules/treasury/treasury_repository';
import { formatNumber } from'@/lib/format';
import {
 RefreshCw,
 FileDown,
 TrendingUp,
 ArrowUpRight,
 ArrowDownRight,
 DollarSign,
 PieChart,
 Truck,
 Layers,
 ChevronDown,
 Calendar,
 CheckCircle2,
 FileText
} from'lucide-react';
import type { SalesInvoice, SalesInvoiceItem, SalesReturn, Expense, ExpenseCategory } from'@/types';

export default function ProfitsReportPage() {
 const { currentUser } = useSessionStore();
 const orgId = currentUser?.org_id ||'';

 const [invoices, setInvoices] = useState<SalesInvoice[]>([]);
 const [items, setItems] = useState<SalesInvoiceItem[]>([]);
 const [returns, setReturns] = useState<SalesReturn[]>([]);
 const [expenses, setExpenses] = useState<Expense[]>([]);
 const [expenseCategories, setExpenseCategories] = useState<ExpenseCategory[]>([]);
 const [isLoading, setIsLoading] = useState(true);

 const loadData = async () => {
 if (!orgId) return;
 try {
 setIsLoading(true);
 const { db } = await import('@/core/db/app_database');
 const [inv, ret, exps, cats] = await Promise.all([
 SalesRepository.getSalesInvoices(orgId),
 SalesRepository.getSalesReturns(orgId),
 TreasuryRepository.getExpenses(orgId),
 TreasuryRepository.getExpenseCategories(orgId),
 ]);

 const ids = inv.map(i => i.id);
 const allItems = ids.length
 ? await db.sales_invoice_items.where('invoice_id').anyOf(ids).toArray()
 : [];

 setInvoices(inv);
 setReturns(ret);
 setExpenses(exps);
 setExpenseCategories(cats);
 setItems(allItems);
 } catch (err) {
 console.error('Load profit report error:', err);
 } finally {
 setIsLoading(false);
 }
 };

 useEffect(() => {
 loadData();
 }, [orgId]);

 // Financial Calculations
 const fin = useMemo(() => {
 const grossSales = items.reduce((acc, it) => acc + (it.quantity * it.unit_price), 0);
 const returnsTotal = returns.reduce((acc, r) => acc + r.total, 0);
 // In many ERPs,"Net Revenue"is Gross Sales - Returns - Discounts.
 // Our SalesInvoice already has discount_amount.
 const totalDiscounts = invoices.reduce((acc, inv) => acc + inv.discount_amount, 0);
 const netRevenue = grossSales - returnsTotal - totalDiscounts;

 const cogs = items.reduce((acc, it) => acc + (it.quantity * it.unit_cost), 0);
 const grossProfit = netRevenue - cogs;

 const operatingExpenses = expenses.reduce((acc, e) => acc + e.amount, 0);
 const netIncome = grossProfit - operatingExpenses;

 const cogsPercent = netRevenue > 0 ? (cogs / netRevenue) * 100 : 0;
 const expensesPercent = netRevenue > 0 ? (operatingExpenses / netRevenue) * 100 : 0;
 const netProfitMargin = netRevenue > 0 ? (netIncome / netRevenue) * 100 : 0;

 return {
 grossSales,
 returnsTotal,
 totalDiscounts,
 netRevenue,
 cogs,
 grossProfit,
 operatingExpenses,
 netIncome,
 cogsPercent,
 expensesPercent,
 netProfitMargin,
 totalUnits: items.reduce((acc, it) => acc + it.quantity, 0),
 invoiceCount: invoices.length,
 aov: invoices.length > 0 ? netRevenue / invoices.length : 0,
 avgProfitPerInv: invoices.length > 0 ? netIncome / invoices.length : 0,
 returnRate: invoices.length > 0 ? (returns.length / invoices.length) * 100 : 0
 };
 }, [invoices, items, returns, expenses]);

 const expenseDistribution = useMemo(() => {
 const dist: Record<string, number> = {};
 for (const e of expenses) {
 dist[e.category_id] = (dist[e.category_id] || 0) + e.amount;
 }
 return Object.entries(dist).map(([catId, amount]) => ({
 name: expenseCategories.find(c => c.id === catId)?.name ||'غير مصنف',
 amount
 })).sort((a, b) => b.amount - a.amount);
 }, [expenses, expenseCategories]);

 const headerActions = (
 <div className="flex items-center gap-2">
 <Button onClick={loadData} variant="outline"className="h-10 px-4 gap-2 border-slate-200 dark:border-slate-800 rounded-xl font-bold text-xs">
 <RefreshCw className={`w-4 h-4 ${isLoading ?'animate-spin':''}`} /> تحديث
 </Button>
 <Button className="h-10 px-4 gap-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-black text-xs shadow-sm shadow-indigo-500/10">
 <FileDown className="w-4 h-4"/> تصدير PDF
 </Button>
 </div>
 );

 return (
 <AppShell
 title="تقرير الأرباح والخسائر وقائمة الدخل"
 subtitle="متابعة حية وشاملة للإيرادات وتكلفة البضاعة المباعة والمصروفات وصافي الأرباح."
 actions={headerActions}
 >
 <div className="space-y-6 text-right"dir="rtl">

 {/* ==================== PERIOD SELECTOR BAR ==================== */}
 <div className="flex items-center gap-3">
 <Button variant="outline"className="h-10 px-4 rounded-xl border-slate-200 dark:border-slate-800 font-bold text-xs gap-2">
 <Calendar className="w-4 h-4 text-slate-400"/> كل الفترات <ChevronDown className="w-3.5 h-3.5"/>
 </Button>
 </div>

 {/* ==================== SUMMARY CARDS ==================== */}
 <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-4">
 <FinCard label="صافي الربح النهائي"value={fin.netIncome} accent="emerald"icon={<TrendingUp />} />
 <FinCard label="مجمل الربح (Gross Profit)"value={fin.grossProfit} accent="blue"icon={<ArrowUpRight />} />
 <FinCard label="صافي المبيعات (Net Revenue)"value={fin.netRevenue} accent="indigo"icon={<DollarSign />} />
 <FinCard label="تكلفة البضاعة المباعة (COGS)"value={fin.cogs} accent="amber"icon={<Layers />} />
 <FinCard label="المصروفات التشغيلية"value={fin.operatingExpenses} accent="red"icon={<ArrowDownRight />} />
 </div>

 {/* ==================== DISTRIBUTION PROGRESS BAR ==================== */}
 <div className="bg-surface rounded-2xl border border-slate-200/80 dark:border-slate-800 p-6 shadow-xs">
 <div className="flex items-center justify-between mb-4">
 <h4 className="text-sm font-black text-slate-900 dark:text-white">توزيع الهيكل المالي للإيرادات</h4>
 <span className="text-xs font-black text-indigo-600">صافي الإيراد: {formatNumber(fin.netRevenue)} ج.م</span>
 </div>

 <div className="h-4 w-full bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden flex">
 <div className="bg-amber-500 h-full"style={{ width:`${fin.cogsPercent}%`}} />
 <div className="bg-red-500 h-full"style={{ width:`${fin.expensesPercent}%`}} />
 <div className="bg-emerald-500 h-full"style={{ width:`${Math.max(0, fin.netProfitMargin)}%`}} />
 </div>

 <div className="mt-4 flex flex-wrap items-center justify-center gap-6">
 <LegendItem color="bg-amber-500"label="تكلفة البضاعة المباعة (COGS)"percent={fin.cogsPercent} />
 <LegendItem color="bg-red-500"label="المصروفات التشغيلية"percent={fin.expensesPercent} />
 <LegendItem color="bg-emerald-500"label="صافي الربح"percent={fin.netProfitMargin} />
 </div>
 </div>

 {/* ==================== MAIN PANELS ==================== */}
 <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">

 {/* Left Panel: Indicators & Small Stats */}
 <div className="space-y-6">
 <SideCard title="مؤشرات الأداء والكفاءة التشغيلية"icon={<TrendingUp className="w-4 h-4 text-blue-600"/>}>
 <IndicatorRow label="حجم فواتير المبيعات"value={`${fin.invoiceCount} فاتورة`} />
 <IndicatorRow label="إجمالي القطع المباعة"value={`${formatNumber(fin.totalUnits)} قطعة / وحدة`} />
 <IndicatorRow label="متوسط قيمة الفاتورة (AOV)"value={`${formatNumber(fin.aov)} ج.م`} />
 <IndicatorRow label="متوسط الربح لكل فاتورة"value={`${formatNumber(fin.avgProfitPerInv)} ج.م`} color="text-emerald-600"/>
 <IndicatorRow label="معدل المرتجعات من المبيعات"value={`${fin.returnRate.toFixed(1)}%`} />
 </SideCard>

 <SideCard title="توزيع بنود المصروفات"icon={<PieChart className="w-4 h-4 text-red-500"/>}>
 {expenseDistribution.length > 0 ? (
 <div className="space-y-3">
 {expenseDistribution.map((e, i) => (
 <IndicatorRow key={i} label={e.name} value={`${formatNumber(e.amount)} ج.م`} />
 ))}
 </div>
 ) : (
 <div className="py-8 text-center text-2xs font-bold text-slate-400">لا توجد مصروفات مسجلة خلال هذه الفترة.</div>
 )}
 </SideCard>

 <SideCard title="حركة التوريد والمشتريات للفترة"icon={<Truck className="w-4 h-4 text-amber-500"/>}>
 <IndicatorRow label="إجمالي فواتير المشتريات"value="0.00 ج.م"/>
 <IndicatorRow label="مرتجع المشتريات للموردين"value="0.00 ج.م"/>
 </SideCard>
 </div>

 {/* Right Panel: Detailed Income Statement */}
 <div className="lg:col-span-2 space-y-6">
 <div className="bg-surface rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-xs overflow-hidden">
 <div className="p-5 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
 <div className="flex items-center gap-2">
 <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center">
 <PieChart className="w-4 h-4"/>
 </div>
 <h3 className="text-base font-black">قائمة الدخل الشاملة (Income Statement)</h3>
 </div>
 <div className="bg-blue-50 text-blue-600 px-3 py-1 rounded-lg text-3xs font-black">كل الفترات</div>
 </div>

 <div className="p-6 space-y-8">

 {/* 1. Operating Revenues */}
 <div className="space-y-4">
 <div className="flex items-center gap-2 text-blue-600">
 <CheckCircle2 className="w-4 h-4"/>
 <h4 className="text-xs font-black uppercase tracking-wider">1. إيرادات النشاط (Operating Revenues)</h4>
 </div>
 <div className="space-y-3 pr-6 border-r-2 border-slate-100 dark:border-slate-800/60">
 <DetailRow label="إجمالي المبيعات (Gross Sales)"desc="إجمالي قيمة المنتجات المباعة بالفواتير قبل المردودات والخصومات"value={fin.grossSales} />
 <DetailRow label="مردودات ومسموحات المبيعات (Sales Returns)"desc="قيمة المرتجعات المستردة للعملاء خلال الفترة"value={fin.returnsTotal} isNegative />
 <DetailRow label="الخصومات الممنوحة (Discounts Given)"desc="إجمالي التخفيضات والخصومات الممنوحة على الفواتير"value={fin.totalDiscounts} isNegative />
 <div className="pt-2">
 <SummaryRow label="صافي إيرادات المبيعات (Net Revenue)"value={fin.netRevenue} accent="blue"/>
 </div>
 </div>
 </div>

 {/* 2. COGS */}
 <div className="space-y-4">
 <div className="flex items-center gap-2 text-amber-600">
 <Layers className="w-4 h-4"/>
 <h4 className="text-xs font-black uppercase tracking-wider">2. تكلفة البضاعة المباعة (Cost of Goods Sold)</h4>
 </div>
 <div className="space-y-3 pr-6 border-r-2 border-slate-100 dark:border-slate-800/60">
 <DetailRow label="تكلفة البضاعة والمنتجات المباعة (COGS)"desc="التكلفة الفعلية وفق أسعار الشراء للأصناف المباعة"value={fin.cogs} isNegative />
 <div className="pt-2">
 <SummaryRow label="مجمل الربح المحقق (Gross Profit)"value={fin.grossProfit} accent="emerald"margin={fin.netProfitMargin} />
 </div>
 </div>
 </div>

 {/* 3. Operating Expenses */}
 <div className="space-y-4">
 <div className="flex items-center gap-2 text-red-500">
 <FileText className="w-4 h-4"/>
 <h4 className="text-xs font-black uppercase tracking-wider">3. المصروفات التشغيلية والإدارية (Operating Expenses)</h4>
 </div>
 <div className="space-y-3 pr-6 border-r-2 border-slate-100 dark:border-slate-800/60">
 {expenses.length === 0 ? (
 <p className="text-2xs font-bold text-slate-400 py-2">لا توجد مصروفات مسجلة خلال الفترة المحددة.</p>
 ) : (
 <DetailRow label="إجمالي المصروفات التشغيلية والرواتب"value={fin.operatingExpenses} isNegative />
 )}
 <div className="pt-2">
 <div className="h-10 px-4 flex items-center justify-between border border-red-100 bg-red-50/30 rounded-xl text-red-600 text-xs font-black">
 <span>إجمالي المصروفات التشغيلية</span>
 <span>{formatNumber(fin.operatingExpenses)} ج.م -</span>
 </div>
 </div>
 </div>
 </div>

 {/* FINAL NET INCOME */}
 <div className="bg-emerald-500 text-white rounded-2xl p-6 flex items-center justify-between shadow-lg shadow-emerald-500/20">
 <div className="flex items-center gap-4">
 <div className="w-12 h-12 rounded-xl bg-white/20 backdrop-blur-md flex items-center justify-center border border-white/30">
 <CheckCircle2 className="w-7 h-7"/>
 </div>
 <div>
 <h3 className="text-base font-black uppercase">صافي الربح النهائي (Net Income)</h3>
 <p className="text-3xs font-bold opacity-80 mt-0.5 leading-relaxed">الناتج المحاسبي النهائي بعد خصم كافة التكاليف والمصروفات الإدارية والتشغيلية</p>
 </div>
 </div>
 <div className="text-right">
 <div className="text-2xl font-black">{formatNumber(fin.netIncome)} <span className="text-sm">ج.م</span></div>
 <div className="text-3xs font-black bg-white/20 px-2 py-1 rounded-lg inline-block mt-1 border border-white/20">صافي الهامش: {fin.netProfitMargin.toFixed(1)}%</div>
 </div>
 </div>

 </div>
 </div>
 </div>

 </div>

 </div>
 </AppShell>
 );
}

function FinCard({ label, value, accent, icon }: { label: string, value: number, accent: string, icon: React.ReactNode }) {
 const styles = {
 emerald:'bg-emerald-50 text-emerald-600 border-emerald-100',
 blue:'bg-blue-50 text-blue-600 border-blue-100',
 indigo:'bg-indigo-50 text-indigo-600 border-indigo-100',
 amber:'bg-amber-50 text-amber-600 border-amber-100',
 red:'bg-red-50 text-red-600 border-red-100',
 };

 return (
 <div className="rounded-2xl border p-4 shadow-2xs bg-surface dark:border-slate-800">
 <div className="flex items-center justify-between mb-2">
 <span className="text-3xs font-black text-slate-400">{label}</span>
 <div className={`w-7 h-7 rounded-lg flex items-center justify-center shadow-inner ${styles[accent as keyof typeof styles]}`}>
 <div className="w-4 h-4 [&>svg]:w-full [&>svg]:h-full flex items-center justify-center">
 {icon}
 </div>
 </div>
 </div>
 <div className={`text-lg font-black ${styles[accent as keyof typeof styles].split('')[1]}`}>
 {formatNumber(value)} <span className="text-3xs font-bold">ج.م</span>
 </div>
 </div>
 );
}

function LegendItem({ color, label, percent }: { color: string, label: string, percent: number }) {
 return (
 <div className="flex items-center gap-2">
 <div className={`w-3 h-3 rounded-full ${color} shadow-sm`} />
 <span className="text-2xs font-bold text-slate-500 dark:text-slate-400">{label}:</span>
 <span className="text-2xs font-black text-slate-900 dark:text-white">{percent.toFixed(1)}%</span>
 </div>
 );
}

function SideCard({ title, icon, children }: { title: string, icon: React.ReactNode, children: React.ReactNode }) {
 return (
 <div className="bg-surface rounded-2xl border border-slate-200/80 dark:border-slate-800 p-5 shadow-xs">
 <div className="flex items-center gap-2 mb-4 pb-3 border-b border-slate-50 dark:border-slate-800">
 {icon}
 <h4 className="text-xs font-black text-slate-800 dark:text-slate-200">{title}</h4>
 </div>
 <div className="space-y-3">{children}</div>
 </div>
 );
}

function IndicatorRow({ label, value, color }: { label: string, value: string, color?: string }) {
 return (
 <div className="flex items-center justify-between gap-4">
 <span className="text-2xs font-bold text-slate-400">{label}</span>
 <span className={`text-2xs font-black ${color ||'text-slate-900 dark:text-white'}`}>{value}</span>
 </div>
 );
}

function DetailRow({ label, desc, value, isNegative = false }: { label: string, desc?: string, value: number, isNegative?: boolean }) {
 return (
 <div className="flex items-center justify-between gap-4 py-0.5">
 <div className="flex flex-col">
 <span className="text-2xs font-black text-slate-800 dark:text-slate-200">{label}</span>
 {desc && <span className="text-4xs font-medium text-slate-400 leading-tight">{desc}</span>}
 </div>
 <div className={`text-xs font-mono font-black ${isNegative && value !== 0 ?'text-red-500':'text-slate-900 dark:text-white'}`}>
 {formatNumber(value)} {isNegative && value !== 0 ?'-':''} <span className="text-4xs font-sans mr-0.5">ج.م</span>
 </div>
 </div>
 );
}

function SummaryRow({ label, value, accent, margin }: { label: string, value: number, accent:'blue'|'emerald', margin?: number }) {
 const colors = {
 blue:'bg-blue-50 text-blue-600 border-blue-100',
 emerald:'bg-emerald-50 text-emerald-600 border-emerald-100'
 };

 return (
 <div className={`rounded-xl px-4 py-3 flex items-center justify-between border shadow-sm ${colors[accent]}`}>
 <div className="text-xs font-black">{label}</div>
 <div className="flex items-center gap-3">
 {margin !== undefined && (
 <span className="text-3xs font-black bg-white/60 dark:bg-slate-900/40 px-2 py-0.5 rounded-lg border border-emerald-200 dark:border-emerald-800">هامش: {margin.toFixed(1)}%</span>
 )}
 <div className="text-sm font-black">{formatNumber(value)} ج.م</div>
 </div>
 </div>
 );
}