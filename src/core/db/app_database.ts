import Dexie, { type Table } from 'dexie';
import type {
  Organization,
  Branch,
  User,
  AppSetting,
  ProductCategory,
  ProductBrand,
  ProductTypeItem,
  Unit,
  Product,
  ProductUnit,
  ProductBatch,
  Warehouse,
  StockLevel,
  InventoryTransaction,
  StockTransfer,
  StockTransferItem,
  Contact,
  ContactTransaction,
  Treasury,
  ExpenseCategory,
  Expense,
  FinancialVoucher,
  CashierShift,
  SalesInvoice,
  SalesInvoiceItem,
  SalesReturn,
  PurchaseInvoice,
  PurchaseInvoiceItem,
  PurchaseReturn,
  StocktakeSession,
  StocktakeItem,
  SyncQueueItem,
  ActivityLog,
  JournalEntry,
  JournalEntryLine,
  Account,
  EmployeeAttendance,
  EmployeeSalaryStatement,
  EmployeeLeave,
  EmployeeAdvance,
  EmployeeDocument,
  Department,
} from '@/types';

/**
 * 🦅 Falcon ERP Universal IndexedDB Database (Dexie.js)
 * Fully offline-capable, ACID-compliant local database engine.
 * Fully compatible with Windows 7 browsers (Chrome 109+, Firefox 115 ESR, Edge 109).
 */
export class FalconAppDatabase extends Dexie {
  organizations!: Table<Organization, string>;
  branches!: Table<Branch, string>;
  users!: Table<User, string>;
  app_settings!: Table<AppSetting, string>;
  
  product_categories!: Table<ProductCategory, string>;
  product_brands!: Table<ProductBrand, string>;
  product_types!: Table<ProductTypeItem, string>;
  units!: Table<Unit, string>;
  products!: Table<Product, string>;
  product_units!: Table<ProductUnit, string>;
  product_batches!: Table<ProductBatch, string>;
  
  warehouses!: Table<Warehouse, string>;
  stock_levels!: Table<StockLevel, string>;
  inventory_transactions!: Table<InventoryTransaction, string>;
  stock_transfers!: Table<StockTransfer, string>;
  stock_transfer_items!: Table<StockTransferItem, string>;
  
  contacts!: Table<Contact, string>;
  contact_transactions!: Table<ContactTransaction, string>;
  
  treasuries!: Table<Treasury, string>;
  expense_categories!: Table<ExpenseCategory, string>;
  expenses!: Table<Expense, string>;
  financial_vouchers!: Table<FinancialVoucher, string>;
  
  cashier_shifts!: Table<CashierShift, string>;
  sales_invoices!: Table<SalesInvoice, string>;
  sales_invoice_items!: Table<SalesInvoiceItem, string>;
  sales_returns!: Table<SalesReturn, string>;
  
  purchase_invoices!: Table<PurchaseInvoice, string>;
  purchase_invoice_items!: Table<PurchaseInvoiceItem, string>;
  purchase_returns!: Table<PurchaseReturn, string>;
  
  stocktake_sessions!: Table<StocktakeSession, string>;
  stocktake_items!: Table<StocktakeItem, string>;

  employee_attendance!: Table<EmployeeAttendance, string>;
  salary_statements!: Table<EmployeeSalaryStatement, string>;
  employee_leaves!: Table<EmployeeLeave, string>;
  employee_advances!: Table<EmployeeAdvance, string>;
  employee_documents!: Table<EmployeeDocument, string>;
  departments!: Table<Department, string>;

  journal_entries!: Table<JournalEntry, string>;
  journal_entry_lines!: Table<JournalEntryLine, string>;
  accounts!: Table<Account, string>;

  sync_queue!: Table<SyncQueueItem, string>;
  activity_logs!: Table<ActivityLog, string>;

