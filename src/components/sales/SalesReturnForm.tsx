'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Icons } from '@/components/ui/Icons';
import { useSessionStore } from '@/core/state/useSessionStore';
import { SalesRepository } from '@/modules/sales/sales_repository';
import { ContactsRepository } from '@/modules/contacts/contacts_repository';
import { formatNumber } from '@/lib/format';
import type {
  Contact,
  Product,
  SalesInvoice,
  SalesInvoiceItem,
  Treasury,
  Unit,
  Warehouse,
} from '@/types';

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

interface Line {
  productId: string;
  unitId: string;
  factor: number;
  qty: string;
  price: string;
  discountPct: string;
}

export function SalesReturnForm({
  presetInvoiceId,
  presetCustomerId,
  presetWarehouseId,
  onSaved,
}: {
  presetInvoiceId?: string | null;
  presetCustomerId?: string | null;
  presetWarehouseId?: string | null;
  onSaved: (returnId: string) => void;
}) {
  const { currentUser, activeBranchId, activeShift } = useSessionStore();
  const orgId = currentUser?.org_id || '';
  const branchId = activeBranchId || currentUser?.branch_id || '';

  const [customers, setCustomers] = useState<Contact[]>([]);
  const [warehouses, setWarehouses] = useState<Warehouse[]>([]);
  const [treasuries, setTreasuries] = useState<Treasury[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [unitsById, setUnitsById] = useState<Record<string, Unit>>({});
  const [unitOptions, setUnitOptions] = useState<Record<string, { unitId: string; factor: number; price?: number }[]>>({});
  const [isLoading, setIsLoading] = useState(true);

  const [customerId, setCustomerId] = useState(presetCustomerId || '');
  const [warehouseId, setWarehouseId] = useState(presetWarehouseId || '');
  const [treasuryId, setTreasuryId] = useState('');
  const [refundType, setRefundType] = useState<'cash' | 'credit'>('cash');
  const [reason, setReason] = useState('');
  const [lines, setLines] = useState<Line[]>([]);
  const [sourceInfo, setSourceInfo] = useState<{ title: string; invoice?: SalesInvoice } | null>(null);
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
      const [custs, whs, tres, prods, unts, puList, invoice, invoiceItems] = await Promise.all([
        ContactsRepository.getContacts(orgId),
        branchId ? db.warehouses.where('org_id').equals(orgId).and((w) => w.is_active && (w.branch_id === branchId)).toArray() : db.warehouses.where('org_id').equals(orgId).and((w) => w.is_active).toArray(),
        db.treasuries.where('org_id').equals(orgId).and((t) => t.is_active).toArray(),
        db.products.where('org_id').equals(orgId).and((p) => p.is_active && p.item_type === 'storable').toArray(),
        db.units.where('org_id').equals(orgId).toArray(),
        db.product_units.toArray(),
        presetInvoiceId ? db.sales_invoices.get(presetInvoiceId) : undefined,
        presetInvoiceId ? db.sales_invoice_items.where('invoice_id').equals(presetInvoiceId).toArray() : [],
      ]);

      const enableTaxSetting = (await db.app_settings.get('enable_tax'))?.value === 'true';
      const vatRateSetting = Number((await db.app_settings.get('vat_rate'))?.value || 0);
      setEnableTax(enableTaxSetting);
      setVatRate(vatRateSetting);

      const umap: Record<string, Unit> = {};
      for (const u of unts) umap[u.id] = u;

      const opts: Record<string, { unitId: string; factor: number; price?: number }[]> = {};
      for (const p of prods) {
        const list: { unitId: string; factor: number; price?: number }[] = [{ unitId: p.base_unit_id, factor: 1, price: p.sale_price }];
        for (const pu of puList.filter((x) => x.product_id === p.id)) {
          list.push({
            unitId: pu.unit_id,
            factor: pu.conversion_factor || 1,
            price: pu.sale_price ?? (p.sale_price || 0) * (pu.conversion_factor || 1),
          });
        }
        opts[p.id] = list;
      }

      setCustomers(custs.filter((c) => c.type === 'customer' || c.type === 'both'));
      setWarehouses(whs);
      setTreasuries(tres);
      setProducts(prods);
      setUnitsById(umap);
      setUnitOptions(opts);

      if (whs.length > 0) setWarehouseId((prev) => prev || whs[0].id);
      if (tres.length > 0) setTreasuryId((prev) => prev || tres.find((t) => t.is_default)?.id || tres[0].id);

      if (presetInvoiceId && invoice) {
        setSourceInfo({ title: `مرتجع من فاتورة «${invoice.invoice_number}»`, invoice });
        setLines(
          invoiceItems.map((it: SalesInvoiceItem) => ({
            productId: it.product_id,
            unitId: it.unit_id,
            factor: it.conversion_factor,
            qty: String(it.quantity),
            price: String(it.unit_price),
            discountPct: '0',
          }))
        );
      } else {
        setSourceInfo(null);
      }
    } catch (err) {
      console.error('Load sales return form error:', err);
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
    setLines((prev) => [...prev, { productId: '', unitId: '', factor: 1, qty: '1', price: '0', discountPct: '0' }]);
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
      factor: def?.factor || 1,
      price: String(def?.price ?? p?.sale_price ?? 0),
    });
  };

  const onUnitChange = (idx: number, unitId: string) => {
    const line = lines[idx];
    const opts = unitOptions[line.productId] || [];
    const u = opts.find((o) => o.unitId === unitId);
    updateLine(idx, {
      unitId,
      factor: u?.factor || line.factor,
      price: u && u.price !== undefined ? String(u.price) : line.price,
    });
  };

  const baseOf = (line: Line) => (Number(line.qty) || 0) * (Number(line.price) || 0);
  const lineDiscOf = (line: Line) => {
    const gross = baseOf(line);
    const pct = Math.max(0, Math.min(100, Number(line.discountPct) || 0));
    return Number((gross * (pct / 100)).toFixed(2));
  };

  const total = useMemo(() => {
    const base = lines.reduce((a, l) => a + baseOf(l), 0);
    const itemDisc = lines.reduce((a, l) => a + lineDiscOf(l), 0);
    const gDisc =
      discountMode === 'percentage'
        ? Number((Math.max(0, base - itemDisc) * (Math.max(0, Number(discountValue) || 0) / 100)).toFixed(2))
        : Number(discountValue) || 0;
    const tax = enableTax ? Number((Math.max(0, base - itemDisc - gDisc) * (vatRate / 100)).toFixed(2)) : 0;
    return Math.max(0, base - itemDisc - gDisc) + tax;
  }, [lines, discountMode, discountValue, enableTax, vatRate]);

  const save = async () => {
    setFormError('');
    if (!currentUser) return;
    if (!warehouseId) {
      setFormError('اختر المخزن المُرجع إليه.');
      return;
    }
    if (refundType === 'cash' && !treasuryId) {
      setFormError('اختر الخزينة التي سيُسترد منها المبلغ.');
      return;
    }
    if (refundType === 'credit' && !customerId) {
      setFormError('اختر العميل لإضافة المبلغ كرصيد له.');
      return;
    }
    if (lines.length === 0) {
      setFormError('أضف صنفاً واحداً على الأقل.');
      return;
    }

    const items: {
      productId: string;
      unitId: string;
      conversionFactor: number;
      quantity: number;
      unitPrice: number;
      unitCost: number;
      discountAmount: number;
      taxRate: number;
    }[] = [];

    for (const line of lines) {
      const p = products.find((x) => x.id === line.productId);
      if (!p || !line.unitId || !(Number(line.qty) > 0)) {
        setFormError('أكمل بيانات كل الأصناف (الصنف والكمية والوحدة).');
        return;
      }
      items.push({
        productId: line.productId,
        unitId: line.unitId,
        conversionFactor: line.factor,
        quantity: Number(line.qty),
        unitPrice: Number(line.price) || 0,
        unitCost: p.purchase_price * line.factor,
        discountAmount: Math.min(baseOf(line), lineDiscOf(line)),
        taxRate: vatRate,
      });
    }

    setIsSaving(true);
    try {
      const returnDoc = await SalesRepository.createSalesReturn({
        orgId,
        branchId,
        warehouseId,
        originalInvoiceId: presetInvoiceId || null,
        shiftId: activeShift?.id || null,
        customerId: customerId || null,
        items,
        discountAmount:
          discountMode === 'amount' ? Math.max(0, Number(discountValue) || 0) : 0,
        discountPercent:
          discountMode === 'percentage' ? Math.max(0, Number(discountValue) || 0) : 0,
        enableTax,
        vatRate,
        treasuryId,
        userId: currentUser.id,
        reason: reason.trim() || undefined,
        refundType,
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
    return <div className="py-20 text-center text-sm font-bold text-slate-400">جارٍ تحميل البيانات...</div>;
  }

  return (
    <div className="space-y-4">
      <div className="bg-white dark:bg-[#131b2e] rounded-2xl border border-slate-200/80 dark:border-slate-800 p-5 space-y-4">
        {sourceInfo && (
          <div className="flex items-center gap-2 rounded-xl bg-teal-50 dark:bg-teal-950/30 border border-teal-200 dark:border-teal-900 px-4 py-3 text-xs font-bold text-teal-700 dark:text-teal-300">
            <Icons.ReturnArrow />
            {sourceInfo.title} — عُدّلت الأصناف بقيم فاتورة البيع.
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
          <div>
            <span className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">العميل</span>
            <Select value={customerId || 'cash'} onValueChange={(val) => setCustomerId(val === 'cash' ? '' : val)}>
              <SelectTrigger className="w-full h-10 rounded-xl bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-xs font-bold">
                <SelectValue placeholder="عميل نقدي" />
              </SelectTrigger>
              <SelectContent className="z-50 bg-white dark:bg-[#131b2e] border border-slate-200 dark:border-slate-800 rounded-xl shadow-xl max-h-60">
                <SelectItem value="cash" className="">
                  عميل نقدي
                </SelectItem>
                {customers.map((c) => (
                  <SelectItem key={c.id} value={c.id} className="">
                    {c.name}{c.phone ? ` (${c.phone})` : ''}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <span className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">المخزن</span>
            <Select value={warehouseId} onValueChange={setWarehouseId}>
              <SelectTrigger className="w-full h-10 rounded-xl bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-xs font-bold">
                <SelectValue placeholder="اختر المخزن" />
              </SelectTrigger>
              <SelectContent className="z-50 bg-white dark:bg-[#131b2e] border border-slate-200 dark:border-slate-800 rounded-xl shadow-xl">
                {warehouses.map((w) => (
                  <SelectItem key={w.id} value={w.id} className="">
                    {w.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <span className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">طريقة الرد</span>
            <Select value={refundType} onValueChange={(val) => setRefundType(val as 'cash' | 'credit')}>
              <SelectTrigger className="w-full h-10 rounded-xl bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-xs font-bold">
                <SelectValue placeholder="اختر طريقة الرد" />
              </SelectTrigger>
              <SelectContent className="z-50 bg-white dark:bg-[#131b2e] border border-slate-200 dark:border-slate-800 rounded-xl shadow-xl">
                <SelectItem value="cash" className="">استرداد نقدي من الخزينة</SelectItem>
                <SelectItem value="credit" className="">رصيد دائن للعميل</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <span className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">الخزينة (استرداد)</span>
            <Select value={treasuryId} onValueChange={setTreasuryId} disabled={refundType === 'credit'}>
              <SelectTrigger className="w-full h-10 rounded-xl bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-xs font-bold disabled:opacity-50">
                <SelectValue placeholder="اختر الخزينة" />
              </SelectTrigger>
              <SelectContent className="z-50 bg-white dark:bg-[#131b2e] border border-slate-200 dark:border-slate-800 rounded-xl shadow-xl">
                {treasuries.map((t) => (
                  <SelectItem key={t.id} value={t.id} className="">
                    {t.name} ({t.current_balance.toLocaleString('en-US', { maximumFractionDigits: 2 })})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        {refundType === 'credit' && (
          <p className="text-[11px] font-bold text-amber-600 dark:text-amber-400">
            سيُضاف إجمالي المرتجع كرصيد دائن لحساب العميل (يُخصم من أي مديونية قائمة أو يبقى رصيداً له).
          </p>
        )}

        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 items-end">
          <div>
            <span className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">خصم عام على المرتجع</span>
            <div className="flex gap-2 items-center">
              <div className="flex rounded-lg border border-slate-200 dark:border-slate-800 overflow-hidden">
                <button
                  onClick={() => setDiscountMode('amount')}
                  className={(
                    'px-3 h-10 text-[11px] font-bold transition-colors ' +
                    (discountMode === 'amount' ? 'bg-primary text-primary-foreground' : 'bg-slate-50 dark:bg-slate-900 text-slate-500')
                  )}
                >
                  مبلغ
                </button>
                <button
                  onClick={() => setDiscountMode('percentage')}
                  className={(
                    'px-3 h-10 text-[11px] font-bold transition-colors ' +
                    (discountMode === 'percentage' ? 'bg-primary text-primary-foreground' : 'bg-slate-50 dark:bg-slate-900 text-slate-500')
                  )}
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
                placeholder={discountMode === 'percentage' ? '0-100' : '0.00'}
                className="h-10 bg-slate-50 dark:bg-slate-900 text-sm flex-1"
              />
            </div>
          </div>
          <div>
            <span className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">الخصم على الصنف %</span>
            <p className="text-[11px] text-slate-400">يُدخل بجانب سعر كل صنف في الجدول بالأسفل.</p>
          </div>
          <label className="flex items-start gap-2 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 px-3 py-2.5 cursor-pointer">
            <input
              type="checkbox"
              checked={enableTax}
              onChange={(e) => setEnableTax(e.target.checked)}
              className="mt-0.5"
            />
            <span className="text-xs font-bold text-slate-700 dark:text-slate-300">
              احتساب الضريبة المضافة
              <span className="block text-[10px] text-slate-400 font-normal mt-0.5">
                النسبة المحفوظة في إعدادات المنشأة: {vatRate}%
              </span>
            </span>
          </label>
        </div>

        <div>
          <span className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">سبب الإرجاع</span>
          <Input type="text" value={reason} onChange={(e) => setReason(e.target.value)} className="h-10 bg-slate-50 dark:bg-slate-900 text-sm" placeholder="اختياري" />
        </div>
      </div>

      <div className="bg-white dark:bg-[#131b2e] rounded-2xl border border-slate-200/80 dark:border-slate-800 p-5 space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-black text-slate-900 dark:text-white flex items-center gap-2">
            <span className="text-red-500"><Icons.ReturnArrow /></span>
            أصناف المرتجع
          </h3>
          <Button onClick={addLine} className="h-9 px-3 rounded-lg text-xs font-bold flex items-center gap-1.5">
            <Icons.Plus /> إضافة صنف
          </Button>
        </div>

        {formError && (
          <div className="rounded-xl bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800 px-4 py-3 text-xs font-bold text-red-700 dark:text-red-300">
            {formError}
          </div>
        )}

        {lines.length === 0 ? (
          <div className="rounded-xl border border-dashed border-slate-200 dark:border-slate-800 py-10 text-center text-xs font-semibold text-slate-400">
            {sourceInfo ? 'لم يتم تحميل أصناف الفاتورة — أضف الأصناف المرجّعة يدوياً.' : 'أضف الأصناف المرجّعة باستخدام زر «إضافة صنف».'}
          </div>
        ) : (
          <div className="space-y-2">
            {lines.map((line, idx) => {
              return (
                <div key={idx} className="grid grid-cols-2 md:grid-cols-12 gap-2 items-end rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-100 dark:border-slate-800 p-3">
                  <div className="col-span-2 md:col-span-5">
                    <span className="block text-[10px] font-bold text-slate-500 dark:text-slate-400 mb-1">الصنف</span>
                    <Select value={line.productId} onValueChange={(val) => onProductChange(idx, val)}>
                      <SelectTrigger className="w-full h-9 rounded-xl bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-800 text-xs font-bold">
                        <SelectValue placeholder="— اختر الصنف —" />
                      </SelectTrigger>
                      <SelectContent className="z-50 bg-white dark:bg-[#131b2e] border border-slate-200 dark:border-slate-800 rounded-xl shadow-xl max-h-60">
                        {products.map((pr) => (
                          <SelectItem key={pr.id} value={pr.id} className="">
                            {pr.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <span className="block text-[10px] font-bold text-slate-500 dark:text-slate-400 mb-1">الوحدة</span>
                    <Select value={line.unitId} onValueChange={(val) => onUnitChange(idx, val)}>
                      <SelectTrigger className="w-full h-9 rounded-xl bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-800 text-xs font-bold">
                        <SelectValue placeholder="الوحدة" />
                      </SelectTrigger>
                      <SelectContent className="z-50 bg-white dark:bg-[#131b2e] border border-slate-200 dark:border-slate-800 rounded-xl shadow-xl">
                        {(unitOptions[line.productId] || []).map((u) => (
                          <SelectItem key={u.unitId} value={u.unitId} className="">
                            {unitsById[u.unitId]?.symbol || ''}{u.factor !== 1 ? ` (×${u.factor})` : ''}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <span className="block text-[10px] font-bold text-slate-500 dark:text-slate-400 mb-1">الكمية</span>
                    <Input type="number" min={0} step="any" value={line.qty} onChange={(e) => updateLine(idx, { qty: e.target.value })} className="h-9 bg-white dark:bg-slate-800 text-xs" />
                  </div>
                  <div>
                    <span className="block text-[10px] font-bold text-slate-500 dark:text-slate-400 mb-1">السعر</span>
                    <Input type="number" min={0} step="any" value={line.price} onChange={(e) => updateLine(idx, { price: e.target.value })} className="h-9 bg-white dark:bg-slate-800 text-xs" />
                  </div>
                  <div>
                    <span className="block text-[10px] font-bold text-slate-500 dark:text-slate-400 mb-1">خصم الصنف %</span>
                    <Input type="number" min={0} max={100} step="any" value={line.discountPct} onChange={(e) => updateLine(idx, { discountPct: e.target.value })} className="h-9 bg-white dark:bg-slate-800 text-xs" />
                  </div>
                  <div className="flex items-end justify-between gap-1">
                    <div className="text-xs font-black text-red-500 pt-1 whitespace-nowrap">
                      {formatNumber(baseOf(line) - lineDiscOf(line))}
                      {Number(line.discountPct) > 0 && <span className="block text-[9px] text-slate-400 font-normal">خصم {formatNumber(lineDiscOf(line))}</span>}
                    </div>
                    <button onClick={() => removeLine(idx)} className="text-red-500 hover:text-red-700"><Icons.X /></button>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        <div className="border-t border-slate-100 dark:border-slate-800 pt-4 flex items-center justify-between">
          <div className="text-sm font-black text-slate-900 dark:text-white">
            إجمالي المرتجع: <span className="text-red-500">{formatNumber(total)}</span>
          </div>
          <Button onClick={save} disabled={isSaving} className="h-11 px-6 rounded-xl text-sm font-black flex items-center gap-2">
            {isSaving ? 'جارِ التنفيذ...' : 'تنفيذ المرتجع'} <Icons.Check />
          </Button>
        </div>
      </div>
    </div>
  );
}