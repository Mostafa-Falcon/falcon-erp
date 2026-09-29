'use client';

import React, { useEffect, useMemo, useState } from'react';
import { Suspense } from'react';
import { AppShell } from'@/components/layout/AppShell';
import { Button } from'@/components/ui/button';
import { Icons } from'@/components/ui/Icons';
import {
 Select,
 SelectContent,
 SelectItem,
 SelectTrigger,
 SelectValue,
} from'@/components/ui/select';
import { useSessionStore } from'@/core/state/useSessionStore';
import { ProductRepository } from'@/modules/inventory/product_repository';
import { InventoryRepository } from'@/modules/inventory/inventory_repository';
import { formatNumber } from'@/lib/format';
import type { Product, StockLevel, Unit, Warehouse } from'@/types';

const selectCls =
'h-10 px-3 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 text-xs font-bold text-slate-700 dark:text-slate-200 focus:outline-none focus:ring-1 focus:ring-[#558b2f]';

function ReorderContent() {
 const { currentUser } = useSessionStore();
 const orgId = currentUser?.org_id ||'';

 const [products, setProducts] = useState<Product[]>([]);
 const [warehouses, setWarehouses] = useState<Warehouse[]>([]);
 const [unitsById, setUnitsById] = useState<Record<string, Unit>>({});
 const [stockLevels, setStockLevels] = useState<StockLevel[]>([]);
 const [warehouseFilter, setWarehouseFilter] = useState('all');
 const [isLoading, setIsLoading] = useState(true);

 useEffect(() => {
 if (!orgId) return;
 const load = async () => {
 const { db } = await import('@/core/db/app_database');
 try {
 const [prods, whs, unts, levels] = await Promise.all([
 ProductRepository.getAll(orgId),
 InventoryRepository.getWarehouses(orgId),
 ProductRepository.getAllUnits(orgId),
 db.stock_levels.where('org_id').equals(orgId).toArray(),
 ]);
 const umap: Record<string, Unit> = {};
 for (const u of unts) umap[u.id] = u;
 setProducts(prods.filter((p) => p.item_type ==='storable'));
 setWarehouses(whs);
 setUnitsById(umap);
 setStockLevels(levels);
 } catch (err) {
 console.error('Load reorder list error:', err);
 } finally {
 setIsLoading(false);
 }
 };
 Promise.resolve().then(load);
 }, [orgId]);

 const rows = useMemo(() => {
 const byId = new Map(stockLevels.map((l) => [`${l.warehouse_id}_${l.product_id}`, l]));
 const result: {
 product: Product;
 warehouse: Warehouse | undefined;
 current: number;
 min: number;
 shortage: number;
 estCost: number;
 }[] = [];
 for (const p of products) {
 if (!(p.min_stock_alert > 0)) continue;
 for (const w of warehouses) {
 const current = byId.get(`${w.id}_${p.id}`)?.quantity || 0;
 if (current < p.min_stock_alert) {
 result.push({
 product: p,
 warehouse: w,
 current,
 min: p.min_stock_alert,
 shortage: p.min_stock_alert - current,
 estCost: (p.min_stock_alert - current) * (p.purchase_price || 0),
 });
 }
 }
 }
 return result.filter(({ warehouse }) => warehouseFilter ==='all'|| warehouse?.id === warehouseFilter);
 }, [products, warehouses, stockLevels, warehouseFilter]);

 const totals = useMemo(() => {
 const itemCount = rows.length;
 const qty = rows.reduce((a, r) => a + r.shortage, 0);
 const cost = rows.reduce((a, r) => a + r.estCost, 0);
 return { itemCount, qty, cost };
 }, [rows]);

 return (
 <AppShell
 title="أصناف تحت حد الطلب"
 subtitle="قائمة الأصناف التي وصل رصيدها لأقل من حد التنبيه — مقترحات الشراء جاهزة للاستخدام في فواتير المشتريات"
 actions={
 <Button
 onClick={() => window.print()}
 className="h-10 px-4 bg-surface border border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800 text-xs font-bold text-slate-700 dark:text-slate-200 rounded-xl flex items-center gap-2"
 >
 <Icons.Print /> طباعة القائمة
 </Button>
 }
 >
 {/* KPIs */}
 <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
 <div className="bg-surface p-4 rounded-2xl border border-slate-200/80 dark:border-slate-800">
 <span className="text-xs font-bold text-slate-400">أصناف ناقصة</span>
 <div className="text-xl font-black text-amber-600 mt-1">{formatNumber(totals.itemCount)}</div>
 </div>
 <div className="bg-surface p-4 rounded-2xl border border-slate-200/80 dark:border-slate-800">
 <span className="text-xs font-bold text-slate-400">إجمالي الكمية المطلوبة</span>
 <div className="text-xl font-black text-slate-900 dark:text-white mt-1">{formatNumber(totals.qty)}</div>
 </div>
 <div className="bg-surface p-4 rounded-2xl border border-slate-200/80 dark:border-slate-800">
 <span className="text-xs font-bold text-slate-400">التكلفة التقديرية للشراء</span>
 <div className="text-xl font-black text-[#558b2f] mt-1">{formatNumber(totals.cost)}</div>
 </div>
 </div>

 {/* Filters */}
 <div className="flex flex-col lg:flex-row gap-3 items-center bg-surface p-4 rounded-2xl border border-slate-200/80 dark:border-slate-800">
 <div className="w-full lg:w-60">
 <Select value={warehouseFilter} onValueChange={setWarehouseFilter}>
 <SelectTrigger className="w-full h-10 rounded-xl bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-xs font-bold">
 <SelectValue placeholder="اختر المخزن"/>
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
 <span className="text-2xs font-bold text-slate-400">
 الكمية المطلوبة = حد التنبيه (min) − الرصيد الحالي
 </span>
 </div>

 {/* List */}
 <div className="bg-surface rounded-2xl border border-slate-200/80 dark:border-slate-800 overflow-hidden print:border-0">
 <div className="overflow-x-auto">
 <table className="w-full text-right border-collapse">
 <thead>
 <tr className="bg-slate-50 dark:bg-slate-900/60 border-b border-slate-200 dark:border-slate-800 text-2xs font-black text-slate-500 dark:text-slate-400 uppercase tracking-wider">
 <th className="py-3.5 px-4">الصنف</th>
 <th className="py-3.5 px-4">الكود</th>
 <th className="py-3.5 px-4">المخزن</th>
 <th className="py-3.5 px-4">الرصيد الحالي</th>
 <th className="py-3.5 px-4">حد التنبيه</th>
 <th className="py-3.5 px-4">العجز</th>
 <th className="py-3.5 px-4">الوحدة</th>
 <th className="py-3.5 px-4">التكلفة التقديرية</th>
 </tr>
 </thead>
 <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60 text-xs">
 {isLoading ? (
 <tr><td colSpan={8} className="py-12 text-center text-slate-400 font-semibold">جاري التحميل...</td></tr>
 ) : rows.length === 0 ? (
 <tr><td colSpan={8} className="py-12 text-center text-slate-400 font-semibold">لا توجد أصناف تحت حد الطلب. كل الأرصدة في وضع سليم.</td></tr>
 ) : (
 rows.map((r) => (
 <tr key={`${r.product.id}_${r.warehouse?.id}`} className="hover:bg-slate-50/70 dark:hover:bg-slate-800/40 transition-colors">
 <td className="py-3 px-4 font-bold text-slate-900 dark:text-white">{r.product.name}</td>
 <td className="py-3 px-4 font-mono text-slate-500">{r.product.sku}</td>
 <td className="py-3 px-4 font-bold text-slate-700 dark:text-slate-300">{r.warehouse?.name ||'—'}</td>
 <td className="py-3 px-4 font-black text-red-600">{formatNumber(r.current)}</td>
 <td className="py-3 px-4 font-bold text-slate-700 dark:text-slate-300">{formatNumber(r.min)}</td>
 <td className="py-3 px-4 font-black text-amber-600">{formatNumber(r.shortage)}</td>
 <td className="py-3 px-4 text-slate-500">{unitsById[r.product.base_unit_id]?.symbol ||''}</td>
 <td className="py-3 px-4 font-black text-[#558b2f]">{formatNumber(r.estCost)}</td>
 </tr>
 ))
 )}
 </tbody>
 {rows.length > 0 && (
 <tfoot>
 <tr className="border-t-2 border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/60 font-black text-sm">
 <td colSpan={3} className="py-3 px-4 text-slate-700 dark:text-slate-200">الإجمالي</td>
 <td colSpan={3} className="py-3 px-4 text-amber-600">{formatNumber(totals.qty)}</td>
 <td className="py-3 px-4"></td>
 <td className="py-3 px-4 text-[#558b2f]">{formatNumber(totals.cost)}</td>
 </tr>
 </tfoot>
 )}
 </table>
 </div>
 </div>
 </AppShell>
 );
}

export default function ReorderPage() {
 return (
 <Suspense
 fallback={
 <div className="h-screen w-full flex items-center justify-center bg-app">
 <div className="w-9 h-9 border-3 border-[#558b2f] border-t-transparent rounded-full animate-spin"/>
 </div>
 }
 >
 <ReorderContent />
 </Suspense>
 );
}