import { v4 as uuidv4 } from'uuid';
import { db } from'@/core/db/app_database';
import { SyncQueueManager } from'@/core/sync/sync_queue_manager';
import { syncCoordinator } from'@/core/sync/sync_coordinator';
import type { Product, ProductUnit, ProductBatch, Warehouse, StockLevel } from'@/types';

export class ProductRepository {
 /**
 * Get all active products for organization, excluding legacy dummy/test items
 */
 public static async getAll(orgId: string): Promise<Product[]> {
 const isDummyName = (name: string) =>
 /^([0-9]+(\.[0-9]+)?|0[0-9]+|تجرب[ةه].*|test.*)$/i.test(name?.trim() ||'');

 // Asynchronous purge of any legacy dummy items from local Dexie
 db.products
 .where('org_id')
 .equals(orgId)
 .and((item) => isDummyName(item.name))
 .toArray()
 .then((dummies) => {
 if (dummies.length > 0) {
 const ids = dummies.map((d) => d.id);
 db.products.bulkDelete(ids);
 db.product_units.where('product_id').anyOf(ids).delete();
 db.stock_levels.where('product_id').anyOf(ids).delete();
 db.product_batches.where('product_id').anyOf(ids).delete();
 }
 })
 .catch(() => {});

 return await db.products
 .where('org_id')
 .equals(orgId)
 .and((item) => item.is_active && !isDummyName(item.name))
 .toArray();
 }

 /**
 * Find product by ID
 */
 public static async getById(id: string): Promise<Product | undefined> {
 return await db.products.get(id);
 }

 /**
 * Fast Barcode / SKU search: looks up main product SKU and secondary unit barcodes
 */
 public static async findByBarcode(
 barcode: string,
 orgId: string
 ): Promise<{ product: Product; unit?: ProductUnit } | null> {
 // 1. Direct SKU match
 const directProduct = await db.products
 .where('sku')
 .equals(barcode)
 .and((p) => p.org_id === orgId && p.is_active)
 .first();

 if (directProduct) {
 return { product: directProduct };
 }

 // 2. Unit barcode match
 const matchedUnit = await db.product_units
 .where('barcode')
 .equals(barcode)
 .first();

 if (matchedUnit) {
 const product = await db.products.get(matchedUnit.product_id);
 if (product && product.org_id === orgId && product.is_active) {
 return { product, unit: matchedUnit };
 }
 }

 return null;
 }

 /**
 * Search products by text query (name or sku)
 */
 public static async search(query: string, orgId: string, limit = 20): Promise<Product[]> {
 const q = query.trim().toLowerCase();
 if (!q) return [];

 return await db.products
 .where('org_id')
 .equals(orgId)
 .and((p) => p.is_active && (p.name.toLowerCase().includes(q) || p.sku.toLowerCase().includes(q)))
 .limit(limit)
 .toArray();
 }

 /**
 * Create new product with optional secondary units and opening stock batch
 */
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
 const now = new Date().toISOString();
 const productId = uuidv4();

 const product: Product = {
 ...productData,
 id: productId,
 created_at: now,
 updated_at: now,
 sync_status:'pending',
 };

 const unitsToInsert: ProductUnit[] = secondaryUnits.map((u) => ({
 ...u,
 id: uuidv4(),
 product_id: productId,
 created_at: now,
 updated_at: now,
 sync_status:'pending',
 }));

 const batchList = Array.isArray(openingBatch)
 ? openingBatch
 : openingBatch
 ? [openingBatch]
 : [];

