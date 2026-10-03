'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { AppShell } from '@/components/layout/AppShell';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useSessionStore } from '@/core/state/useSessionStore';
import { formatNumber } from '@/lib/format';
import { toast } from 'sonner';
import {
  RefreshCw,
  Printer,
  FileSpreadsheet,
  Search,
  Eye,
  FileDown,
  Calendar,
  BookOpen,
  TrendingUp,
  History,
  Layers,
  X,
} from 'lucide-react';
import type { JournalEntry, JournalEntryLine, Account } from '@/types';
import { AccountingRepository } from '@/modules/accounting/accounting_repository';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { KpiCard } from '@/components/ui/kpi-card';
import { EmptyState } from '@/components/ui/empty-state';

export default function JournalEntriesPage() {
  const { currentUser } = useSessionStore();
  const orgId = currentUser?.org_id || '';

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
          return { ...line, accountName: acc?.name ?? '-', accountCode: acc?.code ?? '-' };
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
      const matchesType = typeFilter === 'all' || e.type === typeFilter;
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
    <Button
      onClick={() => toast.info('جاري تصدير دفتر اليومية إلى PDF...')}
      className="h-10 px-4 bg-primary hover:bg-primary/90 text-white rounded-xl font-bold text-xs flex items-center gap-2 shadow-xs hover:shadow-md transition-all cursor-pointer"
    >
      <FileDown className="w-4 h-4" />
      <span>تصدير PDF</span>
    </Button>
  );

  return (
    <AppShell
      title="قيود اليومية العامة"
      subtitle="سجل الحركات المالية المزدوجة لكافة عمليات المنشأة لضمان الشفافية والرقابة المحاسبية"
      actions={headerActions}
    >
      <div className="space-y-5 text-right" dir="rtl">
        {/* Summary Metric Cards — Linear/Stripe Style */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <KpiCard
            label="إجمالي القيود"
            value={stats.totalCount}
            unit="قيد مسجل"
            variant="blue"
            icon={<BookOpen className="w-5 h-5" />}
          />
          <KpiCard
            label="إجمالي الحركات المالية"
            value={formatNumber(stats.totalVolume)}
            unit="ج.م"
            variant="emerald"
            icon={<TrendingUp className="w-5 h-5" />}
          />
          <KpiCard
            label="قيود اليوم"
            value={stats.todayCount}
            unit="عملية اليوم"
            variant="indigo"
            icon={<History className="w-5 h-5" />}
          />
          <KpiCard
            label="قيود هذا الشهر"
            value={stats.monthCount}
            unit="قيد هذا الشهر"
            variant="amber"
            icon={<Calendar className="w-5 h-5" />}
          />
        </div>

        {/* Unified Modern Toolbar */}
        <div className="flex flex-wrap items-center justify-between gap-3 bg-surface border border-slate-200/80 dark:border-slate-800/80 p-3.5 rounded-2xl shadow-2xs">
          {/* Right: Search & Type Filter */}
          <div className="flex flex-wrap items-center gap-2.5 flex-1 min-w-[280px]">
            <div className="relative flex-1 max-w-sm">
              <Input
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="بحث برقم القيد أو البيان..."
                className="h-10 pr-9 pl-9 bg-slate-50/70 dark:bg-slate-900/70 text-xs font-semibold rounded-xl border-slate-200/80 dark:border-slate-800"
                icon={<Search className="w-4 h-4 text-slate-400" />}
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            <div className="w-40">
              <Select value={typeFilter} onValueChange={setTypeFilter}>
                <SelectTrigger className="w-full h-10 rounded-xl bg-slate-50/70 dark:bg-slate-900/70 border-slate-200/80 dark:border-slate-800 text-xs font-bold">
                  <SelectValue placeholder="نوع القيد" />
                </SelectTrigger>
                <SelectContent className="z-50 bg-popover border border-slate-200 dark:border-slate-800 rounded-xl shadow-xl">
                  <SelectItem value="all">كل الأنواع</SelectItem>
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

            {typeFilter !== 'all' && (
              <Button
                variant="ghost"
                onClick={() => setTypeFilter('all')}
                className="h-10 px-2.5 text-xs font-bold text-slate-500 hover:text-destructive"
              >
                إعادة تعيين
              </Button>
            )}
          </div>

          {/* Left: Quick Actions & Page Size */}
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="icon"
              onClick={loadData}
              className="h-10 w-10 rounded-xl border-slate-200/80 dark:border-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 cursor-pointer shadow-2xs"
              title="تحديث البيانات"
            >
              <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
            </Button>
            <Button
              variant="outline"
              size="icon"
              onClick={() => window.print()}
              className="h-10 w-10 rounded-xl border-slate-200/80 dark:border-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 cursor-pointer shadow-2xs"
              title="طباعة"
            >
              <Printer className="w-4 h-4" />
            </Button>
            <Button
              variant="outline"
              size="icon"
              onClick={() => toast.info('جاري تصدير التقرير إلى Excel...')}
              className="h-10 w-10 rounded-xl border-slate-200/80 dark:border-slate-800 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-950/40 cursor-pointer shadow-2xs"
              title="تصدير Excel"
            >
              <FileSpreadsheet className="w-4 h-4" />
            </Button>

            <div className="h-6 w-px bg-slate-200 dark:bg-slate-800 mx-1" />

            <div className="flex items-center gap-1.5 text-2xs font-bold text-slate-500">
              <span className="hidden sm:inline">عرض</span>
              <Select value={pageSize} onValueChange={setPageSize}>
                <SelectTrigger className="w-20 h-10 rounded-xl bg-slate-50/70 dark:bg-slate-900/70 border-slate-200/80 dark:border-slate-800 text-xs font-bold">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="z-50 bg-popover border border-slate-200 dark:border-slate-800 rounded-xl shadow-xl">
                  <SelectItem value="25">25</SelectItem>
                  <SelectItem value="50">50</SelectItem>
                  <SelectItem value="100">100</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>

        {/* Data Table Container */}
        <Card className="rounded-2xl border border-slate-200/80 dark:border-slate-800 bg-surface overflow-hidden shadow-2xs">
          <CardContent className="p-0">
            {isLoading ? (
              <div className="py-16 text-center text-xs font-bold text-slate-400">
                جارٍ تحميل قيود اليومية...
              </div>
            ) : filteredEntries.length === 0 ? (
              <EmptyState
                icon={<BookOpen className="w-7 h-7 text-slate-400" />}
                title="لا توجد قيود يومية مسجلة"
                description={
                  searchQuery || typeFilter !== 'all'
                    ? 'لم يتم العثور على أي قيود تطابق معايير البحث والتصفية المحددة.'
                    : 'سجل القيود فارغ حالياً. يتم إنشاء القيود المحاسبية تلقائياً مع العمليات أو يدوياً.'
                }
                className="border-none bg-transparent py-16"
              />
            ) : (
              <div className="overflow-x-auto">
                <Table className="w-full text-right">
                  <TableHeader>
                    <TableRow>
                      <TableHead className="py-3.5 pr-5 w-32">رقم القيد</TableHead>
                      <TableHead className="py-3.5">تاريخ القيد</TableHead>
                      <TableHead className="py-3.5 text-center">النوع</TableHead>
                      <TableHead className="py-3.5">البيان والوصف</TableHead>
                      <TableHead className="py-3.5 text-left">القيمة الإجمالية</TableHead>
                      <TableHead className="py-3.5 pl-5 text-center w-24">معاينة</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredEntries.map((e) => (
                      <TableRow key={e.id} className="transition-colors hover:bg-slate-50/70 dark:hover:bg-slate-800/40">
                        <TableCell className="py-3.5 pr-5 font-black text-primary font-mono text-xs">
                          #{e.entry_no}
                        </TableCell>
                        <TableCell className="py-3.5 text-muted-foreground font-semibold text-xs">
                          {new Date(e.entry_date).toLocaleDateString('ar-EG', {
                            year: 'numeric',
                            month: 'short',
                            day: 'numeric',
                          })}
                        </TableCell>
                        <TableCell className="py-3.5 text-center">
                          <Badge
                            variant="outline"
                            className="bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700 text-3xs font-extrabold rounded-lg px-2.5 py-0.5"
                          >
                            {entryTypeLabel(e.type)}
                          </Badge>
                        </TableCell>
                        <TableCell className="py-3.5 text-foreground font-medium truncate max-w-sm text-xs">
                          {e.description}
                        </TableCell>
                        <TableCell className="py-3.5 text-left font-black text-xs sm:text-sm text-slate-900 dark:text-white tabular-nums">
                          {formatNumber(e.total_amount)} <span className="text-3xs font-semibold text-slate-400">ج.م</span>
                        </TableCell>
                        <TableCell className="py-3.5 pl-5 text-center">
                          <Button
                            size="icon"
                            variant="ghost"
                            onClick={() => openDetails(e)}
                            className="w-8 h-8 rounded-lg bg-primary/10 text-primary hover:bg-primary hover:text-white transition-all mx-auto cursor-pointer"
                            title="عرض تفاصيل القيد"
                          >
                            <Eye className="w-4 h-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>

                {/* Footer Bar */}
                <div className="p-4 bg-slate-50/50 dark:bg-slate-900/40 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-2xs font-semibold text-muted-foreground">
                  <div>
                    عرض <span className="font-bold text-foreground">{filteredEntries.length}</span> من إجمالي{' '}
                    <span className="font-bold text-foreground">{entries.length}</span> قيد
                  </div>
                  <div className="flex items-center gap-1.5">
                    <Button variant="outline" size="sm" className="h-8 px-3 rounded-lg text-xs font-bold cursor-pointer">
                      السابق
                    </Button>
                    <Button size="sm" className="h-8 px-3 rounded-lg text-xs font-black bg-primary text-white">
                      1
                    </Button>
                    <Button variant="outline" size="sm" className="h-8 px-3 rounded-lg text-xs font-bold cursor-pointer">
                      التالي
                    </Button>
                  </div>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Details Dialog */}
        <Dialog open={isDetailsOpen && !!detailEntry} onOpenChange={(open) => !open && setIsDetailsOpen(false)}>
          <DialogContent className="max-w-2xl rounded-2xl p-6" dir="rtl">
            {detailEntry && (
              <div className="space-y-4">
                <DialogHeader>
                  <div className="flex items-center justify-between">
                    <DialogTitle className="text-base font-black text-foreground">
                      تفاصيل قيد رقم #{detailEntry.entry_no}
                    </DialogTitle>
                    <Badge variant="outline" className="text-3xs font-black">
                      {entryTypeLabel(detailEntry.type)}
                    </Badge>
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">{detailEntry.description}</p>
                </DialogHeader>

                <div className="rounded-xl border border-slate-200/80 dark:border-slate-800 overflow-hidden shadow-2xs">
                  <Table className="w-full text-right">
                    <TableHeader className="bg-slate-50/80 dark:bg-slate-900/60">
                      <TableRow>
                        <TableHead className="py-3 px-4 text-xs font-black">الحساب</TableHead>
                        <TableHead className="py-3 px-4 text-left w-32 text-xs font-black">مدين</TableHead>
                        <TableHead className="py-3 px-4 text-left w-32 text-xs font-black">دائن</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {detailLines.map((line) => (
                        <TableRow key={line.id} className="border-b border-slate-100 dark:border-slate-800/60">
                          <TableCell className="py-3 px-4 text-xs font-medium">
                            <span className="font-mono text-muted-foreground mr-2 font-bold">{line.accountCode}</span>
                            {line.accountName}
                          </TableCell>
                          <TableCell className="py-3 px-4 text-left font-mono font-bold text-xs text-blue-600 dark:text-blue-400">
                            {line.debit ? `${formatNumber(line.debit)} ج.م` : '—'}
                          </TableCell>
                          <TableCell className="py-3 px-4 text-left font-mono font-bold text-xs text-amber-600 dark:text-amber-400">
                            {line.credit ? `${formatNumber(line.credit)} ج.م` : '—'}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                    <tfoot>
                      <tr className="bg-slate-50 dark:bg-slate-900/80 border-t-2 border-slate-200 dark:border-slate-700 text-xs font-black">
                        <td className="py-3 px-4 text-foreground">الإجمالي المتوازن</td>
                        <td className="py-3 px-4 text-left font-mono text-blue-700 dark:text-blue-300">
                          {formatNumber(detailLines.reduce((s, l) => s + l.debit, 0))} ج.م
                        </td>
                        <td className="py-3 px-4 text-left font-mono text-amber-700 dark:text-amber-300">
                          {formatNumber(detailLines.reduce((s, l) => s + l.credit, 0))} ج.م
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
    general: 'قيد عام',
    sales: 'مبيعات',
    purchases: 'مشتريات',
    voucher: 'سندات',
    expenses: 'مصروفات',
    payroll: 'رواتب',
    reversal: 'قيد عكسي',
    closing: 'إقفال',
  };
  return labels[type] ?? 'قيد عام';
}