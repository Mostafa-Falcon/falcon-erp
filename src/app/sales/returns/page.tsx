'use client';

import React, { useEffect, useMemo, useState } from'react';
import { Suspense } from'react';
import { useRouter } from'next/navigation';
import { AppShell } from'@/components/layout/AppShell';
import { Input } from'@/components/ui/input';
import { Button } from'@/components/ui/button';
import { Badge } from'@/components/ui/badge';
import { Card, CardContent } from'@/components/ui/card';
import {
 Table,
 TableBody,
 TableCell,
 TableHead,
 TableHeader,
 TableRow,
} from'@/components/ui/table';
import {
 Dialog,
 DialogContent,
 DialogDescription,
 DialogHeader,
 DialogTitle,
} from'@/components/ui/dialog';
import {
 Select,
 SelectContent,
 SelectItem,
 SelectTrigger,
 SelectValue,
} from'@/components/ui/select';
import { useSessionStore } from'@/core/state/useSessionStore';
import { SalesRepository } from'@/modules/sales/sales_repository';
import { formatNumber, formatDateTime } from'@/lib/format';
import { Plus, RotateCcw, Search, Eye, DollarSign, Receipt } from 'lucide-react';
import { KpiCard } from '@/components/ui/kpi-card';
import { EmptyState } from '@/components/ui/empty-state';
import type { Contact, InventoryTransaction, Product, SalesReturn, Treasury, Unit, Warehouse } from'@/types';
import { toast } from'sonner';

