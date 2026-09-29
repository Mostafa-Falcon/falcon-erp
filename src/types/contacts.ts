/**
 * 🦅 LOGIXA FALCON ERP - CONTACTS (CUSTOMERS & SUPPLIERS)
 */

import type { EntityId, ISODateString } from'./common';

export type ContactType ='customer'|'supplier'|'both';

export interface Contact {
 id: EntityId;
 org_id: EntityId;
 name: string;
 type: ContactType;
 code?: string;
 phone?: string;
 mobile?: string;
 email?: string;
 tax_number?: string;
 address?: string;
 credit_limit: number;
 current_balance: number; // positive = owed by contact (debit), negative = owed to contact (credit)
 is_active: boolean;
 notes?: string;
 created_at: ISODateString;
 updated_at: ISODateString;
 sync_status?:'synced'|'pending'|'failed';
}

export interface ContactTransaction {
 id: EntityId;
 org_id: EntityId;
 contact_id: EntityId;
 reference_type:'sale_invoice'|'sale_return'|'purchase_invoice'|'purchase_return'|'receipt_voucher'|'payment_voucher'|'opening_balance';
 reference_id: EntityId;
 debit: number; // مدين
 credit: number; // دائن
 balance_after: number;
 notes?: string;
 created_at: ISODateString;
 sync_status?:'synced'|'pending'|'failed';
}