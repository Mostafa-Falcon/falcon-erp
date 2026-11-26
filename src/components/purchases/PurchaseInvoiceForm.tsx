'use client';

import React, { useMemo, useState, useEffect, useRef, useCallback } from 'react';
import { Input } from '@/components/ui/input';
import { DatePicker } from '@/components/ui/date-picker';
import { Button } from '@/components/ui/button';
import { useSessionStore } from '@/core/state/useSessionStore';
import { PurchasesRepository } from '@/modules/purchases/purchases_repository';
import { ContactsRepository } from '@/modules/contacts/contacts_repository';
import { InventoryRepository } from '@/modules/inventory/inventory_repository';
import { ProductRepository } from '@/modules/inventory/product_repository';
import { safeLower, formatNumber } from '@/lib/format';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import type { Contact, Product, Treasury, Unit, Warehouse } from '@/types';
import { v4 as uuidv4 } from 'uuid';
import {
  Search,
  Plus,
  Trash2,
  RotateCcw,
  CheckCircle2,
  Calendar,
  Wallet,
  Receipt,
  Building2,
  User,
  X,
  AlertCircle,
  Truck,
  Hash,
  Sparkles,
  PackageCheck,
  Percent,
  Coins
} from 'lucide-react';
import { toast } from 'sonner';

interface Line {
  id: string;
  productId: string;
  productName: string;
  sku: string;
  batchNumber: string;
  expiryDate: string;
  unitId: string;
  conversionFactor: number;
  qty: string;
  cost: string; // Purchase Price
  discountPercent: string; // Line Discount %
  salePrice: string; // Selling Price
  taxRate: string;
}

