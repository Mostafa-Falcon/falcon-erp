import { v4 as uuidv4 } from 'uuid';
import { db } from '@/core/db/app_database';
import { SyncQueueManager } from '@/core/sync/sync_queue_manager';
import { DocumentNumberService } from '@/core/sync/document_number_service';
import type { StocktakeSession, StocktakeItem } from '@/types';
import { StockMovementService } from '../stock/stock_movement_service';

export class StocktakeRepository {
 /**
 * Get all stocktake sessions for an organization
 */
 public static async getStocktakeSessions(orgId: string): Promise<StocktakeSession[]> {
 return await db.stocktake_sessions
 .where('org_id')
 .equals(orgId)
 .reverse()
 .sortBy('created_at');
 }

 /**
 * Get a single stocktake session with items
 */
 public static async getStocktakeDetail(
 sessionId: string
 ): Promise<{ session: StocktakeSession; items: StocktakeItem[] }> {
 const session = await db.stocktake_sessions.get(sessionId);
 if (!session) throw new Error('جلسة الجرد غير موجودة.');
 const items = await db.stocktake_items.where('session_id').equals(sessionId).toArray();
 return { session, items };
 }

 /**
 * Initialize a new stocktake session (Draft)
 */
 public static async createStocktakeSession(params: {
 orgId: string;
 branchId: string;
 warehouseId: string;
 userId: string;
 notes?: string;
 }): Promise<StocktakeSession> {
 const now = new Date().toISOString();
 const id = uuidv4();
 const sessionNumber = await DocumentNumberService.nextStocktakeNumber(params.orgId, params.branchId);

 const session: StocktakeSession = {
 id,
 org_id: params.orgId,
 branch_id: params.branchId,
 warehouse_id: params.warehouseId,
 session_number: sessionNumber,
 status:'draft',
 notes: params.notes,
 total_difference_value: 0,
 created_by: params.userId,
 created_at: now,
 sync_status:'pending',
 };

 await db.stocktake_sessions.add(session);
 await SyncQueueManager.enqueue('stocktake_sessions', id,'insert', session);
 return session;
 }

 /**
 * Bulk update items in a draft session
 */
 public static async updateStocktakeItems(
 sessionId: string,
 items: Omit<StocktakeItem,'id'|'session_id'>[]
 ): Promise<void> {
 await db.transaction('rw', [db.stocktake_items, db.stocktake_sessions, db.sync_queue], async () => {
 // Clear existing items for this session (and remove them from the cloud queue)
 const existingItems = await db.stocktake_items.where('session_id').equals(sessionId).toArray();
 await db.stocktake_items.where('session_id').equals(sessionId).delete();
 for (const oldItem of existingItems) {
 await SyncQueueManager.enqueue('stocktake_items', oldItem.id,'delete', { id: oldItem.id });
 }

 let totalDiffValue = 0;
 const toAdd: StocktakeItem[] = items.map((it) => {
 const id = uuidv4();
 totalDiffValue += it.difference_value;
 return { ...it, id, session_id: sessionId };
 });

 if (toAdd.length > 0) {
 await db.stocktake_items.bulkAdd(toAdd);
 for (const item of toAdd) {
 await SyncQueueManager.enqueue('stocktake_items', item.id,'insert', item);
 }
 }

 const session = await db.stocktake_sessions.get(sessionId);
 if (session) {
 const updatedSession: StocktakeSession = {
 ...session,
 total_difference_value: totalDiffValue,
 sync_status:'pending',
 };
 await db.stocktake_sessions.put(updatedSession);
 await SyncQueueManager.enqueue('stocktake_sessions', sessionId,'update', updatedSession);
 }
 });
 }

 /**
 * Commits a stocktake session: updates actual stock levels and records movements.
 */
 public static async commitStocktakeSession(
 sessionId: string,
 userId: string
 ): Promise<{ success: boolean; error?: string }> {
 const { session, items } = await this.getStocktakeDetail(sessionId);
 if (session.status !=='draft') {
 return { success: false, error:'يمكن فقط اعتماد الجلسات المسودة.'};
 }

 try {
 await db.transaction(
'rw',
 [
 db.products,
 db.app_settings,
 db.stock_levels,
 db.inventory_transactions,
 db.product_batches,
 db.stocktake_sessions,
 db.stocktake_items,
 db.sync_queue,
 ],
 async () => {
 for (const it of items) {
 if (it.difference_quantity === 0) continue;

 const prod = await db.products.get(it.product_id);
 const baseUnitId = prod?.base_unit_id ||'';

 await StockMovementService.recordStockMovement({
 orgId: session.org_id,
 warehouseId: session.warehouse_id,
 productId: it.product_id,
 batchId: it.batch_id,
 transactionType: it.difference_quantity > 0 ?'adjustment_in':'adjustment_out',
 quantity: it.difference_quantity,
 unitId: baseUnitId,
 conversionFactor: 1,
 unitCost: it.unit_cost,
 referenceType:'manual',
 referenceId: session.id,
 notes:`جرد مخزوني ${session.session_number}`,
 userId,
 });
 }

 const now = new Date().toISOString();
 await db.stocktake_sessions.update(sessionId, {
 status:'completed',
 completed_at: now,
 sync_status:'pending',
 });

 const updated = await db.stocktake_sessions.get(sessionId);
 if (updated) {
 await SyncQueueManager.enqueue('stocktake_sessions', sessionId,'update', updated);
 }

 // Auto-accounting journal entry for inventory variance
 try {
 const { AccountingRepository } = await import('@/modules/accounting/accounting_repository');
 await AccountingRepository.postStocktakeAdjustment({
 orgId: session.org_id,
 branchId: session.branch_id,
 sessionId: session.id,
 sessionNumber: session.session_number,
 date: now,
 totalDifferenceValue: session.total_difference_value,
 userId,
 });
 } catch (accErr) {
 console.warn('Accounting stocktake post warning:', accErr);
 }
 }
 );
 return { success: true };
 } catch (err) {
 return {
 success: false,
 error: err instanceof Error ? err.message :'خطأ أثناء اعتماد الجلسة.',
 };
 }
 }

 /**
 * Delete a draft stocktake session and its items
 */
 public static async deleteStocktakeSession(
 sessionId: string
 ): Promise<{ success: boolean; error?: string }> {
 const session = await db.stocktake_sessions.get(sessionId);
 if (!session) return { success: false, error:'جلسة الجرد غير موجودة.'};
 if (session.status !=='draft') {
 return { success: false, error:'لا يمكن حذف جلسة جرد تم اعتمادها بالفعل.'};
 }

 try {
 await db.transaction('rw', [db.stocktake_sessions, db.stocktake_items, db.sync_queue], async () => {
 await db.stocktake_items.where('session_id').equals(sessionId).delete();
 await db.stocktake_sessions.delete(sessionId);
 await SyncQueueManager.enqueue('stocktake_sessions', sessionId,'delete', { id: sessionId });
 });
 return { success: true };
 } catch (err) {
 return {
 success: false,
 error: err instanceof Error ? err.message :'حدث خطأ أثناء الحذف.',
 };
 }
 }
}