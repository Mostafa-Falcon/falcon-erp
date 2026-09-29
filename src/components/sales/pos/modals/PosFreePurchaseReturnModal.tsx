'use client';

import React, { useState, useMemo } from'react';
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
 Truck,
 RotateCcw,
 Trash2,
 Plus,
 Loader2,
 Search,
 Building2,
 Coins,
 CreditCard,
 Layers,
} from'lucide-react';
import { PurchasesRepository } from'@/modules/purchases/purchases_repository';
import { formatNumber } from'@/lib/format';
import type {
 Product,
 Unit,
 Contact,
 Treasury,
 Warehouse,
 CashierShift,
 User as UserType,
} from'@/types';
import { toast } from'sonner';

interface PosFreePurchaseReturnModalProps {
 isOpen: boolean;
 onClose: () => void;
 activeShift: CashierShift | null;
 currentUser: UserType | null;
 products: Product[];
 unitsById: Record<string, Unit>;
 unitOptions: Record<string, { unitId: string; factor: number; price?: number }[]>;
 contacts: Contact[];
 warehouses: Warehouse[];
 treasuries: Treasury[];
 warehouseId: string;
 treasuryId: string;
 onReturnProcessed: () => void;
}

interface FreePurchaseReturnLine {
 id: string;
 productId: string;
 unitId: string;
 conversionFactor: number;
 quantity: number;
 unitCost: number;
}

