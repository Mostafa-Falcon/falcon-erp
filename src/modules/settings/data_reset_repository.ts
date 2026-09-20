import { v4 as uuidv4 } from 'uuid';
import { db } from '@/core/db/app_database';
import { SyncQueueManager } from '@/core/sync/sync_queue_manager';
import type {
  ActivityLog,
  CashierShift,
  Contact,
  ContactTransaction,
  InventoryTransaction,
  JournalEntry,
  JournalEntryLine,
  PurchaseInvoice,
  PurchaseInvoiceItem,
  PurchaseReturn,
  SalesInvoice,
  SalesInvoiceItem,
  SalesReturn,
  StockLevel,
  Treasury,
} from '@/types';

export interface ResetDateRangeParams {
  orgId: string;
  branchId?: string | 'all';
  targetType: 'sales' | 'purchases' | 'both';
  fromDate: string; // YYYY-MM-DD
  toDate: string; // YYYY-MM-DD
  revertStock: boolean; // if true, reverse inventory quantities; if false, preserve current stock
  revertTreasury: boolean; // if true, adjust treasury cash balances; if false, keep current treasury balances
  recalculateBalances: boolean; // if true, recalculate contacts current_balance and shifts
  userId?: string;
  userName?: string;
}

export interface ResetPreviewResult {
  salesInvoicesCount: number;
  salesInvoicesTotal: number;
  salesReturnsCount: number;
  salesReturnsTotal: number;
  purchaseInvoicesCount: number;
  purchaseInvoicesTotal: number;
  purchaseReturnsCount: number;
  purchaseReturnsTotal: number;
  inventoryTransactionsCount: number;
  journalEntriesCount: number;
  contactTransactionsCount: number;
  affectedCustomersCount: number;
  affectedSuppliersCount: number;
}

export interface ResetExecutionResult {
  success: boolean;
  deletedSalesInvoices: number;
  deletedSalesReturns: number;
  deletedPurchaseInvoices: number;
  deletedPurchaseReturns: number;
  deletedInventoryTransactions: number;
  deletedJournalEntries: number;
  affectedContactsUpdated: number;
  affectedShiftsUpdated: number;
  message?: string;
}

/**
 * 🦅 Falcon ERP - Data Reset Repository
 * Enterprise-grade date-range purger for sales and purchases.
 * Offline-first, ACID-compliant Dexie transaction with complete financial and stock ledger integrity.
 */
export class DataResetRepository {
  /**
   * Helper to parse date bounds: from 00:00:00.000 to 23:59:59.999
   */
  private static parseBounds(fromDate: string, toDate: string): { startTime: number; endTime: number } {
    const fromParts = fromDate.split('-');
    const toParts = toDate.split('-');

    const start = new Date(
      parseInt(fromParts[0], 10),
      parseInt(fromParts[1], 10) - 1,
      parseInt(fromParts[2], 10),
      0,
      0,
      0,
      0
    );

    const end = new Date(
      parseInt(toParts[0], 10),
      parseInt(toParts[1], 10) - 1,
      parseInt(toParts[2], 10),
      23,
      59,
      59,
      999
    );

    return {
      startTime: start.getTime(),
      endTime: end.getTime(),
    };
  }

  /**
   * Check whether a record timestamp falls within the bounds
   */
  private static isWithinRange(dateStr: string | undefined | null, startTime: number, endTime: number): boolean {
    if (!dateStr) return false;
    const time = new Date(dateStr).getTime();
    if (isNaN(time)) return false;
    return time >= startTime && time <= endTime;
  }

