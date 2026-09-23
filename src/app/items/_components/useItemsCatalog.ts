'use client';

import { useState, useEffect, useMemo } from 'react';
import { useSearchParams } from 'next/navigation';
import { useSessionStore } from '@/core/state/useSessionStore';
import { ProductRepository } from '@/modules/inventory/product_repository';
import { InventoryRepository } from '@/modules/inventory/inventory_repository';
import { CLOUD_DATA_CHANGED_EVENT } from '@/core/sync/sync_events';
import { db } from '@/core/db/app_database';
import { isExpired, daysToExpiry } from '@/lib/format';
import { toast } from 'sonner';
import type {
  Product,
  ProductCategory,
  ProductBrand,
  ProductUnit,
  Unit,
  Warehouse,
  StockLevel,
  ProductBatch,
} from '@/types';
import type { QuickFilterType, VisibleColumns, CatalogStats, SortField, SortDirection } from './types';

export function useItemsCatalog() {
  const searchParams = useSearchParams();
  const { currentUser } = useSessionStore();
  const orgId = currentUser?.org_id || '';

  // Local storage state
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<ProductCategory[]>([]);
  const [brands, setBrands] = useState<ProductBrand[]>([]);
  const [units, setUnits] = useState<Unit[]>([]);
  const [unitsById, setUnitsById] = useState<Record<string, Unit>>({});
  const [productUnitsByProduct, setProductUnitsByProduct] = useState<Record<string, ProductUnit[]>>({});
  const [warehouses, setWarehouses] = useState<Warehouse[]>([]);
  const [stockMap, setStockMap] = useState<Record<string, number>>({});
  const [stockLevels, setStockLevels] = useState<StockLevel[]>([]);
  const [batchesByProduct, setBatchesByProduct] = useState<Record<string, ProductBatch[]>>({});
  const [isPharmacy, setIsPharmacy] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  // Filters
  const [quickFilter, setQuickFilter] = useState<QuickFilterType>('all');
  const [showAdvancedFilter, setShowAdvancedFilter] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [brandFilter, setBrandFilter] = useState('all');
  const [typeFilter, setTypeFilter] = useState('all');
  const [unitFilter, setUnitFilter] = useState('all');
  const [taxFilter, setTaxFilter] = useState('all');
  const [warehouseFilter, setWarehouseFilter] = useState('all');
  const [showInactive, setShowInactive] = useState(false);

  // Sorting
  const [sortField, setSortField] = useState<SortField | null>(null);
  const [sortDirection, setSortDirection] = useState<SortDirection>('none');

  // Modals state
  const [openingStockProduct, setOpeningStockProduct] = useState<Product | null>(null);
  const [itemCardProduct, setItemCardProduct] = useState<Product | null>(null);

  // Table Density
  const [density, setDensity] = useState<'compact' | 'medium' | 'relaxed'>('medium');

  // Selection & Pagination
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [pageSize, setPageSize] = useState<number>(50);
  const [currentPage, setCurrentPage] = useState<number>(1);

  // Column visibility
  const [visibleColumns, setVisibleColumns] = useState<VisibleColumns>({
    nameEn: true,
    purchasePrice: true,
    salePrice: true,
    stock: true,
    category: true,
    barcode: true,
  });

  const detailId = searchParams.get('id');

  const loadData = async () => {
    if (!orgId) return;
    try {
      const { db } = await import('@/core/db/app_database');
      const [prods, inactives, cats, brs, unts, allProductUnits, whs, sLevels, allBatches, org] =
        await Promise.all([
          ProductRepository.getAll(orgId),
          db.products.where('org_id').equals(orgId).and((p) => !p.is_active).toArray(),
          ProductRepository.getCategories(orgId),
          ProductRepository.getBrands(orgId),
          ProductRepository.getAllUnits(orgId),
          db.product_units.toArray(),
          InventoryRepository.getWarehouses(orgId),
          db.stock_levels.where('org_id').equals(orgId).toArray(),
          db.product_batches.toArray(),
          db.organizations.get(orgId),
        ]);

      if (org && org.activity_type === 'pharmacy') {
        setIsPharmacy(true);
      }

      const allProds = [...prods, ...inactives.filter((p) => !prods.some((x) => x.id === p.id))];

      const unitMap: Record<string, Unit> = {};
      for (const u of unts) unitMap[u.id] = u;

      const pUnitsMap: Record<string, ProductUnit[]> = {};
      for (const pu of allProductUnits) {
        (pUnitsMap[pu.product_id] = pUnitsMap[pu.product_id] || []).push(pu);
      }

      const stock: Record<string, number> = {};
      for (const s of sLevels) {
        stock[s.product_id] = (stock[s.product_id] || 0) + s.quantity;
      }

      const batchMap: Record<string, ProductBatch[]> = {};
      for (const b of allBatches) {
        (batchMap[b.product_id] = batchMap[b.product_id] || []).push(b);
      }

      setProducts(allProds.sort((a, b) => a.name.localeCompare(b.name, 'ar')));
      setCategories(cats.filter((c) => c.is_active));
      setBrands(brs);
      setUnits(unts);
      setUnitsById(unitMap);
      setProductUnitsByProduct(pUnitsMap);
      setWarehouses(whs);
      setStockMap(stock);
      setStockLevels(sLevels);
      setBatchesByProduct(batchMap);
    } catch (err) {
      console.error('Load catalog error:', err);
      toast.error('حدث خطأ أثناء تحميل دليل الأصناف.');
    } finally {
      setIsLoading(false);
    }
  };

  const forceSyncCatalog = async () => {
    if (!orgId) return;
    setIsLoading(true);
    try {
      toast.info('جاري إعادة مزامنة دليل الأصناف بالكامل من السحابة...');
      const { PullSyncService } = await import('@/core/sync/pull_sync_service');
      await PullSyncService.forcePullAll(orgId);
      await loadData();
      toast.success('تمت إعادة مزامنة دليل الأصناف بنجاح.');
    } catch (err) {
      console.error('Force sync error:', err);
      toast.error('حدث خطأ أثناء مزامنة دليل الأصناف.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (!orgId) return;
    loadData();
  }, [orgId]);

  // الاستجابة لتغييرات السحابة (realtime أو reconcile) لإعادة قراءة دليل الأصناف
  useEffect(() => {
    if (!orgId) return;
    let timer: ReturnType<typeof setTimeout> | null = null;
    const onCloudDataChanged = () => {
      if (timer) clearTimeout(timer);
      timer = setTimeout(() => {
        loadData();
      }, 350);
    };
    window.addEventListener(CLOUD_DATA_CHANGED_EVENT, onCloudDataChanged);
    return () => {
      if (timer) clearTimeout(timer);
      window.removeEventListener(CLOUD_DATA_CHANGED_EVENT, onCloudDataChanged);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [orgId]);

  // الاستجابة لأي تغيير محلي في Dexie (إنشاء صنف، حدث realtime، دمج pull ...)
  // ليظل الجدول محدثاً تلقائياً ولحظياً من كل المصادر.
  useEffect(() => {
    if (!orgId) return;
    const SYNC_TABLES = new Set(['products', 'product_units', 'product_batches', 'stock_levels', 'units', 'product_categories', 'product_brands', 'warehouses']);
    let timer: ReturnType<typeof setTimeout> | null = null;

    const scheduleReload = () => {
      if (timer) clearTimeout(timer);
      timer = setTimeout(() => {
        loadData();
      }, 250);
    };

    interface DexieChangeRecord {
      table: string;
      type: string;
    }

    // التحقق بأمان من وجود حدث 'changes' في Dexie قبل الاشتراك لمنع الأخطاء الاستثنائية
    const changesEvent = (db.on as unknown as Record<string, { subscribe?: (fn: (changes: DexieChangeRecord[]) => void) => void; unsubscribe?: (fn: (changes: DexieChangeRecord[]) => void) => void }> | undefined)?.changes;

    if (changesEvent && typeof changesEvent.subscribe === 'function') {
      const onDexieChanged = (changes: DexieChangeRecord[]) => {
        if (changes.some((c) => SYNC_TABLES.has(c.table))) {
          scheduleReload();
        }
      };
      changesEvent.subscribe(onDexieChanged);

      return () => {
        if (timer) clearTimeout(timer);
        if (typeof changesEvent.unsubscribe === 'function') {
          changesEvent.unsubscribe(onDexieChanged);
        }
      };
    }

    return () => {
      if (timer) clearTimeout(timer);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [orgId]);

  // Statistics for KPI Cards
  const stats: CatalogStats = useMemo(() => {
    const total = products.length;
    let lowStockCount = 0;
    let nearExpiryCount = 0;
    let outOfStockCount = 0;
    let totalStockValue = 0;

    for (const p of products) {
      const stock = stockMap[p.id] || 0;
      if (p.item_type === 'storable') {
        if (stock <= 0) {
          outOfStockCount++;
        } else if (stock < 1 || stock <= (p.min_stock_alert || 0)) {
          lowStockCount++;
        }
      }
      totalStockValue += stock * (p.purchase_price || 0);

      if (p.tracks_expiry && batchesByProduct[p.id]) {
        const hasNear = batchesByProduct[p.id].some(
          (b) =>
            (b.current_quantity ?? 0) > 0 &&
            b.expiry_date &&
            !isExpired(b.expiry_date) &&
            daysToExpiry(b.expiry_date) <= 90
        );
        if (hasNear) nearExpiryCount++;
      }
    }

    return {
      total,
      lowStockCount: lowStockCount + outOfStockCount,
      nearExpiryCount,
      outOfStockCount,
      totalStockValue,
    };
  }, [products, stockMap, batchesByProduct]);

  // Helper getters
  const catName = (id?: string | null) => categories.find((c) => c.id === id)?.name || 'عام';
  const unitName = (id?: string | null) => (id ? unitsById[id]?.name : undefined) || 'وحدة';

  // Toggle sorting
  const toggleSort = (field: SortField) => {
    if (sortField !== field) {
      setSortField(field);
      setSortDirection('asc');
    } else if (sortDirection === 'asc') {
      setSortDirection('desc');
    } else if (sortDirection === 'desc') {
      setSortField(null);
      setSortDirection('none');
    } else {
      setSortDirection('asc');
    }
  };

  // Filtered & Sorted Products
  const filteredProducts = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();

    let list = products.filter((p) => {
      // Activity filter
      if (!p.is_active && !showInactive) return false;
      if (showInactive && p.is_active) return false;

      // Category filter
      if (categoryFilter !== 'all' && p.category_id !== categoryFilter) return false;

      // Brand filter
      if (brandFilter !== 'all' && p.brand_id !== brandFilter) return false;

      // Type filter
      if (typeFilter !== 'all' && p.item_type !== typeFilter) return false;

      // Unit filter
      if (unitFilter !== 'all' && p.base_unit_id !== unitFilter) return false;

      // Tax filter
      if (taxFilter !== 'all') {
        const taxVal = Number(taxFilter);
        if (p.tax_rate !== taxVal) return false;
      }

      // Warehouse filter
      if (warehouseFilter !== 'all') {
        const whStock = stockLevels.find(
          (s) => s.warehouse_id === warehouseFilter && s.product_id === p.id
        );
        if (!whStock || whStock.quantity <= 0) return false;
      }

      // Search query
      if (q) {
        const matchName = p.name.toLowerCase().includes(q);
        const matchSku = p.sku.toLowerCase().includes(q);
        const matchEn = p.name_en?.toLowerCase().includes(q);
        const matchAlt = p.alternate_barcodes?.some((b) => b.toLowerCase().includes(q));
        if (!matchName && !matchSku && !matchEn && !matchAlt) return false;
      }

      // Quick filter tabs
      const stock = stockMap[p.id] || 0;
      if (quickFilter === 'low_stock') {
        return p.item_type === 'storable' && (stock < 1 || stock <= (p.min_stock_alert || 0));
      }
      if (quickFilter === 'out_of_stock') {
        return p.item_type === 'storable' && stock <= 0;
      }
      if (quickFilter === 'quick_pos') {
        return !!p.is_quick_pos;
      }
      if (quickFilter === 'near_expiry') {
        if (!p.tracks_expiry || !batchesByProduct[p.id]) return false;
        return batchesByProduct[p.id].some(
          (b) =>
            (b.current_quantity ?? 0) > 0 &&
            b.expiry_date &&
            !isExpired(b.expiry_date) &&
            daysToExpiry(b.expiry_date) <= 90
        );
      }

      return true;
    });

    // Apply sorting
    if (sortField && sortDirection !== 'none') {
      list = [...list].sort((a, b) => {
        let valA: string | number = 0;
        let valB: string | number = 0;

        switch (sortField) {
          case 'name':
            return sortDirection === 'asc'
              ? a.name.localeCompare(b.name, 'ar')
              : b.name.localeCompare(a.name, 'ar');
          case 'name_en':
            return sortDirection === 'asc'
              ? (a.name_en || '').localeCompare(b.name_en || '', 'en')
              : (b.name_en || '').localeCompare(a.name_en || '', 'en');
          case 'purchase_price':
            valA = a.purchase_price || 0;
            valB = b.purchase_price || 0;
            break;
          case 'sale_price':
            valA = a.sale_price || 0;
            valB = b.sale_price || 0;
            break;
          case 'stock':
            valA = stockMap[a.id] || 0;
            valB = stockMap[b.id] || 0;
            break;
          case 'category':
            return sortDirection === 'asc'
              ? catName(a.category_id).localeCompare(catName(b.category_id), 'ar')
              : catName(b.category_id).localeCompare(catName(a.category_id), 'ar');
          case 'sku':
            valA = a.sku || '';
            valB = b.sku || '';
            break;
        }

        if (typeof valA === 'number' && typeof valB === 'number') {
          return sortDirection === 'asc' ? valA - valB : valB - valA;
        }
        return sortDirection === 'asc'
          ? String(valA).localeCompare(String(valB))
          : String(valB).localeCompare(String(valA));
      });
    }

    return list;
  }, [
    products,
    searchQuery,
    quickFilter,
    categoryFilter,
    brandFilter,
    typeFilter,
    unitFilter,
    taxFilter,
    warehouseFilter,
    showInactive,
    stockMap,
    stockLevels,
    batchesByProduct,
    sortField,
    sortDirection,
    categories,
  ]);

  // Reset pagination on filter changes
  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, quickFilter, categoryFilter, brandFilter, typeFilter, unitFilter, taxFilter, warehouseFilter, showInactive, sortField, sortDirection]);

  // Pagination
  const totalPages = Math.max(1, Math.ceil(filteredProducts.length / pageSize));
  const paginatedProducts = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredProducts.slice(start, start + pageSize);
  }, [filteredProducts, currentPage, pageSize]);

  // Selection handlers
  const toggleSelectAll = () => {
    if (selectedIds.size === paginatedProducts.length && paginatedProducts.length > 0) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(paginatedProducts.map((p) => p.id)));
    }
  };

  const toggleSelectRow = (id: string) => {
    const next = new Set(selectedIds);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setSelectedIds(next);
  };

  // Toggle Quick POS
  const toggleQuickPos = async (product: Product) => {
    const nextState = !product.is_quick_pos;
    await ProductRepository.setQuickPos(product.id, nextState);
    toast.success(
      nextState
        ? `تمت إضافة الصنف (${product.name}) إلى الأصناف السريعة ⭐`
        : `تمت إزالة الصنف (${product.name}) من الأصناف السريعة`
    );
    await loadData();
  };

  // Archive / Soft Delete Product
  const archiveProduct = async (product: Product) => {
    await ProductRepository.deleteProduct(product.id);
    toast.success(`تم أرشفة/حذف الصنف (${product.name}) بنجاح.`);
    await loadData();
  };

  // Reset advanced filters
  const resetAdvancedFilters = () => {
    setCategoryFilter('all');
    setBrandFilter('all');
    setTypeFilter('all');
    setUnitFilter('all');
    setTaxFilter('all');
    setWarehouseFilter('all');
    setShowInactive(false);
  };

  // CSV Export
  const handleExportCsv = () => {
    if (filteredProducts.length === 0) {
      toast.error('لا توجد أصناف لتصديرها.');
      return;
    }

    const headers = ['الباركود / الكود', 'اسم الصنف', 'الاسم الإنجليزي', 'التصنيف', 'سعر الشراء', 'سعر البيع', 'المخزون الحالي'];
    const rows = filteredProducts.map((p) => [
      `"${p.sku}"`,
      `"${p.name.replace(/"/g, '""')}"`,
      `"${(p.name_en || '').replace(/"/g, '""')}"`,
      `"${catName(p.category_id)}"`,
      p.purchase_price || 0,
      p.sale_price || 0,
      stockMap[p.id] || 0,
    ]);

    const csvContent = '\uFEFF' + [headers.join(','), ...rows.map((e) => e.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `قائمة_الأصناف_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success('تم تصدير ملف الأصناف بنجاح.');
  };

  const detailProduct = detailId ? products.find((p) => p.id === detailId) : undefined;

  return {
    orgId,
    products,
    categories,
    brands,
    units,
    unitsById,
    productUnitsByProduct,
    warehouses,
    stockMap,
    stockLevels,
    batchesByProduct,
    isLoading,
    quickFilter,
    setQuickFilter,
    showAdvancedFilter,
    setShowAdvancedFilter,
    searchQuery,
    setSearchQuery,
    categoryFilter,
    setCategoryFilter,
    brandFilter,
    setBrandFilter,
    typeFilter,
    setTypeFilter,
    unitFilter,
    setUnitFilter,
    taxFilter,
    setTaxFilter,
    warehouseFilter,
    setWarehouseFilter,
    showInactive,
    setShowInactive,
    resetAdvancedFilters,
    sortField,
    sortDirection,
    toggleSort,
    density,
    setDensity,
    openingStockProduct,
    setOpeningStockProduct,
    itemCardProduct,
    setItemCardProduct,
    toggleQuickPos,
    archiveProduct,
    selectedIds,
    toggleSelectAll,
    toggleSelectRow,
    pageSize,
    setPageSize,
    currentPage,
    setCurrentPage,
    totalPages,
    visibleColumns,
    setVisibleColumns,
    stats,
    filteredProducts,
    paginatedProducts,
    catName,
    unitName,
    handleExportCsv,
    detailProduct,
    isPharmacy,
    forceSyncCatalog,
    reload: loadData,
  };
}
