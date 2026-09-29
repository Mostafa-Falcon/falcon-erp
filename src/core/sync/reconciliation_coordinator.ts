/**
 * Falcon Reconciliation Coordinator
 *
 * Orchestrates the recovery procedure when the device reconnects to the cloud
 * after an offline window. Order matters:
 * 1. FLUSH - push every queued offline document to the cloud (must succeed
 * before anything else; stock/ledger truths live server-side).
 * 2. RENUMBER - falcon_reassign_offline_document_numbers: convert device-scoped
 * temp numbers (INV-P<dev>-###### ...) to authoritative numbers.
 * 3. LEDGER - falcon_reconcile_stock_ledger: rebuild stock_levels and
 * product_batches from the inventory_transactions ledger.
 * 4. PULL - full authoritative re-pull so every local table matches the
 * cloud (renumbered documents, fixed balances, other devices).
 *
 * The heavy rebuild steps only run after the outbox queue is fully drained;
 * otherwise they would clobber unsynced local state.
 */

import { supabase, isSupabaseConfigured } from'@/core/supabase/supabase_client';
import { networkListener } from'@/core/sync/network_listener';
import { syncCoordinator } from'@/core/sync/sync_coordinator';
import { SyncQueueManager } from'@/core/sync/sync_queue_manager';
import { PullSyncService } from'@/core/sync/pull_sync_service';
import { useSessionStore } from'@/core/state/useSessionStore';

export interface ReconcileResult {
 ok: boolean;
 steps: string[];
 error?: string;
}

export class ReconciliationCoordinator {
 private static running = false;

 public static get isRunning(): boolean {
 return ReconciliationCoordinator.running;
 }

 public static async reconcile(): Promise<ReconcileResult> {
 if (ReconciliationCoordinator.running) {
 return { ok: false, steps: [], error:'Reconciliation already in progress'};
 }
 if (typeof window ==='undefined') {
 return { ok: false, steps: [], error:'Not a browser environment'};
 }

 const orgId = useSessionStore.getState().currentUser?.org_id;
 if (!orgId || !networkListener.getStatus() || !isSupabaseConfigured()) {
 return { ok: false, steps: [], error:'Offline or organization not determined'};
 }

 ReconciliationCoordinator.running = true;
 const steps: string[] = [];
 try {
 // 1. Push all queued offline work to the cloud.
 const flush = await syncCoordinator.triggerSync();
 steps.push('flush');
 if (!flush.success) {
 return { ok: false, steps, error: flush.error ||'Failed to flush pending queue'};
 }

 // Do not rebuild local state while some offline documents are still stuck.
 const pendingCount = await SyncQueueManager.getPendingCount();
 if (pendingCount > 0) {
 return { ok: false, steps, error:`${pendingCount} offline document(s) could not be pushed yet`};
 }

 // 2. Convert temporary offline numbers into authoritative ones.
 try {
 const { data, error } = await supabase.rpc('falcon_reassign_offline_document_numbers', {
 p_org_id: orgId,
 });
 if (error) {
 console.warn('[Reconcile] Document renumber RPC unavailable:', error.message);
 } else if (data?.ok) {
 steps.push('renumber');
 } else {
 console.warn('[Reconcile] Document renumber skipped:', data?.code ||'unknown');
 }
 } catch (err) {
 console.warn('[Reconcile] Document renumber error:', err);
 }

 // 3. Rebuild the authoritative stock ledger server-side.
 try {
 const { data, error } = await supabase.rpc('falcon_reconcile_stock_ledger', {
 p_org_id: orgId,
 });
 if (error) {
 console.warn('[Reconcile] Stock ledger reconciliation RPC unavailable:', error.message);
 } else if (data?.ok) {
 steps.push('ledger');
 } else {
 console.warn('[Reconcile] Stock ledger reconciliation skipped:', data?.code ||'unknown');
 }
 } catch (err) {
 console.warn('[Reconcile] Stock ledger reconciliation error:', err);
 }

 // 4. Re-pull: full reset when offline documents were just synced, plain
 // incremental pull for a normal reconnect without offline work.
 if (flush.pushed > 0) {
 await PullSyncService.forcePullAll(orgId);
 } else {
 await PullSyncService.pullAll(orgId);
 }
 steps.push('pull');

 return { ok: true, steps };
 } catch (err) {
 return { ok: false, steps, error: err instanceof Error ? err.message :'Unexpected reconciliation error'};
 } finally {
 ReconciliationCoordinator.running = false;
 }
 }
}