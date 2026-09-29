import { v4 as uuidv4 } from'uuid';
import { db } from'@/core/db/app_database';
import { SyncQueueManager } from'@/core/sync/sync_queue_manager';
import type { EmployeeLeave } from'@/types';

export interface LeaveBalance {
 entitled: number;
 used: number;
 remaining: number;
}

/** Fallback entitlement when the employee has no explicit annual_leave_days. */
const DEFAULT_ANNUAL_ENTITLEMENT = 21;

export class LeaveRepository {
 public static async getByOrg(orgId: string): Promise<EmployeeLeave[]> {
 return await db.employee_leaves.where('org_id').equals(orgId).toArray();
 }

 public static async getByEmployee(employeeId: string): Promise<EmployeeLeave[]> {
 return await db.employee_leaves.where('employee_id').equals(employeeId).toArray();
 }

 /**
 * Computes the annual-leave balance of an employee for a given year.
 * Only approved annual leaves consume the entitlement.
 */
 public static async getBalance(
 employeeId: string,
 year: number = new Date().getFullYear()
 ): Promise<LeaveBalance> {
 const employee = await db.users.get(employeeId);
 const entitled = employee?.annual_leave_days ?? DEFAULT_ANNUAL_ENTITLEMENT;

 const approved = await db.employee_leaves
 .where('employee_id')
 .equals(employeeId)
 .and(
 (l) =>
 l.status ==='approved'&&
 l.leave_type ==='annual'&&
 l.start_date.startsWith(String(year))
 )
 .toArray();

 const used = Number(approved.reduce((sum, l) => sum + (l.days_count || 0), 0).toFixed(2));
 return { entitled, used, remaining: Number((entitled - used).toFixed(2)) };
 }

 public static async addLeave(
 leave: Omit<EmployeeLeave,'id'|'created_at'|'updated_at'|'sync_status'>
 ): Promise<void> {
 const now = new Date().toISOString();
 const id = uuidv4();
 const record: EmployeeLeave = {
 ...leave,
 id,
 created_at: now,
 updated_at: now,
 sync_status:'pending',
 };

 await db.transaction('rw', [db.employee_leaves, db.sync_queue], async () => {
 await db.employee_leaves.put(record);
 await SyncQueueManager.enqueue('employee_leaves', id,'insert', record);
 });
 }

 /**
 * Approves or rejects a leave request. Approving an annual leave that
 * exceeds the employee's remaining balance is rejected with an error.
 */
 public static async updateStatus(
 id: string,
 status: EmployeeLeave['status'],
 approvedBy?: string,
 rejectionReason?: string
 ): Promise<void> {
 const leave = await db.employee_leaves.get(id);
 if (!leave) throw new Error('طلب الإجازة غير موجود.');

 if (status ==='approved'&& leave.leave_type ==='annual') {
 const year = Number(leave.start_date.slice(0, 4)) || new Date().getFullYear();
 const balance = await this.getBalance(leave.employee_id, year);
 if (leave.days_count > balance.remaining) {
 throw new Error(
`رصيد الإجازات السنوية غير كافٍ. المتاح ${balance.remaining} يوم والمطلوب ${leave.days_count} يوم.`
 );
 }
 }

 const now = new Date().toISOString();
 await db.transaction('rw', [db.employee_leaves, db.sync_queue], async () => {
 await db.employee_leaves.update(id, {
 status,
 approved_by: approvedBy ?? null,
 rejection_reason: status ==='rejected'? rejectionReason ?? null : null,
 updated_at: now,
 sync_status:'pending',
 });
 const record = await db.employee_leaves.get(id);
 if (record) {
 await SyncQueueManager.enqueue('employee_leaves', id,'update', record);
 }
 });
 }
}