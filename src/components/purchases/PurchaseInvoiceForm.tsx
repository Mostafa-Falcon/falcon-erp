'use client';

import React, { useMemo, useState, useEffect } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Icons } from '@/components/ui/Icons';
import { useSessionStore } from '@/core/state/useSessionStore';
import { PurchasesRepository } from '@/modules/purchases/purchases_repository';
import { ContactsRepository } from '@/modules/contacts/contacts_repository';
import { InventoryRepository } from '@/modules/inventory/inventory_repository';
import { formatNumber } from '@/lib/format';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import type { Contact, Product, Treasury, Unit, Warehouse } from '@/types';
import { v4 as uuidv4 } from 'uuid';
import { RotateCcw, AlertTriangle, Trash2, Plus, X } from 'lucide-react';

interface Line {
  id: string;
  productId: string;
  batchNumber: string;
  expiryDate: string;
  unitId: string;
  conversionFactor: number;
  qty: string;
  cost: string;
  taxRate: string;
}

export function PurchaseInvoiceForm({ onSaved }: { onSaved: (invoiceId: string) => void }) {
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

  const [supplierId, setSupplierId] = useState('');
  const [warehouseId, setWarehouseId] = useState('');
  const [treasuryId, setTreasuryId] = useState('');
  const [supplierInvoiceNumber, setSupplierInvoiceNumber] = useState('');
  const [paymentType, setPaymentType] = useState<'cash' | 'credit'>('cash');
  const [discount, setDiscount] = useState('0');
  const [discountMode, setDiscountMode] = useState<'amount' | 'percentage'>('amount');
  const [discountPercent, setDiscountPercent] = useState('');
  const [notes, setNotes] = useState('');
  const [lines, setLines] = useState<Line[]>([]);
  const [formError, setFormError] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  // Draft Auto-Save State
  const draftKey = `falcon_purchase_invoice_draft_${orgId}`;
  const [hasDraftNotice, setHasDraftNotice] = useState(false);
  const [draftCount, setDraftCount] = useState(0);

  // 1. Check for unsaved draft in localStorage on mount
  useEffect(() => {
    if (!orgId || typeof window === 'undefined') return;
    try {
      const saved = localStorage.getItem(draftKey);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed && Array.isArray(parsed.lines) && parsed.lines.length > 0) {
          setDraftCount(parsed.lines.length);
          setHasDraftNotice(true);
        }
      }
    } catch {
      // Ignore
    }
  }, [orgId, draftKey]);

  // 2. Auto-save form draft to localStorage whenever fields/lines change
  useEffect(() => {
    if (!orgId || typeof window === 'undefined' || isLoading) return;
    if (lines.length > 0 || supplierId || supplierInvoiceNumber || notes) {
      const payload = {
        supplierId,
        warehouseId,
        treasuryId,
        supplierInvoiceNumber,
        paymentType,
        discount,
        discountMode,
        discountPercent,
        notes,
        lines,
      };
      localStorage.setItem(draftKey, JSON.stringify(payload));
    }
  }, [orgId, draftKey, isLoading, supplierId, warehouseId, treasuryId, supplierInvoiceNumber, paymentType, discount, discountMode, discountPercent, notes, lines]);

  // 3. BeforeUnload browser warning when leaving page with unsaved items
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (lines.length > 0 || supplierInvoiceNumber || notes) {
        e.preventDefault();
        e.returnValue = 'هل تريد الخروج؟ هناك أصناف في فاتورة الشراء لم يتم حفظها بعد.';
      }
    };
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [lines, supplierInvoiceNumber, notes]);

  // Restore draft handler
  const restoreDraft = () => {
    try {
      const saved = localStorage.getItem(draftKey);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed.supplierId) setSupplierId(parsed.supplierId);
        if (parsed.warehouseId) setWarehouseId(parsed.warehouseId);
        if (parsed.treasuryId) setTreasuryId(parsed.treasuryId);
        if (parsed.supplierInvoiceNumber) setSupplierInvoiceNumber(parsed.supplierInvoiceNumber);
        if (parsed.paymentType) setPaymentType(parsed.paymentType);
        if (parsed.discount) setDiscount(parsed.discount);
        if (parsed.discountMode) setDiscountMode(parsed.discountMode);
        if (parsed.discountPercent) setDiscountPercent(parsed.discountPercent);
        if (parsed.notes) setNotes(parsed.notes);
        if (Array.isArray(parsed.lines)) {
          // Ensure each restored line has a unique ID
          const restoredLines = parsed.lines.map((l: Partial<Line>) => ({
            ...l,
            id: l.id || uuidv4(),
          }));
          setLines(restoredLines);
        }
      }
    } catch {
      // Ignore
    } finally {
      setHasDraftNotice(false);
    }
  };

  // Clear draft handler
  const clearDraft = () => {
    if (typeof window !== 'undefined') {
      localStorage.removeItem(draftKey);
    }
    setHasDraftNotice(false);
  };

  const loadData = async () => {
    if (!orgId) return;
    try {
      const { db } = await import('@/core/db/app_database');
      const [sups, whs, tres, prods, unts, pUnits] = await Promise.all([
        ContactsRepository.getContacts(orgId),
        branchId ? db.warehouses.where('org_id').equals(orgId).and((w) => w.is_active && (w.branch_id === branchId)).toArray() : InventoryRepository.getWarehouses(orgId),
        db.treasuries.where('org_id').equals(orgId).and((t) => t.is_active).toArray(),
        db.products.where('org_id').equals(orgId).and((p) => p.is_active && p.item_type === 'storable').toArray(),
        db.units.where('org_id').equals(orgId).toArray(),
        db.product_units.toArray(),
      ]);

      const umap: Record<string, Unit> = {};
      for (const u of unts) umap[u.id] = u;

      const opts: Record<string, { unitId: string; factor: number; cost?: number }[]> = {};
      for (const p of prods) {
        const list: { unitId: string; factor: number; cost?: number }[] = [{ unitId: p.base_unit_id, factor: 1 }];
        for (const pu of pUnits.filter((x) => x.product_id === p.id)) {
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
    } catch (err) {
      console.error('Load purchase form error:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (!orgId) return;
    Promise.resolve().then(loadData);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [orgId, branchId]);

  const addLine = () => {
    setLines((prev) => [
      ...prev,
      {
        id: uuidv4(),
        productId: '',
        batchNumber: '',
        expiryDate: '',
        unitId: '',
        conversionFactor: 1,
        qty: '1',
        cost: '0',
        taxRate: '0',
      },
    ]);
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
      taxRate: String(p?.tax_rate ?? 0),
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

  const lineProduct = (line: Line) => products.find((p) => p.id === line.productId);

  const baseOf = (line: Line) => (Number(line.qty) || 0) * (Number(line.cost) || 0);
  const lineTotals = (line: Line) => baseOf(line) + (baseOf(line) * (Number(line.taxRate) || 0)) / 100;

  const subtotal = useMemo(() => lines.reduce((a, l) => a + baseOf(l), 0), [lines]);
  const taxTotal = useMemo(() => lines.reduce((a, l) => a + (baseOf(l) * (Number(l.taxRate) || 0)) / 100, 0), [lines]);
  const appliedDiscount =
    discountMode === 'percentage'
      ? Number((subtotal * (Math.max(0, Math.min(100, Number(discountPercent) || 0)) / 100)).toFixed(2))
      : Number(discount) || 0;
  const total = Math.max(0, subtotal - appliedDiscount + taxTotal);

  const save = async () => {
    setFormError('');
    if (!currentUser) return;
    if (!supplierId || !warehouseId) {
      setFormError('اختر المورد والمخزن.');
      return;
    }
    if (paymentType === 'cash' && !treasuryId) {
      setFormError('اختر الخزينة لدفع الفاتورة نقداً.');
      return;
    }

    const items: {
      productId: string;
      batchNumber?: string;
      expiryDate?: string | null;
      unitId: string;
      conversionFactor: number;
      quantity: number;
      unitCost: number;
      salePrice?: number;
      taxRate?: number;
    }[] = [];

    for (const line of lines) {
      const p = lineProduct(line);
      if (!p || !line.unitId || !(Number(line.qty) > 0)) {
        setFormError('أكمل بيانات كل الأصناف (الصنف والكمية والوحدة).');
        return;
      }
      if (p.tracks_batch && !line.batchNumber.trim()) {
        setFormError(`أدخل رقم الدفعة للصنف «${p.name}».`);
        return;
      }
      items.push({
        productId: line.productId,
        batchNumber: line.batchNumber.trim() || undefined,
        expiryDate: line.expiryDate || undefined,
        unitId: line.unitId,
        conversionFactor: line.conversionFactor,
        quantity: Number(line.qty),
        unitCost: Number(line.cost) || 0,
        salePrice: p.sale_price,
        taxRate: Number(line.taxRate) || 0,
      });
    }
    if (items.length === 0) {
      setFormError('أضف صنفاً واحداً على الأقل.');
      return;
    }

    setIsSaving(true);
    try {
      const invoice = await PurchasesRepository.createPurchaseInvoice({
        orgId,
        branchId,
        warehouseId,
        supplierId,
        supplierInvoiceNumber: supplierInvoiceNumber.trim(),
        items,
        discountAmount:
          discountMode === 'amount' ? Number(discount) || 0 : appliedDiscount,
        discountPercent:
          discountMode === 'percentage' ? Math.max(0, Math.min(100, Number(discountPercent) || 0)) : 0,
        paymentType,
        treasuryId: paymentType === 'cash' ? treasuryId : null,
        userId: currentUser.id,
        notes: notes.trim() || undefined,
      });

      // Clear draft upon successful save
      clearDraft();
      onSaved(invoice.id);
    } catch (err) {
      console.error(err);
      setFormError(err instanceof Error ? err.message : 'حدث خطأ أثناء حفظ الفاتورة.');
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <div className="py-20 text-center text-sm font-bold text-slate-400">جارٍ تحميل البيانات...</div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Draft Recovery Notice Banner */}
      {hasDraftNotice && (
        <div className="bg-amber-50 dark:bg-amber-950/50 border border-amber-200 dark:border-amber-800/80 rounded-2xl p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 animate-in fade-in duration-200">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-100 dark:bg-amber-900/60 text-amber-700 dark:text-amber-300 flex items-center justify-center shrink-0">
              <RotateCcw className="w-5 h-5" />
            </div>
            <div>
              <h4 className="text-xs font-black text-amber-900 dark:text-amber-200">
                توجد مسودة فاتورة شراء غير محفوظة ({draftCount} صنف)
              </h4>
              <p className="text-[11px] font-bold text-amber-700/80 dark:text-amber-300/80 mt-0.5">
                تم الاحتفاظ بها تلقائياً أثناء الجلسة السابقة لضمان عدم فقدان البيانات في حال انقطاع التيار الكهربائي.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <Button
              size="sm"
              onClick={restoreDraft}
              className="h-9 px-4 text-xs font-black bg-amber-600 hover:bg-amber-700 text-white rounded-xl shadow-xs"
            >
              استرجاع المسودة
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={clearDraft}
              className="h-9 px-3 text-xs font-bold border-amber-300 dark:border-amber-800 text-amber-800 dark:text-amber-200 hover:bg-amber-100/60 rounded-xl"
            >
              مسح وبدء جديدة
            </Button>
          </div>
        </div>
      )}

      {/* Headers */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
        <div className="md:col-span-2">
          <span className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">المورد</span>
          <Select value={supplierId} onValueChange={setSupplierId}>
            <SelectTrigger className="w-full h-10 rounded-xl bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-xs font-bold">
              <SelectValue placeholder="— اختر المورد —" />
            </SelectTrigger>
            <SelectContent className="z-50 bg-white dark:bg-[#131b2e] border border-slate-200 dark:border-slate-800 rounded-xl shadow-xl max-h-60">
              {suppliers.map((c) => (
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
          <span className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">رقم فاتورة المورد</span>
          <Input type="text" value={supplierInvoiceNumber} onChange={(e) => setSupplierInvoiceNumber(e.target.value)} className="h-10 bg-slate-50 dark:bg-slate-900 text-sm" placeholder="اختياري" />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <div>
          <span className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">طريقة الدفع</span>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setPaymentType('cash')}
              className={(
                'h-10 flex-1 rounded-lg border text-xs font-bold transition-colors cursor-pointer ' +
                (paymentType === 'cash' ? 'bg-primary border-primary text-primary-foreground' : 'bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-300')
              )}
            >
              نقدي
            </button>
            <button
              type="button"
              onClick={() => setPaymentType('credit')}
              className={(
                'h-10 flex-1 rounded-lg border text-xs font-bold transition-colors cursor-pointer ' +
                (paymentType === 'credit' ? 'bg-primary border-primary text-primary-foreground' : 'bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-300')
              )}
            >
              آجل
            </button>
          </div>
        </div>
        {paymentType === 'cash' ? (
          <div className="md:col-span-2">
            <span className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">الخزينة (سداد نقدي)</span>
            <Select value={treasuryId} onValueChange={setTreasuryId}>
              <SelectTrigger className="w-full h-10 rounded-xl bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-xs font-bold">
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
        ) : (
          <div className="md:col-span-2">
            <span className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">ملاحظات</span>
            <Input type="text" value={notes} onChange={(e) => setNotes(e.target.value)} className="h-10 bg-slate-50 dark:bg-slate-900 text-sm" placeholder="ملاحظات على الفاتورة (اختياري)" />
          </div>
        )}
      </div>

      {/* Items Table Section */}
      <div className="bg-white dark:bg-[#131b2e] rounded-2xl border border-slate-200/80 dark:border-slate-800 p-5 space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-black text-slate-900 dark:text-white flex items-center gap-2">
            <span className="text-primary"><Icons.Receipt /></span>
            أصناف الفاتورة ({lines.length})
          </h3>
          <Button onClick={addLine} className="h-9 px-3 rounded-lg text-xs font-bold flex items-center gap-1.5 cursor-pointer">
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
            أضف الأصناف المشتراة باستخدام زر «إضافة صنف».
          </div>
        ) : (
          <div className="space-y-2">
            {lines.map((line, idx) => {
              const p = lineProduct(line);
              return (
                <div key={line.id || idx} className="grid grid-cols-2 md:grid-cols-12 gap-2 items-end rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-100 dark:border-slate-800 p-3">
                  {/* Sequence Order Number Badge & Product Select */}
                  <div className="col-span-2 md:col-span-3 flex items-center gap-2">
                    <span className="w-7 h-7 rounded-xl bg-blue-100 dark:bg-blue-950 text-blue-700 dark:text-blue-300 font-mono font-black text-xs flex items-center justify-center shrink-0 border border-blue-200 dark:border-blue-900 shadow-2xs">
                      #{idx + 1}
                    </span>
                    <div className="flex-1 min-w-0">
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
                  </div>

                  {p?.tracks_batch && (
                    <>
                      <div className="md:col-span-2">
                        <span className="block text-[10px] font-bold text-slate-500 dark:text-slate-400 mb-1">رقم الدفعة</span>
                        <Input type="text" value={line.batchNumber} onChange={(e) => updateLine(idx, { batchNumber: e.target.value })} className="h-9 bg-white dark:bg-slate-800 text-xs" />
                      </div>
                      {p.tracks_expiry && (
                        <div className="md:col-span-1">
                          <span className="block text-[10px] font-bold text-slate-500 dark:text-slate-400 mb-1">الانتهاء</span>
                          <Input type="date" value={line.expiryDate} onChange={(e) => updateLine(idx, { expiryDate: e.target.value })} className="h-9 bg-white dark:bg-slate-800 text-xs" />
                        </div>
                      )}
                    </>
                  )}
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
                    <Input type="number" min={0} step="any" value={line.qty} onChange={(e) => updateLine(idx, { qty: e.target.value })} className="h-9 bg-white dark:bg-slate-800 text-xs font-mono font-bold" />
                  </div>
                  <div>
                    <span className="block text-[10px] font-bold text-slate-500 dark:text-slate-400 mb-1">التكلفة</span>
                    <Input type="number" min={0} step="any" value={line.cost} onChange={(e) => updateLine(idx, { cost: e.target.value })} className="h-9 bg-white dark:bg-slate-800 text-xs font-mono font-bold" />
                  </div>
                  <div>
                    <span className="block text-[10px] font-bold text-slate-500 dark:text-slate-400 mb-1">ضريبة %</span>
                    <Input type="number" min={0} step="any" value={line.taxRate} onChange={(e) => updateLine(idx, { taxRate: e.target.value })} className="h-9 bg-white dark:bg-slate-800 text-xs font-mono font-bold" />
                  </div>
                  <div className="flex items-end justify-between gap-1">
                    <div className="text-xs font-black text-primary font-mono pt-1 whitespace-nowrap">{formatNumber(lineTotals(line))}</div>
                    <button type="button" onClick={() => removeLine(idx)} className="text-red-500 hover:text-red-700 cursor-pointer p-1">
                      <Icons.X />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Totals */}
        <div className="border-t border-slate-100 dark:border-slate-800 pt-4 grid grid-cols-2 md:grid-cols-4 gap-3 items-end">
          <div>
            <span className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">خصم على الفاتورة</span>
            <div className="flex gap-2 items-center">
              <div className="flex rounded-lg border border-slate-200 dark:border-slate-800 overflow-hidden shrink-0">
                <button
                  type="button"
                  onClick={() => setDiscountMode('amount')}
                  className={(
                    'px-2.5 h-10 text-[11px] font-bold transition-colors cursor-pointer ' +
                    (discountMode === 'amount' ? 'bg-primary text-primary-foreground' : 'bg-slate-50 dark:bg-slate-900 text-slate-500')
                  )}
                >
                  مبلغ
                </button>
                <button
                  type="button"
                  onClick={() => setDiscountMode('percentage')}
                  className={(
                    'px-2.5 h-10 text-[11px] font-bold transition-colors cursor-pointer ' +
                    (discountMode === 'percentage' ? 'bg-primary text-primary-foreground' : 'bg-slate-50 dark:bg-slate-900 text-slate-500')
                  )}
                >
                  نسبة %
                </button>
              </div>
              {discountMode === 'amount' ? (
                <Input type="number" min={0} step="any" value={discount} onChange={(e) => setDiscount(e.target.value)} className="h-10 text-sm font-mono font-bold" />
              ) : (
                <Input type="number" min={0} max={100} step="any" value={discountPercent} onChange={(e) => setDiscountPercent(e.target.value)} className="h-10 text-sm font-mono font-bold" />
              )}
            </div>
          </div>

          <div>
            <span className="block text-xs font-bold text-slate-500 mb-1">إجمالي الخصم</span>
            <div className="h-10 px-3 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 flex items-center text-sm font-mono font-black text-rose-600">
              {formatNumber(appliedDiscount)} ج.م
            </div>
          </div>

          <div>
            <span className="block text-xs font-bold text-slate-500 mb-1">إجمالي الضريبة</span>
            <div className="h-10 px-3 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 flex items-center text-sm font-mono font-black text-amber-600">
              {formatNumber(taxTotal)} ج.م
            </div>
          </div>

          <div>
            <span className="block text-xs font-bold text-slate-500 mb-1">الصافي المطلوب</span>
            <div className="h-10 px-3 rounded-xl bg-primary/10 border border-primary/20 flex items-center text-base font-mono font-black text-primary">
              {formatNumber(total)} ج.م
            </div>
          </div>
        </div>
      </div>

      <div className="flex items-center justify-end gap-3 pt-2">
        <Button
          disabled={isSaving}
          onClick={save}
          className="h-11 px-8 rounded-xl text-sm font-black bg-primary hover:bg-primary/90 text-primary-foreground shadow-md cursor-pointer flex items-center gap-2"
        >
          {isSaving ? 'جارٍ الاعتماد والحفظ...' : 'اعتماد وحفظ الفاتورة'}
        </Button>
      </div>
    </div>
  );
}
