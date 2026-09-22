import { db } from '@/core/db/app_database';
import { supabase, isSupabaseConfigured } from '@/core/supabase/supabase_client';
import { networkListener } from './network_listener';
import { SyncQueueManager } from './sync_queue_manager';
import { PullSyncService } from './pull_sync_service';
import { AuthRepository } from '@/modules/auth/auth_repository';
import type { SyncQueueItem } from '@/types';

/**
 * ترتيب أولوية المزامنة لضمان حفظ الجداول الرئيسية قبل الجداول التابعة (لتفادي أخطاء Foreign Key)
 */
const TABLE_SYNC_ORDER: Record<string, number> = {
  app_settings: 0,
  product_types: 1,
  organizations: 2,
  branches: 3,
  departments: 4,
  users: 5,
  warehouses: 6,
  treasuries: 7,
  units: 8,
  product_categories: 9,
  product_brands: 10,
  products: 11,
  product_units: 12,
  product_batches: 13,
  stock_levels: 14,
  stock_transfers: 15,
  stock_transfer_items: 16,
  inventory_transactions: 17,
  contacts: 18,
  contact_transactions: 19,
  expense_categories: 20,
  expenses: 21,
  financial_vouchers: 22,
  accounts: 23,
  journal_entries: 24,
  journal_entry_lines: 25,
  cashier_shifts: 26,
  sales_invoices: 27,
  sales_invoice_items: 28,
  sales_returns: 29,
  purchase_invoices: 30,
  purchase_invoice_items: 31,
  purchase_returns: 32,
  stocktake_sessions: 33,
  stocktake_items: 34,
  employee_attendance: 35,
  salary_statements: 36,
  employee_leaves: 37,
  employee_advances: 38,
  employee_documents: 39,
  activity_logs: 40,
};

/**
 * قائمة أعمدة كل جدول مسموح برفعها إلى Supabase (يعكس مخطط السحابة 100%).
 * تمنع أخطاء PostgREST (PGRST204) نتيجة أعمدة محلية فقط.
 */
