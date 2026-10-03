'use client';

import React, { useCallback, useEffect, useState } from 'react';
import { AppShell } from '@/components/layout/AppShell';
import { Button } from '@/components/ui/button';
import { DatePicker } from '@/components/ui/date-picker';
import { KpiCard } from '@/components/ui/kpi-card';
import { EmptyState } from '@/components/ui/empty-state';
import { Badge } from '@/components/ui/badge';
import { useSessionStore } from '@/core/state/useSessionStore';
import { formatNumber } from '@/lib/format';
import { toast } from 'sonner';
import { RefreshCw, Scale, Printer, ShieldCheck, AlertTriangle, ArrowDownLeft, ArrowUpRight, Layers, FilterX } from 'lucide-react';
import { getTrialBalance, type TrialBalanceRow } from '@/modules/accounting/accounting_reports';

export default function TrialBalancePage() {
  const { currentUser } = useSessionStore();
  const orgId = currentUser?.org_id || '';

  const [rows, setRows] = useState<TrialBalanceRow[]>([]);
  const [totals, setTotals] = useState({ totalDebit: 0, totalCredit: 0 });
  const [isLoading, setIsLoading] = useState(true);
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');

  const loadData = useCallback(async () => {
    if (!orgId) return;
    try {
      setIsLoading(true);
      const res = await getTrialBalance(orgId, from || null, to || null);
      setRows(res.rows);
      setTotals({ totalDebit: res.totalDebit, totalCredit: res.totalCredit });
    } catch (err) {
      console.error('Trial balance error:', err);
      toast.error('حدث خطأ أثناء تحميل ميزان المراجعة');
    } finally {
      setIsLoading(false);
    }
  }, [orgId, from, to]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const difference = Math.abs(totals.totalDebit - totals.totalCredit);
  const balanced = difference < 0.01;

  const headerActions = (
    <div className="flex items-center gap-2">
      <Button
        variant="outline"
        onClick={() => window.print()}
        className="h-10 px-4 rounded-xl border-slate-200/80 dark:border-slate-800 font-bold text-xs gap-2 shadow-2xs hover:bg-slate-50 dark:hover:bg-slate-800"
      >
        <Printer className="w-4 h-4 text-slate-400" />
        <span>طباعة الميزان</span>
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
      title="ميزان المراجعة"
      subtitle="أرصدة كافة الحسابات المدينة والدائنة المستخرجة من قيود اليومية ومطابقة التوازن المحاسبي"
      actions={headerActions}
    >
      <div className="space-y-5 text-right select-none" dir="rtl">
        {/* KPI Financial Overview Cards — Linear / Stripe Style */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
          <KpiCard
            label="إجمالي الحركات المدينة (+)"
            value={formatNumber(totals.totalDebit)}
            unit="ج.م"
            variant="blue"
            icon={<ArrowDownLeft className="w-5 h-5" />}
          />
          <KpiCard
            label="إجمالي الحركات الدائنة (-)"
            value={formatNumber(totals.totalCredit)}
            unit="ج.م"
            variant="amber"
            icon={<ArrowUpRight className="w-5 h-5" />}
          />
          <KpiCard
            label="فارق التوازن"
            value={balanced ? '0.00' : formatNumber(difference)}
            unit="ج.م"
            variant={balanced ? 'emerald' : 'rose'}
            icon={balanced ? <ShieldCheck className="w-5 h-5" /> : <AlertTriangle className="w-5 h-5" />}
          />
          <KpiCard
            label="الحسابات النشطة"
            value={rows.length}
            unit="حساب مالي"
            variant="indigo"
            icon={<Layers className="w-5 h-5" />}
          />
        </div>

        {/* Date Filter & Balance Status Toolbar */}
        <div className="bg-surface rounded-2xl border border-slate-200/80 dark:border-slate-800/80 p-3.5 shadow-2xs flex flex-wrap items-center justify-between gap-4 print:hidden">
          <div className="flex flex-wrap items-end gap-3">
            <div className="flex flex-col gap-1">
              <label className="text-2xs font-black text-slate-500 dark:text-slate-400 pr-0.5">من تاريخ</label>
              <DatePicker value={from} onChange={setFrom} placeholder="من تاريخ..." className="w-40" />
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-2xs font-black text-slate-500 dark:text-slate-400 pr-0.5">إلى تاريخ</label>
              <DatePicker value={to} onChange={setTo} placeholder="إلى تاريخ..." className="w-40" />
            </div>
            {(from || to) && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setFrom('');
                  setTo('');
                }}
                className="h-10 px-3 rounded-xl text-xs font-bold text-slate-500 hover:text-rose-600 gap-1.5"
              >
                <FilterX className="w-3.5 h-3.5" />
                <span>إعادة ضبط</span>
              </Button>
            )}
          </div>

          <div
            className={`px-3.5 py-1.5 rounded-xl text-xs font-bold flex items-center gap-2 border ${
              balanced
                ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-400 border-emerald-200'
                : 'bg-rose-50 text-rose-700 dark:bg-rose-950/60 dark:text-rose-400 border-rose-200'
            }`}
          >
            <Scale className="w-4 h-4" />
            <span>{balanced ? 'الميزان متوازن (المدين = الدائن)' : `فارق ميزان غير متوازن (${formatNumber(difference)} ج.م)`}</span>
          </div>
        </div>

        {/* Trial Balance Table Container */}
        {isLoading ? (
          <div className="py-24 flex flex-col items-center justify-center gap-3 bg-surface rounded-2xl border border-slate-200/80 dark:border-slate-800">
            <div className="w-8 h-8 border-3 border-primary border-t-transparent rounded-full animate-spin" />
            <span className="text-xs font-bold text-slate-400">جاري احتساب ميزان المراجعة وتجميع القيود...</span>
          </div>
        ) : rows.length === 0 ? (
          <EmptyState
            icon={<Scale className="w-8 h-8 text-slate-400" />}
            title="لا توجد حركات محاسبية مرحّلة"
            description="لم يتم العثور على أي قيود يومية مسجلة خلال الفترة الزمنية المحددة."
            action={
              from || to
                ? {
                    label: 'مسح الفلتر',
                    onClick: () => {
                      setFrom('');
                      setTo('');
                    },
                  }
                : undefined
            }
          />
        ) : (
          <div className="bg-surface rounded-2xl border border-slate-200/80 dark:border-slate-800/80 overflow-hidden shadow-2xs">
            <div className="overflow-x-auto">
              <table className="w-full text-right border-collapse text-xs">
                <thead>
                  <tr className="bg-slate-50/80 dark:bg-slate-900/60 border-b border-slate-200/80 dark:border-slate-800 text-2xs font-black text-slate-500 uppercase tracking-wider">
                    <th className="py-3.5 px-4 w-24">الكود</th>
                    <th className="py-3.5 px-4">اسم الحساب</th>
                    <th className="py-3.5 px-4 text-left font-mono w-32">رصيد افتتاحي</th>
                    <th className="py-3.5 px-4 text-left font-mono w-32">حركة مدين (+)</th>
                    <th className="py-3.5 px-4 text-left font-mono w-32">حركة دائن (-)</th>
                    <th className="py-3.5 px-4 text-left font-mono w-32">الرصيد الختامي</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60 font-bold">
                  {rows.map((row) => (
                    <tr
                      key={row.account.id}
                      className="hover:bg-slate-50/70 dark:hover:bg-slate-900/40 transition-colors"
                    >
                      <td className="py-3 px-4 text-slate-400 font-mono text-3xs">
                        #{row.account.code}
                      </td>
                      <td className="py-3 px-4 text-foreground font-bold">
                        {row.account.name}
                      </td>
                      <td className="py-3 px-4 text-left font-mono text-slate-500">
                        {formatNumber(row.opening)}
                      </td>
                      <td className="py-3 px-4 text-left font-mono text-blue-600 dark:text-blue-400">
                        {row.periodDebit > 0 ? formatNumber(row.periodDebit) : '—'}
                      </td>
                      <td className="py-3 px-4 text-left font-mono text-amber-600 dark:text-amber-400">
                        {row.periodCredit > 0 ? formatNumber(row.periodCredit) : '—'}
                      </td>
                      <td className="py-3 px-4 text-left font-mono text-foreground font-black">
                        {formatNumber(row.closing)}{' '}
                        <span className="text-4xs font-sans text-slate-400 font-normal">ج.م</span>
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr className="bg-slate-50/90 dark:bg-slate-900/80 border-t-2 border-slate-200 dark:border-slate-700 text-xs font-black">
                    <td className="py-4 px-4 font-black text-foreground" colSpan={2}>
                      الإجمالي الكلي لميزان المراجعة
                    </td>
                    <td className="py-4 px-4 text-left font-mono text-slate-400">—</td>
                    <td className="py-4 px-4 text-left font-mono text-blue-600 dark:text-blue-400">
                      {formatNumber(totals.totalDebit)}{' '}
                      <span className="text-4xs font-sans text-slate-400 font-normal">ج.م</span>
                    </td>
                    <td className="py-4 px-4 text-left font-mono text-amber-600 dark:text-amber-400">
                      {formatNumber(totals.totalCredit)}{' '}
                      <span className="text-4xs font-sans text-slate-400 font-normal">ج.م</span>
                    </td>
                    <td className="py-4 px-4 text-left font-mono">
                      <span
                        className={`px-2 py-0.5 rounded-lg text-3xs font-mono font-black ${
                          balanced
                            ? 'bg-emerald-100 dark:bg-emerald-950/80 text-emerald-700 dark:text-emerald-300'
                            : 'bg-rose-100 dark:bg-rose-950/80 text-rose-700 dark:text-rose-300'
                        }`}
                      >
                        {balanced ? 'متوازن 0.00' : `فارق: ${formatNumber(difference)}`}
                      </span>
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>
        )}
      </div>
    </AppShell>
  );
}