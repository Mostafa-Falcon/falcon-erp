'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { AppShell } from '@/components/layout/AppShell';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  ArrowRight,
  User,
  Phone,
  Briefcase,
  Store,
  Hash,
  Wallet,
  Clock,
  PlusCircle,
  MinusCircle,
  Calculator,
  Lock,
  Mail,
  Key,
  ShieldCheck,
  CheckCircle2,
  Zap,
  Save,
  Trash2,
  Activity,
  Archive,
  ShoppingBag,
  ShoppingBasket
} from 'lucide-react';
import { useSessionStore } from '@/core/state/useSessionStore';
import { EmployeeRepository, type CreateEmployeeDTO } from '@/modules/employees/employee_repository';
import { DepartmentRepository } from '@/modules/employees/department_repository';
import type { Branch, Department, UserRole } from '@/types';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { formatNumber } from '@/lib/format';

import { getSubscriptionPermissions } from '@/core/constants/subscription_profiles';

export default function AddEmployeePage() {
  const router = useRouter();
  const { currentUser } = useSessionStore();
  const orgId = currentUser?.org_id || '';

  const [branches, setBranches] = useState<Branch[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    const checkPerms = async () => {
      if (!orgId) return;
      const { db } = await import('@/core/db/app_database');
      const org = await db.organizations.get(orgId);
      const perms = getSubscriptionPermissions(
        org?.subscription_tier,
        org?.subscription_expires_at ? new Date(org.subscription_expires_at) < new Date() : false
      );
      if (!perms.canManageEmployees) {
        toast.error('الحساب القياسي مخصص لصاحب المنشأة فقط (يمكنك فتح نفس الحساب على أجهزة متعددة). لإنشاء حسابات موظفين مستقلين يرجى ترقية الاشتراك لـ VIP.');
        router.replace('/employees/directory');
      }
    };
    checkPerms();
  }, [orgId, router]);

  // Form State
  const [fullName, setFullName] = useState('');
  const [departmentId, setDepartmentId] = useState('');
  const [jobTitle, setJobTitle] = useState('');
  const [hireDate, setHireDate] = useState(new Date().toISOString().split('T')[0]);
  const [annualLeaveDays, setAnnualLeaveDays] = useState('21');
  const [phone, setPhone] = useState('');
  const [role, setRole] = useState<UserRole>('supervisor');
  const [branchId, setBranchId] = useState('');
  const [pinCode, setPinCode] = useState('1234');

  const [basicSalary, setBasicSalary] = useState('');
  const [salaryCycle, setSalaryCycle] = useState('monthly');
  const [deductions, setDeductions] = useState('');
  const [allowances, setAllowances] = useState('');

  const [allowLogin, setAllowLogin] = useState(true);
  const [password, setPassword] = useState('');
  const [email, setEmail] = useState('');

  const [permissions, setPermissions] = useState<string[]>([
    'dashboard_view',
    'inventory_view',
    'sales_view',
    'sales_pos'
  ]);

  useEffect(() => {
    if (!orgId) return;
    const loadBranches = async () => {
      const { db } = await import('@/core/db/app_database');
      const list = await db.branches.where('org_id').equals(orgId).toArray();
      setBranches(list);
      if (list.length > 0) setBranchId(list.find(b => b.is_main)?.id || list[0].id);
    };
    const loadDepartments = async () => {
      const list = await DepartmentRepository.getAll(orgId);
      setDepartments(list.filter((d) => d.is_active));
    };
    loadBranches();
    loadDepartments();
  }, [orgId]);

  const togglePermission = (perm: string) => {
    setPermissions(prev =>
      prev.includes(perm) ? prev.filter(p => p !== perm) : [...prev, perm]
    );
  };

  const applyTemplate = (template: string) => {
    switch (template) {
      case 'supervisor':
        setRole('supervisor');
        setPermissions(['dashboard_view', 'inventory_view', 'inventory_add', 'inventory_edit', 'sales_view', 'sales_pos', 'purchases_view', 'customers_view']);
        break;
      case 'cashier':
        setRole('cashier');
        setPermissions(['sales_view', 'sales_pos']);
        break;
      case 'warehouse':
        setRole('warehouse_keeper');
        setPermissions(['inventory_view', 'inventory_add', 'inventory_edit', 'inventory_transfer', 'inventory_adjust']);
        break;
      case 'accountant':
        setRole('accountant');
        setPermissions(['dashboard_view', 'finance_view', 'finance_add', 'reports_view', 'purchases_view', 'sales_view', 'customers_view']);
        break;
    }
  };

  const handleSave = async () => {
    if (!fullName.trim() || !phone.trim() || !role || !branchId) {
      toast.error('يرجى إكمال البيانات الأساسية للموظف');
      return;
    }

    if (allowLogin && (!password || !email)) {
      toast.error('يرجى تعيين البريد الإلكتروني وكلمة المرور للسماح بتسجيل الدخول');
      return;
    }

    setIsSaving(true);
    try {
      const username = email ? email.split('@')[0] : `user_${Date.now()}`;

      const dto: CreateEmployeeDTO = {
        org_id: orgId,
        branch_id: branchId,
        full_name: fullName.trim(),
        username: username,
        email: allowLogin ? email : undefined,
        phone: phone,
        role: role,
        pin_code: pinCode,
        password: allowLogin ? password : undefined,
        department_id: departmentId || null,
        job_title: jobTitle,
        hire_date: hireDate,
        annual_leave_days: Number(annualLeaveDays) || 21,
        basic_salary: Number(basicSalary) || 0,
        salary_cycle: salaryCycle as any,
        deductions: Number(deductions) || 0,
        allowances: Number(allowances) || 0,
        permissions: permissions
      };

      await EmployeeRepository.addEmployee(dto);
      toast.success('تمت إضافة الموظف بنجاح');
      router.push('/employees/directory');
    } catch (err: any) {
      toast.error(err.message || 'حدث خطأ أثناء الحفظ');
    } finally {
      setIsSaving(false);
    }
  };

  const netSalary = (Number(basicSalary) || 0) + (Number(allowances) || 0) - (Number(deductions) || 0);

  return (
    <AppShell
      title="إضافة موظف جديد للنظام"
      subtitle="تسجيل موظف جديد وضبط الرواتب وحساب تسجيل الدخول وتحديد الصلاحيات بدقة"
    >
      <div className="space-y-6 text-right pb-6 pt-4 px-2 sm:px-4" dir="rtl">

        {/* Top Actions */}
        <div className="flex items-center gap-3">
          <Button variant="ghost" onClick={() => router.back()} className="h-10 px-4 text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white rounded-xl gap-2 font-bold text-xs bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 transition-colors">
            <ArrowRight className="w-4 h-4" /> العودة للدليل
          </Button>
        </div>

        {/* Form Grid Section */}
        <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">

          {/* Right Column - Input Forms (Takes 2 spans on large screens) */}
          <div className="lg:col-span-2 space-y-6">

            {/* Section 1: Personal Info */}
            <div className="bg-white dark:bg-[#131b2e] rounded-3xl border border-slate-200/80 dark:border-slate-800 shadow-xs overflow-hidden relative group">
              <div className="p-6 md:p-8">
                <div className="flex items-center justify-between mb-8 pb-5 border-b border-slate-100 dark:border-slate-800">
                  <div className="flex items-center gap-4">
                     <div className="w-12 h-12 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center shadow-inner group-hover:scale-105 transition-transform">
                        <User className="w-6 h-6" />
                     </div>
                     <div>
                        <h3 className="text-lg font-black text-slate-900 dark:text-white">البيانات الشخصية والوظيفية</h3>
                        <p className="text-xs font-bold text-slate-400 mt-1">المعلومات الأساسية للهوية والمهام والفرع التابع له الموظف.</p>
                     </div>
                  </div>
                </div>

                <div className="space-y-6">
                   <div className="space-y-2">
                      <Label className="text-xs font-black text-slate-700 dark:text-slate-300">الاسم الرباعي للموظف <span className="text-red-500">*</span></Label>
                      <div className="relative group/input">
                        <Input
                          value={fullName}
                          onChange={e => setFullName(e.target.value)}
                          placeholder="مثال: د. أحمد محمد محمود"
                          className="h-12 bg-slate-50/50 dark:bg-slate-900/50 border-slate-200 dark:border-slate-800 pr-11 text-sm font-bold rounded-xl focus:bg-white dark:focus:bg-slate-900 transition-colors shadow-xs"
                        />
                        <User className="absolute right-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400 group-focus-within/input:text-blue-500 transition-colors" />
                      </div>
                   </div>

                   <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div className="space-y-2">
                        <Label className="text-xs font-black text-slate-700 dark:text-slate-300">القسم / الإدارة</Label>
                        <Select value={departmentId} onValueChange={setDepartmentId}>
                          <SelectTrigger className="h-12 bg-slate-50/50 dark:bg-slate-900/50 border-slate-200 dark:border-slate-800 rounded-xl text-sm font-black focus:bg-white dark:focus:bg-slate-900 shadow-xs">
                            <SelectValue placeholder="اختر القسم" />
                          </SelectTrigger>
                          <SelectContent className="rounded-xl shadow-xl border-slate-200 dark:border-slate-800">
                            {departments.length === 0 ? (
                              <div className="px-3 py-2 text-[11px] font-bold text-slate-400">
                                لا توجد أقسام — أضفها من الهيكل والأقسام
                              </div>
                            ) : (
                              departments.map((d) => (
                                <SelectItem key={d.id} value={d.id} className="py-2.5">
                                  <div className="flex items-center gap-2.5">
                                    <Briefcase className="w-4 h-4 text-slate-400" /> {d.name}
                                  </div>
                                </SelectItem>
                              ))
                            )}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-2">
                        <Label className="text-xs font-black text-slate-700 dark:text-slate-300">رقم الهاتف / الواتساب <span className="text-red-500">*</span></Label>
                        <div className="relative group/input">
                          <Input
                            value={phone}
                            onChange={e => setPhone(e.target.value)}
                            placeholder="01xxxxxxxxx"
                            className="h-12 bg-slate-50/50 dark:bg-slate-900/50 border-slate-200 dark:border-slate-800 pr-11 text-sm font-bold rounded-xl focus:bg-white dark:focus:bg-slate-900 transition-colors shadow-xs font-mono"
                          />
                          <Phone className="absolute right-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400 group-focus-within/input:text-blue-500 transition-colors" />
                        </div>
                      </div>
                   </div>

                   <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div className="space-y-2">
                        <Label className="text-xs font-black text-slate-700 dark:text-slate-300">المسمى الوظيفي ودور الحساب <span className="text-red-500">*</span></Label>
                        <Select value={role} onValueChange={(v: any) => setRole(v)}>
                          <SelectTrigger className="h-12 bg-slate-50/50 dark:bg-slate-900/50 border-slate-200 dark:border-slate-800 rounded-xl text-sm font-black focus:bg-white dark:focus:bg-slate-900 shadow-xs">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent className="rounded-xl shadow-xl border-slate-200 dark:border-slate-800">
                            <SelectItem value="supervisor" className="py-2.5"><div className="flex items-center gap-2.5"><Briefcase className="w-4 h-4 text-slate-400"/> مشرف عام (Supervisor)</div></SelectItem>
                            <SelectItem value="manager" className="py-2.5"><div className="flex items-center gap-2.5"><Briefcase className="w-4 h-4 text-slate-400"/> مدير فرع (Manager)</div></SelectItem>
                            <SelectItem value="cashier" className="py-2.5"><div className="flex items-center gap-2.5"><Briefcase className="w-4 h-4 text-slate-400"/> كاشير (Cashier)</div></SelectItem>
                            <SelectItem value="warehouse_keeper" className="py-2.5"><div className="flex items-center gap-2.5"><Briefcase className="w-4 h-4 text-slate-400"/> أمين مخزن (Warehouse)</div></SelectItem>
                            <SelectItem value="accountant" className="py-2.5"><div className="flex items-center gap-2.5"><Briefcase className="w-4 h-4 text-slate-400"/> محاسب (Accountant)</div></SelectItem>
                            <SelectItem value="delivery" className="py-2.5"><div className="flex items-center gap-2.5"><Briefcase className="w-4 h-4 text-slate-400"/> عامل توصيل (Delivery)</div></SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-2">
                        <Label className="text-xs font-black text-slate-700 dark:text-slate-300">الفرع المخصص للعمل <span className="text-red-500">*</span></Label>
                        <Select value={branchId} onValueChange={setBranchId}>
                          <SelectTrigger className="h-12 bg-slate-50/50 dark:bg-slate-900/50 border-slate-200 dark:border-slate-800 rounded-xl text-sm font-black focus:bg-white dark:focus:bg-slate-900 shadow-xs">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent className="rounded-xl shadow-xl border-slate-200 dark:border-slate-800">
                            {branches.map(b => (
                              <SelectItem key={b.id} value={b.id} className="py-2.5">
                                <div className="flex items-center gap-2.5"><Store className="w-4 h-4 text-slate-400"/> {b.name}</div>
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                   </div>

                   <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                      <div className="space-y-2">
                        <Label className="text-xs font-black text-slate-700 dark:text-slate-300">المسمى الوظيفي</Label>
                        <div className="relative group/input">
                          <Input
                            value={jobTitle}
                            onChange={e => setJobTitle(e.target.value)}
                            placeholder="مثال: محاسب أول، بائع..."
                            className="h-12 bg-slate-50/50 dark:bg-slate-900/50 border-slate-200 dark:border-slate-800 pr-11 text-sm font-bold rounded-xl focus:bg-white dark:focus:bg-slate-900 transition-colors shadow-xs"
                          />
                          <Briefcase className="absolute right-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400 group-focus-within/input:text-blue-500 transition-colors" />
                        </div>
                      </div>
                      <div className="space-y-2">
                        <Label className="text-xs font-black text-slate-700 dark:text-slate-300">تاريخ التعيين</Label>
                        <div className="relative group/input">
                          <Input
                            type="date"
                            value={hireDate}
                            onChange={e => setHireDate(e.target.value)}
                            className="h-12 bg-slate-50/50 dark:bg-slate-900/50 border-slate-200 dark:border-slate-800 pr-11 text-sm font-bold rounded-xl focus:bg-white dark:focus:bg-slate-900 transition-colors shadow-xs"
                          />
                          <Clock className="absolute right-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400 group-focus-within/input:text-blue-500 transition-colors" />
                        </div>
                      </div>
                      <div className="space-y-2">
                        <Label className="text-xs font-black text-slate-700 dark:text-slate-300">رصيد الإجازات السنوية (يوم)</Label>
                        <div className="relative group/input">
                          <Input
                            type="number"
                            value={annualLeaveDays}
                            onChange={e => setAnnualLeaveDays(e.target.value)}
                            placeholder="21"
                            className="h-12 bg-slate-50/50 dark:bg-slate-900/50 border-slate-200 dark:border-slate-800 pr-11 text-base font-black rounded-xl focus:bg-white dark:focus:bg-slate-900 shadow-xs font-mono text-left"
                            dir="ltr"
                          />
                          <Clock className="absolute right-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400 group-focus-within/input:text-blue-500 transition-colors" />
                        </div>
                      </div>
                   </div>

                   <div className="space-y-2 pt-2 border-t border-slate-100 dark:border-slate-800">
                     <Label className="text-xs font-black text-slate-700 dark:text-slate-300">رمز PIN السريع (للكاشير ونقاط البيع)</Label>
                     <div className="relative max-w-sm group/input">
                        <Input
                          value={pinCode}
                          onChange={e => setPinCode(e.target.value)}
                          maxLength={4}
                          placeholder="4 أرقام (مثال: 1234)"
                          className="h-12 bg-slate-50/50 dark:bg-slate-900/50 border-slate-200 dark:border-slate-800 pr-11 text-base font-black rounded-xl focus:bg-white dark:focus:bg-slate-900 transition-colors shadow-xs font-mono tracking-[0.5em]"
                        />
                        <Hash className="absolute right-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400 group-focus-within/input:text-blue-500 transition-colors" />
                     </div>
                     <p className="text-[10px] font-bold text-slate-400 mt-1">يُسخدم لتسجيل الدخول السريع لشاشة نقطة البيع (POS).</p>
                   </div>
                </div>
              </div>
            </div>

            {/* Section 2: Payroll */}
            <div className="bg-white dark:bg-[#131b2e] rounded-3xl border border-slate-200/80 dark:border-slate-800 shadow-xs overflow-hidden relative group">
              <div className="p-6 md:p-8">
                <div className="flex items-center justify-between mb-8 pb-5 border-b border-slate-100 dark:border-slate-800">
                  <div className="flex items-center gap-4">
                     <div className="w-12 h-12 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center shadow-inner group-hover:scale-105 transition-transform">
                        <Wallet className="w-6 h-6" />
                     </div>
                     <div>
                        <h3 className="text-lg font-black text-slate-900 dark:text-white">نظام الرواتب والأجور والبدلات</h3>
                        <p className="text-xs font-bold text-slate-400 mt-1">تحديد القيمة المالية وطريقة احتساب الأجر والاستقطاعات الشهرية.</p>
                     </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <Label className="text-xs font-black text-slate-700 dark:text-slate-300">دورة احتساب الراتب</Label>
                    <Select value={salaryCycle} onValueChange={setSalaryCycle}>
                      <SelectTrigger className="h-12 bg-slate-50/50 dark:bg-slate-900/50 border-slate-200 dark:border-slate-800 rounded-xl text-sm font-black focus:bg-white dark:focus:bg-slate-900 shadow-xs">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="rounded-xl shadow-xl border-slate-200 dark:border-slate-800">
                        <SelectItem value="monthly" className="py-2.5"><div className="flex items-center gap-2.5"><Clock className="w-4 h-4 text-slate-400"/> راتب شهري منتظم</div></SelectItem>
                        <SelectItem value="weekly" className="py-2.5"><div className="flex items-center gap-2.5"><Clock className="w-4 h-4 text-slate-400"/> أسبوعي</div></SelectItem>
                        <SelectItem value="daily" className="py-2.5"><div className="flex items-center gap-2.5"><Clock className="w-4 h-4 text-slate-400"/> يومية (اليوميات)</div></SelectItem>
                        <SelectItem value="hourly" className="py-2.5"><div className="flex items-center gap-2.5"><Clock className="w-4 h-4 text-slate-400"/> بالساعة</div></SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label className="text-xs font-black text-slate-700 dark:text-slate-300">الراتب الأساسي الشهري (ج.م)</Label>
                    <div className="relative group/input">
                      <Input
                        type="number"
                        value={basicSalary}
                        onChange={e => setBasicSalary(e.target.value)}
                        placeholder="0.00"
                        className="h-12 bg-slate-50/50 dark:bg-slate-900/50 border-slate-200 dark:border-slate-800 pr-11 text-base font-black rounded-xl focus:bg-white dark:focus:bg-slate-900 font-mono text-left shadow-xs transition-colors"
                        dir="ltr"
                      />
                      <Wallet className="absolute right-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400 group-focus-within/input:text-blue-500 transition-colors" />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label className="text-xs font-black text-emerald-700 dark:text-emerald-400">البدلات والمكافآت الثابتة (ج.م)</Label>
                    <div className="relative group/input">
                      <Input
                        type="number"
                        value={allowances}
                        onChange={e => setAllowances(e.target.value)}
                        placeholder="0.00"
                        className="h-12 bg-emerald-50/30 dark:bg-emerald-950/20 border-emerald-200/50 dark:border-emerald-800/50 pr-11 text-base font-black rounded-xl focus:bg-white dark:focus:bg-slate-900 font-mono text-left text-emerald-600 dark:text-emerald-400 shadow-xs transition-colors focus:border-emerald-500 focus:ring-emerald-500/20"
                        dir="ltr"
                      />
                      <PlusCircle className="absolute right-4 top-1/2 -translate-y-1/2 w-5 h-5 text-emerald-500" />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label className="text-xs font-black text-red-700 dark:text-red-400">الاستقطاعات والتأمينات (ج.م)</Label>
                    <div className="relative group/input">
                      <Input
                        type="number"
                        value={deductions}
                        onChange={e => setDeductions(e.target.value)}
                        placeholder="0.00"
                        className="h-12 bg-red-50/30 dark:bg-red-950/20 border-red-200/50 dark:border-red-800/50 pr-11 text-base font-black rounded-xl focus:bg-white dark:focus:bg-slate-900 font-mono text-left text-red-600 dark:text-red-400 shadow-xs transition-colors focus:border-red-500 focus:ring-red-500/20"
                        dir="ltr"
                      />
                      <MinusCircle className="absolute right-4 top-1/2 -translate-y-1/2 w-5 h-5 text-red-400" />
                    </div>
                  </div>
                </div>

                <div className="mt-8 bg-gradient-to-l from-emerald-50 to-white dark:from-emerald-950/30 dark:to-[#131b2e] border border-emerald-100 dark:border-emerald-900/50 rounded-2xl p-5 flex flex-col md:flex-row items-center justify-between gap-4 shadow-xs">
                   <div className="flex items-center gap-4">
                     <div className="w-12 h-12 rounded-2xl bg-emerald-100 dark:bg-emerald-900/50 flex items-center justify-center">
                       <Calculator className="w-6 h-6 text-emerald-600 dark:text-emerald-400" />
                     </div>
                     <div>
                       <h4 className="text-sm font-black text-emerald-950 dark:text-emerald-100">صافي الراتب التقديري المستحق للموظف:</h4>
                       <p className="text-xs font-bold text-emerald-600/80 dark:text-emerald-400/80 mt-1 font-mono">
                         {formatNumber(Number(basicSalary)||0)} (أساسي) + {formatNumber(Number(allowances)||0)} (بدلات) - {formatNumber(Number(deductions)||0)} (خصومات)
                       </p>
                     </div>
                   </div>
                   <div className="text-3xl font-black text-emerald-700 dark:text-emerald-400 font-mono tracking-tight" dir="ltr">
                     {formatNumber(netSalary)} <span className="text-sm font-sans opacity-70">ج.م</span>
                   </div>
                </div>
              </div>
            </div>

            {/* Section 3: Login Settings */}
            <div className="bg-white dark:bg-[#131b2e] rounded-3xl border border-slate-200/80 dark:border-slate-800 shadow-xs overflow-hidden relative group">
              <div className="p-6 md:p-8">
                <div className="flex items-center justify-between mb-8 pb-5 border-b border-slate-100 dark:border-slate-800">
                  <div className="flex items-center gap-4">
                     <div className="w-12 h-12 rounded-2xl bg-sky-50 text-sky-600 flex items-center justify-center shadow-inner group-hover:scale-105 transition-transform">
                        <Lock className="w-6 h-6" />
                     </div>
                     <div>
                        <h3 className="text-lg font-black text-slate-900 dark:text-white">إعدادات الحساب وتسجيل الدخول</h3>
                        <p className="text-xs font-bold text-slate-400 mt-1">تفعيل وصول الموظف للبرنامج، وتعيين البريد وكلمة المرور للدخول.</p>
                     </div>
                  </div>
                </div>

                <div className="space-y-6">
                  <div className={cn("flex items-center justify-between p-5 rounded-2xl border transition-all", allowLogin ? "border-blue-200 bg-blue-50/40 dark:border-blue-900/50 dark:bg-blue-950/20" : "border-slate-100 bg-slate-50/50 dark:border-slate-800 dark:bg-slate-900/50")}>
                     <div>
                        <h4 className={cn("text-sm font-black flex items-center gap-2", allowLogin ? "text-blue-900 dark:text-blue-400" : "text-slate-700 dark:text-slate-300")}>السماح للموظف بتسجيل الدخول للبرنامج {allowLogin && <CheckCircle2 className="w-4 h-4 text-blue-600 dark:text-blue-500" />}</h4>
                        <p className={cn("text-xs font-bold mt-1.5", allowLogin ? "text-blue-600/80 dark:text-blue-400/80" : "text-slate-500")}>الموظف يمتلك بريداً وكلمة مرور ويستطيع الدخول للنظام واستخدامه وفق الصلاحيات الممنوحة له.</p>
                     </div>
                     <Switch checked={allowLogin} onCheckedChange={setAllowLogin} className="data-[state=checked]:bg-blue-600 scale-110" />
                  </div>

                  {allowLogin && (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 animate-in fade-in slide-in-from-top-2 duration-300 pt-2">
                      <div className="space-y-2">
                        <Label className="text-xs font-black text-slate-700 dark:text-slate-300">البريد الإلكتروني لتسجيل الدخول <span className="text-red-500">*</span></Label>
                        <div className="relative group/input">
                          <Input
                            type="email"
                            value={email}
                            onChange={e => setEmail(e.target.value)}
                            placeholder="user@company.com"
                            className="h-12 bg-slate-50/50 dark:bg-slate-900/50 border-slate-200 dark:border-slate-800 pr-11 text-sm font-bold rounded-xl focus:bg-white dark:focus:bg-slate-900 font-mono text-left shadow-xs transition-colors"
                            dir="ltr"
                          />
                          <Mail className="absolute right-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400 group-focus-within/input:text-blue-500 transition-colors" />
                        </div>
                        <p className="text-[10px] font-bold text-slate-400 flex items-center gap-1.5 mt-2"><CheckCircle2 className="w-3.5 h-3.5 text-emerald-500"/> حساب الموظف يعمل في وضع الأونلاين (السحابي) وكذلك الأوفلاين.</p>
                      </div>
                      <div className="space-y-2">
                        <Label className="text-xs font-black text-slate-700 dark:text-slate-300">كلمة المرور للدخول <span className="text-red-500">*</span></Label>
                        <div className="relative group/input">
                          <Input
                            type="password"
                            value={password}
                            onChange={e => setPassword(e.target.value)}
                            placeholder="********"
                            className="h-12 bg-slate-50/50 dark:bg-slate-900/50 border-slate-200 dark:border-slate-800 pr-11 text-base font-black rounded-xl focus:bg-white dark:focus:bg-slate-900 font-mono text-left tracking-[0.3em] shadow-xs transition-colors"
                            dir="ltr"
                          />
                          <Key className="absolute right-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400 group-focus-within/input:text-blue-500 transition-colors" />
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>

          </div>

          {/* Left Column - Permissions (Takes 1 span on large screens, sticky behavior) */}
          <div className="lg:col-span-1 lg:sticky lg:top-4 space-y-6">
            {allowLogin && (
              <div className="bg-white dark:bg-[#131b2e] rounded-3xl border border-slate-200/80 dark:border-slate-800 shadow-xs overflow-hidden relative group animate-in fade-in slide-in-from-top-4 duration-300">
                <div className="p-5">
                  <div className="flex flex-col gap-3 mb-6 pb-4 border-b border-slate-100 dark:border-slate-800">
                    <div className="flex items-center gap-3">
                       <div className="w-10 h-10 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center shadow-inner">
                          <ShieldCheck className="w-5 h-5" />
                       </div>
                       <div>
                          <h3 className="text-sm font-black text-slate-900 dark:text-white">مصفوفة صلاحيات الوصول</h3>
                          <p className="text-[10px] font-bold text-slate-400 mt-0.5">تحديد الشاشات المسموح بها للموظف.</p>
                       </div>
                    </div>
                    <Button variant="ghost" onClick={() => setPermissions([])} className="h-8 px-3 text-red-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/30 rounded-lg text-[10px] font-black gap-1.5 transition-colors self-end">
                      <Trash2 className="w-3.5 h-3.5" /> مسح الكل
                    </Button>
                  </div>

                  {/* Quick Templates */}
                  <div className="mb-6 bg-slate-50/50 dark:bg-slate-900/50 p-3 rounded-2xl border border-slate-100 dark:border-slate-800/80">
                    <p className="text-[10px] font-black text-amber-600 dark:text-amber-500 mb-2 flex items-center gap-1"><Zap className="w-3.5 h-3.5"/> القوالب السريعة:</p>
                    <div className="grid grid-cols-2 gap-2">
                      <Button variant="outline" onClick={() => applyTemplate('supervisor')} className="h-8 rounded-xl border-blue-100 text-blue-700 bg-white text-[10px] font-black gap-1 transition-all"><Zap className="w-3 h-3"/> مشرف</Button>
                      <Button variant="outline" onClick={() => applyTemplate('cashier')} className="h-8 rounded-xl border-teal-100 text-teal-700 bg-white text-[10px] font-black gap-1 transition-all"><Zap className="w-3 h-3"/> كاشير</Button>
                      <Button variant="outline" onClick={() => applyTemplate('warehouse')} className="h-8 rounded-xl border-emerald-100 text-emerald-700 bg-white text-[10px] font-black gap-1 transition-all"><Zap className="w-3 h-3"/> مخزن</Button>
                      <Button variant="outline" onClick={() => applyTemplate('accountant')} className="h-8 rounded-xl border-purple-100 text-purple-700 bg-white text-[10px] font-black gap-1 transition-all"><Zap className="w-3 h-3"/> محاسب</Button>
                    </div>
                  </div>

                  {/* Permission Accordions Stack */}
                  <div className="space-y-4 max-h-[50vh] overflow-y-auto pl-1 custom-scrollbar">

                     <PermissionSection
                       title="لوحة المتابعة"
                       icon={<Activity className="w-4 h-4 opacity-80" />}
                       color="blue"
                       items={[
                         { id: 'dashboard_view', label: 'عرض لوحة المتابعة', desc: 'الإحصائيات والأرباح' }
                       ]}
                       selected={permissions}
                       onToggle={togglePermission}
                     />

                     <PermissionSection
                       title="المخزون والأصناف"
                       icon={<Archive className="w-4 h-4 opacity-80" />}
                       color="emerald"
                       items={[
                         { id: 'inventory_view', label: 'عرض الأصناف', desc: 'تصفح دليل الأصناف والكميات' },
                         { id: 'inventory_add', label: 'إضافة أصناف جديدة', desc: 'تسجيل صنف جديد' },
                         { id: 'inventory_edit', label: 'تعديل بيانات الأصناف', desc: 'تعديل الأسعار والباركوود' },
                         { id: 'inventory_transfer', label: 'التحويل المخزني', desc: 'نقل الكميات بين الفروع' },
                         { id: 'inventory_adjust', label: 'الجرد والتسويات', desc: 'تسجيل الجرد الفعلي ومطابقة العجز' },
                       ]}
                       selected={permissions}
                       onToggle={togglePermission}
                     />

                     <PermissionSection
                       title="المبيعات ونقاط البيع"
                       icon={<ShoppingBag className="w-4 h-4 opacity-80" />}
                       color="teal"
                       items={[
                         { id: 'sales_pos', label: 'شاشة نقطة البيع (POS)', desc: 'إصدار فواتير المبيعات' },
                         { id: 'sales_view', label: 'عرض الفواتير', desc: 'تصفح سجل الفواتير والمبيعات السابقة' },
                         { id: 'sales_return', label: 'مرتجع المبيعات', desc: 'معالجة وتنفيذ إرجاع الفواتير' },
                       ]}
                       selected={permissions}
                       onToggle={togglePermission}
                     />

                     <PermissionSection
                       title="المشتريات والتوريدات"
                       icon={<ShoppingBasket className="w-4 h-4 opacity-80" />}
                       color="amber"
                       items={[
                         { id: 'purchases_view', label: 'عرض المشتريات', desc: 'الاطلاع على فواتير الشراء والتوريد' },
                         { id: 'purchases_add', label: 'إدخال فواتير مشتريات', desc: 'إدخال فواتير شراء وأصناف جديدة' },
                         { id: 'purchases_return', label: 'مرتجع مشتريات', desc: 'إرجاع بضاعة تالفة للموردين' },
                       ]}
                       selected={permissions}
                       onToggle={togglePermission}
                     />

                     <PermissionSection
                       title="المالية والحسابات"
                       icon={<Wallet className="w-4 h-4 opacity-80" />}
                       color="emerald"
                       items={[
                         { id: 'finance_view', label: 'عرض الخزينة', desc: 'أرصدة الخزائن والأدراج والتحويلات' },
                         { id: 'finance_expenses_view', label: 'عرض المصروفات', desc: 'سجل المصروفات والنثريات والمدفوعات' },
                         { id: 'finance_expenses_add', label: 'إضافة مصروفات', desc: 'تسجيل سند صرف أو مصروفات جديدة' },
                         { id: 'finance_journal', label: 'دفتر الأستاذ والقيود', desc: 'دليل الحسابات والقيود المحاسبية' },
                       ]}
                       selected={permissions}
                       onToggle={togglePermission}
                     />

                  </div>
                </div>
              </div>
            )}
          </div>

        </div>

        {/* Bottom Fixed-to-Shell Toolbar Action Bar */}
        <div className="sticky bottom-4 z-40 max-w-7xl mx-auto bg-white/90 dark:bg-[#131b2e]/90 backdrop-blur-md border border-slate-200 dark:border-slate-800 p-4 rounded-3xl shadow-xl flex items-center justify-between gap-4 transition-all mt-4">
           <Button variant="outline" onClick={() => router.back()} className="h-12 px-8 rounded-2xl font-black text-sm border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 bg-white dark:bg-transparent transition-colors cursor-pointer">
             إلغاء والعودة
           </Button>
           <Button onClick={handleSave} disabled={isSaving} className="flex-1 h-12 bg-blue-600 hover:bg-blue-700 text-white rounded-2xl font-black text-sm shadow-lg shadow-blue-500/20 gap-2 transition-all cursor-pointer">
             <Save className="w-5 h-5" />
             {isSaving ? 'جاري الحفظ...' : 'حفظ وتثبيت بيانات الموظف المضافة وصلاحياته'}
           </Button>
        </div>

      </div>
    </AppShell>
  );
}

function PermissionSection({ title, icon, color, items, selected, onToggle }: { title: string, icon: React.ReactNode, color: string, items: any[], selected: string[], onToggle: (id: string) => void }) {
  const colors: Record<string, string> = {
    blue: 'bg-blue-50/50 border-blue-100 text-blue-700 dark:bg-blue-900/20 dark:border-blue-800 dark:text-blue-400',
    emerald: 'bg-emerald-50/50 border-emerald-100 text-emerald-700 dark:bg-emerald-900/20 dark:border-emerald-800 dark:text-emerald-400',
    teal: 'bg-teal-50/50 border-teal-100 text-teal-700 dark:bg-teal-900/20 dark:border-teal-800 dark:text-teal-400',
    amber: 'bg-amber-50/50 border-amber-100 text-amber-700 dark:bg-amber-900/20 dark:border-amber-800 dark:text-amber-400',
  };

  const activeCount = items.filter(i => selected.includes(i.id)).length;

  return (
    <div className="border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden shadow-xs h-full flex flex-col bg-white dark:bg-[#131b2e]">
       <div className={cn("px-4 py-3 border-b flex items-center justify-between", colors[color])}>
         <div className="flex items-center gap-2.5">
            {icon}
            <h4 className="text-sm font-black">{title}</h4>
         </div>
         <span className="text-[10px] font-black bg-white/50 dark:bg-slate-900/50 px-2.5 py-1 rounded-lg border border-white/40 dark:border-slate-700/40">{activeCount} من {items.length}</span>
       </div>
       <div className="p-4 grid grid-cols-1 gap-3 flex-1 content-start">
         {items.map((item: any) => {
           const isActive = selected.includes(item.id);
           return (
             <div
               key={item.id}
               onClick={() => onToggle(item.id)}
               className={cn(
                 "flex items-start gap-3 p-3.5 rounded-xl border transition-all cursor-pointer select-none group/item",
                 isActive
                   ? "border-blue-500 ring-1 ring-blue-500/20 bg-blue-50/40 dark:bg-blue-900/20 dark:border-blue-500/50"
                   : "border-slate-200 dark:border-slate-800 hover:border-blue-300 dark:hover:border-blue-700 hover:bg-slate-50 dark:hover:bg-slate-900/50"
               )}
             >
                <div className="mt-0.5 shrink-0">
                  <div className={cn("w-4.5 h-4.5 rounded-[4px] border flex items-center justify-center transition-all", isActive ? "bg-blue-600 border-blue-600 text-white shadow-sm shadow-blue-500/30 scale-105" : "border-slate-300 bg-white dark:bg-slate-900 dark:border-slate-600 group-hover/item:border-blue-400")}>
                    {isActive && <CheckCircle2 className="w-3.5 h-3.5" />}
                  </div>
                </div>
                <div className="min-w-0">
                  <h5 className={cn("text-xs font-black truncate", isActive ? "text-blue-900 dark:text-blue-400" : "text-slate-800 dark:text-slate-200")}>{item.label}</h5>
                  <p className="text-[10px] font-bold text-slate-400 mt-1 leading-relaxed line-clamp-2">{item.desc}</p>
                </div>
             </div>
           );
         })}
       </div>
    </div>
  );
}

// End of file
