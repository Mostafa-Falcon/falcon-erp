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
 DialogFooter,
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
import { Icons } from'@/components/ui/Icons';
import { useSessionStore } from'@/core/state/useSessionStore';
import { PurchasesRepository } from'@/modules/purchases/purchases_repository';
import { formatNumber, formatDateTime } from'@/lib/format';
import { toast } from'sonner';
import { Pencil, Ban, Eye, RotateCcw, Plus, Receipt, ShoppingBag, CheckCircle2, Clock, Search } from 'lucide-react';
import { KpiCard } from '@/components/ui/kpi-card';
import { EmptyState } from '@/components/ui/empty-state';
import type { Contact, Product, PurchaseInvoice, PurchaseInvoiceItem, Treasury, Unit, Warehouse } from'@/types';

const PAYMENT_LABELS: Record<string, string> = {
 cash:'نقدي',
 card:'بطاقة',
 credit:'آجل',
 split:'سداد جزئي',
};

function InvoicesContent() {
 const { currentUser } = useSessionStore();
 const orgId = currentUser?.org_id ||'';
 const router = useRouter();

 const [invoices, setInvoices] = useState<PurchaseInvoice[]>([]);
 const [itemsByInvoice, setItemsByInvoice] = useState<Record<string, PurchaseInvoiceItem[]>>({});
 const [products, setProducts] = useState<Product[]>([]);
 const [units, setUnits] = useState<Unit[]>([]);
 const [treasuries, setTreasuries] = useState<Treasury[]>([]);
 const [warehouses, setWarehouses] = useState<Warehouse[]>([]);
 const [suppliers, setSuppliers] = useState<Contact[]>([]);
 const [isLoading, setIsLoading] = useState(true);

 const [search, setSearch] = useState('');
 const [supplierFilter, setSupplierFilter] = useState('all');
 const [viewId, setViewId] = useState<string | null>(null);

 const [editId, setEditId] = useState<string | null>(null);
 const [eInvoiceNumber, setEInvoiceNumber] = useState('');
 const [eNotes, setENotes] = useState('');
 const [isBusy, setIsBusy] = useState(false);

 const loadData = async () => {
 if (!orgId) return;
 try {
 const { db } = await import('@/core/db/app_database');
 const [invList, allItems, prods, unts, tres, whs, sups] = await Promise.all([
 PurchasesRepository.getPurchaseInvoices(orgId),
 db.purchase_invoice_items.toArray(),
 db.products.where('org_id').equals(orgId).toArray(),
 db.units.where('org_id').equals(orgId).toArray(),
 db.treasuries.where('org_id').equals(orgId).toArray(),
 db.warehouses.where('org_id').equals(orgId).toArray(),
 db.contacts.where('org_id').equals(orgId).and((c) => c.is_active).toArray(),
 ]);

 const grouped: Record<string, PurchaseInvoiceItem[]> = {};
 for (const it of allItems) {
 (grouped[it.invoice_id] = grouped[it.invoice_id] || []).push(it);
 }

 setInvoices(invList);
 setItemsByInvoice(grouped);
 setProducts(prods);
 setUnits(unts);
 setTreasuries(tres);
 setWarehouses(whs);
 setSuppliers(sups);
 } catch (err) {
 console.error('Load invoices error:', err);
 toast.error('حدث خطأ أثناء تحميل فواتير المشتريات');
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
 return invoices.filter((inv) => {
 if (supplierFilter && supplierFilter !=='all'&& inv.supplier_id !== supplierFilter) return false;
 if (!search.trim()) return true;
 const s = search.toLowerCase();
 const num = (inv.invoice_number ||'').toLowerCase();
 const sysNum = (inv.system_invoice_number ||'').toLowerCase();
 const sup = nameOf(suppliers, inv.supplier_id).toLowerCase();
 return num.includes(s) || sysNum.includes(s) || sup.includes(s);
 });
 }, [invoices, supplierFilter, search, suppliers]);

 const kpis = useMemo(() => {
 const total = filtered.reduce((a, b) => a + (b.total || 0), 0);
 const paid = filtered.reduce((a, b) => a + (b.paid_amount || 0), 0);
 const remaining = filtered.reduce((a, b) => a + (b.remaining_amount || 0), 0);
 return { count: filtered.length, total, paid, remaining };
 }, [filtered]);

 const openReturn = (inv: PurchaseInvoice) => {
 router.push(`/purchases/returns/new?invoiceId=${inv.id}`);
 };

 const openEdit = (inv: PurchaseInvoice) => {
 setEditId(inv.id);
 setEInvoiceNumber(inv.invoice_number ||'');
 setENotes(inv.notes ||'');
 };

 const saveEdit = async () => {
 if (!editId || !currentUser) return;
 try {
 setIsBusy(true);
 await PurchasesRepository.updatePurchaseInvoice({
 invoiceId: editId,
 userId: currentUser.id,
 invoiceNumber: eInvoiceNumber.trim() || undefined,
 notes: eNotes.trim() || undefined,
 });
 toast.success('تم تعديل بيانات الفاتورة بنجاح');
 setEditId(null);
 await loadData();
 } catch (err) {
 console.error(err);
 toast.error(err instanceof Error ? err.message :'تعذر تعديل الفاتورة');
 } finally {
 setIsBusy(false);
 }
 };

 const handleDelete = async (inv: PurchaseInvoice) => {
 const reason = window.prompt(
`هل أنت متأكد من إلغاء وحذف فاتورة المشتريات ${inv.system_invoice_number}؟\nسيتم عكس حركات المخزن والخزينة ورصيد المورد.\nاكتب سبب الإلغاء:`
 );
 if (reason === null) return;
 if (!currentUser) return;
 try {
 await PurchasesRepository.deletePurchaseInvoice({
 invoiceId: inv.id,
 userId: currentUser.id,
 reason: reason.trim() ||'إلغاء بواسطة المستخدم',
 });
 toast.success('تم إلغاء فاتورة المشتريات وعكس حركاتها بنجاح');
 await loadData();
 } catch (err) {
 console.error(err);
 toast.error(err instanceof Error ? err.message :'تعذر إلغاء الفاتورة');
 }
 };

 const viewInvoice = viewId ? invoices.find((x) => x.id === viewId) : null;
 const viewItems = viewId ? itemsByInvoice[viewId] || [] : [];

 return (
 <AppShell
  title="فواتير المشتريات"
  subtitle="سجل فواتير الشراء والتوريد ومتابعة الأرصدة والمستحقات المالية"
  actions={
    <Button
      onClick={() => router.push('/purchases/invoices/new')}
      className="h-10 px-4 rounded-xl bg-primary hover:bg-primary/90 text-white font-bold text-xs flex items-center gap-2 shadow-xs hover:shadow-md transition-all cursor-pointer"
    >
      <Plus className="w-4 h-4" />
      <span>فاتورة مشتريات جديدة</span>
    </Button>
  }
>
  <div className="space-y-5 select-none" dir="rtl">
    {/* KPI Cards — Unified Design System */}
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      <KpiCard
        label="إجمالي الفواتير"
        value={kpis.count}
        unit="فاتورة"
        variant="blue"
        icon={<Receipt className="w-5 h-5" />}
      />
      <KpiCard
        label="إجمالي قيمة المشتريات"
        value={formatNumber(kpis.total)}
        unit="ج.م"
        variant="amber"
        icon={<ShoppingBag className="w-5 h-5" />}
      />
      <KpiCard
        label="المسدد للموردين"
        value={formatNumber(kpis.paid)}
        unit="ج.م"
        variant="emerald"
        icon={<CheckCircle2 className="w-5 h-5" />}
      />
      <KpiCard
        label="المتبقي (ذمم آجلة)"
        value={formatNumber(kpis.remaining)}
        unit="ج.م"
        variant="rose"
        icon={<Clock className="w-5 h-5" />}
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
            placeholder="بحث برقم الفاتورة أو المورد..."
            className="h-10 bg-slate-50/70 dark:bg-slate-900/70 text-xs font-semibold rounded-xl pr-10 border-slate-200/80 dark:border-slate-800"
          />
        </div>
        <div className="w-48">
          <Select value={supplierFilter} onValueChange={setSupplierFilter}>
            <SelectTrigger className="w-full h-10 rounded-xl bg-slate-50/70 dark:bg-slate-900/70 border-slate-200/80 dark:border-slate-800 text-xs font-bold">
              <SelectValue placeholder="كل الموردين" />
            </SelectTrigger>
            <SelectContent className="z-50 bg-popover border border-slate-200 dark:border-slate-800 rounded-xl shadow-xl max-h-60">
              <SelectItem value="all">كل الموردين</SelectItem>
              {suppliers.map((c) => (
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
        <div className="py-16 text-center text-xs font-bold text-slate-400">جارٍ تحميل فواتير المشتريات...</div>
      ) : filtered.length === 0 ? (
        <div className="p-4">
          <EmptyState
            icon={<Receipt className="w-7 h-7 text-slate-400" />}
            title="لا توجد فواتير مشتريات مسجلة بعد"
            description="ابدأ بتسجيل أول فاتورة مشتريات وتوريد بضائع للمخازن."
            action={{
              label: "فاتورة مشتريات جديدة",
              icon: <Plus className="w-4 h-4" />,
              onClick: () => router.push('/purchases/invoices/new'),
            }}
          />
        </div>
      ) : (
        <div className="overflow-x-auto min-h-[300px]">
          <Table className="text-right text-xs">
 <TableHeader className="bg-slate-50/70 dark:bg-slate-900/50">
 <TableRow className="border-b border-slate-200/80 dark:border-slate-800">
 <TableHead className="py-3 px-4 font-bold text-slate-600 dark:text-slate-300 text-right">الرقم</TableHead>
 <TableHead className="py-3 px-3 font-bold text-slate-600 dark:text-slate-300 text-right">المورد</TableHead>
 <TableHead className="py-3 px-3 font-bold text-slate-600 dark:text-slate-300 text-right">المخزن</TableHead>
 <TableHead className="py-3 px-3 font-bold text-slate-600 dark:text-slate-300 text-right">التاريخ</TableHead>
 <TableHead className="py-3 px-3 font-bold text-slate-600 dark:text-slate-300 text-right">الدفع</TableHead>
 <TableHead className="py-3 px-3 font-bold text-slate-600 dark:text-slate-300 text-right">الإجمالي</TableHead>
 <TableHead className="py-3 px-3 font-bold text-slate-600 dark:text-slate-300 text-right">المتبقي</TableHead>
 <TableHead className="py-3 px-3 font-bold text-slate-600 dark:text-slate-300 text-center w-28">الإجراءات</TableHead>
 </TableRow>
 </TableHeader>
 <TableBody className="divide-y divide-slate-100 dark:divide-slate-800/80 font-bold">
 {filtered.map((inv) => (
 <TableRow key={inv.id} className="hover:bg-slate-50/70 dark:hover:bg-slate-800/40 transition-colors">
 <TableCell className="py-3.5 px-4">
 <span className="text-[#558b2f] font-black font-mono">{inv.system_invoice_number}</span>
 <div className="text-3xs text-slate-400 font-semibold">{inv.invoice_number ||'بدون رقم مورد'}</div>
 </TableCell>
 <TableCell className="py-3.5 px-3 font-bold text-slate-800 dark:text-slate-200">
 {nameOf(suppliers, inv.supplier_id)}
 </TableCell>
 <TableCell className="py-3.5 px-3 text-2xs text-slate-600 dark:text-slate-400">
 {nameOf(warehouses, inv.warehouse_id)}
 </TableCell>
 <TableCell className="py-3.5 px-3 text-2xs font-mono text-slate-600 dark:text-slate-400">
 {formatDateTime(inv.invoice_date)}
 </TableCell>
 <TableCell className="py-3.5 px-3">
 <Badge
 variant="secondary"
 className={`text-3xs font-bold ${
 inv.payment_type ==='cash'
 ?'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800'
 : inv.payment_type ==='card'
 ?'bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-400 border border-blue-200 dark:border-blue-800'
 :'bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-400 border border-amber-200 dark:border-amber-800'
 }`}
 >
 {PAYMENT_LABELS[inv.payment_type] || inv.payment_type}
 </Badge>
 </TableCell>
 <TableCell className="py-3.5 px-3 text-[#558b2f] font-black font-mono">
 {formatNumber(inv.total)} ج.م
 </TableCell>
 <TableCell className="py-3.5 px-3 font-mono">
 {inv.remaining_amount > 0 ? (
 <span className="text-amber-600 dark:text-amber-400 font-black">{formatNumber(inv.remaining_amount)} ج.م</span>
 ) : (
 <Badge variant="outline"className="text-emerald-600 dark:text-emerald-400 border-emerald-200 bg-emerald-50/50 dark:bg-emerald-950/30">
 مُسددة
 </Badge>
 )}
 </TableCell>
 <TableCell className="py-3.5 px-3 text-center">
 <div className="flex items-center justify-center gap-1">
 <Button
 variant="ghost"
 size="icon"
 onClick={() => setViewId(inv.id)}
 title="عرض الفاتورة"
 className="w-7 h-7 rounded-lg text-slate-500 hover:text-[#558b2f]"
 >
 <Eye className="w-3.5 h-3.5"/>
 </Button>
 <Button
 variant="ghost"
 size="icon"
 onClick={() => openEdit(inv)}
 title="تعديل"
 className="w-7 h-7 rounded-lg text-slate-500 hover:text-blue-600"
 >
 <Pencil className="w-3.5 h-3.5"/>
 </Button>
 <Button
 variant="ghost"
 size="icon"
 onClick={() => openReturn(inv)}
 title="مرتجع مشتريات"
 className="w-7 h-7 rounded-lg text-slate-500 hover:text-amber-500"
 >
 <RotateCcw className="w-3.5 h-3.5"/>
 </Button>
 <Button
 variant="ghost"
 size="icon"
 onClick={() => handleDelete(inv)}
 title="إلغاء وحذف الفاتورة"
 className="w-7 h-7 rounded-lg text-slate-500 hover:text-red-600"
 >
 <Ban className="w-3.5 h-3.5"/>
 </Button>
 </div>
 </TableCell>
 </TableRow>
 ))}
 </TableBody>
 </Table>
 </div>
 )}
 </Card>

 {/* View Modal with Shadcn Dialog */}
 <Dialog open={Boolean(viewInvoice)} onOpenChange={(open) => !open && setViewId(null)}>
 <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto rounded-2xl p-6 text-right"dir="rtl">
 <DialogHeader className="text-right pb-3 border-b border-slate-100 dark:border-slate-800">
 <div className="flex items-center gap-2">
 <Receipt className="w-5 h-5 text-[#558b2f]"/>
 <DialogTitle className="text-base font-black text-slate-900 dark:text-white">
 تفاصيل فاتورة مشتريات {viewInvoice?.system_invoice_number}
 </DialogTitle>
 </div>
 <DialogDescription className="text-xs text-slate-400">
 استعراض بنود وأصناف وتفاصيل السداد لفاتورة الشراء
 </DialogDescription>
 </DialogHeader>

 {viewInvoice && (
 <div className="space-y-4 pt-2">
 <div className="grid grid-cols-2 md:grid-cols-3 gap-3 text-xs font-bold text-slate-600 dark:text-slate-300 bg-slate-50 dark:bg-slate-900 p-3 rounded-xl">
 <div>
 <span className="text-3xs text-slate-400 block font-normal">المورد:</span>
 <span className="text-slate-800 dark:text-slate-200">{nameOf(suppliers, viewInvoice.supplier_id)}</span>
 </div>
 <div>
 <span className="text-3xs text-slate-400 block font-normal">المخزن:</span>
 <span className="text-slate-800 dark:text-slate-200">{nameOf(warehouses, viewInvoice.warehouse_id)}</span>
 </div>
 <div>
 <span className="text-3xs text-slate-400 block font-normal">رقم فاتورة المورد:</span>
 <span className="font-mono text-slate-800 dark:text-slate-200">{viewInvoice.invoice_number ||'—'}</span>
 </div>
 <div>
 <span className="text-3xs text-slate-400 block font-normal">التاريخ:</span>
 <span className="font-mono text-slate-800 dark:text-slate-200">{formatDateTime(viewInvoice.invoice_date)}</span>
 </div>
 <div>
 <span className="text-3xs text-slate-400 block font-normal">طريقة الدفع:</span>
 <span className="text-slate-800 dark:text-slate-200">{PAYMENT_LABELS[viewInvoice.payment_type] || viewInvoice.payment_type}</span>
 </div>
 <div>
 <span className="text-3xs text-slate-400 block font-normal">الخزينة:</span>
 <span className="text-slate-800 dark:text-slate-200">{nameOf(treasuries, viewInvoice.treasury_id)}</span>
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
 <TableHead className="py-2.5 px-2 font-bold text-right">التكلفة</TableHead>
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
 <TableCell className="py-2.5 px-2 text-2xs font-mono font-normal">{it.batch_number ||'—'}</TableCell>
 <TableCell className="py-2.5 px-2 font-mono">{formatNumber(it.quantity)}</TableCell>
 <TableCell className="py-2.5 px-2 font-mono">{formatNumber(it.unit_cost)}</TableCell>
 <TableCell className="py-2.5 px-3 font-mono text-[#558b2f] font-black">{formatNumber(it.total)}</TableCell>
 </TableRow>
 );
 })}
 </TableBody>
 </Table>
 </div>

 <div className="flex justify-end text-xs font-bold text-slate-600 dark:text-slate-300 gap-6 pt-2 border-t border-slate-100 dark:border-slate-800">
 <div>
 <span className="text-slate-400">الإجمالي:</span>{''}
 <span className="font-black font-mono text-slate-900 dark:text-white">{formatNumber(viewInvoice.total)} ج.م</span>
 </div>
 <div>
 <span className="text-slate-400">المسدد:</span>{''}
 <span className="font-black font-mono text-emerald-600 dark:text-emerald-400">{formatNumber(viewInvoice.paid_amount)} ج.م</span>
 </div>
 <div>
 <span className="text-slate-400">المتبقي:</span>{''}
 <span className="font-black font-mono text-amber-600 dark:text-amber-400">{formatNumber(viewInvoice.remaining_amount)} ج.م</span>
 </div>
 </div>

 {viewInvoice.notes && (
 <div className="rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-100 dark:border-slate-800 p-3 text-xs text-slate-600 dark:text-slate-300">
 <span className="font-bold text-slate-400 block text-3xs">ملاحظات:</span>
 {viewInvoice.notes}
 </div>
 )}
 </div>
 )}
 </DialogContent>
 </Dialog>

 {/* Edit Modal with Shadcn Dialog */}
 <Dialog open={Boolean(editId)} onOpenChange={(open) => !open && setEditId(null)}>
 <DialogContent className="max-w-md rounded-2xl p-6 text-right"dir="rtl">
 <DialogHeader className="text-right pb-3 border-b border-slate-100 dark:border-slate-800">
 <DialogTitle className="text-base font-black text-slate-900 dark:text-white">
 تعديل بيانات الفاتورة
 </DialogTitle>
 <DialogDescription className="text-xs text-slate-400">
 تعديل الملاحظات ورقم فاتورة المورد المسجل
 </DialogDescription>
 </DialogHeader>

 <div className="space-y-3 pt-2">
 <div className="space-y-1">
 <span className="block text-xs font-bold text-slate-700 dark:text-slate-300">رقم فاتورة المورد</span>
 <Input
 type="text"
 value={eInvoiceNumber}
 onChange={(e) => setEInvoiceNumber(e.target.value)}
 className="h-10 text-xs rounded-xl"
 placeholder="رقم فاتورة المورد"
 />
 </div>
 <div className="space-y-1">
 <span className="block text-xs font-bold text-slate-700 dark:text-slate-300">ملاحظات</span>
 <Input
 type="text"
 value={eNotes}
 onChange={(e) => setENotes(e.target.value)}
 className="h-10 text-xs rounded-xl"
 placeholder="ملاحظات على الفاتورة"
 />
 </div>
 <p className="text-3xs font-medium text-slate-400 bg-amber-50 dark:bg-amber-950/30 p-2.5 rounded-lg border border-amber-200/50 dark:border-amber-900/40">
 💡 لتعديل الأصناف أو الكميات، يُرجى إلغاء الفاتورة وإعادة إنشائها حرصاً على سلامة المخزون والقيود المحاسبية.
 </p>
 </div>

 <DialogFooter className="flex justify-end gap-2 pt-4 border-t border-slate-100 dark:border-slate-800">
 <Button variant="outline"onClick={() => setEditId(null)} className="h-9 px-4 rounded-xl text-xs font-bold">
 إلغاء
 </Button>
 <Button
 onClick={saveEdit}
 disabled={isBusy}
 className="h-9 px-5 bg-[#558b2f] hover:bg-[#436d25] text-white rounded-xl text-xs font-black cursor-pointer shadow-xs"
 >
 {isBusy ?'جارٍ الحفظ...':'حفظ التغييرات'}
 </Button>
 </DialogFooter>
 </DialogContent>
 </Dialog>
 </div>
 </AppShell>
 );
}

export default function InvoicesPage() {
 return (
 <Suspense fallback={<div />}>
 <InvoicesContent />
 </Suspense>
 );
}