const CLOUD_COLUMN_MAP: Record<string, Set<string>> = {
  organizations: new Set([
    'id', 'name', 'legal_name', 'activity_type', 'subscription_tier', 'subscription_expires_at', 'tax_number', 'commercial_reg_no',
    'currency', 'phone', 'email', 'address', 'logo_url', 'transport_token',
    'is_active', 'created_at', 'updated_at',
  ]),
  branches: new Set(['id', 'org_id', 'code', 'name', 'phone', 'address', 'is_main', 'is_active', 'created_at', 'updated_at']),
  users: new Set([
    'id', 'org_id', 'branch_id', 'username', 'full_name', 'email', 'phone', 'role',
    'pin_code_hash', 'department_id', 'job_title', 'hire_date', 'annual_leave_days',
    'basic_salary', 'salary_cycle', 'deductions', 'allowances',
    'permissions', 'is_active', 'created_at', 'updated_at',
  ]),
  app_settings: new Set(['id', 'org_id', 'value', 'description', 'updated_at']),
  warehouses: new Set(['id', 'org_id', 'branch_id', 'code', 'name', 'location', 'is_main', 'is_active', 'created_at', 'updated_at']),
  units: new Set(['id', 'org_id', 'name', 'symbol', 'is_active', 'created_at', 'updated_at']),
  product_categories: new Set(['id', 'org_id', 'parent_id', 'code', 'name', 'description', 'is_active', 'created_at', 'updated_at']),
  product_brands: new Set(['id', 'org_id', 'name', 'created_at', 'updated_at']),
  products: new Set([
    'id', 'org_id', 'sku', 'name', 'category_id', 'brand_id', 'item_type',
    'base_unit_id', 'purchase_price', 'sale_price', 'wholesale_price',
    'min_sale_price', 'tax_rate', 'is_tax_inclusive', 'tracks_batch',
    'tracks_expiry', 'min_stock_alert', 'max_stock_limit', 'description',
    'image_url', 'is_active', 'created_at', 'updated_at',
  ]),
  product_units: new Set([
    'id', 'product_id', 'unit_id', 'conversion_factor', 'barcode',
    'purchase_price', 'sale_price', 'wholesale_price', 'is_default_sale',
    'is_default_purchase', 'created_at', 'updated_at',
    'unit_name', 'level_order', 'available_quantity',
  ]),
  product_batches: new Set([
    'id', 'org_id', 'product_id', 'warehouse_id', 'batch_number',
    'expiry_date', 'initial_quantity', 'current_quantity', 'purchase_price',
    'created_at', 'updated_at', 'unit_id', 'unit_name', 'level_quantity',
  ]),
  stock_levels: new Set([
    'id', 'org_id', 'warehouse_id', 'product_id', 'quantity',
    'reserved_quantity', 'available_quantity', 'updated_at',
  ]),
  inventory_transactions: new Set([
    'id', 'org_id', 'warehouse_id', 'product_id', 'batch_id', 'transaction_type',
    'reference_type', 'reference_id', 'quantity', 'unit_id', 'unit_conversion_factor',
    'base_quantity', 'unit_cost', 'total_cost', 'balance_after', 'notes',
    'created_by', 'created_at',
    'product_name', 'unit_name', 'level_quantity', 'batch_number', 'expiry_date',
    'prev_quantity', 'new_quantity', 'reference_number',
  ]),
  stock_transfers: new Set([
    'id', 'org_id', 'transfer_no', 'from_warehouse_id', 'to_warehouse_id',
    'from_branch_id', 'to_branch_id', 'status', 'notes', 'created_by',
    'created_at', 'updated_at', 'completed_at', 'items_count',
  ]),
  stock_transfer_items: new Set([
    'id', 'org_id', 'transfer_id', 'product_id', 'batch_id', 'unit_id',
    'conversion_factor', 'quantity', 'base_quantity', 'unit_cost', 'total_cost',
    'created_at',
  ]),
  contacts: new Set([
    'id', 'org_id', 'name', 'type', 'code', 'phone', 'mobile', 'email',
    'tax_number', 'address', 'credit_limit', 'current_balance', 'is_active',
    'notes', 'created_at', 'updated_at',
  ]),
  contact_transactions: new Set([
    'id', 'org_id', 'contact_id', 'reference_type', 'reference_id', 'debit',
    'credit', 'balance_after', 'notes', 'created_at',
  ]),
  treasuries: new Set([
    'id', 'org_id', 'branch_id', 'name', 'account_code', 'type', 'current_balance',
    'is_default', 'is_active', 'created_at', 'updated_at',
  ]),
  expense_categories: new Set(['id', 'org_id', 'name', 'code', 'is_active', 'created_at', 'updated_at']),
  expenses: new Set([
    'id', 'org_id', 'category_id', 'treasury_id', 'shift_id', 'amount',
    'description', 'receipt_number', 'is_deleted', 'deleted_at', 'created_by',
    'created_at',
  ]),
  financial_vouchers: new Set([
    'id', 'org_id', 'voucher_no', 'type', 'treasury_id', 'contact_id', 'shift_id',
    'amount', 'description', 'reference_no', 'is_reversed', 'reversal_reason',
    'reversed_voucher_id', 'created_by', 'created_at',
  ]),
  cashier_shifts: new Set([
    'id', 'org_id', 'branch_id', 'user_id', 'treasury_id', 'shift_number',
    'opened_at', 'closed_at', 'closed_by_user_id', 'opening_balance',
    'total_sales_cash', 'total_sales_card', 'total_sales_credit',
    'total_returns_cash', 'total_expenses', 'expected_closing_balance',
    'actual_closing_balance', 'actual_card_balance', 'destination_treasury_id',
    'difference', 'status', 'notes',
  ]),
  sales_invoices: new Set([
    'id', 'org_id', 'branch_id', 'warehouse_id', 'shift_id', 'invoice_number',
    'invoice_date', 'customer_id', 'subtotal', 'discount_amount', 'discount_percent',
    'tax_amount', 'shipping_fee', 'total', 'paid_amount', 'remaining_amount', 'payment_type',
    'cash_amount', 'card_amount', 'treasury_id', 'status', 'notes', 'is_deleted',
    'deleted_at', 'deleted_by', 'delete_reason', 'created_by', 'created_at', 'updated_at',
  ]),
  sales_invoice_items: new Set([
    'id', 'invoice_id', 'product_id', 'batch_id', 'unit_id', 'conversion_factor',
    'quantity', 'base_quantity', 'unit_price', 'unit_cost', 'discount_amount',
    'tax_rate', 'tax_amount', 'total', 'notes',
  ]),
  sales_returns: new Set([
    'id', 'org_id', 'branch_id', 'warehouse_id', 'original_invoice_id', 'shift_id',
    'return_number', 'return_date', 'customer_id', 'total', 'refunded_amount',
    'discount_amount', 'tax_amount', 'treasury_id', 'reason', 'created_by', 'created_at',
  ]),
  purchase_invoices: new Set([
    'id', 'org_id', 'branch_id', 'warehouse_id', 'supplier_id', 'invoice_number',
    'system_invoice_number', 'invoice_date', 'subtotal', 'discount_amount',
    'discount_percent', 'tax_amount', 'total', 'paid_amount', 'remaining_amount', 'payment_type',
    'treasury_id', 'status', 'notes', 'is_deleted', 'deleted_at', 'deleted_by',
    'delete_reason', 'created_by', 'created_at', 'updated_at',
  ]),
  purchase_invoice_items: new Set([
    'id', 'invoice_id', 'product_id', 'batch_number', 'expiry_date', 'unit_id',
    'conversion_factor', 'quantity', 'base_quantity', 'unit_cost', 'sale_price',
    'tax_rate', 'tax_amount', 'total',
  ]),
  purchase_returns: new Set([
    'id', 'org_id', 'branch_id', 'warehouse_id', 'original_invoice_id',
    'supplier_id', 'return_number', 'return_date', 'total', 'refunded_amount',
    'discount_amount', 'tax_amount', 'treasury_id', 'reason', 'created_by', 'created_at',
  ]),
  stocktake_sessions: new Set([
    'id', 'org_id', 'branch_id', 'warehouse_id', 'session_number', 'status',
    'notes', 'total_difference_value', 'created_by', 'created_at', 'completed_at',
  ]),
  stocktake_items: new Set([
    'id', 'session_id', 'product_id', 'batch_id', 'expected_quantity',
    'actual_quantity', 'difference_quantity', 'unit_cost', 'difference_value',
  ]),
  departments: new Set([
    'id', 'org_id', 'parent_id', 'manager_id', 'code', 'name', 'description',
    'is_active', 'created_at', 'updated_at',
  ]),
  employee_attendance: new Set([
    'id', 'org_id', 'branch_id', 'employee_id', 'date', 'check_in', 'check_out',
    'work_hours', 'status', 'notes', 'created_at', 'updated_at',
  ]),
  employee_leaves: new Set([
    'id', 'org_id', 'branch_id', 'employee_id', 'leave_type', 'start_date',
    'end_date', 'days_count', 'reason', 'status', 'approved_by',
    'rejection_reason', 'created_at', 'updated_at',
  ]),
  salary_statements: new Set([
    'id', 'org_id', 'branch_id', 'employee_id', 'month', 'basic_salary',
    'allowances', 'bonus', 'overtime', 'deductions', 'loan_deduction',
    'net_salary', 'notes', 'status', 'paid_at', 'treasury_id',
    'payment_voucher_id', 'created_by', 'created_at', 'updated_at',
  ]),
  employee_advances: new Set([
    'id', 'org_id', 'branch_id', 'employee_id', 'adjustment_type', 'amount',
    'reason', 'status', 'approved_by', 'salary_statement_id', 'created_by',
    'created_at', 'updated_at',
  ]),
  employee_documents: new Set([
    'id', 'org_id', 'employee_id', 'title', 'document_type', 'file_url',
    'file_type', 'notes', 'created_by', 'created_at', 'updated_at',
  ]),
  accounts: new Set([
    'id', 'org_id', 'parent_id', 'code', 'name', 'name_en', 'type',
    'account_type', 'current_balance', 'is_active', 'system_flag',
    'created_at', 'updated_at',
  ]),
  journal_entries: new Set([
    'id', 'org_id', 'branch_id', 'entry_no', 'entry_date', 'type', 'description',
    'reference_type', 'reference_id', 'total_amount', 'is_reversed', 'created_by',
    'created_at',
  ]),
  journal_entry_lines: new Set([
    'id', 'entry_id', 'account_id', 'debit', 'credit', 'description',
  ]),
  activity_logs: new Set([
    'id', 'org_id', 'user_id', 'user_name', 'action', 'entity_type',
    'entity_id', 'details', 'ip_address', 'created_at',
  ]),
};

