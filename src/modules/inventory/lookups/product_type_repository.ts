import { v4 as uuidv4 } from'uuid';
import { db } from'@/core/db/app_database';
import { SyncQueueManager } from'@/core/sync/sync_queue_manager';
import { syncCoordinator } from'@/core/sync/sync_coordinator';
import type { ProductTypeItem } from'@/types';

export class ProductTypeRepository {
 public static async getProductTypes(orgId: string): Promise<ProductTypeItem[]> {
 return await db.product_types
 .where('org_id')
 .equals(orgId)
 .toArray();
 }

 public static async createProductType(name: string, orgId: string, code?: string): Promise<ProductTypeItem> {
 const now = new Date().toISOString();
 const item: ProductTypeItem = {
 id: uuidv4(),
 org_id: orgId,
 name: name.trim(),
 code: code || name.trim().toLowerCase().replace(/\s+/g,'_'),
 is_active: true,
 created_at: now,
 updated_at: now,
 sync_status:'pending',
 };
 await db.product_types.add(item);
 await SyncQueueManager.enqueue('product_types', item.id,'insert', item);
 syncCoordinator.triggerSync().catch(console.error);
 return item;
 }

 public static async updateProductType(
 id: string,
 updates: Partial<Pick<ProductTypeItem,'name'|'code'|'is_active'>>,
 orgId?: string
 ): Promise<ProductTypeItem | null> {
 const existing = await db.product_types.get(id);
 if (!existing) return null;

 const now = new Date().toISOString();
 const updated: ProductTypeItem = {
 ...existing,
 ...updates,
 org_id: existing.org_id || orgId ||'',
 updated_at: now,
 sync_status:'pending',
 };
 await db.transaction('rw', [db.product_types, db.sync_queue], async () => {
 await db.product_types.put(updated);
 await SyncQueueManager.enqueue('product_types', id,'update', updated);
 });
 syncCoordinator.triggerSync().catch(console.error);
 return updated;
 }

 public static async deleteProductType(id: string, orgId?: string): Promise<void> {
 const existing = await db.product_types.get(id);
 await db.transaction('rw', [db.product_types, db.sync_queue], async () => {
 await db.product_types.delete(id);
 await SyncQueueManager.enqueue('product_types', id,'delete', {
 id,
 org_id: existing?.org_id || orgId ||'',
 });
 });
 syncCoordinator.triggerSync().catch(console.error);
 }
}