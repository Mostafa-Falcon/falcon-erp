'use client';

import React, { useEffect, useState, Suspense } from'react';
import { useRouter } from'next/navigation';
import Link from'next/link';
import { AppShell } from'@/components/layout/AppShell';
import { Button } from'@/components/ui/button';
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
import { Textarea } from'@/components/ui/textarea';
import {
 ArrowRight,
 Plus,
 Trash2,
 Save,
 Search,
 User,
 Calendar,
 FileText,
} from'lucide-react';
import { useSessionStore } from'@/core/state/useSessionStore';
import { QuotationsRepository } from'@/modules/sales/quotations_repository';
import { db } from'@/core/db/app_database';
import { formatNumber } from'@/lib/format';
import type { Contact, Product, Unit } from'@/types';
import { toast } from'sonner';

interface QuoteLineItem {
 productId: string;
 productName: string;
 unitId: string;
 unitName?: string;
 conversionFactor: number;
 quantity: number;
 unitPrice: number;
 discountAmount: number;
 taxRate: number;
}

function NewQuoteContent() {
 const router = useRouter();
 const { currentUser, activeBranchId } = useSessionStore();
 const orgId = currentUser?.org_id ||'';
 const branchId = activeBranchId || currentUser?.branch_id ||'';

 const [customers, setCustomers] = useState<Contact[]>([]);
 const [products, setProducts] = useState<Product[]>([]);
 const [units, setUnits] = useState<Unit[]>([]);

 // Form State
 const [selectedCustomerId, setSelectedCustomerId] = useState<string>('cash');
 const [validUntil, setValidUntil] = useState<string>('');
 const [notes, setNotes] = useState('');
 const [discountAmount, setDiscountAmount] = useState<number>(0);

 // Line Items
 const [lineItems, setLineItems] = useState<QuoteLineItem[]>([]);
 const [productSearch, setProductSearch] = useState('');
 const [isSubmitting, setIsSubmitting] = useState(false);

 useEffect(() => {
 if (!orgId) return;
 Promise.all([
 db.contacts.where('org_id').equals(orgId).toArray(),
 db.products.where('org_id').equals(orgId).and((p) => p.is_active).toArray(),
 db.units.where('org_id').equals(orgId).toArray(),
 ]).then(([custs, prods, unts]) => {
 setCustomers(custs.filter((c) => c.type ==='customer'|| c.type ==='both'));
 setProducts(prods);
 setUnits(unts);
 });

 // Default valid until date to 15 days from now
 const d = new Date();
 d.setDate(d.getDate() + 15);
 setValidUntil(d.toISOString().split('T')[0]);
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
 unitName: units.find((u) => u.id === product.base_unit_id)?.name ||'قطعة',
 conversionFactor: 1,
 quantity: 1,
 unitPrice: product.sale_price || 0,
 discountAmount: 0,
 taxRate: product.tax_rate || 0,
 },
 ]);
 }
 };

 const handleRemoveLine = (index: number) => {
 setLineItems(lineItems.filter((_, i) => i !== index));
 };

 const handleLineChange = (index: number, field: keyof QuoteLineItem, value: any) => {
 const updated = [...lineItems];
 updated[index] = { ...updated[index], [field]: value };
 setLineItems(updated);
 };

 const subtotal = lineItems.reduce((acc, item) => acc + item.quantity * item.unitPrice, 0);
 const totalTax = lineItems.reduce(
 (acc, item) => acc + ((item.quantity * item.unitPrice - item.discountAmount) * item.taxRate) / 100,
 0
 );
 const finalTotal = Math.max(0, subtotal - discountAmount + totalTax);

 const handleSubmit = async () => {
 if (lineItems.length === 0) {
 toast.error('يرجى إضافة صنف واحد على الأقل لعرض السعر');
 return;
 }

 try {
 setIsSubmitting(true);
 const selectedCustomer = customers.find((c) => c.id === selectedCustomerId);

 await QuotationsRepository.createQuotation({
 orgId,
 branchId,
 customerId: selectedCustomerId ==='cash'? null : selectedCustomerId,
 customerName: selectedCustomerId ==='cash'?'عميل عام (نقدي)': selectedCustomer?.name,
 customerPhone: selectedCustomer?.phone || selectedCustomer?.mobile,
 validUntil,
 items: lineItems,
 discountAmount,
 notes,
 userId: currentUser?.id ||'',
 });

 toast.success('تم إنشاء عرض السعر بنجاح');
 router.push('/sales/quotes');
 } catch (err: any) {
 console.error(err);
 toast.error(err?.message ||'حدث خطأ أثناء حفظ عرض السعر');
 } finally {
 setIsSubmitting(false);
 }
 };

 return (
 <div className="p-6 space-y-6 max-w-[1600px] mx-auto">
 {/* Top Action Bar */}
 <div className="flex items-center justify-between">
 <div className="flex items-center gap-3">
 <Link href="/sales/quotes">
 <Button variant="ghost"size="icon"className="rounded-xl">
 <ArrowRight className="w-5 h-5"/>
 </Button>
 </Link>
 <div>
 <h1 className="text-xl font-black text-slate-900 dark:text-white flex items-center gap-2">
 <FileText className="w-6 h-6 text-primary"/>
 إنشاء عرض سعر جديد
 </h1>
 <p className="text-xs text-slate-500">إدخال تفاصيل العميل والأصناف والأسعار</p>
 </div>
 </div>

 <Button
 onClick={handleSubmit}
 disabled={isSubmitting || lineItems.length === 0}
 className="bg-primary hover:bg-blue-700 text-white font-bold gap-2"
 >
 <Save className="w-4 h-4"/>
 حفظ وتصدير عرض السعر
 </Button>
 </div>

 <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
 {/* Left Side: Line Items & Selector */}
 <div className="lg:col-span-2 space-y-6">
 {/* Customer & Quote Header Info */}
 <Card className="bg-surface border-slate-200 dark:border-slate-800">
 <CardContent className="p-4 grid grid-cols-1 md:grid-cols-2 gap-4">
 <div>
 <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1">
 اختيار العميل
 </label>
 <Select value={selectedCustomerId} onValueChange={setSelectedCustomerId}>
 <SelectTrigger className="h-10 text-xs font-bold">
 <SelectValue placeholder="اختر العميل"/>
 </SelectTrigger>
 <SelectContent>
 <SelectItem value="cash">عميل عام (نقدي)</SelectItem>
 {customers.map((c) => (
 <SelectItem key={c.id} value={c.id}>
 {c.name} {c.phone ?`(${c.phone})`:''}
 </SelectItem>
 ))}
 </SelectContent>
 </Select>
 </div>

 <div>
 <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1">
 صالح لغاية تاريخ
 </label>
 <Input
 type="date"
 value={validUntil}
 onChange={(e) => setValidUntil(e.target.value)}
 className="h-10 text-xs font-bold"
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
 placeholder="ابحث عن صنف لإضافته لعرض السعر..."
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
 <span className="text-primary">{formatNumber(p.sale_price || 0)} د.ع</span>
 </div>
 ))
 )}
 </div>
 )}
 </CardContent>
 </Card>

 {/* Added Line Items Table */}
 <Card className="bg-surface border-slate-200 dark:border-slate-800 overflow-hidden">
 <Table>
 <TableHeader className="bg-slate-50 dark:bg-slate-800/50">
 <TableRow>
 <TableHead className="text-right font-black">الصنف</TableHead>
 <TableHead className="text-center font-black w-24">الكمية</TableHead>
 <TableHead className="text-right font-black w-32">سعر الوحدة</TableHead>
 <TableHead className="text-right font-black w-28">الخصم</TableHead>
 <TableHead className="text-right font-black w-32">الإجمالي</TableHead>
 <TableHead className="text-center font-black w-12"></TableHead>
 </TableRow>
 </TableHeader>
 <TableBody>
 {lineItems.length === 0 ? (
 <TableRow>
 <TableCell colSpan={6} className="text-center py-8 text-slate-500 font-bold">
 لم يتم إضافة أصناف بعد. ابحث أهلاه عن أصناف لإضافتها.
 </TableCell>
 </TableRow>
 ) : (
 lineItems.map((item, index) => {
 const lineTotal = item.quantity * item.unitPrice - item.discountAmount;
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
 value={item.unitPrice}
 onChange={(e) =>
 handleLineChange(index,'unitPrice', Math.max(0, parseFloat(e.target.value) || 0))
 }
 className="h-8 text-xs font-bold"
 />
 </TableCell>
 <TableCell>
 <Input
 type="number"
 value={item.discountAmount}
 onChange={(e) =>
 handleLineChange(index,'discountAmount', Math.max(0, parseFloat(e.target.value) || 0))
 }
 className="h-8 text-xs font-bold"
 />
 </TableCell>
 <TableCell className="font-black text-xs">
 {formatNumber(lineTotal)} د.ع
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
 ملخص الحساب
 </h2>

 <div className="space-y-2 text-xs font-bold">
 <div className="flex justify-between text-slate-600 dark:text-slate-400">
 <span>المجموع الفرعي:</span>
 <span>{formatNumber(subtotal)} د.ع</span>
 </div>

 <div className="flex justify-between items-center text-slate-600 dark:text-slate-400">
 <span>خصم كلي على العرض:</span>
 <Input
 type="number"
 value={discountAmount}
 onChange={(e) => setDiscountAmount(Math.max(0, parseFloat(e.target.value) || 0))}
 className="w-28 h-8 text-xs font-bold text-left"
 />
 </div>

 <div className="flex justify-between text-slate-600 dark:text-slate-400">
 <span>الضريبة التقريبية:</span>
 <span>{formatNumber(totalTax)} د.ع</span>
 </div>

 <div className="border-t pt-3 flex justify-between text-base font-black text-primary">
 <span>الإجمالي النهائي:</span>
 <span>{formatNumber(finalTotal)} د.ع</span>
 </div>
 </div>

 <div className="pt-2">
 <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1">
 شروط وملاحظات العرض
 </label>
 <Textarea
 placeholder="أدخل الشروط والأحكام الخاصة بعرض السعر (مثلاً: الأسعار قابلة للتغيير...)"
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
 حفظ عرض السعر
 </Button>
 </CardContent>
 </Card>
 </div>
 </div>
 </div>
 );
}

export default function NewQuotePage() {
 return (
 <AppShell>
 <Suspense fallback={<div className="p-8 text-center">جاري التحميل...</div>}>
 <NewQuoteContent />
 </Suspense>
 </AppShell>
 );
}