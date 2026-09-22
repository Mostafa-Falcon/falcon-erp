import { db } from '@/core/db/app_database';
import { SyncQueueManager } from '@/core/sync/sync_queue_manager';
import { v4 as uuidv4 } from 'uuid';
import type { Account, JournalEntry, JournalEntryLine, JournalEntryType, Treasury } from '@/types';

/**
 * 🦅 FALCON UNIVERSAL ERP - ACCOUNTING REPOSITORY
 * Real double-entry bookkeeping engine:
 *  - Balanced journal entries (debit = credit) with per-line posting.
 *  - Auto-accounting rule mappings used by sales / purchases / treasury repos.
 *  - Reversal of financial documents.
 *  - Opening balances posting.
 *  - Denormalized account `current_balance` cache maintained transactionally.
 *
 * The account ledgers are the SINGLE SOURCE OF TRUTH for all reports
 * (trial balance, balance sheet, income statement, general ledger).
 */

/** Well-known system account codes (seeded per organization). */
export const NATIVE_ACCOUNT_CODES = {
  CASH: '1110',
  BANK: '1120',
  RECEIVABLES: '1130', // العملاء
  INVENTORY: '1140', // مخزون السلع
  FIXED_ASSETS: '1210', // أصول ثابتة
  SUPPLIERS: '2110', // الموردون
  ACCRUED: '2120', // التزامات مستحقة
  CAPITAL: '3100',
  RETAINED_EARNINGS: '3200', // أرباح وخسائر مرحلة
  SALES: '4100',
  SALES_RETURNS: '4110',
  OTHER_REVENUE: '4900',
  COGS: '5100',
  OPERATING_EXPENSES: '5200',
  ADMIN_EXPENSES: '5300',
  PAYROLL_SALARIES: '5301',
  OTHER_EXPENSES: '5400',
  TAX_EXPENSES: '5401',
} as const;

interface JournalLineInput {
  account_id: string;
  debit?: number;
  credit?: number;
  description?: string;
}

export interface JournalizeInput {
  org_id: string;
  branch_id?: string | null;
  entry_date?: string;
  type?: JournalEntryType;
  description: string;
  reference_type?: string | null;
  reference_id?: string | null;
  lines: JournalLineInput[];
  created_by?: string | null;
}

/** Default chart of accounts inserted on-demand for any new organization. */
export const DEFAULT_CHART_OF_ACCOUNTS: Array<{
  code: string;
  name: string;
  name_en?: string;
  parent_code?: string;
  type: Account['type'];
  account_type: 'parent' | 'leaf';
  system_flag?: boolean;
}> = [
  { code: '1000', name: 'الأصول', name_en: 'Assets', type: 'asset', account_type: 'parent' },
  { code: '1100', name: 'الأصول المتداولة', name_en: 'Current Assets', parent_code: '1000', type: 'asset', account_type: 'parent' },
  { code: '1110', name: 'النقدية بالخزائن', name_en: 'Cash in Safes', parent_code: '1100', type: 'asset', account_type: 'leaf', system_flag: true },
  { code: '1120', name: 'حسابات البنوك', name_en: 'Bank Accounts', parent_code: '1100', type: 'asset', account_type: 'leaf', system_flag: true },
  { code: '1130', name: 'العملاء', name_en: 'Accounts Receivable', parent_code: '1100', type: 'asset', account_type: 'leaf', system_flag: true },
  { code: '1140', name: 'مخزون السلع', name_en: 'Inventory', parent_code: '1100', type: 'asset', account_type: 'leaf', system_flag: true },
  { code: '1200', name: 'الأصول الثابتة', name_en: 'Fixed Assets', parent_code: '1000', type: 'asset', account_type: 'parent' },
  { code: '1210', name: 'معدات وآلات', name_en: 'Equipment', parent_code: '1200', type: 'asset', account_type: 'leaf' },

  { code: '2000', name: 'الخصوم', name_en: 'Liabilities', type: 'liability', account_type: 'parent' },
  { code: '2100', name: 'الخصوم المتداولة', name_en: 'Current Liabilities', parent_code: '2000', type: 'liability', account_type: 'parent' },
  { code: '2110', name: 'الموردون', name_en: 'Accounts Payable', parent_code: '2100', type: 'liability', account_type: 'leaf', system_flag: true },
  { code: '2120', name: 'التزامات مستحقة', name_en: 'Accrued Liabilities', parent_code: '2100', type: 'liability', account_type: 'leaf' },
  { code: '2200', name: 'قروض والتزامات طويلة الأجل', name_en: 'Long-term Loans', parent_code: '2000', type: 'liability', account_type: 'leaf' },

  { code: '3000', name: 'حقوق الملكية', name_en: 'Equity', type: 'equity', account_type: 'parent' },
  { code: '3100', name: 'رأس المال', name_en: 'Capital', parent_code: '3000', type: 'equity', account_type: 'leaf', system_flag: true },
  { code: '3200', name: 'أرباح وخسائر مرحلة', name_en: 'Retained Earnings', parent_code: '3000', type: 'equity', account_type: 'leaf', system_flag: true },

  { code: '4000', name: 'الإيرادات', name_en: 'Revenue', type: 'revenue', account_type: 'parent' },
  { code: '4100', name: 'المبيعات', name_en: 'Sales Revenue', parent_code: '4000', type: 'revenue', account_type: 'leaf', system_flag: true },
  { code: '4110', name: 'مردودات المبيعات', name_en: 'Sales Returns', parent_code: '4000', type: 'revenue', account_type: 'leaf', system_flag: true },
  { code: '4900', name: 'إيرادات أخرى', name_en: 'Other Revenue', parent_code: '4000', type: 'revenue', account_type: 'leaf' },

  { code: '5000', name: 'المصروفات', name_en: 'Expenses', type: 'expense', account_type: 'parent' },
  { code: '5100', name: 'تكلفة البضاعة المباعة', name_en: 'COGS', parent_code: '5000', type: 'expense', account_type: 'leaf', system_flag: true },
  { code: '5200', name: 'مصروفات تشغيلية', name_en: 'Operating Expenses', parent_code: '5000', type: 'expense', account_type: 'leaf', system_flag: true },
  { code: '5300', name: 'مصروفات عمومية وإدارية', name_en: 'General & Admin', parent_code: '5000', type: 'expense', account_type: 'leaf' },
  { code: '5301', name: 'رواتب وأجور', name_en: 'Salaries & Wages', parent_code: '5300', type: 'expense', account_type: 'leaf', system_flag: true },
  { code: '5400', name: 'مصروفات أخرى', name_en: 'Other Expenses', parent_code: '5000', type: 'expense', account_type: 'leaf' },
];

