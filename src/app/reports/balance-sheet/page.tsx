'use client';

import React, { useCallback, useEffect, useState } from'react';
import { AppShell } from'@/components/layout/AppShell';
import { KpiCard } from'@/components/ui/kpi-card';
import { Button } from'@/components/ui/button';
import { DatePicker } from'@/components/ui/date-picker';
import { useSessionStore } from'@/core/state/useSessionStore';
import { formatNumber } from'@/lib/format';
import { toast } from'sonner';
import { RefreshCw, Printer, Landmark, Scale, TrendingUp } from'lucide-react';
import { getBalanceSheet, type BalanceSheetNode } from'@/modules/accounting/accounting_reports';

interface SectionProps {
 title: string;
 nodes: BalanceSheetNode[];
 total: number;
 colorClass: string;
}

export default function BalanceSheetPage() {
 const { currentUser } = useSessionStore();
 const orgId = currentUser?.org_id ||'';

 const [data, setData] = useState<Awaited<ReturnType<typeof getBalanceSheet>> | null>(null);
 const [isLoading, setIsLoading] = useState(true);
 const [asOf, setAsOf] = useState('');

 const loadData = useCallback(async () => {
 if (!orgId) return;
 try {
 setIsLoading(true);
 setData(await getBalanceSheet(orgId, asOf || null));
 } catch (err) {
 console.error('Balance sheet error:', err);
 toast.error('حدث خطأ أثناء تحميل الميزانية العمومية');
 } finally {
 setIsLoading(false);
 }
 }, [orgId, asOf]);

 useEffect(() => {
 loadData();
 }, [loadData]);

 const totalLiabilitiesEquity = data ? data.liabilitiesTotal + data.equityTotal : 0;
 const balanced = data ? Math.abs(data.assetsTotal - totalLiabilitiesEquity) < 0.01 : true;

 return (
 <AppShell
 title="الميزانية العمومية"
 subtitle="المركز المالي للمنشأة (الأصول مقابل الخصوم وحقوق الملكية) حسب القيود المرحّلة."
 actions={
 <Button onClick={loadData} className="h-10 px-4 bg-primary hover:bg-primary/90 text-white rounded-xl font-black text-xs gap-2 shadow-sm transition-all active:scale-95">
 <RefreshCw className={`w-4 h-4 ${isLoading ?'animate-spin':''}`} /> تحديث
 </Button>
 }
 >
 <div className="space-y-6 text-right"dir="rtl">
 <div className="bg-surface rounded-2xl border border-slate-200/80 dark:border-slate-800 p-4 flex flex-wrap items-end justify-between gap-4">
 <div className="flex flex-col gap-1">
 <label className="text-2xs font-black text-slate-400">حتى تاريخ</label>
 <DatePicker value={asOf} onChange={setAsOf} placeholder="حتى تاريخ..." className="w-40" />
 </div>
 <div className={`px-4 h-10 flex items-center rounded-xl text-xs font-black ${balanced ?'bg-emerald-50 text-emerald-600':'bg-red-50 text-red-600'}`}>
 {balanced ?'الميزانية متوازنة':'فرق في الميزانية'}
 </div>
 </div>

 {data && (
 <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
 <div className="space-y-6">
 <Section title="الأصول"nodes={data.assets} total={data.assetsTotal} colorClass="text-blue-600"/>
 </div>
 <div className="space-y-6">
 <Section title="الخصوم"nodes={data.liabilities} total={data.liabilitiesTotal} colorClass="text-amber-600"/>
 <Section title="حقوق الملكية"nodes={data.equity} total={data.equityTotal} colorClass="text-purple-600">
 <div className="flex items-center justify-between py-3 px-4 rounded-xl bg-purple-50/50 dark:bg-purple-950/20">
 <span className="text-xs font-black text-purple-700">صافي ربح الفترة</span>
 <span className="text-xs font-black font-mono text-purple-700">{formatNumber(data.netIncome)}</span>
 </div>
 </Section>
 </div>
 </div>
 )}

 {data && (
 <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <KpiCard
            label="إجمالي الأصول"
            value={formatNumber(data.assetsTotal)}
            unit="ج.م"
            variant="blue"
            icon={<Landmark className="w-5 h-5" />}
          />
          <KpiCard
            label="إجمالي الخصوم وحقوق الملكية"
            value={formatNumber(totalLiabilitiesEquity)}
            unit="ج.م"
            variant="amber"
            icon={<Scale className="w-5 h-5" />}
          />
          <KpiCard
            label="صافي ربح الفترة"
            value={formatNumber(data.netIncome)}
            unit="ج.م"
            variant={data.netIncome >= 0 ? 'emerald' : 'rose'}
            icon={<TrendingUp className="w-5 h-5" />}
          /></div>
 )}

 <div className="flex justify-end">
 <Button variant="outline"onClick={() => window.print()} className="h-10 rounded-xl text-xs font-bold gap-2">
 <Printer className="w-4 h-4"/> طباعة
 </Button>
 </div>
 </div>
 </AppShell>
 );
}

function Section({ title, nodes, total, colorClass, children }: SectionProps & { children?: React.ReactNode }) {
 return (
 <div className="bg-surface rounded-2xl border border-slate-200/80 dark:border-slate-800 overflow-hidden shadow-xs">
 <div className="px-5 py-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
 <h3 className={`text-sm font-black ${colorClass}`}>{title}</h3>
 <span className="text-xs font-black font-mono text-slate-900 dark:text-white">{formatNumber(total)}</span>
 </div>
 <div className="p-3 space-y-1">
 {nodes.map((node) => (
 <NodeRow key={node.account.id} node={node} level={0} />
 ))}
 {nodes.length === 0 && <div className="py-6 text-center text-2xs font-bold text-slate-400">لا توجد أرصدة</div>}
 {children}
 </div>
 </div>
 );
}

function NodeRow({ node, level }: { node: BalanceSheetNode; level: number }) {
 return (
 <div>
 <div className="flex items-center justify-between px-3 py-2 rounded-xl hover:bg-slate-50/60 dark:hover:bg-slate-900/30"style={{ paddingRight: 12 + level * 18 }}>
 <span className="text-xs font-bold text-slate-600 dark:text-slate-300 truncate">
 {node.account.code} - {node.account.name}
 </span>
 <span className="text-xs font-black font-mono text-slate-700 dark:text-slate-200">{formatNumber(node.amount)}</span>
 </div>
 {node.children.map((child) => (
 <NodeRow key={child.account.id} node={child} level={level + 1} />
 ))}
 </div>
 );
}