  /**
   * Previews the count and totals of records that would be affected by the reset.
   */
  public static async previewResetCount(params: {
    orgId: string;
    branchId?: string | 'all';
    targetType: 'sales' | 'purchases' | 'both';
    fromDate: string;
    toDate: string;
  }): Promise<ResetPreviewResult> {
    const { startTime, endTime } = this.parseBounds(params.fromDate, params.toDate);
    const branchFilter = params.branchId && params.branchId !== 'all' ? params.branchId : null;

    let targetSalesInvoices: SalesInvoice[] = [];
    let targetSalesReturns: SalesReturn[] = [];
    let targetPurchaseInvoices: PurchaseInvoice[] = [];
    let targetPurchaseReturns: PurchaseReturn[] = [];

    const targetInvoiceIds = new Set<string>();

    // 1. Sales Invoices & Returns
    if (params.targetType === 'sales' || params.targetType === 'both') {
      const allSales = await db.sales_invoices.where('org_id').equals(params.orgId).toArray();
      targetSalesInvoices = allSales.filter((inv) => {
        if (branchFilter && inv.branch_id !== branchFilter) return false;
        return this.isWithinRange(inv.invoice_date || inv.created_at, startTime, endTime);
      });

      targetSalesInvoices.forEach((inv) => targetInvoiceIds.add(inv.id));

      const allSalesReturns = await db.sales_returns.where('org_id').equals(params.orgId).toArray();
      targetSalesReturns = allSalesReturns.filter((ret) => {
        if (branchFilter && ret.branch_id !== branchFilter) return false;
        const withinTime = this.isWithinRange(ret.return_date || ret.created_at, startTime, endTime);
        const matchesOriginal = ret.original_invoice_id ? targetInvoiceIds.has(ret.original_invoice_id) : false;
        return withinTime || matchesOriginal;
      });

      targetSalesReturns.forEach((ret) => targetInvoiceIds.add(ret.id));
    }

    // 2. Purchase Invoices & Returns
    if (params.targetType === 'purchases' || params.targetType === 'both') {
      const allPurchases = await db.purchase_invoices.where('org_id').equals(params.orgId).toArray();
      targetPurchaseInvoices = allPurchases.filter((inv) => {
        if (branchFilter && inv.branch_id !== branchFilter) return false;
        return this.isWithinRange(inv.invoice_date || inv.created_at, startTime, endTime);
      });

      targetPurchaseInvoices.forEach((inv) => targetInvoiceIds.add(inv.id));

      const allPurchaseReturns = await db.purchase_returns.where('org_id').equals(params.orgId).toArray();
      targetPurchaseReturns = allPurchaseReturns.filter((ret) => {
        if (branchFilter && ret.branch_id !== branchFilter) return false;
        const withinTime = this.isWithinRange(ret.return_date || ret.created_at, startTime, endTime);
        const matchesOriginal = ret.original_invoice_id ? targetInvoiceIds.has(ret.original_invoice_id) : false;
        return withinTime || matchesOriginal;
      });

      targetPurchaseReturns.forEach((ret) => targetInvoiceIds.add(ret.id));
    }

    // 3. Estimate affected inventory transactions
    let invTxCount = 0;
    if (targetInvoiceIds.size > 0) {
      const allInvTx = await db.inventory_transactions.where('org_id').equals(params.orgId).toArray();
      invTxCount = allInvTx.filter((t) => t.reference_id && targetInvoiceIds.has(t.reference_id)).length;
    }

    // 4. Estimate affected journal entries
    let journalEntriesCount = 0;
    if (targetInvoiceIds.size > 0) {
      const allJournal = await db.journal_entries.where('org_id').equals(params.orgId).toArray();
      journalEntriesCount = allJournal.filter((e) => e.reference_id && targetInvoiceIds.has(e.reference_id)).length;
    }

    // 5. Estimate affected contacts
    let contactTxCount = 0;
    const customerIds = new Set<string>();
    const supplierIds = new Set<string>();

    if (targetInvoiceIds.size > 0) {
      const allContactTx = await db.contact_transactions.where('org_id').equals(params.orgId).toArray();
      const matchedContactTx = allContactTx.filter((t) => t.reference_id && targetInvoiceIds.has(t.reference_id));
      contactTxCount = matchedContactTx.length;

      targetSalesInvoices.forEach((i) => {
        if (i.customer_id) customerIds.add(i.customer_id);
      });
      targetPurchaseInvoices.forEach((i) => {
        if (i.supplier_id) supplierIds.add(i.supplier_id);
      });
    }

    return {
      salesInvoicesCount: targetSalesInvoices.length,
      salesInvoicesTotal: targetSalesInvoices.reduce((sum, i) => sum + (i.total || 0), 0),
      salesReturnsCount: targetSalesReturns.length,
      salesReturnsTotal: targetSalesReturns.reduce((sum, r) => sum + (r.total || 0), 0),
      purchaseInvoicesCount: targetPurchaseInvoices.length,
      purchaseInvoicesTotal: targetPurchaseInvoices.reduce((sum, i) => sum + (i.total || 0), 0),
      purchaseReturnsCount: targetPurchaseReturns.length,
      purchaseReturnsTotal: targetPurchaseReturns.reduce((sum, r) => sum + (r.total || 0), 0),
      inventoryTransactionsCount: invTxCount,
      journalEntriesCount,
      contactTransactionsCount: contactTxCount,
      affectedCustomersCount: customerIds.size,
      affectedSuppliersCount: supplierIds.size,
    };
  }

