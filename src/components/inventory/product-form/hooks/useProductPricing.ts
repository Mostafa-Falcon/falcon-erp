import { useState } from 'react';
import { toast } from 'sonner';
import type { Product, ProductUnit, Unit } from '@/types';
import type { UnitLevelItem } from '../types';

interface UseProductPricingProps {
  initial?: Product;
  initialUnits?: ProductUnit[];
  units: Unit[];
  isPharmacy?: boolean;
}

export function useProductPricing({
  initial,
  initialUnits = [],
  units,
  isPharmacy = false,
}: UseProductPricingProps) {
  // =========================================================================
  // 1. حالة وحدات القطع (مستويات الوحدات)
  // =========================================================================
  const [unitLevels, setUnitLevels] = useState<UnitLevelItem[]>(() => {
    if (initial) {
      const baseUnitName = units.find((u) => u.id === initial.base_unit_id)?.name || '';
      const initialPurchase = initial.raw_purchase_price !== undefined
        ? String(initial.raw_purchase_price)
        : (initial.purchase_price !== undefined ? String(initial.purchase_price) : '');
      const initialDiscount = initial.purchase_discount_value !== undefined
        ? String(initial.purchase_discount_value)
        : '';
      const initialDiscType = initial.purchase_discount_type || 'percent';

      const level1: UnitLevelItem = {
        id: 'level-1',
        unitName: baseUnitName,
        conversionFactor: '1',
        openingStock: '',
        allowSale: true,
        purchasePrice: initialPurchase,
        discountValue: initialDiscount,
        discountType: initialDiscType,
        dualPricing: initial.has_dual_pricing ?? !!initial.old_sale_price,
        salePrice: initial.sale_price !== undefined ? String(initial.sale_price) : '',
        oldSalePrice: initial.old_sale_price !== undefined ? String(initial.old_sale_price) : '',
        newSalePrice: initial.sale_price !== undefined ? String(initial.sale_price) : '',
      };

      if (initialUnits && initialUnits.length > 0) {
        return [
          level1,
          ...initialUnits.slice(0, 2).map((u, idx) => ({
            id: u.id || `level-${idx + 2}`,
            unitName: units.find((un) => un.id === u.unit_id)?.name || '',
            conversionFactor: String(u.conversion_factor || 1),
            openingStock: '',
            allowSale: u.is_default_sale ?? true,
            purchasePrice: u.raw_purchase_price !== undefined
              ? String(u.raw_purchase_price)
              : (u.purchase_price !== undefined ? String(u.purchase_price) : ''),
            discountValue: u.purchase_discount_value !== undefined
              ? String(u.purchase_discount_value)
              : '',
            discountType: (u.purchase_discount_type || 'percent') as 'percent' | 'amount',
            dualPricing: u.has_dual_pricing ?? !!u.old_sale_price,
            salePrice: u.sale_price !== undefined ? String(u.sale_price) : '',
            oldSalePrice: u.old_sale_price !== undefined ? String(u.old_sale_price) : '',
            newSalePrice: u.sale_price !== undefined ? String(u.sale_price) : '',
          })),
        ];
      }
      return [level1];
    }
    return [
      {
        id: 'level-1',
        unitName: isPharmacy ? 'علبة' : '',
        conversionFactor: '1',
        openingStock: '',
        allowSale: true,
        purchasePrice: '',
        discountValue: '',
        discountType: 'percent',
        dualPricing: false,
        salePrice: '',
        oldSalePrice: '',
        newSalePrice: '',
      },
    ];
  });

  // =========================================================================
  // 2. حالة الوزن (كيلو / ميزان إلكتروني)
  // =========================================================================
  const weightUnitName = 'كيلوجرام (كجم)';
  const [scaleCode, setScaleCode] = useState(initial?.scale_code || '');
  const [weightOpeningStock, setWeightOpeningStock] = useState('');
  const [weightPurchasePrice, setWeightPurchasePrice] = useState(
    initial?.raw_purchase_price !== undefined
      ? String(initial.raw_purchase_price)
      : (initial?.purchase_price !== undefined ? String(initial.purchase_price) : '')
  );
  const [weightDiscount, setWeightDiscount] = useState(
    initial?.purchase_discount_value !== undefined ? String(initial.purchase_discount_value) : ''
  );
  const [weightDiscountType, setWeightDiscountType] = useState<'percent' | 'amount'>(
    initial?.purchase_discount_type || 'percent'
  );
  const [weightSalePrice, setWeightSalePrice] = useState(
    initial?.sale_price !== undefined ? String(initial.sale_price) : ''
  );
  const [weightOldSalePrice, setWeightOldSalePrice] = useState(
    initial?.old_sale_price !== undefined ? String(initial.old_sale_price) : ''
  );
  const [weightNewSalePrice, setWeightNewSalePrice] = useState(
    initial?.sale_price !== undefined ? String(initial.sale_price) : ''
  );
  const [weightDualPricing, setWeightDualPricing] = useState(
    initial?.has_dual_pricing ?? !!initial?.old_sale_price
  );

  // إضافة مستوى وحدة أصغر (بحد أقصى 3 مستويات)
  const handleAddSmallerUnit = () => {
    if (unitLevels.length >= 3) {
      toast.warning('الحد الأقصى للوحدات هو 3 مستويات فقط.');
      return;
    }

    if (!unitLevels[0]?.unitName.trim()) {
      toast.error('يرجى تحديد اسم الوحدة الأساسية أولاً قبل إضافة وحدات أصغر.');
      return;
    }

    const nextNumber = unitLevels.length + 1;
    let defName = '';
    let defFactor = '1';
    let autoSale = '';
    let autoPurchase = '';

    if (nextNumber === 2) {
      defName = 'شريط';
      defFactor = '3';
      const baseSale = parseFloat(unitLevels[0]?.salePrice || '0');
      const baseCost = parseFloat(unitLevels[0]?.purchasePrice || '0');
      if (baseSale > 0) autoSale = (baseSale / 3).toFixed(2);
      if (baseCost > 0) autoPurchase = (baseCost / 3).toFixed(2);
    } else if (nextNumber === 3) {
      defName = 'قرص';
      defFactor = '10';
      const l2Sale = parseFloat(unitLevels[1]?.salePrice || '0');
      const l2Cost = parseFloat(unitLevels[1]?.purchasePrice || '0');
      if (l2Sale > 0) autoSale = (l2Sale / 10).toFixed(2);
      if (l2Cost > 0) autoPurchase = (l2Cost / 10).toFixed(2);
    }

    const newLevel: UnitLevelItem = {
      id: `level-${Date.now()}`,
      unitName: defName,
      conversionFactor: defFactor,
      openingStock: '',
      allowSale: true,
      purchasePrice: autoPurchase,
      discountValue: '',
      discountType: 'percent',
      dualPricing: false,
      salePrice: autoSale,
      oldSalePrice: '',
      newSalePrice: autoSale,
    };

    setUnitLevels((prev) => [...prev, newLevel]);
    toast.success(`تمت إضافة المستوى رقم (${nextNumber}): ${defName || 'وحدة فرعية'}`);
  };

  const updateUnitLevel = (idx: number, patch: Partial<UnitLevelItem>) => {
    setUnitLevels((prev) => prev.map((item, i) => (i === idx ? { ...item, ...patch } : item)));
  };

  const removeUnitLevel = (idx: number) => {
    if (idx === 0) {
      toast.error('لا يمكن حذف الوحدة الأساسية الأولى.');
      return;
    }
    setUnitLevels((prev) => prev.filter((_, i) => i !== idx));
    toast.info('تم حذف المستوى.');
  };

  return {
    unitLevels,
    setUnitLevels,
    handleAddSmallerUnit,
    updateUnitLevel,
    removeUnitLevel,
    weightUnitName,
    scaleCode,
    setScaleCode,
    weightOpeningStock,
    setWeightOpeningStock,
    weightPurchasePrice,
    setWeightPurchasePrice,
    weightDiscount,
    setWeightDiscount,
    weightDiscountType,
    setWeightDiscountType,
    weightSalePrice,
    setWeightSalePrice,
    weightOldSalePrice,
    setWeightOldSalePrice,
    weightNewSalePrice,
    setWeightNewSalePrice,
    weightDualPricing,
    setWeightDualPricing,
  };
}
