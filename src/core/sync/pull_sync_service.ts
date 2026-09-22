import { db } from '@/core/db/app_database';
import { supabase, isSupabaseConfigured } from '@/core/supabase/supabase_client';
import { networkListener } from './network_listener';
import { unpackCloudProduct } from './sync_coordinator';
import { notifyCloudDataChanged } from './sync_events';

/**
 * 🦅 Falcon ERP - Cloud Pull Sync Service
 * Pulls new / modified records from Supabase into local Dexie.js with delta timestamp filtering.
 */

/**
 * جداول الرأسية التي تملك org_id + عمود تاريخ للمزامنة التفاضلية.
 * القيمة هي اسم عمود التاريخ (بالنسبة لعملية التحديث).
 */
const PARENT_TABLES: Record<string, string> = {
  organizations: 'updated_at',
  branches: 'updated_at',
  departments: 'updated_at',
  users: 'updated_at',
  app_settings: 'updated_at',
  warehouses: 'updated_at',
  treasuries: 'updated_at',
  units: 'updated_at',
  product_categories: 'updated_at',
  product_brands: 'updated_at',
  products: 'updated_at',
  product_batches: 'updated_at',
  stock_levels: 'updated_at',
  inventory_transactions: 'created_at',
  stock_transfers: 'updated_at',
  contacts: 'updated_at',
  contact_transactions: 'created_at',
  expense_categories: 'updated_at',
  expenses: 'created_at',
  financial_vouchers: 'created_at',
  accounts: 'updated_at',
  journal_entries: 'created_at',
  cashier_shifts: 'opened_at',
  sales_invoices: 'updated_at',
  sales_returns: 'created_at',
  purchase_invoices: 'updated_at',
  purchase_returns: 'created_at',
  stocktake_sessions: 'created_at',
  employee_attendance: 'updated_at',
  salary_statements: 'updated_at',
  employee_leaves: 'updated_at',
  employee_advances: 'updated_at',
  employee_documents: 'updated_at',
  activity_logs: 'created_at',
};

/**
 * جداول صغيرة تُسحب بالكامل كل دورة لأن خرزة التفاضل لا تلتقط كل التحديثات
 * (مثال: cashier_shifts تتحدث عبر closed_at وليس opened_at).
 * القيمة هي عمود الترتيب الأمن لسحب الصفحات.
 */
const FULL_REFRESH_TABLES: Record<string, string> = {
  cashier_shifts: 'opened_at',
};

/** الجداول التابعة المفتوحة الآن مع عمود المفتاح الأجنبي المؤدي لجدول الرأس */
const CHILD_TABLES: Record<string, { childTable: string; fkColumn: string }> = {
  products: { childTable: 'product_units', fkColumn: 'product_id' },
  sales_invoices: { childTable: 'sales_invoice_items', fkColumn: 'invoice_id' },
  purchase_invoices: { childTable: 'purchase_invoice_items', fkColumn: 'invoice_id' },
  stock_transfers: { childTable: 'stock_transfer_items', fkColumn: 'transfer_id' },
  stocktake_sessions: { childTable: 'stocktake_items', fkColumn: 'session_id' },
  journal_entries: { childTable: 'journal_entry_lines', fkColumn: 'entry_id' },
};

const PAGE_SIZE = 500;

/**
 * Local-only shield columns (NOT yet in the remote Supabase schema).
 *
 * These carry owner-entered level names and per-level quantities plus
 * denormalized display snapshots (مستوردة من منهجية pharmacy_system):
 *  - product_units:        unit_name / level_order / available_quantity
 *  - product_batches:      unit_id / unit_name / level_quantity
 *  - inventory_transactions: product_name / unit_name / level_quantity /
 *                           batch_number / expiry_date / prev_quantity /
 *                           new_quantity / reference_number
 *
 * These fields ARE now also hosted in the remote schema (migration 12); during
 * a cloud pull they are still PRESERVED here when the fetched record does not
 * carry them, so offline display snapshots survive re-pulls of legacy rows and
 * the local value is never wiped by an older cloud record.
 */
const SHIELD_COLUMNS: Record<string, readonly string[]> = {
  product_units: ['unit_name', 'level_order', 'available_quantity'],
  product_batches: ['unit_id', 'unit_name', 'level_quantity'],
  inventory_transactions: [
    'product_name',
    'unit_name',
    'level_quantity',
    'batch_number',
    'expiry_date',
    'prev_quantity',
    'new_quantity',
    'reference_number',
  ],
};

