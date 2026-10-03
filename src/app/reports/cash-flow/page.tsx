'use client';

import React, { useCallback, useEffect, useState } from 'react';
import { AppShell } from '@/components/layout/AppShell';
import { Button } from '@/components/ui/button';
import { DatePicker } from '@/components/ui/date-picker';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { KpiCard } from '@/components/ui/kpi-card';
import { useSessionStore } from '@/core/state/useSessionStore';
import { formatNumber } from '@/lib/format';
import { toast } from 'sonner';
import {
  RefreshCw,
  Printer,
  Coins,
  ArrowUpRight,
  ArrowDownLeft,
  Briefcase,
  Building2,
  Wallet,
  Activity,
  CheckCircle2,
  FilterX,
} from 'lucide-react';
import { getCashFlowStatement, type CashFlowStatement } from '@/modules/accounting/accounting_reports';

export default function CashFlowReportPage() {
  const { currentUser } = useSessionStore();
  const orgId = currentUser?.org_id || '';

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
      console.error('Cash flow statement error:', err);
      toast.error('حدث خطأ أثناء تحميل قائمة التدفقات النقدية');
    } finally {
      setIsLoading(false);
    }
  }, [orgId, from, to]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const headerActions = (
    <div className="flex items-center gap-2">
      <Button
        variant="outline"
        onClick={() => window.print()}
        className="h-10 px-4 rounded-xl border-slate-200/80 dark:border-slate-800 font-bold text-xs gap-2 shadow-2xs hover:bg-slate-50 dark:hover:bg-slate-800"
      >
        <Printer className="w-4 h-4 text-slate-400" />
        <span>طباعة القائمة</span>
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
      title="قائمة التدفقات النقدية"
      subtitle="حركة السيولة النقدية الفعلية للمنشأة عبر الأنشطة التشغيلية والاستثمارية والتمويلية"
      actions={headerActions}
    >
      <div className="space-y-5 text-right select-none" dir="rtl">
        {/* KPI Financial Overview Cards — Linear / Stripe Style */}
        {data && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3.5">
            <KpiCard
              label="نقدية أول المدة"
              value={formatNumber(data.openingCash)}
              unit="ج.م"
              variant="slate"
              icon={<Wallet className="w-5 h-5" />}
            />
            <KpiCard
              label="تدفقات تشغيلية"
              value={formatNumber(data.operating.total)}
              unit="ج.م"
              variant={data.operating.total >= 0 ? 'emerald' : 'rose'}
              icon={<Briefcase className="w-5 h-5" />}
            />
            <KpiCard
              label="تدفقات استثمارية"
              value={formatNumber(data.investing.total)}
              unit="ج.م"
              variant={data.investing.total >= 0 ? 'blue' : 'rose'}
              icon={<Building2 className="w-5 h-5" />}
            />
            <KpiCard
              label="تدفقات تمويلية"
              value={formatNumber(data.financing.total)}
              unit="ج.م"
              variant={data.financing.total >= 0 ? 'indigo' : 'rose'}
              icon={<Coins className="w-5 h-5" />}
            />
            <KpiCard
              label="نقدية آخر المدة"
              value={formatNumber(data.closingCash)}
              unit="ج.م"
              variant="sky"
              icon={<Activity className="w-5 h-5" />}
            />
          </div>
        )}

        {/* Date Filter Toolbar */}
        <div className="bg-surface rounded-2xl border border-slate-200/80 dark:border-slate-800/80 p-3.5 shadow-2xs flex flex-wrap items-end gap-3 print:hidden">
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
              <span>إعادة ضبط الفلتر</span>
            </Button>
          )}
        </div>

        {/* Detailed Activities Sections */}
        {isLoading ? (
          <div className="py-24 flex flex-col items-center justify-center gap-3 bg-surface rounded-2xl border border-slate-200/80 dark:border-slate-800">
            <div className="w-8 h-8 border-3 border-primary border-t-transparent rounded-full animate-spin" />
            <span className="text-xs font-bold text-slate-400">جاري احتساب التدفقات النقدية ومطابقة الحسابات...</span>
          </div>
        ) : data ? (
          <div className="space-y-4">
            <SectionBlock
              title="1. التدفقات النقدية من الأنشطة التشغيلية (Operating Activities)"
              description="صافي المقبوضات والمدفوعات الناتجة عن النشاط التجاري الأساسي والمصروفات اليومية"
              category={data.operating}
              color="emerald"
            />
            <SectionBlock
              title="2. التدفقات النقدية من الأنشطة الاستثمارية (Investing Activities)"
              description="حركات بيع وشراء الأصول الثابتة والمعدات والاستثمارات طويلة الأجل"
              category={data.investing}
              color="blue"
            />
            <SectionBlock
              title="3. التدفقات النقدية من الأنشطة التمويلية (Financing Activities)"
              description="حركات رأس المال والقروض وحصص الشركاء وتوزيعات الأرباح"
              category={data.financing}
              color="indigo"
            />

            {/* Final Cash Reconciliation Summary Card */}
            <div className="bg-surface rounded-2xl border border-slate-200/80 dark:border-slate-800/80 shadow-2xs overflow-hidden">
              <div className="px-5 py-3.5 border-b border-slate-100 dark:border-slate-800/80 flex items-center justify-between bg-slate-50/50 dark:bg-slate-900/40">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-primary" />
                  <h4 className="text-xs sm:text-sm font-black text-foreground">
                    مطابقة صافي حركة النقدية وما في حكمها
                  </h4>
                </div>
                <Badge variant="outline" className="font-mono text-3xs font-bold border-slate-300">
                  الفترة المالية
                </Badge>
              </div>

              <div className="p-5 space-y-3 text-xs font-bold">
                <div className="flex justify-between items-center py-1">
                  <span className="text-slate-600 dark:text-slate-400">رصيد النقدية والودائع في بداية الفترة</span>
                  <span className="font-mono text-foreground font-black text-sm">
                    {formatNumber(data.openingCash)}{' '}
                    <span className="text-3xs font-sans text-slate-400 font-bold">ج.م</span>
                  </span>
                </div>

                <div className="flex justify-between items-center py-1 border-t border-slate-100 dark:border-slate-800/60 pt-2.5">
                  <span className="text-slate-600 dark:text-slate-400">
                    صافي التغير في النقدية خلال الفترة (+/-)
                  </span>
                  <span
                    className={`font-mono font-black text-sm ${
                      data.netCashFlow >= 0
                        ? 'text-emerald-600 dark:text-emerald-400'
                        : 'text-rose-600 dark:text-rose-400'
                    }`}
                  >
                    {data.netCashFlow >= 0 ? '+' : ''}
                    {formatNumber(data.netCashFlow)}{' '}
                    <span className="text-3xs font-sans text-slate-400 font-bold">ج.م</span>
                  </span>
                </div>

                <div className="flex justify-between items-center py-3 border-t-2 border-slate-200 dark:border-slate-700 text-sm font-black text-foreground bg-slate-50/60 dark:bg-slate-900/50 px-3 rounded-xl mt-2">
                  <span className="font-black text-foreground">رصيد النقدية وما يعادلها في نهاية الفترة</span>
                  <span className="font-mono text-primary text-base font-black">
                    {formatNumber(data.closingCash)}{' '}
                    <span className="text-2xs font-sans text-slate-400 font-bold">ج.م</span>
                  </span>
                </div>
              </div>
            </div>
          </div>
        ) : null}
      </div>
    </AppShell>
  );
}

