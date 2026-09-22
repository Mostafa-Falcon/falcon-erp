import { v4 as uuidv4 } from 'uuid';
import { db } from '@/core/db/app_database';
import { SyncQueueManager } from '@/core/sync/sync_queue_manager';
import { InventoryRepository } from '@/modules/inventory/inventory_repository';
import { TreasuryRepository } from '@/modules/treasury/treasury_repository';
import { ContactsRepository } from '@/modules/contacts/contacts_repository';
import { AccountingRepository } from '@/modules/accounting/accounting_repository';
import { getSubscriptionPermissions } from '@/core/constants/subscription_profiles';
import type {
  CashierShift,
  SalesInvoice,
  SalesInvoiceItem,
  SalesReturn,
  Treasury,
  InvoicePaymentType,
} from '@/types';
import { roundMoney } from '@/lib/decimal';

export class SalesRepository {
  // ==========================================
  // CASHIER SHIFTS
  // ==========================================

  /**
   * Get currently open shift for a user/branch
   */
  public static async getCurrentOpenShift(userId: string, branchId?: string, orgId?: string): Promise<CashierShift | undefined> {
    if (!userId) return undefined;
    return await db.cashier_shifts
      .where('user_id')
      .equals(userId)
      .and((s) => (!branchId || s.branch_id === branchId) && (!orgId || s.org_id === orgId) && s.status === 'open')
      .first();
  }

  /**
   * Open a new cashier shift
   */
  public static async openShift(params: {
    orgId: string;
    branchId: string;
    userId: string;
    treasuryId: string;
    openingBalance: number;
  }): Promise<CashierShift> {
    const existing = await this.getCurrentOpenShift(params.userId, params.branchId, params.orgId);
    if (existing) {
      return existing;
    }

    let activeBranchId = params.branchId;
    if (!activeBranchId && params.orgId) {
      const mainBranch =
        (await db.branches.where('org_id').equals(params.orgId).and((b) => b.is_main).first()) ||
        (await db.branches.where('org_id').equals(params.orgId).first());
      if (mainBranch) {
        activeBranchId = mainBranch.id;
      }
    }

    let shiftCount = 0;
    try {
      if (activeBranchId) {
        shiftCount = await db.cashier_shifts
          .where('branch_id')
          .equals(activeBranchId)
          .and((s) => !params.orgId || s.org_id === params.orgId)
          .count();
      } else if (params.orgId) {
        shiftCount = await db.cashier_shifts
          .where('org_id')
          .equals(params.orgId)
          .count();
      } else {
        shiftCount = await db.cashier_shifts.count();
      }
    } catch {
      shiftCount = 0;
    }
    const now = new Date().toISOString();
    const shiftId = uuidv4();

    const shift: CashierShift = {
      id: shiftId,
      org_id: params.orgId,
      branch_id: activeBranchId,
      user_id: params.userId,
      treasury_id: params.treasuryId,
      shift_number: shiftCount + 1,
      opened_at: now,
      opening_balance: params.openingBalance,
      total_sales_cash: 0,
      total_sales_card: 0,
      total_sales_credit: 0,
      total_returns_cash: 0,
      total_expenses: 0,
      expected_closing_balance: params.openingBalance,
      status: 'open',
      sync_status: 'pending',
    };

    await db.transaction('rw', [db.cashier_shifts, db.sync_queue], async () => {
      await db.cashier_shifts.add(shift);
      await SyncQueueManager.enqueue('cashier_shifts', shiftId, 'insert', shift);
    });

    return shift;
  }

