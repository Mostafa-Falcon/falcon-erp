'use client';

import React, { useEffect, useMemo, useState, Suspense } from 'react';
import { AppShell } from '@/components/layout/AppShell';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { KpiCard } from '@/components/ui/kpi-card';
import { EmptyState } from '@/components/ui/empty-state';
import { useSessionStore } from '@/core/state/useSessionStore';
import { ProductRepository } from '@/modules/inventory/product_repository';
import { formatNumber, isExpired, daysToExpiry } from '@/lib/format';
import type { Product, ProductBatch, Unit, Warehouse } from '@/types';
import {
  Printer,
  RefreshCw,
  AlertTriangle,
  Clock,
  Calendar,
  ShieldCheck,
  Package,
} from 'lucide-react';

type ExpiryStatus = 'expired' | 'soon30' | 'soon90' | 'valid';

function statusOf(batch: ProductBatch): { status: ExpiryStatus; days?: number } {
  if (!batch.expiry_date) return { status: 'valid' };
  const expired = isExpired(batch.expiry_date);
  if (expired) return { status: 'expired' };
  const days = daysToExpiry(batch.expiry_date);
  if (days <= 30) return { status: 'soon30', days };
  if (days <= 90) return { status: 'soon90', days };
  return { status: 'valid', days };
}

const STATUS_STYLES: Record<ExpiryStatus, string> = {
  expired: 'bg-rose-50 dark:bg-rose-950/60 text-rose-700 dark:text-rose-300 border-rose-200 dark:border-rose-800',
  soon30: 'bg-amber-50 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 border-amber-200 dark:border-amber-800',
  soon90: 'bg-orange-50 dark:bg-orange-950/60 text-orange-700 dark:text-orange-300 border-orange-200 dark:border-orange-800',
  valid: 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800',
};

const STATUS_LABELS: Record<ExpiryStatus, string> = {
  expired: 'منتهية الصلاحية',
  soon30: 'تنتهي خلال 30 يوم',
  soon90: 'تنتهي خلال 90 يوم',
  valid: 'سارية الصلاحية',
};

