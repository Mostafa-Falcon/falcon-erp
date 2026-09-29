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
import { Skeleton } from'@/components/ui/skeleton';
import { Separator } from'@/components/ui/separator';
import { ScrollArea } from'@/components/ui/scroll-area';
import {
 Table,
 TableBody,
 TableCell,
 TableHead,
 TableHeader,
 TableRow,
} from'@/components/ui/table';
import { useSessionStore } from'@/core/state/useSessionStore';
import { ProductRepository } from'@/modules/inventory/product_repository';
import { formatNumber, isExpired, daysToExpiry, formatDateTime } from'@/lib/format';
import type { Product, ProductBatch, Unit, Warehouse } from'@/types';

const selectCls =
'h-10 px-3 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 text-xs font-bold text-slate-700 dark:text-slate-200 focus:outline-none focus:ring-1 focus:ring-[#558b2f]';

type ExpiryStatus ='expired'|'soon30'|'soon90'|'valid';

function statusOf(batch: ProductBatch): { status: ExpiryStatus; days?: number } {
 if (!batch.expiry_date) return { status:'valid'};
 const expired = isExpired(batch.expiry_date);
 if (expired) return { status:'expired'};
 const days = daysToExpiry(batch.expiry_date);
 if (days <= 30) return { status:'soon30', days };
 if (days <= 90) return { status:'soon90', days };
 return { status:'valid', days };
}

const STATUS_STYLES: Record<ExpiryStatus, string> = {
 expired:'bg-red-50 dark:bg-red-950/40 text-red-700 dark:text-red-300 border-red-200 dark:border-red-800',
 soon30:'bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 border-amber-200 dark:border-amber-800',
 soon90:'bg-orange-50 dark:bg-orange-950/40 text-orange-700 dark:text-orange-300 border-orange-200 dark:border-orange-800',
 valid:'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800',
};

const STATUS_LABELS: Record<ExpiryStatus, string> = {
 expired:'منتهية الصلاحية',
 soon30:'تنتهي خلال 30 يوم',
 soon90:'تنتهي خلال 90 يوم',
 valid:'سارية',
};