/**
 * تنقية وتجهيز البيانات المتزامنة مع جداول Supabase السحابية
 * يمنع أخطاء PostgREST (PGRST204) مع حفظ الخصائص الموسعة في حقل description
 */
export function sanitizePayloadForCloud(table: string, payload: Record<string, unknown>): Record<string, unknown> {
  const clean = { ...payload };
  delete clean.sync_status;

  // تنقية حقول UUID لتجنب أخطاء PostgREST مثل ("all" or "none" or "")
  const isValidUuid = (v: unknown): boolean =>
    typeof v === 'string' && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(v);

  const uuidFields = [
    'category_id',
    'brand_id',
    'base_unit_id',
    'parent_id',
    'warehouse_id',
    'branch_id',
    'customer_id',
    'supplier_id',
    'treasury_id',
    'user_id',
    'created_by',
    'shift_id',
    'unit_id',
    'product_id',
    'batch_id',
    'account_id',
  ];

  for (const field of uuidFields) {
    if (clean[field] !== undefined && clean[field] !== null && !isValidUuid(clean[field])) {
      clean[field] = null;
    }
  }

  // حالات خاصة قبل القائمة العامة
  if (table === 'products') {
    const extendedMeta: Record<string, unknown> = {};
    const extendedKeys = [
      'measurement_type',
      'name_en',
      'scientific_name',
      'shelf_location',
      'alternate_barcodes',
      'scale_code',
      'has_levels',
      'old_sale_price',
      'has_dual_pricing',
      'is_taxable',
      'is_quick_pos',
      'notes',
      'product_type',
      'raw_purchase_price',
      'purchase_discount_value',
      'purchase_discount_type',
    ];

    for (const key of extendedKeys) {
      if (clean[key] !== undefined) {
        extendedMeta[key] = clean[key];
        delete clean[key];
      }
    }

    if (Object.keys(extendedMeta).length > 0) {
      const existingDesc = typeof clean.description === 'string' ? clean.description : '';
      clean.description = JSON.stringify({
        _falcon_meta: true,
        desc: existingDesc,
        ...extendedMeta,
      });
    }
  }

  // طرد الحقول غير المسموح بها من الحمولة
  const allowedColumns = CLOUD_COLUMN_MAP[table];
  if (allowedColumns) {
    for (const k of Object.keys(clean)) {
      if (!allowedColumns.has(k)) {
        delete clean[k];
      }
    }
  } else {
    // جداول بمعالجة خاصة في processSyncItem (product_types ...) تُرفع كما هي منقّاة
    delete clean.created_at;
    delete clean.updated_at;
  }

  return clean;
}

