import { ProductRepository } from '@/modules/inventory/product_repository';
import { db } from '@/core/db/app_database';
import { getSubscriptionPermissions } from '@/core/constants/subscription_profiles';
import type {
  Product,
  ProductUnit,
  Unit,
  Warehouse,
} from '@/types';
import type {
  UnitLevelItem,
  FormBatchEntry,
  ItemTypeMode,
} from '../types';
import { generateSku, calculatePriceDetails } from '../utils';

export interface SaveProductPayload {
  orgId: string;
  isEdit: boolean;
  initial?: Product;
  name: string;
  nameEn: string;
  scientificName: string;
  shelfLocation: string;
  imageUrl: string;
  sku: string;
  alternateBarcodes: string[];
  categoryId: string;
  brandId: string;
  productType: string;
  itemTypeMode: ItemTypeMode;
  scaleCode: string;
  isTaxable: boolean;
  showSpecs: boolean;
  showAdvanced: boolean;
  showExpiry: boolean;
  enableExpiryTracking: boolean;
  enableMinStockAlert: boolean;
  minStockAlert: string;
  isActiveForSale: boolean;
  isQuickPos: boolean;
  productNotes: string;
  units: Unit[];
  unitLevels: UnitLevelItem[];
  weightOpeningStock: string;
  weightPurchasePrice: string;
  weightDiscount: string;
  weightDiscountType: 'percent' | 'amount';
  weightSalePrice: string;
  weightOldSalePrice: string;
  weightNewSalePrice: string;
  weightDualPricing: boolean;
  batchEntries: FormBatchEntry[];
  warehouses?: Warehouse[];
}

