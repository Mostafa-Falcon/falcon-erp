import { useState, useEffect, useRef } from 'react';
import { toast } from 'sonner';
import { db } from '@/core/db/app_database';
import { ProductRepository } from '@/modules/inventory/product_repository';
import type { ProductBatch } from '@/types';
import type {
  ProductFormProps,
  UnitLevelItem,
  FormBatchEntry,
  ItemTypeMode,
} from './types';
import { useProductLookups } from './hooks/useProductLookups';
import { useProductPricing } from './hooks/useProductPricing';
import { useProductBatches } from './hooks/useProductBatches';
import { saveProductData } from './services/productSaveService';

export function useProductForm({
  orgId,
  categories,
  brands,
  productTypes = [],
  units,
  warehouses = [],
  initial,
  initialUnits = [],
  isPharmacy: isPharmacyProp,
  onSaved,
  onCancel,
}: ProductFormProps) {
  const isEdit = !!initial;
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [isPharmacy, setIsPharmacy] = useState(isPharmacyProp || false);

  useEffect(() => {
    if (isPharmacyProp !== undefined) {
      setIsPharmacy(isPharmacyProp);
    } else if (orgId) {
      db.organizations.get(orgId).then((org) => {
        if (org && org.activity_type === 'pharmacy') {
          setIsPharmacy(true);
        }
      }).catch(console.error);
    }
  }, [isPharmacyProp, orgId]);

  // =========================================================================
  // 1. شريط التخصيص العلوي
  // =========================================================================
  const [showSpecs, setShowSpecs] = useState(() => {
    if ((isPharmacyProp || isPharmacy) && !initial) return true;
    if (!initial) return false;
    return !!(
      initial.name_en ||
      initial.scientific_name ||
      initial.shelf_location ||
      (initial.alternate_barcodes && initial.alternate_barcodes.length > 0)
    );
  });
  const [showAdvanced, setShowAdvanced] = useState(() => {
    if (!initial) return false;
    return !!(
      initial.is_taxable ||
      (initial.min_stock_alert && initial.min_stock_alert > 0) ||
      !initial.is_active ||
      initial.is_quick_pos ||
      initial.notes
    );
  });
  const [showExpiry, setShowExpiry] = useState(() => {
    if ((isPharmacyProp || isPharmacy) && !initial) return true;
    if (!initial) return false;
    return !!(initial.tracks_expiry || initial.tracks_batch);
  });

  // =========================================================================
  // 2. بيانات الصنف الأساسية والتصنيفات
  // =========================================================================
  const [itemTypeMode, setItemTypeMode] = useState<ItemTypeMode>(
    initial?.measurement_type || 'unit'
  );
  const [name, setName] = useState(initial?.name || '');
  const [nameEn, setNameEn] = useState(initial?.name_en || '');
  const [scientificName, setScientificName] = useState(initial?.scientific_name || '');
  const [sku, setSku] = useState(initial?.sku || '');
  const [alternateBarcodes, setAlternateBarcodes] = useState<string[]>(
    initial?.alternate_barcodes || []
  );
  const [shelfLocation, setShelfLocation] = useState(initial?.shelf_location || '');
  const [imageUrl, setImageUrl] = useState<string>(initial?.image_url || '');

  // التصنيفات
  const [categoryId, setCategoryId] = useState(initial?.category_id || 'none');
  const [brandId, setBrandId] = useState(initial?.brand_id || 'none');
  const [productType, setProductType] = useState<string>(initial?.product_type || 'none');

  // الإعدادات المتقدمة
  const [isTaxable, setIsTaxable] = useState(initial?.is_taxable || false);
  const [enableMinStockAlert, setEnableMinStockAlert] = useState(
    (initial?.min_stock_alert ?? 0) > 0
  );
  const [minStockAlert, setMinStockAlert] = useState(
    initial?.min_stock_alert ? String(initial.min_stock_alert) : '5'
  );
  const [isActiveForSale, setIsActiveForSale] = useState(initial?.is_active ?? true);
  const [isQuickPos, setIsQuickPos] = useState(initial?.is_quick_pos || false);
  const [productNotes, setProductNotes] = useState(initial?.notes || '');

  // =========================================================================
  // 3. الخطافات الفرعية المعيارية (Sub-Hooks)
  // =========================================================================
  const {
    uniqueBrands,
    uniqueCategories,
    uniqueProductTypes,
    activeModal,
    setActiveModal,
    modalInputValue,
    setModalInputValue,
    isModalSaving,
    handleModalSave,
    handleDeleteLookupItem,
  } = useProductLookups({
    orgId,
    brands,
    categories,
    productTypes,
    brandId,
    setBrandId,
    categoryId,
    setCategoryId,
    productType,
    setProductType,
  });

  const {
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
  } = useProductPricing({
    initial,
    initialUnits,
    units,
    isPharmacy,
  });

  const {
    enableExpiryTracking,
    setEnableExpiryTracking,
    batchEntries,
    setBatchEntries,
    handleAddBatch,
    handleUpdateBatch,
    handleRemoveBatch,
  } = useProductBatches({
    initial,
    itemTypeMode,
  });

  const [isSaving, setIsSaving] = useState(false);

  // =========================================================================
  // 3.1 إعدادات نمط الصيدلية عند إنشاء دواء جديد
  // =========================================================================
  useEffect(() => {
    if (isPharmacy) {
      if (itemTypeMode !== 'unit') {
        setItemTypeMode('unit');
      }
      if (!initial) {
        setShowSpecs(true);
        setShowExpiry(true);
        setEnableExpiryTracking(true);
      }
    }
  }, [isPharmacy, initial, itemTypeMode, setEnableExpiryTracking]);

  // توليد تاريخ صلاحية ورقم تشغيلة تلقائي عند التفعيل إذا كانت القائمة فارغة
  useEffect(() => {
    if (enableExpiryTracking && batchEntries.length === 0 && !initial) {
      handleAddBatch();
    }
  }, [enableExpiryTracking, batchEntries.length, initial, handleAddBatch]);

  // =========================================================================
  // 4. مزامنة بيانات الصنف عند الدخول في وضع التعديل (Edit Hydration)
  // =========================================================================
  useEffect(() => {
    if (!initial) return;

    // 1. البيانات الأساسية
    setItemTypeMode(initial.measurement_type || 'unit');
    setName(initial.name || '');
    setNameEn(initial.name_en || '');
    setScientificName(initial.scientific_name || '');
    setSku(initial.sku || '');
    setAlternateBarcodes(initial.alternate_barcodes || []);
    setShelfLocation(initial.shelf_location || '');
    setImageUrl(initial.image_url || '');

    // 2. التصنيفات
    setCategoryId(initial.category_id || 'none');
    setBrandId(initial.brand_id || 'none');
    setProductType(initial.product_type || 'none');

    // 3. الإعدادات المتقدمة
    setIsTaxable(initial.is_taxable || false);
    setEnableMinStockAlert((initial.min_stock_alert ?? 0) > 0);
    setMinStockAlert(initial.min_stock_alert ? String(initial.min_stock_alert) : '5');
    setIsActiveForSale(initial.is_active ?? true);
    setIsQuickPos(initial.is_quick_pos || false);
    setProductNotes(initial.notes || '');

    // 4. أشرطة التخصيص العلوية
    if (
      initial.name_en ||
      initial.scientific_name ||
      initial.shelf_location ||
      (initial.alternate_barcodes && initial.alternate_barcodes.length > 0)
    ) {
      setShowSpecs(true);
    }
    if (
      initial.is_taxable ||
      (initial.min_stock_alert && initial.min_stock_alert > 0) ||
      !initial.is_active ||
      initial.is_quick_pos ||
      initial.notes
    ) {
      setShowAdvanced(true);
    }
    const hasExpiryTracking = !!(initial.tracks_expiry || initial.tracks_batch);
    setShowExpiry(hasExpiryTracking);
    setEnableExpiryTracking(hasExpiryTracking);

    // 5. بيانات تسعير الوزن
    setScaleCode(initial.scale_code || '');
    const wPurchase = initial.raw_purchase_price !== undefined
      ? String(initial.raw_purchase_price)
      : (initial.purchase_price !== undefined ? String(initial.purchase_price) : '');
    const wDisc = initial.purchase_discount_value !== undefined ? String(initial.purchase_discount_value) : '';
    const wDiscType = initial.purchase_discount_type || 'percent';

    setWeightPurchasePrice(wPurchase);
    setWeightDiscount(wDisc);
    setWeightDiscountType(wDiscType);
    setWeightSalePrice(initial.sale_price !== undefined ? String(initial.sale_price) : '');
    setWeightOldSalePrice(initial.old_sale_price !== undefined ? String(initial.old_sale_price) : '');
    setWeightNewSalePrice(initial.sale_price !== undefined ? String(initial.sale_price) : '');
    setWeightDualPricing(initial.has_dual_pricing ?? !!initial.old_sale_price);

    // 6. بيانات وحدات القطع (الوحدة الأساسية والمستويات الفرعية)
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

    const secondaryLevels: UnitLevelItem[] = (initialUnits || []).slice(0, 2).map((u, idx) => ({
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
    }));

    setUnitLevels([level1, ...secondaryLevels]);

    // 7. تحميل تشغيلات الصلاحية السابقة إن وُجدت وفقط إذا كان الصنف مفعّل به تتبع الصلاحية
    if (hasExpiryTracking) {
      ProductRepository.getProductBatches(initial.id)
        .then((batches: ProductBatch[]) => {
          // استبعاد أي تشغيلات افتتاحية افتراضية ليس لها تاريخ صلاحية
          const userBatches = (batches || []).filter(
            (b) => b.expiry_date || !b.batch_number.startsWith('OPN-')
          );
          if (userBatches.length > 0) {
            const mapped: FormBatchEntry[] = userBatches.map((b) => {
              let day = '';
              let month = '';
              let year = '';
              if (b.expiry_date) {
                const parts = b.expiry_date.split('-');
                if (parts.length === 3) {
                  year = parts[0];
                  month = parts[1];
                  day = parts[2];
                }
              }
              return {
                id: b.id,
                quantity: String(b.current_quantity ?? b.initial_quantity ?? 1),
                unitLevelId: initial.measurement_type === 'weight' ? 'weight' : 'level-1',
                day,
                month,
                year,
                batchNumber: b.batch_number || '',
              };
            });
            setBatchEntries(mapped);
          } else {
            setBatchEntries([]);
          }
        })
        .catch(console.error);
    } else {
      setBatchEntries([]);
    }

    // 8. جلب رصيد المخزون المسجل للصنف لوضعه في خانة الرصيد
    db.stock_levels.where('product_id').equals(initial.id).toArray()
      .then((levels) => {
        const totalQty = levels.reduce((acc, l) => acc + (l.quantity || 0), 0);
        if (totalQty > 0) {
          setUnitLevels((prev) => {
            if (prev.length === 0) return prev;
            const updated = [...prev];
            updated[0] = { ...updated[0], openingStock: String(totalQty) };
            return updated;
          });
          setWeightOpeningStock(String(totalQty));
        }
      })
      .catch(console.error);
  }, [initial, initialUnits, units, setUnitLevels, setScaleCode, setWeightPurchasePrice, setWeightDiscount, setWeightDiscountType, setWeightSalePrice, setWeightOldSalePrice, setWeightNewSalePrice, setWeightDualPricing, setWeightOpeningStock, setBatchEntries]);

  // =========================================================================
  // 5. العمليات المساعدة (Barcode, Images, Reset, Submit)
  // =========================================================================
  const handleGenerateRandomBarcode = () => {
    const rand = '628' + Math.floor(100000000 + Math.random() * 900000000).toString();
    setSku(rand);
    toast.success('تم توليد باركود تلقائي بنجاح');
  };

  const handleAddAlternateBarcode = () => {
    setAlternateBarcodes((prev) => [...prev, '']);
  };

  const handleUpdateAlternateBarcode = (idx: number, val: string) => {
    setAlternateBarcodes((prev) => prev.map((b, i) => (i === idx ? val : b)));
  };

  const handleRemoveAlternateBarcode = (idx: number) => {
    setAlternateBarcodes((prev) => prev.filter((_, i) => i !== idx));
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 2 * 1024 * 1024) {
      toast.error('حجم الصورة يجب ألا يتجاوز 2 ميجابايت');
      return;
    }
    const reader = new FileReader();
    reader.onload = (event) => {
      setImageUrl(event.target?.result as string);
      toast.success('تم تحميل صورة الصنف بنجاح');
    };
    reader.readAsDataURL(file);
  };

  const handleResetForm = () => {
    setName('');
    setNameEn('');
    setScientificName('');
    setSku('');
    setAlternateBarcodes([]);
    setShelfLocation('');
    setImageUrl('');
    setScaleCode('');
    setCategoryId('none');
    setBrandId('none');
    setProductType('none');
    setIsTaxable(false);
    setEnableMinStockAlert(false);
    setMinStockAlert('5');
    setIsActiveForSale(true);
    setIsQuickPos(false);
    setProductNotes('');
    setShowSpecs(false);
    setShowAdvanced(false);
    setShowExpiry(false);
    setEnableExpiryTracking(false);
    setBatchEntries([]);
    setUnitLevels([
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
    ]);
    setWeightOpeningStock('');
    setWeightPurchasePrice('');
    setWeightDiscount('');
    setWeightSalePrice('');
    setWeightOldSalePrice('');
    setWeightNewSalePrice('');
    setWeightDualPricing(false);
    toast.info('تم تفريغ كافة حقول البيانات.');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!name.trim()) {
      toast.error('يرجى إدخال اسم الصنف.');
      return;
    }

    setIsSaving(true);
    try {
      await saveProductData({
        orgId,
        isEdit,
        initial,
        name,
        nameEn,
        scientificName,
        shelfLocation,
        imageUrl,
        sku,
        alternateBarcodes,
        categoryId,
        brandId,
        productType,
        itemTypeMode,
        scaleCode,
        isTaxable,
        showSpecs,
        showAdvanced,
        showExpiry,
        enableExpiryTracking,
        enableMinStockAlert,
        minStockAlert,
        isActiveForSale,
        isQuickPos,
        productNotes,
        units,
        unitLevels,
        weightOpeningStock,
        weightPurchasePrice,
        weightDiscount,
        weightDiscountType,
        weightSalePrice,
        weightOldSalePrice,
        weightNewSalePrice,
        weightDualPricing,
        batchEntries,
        warehouses,
      });

      toast.success('تم حفظ الصنف بنجاح!');
      onSaved();
    } catch (err) {
      console.error(err);
      toast.error('حدث خطأ أثناء حفظ الصنف.');
    } finally {
      setIsSaving(false);
    }
  };

  return {
    isEdit,
    isPharmacy,
    fileInputRef,
    // Bar
    showSpecs,
    setShowSpecs,
    showAdvanced,
    setShowAdvanced,
    showExpiry,
    setShowExpiry,
    // Lookups
    uniqueBrands,
    uniqueCategories,
    uniqueProductTypes,
    // Basic info
    itemTypeMode,
    setItemTypeMode,
    name,
    setName,
    nameEn,
    setNameEn,
    scientificName,
    setScientificName,
    sku,
    setSku,
    alternateBarcodes,
    shelfLocation,
    setShelfLocation,
    imageUrl,
    setImageUrl,
    categoryId,
    setCategoryId,
    brandId,
    setBrandId,
    productType,
    setProductType,
    // Advanced
    isTaxable,
    setIsTaxable,
    enableMinStockAlert,
    setEnableMinStockAlert,
    minStockAlert,
    setMinStockAlert,
    isActiveForSale,
    setIsActiveForSale,
    isQuickPos,
    setIsQuickPos,
    productNotes,
    setProductNotes,
    // Expiry
    enableExpiryTracking,
    setEnableExpiryTracking,
    batchEntries,
    // Modal
    activeModal,
    setActiveModal,
    modalInputValue,
    setModalInputValue,
    isModalSaving,
    handleModalSave,
    handleDeleteLookupItem,
    // Unit levels
    unitLevels,
    handleAddSmallerUnit,
    updateUnitLevel,
    removeUnitLevel,
    // Weight
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
    // Actions & state
    isSaving,
    handleGenerateRandomBarcode,
    handleAddAlternateBarcode,
    handleUpdateAlternateBarcode,
    handleRemoveAlternateBarcode,
    handleImageUpload,
    handleAddBatch,
    handleUpdateBatch,
    handleRemoveBatch,
    handleResetForm,
    handleSubmit,
    onCancel,
  };
}
