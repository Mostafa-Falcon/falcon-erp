import { v4 as uuidv4 } from'uuid';
import { db } from'@/core/db/app_database';
import { SyncQueueManager } from'@/core/sync/sync_queue_manager';
import { syncCoordinator } from'@/core/sync/sync_coordinator';
import type { ProductBrand } from'@/types';

export class BrandRepository {
 public static async getBrands(orgId: string): Promise<ProductBrand[]> {
 return await db.product_brands
 .where('org_id')
 .equals(orgId)
 .toArray();
 }

 public static async createBrand(
 nameOrData: string | { name: string; org_id: string },
 orgId?: string
 ): Promise<ProductBrand> {
 const name = typeof nameOrData ==='string'? nameOrData.trim() : nameOrData.name.trim();
 const finalOrgId = typeof nameOrData ==='string'? (orgId ||'') : nameOrData.org_id;
 const now = new Date().toISOString();
 const brand: ProductBrand = {
 id: uuidv4(),
 org_id: finalOrgId,
 name,
 created_at: now,
 updated_at: now,
 sync_status:'pending',
 };
 await db.product_brands.add(brand);
 await SyncQueueManager.enqueue('product_brands', brand.id,'insert', brand);
 syncCoordinator.triggerSync().catch(console.error);
 return brand;
 }

 public static async updateBrand(
 id: string,
 updates: Partial<ProductBrand>
 ): Promise<ProductBrand | null> {
 const existing = await db.product_brands.get(id);
 if (!existing) return null;

 const now = new Date().toISOString();
 const updated: ProductBrand = {
 ...existing,
 ...updates,
 updated_at: now,
 sync_status:'pending',
 };
 await db.transaction('rw', [db.product_brands, db.sync_queue], async () => {
 await db.product_brands.put(updated);
 await SyncQueueManager.enqueue('product_brands', id,'update', updated);
 });
 syncCoordinator.triggerSync().catch(console.error);
 return updated;
 }

 public static async deleteBrand(id: string): Promise<void> {
 await db.transaction('rw', [db.product_brands, db.sync_queue], async () => {
 await db.product_brands.delete(id);
 await SyncQueueManager.enqueue('product_brands', id,'delete', { id });
 });
 syncCoordinator.triggerSync().catch(console.error);
 }
}