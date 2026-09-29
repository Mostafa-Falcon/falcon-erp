import type {
 Product,
 ProductUnit,
 ProductCategory,
 Unit,
 ProductBrand,
 ProductTypeItem,
 ProductBatch,
 Warehouse,
} from'@/types';

import {
 ProductRepository as CoreProductRepo,
 ProductUnitsService,
 ProductBatchesService,
 ProductSubstitutesService,
} from'./products';

import {
 CategoryRepository,
 BrandRepository,
 UnitRepository,
 ProductTypeRepository,
} from'./lookups';

/**
 * 🦅 Falcon ERP - ProductRepository (Unified Domain Facade)
 * Maintains 100% backward compatibility while delegating to clean,
 * domain-driven sub-repositories and services.
 */
export class ProductRepository {
 // ── Core Products ──────────────────────────────────────────
 public static async getAll(orgId: string): Promise<Product[]> {
 return CoreProductRepo.getAll(orgId);
 }

 public static async getById(id: string): Promise<Product | undefined> {
 return CoreProductRepo.getById(id);
 }

 public static async findByBarcode(
 barcode: string,
 orgId: string
 ): Promise<{ product: Product; unit?: ProductUnit } | null> {
 return CoreProductRepo.findByBarcode(barcode, orgId);
 }

 public static async search(query: string, orgId: string, limit = 20): Promise<Product[]> {
 return CoreProductRepo.search(query, orgId, limit);
 }

 public static async createProduct(
 productData: Omit<Product,'id'|'created_at'|'updated_at'|'sync_status'>,
 secondaryUnits: Omit<ProductUnit,'id'|'product_id'|'created_at'|'updated_at'|'sync_status'>[] = [],
 openingBatch?:
 | {
 warehouse_id: string;
 batch_number: string;
 expiry_date?: string | null;
 initial_quantity: number;
 purchase_price?: number;
 }
 | Array<{
 warehouse_id: string;
 batch_number: string;
 expiry_date?: string | null;
 initial_quantity: number;
 purchase_price?: number;
 }>
 ): Promise<Product> {
 return CoreProductRepo.createProduct(productData, secondaryUnits, openingBatch);
 }

 public static async updateProduct(id: string, updates: Partial<Product>): Promise<Product | null> {
 return CoreProductRepo.updateProduct(id, updates);
 }

 public static async setQuickPos(id: string, isQuickPos: boolean): Promise<Product | null> {
 return CoreProductRepo.setQuickPos(id, isQuickPos);
 }

 public static async setActive(productId: string, isActive: boolean): Promise<Product | null> {
 return CoreProductRepo.setActive(productId, isActive);
 }

 public static async deleteProduct(id: string): Promise<void> {
 return CoreProductRepo.deleteProduct(id);
 }

 public static async getAllWarehouses(orgId: string): Promise<Warehouse[]> {
 return CoreProductRepo.getAllWarehouses(orgId);
 }

 // ── Units Management ───────────────────────────────────────
 public static async getProductUnits(productId: string): Promise<ProductUnit[]> {
 return ProductUnitsService.getProductUnits(productId);
 }

 public static async replaceProductUnits(
 productId: string,
 units: Omit<ProductUnit,'id'|'product_id'|'created_at'|'updated_at'|'sync_status'>[]
 ): Promise<void> {
 return ProductUnitsService.replaceProductUnits(productId, units);
 }

 // ── Batches & Lots ─────────────────────────────────────────
 public static async saveProductBatches(
 productId: string,
 orgId: string,
 batches: Array<{
 warehouse_id: string;
 batch_number: string;
 expiry_date?: string | null;
 initial_quantity: number;
 purchase_price?: number;
 }>
 ): Promise<void> {
 return ProductBatchesService.saveProductBatches(productId, orgId, batches);
 }

 public static async getProductBatches(productId: string): Promise<ProductBatch[]> {
 return ProductBatchesService.getProductBatches(productId);
 }

 // ── Substitutes ───────────────────────────────────────────
 public static async getSubstitutes(productId: string): Promise<Product[]> {
 return ProductSubstitutesService.getSubstitutes(productId);
 }

 public static async addSubstitute(productId: string, substituteId: string): Promise<void> {
 return ProductSubstitutesService.addSubstitute(productId, substituteId);
 }

 public static async removeSubstitute(productId: string, substituteId: string): Promise<void> {
 return ProductSubstitutesService.removeSubstitute(productId, substituteId);
 }

 // ── Lookups: Categories ───────────────────────────────────
 public static async getCategories(orgId: string): Promise<ProductCategory[]> {
 return CategoryRepository.getCategories(orgId);
 }

 public static async createCategory(
 nameOrData: string | { name: string; org_id: string; code?: string; is_active?: boolean },
 orgId?: string,
 code?: string
 ): Promise<ProductCategory> {
 return CategoryRepository.createCategory(nameOrData, orgId, code);
 }

 public static async updateCategory(
 id: string,
 updates: Partial<ProductCategory>
 ): Promise<ProductCategory | null> {
 return CategoryRepository.updateCategory(id, updates);
 }

 public static async deleteCategory(id: string): Promise<void> {
 return CategoryRepository.deleteCategory(id);
 }

 // ── Lookups: Brands ───────────────────────────────────────
 public static async getBrands(orgId: string): Promise<ProductBrand[]> {
 return BrandRepository.getBrands(orgId);
 }

 public static async createBrand(
 nameOrData: string | { name: string; org_id: string },
 orgId?: string
 ): Promise<ProductBrand> {
 return BrandRepository.createBrand(nameOrData, orgId);
 }

 public static async updateBrand(
 id: string,
 updates: Partial<ProductBrand>
 ): Promise<ProductBrand | null> {
 return BrandRepository.updateBrand(id, updates);
 }

 public static async deleteBrand(id: string): Promise<void> {
 return BrandRepository.deleteBrand(id);
 }

 // ── Lookups: Units ────────────────────────────────────────
 public static async getAllUnits(orgId: string): Promise<Unit[]> {
 return UnitRepository.getUnits(orgId);
 }

 public static async createUnit(name: string, symbol: string, orgId: string): Promise<Unit> {
 return UnitRepository.createUnit(name, symbol, orgId);
 }

 public static async updateUnit(id: string, updates: Partial<Unit>): Promise<Unit | null> {
 return UnitRepository.updateUnit(id, updates);
 }

 // ── Lookups: Product Types ────────────────────────────────
 public static async getProductTypes(orgId: string): Promise<ProductTypeItem[]> {
 return ProductTypeRepository.getProductTypes(orgId);
 }

 public static async createProductType(
 name: string,
 orgId: string,
 code?: string
 ): Promise<ProductTypeItem> {
 return ProductTypeRepository.createProductType(name, orgId, code);
 }

 public static async deleteProductType(id: string): Promise<void> {
 return ProductTypeRepository.deleteProductType(id);
 }
}