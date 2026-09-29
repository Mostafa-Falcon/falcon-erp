/**
 * 🦅 LOGIXA FALCON ERP - SALES QUOTATIONS TYPES
 */

import type { EntityId, ISODateString } from'./common';

export type QuotationStatus ='draft'|'pending'|'accepted'|'rejected'|'expired';

export interface Quotation {
 id: EntityId;
 org_id: EntityId;
 branch_id: EntityId;
 quotation_number: string;
 customer_id?: EntityId | null;
 customer_name?: string;
 customer_phone?: string;
 valid_until?: ISODateString;
 status: QuotationStatus;
 subtotal: number;
 discount_amount: number;
 discount_percent?: number;
 tax_amount: number;
 total: number;
 notes?: string;
 created_by: EntityId;
 created_at: ISODateString;
 updated_at: ISODateString;
 sync_status?:'synced'|'pending'|'failed';
}

export interface QuotationItem {
 id: EntityId;
 quotation_id: EntityId;
 product_id: EntityId;
 product_name: string;
 unit_id: EntityId;
 unit_name?: string;
 conversion_factor: number;
 quantity: number;
 unit_price: number;
 discount_amount: number;
 tax_rate: number;
 tax_amount: number;
 total: number;
 notes?: string;
}