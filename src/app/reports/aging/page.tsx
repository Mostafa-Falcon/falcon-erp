'use client';

import React, { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { AppShell } from '@/components/layout/AppShell';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { KpiCard } from '@/components/ui/kpi-card';
import { EmptyState } from '@/components/ui/empty-state';
import { useSessionStore } from '@/core/state/useSessionStore';
import { formatNumber } from '@/lib/format';
import { toast } from 'sonner';
import {
  RefreshCw,
  Printer,
  AlertTriangle,
  AlertCircle,
  Users,
  Truck,
  ExternalLink,
  Search,
  Wallet,
  Clock,
  History,
  X,
} from 'lucide-react';
import { getAgingReport, type AgingReport } from '@/modules/accounting/accounting_reports';

export default function AgingReportPage() {
  const { currentUser } = useSessionStore();
  const orgId = currentUser?.org_id || '';

  const [activeTab, setActiveTab] = useState<'receivables' | 'payables'>('receivables');
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

  const headerActions = (
    <div className="flex items-center gap-2">
      <Button
        variant="outline"
        onClick={() => window.print()}
        className="h-10 px-4 rounded-xl border-slate-200/80 dark:border-slate-800 font-bold text-xs gap-2 shadow-2xs hover:bg-slate-50 dark:hover:bg-slate-800"
      >
        <Printer className="w-4 h-4 text-slate-400" />
        <span>طباعة التقرير</span>
      </Button>
      <Button
        onClick={loadData}
        className="h-10 px-4 bg-primary hover:bg-primary/90 text-white rounded-xl font-bold text-xs gap-2 shadow-xs hover:shadow-md transition-all cursor-pointer"
      >
        <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
        <span>تحديث</span>
      </Button>
    </div>
  );

  return (
    <AppShell
      title="تقرير أعمار الديون"
      subtitle="تحليل الفترات الزمنية لمديونيات العملاء ومستحقات الموردين وتصنيف الديون الراكدة"
      actions={headerActions}
    >
      <div className="space-y-5 text-right select-none" dir="rtl">
        {/* KPI Financial Overview Cards — Linear / Stripe Style */}
        {data && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3.5">
            <KpiCard
              label="إجمالي الأرصدة القائمة"
              value={formatNumber(data.totals.totalBalance)}
              unit="ج.م"
              variant="blue"
              icon={<Wallet className="w-5 h-5" />}
            />
            <KpiCard
              label="0 - 30 يوم (حالي)"
              value={formatNumber(data.totals.current0_30)}
              unit="ج.م"
              variant="emerald"
              icon={<Clock className="w-5 h-5" />}
            />
            <KpiCard
              label="31 - 60 يوم"
              value={formatNumber(data.totals.days31_60)}
              unit="ج.م"
              variant="indigo"
              icon={<History className="w-5 h-5" />}
            />
            <KpiCard
              label="61 - 90 يوم"
              value={formatNumber(data.totals.days61_90)}
              unit="ج.م"
              variant="amber"
              icon={<AlertCircle className="w-5 h-5" />}
            />
            <KpiCard
              label="أكثر من 90 يوم (+90)"
              value={formatNumber(data.totals.days90Plus)}
              unit="ج.م"
              variant={data.totals.days90Plus > 0 ? 'rose' : 'slate'}
              icon={<AlertTriangle className="w-5 h-5" />}
            />
          </div>
        )}

        {/* Unified Toolbar: Switcher & Search Bar */}
        <div className="bg-surface rounded-2xl border border-slate-200/80 dark:border-slate-800/80 p-3.5 shadow-2xs flex flex-col sm:flex-row items-center justify-between gap-3 print:hidden">
          {/* Switcher Tab */}
          <Tabs
            value={activeTab}
            onValueChange={(val) => setActiveTab(val as 'receivables' | 'payables')}
            className="w-full sm:w-auto"
          >
            <TabsList className="grid grid-cols-2 w-full sm:w-80 h-10 p-1 bg-slate-100 dark:bg-slate-900 rounded-xl">
              <TabsTrigger
                value="receivables"
                className="rounded-lg text-xs font-bold data-[state=active]:bg-surface data-[state=active]:text-primary data-[state=active]:shadow-xs gap-1.5"
              >
                <Users className="w-3.5 h-3.5" />
                <span>مديونيات العملاء (AR)</span>
              </TabsTrigger>
              <TabsTrigger
                value="payables"
                className="rounded-lg text-xs font-bold data-[state=active]:bg-surface data-[state=active]:text-amber-600 data-[state=active]:shadow-xs gap-1.5"
              >
                <Truck className="w-3.5 h-3.5" />
                <span>مستحقات الموردين (AP)</span>
              </TabsTrigger>
            </TabsList>
          </Tabs>

          {/* Search Input */}
          <div className="relative w-full sm:w-80">
            <Search className="w-4 h-4 text-slate-400 absolute right-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="بحث بالاسم أو رقم الهاتف..."
              className="h-10 pr-10 pl-9 rounded-xl text-xs font-medium bg-slate-50/70 dark:bg-slate-900/70 border-slate-200/80 dark:border-slate-800"
            />
            {search && (
              <button
                onClick={() => setSearch('')}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>

        {/* Data Table Container */}
        {isLoading ? (
          <div className="py-24 flex flex-col items-center justify-center gap-3 bg-surface rounded-2xl border border-slate-200/80 dark:border-slate-800">
            <div className="w-8 h-8 border-3 border-primary border-t-transparent rounded-full animate-spin" />
            <span className="text-xs font-bold text-slate-400">جاري احتساب أعمار الديون والمستحقات...</span>
          </div>
        ) : filteredRows.length === 0 ? (
          <EmptyState
            icon={<Users className="w-8 h-8 text-slate-400" />}
            title="لا توجد ديون مسجلة في هذا التصنيف"
            description={
              search
                ? 'لا توجد نتائج تطابق عبارة البحث الحالية.'
                : activeTab === 'receivables'
                ? 'كافة العملاء مسددين لمديونياتهم، ولا توجد أرصدة متأخرة حالياً.'
                : 'لا توجد مستحقات أو ديون قائمة للموردين مسجلة بالنظام.'
            }
            action={
              search
                ? {
                    label: 'إلغاء البحث',
                    onClick: () => setSearch(''),
                  }
                : undefined
            }
          />
        ) : (
          <div className="bg-surface rounded-2xl border border-slate-200/80 dark:border-slate-800/80 overflow-hidden shadow-2xs">
            <div className="overflow-x-auto">
              <Table className="w-full text-xs text-right">
                <TableHeader className="bg-slate-50/80 dark:bg-slate-900/60 border-b border-slate-200/80 dark:border-slate-800">
                  <TableRow>
                    <TableHead className="py-3.5 px-4 text-xs font-black">
                      {activeTab === 'receivables' ? 'اسم العميل' : 'اسم المورد'}
                    </TableHead>
                    <TableHead className="py-3.5 px-4 text-center font-mono text-xs font-black">
                      0 - 30 يوم
                    </TableHead>
                    <TableHead className="py-3.5 px-4 text-center font-mono text-xs font-black">
                      31 - 60 يوم
                    </TableHead>
                    <TableHead className="py-3.5 px-4 text-center font-mono text-xs font-black">
                      61 - 90 يوم
                    </TableHead>
                    <TableHead className="py-3.5 px-4 text-center font-mono text-xs font-black">
                      90+ يوم
                    </TableHead>
                    <TableHead className="py-3.5 px-4 text-left font-mono text-xs font-black">
                      إجمالي المديونية
                    </TableHead>
                    <TableHead className="py-3.5 px-4 text-center print:hidden text-xs font-black">
                      الإجراءات
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody className="divide-y divide-slate-100 dark:divide-slate-800/60">
                  {filteredRows.map((row) => (
                    <TableRow key={row.contactId} className="hover:bg-slate-50/60 dark:hover:bg-slate-900/40 transition-colors">
                      <TableCell className="py-3 px-4">
                        <span className="font-bold text-foreground block">{row.contactName}</span>
                        {row.contactPhone && (
                          <span className="text-3xs font-mono text-muted-foreground block mt-0.5" dir="ltr">
                            {row.contactPhone}
                          </span>
                        )}
                      </TableCell>
                      <TableCell className="py-3 px-4 text-center font-mono text-emerald-600 dark:text-emerald-400 font-bold">
                        {row.current0_30 > 0 ? formatNumber(row.current0_30) : '—'}
                      </TableCell>
                      <TableCell className="py-3 px-4 text-center font-mono text-blue-600 dark:text-blue-400 font-bold">
                        {row.days31_60 > 0 ? formatNumber(row.days31_60) : '—'}
                      </TableCell>
                      <TableCell className="py-3 px-4 text-center font-mono text-amber-600 dark:text-amber-400 font-bold">
                        {row.days61_90 > 0 ? formatNumber(row.days61_90) : '—'}
                      </TableCell>
                      <TableCell className="py-3 px-4 text-center font-mono text-rose-600 font-black">
                        {row.days90Plus > 0 ? (
                          <Badge variant="outline" className="bg-rose-50 text-rose-700 dark:bg-rose-950/60 dark:text-rose-400 border-rose-200">
                            {formatNumber(row.days90Plus)}
                          </Badge>
                        ) : (
                          '—'
                        )}
                      </TableCell>
                      <TableCell className="py-3 px-4 text-left font-mono font-black text-foreground">
                        {formatNumber(row.totalBalance)}{' '}
                        <span className="text-3xs font-sans font-normal text-muted-foreground">ج.م</span>
                      </TableCell>
                      <TableCell className="py-3 px-4 text-center print:hidden">
                        <Link
                          href={`/contacts/${activeTab === 'receivables' ? 'customers' : 'suppliers'}?id=${row.contactId}`}
                          className="inline-flex items-center gap-1.5 text-xs font-bold text-primary hover:underline px-2.5 py-1 rounded-lg hover:bg-primary/10 transition-colors"
                        >
                          <ExternalLink className="w-3.5 h-3.5" />
                          <span>كشف الحساب</span>
                        </Link>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </div>
        )}
      </div>
    </AppShell>
  );
}