  /**
   * Close an open cashier shift with cash reconciliation and optional treasury transfer
   */
  public static async closeShift(
    shiftId: string,
    actualClosingBalance: number,
    notes?: string,
    closedByUserId?: string,
    destinationTreasuryId?: string,
    actualCardBalance?: number
  ): Promise<CashierShift> {
    const shift = await db.cashier_shifts.get(shiftId);
    if (!shift || shift.status === 'closed') {
      throw new Error('الوردية غير موجودة أو تم إغلاقها مسبقاً');
    }

    const now = new Date().toISOString();
    const difference = actualClosingBalance - shift.expected_closing_balance;

    const updatedShift: CashierShift = {
      ...shift,
      actual_closing_balance: actualClosingBalance,
      actual_card_balance: actualCardBalance !== undefined ? actualCardBalance : shift.total_sales_card,
      destination_treasury_id: destinationTreasuryId || shift.treasury_id,
      difference,
      closed_at: now,
      closed_by_user_id: closedByUserId || shift.user_id,
      status: 'closed',
      notes,
      sync_status: 'pending',
    };

    const tablesToLock: Array<typeof db.cashier_shifts | typeof db.sync_queue | typeof db.treasuries> = [db.cashier_shifts, db.sync_queue];
    const shouldTransfer = destinationTreasuryId && destinationTreasuryId !== shift.treasury_id && actualClosingBalance > 0;
    if (shouldTransfer) {
      tablesToLock.push(db.treasuries);
    }

    await db.transaction('rw', tablesToLock, async () => {
      await db.cashier_shifts.put(updatedShift);
      await SyncQueueManager.enqueue('cashier_shifts', shiftId, 'update', updatedShift);

      if (shouldTransfer) {
        const sourceTreasury = await db.treasuries.get(shift.treasury_id);
        const destTreasury = await db.treasuries.get(destinationTreasuryId);
        if (sourceTreasury && destTreasury) {
          const sourceUpdated: Treasury = {
            ...sourceTreasury,
            current_balance: Math.max(0, (sourceTreasury.current_balance || 0) - actualClosingBalance),
            updated_at: now,
            sync_status: 'pending',
          };
          const destUpdated: Treasury = {
            ...destTreasury,
            current_balance: (destTreasury.current_balance || 0) + actualClosingBalance,
            updated_at: now,
            sync_status: 'pending',
          };
          await db.treasuries.put(sourceUpdated);
          await SyncQueueManager.enqueueDelta('treasuries', shift.treasury_id, { current_balance: -actualClosingBalance }, {});
          await db.treasuries.put(destUpdated);
          await SyncQueueManager.enqueueDelta('treasuries', destinationTreasuryId, { current_balance: actualClosingBalance }, {});
        }
      }
    });

    return updatedShift;
  }

  // ==========================================
  // SALES INVOICES
  // ==========================================

  /**
   * Generate next invoice number
   */
  public static async generateInvoiceNumber(branchId: string): Promise<string> {
    const count = await db.sales_invoices.where('branch_id').equals(branchId).count();
    return `INV-${String(count + 1).padStart(6, '0')}`;
  }