export class AccountingRepository {
  /**
   * Seeds the standard chart of accounts for an organization (idempotent).
   * Runs in a transaction scoped to all tables it touches.
   */
  public static async ensureDefaultChartOfAccounts(orgId: string): Promise<Account[]> {
    return db.transaction('rw', [db.accounts, db.app_settings, db.sync_queue], async () => {
      const existing = await db.accounts.where('org_id').equals(orgId).toArray();
      if (existing.length > 0) {
        return existing;
      }

      const now = new Date().toISOString();
      const byCode = new Map<string, string>(); // code -> id
      const created: Account[] = [];

      for (const def of DEFAULT_CHART_OF_ACCOUNTS) {
        const id = uuidv4();
        const parentId = def.parent_code ? byCode.get(def.parent_code) ?? null : null;
        const acc: Account = {
          id,
          org_id: orgId,
          parent_id: parentId,
          code: def.code,
          name: def.name,
          name_en: def.name_en,
          type: def.type,
          account_type: def.account_type,
          current_balance: 0,
          is_active: true,
          system_flag: def.system_flag ?? false,
          created_at: now,
          updated_at: now,
          sync_status: 'pending',
        };
        created.push(acc);
        byCode.set(def.code, id);
        await db.accounts.put(acc);
        await SyncQueueManager.enqueue('accounts', id, 'insert', acc);
      }

      return created;
    });
  }

  /** Returns the account id for a given code, or null. */
  public static async findAccountId(orgId: string, code: string): Promise<string | null> {
    const acc = await db.accounts
      .where('org_id')
      .equals(orgId)
      .filter((a) => a.code === code && a.is_active)
      .first();
    return acc?.id ?? null;
  }

  /**
   * Resolves the ledger account id used to post cash/bank movements for a treasury.
   * Uses `treasury.account_code`; falls back to the bank or cash system account.
   */
  public static async resolveTreasuryAccountId(orgId: string, treasury?: Treasury): Promise<string> {
    if (treasury?.account_code) {
      const mapped = await this.findAccountId(orgId, treasury.account_code);
      if (mapped) return mapped;
    }
    const code = treasury?.type === 'bank' ? NATIVE_ACCOUNT_CODES.BANK : NATIVE_ACCOUNT_CODES.CASH;
    let fallback = await this.findAccountId(orgId, code);
    if (!fallback) {
      await this.ensureDefaultChartOfAccounts(orgId);
      fallback = await this.findAccountId(orgId, code);
    }
    if (fallback) return fallback;
    const cash = await this.findAccountId(orgId, NATIVE_ACCOUNT_CODES.CASH);
    return cash ?? '';
  }

  /** Server-safe balanced entry creation (opens its own transaction). */
  public static async journalize(input: JournalizeInput): Promise<JournalEntry> {
    const scope = [db.journal_entries, db.journal_entry_lines, db.accounts, db.app_settings, db.sync_queue] as const;
    return db.transaction('rw', scope, async () => this.journalizeInline(input));
  }

