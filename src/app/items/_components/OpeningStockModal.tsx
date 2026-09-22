'use client';

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Boxes,
  Save,
  Plus,
  Trash2,
  Wand2,
  Info,
  AlertTriangle,
  Layers,
  CalendarClock,
  Banknote,
  Warehouse as WarehouseIcon,
} from 'lucide-react';
import { v4 as uuidv4 } from 'uuid';
import { ProductRepository } from '@/modules/inventory/product_repository';
import { InventoryRepository } from '@/modules/inventory/inventory_repository';
import { db } from '@/core/db/app_database';
import { useSessionStore } from '@/core/state/useSessionStore';
import { getSubscriptionPermissions } from '@/core/constants/subscription_profiles';
import { generateAutoBatchNumber } from '@/components/inventory/product-form/utils';
import { roundQty, roundMoney, toNumber, moneyProduct, formatMoney, qtySum } from '@/lib/decimal';
import { isExpired, daysToExpiry, formatNumber } from '@/lib/format';
import { toast } from 'sonner';
import type { Product, Unit, ProductUnit, Warehouse } from '@/types';

interface OpeningStockModalProps {
  product: Product | null;
  warehouses: Warehouse[];
  orgId?: string;
  unitName?: (id?: string | null) => string;
  onClose: () => void;
  onSuccess: () => void;
}

interface ExpiryRow {
  id: string;
  expiryDate: string; // '' => بدون تاريخ صلاحية
  batchNumber: string;
  quantity: string; // بالوحدة المختارة
}

interface UnitOption {
  unitId: string;
  name: string;
  factor: number;
}

const ROW_FIELDS = ['expiry', 'batch', 'qty'] as const;

const TERMS = {
  pharmacy: {
    itemNoun: 'الدواء',
    batchNoun: 'رقم التشغيلة / الوجبة',
    expiryNoun: 'تاريخ الصلاحية',
    unitLabel: 'الوحدة الدوائية',
    splitHint: 'الكمية المدخلة هي الرصيد الفعلي المتوفر حالياً في هذا المخزن، وتُقسَّم على تواريخ الصلاحية -- وليست كمية إضافية فوق الرصيد الحالي.',
  },
  trade: {
    itemNoun: 'الصنف',
    batchNoun: 'رقم الدفعة',
    expiryNoun: 'تاريخ الانتهاء',
    unitLabel: 'الوحدة / المستوى',
    splitHint: 'الكمية المدخلة هي الرصيد الفعلي المتوفر حالياً في هذا المخزن، وتُقسَّم على تواريخ الانتهاء -- وليست كمية إضافية فوق الرصيد الحالي.',
  },
} as const;

function createRow(): ExpiryRow {
  return { id: uuidv4(), expiryDate: '', batchNumber: '', quantity: '' };
}