  /**
   * Create Sales Invoice with full transaction orchestration:
   * 1. Records invoice & invoice items
   * 2. Decrements warehouse stock
   * 3. Adjusts treasury balance for cash/card
   * 4. Adjusts customer credit balance for deferred payments
   * 5. Updates cashier shift running totals
   * 6. Enqueues all operations to Outbox Sync Queue
   */
  public static async createSalesInvoice(params: {
    orgId: string;
    branchId: string;
    warehouseId: string;
    shiftId?: string | null;
    customerId?: string | null;
    items: {
      productId: string;
      batchId?: string | null;
      unitId: string;
      conversionFactor: number;
      quantity: number;
      unitPrice: number;
      unitCost: number;
      discountAmount?: number;
      taxRate?: number;
    }[];
    discountAmount?: number;
    discountPercent?: number;
    paymentType: InvoicePaymentType;
    cashAmount?: number;
    cardAmount?: number;
    shippingFee?: number;
    treasuryId: string;
    userId: string;
    notes?: string;
  }): Promise<SalesInvoice> {
    if (!params.items || params.items.length === 0) {
      throw new Error('الفاتورة يجب أن تحتوي على صنف واحد على الأقل');
    }

    // فحص اشتراك المنشأة وحالتها والتأكد من السماح بالبيع
    const org = await db.organizations.get(params.orgId);
    if (org) {
      if (!org.is_active) {
        throw new Error('حساب المنشأة غير فعال حالياً. يرجى مراجعة الدعم الفني أو الإدارة.');
      }
      const isExpired = org.subscription_expires_at
        ? new Date(org.subscription_expires_at) < new Date()
        : false;
      const perms = getSubscriptionPermissions(org.subscription_tier, isExpired);
      if (!perms.canExecuteSales) {
        throw new Error(
          perms.reasonIfBlocked ||
          'الحساب التجريبي للعرض والاستكشاف فقط (تنفيذ فواتير البيع والكاشير محجوب حتى ترقية الاشتراك).'
        );
      }
    }

    const now = new Date().toISOString();
    const invoiceId = uuidv4();
    const invoiceNumber = await this.generateInvoiceNumber(params.branchId);

    // Calculate line items
    let subtotal = 0;
    let totalItemDiscount = 0;
    let totalTax = 0;

    const invoiceItems: SalesInvoiceItem[] = params.items.map((item) => {
      const lineSubtotal = roundMoney(item.quantity * item.unitPrice);
      const discount = roundMoney(item.discountAmount || 0);
      const taxableAmount = roundMoney(Math.max(0, lineSubtotal - discount));
      const taxRate = item.taxRate || 0;
      const taxAmount = roundMoney((taxableAmount * taxRate) / 100);
      const lineTotal = roundMoney(taxableAmount + taxAmount);

      subtotal += lineSubtotal;
      totalItemDiscount += discount;
      totalTax += taxAmount;

      return {
        id: uuidv4(),
        invoice_id: invoiceId,
        product_id: item.productId,
        batch_id: item.batchId,
        unit_id: item.unitId,
        conversion_factor: item.conversionFactor,
        quantity: item.quantity,
        base_quantity: item.quantity * item.conversionFactor,
        unit_price: item.unitPrice,
        unit_cost: item.unitCost,
        discount_amount: discount,
        tax_rate: taxRate,
        tax_amount: taxAmount,
        total: lineTotal,
      };
    });

    const overallDiscount =
      params.discountPercent && params.discountPercent > 0
        ? roundMoney(
            Math.max(0, (subtotal - totalItemDiscount) * (params.discountPercent / 100))
          )
        : roundMoney(params.discountAmount || 0);
    // Shipping is optional; when present it is included in the total the customer
    // pays (POS already charged it) so the invoice cannot total less than received.
    const shipping = roundMoney(params.shippingFee || 0);
    const goodsNet = roundMoney(Math.max(0, subtotal - totalItemDiscount - overallDiscount));
    const finalTotal = roundMoney(goodsNet + totalTax + shipping);

    // Payment calculations
    let cashPaid = 0;
    let cardPaid = 0;

    if (params.paymentType === 'cash') {
      cashPaid = finalTotal;
    } else if (params.paymentType === 'card') {
      cardPaid = finalTotal;
    } else if (params.paymentType === 'split') {
      cashPaid = roundMoney(params.cashAmount || 0);
      cardPaid = roundMoney(params.cardAmount || 0);
    }

    const totalPaid = cashPaid + cardPaid;
    const remainingAmount = Math.max(0, finalTotal - totalPaid);

    if (remainingAmount > 0 && !params.customerId) {
      throw new Error('لا يمكن تسجيل فاتورة آجلة أو بها متبقي بدون تحديد العميل');
    }

    const invoice: SalesInvoice = {
      id: invoiceId,
      org_id: params.orgId,
      branch_id: params.branchId,
      warehouse_id: params.warehouseId,
      shift_id: params.shiftId,
      invoice_number: invoiceNumber,
      invoice_date: now,
      customer_id: params.customerId,
      subtotal: roundMoney(subtotal),
      discount_amount: roundMoney(totalItemDiscount + overallDiscount),
      discount_percent: params.discountPercent || 0,
      tax_amount: roundMoney(totalTax),
      shipping_fee: shipping,
      total: finalTotal,
      paid_amount: totalPaid,
      remaining_amount: remainingAmount,
      payment_type: params.paymentType,
      cash_amount: cashPaid,
      card_amount: cardPaid,
      treasury_id: params.treasuryId,
      status: 'completed',
      notes: params.notes,
      created_by: params.userId,
      created_at: now,
      updated_at: now,
      sync_status: 'pending',
    };

    // Execute atomic save
    await db.transaction(
      'rw',
      [
        db.sales_invoices,
        db.sales_invoice_items,
        db.stock_levels,
        db.inventory_transactions,
        db.treasuries,
        db.contacts,
        db.contact_transactions,
        db.cashier_shifts,
        db.sync_queue,
      ],
      async () => {
        // 1. Save Invoice & Items
        await db.sales_invoices.add(invoice);
        await db.sales_invoice_items.bulkAdd(invoiceItems);
        await SyncQueueManager.enqueue('sales_invoices', invoiceId, 'insert', invoice);
        for (const item of invoiceItems) {
          await SyncQueueManager.enqueue('sales_invoice_items', item.id, 'insert', item);
        }

        // 2. Decrement Stock for each item
        for (const item of invoiceItems) {
          const result = await InventoryRepository.recordStockMovement({
            orgId: params.orgId,
            warehouseId: params.warehouseId,
            productId: item.product_id,
            batchId: item.batch_id,
            transactionType: 'sale',
            quantity: -item.quantity,
            unitId: item.unit_id,
            conversionFactor: item.conversion_factor,
            unitCost: item.unit_cost,
            referenceType: 'sale_invoice',
            referenceId: invoiceId,
            userId: params.userId,
          });

          if (!result.success) {
            throw new Error(result.error || 'عجز في المخزون أثناء إتمام الفاتورة');
          }
        }

        // 3. Update Treasury Balance for Cash
        if (cashPaid > 0) {
          await TreasuryRepository.adjustBalance(params.treasuryId, cashPaid);
        }

        // 4. Update Customer Credit Balance for remaining amount
        if (remainingAmount > 0 && params.customerId) {
          await ContactsRepository.adjustBalance({
            orgId: params.orgId,
            contactId: params.customerId,
            referenceType: 'sale_invoice',
            referenceId: invoiceId,
            debit: remainingAmount,
            credit: 0,
            notes: `فاتورة مبيعات آجل رقم ${invoiceNumber}`,
          });
        }

        // 5. Update Cashier Shift running balances
        if (params.shiftId) {
          const shift = await db.cashier_shifts.get(params.shiftId);
          if (shift && shift.status === 'open') {
            const updatedShift: CashierShift = {
              ...shift,
              total_sales_cash: shift.total_sales_cash + cashPaid,
              total_sales_card: shift.total_sales_card + cardPaid,
              total_sales_credit: shift.total_sales_credit + remainingAmount,
              expected_closing_balance: shift.expected_closing_balance + cashPaid,
              sync_status: 'pending',
            };
            await db.cashier_shifts.put(updatedShift);
            await SyncQueueManager.enqueue('cashier_shifts', shift.id, 'update', updatedShift);
          }
        }
      }
    );

    // 6. Post double-entry journal entry (idempotent, after stock/treasury commit)
    try {
      await AccountingRepository.postSalesInvoice({
        orgId: params.orgId,
        branchId: params.branchId,
        invoiceId,
        invoiceNumber,
        date: now,
        netRevenue: goodsNet,
        taxAmount: totalTax,
        shipping: shipping,
        cashPaid,
        cardPaid,
        creditAmount: remainingAmount,
        cogs: roundMoney(invoiceItems.reduce((sum, item) => sum + item.quantity * item.unit_cost, 0)),
        treasuryId: params.treasuryId,
        userId: params.userId,
      });
    } catch (accountingError) {
      console.warn('[Accounting] Failed to post sales invoice:', accountingError);
    }

    return invoice;
  }