  /**
   * Creates a balanced journal entry with its lines, updates the account balance
   * cache transactionally, and enqueues every record for cloud sync.
   * Meant to be called INSIDE the caller's transaction with a scope covering
   * journal_entries / journal_entry_lines / accounts / app_settings / sync_queue.
   */
  public static async journalizeInline(input: JournalizeInput): Promise<JournalEntry> {
    const lines = input.lines.filter((l) => l.account_id && ((l.debit ?? 0) !== 0 || (l.credit ?? 0) !== 0));
    if (lines.length < 2) {
      throw new Error('Journal entry must have at least 2 non-zero lines');
    }

    const totalDebit = lines.reduce((sum, l) => sum + (l.debit ?? 0), 0);
    const totalCredit = lines.reduce((sum, l) => sum + (l.credit ?? 0), 0);
    if (Math.abs(totalDebit - totalCredit) > 0.001) {
      throw new Error(`Journal entry is not balanced (debit ${totalDebit} <> credit ${totalCredit})`);
    }
    if (totalDebit <= 0) {
      throw new Error('Journal entry total must be greater than zero');
    }

    const now = new Date().toISOString();
    const entryId = uuidv4();
    const entryNo = await this.nextEntryNo(input.org_id);
    const entryDate = input.entry_date || now;

    const entry: JournalEntry = {
      id: entryId,
      org_id: input.org_id,
      branch_id: input.branch_id || undefined,
      entry_no: entryNo,
      entry_date: entryDate,
      type: input.type ?? 'general',
      description: input.description,
      reference_type: input.reference_type ?? null,
      reference_id: input.reference_id ?? null,
      total_amount: Math.round(totalDebit * 100) / 100,
      is_reversed: false,
      created_by: input.created_by ?? '',
      created_at: now,
      sync_status: 'pending',
    };

    const lineRecords: JournalEntryLine[] = lines.map((l) => ({
      id: uuidv4(),
      entry_id: entryId,
      account_id: l.account_id,
      debit: l.debit ?? 0,
      credit: l.credit ?? 0,
      description: l.description,
    }));

    await db.journal_entries.put(entry);
    await db.journal_entry_lines.bulkPut(lineRecords);
    await SyncQueueManager.enqueue('journal_entries', entryId, 'insert', entry);

    for (const line of lineRecords) {
      const acc = await db.accounts.get(line.account_id);
      if (acc) {
        acc.current_balance = Math.round((acc.current_balance + line.debit - line.credit) * 100) / 100;
        acc.updated_at = now;
        acc.sync_status = 'pending';
        await db.accounts.put(acc);
        await SyncQueueManager.enqueue('accounts', acc.id, 'update', acc);
      }
      await SyncQueueManager.enqueue('journal_entry_lines', line.id, 'insert', line);
    }

    return entry;
  }

  /**
   * Reverses a posted entry by creating a mirror entry (debit <-> credit)
   * flagged as `reversal` and marking the original as reversed.
   */
  public static async reverseEntry(orgId: string, entryId: string, reason: string, createdBy?: string): Promise<JournalEntry> {
    const scope = [db.journal_entries, db.journal_entry_lines, db.accounts, db.app_settings, db.sync_queue] as const;
    return db.transaction('rw', scope, async () => {
      const original = await db.journal_entries.get(entryId);
      if (!original || original.org_id !== orgId) {
        throw new Error('Journal entry not found');
      }
      if (original.is_reversed) {
        throw new Error('This entry is already reversed');
      }
      if (original.type === 'reversal') {
        throw new Error('Reversal entries cannot be reversed');
      }

      const lines = await db.journal_entry_lines.where('entry_id').equals(entryId).toArray();

      // Mirror lines: debit <-> credit
      const mirrorLines = lines.map((l) => ({
        account_id: l.account_id,
        debit: l.credit,
        credit: l.debit,
        description: `عكس: ${original.description}`,
      }));

      const reversal = await this.journalizeInline({
        org_id: original.org_id,
        branch_id: original.branch_id,
        type: 'reversal',
        entry_date: new Date().toISOString(),
        description: `عكس قيد ${original.entry_no} - ${reason}`,
        reference_type: 'journal_entry',
        reference_id: entryId,
        lines: mirrorLines,
        created_by: createdBy,
      });

      // Mark original as reversed
      const origPayload: JournalEntry = {
        ...original,
        is_reversed: true,
        sync_status: 'pending',
      };
      await db.journal_entries.put(origPayload);
      await SyncQueueManager.enqueue('journal_entries', original.id, 'update', origPayload);

      return reversal;
    });
  }

  /**
   * Posts opening balances for an organization: each provided ledger balance is
   * posted against the retained-earnings account to keep the entry balanced.
   */
  public static async postOpeningBalances(
    orgId: string,
    balances: Array<{ account_id: string; amount: number }>,
    createdBy?: string
  ): Promise<JournalEntry | null> {
    if (balances.length === 0) {
      return null;
    }

    const retainedId = await this.findAccountId(orgId, NATIVE_ACCOUNT_CODES.RETAINED_EARNINGS);
    if (!retainedId) {
      throw new Error('Retained-earnings account is missing; seed the chart of accounts first');
    }

    const lines: Array<{ account_id: string; debit: number; credit: number }> = [];
    let net = 0;

    for (const b of balances) {
      const acc = await db.accounts.get(b.account_id);
      if (!acc) continue;
      const naturalDebit = acc.type === 'asset' || acc.type === 'expense';
      if (naturalDebit) {
        lines.push({ account_id: b.account_id, debit: b.amount, credit: 0 });
        net += b.amount;
      } else {
        lines.push({ account_id: b.account_id, debit: 0, credit: b.amount });
        net -= b.amount;
      }
    }

    if (Math.abs(net) > 0.001) {
      if (net > 0) {
        lines.push({ account_id: retainedId, debit: 0, credit: net });
      } else {
        lines.push({ account_id: retainedId, debit: -net, credit: 0 });
      }
    }

    return this.journalize({
      org_id: orgId,
      type: 'opening',
      description: 'أرصدة افتتاحية',
      lines,
      created_by: createdBy,
    });
  }

