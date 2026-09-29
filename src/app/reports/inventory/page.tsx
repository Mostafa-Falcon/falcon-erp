'use client';

import React, { useEffect, useMemo, useState } from'react';
import { Suspense } from'react';
import { AppShell } from'@/components/layout/AppShell';
import { Input } from'@/components/ui/input';
import { Button } from'@/components/ui/button';
import { Icons } from'@/components/ui/Icons';
import { AlertTriangle } from'lucide-react';
import {
 Select,
 SelectContent,
 SelectItem,
 SelectTrigger,
 SelectValue,
} from'@/components/ui/select';
import { DatePicker } from'@/components/ui/date-picker';
import { Label } from'@/components/ui/label';
import {
 Table,
 TableBody,
 TableCell,
 TableHead,
 TableHeader,
 TableRow,
} from'@/components/ui/table';
import { useSessionStore } from'@/core/state/useSessionStore';
import { Skeleton } from'@/components/ui/skeleton';
import { Separator } from'@/components/ui/separator';
import { ScrollArea } from'@/components/ui/scroll-area';
import {
 Tooltip,
 TooltipContent,
 TooltipProvider,
 TooltipTrigger,
} from'@/components/ui/tooltip';
import { formatNumber, formatDateTime, MOVEMENT_TYPE_LABELS } from'@/lib/format';
import type { InventoryTransaction, InventoryTransactionType, Product, Unit, Warehouse } from'@/types';
import { format } from'date-fns';

const TYPE_STYLES: Record<string, string> = {
 opening_stock:'bg-sky-50 dark:bg-sky-950/40 text-sky-700 dark:text-sky-300',
 purchase:'bg-orange-50 dark:bg-orange-950/40 text-orange-700 dark:text-orange-300',
 sale:'bg-cyan-50 dark:bg-cyan-950/40 text-cyan-700 dark:text-cyan-300',
 sale_return:'bg-teal-50 dark:bg-teal-950/40 text-teal-700 dark:text-teal-300',
 purchase_return:'bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300',
 transfer_in:'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300',
 transfer_out:'bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300',
 adjustment_in:'bg-violet-50 dark:bg-violet-950/40 text-violet-700 dark:text-violet-300',
 adjustment_out:'bg-red-50 dark:bg-red-950/40 text-red-700 dark:text-red-300',
 damaged:'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300',
};

const selectCls =
'h-10 px-3 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 text-xs font-bold text-slate-700 dark:text-slate-200 focus:outline-none focus:ring-1 focus:ring-[#558b2f]';

