'use client';

import React, { useEffect, useMemo, useState, Suspense } from 'react';
import { AppShell } from '@/components/layout/AppShell';
import { Button } from '@/components/ui/button';
import { KpiCard } from '@/components/ui/kpi-card';
import { EmptyState } from '@/components/ui/empty-state';
import { DatePicker } from '@/components/ui/date-picker';
import {
  ArrowDownLeft,
  ArrowUpRight,
  TrendingUp,
  Layers,
  Printer,
  RefreshCw,
  FolderOpen,
  X
} from 'lucide-react';
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
import { useSessionStore } from '@/core/state/useSessionStore';
import { Skeleton } from '@/components/ui/skeleton';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { formatNumber, formatDateTime, MOVEMENT_TYPE_LABELS } from '@/lib/format';
import type { InventoryTransaction, InventoryTransactionType, Product, Unit, Warehouse } from '@/types';

const TYPE_STYLES: Record<string, string> = {
  opening_stock: 'bg-sky-500/10 text-sky-700 dark:text-sky-400 border border-sky-500/20',
  purchase: 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border border-emerald-500/20',
  sale: 'bg-blue-500/10 text-blue-700 dark:text-blue-400 border border-blue-500/20',
  sale_return: 'bg-teal-500/10 text-teal-700 dark:text-teal-400 border border-teal-500/20',
  purchase_return: 'bg-rose-500/10 text-rose-700 dark:text-rose-400 border border-rose-500/20',
  transfer_in: 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border border-emerald-500/20',
  transfer_out: 'bg-amber-500/10 text-amber-700 dark:text-amber-400 border border-amber-500/20',
  adjustment_in: 'bg-violet-500/10 text-violet-700 dark:text-violet-400 border border-violet-500/20',
  adjustment_out: 'bg-red-500/10 text-red-700 dark:text-red-400 border border-red-500/20',
  damaged: 'bg-muted text-muted-foreground border border-border',
};

