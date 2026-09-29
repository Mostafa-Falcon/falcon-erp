import { v4 as uuidv4 } from'uuid';
import { db } from'@/core/db/app_database';
import { SyncQueueManager } from'@/core/sync/sync_queue_manager';
import { TreasuryRepository } from'@/modules/treasury/treasury_repository';
import { AccountingRepository } from'@/modules/accounting/accounting_repository';
import { EmployeeAdvanceRepository } from'@/modules/employees/employee_advance_repository';
import type { EmployeeSalaryStatement, Expense } from'@/types';

export class SalaryRepository {
 public static async getByMonth(orgId: string, month: string): Promise<EmployeeSalaryStatement[]> {
 return await db.salary_statements
 .where('org_id')
 .equals(orgId)
 .filter(s => s.month === month)
 .toArray();
 }

 public static async generateDrafts(orgId: string, month: string): Promise<void> {
 const employees = await db.users.where('org_id').equals(orgId).and(u => u.is_active).toArray();
 const existing = await this.getByMonth(orgId, month);
 const existingEmpIds = new Set(existing.map(s => s.employee_id));

 const now = new Date().toISOString();
 const newStatements: EmployeeSalaryStatement[] = [];

 // جلب الحضور لهذا الشهر لحساب الخصومات إن وجد
 const attendance = await db.employee_attendance
 .where('org_id').equals(orgId)
 .filter(a => a.date.startsWith(month))
 .toArray();

 for (const emp of employees) {
 if (existingEmpIds.has(emp.id)) continue;

 const basic = emp.basic_salary || 0;
 const allowances = emp.allowances || 0;
 const staticDeductions = emp.deductions || 0;

 // حساب خصم الغياب (تبسيطي: راتب اليوم = الراتب / 30)
 const dayRate = basic / 30;
 const absentDays = attendance.filter(a => a.employee_id === emp.id && a.status ==='absent').length;
 const attendanceDeduction = Number((absentDays * dayRate).toFixed(2));

 const totalDeductions = staticDeductions + attendanceDeduction;

 // Apply approved-and-unpaid advances/loans as loan deductions for the month.
 const pendingAdvances = await EmployeeAdvanceRepository.getPendingDeductionTotal(emp.id);
 const grossBeforeLoan = basic + allowances - totalDeductions;
 const loanDeduction = Number(Math.min(pendingAdvances, Math.max(0, grossBeforeLoan)).toFixed(2));
 const net = grossBeforeLoan - loanDeduction;

 const id = uuidv4();
 const statement: EmployeeSalaryStatement = {
 id,
 org_id: orgId,
 employee_id: emp.id,
 month,
 basic_salary: basic,
 allowances,
 bonus: 0,
 overtime: 0,
 deductions: totalDeductions,
 loan_deduction: loanDeduction,
 net_salary: net,
 status:'draft',
 created_at: now,
 updated_at: now,
 sync_status:'pending'
 };
 newStatements.push(statement);
 }

 if (newStatements.length > 0) {
 await db.transaction('rw', [db.salary_statements, db.sync_queue], async () => {
 await db.salary_statements.bulkPut(newStatements);
 for (const s of newStatements) {
 await SyncQueueManager.enqueue('salary_statements', s.id,'insert', s);
 }
 });
 }
 }

 public static async updateStatement(id: string, updates: Partial<EmployeeSalaryStatement>): Promise<void> {
 const now = new Date().toISOString();

 await db.transaction('rw', [db.salary_statements, db.sync_queue], async () => {
 const current = await db.salary_statements.get(id);
 if (!current) return;

 const merged = { ...current, ...updates };
 // إعادة حساب الصافي
 const net = (merged.basic_salary || 0) + (merged.allowances || 0) + (merged.bonus || 0) + (merged.overtime || 0)
 - (merged.deductions || 0) - (merged.loan_deduction || 0);

 const finalUpdates = {
 ...updates,
 net_salary: net,
 updated_at: now,
 sync_status:'pending'as const
 };

 await db.salary_statements.update(id, finalUpdates);
 const record = await db.salary_statements.get(id);
 if (record) {
 await SyncQueueManager.enqueue('salary_statements', id,'update', record);
 }
 });
 }