function InventoryReportContent() {
 const { currentUser } = useSessionStore();
 const orgId = currentUser?.org_id ||'';

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

 useEffect(() => {
 if (!orgId) return;
 let mounted = true;
 const load = async () => {
 const { db } = await import('@/core/db/app_database');
 try {
 const [trans, prods, whs, unts] = await Promise.all([
 db.inventory_transactions.where('org_id').equals(orgId).reverse().sortBy('created_at'),
 db.products.where('org_id').equals(orgId).toArray(),
 db.warehouses.where('org_id').equals(orgId).toArray(),
 db.units.where('org_id').equals(orgId).toArray(),
 ]);
 if (!mounted) return;
 setTransactions(trans);
 setProducts(prods);
 setWarehouses(whs);
 const umap: Record<string, Unit> = {};
 for (const u of unts) umap[u.id] = u;
 setUnitsById(umap);
 } catch (err) {
 console.error('Load inventory report error:', err);
 } finally {
 if (mounted) setIsLoading(false);
 }
 };
 load();
 return () => {
 mounted = false;
 };
 }, [orgId]);

 const filtered = useMemo(() => {
 return transactions.filter((t) => {
 if (warehouseFilter !=='all'&& t.warehouse_id !== warehouseFilter) return false;
 if (typeFilter !=='all'&& t.transaction_type !== typeFilter) return false;
 if (productFilter !=='all'&& t.product_id !== productFilter) return false;
 if (dateFrom && t.created_at < new Date(dateFrom).toISOString()) return false;
 if (dateTo && t.created_at > new Date(dateTo +'T23:59:59').toISOString()) return false;
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

 const productName = (id?: string) => products.find((p) => p.id === id)?.name || id?.slice(0, 8) ||'—';
 const warehouseName = (id?: string) => warehouses.find((w) => w.id === id)?.name || id?.slice(0, 8) ||'—';
 const unitSymbol = (id?: string) => (id ? unitsById[id]?.symbol :'') ||'';

 return (
 <AppShell
 title="تقرير حركة المخزون"
 subtitle="كشف قيد حركة المخزون: الوارد والصادر والرصيد بعد كل حركة — قابل للطباعة"
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
 <div className="bg-surface p-4 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-sm">
 <span className="text-3xs font-black text-slate-400 uppercase tracking-widest">إجمالي الوارد</span>
 <div className="text-2xl font-black text-emerald-600 mt-1">{formatNumber(totals.inbound)}</div>
 </div>
 <div className="bg-surface p-4 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-sm">
 <span className="text-3xs font-black text-slate-400 uppercase tracking-widest">إجمالي الصادر</span>
 <div className="text-2xl font-black text-red-600 mt-1">{formatNumber(totals.outbound)}</div>
 </div>
 <div className="bg-surface p-4 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-sm border-l-4 border-l-[#558b2f]">
 <span className="text-3xs font-black text-slate-400 uppercase tracking-widest">صافي الحركة</span>
 <div className={`text-2xl font-black mt-1 ${totals.net >= 0 ?'text-[#558b2f]':'text-red-600'}`}>
 {formatNumber(totals.net)}
 </div>
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
 <Select value={typeFilter} onValueChange={setTypeFilter}>
 <SelectTrigger className="w-full h-10 rounded-xl bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-xs font-bold">
 <SelectValue placeholder="نوع الحركة"/>
 </SelectTrigger>
 <SelectContent className="z-50 bg-surface border border-slate-200 dark:border-slate-800 rounded-xl shadow-xl">
 <SelectItem value="all"className="">
 كل أنواع الحركة
 </SelectItem>
 {(Object.keys(MOVEMENT_TYPE_LABELS) as InventoryTransactionType[]).map((t) => (
 <SelectItem key={t} value={t} className="">
 {MOVEMENT_TYPE_LABELS[t]}
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

 <div className="flex items-center gap-2">
 <DatePicker
 date={dateFrom}
 onSelect={(d) => setDateFrom(d ? format(d,'yyyy-MM-dd') :'')}
 placeholder="من تاريخ"
 className="w-36 rounded-xl font-bold"
 />
 <Label className="text-3xs text-slate-400 font-bold px-1">إلى</Label>
 <DatePicker
 date={dateTo}
 onSelect={(d) => setDateTo(d ? format(d,'yyyy-MM-dd') :'')}
 placeholder="إلى تاريخ"
 className="w-36 rounded-xl font-bold"
 />
 </div>
 </div>

 {/* Ledger */}
 <div className="bg-surface rounded-2xl border border-slate-200/80 dark:border-slate-800 overflow-hidden print:border-0 shadow-md">
 <ScrollArea className="h-[calc(100vh-420px)] min-h-[400px]">
 <Table>
 <TableHeader className="sticky top-0 z-10 shadow-sm">
 <TableRow className="bg-slate-50/90 dark:bg-slate-900/90 backdrop-blur-sm border-b border-slate-200 dark:border-slate-800">
 <TableHead className="text-2xs font-black uppercase tracking-wider">التاريخ</TableHead>
 <TableHead className="text-2xs font-black uppercase tracking-wider">المخزن</TableHead>
 <TableHead className="text-2xs font-black uppercase tracking-wider">الصنف</TableHead>
 <TableHead className="text-2xs font-black uppercase tracking-wider">نوع الحركة</TableHead>
 <TableHead className="text-2xs font-black uppercase tracking-wider">الكمية</TableHead>
 <TableHead className="text-2xs font-black uppercase tracking-wider">الوحدة</TableHead>
 <TableHead className="text-2xs font-black uppercase tracking-wider">التكلفة</TableHead>
 <TableHead className="text-2xs font-black uppercase tracking-wider">الرصيد</TableHead>
 <TableHead className="text-2xs font-black uppercase tracking-wider">ملاحظات</TableHead>
 </TableRow>
 </TableHeader>
 <TableBody className="text-xs">
 {isLoading ? (
 Array.from({ length: 5 }).map((_, i) => (
 <TableRow key={i}>
 <TableCell colSpan={9} className="py-4 px-4">
 <Skeleton className="h-6 w-full opacity-50"/>
 </TableCell>
 </TableRow>
 ))
 ) : filtered.length === 0 ? (
 <TableRow>
 <TableCell colSpan={9} className="py-20 text-center">
 <div className="flex flex-col items-center gap-2 text-slate-400">
 <AlertTriangle className="w-8 h-8 opacity-20"/>
 <span className="font-bold">لا توجد حركات مطابقة للفلاتر المحددة.</span>
 </div>
 </TableCell>
 </TableRow>
 ) : (
 <TooltipProvider>
 {filtered.map((t) => {
 const isInbound = t.base_quantity >= 0;
 return (
 <TableRow key={t.id} className="hover:bg-slate-50/70 dark:hover:bg-slate-800/40 transition-colors group">
 <TableCell className="text-slate-500 whitespace-nowrap py-3 font-medium">
 {formatDateTime(t.created_at)}
 </TableCell>
 <TableCell className="font-bold text-slate-700 dark:text-slate-300">
 {warehouseName(t.warehouse_id)}
 </TableCell>
 <TableCell className="font-bold text-slate-900 dark:text-white">
 {productName(t.product_id)}
 </TableCell>
 <TableCell>
 <span
 className={`px-2 py-0.5 rounded-full text-3xs font-black shadow-xs transition-transform group-hover:scale-105 inline-block ${
 TYPE_STYLES[t.transaction_type] || TYPE_STYLES.damaged
 }`}
 >
 {MOVEMENT_TYPE_LABELS[t.transaction_type] || t.transaction_type}
 </span>
 </TableCell>
 <TableCell className={`font-black text-sm ${isInbound ?'text-emerald-600':'text-red-600'}`}>
 {isInbound ?'+':''}
 {formatNumber(t.base_quantity)}
 </TableCell>
 <TableCell className="text-slate-500 font-medium">{unitSymbol(t.unit_id)}</TableCell>
 <TableCell className="font-mono text-2xs">{formatNumber(t.unit_cost)}</TableCell>
 <TableCell className="font-mono font-black text-slate-700 dark:text-slate-200 bg-slate-50/30 dark:bg-slate-800/20">
 {formatNumber(t.balance_after)}
 </TableCell>
 <TableCell className="text-slate-400 max-w-40">
 {t.notes ? (
 <Tooltip>
 <TooltipTrigger asChild>
 <span className="truncate block cursor-help italic hover:text-slate-600 transition-colors underline decoration-dotted decoration-slate-300">
 {t.notes}
 </span>
 </TooltipTrigger>
 <TooltipContent side="top"className="max-w-xs font-bold text-2xs p-2 leading-relaxed">
 {t.notes}
 </TooltipContent>
 </Tooltip>
 ) : (
 <span className="opacity-20">—</span>
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
 </AppShell>
 );
}

export default function InventoryReportPage() {
 return (
 <Suspense
 fallback={
 <div className="h-screen w-full flex items-center justify-center bg-app">
 <div className="w-9 h-9 border-3 border-[#558b2f] border-t-transparent rounded-full animate-spin"/>
 </div>
 }
 >
 <InventoryReportContent />
 </Suspense>
 );
}