export function PurchaseInvoiceForm({ onSaved, editInvoiceId }: { onSaved: (invoiceId: string) => void; editInvoiceId?: string }) {
  const { currentUser, activeBranchId } = useSessionStore();
  const orgId = currentUser?.org_id || '';
  const branchId = activeBranchId || currentUser?.branch_id || '';

  // Core Data Lists
  const [suppliers, setSuppliers] = useState<Contact[]>([]);
  const [warehouses, setWarehouses] = useState<Warehouse[]>([]);
  const [treasuries, setTreasuries] = useState<Treasury[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [unitsById, setUnitsById] = useState<Record<string, Unit>>({});
  const [unitOptions, setUnitOptions] = useState<Record<string, { unitId: string; factor: number; cost?: number }[]>>({});
  const [stockMap, setStockMap] = useState<Record<string, number>>({});
  const [isLoading, setIsLoading] = useState(true);

  // Form Fields State
  const [supplierId, setSupplierId] = useState('');
  const [warehouseId, setWarehouseId] = useState('');
  const [treasuryId, setTreasuryId] = useState('');
  const [supplierInvoiceNumber, setSupplierInvoiceNumber] = useState('');
  const [autoInvoiceNumber, setAutoInvoiceNumber] = useState('');
  const [purchaseDate, setPurchaseDate] = useState<string>(new Date().toISOString().slice(0, 10));
  const [receiptStatus, setReceiptStatus] = useState<'received' | 'pending'>('received');
  const [paymentType, setPaymentType] = useState<'cash' | 'credit' | 'split'>('cash');
  const [customPaidAmount, setCustomPaidAmount] = useState('0');
  const [additionalDiscount, setAdditionalDiscount] = useState('0');
  const [notes, setNotes] = useState('');
  const [lines, setLines] = useState<Line[]>([]);
  const [formError, setFormError] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const submitLockRef = useRef(false);

  // Supplier Search Dropdown State
  const [supplierSearchQuery, setSupplierSearchQuery] = useState('');
  const [isSupplierDropdownOpen, setIsSupplierDropdownOpen] = useState(false);

  // Product Search Bar State
  const [productSearchQuery, setProductSearchQuery] = useState('');
  const [isProductDropdownOpen, setIsProductDropdownOpen] = useState(false);
  const [productHighlightedIndex, setProductHighlightedIndex] = useState(0);
  const productSearchRef = useRef<HTMLInputElement>(null);

  // Add Supplier Modal
  const [isAddSupplierModalOpen, setIsAddSupplierModalOpen] = useState(false);
  const [newSupplierName, setNewSupplierName] = useState('');
  const [newSupplierPhone, setNewSupplierPhone] = useState('');

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

  // 2. Auto-save form draft to localStorage whenever lines/fields change
  useEffect(() => {
    if (!orgId || typeof window === 'undefined' || isLoading || hasDraftNotice) return;
    if (lines.length > 0) {
      const payload = {
        supplierId,
        warehouseId,
        treasuryId,
        supplierInvoiceNumber,
        purchaseDate,
        receiptStatus,
        paymentType,
        customPaidAmount,
        additionalDiscount,
        notes,
        lines,
      };
      localStorage.setItem(draftKey, JSON.stringify(payload));
    }
  }, [
    orgId,
    draftKey,
    isLoading,
    hasDraftNotice,
    supplierId,
    warehouseId,
    treasuryId,
    supplierInvoiceNumber,
    purchaseDate,
    receiptStatus,
    paymentType,
    customPaidAmount,
    additionalDiscount,
    notes,
    lines,
  ]);

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
        if (parsed.purchaseDate) setPurchaseDate(parsed.purchaseDate);
        if (parsed.receiptStatus) setReceiptStatus(parsed.receiptStatus);
        if (parsed.paymentType) setPaymentType(parsed.paymentType);
        if (parsed.customPaidAmount) setCustomPaidAmount(parsed.customPaidAmount);
        if (parsed.additionalDiscount) setAdditionalDiscount(parsed.additionalDiscount);
        if (parsed.notes) setNotes(parsed.notes);
        if (Array.isArray(parsed.lines) && parsed.lines.length > 0) {
          const restoredLines = parsed.lines.map((l: Partial<Line>) => ({
            id: l.id || uuidv4(),
            productId: l.productId || '',
            productName: l.productName || 'صنف مشتريات',
            sku: l.sku || '',
            batchNumber: l.batchNumber || '',
            expiryDate: l.expiryDate || '',
            unitId: l.unitId || '',
            conversionFactor: l.conversionFactor || 1,
            qty: String(l.qty ?? '1'),
            cost: String(l.cost ?? '0'),
            discountPercent: String(l.discountPercent ?? '0'),
            salePrice: String(l.salePrice ?? '0'),
            taxRate: String(l.taxRate ?? '0'),
          }));
          setLines(restoredLines);
        }
      }
    } catch (err) {
      console.error('Error restoring draft:', err);
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

  // Load Data
  const loadData = async () => {
    if (!orgId) return;
    try {
      setIsLoading(true);
      const { db } = await import('@/core/db/app_database');
      const [allContacts, allWhs, allTres, allProds, unts, pUnits, stockLevels] = await Promise.all([
        ContactsRepository.getContacts(orgId).catch(() => []),
        db.warehouses.where('org_id').equals(orgId).toArray().catch(() => []),
        db.treasuries.where('org_id').equals(orgId).toArray().catch(() => []),
        db.products.where('org_id').equals(orgId).toArray().catch(() => []),
        db.units.where('org_id').equals(orgId).toArray().catch(() => []),
        db.product_units.toArray().catch(() => []),
        db.stock_levels.where('org_id').equals(orgId).toArray().catch(() => []),
      ]);

      const sups = allContacts.filter((c) => c.is_active !== false && (c.type === 'supplier' || c.type === 'both'));
      const safeSups = sups.length > 0 ? sups : allContacts;

      const whs = allWhs.filter((w) => w.is_active !== false && (!branchId || !w.branch_id || w.branch_id === branchId));
      const safeWhs = whs.length > 0 ? whs : allWhs;

      const tres = allTres.filter((t) => t.is_active !== false);
      const safeTres = tres.length > 0 ? tres : allTres;

      const prods = allProds.filter((p) => p.is_active !== false);

      const umap: Record<string, Unit> = {};
      for (const u of unts) umap[u.id] = u;

      const opts: Record<string, { unitId: string; factor: number; cost?: number }[]> = {};
      for (const p of prods) {
        const list: { unitId: string; factor: number; cost?: number }[] = [];
        if (p.base_unit_id) {
          list.push({ unitId: p.base_unit_id, factor: 1 });
        }
        for (const pu of pUnits.filter((x) => x.product_id === p.id)) {
          list.push({ unitId: pu.unit_id, factor: pu.conversion_factor || 1, cost: pu.purchase_price });
        }
        opts[p.id] = list;
      }

      const smap: Record<string, number> = {};
      for (const s of stockLevels) {
        smap[s.product_id] = (smap[s.product_id] || 0) + (Number(s.available_quantity) ?? Number(s.quantity) ?? 0);
      }

      setSuppliers(safeSups);
      setWarehouses(safeWhs);
      setTreasuries(safeTres);
      setProducts(prods);
      setUnitsById(umap);
      setUnitOptions(opts);
      setStockMap(smap);

      // Auto invoice number preview
      const nextNo = `PUR-${Math.floor(100 + Math.random() * 900)}-${Math.floor(100 + Math.random() * 900)}`;
      setAutoInvoiceNumber(nextNo);

      if (safeSups.length > 0) setSupplierId((prev) => prev || safeSups[0].id);
      if (safeWhs.length > 0) setWarehouseId((prev) => prev || safeWhs[0].id);
      if (safeTres.length > 0) setTreasuryId((prev) => prev || safeTres.find((t) => t.is_default)?.id || safeTres[0].id);
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
  // Load existing invoice when editing - prefill every field and line
  useEffect(() => {
    if (!editInvoiceId || !orgId || isLoading) return;
    let cancelled = false;
    (async () => {
      try {
        const { db } = await import('@/core/db/app_database');
        const inv = await db.purchase_invoices.get(editInvoiceId);
        if (!inv || cancelled) return;
        const invItems = await db.purchase_invoice_items.where('invoice_id').equals(editInvoiceId).toArray();
        if (cancelled) return;
        setSupplierId(inv.supplier_id || '');
        setWarehouseId(inv.warehouse_id || '');
        setTreasuryId(inv.treasury_id || '');
        setSupplierInvoiceNumber(inv.invoice_number || '');
        if (inv.invoice_date) setPurchaseDate(String(inv.invoice_date).slice(0, 10));
        setPaymentType((inv.payment_type as 'cash' | 'credit' | 'split') || 'cash');
        setCustomPaidAmount(String(inv.paid_amount || 0));
        setAdditionalDiscount(String(inv.discount_amount || 0));
        setNotes(inv.notes || '');
        setLines(invItems.map((it) => ({
          id: it.id,
          productId: it.product_id,
          productName: products.find((p) => p.id === it.product_id)?.name || 'صنف',
          sku: products.find((p) => p.id === it.product_id)?.sku || '',
          batchNumber: it.batch_number || '',
          expiryDate: it.expiry_date || '',
          unitId: it.unit_id,
          conversionFactor: it.conversion_factor || 1,
          qty: String(it.quantity || 0),
          cost: String(it.unit_cost || 0),
          discountPercent: '0',
          salePrice: String(it.sale_price || 0),
          taxRate: String(it.tax_rate || 0),
        })));
        setHasDraftNotice(false);
      } catch (err) {
        console.error('Load purchase invoice for edit failed:', err);
        toast.error('تعذر تحميل بيانات الفاتورة للتعديل.');
      }
    })();
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [editInvoiceId, orgId, isLoading, products]);

  // Product Search Suggestions Filter
  const filteredProductSuggestions = useMemo(() => {
    const q = productSearchQuery.trim().toLowerCase();
    if (!q) return [];
    return products
      .filter((p) => safeLower(p.name).includes(q) || safeLower(p.sku).includes(q))
      .slice(0, 8);
  }, [products, productSearchQuery]);

  // Supplier Search Suggestions Filter
  const filteredSuppliers = useMemo(() => {
    const q = supplierSearchQuery.trim().toLowerCase();
    if (!q) return suppliers;
    return suppliers.filter((s) => safeLower(s.name).includes(q) || (s.phone && s.phone.includes(q)));
  }, [suppliers, supplierSearchQuery]);

  // Select Supplier
  const selectedSupplier = useMemo(() => {
    return suppliers.find((s) => s.id === supplierId) || null;
  }, [suppliers, supplierId]);

  // Add Product to Invoice Lines Table
  const addProductToInvoice = (p: Product) => {
    const opts = unitOptions[p.id] || [];
    const defUnit = opts.find((o) => o.factor === 1) || opts[0];

    // Check if line already exists
    const existingIndex = lines.findIndex((l) => l.productId === p.id);
    if (existingIndex > -1) {
      const updated = [...lines];
      const curQty = Number(updated[existingIndex].qty) || 0;
      updated[existingIndex].qty = String(curQty + 1);
      setLines(updated);
      toast.success(`تم زيادة كمية «${p.name}» إلى ${curQty + 1}`);
    } else {
      const newLine: Line = {
        id: uuidv4(),
        productId: p.id,
        productName: p.name,
        sku: p.sku || '—',
        batchNumber: '',
        expiryDate: '',
        unitId: defUnit?.unitId || p.base_unit_id || '',
        conversionFactor: defUnit?.factor || 1,
        qty: '1',
        cost: String(defUnit?.cost ?? p.purchase_price ?? 0),
        discountPercent: '0',
        salePrice: String(p.sale_price ?? 0),
        taxRate: String(p.tax_rate ?? 0),
      };
      setLines((prev) => [...prev, newLine]);
      toast.success(`تمت إضافة «${p.name}» للفاتورة`);
    }

    setProductSearchQuery('');
    setIsProductDropdownOpen(false);
    setFormError('');
  };

  // Keyboard navigation inside product search bar
  const handleProductSearchKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      if (filteredProductSuggestions.length > 0) {
        e.preventDefault();
        setProductHighlightedIndex((prev) => (prev < filteredProductSuggestions.length - 1 ? prev + 1 : prev));
      }
    } else if (e.key === 'ArrowUp') {
      if (filteredProductSuggestions.length > 0) {
        e.preventDefault();
        setProductHighlightedIndex((prev) => (prev > 0 ? prev - 1 : 0));
      }
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (filteredProductSuggestions.length > 0) {
        const picked = filteredProductSuggestions[productHighlightedIndex] || filteredProductSuggestions[0];
        if (picked) addProductToInvoice(picked);
      }
    } else if (e.key === 'Escape') {
      setIsProductDropdownOpen(false);
    }
  };

  const updateLine = (idx: number, patch: Partial<Line>) => {
    setLines((prev) => prev.map((row, i) => (i === idx ? { ...row, ...patch } : row)));
  };

  const removeLine = (idx: number) => {
    setLines((prev) => prev.filter((_, i) => i !== idx));
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

  // Line Calculations
  const calculateLineNet = (l: Line) => {
    const q = Number(l.qty) || 0;
    const c = Number(l.cost) || 0;
    const gross = q * c;
    const discPct = Math.max(0, Math.min(100, Number(l.discountPercent) || 0));
    const discAmt = gross * (discPct / 100);
    const taxable = gross - discAmt;
    const taxAmt = (taxable * (Number(l.taxRate) || 0)) / 100;
    return Math.max(0, taxable + taxAmt);
  };

  const subtotal = useMemo(() => lines.reduce((a, l) => a + calculateLineNet(l), 0), [lines]);
  const appliedDiscount = Math.max(0, Number(additionalDiscount) || 0);
  const total = Math.max(0, subtotal - appliedDiscount);

  const paidVal = useMemo(() => {
    if (paymentType === 'cash') return total;
    if (paymentType === 'credit') return 0;
    return Math.min(total, Math.max(0, Number(customPaidAmount) || 0));
  }, [paymentType, total, customPaidAmount]);

  const remainingVal = useMemo(() => {
    return Math.max(0, total - paidVal);
  }, [total, paidVal]);

  // Quick Create Supplier Handler
  const handleQuickAddSupplier = async () => {
    if (!newSupplierName.trim()) {
      toast.error('أدخل اسم المورد');
      return;
    }
    try {
      const newSup = await ContactsRepository.createContact({
        org_id: orgId,
        type: 'supplier',
        name: newSupplierName.trim(),
        phone: newSupplierPhone.trim() || undefined,
        credit_limit: 0,
        is_active: true,
      });
      setSuppliers((prev) => [newSup, ...prev]);
      setSupplierId(newSup.id);
      setIsAddSupplierModalOpen(false);
      setNewSupplierName('');
      setNewSupplierPhone('');
      toast.success(`تمت إضافة المورد «${newSup.name}» بنجاح`);
    } catch (err: any) {
      toast.error(err?.message || 'حدث خطأ أثناء إضافة المورد');
    }
  };

  // Save Purchase Invoice Handler
  const save = async () => {
    setFormError('');
    if (isSaving || submitLockRef.current) return;
    if (!currentUser) return;
    if (!supplierId || !warehouseId) {
      setFormError('يرجى اختيار المورد والمخزن لإتمام الفاتورة.');
      return;
    }
    if (paidVal > 0 && !treasuryId) {
      setFormError('اختر الخزينة المسدد منها المبلغ النقدي.');
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
      const p = products.find((x) => x.id === line.productId);
      if (!p || !line.unitId || !(Number(line.qty) > 0)) {
        setFormError('أكمل بيانات كل الأصناف (الصنف والكمية والوحدة).');
        return;
      }
      if (p.tracks_batch && !line.batchNumber.trim()) {
        setFormError(`أدخل رقم الدفعة للصنف «${p.name}».`);
        return;
      }

      // Update product sale_price if salePrice was edited
      const newSalePrice = Number(line.salePrice) || 0;
      if (newSalePrice > 0 && newSalePrice !== p.sale_price) {
        const { db } = await import('@/core/db/app_database');
        db.products.update(p.id, { sale_price: newSalePrice, updated_at: new Date().toISOString(), sync_status: 'pending' }).catch(() => {});
      }

      items.push({
        productId: line.productId,
        batchNumber: line.batchNumber.trim() || undefined,
        expiryDate: line.expiryDate || undefined,
        unitId: line.unitId,
        conversionFactor: line.conversionFactor,
        quantity: Number(line.qty),
        unitCost: Number(line.cost) || 0,
        salePrice: newSalePrice > 0 ? newSalePrice : p.sale_price,
        taxRate: Number(line.taxRate) || 0,
      });
    }

    if (items.length === 0) {
      setFormError('أضف صنفاً واحداً على الأقل للفاتورة.');
      return;
    }

    submitLockRef.current = true;
    setIsSaving(true);

    try {
      const actualPaymentType = (paidVal >= total && total > 0) ? 'cash' : (paidVal <= 0) ? 'credit' : 'split';

      const invoice = editInvoiceId
        ? await PurchasesRepository.updatePurchaseInvoiceFull({
            invoiceId: editInvoiceId,
            userId: currentUser.id,
            supplierId,
            warehouseId,
            treasuryId: paidVal > 0 ? treasuryId : null,
            supplierInvoiceNumber: supplierInvoiceNumber.trim() || '',
            invoiceDate: purchaseDate,
            items,
            discountAmount: appliedDiscount,
            discountPercent: 0,
            paymentType: actualPaymentType,
            paidAmount: paidVal,
            notes: [notes.trim(), 'حالة الاستلام: ' + (receiptStatus === 'received' ? 'تم الاستلام' : 'قيد الانتظار')]
              .filter(Boolean).join(' | ') || undefined,
          })
        : await PurchasesRepository.createPurchaseInvoice({
        orgId,
        branchId,
        warehouseId,
        supplierId,
        supplierInvoiceNumber: supplierInvoiceNumber.trim() || `SUP-${Date.now().toString().slice(-6)}`,
        items,
        discountAmount: appliedDiscount,
        discountPercent: 0,
        paymentType: actualPaymentType,
        paidAmount: paidVal,
        treasuryId: paidVal > 0 ? treasuryId : null,
        userId: currentUser.id,
        notes: [notes.trim(), `حالة الاستلام: ${receiptStatus === 'received' ? 'تم الاستلام' : 'معلق'}`]
          .filter(Boolean)
          .join(' | ') || undefined,
      });

      clearDraft();
      toast.success(`تم حفظ واعتماد فاتورة المشتريات #${invoice.invoice_number} بنجاح!`);
      onSaved(invoice.id);
    } catch (err: any) {
      console.error(err);
      setFormError(err?.message || 'حدث خطأ أثناء حفظ الفاتورة.');
    } finally {
      setIsSaving(false);
      submitLockRef.current = false;
    }
  };

  if (isLoading) {
    return (
      <div className="py-20 text-center text-sm font-bold text-slate-400 flex flex-col items-center justify-center gap-3">
        <div className="w-8 h-8 border-3 border-blue-600 border-t-transparent rounded-full animate-spin" />
        <span>جارٍ تحميل بيانات الموردين والمخازن والأصناف...</span>
      </div>
    );
  }

  return (
    <div className="space-y-4 text-right select-none" dir="rtl">
      {/* Draft Recovery Banner */}
      {hasDraftNotice && (
        <div className="bg-gradient-to-r from-blue-900 via-indigo-900 to-slate-900 text-white rounded-2xl p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-lg border border-blue-500/30 animate-in fade-in duration-200">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-500/20 text-blue-300 flex items-center justify-center shrink-0 border border-blue-400/30">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <h4 className="text-xs font-black text-white flex items-center gap-2">
                <span>مسودة محفوظة تلقائياً: تحتوي الفاتورة على ({draftCount}) أصناف محفوظة وآمنة ضد انقطاع الطاقة</span>
              </h4>
              <p className="text-3xs font-semibold text-blue-200/80 mt-0.5">
                تم الاحتفاظ بها لضمان استمرارية العمل دون فقدان أي بيانات أثناء انقطاع التيار الكهربائي أو إغلاق المتصفح.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <Button
              size="sm"
              onClick={restoreDraft}
              className="h-9 px-4 text-xs font-black bg-emerald-500 hover:bg-emerald-600 text-white rounded-xl shadow-xs cursor-pointer"
            >
              استرجاع المسودة
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={clearDraft}
              className="h-9 px-3 text-xs font-bold border-red-400/40 text-red-300 hover:bg-red-500/20 rounded-xl cursor-pointer"
            >
              تفريغ وبدء جديدة
            </Button>
          </div>
        </div>
      )}

      {/* Supplier & Header Metadata Section */}
      <div className="bg-surface rounded-2xl border border-slate-200/80 dark:border-slate-800 p-5 shadow-xs space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-12 gap-3 items-end">
          {/* Supplier Search Selector */}
          <div className="md:col-span-6 relative">
            <div className="flex items-center justify-between mb-1">
              <span className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1">
                <User className="w-3.5 h-3.5 text-blue-600" />
                <span>المورد *</span>
              </span>
              <button
                type="button"
                onClick={() => setIsAddSupplierModalOpen(true)}
                className="text-3xs font-bold text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-0.5 cursor-pointer"
              >
                <Plus className="w-3 h-3" /> <span>مورد جديد</span>
              </button>
            </div>

            {/* Selected Supplier Card or Input */}
            <div className="relative">
              <Input
                type="text"
                value={selectedSupplier ? selectedSupplier.name : supplierSearchQuery}
                onFocus={() => setIsSupplierDropdownOpen(true)}
                onChange={(e) => {
                  setSupplierSearchQuery(e.target.value);
                  setSupplierId('');
                  setIsSupplierDropdownOpen(true);
                }}
                placeholder="ابحث باسم المورد أو رقم الهاتف..."
                className="h-11 bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-xs font-bold px-10 rounded-xl"
              />
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />

              {/* Dropdown Suggestions */}
              {isSupplierDropdownOpen && filteredSuppliers.length > 0 && (
                <div className="absolute right-0 left-0 top-full mt-1.5 bg-surface border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl z-50 overflow-hidden max-h-60 overflow-y-auto">
                  {filteredSuppliers.map((s) => {
                    const bal = s.current_balance || 0;
                    return (
                      <div
                        key={s.id}
                        onClick={() => {
                          setSupplierId(s.id);
                          setSupplierSearchQuery(s.name);
                          setIsSupplierDropdownOpen(false);
                        }}
                        className="p-3 hover:bg-slate-50 dark:hover:bg-slate-800/60 cursor-pointer flex items-center justify-between border-b border-slate-100 dark:border-slate-800/60 last:border-0 transition-colors"
                      >
                        <div className="flex items-center gap-2">
                          <div className="w-8 h-8 rounded-xl bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 flex items-center justify-center text-xs font-black">
                            <Truck className="w-4 h-4" />
                          </div>
                          <div>
                            <span className="block text-xs font-black text-slate-900 dark:text-white">{s.name}</span>
                            <span className="block text-3xs font-mono text-slate-400">{s.phone || 'بدون هاتف'}</span>
                          </div>
                        </div>

                        <span
                          className={`text-3xs font-black px-2.5 py-1 rounded-full border ${
                            bal > 0
                              ? 'bg-rose-50 text-rose-600 border-rose-200 dark:bg-rose-950/40 dark:text-rose-400'
                              : bal < 0
                              ? 'bg-emerald-50 text-emerald-600 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-400'
                              : 'bg-slate-100 text-slate-600 border-slate-200 dark:bg-slate-800 dark:text-slate-400'
                          }`}
                        >
                          {bal > 0 ? `دائن: ${formatNumber(bal)} ج.م (له علينا)` : bal < 0 ? `مدين: ${formatNumber(Math.abs(bal))} ج.م (لنا عنده)` : 'متزن 0 ج.م'}
                        </span>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>

          {/* Operation Status */}
          <div className="md:col-span-2">
            <span className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">حالة العملية *</span>
            <Select value={receiptStatus} onValueChange={(v: any) => setReceiptStatus(v)}>
              <SelectTrigger className="w-full h-11 rounded-xl bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-xs font-bold">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="z-50 bg-surface border border-slate-200 dark:border-slate-800 rounded-xl shadow-xl">
                <SelectItem value="received">
                  <div className="flex items-center gap-2 text-emerald-600 font-bold">
                    <PackageCheck className="w-4 h-4" /> <span>تم الاستلام (يرفع المخزون فوراً)</span>
                  </div>
                </SelectItem>
                <SelectItem value="pending">
                  <div className="flex items-center gap-2 text-amber-600 font-bold">
                    <Truck className="w-4 h-4" /> <span>قيد الانتظار (في الطريق)</span>
                  </div>
                </SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Purchase Date */}
          <div className="md:col-span-2">
            <span className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">تاريخ الشراء *</span>
            <DatePicker value={purchaseDate} onChange={(d) => setPurchaseDate(d)} className="h-11 rounded-xl text-xs font-bold" />
          </div>

          {/* Supplier Ref Invoice Number */}
          <div className="md:col-span-2">
            <span className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">رقم مرجع المورد (فاتورة الشراء)</span>
            <div className="relative">
              <Input
                type="text"
                value={supplierInvoiceNumber}
                onChange={(e) => setSupplierInvoiceNumber(e.target.value)}
                placeholder="SUP-REF-44-1"
                className="h-11 bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-xs font-mono font-bold px-8"
              />
              <Hash className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            </div>
          </div>
        </div>
      </div>

      {/* Smart Product Search & Add Section (Matching Screenshot 3 & 4) */}
      <div className="bg-surface rounded-2xl border border-blue-200 dark:border-blue-900/60 p-4 shadow-sm space-y-3 relative">
        <div className="flex items-center justify-between gap-3">
          {/* Smart Fast Search Bar */}
          <div className="relative flex-1">
            <div className="relative">
              <Input
                ref={productSearchRef}
                type="text"
                value={productSearchQuery}
                onFocus={() => setIsProductDropdownOpen(true)}
                onChange={(e) => {
                  setProductSearchQuery(e.target.value);
                  setIsProductDropdownOpen(true);
                }}
                onKeyDown={handleProductSearchKeyDown}
                placeholder="ابحث باسم الصنف أو اسحب الباركود للإضافة (F4)..."
                className="h-12 bg-white dark:bg-slate-900 border-2 border-blue-500/80 rounded-2xl px-12 text-sm font-bold text-slate-900 dark:text-white shadow-sm focus:ring-4 focus:ring-blue-500/20"
              />
              <Search className="w-5 h-5 text-blue-600 absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none" />
              {productSearchQuery && (
                <button
                  type="button"
                  onClick={() => setProductSearchQuery('')}
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-1"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>

            {/* Smart Suggestions Floating Dropdown (Matching Screenshot 3) */}
            {isProductDropdownOpen && filteredProductSuggestions.length > 0 && (
              <div className="absolute right-0 left-0 top-full mt-2 bg-surface border-2 border-blue-500/80 rounded-2xl shadow-2xl z-50 overflow-hidden max-h-80 overflow-y-auto">
                {filteredProductSuggestions.map((p, idx) => {
                  const avail = stockMap[p.id] || 0;
                  const isPicked = idx === productHighlightedIndex;
                  return (
                    <div
                      key={p.id}
                      onClick={() => addProductToInvoice(p)}
                      className={`p-3.5 flex items-center justify-between border-b border-slate-100 dark:border-slate-800/80 last:border-0 cursor-pointer transition-all ${
                        isPicked ? 'bg-blue-600 text-white font-black' : 'hover:bg-slate-50 dark:hover:bg-slate-800/60'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <span className={`text-xs font-black ${isPicked ? 'text-white' : 'text-slate-900 dark:text-white'}`}>
                          {p.name}
                        </span>
                        {p.sku && (
                          <span className={`text-3xs font-mono px-2 py-0.5 rounded-md ${isPicked ? 'bg-blue-700 text-blue-100' : 'bg-slate-100 dark:bg-slate-800 text-slate-500'}`}>
                            {p.sku}
                          </span>
                        )}
                      </div>

                      <div className="flex items-center gap-4">
                        <span className={`text-3xs font-bold px-2 py-0.5 rounded-full ${avail > 0 ? (isPicked ? 'bg-emerald-500 text-white' : 'bg-emerald-50 text-emerald-700 border border-emerald-200') : (isPicked ? 'bg-red-500 text-white' : 'bg-red-50 text-red-700 border border-red-200')}`}>
                          رصيد: {avail} {unitsById[p.base_unit_id]?.symbol || 'قطعة'}
                        </span>
                        <span className={`text-xs font-mono font-black ${isPicked ? 'text-white' : 'text-emerald-600 dark:text-emerald-400'}`}>
                          {formatNumber(p.purchase_price || 0)} ج.م
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Items Table Section (Matching Screenshot 4) */}
      <div className="bg-surface rounded-2xl border border-slate-200/80 dark:border-slate-800 p-5 shadow-xs space-y-3">
        <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800/80 pb-3">
          <h3 className="text-xs font-black text-slate-900 dark:text-white flex items-center gap-2">
            <Receipt className="w-4 h-4 text-blue-600" />
            <span>أصناف الفاتورة ({lines.length})</span>
          </h3>
        </div>

        {formError && (
          <div className="rounded-xl bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800 px-4 py-3 text-xs font-bold text-red-700 dark:text-red-300 flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{formError}</span>
          </div>
        )}

        {lines.length === 0 ? (
          <div className="rounded-2xl border-2 border-dashed border-slate-200 dark:border-slate-800 py-12 text-center text-xs font-bold text-slate-400">
            أضف الأصناف المشتراة باستخدام شريط البحث أعلاه أو زر «إضافة صنف».
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-right text-xs">
              <thead>
                <tr className="border-b border-slate-200 dark:border-slate-800 text-slate-500 dark:text-slate-400 font-black text-3xs uppercase tracking-wider">
                  <th className="py-2.5 px-2 w-10">#</th>
                  <th className="py-2.5 px-2">الصنف والباركود</th>
                  <th className="py-2.5 px-2 w-32">الوحدة والمخزون</th>
                  <th className="py-2.5 px-2 w-24">الكمية</th>
                  <th className="py-2.5 px-2 w-28">سعر الشراء</th>
                  <th className="py-2.5 px-2 w-20">خصم %</th>
                  <th className="py-2.5 px-2 w-28">سعر البيع</th>
                  <th className="py-2.5 px-2 w-32">تاريخ الصلاحية</th>
                  <th className="py-2.5 px-2 w-28 text-left">إجمالي</th>
                  <th className="py-2.5 px-2 w-10 text-center"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {lines.map((line, idx) => {
                  const p = products.find((x) => x.id === line.productId);
                  const lineNet = calculateLineNet(line);
                  const availStock = stockMap[line.productId] || 0;

                  return (
                    <tr key={line.id || idx} className="hover:bg-slate-50/70 dark:hover:bg-slate-900/40 transition-colors">
                      <td className="py-3 px-2 font-mono font-black text-slate-400">
                        {idx + 1}
                      </td>

                      <td className="py-3 px-2">
                        <div className="space-y-0.5">
                          <span className="block font-black text-slate-900 dark:text-white text-xs">{line.productName}</span>
                          <div className="flex items-center gap-2">
                            {line.sku && <span className="text-4xs font-mono text-slate-400">{line.sku}</span>}
                            <span className="text-4xs font-bold text-blue-600 dark:text-blue-400">
                              رصيد: {availStock} {unitsById[line.unitId]?.symbol || 'قطعة'}
                            </span>
                          </div>
                        </div>
                      </td>

                      <td className="py-3 px-2">
                        <Select
                          value={line.unitId}
                          onValueChange={(val) => onUnitChange(idx, val)}
                        >
                          <SelectTrigger className="w-full h-9 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-xs font-bold shadow-2xs">
                            <SelectValue placeholder="الوحدة..." />
                          </SelectTrigger>
                          <SelectContent className="z-50 bg-surface border border-slate-200 dark:border-slate-800 rounded-xl shadow-xl">
                            {(unitOptions[line.productId] || []).map((u) => (
                              <SelectItem key={u.unitId} value={u.unitId} className="text-xs font-bold cursor-pointer">
                                {unitsById[u.unitId]?.symbol || 'وحدة'}{u.factor !== 1 ? ` (×${u.factor})` : ''}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </td>

                      <td className="py-3 px-2">
                        <Input
                          type="number"
                          min={0.001}
                          step="any"
                          value={line.qty}
                          onChange={(e) => updateLine(idx, { qty: e.target.value })}
                          className="h-9 bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-xs font-mono font-black text-center"
                        />
                      </td>

                      <td className="py-3 px-2">
                        <Input
                          type="number"
                          min={0}
                          step="any"
                          value={line.cost}
                          onChange={(e) => updateLine(idx, { cost: e.target.value })}
                          className="h-9 bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-xs font-mono font-black"
                        />
                      </td>

                      <td className="py-3 px-2">
                        <Input
                          type="number"
                          min={0}
                          max={100}
                          step="any"
                          value={line.discountPercent}
                          onChange={(e) => updateLine(idx, { discountPercent: e.target.value })}
                          className="h-9 bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-xs font-mono font-black text-center"
                        />
                      </td>

                      <td className="py-3 px-2">
                        <Input
                          type="number"
                          min={0}
                          step="any"
                          value={line.salePrice}
                          onChange={(e) => updateLine(idx, { salePrice: e.target.value })}
                          className="h-9 bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-xs font-mono font-black text-emerald-600 dark:text-emerald-400"
                        />
                      </td>

                      <td className="py-3 px-2">
                        <DatePicker
                          value={line.expiryDate}
                          onChange={(d) => updateLine(idx, { expiryDate: d })}
                          className="h-9 text-3xs font-bold"
                          placeholder="تاريخ الصلاحية..."
                        />
                      </td>

                      <td className="py-3 px-2 text-left font-mono font-black text-xs text-blue-600 dark:text-blue-400" dir="ltr">
                        {formatNumber(lineNet)}
                      </td>

                      <td className="py-3 px-2 text-center">
                        <button
                          type="button"
                          onClick={() => removeLine(idx)}
                          className="w-7 h-7 rounded-lg text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/40 flex items-center justify-center transition-colors mx-auto cursor-pointer"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Totals & Payment Footer Bar (Matching Screenshot 4) */}
      <div className="bg-surface rounded-2xl border border-slate-200/80 dark:border-slate-800 p-5 shadow-xs space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-3 items-end">
          {/* Additional Discount */}
          <div>
            <span className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">خصم إضافي على الفاتورة</span>
            <Input
              type="number"
              min={0}
              step="any"
              value={additionalDiscount}
              onChange={(e) => setAdditionalDiscount(e.target.value)}
              className="h-10 bg-slate-50 dark:bg-slate-900 text-sm font-mono font-bold"
              placeholder="0.00"
            />
          </div>

          {/* Subtotal */}
          <div>
            <span className="block text-xs font-bold text-slate-500 mb-1">إجمالي الأصناف</span>
            <div className="h-10 px-3 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 flex items-center text-sm font-mono font-black text-slate-900 dark:text-white">
              {formatNumber(subtotal)} ج.م
            </div>
          </div>

          {/* Treasury Selector */}
          <div>
            <span className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">حساب السداد (الخزينة)</span>
            <Select value={treasuryId} onValueChange={setTreasuryId}>
              <SelectTrigger className="w-full h-10 rounded-xl bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-xs font-bold">
                <SelectValue placeholder="اختر الخزينة..." />
              </SelectTrigger>
              <SelectContent className="z-50 bg-surface border border-slate-200 dark:border-slate-800 rounded-xl shadow-xl">
                {treasuries.map((t) => (
                  <SelectItem key={t.id} value={t.id}>
                    {t.name} ({formatNumber(t.current_balance)} ج.م)
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Net Total */}
          <div>
            <span className="block text-xs font-bold text-slate-500 mb-1">الصافي المطلوب</span>
            <div className="h-10 px-3 rounded-xl bg-blue-50 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-800 flex items-center text-base font-mono font-black text-blue-600 dark:text-blue-400">
              {formatNumber(total)} ج.م
            </div>
          </div>
        </div>

        {/* Paid Cash / Remaining Summary & Action Bar */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 pt-2 bg-slate-50/80 dark:bg-slate-900/60 p-4 rounded-2xl border border-slate-200/80 dark:border-slate-800 items-center">
          <div>
            <span className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">المبلغ المدفوع كاش للمورد</span>
            <Input
              type="number"
              min={0}
              max={total}
              step="any"
              value={customPaidAmount}
              onChange={(e) => setCustomPaidAmount(e.target.value)}
              className="h-10 bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-sm font-mono font-black text-emerald-600 dark:text-emerald-400"
            />
          </div>

          <div className="flex items-center justify-between p-3 rounded-xl bg-indigo-500/10 border border-indigo-500/20">
            <span className="text-xs font-bold text-indigo-700 dark:text-indigo-300">
              📋 المتبقي كآجل / ديون على المنشأة:
            </span>
            <span className="text-sm font-mono font-black text-indigo-600 dark:text-indigo-400">
              {formatNumber(remainingVal)} ج.م
            </span>
          </div>

          <Button
            disabled={isSaving}
            onClick={save}
            className="h-11 px-8 rounded-xl text-xs font-black bg-blue-600 hover:bg-blue-700 text-white shadow-lg shadow-blue-600/25 transition-all cursor-pointer flex items-center justify-center gap-2"
          >
            <CheckCircle2 className="w-4 h-4" />
            <span>{isSaving ? 'جارٍ الاعتماد والحفظ...' : 'اعتماد وحفظ الفاتورة'}</span>
          </Button>
        </div>
      </div>

      {/* Quick Add Supplier Modal */}
      <Dialog open={isAddSupplierModalOpen} onOpenChange={setIsAddSupplierModalOpen}>
        <DialogContent className="max-w-md rounded-2xl p-5" dir="rtl">
          <DialogHeader>
            <DialogTitle className="text-sm font-black text-slate-900 dark:text-white flex items-center gap-2">
              <Truck className="w-4 h-4 text-blue-600" />
              <span>إضافة مورد جديد</span>
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-3 py-2">
            <div>
              <span className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">اسم المورد / الشركة *</span>
              <Input
                type="text"
                value={newSupplierName}
                onChange={(e) => setNewSupplierName(e.target.value)}
                placeholder="اسم المورد..."
                className="h-10 text-xs font-bold"
              />
            </div>
            <div>
              <span className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">رقم الهاتف</span>
              <Input
                type="text"
                value={newSupplierPhone}
                onChange={(e) => setNewSupplierPhone(e.target.value)}
                placeholder="رقم الهاتف (اختياري)..."
                className="h-10 text-xs font-bold font-mono"
              />
            </div>
          </div>

          <DialogFooter className="gap-2">
            <Button onClick={handleQuickAddSupplier} className="h-10 px-6 bg-blue-600 text-white font-bold text-xs rounded-xl">
              حفظ المورد
            </Button>
            <Button variant="outline" onClick={() => setIsAddSupplierModalOpen(false)} className="h-10 px-4 font-bold text-xs rounded-xl">
              إلغاء
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
