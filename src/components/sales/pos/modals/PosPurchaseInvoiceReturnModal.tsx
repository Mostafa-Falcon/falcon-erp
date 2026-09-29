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
import {
 Select,
 SelectContent,
 SelectItem,
 SelectTrigger,
 SelectValue,
} from'@/components/ui/select';
import {
 RotateCcw,
 Truck,
 Building2,
 Coins,
 Loader2,
 Trash2,
 Plus,
 Minus,
 CheckCircle2,
} from'lucide-react';
import { db } from'@/core/db/app_database';
import { PurchasesRepository } from'@/modules/purchases/purchases_repository';
import { formatNumber, formatDateTime } from'@/lib/format';
import type {
 PurchaseInvoice,
 PurchaseInvoiceItem,
 Product,
 Unit,
 Treasury,
 CashierShift,
 User as UserType,
} from'@/types';
import { toast } from'sonner';

interface PosPurchaseInvoiceReturnModalProps {
 invoice: PurchaseInvoice | null;
 isOpen: boolean;
 onClose: () => void;
 activeShift: CashierShift | null;
 currentUser: UserType | null;
 products: Product[];
 unitsById: Record<string, Unit>;
 treasuries: Treasury[];
 onReturnProcessed: () => void;
}

interface ReturnItemState {
 itemId: string;
 productId: string;
 unitId: string;
 conversionFactor: number;
 originalQty: number;
 maxReturnQty: number;
 returnQty: number;
 unitCost: number;
 productName: string;
 sku: string;
}

