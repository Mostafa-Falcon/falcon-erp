'use client';

import React, { useEffect, useMemo, useState } from'react';
import { AppShell } from'@/components/layout/AppShell';
import { Button } from'@/components/ui/button';
import { Input } from'@/components/ui/input';
import { useSessionStore } from'@/core/state/useSessionStore';
import { formatNumber } from'@/lib/format';
import { toast } from'sonner';
import {
 RefreshCw,
 Printer,
 FileText,
 FileSpreadsheet,
 SlidersHorizontal,
 Search,
 Eye,
 FileDown,
 Calendar,
 FilterX,
 BookOpen,
 TrendingUp,
 History,
} from'lucide-react';
import type { JournalEntry, JournalEntryLine, Account } from'@/types';
import { AccountingRepository } from'@/modules/accounting/accounting_repository';
import {
 Select,
 SelectContent,
 SelectItem,
 SelectTrigger,
 SelectValue,
} from'@/components/ui/select';
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
import {
 Dialog,
 DialogContent,
 DialogHeader,
 DialogTitle,
} from'@/components/ui/dialog';

export default function JournalEntriesPage() {
 const { currentUser } = useSessionStore();
 const orgId = currentUser?.org_id ||'';

 const [entries, setEntries] = useState<JournalEntry[]>([]);
 const [isLoading, setIsLoading] = useState(true);
 const [isDetailsOpen, setIsDetailsOpen] = useState(false);
 const [detailEntry, setDetailEntry] = useState<JournalEntry | null>(null);
 const [detailLines, setDetailLines] = useState<
 Array<JournalEntryLine & { accountName: string; accountCode: string }>
 >([]);

 // Filters State
 const [searchQuery, setSearchQuery] = useState('');
 const [typeFilter, setTypeFilter] = useState('all');
 const [pageSize, setPageSize] = useState('25');

 const openDetails = async (entry: JournalEntry) => {
 try {
 const { db } = await import('@/core/db/app_database');
 const [lines, accounts] = await Promise.all([
 db.journal_entry_lines.where('entry_id').equals(entry.id).toArray(),
 db.accounts.where('org_id').equals(orgId).toArray(),
 ]);
 const accById = new Map<string, Account>(accounts.map((a) => [a.id, a]));
 setDetailLines(
 lines.map((line) => {
 const acc = accById.get(line.account_id);
 return { ...line, accountName: acc?.name ??'-', accountCode: acc?.code ??'-'};
 })
 );
 setDetailEntry(entry);
 setIsDetailsOpen(true);
 } catch (err) {
 console.error('Load entry lines error:', err);
 toast.error('تعذر تحميل تفاصيل القيد');
 }
 };

 const loadData = async () => {
 if (!orgId) return;
 try {
 setIsLoading(true);
 await AccountingRepository.ensureDefaultChartOfAccounts(orgId);
 const { db } = await import('@/core/db/app_database');
 const journalList = await db.journal_entries.where('org_id').equals(orgId).reverse().sortBy('entry_date');
 setEntries(journalList);
 } catch (err) {
 console.error('Load journal error:', err);
 toast.error('حدث خطأ أثناء تحميل القيود');
 } finally {
 setIsLoading(false);
 }
 };

 useEffect(() => {
 loadData();
 // eslint-disable-next-line react-hooks/exhaustive-deps
 }, [orgId]);

 const filteredEntries = useMemo(() => {
 return entries.filter((e) => {
 const matchesType = typeFilter ==='all'|| e.type === typeFilter;
 const matchesSearch =
 !searchQuery ||
 e.entry_no.includes(searchQuery) ||
 e.description.toLowerCase().includes(searchQuery.toLowerCase());
 return matchesType && matchesSearch;
 });
 }, [entries, searchQuery, typeFilter]);

 const stats = useMemo(() => {
 const today = new Date().toDateString();
 const thisMonth = new Date().getMonth();
 const thisYear = new Date().getFullYear();

 return {
 totalCount: entries.length,
 totalVolume: entries.reduce((a, b) => a + b.total_amount, 0),
 todayCount: entries.filter((e) => new Date(e.entry_date).toDateString() === today).length,
 monthCount: entries.filter((e) => {
 const d = new Date(e.entry_date);
 return d.getMonth() === thisMonth && d.getFullYear() === thisYear;
 }).length,
 };
 }, [entries]);

 const headerActions = (
 <Button className="h-10 px-4 bg-primary hover:bg-primary/90 text-primary-foreground rounded-xl font-black text-xs gap-2 shadow-sm transition-all active:scale-95">
 <FileDown className="w-4 h-4"/> تصدير PDF
 </Button>
 );

 return (
 <AppShell
 title="قيود اليومية العامة"
 subtitle="سجل الحركات المالية المزدوجة لكافة عمليات المنشأة لضمان الشفافية والرقابة المحاسبية."
 actions={headerActions}
 >
 <div className="space-y-6 text-right"dir="rtl">
 {/* Summary Cards */}
 <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
 <StatCard label="إجمالي القيود"value={stats.totalCount} icon={<BookOpen className="w-6 h-6"/>} color="blue"isNumber />
 <StatCard label="إجمالي الحركات المالية"value={stats.totalVolume} icon={<TrendingUp className="w-6 h-6"/>} color="emerald"/>
 <StatCard label="عمليات اليوم"value={stats.todayCount} icon={<History className="w-6 h-6"/>} color="indigo"isNumber />
 <StatCard label="قيود هذا الشهر"value={stats.monthCount} icon={<Calendar className="w-6 h-6"/>} color="amber"isNumber />
 </div>

 {/* Filters & Table Card */}
 <Card className="rounded-2xl border-slate-200/80 dark:border-slate-800 shadow-sm overflow-hidden">
 <div className="p-4 border-b border-slate-100 dark:border-slate-800 flex flex-wrap items-center justify-between gap-4">
 <div className="flex flex-wrap items-center gap-4">
 <div className="flex items-center gap-2">
 <span className="text-xs font-black text-muted-foreground">نوع القيد</span>
 <Select value={typeFilter} onValueChange={setTypeFilter}>
 <SelectTrigger className="w-36 h-10 rounded-xl bg-slate-50/50 dark:bg-slate-900/50 border-slate-200 dark:border-slate-800 text-xs font-bold">
 <SelectValue />
 </SelectTrigger>
 <SelectContent>
 <SelectItem value="all">الكل</SelectItem>
 <SelectItem value="general">قيد عام</SelectItem>
 <SelectItem value="sales">مبيعات</SelectItem>
 <SelectItem value="purchases">مشتريات</SelectItem>
 <SelectItem value="voucher">سندات</SelectItem>
 <SelectItem value="expenses">مصروفات</SelectItem>
 <SelectItem value="payroll">رواتب</SelectItem>
 <SelectItem value="reversal">قيد عكسي</SelectItem>
 </SelectContent>
 </Select>
 </div>

 <Button
 variant="ghost"
 onClick={() => setSearchQuery('')}
 className="h-10 text-destructive hover:text-destructive hover:bg-destructive/10 text-xs font-bold gap-1.5"
 >
 <FilterX className="w-4 h-4"/> مسح البحث
 </Button>
 </div>

 <div className="flex items-center gap-2 text-xs font-bold text-muted-foreground">
 <span>عرض</span>
 <Select value={pageSize} onValueChange={setPageSize}>
 <SelectTrigger className="w-20 h-10 rounded-xl bg-slate-50/60 dark:bg-slate-900/60 border-slate-200 dark:border-slate-800 text-xs font-bold">
 <SelectValue />
 </SelectTrigger>
 <SelectContent>
 <SelectItem value="25">25</SelectItem>
 <SelectItem value="50">50</SelectItem>
 <SelectItem value="100">100</SelectItem>
 </SelectContent>
 </Select>
 <span>إدخالات</span>
 </div>
 </div>

 <div className="p-4 bg-slate-50/30 dark:bg-slate-900/30 flex flex-wrap items-center justify-between gap-4">
 <div className="flex items-center gap-2">
 <Button
 variant="outline"
 size="icon"
 onClick={loadData}
 className="w-10 h-10 rounded-xl border-slate-200 dark:border-slate-800"
 >
 <RefreshCw className={`w-4 h-4 ${isLoading ?'animate-spin':''}`} />
 </Button>
 <Button
 variant="outline"
 size="icon"
 onClick={() => window.print()}
 className="w-10 h-10 rounded-xl border-slate-200 dark:border-slate-800"
 >
 <Printer className="w-4 h-4"/>
 </Button>
 <Button
 variant="outline"
 size="icon"
 className="w-10 h-10 rounded-xl border-slate-200 dark:border-slate-800 text-blue-500"
 >
 <FileText className="w-4 h-4"/>
 </Button>
 <Button
 variant="outline"
 size="icon"
 className="w-10 h-10 rounded-xl border-slate-200 dark:border-slate-800 text-emerald-600"
 >
 <FileSpreadsheet className="w-4 h-4"/>
 </Button>

 <div className="h-6 w-[1px] bg-slate-200 dark:bg-slate-800 mx-2"/>

 <Button variant="outline"className="h-10 border-slate-200 dark:border-slate-800 text-xs font-bold gap-1.5 rounded-xl">
 <SlidersHorizontal className="w-4 h-4"/> تخصيص الأعمدة
 </Button>
 </div>

 <div className="relative group">
 <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground group-focus-within:text-primary transition-colors"/>
 <Input
 value={searchQuery}
 onChange={(e) => setSearchQuery(e.target.value)}
 placeholder="بحث سريع في الجدول..."
 className="h-10 pr-9 w-64 bg-background border-slate-200 dark:border-slate-800 rounded-xl text-xs font-bold"
 />
 <span className="absolute left-3 top-1/2 -translate-y-1/2 bg-primary/10 text-primary px-1.5 py-0.5 rounded text-3xs font-black">
 {filteredEntries.length}
 </span>
 </div>
 </div>

 {/* Data Table */}
 <div className="overflow-x-auto">
 <Table className="w-full text-right">
 <TableHeader className="bg-slate-50/50 dark:bg-slate-900/50">
 <TableRow>
 <TableHead className="py-3.5 px-4 w-28 text-xs font-black">رقم القيد</TableHead>
 <TableHead className="py-3.5 px-4 text-xs font-black">تاريخ القيد</TableHead>
 <TableHead className="py-3.5 px-4 text-center text-xs font-black">النوع</TableHead>
 <TableHead className="py-3.5 px-4 text-xs font-black">البيان والوصف</TableHead>
 <TableHead className="py-3.5 px-4 text-left text-xs font-black">القيمة الإجمالية</TableHead>
 <TableHead className="py-3.5 px-4 text-center w-28 text-xs font-black">معاينة</TableHead>
 </TableRow>
 </TableHeader>
 <TableBody>
 {filteredEntries.map((e) => (
 <TableRow key={e.id} className="transition-colors hover:bg-muted/40">
 <TableCell className="py-3.5 px-4 font-black text-primary">#{e.entry_no}</TableCell>
 <TableCell className="py-3.5 px-4 text-muted-foreground font-medium font-mono text-xs">
 {new Date(e.entry_date).toLocaleDateString('en-GB')}
 </TableCell>
 <TableCell className="py-3.5 px-4 text-center">
 <Badge variant="outline"className="text-3xs font-black">
 {entryTypeLabel(e.type)}
 </Badge>
 </TableCell>
 <TableCell className="py-3.5 px-4 text-foreground font-medium truncate max-w-xs text-xs">
 {e.description}
 </TableCell>
 <TableCell className="py-3.5 px-4 text-left font-black text-sm text-primary">
 {formatNumber(e.total_amount)} <span className="text-3xs opacity-70">ج.م</span>
 </TableCell>
 <TableCell className="py-3.5 px-4 text-center">
 <Button
 size="icon"
 variant="ghost"
 onClick={() => openDetails(e)}
 className="w-8 h-8 rounded-lg bg-primary/10 text-primary hover:bg-primary hover:text-white transition-all mx-auto"
 >
 <Eye className="w-4 h-4"/>
 </Button>
 </TableCell>
 </TableRow>
 ))}
 {filteredEntries.length === 0 && (
 <TableRow>
 <TableCell colSpan={6} className="py-16 text-center text-muted-foreground font-black text-sm">
 لا توجد قيود يومية مسجلة للعرض.
 </TableCell>
 </TableRow>
 )}
 </TableBody>
 </Table>
 </div>

 {/* Footer Bar */}
 <div className="p-4 bg-slate-50/20 dark:bg-slate-900/20 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-2xs font-bold text-muted-foreground">
 <div>عرض 1 إلى {filteredEntries.length} من إجمالي {entries.length} قيد</div>
 <div className="flex items-center gap-1.5">
 <Button variant="outline"size="sm"className="h-8 px-3 rounded-lg text-xs">« السابق</Button>
 <Button size="sm"className="h-8 px-3 rounded-lg text-xs font-black">1</Button>
 <Button variant="outline"size="sm"className="h-8 px-3 rounded-lg text-xs">التالي »</Button>
 </div>
 </div>
 </Card>

 {/* Details Dialog */}
 <Dialog open={isDetailsOpen && !!detailEntry} onOpenChange={(open) => !open && setIsDetailsOpen(false)}>
 <DialogContent className="max-w-2xl rounded-3xl p-6"dir="rtl">
 {detailEntry && (
 <div className="space-y-4">
 <DialogHeader>
 <DialogTitle className="text-base font-black text-foreground">
 تفاصيل قيد #{detailEntry.entry_no}
 </DialogTitle>
 <p className="text-xs text-muted-foreground mt-1">{detailEntry.description}</p>
 </DialogHeader>

 <div className="rounded-2xl border border-slate-100 dark:border-slate-800 overflow-hidden">
 <Table className="w-full text-right">
 <TableHeader className="bg-slate-50/70 dark:bg-slate-900/50">
 <TableRow>
 <TableHead className="py-3 px-4 text-xs font-black">الحساب</TableHead>
 <TableHead className="py-3 px-4 text-left w-28 text-xs font-black">مدين</TableHead>
 <TableHead className="py-3 px-4 text-left w-28 text-xs font-black">دائن</TableHead>
 </TableRow>
 </TableHeader>
 <TableBody>
 {detailLines.map((line) => (
 <TableRow key={line.id}>
 <TableCell className="py-3 px-4 text-xs font-medium">
 <span className="font-mono text-muted-foreground mr-2 font-bold">{line.accountCode}</span>
 {line.accountName}
 </TableCell>
 <TableCell className="py-3 px-4 text-left font-mono font-bold text-xs text-blue-600">
 {line.debit ? formatNumber(line.debit) :'-'}
 </TableCell>
 <TableCell className="py-3 px-4 text-left font-mono font-bold text-xs text-amber-600">
 {line.credit ? formatNumber(line.credit) :'-'}
 </TableCell>
 </TableRow>
 ))}
 </TableBody>
 <tfoot>
 <tr className="bg-slate-50 dark:bg-slate-900/60 border-t-2 border-slate-200 dark:border-slate-700 text-xs font-black">
 <td className="py-3 px-4">الإجمالي</td>
 <td className="py-3 px-4 text-left font-mono text-blue-700">
 {formatNumber(detailLines.reduce((s, l) => s + l.debit, 0))}
 </td>
 <td className="py-3 px-4 text-left font-mono text-amber-700">
 {formatNumber(detailLines.reduce((s, l) => s + l.credit, 0))}
 </td>
 </tr>
 </tfoot>
 </Table>
 </div>
 </div>
 )}
 </DialogContent>
 </Dialog>
 </div>
 </AppShell>
 );
}