  /** Sequential entry numbering (ENTR-YYYY-####) stored in app_settings. */
  private static async nextEntryNo(orgId: string): Promise<string> {
    const nowDate = new Date();
    const prefix = `ENTR-${nowDate.getFullYear()}`;
    const seqKey = `entry_seq_${orgId}`;
    const counter = await db.app_settings.get(seqKey);
    const next = (counter ? parseInt(counter.value || '0', 10) : 0) + 1;
    await db.app_settings.put({
      id: seqKey,
      org_id: orgId,
      value: String(next),
      description: 'Journal entry sequence',
      updated_at: new Date().toISOString(),
      sync_status: 'synced',
    });
    return `${prefix}-${String(next).padStart(4, '0')}`;
  }

  /** Flat list of all leaf accounts for an org (used by UI pickers). */
  public static async listLeafAccounts(orgId: string): Promise<Account[]> {
    return db.accounts
      .where('org_id')
      .equals(orgId)
      .filter((a) => a.account_type === 'leaf' && a.is_active)
      .toArray();
  }

  // ---------------------------------------------------------------------------
  // Auto-accounting document posting (idempotent per reference document)
  // ---------------------------------------------------------------------------

  /** True when a non-reversal entry already exists for this source document. */
  private static async hasPosted(orgId: string, referenceType: string, referenceId: string): Promise<boolean> {
    const existing = await db.journal_entries
      .where('org_id')
      .equals(orgId)
      .filter((e) => e.reference_type === referenceType && e.reference_id === referenceId && !e.is_reversed)
      .first();
    return Boolean(existing);
  }

  private static async accountId(orgId: string, code: string): Promise<string> {
    const id = await this.findAccountId(orgId, code);
    if (!id) {
      await this.ensureDefaultChartOfAccounts(orgId);
      return (await this.findAccountId(orgId, code)) ?? '';
    }
    return id;
  }

  /**
   * Posts a sales invoice:
   *   Dr Cash (treasury account) / Dr Bank (card) / Dr Receivables (credit)
   *   Dr COGS / Cr Sales / Cr Accrued (tax) / Cr Inventory / Cr Other Revenue (shipping)
   */
  public static async postSalesInvoice(params: {
    orgId: string;
    branchId?: string | null;
    invoiceId: string;
    invoiceNumber: string;
    date: string;
    netRevenue: number;
    taxAmount: number;
    shipping?: number;
    cashPaid: number;
    cardPaid: number;
    creditAmount: number;
    cogs: number;
    treasuryId?: string | null;
    userId?: string | null;
  }): Promise<void> {
    if (await this.hasPosted(params.orgId, 'sale_invoice', params.invoiceId)) return;

    const shipping = params.shipping || 0;
    const treasury = params.treasuryId ? await db.treasuries.get(params.treasuryId) : undefined;
    const cashAccount = await this.resolveTreasuryAccountId(params.orgId, treasury);
    const bankAccount = await this.accountId(params.orgId, NATIVE_ACCOUNT_CODES.BANK);
    const receivables = await this.accountId(params.orgId, NATIVE_ACCOUNT_CODES.RECEIVABLES);
    const sales = await this.accountId(params.orgId, NATIVE_ACCOUNT_CODES.SALES);
    const accrued = await this.accountId(params.orgId, NATIVE_ACCOUNT_CODES.ACCRUED);
    const cogsAccount = await this.accountId(params.orgId, NATIVE_ACCOUNT_CODES.COGS);
    const inventory = await this.accountId(params.orgId, NATIVE_ACCOUNT_CODES.INVENTORY);
    const otherRevenue = await this.accountId(params.orgId, NATIVE_ACCOUNT_CODES.OTHER_REVENUE);

    const lines = [
      { account_id: cashAccount, debit: params.cashPaid, credit: 0 },
      { account_id: bankAccount, debit: params.cardPaid, credit: 0 },
      { account_id: receivables, debit: params.creditAmount, credit: 0 },
      { account_id: cogsAccount, debit: params.cogs, credit: 0 },
      { account_id: sales, debit: 0, credit: params.netRevenue },
      { account_id: accrued, debit: 0, credit: params.taxAmount },
      { account_id: inventory, debit: 0, credit: params.cogs },
      ...(shipping > 0 ? [{ account_id: otherRevenue, debit: 0, credit: shipping }] : []),
    ];

    await this.journalize({
      org_id: params.orgId,
      branch_id: params.branchId,
      type: 'sales',
      entry_date: params.date,
      description: `فاتورة مبيعات ${params.invoiceNumber}`,
      reference_type: 'sale_invoice',
      reference_id: params.invoiceId,
      lines,
      created_by: params.userId,
    });
  }

