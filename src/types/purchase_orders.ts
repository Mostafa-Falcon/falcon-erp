/**
 * 🦅 LOGIXA FALCON ERP - PURCHASE ORDERS TYPES
 */

import type { EntityId, ISODateString } from'./common';

export type PurchaseOrderStatus ='draft'|'sent'|'partially_received'|'received'|'cancelled';

export interface PurchaseOrder {
 id: EntityId;
 org_id: EntityId;
 branch_id: EntityId;
 warehouse_id: EntityId;
 supplier_id: EntityId;
 supplier_name?: string;
 po_number: string;
 order_date: ISODateString;
 expected_delivery_date?: ISODateString;
 status: PurchaseOrderStatus;
 subtotal: number;
 discount_amount: number;
 tax_amount: number;
 total: number;
 notes?: string;
 created_by: EntityId;
 created_at: ISODateString;
 updated_at: ISODateString;
 sync_status?:'synced'|'pending'|'failed';
}

export interface PurchaseOrderItem {
 id: EntityId;
 po_id: EntityId;
 product_id: EntityId;
 product_name: string;
 unit_id: EntityId;
 quantity: number;
 received_quantity: number;
 unit_cost: number;
 tax_rate: number;
 tax_amount: number;
 total: number;
 notes?: string;
}