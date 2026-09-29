import { db } from'@/core/db/app_database';
import { SyncQueueManager } from'@/core/sync/sync_queue_manager';
import { syncCoordinator } from'@/core/sync/sync_coordinator';
import type { Product } from'@/types';

export class ProductSubstitutesService {
 /**
 * Get all user-defined substitutes for a product
 */
 public static async getSubstitutes(productId: string): Promise<Product[]> {
 const product = await db.products.get(productId);
 if (!product || !product.substitute_ids || product.substitute_ids.length === 0) {
 return [];
 }
 const subs = await db.products.where('id').anyOf(product.substitute_ids).toArray();
 return subs.filter((p) => p.is_active);
 }

 /**
 * Add a substitute product entered by the business owner (Mutual Linking)
 */
 public static async addSubstitute(productId: string, substituteId: string): Promise<void> {
 if (productId === substituteId) return;

 const product = await db.products.get(productId);
 if (!product) return;

 const currentSubs = new Set(product.substitute_ids || []);
 currentSubs.add(substituteId);

 const now = new Date().toISOString();
 const updatedProduct: Product = {
 ...product,
 substitute_ids: Array.from(currentSubs),
 updated_at: now,
 sync_status:'pending',
 };

 // Also mutual linking: add productId to substitute's substitute_ids
 const subProduct = await db.products.get(substituteId);
 let updatedSubProduct: Product | null = null;
 if (subProduct) {
 const otherSubs = new Set(subProduct.substitute_ids || []);
 otherSubs.add(productId);
 updatedSubProduct = {
 ...subProduct,
 substitute_ids: Array.from(otherSubs),
 updated_at: now,
 sync_status:'pending',
 };
 }

 await db.transaction('rw', [db.products, db.sync_queue], async () => {
 await db.products.put(updatedProduct);
 await SyncQueueManager.enqueue('products', productId,'update', updatedProduct);

 if (updatedSubProduct) {
 await db.products.put(updatedSubProduct);
 await SyncQueueManager.enqueue('products', substituteId,'update', updatedSubProduct);
 }
 });

 syncCoordinator.triggerSync().catch(console.error);
 }

 /**
 * Remove a substitute product link (Mutual Unlinking)
 */
 public static async removeSubstitute(productId: string, substituteId: string): Promise<void> {
 const product = await db.products.get(productId);
 if (!product || !product.substitute_ids) return;

 const updatedList = product.substitute_ids.filter((id) => id !== substituteId);
 const now = new Date().toISOString();
 const updatedProduct: Product = {
 ...product,
 substitute_ids: updatedList,
 updated_at: now,
 sync_status:'pending',
 };

 // Mutual unlink
 const subProduct = await db.products.get(substituteId);
 let updatedSubProduct: Product | null = null;
 if (subProduct && subProduct.substitute_ids) {
 updatedSubProduct = {
 ...subProduct,
 substitute_ids: subProduct.substitute_ids.filter((id) => id !== productId),
 updated_at: now,
 sync_status:'pending',
 };
 }

 await db.transaction('rw', [db.products, db.sync_queue], async () => {
 await db.products.put(updatedProduct);
 await SyncQueueManager.enqueue('products', productId,'update', updatedProduct);

 if (updatedSubProduct) {
 await db.products.put(updatedSubProduct);
 await SyncQueueManager.enqueue('products', substituteId,'update', updatedSubProduct);
 }
 });

 syncCoordinator.triggerSync().catch(console.error);
 }
}