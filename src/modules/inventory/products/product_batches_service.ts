import { v4 as uuidv4 } from 'uuid';
import { db } from '@/core/db/app_database';
import { SyncQueueManager } from '@/core/sync/sync_queue_manager';
import { syncCoordinator } from '@/core/sync/sync_coordinator';
import type { ProductBatch, StockLevel } from '@/types';
import { useSessionStore } from '@/core/state/useSessionStore';

export class ProductBatchesService {
	/**
	 * Save / Sync product batches and update stock levels.
	 *
	 * Every change to `stock_levels` is mirrored by an authoritative
	 * `inventory_transactions` row (opening_stock for the first nonzero
	 * adjustment, adjustment otherwise). Without the ledger entry the
	 * periodic reconciliation (falcon_reconcile_stock_ledger) would
	 * overwrite whatever stock the device wrote with sum(ledger) = 0.
	 */
	public static async saveProductBatches(
		productId: string,
		orgId: string,
		batches: Array<{
			warehouse_id: string;
			batch_number: string;
			expiry_date?: string | null;
			initial_quantity: number;
			purchase_price?: number;
		}>
	): Promise<void> {
		const now = new Date().toISOString();
		await db.transaction(
			'rw',
			[db.product_batches, db.stock_levels, db.inventory_transactions, db.sync_queue],
			async () => {
				const product = await db.products.get(productId);
				const baseUnit = product?.base_unit_id ? await db.units.get(product.base_unit_id) : undefined;
				const baseUnitName = baseUnit?.name;
				const userId = useSessionStore.getState().currentUser?.id;

				// Clear existing batches for this product
				const existing = await db.product_batches.where('product_id').equals(productId).toArray();
				for (const rec of existing) {
					await db.product_batches.delete(rec.id);
					await SyncQueueManager.enqueue('product_batches', rec.id, 'delete', { id: rec.id });
				}

				const warehouseTotals = new Map<string, number>();

				for (let i = 0; i < batches.length; i++) {
					const b = batches[i];
					if (b && b.initial_quantity > 0 && b.warehouse_id) {
						const batchId = uuidv4();
						const batchRecord: ProductBatch = {
							id: batchId,
							org_id: orgId,
							product_id: productId,
							warehouse_id: b.warehouse_id,
							batch_number:
								b.batch_number?.trim() || `BATCH-${Date.now().toString().slice(-4)}-${i + 1}`,
							expiry_date: b.expiry_date || null,
							initial_quantity: b.initial_quantity,
							current_quantity: b.initial_quantity,
							purchase_price: b.purchase_price ?? 0,
							created_at: now,
							updated_at: now,
							sync_status: 'pending'
						};
						await db.product_batches.add(batchRecord);
						await SyncQueueManager.enqueue('product_batches', batchId, 'insert', batchRecord);

						const currentTotal = warehouseTotals.get(b.warehouse_id) || 0;
						warehouseTotals.set(b.warehouse_id, currentTotal + b.initial_quantity);
					}
				}

				for (const [wId, totalQty] of warehouseTotals.entries()) {
					const stockId = `${wId}_${productId}`;
					const existingStock = await db.stock_levels.get(stockId);
					const oldQty = Number(existingStock?.quantity ?? 0);
					const delta = totalQty - oldQty;
					const stockLevel: StockLevel = {
						id: stockId,
						org_id: orgId,
						warehouse_id: wId,
						product_id: productId,
						quantity: totalQty,
						reserved_quantity: existingStock?.reserved_quantity || 0,
						available_quantity: Math.max(0, totalQty - (existingStock?.reserved_quantity || 0)),
						updated_at: now,
						sync_status: 'pending'
					};
					await db.stock_levels.put(stockLevel);
					const stockDelta = delta;
					if (stockDelta !== 0) {
						await SyncQueueManager.enqueueDelta(
							'stock_levels',
							stockId,
							{ quantity: stockDelta, allow_negative: false },
							{ warehouse_id: wId, product_id: productId }
						);
					}
					// Authoritative ledger entry (only when something actually changed).
					const baseUnitId = product?.base_unit_id;
					if (delta !== 0 && baseUnitId) {
						const txId = uuidv4();
						const isOpening = oldQty <= 0;
						const movement: import('@/types').InventoryTransaction = {
							id: txId,
							org_id: orgId,
							warehouse_id: wId,
							product_id: productId,
							batch_id: null,
							transaction_type: isOpening ? 'opening_stock' : 'adjustment_in',
							reference_type: 'manual',
							reference_id: null,
							quantity: delta,
							unit_id: baseUnitId,
							unit_conversion_factor: 1,
							base_quantity: delta,
							unit_cost: 0,
							total_cost: 0,
							balance_after: totalQty,
							product_name: product?.name,
							unit_name: baseUnitName,
							level_quantity: delta,
							prev_quantity: oldQty,
							new_quantity: totalQty,
							notes: isOpening ? 'رصيد افتتاحي من تعديل صنف' : 'تعديل رصيد الافتتاح (زيادة)',
							created_by: userId ?? orgId,
							created_at: now,
							sync_status: 'pending'
						};
						await db.inventory_transactions.add(movement);
						await SyncQueueManager.enqueue('inventory_transactions', txId, 'insert', movement);
					}
				}
			}
		);

		syncCoordinator.triggerSync().catch(console.error);
	}

	/**
	 * Get all batches (lots) for a product across warehouses
	 */
	public static async getProductBatches(productId: string): Promise<ProductBatch[]> {
		return await db.product_batches
			.where('product_id')
			.equals(productId)
			.reverse()
			.sortBy('created_at');
	}
}