'use client';

import React, { useState, useEffect } from'react';
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
 RotateCcw,
 Loader2,
 AlertTriangle,
 Receipt,
 Package,
 CheckCircle2,
} from'lucide-react';
import { db } from'@/core/db/app_database';
import { SalesRepository } from'@/modules/sales/sales_repository';
import { formatNumber } from'@/lib/format';
import type {
 SalesInvoice,
 SalesInvoiceItem,
 Product,
 Unit,
 CashierShift,
 User as UserType,
 Treasury,
} from'@/types';
import { toast } from'sonner';

interface PosInvoiceReturnModalProps {
 invoice: SalesInvoice | null;
 isOpen: boolean;
 onClose: () => void;
 activeShift: CashierShift | null;
 currentUser: UserType | null;
 products: Product[];
 unitsById: Record<string, Unit>;
 treasuries: Treasury[];
 onReturnProcessed: () => void;
}

interface ReturnLine {
  itemId: string;
  productId: string;
  batchId?: string;
  unitId: string;
  conversionFactor: number;
  unitPrice: number;
  unitCost: number;
  originalQty: number;
  returnQty: number;
  productName: string;
  unitName: string;
}

export function PosInvoiceReturnModal({
 invoice,
 isOpen,
 onClose,
 activeShift,
 currentUser,
 products,
 unitsById,
 treasuries,
 onReturnProcessed,
}: PosInvoiceReturnModalProps) {
 const [reason, setReason] = useState<string>('');
 const [refundType, setRefundType] = useState<'cash'|'credit'>('cash');
 const [lines, setLines] = useState<ReturnLine[]>([]);
 const [isLoading, setIsLoading] = useState<boolean>(false);
 const [isSaving, setIsSaving] = useState<boolean>(false);

 useEffect(() => {
 if (!invoice || !isOpen) {
 setLines([]);
 setReason('');
 setRefundType('cash');
 return;
 }

 let isMounted = true;
    const loadItems = async () => {
      setIsLoading(true);
      try {
        const items = await db.sales_invoice_items
          .where('invoice_id')
          .equals(invoice.id)
          .toArray();

        // Calculate previously returned quantities for this original invoice
        const previousReturns = await db.sales_returns
          .where('original_invoice_id')
          .equals(invoice.id)
          .toArray();

        const prevReturnIds = previousReturns.map((r) => r.id);
        let prevReturnedItems: SalesInvoiceItem[] = [];
        if (prevReturnIds.length > 0) {
          prevReturnedItems = await db.sales_invoice_items
            .where('invoice_id')
            .anyOf(prevReturnIds)
            .toArray();
        }

        if (!isMounted) return;

        const pMap: Record<string, Product> = {};
        for (const p of products) pMap[p.id] = p;

        setLines(
          items.map((it) => {
            const prod = pMap[it.product_id];
            const unit = unitsById[it.unit_id]?.name || 'وحدة';

            // Calculate previously returned quantity for this line
            const prevQty = prevReturnedItems
              .filter((p) => p.product_id === it.product_id)
              .reduce((sum, p) => sum + (p.quantity || 0), 0);

            const remainingReturnableQty = Math.max(0, it.quantity - prevQty);
            // Calculate net unit price after discount
            const netUnitPrice = it.quantity > 0 ? it.total / it.quantity : it.unit_price;

            return {
              itemId: it.id,
              productId: it.product_id,
              batchId: it.batch_id,
              unitId: it.unit_id,
              conversionFactor: it.conversion_factor || 1,
              unitPrice: netUnitPrice,
              unitCost: it.unit_cost,
              originalQty: remainingReturnableQty,
              returnQty: remainingReturnableQty,
              productName: prod?.name || 'صنف',
              unitName: unit,
            };
          })
        );
      } catch (err) {
        console.error('Error loading invoice items for return:', err);
      } finally {
        if (isMounted) setIsLoading(false);
      }
    };

    loadItems();
    return () => {
      isMounted = false;
    };
  }, [invoice, isOpen, products, unitsById]);

  if (!invoice) return null;

  const totalReturnAmount = lines.reduce(
    (sum, l) => sum + (l.returnQty > 0 ? l.returnQty * l.unitPrice : 0),
    0
  );

  const activeReturnCount = lines.filter((l) => l.returnQty > 0).length;

  const handleUpdateQty = (idx: number, qty: number) => {
    const updated = [...lines];
    const max = updated[idx].originalQty;
    const cleanQty = Math.max(0, Math.min(max, qty));
    updated[idx].returnQty = cleanQty;
    setLines(updated);
  };

  const handleProcessReturn = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser) return;
    if (activeReturnCount === 0) {
      toast.error('يرجى تحديد كمية للإرجاع (أكبر من صفر) لصنف واحد على الأقل');
      return;
    }

    try {
      setIsSaving(true);
      const itemsToReturn = lines
        .filter((l) => l.returnQty > 0)
        .map((l) => ({
          productId: l.productId,
          batchId: l.batchId,
          unitId: l.unitId,
          conversionFactor: l.conversionFactor,
          quantity: l.returnQty,
          unitPrice: l.unitPrice,
          unitCost: l.unitCost,
        }));

 const targetTreasuryId =
 invoice.treasury_id ||
 activeShift?.treasury_id ||
 treasuries[0]?.id ||
'';

 await SalesRepository.createSalesReturn({
 orgId: invoice.org_id,
 branchId: invoice.branch_id,
 warehouseId: invoice.warehouse_id,
 originalInvoiceId: invoice.id,
 shiftId: activeShift?.id || invoice.shift_id || null,
 customerId: invoice.customer_id || null,
 items: itemsToReturn,
 treasuryId: targetTreasuryId,
 userId: currentUser.id,
 reason: reason.trim() ||`مرتجع من فاتورة #${invoice.invoice_number}`,
 refundType,
 });

 toast.success(
`تم إنشاء مرتجع للفاتورة #${invoice.invoice_number} بنجاح بقيمة ${formatNumber(totalReturnAmount)} ج.م وتسوية المخزون والخزينة`
 );

 onReturnProcessed();
 onClose();
 } catch (err: any) {
 console.error(err);
 toast.error(err?.message ||'حدث خطأ أثناء تنفيذ المرتجع');
 } finally {
 setIsSaving(false);
 }
 };

 return (
 <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
 <DialogContent
 className="max-w-2xl max-h-[92vh] overflow-y-auto p-6 rounded-2xl border-slate-200 dark:border-slate-800 bg-surface shadow-2xl text-right"
 dir="rtl"
 >
 <DialogHeader className="pb-3 border-b border-slate-100 dark:border-slate-800 space-y-1">
 <div className="flex items-center gap-3">
 <div className="w-10 h-10 rounded-xl bg-amber-50 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400 flex items-center justify-center shrink-0 border border-amber-200/50 dark:border-amber-900/50">
 <RotateCcw className="w-5 h-5"/>
 </div>
 <div>
 <DialogTitle className="text-base font-black text-slate-900 dark:text-white flex items-center gap-2">
 <span>إنشاء مرتجع مبيعات</span>
 <span className="font-mono text-amber-600 dark:text-amber-400">
 #{invoice.invoice_number}
 </span>
 </DialogTitle>
 <DialogDescription className="text-xs font-semibold text-slate-400">
 حدد الكميات المراد إرجاعها للمخزن واسترداد قيمتها للعميل
 </DialogDescription>
 </div>
 </div>
 </DialogHeader>

 {isLoading ? (
 <div className="py-16 text-center text-xs font-bold text-slate-400 flex flex-col items-center gap-2">
 <Loader2 className="w-6 h-6 animate-spin text-amber-500"/>
 <span>جاري تحميل أصناف الفاتورة...</span>
 </div>
 ) : (
 <form onSubmit={handleProcessReturn} className="space-y-4 pt-1 text-xs">
 {/* Items Table */}
 <div className="border border-slate-200/90 dark:border-slate-800 rounded-2xl overflow-hidden">
 <div className="px-4 py-2.5 bg-slate-50/70 dark:bg-slate-900/50 border-b border-slate-200/80 dark:border-slate-800 flex items-center justify-between">
 <span className="font-bold text-slate-700 dark:text-slate-300">
 أصناف الفاتورة ({lines.length})
 </span>
 <span className="text-2xs text-slate-400 font-semibold">
 يمكن تعديل كمية المرتجع لكل صنف
 </span>
 </div>

 <div className="overflow-x-auto">
 <table className="w-full text-right text-xs">
 <thead className="bg-slate-50/50 dark:bg-slate-900/30 border-b border-slate-200 dark:border-slate-800 text-2xs font-bold text-slate-500">
 <tr>
 <th className="py-2.5 px-3">الصنف</th>
 <th className="py-2.5 px-2 text-center">الوحدة</th>
 <th className="py-2.5 px-2 text-center">الكمية المباعة</th>
 <th className="py-2.5 px-2 text-center w-28">كمية المرتجع</th>
 <th className="py-2.5 px-3 text-center">سعر الوحدة</th>
 <th className="py-2.5 px-3 text-left">قيمة المرتجع</th>
 </tr>
 </thead>
 <tbody className="divide-y divide-slate-100 dark:divide-slate-800/80 font-semibold">
 {lines.map((line, idx) => {
 const lineReturnTotal = line.returnQty * line.unitPrice;
 const isReturning = line.returnQty > 0;

 return (
 <tr
 key={line.itemId}
 className={`transition-colors ${
 isReturning
 ?'bg-amber-50/30 dark:bg-amber-950/10'
 :'opacity-60'
 }`}
 >
 <td className="py-2.5 px-3 font-bold text-slate-900 dark:text-white">
 {line.productName}
 </td>
 <td className="py-2.5 px-2 text-center text-slate-500">
 {line.unitName}
 </td>
 <td className="py-2.5 px-2 text-center font-mono font-bold text-slate-700 dark:text-slate-300">
 {line.originalQty}
 </td>
 <td className="py-2.5 px-2 text-center">
 <div className="flex items-center justify-center gap-1">
 <Input
 type="number"
 step="any"
 min="0"
 max={line.originalQty}
 value={line.returnQty}
 onChange={(e) =>
 handleUpdateQty(idx, parseFloat(e.target.value) || 0)
 }
 className="w-20 h-8 text-center font-mono font-black text-xs rounded-lg border-slate-200 dark:border-slate-800 bg-surface text-amber-600 focus-visible:ring-amber-500"
 />
 </div>
 </td>
 <td className="py-2.5 px-3 text-center font-mono text-slate-600 dark:text-slate-300">
 {formatNumber(line.unitPrice)} ج.م
 </td>
 <td className="py-2.5 px-3 text-left font-mono font-black text-amber-600 dark:text-amber-400">
 {formatNumber(lineReturnTotal)} ج.م
 </td>
 </tr>
 );
 })}
 </tbody>
 </table>
 </div>
 </div>

 {/* Customer Credit vs Cash Refund Toggle */}
 {invoice.customer_id && (
 <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
 <div>
 <span className="text-xs font-black text-slate-800 dark:text-slate-200 block">
 طريقة الرد للعميل
 </span>
 <span className="text-2xs text-slate-500">
 رد المبلغ نقداً من الخزينة أو إضافته كرصيد دائن لحساب العميل
 </span>
 </div>
 <div className="flex items-center gap-2">
 <Button
 type="button"
 size="sm"
 variant={refundType ==='cash'?'default':'outline'}
 onClick={() => setRefundType('cash')}
 className={`text-xs h-8 ${refundType ==='cash'?'bg-amber-600 hover:bg-amber-700 text-white':''}`}
 >
 استرداد نقدي
 </Button>
 <Button
 type="button"
 size="sm"
 variant={refundType ==='credit'?'default':'outline'}
 onClick={() => setRefundType('credit')}
 className={`text-xs h-8 ${refundType ==='credit'?'bg-emerald-600 hover:bg-emerald-700 text-white':''}`}
 >
 رصيد دائن للعميل
 </Button>
 </div>
 </div>
 )}

 {/* Reason & Return Summary */}
 <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
 <div className="space-y-1">
 <Label className="text-xs font-bold text-slate-700 dark:text-slate-300">
 سبب الإرجاع (اختياري)
 </Label>
 <Input
 value={reason}
 onChange={(e) => setReason(e.target.value)}
 placeholder="مثال: عيب صناعة، صنف تالف، إلغاء جزء من الطلب..."
 className="h-10 rounded-xl text-xs font-semibold bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-slate-800"
 />
 </div>

 {/* Total Card */}
 <div className="p-3.5 rounded-xl bg-amber-50/70 dark:bg-amber-950/30 border border-amber-200/80 dark:border-amber-900/60 flex items-center justify-between">
 <div>
 <span className="text-xs font-bold text-amber-800 dark:text-amber-300 block">
 إجمالي المبلغ المسترد:
 </span>
 <span className="text-2xs font-semibold text-slate-500 dark:text-slate-400">
 ({activeReturnCount} أصناف محددة للإرجاع)
 </span>
 </div>
 <span className="text-base sm:text-lg font-black font-mono text-amber-600 dark:text-amber-400">
 {formatNumber(totalReturnAmount)} ج.م
 </span>
 </div>
 </div>

 {/* Modal Actions */}
 <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
 <Button
 type="button"
 variant="outline"
 onClick={onClose}
 className="h-9 px-4 rounded-xl text-xs font-bold cursor-pointer"
 >
 إلغاء
 </Button>

 <Button
 type="submit"
 disabled={isSaving || activeReturnCount === 0}
 className="h-9 px-6 rounded-xl bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs flex items-center gap-1.5 shadow-2xs cursor-pointer disabled:opacity-50"
 >
 {isSaving ? (
 <Loader2 className="w-4 h-4 animate-spin"/>
 ) : (
 <RotateCcw className="w-4 h-4"/>
 )}
 <span>تأكيد المرتجع واسترداد النقدية</span>
 </Button>
 </div>
 </form>
 )}
 </DialogContent>
 </Dialog>
 );
}