export function OpeningStockModal({
  product,
  warehouses,
  orgId: orgIdProp,
  unitName,
  onClose,
  onSuccess,
}: OpeningStockModalProps) {
  const { currentUser } = useSessionStore();
  const orgId = orgIdProp || currentUser?.org_id || '';

  const [isPharmacy, setIsPharmacy] = useState(false);
  const [isTrial, setIsTrial] = useState(false);
  const [unitsById, setUnitsById] = useState<Record<string, Unit>>({});
  const [productUnits, setProductUnits] = useState<ProductUnit[]>([]);
  const [stockBalances, setStockBalances] = useState<Record<string, number>>({});

  const [warehouseId, setWarehouseId] = useState<string>('');
  // '' => الوحدة الأساسية (تُحل لمفتاح real id بعد التحميل)
  const [unitId, setUnitId] = useState<string>(() => product?.base_unit_id || '');
  const [unitCost, setUnitCost] = useState<string>(() =>
    String(product?.purchase_price || product?.cost_price || 0)
  );
  const [rows, setRows] = useState<ExpiryRow[]>([createRow()]);
  const [isMetaLoading, setIsMetaLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const fieldRefs = useRef<Record<string, HTMLInputElement | null>>({});

  // ── Load meta (org, units, levels, existing stock) once per product ──
  useEffect(() => {
    if (!product || !orgId) return;
    let active = true;
    (async () => {
      try {
        setIsMetaLoading(true);
        const [org, unts, pUnits, levels] = await Promise.all([
          db.organizations.get(orgId),
          ProductRepository.getAllUnits(orgId),
          ProductRepository.getProductUnits(product.id),
          db.stock_levels.where('product_id').equals(product.id).toArray(),
        ]);
        if (!active) return;

        const unitMap: Record<string, Unit> = {};
        for (const u of unts) unitMap[u.id] = u;
        setUnitsById(unitMap);
        setProductUnits(pUnits);

        const balances: Record<string, number> = {};
        for (const s of levels) {
          balances[s.warehouse_id] = (balances[s.warehouse_id] || 0) + s.quantity;
        }
        setStockBalances(balances);

        const orgRec = org;
        setIsPharmacy(orgRec?.activity_type === 'pharmacy');
        const tier = (orgRec?.subscription_tier || '').toLowerCase();
        setIsTrial(tier === 'trial');

        setWarehouseId((prev) => prev || warehouses[0]?.id || '');
        setUnitCost((prev) => (prev !== '' ? prev : String(product.purchase_price || product.cost_price || 0)));
      } catch (err) {
        console.error('Failed to load opening stock meta:', err);
      } finally {
        if (active) setIsMetaLoading(false);
      }
    })();
    return () => {
      active = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [product?.id, orgId]);

  // ── Unit levels (المستويات) options ──
  const baseUnitName =
    (product && unitsById[product.base_unit_id]?.name) || unitName?.(product?.base_unit_id) || 'الوحدة الأساسية';

  const unitOptions: UnitOption[] = useMemo(() => {
    if (!product) return [];
    const opts: UnitOption[] = [
      { unitId: product.base_unit_id, name: baseUnitName, factor: 1 },
      ...productUnits
        .filter((pu) => pu.unit_id !== product.base_unit_id)
        .map((pu) => ({
          unitId: pu.unit_id,
          name: pu.unit_name || unitsById[pu.unit_id]?.name || 'مستوى',
          factor: pu.conversion_factor && pu.conversion_factor > 0 ? pu.conversion_factor : 1,
        })),
    ];
    const seen = new Set<string>();
    return opts.filter((o) => {
      const key = o.unitId;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  }, [product, productUnits, unitsById, baseUnitName]);

  const selectedUnitName =
    product && unitId === product.base_unit_id
      ? baseUnitName
      : unitId
      ? unitsById[unitId]?.name || 'مستوى'
      : baseUnitName;

  const selectedFactor = useMemo(() => {
    if (!unitId) return 1;
    const opt = unitOptions.find((o) => o.unitId === unitId);
    return opt ? opt.factor : 1;
  }, [unitId, unitOptions]);

  // ── Accurate live totals ──
  const totals = useMemo(() => {
    const qtyPerRow = rows.map((r) => toNumber(r.quantity));
    const baseQtyPerRow = qtyPerRow.map((q) => roundQty(q * selectedFactor));
    const totalSelected = qtySum(qtyPerRow);
    const totalBase = qtySum(baseQtyPerRow);
    const cost = roundMoney(toNumber(unitCost));
    const totalValue = moneyProduct(totalBase, cost);
    return { qtyPerRow, baseQtyPerRow, totalSelected, totalBase, cost, totalValue };
  }, [rows, selectedFactor, unitCost]);

  const currentBalance = warehouseId ? stockBalances[warehouseId] || 0 : 0;

  // ── Keyboard navigation: Enter moves to the next logical input ──
  const focusField = useCallback((rowIndex: number, field: string) => {
    fieldRefs.current[`${rowIndex}-${field}`]?.focus();
  }, []);

  const handleRowEnter = useCallback(
    (rowIndex: number, fieldIndex: number) => {
      const nextField = ROW_FIELDS[fieldIndex + 1];
      if (nextField) {
        focusField(rowIndex, nextField);
        return;
      }
      if (rowIndex < rows.length - 1) {
        focusField(rowIndex + 1, ROW_FIELDS[0]);
        return;
      }
      // Last field of the last row: create a new row and jump to it.
      const newRows = [...rows, createRow()];
      setRows(newRows);
      window.setTimeout(() => focusField(newRows.length - 1, ROW_FIELDS[0]), 30);
    },
    [rows, focusField]
  );

  const onInputKeyDown = (rowIndex: number, fieldIndex: number) => (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleRowEnter(rowIndex, fieldIndex);
    }
  };

  const addRow = useCallback(() => {
    setRows((prev) => [...prev, createRow()]);
  }, []);

  const removeRow = useCallback((idx: number) => {
    setRows((prev) => {
      if (prev.length === 1) return prev;
      return prev.filter((_, i) => i !== idx);
    });
  }, []);

  const updateRow = useCallback((idx: number, patch: Partial<ExpiryRow>) => {
    setRows((prev) => {
      const next = [...prev];
      next[idx] = { ...next[idx], ...patch };
      return next;
    });
  }, []);

  const handleExpiryDateChange = useCallback(
    (idx: number, value: string) => {
      setRows((prev) => {
        const next = [...prev];
        const row = { ...next[idx], expiryDate: value };
        if (value && !row.batchNumber.trim()) {
          const [y, m] = value.split('-');
          row.batchNumber = generateAutoBatchNumber(y, m);
        }
        next[idx] = row;
        return next;
      });
    },
    []
  );

  const renderRowStatus = (expiryDate: string) => {
    if (!expiryDate) {
      return (
        <Badge className="bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-300 border-none text-[10px] font-bold rounded-full px-2.5 py-0.5">
          بدون تاريخ
        </Badge>
      );
    }
    if (isExpired(expiryDate)) {
      return <Badge variant="destructive" className="text-[10px] font-bold rounded-full px-2.5 py-0.5">منتهي</Badge>;
    }
    const days = daysToExpiry(expiryDate);
    const variant = days <= 90 ? 'warning' : 'success';
    const label = days <= 90 ? `ينتهي خلال ${days} يوم` : `نشط (${days} يوم)`;
    return <Badge variant={variant} className="text-[10px] font-bold rounded-full px-2.5 py-0.5">{label}</Badge>;
  };

  const t = isPharmacy ? TERMS.pharmacy : TERMS.trade;

  if (!product) return null;

  // ── Save: validate + subscription gate + accurate persist ──
  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!orgId) {
      toast.error('تعذر تحديد المنشأة. يرجى إعادة تسجيل الدخول.');
      return;
    }
    if (!warehouseId) {
      toast.error('يرجى اختيار المخزن.');
      return;
    }
    if (totals.totalBase <= 0) {
      toast.error('أدخل كمية فعلية أكبر من صفر.');
      return;
    }
    if (rows.some((r) => r.expiryDate && isExpired(r.expiryDate))) {
      toast.error(`لا يمكن تسجيل رصيد افتتاحي ${isPharmacy ? 'بتاريخ صلاحية' : 'بتاريخ انتهاء'} منتهي.`);
      return;
    }

    const org = await db.organizations.get(orgId);
    if (org) {
      if (!org.is_active) {
        toast.error('حساب المنشأة غير فعال حالياً.');
        return;
      }
      const hasExpiredSub = org.subscription_expires_at
        ? new Date(org.subscription_expires_at) < new Date()
        : false;
      const perms = getSubscriptionPermissions(org.subscription_tier, hasExpiredSub);
      if (!perms.canAddProducts) {
        toast.error(perms.reasonIfBlocked || 'إضافة الكميات الافتتاحية غير متاحة في حسابك الحالي.');
        return;
      }
    }

    try {
      setIsSubmitting(true);
      const entries = rows
        .map((r, i) => ({
          expiryDate: r.expiryDate || null,
          batchNumber: r.batchNumber.trim() || undefined,
          baseQuantity: totals.baseQtyPerRow[i],
          // Level info as entered by the owner (name snapshot + level quantity).
          unitId: unitId || undefined,
          unitName: selectedUnitName || undefined,
          levelQuantity: roundQty(toNumber(r.quantity)),
        }))
        .filter((en) => en.baseQuantity > 0);

      const res = await InventoryRepository.setOpeningQuantity({
        orgId,
        warehouseId,
        productId: product.id,
        userId: currentUser?.id || '',
        unitCost: totals.cost,
        entries,
        notes: 'رصيد افتتاحي (الكمية الفعلية)',
      });

      if (!res.success) {
        toast.error(res.error || 'حدث خطأ أثناء حفظ الرصيد.');
        return;
      }

      toast.success(`تم تثبيت رصيد ${t.itemNoun} (${product.name}) بنجاح.`);
      onSuccess();
      onClose();
    } catch (err) {
      console.error('Failed to save opening stock:', err);
      toast.error('حدث خطأ أثناء حفظ الرصيد.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={!!product} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-2xl max-h-[92vh] overflow-y-auto text-right" dir="rtl">
        <DialogHeader className="space-y-1.5">
          <DialogTitle className="text-base font-black flex items-center gap-2 text-slate-900 dark:text-white">
            <Boxes className="w-5 h-5 text-blue-600" />
            <span>إضافة كمية افتتاحية (رصيد بداية)</span>
          </DialogTitle>
          <p className="text-xs text-slate-500 font-bold">
            {isPharmacy ? 'الدواء' : 'الصنف'}:{' '}
            <span className="text-blue-600 font-black">{product.name}</span>
            {product.sku ? <span className="text-slate-400 font-mono"> ({product.sku})</span> : null}
          </p>
        </DialogHeader>

        {/* قاعدة الحساب: الكمية من المخزون الفعلي وليست إضافية */}
        <div className="p-3 rounded-xl bg-blue-50/80 dark:bg-blue-950/40 border border-blue-200/80 dark:border-blue-900/60 text-[11px] font-bold text-blue-900 dark:text-blue-200 flex items-start gap-2">
          <Info className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
          <p>{t.splitHint}</p>
        </div>

        <form onSubmit={handleSave} className="space-y-4 py-1">
          {/* المخزن + الوحدة/المستوى + التكلفة */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 items-start">
            <div className="space-y-1.5">
              <Label className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1">
                <WarehouseIcon className="w-3.5 h-3.5 text-slate-400" />
                المخزن المستهدف <span className="text-red-500">*</span>
              </Label>
              <Select value={warehouseId} onValueChange={setWarehouseId}>
                <SelectTrigger className="w-full h-10 rounded-xl bg-slate-50 dark:bg-slate-900 text-xs font-bold text-right">
                  <SelectValue placeholder="اختر المخزن" />
                </SelectTrigger>
                <SelectContent className="bg-white dark:bg-[#131b2e] z-50">
                  {warehouses.map((w) => (
                    <SelectItem key={w.id} value={w.id}>
                      {w.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1">
                <Layers className="w-3.5 h-3.5 text-slate-400" />
                {unitOptions.length > 1 ? `${t.unitLabel} / المستوى` : t.unitLabel}
              </Label>
              {unitOptions.length > 1 ? (
                <Select value={unitId} onValueChange={setUnitId}>
                  <SelectTrigger className="w-full h-10 rounded-xl bg-slate-50 dark:bg-slate-900 text-xs font-bold text-right">
                    <SelectValue placeholder="اختر الوحدة" />
                  </SelectTrigger>
                  <SelectContent className="bg-white dark:bg-[#131b2e] z-50">
                    {unitOptions.map((o) => (
                      <SelectItem key={o.unitId} value={o.unitId}>
                        {o.name}
                        {o.factor !== 1 ? ` (1 ${baseUnitName} = ${o.factor} ${o.name})` : ''}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              ) : (
                <Input
                  value={baseUnitName}
                  disabled
                  className="h-10 rounded-xl bg-slate-100 dark:bg-slate-800 text-xs font-bold text-slate-500"
                />
              )}
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1">
                <Banknote className="w-3.5 h-3.5 text-slate-400" />
                تكلفة الوحدة الأساسية (ج.م)
              </Label>
              <Input
                type="number"
                min="0"
                step="any"
                value={unitCost}
                onChange={(e) => setUnitCost(e.target.value)}
                placeholder="0.00"
                className="h-10 rounded-xl text-center font-mono font-black"
              />
            </div>
          </div>

          {/* الميزان الحالي */}
          <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-slate-100 dark:border-slate-800 flex items-center justify-between text-[11px] font-bold">
            <span className="text-slate-500">
              الرصيد الحالي في المخزن المختار (بالوحدة الأساسية)
            </span>
            <span className="font-mono font-black text-slate-900 dark:text-white">
              {formatNumber(currentBalance, 0)} {baseUnitName}
            </span>
          </div>

          {/* مدخلات تقسيم تواريخ الصلاحية */}
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <CalendarClock className="w-4 h-4 text-emerald-600" />
              <h3 className="text-xs font-black text-slate-800 dark:text-slate-200">
                تقسيم الرصيد الفعلي على {t.expiryNoun} (اختياري)
              </h3>
              <Badge className="bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300 border border-emerald-200 text-[10px] font-bold rounded-full px-2 py-0.5">
                {rows.length} سطر
              </Badge>
            </div>

            {rows.map((row, idx) => {
              const baseQty = totals.baseQtyPerRow[idx];
              const isFirst = idx === 0;
              return (
                <div
                  key={row.id}
                  className="p-3 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/60 grid grid-cols-1 sm:grid-cols-[1.2fr_1.2fr_1fr_auto] gap-2 items-end"
                >
                  {/* تاريخ الصلاحية */}
                  <div className="space-y-1">
                    <Label className="block text-[11px] font-black text-slate-500">
                      {t.expiryNoun}
                    </Label>
                    <div className="flex items-center gap-1.5">
                      <Input
                        ref={(el) => {
                          fieldRefs.current[`${idx}-expiry`] = el;
                        }}
                        type="date"
                        value={row.expiryDate}
                        onChange={(e) => handleExpiryDateChange(idx, e.target.value)}
                        onKeyDown={onInputKeyDown(idx, 0)}
                        tabIndex={idx * 3 + 1}
                        className="h-10 rounded-xl text-xs font-mono"
                      />
                      {renderRowStatus(row.expiryDate)}
                    </div>
                  </div>

                  {/* رقم التشغيلة / الدفعة */}
                  <div className="space-y-1">
                    <Label className="block text-[11px] font-black text-slate-500">{t.batchNoun}</Label>
                    <div className="relative">
                      <Input
                        ref={(el) => {
                          fieldRefs.current[`${idx}-batch`] = el;
                        }}
                        type="text"
                        value={row.batchNumber}
                        onChange={(e) => updateRow(idx, { batchNumber: e.target.value })}
                        onKeyDown={onInputKeyDown(idx, 1)}
                        tabIndex={idx * 3 + 2}
                        placeholder={isPharmacy ? 'LOT-...' : 'أوتوماتيكي'}
                        className="h-10 rounded-xl text-xs font-mono text-right"
                      />
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          const [y, m] = row.expiryDate ? row.expiryDate.split('-') : [];
                          updateRow(idx, { batchNumber: generateAutoBatchNumber(y, m) });
                        }}
                        className="absolute left-1 top-1 h-8 w-8 p-0 text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-950/40 cursor-pointer rounded-lg"
                        title="توليد رقم تلقائي"
                      >
                        <Wand2 className="w-3.5 h-3.5" />
                      </Button>
                    </div>
                  </div>

                  {/* الكمية بالوحدة المختارة */}
                  <div className="space-y-1">
                    <Label className="block text-[11px] font-black text-slate-500">
                      الكمية ({selectedUnitName})
                    </Label>
                    <Input
                      ref={(el) => {
                        fieldRefs.current[`${idx}-qty`] = el;
                      }}
                      type="number"
                      min="0"
                      step="any"
                      value={row.quantity}
                      onChange={(e) => updateRow(idx, { quantity: e.target.value })}
                      onKeyDown={onInputKeyDown(idx, 2)}
                      tabIndex={idx * 3 + 3}
                      placeholder="0"
                      className="h-10 rounded-xl text-center font-mono font-black"
                    />
                    {selectedFactor !== 1 && baseQty > 0 && (
                      <p className="text-[10px] font-bold text-slate-400 font-mono">
                        = {formatNumber(baseQty, 0)} {baseUnitName}
                      </p>
                    )}
                  </div>

                  {/* حذف */}
                  <div className="flex justify-end sm:justify-center">
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      onClick={() => removeRow(idx)}
                      disabled={isFirst && rows.length === 1}
                      className="w-10 h-10 rounded-xl text-red-500 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-950/40 cursor-pointer shrink-0"
                      title="حذف السطر"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              );
            })}

            <Button
              type="button"
              variant="outline"
              onClick={addRow}
              className="w-full h-10 rounded-xl border-dashed border-emerald-400 dark:border-emerald-700 text-emerald-700 dark:text-emerald-300 hover:bg-emerald-50 dark:hover:bg-emerald-950/40 text-xs font-bold flex items-center justify-center gap-2 cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>إضافة {t.expiryNoun} آخر</span>
            </Button>
          </div>

          {/* إجماليات دقيقة */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            <div className="p-3 rounded-xl bg-emerald-50/80 dark:bg-emerald-950/40 border border-emerald-200/80 dark:border-emerald-900 text-center">
              <p className="text-[10px] font-black text-emerald-700 dark:text-emerald-300">الكمية ({selectedUnitName})</p>
              <p className="text-sm font-black font-mono text-emerald-900 dark:text-emerald-200 mt-0.5">
                {formatNumber(totals.totalSelected, 0)}
              </p>
            </div>
            <div className="p-3 rounded-xl bg-blue-50/80 dark:bg-blue-950/40 border border-blue-200/80 dark:border-blue-900 text-center">
              <p className="text-[10px] font-black text-blue-700 dark:text-blue-300">الكمية ({baseUnitName})</p>
              <p className="text-sm font-black font-mono text-blue-900 dark:text-blue-200 mt-0.5">
                {formatNumber(totals.totalBase, 0)}
              </p>
            </div>
            <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 text-center">
              <p className="text-[10px] font-black text-slate-500">الرصيد الحالي</p>
              <p className="text-sm font-black font-mono text-slate-900 dark:text-white mt-0.5">
                {formatNumber(currentBalance, 0)}
              </p>
            </div>
            <div className="p-3 rounded-xl bg-violet-50/80 dark:bg-violet-950/40 border border-violet-200/80 dark:border-violet-900 text-center">
              <p className="text-[10px] font-black text-violet-700 dark:text-violet-300">القيمة الافتتاحية</p>
              <p className="text-sm font-black font-mono text-violet-900 dark:text-violet-200 mt-0.5">
                {formatMoney(totals.totalValue)} ج.م
              </p>
            </div>
          </div>

          {totals.totalBase > 0 && totals.totalBase !== currentBalance && (
            <div className="p-2.5 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-900 text-[11px] font-bold text-amber-800 dark:text-amber-300 flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 shrink-0" />
              <span>
                سيتم ضبط الرصيد في المخزن من {formatNumber(currentBalance, 0)} إلى{' '}
                {formatNumber(totals.totalBase, 0)} {baseUnitName} (الكمية الفعلية).
              </span>
            </div>
          )}

          {isTrial && (
            <div className="p-2.5 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900 text-[11px] font-bold text-rose-700 dark:text-rose-300">
              حساب تجريبي: إضافة الأرصدة الافتتاحية متاحة للمعاينة (حد أقصى 15 صنف). يُنصح بالترقية قبل بدء التشغيل الفعلي.
            </div>
          )}

          <DialogFooter className="gap-2 sm:gap-0 pt-1">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              className="rounded-xl text-xs font-bold h-10 px-4 cursor-pointer"
            >
              إلغاء
            </Button>
            <Button
              type="submit"
              disabled={isSubmitting || isMetaLoading}
              className="bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-black h-10 px-6 gap-2 shadow-md cursor-pointer"
            >
              <Save className="w-4 h-4" />
              <span>{isSubmitting ? 'جاري الحفظ...' : 'حفظ وتثبيت الرصيد'}</span>
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}