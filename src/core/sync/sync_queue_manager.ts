import { v4 as uuidv4 } from 'uuid';
import { db } from '@/core/db/app_database';
import type { SyncOperation, SyncQueueItem } from '@/types';

/**
 * 🦅 Falcon ERP - Outbox Pattern Sync Queue Manager
 * Ensures that every local state change is recorded atomically for cloud synchronization.
 */
export class SyncQueueManager {
  /**
   * Enqueues an operation to the sync queue.
   */
  public static async enqueue(
    table: string,
    id: string,
    operation: SyncOperation,
    data: object
  ): Promise<SyncQueueItem> {
    const now = new Date().toISOString();

    // Check if there is an existing pending action for the exact same entity to coalesce updates
    const existing = await db.sync_queue
      .where('entity_table')
      .equals(table)
      .and((item) => item.entity_id === id && item.status === 'pending')
      .first();

    if (existing) {
      if (existing.operation === 'insert' && operation === 'update') {
        // Merge payloads for an un-synced inserted item
        const mergedPayload = JSON.stringify({
          ...JSON.parse(existing.payload),
          ...data,
          updated_at: now,
        });

        await db.sync_queue.update(existing.id, {
          payload: mergedPayload,
          updated_at: now,
        });

        return { ...existing, payload: mergedPayload, updated_at: now };
      }

      if (existing.operation === 'insert' && operation === 'delete') {
        // If inserted then deleted before syncing to cloud, simply remove from queue
        await db.sync_queue.delete(existing.id);
        return existing;
      }
    }

    const queueItem: SyncQueueItem = {
      id: uuidv4(),
      entity_table: table,
      entity_id: id,
      operation,
      payload: JSON.stringify(data),
      status: 'pending',
      retry_count: 0,
      last_error: null,
      created_at: now,
      updated_at: now,
    };

    await db.sync_queue.add(queueItem);
    return queueItem;
  }

  /**
   * Enqueues an ATOMIC DELTA operation for a counter row (stock_levels,
   * product_batches, treasuries, contacts, accounts).
   *
   * Deltas are commutative: instead of pushing the absolute row value, the
   * client pushes the CHANGE it produced. Pending deltas for the same row are
   * coalesced by summing numeric fields, so the offline queue never grows
   * unbounded and the server-side RPC converges to the true sum.
   *
   * Payload shape: `{ delta: <numeric/bool field changes>, meta: <rpc args> }`.
   */
  public static async enqueueDelta(
    table: string,
    id: string,
    delta: Record<string, number | boolean>,
    rpcMeta: Record<string, string | boolean> = {}
  ): Promise<SyncQueueItem> {
    const now = new Date().toISOString();

    const pendingDelta = await db.sync_queue
      .where('entity_table')
      .equals(table)
      .and((item) => item.entity_id === id && item.status === 'pending' && item.operation === 'delta')
      .first();

    if (pendingDelta) {
      const prev = JSON.parse(pendingDelta.payload) as {
        delta: Record<string, number | boolean>;
        meta: Record<string, string | boolean>;
      };

      const mergedDelta: Record<string, number | boolean> = { ...prev.delta };
      for (const [k, v] of Object.entries(delta)) {
        if (typeof v === 'number' && typeof prev.delta[k] === 'number') {
          mergedDelta[k] = roundDelta(Number(prev.delta[k]) + v);
        } else {
          mergedDelta[k] = v;
        }
      }

      const payload = JSON.stringify({ delta: mergedDelta, meta: { ...prev.meta, ...rpcMeta } });
      await db.sync_queue.update(pendingDelta.id, { payload, updated_at: now });
      return { ...pendingDelta, payload, updated_at: now };
    }

    const queueItem: SyncQueueItem = {
      id: uuidv4(),
      entity_table: table,
      entity_id: id,
      operation: 'delta',
      payload: JSON.stringify({ delta, meta: rpcMeta }),
      status: 'pending',
      retry_count: 0,
      last_error: null,
      created_at: now,
      updated_at: now,
    };

    await db.sync_queue.add(queueItem);
    return queueItem;
  }

  /**
   * Marks an item as permanently failed (no further automatic retries).
   * Used when the server rightfully rejects a delta (e.g. INSUFFICIENT_STOCK):
   * retrying would re-apply an operation the ledger says must not happen.
   */
  public static async markRejected(id: string, errorMessage: string): Promise<void> {
    await db.sync_queue.update(id, {
      status: 'failed',
      last_error: errorMessage,
      updated_at: new Date().toISOString(),
    });
  }

  /**
   * Retrieves pending sync items ordered by creation time (including failed items ready for retry).
   */
  public static async getPendingItems(limit = 50): Promise<SyncQueueItem[]> {
    const now = Date.now();
    const items = await db.sync_queue
      .filter((item) => {
        if (item.status === 'pending') return true;
        if (item.status === 'failed') return true;
        if (item.status === 'in_flight') {
          const age = now - new Date(item.updated_at || item.created_at).getTime();
          return age > 15000; // stuck in flight for over 15s
        }
        return false;
      })
      .limit(limit)
      .toArray();

    return items.sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
  }

  /**
   * Marks an item as in-flight.
   */
  public static async markInFlight(id: string): Promise<void> {
    await db.sync_queue.update(id, {
      status: 'in_flight',
      updated_at: new Date().toISOString(),
    });
  }

  /**
   * Marks an item as synced and clears or archives it.
   */
  public static async markSynced(id: string): Promise<void> {
    await db.sync_queue.delete(id);
  }

  /**
   * Marks an item as failed with error details and increments retry count.
   */
  public static async markFailed(id: string, errorMessage: string): Promise<void> {
    const item = await db.sync_queue.get(id);
    if (!item) return;

    const retryCount = item.retry_count + 1;
    const isPermanentFailure = retryCount >= 5;

    await db.sync_queue.update(id, {
      status: isPermanentFailure ? 'failed' : 'pending',
      retry_count: retryCount,
      last_error: errorMessage,
      updated_at: new Date().toISOString(),
    });
  }

  /**
   * Count total pending sync items.
   */
  public static async getPendingCount(): Promise<number> {
    return await db.sync_queue.where('status').equals('pending').count();
  }
}

/**
 * Rounds summed deltas to 2 decimals to avoid float drift accumulating
 * across many coalesced pending operations.
 */
function roundDelta(value: number): number {
  return Math.round(value * 100) / 100;
}
