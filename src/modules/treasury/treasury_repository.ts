import { v4 as uuidv4 } from 'uuid';
import { db } from '@/core/db/app_database';
import { SyncQueueManager } from '@/core/sync/sync_queue_manager';
import { AccountingRepository } from '@/modules/accounting/accounting_repository';
import { roundMoney } from '@/lib/decimal';
import type {
  Treasury,
  Expense,
  ExpenseCategory,
  FinancialVoucher,
  TreasuryType,
  VoucherType,
} from '@/types';

export class TreasuryRepository {
  /**
   * Get all active treasuries for organization
   */
  public static async getTreasuries(orgId: string): Promise<Treasury[]> {
    return await db.treasuries
      .where('org_id')
      .equals(orgId)
      .and((t) => t.is_active)
      .toArray();
  }

  /**
   * إنشاء خزينة رئيسية افتراضية عند عدم وجود أي خزينة فعلية
   * (مسار موحد لجميع الدخولات، مع إدراج تلقائي في طابور المزامنة)
   */
  public static async ensureDefaultTreasury(params: {
    orgId: string;
    branchId?: string | null;
  }): Promise<Treasury> {
    const existing = await db.treasuries.where('org_id').equals(params.orgId).and((t) => t.is_active).first();
    if (existing) return existing;

    const now = new Date().toISOString();
    const defaultTreasury: Treasury = {
      id: uuidv4(),
      org_id: params.orgId,
      branch_id: params.branchId || undefined,
      name: 'الخزينة الرئيسية',
      type: 'safe',
      current_balance: 0,
      is_default: true,
      is_active: true,
      created_at: now,
      updated_at: now,
      sync_status: 'pending',
    };

    await db.transaction('rw', [db.treasuries, db.sync_queue], async () => {
      await db.treasuries.put(defaultTreasury);
      await SyncQueueManager.enqueue('treasuries', defaultTreasury.id, 'insert', defaultTreasury);
    });

    return defaultTreasury;
  }

  /**
   * Get main/default treasury
   */
  public static async getDefaultTreasury(orgId: string): Promise<Treasury | undefined> {
    return await db.treasuries
      .where('org_id')
      .equals(orgId)
      .and((t) => t.is_default && t.is_active)
      .first();
  }

  /**
   * Create a new treasury account (cash safe, bank account, or POS terminal)
   */
  public static async createTreasury(params: {
    orgId: string;
    branchId?: string | null;
    name: string;
    type: TreasuryType;
    openingBalance: number;
    isDefault: boolean;
    accountCode?: string;
  }): Promise<Treasury> {
    const now = new Date().toISOString();
    const treasuryId = uuidv4();
    const defaultCode = params.type === 'bank' ? '1120' : '1110';

    const treasury: Treasury = {
      id: treasuryId,
      org_id: params.orgId,
      branch_id: params.branchId || undefined,
      name: params.name,
      account_code: params.accountCode || defaultCode,
      type: params.type,
      current_balance: params.openingBalance,
      is_default: params.isDefault,
      is_active: true,
      created_at: now,
      updated_at: now,
      sync_status: 'pending',
    };

    await db.transaction('rw', [db.treasuries, db.sync_queue], async () => {
      if (params.isDefault) {
        const orgTreasuries = await db.treasuries.where('org_id').equals(params.orgId).toArray();
        for (const t of orgTreasuries) {
          if (t.is_default) {
            await db.treasuries.put({ ...t, is_default: false, updated_at: now, sync_status: 'pending' });
          }
        }
      }
      await db.treasuries.add(treasury);
      await SyncQueueManager.enqueue('treasuries', treasuryId, 'insert', treasury);
    });

    return treasury;
  }

