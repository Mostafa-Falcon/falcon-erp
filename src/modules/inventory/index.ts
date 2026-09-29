/**
 * 🦅 Falcon ERP - Inventory Module Main Barrel
 * Unified exports for domain repositories, services, and types.
 */
export {
 ProductUnitsService,
 ProductBatchesService,
 ProductSubstitutesService,
} from'./products';
export * from'./lookups';
export * from'./stock';
export * from'./stocktake';
export * from'./transfers';

// Unified Facades
export { ProductRepository } from'./product_repository';
export { InventoryRepository } from'./inventory_repository';
export { StockTransferRepository } from'./stock_transfer_repository';