function ExpiryReportContent() {
  const { currentUser } = useSessionStore();
  const orgId = currentUser?.org_id || '';

  const [products, setProducts] = useState<Product[]>([]);
  const [warehouses, setWarehouses] = useState<Warehouse[]>([]);
  const [unitsById, setUnitsById] = useState<Record<string, Unit>>({});
  const [batches, setBatches] = useState<ProductBatch[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const [warehouseFilter, setWarehouseFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState<'all' | ExpiryStatus>('all');
  const [productFilter, setProductFilter] = useState('all');

  const loadData = async () => {
    if (!orgId) return;
    const { db } = await import('@/core/db/app_database');
    try {
      setIsLoading(true);
      const prods = await ProductRepository.getAll(orgId);
      const orgProductIds = new Set(prods.map((p) => p.id));
      const [whs, unts, allBatches] = await Promise.all([
        db.warehouses.where('org_id').equals(orgId).toArray(),
        ProductRepository.getAllUnits(orgId),
        db.product_batches.toArray(),
      ]);
      const orgBatches = allBatches.filter((b) => orgProductIds.has(b.product_id));
      const umap: Record<string, Unit> = {};
      for (const u of unts) umap[u.id] = u;
      setProducts(prods);
      setWarehouses(whs);
      setUnitsById(umap);
      setBatches(orgBatches);
    } catch (err) {
      console.error('Load expiry report error:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [orgId]);

  const rows = useMemo(() => {
    return batches
      .map((b) => ({ batch: b, info: statusOf(b) }))
      .filter(({ batch, info }) => {
        if (warehouseFilter !== 'all' && batch.warehouse_id !== warehouseFilter) return false;
        if (statusFilter !== 'all' && info.status !== statusFilter) return false;
        if (productFilter !== 'all' && batch.product_id !== productFilter) return false;
        return true;
      })
      .sort((a, b) => (a.batch.expiry_date || '').localeCompare(b.batch.expiry_date || ''));
  }, [batches, warehouseFilter, statusFilter, productFilter]);

  const totals = useMemo(() => {
    const counts: Record<ExpiryStatus, number> = { expired: 0, soon30: 0, soon90: 0, valid: 0 };
    let value = 0;
    for (const r of rows) {
      counts[r.info.status] += 1;
      value += r.batch.current_quantity * (r.batch.purchase_price || 0);
    }
    return { ...counts, value };
  }, [rows]);

  const warehouseName = (id?: string) => warehouses.find((w) => w.id === id)?.name || id?.slice(0, 8) || '—';
  const unitSymbol = (id?: string) => (id ? unitsById[id]?.symbol : '') || '';

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
      title="تقرير الصلاحيات والانتهاء"
      subtitle="رصد دفعات الأصناف منتهية الصلاحية أو القريبة من الانتهاء وتكلفة المخزون المعرض للتلف"
      actions={headerActions}
    >
      <div className="space-y-5 text-right select-none" dir="rtl">
        {/* KPI Financial Overview Cards — Linear / Stripe Style */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3.5">
          <KpiCard
            label="منتهية الصلاحية"
            value={totals.expired}
            unit="دفعة"
            variant="rose"
            icon={<AlertTriangle className="w-5 h-5" />}
          />
          <KpiCard
            label="تنتهي خلال 30 يوم"
            value={totals.soon30}
            unit="دفعة"
            variant="amber"
            icon={<Clock className="w-5 h-5" />}
          />
          <KpiCard
            label="تنتهي خلال 90 يوم"
            value={totals.soon90}
            unit="دفعة"
            variant="indigo"
            icon={<Calendar className="w-5 h-5" />}
          />
          <KpiCard
            label="سارية الصلاحية"
            value={totals.valid}
            unit="دفعة"
            variant="emerald"
            icon={<ShieldCheck className="w-5 h-5" />}
          />
          <KpiCard
            label="قيمة المخزون المعروض"
            value={formatNumber(totals.value)}
            unit="ج.م"
            variant="blue"
            icon={<Package className="w-5 h-5" />}
          />
        </div>

        {/* Filter Toolbar */}
        <div className="bg-surface rounded-2xl border border-slate-200/80 dark:border-slate-800/80 p-3.5 shadow-2xs flex flex-wrap items-center gap-3 print:hidden">
          <div className="w-full sm:w-48">
            <Select value={warehouseFilter} onValueChange={setWarehouseFilter}>
              <SelectTrigger className="w-full h-10 rounded-xl bg-slate-50/70 dark:bg-slate-900/70 border-slate-200/80 dark:border-slate-800 text-xs font-bold">
                <SelectValue placeholder="المخزن" />
              </SelectTrigger>
              <SelectContent className="z-50 rounded-xl">
                <SelectItem value="all">كل المخازن</SelectItem>
                {warehouses.map((w) => (
                  <SelectItem key={w.id} value={w.id}>
                    {w.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="w-full sm:w-48">
            <Select value={statusFilter} onValueChange={(val: any) => setStatusFilter(val)}>
              <SelectTrigger className="w-full h-10 rounded-xl bg-slate-50/70 dark:bg-slate-900/70 border-slate-200/80 dark:border-slate-800 text-xs font-bold">
                <SelectValue placeholder="حالة الصلاحية" />
              </SelectTrigger>
              <SelectContent className="z-50 rounded-xl">
                <SelectItem value="all">كل الحالات</SelectItem>
                <SelectItem value="expired">منتهية الصلاحية</SelectItem>
                <SelectItem value="soon30">تنتهي خلال 30 يوم</SelectItem>
                <SelectItem value="soon90">تنتهي خلال 90 يوم</SelectItem>
                <SelectItem value="valid">سارية</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="w-full sm:w-56">
            <Select value={productFilter} onValueChange={setProductFilter}>
              <SelectTrigger className="w-full h-10 rounded-xl bg-slate-50/70 dark:bg-slate-900/70 border-slate-200/80 dark:border-slate-800 text-xs font-bold">
                <SelectValue placeholder="الصنف" />
              </SelectTrigger>
              <SelectContent className="max-h-60 z-50 rounded-xl">
                <SelectItem value="all">كل الأصناف</SelectItem>
                {products.map((p) => (
                  <SelectItem key={p.id} value={p.id}>
                    {p.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {(warehouseFilter !== 'all' || statusFilter !== 'all' || productFilter !== 'all') && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                setWarehouseFilter('all');
                setStatusFilter('all');
                setProductFilter('all');
              }}
              className="h-10 px-3 text-xs font-bold text-slate-500 hover:text-rose-600 rounded-xl"
            >
              إعادة تعيين الفلاتر
            </Button>
          )}
        </div>

        {/* Expiry Table Container */}
        {isLoading ? (
          <div className="py-24 flex flex-col items-center justify-center gap-3 bg-surface rounded-2xl border border-slate-200/80 dark:border-slate-800">
            <div className="w-8 h-8 border-3 border-primary border-t-transparent rounded-full animate-spin" />
            <span className="text-xs font-bold text-slate-400">جاري فحص صلاحيات الدفعات المخزنية...</span>
          </div>
        ) : rows.length === 0 ? (
          <EmptyState
            icon={<ShieldCheck className="w-8 h-8 text-emerald-500" />}
            title="لا توجد دفعات مطابقة للفلاتر"
            description="كافة الدفعات سليمة وسارية الصلاحية، أو لا توجد نتائج تطابق خيارات التصفية المحددة."
            action={
              warehouseFilter !== 'all' || statusFilter !== 'all' || productFilter !== 'all'
                ? {
                    label: 'مسح الفلاتر',
                    onClick: () => {
                      setWarehouseFilter('all');
                      setStatusFilter('all');
                      setProductFilter('all');
                    },
                  }
                : undefined
            }
          />
        ) : (
          <div className="bg-surface rounded-2xl border border-slate-200/80 dark:border-slate-800/80 overflow-hidden shadow-2xs">
            <div className="overflow-x-auto">
              <Table className="w-full text-right text-xs">
                <TableHeader className="bg-slate-50/80 dark:bg-slate-900/60 border-b border-slate-200/80 dark:border-slate-800 text-slate-500 font-black">
                  <TableRow>
                    <TableHead className="py-3.5 px-4 font-black">الصنف</TableHead>
                    <TableHead className="py-3.5 px-4 font-black font-mono">رقم التشغيلة / الدفعة</TableHead>
                    <TableHead className="py-3.5 px-4 font-black">المخزن</TableHead>
                    <TableHead className="py-3.5 px-4 font-black font-mono">تاريخ الانتهاء</TableHead>
                    <TableHead className="py-3.5 px-4 font-black">المدة المتبقية</TableHead>
                    <TableHead className="py-3.5 px-4 font-black font-mono">الكمية</TableHead>
                    <TableHead className="py-3.5 px-4 font-black">الوحدة</TableHead>
                    <TableHead className="py-3.5 px-4 font-black font-mono text-left">القيمة المقدرة</TableHead>
                    <TableHead className="py-3.5 px-4 font-black text-center">الحالة</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody className="divide-y divide-slate-100 dark:divide-slate-800/60 font-bold">
                  {rows.map(({ batch, info }) => {
                    const p = products.find((x) => x.id === batch.product_id);
                    return (
                      <TableRow key={batch.id} className="hover:bg-slate-50/60 dark:hover:bg-slate-900/40 transition-colors">
                        <TableCell className="font-bold text-foreground py-3 px-4">{p?.name || '—'}</TableCell>
                        <TableCell className="font-mono text-slate-600 dark:text-slate-400 py-3 px-4">
                          {batch.batch_number || '—'}
                        </TableCell>
                        <TableCell className="text-slate-700 dark:text-slate-300 py-3 px-4">
                          {warehouseName(batch.warehouse_id)}
                        </TableCell>
                        <TableCell className="font-mono text-slate-500 py-3 px-4">
                          {batch.expiry_date ? new Date(batch.expiry_date).toLocaleDateString('en-GB') : '—'}
                        </TableCell>
                        <TableCell className="py-3 px-4">
                          {info.days !== undefined ? (
                            <span className={info.status === 'valid' ? 'text-emerald-600' : 'text-amber-600 font-black'}>
                              {formatNumber(info.days)} يوم
                            </span>
                          ) : (
                            <span className="text-slate-400">—</span>
                          )}
                        </TableCell>
                        <TableCell className="font-mono font-black text-foreground py-3 px-4">
                          {formatNumber(batch.current_quantity)}
                        </TableCell>
                        <TableCell className="text-slate-400 text-3xs py-3 px-4">
                          {unitSymbol(p?.base_unit_id)}
                        </TableCell>
                        <TableCell className="font-mono font-black text-left text-foreground py-3 px-4">
                          {formatNumber(batch.current_quantity * (batch.purchase_price || 0))}{' '}
                          <span className="text-4xs font-sans text-slate-400 font-normal">ج.م</span>
                        </TableCell>
                        <TableCell className="py-3 px-4 text-center">
                          <span className={`px-2.5 py-1 rounded-full text-3xs font-black border inline-block ${STATUS_STYLES[info.status]}`}>
                            {STATUS_LABELS[info.status]}
                          </span>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          </div>
        )}
      </div>
    </AppShell>
  );
}

export default function ExpiryReportPage() {
  return (
    <Suspense
      fallback={
        <div className="h-screen w-full flex items-center justify-center bg-app">
          <div className="w-8 h-8 border-3 border-primary border-t-transparent rounded-full animate-spin" />
        </div>
      }
    >
      <ExpiryReportContent />
    </Suspense>
  );
}