  /**
   * Process Sales Return
   */
  public static async createSalesReturn(params: {
    orgId: string;
    branchId: string;
    warehouseId: string;
    originalInvoiceId?: string | null;
    shiftId?: string | null;
    customerId?: string | null;
    items: {
      productId: string;
      unitId: string;
      conversionFactor: number;
      quantity: number;
      unitPrice: number;
      unitCost: number;
      discountAmount?: number;
      taxRate?: number;
    }[];
    discountAmount?: number;
    discountPercent?: number;
    enableTax?: boolean;
    vatRate?: number;
    treasuryId: string;
    userId: string;
    reason?: string;
    /** 'cash' refunds from the treasury, 'credit' raises store credit for the customer. */
    refundType?: 'cash' | 'credit';
  }): Promise<SalesReturn> {
    const now = new Date().toISOString();
    const returnId = uuidv4();
    const count = await db.sales_returns.where('branch_id').equals(params.branchId).count();
    const returnNumber = `RET-${String(count + 1).padStart(6, '0')}`;

    const refundType = params.refundType || 'cash';
    if (refundType === 'credit' && !params.customerId) {
      throw new Error('لا يمكن إرجاع المبلغ كرصيد بدون تحديد العميل.');
    }

    // Returns support the same optional discounts (amount/% on item or invoice)
    // and optional tax as sales invoices; free-of-charge = 100% discount.
    const enableTaxSetting = params.enableTax === true;
    const defaultVat = params.vatRate || 0;
    let subtotal = 0;
    let lineDiscTotal = 0;
    let taxAmount = 0;

    for (const it of params.items) {
      const lineGross = roundMoney(it.quantity * it.unitPrice);
      const lineDisc = roundMoney(Math.min(lineGross, Math.max(0, it.discountAmount || 0)));
      const taxable = roundMoney(lineGross - lineDisc);
      const rate = enableTaxSetting
        ? it.taxRate !== undefined && it.taxRate > 0
          ? it.taxRate
          : defaultVat
        : 0;
      subtotal += lineGross;
      lineDiscTotal += lineDisc;
      taxAmount += roundMoney((taxable * rate) / 100);
    }

    const globalDisc =
      params.discountPercent !== undefined && params.discountPercent > 0
        ? roundMoney(((subtotal - lineDiscTotal) * params.discountPercent) / 100)
        : roundMoney(params.discountAmount || 0);
    const netReturn = roundMoney(Math.max(0, subtotal - lineDiscTotal - globalDisc));
    const total = roundMoney(netReturn + taxAmount);
    const cashRefund = refundType === 'cash' ? total : 0;
    const creditRefund = refundType === 'credit' ? total : 0;

    const returnDoc: SalesReturn = {
      id: returnId,
      org_id: params.orgId,
      branch_id: params.branchId,
      warehouse_id: params.warehouseId,
      original_invoice_id: params.originalInvoiceId,
      shift_id: params.shiftId,
      return_number: returnNumber,
      return_date: now,
      customer_id: params.customerId,
      total,
      refunded_amount: cashRefund,
      discount_amount: roundMoney(lineDiscTotal + globalDisc),
      tax_amount: taxAmount,
      treasury_id: params.treasuryId,
      reason: params.reason,
      created_by: params.userId,
      created_at: now,
      sync_status: 'pending',
    };

    await db.transaction(
      'rw',
      [
        db.sales_returns,
        db.stock_levels,
        db.inventory_transactions,
        db.treasuries,
        db.contacts,
        db.contact_transactions,
        db.cashier_shifts,
        db.sync_queue,
      ],
      async () => {
        await db.sales_returns.add(returnDoc);
        await SyncQueueManager.enqueue('sales_returns', returnId, 'insert', returnDoc);

        // 1. Return stock to warehouse
        for (const item of params.items) {
          await InventoryRepository.recordStockMovement({
            orgId: params.orgId,
            warehouseId: params.warehouseId,
            productId: item.productId,
            transactionType: 'sale_return',
            quantity: item.quantity,
            unitId: item.unitId,
            conversionFactor: item.conversionFactor,
            unitCost: item.unitCost,
            referenceType: 'sale_invoice',
            referenceId: returnId,
            userId: params.userId,
          });
        }

        // 2. Refund either from treasury (cash) or as store credit for the customer
        if (cashRefund > 0) {
          await TreasuryRepository.adjustBalance(params.treasuryId, -cashRefund);
        } else if (creditRefund > 0 && params.customerId) {
          await ContactsRepository.adjustBalance({
            orgId: params.orgId,
            contactId: params.customerId,
            referenceType: 'sale_return',
            referenceId: returnId,
            debit: 0,
            credit: creditRefund,
            notes: `رصيد مرتجع مبيعات رقم ${returnNumber}`,
          });
        }

        // 3. Update shift
        if (cashRefund > 0 && params.shiftId) {
          const shift = await db.cashier_shifts.get(params.shiftId);
          if (shift && shift.status === 'open') {
            const updatedShift: CashierShift = {
              ...shift,
              total_returns_cash: shift.total_returns_cash + total,
              expected_closing_balance: shift.expected_closing_balance - total,
              sync_status: 'pending',
            };
            await db.cashier_shifts.put(updatedShift);
            await SyncQueueManager.enqueue('cashier_shifts', shift.id, 'update', updatedShift);
          }
        }
      }
    );

    // 4. Post double-entry journal entry for the return
    try {
      await AccountingRepository.postSalesReturn({
        orgId: params.orgId,
        branchId: params.branchId,
        returnId,
        returnNumber,
        date: now,
        netReturn,
        taxAmount,
        refundedAmount: cashRefund,
        creditAmount: creditRefund,
        cogs: roundMoney(params.items.reduce((sum, item) => sum + item.quantity * item.unitCost, 0)),
        treasuryId: params.treasuryId,
        userId: params.userId,
      });
    } catch (accountingError) {
      console.warn('[Accounting] Failed to post sales return:', accountingError);
    }

    return returnDoc;
  }

