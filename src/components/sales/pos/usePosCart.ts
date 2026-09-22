import React, { useState, useMemo, useEffect, useRef, useCallback } from 'react';
import { toast } from 'sonner';
import { ScaleManager, ScaleConfig } from '@/lib/scale_manager';
import type { Product, ProductBatch, Unit } from '@/types';
import type { CartLine, HeldSale, UnitOption } from './types';

interface UsePosCartParams {
  products: Product[];
  unitOptions: Record<string, UnitOption[]>;
  batches: Record<string, ProductBatch[]>;
  stock: Record<string, number>;
  activeShift: any;
  scaleConfig: ScaleConfig;
  setIsShiftModalOpen: (open: boolean) => void;
  orgId: string;
  enableTax?: boolean;
  vatRate?: number;
  isTaxInclusive?: boolean;
}

export function usePosCart({
  products,
  unitOptions,
  batches,
  stock,
  activeShift,
  scaleConfig,
  setIsShiftModalOpen,
  orgId,
  enableTax = false,
  vatRate = 0,
  isTaxInclusive = false,
}: UsePosCartParams) {
  const [cart, setCart] = useState<CartLine[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [customerMode, setCustomerMode] = useState<'cash' | 'customer' | 'both' | 'supplier'>('cash');
  const [selectedCustomerId, setSelectedCustomerId] = useState<string>('');
  const [priceTier, setPriceTier] = useState<string>('default');
  const [globalDiscount, setGlobalDiscount] = useState<number>(0);
  const [shippingFee, setShippingFee] = useState<number>(0);
  const [notes, setNotes] = useState('');
  const [isReadingScale, setIsReadingScale] = useState(false);
  const [heldSales, setHeldSales] = useState<HeldSale[]>([]);
  const [activeReturnInvoice, setActiveReturnInvoice] = useState<any | null>(null);
  const [lastAddedKey, setLastAddedKey] = useState<string | null>(null);

  const searchInputRef = useRef<HTMLInputElement>(null);

  // Load held sales from localStorage
  useEffect(() => {
    if (!orgId) return;
    try {
      const saved = localStorage.getItem(`falcon_held_sales_${orgId}`);
      if (saved) {
        setHeldSales(JSON.parse(saved));
      }
    } catch (e) {
      console.error('Failed to load held sales:', e);
    }
  }, [orgId]);

  const saveHeldSalesToStorage = (updated: HeldSale[]) => {
    setHeldSales(updated);
    if (orgId) {
      localStorage.setItem(`falcon_held_sales_${orgId}`, JSON.stringify(updated));
    }
  };

  /**
   * Helper to calculate max available quantity in the line's chosen unit and batch
   */
  const getMaxAvailableForLine = useCallback(
    (productId: string, unitId: string, factor: number, batchId?: string): number => {
      const prod = products.find((p) => p.id === productId);
      if (!prod) return 0;
      if (prod.item_type !== 'storable') return 999999; // Non-storable / Service items have no stock limits

      const unitFactor = factor > 0 ? factor : 1;

      // 1. If a specific batch is chosen and product tracks batches
      if (batchId && prod.tracks_batch) {
        const prodBatches = batches[productId] || [];
        const chosenBatch = prodBatches.find((b) => b.id === batchId);
        if (chosenBatch) {
          const batchQtyInBase = chosenBatch.current_quantity;
          return Math.max(0, Number((batchQtyInBase / unitFactor).toFixed(3)));
        }
      }

      // 2. Otherwise calculate based on total warehouse stock for this product
      const baseStock = stock[productId] || 0;
      return Math.max(0, Number((baseStock / unitFactor).toFixed(3)));
    },
    [products, batches, stock]
  );

  const availableFor = (pId: string, unitId?: string, factor?: number, batchId?: string) => {
    const prod = products.find((p) => p.id === pId);
    if (!prod) return 0;
    if (prod.item_type !== 'storable') return 999999;
    return getMaxAvailableForLine(pId, unitId || prod.base_unit_id, factor || 1, batchId);
  };

  // Search Results
  const searchResults = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return [];
    return products
      .filter(
        (p) =>
          p.name.toLowerCase().includes(q) ||
          p.sku.toLowerCase().includes(q)
      )
      .slice(0, 8);
  }, [products, searchQuery]);

  // Add Product to Cart
  const addToCart = (
    product: Product,
    options?: {
      unitId?: string;
      price?: number;
      factor?: number;
      qty?: number;
      batchId?: string;
      priceTier?: 'default' | 'old' | 'wholesale';
    }
  ) => {
    if (!activeShift) {
      toast.error('يرجى فتح وردية كاشير أولاً للبدء بالبيع وإضافة الأصناف');
      setIsShiftModalOpen(true);
      return;
    }

    const opt = options?.unitId
      ? (unitOptions[product.id] || []).find((u) => u.unitId === options.unitId)
      : (unitOptions[product.id] || [])[0];

    const targetUnitId = options?.unitId || opt?.unitId || product.base_unit_id;
    const factor = options?.factor || opt?.factor || 1;
    const qtyToAdd = options?.qty !== undefined ? options.qty : 1;

    // Determine batch (FEFO - pick first batch with current_quantity > 0)
    let batchId = options?.batchId || '';
    if (product.tracks_batch && !batchId) {
      const cands = (batches[product.id] || []).filter((b) => b.current_quantity > 0);
      batchId = cands[0]?.id || '';
    }

    // Check maximum available stock
    const maxAvail = getMaxAvailableForLine(product.id, targetUnitId, factor, batchId);

    if (product.item_type === 'storable' && maxAvail <= 0) {
      toast.error(`⚠️ الصنف «${product.name}» غير متوفر بالمخزن حالياً (الرصيد: 0)`);
      return;
    }

    // Check if line already exists in cart with same product, unit, and batch
    const existingIndex = cart.findIndex(
      (l) => l.productId === product.id && l.unitId === targetUnitId && l.batchId === batchId
    );

    if (existingIndex > -1) {
      const updated = [...cart];
      const currentQty = updated[existingIndex].qty;
      const targetQty = currentQty + qtyToAdd;

      if (product.item_type === 'storable' && targetQty > maxAvail) {
        updated[existingIndex].qty = maxAvail;
        toast.warning(
          `⚠️ الكمية المطلوبة تتجاوز الرصيد المتاح بالمخزن (${maxAvail}) - تم ضبط الكمية إلى ${maxAvail}`
        );
      } else {
        updated[existingIndex].qty = Number(targetQty.toFixed(3));
        toast.success(`تم تحديث كمية «${product.name}» إلى ${updated[existingIndex].qty}`);
      }

      setCart(updated);
      setLastAddedKey(updated[existingIndex].key);
      setSearchQuery('');
      setIsSearchOpen(false);
      return;
    }

    // New item line
    const key = `${product.id}_${targetUnitId}_${batchId || 'nobatch'}_${Date.now()}`;
    const clampedQty = product.item_type === 'storable' ? Math.min(qtyToAdd, maxAvail) : qtyToAdd;

    if (product.item_type === 'storable' && qtyToAdd > maxAvail) {
      toast.warning(
        `⚠️ الكمية المطلوبة (${qtyToAdd}) تتجاوز الرصيد المتاح (${maxAvail}) - تم ضبط الكمية إلى ${maxAvail}`
      );
    }

    let itemPrice = Number(options?.price ?? opt?.price ?? product.sale_price ?? 0);
    let lineTier: 'default' | 'old' | 'wholesale' = options?.priceTier || 'default';
    if (priceTier === 'wholesale' && product.wholesale_price) {
      itemPrice = product.wholesale_price * factor;
      lineTier = 'wholesale';
    } else if (options?.priceTier === 'old' && product.has_dual_pricing && product.old_sale_price) {
      itemPrice = product.old_sale_price * factor;
      lineTier = 'old';
    }

    // Tax rate is strictly 0 if enableTax is false (tax is optional!).
    // If enableTax is true and product is taxable, use product's tax_rate or organization default vatRate.
    const resolvedTaxRate = enableTax && product.is_taxable !== false
      ? (product.tax_rate !== undefined && product.tax_rate !== null ? product.tax_rate : vatRate)
      : 0;

    // FIFO cost: when a specific batch/lot is picked (FEFO-first), the line cost
    // follows the ACTUAL batch cost (per base unit) instead of the card cost,
    // so stock valuation, COGS and the profit report stay consistent with the
    // lot actually consumed (same intent as FifoValuationService).
    const chosenBatch = batchId ? (batches[product.id] || []).find((b) => b.id === batchId) : undefined;
    const lineCost =
      chosenBatch?.purchase_price !== undefined && chosenBatch.purchase_price > 0
        ? chosenBatch.purchase_price
        : product.purchase_price || 0;

    setCart((prev) => [
      ...prev,
      {
        key,
        productId: product.id,
        batchId,
        unitId: targetUnitId,
        factor,
        qty: clampedQty,
        price: itemPrice,
        discount: 0,
        cost: lineCost,
        taxRate: resolvedTaxRate,
        priceTier: lineTier,
      },
    ]);

    setLastAddedKey(key);
    setSearchQuery('');
    setIsSearchOpen(false);
    toast.success(`تمت إضافة «${product.name}» (${clampedQty}) للسلة`);
  };

  // Direct Barcode Scan / Enter Key (Supports standard barcodes & electronic scale barcodes)
  const handleSearchKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      const q = searchQuery.trim();
      if (!q) return;

      // 1. Try scale barcode parsing if scale integration enabled
      if (scaleConfig.enabled) {
        const parsedScale = ScaleManager.parseBarcode(q, scaleConfig);
        if (parsedScale.isScale && parsedScale.plu) {
          const pluStr = parsedScale.plu;
          const rawPluStr = parsedScale.rawPlu || '';
          const scaleProduct = products.find(
            (p) =>
              (p.scale_code && p.scale_code.trim() === pluStr) ||
              p.sku.toLowerCase() === pluStr.toLowerCase() ||
              (rawPluStr && p.sku === rawPluStr)
          );

          if (scaleProduct) {
            if (parsedScale.weight !== undefined) {
              addToCart(scaleProduct, { qty: parsedScale.weight });
              toast.success(`⚖️ باركود ميزان: «${scaleProduct.name}» (وزن: ${parsedScale.weight} كجم)`);
              return;
            } else if (parsedScale.price !== undefined) {
              const unitPrice = scaleProduct.sale_price || 1;
              const calculatedQty = Number((parsedScale.price / unitPrice).toFixed(3));
              addToCart(scaleProduct, { qty: calculatedQty });
              toast.success(`⚖️ باركود ميزان: «${scaleProduct.name}» (سعر: ${parsedScale.price} ج.م | وزن: ${calculatedQty} كجم)`);
              return;
            }
          }
        }
      }

      // Exact barcode or SKU match
      const exact = products.find(
        (p) => p.sku.toLowerCase() === q.toLowerCase()
      );

      if (exact) {
        addToCart(exact);
      } else if (searchResults.length > 0) {
        addToCart(searchResults[0]);
      } else {
        toast.error(`لا يوجد صنف مسجل بهذا الكود: «${q}»`);
      }
    }
  };

  // Read Live Weight from USB/Serial Scale (Web Serial API)
  const handleReadLiveWeight = async (targetLineKey?: string) => {
    if (cart.length === 0) {
      toast.warning('يرجى إضافة صنف وزني أولاً إلى السلة لقراءة وزنه من الميزان');
      return;
    }

    setIsReadingScale(true);
    try {
      const res = await ScaleManager.readLiveWeightFromSerial(scaleConfig.baudRate);
      if (res.success && res.weight && res.weight > 0) {
        const weight = res.weight;
        const targetIndex = targetLineKey
          ? cart.findIndex((l) => l.key === targetLineKey)
          : cart.length - 1;

        if (targetIndex >= 0) {
          const updated = [...cart];
          const line = updated[targetIndex];
          const prod = products.find((p) => p.id === line.productId);
          const maxAvail = getMaxAvailableForLine(line.productId, line.unitId, line.factor, line.batchId);

          if (prod?.item_type === 'storable' && weight > maxAvail) {
            updated[targetIndex].qty = maxAvail;
            toast.warning(`⚖️ وزن الميزان (${weight} كجم) يتجاوز الرصيد المتاح (${maxAvail}) - تم الضبط إلى ${maxAvail}`);
          } else {
            updated[targetIndex].qty = weight;
            toast.success(`⚖️ تم سحب وزن الميزان: ${weight} كجم لصالح «${prod?.name || ''}»`);
          }

          setCart(updated);
        }
      } else {
        toast.error(res.error || 'لم يتم استلام قراءة وزن صالحة من الميزان الإلكتروني');
      }
    } catch (err: any) {
      toast.error(err.message || 'تعذر الاتصال بالميزان الإلكتروني عبر منفذ COM/Serial');
    } finally {
      setIsReadingScale(false);
    }
  };

  // Return Mode Operations
  const startInvoiceReturn = (
    invoice: any,
    items: Array<{
      productId: string;
      batchId?: string;
      unitId: string;
      factor: number;
      qty: number;
      price: number;
      discount: number;
      cost: number;
      taxRate: number;
    }>
  ) => {
    setActiveReturnInvoice(invoice);
    if (invoice.customer_id) {
      setSelectedCustomerId(invoice.customer_id);
      setCustomerMode('customer');
    } else {
      setSelectedCustomerId('');
      setCustomerMode('cash');
    }

    const returnCart: CartLine[] = items.map((item, idx) => ({
      key: `return_${item.productId}_${idx}_${Date.now()}`,
      productId: item.productId,
      batchId: item.batchId || '',
      unitId: item.unitId,
      factor: item.factor || 1,
      qty: item.qty,
      price: item.price,
      discount: item.discount || 0,
      cost: item.cost || 0,
      taxRate: item.taxRate || 0,
      maxReturnQty: item.qty,
      isReturnLine: true,
    }));

    setCart(returnCart);
    setGlobalDiscount(0);
  };

  const cancelReturnMode = () => {
    setActiveReturnInvoice(null);
    setCart([]);
    setGlobalDiscount(0);
    setSelectedCustomerId('');
    setCustomerMode('cash');
    toast.info('تم إلغاء وضع المرتجع والعودة لوضع البيع العادي');
  };

  // Cart Manipulations with Stock Limits & Auto-Clamping
  const updateQty = (key: string, delta: number) => {
    setCart((prev) =>
      prev
        .map((l) => {
          if (l.key !== key) return l;

          const prod = products.find((p) => p.id === l.productId);
          const next = Number((l.qty + delta).toFixed(3));

          // Return line check
          if (l.maxReturnQty !== undefined) {
            if (next > l.maxReturnQty) {
              toast.warning(`الكمية المتاحة للإرجاع هي ${l.maxReturnQty} فقط`);
              return { ...l, qty: l.maxReturnQty };
            }
            return next > 0 ? { ...l, qty: next } : null;
          }

          // Storable normal sale line limit check
          if (prod?.item_type === 'storable') {
            const maxAvail = getMaxAvailableForLine(l.productId, l.unitId, l.factor, l.batchId);
            if (delta > 0 && next > maxAvail) {
              toast.warning(`⚠️ الكمية المتاحة بالمخزن هي ${maxAvail} فقط - تم ضبط الكمية`);
              return { ...l, qty: maxAvail };
            }
          }

          return next > 0 ? { ...l, qty: next } : null;
        })
        .filter(Boolean) as CartLine[]
    );
  };

  const setLineQty = (key: string, qty: number) => {
    const validQty = Math.max(0.001, qty);
    setCart((prev) =>
      prev.map((l) => {
        if (l.key !== key) return l;

        const prod = products.find((p) => p.id === l.productId);

        if (l.maxReturnQty !== undefined && validQty > l.maxReturnQty) {
          toast.warning(`الكمية المتاحة للإرجاع هي ${l.maxReturnQty} فقط`);
          return { ...l, qty: l.maxReturnQty };
        }

        if (prod?.item_type === 'storable') {
          const maxAvail = getMaxAvailableForLine(l.productId, l.unitId, l.factor, l.batchId);
          if (validQty > maxAvail) {
            toast.warning(
              `⚠️ الكمية المطلوبة (${validQty}) تتجاوز الرصيد المتاح بالمخزن (${maxAvail}) - تم ضبط الكمية إلى ${maxAvail}`
            );
            return { ...l, qty: maxAvail };
          }
        }

        return { ...l, qty: validQty };
      })
    );
  };

  const setLineBatch = (key: string, newBatchId: string) => {
    setCart((prev) =>
      prev.map((l) => {
        if (l.key !== key) return l;

        const prod = products.find((p) => p.id === l.productId);
        const prodBatches = batches[l.productId] || [];
        const chosenBatch = prodBatches.find((b) => b.id === newBatchId);

        let newPrice = l.price;
        if ((chosenBatch as any)?.sale_price && (chosenBatch as any).sale_price > 0) {
          newPrice = (chosenBatch as any).sale_price * l.factor;
        }

        // FIFO cost: re-anchor the line cost to the batch actually consumed.
        const newCost =
          chosenBatch?.purchase_price !== undefined && chosenBatch.purchase_price > 0
            ? chosenBatch.purchase_price
            : l.cost;

        let clampedQty = l.qty;
        if (prod?.item_type === 'storable') {
          const maxAvail = getMaxAvailableForLine(l.productId, l.unitId, l.factor, newBatchId);
          if (l.qty > maxAvail) {
            clampedQty = maxAvail;
            toast.warning(
              `⚠️ رصيد الدفعة المحددة هو ${maxAvail} فقط - تم ضبط الكمية إلى ${maxAvail}`
            );
          }
        }

        return {
          ...l,
          batchId: newBatchId,
          price: newPrice,
          cost: newCost,
          qty: clampedQty,
        };
      })
    );
  };

  const handleUnitChange = (key: string, newUnitId: string, factor: number, price?: number) => {
    setCart((prev) =>
      prev.map((l) => {
        if (l.key !== key) return l;

        const prod = products.find((p) => p.id === l.productId);
        const newFactor = factor > 0 ? factor : 1;
        const newPrice = price ?? l.price;

        let clampedQty = l.qty;
        if (prod?.item_type === 'storable') {
          const maxAvail = getMaxAvailableForLine(l.productId, newUnitId, newFactor, l.batchId);
          if (l.qty > maxAvail) {
            clampedQty = maxAvail;
            toast.warning(
              `⚠️ الرصيد المتاح بالوحدة الجديدة هو ${maxAvail} فقط - تم ضبط الكمية إلى ${maxAvail}`
            );
          }
        }

        return {
          ...l,
          unitId: newUnitId,
          factor: newFactor,
          price: newPrice,
          qty: clampedQty,
        };
      })
    );
  };

  const setLineDiscount = (key: string, discount: number) => {
    const validDiscount = Math.max(0, discount);
    setCart((prev) =>
      prev.map((l) => (l.key === key ? { ...l, discount: validDiscount } : l))
    );
  };

  const toggleLinePriceTier = (key: string) => {
    setCart((prev) =>
      prev.map((l) => {
        if (l.key !== key) return l;
        const prod = products.find((p) => p.id === l.productId);
        if (!prod) return l;

        const movingToOld = l.priceTier !== 'old';
        const hasOld = prod.has_dual_pricing && Number(prod.old_sale_price) > 0;
        if (!hasOld) return l;

        const newPrice = movingToOld
          ? Number(prod.old_sale_price) * l.factor
          : Number(prod.sale_price) * l.factor;

        return { ...l, price: newPrice, priceTier: movingToOld ? 'old' : 'default' };
      })
    );
  };

  const removeLine = (key: string) => {
    setCart((prev) => prev.filter((l) => l.key !== key));
    toast.info('تم حذف الصنف من الفاتورة');
  };

  const clearCart = () => {
    if (activeReturnInvoice) {
      cancelReturnMode();
      return;
    }
    if (cart.length === 0) return;
    setCart([]);
    setGlobalDiscount(0);
    setShippingFee(0);
    toast.info('تم إلغاء وتفريغ الفاتورة (F12)');
  };

  // Hold Sale Operations
  const holdCurrentSale = (customerName?: string) => {
    if (cart.length === 0) {
      toast.warning('لا توجد أصناف في السلة لتعليقها');
      return;
    }
    const newHeld: HeldSale = {
      id: `held_${Date.now()}`,
      createdAt: new Date().toISOString(),
      customerName: customerName || (customerMode === 'cash' ? 'عميل نقدي' : undefined),
      customerId: selectedCustomerId || undefined,
      customerMode,
      cart: [...cart],
      globalDiscount,
      notes,
      total,
    };
    const updated = [newHeld, ...heldSales];
    saveHeldSalesToStorage(updated);
    clearCart();
    toast.success('تم تعليق الفاتورة الحالية بنجاح');
  };

  const resumeHeldSale = (heldId: string) => {
    const target = heldSales.find((h) => h.id === heldId);
    if (!target) return;

    if (cart.length > 0) {
      holdCurrentSale('معلقة تلقائياً قبل الاسترجاع');
    }

    setCart(target.cart);
    setGlobalDiscount(target.globalDiscount || 0);
    setShippingFee(0);
    setNotes(target.notes || '');
    if (target.customerId) {
      setSelectedCustomerId(target.customerId);
      setCustomerMode(target.customerMode || 'customer');
    } else {
      setSelectedCustomerId('');
      setCustomerMode('cash');
    }

    const updated = heldSales.filter((h) => h.id !== heldId);
    saveHeldSalesToStorage(updated);
    toast.success('تم استرجاع الفاتورة المعلقة بنجاح');
  };

  const deleteHeldSale = (heldId: string) => {
    const updated = heldSales.filter((h) => h.id !== heldId);
    saveHeldSalesToStorage(updated);
    toast.info('تم حذف الفاتورة المعلقة');
  };

  // Calculations
  const lineProduct = (line: CartLine) => products.find((p) => p.id === line.productId);
  const lineSubtotal = (line: CartLine) => line.qty * line.price;
  const lineTotal = (line: CartLine) => lineSubtotal(line) - line.discount;

  const subtotal = useMemo(() => cart.reduce((sum, l) => sum + lineSubtotal(l), 0), [cart]);
  const itemDiscounts = useMemo(() => cart.reduce((sum, l) => sum + l.discount, 0), [cart]);
  const totalDiscount = itemDiscounts + globalDiscount;
  const totalTax = useMemo(() => {
    if (!enableTax) return 0;
    return cart.reduce((sum, l) => {
      const taxable = lineTotal(l);
      return sum + (taxable * (l.taxRate || 0)) / 100;
    }, 0);
  }, [cart, enableTax]);
  const total = Math.max(0, subtotal - totalDiscount) + totalTax + shippingFee;

  return {
    cart,
    setCart,
    searchQuery,
    setSearchQuery,
    isSearchOpen,
    setIsSearchOpen,
    searchResults,
    searchInputRef,
    customerMode,
    setCustomerMode,
    selectedCustomerId,
    setSelectedCustomerId,
    priceTier,
    setPriceTier,
    globalDiscount,
    setGlobalDiscount,
    shippingFee,
    setShippingFee,
    notes,
    setNotes,
    isReadingScale,
    heldSales,
    activeReturnInvoice,
    setActiveReturnInvoice,
    startInvoiceReturn,
    cancelReturnMode,
    availableFor,
    getMaxAvailableForLine,
    addToCart,
    handleSearchKeyDown,
    handleReadLiveWeight,
    updateQty,
    setLineQty,
    setLineBatch,
    handleUnitChange,
    setLineDiscount,
    toggleLinePriceTier,
    removeLine,
    clearCart,
    holdCurrentSale,
    resumeHeldSale,
    deleteHeldSale,
    lastAddedKey,
    setLastAddedKey,
    lineProduct,
    lineSubtotal,
    lineTotal,
    subtotal,
    itemDiscounts,
    totalDiscount,
    totalTax,
    total,
  };
}