/**
 * فك تشفير الخصائص الموسعة عند القراءة من Supabase
 */
export function unpackCloudProduct(cloudProduct: Record<string, unknown>): Record<string, unknown> {
  const result = { ...cloudProduct };
  if (typeof result.description === 'string' && result.description.startsWith('{"_falcon_meta":true')) {
    try {
      const parsed = JSON.parse(result.description);
      result.description = parsed.desc || '';
      for (const [k, v] of Object.entries(parsed)) {
        if (k !== '_falcon_meta' && k !== 'desc') {
          result[k] = v;
        }
      }
    } catch {
      // الاحتفاظ بالنص كما هو في حال تعذر التحليل
    }
  }
  return result;
}

/**
 * 🦅 Falcon ERP - Hybrid Sync Coordinator
 * منسق المزامنة الهجين الفوري بين قاعدة البيانات المحلية Dexie و Supabase Cloud.
 */
export class SyncCoordinator {
  private static instance: SyncCoordinator;
  private isSyncing = false;
  private syncIntervalId: ReturnType<typeof setInterval> | null = null;

  private constructor() {
    // مراقبة عودة الاتصال بالإنترنت
    networkListener.subscribe((isOnline) => {
      if (isOnline) {
        this.triggerSync();
      }
    });

    // دورة مزامنة تلقائية احتياطية كل 20 ثانية
    if (typeof window !== 'undefined') {
      this.syncIntervalId = setInterval(() => {
        if (networkListener.getStatus()) {
          this.triggerSync();
        }
      }, 20000);
    }
  }

  public static getInstance(): SyncCoordinator {
    if (!SyncCoordinator.instance) {
      SyncCoordinator.instance = new SyncCoordinator();
    }
    return SyncCoordinator.instance;
  }

