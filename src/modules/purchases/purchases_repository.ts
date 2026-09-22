import { v4 as uuidv4 } from 'uuid';
import { db } from '@/core/db/app_database';
import { SyncQueueManager } from '@/core/sync/sync_queue_manager';
import { InventoryRepository } from '@/modules/inventory/inventory_repository';
import { TreasuryRepository } from '@/modules/treasury/treasury_repository';
import { ContactsRepository } from '@/modules/contacts/contacts_repository';
import { ProductRepository } from '@/modules/inventory/product_repository';
import { AccountingRepository } from '@/modules/accounting/accounting_repository';
import { getSubscriptionPermissions } from '@/core/constants/subscription_profiles';
import { roundMoney } from '@/lib/decimal';
import type {
  PurchaseInvoice,
  PurchaseInvoiceItem,
  PurchaseReturn,
  InvoicePaymentType,
} from '@/types';

export class PurchasesRepository {
  /**
   * Create Purchase Invoice with complete orchestration
   */
  public static async createPurchaseInvoice(params: {
    orgId: string;
    branchId: string;
    warehouseId: string;
    supplierId: string;
    supplierInvoiceNumber: string;
    items: {
      productId: string;
      batchNumber?: string;
      expiryDate?: string | null;
      unitId: string;
      conversionFactor: number;
      quantity: number;
      unitCost: number;
      salePrice?: number;
      taxRate?: number;
    }[];
    discountAmount?: number;
    discountPercent?: number;
    paymentType: InvoicePaymentType;
    paidAmount?: number;
    treasuryId?: string | null;
    userId: string;
    notes?: string;
  }): Promise<PurchaseInvoice> {
    if (!params.items || params.items.length === 0) {
      throw new Error('فاتورة الشراء يجب أن تحتوي على صنف واحد على الأقل');
    }

    // فحص اشتراك المنشأة والتأكد من السماح بفواتير المشتريات والتوريد
    const org = await db.organizations.get(params.orgId);
    if (org) {
      if (!org.is_active) {
        throw new Error('حساب المنشأة غير فعال حالياً. يرجى مراجعة الدعم الفني أو الإدارة.');
      }
      const isExpired = org.subscription_expires_at
        ? new Date(org.subscription_expires_at) < new Date()
        : false;
      const perms = getSubscriptionPermissions(org.subscription_tier, isExpired);
      if (!perms.canExecutePurchases) {
        throw new Error(
          perms.reasonIfBlocked ||
          'فواتير المشتريات والتوريد غير متاحة في الحساب التجريبي. يرجى الترقية للاشتراك القياسي أو VIP.'
        );
      }
    }

    const now = new Date().toISOString();
    const invoiceId = uuidv4();
    const count = await db.purchase_invoices.where('branch_id').equals(params.branchId).count();
    const systemInvoiceNumber = `PUR-${String(count + 1).padStart(6, '0')}`;

    let subtotal = 0;
    let totalTax = 0;

    const invoiceItems: PurchaseInvoiceItem[] = params.items.map((item) => {
      const lineCost = roundMoney(item.quantity * item.unitCost);
      const taxRate = item.taxRate || 0;
      const taxAmount = roundMoney((lineCost * taxRate) / 100);
      const lineTotal = roundMoney(lineCost + taxAmount);

      subtotal += lineCost;
      totalTax += taxAmount;

      return {
        id: uuidv4(),
        invoice_id: invoiceId,
        product_id: item.productId,
        batch_number: item.batchNumber,
        expiry_date: item.expiryDate,
        unit_id: item.unitId,
        conversion_factor: item.conversionFactor,
        quantity: item.quantity,
        base_quantity: item.quantity * item.conversionFactor,
        unit_cost: item.unitCost,
        sale_price: item.salePrice,
        tax_rate: taxRate,
        tax_amount: taxAmount,
        total: lineTotal,
      };
    });

    const discount =
      params.discountPercent !== undefined && params.discountPercent > 0
        ? roundMoney((roundMoney(subtotal) * params.discountPercent) / 100)
        : roundMoney(params.discountAmount || 0);
    const finalTotal = roundMoney(Math.max(0, roundMoney(subtotal) - discount + roundMoney(totalTax)));

    const paid = params.paymentType === 'cash' ? finalTotal : roundMoney(params.paidAmount || 0);
    const remaining = roundMoney(Math.max(0, finalTotal - paid));

    const invoice: PurchaseInvoice = {
      id: invoiceId,
      org_id: params.orgId,
      branch_id: params.branchId,
      warehouse_id: params.warehouseId,
      supplier_id: params.supplierId,
      invoice_number: params.supplierInvoiceNumber,
      system_invoice_number: systemInvoiceNumber,
      invoice_date: now,
      subtotal: roundMoney(subtotal),
      discount_amount: discount,
      discount_percent: params.discountPercent || 0,
      tax_amount: roundMoney(totalTax),
      total: finalTotal,
      paid_amount: paid,
      remaining_amount: remaining,
      payment_type: params.paymentType,
      treasury_id: params.treasuryId,
      status: 'completed',
      notes: params.notes,
      created_by: params.userId,
      created_at: now,
      updated_at: now,
      sync_status: 'pending',
    };

    await db.transaction(
      'rw',
      [
        db.purchase_invoices,
        db.purchase_invoice_items,
        db.stock_levels,
        db.inventory_transactions,
        db.products,
        db.treasuries,
        db.contacts,
        db.contact_transactions,
        db.sync_queue,
      ],
      async () => {
        // 1. Add invoice and items
        await db.purchase_invoices.add(invoice);
        await db.purchase_invoice_items.bulkAdd(invoiceItems);
        await SyncQueueManager.enqueue('purchase_invoices', invoiceId, 'insert', invoice);
        for (const item of invoiceItems) {
          await SyncQueueManager.enqueue('purchase_invoice_items', item.id, 'insert', item);
        }

        // 2. Increase stock and update product cost
        for (const item of invoiceItems) {
          await InventoryRepository.recordStockMovement({
            orgId: params.orgId,
            warehouseId: params.warehouseId,
            productId: item.product_id,
            batchNumber: item.batch_number,
            expiryDate: item.expiry_date,
            transactionType: 'purchase',
            quantity: item.quantity,
            unitId: item.unit_id,
            conversionFactor: item.conversion_factor,
            unitCost: item.unit_cost,
            referenceType: 'purchase_invoice',
            referenceId: invoiceId,
            userId: params.userId,
          });

          // Update cost on product card
          await ProductRepository.updateProduct(item.product_id, {
            purchase_price: item.unit_cost / item.conversion_factor, // base unit cost
            sale_price: item.sale_price || undefined,
          });
        }

        // 3. Deduct paid amount from treasury if cash
        if (paid > 0 && params.treasuryId) {
          await TreasuryRepository.adjustBalance(params.treasuryId, -paid);
        }

        // 4. Update Supplier ledger for remaining amount (credit owed to supplier)
        if (remaining > 0) {
          await ContactsRepository.adjustBalance({
            orgId: params.orgId,
            contactId: params.supplierId,
            referenceType: 'purchase_invoice',
            referenceId: invoiceId,
            debit: 0,
            credit: remaining,
            notes: `فاتورة مشتريات رقم ${systemInvoiceNumber} (المورد: ${params.supplierInvoiceNumber})`,
          });
        }
      }
    );

    // 5. Post double-entry journal entry
    try {
      await AccountingRepository.postPurchaseInvoice({
        orgId: params.orgId,
        branchId: params.branchId,
        invoiceId,
        invoiceNumber: systemInvoiceNumber,
        date: now,
        netPurchase: roundMoney(subtotal - discount),
        taxAmount: totalTax,
        paidAmount: paid,
        creditAmount: remaining,
        treasuryId: params.treasuryId,
        userId: params.userId,
      });
    } catch (accountingError) {
      console.warn('[Accounting] Failed to post purchase invoice:', accountingError);
    }

    return invoice;
  }

