import { v4 as uuidv4 } from'uuid';
import { db } from'@/core/db/app_database';
import { SyncQueueManager } from'@/core/sync/sync_queue_manager';
import type { Department } from'@/types';

export class DepartmentRepository {
 public static async getAll(orgId: string): Promise<Department[]> {
 return await db.departments.where('org_id').equals(orgId).toArray();
 }

 public static async addDepartment(dept: Omit<Department,'id'|'created_at'|'updated_at'|'sync_status'>): Promise<void> {
 const now = new Date().toISOString();
 const id = uuidv4();
 const record: Department = {
 ...dept,
 id,
 created_at: now,
 updated_at: now,
 sync_status:'pending'
 };

 await db.transaction('rw', [db.departments, db.sync_queue], async () => {
 await db.departments.put(record);
 await SyncQueueManager.enqueue('departments', id,'insert', record);
 });
 }

 public static async updateDepartment(id: string, updates: Partial<Department>): Promise<void> {
 const now = new Date().toISOString();
 await db.transaction('rw', [db.departments, db.sync_queue], async () => {
 await db.departments.update(id, { ...updates, updated_at: now, sync_status:'pending'});
 const record = await db.departments.get(id);
 if (record) {
 await SyncQueueManager.enqueue('departments', id,'update', record);
 }
 });
 }

 public static async deleteDepartment(id: string): Promise<void> {
 await db.transaction('rw', [db.departments, db.sync_queue], async () => {
 await db.departments.delete(id);
 await SyncQueueManager.enqueue('departments', id,'delete', { id });
 });
 }
}