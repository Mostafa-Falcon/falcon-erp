'use client';

import React, { useEffect, useMemo, useState, Suspense } from'react';
import Link from'next/link';
import { AppShell } from'@/components/layout/AppShell';
import { Button } from'@/components/ui/button';
import { Badge } from'@/components/ui/badge';
import { Input } from'@/components/ui/input';
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
 Select,
 SelectContent,
 SelectItem,
 SelectTrigger,
 SelectValue,
} from'@/components/ui/select';
import {
 Dialog,
 DialogContent,
 DialogHeader,
 DialogTitle,
} from'@/components/ui/dialog';
import {
 Plus,
 Search,
 ShoppingCart,
 Truck,
 CheckCircle2,
 Clock,
 Eye,
 DollarSign,
 PackageCheck,
} from'lucide-react';
import { useSessionStore } from'@/core/state/useSessionStore';
import { PurchaseOrdersRepository } from'@/modules/purchases/purchase_orders_repository';
import { formatNumber } from'@/lib/format';
import type { PurchaseOrder, PurchaseOrderItem, PurchaseOrderStatus } from'@/types';
import { toast } from'sonner';

function PurchaseOrdersContent() {
 const { currentUser } = useSessionStore();
 const orgId = currentUser?.org_id ||'';

 const [orders, setOrders] = useState<PurchaseOrder[]>([]);
 const [isLoading, setIsLoading] = useState(true);
 const [search, setSearch] = useState('');
 const [statusFilter, setStatusFilter] = useState<string>('all');

 // Detail Modal
 const [selectedOrder, setSelectedOrder] = useState<PurchaseOrder | null>(null);
 const [selectedItems, setSelectedItems] = useState<PurchaseOrderItem[]>([]);
 const [isDetailOpen, setIsDetailOpen] = useState(false);

 const loadData = async () => {
 if (!orgId) return;
 try {
 setIsLoading(true);
 const list = await PurchaseOrdersRepository.getPurchaseOrders(orgId);
 setOrders(list);
 } catch (err) {
 console.error(err);
 toast.error('حدث خطأ أثناء تحميل أوامر الشراء');
 } finally {
 setIsLoading(false);
 }
 };

 useEffect(() => {
 loadData();
 }, [orgId]);

 const filteredOrders = useMemo(() => {
 return orders.filter((po) => {
 const matchSearch =
 po.po_number.toLowerCase().includes(search.toLowerCase()) ||
 (po.supplier_name && po.supplier_name.toLowerCase().includes(search.toLowerCase()));
 const matchStatus = statusFilter ==='all'|| po.status === statusFilter;
 return matchSearch && matchStatus;
 });
 }, [orders, search, statusFilter]);

 const stats = useMemo(() => {
 const totalCount = orders.length;
 const pendingCount = orders.filter((o) => o.status ==='sent'|| o.status ==='draft').length;
 const receivedCount = orders.filter((o) => o.status ==='received').length;
 const totalValue = orders.reduce((acc, o) => acc + o.total, 0);
 return { totalCount, pendingCount, receivedCount, totalValue };
 }, [orders]);

 const handleOpenDetail = async (po: PurchaseOrder) => {
 setSelectedOrder(po);
 setIsDetailOpen(true);
 try {
 const items = await PurchaseOrdersRepository.getPurchaseOrderItems(po.id);
 setSelectedItems(items);
 } catch (e) {
 console.error(e);
 toast.error('تعذر تحميل تفاصيل أمر الشراء');
 }
 };

 const handleStatusChange = async (id: string, status: PurchaseOrderStatus) => {
 try {
 await PurchaseOrdersRepository.updateStatus(id, status);
 toast.success('تم تحديث حالة أمر الشراء بنجاح');
 loadData();
 if (selectedOrder && selectedOrder.id === id) {
 setSelectedOrder((prev) => (prev ? { ...prev, status } : null));
 }
 } catch (err) {
 console.error(err);
 toast.error('فشل تحديث حالة أمر الشراء');
 }
 };

 const handleConvertToInvoice = async (po: PurchaseOrder) => {
 if (!currentUser) return;
 try {
 const items = await PurchaseOrdersRepository.getPurchaseOrderItems(po.id);
 if (!items || items.length === 0) {
 toast.error('لا توجد أصناف في أمر الشراء هذا');
 return;
 }

 const { db } = await import('@/core/db/app_database');
 const { PurchasesRepository } = await import('@/modules/purchases/purchases_repository');
 const warehouse = (await db.warehouses.where('org_id').equals(orgId).first()) || { id: po.warehouse_id || currentUser.branch_id ||'' };
 const treasury = (await db.treasuries.where('org_id').equals(orgId).first()) || { id:'' };

 const createdInvoice = await PurchasesRepository.createPurchaseInvoice({
 orgId,
 branchId: po.branch_id || currentUser.branch_id ||'',
 warehouseId: warehouse.id,
 supplierId: po.supplier_id || null,
 invoiceNumber:`PUR-${po.po_number}`,
 invoiceDate: new Date().toISOString().split('T')[0],
 paymentType:'credit',
 treasuryId: treasury.id,
 userId: currentUser.id,
 notes:`تحويل تلقائي من أمر شراء رقم #${po.po_number}`,
 items: items.map((it) => ({
 productId: it.product_id,
 unitId: it.unit_id ||'',
 conversionFactor: it.conversion_factor || 1,
 quantity: it.quantity,
 unitCost: it.unit_cost,
 })),
 });

 await PurchaseOrdersRepository.updateStatus(po.id,'received');
 toast.success(`تم تحويل أمر الشراء #${po.po_number} إلى فاتورة مشتريات #${createdInvoice.invoice_number} وزيادة الرصيد بالمخزن!`);
 loadData();
 setIsDetailOpen(false);
 } catch (e: any) {
 console.error(e);
 toast.error(e?.message ||'فشل تحويل أمر الشراء إلى فاتورة مشتريات');
 }
 };

 const getStatusBadge = (status: PurchaseOrderStatus) => {
 switch (status) {
 case'received':
 return <Badge className="bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-400">تم الاستلام</Badge>;
 case'partially_received':
 return <Badge className="bg-blue-100 text-blue-800 dark:bg-blue-950/60 dark:text-blue-400">استلام جزئي</Badge>;
 case'cancelled':
 return <Badge className="bg-rose-100 text-rose-800 dark:bg-rose-950/60 dark:text-rose-400">ملغي</Badge>;
 case'sent':
 default:
 return <Badge className="bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-400">قيد التوريد</Badge>;
 }
 };

 return (
 <div className="p-6 space-y-6 max-w-[1600px] mx-auto">
 {/* Header */}
 <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
 <div>
 <h1 className="text-2xl font-black text-slate-900 dark:text-white flex items-center gap-2">
 <ShoppingCart className="w-7 h-7 text-primary"/>
 أوامر الشراء (Purchase Orders)
 </h1>
 <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
 متابعة أوامر الشراء الموجهة للموردين وحالة التوريد والاستلام
 </p>
 </div>
 <Link href="/purchases/orders/new">
 <Button className="bg-primary hover:bg-blue-700 text-white font-bold gap-2">
 <Plus className="w-4 h-4"/>
 إنشاء أمر شراء جديد
 </Button>
 </Link>
 </div>

 {/* Summary Cards */}
 <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
 <Card className="bg-surface border-slate-200 dark:border-slate-800 shadow-xs">
 <CardContent className="p-4 flex items-center justify-between">
 <div>
 <p className="text-xs font-bold text-slate-500">إجمالي الأوامر</p>
 <p className="text-2xl font-black text-slate-900 dark:text-white mt-1">{stats.totalCount}</p>
 </div>
 <div className="w-10 h-10 rounded-xl bg-blue-50 dark:bg-blue-950/50 flex items-center justify-center text-primary">
 <ShoppingCart className="w-5 h-5"/>
 </div>
 </CardContent>
 </Card>

 <Card className="bg-surface border-slate-200 dark:border-slate-800 shadow-xs">
 <CardContent className="p-4 flex items-center justify-between">
 <div>
 <p className="text-xs font-bold text-slate-500">أوامر قيد التوريد</p>
 <p className="text-2xl font-black text-amber-600 dark:text-amber-400 mt-1">{stats.pendingCount}</p>
 </div>
 <div className="w-10 h-10 rounded-xl bg-amber-50 dark:bg-amber-950/50 flex items-center justify-center text-amber-600">
 <Clock className="w-5 h-5"/>
 </div>
 </CardContent>
 </Card>

 <Card className="bg-surface border-slate-200 dark:border-slate-800 shadow-xs">
 <CardContent className="p-4 flex items-center justify-between">
 <div>
 <p className="text-xs font-bold text-slate-500">الأوامر المستلمة</p>
 <p className="text-2xl font-black text-emerald-600 dark:text-emerald-400 mt-1">{stats.receivedCount}</p>
 </div>
 <div className="w-10 h-10 rounded-xl bg-emerald-50 dark:bg-emerald-950/50 flex items-center justify-center text-emerald-600">
 <CheckCircle2 className="w-5 h-5"/>
 </div>
 </CardContent>
 </Card>

 <Card className="bg-surface border-slate-200 dark:border-slate-800 shadow-xs">
 <CardContent className="p-4 flex items-center justify-between">
 <div>
 <p className="text-xs font-bold text-slate-500">القيمة الإجمالية</p>
 <p className="text-2xl font-black text-slate-900 dark:text-white mt-1">{formatNumber(stats.totalValue)} د.ع</p>
 </div>
 <div className="w-10 h-10 rounded-xl bg-purple-50 dark:bg-purple-950/50 flex items-center justify-center text-purple-600">
 <DollarSign className="w-5 h-5"/>
 </div>
 </CardContent>
 </Card>
 </div>

 {/* Filter Bar */}
 <Card className="bg-surface border-slate-200 dark:border-slate-800">
 <CardContent className="p-4 flex flex-col md:flex-row gap-4 items-center justify-between">
 <div className="relative flex-1 w-full">
 <Search className="w-4 h-4 absolute right-3 top-1/2 -translate-y-1/2 text-slate-400"/>
 <Input
 placeholder="البحث برقم أمر الشراء أو اسم المورد..."
 value={search}
 onChange={(e) => setSearch(e.target.value)}
 className="pr-9 h-10 text-xs font-bold"
 />
 </div>

 <div className="flex items-center gap-3 w-full md:w-auto">
 <Select value={statusFilter} onValueChange={setStatusFilter}>
 <SelectTrigger className="w-[180px] h-10 text-xs font-bold">
 <SelectValue placeholder="حالة أمر الشراء"/>
 </SelectTrigger>
 <SelectContent>
 <SelectItem value="all">كل الحالات</SelectItem>
 <SelectItem value="sent">قيد التوريد</SelectItem>
 <SelectItem value="received">تم الاستلام</SelectItem>
 <SelectItem value="partially_received">استلام جزئي</SelectItem>
 <SelectItem value="cancelled">ملغي</SelectItem>
 </SelectContent>
 </Select>
 </div>
 </CardContent>
 </Card>

 {/* Table */}
 <Card className="bg-surface border-slate-200 dark:border-slate-800 overflow-hidden">
 <Table>
 <TableHeader className="bg-slate-50 dark:bg-slate-800/50">
 <TableRow>
 <TableHead className="text-right font-black">رقم الأمر</TableHead>
 <TableHead className="text-right font-black">المورد</TableHead>
 <TableHead className="text-right font-black">تاريخ الطلب</TableHead>
 <TableHead className="text-right font-black">التسليم المتوقع</TableHead>
 <TableHead className="text-right font-black">الإجمالي</TableHead>
 <TableHead className="text-center font-black">الحالة</TableHead>
 <TableHead className="text-center font-black">الإجراءات</TableHead>
 </TableRow>
 </TableHeader>
 <TableBody>
 {isLoading ? (
 <TableRow>
 <TableCell colSpan={7} className="text-center py-8 text-slate-500">
 جاري تحميل أوامر الشراء...
 </TableCell>
 </TableRow>
 ) : filteredOrders.length === 0 ? (
 <TableRow>
 <TableCell colSpan={7} className="text-center py-8 text-slate-500 font-bold">
 لا توجد أوامر شراء مطابقة للبحث
 </TableCell>
 </TableRow>
 ) : (
 filteredOrders.map((po) => (
 <TableRow key={po.id} className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40">
 <TableCell className="font-bold text-slate-900 dark:text-white">
 {po.po_number}
 </TableCell>
 <TableCell className="font-bold text-slate-700 dark:text-slate-300">
 {po.supplier_name ||'مورد عام'}
 </TableCell>
 <TableCell className="text-xs text-slate-500">
 {new Date(po.order_date).toLocaleDateString('ar-EG')}
 </TableCell>
 <TableCell className="text-xs text-slate-500">
 {po.expected_delivery_date ? new Date(po.expected_delivery_date).toLocaleDateString('ar-EG') :'غير محدد'}
 </TableCell>
 <TableCell className="font-black text-slate-900 dark:text-white">
 {formatNumber(po.total)} د.ع
 </TableCell>
 <TableCell className="text-center">
 {getStatusBadge(po.status)}
 </TableCell>
 <TableCell className="text-center">
 <div className="flex items-center justify-center gap-1">
 <Button
 size="xs"
 variant="ghost"
 onClick={() => handleOpenDetail(po)}
 title="عرض التفاصيل"
 >
 <Eye className="w-4 h-4 text-slate-600 dark:text-slate-300"/>
 </Button>
 {po.status ==='sent'&& (
 <Button
 size="xs"
 variant="ghost"
 className="text-emerald-600 hover:text-emerald-700"
 onClick={() => handleStatusChange(po.id,'received')}
 title="تأكيد الاستلام الكامل"
 >
 <PackageCheck className="w-4 h-4"/>
 </Button>
 )}
 </div>
 </TableCell>
 </TableRow>
 ))
 )}
 </TableBody>
 </Table>
 </Card>

 {/* Details Dialog */}
 <Dialog open={isDetailOpen} onOpenChange={setIsDetailOpen}>
 <DialogContent className="max-w-3xl">
 <DialogHeader>
 <DialogTitle className="flex items-center justify-between">
 <span>تفاصيل أمر الشراء: {selectedOrder?.po_number}</span>
 {selectedOrder && getStatusBadge(selectedOrder.status)}
 </DialogTitle>
 </DialogHeader>

 {selectedOrder && (
 <div className="space-y-4">
 <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 bg-slate-50 dark:bg-slate-800/50 p-3 rounded-xl text-xs">
 <div>
 <span className="text-slate-500 font-bold block">المورد:</span>
 <span className="font-black text-slate-900 dark:text-white">{selectedOrder.supplier_name ||'مورد عام'}</span>
 </div>
 <div>
 <span className="text-slate-500 font-bold block">تاريخ الطلب:</span>
 <span className="font-black text-slate-900 dark:text-white">{new Date(selectedOrder.order_date).toLocaleDateString('ar-EG')}</span>
 </div>
 <div>
 <span className="text-slate-500 font-bold block">التسليم المتوقع:</span>
 <span className="font-black text-slate-900 dark:text-white">{selectedOrder.expected_delivery_date ? new Date(selectedOrder.expected_delivery_date).toLocaleDateString('ar-EG') :'غير محدد'}</span>
 </div>
 </div>

 {/* Items Table */}
 <div className="border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden">
 <Table>
 <TableHeader className="bg-slate-100 dark:bg-slate-800">
 <TableRow>
 <TableHead className="text-right font-black">الصنف</TableHead>
 <TableHead className="text-center font-black">الكمية المطلوبة</TableHead>
 <TableHead className="text-right font-black">تكلفة الوحدة</TableHead>
 <TableHead className="text-right font-black">الإجمالي</TableHead>
 </TableRow>
 </TableHeader>
 <TableBody>
 {selectedItems.map((item) => (
 <TableRow key={item.id}>
 <TableCell className="font-bold">{item.product_name}</TableCell>
 <TableCell className="text-center font-bold">{item.quantity}</TableCell>
 <TableCell>{formatNumber(item.unit_cost)} د.ع</TableCell>
 <TableCell className="font-black">{formatNumber(item.total)} د.ع</TableCell>
 </TableRow>
 ))}
 </TableBody>
 </Table>
 </div>

 {/* Summary & Actions */}
 <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs border-t pt-3">
 <Button
 type="button"
 onClick={() => handleConvertToInvoice(selectedOrder)}
 className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs gap-1.5 cursor-pointer"
 >
 <PackageCheck className="w-4 h-4" />
 <span>تحويل إلى فاتورة مشتريات وتأكيد الرصيد بالمخزن</span>
 </Button>

 <div className="flex flex-col items-end gap-1 font-semibold">
 <div className="flex justify-between w-60">
 <span className="text-slate-500">المجموع الفرعي:</span>
 <span className="font-mono">{formatNumber(selectedOrder.subtotal)} ج.م</span>
 </div>
 <div className="flex justify-between w-60 text-base font-black border-t pt-1 text-primary">
 <span>الإجمالي النهائي:</span>
 <span className="font-mono text-emerald-600">{formatNumber(selectedOrder.total)} ج.م</span>
 </div>
 </div>
 </div>
 </div>
 )}
 <span>{formatNumber(selectedOrder.total)} د.ع</span>
 </div>
 </div>
 </div>
 )}
 </DialogContent>
 </Dialog>
 </div>
 );
}

export default function PurchaseOrdersPage() {
 return (
 <AppShell>
 <Suspense fallback={<div className="p-8 text-center">جاري التحميل...</div>}>
 <PurchaseOrdersContent />
 </Suspense>
 </AppShell>
 );
}