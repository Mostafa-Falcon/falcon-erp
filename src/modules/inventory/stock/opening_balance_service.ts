import { v4 as uuidv4 } from 'uuid';
import { db } from '@/core/db/app_database';
import { SyncQueueManager } from '@/core/sync/sync_queue_manager';
import { roundQty, roundMoney, moneyProduct, qtySum } from '@/lib/decimal';
import type { StockLevel, InventoryTransaction, ProductBatch } from '@/types';
import { StockMovementService } from './stock_movement_service';

/** One row of the opening-quantity breakdown (in base units). */
export interface OpeningEntry {
  expiryDate?: string | null;
  batchNumber?: string;
  baseQuantity: number; // in base units
  /** Level/unit the quantity was entered in (owner's own unit name snapshot). */
  unitId?: string;
  unitName?: string;
  levelQuantity?: number;
}

export class OpeningBalanceService {
  /**
   * Registers the opening stock balance of a product in a warehouse.
   * Atomic: stock level + movement ledger + optional lot creation.
   */
  public static async openStock(params: {
    orgId: string;
    warehouseId: string;
    productId: string;
    quantity: number; // positive, in the selected unit
    unitId: string;
    conversionFactor: number;
    unitCost: number;
    batchNumber?: string; // required by UI when the product tracks lots
    expiryDate?: string | null;
    notes?: string;
    userId: string;
  }): Promise<{ success: boolean; error?: string }> {
    if (!(params.quantity > 0)) {
      return { success: false, error: 'الكمية يجب أن تكون أكبر من صفر.' };
    }

    const product = await db.products.get(params.productId);
    if (!product) {
      return { success: false, error: 'الصنف غير موجود.' };
    }

    const baseQuantity = params.quantity * params.conversionFactor;
    const now = new Date().toISOString();
    const stockId = `${params.warehouseId}_${params.productId}`;

    const unit = await db.units.get(params.unitId);
    const unitName =
      unit?.name || (product ? (await db.units.get(product.base_unit_id))?.name || '' : '');

    try {
      await db.transaction(
        'rw',
        [db.stock_levels, db.inventory_transactions, db.product_batches, db.sync_queue],
        async () => {
          const currentStock = await db.stock_levels.get(stockId);
          const newBalance = (currentStock?.quantity || 0) + baseQuantity;

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
            { quantity: baseQuantity, allow_negative: false },
            { warehouse_id: params.warehouseId, product_id: params.productId }
          );

          const txId = uuidv4();
          const movement: InventoryTransaction = {
            id: txId,
            org_id: params.orgId,
            warehouse_id: params.warehouseId,
            product_id: params.productId,
            batch_id: null,
            transaction_type: 'opening_stock',
            reference_type: 'manual',
            quantity: params.quantity,
            unit_id: params.unitId,
            unit_conversion_factor: params.conversionFactor,
            base_quantity: baseQuantity,
            unit_cost: params.unitCost,
            // Valuation per entered unit (baseQty * unitCost squares the factor).
            total_cost: roundMoney(params.quantity * params.unitCost),
            balance_after: newBalance,
            product_name: product.name,
            unit_name: unitName,
            level_quantity: params.quantity,
            batch_number: params.batchNumber?.trim() || undefined,
            expiry_date: params.expiryDate || null,
            prev_quantity: currentStock?.quantity || 0,
            new_quantity: newBalance,
            notes: params.notes || 'رصيد افتتاحي',
            created_by: params.userId,
            created_at: now,
            sync_status: 'pending',
          };
          await db.inventory_transactions.add(movement);
          await SyncQueueManager.enqueue('inventory_transactions', txId, 'insert', movement);

          // Lot bookkeeping when the product tracks lots.
          if (product.tracks_batch) {
            const lotNumber =
              params.batchNumber?.trim() ||
              `LOT-${new Date().toISOString().replace(/[-:.TZ]/g, '').slice(0, 14)}`;
            const batch = await StockMovementService.applyBatchDelta({
              orgId: params.orgId,
              productId: params.productId,
              warehouseId: params.warehouseId,
              batchNumber: lotNumber,
              expiryDate: params.expiryDate,
              delta: baseQuantity,
              unitCost: params.unitCost,
              conversionFactor: params.conversionFactor,
              isOutbound: false,
              unitId: params.unitId,
              unitName,
              levelQuantity: params.quantity,
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
      );

      // Keep per-level quantity silos honest after the opening write.
      await StockMovementService.syncProductLevelSilos(params.productId);
      return { success: true };
    } catch (err) {
      return {
        success: false,
        error: err instanceof Error ? err.message : 'خطأ أثناء تسجيل الرصيد الافتتاحي.',
      };
    }
  }

  /**
   * Sets the ACTUAL physical quantity of a product in a warehouse.
   *
   * ATOMIC (single Dexie transaction):
   * - The total entered quantity IS the real inventory balance -- it REPLACES
   *   the current stock, it does not add on top of it.
   * - The expiry/batch breakdown (`entries`) is a split of that same total
   *   (the sum of entries must equal the physical quantity).
   * - Batches of (product, warehouse) are reconciled so that
   *   stock_level.quantity === Σ batch.current_quantity (Single Source of Truth).
   * - The movement ledger records the delta as an opening_balance entry.
   */
  public static async setOpeningQuantity(params: {
    orgId: string;
    warehouseId: string;
    productId: string;
    userId: string;
    unitCost: number; // cost per BASE unit (ج.م)
    entries: OpeningEntry[];
    notes?: string;
  }): Promise<{ success: boolean; error?: string; newBalance?: number }> {
    const product = await db.products.get(params.productId);
    if (!product) {
      return { success: false, error: 'الصنف غير موجود.' };
    }

    // Sanitize entries: drop zero rows, round quantities, merge duplicate lots.
    const merged = new Map<string, OpeningEntry>();
    for (const raw of params.entries) {
      const baseQuantity = roundQty(raw.baseQuantity);
      if (baseQuantity <= 0) continue;

      const lotKey = (raw.batchNumber?.trim() || '').toLowerCase();
      const exists = merged.get(lotKey);

      if (exists) {
        const existingExpiry = exists.expiryDate || null;
        const incomingExpiry = raw.expiryDate || null;
        // FIFO safety: keep the earliest (non-null) expiry date.
        const keptExpiry =
          incomingExpiry && (!existingExpiry || incomingExpiry < existingExpiry)
            ? incomingExpiry
            : existingExpiry;
        merged.set(lotKey, {
          ...exists,
          baseQuantity: roundQty(exists.baseQuantity + baseQuantity),
          expiryDate: keptExpiry,
        });
      } else {
        merged.set(lotKey, {
          expiryDate: raw.expiryDate || null,
          batchNumber: raw.batchNumber?.trim() || '',
          baseQuantity,
          unitId: raw.unitId,
          unitName: raw.unitName,
          levelQuantity: raw.levelQuantity,
        });
      }
    }

    const entries = Array.from(merged.values()).map((e, i) => ({
      ...e,
      batchNumber: e.batchNumber || `OPN-${Date.now().toString().slice(-6)}-${i + 1}`,
    }));

    const totalBase = qtySum(entries.map((e) => e.baseQuantity));

    if (totalBase <= 0) {
      return { success: false, error: 'الكمية الفعلية يجب أن تكون أكبر من صفر.' };
    }

    const unitCost = roundMoney(Math.max(0, params.unitCost));
    const now = new Date().toISOString();
    const stockId = `${params.warehouseId}_${params.productId}`;

    try {
      await db.transaction(
        'rw',
        [db.stock_levels, db.inventory_transactions, db.product_batches, db.sync_queue],
        async () => {
          const currentStock = await db.stock_levels.get(stockId);
          const currentQty = currentStock?.quantity || 0;
          const delta = roundQty(totalBase - currentQty);

          // 1) Reconcile batches of (product, warehouse) to the new split.
          const existing = await db.product_batches
            .where('product_id')
            .equals(params.productId)
            .and((b) => b.warehouse_id === params.warehouseId)
            .toArray();

          for (const rec of existing) {
            await db.product_batches.delete(rec.id);
            await SyncQueueManager.enqueue('product_batches', rec.id, 'delete', { id: rec.id });
          }

          for (const e of entries) {
            const batchId = uuidv4();
            const batchRecord: ProductBatch = {
              id: batchId,
              org_id: params.orgId,
              product_id: params.productId,
              warehouse_id: params.warehouseId,
              batch_number: e.batchNumber,
              expiry_date: e.expiryDate,
              initial_quantity: e.baseQuantity,
              current_quantity: e.baseQuantity,
              purchase_price: unitCost,
              unit_id: e.unitId,
              unit_name: e.unitName,
              level_quantity: e.levelQuantity !== undefined ? roundQty(e.levelQuantity) : undefined,
              created_at: now,
              updated_at: now,
              sync_status: 'pending',
            };
            await db.product_batches.add(batchRecord);
            await SyncQueueManager.enqueue('product_batches', batchId, 'insert', batchRecord);
          }

          // 2) Update the stock level to the actual physical quantity.
          const updatedLevel: StockLevel = {
            id: stockId,
            org_id: params.orgId,
            warehouse_id: params.warehouseId,
            product_id: params.productId,
            quantity: totalBase,
            reserved_quantity: currentStock?.reserved_quantity || 0,
            available_quantity: Math.max(0, totalBase - (currentStock?.reserved_quantity || 0)),
            updated_at: now,
            sync_status: 'pending',
          };
          await db.stock_levels.put(updatedLevel);
          if (currentStock && delta !== 0) {
            await SyncQueueManager.enqueueDelta(
              'stock_levels',
              stockId,
              { quantity: delta, allow_negative: false },
              { warehouse_id: params.warehouseId, product_id: params.productId }
            );
          } else if (!currentStock && delta !== 0) {
            await SyncQueueManager.enqueue('stock_levels', stockId, 'upsert', updatedLevel);
          }

          // 3) Record the movement ledger only when the balance actually changed.
          if (delta !== 0) {
            const entryUnit = entries[0];
            const txId = uuidv4();
            const movement: InventoryTransaction = {
              id: txId,
              org_id: params.orgId,
              warehouse_id: params.warehouseId,
              product_id: params.productId,
              batch_id: null,
              transaction_type: 'opening_balance',
              reference_type: 'manual',
              quantity: delta,
              unit_id: entryUnit?.unitId || product.base_unit_id,
              unit_conversion_factor: 1,
              base_quantity: delta,
              unit_cost: unitCost,
              total_cost: moneyProduct(delta, unitCost),
              balance_after: totalBase,
              product_name: product.name,
              unit_name: entryUnit?.unitName,
              level_quantity: entryUnit?.levelQuantity,
              batch_number: entryUnit?.batchNumber || undefined,
              expiry_date: entryUnit?.expiryDate || null,
              prev_quantity: currentQty,
              new_quantity: totalBase,
              notes: params.notes || 'تسجيل / تعديل رصيد أول المدة (الكمية الفعلية)',
              created_by: params.userId,
              created_at: now,
              sync_status: 'pending',
            };
            await db.inventory_transactions.add(movement);
            await SyncQueueManager.enqueue('inventory_transactions', txId, 'insert', movement);
          }
        }
      );

      // Keep per-level quantity silos honest after the opening write.
      await StockMovementService.syncProductLevelSilos(params.productId);
      return { success: true, newBalance: totalBase };
    } catch (err) {
      return {
        success: false,
        error: err instanceof Error ? err.message : 'خطأ أثناء تسجيل الكمية الافتتاحية.',
      };
    }
  }
}
