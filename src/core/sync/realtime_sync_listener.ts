import { db } from'@/core/db/app_database';
import { supabase, isSupabaseConfigured } from'@/core/supabase/supabase_client';
import { unpackCloudProduct } from'./sync_coordinator';
import { notifyCloudDataChanged } from'./sync_events';
import type { RealtimeChannel } from'@supabase/supabase-js';

/**
 * 🦅 Falcon ERP - Realtime Sync Listener (Supabase Realtime)
 * يستمع للتغييرات اللحظية من Supabase ويحدث قاعدة البيانات المحلية Dexie فورياً
 * تنبيه: ممنوع UPSERT على Views (الالتزام ببروتوكول Falcon)
 */
export class RealtimeSyncListener {
 private static instance: RealtimeSyncListener;
 private channel: RealtimeChannel | null = null;
 private isSubscribed = false;
 private isStarting = false;
 private currentOrgId: string | null = null;

 private constructor() {}

 public static getInstance(): RealtimeSyncListener {
 if (!RealtimeSyncListener.instance) {
 RealtimeSyncListener.instance = new RealtimeSyncListener();
 }
 return RealtimeSyncListener.instance;
 }

 /**
 * بدء الاستماع اللحظي لتغييرات الأصناف والمخزون
 */
 public start(orgId: string): void {
 if (!isSupabaseConfigured() || !orgId) {
 return;
 }
 if (this.currentOrgId === orgId && (this.isSubscribed || this.isStarting || this.channel)) {
 return;
 }
 this.stop();
 this.currentOrgId = orgId;
 this.isStarting = true;

 const tablesToListen = [
'organizations',
'branches',
'departments',
'users',
'app_settings',
'warehouses',
'treasuries',
'units',
'product_categories',
'product_brands',
'products',
'product_units',
'product_batches',
'stock_levels',
'inventory_transactions',
'stock_transfers',
'stock_transfer_items',
'contacts',
'contact_transactions',
'expense_categories',
'expenses',
'financial_vouchers',
'accounts',
'journal_entries',
'journal_entry_lines',
'cashier_shifts',
'sales_invoices',
'sales_invoice_items',
'sales_returns',
'purchase_invoices',
'purchase_invoice_items',
'purchase_returns',
'stocktake_sessions',
'stocktake_items',
'employee_attendance',
'salary_statements',
'employee_leaves',
'employee_advances',
'employee_documents',
'activity_logs',
 ];

 let channel = supabase.channel(`falcon-inventory-realtime-${orgId}`);

 for (const tableName of tablesToListen) {
 channel = channel.on(
'postgres_changes',
 {
 event:'*',
 schema:'public',
 table: tableName,
 },
 async (payload) => {
 await this.handleRealtimeEvent(tableName, payload, orgId);
 }
 );
 }

 channel.subscribe((status) => {
 this.isStarting = false;
 if (status ==='SUBSCRIBED') {
 this.isSubscribed = true;
 }
 });

 this.channel = channel;
 }

 /**
 * معالجة الحدث اللحظي وتحديث Dexie محلياً
 */
 private async handleRealtimeEvent(
 tableName: string,
 payload: { eventType: string; new: Record<string, unknown>; old: Record<string, unknown> },
 orgId: string
 ): Promise<void> {
 try {
 const { eventType, new: newRecord, old: oldRecord } = payload;
 const localTable = (db as unknown as Record<string, {
 put: (rec: unknown) => Promise<unknown>;
 delete: (id: unknown) => Promise<unknown>;
 get: (id: unknown) => Promise<unknown>;
 }>)[tableName];

 if (!localTable) return;

 if (eventType ==='DELETE') {
 const idToDelete = oldRecord?.id;
 if (idToDelete) {
 await localTable.delete(idToDelete);
 notifyCloudDataChanged();
 }
 return;
 }

 if (eventType ==='INSERT'|| eventType ==='UPDATE') {
 // التحقق من تبعية السجل للمؤسسة الحالية إن وجد حقل org_id
 if (newRecord.org_id && newRecord.org_id !== orgId) {
 return;
 }

 // حارس الدمج: لا نستبدل سجلاً محلياً عليه تغيير غير مُزامن (pending/in_flight/failed)
 const existingLocal = await localTable.get(newRecord.id);
 const localStatus = (existingLocal as { sync_status?: string } | undefined)?.sync_status;
 if (
 localStatus &&
 (localStatus ==='pending'|| localStatus ==='in_flight'|| localStatus ==='failed')
 ) {
 return;
 }

 let recordToStore = { ...newRecord, sync_status:'synced'};

 // فك تشفير الخصائص الموسعة للأصناف
 if (tableName ==='products') {
 recordToStore = unpackCloudProduct(recordToStore) as typeof recordToStore;
 }

 // تحديث محلي مباشر بدون إدخال في طابور المزامنة لتفادي التكرار اللانهائي
 await localTable.put(recordToStore);
 notifyCloudDataChanged();

 // إذا كان الحدث في إعدادات المؤسسة ويخص أنواع المنتجات، نحدث جدول product_types محلياً
 if (tableName ==='app_settings'&& newRecord.id ==='custom_product_types'&& typeof newRecord.value ==='string') {
 try {
 const types = JSON.parse(newRecord.value);
 if (Array.isArray(types)) {
 await db.product_types.bulkPut(types.map((t) => ({ ...t, sync_status:'synced'})));
 }
 } catch (e) {
 console.warn('[RealtimeSyncListener] Error parsing realtime custom_product_types:', e);
 }
 }
 }
 } catch (err) {
 console.error(`[RealtimeSyncListener] Error handling event on ${tableName}:`, err);
 }
 }

 /**
 * إيقاف الاستماع
 */
 public stop(): void {
 if (this.channel) {
 supabase.removeChannel(this.channel).catch(console.error);
 this.channel = null;
 }
 this.isSubscribed = false;
 this.isStarting = false;
 this.currentOrgId = null;
 }
}

export const realtimeSyncListener = RealtimeSyncListener.getInstance();