'use client';

import React, { useEffect, useMemo, useState, Suspense } from 'react';
import { AppShell } from '@/components/layout/AppShell';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { KpiCard } from '@/components/ui/kpi-card';
import { EmptyState } from '@/components/ui/empty-state';
import {
  Wallet,
  Package,
  Warehouse as WarehouseIcon,
  Layers,
  Search,
  Printer,
  RefreshCw,
  FolderOpen
} from 'lucide-react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Table,
  TableBody,
  TableCell,
  TableFooter,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { useSessionStore } from '@/core/state/useSessionStore';
import { ProductRepository } from '@/modules/inventory/product_repository';
import { InventoryRepository } from '@/modules/inventory/inventory_repository';
import { formatNumber } from '@/lib/format';
import type { Product, ProductCategory, StockLevel, Unit, Warehouse } from '@/types';

function ValuationContent() {
  const { currentUser } = useSessionStore();
  const orgId = currentUser?.org_id || '';

  const [products, setProducts] = useState<Product[]>([]);
  const [warehouses, setWarehouses] = useState<Warehouse[]>([]);
  const [categories, setCategories] = useState<ProductCategory[]>([]);
  const [unitsById, setUnitsById] = useState<Record<string, Unit>>({});
  const [stockLevels, setStockLevels] = useState<StockLevel[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const [warehouseFilter, setWarehouseFilter] = useState('all');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');

  const loadData = async () => {
    if (!orgId) return;
    setIsLoading(true);
    const { db } = await import('@/core/db/app_database');
    try {
      const [prods, whs, cats, unts, levels] = await Promise.all([
        ProductRepository.getAll(orgId),
        InventoryRepository.getWarehouses(orgId),
        ProductRepository.getCategories(orgId),
        ProductRepository.getAllUnits(orgId),
        db.stock_levels.where('org_id').equals(orgId).toArray(),
      ]);
      const umap: Record<string, Unit> = {};
      for (const u of unts) umap[u.id] = u;
      setProducts(prods.filter((p) => p.item_type === 'storable'));
      setWarehouses(whs);
      setCategories(cats.filter((c) => c.is_active));
      setUnitsById(umap);
      setStockLevels(levels);
    } catch (err) {
      console.error('Load valuation error:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [orgId]);

  const rows = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    const productById = new Map(products.map((p) => [p.id, p]));
    return stockLevels
      .map((lvl) => ({ level: lvl, product: productById.get(lvl.product_id) }))
      .filter(
        (r): r is { level: StockLevel; product: Product } =>
          !!r.product && r.level.quantity !== 0
      )
      .filter(({ level, product }) => {
        if (warehouseFilter !== 'all' && level.warehouse_id !== warehouseFilter) return false;
        if (categoryFilter !== 'all' && product.category_id !== categoryFilter) return false;
        if (q && !product.name.toLowerCase().includes(q) && !product.sku.toLowerCase().includes(q)) return false;
        return true;
      })
      .sort((a, b) => a.product.name.localeCompare(b.product.name, 'ar'));
  }, [stockLevels, products, warehouseFilter, categoryFilter, searchQuery]);

  const totals = useMemo(() => {
    let value = 0;
    let qty = 0;
    const whSet = new Set<string>();
    const byCategory: Record<string, number> = {};
    for (const { level, product } of rows) {
      const v = level.quantity * (product.purchase_price || 0);
      value += v;
      qty += Math.abs(level.quantity);
      whSet.add(level.warehouse_id);
      const cat = product.category_id || '';
      byCategory[cat] = (byCategory[cat] || 0) + v;
    }
    return { value, qty, warehouseCount: whSet.size, byCategory };
  }, [rows]);

  const catName = (id?: string | null) => categories.find((c) => c.id === id)?.name || 'بدون فئة';
  const warehouseName = (id?: string) => warehouses.find((w) => w.id === id)?.name || id?.slice(0, 8) || '—';
  const unitSymbol = (id?: string) => (id ? unitsById[id]?.symbol : '') || '';

  return (
    <AppShell
      title="تقييم المخزون"
      subtitle="قيمة الأرصدة الحالية بالتكلفة (سعر الشراء) لكل مخزن وصنف وفئة — تقرير تدقيقي معتمد"
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
            label="قيمة المخزون الإجمالية"
            value={`${formatNumber(totals.value)} ج.م`}
            icon={<Wallet className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />}
            variant="emerald"
          />
          <KpiCard
            label="إجمالي الكميات المخزنة"
            value={formatNumber(totals.qty)}
            icon={<Package className="w-5 h-5 text-blue-600 dark:text-blue-400" />}
            variant="blue"
          />
          <KpiCard
            label="المستودعات المغطاة"
            value={totals.warehouseCount.toString()}
            icon={<WarehouseIcon className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />}
            variant="indigo"
          />
          <KpiCard
            label="الأصناف المدرجة"
            value={rows.length.toString()}
            icon={<Layers className="w-5 h-5 text-amber-600 dark:text-amber-400" />}
            variant="amber"
          />
        </div>

        {/* Filter and Search Bar */}
        <div className="bg-card p-4 rounded-2xl border border-border shadow-xs flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex flex-wrap items-center gap-3 w-full md:w-auto flex-1">
            <div className="relative flex-1 min-w-[220px] max-w-sm">
              <Search className="w-4 h-4 absolute right-3.5 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none" />
              <Input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="بحث باسم الصنف أو الباركود..."
                className="pr-10 h-10 rounded-xl bg-background border-border text-xs"
              />
            </div>

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
              <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                <SelectTrigger className="w-full h-10 rounded-xl bg-background border-border text-xs font-medium">
                  <SelectValue placeholder="الفئة" />
                </SelectTrigger>
                <SelectContent className="z-50 bg-popover border border-border rounded-xl shadow-xl">
                  <SelectItem value="all">كل الفئات</SelectItem>
                  {categories.map((c) => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Category Badges Preview */}
          <div className="flex items-center gap-2 overflow-x-auto max-w-full pb-1 md:pb-0">
            <span className="text-2xs font-semibold text-muted-foreground shrink-0">حسب الفئة:</span>
            {Object.entries(totals.byCategory).slice(0, 3).map(([catId, v]) => (
              <span
                key={catId || 'none'}
                className="px-2.5 py-1 rounded-full bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border border-emerald-500/20 text-3xs font-bold shrink-0"
              >
                {catName(catId)}: {formatNumber(v)} ج.م
              </span>
            ))}
          </div>
        </div>

        {/* Valuation Table */}
        <div className="bg-card rounded-2xl border border-border overflow-hidden shadow-xs print:border-0">
          <ScrollArea className="h-[calc(100vh-420px)] min-h-[400px]">
            <Table>
              <TableHeader className="sticky top-0 z-10 bg-muted/60 backdrop-blur-sm shadow-xs">
                <TableRow className="border-border hover:bg-transparent">
                  <TableHead className="text-2xs font-bold uppercase tracking-wider text-muted-foreground">الصنف</TableHead>
                  <TableHead className="text-2xs font-bold uppercase tracking-wider text-muted-foreground">الكود (SKU)</TableHead>
                  <TableHead className="text-2xs font-bold uppercase tracking-wider text-muted-foreground">الفئة</TableHead>
                  <TableHead className="text-2xs font-bold uppercase tracking-wider text-muted-foreground">المخزن</TableHead>
                  <TableHead className="text-2xs font-bold uppercase tracking-wider text-muted-foreground">الرصيد</TableHead>
                  <TableHead className="text-2xs font-bold uppercase tracking-wider text-muted-foreground">الوحدة</TableHead>
                  <TableHead className="text-2xs font-bold uppercase tracking-wider text-muted-foreground">سعر التكلفة</TableHead>
                  <TableHead className="text-2xs font-bold uppercase tracking-wider text-muted-foreground text-left">إجمالي القيمة</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody className="text-xs">
                {isLoading ? (
                  Array.from({ length: 7 }).map((_, i) => (
                    <TableRow key={i} className="border-border">
                      <TableCell colSpan={8} className="py-4 px-4">
                        <Skeleton className="h-6 w-full opacity-60" />
                      </TableCell>
                    </TableRow>
                  ))
                ) : rows.length === 0 ? (
                  <TableRow className="border-border hover:bg-transparent">
                    <TableCell colSpan={8} className="py-16">
                      <EmptyState
                        icon={<FolderOpen className="w-10 h-10 text-muted-foreground/60" />}
                        title="لا توجد أرصدة مخزنية"
                        description="لا توجد أصناف مطابقة للفلاتر أو معايير البحث المحددة حالياً."
                      />
                    </TableCell>
                  </TableRow>
                ) : (
                  rows.map(({ level, product }) => {
                    const lineValue = level.quantity * (product.purchase_price || 0);
                    return (
                      <TableRow
                        key={level.id}
                        className="border-border hover:bg-muted/40 transition-colors group"
                      >
                        <TableCell className="font-bold text-foreground py-3.5">
                          {product.name}
                        </TableCell>
                        <TableCell>
                          <span className="font-mono text-3xs px-2 py-0.5 rounded-md bg-muted text-muted-foreground border border-border">
                            {product.sku}
                          </span>
                        </TableCell>
                        <TableCell className="text-muted-foreground">
                          {catName(product.category_id)}
                        </TableCell>
                        <TableCell className="font-medium text-foreground">
                          {warehouseName(level.warehouse_id)}
                        </TableCell>
                        <TableCell className="font-bold font-mono text-foreground">
                          {formatNumber(level.quantity)}
                        </TableCell>
                        <TableCell className="text-muted-foreground font-medium">
                          {unitSymbol(product.base_unit_id)}
                        </TableCell>
                        <TableCell className="font-mono text-muted-foreground">
                          {formatNumber(product.purchase_price || 0)} ج.م
                        </TableCell>
                        <TableCell className="font-bold font-mono text-emerald-600 dark:text-emerald-400 text-left bg-emerald-500/5 group-hover:bg-emerald-500/10 transition-colors">
                          {formatNumber(lineValue)} ج.م
                        </TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
              {rows.length > 0 && !isLoading && (
                <TableFooter className="sticky bottom-0 z-10 bg-card border-t border-border font-bold text-sm">
                  <TableRow className="border-border hover:bg-transparent">
                    <TableCell colSpan={7} className="py-4 text-foreground">
                      الإجمالي الكلي لقيمة المخزون
                    </TableCell>
                    <TableCell className="py-4 text-emerald-600 dark:text-emerald-400 text-left text-base font-mono">
                      {formatNumber(totals.value)} ج.م
                    </TableCell>
                  </TableRow>
                </TableFooter>
              )}
            </Table>
          </ScrollArea>
        </div>
      </div>
    </AppShell>
  );
}

export default function ValuationPage() {
  return (
    <Suspense
      fallback={
        <div className="h-screen w-full flex items-center justify-center bg-background">
          <div className="w-9 h-9 border-3 border-primary border-t-transparent rounded-full animate-spin" />
        </div>
      }
    >
      <ValuationContent />
    </Suspense>
  );
}