  /**
   * Executes atomic reset of sales / purchases within the specified date range.
   */
  public static async executeDateRangeReset(params: ResetDateRangeParams): Promise<ResetExecutionResult> {
    const { startTime, endTime } = this.parseBounds(params.fromDate, params.toDate);
    const branchFilter = params.branchId && params.branchId !== 'all' ? params.branchId : null;
    const now = new Date().toISOString();

    let targetSalesInvoices: SalesInvoice[] = [];
    let targetSalesReturns: SalesReturn[] = [];
    let targetPurchaseInvoices: PurchaseInvoice[] = [];
    let targetPurchaseReturns: PurchaseReturn[] = [];

    const targetInvoiceIds = new Set<string>();
    const affectedContactIds = new Set<string>();
    const affectedShiftIds = new Set<string>();

    // Step A: Read records to delete
    if (params.targetType === 'sales' || params.targetType === 'both') {
      const allSales = await db.sales_invoices.where('org_id').equals(params.orgId).toArray();
      targetSalesInvoices = allSales.filter((inv) => {
        if (branchFilter && inv.branch_id !== branchFilter) return false;
        return this.isWithinRange(inv.invoice_date || inv.created_at, startTime, endTime);
      });

      targetSalesInvoices.forEach((inv) => {
        targetInvoiceIds.add(inv.id);
        if (inv.customer_id) affectedContactIds.add(inv.customer_id);
        if (inv.shift_id) affectedShiftIds.add(inv.shift_id);
      });

      const allSalesReturns = await db.sales_returns.where('org_id').equals(params.orgId).toArray();
      targetSalesReturns = allSalesReturns.filter((ret) => {
        if (branchFilter && ret.branch_id !== branchFilter) return false;
        const withinTime = this.isWithinRange(ret.return_date || ret.created_at, startTime, endTime);
        const matchesOriginal = ret.original_invoice_id ? targetInvoiceIds.has(ret.original_invoice_id) : false;
        return withinTime || matchesOriginal;
      });

      targetSalesReturns.forEach((ret) => {
        targetInvoiceIds.add(ret.id);
        if (ret.customer_id) affectedContactIds.add(ret.customer_id);
        if (ret.shift_id) affectedShiftIds.add(ret.shift_id);
      });
    }

    if (params.targetType === 'purchases' || params.targetType === 'both') {
      const allPurchases = await db.purchase_invoices.where('org_id').equals(params.orgId).toArray();
      targetPurchaseInvoices = allPurchases.filter((inv) => {
        if (branchFilter && inv.branch_id !== branchFilter) return false;
        return this.isWithinRange(inv.invoice_date || inv.created_at, startTime, endTime);
      });

      targetPurchaseInvoices.forEach((inv) => {
        targetInvoiceIds.add(inv.id);
        if (inv.supplier_id) affectedContactIds.add(inv.supplier_id);
      });

      const allPurchaseReturns = await db.purchase_returns.where('org_id').equals(params.orgId).toArray();
      targetPurchaseReturns = allPurchaseReturns.filter((ret) => {
        if (branchFilter && ret.branch_id !== branchFilter) return false;
        const withinTime = this.isWithinRange(ret.return_date || ret.created_at, startTime, endTime);
        const matchesOriginal = ret.original_invoice_id ? targetInvoiceIds.has(ret.original_invoice_id) : false;
        return withinTime || matchesOriginal;
      });

      targetPurchaseReturns.forEach((ret) => {
        targetInvoiceIds.add(ret.id);
        if (ret.supplier_id) affectedContactIds.add(ret.supplier_id);
      });
    }

    if (targetInvoiceIds.size === 0) {
      return {
        success: true,
        deletedSalesInvoices: 0,
        deletedSalesReturns: 0,
        deletedPurchaseInvoices: 0,
        deletedPurchaseReturns: 0,
        deletedInventoryTransactions: 0,
        deletedJournalEntries: 0,
        affectedContactsUpdated: 0,
        affectedShiftsUpdated: 0,
        message: 'لا توجد فواتير أو عمليات مطابقة في الفترة الزمنية المحددة.',
      };
    }

    // Step B: Atomic execution across all interrelated tables
    const tableScope = [
      db.sales_invoices,
      db.sales_invoice_items,
      db.sales_returns,
      db.purchase_invoices,
      db.purchase_invoice_items,
      db.purchase_returns,
      db.stock_levels,
      db.inventory_transactions,
      db.product_batches,
      db.treasuries,
      db.contacts,
      db.contact_transactions,
      db.journal_entries,
      db.journal_entry_lines,
      db.accounts,
      db.cashier_shifts,
      db.sync_queue,
      db.activity_logs,
    ] as const;

    let deletedInvTxCount = 0;
    let deletedJournalCount = 0;
    let updatedContactsCount = 0;
    let updatedShiftsCount = 0;

    await db.transaction('rw', tableScope, async () => {
      // 1. Revert or clear Inventory Movements
      const allInvTx = await db.inventory_transactions.where('org_id').equals(params.orgId).toArray();
      const matchedInvTx = allInvTx.filter((t) => t.reference_id && targetInvoiceIds.has(t.reference_id));
      deletedInvTxCount = matchedInvTx.length;

      if (params.revertStock) {
        for (const tx of matchedInvTx) {
          const baseQty = Math.abs(tx.base_quantity || tx.quantity);
          const isSale = tx.transaction_type === 'sale' || tx.quantity < 0;
          const delta = isSale ? baseQty : -baseQty;

          const stockId = `${tx.warehouse_id}_${tx.product_id}`;
          const currentStock = await db.stock_levels.get(stockId);

          if (currentStock) {
            const nextQty = Math.max(0, currentStock.quantity + delta);
            const nextAvail = Math.max(0, (currentStock.available_quantity ?? currentStock.quantity) + delta);
            const updatedStock: StockLevel = {
              ...currentStock,
              quantity: nextQty,
              available_quantity: nextAvail,
              updated_at: now,
              sync_status: 'pending',
            };
            await db.stock_levels.put(updatedStock);
            await SyncQueueManager.enqueue('stock_levels', updatedStock.id, 'update', updatedStock);
          }

          // Also adjust batch if applicable
          if (tx.batch_id) {
            const batch = await db.product_batches.get(tx.batch_id);
            if (batch) {
              const updatedBatch = {
                ...batch,
                current_quantity: Math.max(0, batch.current_quantity + delta),
                updated_at: now,
                sync_status: 'pending' as const,
              };
              await db.product_batches.put(updatedBatch);
              await SyncQueueManager.enqueue('product_batches', batch.id, 'update', updatedBatch);
            }
          }
        }
      }

      // Delete matched inventory transactions
      for (const tx of matchedInvTx) {
        await db.inventory_transactions.delete(tx.id);
        await SyncQueueManager.enqueue('inventory_transactions', tx.id, 'delete', { id: tx.id });
      }

      // 2. Revert Treasury cash movements if requested
      if (params.revertTreasury) {
        for (const inv of targetSalesInvoices) {
          const cashPaid = inv.cash_amount || (inv.payment_type === 'cash' ? inv.paid_amount : 0) || 0;
          if (cashPaid > 0 && inv.treasury_id) {
            const tr = await db.treasuries.get(inv.treasury_id);
            if (tr) {
              const updatedTr: Treasury = {
                ...tr,
                current_balance: Math.max(0, tr.current_balance - cashPaid),
                updated_at: now,
                sync_status: 'pending',
              };
              await db.treasuries.put(updatedTr);
              await SyncQueueManager.enqueue('treasuries', tr.id, 'update', updatedTr);
            }
          }
        }

        for (const ret of targetSalesReturns) {
          if (ret.refunded_amount > 0 && ret.treasury_id) {
            const tr = await db.treasuries.get(ret.treasury_id);
            if (tr) {
              const updatedTr: Treasury = {
                ...tr,
                current_balance: tr.current_balance + ret.refunded_amount,
                updated_at: now,
                sync_status: 'pending',
              };
              await db.treasuries.put(updatedTr);
              await SyncQueueManager.enqueue('treasuries', tr.id, 'update', updatedTr);
            }
          }
        }

        for (const inv of targetPurchaseInvoices) {
          const paid = inv.paid_amount || (inv.payment_type === 'cash' ? inv.total : 0) || 0;
          if (paid > 0 && inv.treasury_id) {
            const tr = await db.treasuries.get(inv.treasury_id);
            if (tr) {
              const updatedTr: Treasury = {
                ...tr,
                current_balance: tr.current_balance + paid,
                updated_at: now,
                sync_status: 'pending',
              };
              await db.treasuries.put(updatedTr);
              await SyncQueueManager.enqueue('treasuries', tr.id, 'update', updatedTr);
            }
          }
        }

        for (const ret of targetPurchaseReturns) {
          if (ret.refunded_amount > 0 && ret.treasury_id) {
            const tr = await db.treasuries.get(ret.treasury_id);
            if (tr) {
              const updatedTr: Treasury = {
                ...tr,
                current_balance: Math.max(0, tr.current_balance - ret.refunded_amount),
                updated_at: now,
                sync_status: 'pending',
              };
              await db.treasuries.put(updatedTr);
              await SyncQueueManager.enqueue('treasuries', tr.id, 'update', updatedTr);
            }
          }
        }
      }

      // 3. Remove contact transactions and recalculate customer/supplier balances
      const allContactTx = await db.contact_transactions.where('org_id').equals(params.orgId).toArray();
      const matchedContactTx = allContactTx.filter((t) => t.reference_id && targetInvoiceIds.has(t.reference_id));

      for (const ctx of matchedContactTx) {
        affectedContactIds.add(ctx.contact_id);
        await db.contact_transactions.delete(ctx.id);
        await SyncQueueManager.enqueue('contact_transactions', ctx.id, 'delete', { id: ctx.id });
      }

      if (params.recalculateBalances) {
        for (const contactId of affectedContactIds) {
          const remainingTx = await db.contact_transactions.where('contact_id').equals(contactId).toArray();
          const newBalance = remainingTx.reduce((sum, tx) => sum + (tx.debit || 0) - (tx.credit || 0), 0);
          const contact = await db.contacts.get(contactId);
          if (contact) {
            const updatedContact: Contact = {
              ...contact,
              current_balance: newBalance,
              updated_at: now,
              sync_status: 'pending',
            };
            await db.contacts.put(updatedContact);
            await SyncQueueManager.enqueue('contacts', contact.id, 'update', updatedContact);
            updatedContactsCount++;
          }
        }
      }

      // 4. Remove Journal Entries and Lines, and adjust Chart of Accounts balances
      const allJournal = await db.journal_entries.where('org_id').equals(params.orgId).toArray();
      const matchedJournal = allJournal.filter((e) => e.reference_id && targetInvoiceIds.has(e.reference_id));
      deletedJournalCount = matchedJournal.length;

      for (const entry of matchedJournal) {
        const lines = await db.journal_entry_lines.where('entry_id').equals(entry.id).toArray();
        for (const line of lines) {
          const account = await db.accounts.get(line.account_id);
          if (account) {
            account.current_balance =
              Math.round((account.current_balance - (line.debit || 0) + (line.credit || 0)) * 100) / 100;
            account.updated_at = now;
            account.sync_status = 'pending';
            await db.accounts.put(account);
            await SyncQueueManager.enqueue('accounts', account.id, 'update', account);
          }
          await db.journal_entry_lines.delete(line.id);
          await SyncQueueManager.enqueue('journal_entry_lines', line.id, 'delete', { id: line.id });
        }
        await db.journal_entries.delete(entry.id);
        await SyncQueueManager.enqueue('journal_entries', entry.id, 'delete', { id: entry.id });
      }

      // 5. Update Cashier Shifts if sales invoices were removed
      if (params.recalculateBalances && affectedShiftIds.size > 0) {
        for (const shiftId of affectedShiftIds) {
          const shift = await db.cashier_shifts.get(shiftId);
          if (shift) {
            const remainingShiftSales = await db.sales_invoices
              .where('shift_id')
              .equals(shiftId)
              .filter((inv) => !targetInvoiceIds.has(inv.id))
              .toArray();

            const cashSales = remainingShiftSales.reduce(
              (sum, inv) => sum + (inv.cash_amount || (inv.payment_type === 'cash' ? inv.paid_amount : 0) || 0),
              0
            );
            const cardSales = remainingShiftSales.reduce(
              (sum, inv) => sum + (inv.card_amount || (inv.payment_type === 'card' ? inv.paid_amount : 0) || 0),
              0
            );
            const creditSales = remainingShiftSales.reduce((sum, inv) => sum + (inv.remaining_amount || 0), 0);

            const updatedShift: CashierShift = {
              ...shift,
              total_sales_cash: cashSales,
              total_sales_card: cardSales,
              total_sales_credit: creditSales,
              expected_closing_balance: shift.opening_balance + cashSales,
              sync_status: 'pending',
            };
            await db.cashier_shifts.put(updatedShift);
            await SyncQueueManager.enqueue('cashier_shifts', shift.id, 'update', updatedShift);
            updatedShiftsCount++;
          }
        }
      }

      // 6. Delete Sales Invoice Items and Sales Invoices
      for (const inv of targetSalesInvoices) {
        const items = await db.sales_invoice_items.where('invoice_id').equals(inv.id).toArray();
        for (const item of items) {
          await db.sales_invoice_items.delete(item.id);
          await SyncQueueManager.enqueue('sales_invoice_items', item.id, 'delete', { id: item.id });
        }
        await db.sales_invoices.delete(inv.id);
        await SyncQueueManager.enqueue('sales_invoices', inv.id, 'delete', { id: inv.id });
      }

      for (const ret of targetSalesReturns) {
        await db.sales_returns.delete(ret.id);
        await SyncQueueManager.enqueue('sales_returns', ret.id, 'delete', { id: ret.id });
      }

      // 7. Delete Purchase Invoice Items and Purchase Invoices
      for (const inv of targetPurchaseInvoices) {
        const items = await db.purchase_invoice_items.where('invoice_id').equals(inv.id).toArray();
        for (const item of items) {
          await db.purchase_invoice_items.delete(item.id);
          await SyncQueueManager.enqueue('purchase_invoice_items', item.id, 'delete', { id: item.id });
        }
        await db.purchase_invoices.delete(inv.id);
        await SyncQueueManager.enqueue('purchase_invoices', inv.id, 'delete', { id: inv.id });
      }

      for (const ret of targetPurchaseReturns) {
        await db.purchase_returns.delete(ret.id);
        await SyncQueueManager.enqueue('purchase_returns', ret.id, 'delete', { id: ret.id });
      }

      // 8. Log the operation in Activity Log
      const logId = uuidv4();
      const auditLog: ActivityLog = {
        id: logId,
        org_id: params.orgId,
        user_id: params.userId || null,
        user_name: params.userName || 'المدير / صاحب المنشأة',
        action: 'RESET_SALES_PURCHASES_BY_DATE',
        entity_type: 'data_reset',
        entity_id: logId,
        details: JSON.stringify({
          targetType: params.targetType,
          fromDate: params.fromDate,
          toDate: params.toDate,
          branchId: params.branchId || 'all',
          revertStock: params.revertStock,
          revertTreasury: params.revertTreasury,
          recalculateBalances: params.recalculateBalances,
          deletedSalesInvoices: targetSalesInvoices.length,
          deletedSalesReturns: targetSalesReturns.length,
          deletedPurchaseInvoices: targetPurchaseInvoices.length,
          deletedPurchaseReturns: targetPurchaseReturns.length,
          deletedInventoryTransactions: deletedInvTxCount,
          deletedJournalEntries: deletedJournalCount,
        }),
        created_at: now,
        sync_status: 'pending',
      };
      await db.activity_logs.add(auditLog);
      await SyncQueueManager.enqueue('activity_logs', logId, 'insert', auditLog);
    });

    return {
      success: true,
      deletedSalesInvoices: targetSalesInvoices.length,
      deletedSalesReturns: targetSalesReturns.length,
      deletedPurchaseInvoices: targetPurchaseInvoices.length,
      deletedPurchaseReturns: targetPurchaseReturns.length,
      deletedInventoryTransactions: deletedInvTxCount,
      deletedJournalEntries: deletedJournalCount,
      affectedContactsUpdated: updatedContactsCount,
      affectedShiftsUpdated: updatedShiftsCount,
      message: 'تم تصفير العمليات المحددة بنجاح مع المحافظة على دقة الأرصدة والمزامنة.',
    };
  }
}
