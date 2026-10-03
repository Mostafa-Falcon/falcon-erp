'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { AppShell } from '@/components/layout/AppShell';
import { Button } from '@/components/ui/button';
import { KpiCard } from '@/components/ui/kpi-card';
import { DatePicker } from '@/components/ui/date-picker';
import { useSessionStore } from '@/core/state/useSessionStore';
import { SalesRepository } from '@/modules/sales/sales_repository';
import { TreasuryRepository } from '@/modules/treasury/treasury_repository';
import { formatNumber } from '@/lib/format';
import {
  RefreshCw,
  Printer,
  TrendingUp,
  ArrowUpRight,
  ArrowDownRight,
  DollarSign,
  PieChart,
  Truck,
  Layers,
  CheckCircle2,
  FileText,
  Calendar,
  X
} from 'lucide-react';
import type { SalesInvoice, SalesInvoiceItem, SalesReturn, Expense, ExpenseCategory } from '@/types';

export default function ProfitsReportPage() {
  const { currentUser } = useSessionStore();
  const orgId = currentUser?.org_id || '';

  const [invoices, setInvoices] = useState<SalesInvoice[]>([]);
  const [items, setItems] = useState<SalesInvoiceItem[]>([]);
  const [returns, setReturns] = useState<SalesReturn[]>([]);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [expenseCategories, setExpenseCategories] = useState<ExpenseCategory[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Date filters
  const [fromDate, setFromDate] = useState<string>('');
  const [toDate, setToDate] = useState<string>('');

  const loadData = async () => {
    if (!orgId) return;
    try {
      setIsLoading(true);
      const { db } = await import('@/core/db/app_database');
      const [inv, ret, exps, cats] = await Promise.all([
        SalesRepository.getSalesInvoices(orgId),
        SalesRepository.getSalesReturns(orgId),
        TreasuryRepository.getExpenses(orgId),
        TreasuryRepository.getExpenseCategories(orgId),
      ]);

      const ids = inv.map((i) => i.id);
      const allItems = ids.length
        ? await db.sales_invoice_items.where('invoice_id').anyOf(ids).toArray()
        : [];

      setInvoices(inv);
      setReturns(ret);
      setExpenses(exps);
      setExpenseCategories(cats);
      setItems(allItems);
    } catch (err) {
      console.error('Load profit report error:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [orgId]);

  // Filtered by date range
  const filteredInvoices = useMemo(() => {
    return invoices.filter((inv) => {
      const invDate = inv.invoice_date?.slice(0, 10) || '';
      if (fromDate && invDate < fromDate) return false;
      if (toDate && invDate > toDate) return false;
      return true;
    });
  }, [invoices, fromDate, toDate]);

  const filteredInvoiceIds = useMemo(() => {
    return new Set(filteredInvoices.map((i) => i.id));
  }, [filteredInvoices]);

  const filteredItems = useMemo(() => {
    return items.filter((it) => filteredInvoiceIds.has(it.invoice_id));
  }, [items, filteredInvoiceIds]);

  const filteredReturns = useMemo(() => {
    return returns.filter((r) => {
      const retDate = (r as any).return_date?.slice(0, 10) || (r as any).created_at?.slice(0, 10) || '';
      if (fromDate && retDate && retDate < fromDate) return false;
      if (toDate && retDate && retDate > toDate) return false;
      return true;
    });
  }, [returns, fromDate, toDate]);

  const filteredExpenses = useMemo(() => {
    return expenses.filter((e) => {
      const expDate = e.created_at?.slice(0, 10) || '';
      if (fromDate && expDate < fromDate) return false;
      if (toDate && expDate > toDate) return false;
      return true;
    });
  }, [expenses, fromDate, toDate]);

  // Financial Calculations
  const fin = useMemo(() => {
    const grossSales = filteredItems.reduce((acc, it) => acc + it.quantity * it.unit_price, 0);
    const returnsTotal = filteredReturns.reduce((acc, r) => acc + r.total, 0);
    const totalDiscounts = filteredInvoices.reduce((acc, inv) => acc + (inv.discount_amount || 0), 0);
    const netRevenue = grossSales - returnsTotal - totalDiscounts;

    const cogs = filteredItems.reduce((acc, it) => acc + it.quantity * (it.unit_cost || 0), 0);
    const grossProfit = netRevenue - cogs;

    const operatingExpenses = filteredExpenses.reduce((acc, e) => acc + e.amount, 0);
    const netIncome = grossProfit - operatingExpenses;

    const cogsPercent = netRevenue > 0 ? (cogs / netRevenue) * 100 : 0;
    const expensesPercent = netRevenue > 0 ? (operatingExpenses / netRevenue) * 100 : 0;
    const netProfitMargin = netRevenue > 0 ? (netIncome / netRevenue) * 100 : 0;

    return {
      grossSales,
      returnsTotal,
      totalDiscounts,
      netRevenue,
      cogs,
      grossProfit,
      operatingExpenses,
      netIncome,
      cogsPercent,
      expensesPercent,
      netProfitMargin,
      totalUnits: filteredItems.reduce((acc, it) => acc + it.quantity, 0),
      invoiceCount: filteredInvoices.length,
      aov: filteredInvoices.length > 0 ? netRevenue / filteredInvoices.length : 0,
      avgProfitPerInv: filteredInvoices.length > 0 ? netIncome / filteredInvoices.length : 0,
      returnRate: filteredInvoices.length > 0 ? (filteredReturns.length / filteredInvoices.length) * 100 : 0,
    };
  }, [filteredInvoices, filteredItems, filteredReturns, filteredExpenses]);

  const expenseDistribution = useMemo(() => {
    const dist: Record<string, number> = {};
    for (const e of filteredExpenses) {
      dist[e.category_id] = (dist[e.category_id] || 0) + e.amount;
    }
    return Object.entries(dist)
      .map(([catId, amount]) => ({
        name: expenseCategories.find((c) => c.id === catId)?.name || 'غير مصنف',
        amount,
      }))
      .sort((a, b) => b.amount - a.amount);
  }, [filteredExpenses, expenseCategories]);

  const headerActions = (
    <div className="flex items-center gap-2">
      <Button
        onClick={loadData}
        variant="outline"
        className="h-10 px-3.5 bg-card border-border hover:bg-muted text-xs font-semibold rounded-xl flex items-center gap-2 transition-all shadow-xs"
      >
        <RefreshCw className={`w-3.5 h-3.5 text-muted-foreground ${isLoading ? 'animate-spin' : ''}`} />
        <span>تحديث</span>
      </Button>
      <Button
        onClick={() => window.print()}
        className="h-10 px-4 bg-primary text-primary-foreground hover:bg-primary/90 text-xs font-semibold rounded-xl flex items-center gap-2 shadow-xs"
      >
        <Printer className="w-3.5 h-3.5" />
        <span>طباعة التقرير</span>
      </Button>
    </div>
  );

  return (
    <AppShell
      title="تقرير الأرباح والخسائر وقائمة الدخل"
      subtitle="متابعة دقيقة للإيرادات وتكلفة البضاعة المباعة والمصروفات التشغيلية وصافي الأرباح"
      actions={headerActions}
    >
      <div className="space-y-6 text-right" dir="rtl">
        {/* ==================== KPI CARDS ==================== */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
          <KpiCard
            label="صافي الربح النهائي"
            value={`${formatNumber(fin.netIncome)} ج.م`}
            icon={<TrendingUp className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />}
            variant="emerald"
          />
          <KpiCard
            label="مجمل الربح (Gross Profit)"
            value={`${formatNumber(fin.grossProfit)} ج.م`}
            icon={<ArrowUpRight className="w-5 h-5 text-blue-600 dark:text-blue-400" />}
            variant="blue"
          />
          <KpiCard
            label="صافي المبيعات (Net Revenue)"
            value={`${formatNumber(fin.netRevenue)} ج.م`}
            icon={<DollarSign className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />}
            variant="indigo"
          />
          <KpiCard
            label="تكلفة البضاعة المباعة"
            value={`${formatNumber(fin.cogs)} ج.م`}
            icon={<Layers className="w-5 h-5 text-amber-600 dark:text-amber-400" />}
            variant="amber"
          />
          <KpiCard
            label="المصروفات التشغيلية"
            value={`${formatNumber(fin.operatingExpenses)} ج.م`}
            icon={<ArrowDownRight className="w-5 h-5 text-rose-600 dark:text-rose-400" />}
            variant="rose"
          />
        </div>

        {/* ==================== DATE FILTER TOOLBAR ==================== */}
        <div className="bg-card p-4 rounded-2xl border border-border shadow-xs flex flex-wrap items-center justify-between gap-4">
          <div className="flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-2">
              <span className="text-2xs font-semibold text-muted-foreground">من تاريخ:</span>
              <DatePicker
                value={fromDate}
                onChange={setFromDate}
                placeholder="من تاريخ..."
              />
            </div>
            <div className="flex items-center gap-2">
              <span className="text-2xs font-semibold text-muted-foreground">إلى تاريخ:</span>
              <DatePicker
                value={toDate}
                onChange={setToDate}
                placeholder="إلى تاريخ..."
              />
            </div>
            {(fromDate || toDate) && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setFromDate('');
                  setToDate('');
                }}
                className="h-10 px-3 text-xs text-muted-foreground hover:text-foreground rounded-xl flex items-center gap-1.5"
              >
                <X className="w-3.5 h-3.5" />
                <span>مسح الفلاتر</span>
              </Button>
            )}
          </div>

          <div className="flex items-center gap-2 mr-auto">
            <span className="text-2xs font-bold px-3 py-1.5 rounded-xl bg-muted text-muted-foreground border border-border">
              {fromDate || toDate ? 'فترة مخصصة' : 'كل الفترات السابقة'}
            </span>
          </div>
        </div>

        {/* ==================== DISTRIBUTION PROGRESS BAR ==================== */}
        <div className="bg-card rounded-2xl border border-border p-6 shadow-xs">
          <div className="flex items-center justify-between mb-4">
            <h4 className="text-sm font-bold text-foreground">توزيع الهيكل المالي للإيرادات</h4>
            <span className="text-xs font-bold font-mono text-primary">
              صافي الإيراد: {formatNumber(fin.netRevenue)} ج.م
            </span>
          </div>

          <div className="h-3.5 w-full bg-muted rounded-full overflow-hidden flex shadow-inner">
            <div
              className="bg-amber-500 h-full transition-all duration-500"
              style={{ width: `${Math.min(100, Math.max(0, fin.cogsPercent))}%` }}
              title={`تكلفة البضاعة: ${fin.cogsPercent.toFixed(1)}%`}
            />
            <div
              className="bg-rose-500 h-full transition-all duration-500"
              style={{ width: `${Math.min(100, Math.max(0, fin.expensesPercent))}%` }}
              title={`المصروفات: ${fin.expensesPercent.toFixed(1)}%`}
            />
            <div
              className="bg-emerald-500 h-full transition-all duration-500"
              style={{ width: `${Math.min(100, Math.max(0, fin.netProfitMargin))}%` }}
              title={`صافي الربح: ${fin.netProfitMargin.toFixed(1)}%`}
            />
          </div>

          <div className="mt-4 flex flex-wrap items-center justify-center gap-6 text-xs">
            <LegendItem color="bg-amber-500" label="تكلفة البضاعة المباعة (COGS)" percent={fin.cogsPercent} />
            <LegendItem color="bg-rose-500" label="المصروفات التشغيلية" percent={fin.expensesPercent} />
            <LegendItem color="bg-emerald-500" label="صافي الربح" percent={fin.netProfitMargin} />
          </div>
        </div>

        {/* ==================== MAIN PANELS ==================== */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
          {/* Left Panel: Indicators & Small Stats */}
          <div className="space-y-6">
            <SideCard title="مؤشرات الكفاءة التشغيلية" icon={<TrendingUp className="w-4 h-4 text-blue-600 dark:text-blue-400" />}>
              <IndicatorRow label="حجم فواتير المبيعات" value={`${fin.invoiceCount} فاتورة`} />
              <IndicatorRow label="إجمالي القطع المباعة" value={`${formatNumber(fin.totalUnits)} قطعة / وحدة`} />
              <IndicatorRow label="متوسط قيمة الفاتورة (AOV)" value={`${formatNumber(fin.aov)} ج.م`} />
              <IndicatorRow
                label="متوسط الربح لكل فاتورة"
                value={`${formatNumber(fin.avgProfitPerInv)} ج.م`}
                color="text-emerald-600 dark:text-emerald-400"
              />
              <IndicatorRow label="معدل المرتجعات" value={`${fin.returnRate.toFixed(1)}%`} />
            </SideCard>

            <SideCard title="توزيع بنود المصروفات" icon={<PieChart className="w-4 h-4 text-rose-500" />}>
              {expenseDistribution.length > 0 ? (
                <div className="space-y-3">
                  {expenseDistribution.map((e, i) => (
                    <IndicatorRow key={i} label={e.name} value={`${formatNumber(e.amount)} ج.م`} />
                  ))}
                </div>
              ) : (
                <div className="py-8 text-center text-xs font-medium text-muted-foreground">
                  لا توجد مصروفات مسجلة خلال الفترة المحددة.
                </div>
              )}
            </SideCard>

            <SideCard title="حركة التوريد والمشتريات" icon={<Truck className="w-4 h-4 text-amber-500" />}>
              <IndicatorRow label="إجمالي فواتير المشتريات" value="0.00 ج.م" />
              <IndicatorRow label="مرتجع المشتريات للموردين" value="0.00 ج.م" />
            </SideCard>
          </div>

          {/* Right Panel: Detailed Income Statement */}
          <div className="lg:col-span-2 space-y-6">
            <div className="bg-card rounded-2xl border border-border shadow-xs overflow-hidden">
              <div className="p-5 border-b border-border flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-lg bg-primary/10 text-primary flex items-center justify-center">
                    <PieChart className="w-4 h-4" />
                  </div>
                  <h3 className="text-base font-bold text-foreground">قائمة الدخل الشاملة (Income Statement)</h3>
                </div>
                <div className="bg-muted text-muted-foreground px-3 py-1 rounded-lg text-3xs font-bold border border-border">
                  {fromDate || toDate ? 'فترة مخصصة' : 'كل الفترات'}
                </div>
              </div>

              <div className="p-6 space-y-8">
                {/* 1. Operating Revenues */}
                <div className="space-y-4">
                  <div className="flex items-center gap-2 text-primary font-bold">
                    <CheckCircle2 className="w-4 h-4" />
                    <h4 className="text-xs font-bold uppercase tracking-wider">1. إيرادات النشاط (Operating Revenues)</h4>
                  </div>
                  <div className="space-y-3 pr-6 border-r-2 border-border">
                    <DetailRow
                      label="إجمالي المبيعات (Gross Sales)"
                      desc="إجمالي قيمة المنتجات المباعة بالفواتير قبل المردودات والخصومات"
                      value={fin.grossSales}
                    />
                    <DetailRow
                      label="مردودات ومسموحات المبيعات (Sales Returns)"
                      desc="قيمة المرتجعات المستردة للعملاء خلال الفترة"
                      value={fin.returnsTotal}
                      isNegative
                    />
                    <DetailRow
                      label="الخصومات الممنوحة (Discounts Given)"
                      desc="إجمالي التخفيضات والخصومات الممنوحة على الفواتير"
                      value={fin.totalDiscounts}
                      isNegative
                    />
                    <div className="pt-2">
                      <SummaryRow label="صافي إيرادات المبيعات (Net Revenue)" value={fin.netRevenue} accent="blue" />
                    </div>
                  </div>
                </div>

                {/* 2. COGS */}
                <div className="space-y-4">
                  <div className="flex items-center gap-2 text-amber-600 dark:text-amber-400 font-bold">
                    <Layers className="w-4 h-4" />
                    <h4 className="text-xs font-bold uppercase tracking-wider">2. تكلفة البضاعة المباعة (Cost of Goods Sold)</h4>
                  </div>
                  <div className="space-y-3 pr-6 border-r-2 border-border">
                    <DetailRow
                      label="تكلفة البضاعة والمنتجات المباعة (COGS)"
                      desc="التكلفة الفعلية وفق أسعار الشراء للأصناف المباعة"
                      value={fin.cogs}
                      isNegative
                    />
                    <div className="pt-2">
                      <SummaryRow
                        label="مجمل الربح المحقق (Gross Profit)"
                        value={fin.grossProfit}
                        accent="emerald"
                        margin={fin.netProfitMargin}
                      />
                    </div>
                  </div>
                </div>

                {/* 3. Operating Expenses */}
                <div className="space-y-4">
                  <div className="flex items-center gap-2 text-rose-600 dark:text-rose-400 font-bold">
                    <FileText className="w-4 h-4" />
                    <h4 className="text-xs font-bold uppercase tracking-wider">3. المصروفات التشغيلية والإدارية</h4>
                  </div>
                  <div className="space-y-3 pr-6 border-r-2 border-border">
                    {filteredExpenses.length === 0 ? (
                      <p className="text-xs font-medium text-muted-foreground py-2">لا توجد مصروفات مسجلة خلال الفترة المحددة.</p>
                    ) : (
                      <DetailRow
                        label="إجمالي المصروفات التشغيلية والرواتب"
                        value={fin.operatingExpenses}
                        isNegative
                      />
                    )}
                    <div className="pt-2">
                      <div className="h-10 px-4 flex items-center justify-between border border-rose-500/20 bg-rose-500/5 rounded-xl text-rose-600 dark:text-rose-400 text-xs font-bold">
                        <span>إجمالي المصروفات التشغيلية</span>
                        <span className="font-mono">{formatNumber(fin.operatingExpenses)} ج.م -</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* FINAL NET INCOME BANNER */}
                <div className="bg-gradient-to-r from-emerald-600 to-teal-600 text-white rounded-2xl p-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 shadow-lg shadow-emerald-500/10">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-xl bg-white/20 backdrop-blur-md flex items-center justify-center border border-white/30 shrink-0">
                      <CheckCircle2 className="w-7 h-7 text-white" />
                    </div>
                    <div>
                      <h3 className="text-base font-bold uppercase">صافي الربح النهائي (Net Income)</h3>
                      <p className="text-2xs opacity-85 mt-0.5 leading-relaxed font-medium">
                        الناتج المحاسبي النهائي بعد خصم كافة التكاليف والمصروفات الإدارية والتشغيلية
                      </p>
                    </div>
                  </div>
                  <div className="text-left sm:text-right shrink-0">
                    <div className="text-2xl font-bold font-mono">
                      {formatNumber(fin.netIncome)} <span className="text-sm font-sans font-semibold">ج.م</span>
                    </div>
                    <div className="text-3xs font-bold bg-white/20 px-2.5 py-1 rounded-lg inline-block mt-1 border border-white/20">
                      صافي الهامش: {fin.netProfitMargin.toFixed(1)}%
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </AppShell>
  );
}

function LegendItem({ color, label, percent }: { color: string; label: string; percent: number }) {
  return (
    <div className="flex items-center gap-2">
      <div className={`w-3 h-3 rounded-full ${color} shadow-xs`} />
      <span className="text-xs text-muted-foreground">{label}:</span>
      <span className="text-xs font-bold font-mono text-foreground">{percent.toFixed(1)}%</span>
    </div>
  );
}

function SideCard({ title, icon, children }: { title: string; icon: React.ReactNode; children: React.ReactNode }) {
  return (
    <div className="bg-card rounded-2xl border border-border p-5 shadow-xs">
      <div className="flex items-center gap-2 mb-4 pb-3 border-b border-border">
        {icon}
        <h4 className="text-xs font-bold text-foreground">{title}</h4>
      </div>
      <div className="space-y-3">{children}</div>
    </div>
  );
}

function IndicatorRow({ label, value, color }: { label: string; value: string; color?: string }) {
  return (
    <div className="flex items-center justify-between gap-4">
      <span className="text-2xs font-medium text-muted-foreground">{label}</span>
      <span className={`text-2xs font-bold font-mono ${color || 'text-foreground'}`}>{value}</span>
    </div>
  );
}

function DetailRow({
  label,
  desc,
  value,
  isNegative = false,
}: {
  label: string;
  desc?: string;
  value: number;
  isNegative?: boolean;
}) {
  return (
    <div className="flex items-center justify-between gap-4 py-1">
      <div className="flex flex-col">
        <span className="text-xs font-semibold text-foreground">{label}</span>
        {desc && <span className="text-3xs text-muted-foreground leading-tight">{desc}</span>}
      </div>
      <div className={`text-xs font-mono font-bold ${isNegative && value !== 0 ? 'text-rose-600 dark:text-rose-400' : 'text-foreground'}`}>
        {formatNumber(value)} {isNegative && value !== 0 ? '-' : ''} <span className="text-3xs font-sans text-muted-foreground">ج.م</span>
      </div>
    </div>
  );
}

function SummaryRow({
  label,
  value,
  accent,
  margin,
}: {
  label: string;
  value: number;
  accent: 'blue' | 'emerald';
  margin?: number;
}) {
  const styles = {
    blue: 'bg-blue-500/10 text-blue-700 dark:text-blue-400 border-blue-500/20',
    emerald: 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/20',
  };

  return (
    <div className={`rounded-xl px-4 py-3 flex items-center justify-between border shadow-xs ${styles[accent]}`}>
      <div className="text-xs font-bold">{label}</div>
      <div className="flex items-center gap-3">
        {margin !== undefined && (
          <span className="text-3xs font-bold bg-background/80 px-2 py-0.5 rounded-lg border border-border">
            هامش: {margin.toFixed(1)}%
          </span>
        )}
        <div className="text-sm font-bold font-mono">{formatNumber(value)} ج.م</div>
      </div>
    </div>
  );
}