  /**
   * إطلاق المزامنة الفورية
   */
  public async triggerSync(): Promise<{ success: boolean; pushed: number; error?: string }> {
    if (this.isSyncing) {
      return { success: false, pushed: 0, error: 'Sync already in progress' };
    }

    if (!networkListener.getStatus() || !isSupabaseConfigured()) {
      return { success: false, pushed: 0, error: 'Offline or Supabase not configured' };
    }

    this.isSyncing = true;
    let pushedCount = 0;

    try {
      // Pull latest org profile & settings from cloud
      const currentAuthUser = AuthRepository.getCurrentUser();
      if (currentAuthUser?.org_id) {
        PullSyncService.pullAll(currentAuthUser.org_id).catch(() => {});
      }

      // جلب العناصر المعلقة
      const pendingItems = await SyncQueueManager.getPendingItems(50);
      if (pendingItems.length === 0) {
        return { success: true, pushed: 0 };
      }

      // ترتيب العمليات حسب الأسبقية والعلاقات الأبوية
      pendingItems.sort((a, b) => {
        const orderA = TABLE_SYNC_ORDER[a.entity_table] ?? 50;
        const orderB = TABLE_SYNC_ORDER[b.entity_table] ?? 50;
        return orderA - orderB;
      });

      for (const item of pendingItems) {
        const success = await this.processSyncItem(item);
        if (success) {
          pushedCount++;
        } else {
          // لا نتوقف عن عنصر فاشل فردي (منع حجب الطابور)، نكمّل بقية العناصر
          // ويُعاد محاولة الفاشل في الدورات القادمة حتى حد retry_count الأقصى.
          continue;
        }
      }

      return { success: true, pushed: pushedCount };
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Unknown sync error';
      return { success: false, pushed: pushedCount, error: msg };
    } finally {
      this.isSyncing = false;
    }
  }

  /**
   * التأكد من وجود السجلات الأبوية في السحابة قبل رفع السجلات التابعة
   */
  private async ensureParentRefs(table: string, payload: Record<string, unknown>): Promise<void> {
    const safeGetAndUpsert = async (parentTable: string, parentId: unknown): Promise<void> => {
      if (!parentId || typeof parentId !== 'string' || parentId === 'none' || parentId === 'all' || parentId === 'null') {
        return;
      }
      try {
        const localTable = (db as unknown as Record<string, { get: (id: string) => Promise<object | undefined> }>)[parentTable];
        if (!localTable) return;
        const localParent = await localTable.get(parentId);
        if (!localParent) return;

        const clean = sanitizePayloadForCloud(parentTable, localParent as Record<string, unknown>);
        const { error } = await supabase.from(parentTable).upsert(clean, { onConflict: 'id' });
        if (error) {
          console.warn(`[Sync] Parent ensure failed ${parentTable}(${parentId}):`, error.message);
        }
      } catch (e) {
        console.warn(`[Sync] Parent lookup notice ${parentTable}(${parentId}):`, e);
      }
    };

    if (table === 'products') {
      await safeGetAndUpsert('units', payload.base_unit_id);
      await safeGetAndUpsert('product_categories', payload.category_id);
      await safeGetAndUpsert('product_brands', payload.brand_id);
    } else if (table === 'product_units') {
      await safeGetAndUpsert('units', payload.unit_id);
    } else if (table === 'product_batches' || table === 'stock_levels' || table === 'inventory_transactions') {
      await safeGetAndUpsert('warehouses', payload.warehouse_id);
      if (table === 'inventory_transactions') {
        await safeGetAndUpsert('products', payload.product_id);
      }
    } else if (table === 'stock_transfer_items') {
      await safeGetAndUpsert('stock_transfers', payload.transfer_id);
      await safeGetAndUpsert('products', payload.product_id);
    } else if (table === 'stocktake_items') {
      await safeGetAndUpsert('stocktake_sessions', payload.session_id);
      await safeGetAndUpsert('products', payload.product_id);
    } else if (table === 'sales_invoice_items') {
      await safeGetAndUpsert('sales_invoices', payload.invoice_id);
    } else if (table === 'purchase_invoice_items') {
      await safeGetAndUpsert('purchase_invoices', payload.invoice_id);
    } else if (table === 'expenses' || table === 'financial_vouchers' || table === 'cashier_shifts' || table === 'sales_invoices' || table === 'purchase_invoices' || table === 'sales_returns') {
      await safeGetAndUpsert('treasuries', payload.treasury_id);
    } else if (table === 'contact_transactions') {
      await safeGetAndUpsert('contacts', payload.contact_id);
    } else if (table === 'journal_entry_lines') {
      await safeGetAndUpsert('journal_entries', payload.entry_id);
      await safeGetAndUpsert('accounts', payload.account_id);
    } else if (table === 'salary_statements' || table === 'employee_advances' || table === 'employee_documents') {
      await safeGetAndUpsert('users', payload.employee_id);
    }
  }