function InventoryReportContent() {
  const { currentUser } = useSessionStore();
  const orgId = currentUser?.org_id || '';

  const [transactions, setTransactions] = useState<InventoryTransaction[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [warehouses, setWarehouses] = useState<Warehouse[]>([]);
  const [unitsById, setUnitsById] = useState<Record<string, Unit>>({});
  const [isLoading, setIsLoading] = useState(true);

  const [warehouseFilter, setWarehouseFilter] = useState('all');
  const [typeFilter, setTypeFilter] = useState('all');
  const [productFilter, setProductFilter] = useState('all');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');

  const loadData = async () => {
    if (!orgId) return;
    setIsLoading(true);
    const { db } = await import('@/core/db/app_database');
    try {
      const [trans, prods, whs, unts] = await Promise.all([
        db.inventory_transactions.where('org_id').equals(orgId).reverse().sortBy('created_at'),
        db.products.where('org_id').equals(orgId).toArray(),
        db.warehouses.where('org_id').equals(orgId).toArray(),
        db.units.where('org_id').equals(orgId).toArray(),
      ]);
      setTransactions(trans);
      setProducts(prods);
      setWarehouses(whs);
      const umap: Record<string, Unit> = {};
      for (const u of unts) umap[u.id] = u;
      setUnitsById(umap);
    } catch (err) {
      console.error('Load inventory report error:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [orgId]);

  const filtered = useMemo(() => {
    return transactions.filter((t) => {
      if (warehouseFilter !== 'all' && t.warehouse_id !== warehouseFilter) return false;
      if (typeFilter !== 'all' && t.transaction_type !== typeFilter) return false;
      if (productFilter !== 'all' && t.product_id !== productFilter) return false;
      if (dateFrom && t.created_at < dateFrom) return false;
      if (dateTo && t.created_at > dateTo + 'T23:59:59') return false;
      return true;
    });
  }, [transactions, warehouseFilter, typeFilter, productFilter, dateFrom, dateTo]);

  const totals = useMemo(() => {
    let inbound = 0;
    let outbound = 0;
    for (const t of filtered) {
      if (t.base_quantity >= 0) inbound += t.base_quantity;
      else outbound += -t.base_quantity;
    }
    const net = inbound - outbound;
    return { inbound, outbound, net };
  }, [filtered]);

  const productName = (id?: string) => products.find((p) => p.id === id)?.name || id?.slice(0, 8) || '—';
  const warehouseName = (id?: string) => warehouses.find((w) => w.id === id)?.name || id?.slice(0, 8) || '—';
  const unitSymbol = (id?: string) => (id ? unitsById[id]?.symbol : '') || '';

  return (
    <AppShell
      title="تقرير حركة المخزون"
      subtitle="كشف قيد حركة المخزون: الوارد والصادر والرصيد بعد كل حركة — تقرير تدقيقي معتمد"
      actions={
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            onClick={loadData}
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
      }
    >
      <div className="space-y-6">
        {/* KPI Cards Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <KpiCard
            label="إجمالي الوارد"
            value={formatNumber(totals.inbound)}
            icon={<ArrowDownLeft className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />}
            variant="emerald"
          />
          <KpiCard
            label="إجمالي الصادر"
            value={formatNumber(totals.outbound)}
            icon={<ArrowUpRight className="w-5 h-5 text-rose-600 dark:text-rose-400" />}
            variant="rose"
          />
          <KpiCard
            label="صافي حركة المخزون"
            value={`${totals.net >= 0 ? '+' : ''}${formatNumber(totals.net)}`}
            icon={<TrendingUp className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />}
            variant={totals.net >= 0 ? 'indigo' : 'amber'}
          />
          <KpiCard
            label="إجمالي الحركات المعروضة"
            value={filtered.length.toString()}
            icon={<Layers className="w-5 h-5 text-blue-600 dark:text-blue-400" />}
            variant="blue"
          />
        </div>

        {/* Filter and Date Bar */}
        <div className="bg-card p-4 rounded-2xl border border-border shadow-xs flex flex-wrap items-center justify-between gap-4">
          <div className="flex flex-wrap items-center gap-3 w-full lg:w-auto flex-1">
            <div className="w-full sm:w-44">
              <Select value={warehouseFilter} onValueChange={setWarehouseFilter}>
                <SelectTrigger className="w-full h-10 rounded-xl bg-background border-border text-xs font-medium">
                  <SelectValue placeholder="المخزن" />
                </SelectTrigger>
                <SelectContent className="z-50 bg-popover border border-border rounded-xl shadow-xl">
                  <SelectItem value="all">كل المخازن</SelectItem>
                  {warehouses.map((w) => (
                    <SelectItem key={w.id} value={w.id}>
                      {w.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="w-full sm:w-44">
              <Select value={productFilter} onValueChange={setProductFilter}>
                <SelectTrigger className="w-full h-10 rounded-xl bg-background border-border text-xs font-medium">
                  <SelectValue placeholder="الصنف" />
                </SelectTrigger>
                <SelectContent className="z-50 bg-popover border border-border rounded-xl shadow-xl">
                  <SelectItem value="all">كل الأصناف</SelectItem>
                  {products.map((p) => (
                    <SelectItem key={p.id} value={p.id}>
                      {p.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="w-full sm:w-44">
              <Select value={typeFilter} onValueChange={setTypeFilter}>
                <SelectTrigger className="w-full h-10 rounded-xl bg-background border-border text-xs font-medium">
                  <SelectValue placeholder="نوع الحركة" />
                </SelectTrigger>
                <SelectContent className="z-50 bg-popover border border-border rounded-xl shadow-xl">
                  <SelectItem value="all">كل أنواع الحركات</SelectItem>
                  {Object.entries(MOVEMENT_TYPE_LABELS).map(([k, v]) => (
                    <SelectItem key={k} value={k}>
                      {v}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-center gap-2">
              <span className="text-2xs font-semibold text-muted-foreground">من:</span>
              <DatePicker
                value={dateFrom}
                onChange={setDateFrom}
                placeholder="من تاريخ..."
              />
            </div>

            <div className="flex items-center gap-2">
              <span className="text-2xs font-semibold text-muted-foreground">إلى:</span>
              <DatePicker
                value={dateTo}
                onChange={setDateTo}
                placeholder="إلى تاريخ..."
              />
            </div>

            {(warehouseFilter !== 'all' || productFilter !== 'all' || typeFilter !== 'all' || dateFrom || dateTo) && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setWarehouseFilter('all');
                  setProductFilter('all');
                  setTypeFilter('all');
                  setDateFrom('');
                  setDateTo('');
                }}
                className="h-10 px-3 text-xs text-muted-foreground hover:text-foreground rounded-xl flex items-center gap-1.5"
              >
                <X className="w-3.5 h-3.5" />
                <span>إعادة ضبط</span>
              </Button>
            )}
          </div>
        </div>

        {/* Inventory Transactions Table */}
        <div className="bg-card rounded-2xl border border-border overflow-hidden shadow-xs print:border-0">
          <ScrollArea className="h-[calc(100vh-420px)] min-h-[400px]">
            <Table>
              <TableHeader className="sticky top-0 z-10 bg-muted/60 backdrop-blur-sm shadow-xs">
                <TableRow className="border-border hover:bg-transparent">
                  <TableHead className="text-2xs font-bold uppercase tracking-wider text-muted-foreground">التاريخ والوقت</TableHead>
                  <TableHead className="text-2xs font-bold uppercase tracking-wider text-muted-foreground">المخزن</TableHead>
                  <TableHead className="text-2xs font-bold uppercase tracking-wider text-muted-foreground">الصنف</TableHead>
                  <TableHead className="text-2xs font-bold uppercase tracking-wider text-muted-foreground">نوع الحركة</TableHead>
                  <TableHead className="text-2xs font-bold uppercase tracking-wider text-muted-foreground">الكمية</TableHead>
                  <TableHead className="text-2xs font-bold uppercase tracking-wider text-muted-foreground">الوحدة</TableHead>
                  <TableHead className="text-2xs font-bold uppercase tracking-wider text-muted-foreground">التكلفة</TableHead>
                  <TableHead className="text-2xs font-bold uppercase tracking-wider text-muted-foreground">الرصيد بعد الحركة</TableHead>
                  <TableHead className="text-2xs font-bold uppercase tracking-wider text-muted-foreground">ملاحظات</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody className="text-xs">
                {isLoading ? (
                  Array.from({ length: 7 }).map((_, i) => (
                    <TableRow key={i} className="border-border">
                      <TableCell colSpan={9} className="py-4 px-4">
                        <Skeleton className="h-6 w-full opacity-60" />
                      </TableCell>
                    </TableRow>
                  ))
                ) : filtered.length === 0 ? (
                  <TableRow className="border-border hover:bg-transparent">
                    <TableCell colSpan={9} className="py-16">
                      <EmptyState
                        icon={<FolderOpen className="w-10 h-10 text-muted-foreground/60" />}
                        title="لا توجد حركات مخزنية"
                        description="لم يتم العثور على أي حركات مخزنية تطابق معايير التصفية المحددة."
                      />
                    </TableCell>
                  </TableRow>
                ) : (
                  <TooltipProvider>
                    {filtered.map((t) => {
                      const isInbound = t.base_quantity >= 0;
                      return (
                        <TableRow
                          key={t.id}
                          className="border-border hover:bg-muted/40 transition-colors group"
                        >
                          <TableCell className="text-muted-foreground font-mono text-3xs whitespace-nowrap py-3.5">
                            {formatDateTime(t.created_at)}
                          </TableCell>
                          <TableCell className="font-medium text-foreground">
                            {warehouseName(t.warehouse_id)}
                          </TableCell>
                          <TableCell className="font-bold text-foreground">
                            {productName(t.product_id)}
                          </TableCell>
                          <TableCell>
                            <span
                              className={`px-2.5 py-0.5 rounded-full text-3xs font-bold inline-block ${
                                TYPE_STYLES[t.transaction_type] || TYPE_STYLES.damaged
                              }`}
                            >
                              {MOVEMENT_TYPE_LABELS[t.transaction_type] || t.transaction_type}
                            </span>
                          </TableCell>
                          <TableCell
                            className={`font-bold font-mono text-xs ${
                              isInbound ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'
                            }`}
                          >
                            {isInbound ? '+' : ''}
                            {formatNumber(t.base_quantity)}
                          </TableCell>
                          <TableCell className="text-muted-foreground font-medium">
                            {unitSymbol(t.unit_id)}
                          </TableCell>
                          <TableCell className="font-mono text-3xs text-muted-foreground">
                            {formatNumber(t.unit_cost)} ج.م
                          </TableCell>
                          <TableCell className="font-mono font-bold text-foreground bg-muted/20">
                            {formatNumber(t.balance_after)}
                          </TableCell>
                          <TableCell className="text-muted-foreground max-w-40">
                            {t.notes ? (
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <span className="truncate block cursor-help text-3xs italic hover:text-foreground transition-colors">
                                    {t.notes}
                                  </span>
                                </TooltipTrigger>
                                <TooltipContent side="top" className="max-w-xs text-xs p-2 leading-relaxed">
                                  {t.notes}
                                </TooltipContent>
                              </Tooltip>
                            ) : (
                              <span className="opacity-30">—</span>
                            )}
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TooltipProvider>
                )}
              </TableBody>
            </Table>
          </ScrollArea>
        </div>
      </div>
    </AppShell>
  );
}

export default function InventoryReportPage() {
  return (
    <Suspense
      fallback={
        <div className="h-screen w-full flex items-center justify-center bg-background">
          <div className="w-9 h-9 border-3 border-primary border-t-transparent rounded-full animate-spin" />
        </div>
      }
    >
      <InventoryReportContent />
    </Suspense>
  );
}