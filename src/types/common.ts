/**
 * 🦅 LOGIXA FALCON ERP - COMMON & SYSTEM TYPES
 */

export type EntityId = string;
export type ISODateString = string;

// ==========================================
// ORGANIZATIONAL & SYSTEM
// ==========================================

export type SubscriptionTier = 'standard' | 'vip_bronze' | 'vip_silver' | 'vip_gold';

export interface Organization {
  id: EntityId;
  name: string;
  legal_name?: string;
  activity_type?: string;
  subscription_tier?: SubscriptionTier | string; // 'standard' | 'vip_bronze' | 'vip_silver' | 'vip_gold'
  subscription_expires_at?: ISODateString | null;
  tax_number?: string;
  commercial_reg_no?: string;
  currency: string; // e.g. EGP, SAR, USD
  phone?: string;
  email?: string;
  address?: string;
  logo_url?: string;
  transport_token?: string;
  created_at: ISODateString;
  updated_at: ISODateString;
  is_active: boolean;
  sync_status?: 'synced' | 'pending' | 'failed';
}

export interface Branch {
  id: EntityId;
  org_id: EntityId;
  code: string;
  name: string;
  phone?: string;
  address?: string;
  is_main: boolean;
  is_active: boolean;
  created_at: ISODateString;
  updated_at: ISODateString;
  sync_status?: 'synced' | 'pending' | 'failed';
}

export type UserRole = 'owner' | 'super_admin' | 'admin' | 'manager' | 'cashier' | 'accountant' | 'warehouse_keeper' | 'supervisor' | 'delivery';

export interface User {
  id: EntityId;
  org_id: EntityId;
  branch_id?: EntityId;
  username: string;
  full_name: string;
  email?: string;
  phone?: string;
  role: UserRole;
  pin_code_hash?: string; // For rapid cashier shift switch offline

  // HR Profile
  department_id?: EntityId | null;
  job_title?: string;
  hire_date?: string; // YYYY-MM-DD
  annual_leave_days?: number; // Yearly annual-leave entitlement (default 21)

  // Payroll & Permissions
  basic_salary?: number;
  salary_cycle?: 'monthly' | 'weekly' | 'daily' | 'hourly';
  deductions?: number;
  allowances?: number;

  permissions?: string[]; // Array of module access keys

  is_active: boolean;
  created_at: ISODateString;
  updated_at: ISODateString;
  sync_status?: 'synced' | 'pending' | 'failed';
}

export interface AppSetting {
  id: EntityId; // key, e.g. "vat_rate", "allow_negative_stock"
  org_id: EntityId;
  value: string; // JSON stringified or raw string
  description?: string;
  updated_at: ISODateString;
  sync_status?: 'synced' | 'pending' | 'failed';
}

// ==========================================
// OFFLINE-FIRST SYNC QUEUE (OUTBOX PATTERN)
// ==========================================

export type SyncOperation = 'insert' | 'update' | 'delete' | 'upsert' | 'delta';
export type SyncStatus = 'pending' | 'in_flight' | 'synced' | 'failed' | 'conflict';

export interface SyncQueueItem {
  id: EntityId;
  entity_table: string; // e.g. "products", "sales_invoices"
  entity_id: EntityId;
  operation: SyncOperation;
  payload: string; // JSON stringified data
  status: SyncStatus;
  retry_count: number;
  last_error?: string | null;
  created_at: ISODateString;
  updated_at: ISODateString;
}

export interface ActivityLog {
  id: EntityId;
  org_id: EntityId;
  user_id?: EntityId | null;
  user_name?: string;
  action: string;
  entity_type: string;
  entity_id?: string;
  details?: string;
  ip_address?: string;
  created_at: ISODateString;
  sync_status?: 'synced' | 'pending' | 'failed';
}
