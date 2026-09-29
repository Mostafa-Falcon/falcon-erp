'use client';

import React, { useEffect, useMemo, useState } from'react';
import { Suspense } from'react';
import { AppShell } from'@/components/layout/AppShell';
import { Button } from'@/components/ui/button';
import { Icons } from'@/components/ui/Icons';
import { Input } from'@/components/ui/input';
import {
 Select,
 SelectContent,
 SelectItem,
 SelectTrigger,
 SelectValue,
} from'@/components/ui/select';
import { Skeleton } from'@/components/ui/skeleton';
import { Separator } from'@/components/ui/separator';
import { ScrollArea } from'@/components/ui/scroll-area';
import {
 Table,
 TableBody,
 TableCell,
 TableFooter,
 TableHead,
 TableHeader,
 TableRow,
} from'@/components/ui/table';
import { useSessionStore } from'@/core/state/useSessionStore';
import { ProductRepository } from'@/modules/inventory/product_repository';
import { InventoryRepository } from'@/modules/inventory/inventory_repository';
import { formatNumber } from'@/lib/format';
import type { Product, ProductCategory, StockLevel, Unit, Warehouse } from'@/types';

function ValuationContent() {
 const { currentUser } = useSessionStore();
 const orgId = currentUser?.org_id ||'';

 const [products, setProducts] = useState<Product[]>([]);
 const [warehouses, setWarehouses] = useState<Warehouse[]>([]);
 const [categories, setCategories] = useState<ProductCategory[]>([]);
 const [unitsById, setUnitsById] = useState<Record<string, Unit>>({});
 const [stockLevels, setStockLevels] = useState<StockLevel[]>([]);
 const [isLoading, setIsLoading] = useState(true);

 const [warehouseFilter, setWarehouseFilter] = useState('all');
 const [categoryFilter, setCategoryFilter] = useState('all');
 const [searchQuery, setSearchQuery] = useState('');

 useEffect(() => {
 if (!orgId) return;
 const load = async () => {
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
 setProducts(prods.filter((p) => p.item_type ==='storable'));
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
 Promise.resolve().then(load);
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
 if (warehouseFilter !=='all'&& level.warehouse_id !== warehouseFilter) return false;
 if (categoryFilter !=='all'&& product.category_id !== categoryFilter) return false;
 if (q && !product.name.toLowerCase().includes(q) && !product.sku.toLowerCase().includes(q)) return false;
 return true;
 })
 .sort((a, b) => a.product.name.localeCompare(b.product.name,'ar'));
 }, [stockLevels, products, warehouseFilter, categoryFilter, searchQuery]);

 const totals = useMemo(() => {
 let value = 0;
 let qty = 0;
 const warehouses = new Set<string>();
 const byCategory: Record<string, number> = {};
 for (const { level, product } of rows) {
 const v = level.quantity * (product.purchase_price || 0);
 value += v;
 qty += Math.abs(level.quantity);
 warehouses.add(level.warehouse_id);
 const cat = product.category_id ||'';
 byCategory[cat] = (byCategory[cat] || 0) + v;
 }
 return { value, qty, warehouseCount: warehouses.size, byCategory };
 }, [rows]);

 const catName = (id?: string | null) => categories.find((c) => c.id === id)?.name ||'بدون فئة';
 const warehouseName = (id?: string) => warehouses.find((w) => w.id === id)?.name || id?.slice(0, 8) ||'—';
 const unitSymbol = (id?: string) => (id ? unitsById[id]?.symbol :'') ||'';

 return (
 <AppShell
 title="تقييم المخزون"
 subtitle="قيمة الأرصدة الحالية بالتكلفة (purchase price) لكل مخزن وصنف وفئة — قابل للطباعة"
 actions={
 <Button
 onClick={() => window.print()}
 className="h-10 px-4 bg-surface border border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800 text-xs font-bold text-slate-700 dark:text-slate-200 rounded-xl flex items-center gap-2"
 >
 <Icons.Print /> طباعة التقرير
 </Button>
 }
 >
 {/* KPIs */}
 <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
 <div className="bg-surface p-4 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-sm border-r-4 border-r-[#558b2f]">
 <span className="text-3xs font-black text-slate-400 uppercase tracking-widest">قيمة المخزون الإجمالية</span>
 <div className="text-2xl font-black text-[#558b2f] mt-1">{formatNumber(totals.value)}</div>
 </div>
 <div className="bg-surface p-4 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-sm">
 <span className="text-3xs font-black text-slate-400 uppercase tracking-widest">إجمالي الكميات</span>
 <div className="text-2xl font-black text-slate-900 dark:text-white mt-1">{formatNumber(totals.qty)}</div>
 </div>
 <div className="bg-surface p-4 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-sm">
 <span className="text-3xs font-black text-slate-400 uppercase tracking-widest">عدد المخازن</span>
 <div className="text-2xl font-black text-slate-900 dark:text-white mt-1">{formatNumber(totals.warehouseCount)}</div>
 </div>
 </div>

 <Separator className="my-2 opacity-50"/>

 {/* Filters */}
 <div className="flex flex-col lg:flex-row gap-3 flex-wrap items-center bg-surface p-4 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-sm">
 <div className="w-full sm:w-48">
 <Select value={warehouseFilter} onValueChange={setWarehouseFilter}>
 <SelectTrigger className="w-full h-10 rounded-xl bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-xs font-bold">
 <SelectValue placeholder="المخزن"/>
 </SelectTrigger>
 <SelectContent className="z-50 bg-surface border border-slate-200 dark:border-slate-800 rounded-xl shadow-xl">
 <SelectItem value="all"className="">
 كل المخازن
 </SelectItem>
 {warehouses.map((w) => (
 <SelectItem key={w.id} value={w.id} className="">
 {w.name}
 </SelectItem>
 ))}
 </SelectContent>
 </Select>
 </div>

 <div className="w-full sm:w-48">
 <Select value={categoryFilter} onValueChange={setCategoryFilter}>
 <SelectTrigger className="w-full h-10 rounded-xl bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-xs font-bold">
 <SelectValue placeholder="الفئة"/>
 </SelectTrigger>
 <SelectContent className="z-50 bg-surface border border-slate-200 dark:border-slate-800 rounded-xl shadow-xl">
 <SelectItem value="all"className="">
 كل الفئات
 </SelectItem>
 {categories.map((c) => (
 <SelectItem key={c.id} value={c.id} className="">
 {c.name}
 </SelectItem>
 ))}
 </SelectContent>
 </Select>
 </div>

 <div className="w-full sm:w-56">
 <Input
 type="text"
 value={searchQuery}
 onChange={(e) => setSearchQuery(e.target.value)}
 placeholder="بحث بالاسم أو الكود..."
 className="h-10 rounded-xl bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-xs font-bold"
 />
 </div>
 <div className="flex items-center gap-2 lg:mr-auto">
 <span className="text-2xs font-bold text-slate-400">حسب الفئة:</span>
 {Object.entries(totals.byCategory).map(([catId, v]) => (
 <span key={catId ||'none'} className="px-2 py-1 rounded-full bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 text-3xs font-black">
 {catName(catId)} {formatNumber(v)}
 </span>
 ))}
 </div>
 </div>

 {/* Valuation table */}
 <div className="bg-surface rounded-2xl border border-slate-200/80 dark:border-slate-800 overflow-hidden shadow-md print:border-0">
 <ScrollArea className="h-[calc(100vh-450px)] min-h-[400px]">
 <Table>
 <TableHeader className="sticky top-0 z-10 bg-slate-50/90 dark:bg-slate-900/90 backdrop-blur-sm shadow-sm">
 <TableRow>
 <TableHead className="text-2xs font-black uppercase tracking-wider">الصنف</TableHead>
 <TableHead className="text-2xs font-black uppercase tracking-wider">الكود</TableHead>
 <TableHead className="text-2xs font-black uppercase tracking-wider">الفئة</TableHead>
 <TableHead className="text-2xs font-black uppercase tracking-wider">المخزن</TableHead>
 <TableHead className="text-2xs font-black uppercase tracking-wider">الرصيد</TableHead>
 <TableHead className="text-2xs font-black uppercase tracking-wider">الوحدة</TableHead>
 <TableHead className="text-2xs font-black uppercase tracking-wider">تكلفة الوحدة</TableHead>
 <TableHead className="text-2xs font-black uppercase tracking-wider text-left">القيمة</TableHead>
 </TableRow>
 </TableHeader>
 <TableBody className="text-xs font-bold">
 {isLoading ? (
 Array.from({ length: 8 }).map((_, i) => (
 <TableRow key={i}>
 <TableCell colSpan={8} className="py-4 px-4">
 <Skeleton className="h-6 w-full opacity-50"/>
 </TableCell>
 </TableRow>
 ))
 ) : rows.length === 0 ? (
 <TableRow>
 <TableCell colSpan={8} className="py-20 text-center text-slate-400 font-bold">
 لا توجد أرصدة مطابقة للفلاتر المحددة.
 </TableCell>
 </TableRow>
 ) : (
 rows.map(({ level, product }) => (
 <TableRow key={level.id} className="hover:bg-slate-50/70 dark:hover:bg-slate-800/40 transition-colors group">
 <TableCell className="font-black text-slate-900 dark:text-white py-3">{product.name}</TableCell>
 <TableCell className="font-mono text-3xs text-slate-500">{product.sku}</TableCell>
 <TableCell className="text-slate-600 dark:text-slate-400">{catName(product.category_id)}</TableCell>
 <TableCell className="font-bold text-slate-700 dark:text-slate-300">{warehouseName(level.warehouse_id)}</TableCell>
 <TableCell className="font-black text-sm">{formatNumber(level.quantity)}</TableCell>
 <TableCell className="text-slate-500 font-medium">{unitSymbol(product.base_unit_id)}</TableCell>
 <TableCell className="font-mono">{formatNumber(product.purchase_price || 0)}</TableCell>
 <TableCell className="font-black text-[#558b2f] text-left text-sm bg-slate-50/30 dark:bg-slate-800/20 transition-colors group-hover:bg-emerald-50/50 dark:group-hover:bg-emerald-950/20">
 {formatNumber(level.quantity * (product.purchase_price || 0))}
 </TableCell>
 </TableRow>
 ))
 )}
 </TableBody>
 {rows.length > 0 && !isLoading && (
 <TableFooter className="sticky bottom-0 z-10 bg-slate-50 dark:bg-slate-900 font-black text-sm border-t-2">
 <TableRow>
 <TableCell colSpan={7} className="py-4 text-slate-700 dark:text-slate-200">الإجمالي الكلي للقيمة</TableCell>
 <TableCell className="py-4 text-[#558b2f] text-left text-lg">{formatNumber(totals.value)}</TableCell>
 </TableRow>
 </TableFooter>
 )}
 </Table>
 </ScrollArea>
 </div>
 </AppShell>
 );
}

export default function ValuationPage() {
 return (
 <Suspense
 fallback={
 <div className="h-screen w-full flex items-center justify-center bg-app">
 <div className="w-9 h-9 border-3 border-[#558b2f] border-t-transparent rounded-full animate-spin"/>
 </div>
 }
 >
 <ValuationContent />
 </Suspense>
 );
}