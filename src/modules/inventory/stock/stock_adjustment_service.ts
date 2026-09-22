import { v4 as uuidv4 } from 'uuid';
import { db } from '@/core/db/app_database';
import { SyncQueueManager } from '@/core/sync/sync_queue_manager';
import type { StockLevel, InventoryTransaction } from '@/types';
import { AccountingRepository } from '@/modules/accounting/accounting_repository';
import { StockMovementService } from './stock_movement_service';

export class StockAdjustmentService {
  /**
   * Records a stock adjustment (counting / damage / correction).
   * Atomic: stock level + movement ledger + optional lot delta.
   */
  public static async adjustStock(params: {
    orgId: string;
    warehouseId: string;
    productId: string;
    quantity: number; // signed: positive = in, negative = out
    unitId: string;
    conversionFactor: number;
    unitCost: number;
    notes: string;
    userId: string;
    type?: 'adjustment' | 'damaged'; // 'damaged' records an outbound damage/spoilage move
  }): Promise<{ success: boolean; error?: string }> {
    if (params.quantity === 0) {
      return { success: false, error: 'الكمية يجب ألا تكون صفراً.' };
    }

    const product = await db.products.get(params.productId);
    if (!product) {
      return { success: false, error: 'الصنف غير موجود.' };
    }

    const allowNegativeSetting = await db.app_settings.get('allow_negative_stock');
    const allowNegative = allowNegativeSetting?.value === 'true';
    const baseQuantity = params.quantity * params.conversionFactor;
    const isOutbound = baseQuantity < 0;
    const now = new Date().toISOString();
    const stockId = `${params.warehouseId}_${params.productId}`;

    try {
      let movementId = '';
      await db.transaction(
        'rw',
        [db.stock_levels, db.inventory_transactions, db.product_batches, db.sync_queue],
        async () => {
          const currentStock = await db.stock_levels.get(stockId);
          const currentQty = currentStock?.quantity || 0;
          const newBalance = currentQty + baseQuantity;

          if (newBalance < 0 && !allowNegative) {
            throw new Error(
              `الرصيد غير كافٍ. الرصيد الحالي: ${currentQty} والمطلوب خصمه: ${Math.abs(baseQuantity)}`
            );
          }

          const updatedLevel: StockLevel = {
            id: stockId,
            org_id: params.orgId,
            warehouse_id: params.warehouseId,
            product_id: params.productId,
            quantity: newBalance,
            reserved_quantity: currentStock?.reserved_quantity || 0,
            available_quantity: newBalance - (currentStock?.reserved_quantity || 0),
            updated_at: now,
            sync_status: 'pending',
          };
          await db.stock_levels.put(updatedLevel);
          await SyncQueueManager.enqueueDelta(
            'stock_levels',
            stockId,
            { quantity: baseQuantity, allow_negative: allowNegative },
            { warehouse_id: params.warehouseId, product_id: params.productId }
          );

          const txId = uuidv4();
          const movement: InventoryTransaction = {
            id: txId,
            org_id: params.orgId,
            warehouse_id: params.warehouseId,
            product_id: params.productId,
            batch_id: null,
            transaction_type: isOutbound
              ? params.type === 'damaged'
                ? 'damaged'
                : 'adjustment_out'
              : 'adjustment_in',
            reference_type: 'manual',
            quantity: params.quantity,
            unit_id: params.unitId,
            unit_conversion_factor: params.conversionFactor,
            base_quantity: baseQuantity,
            unit_cost: params.unitCost,
            total_cost: Math.abs(baseQuantity * params.unitCost),
            balance_after: newBalance,
            notes: params.notes,
            created_by: params.userId,
            created_at: now,
            sync_status: 'pending',
          };
          await db.inventory_transactions.add(movement);
          await SyncQueueManager.enqueue('inventory_transactions', txId, 'insert', movement);
          movementId = txId;

          // Lot bookkeeping: adjustments follow the latest active lot.
          if (product.tracks_batch) {
            const latest = (
              await db.product_batches
                .where('product_id')
                .equals(params.productId)
                .and((b) => b.warehouse_id === params.warehouseId)
                .toArray()
            ).sort((a, b) => b.created_at.localeCompare(a.created_at))[0];

            if (latest || !isOutbound) {
              const lotNumber =
                latest?.batch_number ||
                `ADJ-${new Date().toISOString().replace(/[-:.TZ]/g, '').slice(0, 14)}`;
              const batch = await StockMovementService.applyBatchDelta({
                orgId: params.orgId,
                productId: params.productId,
                warehouseId: params.warehouseId,
                batchNumber: lotNumber,
                expiryDate: latest?.expiry_date,
                delta: baseQuantity,
                unitCost: params.unitCost,
                isOutbound,
                allowNegative,
              });
              await db.inventory_transactions.update(txId, {
                batch_id: batch.id,
                sync_status: 'pending',
              });
              const linkedTx = await db.inventory_transactions.get(txId);
              if (linkedTx) {
                await SyncQueueManager.enqueue('inventory_transactions', txId, 'update', linkedTx);
              }
            }
          }
        }
      );

      // 6. Post the double-entry adjustment (surplus -> inventory/revenue,
      //    shortage/damaged -> COGS/inventory). Atomic with stock; accounting
      //    failure degrades gracefully so the physical move is never lost.
      if (movementId) {
        try {
          await AccountingRepository.postStockAdjustment({
            orgId: params.orgId,
            date: now,
            referenceId: movementId,
            value: baseQuantity * params.unitCost,
            notes: params.notes || (params.type === 'damaged' ? 'توالف / تلف' : 'تسوية يدوية'),
            userId: params.userId,
          });
        } catch (accountingError) {
          console.warn('[Accounting] Failed to post stock adjustment:', accountingError);
        }
      }

      // Keep per-level quantity silos honest after the committed adjustment.
      await StockMovementService.syncProductLevelSilos(params.productId);

      return { success: true };
    } catch (err) {
      return {
        success: false,
        error: err instanceof Error ? err.message : 'خطأ أثناء تنفيذ التسوية.',
      };
    }
  }
}
