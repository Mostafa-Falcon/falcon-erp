import { v4 as uuidv4 } from 'uuid';
import { db } from '@/core/db/app_database';
import { SyncQueueManager } from '@/core/sync/sync_queue_manager';
import { roundQty, roundMoney } from '@/lib/decimal';
import type {
  InventoryTransaction,
  InventoryTransactionType,
  StockLevel,
  ProductBatch,
  ProductUnit,
} from '@/types';

export class StockMovementService {
  /**
   * Applies a delta to a product's lot/batch in a warehouse.
   * MUST be called inside an active `db.transaction` (Dexie zone) so the
   * whole operation stays atomic. Creates the lot when it does not exist.
   */
  public static async applyBatchDelta(params: {
    orgId: string;
    productId: string;
    warehouseId: string;
    batchNumber: string;
    expiryDate?: string | null;
    delta: number; // base units; positive = in, negative = out
    unitCost?: number; // cost PER ENTERED UNIT (من يختار الوحدة في الفاتورة)
    /** Factor of the entered unit to the base unit (used to store per-BASE cost). */
    conversionFactor?: number;
    isOutbound: boolean;
    /** Level/unit info recorded on the batch (owner-provided unit name snapshot). */
    unitId?: string;
    unitName?: string;
    levelQuantity?: number;
  }): Promise<ProductBatch> {
    const now = new Date().toISOString();
    // batch.purchase_price MUST be per BASE unit (same semantics as
    // product.purchase_price) so FIFO line costing in the POS is factor-correct.
    const baseUnitCost =
      params.unitCost !== undefined
        ? params.unitCost / (params.conversionFactor && params.conversionFactor > 0 ? params.conversionFactor : 1)
        : undefined;
    const existing = await db.product_batches
      .where('product_id')
      .equals(params.productId)
      .and(
        (b) =>
          b.warehouse_id === params.warehouseId &&
          b.batch_number.toLowerCase() === params.batchNumber.toLowerCase()
      )
      .first();

    if (!existing) {
      if (params.isOutbound) {
        // Outbound from a missing lot is a data inconsistency: clamp to zero.
        const ghost: ProductBatch = {
          id: uuidv4(),
          org_id: params.orgId,
          product_id: params.productId,
          warehouse_id: params.warehouseId,
          batch_number: params.batchNumber,
          expiry_date: params.expiryDate || null,
          initial_quantity: 0,
          current_quantity: 0,
          purchase_price: baseUnitCost,
          unit_id: params.unitId,
          unit_name: params.unitName,
          level_quantity: params.levelQuantity,
          created_at: now,
          updated_at: now,
          sync_status: 'pending',
        };
        await db.product_batches.add(ghost);
        await SyncQueueManager.enqueue('product_batches', ghost.id, 'insert', ghost);
        return ghost;
      }

      const created: ProductBatch = {
        id: uuidv4(),
        org_id: params.orgId,
        product_id: params.productId,
        warehouse_id: params.warehouseId,
        batch_number: params.batchNumber,
        expiry_date: params.expiryDate || null,
        initial_quantity: Math.max(0, params.delta),
        current_quantity: Math.max(0, params.delta),
        purchase_price: baseUnitCost,
        unit_id: params.unitId,
        unit_name: params.unitName,
        level_quantity: params.levelQuantity,
        created_at: now,
        updated_at: now,
        sync_status: 'pending',
      };
      await db.product_batches.add(created);
      await SyncQueueManager.enqueue('product_batches', created.id, 'insert', created);
      return created;
    }

    const nextQuantity = Math.max(0, existing.current_quantity + params.delta);
    const storeLevelInfo =
      params.unitId !== undefined ||
      params.unitName !== undefined ||
      params.levelQuantity !== undefined;
    const updated: ProductBatch = {
      ...existing,
      current_quantity: nextQuantity,
      expiry_date: params.expiryDate || existing.expiry_date,
      // Outbound (consumption) must NEVER overwrite the receipt cost; the batch
      // keeps the per-BASE unit cost it was received at (FIFO cost anchor).
      purchase_price:
        !params.isOutbound && baseUnitCost !== undefined
          ? baseUnitCost
          : existing.purchase_price,
      ...(storeLevelInfo
        ? {
            unit_id: params.unitId ?? existing.unit_id,
            unit_name: params.unitName ?? existing.unit_name,
            level_quantity:
              params.levelQuantity !== undefined
                ? params.levelQuantity
                : existing.level_quantity,
          }
        : {}),
      updated_at: now,
      sync_status: 'pending',
    };
    await db.product_batches.put(updated);
    await SyncQueueManager.enqueue('product_batches', existing.id, 'update', updated);
    return updated;
  }