  /** Reverses a sales invoice posting (returns stock + refunds). */
  public static async postSalesReturn(params: {
    orgId: string;
    branchId?: string | null;
    returnId: string;
    returnNumber: string;
    date: string;
    netReturn: number;
    taxAmount: number;
    refundedAmount: number;
    creditAmount: number;
    cogs: number;
    treasuryId?: string | null;
    userId?: string | null;
  }): Promise<void> {
    if (await this.hasPosted(params.orgId, 'sale_return', params.returnId)) return;

    const treasury = params.treasuryId ? await db.treasuries.get(params.treasuryId) : undefined;
    const cashAccount = await this.resolveTreasuryAccountId(params.orgId, treasury);
    const receivables = await this.accountId(params.orgId, NATIVE_ACCOUNT_CODES.RECEIVABLES);
    const salesReturns = await this.accountId(params.orgId, NATIVE_ACCOUNT_CODES.SALES_RETURNS);
    const accrued = await this.accountId(params.orgId, NATIVE_ACCOUNT_CODES.ACCRUED);
    const cogsAccount = await this.accountId(params.orgId, NATIVE_ACCOUNT_CODES.COGS);
    const inventory = await this.accountId(params.orgId, NATIVE_ACCOUNT_CODES.INVENTORY);

    await this.journalize({
      org_id: params.orgId,
      branch_id: params.branchId,
      type: 'sales',
      entry_date: params.date,
      description: `مردود مبيعات ${params.returnNumber}`,
      reference_type: 'sale_return',
      reference_id: params.returnId,
      lines: [
        { account_id: salesReturns, debit: params.netReturn, credit: 0 },
        { account_id: accrued, debit: params.taxAmount, credit: 0 },
        { account_id: inventory, debit: params.cogs, credit: 0 },
        { account_id: cashAccount, debit: 0, credit: params.refundedAmount },
        { account_id: receivables, debit: 0, credit: params.creditAmount },
        { account_id: cogsAccount, debit: 0, credit: params.cogs },
      ],
      created_by: params.userId,
    });
  }

  /** Posts a purchase invoice: Dr Inventory / Dr Accrued(tax) / Cr Treasury / Cr Suppliers. */
  public static async postPurchaseInvoice(params: {
    orgId: string;
    branchId?: string | null;
    invoiceId: string;
    invoiceNumber: string;
    date: string;
    netPurchase: number;
    taxAmount: number;
    paidAmount: number;
    creditAmount: number;
    treasuryId?: string | null;
    userId?: string | null;
  }): Promise<void> {
    if (await this.hasPosted(params.orgId, 'purchase_invoice', params.invoiceId)) return;

    const treasury = params.treasuryId ? await db.treasuries.get(params.treasuryId) : undefined;
    const cashAccount = await this.resolveTreasuryAccountId(params.orgId, treasury);
    const suppliers = await this.accountId(params.orgId, NATIVE_ACCOUNT_CODES.SUPPLIERS);
    const accrued = await this.accountId(params.orgId, NATIVE_ACCOUNT_CODES.ACCRUED);
    const inventory = await this.accountId(params.orgId, NATIVE_ACCOUNT_CODES.INVENTORY);

    await this.journalize({
      org_id: params.orgId,
      branch_id: params.branchId,
      type: 'purchases',
      entry_date: params.date,
      description: `فاتورة مشتريات ${params.invoiceNumber}`,
      reference_type: 'purchase_invoice',
      reference_id: params.invoiceId,
      lines: [
        { account_id: inventory, debit: params.netPurchase, credit: 0 },
        { account_id: accrued, debit: params.taxAmount, credit: 0 },
        { account_id: cashAccount, debit: 0, credit: params.paidAmount },
        { account_id: suppliers, debit: 0, credit: params.creditAmount },
      ],
      created_by: params.userId,
    });
  }

