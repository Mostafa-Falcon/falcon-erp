'use client';

import React, { useEffect, useState, useMemo, Suspense } from 'react';
import Link from 'next/link';
import { AppShell } from '@/components/layout/AppShell';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { KpiCard } from '@/components/ui/kpi-card';
import { EmptyState } from '@/components/ui/empty-state';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Skeleton } from '@/components/ui/skeleton';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useSessionStore } from '@/core/state/useSessionStore';
import { InventoryRepository } from '@/modules/inventory/inventory_repository';
import { ProductRepository } from '@/modules/inventory/product_repository';
import { formatNumber, formatDateTime } from '@/lib/format';
import {
  SlidersHorizontal,
  Plus,
  Search,
  ArrowDownLeft,
  ArrowUpRight,
  TrendingUp,
  RefreshCw,
  FolderOpen,
  ClipboardCheck,
  X,
  CheckCircle2,
  Package
} from 'lucide-react';
import type { InventoryTransaction, Product, Warehouse, Unit } from '@/types';
import { toast } from 'sonner';

function AdjustmentsContent() {
  const { currentUser } = useSessionStore();
  const orgId = currentUser?.org_id || '';

  const [transactions, setTransactions] = useState<InventoryTransaction[]>([]);
  const [warehouses, setWarehouses] = useState<Warehouse[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [unitsById, setUnitsById] = useState<Record<string, Unit>>({});
  const [isLoading, setIsLoading] = useState(true);

  // Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [warehouseFilter, setWarehouseFilter] = useState('all');
  const [typeFilter, setTypeFilter] = useState('all');

  // New Direct Adjustment Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formWarehouseId, setFormWarehouseId] = useState('');
  const [formProductId, setFormProductId] = useState('');
  const [adjustmentDirection, setAdjustmentDirection] = useState<'in' | 'out'>('in');
  const [formQuantity, setFormQuantity] = useState('1');
  const [formNotes, setFormNotes] = useState('');

  const loadData = async () => {
    if (!orgId) return;
    try {
      setIsLoading(true);
      const { db } = await import('@/core/db/app_database');
      const [trans, whs, prods, unts] = await Promise.all([
        db.inventory_transactions
          .where('org_id')
          .equals(orgId)
          .and((t) => t.transaction_type === 'adjustment_in' || t.transaction_type === 'adjustment_out')
          .reverse()
          .sortBy('created_at'),
        db.warehouses.where('org_id').equals(orgId).toArray(),
        ProductRepository.getAll(orgId),
        ProductRepository.getAllUnits(orgId),
      ]);

      const umap: Record<string, Unit> = {};
      for (const u of unts) umap[u.id] = u;

      setTransactions(trans);
      setWarehouses(whs);
      setProducts(prods);
      setUnitsById(umap);

      if (whs.length > 0 && !formWarehouseId) {
        setFormWarehouseId(whs[0].id);
      }
    } catch (err) {
      console.error('Error loading adjustments:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [orgId]);

  const filtered = useMemo(() => {
    return transactions.filter((t) => {
      const q = searchQuery.toLowerCase().trim();
      const prod = products.find((p) => p.id === t.product_id);
      const matchQuery =
        !q ||
        prod?.name.toLowerCase().includes(q) ||
        prod?.sku.toLowerCase().includes(q) ||
        (t.notes && t.notes.toLowerCase().includes(q));
      const matchWarehouse = warehouseFilter === 'all' || t.warehouse_id === warehouseFilter;
      const matchType = typeFilter === 'all' || t.transaction_type === typeFilter;
      return matchQuery && matchWarehouse && matchType;
    });
  }, [transactions, products, searchQuery, warehouseFilter, typeFilter]);

  const stats = useMemo(() => {
    let inCount = 0;
    let outCount = 0;
    let inQty = 0;
    let outQty = 0;
    for (const t of filtered) {
      if (t.transaction_type === 'adjustment_in') {
        inCount++;
        inQty += Math.abs(t.base_quantity);
      } else {
        outCount++;
        outQty += Math.abs(t.base_quantity);
      }
    }
    const netQty = inQty - outQty;
    return { total: filtered.length, inCount, outCount, inQty, outQty, netQty };
  }, [filtered]);

  const selectedProduct = useMemo(() => {
    return products.find((p) => p.id === formProductId);
  }, [products, formProductId]);

  const handleCreateAdjustment = async () => {
    if (!orgId || !currentUser?.id) return;
    if (!formWarehouseId) {
      toast.error('يرجى اختيار المستودع');
      return;
    }
    if (!formProductId) {
      toast.error('يرجى اختيار الصنف المطلوب تسويته');
      return;
    }
    const qtyNum = parseFloat(formQuantity);
    if (isNaN(qtyNum) || qtyNum <= 0) {
      toast.error('يرجى إدخال كمية صحيحة أكبر من صفر');
      return;
    }

    try {
      setIsSubmitting(true);
      const prod = selectedProduct;
      const signedQty = adjustmentDirection === 'in' ? qtyNum : -qtyNum;

      const res = await InventoryRepository.adjustStock({
        orgId,
        warehouseId: formWarehouseId,
        productId: formProductId,
        quantity: signedQty,
        unitId: prod?.base_unit_id || '',
        conversionFactor: 1,
        unitCost: prod?.purchase_price || 0,
        notes: formNotes || (adjustmentDirection === 'in' ? 'تسوية رصيد بالزيادة' : 'تسوية رصيد بالعجز'),
        userId: currentUser.id,
        type: 'adjustment',
      });

      if (!res.success) {
        toast.error(res.error || 'فشلت عملية التسوية المخزنية');
        return;
      }

      toast.success('تم تسجيل حركة التسوية وتحديث رصيد المخزن بنجاح');
      setIsModalOpen(false);
      setFormQuantity('1');
      setFormNotes('');
      await loadData();
    } catch (err: any) {
      console.error(err);
      toast.error(err?.message || 'حدث خطأ أثناء حفظ التسوية');
    } finally {
      setIsSubmitting(false);
    }
  };

  const getProductName = (id: string) => products.find((p) => p.id === id)?.name || id.slice(0, 8);
  const getProductSku = (id: string) => products.find((p) => p.id === id)?.sku || '—';
  const getWarehouseName = (id: string) => warehouses.find((w) => w.id === id)?.name || '—';
  const getUnitSymbol = (id?: string) => (id ? unitsById[id]?.symbol : '') || 'قطعة';

  return (
    <AppShell
      title="تسويات المخزون"
      subtitle="تسجيل حركات تسوية الأرصدة المباشرة (إضافة فائض / خصم عجز) ومتابعة قيود الفروقات الفورية"
      actions={
        <div className="flex items-center gap-2">
          <Link href="/inventory/stocktake">
            <Button
              variant="outline"
              className="h-10 px-3.5 bg-card border-border hover:bg-muted text-xs font-semibold rounded-xl flex items-center gap-2 transition-all shadow-xs"
            >
              <ClipboardCheck className="w-3.5 h-3.5 text-primary" />
              <span>الجرد الفعلي للمخزون</span>
            </Button>
          </Link>

          <Button
            variant="outline"
            onClick={loadData}
            className="h-10 px-3 bg-card border-border hover:bg-muted text-xs font-semibold rounded-xl flex items-center gap-1.5 transition-all shadow-xs"
          >
            <RefreshCw className={`w-3.5 h-3.5 text-muted-foreground ${isLoading ? 'animate-spin' : ''}`} />
            <span>تحديث</span>
          </Button>

          <Button
            onClick={() => setIsModalOpen(true)}
            className="h-10 px-4 bg-primary text-primary-foreground hover:bg-primary/90 text-xs font-semibold rounded-xl flex items-center gap-2 shadow-xs transition-all"
          >
            <Plus className="w-4 h-4" />
            <span>تسجيل تسوية فورية</span>
          </Button>
        </div>
      }
    >
      <div className="space-y-6">
        {/* KPI Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <KpiCard
            label="إجمالي حركات التسوية"
            value={stats.total.toString()}
            icon={<SlidersHorizontal className="w-5 h-5 text-blue-600 dark:text-blue-400" />}
            variant="blue"
          />
          <KpiCard
            label="تسويات بالزيادة (فائض)"
            value={`${stats.inCount} عملية (${formatNumber(stats.inQty)})`}
            icon={<ArrowDownLeft className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />}
            variant="emerald"
          />
          <KpiCard
            label="تسويات بالعجز (نقص)"
            value={`${stats.outCount} عملية (${formatNumber(stats.outQty)})`}
            icon={<ArrowUpRight className="w-5 h-5 text-rose-600 dark:text-rose-400" />}
            variant="rose"
          />
          <KpiCard
            label="صافي كميات التسوية"
            value={`${stats.netQty >= 0 ? '+' : ''}${formatNumber(stats.netQty)}`}
            icon={<TrendingUp className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />}
            variant={stats.netQty >= 0 ? 'indigo' : 'amber'}
          />
        </div>

        {/* Filters Toolbar */}
        <div className="bg-card p-4 rounded-2xl border border-border shadow-xs flex flex-wrap items-center justify-between gap-4">
          <div className="flex flex-wrap items-center gap-3 w-full md:w-auto flex-1">
            <div className="relative flex-1 min-w-[220px] max-w-sm">
              <Search className="w-4 h-4 absolute right-3.5 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none" />
              <Input
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="البحث باسم الصنف، الباركود، أو الملاحظة..."
                className="pr-10 h-10 rounded-xl bg-background border-border text-xs"
              />
            </div>

            <div className="w-full sm:w-44">
              <Select value={warehouseFilter} onValueChange={setWarehouseFilter}>
                <SelectTrigger className="w-full h-10 rounded-xl bg-background border-border text-xs font-medium">
                  <SelectValue placeholder="المستودع" />
                </SelectTrigger>
                <SelectContent className="z-50 bg-popover border border-border rounded-xl shadow-xl">
                  <SelectItem value="all">كل المستودعات</SelectItem>
                  {warehouses.map((w) => (
                    <SelectItem key={w.id} value={w.id}>
                      {w.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="w-full sm:w-44">
              <Select value={typeFilter} onValueChange={setTypeFilter}>
                <SelectTrigger className="w-full h-10 rounded-xl bg-background border-border text-xs font-medium">
                  <SelectValue placeholder="نوع التسوية" />
                </SelectTrigger>
                <SelectContent className="z-50 bg-popover border border-border rounded-xl shadow-xl">
                  <SelectItem value="all">كل أنواع التسويات</SelectItem>
                  <SelectItem value="adjustment_in">تسوية بالزيادة (+)</SelectItem>
                  <SelectItem value="adjustment_out">تسوية بالعجز (-)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {(searchQuery || warehouseFilter !== 'all' || typeFilter !== 'all') && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setSearchQuery('');
                  setWarehouseFilter('all');
                  setTypeFilter('all');
                }}
                className="h-10 px-3 text-xs text-muted-foreground hover:text-foreground rounded-xl flex items-center gap-1.5"
              >
                <X className="w-3.5 h-3.5" />
                <span>إعادة ضبط</span>
              </Button>
            )}
          </div>
        </div>

        {/* Adjustments Table */}
        <div className="bg-card rounded-2xl border border-border overflow-hidden shadow-xs">
          <ScrollArea className="h-[calc(100vh-420px)] min-h-[380px]">
            <Table>
              <TableHeader className="sticky top-0 z-10 bg-muted/60 backdrop-blur-sm shadow-xs">
                <TableRow className="border-border hover:bg-transparent">
                  <TableHead className="text-2xs font-bold uppercase tracking-wider text-muted-foreground">التاريخ والوقت</TableHead>
                  <TableHead className="text-2xs font-bold uppercase tracking-wider text-muted-foreground">المستودع</TableHead>
                  <TableHead className="text-2xs font-bold uppercase tracking-wider text-muted-foreground">الصنف</TableHead>
                  <TableHead className="text-2xs font-bold uppercase tracking-wider text-muted-foreground">الكود (SKU)</TableHead>
                  <TableHead className="text-2xs font-bold uppercase tracking-wider text-muted-foreground">نوع التسوية</TableHead>
                  <TableHead className="text-2xs font-bold uppercase tracking-wider text-muted-foreground">كمية التسوية</TableHead>
                  <TableHead className="text-2xs font-bold uppercase tracking-wider text-muted-foreground">تكلفة الوحدة</TableHead>
                  <TableHead className="text-2xs font-bold uppercase tracking-wider text-muted-foreground">الرصيد بعد الحركة</TableHead>
                  <TableHead className="text-2xs font-bold uppercase tracking-wider text-muted-foreground">البيان والملاحظات</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody className="text-xs">
                {isLoading ? (
                  Array.from({ length: 5 }).map((_, i) => (
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
                        title="لا توجد حركات تسوية مخزنية"
                        description="يمكنك تسجيل حركة تسوية مباشرة لمعالجة الزيادة أو العجز في أرصدة الأصناف."
                        action={{
                          label: 'تسجيل تسوية فورية الآن',
                          onClick: () => setIsModalOpen(true),
                          icon: <Plus className="w-4 h-4 ml-1.5" />,
                        }}
                      />
                    </TableCell>
                  </TableRow>
                ) : (
                  filtered.map((t) => {
                    const isIn = t.transaction_type === 'adjustment_in';
                    return (
                      <TableRow
                        key={t.id}
                        className="border-border hover:bg-muted/40 transition-colors group"
                      >
                        <TableCell className="text-muted-foreground font-mono text-3xs whitespace-nowrap py-3.5">
                          {formatDateTime(t.created_at)}
                        </TableCell>
                        <TableCell className="font-medium text-foreground">
                          {getWarehouseName(t.warehouse_id)}
                        </TableCell>
                        <TableCell className="font-bold text-foreground">
                          {getProductName(t.product_id)}
                        </TableCell>
                        <TableCell>
                          <span className="font-mono text-3xs px-2 py-0.5 rounded-md bg-muted text-muted-foreground border border-border">
                            {getProductSku(t.product_id)}
                          </span>
                        </TableCell>
                        <TableCell>
                          {isIn ? (
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-3xs font-bold bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border border-emerald-500/20">
                              <ArrowDownLeft className="w-3 h-3" />
                              <span>زيادة رصيد (فائض)</span>
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-3xs font-bold bg-rose-500/10 text-rose-700 dark:text-rose-400 border border-rose-500/20">
                              <ArrowUpRight className="w-3 h-3" />
                              <span>خصم عجز (نقص)</span>
                            </span>
                          )}
                        </TableCell>
                        <TableCell className={`font-bold font-mono text-xs ${
                          isIn ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'
                        }`}>
                          {isIn ? '+' : '-'}{formatNumber(Math.abs(t.base_quantity))} {getUnitSymbol(t.unit_id)}
                        </TableCell>
                        <TableCell className="font-mono text-3xs text-muted-foreground">
                          {formatNumber(t.unit_cost)} ج.م
                        </TableCell>
                        <TableCell className="font-mono font-bold text-foreground bg-muted/20">
                          {formatNumber(t.balance_after)}
                        </TableCell>
                        <TableCell className="text-muted-foreground max-w-48 truncate italic text-3xs">
                          {t.notes || '—'}
                        </TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </ScrollArea>
        </div>
      </div>

      {/* Direct Adjustment Modal */}
      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="max-w-md rounded-2xl bg-card border-border shadow-2xl" dir="rtl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-base font-bold text-foreground">
              <SlidersHorizontal className="w-5 h-5 text-primary" />
              <span>تسجيل تسوية مخزنية فورية</span>
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div>
              <label className="text-2xs font-semibold text-muted-foreground block mb-1.5">
                المستودع المستهدف:
              </label>
              <Select value={formWarehouseId} onValueChange={setFormWarehouseId}>
                <SelectTrigger className="w-full h-10 rounded-xl bg-background border-border text-xs font-medium">
                  <SelectValue placeholder="اختر المستودع" />
                </SelectTrigger>
                <SelectContent className="z-50 bg-popover border border-border rounded-xl shadow-xl">
                  {warehouses.map((w) => (
                    <SelectItem key={w.id} value={w.id}>
                      {w.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="text-2xs font-semibold text-muted-foreground block mb-1.5">
                الصنف المطلوب تسويته:
              </label>
              <Select value={formProductId} onValueChange={setFormProductId}>
                <SelectTrigger className="w-full h-10 rounded-xl bg-background border-border text-xs font-medium">
                  <SelectValue placeholder="اختر الصنف" />
                </SelectTrigger>
                <SelectContent className="z-50 bg-popover border border-border rounded-xl shadow-xl max-h-60">
                  {products.map((p) => (
                    <SelectItem key={p.id} value={p.id}>
                      {p.name} ({p.sku})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="text-2xs font-semibold text-muted-foreground block mb-1.5">
                نوع وحركة التسوية:
              </label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setAdjustmentDirection('in')}
                  className={`h-11 rounded-xl font-bold text-xs flex items-center justify-center gap-2 border transition-all cursor-pointer ${
                    adjustmentDirection === 'in'
                      ? 'bg-emerald-500/15 border-emerald-500 text-emerald-700 dark:text-emerald-400 ring-2 ring-emerald-500/20'
                      : 'bg-background border-border text-muted-foreground hover:bg-muted'
                  }`}
                >
                  <ArrowDownLeft className="w-4 h-4 text-emerald-600" />
                  <span>زيادة رصيد (فائض)</span>
                </button>

                <button
                  type="button"
                  onClick={() => setAdjustmentDirection('out')}
                  className={`h-11 rounded-xl font-bold text-xs flex items-center justify-center gap-2 border transition-all cursor-pointer ${
                    adjustmentDirection === 'out'
                      ? 'bg-rose-500/15 border-rose-500 text-rose-700 dark:text-rose-400 ring-2 ring-rose-500/20'
                      : 'bg-background border-border text-muted-foreground hover:bg-muted'
                  }`}
                >
                  <ArrowUpRight className="w-4 h-4 text-rose-600" />
                  <span>خصم عجز (نقص)</span>
                </button>
              </div>
            </div>

            <div>
              <label className="text-2xs font-semibold text-muted-foreground block mb-1.5">
                كمية التسوية:
              </label>
              <Input
                type="number"
                min="0.001"
                step="any"
                value={formQuantity}
                onChange={(e) => setFormQuantity(e.target.value)}
                placeholder="أدخل الكمية..."
                className="h-10 rounded-xl bg-background border-border text-xs font-mono font-bold"
              />
            </div>

            <div>
              <label className="text-2xs font-semibold text-muted-foreground block mb-1.5">
                سبب التسوية والملاحظات:
              </label>
              <Input
                type="text"
                value={formNotes}
                onChange={(e) => setFormNotes(e.target.value)}
                placeholder="مثال: تصحيح خطأ إدخال سابق، كشف فائض، إلخ..."
                className="h-10 rounded-xl bg-background border-border text-xs"
              />
            </div>
          </div>

          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              variant="outline"
              onClick={() => setIsModalOpen(false)}
              className="rounded-xl text-xs font-semibold"
            >
              إلغاء
            </Button>
            <Button
              onClick={handleCreateAdjustment}
              disabled={isSubmitting}
              className="rounded-xl text-xs font-semibold bg-primary text-primary-foreground hover:bg-primary/90"
            >
              {isSubmitting ? 'جاري الحفظ...' : 'تأكيد وحفظ التسوية'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AppShell>
  );
}

export default function AdjustmentsPage() {
  return (
    <Suspense
      fallback={
        <div className="h-screen w-full flex items-center justify-center bg-background">
          <div className="w-9 h-9 border-3 border-primary border-t-transparent rounded-full animate-spin" />
        </div>
      }
    >
      <AdjustmentsContent />
    </Suspense>
  );
}