  /**
   * Delete / Cancel a sales invoice and revert its stock & financial movements (Soft delete)
   */
  public static async deleteSalesInvoice(params: {
    invoiceId: string;
    userId: string;
    reason?: string;
  }): Promise<SalesInvoice> {
    const invoice = await db.sales_invoices.get(params.invoiceId);
    if (!invoice) throw new Error('فاتورة المبيعات غير موجودة');
    if (invoice.is_deleted || invoice.status === 'cancelled') {
      throw new Error('تم حذف أو إلغاء هذه الفاتورة مسبقاً');
    }

    const now = new Date().toISOString();
    const items = await db.sales_invoice_items.where('invoice_id').equals(params.invoiceId).toArray();

    const updatedInvoice: SalesInvoice = {
      ...invoice,
      status: 'cancelled',
      is_deleted: true,
      deleted_at: now,
      deleted_by: params.userId,
      delete_reason: params.reason || 'حذف الفاتورة',
      updated_at: now,
      sync_status: 'pending',
    };

    await db.transaction(
      'rw',
      [
        db.sales_invoices,
        db.stock_levels,
        db.inventory_transactions,
        db.treasuries,
        db.contacts,
        db.contact_transactions,
        db.cashier_shifts,
        db.sync_queue,
      ],
      async () => {
        // 1. Mark invoice deleted
        await db.sales_invoices.put(updatedInvoice);
        await SyncQueueManager.enqueue('sales_invoices', invoice.id, 'update', updatedInvoice);

        // 2. Return quantities to stock
        for (const item of items) {
          await InventoryRepository.recordStockMovement({
            orgId: invoice.org_id,
            warehouseId: invoice.warehouse_id,
            productId: item.product_id,
            batchId: item.batch_id,
            transactionType: 'adjustment_in',
            quantity: item.quantity,
            unitId: item.unit_id,
            conversionFactor: item.conversion_factor,
            unitCost: item.unit_cost,
            referenceType: 'sale_invoice',
            referenceId: invoice.id,
            userId: params.userId,
            notes: `استرجاع مخزون بعد إلغاء فاتورة #${invoice.invoice_number}`,
          });
        }

        // 3. Revert payment from treasury
        const cashPaid = invoice.cash_amount || (invoice.payment_type === 'cash' ? invoice.paid_amount : 0);
        if (cashPaid > 0 && invoice.treasury_id) {
          await TreasuryRepository.adjustBalance(invoice.treasury_id, -cashPaid);
        }

        // 4. Revert customer debt
        if (invoice.customer_id && invoice.remaining_amount > 0) {
          await ContactsRepository.adjustBalance({
            orgId: invoice.org_id,
            contactId: invoice.customer_id,
            referenceType: 'sale_invoice',
            referenceId: invoice.id,
            debit: 0,
            credit: invoice.remaining_amount,
            notes: `إلغاء مديونية فاتورة مبيعات #${invoice.invoice_number}`,
          });
        }

        // 5. Update cashier shift running totals if attached to open shift
        if (invoice.shift_id) {
          const shift = await db.cashier_shifts.get(invoice.shift_id);
          if (shift && shift.status === 'open') {
            const shiftCash = invoice.cash_amount || (invoice.payment_type === 'cash' ? invoice.paid_amount : 0);
            const shiftCard = invoice.card_amount || (invoice.payment_type === 'card' ? invoice.paid_amount : 0);
            const updatedShift: CashierShift = {
              ...shift,
              total_sales_cash: Math.max(0, shift.total_sales_cash - shiftCash),
              total_sales_card: Math.max(0, shift.total_sales_card - shiftCard),
              total_sales_credit: Math.max(0, shift.total_sales_credit - (invoice.remaining_amount || 0)),
              expected_closing_balance: Math.max(0, shift.expected_closing_balance - shiftCash),
              sync_status: 'pending',
            };
            await db.cashier_shifts.put(updatedShift);
            await SyncQueueManager.enqueue('cashier_shifts', shift.id, 'update', updatedShift);
          }
        }
      }
    );

    // 6. Reverse the invoice journal entry
    try {
      await AccountingRepository.reverseDocument(
        invoice.org_id,
        'sale_invoice',
        invoice.id,
        params.reason || 'إلغاء فاتورة مبيعات',
        params.userId
      );
    } catch (accountingError) {
      console.warn('[Accounting] Failed to reverse sales invoice:', accountingError);
    }

    return updatedInvoice;
  }