 public static async markPaid(id: string, treasuryId?: string): Promise<void> {
 const now = new Date().toISOString();
 const statement = await db.salary_statements.get(id);
 if (!statement) throw new Error('مسير الراتب غير موجود.');
 if (statement.status ==='paid') throw new Error('تم صرف هذا الراتب بالفعل.');
 if (!treasuryId) throw new Error('يجب اختيار الخزينة التي سيتم الصرف منها.');

 // Resolve a real expense category (falls back to a stable symbolic id)
 const categories = await db.expense_categories.where('org_id').equals(statement.org_id).toArray();
 const salaryCategory = categories.find((c) => c.code ==='EXP-03')
 ?? categories.find((c) => c.name.includes('رواتب'));
 const categoryId = salaryCategory?.id ??'salaries_wages';

 const expenseId = uuidv4();

 await db.transaction('rw', [db.salary_statements, db.sync_queue, db.treasuries, db.expenses], async () => {
 // 1. Mark the payroll statement as paid
 await db.salary_statements.update(id, {
 status:'paid',
 paid_at: now,
 treasury_id: treasuryId,
 updated_at: now,
 sync_status:'pending',
 });

 // 2. Record the payroll as an operating expense + move the treasury balance
 const expense: Expense = {
 id: expenseId,
 org_id: statement.org_id,
 category_id: categoryId,
 treasury_id: treasuryId,
 amount: statement.net_salary,
 description:`صرف راتب الموظف عن شهر ${statement.month}`,
 created_by:'system',
 created_at: now,
 sync_status:'pending',
 };
 await db.expenses.put(expense);
 await SyncQueueManager.enqueue('expenses', expenseId,'insert', expense);

 await TreasuryRepository.adjustBalance(treasuryId, -statement.net_salary);
 });

 // 3. Issue the printable payment voucher document (cash already moved above)
 const voucher = await TreasuryRepository.registerVoucherOnly({
 orgId: statement.org_id,
 type:'payment',
 treasuryId,
 amount: statement.net_salary,
 description:`صرف راتب عن شهر ${statement.month}`,
 referenceNo:`SAL-${statement.month}`,
 userId: statement.created_by ??'system',
 });

 await db.transaction('rw', [db.salary_statements, db.sync_queue], async () => {
 await db.salary_statements.update(id, {
 payment_voucher_id: voucher.id,
 updated_at: now,
 sync_status:'pending',
 });
 const updatedRecord = await db.salary_statements.get(id);
 if (updatedRecord) {
 await SyncQueueManager.enqueue('salary_statements', id,'update', updatedRecord);
 }
 });

 // 4. Post the payroll journal entry (idempotent per statement).
 // The chart of accounts is ensured first to avoid a missing-account failure.
 await AccountingRepository.ensureDefaultChartOfAccounts(statement.org_id);
 try {
 await AccountingRepository.postPayrollPayment({
 orgId: statement.org_id,
 branchId: statement.branch_id,
 referenceId: id,
 date: now,
 amount: statement.net_salary,
 description:`راتب عن شهر ${statement.month}`,
 treasuryId,
 userId: statement.created_by,
 });
 } catch (accountingError) {
 throw new Error(
`تم صرف الراتب محلياً لكن فشل ترحيل القيد المحاسبي: ${
 accountingError instanceof Error ? accountingError.message :'خطأ غير معروف'
 }`
 );
 }
 }

 public static async deleteStatement(id: string): Promise<void> {
 await db.transaction('rw', [db.salary_statements, db.sync_queue], async () => {
 await db.salary_statements.delete(id);
 await SyncQueueManager.enqueue('salary_statements', id,'delete', { id });
 });
 }
}