  /**
   * معالجة عنصر مزامنة واحد ودفع التغيير إلى Supabase
   */
  private async processSyncItem(item: SyncQueueItem): Promise<boolean> {
    try {
      await SyncQueueManager.markInFlight(item.id);
      const rawPayload = JSON.parse(item.payload) as Record<string, unknown>;

      // معالجة خاصة لجدول أنواع المنتجات (تخزينها سحابياً في إعدادات المؤسسة app_settings)
      if (item.entity_table === 'product_types') {
        const orgId = (rawPayload.org_id as string) || '';
        if (orgId) {
          const allTypes = await db.product_types.where('org_id').equals(orgId).toArray();
          const cleanTypes = allTypes.map((t) => ({ id: t.id, org_id: t.org_id, name: t.name, code: t.code, is_active: t.is_active }));
          const { error: settingsErr } = await supabase.from('app_settings').upsert({
            id: 'custom_product_types',
            org_id: orgId,
            value: JSON.stringify(cleanTypes),
            description: 'Custom Product Types List',
            updated_at: new Date().toISOString(),
          }, { onConflict: 'id,org_id' });

          if (settingsErr) {
            console.warn('[Sync] Error syncing product_types to app_settings:', settingsErr.message);
            await SyncQueueManager.markFailed(item.id, settingsErr.message);
            return false;
          }
        }
        await SyncQueueManager.markSynced(item.id);
        return true;
      }

      // التحقق من وجود السجلات الأبوية أولاً (علاقات Foreign Keys)
      await this.ensureParentRefs(item.entity_table, rawPayload);

      // تنقية البيانات لتطابق جداول Supabase 100%
      const payload = sanitizePayloadForCloud(item.entity_table, rawPayload);

      // حقن org_id لبنود التحويلات المخزنية (غير مخزنة محلياً)
      if (item.entity_table === 'stock_transfer_items' && !payload.org_id) {
        const transfer = payload.transfer_id ? await db.stock_transfers.get(payload.transfer_id as string) : undefined;
        if (transfer) {
          payload.org_id = transfer.org_id;
        }
      }

      let error: { message: string } | null = null;

      switch (item.operation) {
        case 'insert':
        case 'upsert': {
          const conflictColumns = item.entity_table === 'app_settings' ? 'id,org_id' : 'id';
          const { error: err } = await supabase
            .from(item.entity_table)
            .upsert(payload, { onConflict: conflictColumns });
          error = err;
          break;
        }

        case 'update': {
          const { error: err } = await supabase
            .from(item.entity_table)
            .update(payload)
            .eq('id', item.entity_id);
          error = err;
          break;
        }

        case 'delete': {
          const { error: err } = await supabase
            .from(item.entity_table)
            .delete()
            .eq('id', item.entity_id);
          error = err;
          break;
        }
      }

      if (error) {
        console.warn(`[Sync] Error syncing ${item.entity_table} (${item.entity_id}):`, error.message);
        await SyncQueueManager.markFailed(item.id, error.message);
        return false;
      }

      // تعليم العنصر كمكتمل في طابور المزامنة
      await SyncQueueManager.markSynced(item.id);

      // تحديث حالة السجل محلياً إلى synced
      try {
        const table = (db as unknown as Record<string, { update: (id: string, updates: Record<string, unknown>) => Promise<unknown> }>)[item.entity_table];
        if (table && item.operation !== 'delete') {
          await table.update(item.entity_id, { sync_status: 'synced' });
        }
      } catch {
        // تجاهل أي خطأ محلي ثانوي
      }

      return true;
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Exception during item sync';
      console.error(`[Sync] Exception syncing ${item.entity_table}:`, msg);
      await SyncQueueManager.markFailed(item.id, msg);
      return false;
    }
  }

  public getIsSyncing(): boolean {
    return this.isSyncing;
  }
}

export const syncCoordinator = SyncCoordinator.getInstance();