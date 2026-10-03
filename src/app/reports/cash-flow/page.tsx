'use client';

import React, { useCallback, useEffect, useState } from'react';
import { AppShell } from'@/components/layout/AppShell';
import { Button } from'@/components/ui/button';
import { DatePicker } from'@/components/ui/date-picker';
import { Card, CardContent, CardHeader, CardTitle } from'@/components/ui/card';
import { Badge } from'@/components/ui/badge';
import { useSessionStore } from'@/core/state/useSessionStore';
import { formatNumber } from'@/lib/format';
import { toast } from'sonner';
import {
 RefreshCw,
 Printer,
 Coins,
 ArrowUpRight,
 ArrowDownLeft,
 Briefcase,
 Building2,
 Wallet,
} from'lucide-react';
import { getCashFlowStatement, type CashFlowStatement } from'@/modules/accounting/accounting_reports';

export default function CashFlowReportPage() {
 const { currentUser } = useSessionStore();
 const orgId = currentUser?.org_id ||'';

 const [data, setData] = useState<CashFlowStatement | null>(null);
 const [isLoading, setIsLoading] = useState(true);
 const [from, setFrom] = useState('');
 const [to, setTo] = useState('');

 const loadData = useCallback(async () => {
 if (!orgId) return;
 try {
 setIsLoading(true);
 setData(await getCashFlowStatement(orgId, from || null, to || null));
 } catch (err) {
 console.error('Cash flow error:', err);
 toast.error('حدث خطأ أثناء تحميل قائمة التدفقات النقدية');
 } finally {
 setIsLoading(false);
 }
 }, [orgId, from, to]);

 useEffect(() => {
 loadData();
 }, [loadData]);

 return (
 <AppShell
 title="قائمة التدفقات النقدية"
 subtitle="حركة السيولة النقدية الفعلية عبر الأنشطة التشغيلية والاستثمارية والتمويلية."
 actions={
 <div className="flex items-center gap-2">
 <Button
 variant="outline"
 onClick={() => window.print()}
 className="h-10 px-3 rounded-xl font-bold text-xs gap-1.5"
 >
 <Printer className="w-4 h-4"/> طباعة
 </Button>
 <Button
 onClick={loadData}
 className="h-10 px-4 bg-primary hover:bg-primary/90 text-primary-foreground rounded-xl font-black text-xs gap-2 shadow-xs transition-all active:scale-95"
 >
 <RefreshCw className={`w-4 h-4 ${isLoading ?'animate-spin':''}`} /> تحديث
 </Button>
 </div>
 }
 >
 <div className="space-y-6 text-right"dir="rtl">
 {/* Date Filters */}
 <Card className="rounded-2xl border-slate-200/80 dark:border-slate-800 shadow-sm print:hidden">
 <CardContent className="p-4 flex flex-wrap items-end gap-3">
 <div className="flex flex-col gap-1">
 <label className="text-xs font-black text-muted-foreground">من تاريخ</label>
 <DatePicker value={from} onChange={setFrom} placeholder="من تاريخ..." className="w-44" />
 </div>
 <div className="flex flex-col gap-1">
 <label className="text-xs font-black text-muted-foreground">إلى تاريخ</label>
 <DatePicker value={to} onChange={setTo} placeholder="إلى تاريخ..." className="w-44" />
 </div>
 <Button
 variant="outline"
 onClick={() => {
 setFrom('');
 setTo('');
 }}
 className="h-10 rounded-xl text-xs font-bold"
 >
 مسح الفلتر
 </Button>
 </CardContent>
 </Card>

 {/* KPI Cards */}
 {data && (
 <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3.5">
 <KpiCard
 label="نقدية أول المدة"
 value={data.openingCash}
 icon={<Wallet className="w-4 h-4"/>}
 variant="default"
 />
 <KpiCard
 label="تدفقات تشغيلية"
 value={data.operating.total}
 icon={<Briefcase className="w-4 h-4"/>}
 variant={data.operating.total >= 0 ?'emerald':'rose'}
 />
 <KpiCard
 label="تدفقات استثمارية"
 value={data.investing.total}
 icon={<Building2 className="w-4 h-4"/>}
 variant={data.investing.total >= 0 ?'emerald':'rose'}
 />
 <KpiCard
 label="تدفقات تمويلية"
 value={data.financing.total}
 icon={<Coins className="w-4 h-4"/>}
 variant={data.financing.total >= 0 ?'emerald':'rose'}
 />
 <KpiCard
 label="نقدية آخر المدة"
 value={data.closingCash}
 icon={<Wallet className="w-4 h-4"/>}
 variant="blue"
 highlight
 />
 </div>
 )}

 {/* Detailed Sections */}
 {data && (
 <div className="space-y-4">
 <SectionBlock
 title="1. التدفقات النقدية من الأنشطة التشغيلية (Operating Activities)"
 category={data.operating}
 color="emerald"
 />
 <SectionBlock
 title="2. التدفقات النقدية من الأنشطة الاستثمارية (Investing Activities)"
 category={data.investing}
 color="blue"
 />
 <SectionBlock
 title="3. التدفقات النقدية من الأنشطة التمويلية (Financing Activities)"
 category={data.financing}
 color="purple"
 />

 {/* Final Reconciliation Summary */}
 <Card className="rounded-2xl border-slate-200/80 dark:border-slate-800 shadow-sm overflow-hidden">
 <CardHeader className="pb-3 border-b border-border">
 <CardTitle className="text-sm font-black text-foreground">
 مطابقة حركة النقدية وما في حكمها
 </CardTitle>
 </CardHeader>
 <CardContent className="p-5 space-y-2 text-xs font-bold text-muted-foreground">
 <div className="flex justify-between py-1">
 <span>رصيد النقدية والودائع في بداية الفترة</span>
 <span className="font-mono text-foreground font-black">{formatNumber(data.openingCash)} ج.م</span>
 </div>
 <div className="flex justify-between py-1">
 <span>صافي الزيادة / (النقص) في النقدية خلال الفترة</span>
 <span className={`font-mono font-black ${data.netCashFlow >= 0 ?'text-emerald-600 dark:text-emerald-400':'text-destructive'}`}>
 {data.netCashFlow >= 0 ?'+':''}{formatNumber(data.netCashFlow)} ج.م
 </span>
 </div>
 <div className="flex justify-between py-2 border-t border-border text-sm font-black text-foreground">
 <span>رصيد النقدية والودائع في نهاية الفترة</span>
 <span className="font-mono text-primary">{formatNumber(data.closingCash)} ج.م</span>
 </div>
 </CardContent>
 </Card>
 </div>
 )}
 </div>
 </AppShell>
 );
}