  /**
   * Update / Edit a sales invoice with inventory & treasury reconciliation
   */
  public static async updateSalesInvoice(params: {
    invoiceId: string;
    userId: string;
    customerId?: string | null;
    items?: {
      productId: string;
      batchId?: string | null;
      unitId: string;
      conversionFactor: number;
      quantity: number;
      unitPrice: number;
      unitCost: number;
      discountAmount: number;
      taxRate: number;
    }[];
    discountAmount?: number;
    paymentType?: InvoicePaymentType;
    cashAmount?: number;
    cardAmount?: number;
    shippingFee?: number;
    notes?: string;
  }): Promise<SalesInvoice> {
    const existing = await db.sales_invoices.get(params.invoiceId);
    if (!existing) throw new Error('فاتورة المبيعات غير موجودة');
    if (existing.is_deleted || existing.status === 'cancelled') {
      throw new Error('لا يمكن تعديل فاتورة ملغاة أو محذوفة');
    }

    const now = new Date().toISOString();
    const oldItems = await db.sales_invoice_items.where('invoice_id').equals(params.invoiceId).toArray();

    let newItemsToSave: SalesInvoiceItem[] = oldItems;
    let subtotal = existing.subtotal;
    let totalDiscount = params.discountAmount !== undefined ? params.discountAmount : existing.discount_amount;
    let totalTax = existing.tax_amount;
    let finalTotal = existing.total;

    if (params.items && params.items.length > 0) {
      let calcSub = 0;
      let calcItemDisc = 0;
      let calcTax = 0;

      newItemsToSave = params.items.map((line) => {
        const lineGross = roundMoney(line.quantity * line.unitPrice);
        const discount = roundMoney(line.discountAmount || 0);
        const taxable = roundMoney(lineGross - discount);
        const taxRate = line.taxRate || 0;
        const taxAmount = roundMoney((taxable * taxRate) / 100);
        const lineTotal = roundMoney(taxable + taxAmount);

        calcSub += lineGross;
        calcItemDisc += discount;
        calcTax += taxAmount;

        return {
          id: uuidv4(),
          invoice_id: existing.id,
          product_id: line.productId,
          batch_id: line.batchId || null,
          unit_id: line.unitId,
          conversion_factor: line.conversionFactor,
          quantity: line.quantity,
          base_quantity: line.quantity * line.conversionFactor,
          unit_price: line.unitPrice,
          unit_cost: line.unitCost,
          discount_amount: discount,
          tax_rate: taxRate,
          tax_amount: taxAmount,
          total: lineTotal,
        };
      });

      subtotal = roundMoney(calcSub);
      const overallDiscount = params.discountAmount !== undefined ? roundMoney(params.discountAmount) : 0;
      totalDiscount = roundMoney(calcItemDisc + overallDiscount);
      totalTax = roundMoney(calcTax);
      finalTotal = roundMoney(Math.max(0, subtotal - totalDiscount + totalTax));
    }

    const payType = params.paymentType || existing.payment_type;
    let cashPaid = 0;
    let cardPaid = 0;

    // Shipping: carry the existing charge unless a new value is provided.
    const shipping = params.shippingFee !== undefined ? roundMoney(params.shippingFee) : existing.shipping_fee || 0;
    if (params.items && params.items.length > 0) {
      // Item totals above exclude shipping -> add it on top.
      finalTotal = roundMoney(finalTotal + shipping);
    } else {
      // Reuse the stored total but re-slice shipping out so it is never double-counted.
      finalTotal = roundMoney(Math.max(0, existing.total - (existing.shipping_fee || 0) + shipping));
    }

    if (payType === 'cash') {
      cashPaid = finalTotal;
    } else if (payType === 'card') {
      cardPaid = finalTotal;
    } else if (payType === 'split') {
      cashPaid = params.cashAmount !== undefined ? roundMoney(params.cashAmount) : existing.cash_amount;
      cardPaid = params.cardAmount !== undefined ? roundMoney(params.cardAmount) : existing.card_amount;
    }

    const totalPaid = cashPaid + cardPaid;
    const remainingAmount = Math.max(0, finalTotal - totalPaid);

    const updatedInvoice: SalesInvoice = {
      ...existing,
      customer_id: params.customerId !== undefined ? params.customerId : existing.customer_id,
      subtotal: roundMoney(subtotal),
      discount_amount: roundMoney(totalDiscount),
      tax_amount: roundMoney(totalTax),
      shipping_fee: shipping,
      total: finalTotal,
      paid_amount: totalPaid,
      remaining_amount: remainingAmount,
      payment_type: payType,
      cash_amount: cashPaid,
      card_amount: cardPaid,
      notes: params.notes !== undefined ? params.notes : existing.notes,
      updated_at: now,
      sync_status: 'pending',
    };

    await db.transaction(
      'rw',
      [
        db.sales_invoices,
        db.sales_invoice_items,
        db.stock_levels,
        db.inventory_transactions,
        db.treasuries,
        db.contacts,
        db.contact_transactions,
        db.cashier_shifts,
        db.sync_queue,
      ],
      async () => {
        // 1. Stock adjustments if items changed
        if (params.items && params.items.length > 0) {
          for (const oldIt of oldItems) {
            await InventoryRepository.recordStockMovement({
              orgId: existing.org_id,
              warehouseId: existing.warehouse_id,
              productId: oldIt.product_id,
              batchId: oldIt.batch_id,
              transactionType: 'adjustment_in',
              quantity: oldIt.quantity,
              unitId: oldIt.unit_id,
              conversionFactor: oldIt.conversion_factor,
              unitCost: oldIt.unit_cost,
              referenceType: 'sale_invoice',
              referenceId: existing.id,
              userId: params.userId,
              notes: `إرجاع المخزون لتعديل فاتورة #${existing.invoice_number}`,
            });
          }

          for (const newIt of newItemsToSave) {
            await InventoryRepository.recordStockMovement({
              orgId: existing.org_id,
              warehouseId: existing.warehouse_id,
              productId: newIt.product_id,
              batchId: newIt.batch_id,
              transactionType: 'sale',
              quantity: -newIt.quantity,
              unitId: newIt.unit_id,
              conversionFactor: newIt.conversion_factor,
              unitCost: newIt.unit_cost,
              referenceType: 'sale_invoice',
              referenceId: existing.id,
              userId: params.userId,
              notes: `صرف كميات معدلة لفاتورة #${existing.invoice_number}`,
            });
          }

          for (const oldIt of oldItems) {
            await SyncQueueManager.enqueue('sales_invoice_items', oldIt.id, 'delete', { id: oldIt.id });
          }
          await db.sales_invoice_items.where('invoice_id').equals(existing.id).delete();
          await db.sales_invoice_items.bulkAdd(newItemsToSave);
          for (const item of newItemsToSave) {
            await SyncQueueManager.enqueue('sales_invoice_items', item.id, 'insert', item);
          }
        }

        // 2. Adjust treasury
        const oldCash = existing.cash_amount || (existing.payment_type === 'cash' ? existing.paid_amount : 0);
        const cashDiff = cashPaid - oldCash;
        if (cashDiff !== 0 && existing.treasury_id) {
          await TreasuryRepository.adjustBalance(existing.treasury_id, cashDiff);
        }

        // 3. Adjust customer balance
        const oldRemaining = existing.remaining_amount || 0;
        const remainingDiff = remainingAmount - oldRemaining;
        if (existing.customer_id && remainingDiff !== 0) {
          await ContactsRepository.adjustBalance({
            orgId: existing.org_id,
            contactId: existing.customer_id,
            referenceType: 'sale_invoice',
            referenceId: existing.id,
            debit: remainingDiff > 0 ? remainingDiff : 0,
            credit: remainingDiff < 0 ? -remainingDiff : 0,
            notes: `تعديل مديونية فاتورة مبيعات #${existing.invoice_number}`,
          });
        }

        // 4. Adjust cashier shift if shift is open
        if (existing.shift_id) {
          const shift = await db.cashier_shifts.get(existing.shift_id);
          if (shift && shift.status === 'open') {
            const oldCard = existing.card_amount || (existing.payment_type === 'card' ? existing.paid_amount : 0);
            const cardDiff = cardPaid - oldCard;
            const updatedShift: CashierShift = {
              ...shift,
              total_sales_cash: Math.max(0, shift.total_sales_cash + cashDiff),
              total_sales_card: Math.max(0, shift.total_sales_card + cardDiff),
              total_sales_credit: Math.max(0, shift.total_sales_credit + remainingDiff),
              expected_closing_balance: Math.max(0, shift.expected_closing_balance + cashDiff),
              sync_status: 'pending',
            };
            await db.cashier_shifts.put(updatedShift);
            await SyncQueueManager.enqueue('cashier_shifts', shift.id, 'update', updatedShift);
          }
        }

        // 5. Save updated invoice
        await db.sales_invoices.put(updatedInvoice);
        await SyncQueueManager.enqueue('sales_invoices', existing.id, 'update', updatedInvoice);
      }
    );

    // 6. Reverse the previous journal entry and post the updated figures
    try {
      await AccountingRepository.reverseDocument(
        existing.org_id,
        'sale_invoice',
        existing.id,
        `تعديل فاتورة مبيعات #${existing.invoice_number}`,
        params.userId
      );
      await AccountingRepository.postSalesInvoice({
        orgId: existing.org_id,
        branchId: existing.branch_id,
        invoiceId: existing.id,
        invoiceNumber: existing.invoice_number,
        date: now,
        netRevenue: roundMoney(Math.max(0, subtotal - totalDiscount)),
        taxAmount: totalTax,
        shipping: shipping,
        cashPaid,
        cardPaid,
        creditAmount: remainingAmount,
        cogs: roundMoney(newItemsToSave.reduce((sum, item) => sum + item.quantity * item.unit_cost, 0)),
        treasuryId: existing.treasury_id,
        userId: params.userId,
      });
    } catch (accountingError) {
      console.warn('[Accounting] Failed to re-post sales invoice:', accountingError);
    }

    return updatedInvoice;
  }

