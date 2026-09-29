import { v4 as uuidv4 } from'uuid';
import { db } from'@/core/db/app_database';
import { SyncQueueManager } from'@/core/sync/sync_queue_manager';
import type { EmployeeAttendance } from'@/types';
import { differenceInMinutes, parseISO } from'date-fns';

export class AttendanceRepository {
 public static async getAttendanceByDate(orgId: string, date: string): Promise<EmployeeAttendance[]> {
 return await db.employee_attendance
 .where('org_id')
 .equals(orgId)
 .filter(a => a.date === date)
 .toArray();
 }

 public static async getEmployeeAttendance(employeeId: string, orgId: string, date: string): Promise<EmployeeAttendance | null> {
 const records = await db.employee_attendance
 .where('employee_id')
 .equals(employeeId)
 .and(a => a.date === date && a.org_id === orgId)
 .toArray();
 return records[0] || null;
 }

 public static async logAttendance(attendance: Omit<EmployeeAttendance,'id'|'created_at'|'updated_at'|'sync_status'>): Promise<void> {
 const now = new Date().toISOString();
 const id = uuidv4();
 const record: EmployeeAttendance = {
 ...attendance,
 id,
 created_at: now,
 updated_at: now,
 sync_status:'pending'
 };

 await db.transaction('rw', [db.employee_attendance, db.sync_queue], async () => {
 await db.employee_attendance.put(record);
 await SyncQueueManager.enqueue('employee_attendance', id,'insert', record);
 });
 }

 public static async checkIn(employeeId: string, orgId: string, branchId: string): Promise<void> {
 const now = new Date();
 const isoNow = now.toISOString();
 const date = isoNow.split('T')[0];

 const existing = await this.getEmployeeAttendance(employeeId, orgId, date);
 if (existing) {
 if (existing.check_in) throw new Error('الموظف قام بتسجيل الحضور بالفعل اليوم');
 await this.updateAttendance(existing.id, { check_in: isoNow, status:'present'});
 return;
 }

 await this.logAttendance({
 org_id: orgId,
 branch_id: branchId,
 employee_id: employeeId,
 date: date,
 check_in: isoNow,
 status:'present',
 });
 }

 public static async checkOut(attendanceId: string): Promise<void> {
 const record = await db.employee_attendance.get(attendanceId);
 if (!record) throw new Error('سجل الحضور غير موجود');
 if (record.check_out) throw new Error('الموظف قام بتسجيل الانصراف بالفعل');

 const isoNow = new Date().toISOString();
 let workHours = 0;
 if (record.check_in) {
 const minutes = differenceInMinutes(parseISO(isoNow), parseISO(record.check_in));
 workHours = Number((minutes / 60).toFixed(2));
 }

 await this.updateAttendance(attendanceId, {
 check_out: isoNow,
 work_hours: workHours
 });
 }

 public static async updateAttendance(id: string, updates: Partial<EmployeeAttendance>): Promise<void> {
 const now = new Date().toISOString();
 await db.transaction('rw', [db.employee_attendance, db.sync_queue], async () => {
 await db.employee_attendance.update(id, { ...updates, updated_at: now, sync_status:'pending'});
 const record = await db.employee_attendance.get(id);
 if (record) {
 await SyncQueueManager.enqueue('employee_attendance', id,'update', record);
 }
 });
 }

 public static async markAbsent(employeeId: string, orgId: string, branchId: string, date: string): Promise<void> {
 const existing = await this.getEmployeeAttendance(employeeId, orgId, date);
 if (existing) {
 await this.updateAttendance(existing.id, { status:'absent', check_in: null, check_out: null, work_hours: 0 });
 return;
 }

 await this.logAttendance({
 org_id: orgId,
 branch_id: branchId,
 employee_id: employeeId,
 date: date,
 status:'absent',
 });
 }

 public static async markManualStatus(employeeId: string, orgId: string, branchId: string, date: string, status: EmployeeAttendance['status'], notes?: string): Promise<void> {
 const existing = await this.getEmployeeAttendance(employeeId, orgId, date);
 if (existing) {
 await this.updateAttendance(existing.id, { status, notes });
 return;
 }

 await this.logAttendance({
 org_id: orgId,
 branch_id: branchId,
 employee_id: employeeId,
 date: date,
 status: status,
 notes: notes
 });
 }

 public static async deleteAttendance(id: string): Promise<void> {
 await db.transaction('rw', [db.employee_attendance, db.sync_queue], async () => {
 await db.employee_attendance.delete(id);
 await SyncQueueManager.enqueue('employee_attendance', id,'delete', { id });
 });
 }
}