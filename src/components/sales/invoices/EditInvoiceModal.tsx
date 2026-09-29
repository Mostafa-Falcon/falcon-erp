'use client';

import React, { useState, useEffect, useMemo } from'react';
import {
 Dialog,
 DialogContent,
 DialogHeader,
 DialogTitle,
 DialogDescription,
} from'@/components/ui/dialog';
import { Button } from'@/components/ui/button';
import { Input } from'@/components/ui/input';
import { Label } from'@/components/ui/label';
import { Badge } from'@/components/ui/badge';
import {
 Select,
 SelectContent,
 SelectItem,
 SelectTrigger,
 SelectValue,
} from'@/components/ui/select';
import {
 Edit3,
 Trash2,
 Plus,
 Loader2,
 Coins,
 Package,
 User,
 CreditCard,
 Receipt,
 X
} from'lucide-react';
import { db } from'@/core/db/app_database';
import { SalesRepository } from'@/modules/sales/sales_repository';
import { formatNumber } from'@/lib/format';
import type { SalesInvoice, SalesInvoiceItem, Product, Unit, Contact, User as UserType, InvoicePaymentType } from'@/types';
import { toast } from'sonner';

interface EditInvoiceModalProps {
 invoice: SalesInvoice | null;
 isOpen: boolean;
 onClose: () => void;
 currentUser: UserType | null;
 products: Product[];
 units: Unit[];
 customers: Contact[];
 onUpdated: () => void;
}

interface EditableLine {
 id: string;
 productId: string;
 batchId?: string | null;
 unitId: string;
 conversionFactor: number;
 quantity: number;
 unitPrice: number;
 unitCost: number;
 discountAmount: number;
 taxRate: number;
}