export class PullSyncService {
  public static async pullAll(orgId: string): Promise<Record<string, number>> {
    if (!networkListener.getStatus() || !isSupabaseConfigured()) {
      return {};
    }

    const results: Record<string, number> = {};
    const pulledParentIds: Record<string, string[]> = {};

    for (const [tableName, deltaColumn] of Object.entries(PARENT_TABLES)) {
      if (FULL_REFRESH_TABLES[tableName]) continue;
      try {
        const { count, ids } = await this.pullTable(tableName, orgId, deltaColumn);
        results[tableName] = count;
        if (ids.length > 0) {
          pulledParentIds[tableName] = ids;
        }
      } catch (e) {
        console.error(`Error pulling table ${tableName}:`, e);
      }
    }

    // سحب الجداول صغيرة الحجم بالكامل (لا خرزة تفاضلية)
    for (const [tableName, orderColumn] of Object.entries(FULL_REFRESH_TABLES)) {
      try {
        results[tableName] = await this.pullFull(tableName, orgId, orderColumn);
      } catch (e) {
        console.error(`Error pulling full table ${tableName}:`, e);
      }
    }

    // سحب الجداول التابعة المرتبطة بالسجلات الرأسية المحدثة هذا الدور
    for (const [parentTable, childConfig] of Object.entries(CHILD_TABLES)) {
      const parentIds = pulledParentIds[parentTable];
      if (!parentIds || parentIds.length === 0) continue;
      try {
        const count = await this.pullChildren(childConfig.childTable, childConfig.fkColumn, parentIds);
        results[childConfig.childTable] = count;
      } catch (e) {
        console.error(`Error pulling children for ${childConfig.childTable}:`, e);
      }
    }

    return results;
  }

  private static async pullTable(
    tableName: string,
    orgId: string,
    deltaColumn: string
  ): Promise<{ count: number; ids: string[] }> {
    const localTable = (db as unknown as Record<string, { bulkGet: (keys: string[]) => Promise<unknown[]>; bulkPut: (records: unknown[]) => Promise<unknown> }>)[tableName];
    if (!localTable) {
      return { count: 0, ids: [] };
    }

    const localSettingKey = `last_pull_${tableName}_${orgId}`;
    const migrationKey = `pull_engine_v2_reset_${tableName}_${orgId}`;
    const migrationDone = await db.app_settings.get(migrationKey);

    let lastPullTimestamp = '1970-01-01T00:00:00.000Z';
    if (!migrationDone && (tableName === 'products' || CHILD_TABLES[tableName])) {
      await db.app_settings.delete(localSettingKey);
      await db.app_settings.put({
        id: migrationKey,
        org_id: orgId,
        value: 'true',
        updated_at: new Date().toISOString(),
        sync_status: 'synced',
      });
    } else {
      const lastPullSetting = await db.app_settings.get(localSettingKey);
      lastPullTimestamp = lastPullSetting?.value || '1970-01-01T00:00:00.000Z';
    }

    const collected: Record<string, unknown>[] = [];
    let newestDate: string | null = null;
    let from = 0;

    for (;;) {
      let query = supabase
        .from(tableName)
        .select('*')
        .eq(tableName === 'organizations' ? 'id' : 'org_id', orgId);

      if (tableName !== 'organizations') {
        query = query.gt(deltaColumn, lastPullTimestamp);
      }

      const { data, error } = await query
        .order(deltaColumn, { ascending: true })
        .order('id', { ascending: true })
        .range(from, from + PAGE_SIZE - 1);
      if (error || !data || data.length === 0) {
        break;
      }
      collected.push(...data);
      newestDate = (data[data.length - 1][deltaColumn] as string) ?? newestDate;
      if (data.length < PAGE_SIZE) {
        break;
      }
      from += PAGE_SIZE;
    }

    if (collected.length === 0) {
      return { count: 0, ids: [] };
    }

    await this.mergeIntoLocal(tableName, collected);

    // إذا كانت التحديثات تخص app_settings، نفك تشفير أنواع المنتجات المخصصة إن وجدت
    if (tableName === 'app_settings') {
      const typesSetting = collected.find((d) => d.id === 'custom_product_types');
      if (typesSetting && typeof typesSetting.value === 'string' && typesSetting.value) {
        try {
          const types = JSON.parse(typesSetting.value);
          if (Array.isArray(types) && types.length > 0) {
            await db.product_types.bulkPut(
              types.map((t) => ({ ...t, sync_status: 'synced' }))
            );
          }
        } catch (e) {
          console.warn('[PullSync] Error unpacking custom_product_types:', e);
        }
      }
    }

    // Save newest delta timestamp (boundary-safe: كامل الصفحات سُحبت قبل رفع الخرزة)
    if (newestDate) {
      await db.app_settings.put({
        id: localSettingKey,
        org_id: orgId,
        value: newestDate,
        updated_at: new Date().toISOString(),
        sync_status: 'synced',
      });
    }

    return {
      count: collected.length,
      ids: collected.map((d) => d.id as string),
    };
  }