  // ==========================================
  // PURCHASE INVOICE QUERIES
  // ==========================================

  /**
   * Get all purchase invoices for an organization (newest first)
   */
  public static async getPurchaseInvoices(
    orgId: string,
    includeDeleted = false
  ): Promise<PurchaseInvoice[]> {
    const list = await db.purchase_invoices
      .where('org_id')
      .equals(orgId)
      .reverse()
      .sortBy('created_at');
    if (includeDeleted) return list;
    return list.filter((inv) => !inv.is_deleted && inv.status !== 'cancelled');
  }

  /**
   * Get a purchase invoice by id
   */
  public static async getPurchaseInvoice(invoiceId: string): Promise<PurchaseInvoice | undefined> {
    return await db.purchase_invoices.get(invoiceId);
  }

  /**
   * Get the line items of a purchase invoice
   */
  public static async getPurchaseInvoiceItems(invoiceId: string): Promise<PurchaseInvoiceItem[]> {
    return await db.purchase_invoice_items.where('invoice_id').equals(invoiceId).toArray();
  }

  /**
   * Get all purchase returns for an organization (newest first)
   */
  public static async getPurchaseReturns(orgId: string): Promise<PurchaseReturn[]> {
    return await db.purchase_returns
      .where('org_id')
      .equals(orgId)
      .reverse()
      .sortBy('created_at');
  }