  /**
   * Internal Transfer between two treasuries
   */
  public static async internalTransfer(params: {
    orgId: string;
    fromTreasuryId: string;
    toTreasuryId: string;
    amount: number;
    description: string;
    userId: string;
  }): Promise<void> {
    const now = new Date().toISOString();

    if (params.amount <= 0) throw new Error('المبلغ يجب أن يكون أكبر من صفر');
    if (params.fromTreasuryId === params.toTreasuryId) throw new Error('لا يمكن التحويل لنفس الخزينة');

    const from = await db.treasuries.get(params.fromTreasuryId);
    const to = await db.treasuries.get(params.toTreasuryId);

    if (!from || !to) throw new Error('أحد الخزائن غير موجودة');
    if (from.current_balance < params.amount) throw new Error('الرصيد في الخزينة المصدر غير كافٍ');

    const transferRefId = uuidv4();

    await db.transaction('rw', [db.treasuries, db.financial_vouchers, db.sync_queue], async () => {
      // 1. Withdraw from source
      await this.adjustBalance(params.fromTreasuryId, -params.amount);

      // 2. Deposit to destination
      await this.adjustBalance(params.toTreasuryId, params.amount);

      // 3. Record Vouchers (Optional but good for history)
      const vOutId = transferRefId;
      const vOut: FinancialVoucher = {
        id: vOutId,
        org_id: params.orgId,
        voucher_no: `TR-OUT-${Date.now()}`,
        type: 'payment',
        treasury_id: params.fromTreasuryId,
        amount: params.amount,
        description: `تحويل صادر إلى ${to.name}: ${params.description}`,
        created_by: params.userId,
        created_at: now,
        sync_status: 'pending',
      };
      await db.financial_vouchers.add(vOut);
      await SyncQueueManager.enqueue('financial_vouchers', vOutId, 'insert', vOut);

      const vInId = uuidv4();
      const vIn: FinancialVoucher = {
        id: vInId,
        org_id: params.orgId,
        voucher_no: `TR-IN-${Date.now()}`,
        type: 'receipt',
        treasury_id: params.toTreasuryId,
        amount: params.amount,
        description: `تحويل وارد من ${from.name}: ${params.description}`,
        created_by: params.userId,
        created_at: now,
        sync_status: 'pending',
      };
      await db.financial_vouchers.add(vIn);
      await SyncQueueManager.enqueue('financial_vouchers', vInId, 'insert', vIn);
    });

    try {
      await AccountingRepository.postInternalTransfer({
        orgId: params.orgId,
        sourceTreasuryId: params.fromTreasuryId,
        destinationTreasuryId: params.toTreasuryId,
        amount: params.amount,
        date: now,
        description: params.description,
        referenceId: transferRefId,
        userId: params.userId,
      });
    } catch (accountingError) {
      console.warn('[Accounting] Failed to post internal transfer:', accountingError);
    }
  }

  /**
   * Set a treasury as the default (main) one, clearing the flag on others
   */
  public static async setDefaultTreasury(treasuryId: string, orgId: string): Promise<void> {
    const now = new Date().toISOString();
    const target = await db.treasuries.get(treasuryId);
    if (!target || target.org_id !== orgId) throw new Error('الخزينة غير موجودة');

    await db.transaction('rw', [db.treasuries, db.sync_queue], async () => {
      const orgTreasuries = await db.treasuries.where('org_id').equals(orgId).toArray();
      for (const t of orgTreasuries) {
        const next = t.id === treasuryId ? { ...t, is_default: true } : { ...t, is_default: false };
        if (next.is_default !== t.is_default) {
          next.updated_at = now;
          next.sync_status = 'pending';
          await db.treasuries.put(next);
          await SyncQueueManager.enqueue('treasuries', next.id, 'update', next);
        }
      }
    });
  }

  /**
   * Toggle treasury active state (soft delete)
   */
  public static async toggleTreasuryActive(treasuryId: string): Promise<void> {
    const treasury = await db.treasuries.get(treasuryId);
    if (!treasury) throw new Error('الخزينة غير موجودة');
    if (treasury.is_default && treasury.is_active) {
      throw new Error('لا يمكن إيقاف الخزينة الرئيسية. عيّن خزينة رئيسية أخرى أولاً.');
    }

    const updated: Treasury = {
      ...treasury,
      is_active: !treasury.is_active,
      updated_at: new Date().toISOString(),
      sync_status: 'pending',
    };

    await db.transaction('rw', [db.treasuries, db.sync_queue], async () => {
      await db.treasuries.put(updated);
      await SyncQueueManager.enqueue('treasuries', treasuryId, 'update', updated);
    });
  }