  private static async pullFull(
    tableName: string,
    orgId: string,
    orderColumn: string
  ): Promise<number> {
    const localTable = (db as unknown as Record<string, { bulkGet: (keys: string[]) => Promise<unknown[]>; bulkPut: (records: unknown[]) => Promise<unknown> }>)[tableName];
    if (!localTable) return 0;

    const collected: Record<string, unknown>[] = [];
    let from = 0;

    for (;;) {
      const query = supabase
        .from(tableName)
        .select('*')
        .eq('org_id', orgId)
        .order(orderColumn, { ascending: true })
        .range(from, from + PAGE_SIZE - 1);

      const { data, error } = await query;
      if (error || !data || data.length === 0) {
        break;
      }
      collected.push(...data);
      if (data.length < PAGE_SIZE) {
        break;
      }
      from += PAGE_SIZE;
    }

    if (collected.length === 0) {
      return 0;
    }

    await this.mergeIntoLocal(tableName, collected);
    return collected.length;
  }

/**
 * دمج السجلات السحابية مع حارس حماية:
 * لا نستبدل أي سجل محلي عليه تغيير غير مُزامن (pending/in_flight/failed).
 */
private static async mergeIntoLocal(
  tableName: string,
  records: Record<string, unknown>[]
): Promise<void> {
  const localTable = (db as unknown as Record<string, { bulkGet: (keys: string[]) => Promise<unknown[]>; bulkPut: (records: unknown[]) => Promise<unknown> }>)[tableName];
  if (!localTable) return;

  const ids = records.map((r) => r.id as string);
  const existing = await localTable.bulkGet(ids);

  // Merge the shield columns in the SAME pass as the pending-guard so the
  // local/cloud record indices stay aligned.
  const toStore = records
    .map((rec, idx) => {
      const local = existing[idx] as ({ sync_status?: string } & Record<string, unknown> | undefined) | undefined;
      if (!local) return { rec, keep: true };
      const status = local.sync_status;
      if (status === 'pending' || status === 'in_flight' || status === 'failed') {
        return { rec, keep: false };
      }
      const shield = SHIELD_COLUMNS[tableName];
      if (!shield) return { rec, keep: true };
      const merged: Record<string, unknown> = { ...rec };
      for (const col of shield) {
        if (rec[col] === undefined && local[col] !== undefined) {
          merged[col] = local[col];
        }
      }
      return { rec: merged, keep: true };
    })
    .filter((r) => r.keep)
    .map((r) => r.rec);

  if (toStore.length === 0) return;

    const recordsToStore = toStore.map((item) => ({
      ...item,
      sync_status: 'synced',
    }));

    if (tableName === 'products') {
      await localTable.bulkPut(recordsToStore.map((r) => unpackCloudProduct(r)));
    } else {
      await localTable.bulkPut(recordsToStore);
    }

    notifyCloudDataChanged();
  }

  /**
   * Resets last pull timestamp in app_settings for one table or all tables.
   */
  public static async resetLastPull(orgId: string, tableName?: string): Promise<void> {
    if (tableName) {
      const localSettingKey = `last_pull_${tableName}_${orgId}`;
      await db.app_settings.delete(localSettingKey);
    } else {
      for (const tName of Object.keys(PARENT_TABLES)) {
        const localSettingKey = `last_pull_${tName}_${orgId}`;
        await db.app_settings.delete(localSettingKey);
      }
    }
  }

  /**
   * Forces a clean full re-pull of all remote records into local Dexie IndexedDB.
   */
  public static async forcePullAll(orgId: string): Promise<Record<string, number>> {
    await this.resetLastPull(orgId);
    return await this.pullAll(orgId);
  }

  private static async pullChildren(childTable: string, fkColumn: string, parentIds: string[]): Promise<number> {
    const localTable = (db as unknown as Record<string, { bulkGet: (keys: string[]) => Promise<unknown[]>; bulkPut: (records: unknown[]) => Promise<unknown> }>)[childTable];
    if (!localTable || parentIds.length === 0) return 0;

    const FK_BATCH_SIZE = 100;
    let totalCount = 0;

    for (let i = 0; i < parentIds.length; i += FK_BATCH_SIZE) {
      const batchIds = parentIds.slice(i, i + FK_BATCH_SIZE);
      const collected: Record<string, unknown>[] = [];
      let from = 0;

      for (;;) {
        const query = supabase
          .from(childTable)
          .select('*')
          .in(fkColumn, batchIds)
          .range(from, from + PAGE_SIZE - 1);

        const { data, error } = await query;
        if (error || !data || data.length === 0) {
          break;
        }
        collected.push(...data);
        if (data.length < PAGE_SIZE) {
          break;
        }
        from += PAGE_SIZE;
      }

      if (collected.length > 0) {
        await this.mergeIntoLocal(childTable, collected);
        totalCount += collected.length;
      }
    }

    return totalCount;
  }
}