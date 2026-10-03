'use client';

import React, { useEffect, useState, Suspense } from'react';
import { useRouter } from'next/navigation';
import Link from'next/link';
import { AppShell } from'@/components/layout/AppShell';
import { Button } from'@/components/ui/button';
import { Input } from'@/components/ui/input';
import { DatePicker } from'@/components/ui/date-picker';
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
import { Textarea } from'@/components/ui/textarea';
import {
 ArrowRight,
 Plus,
 Trash2,
 Save,
 Search,
 ShoppingCart,
 Truck,
} from'lucide-react';
import { useSessionStore } from'@/core/state/useSessionStore';
import { PurchaseOrdersRepository } from'@/modules/purchases/purchase_orders_repository';
import { db } from'@/core/db/app_database';
import { formatNumber } from'@/lib/format';
import type { Contact, Product, Unit, Warehouse } from'@/types';
import { toast } from'sonner';

interface POLineItem {
 productId: string;
 productName: string;
 unitId: string;
 quantity: number;
 unitCost: number;
 taxRate: number;
}

function NewPOContent() {
 const router = useRouter();
 const { currentUser, activeBranchId } = useSessionStore();
 const orgId = currentUser?.org_id ||'';
 const branchId = activeBranchId || currentUser?.branch_id ||'';

 const [suppliers, setSuppliers] = useState<Contact[]>([]);
 const [warehouses, setWarehouses] = useState<Warehouse[]>([]);
 const [products, setProducts] = useState<Product[]>([]);
 const [units, setUnits] = useState<Unit[]>([]);

 // Form State
 const [selectedSupplierId, setSelectedSupplierId] = useState<string>('');
 const [selectedWarehouseId, setSelectedWarehouseId] = useState<string>('');
 const [expectedDeliveryDate, setExpectedDeliveryDate] = useState<string>('');
 const [notes, setNotes] = useState('');

 // Line Items
 const [lineItems, setLineItems] = useState<POLineItem[]>([]);
 const [productSearch, setProductSearch] = useState('');
 const [isSubmitting, setIsSubmitting] = useState(false);

 useEffect(() => {
 if (!orgId) return;
 Promise.all([
 db.contacts.where('org_id').equals(orgId).toArray(),
 db.warehouses.where('org_id').equals(orgId).toArray(),
 db.products.where('org_id').equals(orgId).and((p) => p.is_active).toArray(),
 db.units.where('org_id').equals(orgId).toArray(),
 ]).then(([custs, whs, prods, unts]) => {
 const supps = custs.filter((c) => c.type ==='supplier'|| c.type ==='both');
 setSuppliers(supps);
 if (supps.length > 0) setSelectedSupplierId(supps[0].id);

 setWarehouses(whs);
 const mainWh = whs.find((w) => w.is_main) || whs[0];
 if (mainWh) setSelectedWarehouseId(mainWh.id);

 setProducts(prods);
 setUnits(unts);
 });

 const d = new Date();
 d.setDate(d.getDate() + 7);
 setExpectedDeliveryDate(d.toISOString().split('T')[0]);
 }, [orgId]);

 const filteredProducts = products.filter(
 (p) =>
 p.name.toLowerCase().includes(productSearch.toLowerCase()) ||
 (p.sku && p.sku.toLowerCase().includes(productSearch.toLowerCase()))
 );

 const handleAddProduct = (product: Product) => {
 const existingIndex = lineItems.findIndex((item) => item.productId === product.id);
 if (existingIndex > -1) {
 const updated = [...lineItems];
 updated[existingIndex].quantity += 1;
 setLineItems(updated);
 } else {
 setLineItems([
 ...lineItems,
 {
 productId: product.id,
 productName: product.name,
 unitId: product.base_unit_id ||'',
 quantity: 1,
 unitCost: product.purchase_price || 0,
 taxRate: product.tax_rate || 0,
 },
 ]);
 }
 };

 const handleRemoveLine = (index: number) => {
 setLineItems(lineItems.filter((_, i) => i !== index));
 };

 const handleLineChange = (index: number, field: keyof POLineItem, value: any) => {
 const updated = [...lineItems];
 updated[index] = { ...updated[index], [field]: value };
 setLineItems(updated);
 };

 const subtotal = lineItems.reduce((acc, item) => acc + item.quantity * item.unitCost, 0);
 const totalTax = lineItems.reduce(
 (acc, item) => acc + (item.quantity * item.unitCost * item.taxRate) / 100,
 0
 );
 const finalTotal = subtotal + totalTax;

 const handleSubmit = async () => {
 if (!selectedSupplierId) {
 toast.error('يرجى اختيار المورد');
 return;
 }
 if (!selectedWarehouseId) {
 toast.error('يرجى اختيار المستودع المستهدف');
 return;
 }
 if (lineItems.length === 0) {
 toast.error('يرجى إضافة صنف واحد على الأقل لأمر الشراء');
 return;
 }

 try {
 setIsSubmitting(true);
 const supplier = suppliers.find((s) => s.id === selectedSupplierId);

 await PurchaseOrdersRepository.createPurchaseOrder({
 orgId,
 branchId,
 warehouseId: selectedWarehouseId,
 supplierId: selectedSupplierId,
 supplierName: supplier?.name,
 expectedDeliveryDate,
 items: lineItems,
 notes,
 userId: currentUser?.id ||'',
 });

 toast.success('تم إنشاء أمر الشراء بنجاح');
 router.push('/purchases/orders');
 } catch (err: any) {
 console.error(err);
 toast.error(err?.message ||'حدث خطأ أثناء حفظ أمر الشراء');
 } finally {
 setIsSubmitting(false);
 }
 };

 return (
 <AppShell
 title="إنشاء أمر شراء جديد"
 subtitle="تجهيز وإرسال طلبات التوريد للموردين ومتابعة مواعيد التسليم المتوقعة"
 actions={
 <div className="flex items-center gap-2">
 <Link href="/purchases/orders">
 <Button variant="outline" className="h-10 px-4 rounded-xl font-bold text-xs flex items-center gap-1.5 shadow-2xs hover:bg-slate-100 dark:hover:bg-slate-800 transition-all cursor-pointer">
 <ArrowRight className="w-4 h-4"/>
 <span>الرجوع للأوامر</span>
 </Button>
 </Link>
 <Button
 onClick={handleSubmit}
 disabled={isSubmitting || lineItems.length === 0}
 className="h-10 px-4 rounded-xl bg-primary hover:bg-primary/90 text-white font-bold text-xs flex items-center gap-2 shadow-xs hover:shadow-md transition-all cursor-pointer"
 >
 <Save className="w-4 h-4"/>
 <span>حفظ أمر الشراء</span>
 </Button>
 </div>
 }
 >
 <div className="space-y-6 select-none" dir="rtl">
 <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
 {/* Left Side */}
 <div className="lg:col-span-2 space-y-6">
 {/* Header Info Card */}
 <Card className="bg-surface border-slate-200 dark:border-slate-800">
 <CardContent className="p-4 grid grid-cols-1 md:grid-cols-3 gap-4">
 <div>
 <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1">
 اختيار المورد
 </label>
 <Select value={selectedSupplierId} onValueChange={setSelectedSupplierId}>
 <SelectTrigger className="h-10 text-xs font-bold">
 <SelectValue placeholder="اختر المورد"/>
 </SelectTrigger>
 <SelectContent>
 {suppliers.map((s) => (
 <SelectItem key={s.id} value={s.id}>
 {s.name} {s.phone ?`(${s.phone})`:''}
 </SelectItem>
 ))}
 </SelectContent>
 </Select>
 </div>

 <div>
 <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1">
 المستودع المستهدف
 </label>
 <Select value={selectedWarehouseId} onValueChange={setSelectedWarehouseId}>
 <SelectTrigger className="h-10 text-xs font-bold">
 <SelectValue placeholder="اختر المستودع"/>
 </SelectTrigger>
 <SelectContent>
 {warehouses.map((w) => (
 <SelectItem key={w.id} value={w.id}>
 {w.name}
 </SelectItem>
 ))}
 </SelectContent>
 </Select>
 </div>

 <div>
 <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1">
 تاريخ التسليم المتوقع
 </label>
 <DatePicker
 value={expectedDeliveryDate}
 onChange={setExpectedDeliveryDate}
 placeholder="اختر تاريخ التسليم..."
 className="w-full"
 />
 </div>
 </CardContent>
 </Card>

 {/* Product Picker */}
 <Card className="bg-surface border-slate-200 dark:border-slate-800">
 <CardContent className="p-4 space-y-3">
 <div className="relative">
 <Search className="w-4 h-4 absolute right-3 top-1/2 -translate-y-1/2 text-slate-400"/>
 <Input
 placeholder="ابحث عن صنف لإضافته لأمر الشراء..."
 value={productSearch}
 onChange={(e) => setProductSearch(e.target.value)}
 className="pr-9 h-10 text-xs font-bold"
 />
 </div>

 {productSearch.trim() !==''&& (
 <div className="max-h-48 overflow-y-auto border rounded-xl divide-y bg-slate-50 dark:bg-slate-800/40">
 {filteredProducts.length === 0 ? (
 <div className="p-3 text-xs text-center text-slate-500">لا توجد نتائج</div>
 ) : (
 filteredProducts.map((p) => (
 <div
 key={p.id}
 onClick={() => {
 handleAddProduct(p);
 setProductSearch('');
 }}
 className="p-2.5 hover:bg-blue-50 dark:hover:bg-blue-950/40 cursor-pointer flex items-center justify-between text-xs font-bold"
 >
 <div>
 <span>{p.name}</span>
 <span className="text-3xs text-slate-400 block">{p.sku}</span>
 </div>
 <span className="text-primary">{formatNumber(p.purchase_price || 0)} ج.م</span>
 </div>
 ))
 )}
 </div>
 )}
 </CardContent>
 </Card>

 {/* Line Items Table */}
 <Card className="bg-surface border-slate-200 dark:border-slate-800 overflow-hidden">
 <Table>
 <TableHeader className="bg-slate-50 dark:bg-slate-800/50">
 <TableRow>
 <TableHead className="text-right font-black">الصنف</TableHead>
 <TableHead className="text-center font-black w-24">الكمية</TableHead>
 <TableHead className="text-right font-black w-32">تكلفة التوريد</TableHead>
 <TableHead className="text-right font-black w-32">الإجمالي</TableHead>
 <TableHead className="text-center font-black w-12"></TableHead>
 </TableRow>
 </TableHeader>
 <TableBody>
 {lineItems.length === 0 ? (
 <TableRow>
 <TableCell colSpan={5} className="text-center py-8 text-slate-500 font-bold">
 لم يتم إضافة أصناف بعد.
 </TableCell>
 </TableRow>
 ) : (
 lineItems.map((item, index) => {
 const lineTotal = item.quantity * item.unitCost;
 return (
 <TableRow key={index}>
 <TableCell className="font-bold text-xs">{item.productName}</TableCell>
 <TableCell>
 <Input
 type="number"
 min={1}
 value={item.quantity}
 onChange={(e) =>
 handleLineChange(index,'quantity', Math.max(1, parseFloat(e.target.value) || 1))
 }
 className="h-8 text-xs font-bold text-center"
 />
 </TableCell>
 <TableCell>
 <Input
 type="number"
 value={item.unitCost}
 onChange={(e) =>
 handleLineChange(index,'unitCost', Math.max(0, parseFloat(e.target.value) || 0))
 }
 className="h-8 text-xs font-bold"
 />
 </TableCell>
 <TableCell className="font-black text-xs">
 {formatNumber(lineTotal)} ج.م
 </TableCell>
 <TableCell className="text-center">
 <Button
 size="xs"
 variant="ghost"
 className="text-rose-600 hover:text-rose-700"
 onClick={() => handleRemoveLine(index)}
 >
 <Trash2 className="w-4 h-4"/>
 </Button>
 </TableCell>
 </TableRow>
 );
 })
 )}
 </TableBody>
 </Table>
 </Card>
 </div>

 {/* Right Side: Totals Summary & Notes */}
 <div className="space-y-6">
 <Card className="bg-surface border-slate-200 dark:border-slate-800">
 <CardContent className="p-6 space-y-4">
 <h2 className="text-base font-black text-slate-900 dark:text-white border-b pb-2">
 ملخص إجمالي أمر الشراء
 </h2>

 <div className="space-y-2 text-xs font-bold">
 <div className="flex justify-between text-slate-600 dark:text-slate-400">
 <span>المجموع الفرعي:</span>
 <span>{formatNumber(subtotal)} ج.م</span>
 </div>

 <div className="flex justify-between text-slate-600 dark:text-slate-400">
 <span>إجمالي الضريبة:</span>
 <span>{formatNumber(totalTax)} ج.م</span>
 </div>

 <div className="border-t pt-3 flex justify-between text-base font-black text-primary">
 <span>الإجمالي المتوقع:</span>
 <span>{formatNumber(finalTotal)} ج.م</span>
 </div>
 </div>

 <div className="pt-2">
 <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1">
 ملاحظات للمورد
 </label>
 <Textarea
 placeholder="أدخل ملاحظات خاصة بأمر الشراء والتوريد..."
 value={notes}
 onChange={(e) => setNotes(e.target.value)}
 rows={4}
 className="text-xs font-bold"
 />
 </div>

 <Button
 onClick={handleSubmit}
 disabled={isSubmitting || lineItems.length === 0}
 className="w-full bg-primary hover:bg-blue-700 text-white font-bold h-11 gap-2 mt-4"
 >
 <Save className="w-4 h-4"/>
 حفظ وإصدار أمر الشراء
 </Button>
 </CardContent>
 </Card>
 </div>
 </div>
 </div>
 </AppShell>
 );
}

export default function NewPOPage() {
 return (
 <Suspense fallback={<div className="p-8 text-center text-xs font-bold text-slate-400">جاري التحميل...</div>}>
 <NewPOContent />
 </Suspense>
 );
}