import { v4 as uuidv4 } from 'uuid';
import { db } from '@/core/db/app_database';
import { SyncQueueManager } from '@/core/sync/sync_queue_manager';
import { getSubscriptionPermissions } from '@/core/constants/subscription_profiles';
import type { User, UserRole } from '@/types';

export interface CreateEmployeeDTO {
  org_id: string;
  branch_id?: string;
  full_name: string;
  username: string;
  email?: string;
  phone?: string;
  role: UserRole;
  pin_code?: string;
  password?: string;
  department_id?: string | null;
  job_title?: string;
  hire_date?: string;
  annual_leave_days?: number;
  basic_salary?: number;
  salary_cycle?: 'monthly' | 'weekly' | 'daily' | 'hourly';
  deductions?: number;
  allowances?: number;
  permissions?: string[];
}

export class EmployeeRepository {
  /**
   * يُنشئ / يُحدّث / يُجمّد حساب Supabase Auth للموظف (كل الحسابات في auth.users
   * مع user_metadata.org_id حتى يعمل Realtime على كل الأجهزة).
   */
  private static provisionAuthAccount(payload: Record<string, unknown>): void {
    try {
      const res = fetch('/api/auth/provision-user', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      res
        .then((r) => {
          if (!r.ok) {
            return r.text().then((t) => console.warn('[EmployeeAuth] Provision failed:', t));
          }
        })
        .catch((err: unknown) => console.warn('[EmployeeAuth] Provision error:', err));
    } catch (err) {
      console.warn('[EmployeeAuth] Provision sync error:', err);
    }
  }

  /**
   * Get all employees belonging to a specific business owner's organization
   */
  public static async getEmployeesByOrg(orgId: string): Promise<User[]> {
    return await db.users.where('org_id').equals(orgId).toArray();
  }

  /**
   * Add a new employee under the owner's organization
   */
  public static async addEmployee(dto: CreateEmployeeDTO): Promise<User> {
    // فحص ترقية اشتراك المنشأة والتأكد من السماح بإنشاء حسابات الموظفين
    const org = await db.organizations.get(dto.org_id);
    if (org) {
      if (!org.is_active) {
        throw new Error('حساب المنشأة غير فعال حالياً.');
      }
      const isExpired = org.subscription_expires_at
        ? new Date(org.subscription_expires_at) < new Date()
        : false;
      const perms = getSubscriptionPermissions(org.subscription_tier, isExpired);
      if (!perms.canManageEmployees) {
        throw new Error(
          perms.reasonIfBlocked ||
          'إنشاء وإضافة حسابات الموظفين غير متاح في الحساب القياسي والتجريبي (متاح ترقيته لباقات VIP عبر لوحة التحكم).'
        );
      }
    }

    const now = new Date().toISOString();
    const userId = uuidv4();

    const newEmployee: User = {
      id: userId,
      org_id: dto.org_id,
      branch_id: dto.branch_id,
      full_name: dto.full_name.trim(),
      username: dto.username.trim().toLowerCase(),
      email: dto.email?.trim() || undefined,
      phone: dto.phone?.trim() || undefined,
      role: dto.role,
      pin_code_hash: dto.pin_code?.trim() || '1234',
      department_id: dto.department_id ?? null,
      job_title: dto.job_title?.trim() || undefined,
      hire_date: dto.hire_date || undefined,
      annual_leave_days: dto.annual_leave_days ?? 21,
      basic_salary: dto.basic_salary,
      salary_cycle: dto.salary_cycle || 'monthly',
      deductions: dto.deductions || 0,
      allowances: dto.allowances || 0,
      permissions: dto.permissions || [],
      is_active: true,
      created_at: now,
      updated_at: now,
      sync_status: 'pending',
    };

    // 1. Save to local Dexie database
    await db.transaction('rw', [db.users, db.sync_queue], async () => {
      await db.users.put(newEmployee);
      await SyncQueueManager.enqueue('users', userId, 'insert', newEmployee);
    });

    // 2. Provision the matching Supabase Auth account (best-effort online)
    if (newEmployee.email) {
      this.provisionAuthAccount({
        action: 'ensure',
        email: newEmployee.email,
        password: dto.password,
        fullName: newEmployee.full_name,
        orgId: newEmployee.org_id,
        role: newEmployee.role,
      });
    }

    return newEmployee;
  }

  /**
   * Update employee details or role
   */
  public static async updateEmployee(
    userId: string,
    updates: Partial<User>
  ): Promise<void> {
    const now = new Date().toISOString();
    const cleanUpdates = { ...updates, updated_at: now, sync_status: 'pending' as const };

    const prevUser = await db.users.get(userId);

    await db.transaction('rw', [db.users, db.sync_queue], async () => {
      await db.users.update(userId, cleanUpdates);
      const updatedUser = await db.users.get(userId);
      if (updatedUser) {
        await SyncQueueManager.enqueue('users', userId, 'update', updatedUser);
      }
    });

    // إذا تغيّر البريد الإلكتروني نزامن حساب auth (نقل من oldEmail إلى الجديد)
    const updatedUser = await db.users.get(userId);
    if (
      updatedUser?.email &&
      prevUser &&
      prevUser.email?.toLowerCase() !== updatedUser.email.toLowerCase()
    ) {
      this.provisionAuthAccount({
        action: 'ensure',
        email: updatedUser.email,
        oldEmail: prevUser.email,
        fullName: updatedUser.full_name,
        orgId: updatedUser.org_id,
        role: updatedUser.role,
      });
    }
  }

  /**
   * Toggle employee active / disabled status
   */
  public static async toggleStatus(userId: string, currentStatus: boolean): Promise<boolean> {
    const nextStatus = !currentStatus;
    await this.updateEmployee(userId, { is_active: nextStatus });

    const employee = await db.users.get(userId);
    if (employee?.email) {
      this.provisionAuthAccount({
        action: nextStatus ? 'unban' : 'ban',
        email: employee.email,
      });
    }
    return nextStatus;
  }

  /**
   * Delete an employee
   */
  public static async deleteEmployee(userId: string): Promise<void> {
    const existing = await db.users.get(userId);
    await db.transaction('rw', [db.users, db.sync_queue], async () => {
      await db.users.delete(userId);
      await SyncQueueManager.enqueue('users', userId, 'delete', { id: userId });
    });

    // إلغاء وصول حساب auth نهائياً
    if (existing?.email) {
      this.provisionAuthAccount({ action: 'ban', email: existing.email });
    }
  }
}