function KpiCard({
 label,
 value,
 icon,
 variant,
 highlight,
}: {
 label: string;
 value: number;
 icon: React.ReactNode;
 variant:'default'|'emerald'|'rose'|'blue';
 highlight?: boolean;
}) {
 const colorClasses = {
 default:'text-foreground',
 emerald:'text-emerald-600 dark:text-emerald-400',
 rose:'text-destructive',
 blue:'text-primary',
 }[variant];

 return (
 <Card
 className={`rounded-2xl shadow-sm space-y-2 border-slate-200/80 dark:border-slate-800 ${
 highlight ?'bg-primary/5 border-primary/30':''
 }`}
 >
 <CardContent className="p-4 space-y-2">
 <div className="flex items-center justify-between text-muted-foreground">
 <span className="text-xs font-bold">{label}</span>
 {icon}
 </div>
 <div className={`text-base sm:text-lg font-black font-mono ${colorClasses}`}>
 {formatNumber(value)} <span className="text-3xs font-sans font-normal text-muted-foreground">ج.م</span>
 </div>
 </CardContent>
 </Card>
 );
}

function SectionBlock({
 title,
 category,
 color,
}: {
 title: string;
 category: { title: string; items: { description: string; amount: number }[]; total: number };
 color:'emerald'|'blue'|'purple';
}) {
 const badgeColors = {
 emerald:'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-400 border-emerald-200',
 blue:'bg-blue-50 text-blue-700 dark:bg-blue-950/50 dark:text-blue-400 border-blue-200',
 purple:'bg-purple-50 text-purple-700 dark:bg-purple-950/50 dark:text-purple-400 border-purple-200',
 }[color];

 return (
 <Card className="rounded-2xl border-slate-200/80 dark:border-slate-800 shadow-sm overflow-hidden">
 <div className="px-5 py-3.5 border-b border-border flex items-center justify-between bg-muted/20">
 <h4 className="text-xs sm:text-sm font-black text-foreground">{title}</h4>
 <Badge variant="outline"className={`px-2.5 py-1 text-xs font-black font-mono ${badgeColors}`}>
 {category.total >= 0 ?'+':''}{formatNumber(category.total)} ج.م
 </Badge>
 </div>
 <CardContent className="p-3 space-y-1">
 {category.items.map((it, idx) => (
 <div
 key={idx}
 className="flex items-center justify-between px-3 py-2 rounded-xl text-xs hover:bg-muted/40 transition-colors"
 >
 <span className="font-bold text-foreground flex items-center gap-2">
 {it.amount >= 0 ? (
 <ArrowDownLeft className="w-3.5 h-3.5 text-emerald-500"/>
 ) : (
 <ArrowUpRight className="w-3.5 h-3.5 text-rose-500"/>
 )}
 {it.description}
 </span>
 <span
 className={`font-mono font-black ${
 it.amount >= 0 ?'text-emerald-600 dark:text-emerald-400':'text-destructive'
 }`}
 >
 {it.amount >= 0 ?'+':''}{formatNumber(it.amount)} ج.م
 </span>
 </div>
 ))}
 {category.items.length === 0 && (
 <div className="py-6 text-center text-xs font-bold text-muted-foreground">
 لا توجد حركات مسجلة لهذه الفئة خلال الفترة المحددة.
 </div>
 )}
 </CardContent>
 </Card>
 );
}