export function PosPurchaseInvoiceReturnModal({
 invoice,
 isOpen,
 onClose,
 activeShift,
 currentUser,
 products,
 unitsById,
 treasuries,
 onReturnProcessed,
}: PosPurchaseInvoiceReturnModalProps) {
 const [items, setItems] = useState<ReturnItemState[]>([]);
 const [refundType, setRefundType] = useState<'treasury'|'credit'>('treasury');
 const [targetTreasuryId, setTargetTreasuryId] = useState<string>('');
 const [reason, setReason] = useState<string>('');
 const [isLoading, setIsLoading] = useState(false);
 const [isSaving, setIsSaving] = useState(false);
 const [supplierName, setSupplierName] = useState('مورد محدد');

 // Load invoice items & prior returns on mount/open
 useEffect(() => {
 if (!isOpen || !invoice) {
 setItems([]);
 return;
 }

 setTargetTreasuryId(activeShift?.treasury_id || treasuries[0]?.id ||'');
 let isMounted = true;

 const loadInvoiceData = async () => {
 setIsLoading(true);
 try {
 const [rawItems, supplier] = await Promise.all([
 db.purchase_invoice_items.where('invoice_id').equals(invoice.id).toArray(),
 invoice.supplier_id ? db.contacts.get(invoice.supplier_id) : Promise.resolve(undefined),
 ]);

 if (supplier && isMounted) {
 setSupplierName(supplier.name);
 }

 // Map items
 const mapped: ReturnItemState[] = rawItems.map((item) => {
 const prod = products.find((p) => p.id === item.product_id);
 return {
 itemId: item.id,
 productId: item.product_id,
 unitId: item.unit_id,
 conversionFactor: item.conversion_factor || 1,
 originalQty: item.quantity,
 maxReturnQty: item.quantity,
 returnQty: item.quantity, // Default to full return, user can adjust
 unitCost: item.unit_cost,
 productName: prod?.name ||'صنف',
 sku: prod?.sku ||'—',
 };
 });

 if (isMounted) setItems(mapped);
 } catch (err) {
 console.error('Error loading purchase invoice items for return:', err);
 toast.error('حدث خطأ أثناء تحميل أصناف فاتورة المشتريات.');
 } finally {
 if (isMounted) setIsLoading(false);
 }
 };

 loadInvoiceData();
 return () => {
 isMounted = false;
 };
 }, [isOpen, invoice, activeShift, treasuries, products]);

 // Update return qty
 const handleUpdateQty = (itemId: string, qty: number) => {
 setItems((prev) =>
 prev.map((it) => {
 if (it.itemId === itemId) {
 const validQty = Math.max(0, Math.min(it.maxReturnQty, Number(qty.toFixed(3))));
 return { ...it, returnQty: validQty };
 }
 return it;
 })
 );
 };

 // Active items to return (qty > 0)
 const activeReturnItems = useMemo(() => {
 return items.filter((it) => it.returnQty > 0);
 }, [items]);

 const totalReturnAmount = useMemo(() => {
 return activeReturnItems.reduce((sum, it) => sum + it.returnQty * it.unitCost, 0);
 }, [activeReturnItems]);

 // Submit return
 const handleSubmitReturn = async () => {
 if (!invoice || !currentUser?.org_id) return;
 if (activeReturnItems.length === 0) {
 toast.warning('يرجى تحديد كمية للإرجاع لصنف واحد على الأقل');
 return;
 }
 if (refundType ==='treasury'&& !targetTreasuryId) {
 toast.error('يرجى اختيار الخزينة المستلمة للمبلغ المسترد');
 return;
 }

 setIsSaving(true);
 try {
 const returnPayloadItems = activeReturnItems.map((it) => ({
 productId: it.productId,
 unitId: it.unitId,
 conversionFactor: it.conversionFactor,
 quantity: it.returnQty,
 unitCost: it.unitCost,
 }));

 await PurchasesRepository.createPurchaseReturn({
 orgId: currentUser.org_id,
 branchId: invoice.branch_id || currentUser.branch_id ||'',
 warehouseId: invoice.warehouse_id,
 originalInvoiceId: invoice.id,
 supplierId: invoice.supplier_id,
 items: returnPayloadItems,
 refundType,
 treasuryId: refundType ==='treasury'? targetTreasuryId : null,
 userId: currentUser.id,
 reason: reason.trim() ||`مرتجع مشتريات من الفاتورة #${invoice.system_invoice_number || invoice.invoice_number}`,
 });

 toast.success('تم تنفيذ وحفظ مرتجع المشتريات وتحديث المخزون بنجاح!');
 onReturnProcessed();
 onClose();
 } catch (err: any) {
 console.error('Error submitting purchase invoice return:', err);
 toast.error(err.message ||'حدث خطأ أثناء معالجة مرتجع المشتريات.');
 } finally {
 setIsSaving(false);
 }
 };

 if (!invoice) return null;

 return (
 <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
 <DialogContent
 className="max-w-4xl max-h-[92vh] overflow-hidden flex flex-col p-6 rounded-3xl border-slate-200 dark:border-slate-800 bg-surface shadow-2xl text-right"
 dir="rtl"
 >
 {/* Header */}
 <DialogHeader className="pb-3 border-b border-slate-100 dark:border-slate-800 space-y-1 shrink-0">
 <div className="flex items-center gap-3">
 <div className="w-10 h-10 rounded-xl bg-orange-50 dark:bg-orange-950/60 text-orange-600 dark:text-orange-400 flex items-center justify-center shrink-0 border border-orange-200/50 dark:border-orange-900/50">
 <RotateCcw className="w-5 h-5"/>
 </div>
 <div>
 <DialogTitle className="text-base font-black text-slate-900 dark:text-white">
 مرتجع مشتريات من فاتورة #{invoice.system_invoice_number || invoice.invoice_number}
 </DialogTitle>
 <DialogDescription className="text-xs font-semibold text-slate-400">
 حدد كميات الأصناف المراد إرجاعها إلى المورد وسيتم تحديث المخزون وحساب المورد تلقائياً
 </DialogDescription>
 </div>
 </div>
 </DialogHeader>

 {/* Scrollable Content */}
 <div className="flex-1 overflow-y-auto space-y-4 py-3 pr-1 text-xs">
 {/* Invoice Summary Card */}
 <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-slate-50 dark:bg-slate-900/50 p-3.5 rounded-2xl border border-slate-200/80 dark:border-slate-800">
 <div>
 <span className="text-3xs font-bold text-slate-400 block">المورد:</span>
 <span className="text-xs font-black text-slate-800 dark:text-slate-200">
 {supplierName}
 </span>
 </div>
 <div>
 <span className="text-3xs font-bold text-slate-400 block">تاريخ الشراء:</span>
 <span className="text-xs font-semibold text-slate-700 dark:text-slate-300">
 {formatDateTime(invoice.created_at || invoice.invoice_date)}
 </span>
 </div>
 <div>
 <span className="text-3xs font-bold text-slate-400 block">إجمالي الفاتورة:</span>
 <span className="text-xs font-black font-mono text-emerald-600 dark:text-emerald-400">
 {formatNumber(invoice.total)} ج.م
 </span>
 </div>
 <div>
 <span className="text-3xs font-bold text-slate-400 block">المتبقي (الآجل):</span>
 <span className="text-xs font-black font-mono text-amber-600 dark:text-amber-400">
 {formatNumber(invoice.remaining_amount)} ج.م
 </span>
 </div>
 </div>

 {/* Refund Settings Bar */}
 <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 bg-surface p-3 rounded-2xl border border-slate-200/80 dark:border-slate-800">
 {/* Refund Type */}
 <div className="space-y-1">
 <Label className="text-2xs font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1">
 <Coins className="w-3.5 h-3.5 text-emerald-500"/>
 <span>طريقة رد القيمة:</span>
 </Label>
 <Select value={refundType} onValueChange={(val: any) => setRefundType(val)}>
 <SelectTrigger className="h-9 rounded-xl bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-xs font-bold">
 <SelectValue />
 </SelectTrigger>
 <SelectContent className="z-50 bg-surface border border-slate-200 dark:border-slate-800 rounded-xl">
 <SelectItem value="treasury"className="text-xs font-bold cursor-pointer">
 استرداد نقدي للخزينة
 </SelectItem>
 <SelectItem value="credit"className="text-xs font-bold cursor-pointer">
 خصم من المتبقي على الفاتورة / حساب المورد
 </SelectItem>
 </SelectContent>
 </Select>
 </div>

 {/* Treasury Selector */}
 <div className="space-y-1">
 <Label className="text-2xs font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1">
 <Coins className="w-3.5 h-3.5 text-amber-500"/>
 <span>الخزينة المستلمة:</span>
 </Label>
 <Select
 value={targetTreasuryId}
 onValueChange={setTargetTreasuryId}
 disabled={refundType !=='treasury'}
 >
 <SelectTrigger className="h-9 rounded-xl bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-xs font-bold disabled:opacity-40">
 <SelectValue placeholder="اختر الخزينة..."/>
 </SelectTrigger>
 <SelectContent className="z-50 bg-surface border border-slate-200 dark:border-slate-800 rounded-xl">
 {treasuries.map((t) => (
 <SelectItem key={t.id} value={t.id} className="text-xs font-bold cursor-pointer">
 {t.name} ({formatNumber(t.current_balance)} ج.م)
 </SelectItem>
 ))}
 </SelectContent>
 </Select>
 </div>
 </div>

 {/* Items Table */}
 <div className="rounded-2xl border border-slate-200/80 dark:border-slate-800 overflow-hidden bg-surface">
 <table className="w-full text-right text-xs">
 <thead className="bg-slate-50 dark:bg-slate-900/60 border-b border-slate-200/80 dark:border-slate-800 text-slate-500 font-bold">
 <tr>
 <th className="py-2.5 px-3 text-center w-10">#</th>
 <th className="py-2.5 px-3">الصنف</th>
 <th className="py-2.5 px-3 text-center">الوحدة</th>
 <th className="py-2.5 px-3 text-center w-24">الكمية بالفاتورة</th>
 <th className="py-2.5 px-3 text-center w-36">الكمية المرتجعة</th>
 <th className="py-2.5 px-3 text-center w-28">سعر الشراء</th>
 <th className="py-2.5 px-3 text-center w-28">إجمالي المرتجع</th>
 </tr>
 </thead>
 <tbody className="divide-y divide-slate-100 dark:divide-slate-800/80 font-medium">
 {isLoading ? (
 <tr>
 <td colSpan={7} className="py-12 text-center text-slate-400">
 <div className="flex flex-col items-center justify-center gap-2">
 <Loader2 className="w-6 h-6 animate-spin text-orange-500"/>
 <span>جاري تحميل أصناف الفاتورة...</span>
 </div>
 </td>
 </tr>
 ) : items.length === 0 ? (
 <tr>
 <td colSpan={7} className="py-10 text-center text-slate-400 font-semibold">
 لا توجد أصناف مسجلة في هذه الفاتورة
 </td>
 </tr>
 ) : (
 items.map((it, idx) => {
 const lineReturnTotal = it.returnQty * it.unitCost;
 const isFullyReturned = it.returnQty === it.maxReturnQty;

 return (
 <tr
 key={it.itemId}
 className={`hover:bg-slate-50/50 dark:hover:bg-slate-800/30 transition-colors ${
 it.returnQty > 0 ?'bg-orange-50/20 dark:bg-orange-950/10':''
 }`}
 >
 <td className="py-2.5 px-3 text-center text-slate-400 font-bold">{idx + 1}</td>
 <td className="py-2.5 px-3">
 <span className="font-black text-slate-900 dark:text-white block">
 {it.productName}
 </span>
 <span className="text-3xs text-slate-400 font-mono">
 كود: {it.sku}
 </span>
 </td>
 <td className="py-2.5 px-3 text-center text-slate-600 dark:text-slate-300 font-bold">
 {unitsById[it.unitId]?.name || it.unitId}
 </td>
 <td className="py-2.5 px-3 text-center font-bold font-mono text-slate-500">
 {it.originalQty}
 </td>
 <td className="py-2.5 px-3 text-center">
 <div className="flex items-center justify-center gap-1">
 <button
 type="button"
 onClick={() => handleUpdateQty(it.itemId, it.returnQty - 1)}
 className="w-6 h-6 rounded-lg bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 flex items-center justify-center transition-colors cursor-pointer"
 >
 <Minus className="w-3 h-3"/>
 </button>
 <Input
 type="number"
 min="0"
 max={it.maxReturnQty}
 step="any"
 value={it.returnQty}
 onChange={(e) =>
 handleUpdateQty(it.itemId, parseFloat(e.target.value) || 0)
 }
 className="h-7 w-16 text-center font-black rounded-lg bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-xs p-1"
 />
 <button
 type="button"
 onClick={() => handleUpdateQty(it.itemId, it.returnQty + 1)}
 className="w-6 h-6 rounded-lg bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 flex items-center justify-center transition-colors cursor-pointer"
 >
 <Plus className="w-3 h-3"/>
 </button>
 </div>
 <div className="text-3xs text-slate-400 mt-0.5">
 المتاح: {it.maxReturnQty}
 </div>
 </td>
 <td className="py-2.5 px-3 text-center font-mono font-bold text-slate-700 dark:text-slate-300">
 {formatNumber(it.unitCost)} ج.م
 </td>
 <td className="py-2.5 px-3 text-center font-black font-mono text-orange-600 dark:text-orange-400">
 {formatNumber(lineReturnTotal)} ج.م
 </td>
 </tr>
 );
 })
 )}
 </tbody>
 </table>
 </div>

 {/* Reason / Notes */}
 <div className="space-y-1">
 <Label className="text-2xs font-bold text-slate-600 dark:text-slate-400">
 سبب المرتجع / ملاحظات:
 </Label>
 <Input
 value={reason}
 onChange={(e) => setReason(e.target.value)}
 placeholder="اكتب سبب إرجاع الأصناف للمورد..."
 className="h-9 rounded-xl bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-xs"
 />
 </div>
 </div>

 {/* Footer Summary & Actions */}
 <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex flex-wrap items-center justify-between gap-3 shrink-0">
 <div className="flex items-center gap-6">
 <div className="flex items-baseline gap-2">
 <span className="text-xs font-bold text-slate-400">أصناف المرتجع:</span>
 <span className="text-sm font-black font-mono text-slate-900 dark:text-white">
 {activeReturnItems.length}
 </span>
 </div>
 <div className="flex items-baseline gap-2">
 <span className="text-xs font-bold text-slate-400">إجمالي قيمة المرتجع:</span>
 <span className="text-lg font-black font-mono text-orange-600 dark:text-orange-400">
 {formatNumber(totalReturnAmount)} ج.م
 </span>
 </div>
 </div>

 <div className="flex items-center gap-2">
 <Button
 type="button"
 variant="outline"
 onClick={onClose}
 className="h-9 px-4 rounded-xl text-xs font-bold cursor-pointer"
 >
 إلغاء
 </Button>
 <Button
 type="button"
 onClick={handleSubmitReturn}
 disabled={isSaving || activeReturnItems.length === 0}
 className="h-9 px-5 rounded-xl bg-orange-600 hover:bg-orange-700 text-white font-black text-xs flex items-center gap-1.5 shadow-md transition-all cursor-pointer disabled:opacity-50"
 >
 {isSaving ? (
 <>
 <Loader2 className="w-3.5 h-3.5 animate-spin"/>
 <span>جارٍ الحفظ...</span>
 </>
 ) : (
 <>
 <RotateCcw className="w-3.5 h-3.5"/>
 <span>تنفيذ وحفظ مرتجع المشتريات</span>
 </>
 )}
 </Button>
 </div>
 </div>
 </DialogContent>
 </Dialog>
 );
}