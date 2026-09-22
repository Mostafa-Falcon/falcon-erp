/**
 * 🦅 LOGIXA FALCON ERP - SALES & POS ENGINE TYPES
 */

import type { EntityId, ISODateString } from './common';

export interface CashierShift {
  id: EntityId;
  org_id: EntityId;
  branch_id: EntityId;
  user_id: EntityId;
  treasury_id: EntityId;
  shift_number: number;
  opened_at: ISODateString;
  closed_at?: ISODateString | null;
  closed_by_user_id?: EntityId | null;
  opening_balance: number;
  total_sales_cash: number;
  total_sales_card: number;
  total_sales_credit: number;
  total_returns_cash: number;
  total_expenses: number;
  expected_closing_balance: number;
  actual_closing_balance?: number | null;
  actual_card_balance?: number | null;
  destination_treasury_id?: EntityId | null;
  difference?: number | null; // deficit or surplus (عجز أو زيادة)
  status: 'open' | 'closed';
  notes?: string;
  sync_status?: 'synced' | 'pending' | 'failed';
}

export type InvoicePaymentType = 'cash' | 'card' | 'credit' | 'split';
export type InvoiceStatus = 'draft' | 'completed' | 'suspended' | 'cancelled';

export interface SalesInvoice {
  id: EntityId;
  org_id: EntityId;
  branch_id: EntityId;
  warehouse_id: EntityId;
  shift_id?: EntityId | null;
  invoice_number: string;
  invoice_date: ISODateString;
  customer_id?: EntityId | null;
  
  // Amounts
  subtotal: number;
  discount_amount: number;
  discount_percent: number;
  tax_amount: number;
  shipping_fee?: number;
  total: number;
  paid_amount: number;
  remaining_amount: number;
  
  payment_type: InvoicePaymentType;
  cash_amount: number;
  card_amount: number;
  
  treasury_id: EntityId;
  status: InvoiceStatus;
  notes?: string;
  is_deleted?: boolean;
  deleted_at?: ISODateString;
  deleted_by?: EntityId;
  delete_reason?: string;
  created_by: EntityId;
  created_at: ISODateString;
  updated_at: ISODateString;
  sync_status?: 'synced' | 'pending' | 'failed';
}

export interface SalesInvoiceItem {
  id: EntityId;
  invoice_id: EntityId;
  product_id: EntityId;
  batch_id?: EntityId | null;
  unit_id: EntityId;
  conversion_factor: number;
  quantity: number;
  base_quantity: number;
  unit_price: number;
  unit_cost: number;
  discount_amount: number;
  tax_rate: number;
  tax_amount: number;
  total: number;
  notes?: string;
}

export interface SalesReturn {
  id: EntityId;
  org_id: EntityId;
  branch_id: EntityId;
  warehouse_id: EntityId;
  original_invoice_id?: EntityId | null;
  shift_id?: EntityId | null;
  return_number: string;
  return_date: ISODateString;
  customer_id?: EntityId | null;
  total: number;
  refunded_amount: number;
  discount_amount?: number;
  tax_amount?: number;
  treasury_id: EntityId;
  reason?: string;
  created_by: EntityId;
  created_at: ISODateString;
  sync_status?: 'synced' | 'pending' | 'failed';
}