  /**
   * Main stock modification engine.
   * Atomically alters stock levels, records transaction ledger, and updates sync queue.
   */
  public static async recordStockMovement(params: {
    orgId: string;
    warehouseId: string;
    productId: string;
    batchId?: string | null;
    batchNumber?: string;
    expiryDate?: string | null;
    transactionType: InventoryTransactionType;
    quantity: number; // positive for inbound, negative for outbound
    unitId: string;
    conversionFactor: number;
    unitCost: number;
    referenceType?: 'sale_invoice' | 'purchase_invoice' | 'transfer' | 'manual';
    referenceId?: string | null;
    /** اسم الوحدة/المستوى كما أدخله صاحب المنشأة (نسخة ثابتة على الحركة). */
    unitName?: string;
    /** رقم مستند مرجعي قابل للقراءة (رقم فاتورة / تشغيلة). */
    referenceNumber?: string;
    notes?: string;
    userId: string;
  }): Promise<{ success: boolean; newBalance: number; error?: string }> {
    if (params.quantity === 0) {
      return { success: false, newBalance: 0, error: 'الكمية لا يمكن أن تكون صفراً.' };
    }

    const now = new Date().toISOString();
    const stockId = `${params.warehouseId}_${params.productId}`;
    const baseQuantity = params.quantity * params.conversionFactor;

    // Product card decides whether the movement must also update lot balances.
    const product = await db.products.get(params.productId);

    // Denormalized level name snapshot for the transaction (no JOIN at display time).
    const unit = await db.units.get(params.unitId);
    const unitName =
      params.unitName?.trim() || unit?.name || (product ? (await db.units.get(product.base_unit_id))?.name || '' : '');

    // Check setting for negative stock
    const allowNegativeSetting = await db.app_settings.get('allow_negative_stock');
    const allowNegative = allowNegativeSetting?.value === 'true';

    return await db.transaction(
      'rw',
      [db.stock_levels, db.inventory_transactions, db.product_batches, db.sync_queue],
      async () => {
        const currentStock = await db.stock_levels.get(stockId);
        const currentQty = currentStock?.quantity || 0;
        const newBalance = currentQty + baseQuantity;

        if (newBalance < 0 && !allowNegative) {
          return {
            success: false,
            newBalance: currentQty,
            error: `الرصيد غير كافٍ في المخزن. الرصيد الحالي: ${currentQty}، والمطلوب خصمه: ${Math.abs(baseQuantity)}`,
          };
        }

        // Lot bookkeeping for lot-tracked products: inbound carries the supplied
        // batch number, outbound consumes the oldest-expiry lot (FIFO).
        let movementBatchId: string | null = null;
        if (product?.tracks_batch) {
          let lotNumber = params.batchNumber?.trim() || '';
          if (!lotNumber && params.batchId) {
            const knownBatch = await db.product_batches.get(params.batchId);
            lotNumber = knownBatch?.batch_number || '';
          }
          if (!lotNumber && baseQuantity < 0) {
            const candidates = await db.product_batches
              .where('product_id')
              .equals(params.productId)
              .and((b) => b.warehouse_id === params.warehouseId && b.current_quantity > 0)
              .sortBy('expiry_date');
            const chosen = candidates[0];
            if (chosen) lotNumber = chosen.batch_number;
          }
          if (lotNumber) {
            const appliedBatch = await StockMovementService.applyBatchDelta({
              orgId: params.orgId,
              productId: params.productId,
              warehouseId: params.warehouseId,
              batchNumber: lotNumber,
              expiryDate: params.expiryDate || null,
              delta: baseQuantity,
              unitCost: params.unitCost,
              conversionFactor: params.conversionFactor,
              isOutbound: baseQuantity < 0,
              unitId: params.unitId,
              unitName,
              levelQuantity: params.quantity,
            });
            movementBatchId = appliedBatch.id;
          }
        } else if (params.batchId) {
          movementBatchId = params.batchId;
        }

        const updatedStockLevel: StockLevel = {
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

        await db.stock_levels.put(updatedStockLevel);
        await SyncQueueManager.enqueue('stock_levels', stockId, 'upsert', updatedStockLevel);

        const transactionId = uuidv4();
        const transaction: InventoryTransaction = {
          id: transactionId,
          org_id: params.orgId,
          warehouse_id: params.warehouseId,
          product_id: params.productId,
          batch_id: movementBatchId,
          transaction_type: params.transactionType,
          reference_type: params.referenceType,
          reference_id: params.referenceId,
          quantity: params.quantity,
          unit_id: params.unitId,
          unit_conversion_factor: params.conversionFactor,
          base_quantity: baseQuantity,
          unit_cost: params.unitCost,
          // Valuation: entered amount = enteredQty x per-entered-unit cost.
          // (baseQty x unitCost would square the conversion factor.)
          total_cost: roundMoney(Math.abs(params.quantity * params.unitCost)),
          balance_after: newBalance,
          product_name: product?.name,
          unit_name: unitName || undefined,
          level_quantity: params.quantity,
          batch_number:
            params.batchNumber?.trim() ||
            (movementBatchId ? (await db.product_batches.get(movementBatchId))?.batch_number : undefined),
          expiry_date: params.expiryDate || null,
          prev_quantity: currentQty,
          new_quantity: newBalance,
          reference_number: params.referenceNumber,
          notes: params.notes,
          created_by: params.userId,
          created_at: now,
          sync_status: 'pending',
        };

        await db.inventory_transactions.add(transaction);
        await SyncQueueManager.enqueue('inventory_transactions', transactionId, 'insert', transaction);

        return { success: true, newBalance };
      }
    ).then(async (result) => {
      // Keep per-level silos (product_units.available_quantity) honest after
      // every committed movement (best-effort, derived from base-unit stock).
      if (result.success) {
        await StockMovementService.syncProductLevelSilos(params.productId);
      }
      return result;
    });
  }

  /**
   * Recomputes the per-level quantity silo (available_quantity) for every
   * product unit from the aggregated base-unit stock across all warehouses.
   * Stored in the unit of that level (totalAvailableBase / conversion_factor).
   */
  public static async syncProductLevelSilos(productId: string): Promise<void> {
    const units = await db.product_units.where('product_id').equals(productId).toArray();
    if (units.length === 0) return;

    const levels = await db.stock_levels.where('product_id').equals(productId).toArray();
    const totalAvailableBase = levels.reduce((sum, l) => sum + ((l.quantity || 0) - (l.reserved_quantity || 0)), 0);
    const now = new Date().toISOString();

    await db.transaction('rw', [db.product_units, db.sync_queue], async () => {
      for (const u of units) {
        const factor = u.conversion_factor > 0 ? u.conversion_factor : 1;
        const silo = roundQty(totalAvailableBase / factor);
        if (roundQty(u.available_quantity ?? 0) === silo) continue;
        const updated: ProductUnit = {
          ...u,
          available_quantity: silo,
          updated_at: now,
          sync_status: 'pending',
        };
        await db.product_units.put(updated);
        await SyncQueueManager.enqueue('product_units', u.id, 'update', updated);
      }
    });
  }

  /**
   * Get transaction history for a specific product
   */
  public static async getProductHistory(
    productId: string,
    limit = 50
  ): Promise<InventoryTransaction[]> {
    return await db.inventory_transactions
      .where('product_id')
      .equals(productId)
      .reverse()
      .limit(limit)
      .toArray();
  }
}
