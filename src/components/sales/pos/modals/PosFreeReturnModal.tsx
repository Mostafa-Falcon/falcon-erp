'use client';

import React, { useState, useMemo } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  ShoppingBag,
  RotateCcw,
  Trash2,
  Plus,
  Loader2,
  Search,
  Building2,
  Coins,
  User,
} from 'lucide-react';
import { SalesRepository } from '@/modules/sales/sales_repository';
import { formatNumber } from '@/lib/format';
import type {
  Product,
  Unit,
  Contact,
  Treasury,
  Warehouse,
  CashierShift,
  User as UserType,
} from '@/types';
import { toast } from 'sonner';

interface PosFreeReturnModalProps {
  isOpen: boolean;
  onClose: () => void;
  activeShift: CashierShift | null;
  currentUser: UserType | null;
  products: Product[];
  unitsById: Record<string, Unit>;
  unitOptions: Record<string, { unitId: string; factor: number; price?: number }[]>;
  customers: Contact[];
  warehouses: Warehouse[];
  treasuries: Treasury[];
  warehouseId: string;
  treasuryId: string;
  onReturnProcessed: () => void;
}

interface FreeReturnLine {
  id: string;
  productId: string;
  unitId: string;
  conversionFactor: number;
  quantity: number;
  unitPrice: number;
  unitCost: number;
}

