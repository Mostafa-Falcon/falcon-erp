import type {
 Product,
 ProductCategory,
 ProductBrand,
 ProductUnit,
 Unit,
 Warehouse,
 StockLevel,
 ProductBatch,
} from'@/types';

export type QuickFilterType ='all'|'low_stock'|'near_expiry'|'out_of_stock'|'quick_pos';

export type SortField ='name'|'name_en'|'purchase_price'|'sale_price'|'stock'|'category'|'sku';
export type SortDirection ='asc'|'desc'|'none';

export type TableDensity ='compact'|'medium'|'relaxed';

export interface VisibleColumns {
 nameEn: boolean;
 purchasePrice: boolean;
 salePrice: boolean;
 stock: boolean;
 category: boolean;
 barcode: boolean;
 brand?: boolean;
 itemType?: boolean;
}

export interface CatalogStats {
 total: number;
 lowStockCount: number;
 nearExpiryCount: number;
 outOfStockCount: number;
 totalStockValue: number;
}