'use client';

import React, { useEffect, useMemo, useState } from'react';
import { Suspense } from'react';
import { AppShell } from'@/components/layout/AppShell';
import { Input } from'@/components/ui/input';
import { Button } from'@/components/ui/button';
import { Icons } from'@/components/ui/Icons';
import {
 Select,
 SelectContent,
 SelectItem,
 SelectTrigger,
 SelectValue,
} from'@/components/ui/select';
import { Textarea } from'@/components/ui/textarea';
import { useSessionStore } from'@/core/state/useSessionStore';
import { ProductRepository } from'@/modules/inventory/product_repository';
import { InventoryRepository } from'@/modules/inventory/inventory_repository';
import { formatNumber, formatDateTime } from'@/lib/format';
import type { Product, InventoryTransaction, Unit, Warehouse } from'@/types';

const selectCls =
'h-10 px-3 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 text-xs font-bold text-slate-700 dark:text-slate-200 focus:outline-none focus:ring-1 focus:ring-[#558b2f]';

const REASON_OPTIONS = ['تلف أثناء التداول','انتهاء الصلاحية','كسر','انكسار أثناء النقل','أخرى'];

function DamagesContent() {
 const { currentUser } = useSessionStore();
 const orgId = currentUser?.org_id ||'';

 const [warehouses, setWarehouses] = useState<Warehouse[]>([]);
 const [products, setProducts] = useState<Product[]>([]);
 const [unitsById, setUnitsById] = useState<Record<string, Unit>>({});
 const [movements, setMovements] = useState<InventoryTransaction[]>([]);
 const [isLoading, setIsLoading] = useState(true);

 // Form
 const [warehouseId, setWarehouseId] = useState('');
 const [productId, setProductId] = useState('');
 const [qty, setQty] = useState('1');
 const [unitId, setUnitId] = useState('');
 const [reason, setReason] = useState(REASON_OPTIONS[0]);
 const [notes, setNotes] = useState('');
 const [formError, setFormError] = useState('');
 const [isSaving, setIsSaving] = useState(false);

 const loadData = async () => {
 if (!orgId) return;
 try {
 const { db } = await import('@/core/db/app_database');
 const [whs, prods, unts, damMovements] = await Promise.all([
 db.warehouses.where('org_id').equals(orgId).and((w) => w.is_active).toArray(),
 ProductRepository.getAll(orgId),
 ProductRepository.getAllUnits(orgId),
 db.inventory_transactions
 .where('org_id')
 .equals(orgId)
 .and((t) => t.transaction_type ==='damaged')
 .reverse()
 .sortBy('created_at'),
 ]);

 const umap: Record<string, Unit> = {};
 for (const u of unts) umap[u.id] = u;

 setWarehouses(whs);
 setProducts(prods.filter((p) => p.item_type ==='storable'));
 setUnitsById(umap);
 setMovements(damMovements);
 if (whs.length > 0) {
 setWarehouseId((prev) => prev || whs[0].id);
 }
 } catch (err) {
 console.error('Load damages error:', err);
 } finally {
 setIsLoading(false);
 }
 };

 useEffect(() => {
 if (!orgId) return;
 Promise.resolve().then(loadData);
 // eslint-disable-next-line react-hooks/exhaustive-deps
 }, [orgId]);

 const onProductChange = (pid: string) => {
 setProductId(pid);
 const p = products.find((x) => x.id === pid);
 setUnitId(p?.base_unit_id ||'');
 };

 const sortMovements = useMemo(
 () =>
 [...movements].sort((a, b) =>
 b.created_at.localeCompare(a.created_at)
 ),
 [movements]
 );

 const totals = useMemo(() => {
 let qtyTotal = 0;
 let valueTotal = 0;
 for (const m of sortMovements) {
 qtyTotal += Math.abs(m.base_quantity);
 valueTotal += m.total_cost;
 }
 return { count: sortMovements.length, qtyTotal, valueTotal };
 }, [sortMovements]);

 const currentProduct = productId ? products.find((p) => p.id === productId) : undefined;

 const submit = async () => {
 setFormError('');
 if (!currentUser) return;
 if (!warehouseId) {
 setFormError('اختر المخزن.');
 return;
 }
 if (!currentProduct) {
 setFormError('اختر الصنف التالف.');
 return;
 }
 const q = Number(qty);
 if (!(q > 0)) {
 setFormError('الكمية يجب أن تكون أكبر من صفر.');
 return;
 }

 setIsSaving(true);
 try {
 const res = await InventoryRepository.adjustStock({
 orgId,
 warehouseId,
 productId: currentProduct.id,
 quantity: -q,
 unitId: unitId || currentProduct.base_unit_id,
 conversionFactor: 1,
 unitCost: currentProduct.purchase_price || 0,
 notes:`توالف: ${reason}${notes.trim() ?'—'+ notes.trim() :''}`,
 userId: currentUser.id,
 type:'damaged',
 });
 if (!res.success) {
 setFormError(res.error ||'حدث خطأ.');
 return;
 }
 setQty('1');
 setNotes('');
 setReason(REASON_OPTIONS[0]);
 setProductId('');
 await loadData();
 } catch (err) {
 console.error(err);
 setFormError(err instanceof Error ? err.message :'حدث خطأ أثناء تسجيل التوالف.');
 } finally {
 setIsSaving(false);
 }
 };

 return (
 <AppShell
 title="التوالف والتالف"
 subtitle="تسجيل الأصناف التالفة أو منتهية الصلاحية — خصم من الرصيد تلقائياً مع حركة'توالف'في كشف الحركة"
 >
 {/* KPIs */}
 <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
 <div className="bg-surface p-4 rounded-2xl border border-slate-200/80 dark:border-slate-800">
 <span className="text-xs font-bold text-slate-400">عمليات التوالف</span>
 <div className="text-xl font-black text-slate-900 dark:text-white mt-1">{formatNumber(totals.count)}</div>
 </div>
 <div className="bg-surface p-4 rounded-2xl border border-slate-200/80 dark:border-slate-800">
 <span className="text-xs font-bold text-slate-400">إجمالي الكميات التالفة</span>
 <div className="text-xl font-black text-amber-600 mt-1">{formatNumber(totals.qtyTotal)}</div>
 </div>
 <div className="bg-surface p-4 rounded-2xl border border-slate-200/80 dark:border-slate-800">
 <span className="text-xs font-bold text-slate-400">إجمالي قيمة التالف</span>
 <div className="text-xl font-black text-red-600 mt-1">{formatNumber(totals.valueTotal)}</div>
 </div>
 </div>

 {/* Register damage form */}
 <div className="bg-surface rounded-2xl border border-slate-200/80 dark:border-slate-800 p-5 space-y-4">
 <h3 className="text-sm font-black text-slate-900 dark:text-white flex items-center gap-2">
 <span className="text-[#558b2f]"><Icons.AlertTriangle /></span>
 تسجيل توالف جديد
 </h3>

 {formError && (
 <div className="rounded-xl bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800 px-4 py-3 text-xs font-bold text-red-700 dark:text-red-300">
 {formError}
 </div>
 )}

 <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
 <div>
 <span className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">المخزن</span>
 <Select value={warehouseId} onValueChange={setWarehouseId}>
 <SelectTrigger className="w-full h-10 rounded-xl bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-xs font-bold">
 <SelectValue placeholder="اختر المخزن"/>
 </SelectTrigger>
 <SelectContent className="z-50 bg-surface border border-slate-200 dark:border-slate-800 rounded-xl shadow-xl">
 {warehouses.map((w) => (
 <SelectItem key={w.id} value={w.id} className="">
 {w.name}
 </SelectItem>
 ))}
 </SelectContent>
 </Select>
 </div>
 <div className="md:col-span-2">
 <span className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">الصنف التالف</span>
 <Select value={productId} onValueChange={onProductChange}>
 <SelectTrigger className="w-full h-10 rounded-xl bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-800 text-xs font-bold">
 <SelectValue placeholder="— اختر الصنف —"/>
 </SelectTrigger>
 <SelectContent className="z-50 bg-surface border border-slate-200 dark:border-slate-800 rounded-xl shadow-xl max-h-60">
 {products.map((p) => (
 <SelectItem key={p.id} value={p.id} className="">
 {p.name} ({p.sku})
 </SelectItem>
 ))}
 </SelectContent>
 </Select>
 </div>
 <div>
 <span className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">الكمية التالفة</span>
 <Input type="number"min={0} step="any"value={qty} onChange={(e) => setQty(e.target.value)} className="h-10 bg-slate-50 dark:bg-slate-900 text-sm"/>
 </div>
 <div>
 <span className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">وحدة القياس</span>
 <Select
 value={unitId}
 onValueChange={setUnitId}
 disabled={!currentProduct}
 >
 <SelectTrigger className="w-full h-10 rounded-xl bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-xs font-bold">
 <SelectValue placeholder="اختر الوحدة"/>
 </SelectTrigger>
 <SelectContent className="z-50 bg-surface border border-slate-200 dark:border-slate-800 rounded-xl shadow-xl">
 {currentProduct && unitsById[currentProduct.base_unit_id] && (
 <SelectItem key={currentProduct.base_unit_id} value={currentProduct.base_unit_id} className="">
 {unitsById[currentProduct.base_unit_id].symbol}
 </SelectItem>
 )}
 {Object.values(unitsById).map((u) => (
 <SelectItem key={u.id} value={u.id} className="">
 {u.symbol}
 </SelectItem>
 ))}
 </SelectContent>
 </Select>
 </div>
 <div>
 <span className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">سبب التوالف</span>
 <Select value={reason} onValueChange={setReason}>
 <SelectTrigger className="w-full h-10 rounded-xl bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-xs font-bold">
 <SelectValue placeholder="اختر السبب"/>
 </SelectTrigger>
 <SelectContent className="z-50 bg-surface border border-slate-200 dark:border-slate-800 rounded-xl shadow-xl">
 {REASON_OPTIONS.map((r) => (
 <SelectItem key={r} value={r} className="">
 {r}
 </SelectItem>
 ))}
 </SelectContent>
 </Select>
 </div>
 <div className="md:col-span-2 lg:col-span-3">
 <span className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">ملاحظات إضافية</span>
 <Textarea
 rows={2}
 value={notes}
 onChange={(e) => setNotes(e.target.value)}
 className="w-full min-h-[64px] resize-none text-xs font-bold bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-slate-800"
 placeholder="تفاصيل إضافية (اختياري)"
 />
 </div>
 </div>

 <div className="flex items-center justify-between pt-1">
 <span className="text-xs font-bold text-slate-500">
 {currentProduct ?`قيمة التالف المحسوبة: ${formatNumber((Number(qty) || 0) * (currentProduct.purchase_price || 0))}`:'اختر الصنف لحساب قيمة التالف'}
 </span>
 <Button
 onClick={submit}
 disabled={isSaving}
 className="h-10 px-6 bg-[#558b2f] hover:bg-[#436d25] text-white text-xs font-bold rounded-xl shadow-xs"
 >
 {isSaving ?'جاري الخصم...':'تسجيل التوالف وخصم الرصيد'}
 </Button>
 </div>
 </div>

 {/* Damage log */}
 <div className="bg-surface rounded-2xl border border-slate-200/80 dark:border-slate-800 overflow-hidden print:border-0">
 <div className="px-5 py-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
 <h3 className="text-sm font-black text-slate-900 dark:text-white">سجل التوالف</h3>
 <span className="text-2xs font-bold text-slate-400">{formatNumber(totals.count)} عملية</span>
 </div>
 <div className="overflow-x-auto">
 <table className="w-full text-right border-collapse">
 <thead>
 <tr className="bg-slate-50 dark:bg-slate-900/60 border-b border-slate-200 dark:border-slate-800 text-2xs font-black text-slate-500 dark:text-slate-400 uppercase tracking-wider">
 <th className="py-3.5 px-4">التاريخ</th>
 <th className="py-3.5 px-4">المخزن</th>
 <th className="py-3.5 px-4">الصنف</th>
 <th className="py-3.5 px-4">الكمية</th>
 <th className="py-3.5 px-4">قيمة الخسارة</th>
 <th className="py-3.5 px-4">بيان</th>
 </tr>
 </thead>
 <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60 text-xs">
 {isLoading ? (
 <tr><td colSpan={6} className="py-12 text-center text-slate-400 font-semibold">جاري تحميل السجل...</td></tr>
 ) : sortMovements.length === 0 ? (
 <tr><td colSpan={6} className="py-12 text-center text-slate-400 font-semibold">لا توجد عمليات توالف مسجلة.</td></tr>
 ) : (
 sortMovements.map((m) => {
 const p = products.find((x) => x.id === m.product_id);
 const w = warehouses.find((x) => x.id === m.warehouse_id);
 return (
 <tr key={m.id} className="hover:bg-slate-50/70 dark:hover:bg-slate-800/40 transition-colors">
 <td className="py-3 px-4 text-slate-500 whitespace-nowrap">{formatDateTime(m.created_at)}</td>
 <td className="py-3 px-4 font-bold text-slate-700 dark:text-slate-300">{w?.name ||'—'}</td>
 <td className="py-3 px-4 font-bold text-slate-900 dark:text-white">{p?.name || m.product_id.slice(0, 8)}</td>
 <td className="py-3 px-4 font-black text-red-600">{formatNumber(Math.abs(m.base_quantity))}</td>
 <td className="py-3 px-4 font-black text-red-600">{formatNumber(m.total_cost)}</td>
 <td className="py-3 px-4 text-slate-400 max-w-56 truncate">{m.notes ||'—'}</td>
 </tr>
 );
 })
 )}
 </tbody>
 </table>
 </div>
 </div>
 </AppShell>
 );
}

export default function DamagesPage() {
 return (
 <Suspense
 fallback={
 <div className="h-screen w-full flex items-center justify-center bg-app">
 <div className="w-9 h-9 border-3 border-[#558b2f] border-t-transparent rounded-full animate-spin"/>
 </div>
 }
 >
 <DamagesContent />
 </Suspense>
 );
}