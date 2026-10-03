'use client';

import React, { useCallback, useEffect, useState } from 'react';
import { AppShell } from '@/components/layout/AppShell';
import { KpiCard } from '@/components/ui/kpi-card';
import { Button } from '@/components/ui/button';
import { DatePicker } from '@/components/ui/date-picker';
import { Badge } from '@/components/ui/badge';
import { useSessionStore } from '@/core/state/useSessionStore';
import { formatNumber } from '@/lib/format';
import { toast } from 'sonner';
import { RefreshCw, Printer, Landmark, Scale, TrendingUp, ShieldCheck, AlertTriangle } from 'lucide-react';
import { getBalanceSheet, type BalanceSheetNode } from '@/modules/accounting/accounting_reports';

interface SectionProps {
  title: string;
  nodes: BalanceSheetNode[];
  total: number;
  colorClass: string;
}

export default function BalanceSheetPage() {
  const { currentUser } = useSessionStore();
  const orgId = currentUser?.org_id || '';

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

  const totalLiabilitiesEquity = data ? data.liabilitiesTotal + data.equityTotal + data.netIncome : 0;
  const balanced = data ? Math.abs(data.assetsTotal - totalLiabilitiesEquity) < 0.01 : false;

  const headerActions = (
    <div className="flex items-center gap-2">
      <Button
        variant="outline"
        onClick={() => window.print()}
        className="h-10 px-4 rounded-xl border-slate-200/80 dark:border-slate-800 font-bold text-xs gap-2 shadow-2xs hover:bg-slate-50 dark:hover:bg-slate-800"
      >
        <Printer className="w-4 h-4 text-slate-400" />
        <span>طباعة الميزانية</span>
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
      title="الميزانية العمومية"
      subtitle="المركز المالي للمنشأة (الأصول مقابل الخصوم وحقوق الملكية) حسب القيود المحاسبية المرحّلة"
      actions={headerActions}
    >
      <div className="space-y-5 text-right select-none" dir="rtl">
        {/* KPI Financial Overview Cards — Positioned at TOP */}
        {data && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
            <KpiCard
              label="إجمالي الأصول (Assets)"
              value={formatNumber(data.assetsTotal)}
              unit="ج.م"
              variant="blue"
              icon={<Landmark className="w-5 h-5" />}
            />
            <KpiCard
              label="الخصوم وحقوق الملكية"
              value={formatNumber(totalLiabilitiesEquity)}
              unit="ج.م"
              variant="indigo"
              icon={<Scale className="w-5 h-5" />}
            />
            <KpiCard
              label="صافي ربح الفترة"
              value={formatNumber(data.netIncome)}
              unit="ج.م"
              variant={data.netIncome >= 0 ? 'emerald' : 'rose'}
              icon={<TrendingUp className="w-5 h-5" />}
            />
            <KpiCard
              label="حالة توازن الميزانية"
              value={balanced ? 'متوازنة تماماً' : 'يوجد فارق توازن'}
              variant={balanced ? 'emerald' : 'rose'}
              icon={balanced ? <ShieldCheck className="w-5 h-5" /> : <AlertTriangle className="w-5 h-5" />}
            />
          </div>
        )}

        {/* Date Filter Toolbar */}
        <div className="bg-surface rounded-2xl border border-slate-200/80 dark:border-slate-800/80 p-3.5 shadow-2xs flex flex-wrap items-center justify-between gap-4 print:hidden">
          <div className="flex items-center gap-3">
            <label className="text-xs font-black text-slate-500 dark:text-slate-400">حتى تاريخ:</label>
            <DatePicker value={asOf} onChange={setAsOf} placeholder="حتى تاريخ اليوم..." className="w-48" />
          </div>

          <div
            className={`px-3.5 py-1.5 rounded-xl text-xs font-bold flex items-center gap-2 border ${
              balanced
                ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-400 border-emerald-200'
                : 'bg-rose-50 text-rose-700 dark:bg-rose-950/60 dark:text-rose-400 border-rose-200'
            }`}
          >
            <Scale className="w-4 h-4" />
            <span>{balanced ? 'الأصول = الخصوم + حقوق الملكية (متوازنة)' : 'تنبيه: فرق في توازن الميزانية'}</span>
          </div>
        </div>

        {/* Content Side-by-Side: Assets vs Liabilities & Equity */}
        {isLoading ? (
          <div className="py-24 flex flex-col items-center justify-center gap-3 bg-surface rounded-2xl border border-slate-200/80 dark:border-slate-800">
            <div className="w-8 h-8 border-3 border-primary border-t-transparent rounded-full animate-spin" />
            <span className="text-xs font-bold text-slate-400">جاري احتساب ومطابقة الميزانية العمومية...</span>
          </div>
        ) : data ? (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 items-start">
            {/* Right Column: Assets */}
            <div className="space-y-4">
              <Section
                title="الأصول (Assets)"
                nodes={data.assets}
                total={data.assetsTotal}
                colorClass="text-blue-600 dark:text-blue-400"
              />
            </div>

            {/* Left Column: Liabilities & Equity */}
            <div className="space-y-4">
              <Section
                title="الخصوم والالتزامات (Liabilities)"
                nodes={data.liabilities}
                total={data.liabilitiesTotal}
                colorClass="text-rose-600 dark:text-rose-400"
              />

              <Section
                title="حقوق الملكية والأرباح (Equity)"
                nodes={data.equity}
                total={data.equityTotal + data.netIncome}
                colorClass="text-indigo-600 dark:text-indigo-400"
              >
                <div className="flex items-center justify-between py-2.5 px-3 rounded-xl bg-purple-50/60 dark:bg-purple-950/30 border border-purple-200/60 dark:border-purple-900/40 mt-2">
                  <span className="text-xs font-bold text-purple-700 dark:text-purple-300">صافي أرباح الفترة</span>
                  <span className="text-xs font-mono font-black text-purple-700 dark:text-purple-300">
                    {formatNumber(data.netIncome)} ج.م
                  </span>
                </div>
              </Section>
            </div>
          </div>
        ) : null}
      </div>
    </AppShell>
  );
}