function ExpiryReportContent() {
 const { currentUser } = useSessionStore();
 const orgId = currentUser?.org_id ||'';

 const [products, setProducts] = useState<Product[]>([]);
 const [warehouses, setWarehouses] = useState<Warehouse[]>([]);
 const [unitsById, setUnitsById] = useState<Record<string, Unit>>({});
 const [batches, setBatches] = useState<ProductBatch[]>([]);
 const [isLoading, setIsLoading] = useState(true);

 const [warehouseFilter, setWarehouseFilter] = useState('all');
 const [statusFilter, setStatusFilter] = useState<'all'| ExpiryStatus>('all');
 const [productFilter, setProductFilter] = useState('all');

 useEffect(() => {
 if (!orgId) return;
 const load = async () => {
 const { db } = await import('@/core/db/app_database');
 try {
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
 Promise.resolve().then(load);
 }, [orgId]);

 const rows = useMemo(() => {
 return batches
 .map((b) => ({ batch: b, info: statusOf(b) }))
 .filter(({ batch, info }) => {
 if (warehouseFilter !=='all'&& batch.warehouse_id !== warehouseFilter) return false;
 if (statusFilter !=='all'&& info.status !== statusFilter) return false;
 if (productFilter !=='all'&& batch.product_id !== productFilter) return false;
 return true;
 })
 .sort((a, b) => (a.batch.expiry_date ||'').localeCompare(b.batch.expiry_date ||''));
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

 const warehouseName = (id?: string) => warehouses.find((w) => w.id === id)?.name || id?.slice(0, 8) ||'—';
 const unitSymbol = (id?: string) => (id ? unitsById[id]?.symbol :'') ||'';

 return (
 <AppShell
 title="تقرير الصلاحيات"
 subtitle="رصد دفعات الأصناف منتهية الصلاحية أو القريبة من الانتهاء عبر كل المخازن — قابل للطباعة"
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
 <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
 <div className="bg-surface p-4 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-sm border-b-4 border-b-red-600">
 <span className="text-3xs font-black text-slate-400 uppercase tracking-widest">منتهية</span>
 <div className="text-2xl font-black text-red-600 mt-1">{formatNumber(totals.expired)}</div>
 </div>
 <div className="bg-surface p-4 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-sm border-b-4 border-b-amber-600">
 <span className="text-3xs font-black text-slate-400 uppercase tracking-widest">خلال 30 يوم</span>
 <div className="text-2xl font-black text-amber-600 mt-1">{formatNumber(totals.soon30)}</div>
 </div>
 <div className="bg-surface p-4 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-sm border-b-4 border-b-orange-600">
 <span className="text-3xs font-black text-slate-400 uppercase tracking-widest">خلال 90 يوم</span>
 <div className="text-2xl font-black text-orange-600 mt-1">{formatNumber(totals.soon90)}</div>
 </div>
 <div className="bg-surface p-4 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-sm border-b-4 border-b-emerald-600">
 <span className="text-3xs font-black text-slate-400 uppercase tracking-widest">سارية</span>
 <div className="text-2xl font-black text-emerald-600 mt-1">{formatNumber(totals.valid)}</div>
 </div>
 <div className="bg-surface p-4 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-sm">
 <span className="text-3xs font-black text-slate-400 uppercase tracking-widest">القيمة المعروضة</span>
 <div className="text-2xl font-black text-slate-900 dark:text-white mt-1">{formatNumber(totals.value)}</div>
 </div>
 </div>

 <Separator className="my-2 opacity-50"/>

 {/* Filters */}
 <div className="flex flex-col lg:flex-row gap-3 items-center flex-wrap bg-surface p-4 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-sm">
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

 <div className="w-full sm:w-52">
 <Select value={statusFilter} onValueChange={(val) => setStatusFilter(val as'all'| ExpiryStatus)}>
 <SelectTrigger className="w-full h-10 rounded-xl bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-xs font-bold">
 <SelectValue placeholder="حالة الصلاحية"/>
 </SelectTrigger>
 <SelectContent className="z-50 bg-surface border border-slate-200 dark:border-slate-800 rounded-xl shadow-xl">
 <SelectItem value="all"className="">
 كل الحالات
 </SelectItem>
 {(Object.keys(STATUS_LABELS) as ExpiryStatus[]).map((s) => (
 <SelectItem key={s} value={s} className="">
 {STATUS_LABELS[s]}
 </SelectItem>
 ))}
 </SelectContent>
 </Select>
 </div>

 <div className="w-full sm:w-60">
 <Select value={productFilter} onValueChange={setProductFilter}>
 <SelectTrigger className="w-full h-10 rounded-xl bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-xs font-bold">
 <SelectValue placeholder="الصنف"/>
 </SelectTrigger>
 <SelectContent className="z-50 bg-surface border border-slate-200 dark:border-slate-800 rounded-xl shadow-xl max-h-60">
 <SelectItem value="all"className="">
 كل الأصناف
 </SelectItem>
 {products.map((p) => (
 <SelectItem key={p.id} value={p.id} className="">
 {p.name}
 </SelectItem>
 ))}
 </SelectContent>
 </Select>
 </div>
 </div>

 {/* Batches table */}
 <div className="bg-surface rounded-2xl border border-slate-200/80 dark:border-slate-800 overflow-hidden shadow-md print:border-0">
 <ScrollArea className="h-[calc(100vh-450px)] min-h-[400px]">
 <Table>
 <TableHeader className="sticky top-0 z-10 bg-slate-50/90 dark:bg-slate-900/90 backdrop-blur-sm shadow-sm">
 <TableRow>
 <TableHead className="text-2xs font-black uppercase tracking-wider">الصنف</TableHead>
 <TableHead className="text-2xs font-black uppercase tracking-wider">رقم الدفعة</TableHead>
 <TableHead className="text-2xs font-black uppercase tracking-wider">المخزن</TableHead>
 <TableHead className="text-2xs font-black uppercase tracking-wider">تاريخ الانتهاء</TableHead>
 <TableHead className="text-2xs font-black uppercase tracking-wider">المتبقي</TableHead>
 <TableHead className="text-2xs font-black uppercase tracking-wider">الرصيد</TableHead>
 <TableHead className="text-2xs font-black uppercase tracking-wider">الوحدة</TableHead>
 <TableHead className="text-2xs font-black uppercase tracking-wider">القيمة</TableHead>
 <TableHead className="text-2xs font-black uppercase tracking-wider">الحالة</TableHead>
 </TableRow>
 </TableHeader>
 <TableBody className="text-xs font-bold">
 {isLoading ? (
 Array.from({ length: 8 }).map((_, i) => (
 <TableRow key={i}>
 <TableCell colSpan={9} className="py-4 px-4">
 <Skeleton className="h-6 w-full opacity-50"/>
 </TableCell>
 </TableRow>
 ))
 ) : rows.length === 0 ? (
 <TableRow>
 <TableCell colSpan={9} className="py-20 text-center text-slate-400 font-bold">
 لا توجد دفعات مطابقة للفلاتر المحددة.
 </TableCell>
 </TableRow>
 ) : (
 rows.map(({ batch, info }) => {
 const p = products.find((x) => x.id === batch.product_id);
 return (
 <TableRow key={batch.id} className="hover:bg-slate-50/70 dark:hover:bg-slate-800/40 transition-colors group">
 <TableCell className="font-black text-slate-900 dark:text-white py-3">{p?.name ||'—'}</TableCell>
 <TableCell className="font-mono font-bold text-slate-700 dark:text-slate-300">{batch.batch_number}</TableCell>
 <TableCell className="font-bold text-slate-700 dark:text-slate-300">{warehouseName(batch.warehouse_id)}</TableCell>
 <TableCell className="text-slate-500 whitespace-nowrap font-mono text-2xs">
 {batch.expiry_date ? new Date(batch.expiry_date).toLocaleDateString('en-GB') :'—'}
 </TableCell>
 <TableCell className="font-black">
 {info.days !== undefined ? (
 <span className={info.status ==='valid'?'text-emerald-600':'text-amber-600'}>
 {formatNumber(info.days)} يوم
 </span>
 ) : (
 <span className="text-slate-400 opacity-30">—</span>
 )}
 </TableCell>
 <TableCell className="font-black text-slate-800 dark:text-slate-100 text-sm">{formatNumber(batch.current_quantity)}</TableCell>
 <TableCell className="text-slate-500 font-medium">{unitSymbol(p?.base_unit_id)}</TableCell>
 <TableCell className="font-mono">{formatNumber(batch.current_quantity * (batch.purchase_price || 0))}</TableCell>
 <TableCell>
 <span className={`px-2.5 py-1 rounded-full text-3xs font-black border shadow-xs transition-transform group-hover:scale-105 inline-block ${STATUS_STYLES[info.status]}`}>
 {STATUS_LABELS[info.status]}
 </span>
 </TableCell>
 </TableRow>
 );
 })
 )}
 </TableBody>
 </Table>
 </ScrollArea>
 </div>
 </AppShell>
 );
}

export default function ExpiryReportPage() {
 return (
 <Suspense
 fallback={
 <div className="h-screen w-full flex items-center justify-center bg-app">
 <div className="w-9 h-9 border-3 border-[#558b2f] border-t-transparent rounded-full animate-spin"/>
 </div>
 }
 >
 <ExpiryReportContent />
 </Suspense>
 );
}