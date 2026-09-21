'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { AppShell } from '@/components/layout/AppShell';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Icons } from '@/components/ui/Icons';
import { useSessionStore } from '@/core/state/useSessionStore';
import { EmployeeRepository, type CreateEmployeeDTO } from '@/modules/employees/employee_repository';
import { DepartmentRepository } from '@/modules/employees/department_repository';
import type { Branch, Department, User, UserRole } from '@/types';

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

import { getSubscriptionPermissions } from '@/core/constants/subscription_profiles';
import { useRouter } from 'next/navigation';

const ROLE_OPTIONS: { value: UserRole; label: string }[] = [
  { value: 'cashier', label: 'كاشير ونقطة بيع (POS)' },
  { value: 'manager', label: 'مدير فرع' },
  { value: 'accountant', label: 'محاسب مالي' },
  { value: 'warehouse_keeper', label: 'أمين مخزن' },
];

function EmployeesContent() {
  const router = useRouter();
  const { currentUser } = useSessionStore();
  const orgId = currentUser?.org_id || '';

  const [employees, setEmployees] = useState<User[]>([]);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState('all');
  const [branchFilter, setBranchFilter] = useState('all');
  const [isLoading, setIsLoading] = useState(true);
  const [subTier, setSubTier] = useState('standard');
  const [isExpired, setIsExpired] = useState(false);

  const perms = getSubscriptionPermissions(subTier, isExpired);

  // Edit form
  const [editTarget, setEditTarget] = useState<User | null>(null);
  const [eFullName, setEFullName] = useState('');
  const [eEmail, setEEmail] = useState('');
  const [ePhone, setEPhone] = useState('');
  const [eRole, setERole] = useState<UserRole>('cashier');
  const [eBranchId, setEBranchId] = useState('');
  const [eDepartmentId, setEDepartmentId] = useState('');
  const [eJobTitle, setEJobTitle] = useState('');
  const [ePinCode, setEPinCode] = useState('');
  const [formError, setFormError] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  const loadData = async () => {
    if (!orgId) return;
    try {
      const { db } = await import('@/core/db/app_database');
      const [empList, branchList, deptList, orgRec] = await Promise.all([
        EmployeeRepository.getEmployeesByOrg(orgId),
        db.branches.where('org_id').equals(orgId).toArray(),
        DepartmentRepository.getAll(orgId),
        db.organizations.get(orgId),
      ]);
      setEmployees(empList);
      setBranches(branchList);
      setDepartments(deptList);
      if (orgRec) {
        setSubTier(orgRec.subscription_tier || 'standard');
        setIsExpired(orgRec.subscription_expires_at ? new Date(orgRec.subscription_expires_at) < new Date() : false);
      }
    } catch (err) {
      console.error('Failed to load employees:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (!orgId) return;
    Promise.resolve().then(loadData);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [orgId]);

  const branchName = (id?: string) => branches.find((b) => b.id === id)?.name || '—';
  const departmentName = (id?: string | null) => departments.find((d) => d.id === id)?.name;

  const filteredEmployees = useMemo(() => {
    return employees.filter((emp) => {
      const q = searchQuery.trim().toLowerCase();
      const matchesSearch =
        !q ||
        emp.full_name.toLowerCase().includes(q) ||
        emp.username.toLowerCase().includes(q) ||
        (emp.phone || '').includes(q);
      const matchesRole = roleFilter === 'all' || emp.role === roleFilter;
      const matchesBranch = branchFilter === 'all' || emp.branch_id === branchFilter;
      return matchesSearch && matchesRole && matchesBranch;
    });
  }, [employees, searchQuery, roleFilter, branchFilter]);

  const stats = useMemo(() => {
    const active = employees.filter((e) => e.is_active).length;
    const cashiers = employees.filter((e) => e.role === 'cashier').length;
    const managers = employees.filter((e) => e.role === 'manager' || e.role === 'accountant').length;
    return { total: employees.length, active, cashiers, managers };
  }, [employees]);

  const openAddModal = () => {
    router.push('/employees/new');
  };

  const openEditModal = (emp: User) => {
    setFormError('');
    setEditTarget(emp);
    setEFullName(emp.full_name);
    setEEmail(emp.email || '');
    setEPhone(emp.phone || '');
    setERole(emp.role === 'super_admin' ? emp.role : emp.role);
    setEBranchId(emp.branch_id || '');
    setEDepartmentId(emp.department_id || '');
    setEJobTitle(emp.job_title || '');
    setEPinCode('');
  };

  const handleEditEmployee = async () => {
    setFormError('');
    if (!editTarget) return;
    if (!eFullName.trim()) {
      setFormError('أدخل اسم الموظف.');
      return;
    }
    setIsSaving(true);
    try {
      const updates: Partial<User> = {
        full_name: eFullName.trim(),
        email: eEmail.trim() || undefined,
        phone: ePhone.trim() || undefined,
        department_id: eDepartmentId || null,
        job_title: eJobTitle.trim() || undefined,
      };
      if (editTarget.role !== 'super_admin') {
        updates.role = eRole;
        updates.branch_id = eBranchId || undefined;
        if (ePinCode.trim()) updates.pin_code_hash = ePinCode.trim();
      }
      await EmployeeRepository.updateEmployee(editTarget.id, updates);
      setEditTarget(null);
      await loadData();
    } catch (err) {
      setFormError(err instanceof Error ? err.message : 'حدث خطأ أثناء تحديث الموظف.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleToggleStatus = async (emp: User) => {
    try {
      await EmployeeRepository.toggleStatus(emp.id, emp.is_active);
      await loadData();
    } catch (err) {
      console.error('Error toggling status:', err);
    }
  };

  const handleDelete = async (emp: User) => {
    if (emp.role === 'super_admin' || emp.role === 'owner') return;
    if (!window.confirm(`هل أنت متأكد من حذف الموظف "${emp.full_name}"؟`)) return;
    try {
      await EmployeeRepository.deleteEmployee(emp.id);
      await loadData();
    } catch (err) {
      console.error('Error deleting employee:', err);
    }
  };

  const getRoleBadge = (roleName: UserRole) => {
    switch (roleName) {
      case 'owner':
      case 'super_admin':
        return <span className="px-2.5 py-1 rounded-full text-[10px] font-black bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300">صاحب المنشأة</span>;
      case 'admin':
      case 'manager':
        return <span className="px-2.5 py-1 rounded-full text-[10px] font-black bg-blue-100 text-blue-800 dark:bg-blue-950/60 dark:text-blue-300">مدير فرع</span>;
      case 'cashier':
        return <span className="px-2.5 py-1 rounded-full text-[10px] font-black bg-teal-100 text-teal-800 dark:bg-teal-950/60 dark:text-teal-300">كاشير ونقطة بيع</span>;
      case 'accountant':
        return <span className="px-2.5 py-1 rounded-full text-[10px] font-black bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300">محاسب مالي</span>;
      case 'warehouse_keeper':
        return <span className="px-2.5 py-1 rounded-full text-[10px] font-black bg-purple-100 text-purple-800 dark:bg-purple-950/60 dark:text-purple-300">أمين مخزن</span>;
      default:
        return <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-slate-100 text-slate-700">موظف</span>;
    }
  };

  return (
    <AppShell title="الموظفين والمستخدمين والصلاحيات" subtitle="إدارة طاقم العمل والكاشيرات والصلاحيات الخاصة بالمنشأة">
      <div className="space-y-4">
        {/* KPIs */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <Kpi label="إجمالي الموظفين" value={String(stats.total)} accent="#2563eb" />
          <Kpi label="موظفون نشطون" value={String(stats.active)} accent="#558b2f" />
          <Kpi label="الكاشيرات (POS)" value={String(stats.cashiers)} accent="#0d9488" />
          <Kpi label="مدراء ومحاسبون" value={String(stats.managers)} accent="#d97706" />
        </div>

        {/* Filters */}
        <div className="bg-white dark:bg-[#131b2e] rounded-2xl border border-slate-200/80 dark:border-slate-800 p-4 space-y-3">
          <div className="flex flex-col sm:flex-row gap-3 items-center justify-between">
            <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto flex-1 max-w-xl">
              <div className="flex-1">
                <Input
                  type="text"
                  placeholder="بحث بالاسم أو الهاتف أو المستخدم..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="h-10 bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-xs pr-9"
                  icon={<Icons.Search />}
                />
              </div>
              {branches.length > 0 && (
                <div className="w-full sm:w-44">
                  <Select value={branchFilter} onValueChange={setBranchFilter}>
                    <SelectTrigger className="w-full h-10 rounded-xl bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-xs font-bold">
                      <SelectValue placeholder="تصفية حسب الفرع" />
                    </SelectTrigger>
                    <SelectContent className="z-50 bg-white dark:bg-[#131b2e] border border-slate-200 dark:border-slate-800 rounded-xl shadow-xl">
                      <SelectItem value="all">كل الفروع ({branches.length})</SelectItem>
                      {branches.map((b) => (
                        <SelectItem key={b.id} value={b.id}>
                          {b.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}
            </div>
            <div className="flex items-center gap-2 overflow-x-auto w-full sm:w-auto">
              {[
                { id: 'all', label: 'الكل' },
                { id: 'cashier', label: 'كاشير' },
                { id: 'manager', label: 'مدير فرع' },
                { id: 'accountant', label: 'محاسب' },
                { id: 'warehouse_keeper', label: 'أمين مخزن' },
              ].map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setRoleFilter(tab.id)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                    roleFilter === tab.id
                      ? 'bg-[#558b2f] text-white shadow-xs'
                      : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>
            {perms.canManageEmployees ? (
              <Button onClick={openAddModal} className="h-10 px-4 bg-[#558b2f] hover:bg-[#436d25] text-white rounded-lg text-xs font-bold flex items-center gap-1.5 cursor-pointer">
                <Icons.Plus /> إضافة موظف جديد
              </Button>
            ) : (
              <div className="px-3.5 py-2 rounded-xl bg-indigo-50/80 dark:bg-indigo-950/40 border border-indigo-200/60 dark:border-indigo-800 text-indigo-800 dark:text-indigo-300 text-xs font-bold flex items-center gap-2">
                <span>صاحب المنشأة (متاح فتح نفس الحساب على أجهزة متعددة)</span>
              </div>
            )}
          </div>

          {/* Table */}
          <div className="overflow-x-auto">
            <table className="w-full text-right">
              <thead>
                <tr className="border-b border-slate-100 dark:border-slate-800 text-[10px] font-black text-slate-400">
                  <th className="py-2.5 pr-3">الموظف</th>
                  <th className="py-2.5">الدور الوظيفي</th>
                  <th className="py-2.5">الفرع</th>
                  <th className="py-2.5">اسم المستخدم</th>
                  <th className="py-2.5">الهاتف / البريد</th>
                  <th className="py-2.5">PIN</th>
                  <th className="py-2.5">الحالة</th>
                  <th className="py-2.5 pl-3">إجراءات</th>
                </tr>
              </thead>
              <tbody>
                {isLoading ? (
                  <tr>
                    <td colSpan={8} className="py-10 text-center text-sm font-bold text-slate-400">جارٍ تحميل بيانات طاقم العمل...</td>
                  </tr>
                ) : filteredEmployees.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="py-10 text-center text-sm font-bold text-slate-400">لا يوجد موظفون مطابقون لبحثك.</td>
                  </tr>
                ) : (
                  filteredEmployees.map((emp) => (
                    <tr key={emp.id} className="border-b border-slate-50 dark:border-slate-800/60 text-xs font-bold text-slate-700 dark:text-slate-300 hover:bg-slate-50/70 dark:hover:bg-slate-800/40">
                      <td className="py-3 pr-3">
                        <div className="flex items-center gap-2.5">
                          <div className="w-8 h-8 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-black flex items-center justify-center text-xs">
                            {emp.full_name.charAt(0)}
                          </div>
                          <div className="flex flex-col">
                            <span className="text-slate-900 dark:text-white">{emp.full_name}</span>
                            {(emp.job_title || departmentName(emp.department_id)) && (
                              <span className="text-[10px] text-slate-400 font-bold">
                                {[emp.job_title, departmentName(emp.department_id)].filter(Boolean).join(' • ')}
                              </span>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="py-3">{getRoleBadge(emp.role)}</td>
                      <td className="py-3 text-[11px]">{branchName(emp.branch_id)}</td>
                      <td className="py-3 font-mono">{emp.username}</td>
                      <td className="py-3 text-[11px] text-slate-500 dark:text-slate-400">
                        <div>{emp.phone || '—'}</div>
                        <div className="text-[10px]">{emp.email || ''}</div>
                      </td>
                      <td className="py-3">
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 text-[10px] font-mono font-bold text-slate-500 dark:text-slate-400">
                          {emp.pin_code_hash ? '••••' : 'غير محدد'}
                        </span>
                      </td>
                      <td className="py-3">
                        <button
                          onClick={() => handleToggleStatus(emp)}
                          className={`px-2.5 py-1 rounded-full text-[10px] font-bold cursor-pointer transition-colors ${
                            emp.is_active
                              ? 'bg-emerald-50 text-emerald-700 border border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300'
                              : 'bg-red-50 text-red-700 border border-red-200 dark:bg-red-950/40 dark:text-red-300'
                          }`}
                        >
                          {emp.is_active ? 'نشط' : 'معطل'}
                        </button>
                      </td>
                      <td className="py-3 pl-3">
                        <div className="flex items-center justify-end gap-1">
                          <button
                            onClick={() => openEditModal(emp)}
                            className="p-1.5 rounded-lg text-slate-400 hover:text-[#558b2f] hover:bg-emerald-50 dark:hover:bg-emerald-950/40 transition-colors cursor-pointer"
                            title="تعديل الموظف"
                          >
                            <Icons.Edit />
                          </button>
                          {emp.role !== 'super_admin' && (
                            <button
                              onClick={() => handleDelete(emp)}
                              className="p-1.5 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/40 transition-colors cursor-pointer"
                              title="حذف الموظف"
                            >
                              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <polyline points="3 6 5 6 21 6" />
                                <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                              </svg>
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Edit modal */}
      {editTarget && (
        <Modal title={`تعديل بيانات ${editTarget.full_name}`} onClose={() => setEditTarget(null)}>
          {formError && <FormError message={formError} />}

          <div>
            <Label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">اسم الموظف بالكامل</Label>
            <Input type="text" value={eFullName} onChange={(e) => setEFullName(e.target.value)} className="h-10 bg-slate-50 dark:bg-slate-900 text-sm" />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">رقم الهاتف</Label>
              <Input type="tel" value={ePhone} onChange={(e) => setEPhone(e.target.value)} className="h-10 bg-slate-50 dark:bg-slate-900 text-sm" />
            </div>
            <div>
              <Label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">البريد الإلكتروني</Label>
              <Input type="email" value={eEmail} onChange={(e) => setEEmail(e.target.value)} className="h-10 bg-slate-50 dark:bg-slate-900 text-sm" />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">الدور الوظيفي والصلاحية</Label>
              {editTarget.role === 'super_admin' || editTarget.role === 'owner' ? (
                <Input type="text" value="صاحب المنشأة (غير قابل للتعديل)" disabled className="h-10 bg-slate-50 dark:bg-slate-900 text-xs" />
              ) : (
                <Select value={eRole} onValueChange={(val) => setERole(val as UserRole)}>
                  <SelectTrigger className="w-full h-10 rounded-xl bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-xs font-bold">
                    <SelectValue placeholder="اختر الدور" />
                  </SelectTrigger>
                  <SelectContent className="z-50 bg-white dark:bg-[#131b2e] border border-slate-200 dark:border-slate-800 rounded-xl shadow-xl">
                    {ROLE_OPTIONS.map((opt) => (
                      <SelectItem key={opt.value} value={opt.value} className="">
                        {opt.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            </div>
            <div>
              <Label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">الفرع المخصص</Label>
              {editTarget.role === 'super_admin' || editTarget.role === 'owner' ? (
                <Input type="text" value={branchName(editTarget.branch_id)} disabled className="h-10 bg-slate-50 dark:bg-slate-900 text-xs" />
              ) : (
                <Select value={eBranchId} onValueChange={setEBranchId}>
                  <SelectTrigger className="w-full h-10 rounded-xl bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-xs font-bold">
                    <SelectValue placeholder="اختر الفرع" />
                  </SelectTrigger>
                  <SelectContent className="z-50 bg-white dark:bg-[#131b2e] border border-slate-200 dark:border-slate-800 rounded-xl shadow-xl">
                    {branches.map((b) => (
                      <SelectItem key={b.id} value={b.id} className="">
                        {b.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">القسم / الإدارة</Label>
              <Select value={eDepartmentId} onValueChange={setEDepartmentId}>
                <SelectTrigger className="w-full h-10 rounded-xl bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-xs font-bold">
                  <SelectValue placeholder="اختر القسم" />
                </SelectTrigger>
                <SelectContent className="z-50 bg-white dark:bg-[#131b2e] border border-slate-200 dark:border-slate-800 rounded-xl shadow-xl">
                  {departments.map((d) => (
                    <SelectItem key={d.id} value={d.id}>
                      {d.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">المسمى الوظيفي</Label>
              <Input type="text" value={eJobTitle} onChange={(e) => setEJobTitle(e.target.value)} className="h-10 bg-slate-50 dark:bg-slate-900 text-sm" />
            </div>
          </div>

          <div>
            <Label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">إعادة تعيين رمز PIN (اتركه فارغاً للإبقاء)</Label>
            <Input type="password" maxLength={6} placeholder="رمز جديد" value={ePinCode} onChange={(e) => setEPinCode(e.target.value)} className="h-10 bg-slate-50 dark:bg-slate-900 text-sm font-mono text-center tracking-widest" />
          </div>

          <ModalFooter onCancel={() => setEditTarget(null)} onSave={handleEditEmployee} isSaving={isSaving} saveLabel="حفظ التعديلات" />
        </Modal>
      )}
    </AppShell>
  );
}

interface ModalProps {
  title: string;
  onClose: () => void;
  children: React.ReactNode;
}

function Modal({ title, onClose, children }: ModalProps) {
  return (
    <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-white dark:bg-[#131b2e] rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 w-full max-w-lg p-6" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between pb-4 mb-4 border-b border-slate-100 dark:border-slate-800">
          <h3 className="text-base font-black text-slate-900 dark:text-white">{title}</h3>
          <button onClick={onClose} className="h-8 w-8 flex items-center justify-center rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-500 hover:text-slate-700 cursor-pointer">
            <Icons.X />
          </button>
        </div>
        <div className="space-y-4">{children}</div>
      </div>
    </div>
  );
}

function FormError({ message }: { message: string }) {
  return (
    <div className="rounded-xl bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800 px-4 py-3 text-xs font-bold text-red-700 dark:text-red-300">
      {message}
    </div>
  );
}

function ModalFooter({
  onCancel,
  onSave,
  isSaving,
  saveLabel,
}: {
  onCancel: () => void;
  onSave: () => void;
  isSaving: boolean;
  saveLabel: string;
}) {
  return (
    <div className="flex items-center justify-end gap-2 pt-4 border-t border-slate-100 dark:border-slate-800">
      <Button type="button" variant="outline" onClick={onCancel} className="h-10 px-4 text-xs font-bold">
        إلغاء
      </Button>
      <Button onClick={onSave} disabled={isSaving} className="h-10 px-6 bg-[#558b2f] hover:bg-[#436d25] text-white text-xs font-bold rounded-xl shadow-xs">
        {isSaving ? 'جارِ الحفظ...' : saveLabel}
      </Button>
    </div>
  );
}

function Kpi({ label, value, accent }: { label: string; value: string; accent: string }) {
  return (
    <div className="rounded-2xl bg-white dark:bg-[#131b2e] border border-slate-200/80 dark:border-slate-800 p-4">
      <div className="text-[10px] font-black text-slate-400">{label}</div>
      <div className="mt-1 text-lg font-black" style={{ color: accent }}>{value}</div>
    </div>
  );
}

export default function EmployeesPage() {
  return <EmployeesContent />;
}