  /**
   * Hard delete a treasury if it's not the main one and has no critical dependencies
   */
  public static async deleteTreasury(treasuryId: string, orgId: string): Promise<void> {
    const treasury = await db.treasuries.get(treasuryId);
    if (!treasury) throw new Error('الخزينة غير موجودة');
    if (treasury.is_default) throw new Error('لا يمكن حذف الخزينة الرئيسية');

    // Optional: Check for balance or transactions
    if (Math.abs(treasury.current_balance) > 0.01) {
      throw new Error('لا يمكن حذف خزينة بها رصيد مالي. يرجى تصفير الرصيد أولاً.');
    }

    await db.transaction('rw', [db.treasuries, db.sync_queue], async () => {
      await db.treasuries.delete(treasuryId);
      await SyncQueueManager.enqueue('treasuries', treasuryId, 'delete', { id: treasuryId, org_id: orgId });
    });
  }

  /**
   * Get all financial vouchers (receipts & payments) for organization
   */
  public static async getVouchers(orgId: string): Promise<FinancialVoucher[]> {
    const list = await db.financial_vouchers.where('org_id').equals(orgId).toArray();
    return list.sort((a, b) => b.created_at.localeCompare(a.created_at));
  }

  /**
   * Get all expenses for organization
   */
  public static async getExpenses(orgId: string): Promise<Expense[]> {
    const list = await db.expenses.where('org_id').equals(orgId).toArray();
    return list.sort((a, b) => b.created_at.localeCompare(a.created_at));
  }

  /**
   * Create an expense category
   */
  public static async createExpenseCategory(orgId: string, name: string): Promise<ExpenseCategory> {
    const now = new Date().toISOString();
    const categoryId = uuidv4();

    const category: ExpenseCategory = {
      id: categoryId,
      org_id: orgId,
      name: name.trim(),
      is_active: true,
      created_at: now,
      updated_at: now,
      sync_status: 'pending',
    };

    await db.transaction('rw', [db.expense_categories, db.sync_queue], async () => {
      await db.expense_categories.add(category);
      await SyncQueueManager.enqueue('expense_categories', categoryId, 'insert', category);
    });

    return category;
  }

  /**
   * Toggle expense category active state
   */
  public static async toggleExpenseCategoryActive(categoryId: string): Promise<void> {
    const category = await db.expense_categories.get(categoryId);
    if (!category) throw new Error('الفئة غير موجودة');

    const updated: ExpenseCategory = {
      ...category,
      is_active: !category.is_active,
      updated_at: new Date().toISOString(),
      sync_status: 'pending',
    };

    await db.transaction('rw', [db.expense_categories, db.sync_queue], async () => {
      await db.expense_categories.put(updated);
      await SyncQueueManager.enqueue('expense_categories', categoryId, 'update', updated);
    });
  }

  /**
   * Modify treasury balance atomically
   */
  public static async adjustBalance(treasuryId: string, deltaAmount: number): Promise<number> {
    const treasury = await db.treasuries.get(treasuryId);
    if (!treasury) throw new Error('الخزينة غير موجودة');

    const newBalance = roundMoney(treasury.current_balance + deltaAmount);
    const now = new Date().toISOString();

    const updated: Treasury = {
      ...treasury,
      current_balance: newBalance,
      updated_at: now,
      sync_status: 'pending',
    };

    await db.treasuries.put(updated);
    await SyncQueueManager.enqueueDelta('treasuries', treasuryId, { current_balance: deltaAmount }, {});

    return newBalance;
  }