export function EditInvoiceModal({
 invoice,
 isOpen,
 onClose,
 currentUser,
 products,
 units,
 customers,
 onUpdated,
}: EditInvoiceModalProps) {
 const [customerId, setCustomerId] = useState<string>('');
 const [paymentType, setPaymentType] = useState<InvoicePaymentType>('cash');
 const [discountAmount, setDiscountAmount] = useState<number>(0);
 const [notes, setNotes] = useState<string>('');
 const [lines, setLines] = useState<EditableLine[]>([]);
 const [isLoading, setIsLoading] = useState(false);
 const [isSaving, setIsSaving] = useState(false);

 // New item selector
 const [selectedProductToAdd, setSelectedProductToAdd] = useState<string>('');

 useEffect(() => {
 if (!invoice || !isOpen) return;

 let isMounted = true;
 const loadItems = async () => {
 setIsLoading(true);
 try {
 const list = await db.sales_invoice_items.where('invoice_id').equals(invoice.id).toArray();
 if (!isMounted) return;

 setCustomerId(invoice.customer_id ||'');
 setPaymentType(invoice.payment_type ||'cash');
 setDiscountAmount(invoice.discount_amount || 0);
 setNotes(invoice.notes ||'');

 setLines(
 list.map((it) => ({
 id: it.id,
 productId: it.product_id,
 batchId: it.batch_id,
 unitId: it.unit_id,
 conversionFactor: it.conversion_factor || 1,
 quantity: it.quantity,
 unitPrice: it.unit_price,
 unitCost: it.unit_cost,
 discountAmount: it.discount_amount || 0,
 taxRate: it.tax_rate || 0,
 }))
 );
 } catch (err) {
 console.error(err);
 } finally {
 if (isMounted) setIsLoading(false);
 }
 };

 loadItems();
 return () => {
 isMounted = false;
 };
 }, [invoice, isOpen]);

 const getProductName = (id: string) => products.find((p) => p.id === id)?.name ||'صنف';
 const getUnitName = (id: string) => units.find((u) => u.id === id)?.name ||'وحدة';

 const handleAddProduct = (pId: string) => {
 if (!pId) return;
 const prod = products.find((p) => p.id === pId);
 if (!prod) return;

 const newLine: EditableLine = {
 id:`new_${Date.now()}`,
 productId: prod.id,
 unitId: prod.base_unit_id,
 conversionFactor: 1,
 quantity: 1,
 unitPrice: prod.sale_price || 0,
 unitCost: prod.cost_price || 0,
 discountAmount: 0,
 taxRate: prod.tax_rate || 0,
 };

 setLines([...lines, newLine]);
 setSelectedProductToAdd('');
 };

 const handleUpdateLine = (index: number, field: keyof EditableLine, value: any) => {
 const next = [...lines];
 next[index] = { ...next[index], [field]: value };
 setLines(next);
 };

 const handleRemoveLine = (index: number) => {
 setLines(lines.filter((_, i) => i !== index));
 };

 // Calculations
 const calculatedSubtotal = useMemo(() => {
 return lines.reduce((sum, l) => sum + (l.quantity * l.unitPrice), 0);
 }, [lines]);

 const calculatedItemsDiscount = useMemo(() => {
 return lines.reduce((sum, l) => sum + (l.discountAmount || 0), 0);
 }, [lines]);

 const calculatedTax = useMemo(() => {
 return lines.reduce((sum, l) => {
 const taxable = (l.quantity * l.unitPrice) - (l.discountAmount || 0);
 return sum + (taxable * (l.taxRate || 0)) / 100;
 }, 0);
 }, [lines]);

 const calculatedTotal = Math.max(0, calculatedSubtotal - calculatedItemsDiscount - discountAmount + calculatedTax);

 const handleSubmit = async (e: React.FormEvent) => {
 e.preventDefault();
 if (!invoice || !currentUser) return;
 if (lines.length === 0) {
 toast.error('لا يمكن حفظ الفاتورة بدون أي أصناف!');
 return;
 }

 try {
 setIsSaving(true);
 await SalesRepository.updateSalesInvoice({
 invoiceId: invoice.id,
 userId: currentUser.id,
 customerId: customerId || null,
 items: lines.map((l) => ({
 productId: l.productId,
 batchId: l.batchId,
 unitId: l.unitId,
 conversionFactor: l.conversionFactor,
 quantity: Number(l.quantity) || 1,
 unitPrice: Number(l.unitPrice) || 0,
 unitCost: Number(l.unitCost) || 0,
 discountAmount: Number(l.discountAmount) || 0,
 taxRate: Number(l.taxRate) || 0,
 })),
 discountAmount: Number(discountAmount) || 0,
 paymentType,
 notes: notes.trim() || undefined,
 });

 toast.success(`تم حفظ تعديل الفاتورة #${invoice.invoice_number} بنجاح وتسوية المخزون`);
 onUpdated();
 onClose();
 } catch (err: any) {
 console.error(err);
 toast.error(err?.message ||'حدث خطأ أثناء تعديل الفاتورة');
 } finally {
 setIsSaving(false);
 }
 };

 if (!invoice) return null;

 return (
 <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
 <DialogContent
 className="max-w-3xl max-h-[92vh] overflow-y-auto p-6 rounded-2xl border-slate-200 dark:border-slate-800 bg-surface shadow-2xl text-right"
 dir="rtl"
 >
 <DialogHeader className="pb-3 border-b border-slate-100 dark:border-slate-800 space-y-1">
 <div className="flex items-center gap-3">
 <div className="w-10 h-10 rounded-xl bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 flex items-center justify-center shrink-0">
 <Edit3 className="w-5 h-5"/>
 </div>
 <div>
 <DialogTitle className="text-base font-black text-slate-900 dark:text-white flex items-center gap-2">
 <span>تعديل فاتورة مبيعات</span>
 <span className="font-mono text-pink-600 dark:text-pink-400">#{invoice.invoice_number}</span>
 </DialogTitle>
 <DialogDescription className="text-xs font-semibold text-slate-400">
 يمكنك تعديل الكميات والأسعار والخصم، وسيتم تسوية فرق المخزون والخزينة تلقائياً
 </DialogDescription>
 </div>
 </div>
 </DialogHeader>

 {isLoading ? (
 <div className="py-16 text-center text-xs font-bold text-slate-400">
 جاري تحميل بيانات الفاتورة...
 </div>
 ) : (
 <form onSubmit={handleSubmit} className="space-y-4 pt-1 text-xs">
 
 {/* Top row: Customer & Payment Type */}
 <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
 {/* Customer */}
 <div className="space-y-1">
 <Label className="text-xs font-bold text-slate-700 dark:text-slate-300">
 العميل
 </Label>
 <Select value={customerId ||'cash'} onValueChange={(val) => setCustomerId(val ==='cash'?'': val)}>
 <SelectTrigger className="h-10 rounded-xl text-xs font-bold bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-slate-800">
 <SelectValue placeholder="عميل نقدي"/>
 </SelectTrigger>
 <SelectContent className="rounded-xl border-slate-200 dark:border-slate-800">
 <SelectItem value="cash">عميل نقدي (افتراضي)</SelectItem>
 {customers.map((c) => (
 <SelectItem key={c.id} value={c.id}>
 {c.name} {c.phone ?`(${c.phone})`:''}
 </SelectItem>
 ))}
 </SelectContent>
 </Select>
 </div>

 {/* Payment Type */}
 <div className="space-y-1">
 <Label className="text-xs font-bold text-slate-700 dark:text-slate-300">
 طريقة الدفع
 </Label>
 <Select value={paymentType} onValueChange={(val) => setPaymentType(val as InvoicePaymentType)}>
 <SelectTrigger className="h-10 rounded-xl text-xs font-bold bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-slate-800">
 <SelectValue />
 </SelectTrigger>
 <SelectContent className="rounded-xl border-slate-200 dark:border-slate-800">
 <SelectItem value="cash">نقدي (Cash)</SelectItem>
 <SelectItem value="card">بطاقة / فيزا (Card)</SelectItem>
 <SelectItem value="credit">آجل (Credit)</SelectItem>
 <SelectItem value="split">سداد مشترك (Split)</SelectItem>
 </SelectContent>
 </Select>
 </div>
 </div>

 {/* Add Item Bar */}
 <div className="flex items-center gap-2 pt-1">
 <div className="flex-1">
 <Select value={selectedProductToAdd} onValueChange={handleAddProduct}>
 <SelectTrigger className="h-9 rounded-xl text-xs font-bold bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-slate-800">
 <SelectValue placeholder="+ إضافة صنف جديد للفاتورة..."/>
 </SelectTrigger>
 <SelectContent className="rounded-xl border-slate-200 dark:border-slate-800 max-h-56">
 {products.map((p) => (
 <SelectItem key={p.id} value={p.id}>
 {p.name} ({formatNumber(p.sale_price)} ج.م)
 </SelectItem>
 ))}
 </SelectContent>
 </Select>
 </div>
 </div>

 {/* Editable Items Table */}
 <div className="border border-slate-200/90 dark:border-slate-800 rounded-2xl overflow-hidden">
 <table className="w-full text-right text-xs">
 <thead className="bg-slate-50/70 dark:bg-slate-900/50 border-b border-slate-200 dark:border-slate-800 text-2xs font-bold text-slate-500">
 <tr>
 <th className="py-2.5 px-3">الصنف</th>
 <th className="py-2.5 px-3 text-center w-24">الكمية</th>
 <th className="py-2.5 px-3 text-center w-28">السعر (ج.م)</th>
 <th className="py-2.5 px-3 text-center w-24">الخصم</th>
 <th className="py-2.5 px-3 text-left w-28">الإجمالي</th>
 <th className="py-2.5 px-2 text-center w-10">حذف</th>
 </tr>
 </thead>
 <tbody className="divide-y divide-slate-100 dark:divide-slate-800/80 font-bold">
 {lines.map((line, idx) => {
 const lineTotal = (line.quantity * line.unitPrice) - line.discountAmount;
 return (
 <tr key={line.id} className="hover:bg-slate-50/70 dark:hover:bg-slate-800/40">
 <td className="py-2 px-3 font-semibold text-slate-900 dark:text-white">
 {getProductName(line.productId)}
 </td>
 <td className="py-2 px-1 text-center">
 <input
 type="number"
 step="1"
 min="1"
 value={line.quantity}
 onChange={(e) => handleUpdateLine(idx,'quantity', Number(e.target.value) || 1)}
 className="w-20 h-8 px-2 rounded-lg border border-slate-200 dark:border-slate-800 bg-surface text-center font-mono font-bold text-xs"
 />
 </td>
 <td className="py-2 px-1 text-center">
 <input
 type="number"
 step="0.01"
 min="0"
 value={line.unitPrice}
 onChange={(e) => handleUpdateLine(idx,'unitPrice', Number(e.target.value) || 0)}
 className="w-24 h-8 px-2 rounded-lg border border-slate-200 dark:border-slate-800 bg-surface text-center font-mono font-bold text-xs"
 />
 </td>
 <td className="py-2 px-1 text-center">
 <input
 type="number"
 step="0.01"
 min="0"
 value={line.discountAmount}
 onChange={(e) => handleUpdateLine(idx,'discountAmount', Number(e.target.value) || 0)}
 className="w-20 h-8 px-2 rounded-lg border border-slate-200 dark:border-slate-800 bg-surface text-center font-mono font-bold text-xs text-rose-600"
 />
 </td>
 <td className="py-2 px-3 text-left font-mono font-black text-slate-900 dark:text-white">
 {formatNumber(lineTotal)} ج.م
 </td>
 <td className="py-2 px-2 text-center">
 <button
 type="button"
 onClick={() => handleRemoveLine(idx)}
 className="w-7 h-7 rounded-lg text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/60 inline-flex items-center justify-center transition-colors cursor-pointer"
 >
 <Trash2 className="w-3.5 h-3.5"/>
 </button>
 </td>
 </tr>
 );
 })}
 </tbody>
 </table>
 </div>

 {/* Bottom Row: Additional Discount, Notes, Total */}
 <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
 <div className="space-y-2">
 <div className="space-y-1">
 <Label className="text-xs font-bold text-slate-700 dark:text-slate-300">
 خصم إضافي على الفاتورة (ج.م)
 </Label>
 <Input
 type="number"
 step="0.01"
 min="0"
 value={discountAmount}
 onChange={(e) => setDiscountAmount(Number(e.target.value) || 0)}
 className="h-9 rounded-xl text-xs font-bold font-mono text-left bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-rose-600"
 dir="ltr"
 />
 </div>

 <div className="space-y-1">
 <Label className="text-xs font-bold text-slate-700 dark:text-slate-300">
 ملاحظات الفاتورة
 </Label>
 <Input
 value={notes}
 onChange={(e) => setNotes(e.target.value)}
 placeholder="أي ملاحظات إضافية..."
 className="h-9 rounded-xl text-xs font-semibold bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-slate-800"
 />
 </div>
 </div>

 {/* Total Calculation Card */}
 <div className="p-4 rounded-2xl bg-slate-50/80 dark:bg-slate-900/60 border border-slate-200/80 dark:border-slate-800 flex flex-col justify-between font-mono">
 <div className="space-y-1">
 <div className="flex justify-between text-slate-500 font-semibold">
 <span>المجموع:</span>
 <span>{formatNumber(calculatedSubtotal)} ج.م</span>
 </div>
 <div className="flex justify-between text-rose-600 font-semibold">
 <span>إجمالي الخصم:</span>
 <span>-{formatNumber(calculatedItemsDiscount + discountAmount)} ج.م</span>
 </div>
 </div>

 <div className="flex justify-between text-sm font-black text-slate-900 dark:text-white pt-2 border-t border-slate-200 dark:border-slate-800">
 <span>الصافي بعد التعديل:</span>
 <span className="text-pink-600 dark:text-pink-400 text-base">{formatNumber(calculatedTotal)} ج.م</span>
 </div>
 </div>
 </div>

 {/* Modal Footer Actions */}
 <div className="flex items-center justify-end gap-2 pt-2">
 <Button
 type="button"
 variant="outline"
 onClick={onClose}
 className="h-9 px-4 rounded-xl text-xs font-bold"
 >
 إلغاء
 </Button>

 <Button
 type="submit"
 disabled={isSaving}
 className="h-9 px-6 rounded-xl bg-pink-600 hover:bg-pink-700 text-white font-bold text-xs flex items-center gap-1.5 shadow-2xs cursor-pointer"
 >
 {isSaving ? <Loader2 className="w-4 h-4 animate-spin"/> : <Edit3 className="w-4 h-4"/>}
 <span>حفظ التعديلات وتسوية المخزن</span>
 </Button>
 </div>

 </form>
 )}
 </DialogContent>
 </Dialog>
 );
}