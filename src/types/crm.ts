/**
 * 🦅 LOGIXA FALCON ERP - CRM, CUSTOMER GROUPS & SALES REPS TYPES
 */

import type { EntityId, ISODateString } from'./common';

export interface CustomerGroup {
 id: EntityId;
 org_id: EntityId;
 name: string;
 code?: string;
 discount_percentage: number;
 credit_limit_multiplier: number; // default 1.0
 description?: string;
 customers_count?: number;
 is_active: boolean;
 created_at: ISODateString;
 updated_at: ISODateString;
 sync_status?:'synced'|'pending'|'failed';
}

export interface SalesRep {
 id: EntityId;
 org_id: EntityId;
 name: string;
 code?: string;
 phone: string;
 email?: string;
 commission_rate: number; // percentage
 target_monthly: number;
 achieved_monthly: number;
 is_active: boolean;
 created_at: ISODateString;
 updated_at: ISODateString;
 sync_status?:'synced'|'pending'|'failed';
}

export type LeadStatus ='new'|'contacted'|'negotiating'|'won'|'lost';

export interface CrmLead {
 id: EntityId;
 org_id: EntityId;
 company_name: string;
 contact_person: string;
 phone: string;
 email?: string;
 source?: string;
 status: LeadStatus;
 estimated_value: number;
 sales_rep_id?: EntityId;
 sales_rep_name?: string;
 notes?: string;
 created_at: ISODateString;
 updated_at: ISODateString;
 sync_status?:'synced'|'pending'|'failed';
}