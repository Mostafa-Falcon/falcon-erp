/**
 * 🦅 LOGIXA FALCON ERP - PURCHASES & SUPPLIERS TYPES
 */

import type { EntityId, ISODateString } from './common';
import type { InvoicePaymentType, InvoiceStatus } from './sales';

export interface PurchaseInvoice {
  id: EntityId;
  org_id: EntityId;
  branch_id: EntityId;
  warehouse_id: EntityId;
  supplier_id: EntityId;
  invoice_number: string; // Supplier's invoice number
  system_invoice_number: string;
  invoice_date: ISODateString;
  
  subtotal: number;
  discount_amount: number;
  discount_percent?: number;
  tax_amount: number;
  total: number;
  paid_amount: number;
  remaining_amount: number;
  
  payment_type: InvoicePaymentType;
  treasury_id?: EntityId | null;
  status: InvoiceStatus;
  notes?: string;
  is_deleted?: boolean;
  deleted_at?: ISODateString | null;
  deleted_by?: EntityId | null;
  delete_reason?: string | null;
  created_by: EntityId;
  created_at: ISODateString;
  updated_at: ISODateString;
  sync_status?: 'synced' | 'pending' | 'failed';
}

export interface PurchaseInvoiceItem {
  id: EntityId;
  invoice_id: EntityId;
  product_id: EntityId;
  batch_number?: string;
  expiry_date?: ISODateString | null;
  unit_id: EntityId;
  conversion_factor: number;
  quantity: number;
  base_quantity: number;
  unit_cost: number;
  sale_price?: number;
  tax_rate: number;
  tax_amount: number;
  total: number;
}

export interface PurchaseReturn {
  id: EntityId;
  org_id: EntityId;
  branch_id: EntityId;
  warehouse_id: EntityId;
  original_invoice_id?: EntityId | null;
  supplier_id: EntityId;
  return_number: string;
  return_date: ISODateString;
  total: number;
  refunded_amount: number;
  discount_amount?: number;
  tax_amount?: number;
  treasury_id?: EntityId | null;
  reason?: string;
  created_by: EntityId;
  created_at: ISODateString;
  sync_status?: 'synced' | 'pending' | 'failed';
}