export function PosFreeReturnModal({
  isOpen,
  onClose,
  activeShift,
  currentUser,
  products,
  unitsById,
  unitOptions,
  customers,
  warehouses,
  treasuries,
  warehouseId: initialWarehouseId,
  treasuryId: initialTreasuryId,
  onReturnProcessed,
}: PosFreeReturnModalProps) {
  const [selectedCustomerId, setSelectedCustomerId] = useState<string>('');
  const [targetWarehouseId, setTargetWarehouseId] = useState<string>(
    initialWarehouseId || warehouses[0]?.id || ''
  );
  const [targetTreasuryId, setTargetTreasuryId] = useState<string>(
    initialTreasuryId || activeShift?.treasury_id || treasuries[0]?.id || ''
  );
  const [reason, setReason] = useState<string>('');
  const [refundType, setRefundType] = useState<'cash' | 'credit'>('cash');
  const [lines, setLines] = useState<FreeReturnLine[]>([]);
  const [selectedProductToAdd, setSelectedProductToAdd] = useState<string>('');
  const [isSaving, setIsSaving] = useState<boolean>(false);

  const getProductName = (id: string) => products.find((p) => p.id === id)?.name || 'صنف';
  const getProductSku = (id: string) => products.find((p) => p.id === id)?.sku || '—';

  const handleAddProduct = (pId: string) => {
    if (!pId) return;
    const prod = products.find((p) => p.id === pId);
    if (!prod) return;

    const opts = unitOptions[pId] || [];
    const baseOpt = opts.find((o) => o.factor === 1) || opts[0];

    const newLine: FreeReturnLine = {
      id: `free_${Date.now()}_${Math.random()}`,
      productId: prod.id,
      unitId: baseOpt?.unitId || prod.base_unit_id,
      conversionFactor: baseOpt?.factor || 1,
      quantity: 1,
      unitPrice: baseOpt?.price ?? prod.sale_price ?? 0,
      unitCost: prod.cost_price || 0,
    };

    setLines([...lines, newLine]);
    setSelectedProductToAdd('');
  };

  const handleUpdateLine = (index: number, field: keyof FreeReturnLine, value: any) => {
    const updated = [...lines];
    updated[index] = { ...updated[index], [field]: value };

    // If unit changed, recalculate factor & default price
    if (field === 'unitId') {
      const pId = updated[index].productId;
      const opts = unitOptions[pId] || [];
      const match = opts.find((o) => o.unitId === value);
      if (match) {
        updated[index].conversionFactor = match.factor || 1;
        if (match.price !== undefined) {
          updated[index].unitPrice = match.price;
        }
      }
    }

    setLines(updated);
  };

  const handleRemoveLine = (index: number) => {
    setLines(lines.filter((_, i) => i !== index));
  };

  const totalReturnAmount = useMemo(() => {
    return lines.reduce((sum, l) => sum + (l.quantity * l.unitPrice), 0);
  }, [lines]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser) return;
    if (lines.length === 0) {
      toast.error('يرجى إضافة صنف واحد على الأقل للمرتجع');
      return;
    }
    if (!targetWarehouseId || !targetTreasuryId) {
      toast.error('يرجى اختيار المخزن والخزينة لإتمام الإرجاع');
      return;
    }

    try {
      setIsSaving(true);
      const items = lines.map((l) => ({
        productId: l.productId,
        unitId: l.unitId,
        conversionFactor: l.conversionFactor,
        quantity: Number(l.quantity) || 1,
        unitPrice: Number(l.unitPrice) || 0,
        unitCost: Number(l.unitCost) || 0,
      }));

      await SalesRepository.createSalesReturn({
        orgId: currentUser.org_id || '',
        branchId: currentUser.branch_id || '',
        warehouseId: targetWarehouseId,
        originalInvoiceId: null, // Free return without prior invoice
        shiftId: activeShift?.id || null,
        customerId: selectedCustomerId && selectedCustomerId !== 'cash' ? selectedCustomerId : null,
        items,
        treasuryId: targetTreasuryId,
        userId: currentUser.id,
        reason: reason.trim() || 'مرتجع مبيعات حر (بدون فاتورة أصلية)',
        refundType,
      });

      toast.success(
        `تم تسجيل المرتجع الحر بنجاح بقيمة ${formatNumber(totalReturnAmount)} ج.م واسترجاع الأصناف للمخزن`
      );

      onReturnProcessed();
      onClose();
    } catch (err: any) {
      console.error(err);
      toast.error(err?.message || 'حدث خطأ أثناء تسجيل المرتجع الحر');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent
        className="max-w-3xl max-h-[92vh] overflow-y-auto p-6 rounded-3xl border-slate-200 dark:border-slate-800 bg-white dark:bg-[#111827] shadow-2xl text-right"
        dir="rtl"
      >
        <DialogHeader className="pb-3 border-b border-slate-100 dark:border-slate-800 space-y-1">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 flex items-center justify-center shrink-0 border border-blue-200/50 dark:border-blue-900/50">
              <ShoppingBag className="w-5 h-5" />
            </div>
            <div>
              <DialogTitle className="text-base font-black text-slate-900 dark:text-white">
                مرتجع مبيعات حر (بدون فاتورة أصلية)
              </DialogTitle>
              <DialogDescription className="text-xs font-semibold text-slate-400">
                تسجيل إرجاع أصناف مباشرة إلى المخزن واسترداد النقدية من الخزينة وتحديث حسابات الوردية
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 pt-1 text-xs">
          {/* Top Parameters: Customer, Warehouse, Treasury */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {/* Customer */}
            <div className="space-y-1">
              <Label className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1">
                <User className="w-3.5 h-3.5 text-blue-500" />
                <span>العميل</span>
              </Label>
              <Select
                value={selectedCustomerId || 'cash'}
                onValueChange={(val) => setSelectedCustomerId(val === 'cash' ? '' : val)}
              >
                <SelectTrigger className="h-10 rounded-xl text-xs font-bold bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-slate-800">
                  <SelectValue placeholder="عميل نقدي" />
                </SelectTrigger>
                <SelectContent className="rounded-xl border-slate-200 dark:border-slate-800 max-h-56">
                  <SelectItem value="cash">عميل نقدي (افتراضي)</SelectItem>
                  {customers.map((c) => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.name} {c.phone ? `(${c.phone})` : ''}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Warehouse */}
            <div className="space-y-1">
              <Label className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1">
                <Building2 className="w-3.5 h-3.5 text-emerald-500" />
                <span>مخزن الاستلام</span>
              </Label>
              <Select value={targetWarehouseId} onValueChange={setTargetWarehouseId}>
                <SelectTrigger className="h-10 rounded-xl text-xs font-bold bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-slate-800">
                  <SelectValue placeholder="اختر المخزن" />
                </SelectTrigger>
                <SelectContent className="rounded-xl border-slate-200 dark:border-slate-800">
                  {warehouses.map((w) => (
                    <SelectItem key={w.id} value={w.id}>
                      {w.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Treasury */}
            <div className="space-y-1">
              <Label className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1">
                <Coins className="w-3.5 h-3.5 text-purple-500" />
                <span>خزينة الاسترداد</span>
              </Label>
              <Select value={targetTreasuryId} onValueChange={setTargetTreasuryId}>
                <SelectTrigger className="h-10 rounded-xl text-xs font-bold bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-slate-800">
                  <SelectValue placeholder="اختر الخزينة" />
                </SelectTrigger>
                <SelectContent className="rounded-xl border-slate-200 dark:border-slate-800">
                  {treasuries.map((t) => (
                    <SelectItem key={t.id} value={t.id}>
                      {t.name} ({formatNumber(t.current_balance)} ج.م)
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Refund Method Toggle when a customer is chosen */}
          {selectedCustomerId && selectedCustomerId !== 'cash' && (
            <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div>
                <span className="text-xs font-black text-slate-800 dark:text-slate-200 block">
                  طريقة رد قيمة المرتجع
                </span>
                <span className="text-[11px] text-slate-500">
                  استرداد نقدي من الخزينة أو إضافة المبلغ كرصيد دائن لحساب العميل
                </span>
              </div>
              <div className="flex items-center gap-2">
                <Button
                  type="button"
                  size="sm"
                  variant={refundType === 'cash' ? 'default' : 'outline'}
                  onClick={() => setRefundType('cash')}
                  className={`text-xs h-8 ${refundType === 'cash' ? 'bg-amber-600 hover:bg-amber-700 text-white' : ''}`}
                >
                  استرداد نقدي
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant={refundType === 'credit' ? 'default' : 'outline'}
                  onClick={() => setRefundType('credit')}
                  className={`text-xs h-8 ${refundType === 'credit' ? 'bg-emerald-600 hover:bg-emerald-700 text-white' : ''}`}
                >
                  رصيد دائن للعميل
                </Button>
              </div>
            </div>
          )}

          {/* Add Item Row */}
          <div className="space-y-1 pt-1">
            <Label className="text-xs font-bold text-slate-700 dark:text-slate-300">
              إضافة صنف للمرتجع:
            </Label>
            <Select value={selectedProductToAdd} onValueChange={handleAddProduct}>
              <SelectTrigger className="h-10 rounded-xl text-xs font-bold bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-slate-800">
                <SelectValue placeholder="+ ابحث واختر الصنف لإضافته إلى قائمة المرتجع..." />
              </SelectTrigger>
              <SelectContent className="rounded-xl border-slate-200 dark:border-slate-800 max-h-60">
                {products.map((p) => (
                  <SelectItem key={p.id} value={p.id}>
                    {p.name} — سعر البيع: {formatNumber(p.sale_price)} ج.م
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Items Table */}
          <div className="border border-slate-200/90 dark:border-slate-800 rounded-2xl overflow-hidden">
            <table className="w-full text-right text-xs">
              <thead className="bg-slate-50/70 dark:bg-slate-900/50 border-b border-slate-200 dark:border-slate-800 text-[11px] font-bold text-slate-500">
                <tr>
                  <th className="py-2.5 px-3">الصنف</th>
                  <th className="py-2.5 px-2 text-center w-28">الوحدة</th>
                  <th className="py-2.5 px-2 text-center w-24">الكمية</th>
                  <th className="py-2.5 px-2 text-center w-28">السعر (ج.م)</th>
                  <th className="py-2.5 px-3 text-left w-28">الإجمالي</th>
                  <th className="py-2.5 px-2 text-center w-10">حذف</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800/80 font-semibold">
                {lines.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-10 text-center text-slate-400 font-bold">
                      لم يتم إضافة أصناف بعد. اختر صنفاً من القائمة أعلاه لإضافته.
                    </td>
                  </tr>
                ) : (
                  lines.map((line, idx) => {
                    const lineTotal = line.quantity * line.unitPrice;
                    const rawOpts = unitOptions[line.productId] || [];
                    const opts = Array.from(new Map(rawOpts.map((o) => [o.unitId, o])).values());

                    return (
                      <tr key={line.id} className="hover:bg-slate-50/60 dark:hover:bg-slate-800/40">
                        <td className="py-2.5 px-3">
                          <span className="font-bold text-slate-900 dark:text-white block">
                            {getProductName(line.productId)}
                          </span>
                          <span className="text-[10px] font-mono text-slate-400">
                            كود: {getProductSku(line.productId)}
                          </span>
                        </td>
                        <td className="py-2.5 px-2 text-center">
                          <select
                            value={line.unitId}
                            onChange={(e) => handleUpdateLine(idx, 'unitId', e.target.value)}
                            className="h-8 px-2 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-xs font-bold"
                          >
                            {opts.map((u) => (
                              <option key={u.unitId} value={u.unitId}>
                                {unitsById[u.unitId]?.name || 'وحدة'}{u.factor !== 1 ? ` (×${u.factor})` : ''}
                              </option>
                            ))}
                          </select>
                        </td>
                        <td className="py-2.5 px-2 text-center">
                          <Input
                            type="number"
                            step="any"
                            min="0.01"
                            value={line.quantity}
                            onChange={(e) =>
                              handleUpdateLine(idx, 'quantity', parseFloat(e.target.value) || 1)
                            }
                            className="w-20 h-8 text-center font-mono font-bold text-xs rounded-lg mx-auto"
                          />
                        </td>
                        <td className="py-2.5 px-2 text-center">
                          <Input
                            type="number"
                            step="any"
                            min="0"
                            value={line.unitPrice}
                            onChange={(e) =>
                              handleUpdateLine(idx, 'unitPrice', parseFloat(e.target.value) || 0)
                            }
                            className="w-24 h-8 text-center font-mono font-bold text-xs rounded-lg mx-auto"
                          />
                        </td>
                        <td className="py-2.5 px-3 text-left font-mono font-black text-blue-600 dark:text-blue-400">
                          {formatNumber(lineTotal)} ج.م
                        </td>
                        <td className="py-2.5 px-2 text-center">
                          <button
                            type="button"
                            onClick={() => handleRemoveLine(idx)}
                            className="w-7 h-7 rounded-lg text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/60 inline-flex items-center justify-center transition-colors cursor-pointer"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          {/* Reason & Total Card */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
            <div className="space-y-1">
              <Label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                سبب الإرجاع أو ملاحظات:
              </Label>
              <Input
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder="اكتب سبب الإرجاع..."
                className="h-10 rounded-xl text-xs font-semibold bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-slate-800"
              />
            </div>

            <div className="p-3.5 rounded-xl bg-blue-50/70 dark:bg-blue-950/30 border border-blue-200/80 dark:border-blue-900/60 flex items-center justify-between">
              <div>
                <span className="text-xs font-bold text-blue-800 dark:text-blue-300 block">
                  إجمالي قيمة المرتجع المسترد:
                </span>
                <span className="text-[11px] font-semibold text-slate-400">
                  ({lines.length} أصناف مضافة)
                </span>
              </div>
              <span className="text-base sm:text-lg font-black font-mono text-blue-600 dark:text-blue-400">
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
              disabled={isSaving || lines.length === 0}
              className="h-9 px-6 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs flex items-center gap-1.5 shadow-2xs cursor-pointer disabled:opacity-50"
            >
              {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <RotateCcw className="w-4 h-4" />}
              <span>تأكيد المرتجع واسترداد النقدية</span>
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