export function PosFreePurchaseReturnModal({
 isOpen,
 onClose,
 activeShift,
 currentUser,
 products,
 unitsById,
 unitOptions,
 contacts,
 warehouses,
 treasuries,
 warehouseId: initialWarehouseId,
 treasuryId: initialTreasuryId,
 onReturnProcessed,
}: PosFreePurchaseReturnModalProps) {
 const [selectedSupplierId, setSelectedSupplierId] = useState<string>('');
 const [targetWarehouseId, setTargetWarehouseId] = useState<string>(
 initialWarehouseId || warehouses[0]?.id ||''
 );
 const [refundType, setRefundType] = useState<'treasury'|'credit'>('treasury');
 const [targetTreasuryId, setTargetTreasuryId] = useState<string>(
 initialTreasuryId || activeShift?.treasury_id || treasuries[0]?.id ||''
 );
 const [reason, setReason] = useState<string>('');
 const [lines, setLines] = useState<FreePurchaseReturnLine[]>([]);
 const [selectedProductToAdd, setSelectedProductToAdd] = useState<string>('');
 const [isSaving, setIsSaving] = useState<boolean>(false);

 // Filter contacts to suppliers or both
 const suppliers = useMemo(() => {
 return contacts.filter((c) => c.type ==='supplier'|| c.type ==='both');
 }, [contacts]);

 const getProductName = (id: string) => products.find((p) => p.id === id)?.name ||'صنف';
 const getProductSku = (id: string) => products.find((p) => p.id === id)?.sku ||'—';

 // Available product unit options
 const currentUnits = useMemo(() => {
 if (!selectedProductToAdd) return [];
 return unitOptions[selectedProductToAdd] || [];
 }, [selectedProductToAdd, unitOptions]);

 // Form states for item addition
 const [itemUnitId, setItemUnitId] = useState<string>('');
 const [itemQty, setItemQty] = useState<number>(1);
 const [itemCost, setItemCost] = useState<number>(0);

 // When product changes, reset item unit & purchase cost
 const handleProductSelect = (pId: string) => {
 setSelectedProductToAdd(pId);
 const prod = products.find((p) => p.id === pId);
 const opts = unitOptions[pId] || [];
 const baseOpt = opts[0];
 const unitId = baseOpt?.unitId || prod?.base_unit_id ||'';
 const factor = baseOpt?.factor || 1;
 const cost = (prod?.purchase_price || 0) * factor;

 setItemUnitId(unitId);
 setItemQty(1);
 setItemCost(cost);
 };

 // When unit changes, adjust cost based on factor
 const handleUnitSelect = (newUnitId: string) => {
 setItemUnitId(newUnitId);
 const prod = products.find((p) => p.id === selectedProductToAdd);
 const opt = currentUnits.find((u) => u.unitId === newUnitId);
 const factor = opt?.factor || 1;
 setItemCost((prod?.purchase_price || 0) * factor);
 };

 // Add line to return table
 const handleAddLine = () => {
 if (!selectedProductToAdd) {
 toast.warning('يرجى اختيار الصنف أولاً');
 return;
 }
 if (itemQty <= 0) {
 toast.warning('يرجى إدخال كمية صحيحة أكبر من الصفر');
 return;
 }

 const opt = currentUnits.find((u) => u.unitId === itemUnitId);
 const factor = opt?.factor || 1;

 const newLine: FreePurchaseReturnLine = {
 id:`line_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`,
 productId: selectedProductToAdd,
 unitId: itemUnitId,
 conversionFactor: factor,
 quantity: itemQty,
 unitCost: itemCost,
 };

 setLines((prev) => [...prev, newLine]);
 setSelectedProductToAdd('');
 setItemUnitId('');
 setItemQty(1);
 setItemCost(0);
 };

 const handleRemoveLine = (id: string) => {
 setLines((prev) => prev.filter((l) => l.id !== id));
 };

 const handleUpdateLineQty = (id: string, newQty: number) => {
 if (newQty <= 0) return;
 setLines((prev) =>
 prev.map((l) => (l.id === id ? { ...l, quantity: Number(newQty.toFixed(3)) } : l))
 );
 };

 const handleUpdateLineCost = (id: string, newCost: number) => {
 if (newCost < 0) return;
 setLines((prev) =>
 prev.map((l) => (l.id === id ? { ...l, unitCost: Number(newCost.toFixed(2)) } : l))
 );
 };

 const totalReturnAmount = useMemo(() => {
 return lines.reduce((sum, l) => sum + l.quantity * l.unitCost, 0);
 }, [lines]);

 // Submit Free Purchase Return
 const handleSubmitReturn = async () => {
 if (!currentUser?.org_id) return;
 if (!selectedSupplierId) {
 toast.error('يرجى اختيار المورد أولاً');
 return;
 }
 if (!targetWarehouseId) {
 toast.error('يرجى تحديد المخزن الذي ستخرج منه الأصناف المرتجعة');
 return;
 }
 if (refundType ==='treasury'&& !targetTreasuryId) {
 toast.error('يرجى تحديد الخزينة المستلمة للمبلغ المسترد');
 return;
 }
 if (lines.length === 0) {
 toast.error('يرجى إضافة صنف واحد على الأقل للمرتجع');
 return;
 }

 setIsSaving(true);
 try {
 const returnItems = lines.map((l) => ({
 productId: l.productId,
 unitId: l.unitId,
 conversionFactor: l.conversionFactor,
 quantity: l.quantity,
 unitCost: l.unitCost,
 }));

 await PurchasesRepository.createPurchaseReturn({
 orgId: currentUser.org_id,
 branchId: currentUser.branch_id || warehouses.find((w) => w.id === targetWarehouseId)?.branch_id ||'',
 warehouseId: targetWarehouseId,
 supplierId: selectedSupplierId,
 items: returnItems,
 refundType,
 treasuryId: refundType ==='treasury'? targetTreasuryId : null,
 userId: currentUser.id,
 reason: reason.trim() ||'مرتجع مشتريات حر مباشر',
 });

 toast.success('تم تسجيل وحفظ مرتجع المشتريات وتحديث المخزون بنجاح!');
 onReturnProcessed();
 onClose();
 } catch (err: any) {
 console.error('Error processing free purchase return:', err);
 toast.error(err.message ||'حدث خطأ أثناء معالجة مرتجع المشتريات.');
 } finally {
 setIsSaving(false);
 }
 };

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
 <Truck className="w-5 h-5"/>
 </div>
 <div>
 <DialogTitle className="text-base font-black text-slate-900 dark:text-white">
 مرتجع مشتريات حر (بدون فاتورة أصلية)
 </DialogTitle>
 <DialogDescription className="text-xs font-semibold text-slate-400">
 تسجيل إرجاع بضاعة لمورد مع خصم الكميات من المخزون واسترداد القيمة نقداً أو قيداً على الحساب
 </DialogDescription>
 </div>
 </div>
 </DialogHeader>

 {/* Scrollable Content */}
 <div className="flex-1 overflow-y-auto space-y-4 py-3 pr-1 text-xs">
 {/* Top Options Bar: Supplier, Warehouse, Refund Type, Treasury */}
 <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 bg-slate-50 dark:bg-slate-900/50 p-3.5 rounded-2xl border border-slate-200/80 dark:border-slate-800">
 {/* Supplier Selector */}
 <div className="space-y-1">
 <Label className="text-2xs font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1">
 <Truck className="w-3.5 h-3.5 text-orange-500"/>
 <span>المورد / الشركة:</span>
 <span className="text-rose-500">*</span>
 </Label>
 <Select value={selectedSupplierId} onValueChange={setSelectedSupplierId}>
 <SelectTrigger className="h-9 rounded-xl bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-xs font-bold">
 <SelectValue placeholder="اختر المورد..."/>
 </SelectTrigger>
 <SelectContent className="z-50 bg-surface border border-slate-200 dark:border-slate-800 rounded-xl max-h-56">
 {suppliers.map((s) => (
 <SelectItem key={s.id} value={s.id} className="text-xs font-bold cursor-pointer py-1.5">
 {s.name} {s.type ==='both'?'(عميل/مورد)':''}
 </SelectItem>
 ))}
 </SelectContent>
 </Select>
 </div>

 {/* Warehouse Selector */}
 <div className="space-y-1">
 <Label className="text-2xs font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1">
 <Building2 className="w-3.5 h-3.5 text-blue-500"/>
 <span>المخزن المنصرف منه:</span>
 </Label>
 <Select value={targetWarehouseId} onValueChange={setTargetWarehouseId}>
 <SelectTrigger className="h-9 rounded-xl bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-xs font-bold">
 <SelectValue placeholder="اختر المخزن..."/>
 </SelectTrigger>
 <SelectContent className="z-50 bg-surface border border-slate-200 dark:border-slate-800 rounded-xl">
 {warehouses.map((w) => (
 <SelectItem key={w.id} value={w.id} className="text-xs font-bold cursor-pointer">
 {w.name}
 </SelectItem>
 ))}
 </SelectContent>
 </Select>
 </div>

 {/* Refund Type */}
 <div className="space-y-1">
 <Label className="text-2xs font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1">
 <Coins className="w-3.5 h-3.5 text-emerald-500"/>
 <span>طريقة رد القيمة:</span>
 </Label>
 <Select value={refundType} onValueChange={(val: any) => setRefundType(val)}>
 <SelectTrigger className="h-9 rounded-xl bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-xs font-bold">
 <SelectValue />
 </SelectTrigger>
 <SelectContent className="z-50 bg-surface border border-slate-200 dark:border-slate-800 rounded-xl">
 <SelectItem value="treasury"className="text-xs font-bold cursor-pointer">
 استرداد نقدي للخزينة
 </SelectItem>
 <SelectItem value="credit"className="text-xs font-bold cursor-pointer">
 خصم من حساب المورد (آجل)
 </SelectItem>
 </SelectContent>
 </Select>
 </div>

 {/* Treasury Selector (if treasury refund) */}
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
 <SelectTrigger className="h-9 rounded-xl bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-xs font-bold disabled:opacity-40">
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

 {/* Add Product Form Row */}
 <div className="p-3.5 rounded-2xl border border-slate-200/80 dark:border-slate-800 bg-surface space-y-3">
 <span className="text-2xs font-bold text-slate-500 dark:text-slate-400 block">
 إضافة صنف لقائمة المرتجع:
 </span>

 <div className="grid grid-cols-1 sm:grid-cols-12 gap-2.5 items-end">
 {/* Product selector */}
 <div className="sm:col-span-5 space-y-1">
 <Label className="text-3xs font-bold text-slate-500">الصنف:</Label>
 <Select value={selectedProductToAdd} onValueChange={handleProductSelect}>
 <SelectTrigger className="h-9 rounded-xl bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-xs font-bold">
 <SelectValue placeholder="ابحث أو اختر الصنف..."/>
 </SelectTrigger>
 <SelectContent className="z-50 bg-surface border border-slate-200 dark:border-slate-800 rounded-xl max-h-56">
 {products.map((p) => (
 <SelectItem key={p.id} value={p.id} className="text-xs font-bold cursor-pointer py-1.5">
 {p.name} ({p.sku})
 </SelectItem>
 ))}
 </SelectContent>
 </Select>
 </div>

 {/* Unit selector */}
 <div className="sm:col-span-2 space-y-1">
 <Label className="text-3xs font-bold text-slate-500">الوحدة:</Label>
 <Select
 value={itemUnitId}
 onValueChange={handleUnitSelect}
 disabled={!selectedProductToAdd || currentUnits.length === 0}
 >
 <SelectTrigger className="h-9 rounded-xl bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-xs font-bold">
 <SelectValue placeholder="الوحدة"/>
 </SelectTrigger>
 <SelectContent className="z-50 bg-surface border border-slate-200 dark:border-slate-800 rounded-xl">
 {currentUnits.map((u) => (
 <SelectItem key={u.unitId} value={u.unitId} className="text-xs font-bold cursor-pointer">
 {unitsById[u.unitId]?.name || u.unitId}
 </SelectItem>
 ))}
 </SelectContent>
 </Select>
 </div>

 {/* Quantity input */}
 <div className="sm:col-span-2 space-y-1">
 <Label className="text-3xs font-bold text-slate-500">الكمية:</Label>
 <Input
 type="number"
 min="0.001"
 step="any"
 value={itemQty ||''}
 onChange={(e) => setItemQty(parseFloat(e.target.value) || 0)}
 disabled={!selectedProductToAdd}
 className="h-9 rounded-xl bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-xs font-bold text-center"
 />
 </div>

 {/* Purchase cost input */}
 <div className="sm:col-span-2 space-y-1">
 <Label className="text-3xs font-bold text-slate-500">سعر الشراء:</Label>
 <Input
 type="number"
 min="0"
 step="0.01"
 value={itemCost ||''}
 onChange={(e) => setItemCost(parseFloat(e.target.value) || 0)}
 disabled={!selectedProductToAdd}
 className="h-9 rounded-xl bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-xs font-bold text-center font-mono"
 />
 </div>

 {/* Add button */}
 <div className="sm:col-span-1">
 <Button
 type="button"
 onClick={handleAddLine}
 disabled={!selectedProductToAdd || itemQty <= 0}
 className="w-full h-9 rounded-xl bg-orange-600 hover:bg-orange-700 text-white font-bold text-xs p-0 flex items-center justify-center cursor-pointer shadow-xs"
 >
 <Plus className="w-4 h-4"/>
 </Button>
 </div>
 </div>
 </div>

 {/* Lines Table */}
 <div className="rounded-2xl border border-slate-200/80 dark:border-slate-800 overflow-hidden bg-surface">
 <table className="w-full text-right text-xs">
 <thead className="bg-slate-50 dark:bg-slate-900/60 border-b border-slate-200/80 dark:border-slate-800 text-slate-500 font-bold">
 <tr>
 <th className="py-2.5 px-3 text-center w-10">#</th>
 <th className="py-2.5 px-3">الصنف</th>
 <th className="py-2.5 px-3 text-center">الوحدة</th>
 <th className="py-2.5 px-3 text-center w-28">الكمية المرتجعة</th>
 <th className="py-2.5 px-3 text-center w-28">سعر الشراء</th>
 <th className="py-2.5 px-3 text-center w-28">الإجمالي</th>
 <th className="py-2.5 px-3 text-center w-12"></th>
 </tr>
 </thead>
 <tbody className="divide-y divide-slate-100 dark:divide-slate-800/80 font-medium">
 {lines.length === 0 ? (
 <tr>
 <td colSpan={7} className="py-10 text-center text-slate-400 font-semibold">
 لم يتم إضافة أصناف إلى المرتجع بعد. استخدم النموذج أعلاه لإضافة الأصناف.
 </td>
 </tr>
 ) : (
 lines.map((line, idx) => {
 const lineTotal = line.quantity * line.unitCost;
 return (
 <tr key={line.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30">
 <td className="py-2.5 px-3 text-center text-slate-400 font-bold">{idx + 1}</td>
 <td className="py-2.5 px-3">
 <span className="font-black text-slate-900 dark:text-white block">
 {getProductName(line.productId)}
 </span>
 <span className="text-3xs text-slate-400 font-mono">
 كود: {getProductSku(line.productId)}
 </span>
 </td>
 <td className="py-2.5 px-3 text-center text-slate-600 dark:text-slate-300 font-bold">
 {unitsById[line.unitId]?.name || line.unitId}
 </td>
 <td className="py-2.5 px-3 text-center">
 <Input
 type="number"
 min="0.001"
 step="any"
 value={line.quantity}
 onChange={(e) => handleUpdateLineQty(line.id, parseFloat(e.target.value) || 0)}
 className="h-7 w-20 mx-auto text-center font-black rounded-lg bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-xs"
 />
 </td>
 <td className="py-2.5 px-3 text-center">
 <Input
 type="number"
 min="0"
 step="0.01"
 value={line.unitCost}
 onChange={(e) => handleUpdateLineCost(line.id, parseFloat(e.target.value) || 0)}
 className="h-7 w-20 mx-auto text-center font-mono font-bold rounded-lg bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-xs"
 />
 </td>
 <td className="py-2.5 px-3 text-center font-black font-mono text-orange-600 dark:text-orange-400">
 {formatNumber(lineTotal)} ج.م
 </td>
 <td className="py-2.5 px-3 text-center">
 <button
 type="button"
 onClick={() => handleRemoveLine(line.id)}
 className="w-6 h-6 rounded-lg bg-rose-50 dark:bg-rose-950/40 text-rose-600 hover:bg-rose-100 flex items-center justify-center transition-colors cursor-pointer"
 >
 <Trash2 className="w-3.5 h-3.5"/>
 </button>
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
 placeholder="اكتب سبب إرجاع البضاعة (مثال: بضاعة تالفة، انتهاء صلاحية، زيادة بالطلب...)"
 className="h-9 rounded-xl bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-xs"
 />
 </div>
 </div>

 {/* Footer Summary & Actions */}
 <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex flex-wrap items-center justify-between gap-3 shrink-0">
 <div className="flex items-center gap-6">
 <div className="flex items-baseline gap-2">
 <span className="text-xs font-bold text-slate-400">عدد الأصناف:</span>
 <span className="text-sm font-black font-mono text-slate-900 dark:text-white">
 {lines.length}
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
 disabled={isSaving || lines.length === 0 || !selectedSupplierId}
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