  /**
   * Record Financial Voucher (Receipt or Payment)
   */
  /**
   * Creates a voucher document only (receipt/payment receipt) WITHOUT moving any
   * treasury balance. Use when the caller already moved the cash itself, e.g.
   * payroll payment, so the cash effect is not applied twice.
   */
  public static async registerVoucherOnly(params: {
    orgId: string;
    type: VoucherType;
    treasuryId: string;
    contactId?: string | null;
    shiftId?: string | null;
    amount: number;
    description: string;
    referenceNo?: string;
    userId: string;
  }): Promise<FinancialVoucher> {
    const now = new Date().toISOString();
    const voucherId = uuidv4();
    const count = await db.financial_vouchers.where('org_id').equals(params.orgId).count();
    const prefix = params.type === 'receipt' ? 'RV' : 'PV';
    const voucherNo = `${prefix}-${String(count + 1).padStart(5, '0')}`;

    const voucher: FinancialVoucher = {
      id: voucherId,
      org_id: params.orgId,
      voucher_no: voucherNo,
      type: params.type,
      treasury_id: params.treasuryId,
      contact_id: params.contactId ?? null,
      shift_id: params.shiftId ?? null,
      amount: params.amount,
      description: params.description,
      reference_no: params.referenceNo,
      created_by: params.userId,
      created_at: now,
      sync_status: 'pending',
    };

    await db.transaction('rw', [db.financial_vouchers, db.sync_queue], async () => {
      await db.financial_vouchers.add(voucher);
      await SyncQueueManager.enqueue('financial_vouchers', voucherId, 'insert', voucher);
    });

    return voucher;
  }

  public static async createVoucher(params: {
    orgId: string;
    type: VoucherType;
    treasuryId: string;
    contactId?: string | null;
    shiftId?: string | null;
    amount: number;
    description: string;
    referenceNo?: string;
    userId: string;
  }): Promise<FinancialVoucher> {
    const now = new Date().toISOString();
    const voucherId = uuidv4();
    const count = await db.financial_vouchers.where('org_id').equals(params.orgId).count();
    const prefix = params.type === 'receipt' ? 'RV' : 'PV';
    const voucherNo = `${prefix}-${String(count + 1).padStart(5, '0')}`;

    const voucher: FinancialVoucher = {
      id: voucherId,
      org_id: params.orgId,
      voucher_no: voucherNo,
      type: params.type,
      treasury_id: params.treasuryId,
      contact_id: params.contactId ?? null,
      shift_id: params.shiftId ?? null,
      amount: params.amount,
      description: params.description,
      reference_no: params.referenceNo,
      created_by: params.userId,
      created_at: now,
      sync_status: 'pending',
    };

    await db.transaction('rw', [db.financial_vouchers, db.treasuries, db.sync_queue], async () => {
      await db.financial_vouchers.add(voucher);
      await SyncQueueManager.enqueue('financial_vouchers', voucherId, 'insert', voucher);

      // Receipt increases balance, Payment decreases balance
      const delta = params.type === 'receipt' ? params.amount : -params.amount;
      await this.adjustBalance(params.treasuryId, delta);
    });

    try {
      await AccountingRepository.postVoucher({
        orgId: params.orgId,
        voucherId,
        voucherNo,
        date: now,
        type: params.type,
        amount: params.amount,
        description: params.description,
        treasuryId: params.treasuryId,
        hasContact: Boolean(params.contactId),
        userId: params.userId,
      });
    } catch (accountingError) {
      console.warn('[Accounting] Failed to post voucher:', accountingError);
    }

    return voucher;
  }

