import { v4 as uuidv4 } from'uuid';
import { db } from'@/core/db/app_database';
import { SyncQueueManager } from'@/core/sync/sync_queue_manager';
import { syncCoordinator } from'@/core/sync/sync_coordinator';
import type { ProductCategory } from'@/types';

export class CategoryRepository {
 public static async getCategories(orgId: string): Promise<ProductCategory[]> {
 return await db.product_categories
 .where('org_id')
 .equals(orgId)
 .toArray();
 }

 public static async createCategory(
 nameOrData: string | { name: string; org_id: string; code?: string; is_active?: boolean },
 orgId?: string,
 code?: string
 ): Promise<ProductCategory> {
 const isObj = typeof nameOrData !=='string';
 const name = isObj ? nameOrData.name.trim() : nameOrData.trim();
 const finalOrgId = isObj ? nameOrData.org_id : (orgId ||'');
 const finalCode = isObj ? nameOrData.code : code;
 const isActive = isObj ? (nameOrData.is_active ?? true) : true;

 const now = new Date().toISOString();
 const category: ProductCategory = {
 id: uuidv4(),
 org_id: finalOrgId,
 name,
 code: finalCode,
 is_active: isActive,
 created_at: now,
 updated_at: now,
 sync_status:'pending',
 };
 await db.product_categories.add(category);
 await SyncQueueManager.enqueue('product_categories', category.id,'insert', category);
 syncCoordinator.triggerSync().catch(console.error);
 return category;
 }

 public static async updateCategory(
 id: string,
 updates: Partial<ProductCategory>
 ): Promise<ProductCategory | null> {
 const existing = await db.product_categories.get(id);
 if (!existing) return null;

 const now = new Date().toISOString();
 const updated: ProductCategory = {
 ...existing,
 ...updates,
 updated_at: now,
 sync_status:'pending',
 };
 await db.transaction('rw', [db.product_categories, db.sync_queue], async () => {
 await db.product_categories.put(updated);
 await SyncQueueManager.enqueue('product_categories', id,'update', updated);
 });
 syncCoordinator.triggerSync().catch(console.error);
 return updated;
 }

 public static async deleteCategory(id: string): Promise<void> {
 await db.transaction('rw', [db.product_categories, db.sync_queue], async () => {
 await db.product_categories.delete(id);
 await SyncQueueManager.enqueue('product_categories', id,'delete', { id });
 });
 syncCoordinator.triggerSync().catch(console.error);
 }
}