function SectionBlock({
  title,
  description,
  category,
  color,
}: {
  title: string;
  description?: string;
  category: { title: string; items: { description: string; amount: number }[]; total: number };
  color: 'emerald' | 'blue' | 'indigo';
}) {
  const badgeColors = {
    emerald: 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-400 border-emerald-200',
    blue: 'bg-blue-50 text-blue-700 dark:bg-blue-950/60 dark:text-blue-400 border-blue-200',
    indigo: 'bg-indigo-50 text-indigo-700 dark:bg-indigo-950/60 dark:text-indigo-400 border-indigo-200',
  }[color];

  return (
    <div className="bg-surface rounded-2xl border border-slate-200/80 dark:border-slate-800/80 shadow-2xs overflow-hidden">
      <div className="px-5 py-3.5 border-b border-slate-100 dark:border-slate-800/80 flex flex-col sm:flex-row sm:items-center justify-between gap-2 bg-slate-50/40 dark:bg-slate-900/30">
        <div>
          <h4 className="text-xs sm:text-sm font-black text-foreground">{title}</h4>
          {description && <p className="text-3xs text-muted-foreground mt-0.5">{description}</p>}
        </div>
        <Badge variant="outline" className={`px-2.5 py-1 text-xs font-black font-mono self-start sm:self-center ${badgeColors}`}>
          {category.total >= 0 ? '+' : ''}
          {formatNumber(category.total)} ج.م
        </Badge>
      </div>
      <div className="p-3.5 space-y-1">
        {category.items.map((it, idx) => (
          <div
            key={idx}
            className="flex items-center justify-between px-3 py-2 rounded-xl text-xs hover:bg-slate-50/60 dark:hover:bg-slate-900/40 transition-colors"
          >
            <div className="flex items-center gap-2">
              <div className="w-1.5 h-1.5 rounded-full bg-slate-300 dark:bg-slate-700" />
              <span className="font-bold text-slate-700 dark:text-slate-300">{it.description}</span>
            </div>
            <span
              className={`font-mono font-bold text-xs ${
                it.amount >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'
              }`}
            >
              {it.amount >= 0 ? '+' : ''}
              {formatNumber(it.amount)}{' '}
              <span className="text-4xs font-sans text-slate-400 font-bold">ج.م</span>
            </span>
          </div>
        ))}
        {category.items.length === 0 && (
          <div className="py-6 text-center text-xs text-slate-400 font-bold">
            لا توجد حركات مسجلة لهذه الفئة خلال الفترة المحددة.
          </div>
        )}
      </div>
    </div>
  );
}