  /**
   * Record operational expense
   */
  public static async recordExpense(params: {
    orgId: string;
    categoryId: string;
    treasuryId: string;
    shiftId?: string | null;
    amount: number;
    description: string;
    receiptNumber?: string;
    userId: string;
  }): Promise<Expense> {
    const now = new Date().toISOString();
    const expenseId = uuidv4();

    const expense: Expense = {
      id: expenseId,
      org_id: params.orgId,
      category_id: params.categoryId,
      treasury_id: params.treasuryId,
      shift_id: params.shiftId,
      amount: params.amount,
      description: params.description,
      receipt_number: params.receiptNumber,
      created_by: params.userId,
      created_at: now,
      sync_status: 'pending',
    };

    await db.transaction(
      'rw',
      [db.expenses, db.treasuries, db.cashier_shifts, db.sync_queue],
      async () => {
        await db.expenses.add(expense);
        await SyncQueueManager.enqueue('expenses', expenseId, 'insert', expense);

        // Deduct from treasury
        await this.adjustBalance(params.treasuryId, -params.amount);

        // If shiftId is provided, live-update shift running balance
        if (params.shiftId) {
          const shift = await db.cashier_shifts.get(params.shiftId);
          if (shift && shift.status === 'open') {
            const updatedShift = {
              ...shift,
              total_expenses: (shift.total_expenses || 0) + params.amount,
              expected_closing_balance: shift.expected_closing_balance - params.amount,
              sync_status: 'pending' as const,
            };
            await db.cashier_shifts.put(updatedShift);
            await SyncQueueManager.enqueue('cashier_shifts', shift.id, 'update', updatedShift);
          }
        }
      }
    );

    try {
      await AccountingRepository.postExpense({
        orgId: params.orgId,
        expenseId,
        date: now,
        amount: params.amount,
        description: params.description,
        treasuryId: params.treasuryId,
        userId: params.userId,
      });
    } catch (accountingError) {
      console.warn('[Accounting] Failed to post expense:', accountingError);
    }

    return expense;
  }

  /**
   * Get all expense categories
   */
  public static async getExpenseCategories(orgId: string): Promise<ExpenseCategory[]> {
    return await db.expense_categories.where('org_id').equals(orgId).toArray();
  }

  /**
   * Record payment to supplier or customer/supplier contact (سداد لمورد أو عميل/مورد)
   */
  public static async recordSupplierPayment(params: {
    orgId: string;
    contactId: string;
    treasuryId: string;
    shiftId?: string | null;
    amount: number;
    discount?: number;
    paymentMethod: 'cash' | 'card' | 'bank_transfer' | 'cheque';
    referenceNo?: string;
    notes?: string;
    userId: string;
  }): Promise<{ voucherId: string; newBalance: number }> {
    const now = new Date().toISOString();
    const voucherId = uuidv4();
    const count = await db.financial_vouchers.where('org_id').equals(params.orgId).count();
    const voucherNo = params.referenceNo || `PAY-${String(count + 1).padStart(4, '0')}`;

    const contact = await db.contacts.get(params.contactId);
    if (!contact) throw new Error('جهة التعامل غير موجودة');

    const totalSettled = params.amount + (params.discount || 0);

    const voucher: FinancialVoucher = {
      id: voucherId,
      org_id: params.orgId,
      voucher_no: voucherNo,
      type: 'payment',
      treasury_id: params.treasuryId,
      contact_id: params.contactId,
      shift_id: params.shiftId,
      amount: params.amount,
      description: params.notes || `سداد لحساب ${contact.type === 'both' ? 'العميل/المورد' : 'المورد'} «${contact.name}»`,
      reference_no: voucherNo,
      created_by: params.userId,
      created_at: now,
      sync_status: 'pending',
    };

    let newContactBalance = 0;

    await db.transaction(
      'rw',
      [
        db.financial_vouchers,
        db.treasuries,
        db.contacts,
        db.contact_transactions,
        db.cashier_shifts,
        db.sync_queue,
      ],
      async () => {
        // 1. Add financial voucher
        await db.financial_vouchers.add(voucher);
        await SyncQueueManager.enqueue('financial_vouchers', voucherId, 'insert', voucher);

        // 2. Deduct amount from Treasury
        await this.adjustBalance(params.treasuryId, -params.amount);

        // 3. If shiftId provided, live-update shift running balance
        if (params.shiftId) {
          const shift = await db.cashier_shifts.get(params.shiftId);
          if (shift && shift.status === 'open') {
            const updatedShift = {
              ...shift,
              total_expenses: (shift.total_expenses || 0) + params.amount,
              expected_closing_balance: shift.expected_closing_balance - params.amount,
              sync_status: 'pending' as const,
            };
            await db.cashier_shifts.put(updatedShift);
            await SyncQueueManager.enqueue('cashier_shifts', shift.id, 'update', updatedShift);
          }
        }

        // 4. Adjust Contact balance: debit = totalSettled
        newContactBalance = roundMoney(contact.current_balance + totalSettled);
        const updatedContact = {
          ...contact,
          current_balance: newContactBalance,
          updated_at: now,
          sync_status: 'pending' as const,
        };
        await db.contacts.put(updatedContact);
        await SyncQueueManager.enqueueDelta('contacts', params.contactId, { current_balance: totalSettled }, {});

        // 5. Add Contact transaction
        const transId = uuidv4();
        const trans = {
          id: transId,
          org_id: params.orgId,
          contact_id: params.contactId,
          reference_type: 'payment_voucher' as const,
          reference_id: voucherId,
          debit: totalSettled,
          credit: 0,
          balance_after: newContactBalance,
          notes: params.notes || `سداد نقدي/بنكي رقم ${voucherNo}${params.discount ? ` (شامل خصم مكتسب ${params.discount} ج.م)` : ''}`,
          created_at: now,
          sync_status: 'pending' as const,
        };
        await db.contact_transactions.add(trans);
        await SyncQueueManager.enqueue('contact_transactions', transId, 'insert', trans);
      }
    );

    try {
      await AccountingRepository.postSupplierPayment({
        orgId: params.orgId,
        voucherId,
        voucherNo,
        date: now,
        amount: params.amount,
        discount: params.discount || 0,
        treasuryId: params.treasuryId,
        userId: params.userId,
      });
    } catch (accountingError) {
      console.warn('[Accounting] Failed to post supplier payment:', accountingError);
    }

    return { voucherId, newBalance: newContactBalance };
  }

