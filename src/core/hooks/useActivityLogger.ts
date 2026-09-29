import { v4 as uuidv4 } from'uuid';
import { db } from'@/core/db/app_database';
import { SyncQueueManager } from'@/core/sync/sync_queue_manager';
import { useSessionStore } from'@/core/state/useSessionStore';
import type { ActivityLog } from'@/types';

/**
 * 🦅 Falcon ERP - Universal Activity Logger Hook
 * Provides a standardized way to log user actions across the system.
 */
export function useActivityLogger() {
 const { currentUser } = useSessionStore();

 const logAction = async (params: {
 action: string;
 entity_type: string;
 entity_id?: string;
 details?: string;
 }) => {
 if (!currentUser?.org_id) return;

 const now = new Date().toISOString();
 const logId = uuidv4();

 const log: ActivityLog = {
 id: logId,
 org_id: currentUser.org_id,
 user_id: currentUser.id,
 user_name: currentUser.full_name,
 action: params.action,
 entity_type: params.entity_type,
 entity_id: params.entity_id,
 details: params.details,
 created_at: now,
 sync_status:'pending'
 };

 try {
 await db.transaction('rw', [db.activity_logs, db.sync_queue], async () => {
 await db.activity_logs.put(log);
 await SyncQueueManager.enqueue('activity_logs', logId,'insert', log);
 });
 } catch (err) {
 console.error('[ActivityLogger] Failed to log action:', err);
 }
 };

 return { logAction };
}