  // ==========================================
  // QUERIES
  // ==========================================

  /**
   * Get all sales invoices for an organization (newest first, filtered by active/deleted)
   */
  public static async getSalesInvoices(
    orgId: string,
    options?: { branchId?: string; includeDeleted?: boolean }
  ): Promise<SalesInvoice[]> {
    let list = await db.sales_invoices
      .where('org_id')
      .equals(orgId)
      .reverse()
      .sortBy('created_at');

    if (options?.branchId) {
      list = list.filter((inv) => inv.branch_id === options.branchId);
    }
    if (!options?.includeDeleted) {
      list = list.filter((inv) => !inv.is_deleted && inv.status !== 'cancelled');
    }
    return list;
  }

  /**
   * Get deleted sales invoices (أرشيف المحذوفات)
   */
  public static async getDeletedSalesInvoices(orgId: string, branchId?: string): Promise<SalesInvoice[]> {
    let list = await db.sales_invoices.where('org_id').equals(orgId).reverse().sortBy('created_at');
    list = list.filter((inv) => inv.is_deleted === true || inv.status === 'cancelled');
    if (branchId) {
      list = list.filter((inv) => inv.branch_id === branchId);
    }
    return list;
  }

  /**
   * Get the line items of a sales invoice
   */
  public static async getSalesInvoiceItems(invoiceId: string): Promise<SalesInvoiceItem[]> {
    return await db.sales_invoice_items.where('invoice_id').equals(invoiceId).toArray();
  }

  /**
   * Get all sales returns for an organization (newest first)
   */
  public static async getSalesReturns(orgId: string): Promise<SalesReturn[]> {
    return await db.sales_returns
      .where('org_id')
      .equals(orgId)
      .reverse()
      .sortBy('created_at');
  }

  /**
   * Get cashier shifts for a branch or organization (newest first)
   */
  public static async getShifts(branchId?: string, orgId?: string): Promise<CashierShift[]> {
    if (branchId) {
      return await db.cashier_shifts
        .where('branch_id')
        .equals(branchId)
        .and((s) => !orgId || s.org_id === orgId)
        .reverse()
        .sortBy('opened_at');
    }
    if (orgId) {
      return await db.cashier_shifts
        .where('org_id')
        .equals(orgId)
        .reverse()
        .sortBy('opened_at');
    }
    return await db.cashier_shifts.reverse().sortBy('opened_at');
  }
}