  /**
   * Record receipt/collection from customer or customer/supplier contact (تحصيل دفعة من عميل أو عميل/مورد)
   */
  public static async recordCustomerPayment(params: {
    orgId: string;
    contactId: string;
    treasuryId: string;
    shiftId?: string | null;
    amount: number;
    discount?: number;
    paymentMethod: 'cash' | 'card' | 'bank_transfer' | 'cheque';
    referenceNo?: string;
    notes?: string;
    userId: string;
  }): Promise<{ voucherId: string; newBalance: number }> {
    const now = new Date().toISOString();
    const voucherId = uuidv4();
    const count = await db.financial_vouchers.where('org_id').equals(params.orgId).count();
    const voucherNo = params.referenceNo || `RCV-${String(count + 1).padStart(4, '0')}`;

    const contact = await db.contacts.get(params.contactId);
    if (!contact) throw new Error('جهة التعامل غير موجودة');

    const totalSettled = params.amount + (params.discount || 0);

    const voucher: FinancialVoucher = {
      id: voucherId,
      org_id: params.orgId,
      voucher_no: voucherNo,
      type: 'receipt',
      treasury_id: params.treasuryId,
      contact_id: params.contactId,
      shift_id: params.shiftId,
      amount: params.amount,
      description: params.notes || `تحصيل دفعة من ${contact.type === 'both' ? 'العميل/المورد' : 'العميل'} «${contact.name}»`,
      reference_no: voucherNo,
      created_by: params.userId,
      created_at: now,
      sync_status: 'pending',
    };

    let newContactBalance = 0;

    await db.transaction(
      'rw',
      [
        db.financial_vouchers,
        db.treasuries,
        db.contacts,
        db.contact_transactions,
        db.cashier_shifts,
        db.sync_queue,
      ],
      async () => {
        // 1. Add financial voucher
        await db.financial_vouchers.add(voucher);
        await SyncQueueManager.enqueue('financial_vouchers', voucherId, 'insert', voucher);

        // 2. Add amount to Treasury
        await this.adjustBalance(params.treasuryId, params.amount);

        // 3. If shiftId provided, live-update shift running balance
        if (params.shiftId) {
          const shift = await db.cashier_shifts.get(params.shiftId);
          if (shift && shift.status === 'open') {
            const isCard = params.paymentMethod === 'card';
            const updatedShift = {
              ...shift,
              total_sales_cash: isCard ? shift.total_sales_cash : (shift.total_sales_cash || 0) + params.amount,
              total_sales_card: isCard ? (shift.total_sales_card || 0) + params.amount : shift.total_sales_card,
              expected_closing_balance: isCard ? shift.expected_closing_balance : shift.expected_closing_balance + params.amount,
              sync_status: 'pending' as const,
            };
            await db.cashier_shifts.put(updatedShift);
            await SyncQueueManager.enqueue('cashier_shifts', shift.id, 'update', updatedShift);
          }
        }

        // 4. Adjust Contact balance: credit = totalSettled (decreases customer debt)
        newContactBalance = roundMoney(contact.current_balance - totalSettled);
        const updatedContact = {
          ...contact,
          current_balance: newContactBalance,
          updated_at: now,
          sync_status: 'pending' as const,
        };
        await db.contacts.put(updatedContact);
        await SyncQueueManager.enqueueDelta('contacts', params.contactId, { current_balance: -totalSettled }, {});

        // 5. Add Contact transaction
        const transId = uuidv4();
        const trans = {
          id: transId,
          org_id: params.orgId,
          contact_id: params.contactId,
          reference_type: 'receipt_voucher' as const,
          reference_id: voucherId,
          debit: 0,
          credit: totalSettled,
          balance_after: newContactBalance,
          notes: params.notes || `تحصيل نقدي/بنكي رقم ${voucherNo}${params.discount ? ` (شامل خصم مسموح به ${params.discount} ج.م)` : ''}`,
          created_at: now,
          sync_status: 'pending' as const,
        };
        await db.contact_transactions.add(trans);
        await SyncQueueManager.enqueue('contact_transactions', transId, 'insert', trans);
      }
    );

    try {
      await AccountingRepository.postCustomerPayment({
        orgId: params.orgId,
        voucherId,
        voucherNo,
        date: now,
        amount: params.amount,
        discount: params.discount || 0,
        treasuryId: params.treasuryId,
        userId: params.userId,
      });
    } catch (accountingError) {
      console.warn('[Accounting] Failed to post customer payment:', accountingError);
    }

    return { voucherId, newBalance: newContactBalance };
  }

