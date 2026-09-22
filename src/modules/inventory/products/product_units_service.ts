import { v4 as uuidv4 } from 'uuid';
import { db } from '@/core/db/app_database';
import { SyncQueueManager } from '@/core/sync/sync_queue_manager';
import { syncCoordinator } from '@/core/sync/sync_coordinator';
import { roundQty } from '@/lib/decimal';
import type { ProductUnit } from '@/types';

export class ProductUnitsService {
  /**
   * Replace all secondary units for a given product atomically.
   *
   * Every persisted level record carries the OWNER-provided `unit_name`
   * (denormalized snapshot of the unit name as entered per the business domain,
   * e.g. علبة / كرتونة) so UI display needs no JOIN and survives offline.
   * `level_order` starts at 2 (level 1 = the product's base unit). Existing
   * `available_quantity` silos are carried over when a level is not removed.
   */
  public static async replaceProductUnits(
    productId: string,
    units: Omit<ProductUnit, 'id' | 'product_id' | 'created_at' | 'updated_at' | 'sync_status'>[]
  ): Promise<void> {
    const now = new Date().toISOString();
    await db.transaction('rw', [db.product_units, db.units, db.sync_queue], async () => {
      const existing = await db.product_units.where('product_id').equals(productId).toArray();
      const prevAvailable = new Map<string, number>();
      for (const rec of existing) {
        prevAvailable.set(rec.unit_id, rec.available_quantity ?? 0);
        await db.product_units.delete(rec.id);
        await SyncQueueManager.enqueue('product_units', rec.id, 'delete', { id: rec.id });
      }

      let levelOrder = 1;
      for (const u of units) {
        levelOrder += 1;
        const uId = uuidv4();
        const unitName =
          (u.unit_name && u.unit_name.trim()) || (await db.units.get(u.unit_id))?.name || '';
        const rec: ProductUnit = {
          ...u,
          id: uId,
          product_id: productId,
          level_order: u.level_order ?? levelOrder,
          unit_name: unitName,
          available_quantity: roundQty(u.available_quantity ?? prevAvailable.get(u.unit_id) ?? 0),
          created_at: now,
          updated_at: now,
          sync_status: 'pending',
        };
        await db.product_units.add(rec);
        await SyncQueueManager.enqueue('product_units', uId, 'insert', rec);
      }
    });

    syncCoordinator.triggerSync().catch(console.error);
  }

  /**
   * Get all packaging/secondary units for a product
   */
  public static async getProductUnits(productId: string): Promise<ProductUnit[]> {
    return await db.product_units.where('product_id').equals(productId).toArray();
  }
}
