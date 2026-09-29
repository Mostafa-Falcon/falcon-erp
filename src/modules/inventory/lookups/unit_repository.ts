import { v4 as uuidv4 } from'uuid';
import { db } from'@/core/db/app_database';
import { SyncQueueManager } from'@/core/sync/sync_queue_manager';
import { syncCoordinator } from'@/core/sync/sync_coordinator';
import type { Unit } from'@/types';

export class UnitRepository {
 public static async getUnits(orgId: string): Promise<Unit[]> {
 return await db.units
 .where('org_id')
 .equals(orgId)
 .toArray();
 }

 public static async createUnit(name: string, symbol: string, orgId: string): Promise<Unit> {
 const now = new Date().toISOString();
 const unit: Unit = {
 id: uuidv4(),
 org_id: orgId,
 name: name.trim(),
 symbol: symbol.trim() || name.trim(),
 is_active: true,
 created_at: now,
 updated_at: now,
 sync_status:'pending',
 };
 await db.units.add(unit);
 await SyncQueueManager.enqueue('units', unit.id,'insert', unit);
 syncCoordinator.triggerSync().catch(console.error);
 return unit;
 }

 public static async updateUnit(id: string, updates: Partial<Unit>): Promise<Unit | null> {
 const existing = await db.units.get(id);
 if (!existing) return null;

 const now = new Date().toISOString();
 const updated: Unit = {
 ...existing,
 ...updates,
 updated_at: now,
 sync_status:'pending',
 };
 await db.transaction('rw', [db.units, db.sync_queue], async () => {
 await db.units.put(updated);
 await SyncQueueManager.enqueue('units', id,'update', updated);
 });
 syncCoordinator.triggerSync().catch(console.error);
 return updated;
 }
}