function Section({
  title,
  nodes,
  total,
  colorClass,
  children,
}: SectionProps & { children?: React.ReactNode }) {
  return (
    <div className="bg-surface rounded-2xl border border-slate-200/80 dark:border-slate-800/80 overflow-hidden shadow-2xs">
      <div className="px-5 py-3.5 border-b border-slate-100 dark:border-slate-800/80 flex items-center justify-between bg-slate-50/50 dark:bg-slate-900/40">
        <h3 className={`text-xs sm:text-sm font-black ${colorClass}`}>{title}</h3>
        <span className="text-xs sm:text-sm font-black font-mono text-foreground">
          {formatNumber(total)}{' '}
          <span className="text-3xs font-sans text-slate-400 font-normal">ج.م</span>
        </span>
      </div>
      <div className="p-3.5 space-y-1">
        {nodes.map((node) => (
          <NodeRow key={node.account.id} node={node} level={0} />
        ))}
        {nodes.length === 0 && (
          <div className="py-6 text-center text-xs font-bold text-slate-400">لا توجد أرصدة مسجلة</div>
        )}
        {children}
      </div>
    </div>
  );
}

function NodeRow({ node, level }: { node: BalanceSheetNode; level: number }) {
  return (
    <div className="space-y-0.5">
      <div
        className="flex items-center justify-between px-3 py-2 rounded-xl hover:bg-slate-50/80 dark:hover:bg-slate-900/40 transition-colors"
        style={{ paddingRight: 10 + level * 16 }}
      >
        <div className="flex items-center gap-2 truncate">
          <span className="font-mono text-3xs font-bold px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-500">
            #{node.account.code}
          </span>
          <span className="text-xs font-bold text-slate-700 dark:text-slate-300 truncate">
            {node.account.name}
          </span>
        </div>
        <span className="text-xs font-mono font-bold text-foreground">
          {formatNumber(node.amount)}{' '}
          <span className="text-4xs font-sans text-slate-400 font-normal">ج.م</span>
        </span>
      </div>
      {node.children.map((child) => (
        <NodeRow key={child.account.id} node={child} level={level + 1} />
      ))}
    </div>
  );
}
