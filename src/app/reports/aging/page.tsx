'use client';

import React, { useCallback, useEffect, useState } from'react';
import Link from'next/link';
import { AppShell } from'@/components/layout/AppShell';
import { Button } from'@/components/ui/button';
import { Input } from'@/components/ui/input';
import { Tabs, TabsList, TabsTrigger } from'@/components/ui/tabs';
import {
 Table,
 TableBody,
 TableCell,
 TableHead,
 TableHeader,
 TableRow,
} from'@/components/ui/table';
import { Card, CardContent } from'@/components/ui/card';
import { Badge } from'@/components/ui/badge';
import { useSessionStore } from'@/core/state/useSessionStore';
import { formatNumber } from'@/lib/format';
import { toast } from'sonner';
import {
 RefreshCw,
 Printer,
 AlertTriangle,
 Users,
 Truck,
 ExternalLink,
 Search,
} from'lucide-react';
import { getAgingReport, type AgingReport } from'@/modules/accounting/accounting_reports';

export default function AgingReportPage() {
 const { currentUser } = useSessionStore();
 const orgId = currentUser?.org_id ||'';

 const [activeTab, setActiveTab] = useState<'receivables'|'payables'>('receivables');
 const [data, setData] = useState<AgingReport | null>(null);
 const [isLoading, setIsLoading] = useState(true);
 const [search, setSearch] = useState('');

 const loadData = useCallback(async () => {
 if (!orgId) return;
 try {
 setIsLoading(true);
 setData(await getAgingReport(orgId, activeTab));
 } catch (err) {
 console.error('Aging report error:', err);
 toast.error('حدث خطأ أثناء تحميل تقرير أعمار الديون');
 } finally {
 setIsLoading(false);
 }
 }, [orgId, activeTab]);

 useEffect(() => {
 loadData();
 }, [loadData]);

 const filteredRows =
 data?.rows.filter(
 (r) =>
 r.contactName.toLowerCase().includes(search.toLowerCase()) ||
 (r.contactPhone && r.contactPhone.includes(search))
 ) ?? [];

 return (
 <AppShell
 title="تقرير أعمار الديون"
 subtitle="تحليل الفترات الزمنية لمديونيات العملاء ومستحقات الموردين وتصنيف الديون الراكدة."
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
 {/* Switcher & Search Bar */}
 <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4 print:hidden">
 <Tabs
 value={activeTab}
 onValueChange={(val) => setActiveTab(val as'receivables'|'payables')}
 className="w-full sm:w-auto"
 >
 <TabsList className="grid grid-cols-2 w-full sm:w-80 h-11 p-1 bg-muted rounded-2xl">
 <TabsTrigger
 value="receivables"
 className="rounded-xl text-xs font-bold data-[state=active]:bg-background data-[state=active]:text-primary gap-1.5"
 >
 <Users className="w-4 h-4"/> مديونيات العملاء (AR)
 </TabsTrigger>
 <TabsTrigger
 value="payables"
 className="rounded-xl text-xs font-bold data-[state=active]:bg-background data-[state=active]:text-amber-600 gap-1.5"
 >
 <Truck className="w-4 h-4"/> مستحقات الموردين (AP)
 </TabsTrigger>
 </TabsList>
 </Tabs>

 <div className="relative w-full sm:w-72">
 <Search className="w-4 h-4 text-muted-foreground absolute right-3 top-1/2 -translate-y-1/2"/>
 <Input
 value={search}
 onChange={(e) => setSearch(e.target.value)}
 placeholder="بحث بالاسم أو رقم الهاتف..."
 className="h-11 pr-9 pl-4 rounded-xl text-xs bg-background border-slate-200 dark:border-slate-800"
 />
 </div>
 </div>

 {/* Totals KPI Cards */}
 {data && (
 <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3.5">
 <SummaryCard
 label="إجمالي الأرصدة القائمة"
 value={data.totals.totalBalance}
 color="text-foreground"
 />
 <SummaryCard
 label="0 - 30 يوم (حالي)"
 value={data.totals.current0_30}
 color="text-emerald-600 dark:text-emerald-400"
 bgColor="bg-emerald-50/40 dark:bg-emerald-950/20"
 />
 <SummaryCard
 label="31 - 60 يوم"
 value={data.totals.days31_60}
 color="text-blue-600 dark:text-blue-400"
 bgColor="bg-blue-50/40 dark:bg-blue-950/20"
 />
 <SummaryCard
 label="61 - 90 يوم"
 value={data.totals.days61_90}
 color="text-amber-600 dark:text-amber-400"
 bgColor="bg-amber-50/40 dark:bg-amber-950/20"
 />
 <SummaryCard
 label="أكثر من 90 يوم (+90)"
 value={data.totals.days90Plus}
 color="text-destructive"
 bgColor="bg-destructive/10"
 alertIcon={data.totals.days90Plus > 0}
 />
 </div>
 )}

 {/* Data Table */}
 <Card className="rounded-2xl border-slate-200/80 dark:border-slate-800 overflow-hidden shadow-sm">
 <div className="overflow-x-auto">
 <Table className="w-full text-xs text-right">
 <TableHeader className="bg-slate-50/80 dark:bg-slate-900/60">
 <TableRow>
 <TableHead className="py-3.5 px-4 text-xs font-black">
 {activeTab ==='receivables'?'اسم العميل':'اسم المورد'}
 </TableHead>
 <TableHead className="py-3.5 px-4 text-center font-mono text-xs font-black">0 - 30 يوم</TableHead>
 <TableHead className="py-3.5 px-4 text-center font-mono text-xs font-black">31 - 60 يوم</TableHead>
 <TableHead className="py-3.5 px-4 text-center font-mono text-xs font-black">61 - 90 يوم</TableHead>
 <TableHead className="py-3.5 px-4 text-center font-mono text-xs font-black">90+ يوم</TableHead>
 <TableHead className="py-3.5 px-4 text-left font-mono text-xs font-black">إجمالي المديونية</TableHead>
 <TableHead className="py-3.5 px-4 text-center print:hidden text-xs font-black">إجراء</TableHead>
 </TableRow>
 </TableHeader>
 <TableBody>
 {filteredRows.map((row) => (
 <TableRow key={row.contactId} className="hover:bg-muted/40 transition-colors">
 <TableCell className="py-3 px-4">
 <span className="font-bold text-foreground block">{row.contactName}</span>
 {row.contactPhone && (
 <span className="text-3xs font-mono text-muted-foreground block mt-0.5"dir="ltr">
 {row.contactPhone}
 </span>
 )}
 </TableCell>
 <TableCell className="py-3 px-4 text-center font-mono text-emerald-600 dark:text-emerald-400 font-bold">
 {row.current0_30 > 0 ? formatNumber(row.current0_30) :'—'}
 </TableCell>
 <TableCell className="py-3 px-4 text-center font-mono text-blue-600 dark:text-blue-400 font-bold">
 {row.days31_60 > 0 ? formatNumber(row.days31_60) :'—'}
 </TableCell>
 <TableCell className="py-3 px-4 text-center font-mono text-amber-600 dark:text-amber-400 font-bold">
 {row.days61_90 > 0 ? formatNumber(row.days61_90) :'—'}
 </TableCell>
 <TableCell className="py-3 px-4 text-center font-mono text-destructive font-black">
 {row.days90Plus > 0 ? formatNumber(row.days90Plus) :'—'}
 </TableCell>
 <TableCell className="py-3 px-4 text-left font-mono font-black text-foreground">
 {formatNumber(row.totalBalance)} <span className="text-3xs font-sans font-normal">ج.م</span>
 </TableCell>
 <TableCell className="py-3 px-4 text-center print:hidden">
 <Link
 href={`/contacts/${activeTab ==='receivables'?'customers':'suppliers'}?id=${row.contactId}`}
 className="inline-flex items-center gap-1 text-2xs font-bold text-primary hover:underline"
 >
 <ExternalLink className="w-3 h-3"/> كشف حساب
 </Link>
 </TableCell>
 </TableRow>
 ))}
 {filteredRows.length === 0 && (
 <TableRow>
 <TableCell colSpan={7} className="py-12 text-center text-xs font-bold text-muted-foreground">
 لا توجد ديون مسجلة في هذا التصنيف حالياً.
 </TableCell>
 </TableRow>
 )}
 </TableBody>
 </Table>
 </div>
 </Card>
 </div>
 </AppShell>
 );
}

function SummaryCard({
 label,
 value,
 color,
 bgColor,
 alertIcon,
}: {
 label: string;
 value: number;
 color: string;
 bgColor?: string;
 alertIcon?: boolean;
}) {
 return (
 <Card className={`rounded-2xl border-slate-200/80 dark:border-slate-800 shadow-sm ${bgColor ||''}`}>
 <CardContent className="p-4 space-y-1">
 <div className="flex items-center justify-between text-muted-foreground">
 <span className="text-2xs font-bold">{label}</span>
 {alertIcon && <AlertTriangle className="w-3.5 h-3.5 text-destructive animate-pulse"/>}
 </div>
 <div className={`text-sm sm:text-base font-black font-mono ${color}`}>
 {formatNumber(value)} <span className="text-3xs font-sans font-normal text-muted-foreground">ج.م</span>
 </div>
 </CardContent>
 </Card>
 );
}