  /**
   * Reverses a financial voucher (receipt/payment): restores the treasury
   * balance, undoes the contact balance/transaction when present, reverts any
   * open-shift running totals and posts the counter journal entry.
   */
  public static async reverseVoucher(
    voucherId: string,
    reason: string,
    userId: string
  ): Promise<{ success: boolean; error?: string }> {
    const voucher = await db.financial_vouchers.get(voucherId);
    if (!voucher) return { success: false, error: 'السند غير موجود.' };
    if (voucher.is_reversed) return { success: false, error: 'تم عكس هذا السند بالفعل.' };

    const now = new Date().toISOString();
    const delta = voucher.type === 'receipt' ? -voucher.amount : voucher.amount;

    try {
      await db.transaction(
        'rw',
        [
          db.financial_vouchers,
          db.treasuries,
          db.contacts,
          db.contact_transactions,
          db.cashier_shifts,
          db.sync_queue,
        ],
        async () => {
          const treasury = await db.treasuries.get(voucher.treasury_id);
          if (treasury) {
            await this.adjustBalance(voucher.treasury_id, delta);
          }

          if (voucher.shift_id) {
            const shift = await db.cashier_shifts.get(voucher.shift_id);
            if (shift && shift.status === 'open') {
              const updatedShift = {
                ...shift,
                expected_closing_balance: shift.expected_closing_balance + delta,
                sync_status: 'pending' as const,
              };
              await db.cashier_shifts.put(updatedShift);
              await SyncQueueManager.enqueue('cashier_shifts', shift.id, 'update', updatedShift);
            }
          }

          if (voucher.contact_id) {
            const contact = await db.contacts.get(voucher.contact_id);
            if (contact) {
              // Mirror the ORIGINAL contact transaction amounts (which include any
              // settlement discount) instead of assuming just voucher.amount,
              // otherwise discount-booked settlements drift by the discount on reversal.
              const originalTx = (
                await db.contact_transactions
                  .where('contact_id')
                  .equals(contact.id)
                  .and((t) => t.reference_id === voucherId)
                  .toArray()
              )[0];
              const reverseSettledDebit = originalTx ? originalTx.credit || 0 : voucher.type === 'receipt' ? voucher.amount : 0;
              const reverseSettledCredit = originalTx ? originalTx.debit || 0 : voucher.type === 'receipt' ? 0 : voucher.amount;
              const newContactBalance = roundMoney(contact.current_balance + reverseSettledDebit - reverseSettledCredit);
              const updatedContact = {
                ...contact,
                current_balance: newContactBalance,
                updated_at: now,
                sync_status: 'pending' as const,
              };
              await db.contacts.put(updatedContact);
              await SyncQueueManager.enqueueDelta('contacts', contact.id, { current_balance: reverseSettledDebit - reverseSettledCredit }, {});

              const transId = uuidv4();
              const trans = {
                id: transId,
                org_id: voucher.org_id,
                contact_id: contact.id,
                reference_type:
                  voucher.type === 'receipt'
                    ? ('payment_voucher' as const)
                    : ('receipt_voucher' as const),
                reference_id: voucherId,
                debit: reverseSettledDebit,
                credit: reverseSettledCredit,
                balance_after: newContactBalance,
                notes: `عكس سند ${voucher.voucher_no} — ${reason}`,
                created_at: now,
                sync_status: 'pending' as const,
              };
              await db.contact_transactions.add(trans);
              await SyncQueueManager.enqueue('contact_transactions', transId, 'insert', trans);
            }
          }

          const updatedVoucher: FinancialVoucher = {
            ...voucher,
            is_reversed: true,
            reversal_reason: reason,
            sync_status: 'pending',
          };
          await db.financial_vouchers.put(updatedVoucher);
          await SyncQueueManager.enqueue('financial_vouchers', voucherId, 'update', updatedVoucher);
        }
      );

      try {
        await AccountingRepository.reverseDocument(voucher.org_id, 'voucher', voucherId, reason, userId);
      } catch (accountingError) {
        console.warn('[Accounting] Failed to reverse voucher entry:', accountingError);
      }

      return { success: true };
    } catch (err) {
      return { success: false, error: err instanceof Error ? err.message : 'خطأ أثناء عكس السند.' };
    }
  }

