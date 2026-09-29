import { v4 as uuidv4 } from'uuid';
import { db } from'@/core/db/app_database';
import { SyncQueueManager } from'@/core/sync/sync_queue_manager';
import { TreasuryRepository } from'@/modules/treasury/treasury_repository';
import { AccountingRepository } from'@/modules/accounting/accounting_repository';
import type { EmployeeAdvance, Expense, EmployeeAdvanceStatus, EmployeeAdvanceType } from'@/types';

/** Adjustment types that actually move cash out of a treasury when paid. */
const CASH_OUT_TYPES: EmployeeAdvanceType[] = ['advance_salary','loan','bonus','allowance'];

/**
 * 🦅 Falcon ERP - Employee Advances, Bonuses & Deductions
 * Lifecycle: pending → approved → paid | deducted_from_salary | rejected | cancelled.
 */
export class EmployeeAdvanceRepository {
 public static async getByOrg(orgId: string): Promise<EmployeeAdvance[]> {
 return await db.employee_advances.where('org_id').equals(orgId).toArray();
 }

 public static async getByEmployee(employeeId: string): Promise<EmployeeAdvance[]> {
 return await db.employee_advances.where('employee_id').equals(employeeId).toArray();
 }

 /**
 * Sum of approved-but-not-yet-deducted advances for an employee.
 * Used by the payroll generator to fill`loan_deduction`.
 */
 public static async getPendingDeductionTotal(employeeId: string): Promise<number> {
 const records = await db.employee_advances
 .where('employee_id')
 .equals(employeeId)
 .and((a) => a.status ==='approved'&& a.adjustment_type !=='allowance'&& a.adjustment_type !=='bonus')
 .toArray();
 return Number(records.reduce((sum, a) => sum + (a.amount || 0), 0).toFixed(2));
 }

 public static async addAdvance(params: {
 orgId: string;
 branchId?: string | null;
 employeeId: string;
 adjustmentType: EmployeeAdvanceType;
 amount: number;
 reason?: string;
 createdBy?: string | null;
 }): Promise<EmployeeAdvance> {
 if (!(params.amount > 0)) {
 throw new Error('قيمة السلفة أو المكافأة يجب أن تكون أكبر من صفر.');
 }

 const now = new Date().toISOString();
 const id = uuidv4();
 const record: EmployeeAdvance = {
 id,
 org_id: params.orgId,
 branch_id: params.branchId ?? null,
 employee_id: params.employeeId,
 adjustment_type: params.adjustmentType,
 amount: params.amount,
 reason: params.reason,
 status:'pending',
 approved_by: null,
 salary_statement_id: null,
 created_by: params.createdBy ?? null,
 created_at: now,
 updated_at: now,
 sync_status:'pending',
 };

 await db.transaction('rw', [db.employee_advances, db.sync_queue], async () => {
 await db.employee_advances.put(record);
 await SyncQueueManager.enqueue('employee_advances', id,'insert', record);
 });

 return record;
 }

 public static async updateStatus(
 id: string,
 status: EmployeeAdvanceStatus,
 approvedBy?: string
 ): Promise<void> {
 const now = new Date().toISOString();
 await db.transaction('rw', [db.employee_advances, db.sync_queue], async () => {
 await db.employee_advances.update(id, {
 status,
 approved_by: approvedBy ?? null,
 updated_at: now,
 sync_status:'pending',
 });
 const record = await db.employee_advances.get(id);
 if (record) {
 await SyncQueueManager.enqueue('employee_advances', id,'update', record);
 }
 });
 }

 /**
 * Pays an approved cash-out advance: records the expense, moves the treasury
 * balance and posts the accounting entry. Non cash-out types just flip state.
 */
 public static async markPaid(
 id: string,
 treasuryId?: string,
 userId?: string | null
 ): Promise<{ success: boolean; error?: string }> {
 const advance = await db.employee_advances.get(id);
 if (!advance) return { success: false, error:'السلفة غير موجودة.'};
 if (advance.status ==='paid') return { success: false, error:'تم صرف هذه السلفة بالفعل.'};
 if (advance.status !=='approved') {
 return { success: false, error:'يجب اعتماد السلفة قبل صرفها.'};
 }

 const movesCash = CASH_OUT_TYPES.includes(advance.adjustment_type);
 if (movesCash && !treasuryId) {
 return { success: false, error:'يجب اختيار الخزينة التي سيتم الصرف منها.'};
 }

 const now = new Date().toISOString();
 const expenseId = uuidv4();

 try {
 await db.transaction(
'rw',
 [db.employee_advances, db.sync_queue, db.treasuries, db.expenses],
 async () => {
 if (movesCash && treasuryId) {
 const expense: Expense = {
 id: expenseId,
 org_id: advance.org_id,
 category_id:'salaries_wages',
 treasury_id: treasuryId,
 amount: advance.amount,
 description:`صرف ${advance.adjustment_type ==='loan'?'قرض':'سلفة'} الموظف`,
 created_by: userId ??'system',
 created_at: now,
 sync_status:'pending',
 };
 await db.expenses.put(expense);
 await SyncQueueManager.enqueue('expenses', expenseId,'insert', expense);

 await TreasuryRepository.adjustBalance(treasuryId, -advance.amount);
 }

 await db.employee_advances.update(id, {
 status:'paid',
 updated_at: now,
 sync_status:'pending',
 });
 const updated = await db.employee_advances.get(id);
 if (updated) {
 await SyncQueueManager.enqueue('employee_advances', id,'update', updated);
 }
 }
 );

 if (movesCash && treasuryId) {
 await AccountingRepository.postEmployeeAdvancePayment({
 orgId: advance.org_id,
 branchId: advance.branch_id ?? null,
 referenceId: id,
 date: now,
 amount: advance.amount,
 description:'صرف سلفة/مكافأة موظف',
 treasuryId,
 userId,
 });
 }

 return { success: true };
 } catch (err) {
 return {
 success: false,
 error: err instanceof Error ? err.message :'خطأ أثناء صرف السلفة.',
 };
 }
 }

 public static async deleteAdvance(id: string): Promise<void> {
 await db.transaction('rw', [db.employee_advances, db.sync_queue], async () => {
 await db.employee_advances.delete(id);
 await SyncQueueManager.enqueue('employee_advances', id,'delete', { id });
 });
 }
}