  /**
   * Updates the editable header fields of a purchase invoice (supplier invoice
   * number and notes). Line items are immutable to preserve stock/financial
   * integrity; to change quantities the invoice must be voided and re-created.
   */
  public static async updatePurchaseInvoice(params: {
    invoiceId: string;
    userId: string;
    invoiceNumber?: string;
    notes?: string;
  }): Promise<PurchaseInvoice> {
    const invoice = await db.purchase_invoices.get(params.invoiceId);
    if (!invoice) throw new Error('فاتورة الشراء غير موجودة');
    if (invoice.is_deleted || invoice.status === 'cancelled') {
      throw new Error('لا يمكن تعديل فاتورة ملغاة أو محذوفة');
    }

    const now = new Date().toISOString();
    const updated: PurchaseInvoice = {
      ...invoice,
      invoice_number: params.invoiceNumber !== undefined ? params.invoiceNumber : invoice.invoice_number,
      notes: params.notes !== undefined ? params.notes : invoice.notes,
      updated_at: now,
      sync_status: 'pending',
    };

    await db.transaction('rw', [db.purchase_invoices, db.sync_queue], async () => {
      await db.purchase_invoices.put(updated);
      await SyncQueueManager.enqueue('purchase_invoices', invoice.id, 'update', updated);
    });

    return updated;
  }

  /**
   * Voids a purchase invoice (soft delete) and reverts every side effect:
   * stock quantities, treasury refund of the paid amount, supplier ledger
   * credit and the accounting entry. Retention is preserved for auditing.
   */
  public static async deletePurchaseInvoice(params: {
    invoiceId: string;
    userId: string;
    reason?: string;
  }): Promise<PurchaseInvoice> {
    const invoice = await db.purchase_invoices.get(params.invoiceId);
    if (!invoice) throw new Error('فاتورة الشراء غير موجودة');
    if (invoice.is_deleted || invoice.status === 'cancelled') {
      throw new Error('تم حذف أو إلغاء هذه الفاتورة مسبقاً');
    }

    const linkedReturns = await db.purchase_returns
      .where('original_invoice_id')
      .equals(params.invoiceId)
      .count();
    if (linkedReturns > 0) {
      throw new Error('لا يمكن إلغاء الفاتورة لوجود مرتجعات مرتبطة بها. ألغِ المرتجعات أولاً.');
    }

    const now = new Date().toISOString();
    const items = await this.getPurchaseInvoiceItems(params.invoiceId);

    const updatedInvoice: PurchaseInvoice = {
      ...invoice,
      status: 'cancelled',
      is_deleted: true,
      deleted_at: now,
      deleted_by: params.userId,
      delete_reason: params.reason || 'إلغاء فاتورة مشتريات',
      updated_at: now,
      sync_status: 'pending',
    };

    await db.transaction(
      'rw',
      [
        db.purchase_invoices,
        db.stock_levels,
        db.inventory_transactions,
        db.treasuries,
        db.contacts,
        db.contact_transactions,
        db.sync_queue,
      ],
      async () => {
        // 1. Mark invoice as void
        await db.purchase_invoices.put(updatedInvoice);
        await SyncQueueManager.enqueue('purchase_invoices', invoice.id, 'update', updatedInvoice);

        // 2. Remove the received quantities from stock
        for (const item of items) {
          const result = await InventoryRepository.recordStockMovement({
            orgId: invoice.org_id,
            warehouseId: invoice.warehouse_id,
            productId: item.product_id,
            batchNumber: item.batch_number,
            expiryDate: item.expiry_date,
            transactionType: 'purchase_return',
            quantity: -item.quantity,
            unitId: item.unit_id,
            conversionFactor: item.conversion_factor,
            unitCost: item.unit_cost,
            referenceType: 'purchase_invoice',
            referenceId: invoice.id,
            userId: params.userId,
            notes: `إلغاء فاتورة مشتريات ${invoice.system_invoice_number}`,
          });

          if (!result.success) {
            throw new Error(result.error || 'تعذر إلغاء الفاتورة لعدم كفاية المخزون.');
          }
        }

        // 3. Refund the amount that was actually paid
        if (invoice.paid_amount > 0 && invoice.treasury_id) {
          await TreasuryRepository.adjustBalance(invoice.treasury_id, invoice.paid_amount);
        }

        // 4. Reverse the outstanding supplier credit
        if (invoice.remaining_amount > 0) {
          await ContactsRepository.adjustBalance({
            orgId: invoice.org_id,
            contactId: invoice.supplier_id,
            referenceType: 'purchase_invoice',
            referenceId: invoice.id,
            debit: invoice.remaining_amount,
            credit: 0,
            notes: `إلغاء مديونية فاتورة مشتريات ${invoice.system_invoice_number}`,
          });
        }
      }
    );

    // 5. Reverse the invoice journal entry
    try {
      await AccountingRepository.reverseDocument(
        invoice.org_id,
        'purchase_invoice',
        invoice.id,
        params.reason || 'إلغاء فاتورة مشتريات',
        params.userId
      );
    } catch (accountingError) {
      console.warn('[Accounting] Failed to reverse purchase invoice:', accountingError);
    }

    return updatedInvoice;
  }