export async function saveProductData(payload: SaveProductPayload): Promise<void> {
  const {
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
    warehouses = [],
  } = payload;

  // فحص اشتراك المنشأة والحد الأقصى المسموح به لإضافة الأصناف
  const org = await db.organizations.get(orgId);
  if (org) {
    if (!org.is_active) {
      throw new Error('حساب المنشأة غير فعال حالياً.');
    }
    const isExpired = org.subscription_expires_at
      ? new Date(org.subscription_expires_at) < new Date()
      : false;
    const perms = getSubscriptionPermissions(org.subscription_tier, isExpired);
    if (!perms.canAddProducts) {
      throw new Error(perms.reasonIfBlocked || 'إضافة الأصناف غير متاحة في حسابك الحالي.');
    }
    if (!isEdit && perms.maxProductsLimit) {
      const currentProductsCount = await db.products.where('org_id').equals(orgId).count();
      if (currentProductsCount >= perms.maxProductsLimit) {
        throw new Error(
          `وصلت للحد الأقصى لإضافة الأصناف في الحساب التجريبي (${perms.maxProductsLimit} أصناف). يرجى ترقية الاشتراك لإضافة عدد غير محدود.`
        );
      }
    }
  }

  let baseU = units.find((u) =>
    itemTypeMode === 'weight'
      ? u.name.includes('كيلو') || u.symbol.toLowerCase() === 'kg'
      : u.name === unitLevels[0]?.unitName
  );

  if (!baseU) {
    const uName = itemTypeMode === 'weight' ? 'كيلوجرام' : unitLevels[0]?.unitName || 'قطعة';
    baseU = await ProductRepository.createUnit(uName, uName.slice(0, 3), orgId);
  }

  const pPrice =
    itemTypeMode === 'weight'
      ? (calculatePriceDetails(
          weightPurchasePrice,
          weightSalePrice,
          weightDiscount,
          weightDiscountType
        ).netCost || parseFloat(weightPurchasePrice) || 0)
      : (calculatePriceDetails(
          unitLevels[0]?.purchasePrice || '',
          unitLevels[0]?.salePrice || '',
          unitLevels[0]?.discountValue || '',
          unitLevels[0]?.discountType || 'percent'
        ).netCost || parseFloat(unitLevels[0]?.purchasePrice || '0') || 0);

  const sPrice =
    itemTypeMode === 'weight'
      ? (weightDualPricing && weightNewSalePrice ? parseFloat(weightNewSalePrice) : parseFloat(weightSalePrice)) || 0
      : (unitLevels[0]?.dualPricing && unitLevels[0]?.newSalePrice
          ? parseFloat(unitLevels[0]?.newSalePrice)
          : parseFloat(unitLevels[0]?.salePrice || '0')) || 0;

  const oldSPrice =
    itemTypeMode === 'weight'
      ? weightDualPricing && weightOldSalePrice ? parseFloat(weightOldSalePrice) : undefined
      : unitLevels[0]?.dualPricing && unitLevels[0]?.oldSalePrice
      ? parseFloat(unitLevels[0]?.oldSalePrice)
      : undefined;

  const hasDual =
    itemTypeMode === 'weight'
      ? weightDualPricing
      : !!unitLevels[0]?.dualPricing;

  const cleanAlternateBarcodes = alternateBarcodes
    .map((b) => b.trim())
    .filter((b) => b.length > 0);

  const targetWarehouseId =
    warehouses.find((w) => w.is_main)?.id || warehouses[0]?.id || 'main-warehouse';

  const rawCost1 = itemTypeMode === 'weight'
    ? (weightPurchasePrice ? parseFloat(weightPurchasePrice) : undefined)
    : (unitLevels[0]?.purchasePrice ? parseFloat(unitLevels[0].purchasePrice) : undefined);

  const discVal1 = itemTypeMode === 'weight'
    ? (weightDiscount.trim() ? parseFloat(weightDiscount) : undefined)
    : (unitLevels[0]?.discountValue?.trim() ? parseFloat(unitLevels[0].discountValue) : undefined);

  const discType1 = itemTypeMode === 'weight'
    ? (weightDiscount.trim() ? weightDiscountType : undefined)
    : (unitLevels[0]?.discountValue?.trim() ? unitLevels[0].discountType : undefined);

  const baseProductData: Omit<Product, 'id' | 'created_at' | 'updated_at' | 'sync_status'> = {
    org_id: orgId,
    sku: sku.trim() || generateSku(name),
    name: name.trim(),
    name_en: nameEn.trim() ? nameEn.trim() : undefined,
    scientific_name: scientificName.trim() ? scientificName.trim() : undefined,
    shelf_location: shelfLocation.trim() ? shelfLocation.trim() : undefined,
    image_url: imageUrl || undefined,
    alternate_barcodes: cleanAlternateBarcodes.length > 0 ? cleanAlternateBarcodes : undefined,
    category_id: categoryId !== 'none' ? categoryId : null,
    brand_id: brandId !== 'none' ? brandId : null,
    item_type: 'storable',
    product_type: productType !== 'none' ? productType : undefined,
    measurement_type: itemTypeMode,
    has_levels: itemTypeMode === 'unit' && unitLevels.length > 1,
    scale_code: itemTypeMode === 'weight' && scaleCode.trim() ? scaleCode.trim() : undefined,
    base_unit_id: baseU.id,
    purchase_price: pPrice,
    raw_purchase_price: rawCost1,
    purchase_discount_value: discVal1,
    purchase_discount_type: discType1,
    sale_price: sPrice,
    old_sale_price: oldSPrice,
    has_dual_pricing: hasDual,
    tax_rate: isTaxable ? 14 : 0,
    is_tax_inclusive: false,
    is_taxable: isTaxable,
    tracks_batch: showExpiry && enableExpiryTracking,
    tracks_expiry: showExpiry && enableExpiryTracking,
    min_stock_alert: enableMinStockAlert ? parseFloat(minStockAlert) || 5 : 0,
    is_active: isActiveForSale,
    is_quick_pos: isQuickPos,
    notes: productNotes.trim() || undefined,
  };

  const secondaryUnitsData: Omit<
    ProductUnit,
    'id' | 'product_id' | 'created_at' | 'updated_at' | 'sync_status'
  >[] = [];

  if (itemTypeMode === 'unit' && unitLevels.length > 1) {
    for (let i = 1; i < Math.min(3, unitLevels.length); i++) {
      const lvl = unitLevels[i];
      if (!lvl.unitName.trim()) continue;
      let subU = units.find((u) => u.name === lvl.unitName);
      if (!subU) {
        subU = await ProductRepository.createUnit(lvl.unitName, lvl.unitName.slice(0, 3), orgId);
      }
      const secondarySale = lvl.dualPricing && lvl.newSalePrice
        ? parseFloat(lvl.newSalePrice)
        : (lvl.salePrice ? parseFloat(lvl.salePrice) : undefined);
      const secondaryOldSale = lvl.dualPricing && lvl.oldSalePrice
        ? parseFloat(lvl.oldSalePrice)
        : undefined;

      const secondaryCost = lvl.purchasePrice
        ? (calculatePriceDetails(
            lvl.purchasePrice,
            lvl.salePrice,
            lvl.discountValue,
            lvl.discountType
          ).netCost || parseFloat(lvl.purchasePrice))
        : undefined;

      const rawCostSec = lvl.purchasePrice ? parseFloat(lvl.purchasePrice) : undefined;
      const discValSec = lvl.discountValue?.trim() ? parseFloat(lvl.discountValue) : undefined;
      const discTypeSec = lvl.discountValue?.trim() ? lvl.discountType : undefined;

      secondaryUnitsData.push({
        unit_id: subU.id,
        conversion_factor: parseFloat(lvl.conversionFactor) || 1,
        purchase_price: secondaryCost,
        raw_purchase_price: rawCostSec,
        purchase_discount_value: discValSec,
        purchase_discount_type: discTypeSec,
        sale_price: secondarySale,
        old_sale_price: secondaryOldSale,
        has_dual_pricing: lvl.dualPricing,
        is_default_sale: lvl.allowSale,
        is_default_purchase: false,
      });
    }
  }

  const preparedBatches: Array<{
    warehouse_id: string;
    batch_number: string;
    expiry_date?: string | null;
    initial_quantity: number;
    purchase_price?: number;
  }> = [];

  if (showExpiry && enableExpiryTracking && batchEntries.length > 0) {
    for (let i = 0; i < batchEntries.length; i++) {
      const b = batchEntries[i];
      const rawQty = parseFloat(b.quantity) || 0;
      if (rawQty <= 0) continue;

      let factor = 1;
      if (itemTypeMode === 'unit') {
        if (b.unitLevelId === 'level-2' && unitLevels[1]) {
          factor = parseFloat(unitLevels[1].conversionFactor) || 1;
        } else if (b.unitLevelId === 'level-3' && unitLevels[2]) {
          factor = parseFloat(unitLevels[2].conversionFactor) || 1;
        }
      }

      let expiryIso: string | null = null;
      if (b.year && b.month && b.day) {
        const y = b.year.trim().padStart(4, '20');
        const m = b.month.trim().padStart(2, '0');
        const d = b.day.trim().padStart(2, '0');
        expiryIso = `${y}-${m}-${d}`;
      }

      preparedBatches.push({
        warehouse_id: targetWarehouseId,
        batch_number: b.batchNumber.trim() || `BATCH-${Date.now().toString().slice(-4)}-${i + 1}`,
        expiry_date: expiryIso,
        initial_quantity: rawQty * factor,
        purchase_price: pPrice,
      });
    }
  }

  // إذا لم تكن هناك تشغيلات صريحة مدخلة في قسم الصلاحية، نعتمد الرصيد الافتتاحي المُدخل في كروت الوحدات أو الوزن
  if (preparedBatches.length === 0) {
    let totalOpeningStock = 0;
    if (itemTypeMode === 'weight') {
      totalOpeningStock = parseFloat(weightOpeningStock) || 0;
    } else {
      // الوحدة الأساسية (المستوى 1)
      const q1 = parseFloat(unitLevels[0]?.openingStock || '0') || 0;
      // المستوى 2 (إن وجد)
      const q2 = parseFloat(unitLevels[1]?.openingStock || '0') || 0;
      const f2 = parseFloat(unitLevels[1]?.conversionFactor || '1') || 1;
      // المستوى 3 (إن وجد)
      const q3 = parseFloat(unitLevels[2]?.openingStock || '0') || 0;
      const f3 = parseFloat(unitLevels[2]?.conversionFactor || '1') || 1;

      totalOpeningStock = q1 + (q2 * f2) + (q3 * f3);
    }

    if (totalOpeningStock > 0) {
      preparedBatches.push({
        warehouse_id: targetWarehouseId,
        batch_number: `OPN-${Date.now().toString().slice(-6)}`,
        expiry_date: null,
        initial_quantity: totalOpeningStock,
        purchase_price: pPrice,
      });
    }
  }

  if (isEdit && initial) {
    await ProductRepository.updateProduct(initial.id, baseProductData);
    await ProductRepository.replaceProductUnits(initial.id, secondaryUnitsData);
    if (preparedBatches.length > 0) {
      await ProductRepository.saveProductBatches(initial.id, orgId, preparedBatches);
    }
  } else {
    const savedProduct = await ProductRepository.createProduct(
      baseProductData,
      secondaryUnitsData,
      preparedBatches
    );
    if (preparedBatches.length > 0) {
      await ProductRepository.saveProductBatches(savedProduct.id, orgId, preparedBatches);
    }
  }
}