  constructor() {
    super('falcon_universal_erp_db');

    this.version(1).stores({
      organizations: 'id, is_active, subscription_tier, sync_status',
      branches: 'id, org_id, code, is_main, is_active, sync_status',
      users: 'id, org_id, branch_id, username, role, is_active, sync_status',
      app_settings: 'id, org_id, sync_status',

      product_categories: 'id, org_id, parent_id, code, is_active, sync_status',
      product_brands: 'id, org_id, sync_status',
      product_types: 'id, org_id, name, is_active, sync_status',
      units: 'id, org_id, is_active, sync_status',
      products: 'id, org_id, sku, name, category_id, brand_id, item_type, is_active, sync_status',
      product_units: 'id, product_id, unit_id, barcode, is_default_sale, is_default_purchase, sync_status',
      product_batches: 'id, product_id, warehouse_id, batch_number, expiry_date, sync_status',

      warehouses: 'id, org_id, branch_id, code, is_main, is_active, sync_status',
      stock_levels: 'id, org_id, warehouse_id, product_id, [warehouse_id+product_id], sync_status',
      inventory_transactions: 'id, org_id, warehouse_id, product_id, transaction_type, reference_id, created_at, sync_status',
      stock_transfers: 'id, org_id, from_warehouse_id, to_warehouse_id, status, created_at, sync_status',
      stock_transfer_items: 'id, transfer_id, product_id',

      contacts: 'id, org_id, type, name, phone, code, is_active, sync_status',
      contact_transactions: 'id, org_id, contact_id, reference_type, reference_id, created_at, sync_status',

      treasuries: 'id, org_id, branch_id, type, is_default, is_active, sync_status',
      expense_categories: 'id, org_id, is_active, sync_status',
      expenses: 'id, org_id, category_id, treasury_id, shift_id, created_at, sync_status',
      financial_vouchers: 'id, org_id, type, treasury_id, contact_id, shift_id, created_at, sync_status',

      cashier_shifts: 'id, org_id, branch_id, user_id, treasury_id, status, opened_at, sync_status',
      sales_invoices: 'id, org_id, branch_id, warehouse_id, shift_id, invoice_number, customer_id, status, invoice_date, sync_status',
      sales_invoice_items: 'id, invoice_id, product_id',
      sales_returns: 'id, org_id, branch_id, original_invoice_id, shift_id, return_number, return_date, sync_status',

      purchase_invoices: 'id, org_id, branch_id, warehouse_id, supplier_id, invoice_number, status, invoice_date, sync_status',
      purchase_invoice_items: 'id, invoice_id, product_id',

      sync_queue: 'id, entity_table, entity_id, status, retry_count, created_at',
      activity_logs: 'id, org_id, user_id, action, entity_type, created_at, sync_status',
    });

    // Incremental upgrade: adds the transfer-lines table to databases created before its introduction.
    this.version(2).stores({
      stock_transfer_items: 'id, transfer_id, product_id',
    });

    // Incremental upgrade: adds the purchase-returns document table.
    this.version(3).stores({
      purchase_returns: 'id, org_id, branch_id, original_invoice_id, supplier_id, return_number, return_date, sync_status',
    });

    // Incremental upgrade: adds the product_types table.
    this.version(4).stores({
      product_types: 'id, org_id, name, is_active, sync_status',
    });

    // Incremental upgrade: adds stocktake tables.
    this.version(5).stores({
      stocktake_sessions: 'id, org_id, branch_id, warehouse_id, session_number, status, created_at, sync_status',
      stocktake_items: 'id, session_id, product_id',
    });

    // Incremental upgrade: adds reference_type index to inventory_transactions for efficient document-based lookups.
    this.version(6).stores({
      inventory_transactions: 'id, org_id, warehouse_id, product_id, transaction_type, reference_type, reference_id, created_at, sync_status',
    });

    // Incremental upgrade: adds journal entries for accounting.
    this.version(7).stores({
      journal_entries: 'id, org_id, branch_id, entry_no, entry_date, type, sync_status',
      journal_entry_lines: 'id, entry_id, account_id',
      accounts: 'id, org_id, parent_id, code, type, is_active, sync_status',
    });

    // Incremental upgrade: adds employee attendance, salary statements, and departments.
    this.version(8).stores({
      employee_attendance: 'id, org_id, branch_id, employee_id, date, status, sync_status',
      salary_statements: 'id, org_id, employee_id, month, status, sync_status',
      employee_leaves: 'id, org_id, employee_id, leave_type, status, start_date, sync_status',
      departments: 'id, org_id, parent_id, manager_id, is_active, sync_status',
    });

    // Incremental upgrade: adds employee advances (loans/bonuses) and employee documents.
    this.version(9).stores({
      employee_advances: 'id, org_id, branch_id, employee_id, adjustment_type, status, sync_status',
      employee_documents: 'id, org_id, employee_id, document_type, sync_status',
    });

    // Incremental upgrade (Phase 1 - Unit Levels):
    // Registers the extended local columns carrying the OWNER's level names and
    // per-level quantities (المنهجية المستوردة من pharmacy_system):
    //  - product_units.unit_name / level_order / available_quantity
    //  - product_batches.unit_id / unit_name / level_quantity
    //  - inventory_transactions.product_name / unit_name / level_quantity /
    //    batch_number / expiry_date / prev_quantity / new_quantity / reference_number
    // These are NON-indexed local (Dexie) fields; they are stripped by
    // sanitizePayloadForCloud when syncing so the Supabase contract is untouched.
    this.version(10).stores({
      product_units: 'id, product_id, unit_id, barcode, is_default_sale, is_default_purchase, sync_status',
      product_batches: 'id, product_id, warehouse_id, batch_number, expiry_date, sync_status',
      inventory_transactions: 'id, org_id, warehouse_id, product_id, transaction_type, reference_type, reference_id, created_at, sync_status',
    });
  }
}

// Singleton database instance
export const db = new FalconAppDatabase();