 await db.transaction('rw', [db.products, db.product_units, db.product_batches, db.stock_levels, db.sync_queue], async () => {
 await db.products.add(product);
 await SyncQueueManager.enqueue('products', productId,'insert', product);

 if (unitsToInsert.length > 0) {
 await db.product_units.bulkAdd(unitsToInsert);
 for (const u of unitsToInsert) {
 await SyncQueueManager.enqueue('product_units', u.id,'insert', u);
 }
 }

 // إدراج تشغيلات الصلاحية والرصيد الافتتاحي
 const warehouseTotals = new Map<string, number>();

 for (let i = 0; i < batchList.length; i++) {
 const b = batchList[i];
 if (b && b.initial_quantity > 0 && b.warehouse_id) {
 const batchId = uuidv4();
 const batchRecord: ProductBatch = {
 id: batchId,
 org_id: productData.org_id,
 product_id: productId,
 warehouse_id: b.warehouse_id,
 batch_number: b.batch_number?.trim() ||`BATCH-${Date.now().toString().slice(-4)}-${i + 1}`,
 expiry_date: b.expiry_date || null,
 initial_quantity: b.initial_quantity,
 current_quantity: b.initial_quantity,
 purchase_price: b.purchase_price ?? productData.purchase_price ?? 0,
 created_at: now,
 updated_at: now,
 sync_status:'pending',
 };
 await db.product_batches.add(batchRecord);
 await SyncQueueManager.enqueue('product_batches', batchId,'insert', batchRecord);

 const currentTotal = warehouseTotals.get(b.warehouse_id) || 0;
 warehouseTotals.set(b.warehouse_id, currentTotal + b.initial_quantity);
 }
 }

 for (const [wId, totalQty] of warehouseTotals.entries()) {
 const stockId =`${wId}_${productId}`;
 const stockLevel: StockLevel = {
 id: stockId,
 org_id: productData.org_id,
 warehouse_id: wId,
 product_id: productId,
 quantity: totalQty,
 reserved_quantity: 0,
 available_quantity: totalQty,
 updated_at: now,
 sync_status:'pending',
 };
 await db.stock_levels.put(stockLevel);
 await SyncQueueManager.enqueue('stock_levels', stockId,'insert', stockLevel);
 }
 });

 // إطلاق مزامنة سحابية فورية ولحظية مع Supabase في الخلفية
 syncCoordinator.triggerSync().catch(console.error);

 return product;
 }

 /**
 * Update existing product
 */
 public static async updateProduct(id: string, updates: Partial<Product>): Promise<Product | null> {
 const existing = await db.products.get(id);
 if (!existing) return null;

 const now = new Date().toISOString();
 const updated: Product = {
 ...existing,
 ...updates,
 updated_at: now,
 sync_status:'pending',
 };

 await db.transaction('rw', [db.products, db.sync_queue], async () => {
 await db.products.put(updated);
 await SyncQueueManager.enqueue('products', id,'update', updated);
 });

 syncCoordinator.triggerSync().catch(console.error);

 return updated;
 }

 /**
 * Toggle quick POS (fast moving) flag
 */
 public static async setQuickPos(id: string, isQuickPos: boolean): Promise<Product | null> {
 return await this.updateProduct(id, { is_quick_pos: isQuickPos });
 }

 /**
 * Soft-delete (deactivate) a product from the catalog
 */
 public static async setActive(productId: string, isActive: boolean): Promise<Product | null> {
 return await ProductRepository.updateProduct(productId, { is_active: isActive });
 }

 /**
 * Delete or archive a product (soft delete via is_active = false)
 */
 public static async deleteProduct(id: string): Promise<void> {
 const existing = await db.products.get(id);
 if (!existing) return;
 const now = new Date().toISOString();
 const updated: Product = {
 ...existing,
 is_active: false,
 updated_at: now,
 sync_status:'pending',
 };
 await db.transaction('rw', [db.products, db.sync_queue], async () => {
 await db.products.put(updated);
 await SyncQueueManager.enqueue('products', id,'update', updated);
 });
 syncCoordinator.triggerSync().catch(console.error);
 }

 /**
 * Get all active warehouses for organization
 */
 public static async getAllWarehouses(orgId: string): Promise<Warehouse[]> {
 return await db.warehouses
 .where('org_id')
 .equals(orgId)
 .and((w) => w.is_active)
 .toArray();
 }
}