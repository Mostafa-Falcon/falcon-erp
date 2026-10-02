'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { EmptyState } from '@/components/ui/empty-state';
import { useSessionStore } from '@/core/state/useSessionStore';
import { PurchasesRepository } from '@/modules/purchases/purchases_repository';
import { ContactsRepository } from '@/modules/contacts/contacts_repository';
import { formatNumber } from '@/lib/format';
import {
  RotateCcw,
  Plus,
  Trash2,
  CheckCircle2,
  Wallet,
  FileText,
  Boxes,
  Percent,
  DollarSign,
  AlertCircle,
  Building2,
  Warehouse as WarehouseIcon,
  Store,
  Layers,
  ArrowRight,
} from 'lucide-react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import type { Contact, Product, PurchaseInvoice, PurchaseInvoiceItem, Treasury, Unit, Warehouse } from '@/types';

interface Line {
  productId: string;
  unitId: string;
  conversionFactor: number;
  qty: string;
  cost: string;
  discountPct: string;
}

export function PurchaseReturnForm({
  presetInvoiceId,
  presetSupplierId,
  presetWarehouseId,
  onSaved,
}: {
  presetInvoiceId?: string | null;
  presetSupplierId?: string | null;
  presetWarehouseId?: string | null;
  onSaved: (returnId: string) => void;
}) {
  const router = useRouter();
  const { currentUser, activeBranchId } = useSessionStore();
  const orgId = currentUser?.org_id || '';
  const branchId = activeBranchId || currentUser?.branch_id || '';

  const [suppliers, setSuppliers] = useState<Contact[]>([]);
  const [warehouses, setWarehouses] = useState<Warehouse[]>([]);
  const [treasuries, setTreasuries] = useState<Treasury[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [unitsById, setUnitsById] = useState<Record<string, Unit>>({});
  const [unitOptions, setUnitOptions] = useState<Record<string, { unitId: string; factor: number; cost?: number }[]>>({});
  const [isLoading, setIsLoading] = useState(true);

  const [supplierId, setSupplierId] = useState(presetSupplierId || '');
  const [warehouseId, setWarehouseId] = useState(presetWarehouseId || '');
  const [refundType, setRefundType] = useState<'treasury' | 'credit'>('treasury');
  const [treasuryId, setTreasuryId] = useState('');
  const [reason, setReason] = useState('');
  const [lines, setLines] = useState<Line[]>([]);
  const [sourceInfo, setSourceInfo] = useState<{ title: string; invoice?: PurchaseInvoice } | null>(null);
  const [formError, setFormError] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [discountMode, setDiscountMode] = useState<'amount' | 'percentage'>('amount');
  const [discountValue, setDiscountValue] = useState('');
  const [enableTax, setEnableTax] = useState(false);
  const [vatRate, setVatRate] = useState(0);

  const loadData = async () => {
    if (!orgId) return;
    try {
      const { db } = await import('@/core/db/app_database');
      const [sups, whs, tres, prods, unts, puList, invoice, invoiceItems] = await Promise.all([
        ContactsRepository.getContacts(orgId),
        branchId
          ? db.warehouses.where('org_id').equals(orgId).and((w) => w.is_active && w.branch_id === branchId).toArray()
          : db.warehouses.where('org_id').equals(orgId).and((w) => w.is_active).toArray(),
        db.treasuries.where('org_id').equals(orgId).and((t) => t.is_active).toArray(),
        db.products.where('org_id').equals(orgId).and((p) => p.is_active && p.item_type === 'storable').toArray(),
        db.units.where('org_id').equals(orgId).toArray(),
        db.product_units.toArray(),
        presetInvoiceId ? db.purchase_invoices.get(presetInvoiceId) : undefined,
        presetInvoiceId ? db.purchase_invoice_items.where('invoice_id').equals(presetInvoiceId).toArray() : [],
      ]);

      const enableTaxSetting = (await db.app_settings.get('enable_tax'))?.value === 'true';
      const vatRateSetting = Number((await db.app_settings.get('vat_rate'))?.value || 0);
      setEnableTax(enableTaxSetting);
      setVatRate(vatRateSetting);

      const umap: Record<string, Unit> = {};
      for (const u of unts) umap[u.id] = u;

      const opts: Record<string, { unitId: string; factor: number; cost?: number }[]> = {};
      for (const p of prods) {
        const list: { unitId: string; factor: number; cost?: number }[] = [{ unitId: p.base_unit_id, factor: 1 }];
        for (const pu of puList.filter((x) => x.product_id === p.id)) {
          list.push({ unitId: pu.unit_id, factor: pu.conversion_factor || 1, cost: pu.purchase_price });
        }
        opts[p.id] = list;
      }

      setSuppliers(sups.filter((c) => c.type === 'supplier' || c.type === 'both'));
      setWarehouses(whs);
      setTreasuries(tres);
      setProducts(prods);
      setUnitsById(umap);
      setUnitOptions(opts);

      if (whs.length > 0) setWarehouseId((prev) => prev || whs[0].id);
      if (tres.length > 0) setTreasuryId((prev) => prev || tres.find((t) => t.is_default)?.id || tres[0].id);

      if (presetInvoiceId && invoice) {
        setSourceInfo({ title: `مرتجع من فاتورة «${invoice.system_invoice_number}»`, invoice });
        setLines(
          invoiceItems.map((it: PurchaseInvoiceItem) => ({
            productId: it.product_id,
            unitId: it.unit_id,
            conversionFactor: it.conversion_factor,
            qty: String(it.quantity),
            cost: String(it.unit_cost),
            discountPct: '0',
          }))
        );
        if (invoice.remaining_amount > 0) {
          setRefundType('credit');
        }
      } else {
        setSourceInfo(null);
      }
    } catch (err) {
      console.error('Load return form error:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (!orgId) return;
    Promise.resolve().then(loadData);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [orgId, branchId, presetInvoiceId]);

  const addLine = () => {
    setLines((prev) => [...prev, { productId: '', unitId: '', conversionFactor: 1, qty: '1', cost: '0', discountPct: '0' }]);
    setFormError('');
  };

  const updateLine = (idx: number, patch: Partial<Line>) => {
    setLines((prev) => prev.map((row, i) => (i === idx ? { ...row, ...patch } : row)));
  };

  const removeLine = (idx: number) => {
    setLines((prev) => prev.filter((_, i) => i !== idx));
  };

  const onProductChange = (idx: number, productId: string) => {
    const p = products.find((x) => x.id === productId);
    const opts = unitOptions[productId] || [];
    const def = opts.find((o) => o.factor === 1) || opts[0];
    updateLine(idx, {
      productId,
      unitId: def?.unitId || p?.base_unit_id || '',
      conversionFactor: def?.factor || 1,
      cost: String(def?.cost ?? p?.purchase_price ?? 0),
    });
  };

  const onUnitChange = (idx: number, unitId: string) => {
    const line = lines[idx];
    const opts = unitOptions[line.productId] || [];
    const u = opts.find((o) => o.unitId === unitId);
    updateLine(idx, {
      unitId,
      conversionFactor: u?.factor || 1,
      cost: u && u.cost !== undefined ? String(u.cost) : line.cost,
    });
  };

  const baseOf = (line: Line) => (Number(line.qty) || 0) * (Number(line.cost) || 0);
  const lineDiscOf = (line: Line) => {
    const gross = baseOf(line);
    const pct = Math.max(0, Math.min(100, Number(line.discountPct) || 0));
    return Number((gross * (pct / 100)).toFixed(2));
  };

  const subtotal = useMemo(() => {
    return lines.reduce((a, l) => a + baseOf(l), 0);
  }, [lines]);

  const totalItemDiscounts = useMemo(() => {
    return lines.reduce((a, l) => a + lineDiscOf(l), 0);
  }, [lines]);

  const generalDiscountAmount = useMemo(() => {
    const afterItemDisc = Math.max(0, subtotal - totalItemDiscounts);
    if (discountMode === 'percentage') {
      const pct = Math.max(0, Number(discountValue) || 0);
      return Number((afterItemDisc * (pct / 100)).toFixed(2));
    }
    return Math.max(0, Number(discountValue) || 0);
  }, [subtotal, totalItemDiscounts, discountMode, discountValue]);

  const vatAmount = useMemo(() => {
    if (!enableTax) return 0;
    const base = Math.max(0, subtotal - totalItemDiscounts - generalDiscountAmount);
    return Number((base * (vatRate / 100)).toFixed(2));
  }, [subtotal, totalItemDiscounts, generalDiscountAmount, enableTax, vatRate]);

  const total = useMemo(() => {
    const base = Math.max(0, subtotal - totalItemDiscounts - generalDiscountAmount);
    return base + vatAmount;
  }, [subtotal, totalItemDiscounts, generalDiscountAmount, vatAmount]);

  const save = async () => {
    setFormError('');
    if (!currentUser) return;
    if (!supplierId || !warehouseId) {
      setFormError('يرجى اختيار المورد والمخزن المستلم للمرتجع.');
      return;
    }
    if (refundType === 'treasury' && !treasuryId) {
      setFormError('يرجى اختيار الخزينة المُرجع إليها المبلغ نقداً.');
      return;
    }

    const items: {
      productId: string;
      unitId: string;
      conversionFactor: number;
      quantity: number;
      unitCost: number;
      discountAmount: number;
      taxRate: number;
    }[] = [];

    for (const line of lines) {
      if (!line.productId || !line.unitId || !(Number(line.qty) > 0)) {
        setFormError('يرجى إكمال بيانات كافة الأصناف (اختيار الصنف والوحدة وإدخال كمية صحيحة).');
        return;
      }
      const gross = (Number(line.qty) || 0) * (Number(line.cost) || 0);
      items.push({
        productId: line.productId,
        unitId: line.unitId,
        conversionFactor: line.conversionFactor,
        quantity: Number(line.qty),
        unitCost: Number(line.cost) || 0,
        discountAmount: Math.min(gross, lineDiscOf(line)),
        taxRate: vatRate,
      });
    }

    if (items.length === 0) {
      setFormError('يرجى إضافة صنف واحد على الأقل للمرتجع.');
      return;
    }

    setIsSaving(true);
    try {
      const returnDoc = await PurchasesRepository.createPurchaseReturn({
        orgId,
        branchId,
        warehouseId,
        originalInvoiceId: presetInvoiceId || null,
        supplierId,
        items,
        discountAmount: discountMode === 'amount' ? Math.max(0, Number(discountValue) || 0) : 0,
        discountPercent: discountMode === 'percentage' ? Math.max(0, Number(discountValue) || 0) : 0,
        enableTax,
        vatRate,
        refundType,
        treasuryId: refundType === 'treasury' ? treasuryId : null,
        userId: currentUser.id,
        reason: reason.trim() || undefined,
      });
      onSaved(returnDoc.id);
    } catch (err) {
      console.error(err);
      setFormError(err instanceof Error ? err.message : 'حدث خطأ أثناء تنفيذ المرتجع.');
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <div className="py-24 text-center text-xs font-bold text-slate-400 flex flex-col items-center gap-3">
        <RotateCcw className="w-8 h-8 animate-spin text-primary opacity-60" />
        <span>جارٍ تحميل بيانات المرتجع والموردين...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-16 select-none" dir="rtl">
      {/* Linked Invoice Banner (if any) */}
      {sourceInfo && (
        <div className="flex items-center gap-3 rounded-2xl bg-blue-50/80 dark:bg-blue-950/40 border border-blue-200/80 dark:border-blue-800/80 px-4 py-3.5 text-xs font-bold text-blue-900 dark:text-blue-200 shadow-2xs">
          <FileText className="w-5 h-5 text-blue-600 dark:text-blue-400 shrink-0" />
          <div className="flex-1">
            <span>{sourceInfo.title}</span>
            <span className="text-3xs font-semibold text-blue-700/80 dark:text-blue-300/80 mr-2">
              (تم جلب الأصناف والأسعار تلقائياً من الفاتورة الأصلية)
            </span>
          </div>
          {sourceInfo.invoice?.remaining_amount ? (
            <Badge variant="outline" className="border-blue-300 dark:border-blue-700 text-blue-700 dark:text-blue-300 font-mono">
              المتبقي على الفاتورة: {formatNumber(sourceInfo.invoice.remaining_amount)} ج.م
            </Badge>
          ) : null}
        </div>
      )}

      {/* Card 1: Return Info & Financial Settings */}
      <Card className="rounded-2xl border border-slate-200/80 dark:border-slate-800 bg-surface p-5 sm:p-6 shadow-2xs space-y-5">
        <div className="flex items-center gap-2 border-b border-slate-100 dark:border-slate-800/80 pb-3">
          <Building2 className="w-4 h-4 text-primary" />
          <h3 className="text-sm font-black text-slate-900 dark:text-white">
            بيانات المرتجع والمورد
          </h3>
        </div>

        {/* Row 1: Supplier, Warehouse, Reason */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
              المورد المسترجع إليه <span className="text-rose-500">*</span>
            </label>
            <Select value={supplierId} onValueChange={setSupplierId}>
              <SelectTrigger className="w-full h-10 rounded-xl bg-slate-50/70 dark:bg-slate-900/70 border-slate-200/80 dark:border-slate-800 text-xs font-bold">
                <SelectValue placeholder="— اختر المورد —" />
              </SelectTrigger>
              <SelectContent className="z-50 bg-popover border border-slate-200 dark:border-slate-800 rounded-xl shadow-xl max-h-60">
                {suppliers.map((c) => (
                  <SelectItem key={c.id} value={c.id}>
                    {c.name} {c.phone ? `(${c.phone})` : ''}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
              المخزن المخصوم منه <span className="text-rose-500">*</span>
            </label>
            <Select value={warehouseId} onValueChange={setWarehouseId}>
              <SelectTrigger className="w-full h-10 rounded-xl bg-slate-50/70 dark:bg-slate-900/70 border-slate-200/80 dark:border-slate-800 text-xs font-bold">
                <SelectValue placeholder="اختر المخزن" />
              </SelectTrigger>
              <SelectContent className="z-50 bg-popover border border-slate-200 dark:border-slate-800 rounded-xl shadow-xl">
                {warehouses.map((w) => (
                  <SelectItem key={w.id} value={w.id}>
                    {w.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
              سبب الإرجاع (اختياري)
            </label>
            <Input
              type="text"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              className="h-10 bg-slate-50/70 dark:bg-slate-900/70 text-xs font-semibold rounded-xl border-slate-200/80 dark:border-slate-800"
              placeholder="مثلاً: تالف، منتهي الصلاحية، خطأ في الطلب..."
            />
          </div>
        </div>

        {/* Row 2: Refund Method & Treasury */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2 border-t border-slate-100 dark:border-slate-800/60">
          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
              طريقة الاسترداد المالي
            </label>
            <div className="flex p-1 bg-slate-100/80 dark:bg-slate-800/80 rounded-xl border border-slate-200/60 dark:border-slate-700/60 h-10 items-center gap-1">
              <button
                type="button"
                onClick={() => setRefundType('treasury')}
                className={`flex-1 h-8 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                  refundType === 'treasury'
                    ? 'bg-surface text-primary shadow-2xs font-black'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                <Wallet className="w-3.5 h-3.5" />
                <span>استرداد نقدي للخزينة</span>
              </button>
              <button
                type="button"
                onClick={() => setRefundType('credit')}
                className={`flex-1 h-8 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                  refundType === 'credit'
                    ? 'bg-surface text-primary shadow-2xs font-black'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                <FileText className="w-3.5 h-3.5" />
                <span>خصم من ذمم المورد (آجل)</span>
              </button>
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
              {refundType === 'treasury' ? 'الخزينة المستلمة للنقدية' : 'تأثير الخصم على الحساب'}
            </label>
            {refundType === 'treasury' ? (
              <Select value={treasuryId} onValueChange={setTreasuryId}>
                <SelectTrigger className="w-full h-10 rounded-xl bg-slate-50/70 dark:bg-slate-900/70 border-slate-200/80 dark:border-slate-800 text-xs font-bold">
                  <SelectValue placeholder="اختر الخزينة" />
                </SelectTrigger>
                <SelectContent className="z-50 bg-popover border border-slate-200 dark:border-slate-800 rounded-xl shadow-xl">
                  {treasuries.map((t) => (
                    <SelectItem key={t.id} value={t.id}>
                      {t.name} (الرصيد: {formatNumber(t.current_balance)} ج.م)
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            ) : (
              <div className="h-10 px-3.5 flex items-center rounded-xl bg-slate-50/60 dark:bg-slate-900/60 border border-slate-200/70 dark:border-slate-800 text-xs font-semibold text-slate-500 dark:text-slate-400">
                يُخصم المرتجع من رصيد المورد المستحق ويقلل من مديونيته تلقائياً.
              </div>
            )}
          </div>
        </div>

        {/* Row 3: General Discount & VAT */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2 border-t border-slate-100 dark:border-slate-800/60">
          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
              خصم عام على إجمالي المرتجع
            </label>
            <div className="flex gap-2 items-center">
              <div className="flex p-0.5 bg-slate-100 dark:bg-slate-800 rounded-xl border border-slate-200/60 dark:border-slate-700/60 shrink-0">
                <button
                  type="button"
                  onClick={() => setDiscountMode('amount')}
                  className={`px-3 h-9 text-2xs font-bold rounded-lg transition-colors cursor-pointer ${
                    discountMode === 'amount'
                      ? 'bg-surface text-primary shadow-2xs font-black'
                      : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'
                  }`}
                >
                  مبلغ (ج.م)
                </button>
                <button
                  type="button"
                  onClick={() => setDiscountMode('percentage')}
                  className={`px-3 h-9 text-2xs font-bold rounded-lg transition-colors cursor-pointer ${
                    discountMode === 'percentage'
                      ? 'bg-surface text-primary shadow-2xs font-black'
                      : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'
                  }`}
                >
                  نسبة %
                </button>
              </div>
              <Input
                type="number"
                min={0}
                step="any"
                value={discountValue}
                onChange={(e) => setDiscountValue(e.target.value)}
                placeholder={discountMode === 'percentage' ? 'مثلاً: 5%' : '0.00 ج.م'}
                className="h-10 bg-slate-50/70 dark:bg-slate-900/70 text-xs font-semibold rounded-xl border-slate-200/80 dark:border-slate-800 flex-1"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
              ضريبة القيمة المضافة (VAT)
            </label>
            <label className="flex items-center justify-between rounded-xl bg-slate-50/70 dark:bg-slate-900/70 border border-slate-200/80 dark:border-slate-800 px-3.5 h-10 cursor-pointer transition-all hover:bg-slate-100/60 dark:hover:bg-slate-800/60">
              <span className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center gap-2">
                <span>احتساب الضريبة المضافة</span>
                <span className="px-2 py-0.5 rounded-full bg-slate-200/70 dark:bg-slate-800 text-3xs font-extrabold text-slate-600 dark:text-slate-300 font-mono">
                  {vatRate}%
                </span>
              </span>
              <input
                type="checkbox"
                checked={enableTax}
                onChange={(e) => setEnableTax(e.target.checked)}
                className="w-4 h-4 rounded text-primary focus:ring-primary/20 accent-primary cursor-pointer"
              />
            </label>
          </div>
        </div>
      </Card>

      {/* Card 2: Return Items List */}
      <Card className="rounded-2xl border border-slate-200/80 dark:border-slate-800 bg-surface p-5 sm:p-6 shadow-2xs space-y-4">
        <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800/80 pb-3">
          <div className="flex items-center gap-2">
            <Boxes className="w-4 h-4 text-primary" />
            <h3 className="text-sm font-black text-slate-900 dark:text-white">
              أصناف المرتجع
            </h3>
            <Badge variant="secondary" className="font-bold text-3xs">
              {lines.length} صنف
            </Badge>
          </div>

          <Button
            type="button"
            onClick={addLine}
            className="h-9 px-3.5 rounded-xl text-xs font-bold bg-primary hover:bg-primary/90 text-white flex items-center gap-1.5 shadow-2xs hover:shadow-xs transition-all cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>إضافة صنف</span>
          </Button>
        </div>

        {formError && (
          <div className="rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 px-4 py-3 text-xs font-bold text-rose-700 dark:text-rose-300 flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
            <span>{formError}</span>
          </div>
        )}

        {lines.length === 0 ? (
          <div className="p-4">
            <EmptyState
              icon={<RotateCcw className="w-7 h-7 text-slate-400" />}
              title="لم يتم إضافة أي صنف حتى الآن"
              description={
                sourceInfo
                  ? 'لم يتم استخراج أصناف الفاتورة — يمكنك إضافة الأصناف المرجعة يدوياً.'
                  : 'ابدأ بالضغط على زر «إضافة صنف» لتسجيل الكميات وتكاليف الأصناف المرجعة.'
              }
              action={{
                label: 'إضافة صنف الآن',
                icon: <Plus className="w-4 h-4" />,
                onClick: addLine,
              }}
            />
          </div>
        ) : (
          <div className="space-y-2.5">
            {lines.map((line, idx) => {
              const netAmount = baseOf(line) - lineDiscOf(line);
              return (
                <div
                  key={idx}
                  className="grid grid-cols-1 md:grid-cols-12 gap-2.5 items-end rounded-xl bg-slate-50/70 dark:bg-slate-900/60 border border-slate-200/80 dark:border-slate-800 p-3 hover:border-slate-300 dark:hover:border-slate-700 transition-all shadow-2xs"
                >
                  {/* Product */}
                  <div className="md:col-span-4">
                    <label className="block text-3xs font-bold text-slate-500 dark:text-slate-400 mb-1">
                      الصنف
                    </label>
                    <Select value={line.productId} onValueChange={(val) => onProductChange(idx, val)}>
                      <SelectTrigger className="w-full h-9 rounded-xl bg-surface border-slate-200 dark:border-slate-800 text-xs font-bold">
                        <SelectValue placeholder="— اختر الصنف —" />
                      </SelectTrigger>
                      <SelectContent className="z-50 bg-popover border border-slate-200 dark:border-slate-800 rounded-xl shadow-xl max-h-60">
                        {products.map((pr) => (
                          <SelectItem key={pr.id} value={pr.id}>
                            {pr.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Unit */}
                  <div className="md:col-span-2">
                    <label className="block text-3xs font-bold text-slate-500 dark:text-slate-400 mb-1">
                      الوحدة
                    </label>
                    <Select value={line.unitId} onValueChange={(val) => onUnitChange(idx, val)}>
                      <SelectTrigger className="w-full h-9 rounded-xl bg-surface border-slate-200 dark:border-slate-800 text-xs font-bold">
                        <SelectValue placeholder="الوحدة" />
                      </SelectTrigger>
                      <SelectContent className="z-50 bg-popover border border-slate-200 dark:border-slate-800 rounded-xl shadow-xl">
                        {(unitOptions[line.productId] || []).map((u) => (
                          <SelectItem key={u.unitId} value={u.unitId}>
                            {unitsById[u.unitId]?.symbol || ''} {u.factor !== 1 ? `(×${u.factor})` : ''}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Quantity */}
                  <div className="md:col-span-2">
                    <label className="block text-3xs font-bold text-slate-500 dark:text-slate-400 mb-1">
                      الكمية
                    </label>
                    <Input
                      type="number"
                      min={0}
                      step="any"
                      value={line.qty}
                      onChange={(e) => updateLine(idx, { qty: e.target.value })}
                      className="h-9 bg-surface text-xs font-bold border-slate-200 dark:border-slate-800 font-mono text-center"
                    />
                  </div>

                  {/* Cost Price */}
                  <div className="md:col-span-2">
                    <label className="block text-3xs font-bold text-slate-500 dark:text-slate-400 mb-1">
                      سعر التكلفة
                    </label>
                    <Input
                      type="number"
                      min={0}
                      step="any"
                      value={line.cost}
                      onChange={(e) => updateLine(idx, { cost: e.target.value })}
                      className="h-9 bg-surface text-xs font-bold border-slate-200 dark:border-slate-800 font-mono text-center"
                    />
                  </div>

                  {/* Discount */}
                  <div className="md:col-span-1">
                    <label className="block text-3xs font-bold text-slate-500 dark:text-slate-400 mb-1">
                      خصم %
                    </label>
                    <Input
                      type="number"
                      min={0}
                      max={100}
                      step="any"
                      value={line.discountPct}
                      onChange={(e) => updateLine(idx, { discountPct: e.target.value })}
                      className="h-9 bg-surface text-xs font-bold border-slate-200 dark:border-slate-800 font-mono text-center"
                    />
                  </div>

                  {/* Net and Delete */}
                  <div className="md:col-span-1 flex items-center justify-between gap-1 h-9">
                    <div className="text-xs font-mono font-black text-rose-600 dark:text-rose-400 truncate">
                      {formatNumber(netAmount)}
                    </div>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      onClick={() => removeLine(idx)}
                      className="w-7 h-7 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 cursor-pointer"
                      title="حذف الصنف"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </Card>

      {/* Card 3: Summary Breakdown & Action Confirmation */}
      <Card className="rounded-2xl border border-slate-200/80 dark:border-slate-800 bg-surface p-5 sm:p-6 shadow-2xs space-y-5">
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 p-4 rounded-xl bg-slate-50/70 dark:bg-slate-900/60 border border-slate-100 dark:border-slate-800 text-xs">
          <div>
            <span className="text-3xs font-bold text-slate-400 block mb-0.5">إجمالي الأصناف:</span>
            <span className="font-mono font-black text-slate-800 dark:text-slate-200 text-sm">
              {formatNumber(subtotal)} ج.م
            </span>
          </div>

          <div>
            <span className="text-3xs font-bold text-slate-400 block mb-0.5">إجمالي الخصم:</span>
            <span className="font-mono font-black text-amber-600 dark:text-amber-400 text-sm">
              {formatNumber(totalItemDiscounts + generalDiscountAmount)} ج.م
            </span>
          </div>

          <div>
            <span className="text-3xs font-bold text-slate-400 block mb-0.5">ضريبة القيمة المضافة:</span>
            <span className="font-mono font-black text-slate-800 dark:text-slate-200 text-sm">
              {formatNumber(vatAmount)} ج.م
            </span>
          </div>

          <div className="bg-rose-50 dark:bg-rose-950/40 p-2.5 rounded-xl border border-rose-100 dark:border-rose-900/50">
            <span className="text-3xs font-bold text-rose-600 dark:text-rose-400 block mb-0.5">صافي المرتجع الإجمالي:</span>
            <span className="font-mono font-black text-rose-600 dark:text-rose-400 text-base">
              {formatNumber(total)} ج.م
            </span>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-2">
          <Button
            type="button"
            variant="outline"
            onClick={() => router.push('/purchases/returns')}
            className="w-full sm:w-auto h-11 px-5 rounded-xl text-xs font-bold cursor-pointer"
          >
            <span>إلغاء والعودة لقائمة المرتجعات</span>
          </Button>

          <Button
            type="button"
            onClick={save}
            disabled={isSaving || lines.length === 0}
            className="w-full sm:w-auto h-11 px-8 rounded-xl text-xs font-black bg-rose-600 hover:bg-rose-700 text-white shadow-sm hover:shadow-md transition-all cursor-pointer flex items-center justify-center gap-2"
          >
            {isSaving ? (
              <>
                <RotateCcw className="w-4 h-4 animate-spin" />
                <span>جارٍ حفظ وتنفيذ المرتجع...</span>
              </>
            ) : (
              <>
                <CheckCircle2 className="w-4 h-4" />
                <span>تأكيد وتنفيذ مرتجع المشتريات</span>
              </>
            )}
          </Button>
        </div>
      </Card>
    </div>
  );
}