/**
 * 🦅 LOGIXA FALCON ERP - EMPLOYEE & HR TYPES
 */

import type { EntityId, ISODateString } from'./common';

export interface EmployeeAttendance {
 id: EntityId;
 org_id: EntityId;
 branch_id: EntityId;
 employee_id: EntityId;
 date: ISODateString; // YYYY-MM-DD
 check_in?: ISODateString | null;
 check_out?: ISODateString | null;
 work_hours?: number; // Calculated hours
 status:'present'|'absent'|'late'|'excused'|'leave';
 notes?: string;
 created_at: ISODateString;
 updated_at: ISODateString;
 sync_status?:'synced'|'pending'|'failed';
}

export type LeaveType ='annual'|'sick'|'unpaid'|'emergency'|'departure';
export type LeaveStatus ='pending'|'approved'|'rejected'|'cancelled';

export interface EmployeeLeave {
 id: EntityId;
 org_id: EntityId;
 branch_id: EntityId;
 employee_id: EntityId;
 leave_type: LeaveType;
 start_date: ISODateString;
 end_date: ISODateString;
 days_count: number;
 reason?: string;
 status: LeaveStatus;
 approved_by?: EntityId | null;
 rejection_reason?: string | null;
 created_at: ISODateString;
 updated_at: ISODateString;
 sync_status?:'synced'|'pending'|'failed';
}

export interface EmployeeSalaryStatement {
 id: EntityId;
 org_id: EntityId;
 branch_id?: EntityId | null;
 employee_id: EntityId;
 month: string; // YYYY-MM
 basic_salary: number;
 allowances: number;
 bonus?: number;
 overtime?: number;
 deductions: number;
 loan_deduction?: number;
 net_salary: number;
 notes?: string;
 status:'draft'|'approved'|'paid'|'cancelled';
 paid_at?: ISODateString | null;
 treasury_id?: EntityId | null; // Account used for payment
 payment_voucher_id?: EntityId | null; // Financial voucher issued on payment
 created_by?: EntityId | null;
 created_at: ISODateString;
 updated_at: ISODateString;
 sync_status?:'synced'|'pending'|'failed';
}

export type EmployeeAdvanceType ='advance_salary'|'bonus'|'deduction'|'allowance'|'loan';
export type EmployeeAdvanceStatus ='pending'|'approved'|'rejected'|'paid'|'deducted_from_salary'|'cancelled';

export interface EmployeeAdvance {
 id: EntityId;
 org_id: EntityId;
 branch_id?: EntityId | null;
 employee_id: EntityId;
 adjustment_type: EmployeeAdvanceType;
 amount: number;
 reason?: string;
 status: EmployeeAdvanceStatus;
 approved_by?: EntityId | null;
 salary_statement_id?: EntityId | null;
 created_by?: EntityId | null;
 created_at: ISODateString;
 updated_at: ISODateString;
 sync_status?:'synced'|'pending'|'failed';
}

export interface EmployeeDocument {
 id: EntityId;
 org_id: EntityId;
 employee_id: EntityId;
 title: string;
 document_type?: string;
 file_url?: string;
 file_type?: string;
 notes?: string;
 created_by?: EntityId | null;
 created_at: ISODateString;
 updated_at: ISODateString;
 sync_status?:'synced'|'pending'|'failed';
}

export interface Department {
 id: EntityId;
 org_id: EntityId;
 parent_id?: EntityId | null;
 name: string;
 manager_id?: EntityId | null;
 code?: string;
 description?: string;
 is_active: boolean;
 created_at: ISODateString;
 updated_at: ISODateString;
 sync_status?:'synced'|'pending'|'failed';
}