  /** Posts a purchase return (reverses the returned goods + input VAT):
   *  Dr Suppliers (full returned value) / Cr Accrued (VAT reversed) / Cr Inventory,
   *  plus Dr Treasury / Cr Suppliers when the money returned to a treasury. */
  public static async postPurchaseReturn(params: {
    orgId: string;
    branchId?: string | null;
    returnId: string;
    returnNumber: string;
    date: string;
    netReturn: number;
    taxAmount: number;
    refundedAmount: number;
    creditAmount: number;
    treasuryId?: string | null;
    userId?: string | null;
  }): Promise<void> {
    if (await this.hasPosted(params.orgId, 'purchase_return', params.returnId)) return;

    const treasury = params.treasuryId ? await db.treasuries.get(params.treasuryId) : undefined;
    const cashAccount = await this.resolveTreasuryAccountId(params.orgId, treasury);
    const suppliers = await this.accountId(params.orgId, NATIVE_ACCOUNT_CODES.SUPPLIERS);
    const accrued = await this.accountId(params.orgId, NATIVE_ACCOUNT_CODES.ACCRUED);
    const inventory = await this.accountId(params.orgId, NATIVE_ACCOUNT_CODES.INVENTORY);

    // Full value the supplier owes back = net goods + the reverse of the input VAT.
    const total = params.netReturn + params.taxAmount;

    const lines = [
      { account_id: suppliers, debit: total, credit: 0 },
      { account_id: accrued, debit: 0, credit: params.taxAmount },
      { account_id: inventory, debit: 0, credit: params.netReturn },
    ];

    if (params.refundedAmount > 0) {
      lines.push({ account_id: cashAccount, debit: params.refundedAmount, credit: 0 });
      lines.push({ account_id: suppliers, debit: 0, credit: params.refundedAmount });
    }

    await this.journalize({
      org_id: params.orgId,
      branch_id: params.branchId,
      type: 'purchases',
      entry_date: params.date,
      description: `مردود مشتريات ${params.returnNumber}`,
      reference_type: 'purchase_return',
      reference_id: params.returnId,
      lines,
      created_by: params.userId,
    });
  }

  /** Posts cash/bank expense: Dr Operating Expenses / Cr Treasury. */
  public static async postExpense(params: {
    orgId: string;
    branchId?: string | null;
    expenseId: string;
    date: string;
    amount: number;
    description: string;
    treasuryId: string;
    userId?: string | null;
  }): Promise<void> {
    if (await this.hasPosted(params.orgId, 'expense', params.expenseId)) return;

    const treasury = await db.treasuries.get(params.treasuryId);
    const cashAccount = await this.resolveTreasuryAccountId(params.orgId, treasury);
    const expenseAccount = await this.accountId(params.orgId, NATIVE_ACCOUNT_CODES.OPERATING_EXPENSES);

    await this.journalize({
      org_id: params.orgId,
      branch_id: params.branchId,
      type: 'expenses',
      entry_date: params.date,
      description: params.description,
      reference_type: 'expense',
      reference_id: params.expenseId,
      lines: [
        { account_id: expenseAccount, debit: params.amount, credit: 0 },
        { account_id: cashAccount, debit: 0, credit: params.amount },
      ],
      created_by: params.userId,
    });
  }

  /**
   * Posts a generic financial voucher.
   * Receipt: Dr Treasury / Cr Receivables (contact) or Other Revenue (no contact).
   * Payment: Dr Suppliers (contact) or Other Expenses (no contact) / Cr Treasury.
   */
  public static async postVoucher(params: {
    orgId: string;
    branchId?: string | null;
    voucherId: string;
    voucherNo: string;
    date: string;
    type: 'receipt' | 'payment';
    amount: number;
    description: string;
    treasuryId: string;
    hasContact: boolean;
    userId?: string | null;
  }): Promise<void> {
    if (await this.hasPosted(params.orgId, 'voucher', params.voucherId)) return;

    const treasury = await db.treasuries.get(params.treasuryId);
    const cashAccount = await this.resolveTreasuryAccountId(params.orgId, treasury);
    const receivables = await this.accountId(params.orgId, NATIVE_ACCOUNT_CODES.RECEIVABLES);
    const suppliers = await this.accountId(params.orgId, NATIVE_ACCOUNT_CODES.SUPPLIERS);
    const otherRevenue = await this.accountId(params.orgId, NATIVE_ACCOUNT_CODES.OTHER_REVENUE);
    const otherExpenses = await this.accountId(params.orgId, NATIVE_ACCOUNT_CODES.OTHER_EXPENSES);

    const lines = params.type === 'receipt'
      ? [
        { account_id: cashAccount, debit: params.amount, credit: 0 },
        { account_id: params.hasContact ? receivables : otherRevenue, debit: 0, credit: params.amount },
      ]
      : [
        { account_id: params.hasContact ? suppliers : otherExpenses, debit: params.amount, credit: 0 },
        { account_id: cashAccount, debit: 0, credit: params.amount },
      ];

    await this.journalize({
      org_id: params.orgId,
      branch_id: params.branchId,
      type: 'voucher',
      entry_date: params.date,
      description: params.description || params.voucherNo,
      reference_type: 'voucher',
      reference_id: params.voucherId,
      lines,
      created_by: params.userId,
    });
  }

  /** Posts supplier payment: Dr Suppliers (amount + discount) / Cr Treasury / Cr Other Revenue (discount). */
  public static async postSupplierPayment(params: {
    orgId: string;
    branchId?: string | null;
    voucherId: string;
    voucherNo: string;
    date: string;
    amount: number;
    discount: number;
    treasuryId: string;
    userId?: string | null;
  }): Promise<void> {
    if (await this.hasPosted(params.orgId, 'voucher', params.voucherId)) return;

    const treasury = await db.treasuries.get(params.treasuryId);
    const cashAccount = await this.resolveTreasuryAccountId(params.orgId, treasury);
    const suppliers = await this.accountId(params.orgId, NATIVE_ACCOUNT_CODES.SUPPLIERS);
    const otherRevenue = await this.accountId(params.orgId, NATIVE_ACCOUNT_CODES.OTHER_REVENUE);

    await this.journalize({
      org_id: params.orgId,
      branch_id: params.branchId,
      type: 'voucher',
      entry_date: params.date,
      description: `سداد مورد ${params.voucherNo}`,
      reference_type: 'voucher',
      reference_id: params.voucherId,
      lines: [
        { account_id: suppliers, debit: params.amount + params.discount, credit: 0 },
        { account_id: cashAccount, debit: 0, credit: params.amount },
        { account_id: otherRevenue, debit: 0, credit: params.discount },
      ],
      created_by: params.userId,
    });
  }

