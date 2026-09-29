/**
 * Falcon Cloud Read Gate
 *
 * ONLINE-FIRST read strategy for hot (fast-changing) data:
 * - Online -> authoritative row set straight from Supabase (source of truth),
 * so every device sees live quantities immediately.
 * - Offline -> cached copy from Dexie (last synced state).
 *
 * Every gate falls back to Dexie if the cloud read fails or times out, so the
 * UI never blocks because of a cloud hiccup.
 */

import { supabase } from'@/core/supabase/supabase_client';
import { db } from'@/core/db/app_database';
import { networkListener } from'@/core/sync/network_listener';
import type { ProductBatch, StockLevel } from'@/types';

const CLOUD_READ_TIMEOUT_MS = 4000;

function withTimeout<T>(promise: PromiseLike<T>, ms: number): Promise<T> {
 return new Promise<T>((resolve, reject) => {
 const timer = setTimeout(() => reject(new Error('cloud read timeout')), ms);
 promise.then(
 (result) => {
 clearTimeout(timer);
 resolve(result);
 },
 (error) => {
 clearTimeout(timer);
 reject(error);
 }
 );
 });
}

async function fetchOnlineRows<T>(table:'stock_levels'|'product_batches', orgId: string): Promise<T[] | null> {
 if (!networkListener.getStatus()) return null;
 try {
 const { data, error } = await withTimeout(
 supabase.from(table).select('*').eq('org_id', orgId),
 CLOUD_READ_TIMEOUT_MS
 );
 if (error) return null;
 return (data as T[]) || null;
 } catch {
 return null;
 }
}

/** Authoritative stock levels for an organization (cloud-first, Dexie fallback). */
export async function getAuthoritativeStockLevels(orgId: string): Promise<StockLevel[]> {
 const online = await fetchOnlineRows<StockLevel>('stock_levels', orgId);
 if (online) return online;
 return db.stock_levels.where('org_id').equals(orgId).toArray();
}

/** Authoritative product batches for an organization (cloud-first, Dexie fallback). */
export async function getAuthoritativeProductBatches(orgId: string): Promise<ProductBatch[]> {
 const online = await fetchOnlineRows<ProductBatch>('product_batches', orgId);
 if (online) return online;
 return db.product_batches.where('org_id').equals(orgId).toArray();
}