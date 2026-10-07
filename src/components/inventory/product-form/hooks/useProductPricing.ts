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
                const sorted = [...initialUnits].sort((a, b) => (a.level_order || 0) - (b.level_order || 0));
                return [
                    level1,
                    ...sorted.slice(0, 2).map((u, idx) => ({
                        id: u.id || `level-${idx + 2}`,
                        unitName: u.unit_name || units.find((un) => un.id === u.unit_id)?.name || '',
                        conversionFactor: String(u.conversion_factor || ''),
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
                unitName: '',
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
        const newLevel: UnitLevelItem = {
            id: `level-${Date.now()}`,
            unitName: '',
            conversionFactor: '',
            openingStock: '',
            allowSale: true,
            purchasePrice: '',
            discountValue: '',
            discountType: 'percent',
            dualPricing: false,
            salePrice: '',
            oldSalePrice: '',
            newSalePrice: '',
        };

        setUnitLevels((prev) => [...prev, newLevel]);
        toast.success(`تمت إضافة المستوى رقم (${nextNumber})`);
    };

    const updateUnitLevel = (idx: number, patch: Partial<UnitLevelItem>) => {
        setUnitLevels((prev) => {
            const updated = prev.map((item, i) => (i === idx ? { ...item, ...patch } : item));

            // تفاعل سعر الشراء وسعر البيع تلقائياً عند إدخال أو تعديل معامل التفكيك
            if (idx > 0 && patch.conversionFactor !== undefined) {
                const factor = parseFloat(patch.conversionFactor);
                const parent = updated[idx - 1];
                const parentCost = parseFloat(parent?.purchasePrice || '0');
                const parentSale = parseFloat(parent?.newSalePrice || parent?.salePrice || '0');

                if (factor > 0) {
                    if (patch.purchasePrice === undefined) {
                        const autoCost = parentCost > 0 ? (parentCost / factor).toFixed(2) : '';
                        updated[idx].purchasePrice = autoCost;
                    }
                    if (patch.salePrice === undefined && patch.newSalePrice === undefined) {
                        const autoSale = parentSale > 0 ? (parentSale / factor).toFixed(2) : '';
                        updated[idx].salePrice = autoSale;
                        updated[idx].newSalePrice = autoSale;
                    }
                }
            }

            // إذا تم تعديل سعر الوحدة الأساسية (المستوى 1)، يتفاعل سعر المستويات الصغرى إن كان لها معامل تفكيك
            if (idx === 0 && (patch.salePrice !== undefined || patch.purchasePrice !== undefined)) {
                for (let k = 1; k < updated.length; k++) {
                    const factor = parseFloat(updated[k].conversionFactor || '0');
                    const prevLvl = updated[k - 1];
                    const prevCost = parseFloat(prevLvl?.purchasePrice || '0');
                    const prevSale = parseFloat(prevLvl?.newSalePrice || prevLvl?.salePrice || '0');

                    if (factor > 0) {
                        if (patch.purchasePrice !== undefined && prevCost > 0) {
                            updated[k].purchasePrice = (prevCost / factor).toFixed(2);
                        }
                        if (patch.salePrice !== undefined && prevSale > 0) {
                            const s = (prevSale / factor).toFixed(2);
                            updated[k].salePrice = s;
                            updated[k].newSalePrice = s;
                        }
                    }
                }
            }

            return updated;
        });
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