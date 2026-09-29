/**
 * 🦅 LOGIXA FALCON ERP - PRESCRIPTION REVIEW TYPES
 */

import type { EntityId, ISODateString } from'./common';

export type PrescriptionStatus ='pending_review'|'approved'|'rejected'|'dispensed';

export interface Prescription {
 id: EntityId;
 org_id: EntityId;
 branch_id: EntityId;
 patient_name: string;
 patient_phone?: string;
 doctor_name?: string;
 prescription_date?: ISODateString;
 diagnosis?: string;
 status: PrescriptionStatus;
 notes?: string;
 image_url?: string;
 items_summary?: string;
 created_by?: EntityId;
 created_at: ISODateString;
 updated_at: ISODateString;
 sync_status?:'synced'|'pending'|'failed';
}