  /** Posts customer collection: Dr Treasury / Dr Other Expenses (discount) / Cr Receivables. */
  public static async postCustomerPayment(params: {
    orgId: string;
    branchId?: string | null;
    voucherId: string;
    voucherNo: string;
    date: string;
    amount: number;
    discount: number;
    treasuryId: string;
    userId?: string | null;
  }): Promise<void> {
    if (await this.hasPosted(params.orgId, 'voucher', params.voucherId)) return;

    const treasury = await db.treasuries.get(params.treasuryId);
    const cashAccount = await this.resolveTreasuryAccountId(params.orgId, treasury);
    const receivables = await this.accountId(params.orgId, NATIVE_ACCOUNT_CODES.RECEIVABLES);
    const otherExpenses = await this.accountId(params.orgId, NATIVE_ACCOUNT_CODES.OTHER_EXPENSES);

    await this.journalize({
      org_id: params.orgId,
      branch_id: params.branchId,
      type: 'voucher',
      entry_date: params.date,
      description: `تحصيل من عميل ${params.voucherNo}`,
      reference_type: 'voucher',
      reference_id: params.voucherId,
      lines: [
        { account_id: cashAccount, debit: params.amount, credit: 0 },
        { account_id: otherExpenses, debit: params.discount, credit: 0 },
        { account_id: receivables, debit: 0, credit: params.amount + params.discount },
      ],
      created_by: params.userId,
    });
  }

  /** Posts an internal treasury transfer: Dr Destination / Cr Source. */
  public static async postInternalTransfer(params: {
    orgId: string;
    branchId?: string | null;
    sourceTreasuryId: string;
    destinationTreasuryId: string;
    amount: number;
    date: string;
    description: string;
    referenceId: string;
    userId?: string | null;
  }): Promise<void> {
    if (await this.hasPosted(params.orgId, 'internal_transfer', params.referenceId)) return;

    const source = await db.treasuries.get(params.sourceTreasuryId);
    const destination = await db.treasuries.get(params.destinationTreasuryId);
    const sourceAccount = await this.resolveTreasuryAccountId(params.orgId, source);
    const destAccount = await this.resolveTreasuryAccountId(params.orgId, destination);

    await this.journalize({
      org_id: params.orgId,
      branch_id: params.branchId,
      type: 'voucher',
      entry_date: params.date,
      description: params.description,
      reference_type: 'internal_transfer',
      reference_id: params.referenceId,
      lines: [
        { account_id: destAccount, debit: params.amount, credit: 0 },
        { account_id: sourceAccount, debit: 0, credit: params.amount },
      ],
      created_by: params.userId,
    });
  }

  /** Posts a salary/payroll payment: Dr Salaries Expense / Cr Treasury. */
  public static async postPayrollPayment(params: {
    orgId: string;
    branchId?: string | null;
    referenceId: string;
    date: string;
    amount: number;
    description: string;
    treasuryId: string;
    userId?: string | null;
  }): Promise<void> {
    if (await this.hasPosted(params.orgId, 'payroll', params.referenceId)) return;

    const treasury = await db.treasuries.get(params.treasuryId);
    const cashAccount = await this.resolveTreasuryAccountId(params.orgId, treasury);
    const salaries = await this.accountId(params.orgId, NATIVE_ACCOUNT_CODES.PAYROLL_SALARIES);

    await this.journalize({
      org_id: params.orgId,
      branch_id: params.branchId,
      type: 'payroll',
      entry_date: params.date,
      description: params.description,
      reference_type: 'payroll',
      reference_id: params.referenceId,
      lines: [
        { account_id: salaries, debit: params.amount, credit: 0 },
        { account_id: cashAccount, debit: 0, credit: params.amount },
      ],
      created_by: params.userId,
    });
  }

  /**
   * Posts a cash advance / loan / bonus payment to an employee.
   * - Dr Payroll & Salaries (5301) / Cr Cash or Bank.
   */
  public static async postEmployeeAdvancePayment(params: {
    orgId: string;
    branchId?: string | null;
    referenceId: string;
    date: string;
    amount: number;
    description: string;
    treasuryId: string;
    userId?: string | null;
  }): Promise<void> {
    if (await this.hasPosted(params.orgId, 'advance', params.referenceId)) return;
    if (!(params.amount > 0)) return;

    const treasury = await db.treasuries.get(params.treasuryId);
    const cashAccount = await this.resolveTreasuryAccountId(params.orgId, treasury);
    const salaries = await this.accountId(params.orgId, NATIVE_ACCOUNT_CODES.PAYROLL_SALARIES);

    await this.journalize({
      org_id: params.orgId,
      branch_id: params.branchId,
      type: 'payroll',
      entry_date: params.date,
      description: params.description,
      reference_type: 'advance',
      reference_id: params.referenceId,
      lines: [
        { account_id: salaries, debit: params.amount, credit: 0 },
        { account_id: cashAccount, debit: 0, credit: params.amount },
      ],
      created_by: params.userId,
    });
  }