  /**
   * Reverses an operational expense: returns the amount to the treasury,
   * reverts any open-shift totals, soft-deletes the record and posts the
   * counter journal entry.
   */
  public static async reverseExpense(
    expenseId: string,
    reason: string,
    userId: string
  ): Promise<{ success: boolean; error?: string }> {
    const expense = await db.expenses.get(expenseId);
    if (!expense) return { success: false, error: 'المصروف غير موجود.' };
    if (expense.is_deleted) return { success: false, error: 'تم عكس هذا المصروف بالفعل.' };

    const now = new Date().toISOString();

    try {
      await db.transaction(
        'rw',
        [db.expenses, db.treasuries, db.cashier_shifts, db.sync_queue],
        async () => {
          await this.adjustBalance(expense.treasury_id, expense.amount);

          if (expense.shift_id) {
            const shift = await db.cashier_shifts.get(expense.shift_id);
            if (shift && shift.status === 'open') {
              const updatedShift = {
                ...shift,
                total_expenses: Math.max(0, (shift.total_expenses || 0) - expense.amount),
                expected_closing_balance: shift.expected_closing_balance + expense.amount,
                sync_status: 'pending' as const,
              };
              await db.cashier_shifts.put(updatedShift);
              await SyncQueueManager.enqueue('cashier_shifts', shift.id, 'update', updatedShift);
            }
          }

          const updatedExpense: Expense = {
            ...expense,
            is_deleted: true,
            deleted_at: now,
            sync_status: 'pending',
          };
          await db.expenses.put(updatedExpense);
          await SyncQueueManager.enqueue('expenses', expenseId, 'update', updatedExpense);
        }
      );

      try {
        await AccountingRepository.reverseDocument(expense.org_id, 'expense', expenseId, reason, userId);
      } catch (accountingError) {
        console.warn('[Accounting] Failed to reverse expense entry:', accountingError);
      }

      return { success: true };
    } catch (err) {
      return { success: false, error: err instanceof Error ? err.message : 'خطأ أثناء عكس المصروف.' };
    }
  }
}