function entryTypeLabel(type: JournalEntry['type']): string {
 const labels: Record<string, string> = {
 general:'قيد عام',
 sales:'مبيعات',
 purchases:'مشتريات',
 voucher:'سندات',
 expenses:'مصروفات',
 payroll:'رواتب',
 reversal:'قيد عكسي',
 closing:'إقفال',
 };
 return labels[type] ??'قيد عام';
}

function StatCard({
 label,
 value,
 icon,
 color,
 isNumber = false,
}: {
 label: string;
 value: number;
 icon: React.ReactNode;
 color:'blue'|'emerald'|'indigo'|'amber';
 isNumber?: boolean;
}) {
 const colorMap = {
 blue:'bg-blue-50 text-blue-600 dark:bg-blue-950/40 dark:text-blue-400',
 emerald:'bg-emerald-50 text-emerald-600 dark:bg-emerald-950/40 dark:text-emerald-400',
 indigo:'bg-indigo-50 text-indigo-600 dark:bg-indigo-950/40 dark:text-indigo-400',
 amber:'bg-amber-50 text-amber-600 dark:bg-amber-950/40 dark:text-amber-400',
 };

 return (
 <Card className="rounded-2xl border-slate-200/80 dark:border-slate-800 shadow-sm overflow-hidden">
 <CardContent className="p-5 flex items-center justify-between">
 <div className="flex items-center gap-4">
 <div className={`w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 ${colorMap[color]}`}>
 {icon}
 </div>
 <div>
 <span className="text-xs font-bold text-muted-foreground block mb-1">{label}</span>
 <span className="text-xl font-black text-foreground">
 {isNumber ? value : formatNumber(value)} {!isNumber && <span className="text-3xs font-bold mr-0.5">ج.م</span>}
 </span>
 </div>
 </div>
 </CardContent>
 </Card>
 );
}