  /**
   * Posts inventory variance from a committed stocktake session.
   * - Positive variance (surplus): Dr Inventory (1140) / Cr Other Revenue (4900).
   * - Negative variance (shortage): Dr COGS (5100) / Cr Inventory (1140).
   */
  public static async postStocktakeAdjustment(params: {
    orgId: string;
    branchId?: string | null;
    sessionId: string;
    sessionNumber: string;
    date: string;
    totalDifferenceValue: number;
    userId?: string | null;
  }): Promise<void> {
    if (await this.hasPosted(params.orgId, 'stocktake', params.sessionId)) return;
    if (Math.abs(params.totalDifferenceValue) < 0.0001) return;

    const inventory = await this.accountId(params.orgId, NATIVE_ACCOUNT_CODES.INVENTORY);
    const otherRevenue = await this.accountId(params.orgId, NATIVE_ACCOUNT_CODES.OTHER_REVENUE);
    const cogsAccount = await this.accountId(params.orgId, NATIVE_ACCOUNT_CODES.COGS);

    const isSurplus = params.totalDifferenceValue > 0;
    const absDiff = Math.abs(params.totalDifferenceValue);

    const lines = isSurplus
      ? [
          { account_id: inventory, debit: absDiff, credit: 0 },
          { account_id: otherRevenue, debit: 0, credit: absDiff },
        ]
      : [
          { account_id: cogsAccount, debit: absDiff, credit: 0 },
          { account_id: inventory, debit: 0, credit: absDiff },
        ];

    await this.journalize({
      org_id: params.orgId,
      branch_id: params.branchId,
      type: 'adjustment',
      entry_date: params.date,
      description: `تسوية جرد مخزني ${params.sessionNumber} (${isSurplus ? 'فائض مخزون' : 'عجز مخزون'})`,
      reference_type: 'stocktake',
      reference_id: params.sessionId,
      lines,
      created_by: params.userId,
    });
  }

  /**
   * Posts a manual stock adjustment / damage write-off (from StockAdjustmentService).
   * - Surplus (adjustment_in):  Dr Inventory (1140) / Cr Other Revenue (4900).
   * - Shortage / damaged (out): Dr COGS (5100) / Cr Inventory (1140).
   * Idempotent per originating movement transaction.
   */
  public static async postStockAdjustment(params: {
    orgId: string;
    branchId?: string | null;
    date: string;
    referenceId: string;
    value: number; // signed base-value: positive = surplus, negative = shortage/damage
    notes: string;
    userId?: string | null;
  }): Promise<void> {
    if (await this.hasPosted(params.orgId, 'stock_adjustment', params.referenceId)) return;
    if (Math.abs(params.value) < 0.0001) return;

    const inventory = await this.accountId(params.orgId, NATIVE_ACCOUNT_CODES.INVENTORY);
    const otherRevenue = await this.accountId(params.orgId, NATIVE_ACCOUNT_CODES.OTHER_REVENUE);
    const cogsAccount = await this.accountId(params.orgId, NATIVE_ACCOUNT_CODES.COGS);

    const isSurplus = params.value > 0;
    const absDiff = Math.abs(params.value);

    const lines = isSurplus
      ? [
          { account_id: inventory, debit: absDiff, credit: 0 },
          { account_id: otherRevenue, debit: 0, credit: absDiff },
        ]
      : [
          { account_id: cogsAccount, debit: absDiff, credit: 0 },
          { account_id: inventory, debit: 0, credit: absDiff },
        ];

    await this.journalize({
      org_id: params.orgId,
      branch_id: params.branchId,
      type: 'adjustment',
      entry_date: params.date,
      description: `تسوية مخزون (${isSurplus ? 'زيادة' : 'عجز/توالف'}): ${params.notes}`,
      reference_type: 'stock_adjustment',
      reference_id: params.referenceId,
      lines,
      created_by: params.userId,
    });
  }

  /** Reverses the journal entry of a source document (used on delete/cancel). */
  public static async reverseDocument(
    orgId: string,
    referenceType: string,
    referenceId: string,
    reason: string,
    createdBy?: string
  ): Promise<void> {
    const entry = await db.journal_entries
      .where('org_id')
      .equals(orgId)
      .filter((e) => e.reference_type === referenceType && e.reference_id === referenceId && !e.is_reversed && e.type !== 'reversal')
      .first();
    if (!entry) return;
    await this.reverseEntry(orgId, entry.id, reason, createdBy);
  }
}

export const accountingRepository = AccountingRepository;