function ReturnsContent() {
 const { currentUser } = useSessionStore();
 const orgId = currentUser?.org_id ||'';
 const router = useRouter();

 const [returns, setReturns] = useState<SalesReturn[]>([]);
 const [itemsByReturn, setItemsByReturn] = useState<Record<string, InventoryTransaction[]>>({});
 const [products, setProducts] = useState<Product[]>([]);
 const [units, setUnits] = useState<Unit[]>([]);
 const [treasuries, setTreasuries] = useState<Treasury[]>([]);
 const [warehouses, setWarehouses] = useState<Warehouse[]>([]);
 const [customers, setCustomers] = useState<Contact[]>([]);
 const [invoices, setInvoices] = useState<{ id: string; number: string }[]>([]);
 const [isLoading, setIsLoading] = useState(true);

 const [search, setSearch] = useState('');
 const [customerFilter, setCustomerFilter] = useState('all');
 const [viewId, setViewId] = useState<string | null>(null);

 const loadData = async () => {
 if (!orgId) return;
 try {
 const { db } = await import('@/core/db/app_database');
 const [retList, allTx, prods, unts, tres, whs, custs, invList] = await Promise.all([
 SalesRepository.getSalesReturns(orgId),
 db.inventory_transactions
 .where('reference_type')
 .equals('sale_invoice')
 .toArray(),
 db.products.where('org_id').equals(orgId).toArray(),
 db.units.where('org_id').equals(orgId).toArray(),
 db.treasuries.where('org_id').equals(orgId).toArray(),
 db.warehouses.where('org_id').equals(orgId).toArray(),
 db.contacts.where('org_id').equals(orgId).and((c) => c.is_active).toArray(),
 db.sales_invoices.where('org_id').equals(orgId).toArray(),
 ]);

 const grouped: Record<string, InventoryTransaction[]> = {};
 for (const tx of allTx) {
 if (!tx.reference_id) continue;
 const invIds = new Set(invList.map((i) => i.id));
 if (invIds.has(tx.reference_id)) continue;
 (grouped[tx.reference_id] = grouped[tx.reference_id] || []).push(tx);
 }

 setReturns(retList);
 setItemsByReturn(grouped);
 setProducts(prods);
 setUnits(unts);
 setTreasuries(tres);
 setWarehouses(whs);
 setCustomers(custs);
 setInvoices(invList.map((i) => ({ id: i.id, number: i.invoice_number })));
 } catch (err) {
 console.error('Load sales returns error:', err);
 toast.error('حدث خطأ أثناء تحميل مرتجعات المبيعات');
 } finally {
 setIsLoading(false);
 }
 };

 useEffect(() => {
 if (!orgId) return;
 Promise.resolve().then(loadData);
 }, [orgId]);

 const nameOf = (map: { id: string; name: string }[], id?: string | null) =>
 (id && map.find((x) => x.id === id)?.name) ||'—';

 const filtered = useMemo(() => {
 return returns.filter((ret) => {
 if (customerFilter && customerFilter !=='all'&& ret.customer_id !== customerFilter) return false;
 if (!search.trim()) return true;
 const q = search.trim().toLowerCase();
 const custName = (customers.find((x) => x.id === ret.customer_id)?.name ||'نقدي').toLowerCase();
 return ret.return_number.toLowerCase().includes(q) || custName.includes(q);
 });
 }, [returns, search, customerFilter, customers]);

 const totals = useMemo(() => {
 return filtered.reduce((acc, r) => acc + (r.total || 0), 0);
 }, [filtered]);

 const viewReturn = viewId ? returns.find((x) => x.id === viewId) : null;
 const viewItems = viewId ? itemsByReturn[viewId] || [] : [];

 return (
 <AppShell
  title="مرتجعات المبيعات"
  subtitle="سجل البضائع المرتجعة من العملاء وتسوية أرصدة الخزينة والحسابات"
  actions={
    <Button
      onClick={() => router.push('/sales/returns/new')}
      className="h-10 px-4 rounded-xl bg-primary hover:bg-primary/90 text-white font-bold text-xs flex items-center gap-2 shadow-xs hover:shadow-md transition-all cursor-pointer"
    >
      <Plus className="w-4 h-4" />
      <span>مرتجع مبيعات جديد</span>
    </Button>
  }
>
  <div className="space-y-5 select-none" dir="rtl">
    {/* KPI Cards — Unified Design System */}
    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
      <KpiCard
        label="إجمالي عمليات المرتجع"
        value={filtered.length}
        unit="عملية"
        variant="slate"
        icon={<RotateCcw className="w-5 h-5" />}
      />
      <KpiCard
        label="إجمالي قيمة المرتجعات"
        value={formatNumber(totals)}
        unit="ج.م"
        variant="rose"
        icon={<DollarSign className="w-5 h-5" />}
      />
      <KpiCard
        label="مرتجع من فاتورة سابقة"
        value={filtered.filter((r) => r.original_invoice_id).length}
        unit="عملية"
        variant="blue"
        icon={<Receipt className="w-5 h-5" />}
      />
    </div>

    {/* Toolbar & Filter Bar */}
    <div className="flex flex-wrap items-center justify-between gap-3 bg-surface border border-slate-200/80 dark:border-slate-800/80 p-3.5 rounded-2xl shadow-2xs">
      <div className="flex flex-wrap items-center gap-3 flex-1 min-w-[280px]">
        <div className="relative flex-1 max-w-sm">
          <Search className="w-4 h-4 text-slate-400 absolute right-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
          <Input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="بحث بالرقم أو العميل..."
            className="h-10 bg-slate-50/70 dark:bg-slate-900/70 text-xs font-semibold rounded-xl pr-10 border-slate-200/80 dark:border-slate-800"
          />
        </div>
        <div className="w-56">
          <Select value={customerFilter} onValueChange={setCustomerFilter}>
            <SelectTrigger className="w-full h-10 rounded-xl bg-slate-50/70 dark:bg-slate-900/70 border-slate-200/80 dark:border-slate-800 text-xs font-bold">
              <SelectValue placeholder="كل العملاء" />
            </SelectTrigger>
            <SelectContent className="z-50 bg-popover border border-slate-200 dark:border-slate-800 rounded-xl shadow-xl max-h-60">
              <SelectItem value="all">كل العملاء</SelectItem>
              {customers.map((c) => (
                <SelectItem key={c.id} value={c.id}>
                  {c.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>
    </div>

    {/* Table Container */}
    <Card className="rounded-2xl border border-slate-200/80 dark:border-slate-800 bg-surface overflow-hidden shadow-2xs">
      {isLoading ? (
        <div className="py-16 text-center text-xs font-bold text-slate-400">جارٍ تحميل المرتجعات...</div>
      ) : filtered.length === 0 ? (
        <div className="p-4">
          <EmptyState
            icon={<RotateCcw className="w-7 h-7 text-slate-400" />}
            title="لا توجد مرتجعات مبيعات مسجلة بعد"
            description="ابدأ بتسجيل مرتجع جديد من فاتورة مبيعات سابقة أو تسجيل مرتجع مباشر للعميل."
            action={{
              label: "مرتجع مبيعات جديد",
              icon: <Plus className="w-4 h-4" />,
              onClick: () => router.push('/sales/returns/new'),
            }}
          />
        </div>
      ) : (
        <div className="overflow-x-auto min-h-[300px]">
          <Table className="text-right text-xs">
 <TableHeader className="bg-slate-50/70 dark:bg-slate-900/50">
 <TableRow className="border-b border-slate-200/80 dark:border-slate-800">
 <TableHead className="py-3 px-4 font-bold text-slate-600 dark:text-slate-300 text-right">رقم المرتجع</TableHead>
 <TableHead className="py-3 px-3 font-bold text-slate-600 dark:text-slate-300 text-right">العميل</TableHead>
 <TableHead className="py-3 px-3 font-bold text-slate-600 dark:text-slate-300 text-right">المخزن</TableHead>
 <TableHead className="py-3 px-3 font-bold text-slate-600 dark:text-slate-300 text-right">المصدر</TableHead>
 <TableHead className="py-3 px-3 font-bold text-slate-600 dark:text-slate-300 text-right">التاريخ</TableHead>
 <TableHead className="py-3 px-3 font-bold text-slate-600 dark:text-slate-300 text-right">الإجمالي</TableHead>
 <TableHead className="py-3 px-3 font-bold text-slate-600 dark:text-slate-300 text-center w-20">عرض</TableHead>
 </TableRow>
 </TableHeader>
 <TableBody className="divide-y divide-slate-100 dark:divide-slate-800/80 font-bold">
 {filtered.map((ret) => (
 <TableRow
 key={ret.id}
 onClick={() => setViewId(ret.id)}
 className="cursor-pointer hover:bg-slate-50/70 dark:hover:bg-slate-800/40 transition-colors"
 >
 <TableCell className="py-3.5 px-4 font-mono font-black text-amber-600 dark:text-amber-400">
 {ret.return_number}
 </TableCell>
 <TableCell className="py-3.5 px-3 text-slate-800 dark:text-slate-200">
 {nameOf(customers, ret.customer_id)}
 </TableCell>
 <TableCell className="py-3.5 px-3 text-2xs text-slate-600 dark:text-slate-400">
 {nameOf(warehouses, ret.warehouse_id)}
 </TableCell>
 <TableCell className="py-3.5 px-3 text-2xs text-slate-600 dark:text-slate-400">
 {ret.original_invoice_id ? (
 <Badge variant="outline"className="text-emerald-700 dark:text-emerald-400 border-emerald-200">
 فاتورة #{invoices.find((i) => i.id === ret.original_invoice_id)?.number ||''}
 </Badge>
 ) : (
 <Badge variant="secondary"className="text-slate-500">
 مباشر
 </Badge>
 )}
 </TableCell>
 <TableCell className="py-3.5 px-3 text-2xs font-mono text-slate-600 dark:text-slate-400">
 {formatDateTime(ret.return_date)}
 </TableCell>
 <TableCell className="py-3.5 px-3 font-mono font-black text-amber-600 dark:text-amber-400">
 {formatNumber(ret.total)} ج.م
 </TableCell>
 <TableCell className="py-3.5 px-3 text-center">
 <Button
 variant="ghost"
 size="icon"
 onClick={(e) => {
 e.stopPropagation();
 setViewId(ret.id);
 }}
 className="w-7 h-7 rounded-lg text-slate-500 hover:text-amber-600"
 >
 <Eye className="w-3.5 h-3.5"/>
 </Button>
 </TableCell>
 </TableRow>
 ))}
 </TableBody>
 </Table>
 </div>
 )}
 </Card>

 {/* View Modal with Shadcn Dialog */}
 <Dialog open={Boolean(viewReturn)} onOpenChange={(open) => !open && setViewId(null)}>
 <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto rounded-2xl p-6 text-right"dir="rtl">
 <DialogHeader className="text-right pb-3 border-b border-slate-100 dark:border-slate-800">
 <div className="flex items-center gap-2">
 <RotateCcw className="w-5 h-5 text-amber-600"/>
 <DialogTitle className="text-base font-black text-slate-900 dark:text-white">
 تفاصيل مرتجع مبيعات {viewReturn?.return_number}
 </DialogTitle>
 </div>
 <DialogDescription className="text-xs text-slate-400">
 استعراض الأصناف المرتجعة من العميل وحالة الخزينة ورد القيمة
 </DialogDescription>
 </DialogHeader>

 {viewReturn && (
 <div className="space-y-4 pt-2">
 <div className="grid grid-cols-2 md:grid-cols-3 gap-3 text-xs font-bold text-slate-600 dark:text-slate-300 bg-slate-50 dark:bg-slate-900 p-3 rounded-xl">
 <div>
 <span className="text-3xs text-slate-400 block font-normal">العميل:</span>
 <span className="text-slate-800 dark:text-slate-200">{nameOf(customers, viewReturn.customer_id)}</span>
 </div>
 <div>
 <span className="text-3xs text-slate-400 block font-normal">المخزن:</span>
 <span className="text-slate-800 dark:text-slate-200">{nameOf(warehouses, viewReturn.warehouse_id)}</span>
 </div>
 <div>
 <span className="text-3xs text-slate-400 block font-normal">المصدر:</span>
 <span className="font-mono text-slate-800 dark:text-slate-200">
 {viewReturn.original_invoice_id
 ?`فاتورة #${invoices.find((i) => i.id === viewReturn.original_invoice_id)?.number ||''}`
 :'مرتجع مباشر'}
 </span>
 </div>
 <div>
 <span className="text-3xs text-slate-400 block font-normal">التاريخ:</span>
 <span className="font-mono text-slate-800 dark:text-slate-200">{formatDateTime(viewReturn.return_date)}</span>
 </div>
 <div>
 <span className="text-3xs text-slate-400 block font-normal">الخزينة المسترد منها:</span>
 <span className="text-slate-800 dark:text-slate-200">{nameOf(treasuries, viewReturn.treasury_id)}</span>
 </div>
 <div>
 <span className="text-3xs text-slate-400 block font-normal">إجمالي المرتجع:</span>
 <span className="font-mono text-amber-600 font-black">{formatNumber(viewReturn.total)} ج.م</span>
 </div>
 </div>

 <div className="rounded-xl border border-slate-100 dark:border-slate-800 overflow-hidden">
 <Table className="text-right text-xs">
 <TableHeader className="bg-slate-50/70 dark:bg-slate-900/50">
 <TableRow className="border-b border-slate-100 dark:border-slate-800">
 <TableHead className="py-2.5 px-3 font-bold text-right">الصنف</TableHead>
 <TableHead className="py-2.5 px-2 font-bold text-right">الوحدة</TableHead>
 <TableHead className="py-2.5 px-2 font-bold text-right">الدفعة</TableHead>
 <TableHead className="py-2.5 px-2 font-bold text-right">الكمية</TableHead>
 <TableHead className="py-2.5 px-2 font-bold text-right">سعر الوحدة</TableHead>
 <TableHead className="py-2.5 px-3 font-bold text-right">الإجمالي</TableHead>
 </TableRow>
 </TableHeader>
 <TableBody className="divide-y divide-slate-100 dark:divide-slate-800/60 font-bold">
 {viewItems.map((it) => {
 const un = units.find((u) => u.id === it.unit_id);
 return (
 <TableRow key={it.id} className="hover:bg-slate-50/60 dark:hover:bg-slate-800/40">
 <TableCell className="py-2.5 px-3">{nameOf(products, it.product_id)}</TableCell>
 <TableCell className="py-2.5 px-2 text-2xs font-normal">{un?.symbol ||'—'}</TableCell>
 <TableCell className="py-2.5 px-2 text-2xs font-mono font-normal">{it.batch_id ?'تشغيلة مسجلة':'—'}</TableCell>
 <TableCell className="py-2.5 px-2 font-mono text-amber-600">{formatNumber(it.quantity)}</TableCell>
 <TableCell className="py-2.5 px-2 font-mono">{formatNumber(it.unit_cost)}</TableCell>
 <TableCell className="py-2.5 px-3 font-mono text-amber-600 font-black">{formatNumber(it.total_cost)}</TableCell>
 </TableRow>
 );
 })}
 </TableBody>
 </Table>
 </div>

 {viewReturn.reason && (
 <div className="rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-100 dark:border-slate-800 p-3 text-xs text-slate-600 dark:text-slate-300">
 <span className="font-bold text-slate-400 block text-3xs">ملاحظات:</span>
 {viewReturn.reason}
 </div>
 )}
 </div>
 )}
 </DialogContent>
 </Dialog>
 </div>
 </AppShell>
 );
}

export default function ReturnsPage() {
 return (
 <Suspense fallback={<div />}>
 <ReturnsContent />
 </Suspense>
 );
}