  // ==========================================
  // PURCHASE RETURNS
  // ==========================================

  /**
   * Process a purchase return (goods sent back to the supplier):
   * 1. Records the return document
   * 2. Decrements warehouse stock (goods leave the warehouse)
   * 3. Returns the money to treasury when refunded in cash
   * 4. Adjusts the supplier ledger (debit) and reduces the original invoice remaining amount
   */
  public static async createPurchaseReturn(params: {
    orgId: string;
    branchId: string;
    warehouseId: string;
    originalInvoiceId?: string | null;
    supplierId: string;
    items: {
      productId: string;
      unitId: string;
      conversionFactor: number;
      quantity: number;
      unitCost: number;
      discountAmount?: number;
      taxRate?: number;
    }[];
    discountAmount?: number;
    discountPercent?: number;
    enableTax?: boolean;
    vatRate?: number;
    refundType: 'treasury' | 'credit';
    treasuryId?: string | null;
    userId: string;
    reason?: string;
  }): Promise<PurchaseReturn> {
    if (!params.items || params.items.length === 0) {
      throw new Error('المرتجع يجب أن يحتوي على صنف واحد على الأقل');
    }
    if (params.refundType === 'treasury' && !params.treasuryId) {
      throw new Error('اختر الخزينة التي سيُرجع منها المبلغ المسترد.');
    }

    const now = new Date().toISOString();
    const returnId = uuidv4();
    const count = await db.purchase_returns.where('branch_id').equals(params.branchId).count();
    const returnNumber = `PRET-${String(count + 1).padStart(6, '0')}`;

    // Returns follow the invoice discount rules (item/invoice, amount or %,
    // optional tax, free return = 100% discount).
    const enableTaxSetting = params.enableTax === true;
    const defaultVat = params.vatRate || 0;
    let subtotal = 0;
    let lineDiscTotal = 0;
    let taxAmount = 0;

    for (const it of params.items) {
      const lineGross = roundMoney(it.quantity * it.unitCost);
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
    // Allow free returns (100% discount => total = 0). Only reject when there is
    // nothing being returned at all (no line value before any discount).
    if (!(subtotal > 0)) {
      throw new Error('المرتجع يجب أن يحتوي على أصناف بقيمة إجمالية أكبر من صفر.');
    }

    const returnDoc: PurchaseReturn = {
      id: returnId,
      org_id: params.orgId,
      branch_id: params.branchId,
      warehouse_id: params.warehouseId,
      original_invoice_id: params.originalInvoiceId,
      supplier_id: params.supplierId,
      return_number: returnNumber,
      return_date: now,
      total,
      refunded_amount: params.refundType === 'treasury' ? total : 0,
      discount_amount: roundMoney(lineDiscTotal + globalDisc),
      tax_amount: taxAmount,
      treasury_id: params.refundType === 'treasury' ? params.treasuryId : null,
      reason: params.reason,
      created_by: params.userId,
      created_at: now,
      sync_status: 'pending',
    };

    await db.transaction(
      'rw',
      [
        db.purchase_returns,
        db.purchase_invoices,
        db.stock_levels,
        db.inventory_transactions,
        db.treasuries,
        db.contacts,
        db.contact_transactions,
        db.sync_queue,
      ],
      async () => {
        // 1. Save return document
        await db.purchase_returns.add(returnDoc);
        await SyncQueueManager.enqueue('purchase_returns', returnId, 'insert', returnDoc);

        // 2. Decrement stock (goods leave the warehouse back to the supplier)
        for (const item of params.items) {
          const result = await InventoryRepository.recordStockMovement({
            orgId: params.orgId,
            warehouseId: params.warehouseId,
            productId: item.productId,
            transactionType: 'purchase_return',
            quantity: -item.quantity,
            unitId: item.unitId,
            conversionFactor: item.conversionFactor,
            unitCost: item.unitCost,
            referenceType: 'purchase_invoice',
            referenceId: returnId,
            userId: params.userId,
          });

          if (!result.success) {
            throw new Error(result.error || 'عجز في المخزون أثناء تنفيذ المرتجع.');
          }
        }

        // 3. Refund cash back to treasury when supplier pays us in cash
        if (params.refundType === 'treasury' && params.treasuryId && total > 0) {
          await TreasuryRepository.adjustBalance(params.treasuryId, total);
        }

        // 4. Adjust the supplier ledger: the return is a debit against the supplier.
        //    Booked ONLY when a supplier credit is actually reduced (store-credit
        //    refund, or the original invoice still carries an unpaid remaining);
        //    a pure cash refund (refundType=treasury against a settled invoice)
        //    touches no supplier balance and must NOT create phantom supplier debt.
        let originalInvoice: PurchaseInvoice | undefined;
        if (params.originalInvoiceId) {
          originalInvoice = await db.purchase_invoices.get(params.originalInvoiceId);
        }
        const shouldBookSupplierLedger =
          params.refundType === 'credit' ||
          (originalInvoice !== undefined && originalInvoice.remaining_amount > 0);

        if (shouldBookSupplierLedger) {
          await ContactsRepository.adjustBalance({
            orgId: params.orgId,
            contactId: params.supplierId,
            referenceType: 'purchase_return',
            referenceId: returnId,
            debit: total,
            credit: 0,
            notes: `مرتجع مشتريات رقم ${returnNumber}`,
          });
        }

        // 5. Reduce the original invoice remaining amount when it still carries credit
        if (originalInvoice && originalInvoice.status === 'completed') {
          const updatedInvoice: PurchaseInvoice = {
            ...originalInvoice,
            remaining_amount: Math.max(0, originalInvoice.remaining_amount - total),
            updated_at: now,
            sync_status: 'pending',
          };
          await db.purchase_invoices.put(updatedInvoice);
          await SyncQueueManager.enqueue('purchase_invoices', originalInvoice.id, 'update', updatedInvoice);
        }
      }
    );

    // 6. Post double-entry journal entry for the purchase return
    try {
      await AccountingRepository.postPurchaseReturn({
        orgId: params.orgId,
        branchId: params.branchId,
        returnId,
        returnNumber,
        date: now,
        netReturn,
        taxAmount,
        refundedAmount: params.refundType === 'treasury' ? total : 0,
        creditAmount: 0,
        treasuryId: params.treasuryId,
        userId: params.userId,
      });
    } catch (accountingError) {
      console.warn('[Accounting] Failed to post purchase return:', accountingError);
    }

    return returnDoc;
  }
}
