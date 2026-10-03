'use client';

import React, { useCallback, useEffect, useState } from'react';
import { AppShell } from'@/components/layout/AppShell';
import { KpiCard } from'@/components/ui/kpi-card';
import { Button } from '@/components/ui/button';
import { DatePicker } from '@/components/ui/date-picker';
import { useSessionStore } from'@/core/state/useSessionStore';
import { formatNumber } from'@/lib/format';
import { toast } from'sonner';
import { RefreshCw, Printer, TrendingUp, TrendingDown, Minus } from'lucide-react';
import { getIncomeStatement } from'@/modules/accounting/accounting_reports';

export default function IncomeStatementPage() {
 const { currentUser } = useSessionStore();
 const orgId = currentUser?.org_id ||'';

 const [data, setData] = useState<Awaited<ReturnType<typeof getIncomeStatement>> | null>(null);
 const [isLoading, setIsLoading] = useState(true);
 const [from, setFrom] = useState('');
 const [to, setTo] = useState('');

 const loadData = useCallback(async () => {
 if (!orgId) return;
 try {
 setIsLoading(true);
 setData(await getIncomeStatement(orgId, from || null, to || null));
 } catch (err) {
 console.error('Income statement error:', err);
 toast.error('حدث خطأ أثناء تحميل قائمة الدخل');
 } finally {
 setIsLoading(false);
 }
 }, [orgId, from, to]);

 useEffect(() => {
 loadData();
 }, [loadData]);

 const revenues = data?.rows.filter((r) => r.type ==='revenue'&& r.period !== 0) ?? [];
 const expenses = data?.rows.filter((r) => r.type ==='expense'&& r.period !== 0) ?? [];
 const totalRevenue = revenues.reduce((s, r) => s + r.period, 0);
 const totalExpense = expenses.reduce((s, r) => s + r.period, 0);

 return (
 <AppShell
 title="قائمة الدخل"
 subtitle="نتيجة أعمال الفترة من الإيرادات والمصروفات الصافية حسب القيود المرحّلة."
 actions={
 <Button onClick={loadData} className="h-10 px-4 bg-primary hover:bg-primary/90 text-white rounded-xl font-black text-xs gap-2 shadow-sm transition-all active:scale-95">
 <RefreshCw className={`w-4 h-4 ${isLoading ?'animate-spin':''}`} /> تحديث
 </Button>
 }
 >
 <div className="space-y-6 text-right"dir="rtl">
 <div className="bg-surface rounded-2xl border border-slate-200/80 dark:border-slate-800 p-4 flex flex-wrap items-end gap-3">
        <div className="flex flex-col gap-1">
          <label className="text-2xs font-black text-slate-400">من تاريخ</label>
          <DatePicker value={from} onChange={setFrom} placeholder="من تاريخ..." className="w-40" />
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-2xs font-black text-slate-400">إلى تاريخ</label>
          <DatePicker value={to} onChange={setTo} placeholder="إلى تاريخ..." className="w-40" />
        </div>
 <Button variant="outline"onClick={() => { setFrom(''); setTo(''); }} className="h-10 rounded-xl text-xs font-bold">
 مسح الفلتر
 </Button>
 </div>

 {data && (
 <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <KpiCard
            label="إجمالي الإيرادات"
            value={formatNumber(totalRevenue)}
            unit="ج.م"
            variant="emerald"
            icon={<TrendingUp className="w-5 h-5" />}
          />
          <KpiCard
            label="إجمالي المصروفات"
            value={formatNumber(totalExpense)}
            unit="ج.م"
            variant="rose"
            icon={<TrendingDown className="w-5 h-5" />}
          />
          <KpiCard
            label="مجمل الربح (النشاط)"
            value={formatNumber(data.grossProfit)}
            unit="ج.م"
            variant="blue"
            icon={<Minus className="w-5 h-5" />}
          />
          <KpiCard
            label="صافي أرباح الفترة"
            value={formatNumber(data.netIncome)}
            unit="ج.م"
            variant={data.netIncome >= 0 ? 'emerald' : 'rose'}
            icon={<TrendingUp className="w-5 h-5" />}
          /></div>
 )}

 <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
 <div className="bg-surface rounded-2xl border border-slate-200/80 dark:border-slate-800 overflow-hidden shadow-xs">
 <div className="px-5 py-4 border-b border-slate-100 dark:border-slate-800">
 <h3 className="text-sm font-black text-emerald-600">الإيرادات</h3>
 </div>
 <div className="p-3 space-y-1">
 {revenues.map((r) => (
 <Row key={`${r.code}-rev`} label={`${r.code} - ${r.name}`} value={r.period} />
 ))}
 {revenues.length === 0 && <Empty />}
 </div>
 </div>

 <div className="bg-surface rounded-2xl border border-slate-200/80 dark:border-slate-800 overflow-hidden shadow-xs">
 <div className="px-5 py-4 border-b border-slate-100 dark:border-slate-800">
 <h3 className="text-sm font-black text-red-600">المصروفات وتكلفة المبيعات</h3>
 </div>
 <div className="p-3 space-y-1">
 {expenses.map((r) => (
 <Row key={`${r.code}-exp`} label={`${r.code} - ${r.name}`} value={r.period} />
 ))}
 {expenses.length === 0 && <Empty />}
 </div>
 </div>
 </div>

 <div className="flex justify-end">
 <Button variant="outline"onClick={() => window.print()} className="h-10 rounded-xl text-xs font-bold gap-2">
 <Printer className="w-4 h-4"/> طباعة
 </Button>
 </div>
 </div>
 </AppShell>
 );
}

function Row({ label, value }: { label: string; value: number }) {
 return (
 <div className="flex items-center justify-between px-3 py-2 rounded-xl hover:bg-slate-50/60 dark:hover:bg-slate-900/30">
 <span className="text-xs font-bold text-slate-600 dark:text-slate-300 truncate">{label}</span>
 <span className="text-xs font-black font-mono text-slate-800 dark:text-slate-100">{formatNumber(value)}</span>
 </div>
 );
}

function Empty() {
 return <div className="py-6 text-center text-2xs font-bold text-slate-400">لا توجد حركات</div>;
}
