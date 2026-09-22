import type {
  InventoryTransaction,
  InventoryTransactionType,
  StockLevel,
  Warehouse,
  Product,
  ProductBatch,
  StocktakeSession,
  StocktakeItem,
} from '@/types';

import {
  StockLevelRepository,
  StockMovementService,
  OpeningBalanceService,
  StockAdjustmentService,
} from './stock';

import { StocktakeRepository } from './stocktake';

/**
 * 🦅 Falcon ERP - InventoryRepository (Unified Domain Facade)
 * Maintains 100% backward compatibility with all existing consumers
 * while delegating to specialized, decoupled stock services.
 */
export class InventoryRepository {
  // ── Stock Levels & Warehouses ──────────────────────────────
  public static async getStockLevel(
    warehouseId: string,
    productId: string
  ): Promise<StockLevel | undefined> {
    return StockLevelRepository.getStockLevel(warehouseId, productId);
  }

  public static async getWarehouses(orgId: string): Promise<Warehouse[]> {
    return StockLevelRepository.getWarehouses(orgId);
  }

  public static async getLowStockProducts(
    orgId: string
  ): Promise<{ product: Product; stock: number; minAlert: number }[]> {
    return StockLevelRepository.getLowStockProducts(orgId);
  }

  // ── Stock Movements & Ledger ───────────────────────────────
  public static async recordStockMovement(params: {
    orgId: string;
    warehouseId: string;
    productId: string;
    batchId?: string | null;
    batchNumber?: string;
    expiryDate?: string | null;
    transactionType: InventoryTransactionType;
    quantity: number;
    unitId: string;
    conversionFactor: number;
    unitCost: number;
    referenceType?: 'sale_invoice' | 'purchase_invoice' | 'transfer' | 'manual';
    referenceId?: string | null;
    notes?: string;
    userId: string;
  }): Promise<{ success: boolean; newBalance: number; error?: string }> {
    return StockMovementService.recordStockMovement(params);
  }

  public static async applyBatchDelta(params: {
    orgId: string;
    productId: string;
    warehouseId: string;
    batchNumber: string;
    expiryDate?: string | null;
    delta: number;
    unitCost?: number;
    isOutbound: boolean;
  }): Promise<ProductBatch> {
    return StockMovementService.applyBatchDelta(params);
  }

  public static async getProductHistory(
    productId: string,
    limit = 50
  ): Promise<InventoryTransaction[]> {
    return StockMovementService.getProductHistory(productId, limit);
  }

  // ── Opening Balances ───────────────────────────────────────
  public static async openStock(params: {
    orgId: string;
    warehouseId: string;
    productId: string;
    quantity: number;
    unitId: string;
    conversionFactor: number;
    unitCost: number;
    batchNumber?: string;
    expiryDate?: string | null;
    notes?: string;
    userId: string;
  }): Promise<{ success: boolean; error?: string }> {
    return OpeningBalanceService.openStock(params);
  }

  /**
   * Sets the ACTUAL physical opening quantity of a product in a warehouse,
   * distributed across expiry dates/batches. See OpeningBalanceService.
   */
  public static async setOpeningQuantity(params: {
    orgId: string;
    warehouseId: string;
    productId: string;
    userId: string;
    unitCost: number;
    entries: {
      expiryDate?: string | null;
      batchNumber?: string;
      baseQuantity: number;
      unitId?: string;
      unitName?: string;
      levelQuantity?: number;
    }[];
    notes?: string;
  }): Promise<{ success: boolean; error?: string; newBalance?: number }> {
    return OpeningBalanceService.setOpeningQuantity(params);
  }

  // ── Adjustments & Damages ──────────────────────────────────
  public static async adjustStock(params: {
    orgId: string;
    warehouseId: string;
    productId: string;
    quantity: number;
    unitId: string;
    conversionFactor: number;
    unitCost: number;
    notes: string;
    userId: string;
    type?: 'adjustment' | 'damaged';
  }): Promise<{ success: boolean; error?: string }> {
    return StockAdjustmentService.adjustStock(params);
  }

  // ── Physical Stocktake (الجرد) ─────────────────────────────
  public static async getStocktakeSessions(orgId: string): Promise<StocktakeSession[]> {
    return StocktakeRepository.getStocktakeSessions(orgId);
  }

  public static async getStocktakeDetail(
    sessionId: string
  ): Promise<{ session: StocktakeSession; items: StocktakeItem[] }> {
    return StocktakeRepository.getStocktakeDetail(sessionId);
  }

  public static async createStocktakeSession(params: {
    orgId: string;
    branchId: string;
    warehouseId: string;
    userId: string;
    notes?: string;
  }): Promise<StocktakeSession> {
    return StocktakeRepository.createStocktakeSession(params);
  }

  public static async updateStocktakeItems(
    sessionId: string,
    items: Omit<StocktakeItem, 'id' | 'session_id'>[]
  ): Promise<void> {
    return StocktakeRepository.updateStocktakeItems(sessionId, items);
  }

  public static async commitStocktakeSession(
    sessionId: string,
    userId: string
  ): Promise<{ success: boolean; error?: string }> {
    return StocktakeRepository.commitStocktakeSession(sessionId, userId);
  }

  public static async deleteStocktakeSession(
    sessionId: string
  ): Promise<{ success: boolean; error?: string }> {
    return StocktakeRepository.deleteStocktakeSession(sessionId);
  }
}
