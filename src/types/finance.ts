/**
 * 🦅 LOGIXA FALCON ERP - TREASURY & FINANCIALS
 */

import type { EntityId, ISODateString } from'./common';

export type TreasuryType ='safe'|'bank'|'pos_terminal';

export interface Treasury {
 id: EntityId;
 org_id: EntityId;
 branch_id?: EntityId;
 name: string;
 account_code?: string;
 type: TreasuryType;
 current_balance: number;
 is_default: boolean;
 is_active: boolean;
 created_at: ISODateString;
 updated_at: ISODateString;
 sync_status?:'synced'|'pending'|'failed';
}

export interface ExpenseCategory {
 id: EntityId;
 org_id: EntityId;
 name: string;
 code?: string;
 is_active: boolean;
 created_at: ISODateString;
 updated_at: ISODateString;
 sync_status?:'synced'|'pending'|'failed';
}

export interface Expense {
 id: EntityId;
 org_id: EntityId;
 category_id: EntityId;
 treasury_id: EntityId;
 shift_id?: EntityId | null;
 amount: number;
 description: string;
 receipt_number?: string;
 created_by: EntityId;
 is_deleted?: boolean;
 deleted_at?: ISODateString | null;
 created_at: ISODateString;
 sync_status?:'synced'|'pending'|'failed';
}

export type VoucherType ='receipt'|'payment'; // قبض أو صرف

export interface FinancialVoucher {
 id: EntityId;
 org_id: EntityId;
 voucher_no: string;
 type: VoucherType;
 treasury_id: EntityId;
 contact_id?: EntityId | null;
 shift_id?: EntityId | null;
 amount: number;
 description: string;
 reference_no?: string;
 is_reversed?: boolean;
 reversal_reason?: string | null;
 reversed_voucher_id?: EntityId | null;
 created_by: EntityId;
 created_at: ISODateString;
 sync_status?:'synced'|'pending'|'failed';
}

export type JournalEntryType ='general'|'sales'|'purchases'|'expenses'|'opening'|'payroll'|'voucher'|'adjustment'|'reversal'|'receipt';

export interface JournalEntry {
 id: EntityId;
 org_id: EntityId;
 branch_id?: EntityId;
 entry_no: string;
 entry_date: ISODateString;
 type: JournalEntryType;
 description: string;
 reference_type?: string | null;
 reference_id?: EntityId | null;
 total_amount: number;
 is_reversed?: boolean;
 created_by: EntityId;
 created_at: ISODateString;
 sync_status?:'synced'|'pending'|'failed';
}

export interface JournalEntryLine {
 id: EntityId;
 entry_id: EntityId;
 account_id: EntityId; // References Account id
 debit: number;
 credit: number;
 description?: string;
}

export interface Account {
 id: EntityId;
 org_id: EntityId;
 parent_id?: EntityId | null;
 code: string;
 name: string;
 name_en?: string;
 type:'asset'|'liability'|'equity'|'revenue'|'expense';
 account_type:'parent'|'leaf';
 current_balance: number;
 is_active: boolean;
 system_flag?: boolean;
 created_at: ISODateString;
 updated_at: ISODateString;
 sync_status?:'synced'|'pending'|'failed';
}