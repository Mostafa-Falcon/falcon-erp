'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { v4 as uuidv4 } from 'uuid';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/components/ui/card';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { AuthBrandingPanel } from '@/components/auth/AuthBrandingPanel';
import { db } from '@/core/db/app_database';
import { supabase, isSupabaseConfigured, setOrgTransportToken, generateOrgTransportToken } from '@/core/supabase/supabase_client';
import { SyncQueueManager } from '@/core/sync/sync_queue_manager';
import { AccountingRepository } from '@/modules/accounting/accounting_repository';
import { useSessionStore } from '@/core/state/useSessionStore';
import type { Organization, Branch, User, Warehouse, Treasury } from '@/types';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { AuthRepository } from '@/modules/auth/auth_repository';
import { toast } from 'sonner';
import { Sun, Moon, Layers, UserPlus, User as UserIcon, Mail, Lock, ShieldCheck, Eye, EyeOff, Store } from 'lucide-react';

export default function RegisterPage() {
  const router = useRouter();
  const { currentUser, setCurrentUser } = useSessionStore();

  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [activityType, setActivityType] = useState('retail');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [isCheckingAuth, setIsCheckingAuth] = useState(true);

  // If already authenticated, redirect to home; if registration disabled, redirect to login
  useEffect(() => {
    const checkRegistrationAndAuth = async () => {
      const storedUser = AuthRepository.getCurrentUser();
      if (storedUser || currentUser) {
        router.replace('/');
        return;
      }

      try {
        const setting = await db.app_settings.get('enable_registration');
        if (setting && setting.value === 'false') {
          toast.error('التسجيل الذاتي مغلق حالياً، يتم إنشاء الحسابات وإدارتها عبر إدارة النظام فقط.');
          router.replace('/login');
          return;
        }
      } catch (err) {
        console.warn('Could not check registration setting:', err);
      }

      setIsCheckingAuth(false);
    };

    checkRegistrationAndAuth();
  }, [currentUser, router]);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const savedTheme = localStorage.getItem('falcon_theme');
      const isDark = savedTheme === 'dark';
      setIsDarkMode(isDark);
      if (isDark) {
        document.documentElement.classList.add('dark');
        document.documentElement.setAttribute('data-theme', 'dark');
      } else {
        document.documentElement.classList.remove('dark');
        document.documentElement.setAttribute('data-theme', 'light');
      }
    }
  }, []);

  const toggleTheme = () => {
    if (typeof window !== 'undefined') {
      const newDark = !isDarkMode;
      setIsDarkMode(newDark);
      if (newDark) {
        document.documentElement.classList.add('dark');
        document.documentElement.setAttribute('data-theme', 'dark');
        localStorage.setItem('falcon_theme', 'dark');
      } else {
        document.documentElement.classList.remove('dark');
        document.documentElement.setAttribute('data-theme', 'light');
        localStorage.setItem('falcon_theme', 'light');
      }
      window.dispatchEvent(new Event('falcon_theme_change'));
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();

    if (password !== confirmPassword) {
      toast.error('كلمة المرور وتأكيدها غير متطابقين.');
      return;
    }

    if (password.length < 4) {
      toast.error('كلمة المرور يجب ألا تقل عن 4 خانات.');
      return;
    }

    setIsLoading(true);

    try {
      const now = new Date().toISOString();
      const orgId = uuidv4();
      const branchId = uuidv4();
      const warehouseId = uuidv4();
      const treasuryId = uuidv4();
      const userId = uuidv4();

      // Per-device transport token: authorizes this device for the org
      // via the `x-falcon-org-token` header (RLS hybrid identity).
      const transportToken = generateOrgTransportToken();

      // Derive clean organization name from owner's name
      const derivedOrgName = `مؤسسة ${fullName.trim()}`;

      // 1. Organization Record
      const newOrg: Organization = {
        id: orgId,
        name: derivedOrgName,
        activity_type: activityType,
        currency: 'EGP',
        transport_token: transportToken,
        is_active: true,
        created_at: now,
        updated_at: now,
        sync_status: 'pending',
      };

      // 2. Main Branch Record
      const newBranch: Branch = {
        id: branchId,
        org_id: orgId,
        code: 'BR-01',
        name: 'الفرع الرئيسي',
        is_main: true,
        is_active: true,
        created_at: now,
        updated_at: now,
        sync_status: 'pending',
      };

      // 3. Main Warehouse Record
      const newWarehouse: Warehouse = {
        id: warehouseId,
        org_id: orgId,
        branch_id: branchId,
        code: 'WH-01',
        name: 'المستودع الرئيسي',
        is_main: true,
        is_active: true,
        created_at: now,
        updated_at: now,
        sync_status: 'pending',
      };

      // 4. Main Safe / Treasury Record
      const newTreasury: Treasury = {
        id: treasuryId,
        org_id: orgId,
        branch_id: branchId,
        name: 'الخزينة الرئيسية',
        account_code: '1110',
        type: 'safe',
        current_balance: 0,
        is_default: true,
        is_active: true,
        created_at: now,
        updated_at: now,
        sync_status: 'pending',
      };

      // 5. Super Admin / Owner User Record
      const newUser: User = {
        id: userId,
        org_id: orgId,
        branch_id: branchId,
        username: email.split('@')[0] || 'admin',
        full_name: fullName.trim(),
        email: email.trim(),
        role: 'super_admin', // Organization Owner
        pin_code_hash: password.trim(),
        is_active: true,
        created_at: now,
        updated_at: now,
        sync_status: 'pending',
      };

      // Standard Units & Expense Categories for the new organization
      const defaultUnits = [
        { id: uuidv4(), org_id: orgId, name: 'قطعة', symbol: 'قطعة', is_active: true, created_at: now, updated_at: now, sync_status: 'pending' as const },
        { id: uuidv4(), org_id: orgId, name: 'علبة', symbol: 'علبة', is_active: true, created_at: now, updated_at: now, sync_status: 'pending' as const },
        { id: uuidv4(), org_id: orgId, name: 'كرتونة', symbol: 'كرتونة', is_active: true, created_at: now, updated_at: now, sync_status: 'pending' as const },
        { id: uuidv4(), org_id: orgId, name: 'شريط', symbol: 'شريط', is_active: true, created_at: now, updated_at: now, sync_status: 'pending' as const },
        { id: uuidv4(), org_id: orgId, name: 'كيلوجرام', symbol: 'كجم', is_active: true, created_at: now, updated_at: now, sync_status: 'pending' as const },
      ];

      const defaultExpenseCategories = [
        { id: uuidv4(), org_id: orgId, name: 'إيجارات ومقرات', code: 'EXP-01', is_active: true, created_at: now, updated_at: now, sync_status: 'pending' as const },
        { id: uuidv4(), org_id: orgId, name: 'كهرباء ومياه ومرافق', code: 'EXP-02', is_active: true, created_at: now, updated_at: now, sync_status: 'pending' as const },
        { id: uuidv4(), org_id: orgId, name: 'رواتب وأجور', code: 'EXP-03', is_active: true, created_at: now, updated_at: now, sync_status: 'pending' as const },
        { id: uuidv4(), org_id: orgId, name: 'مصروفات عمومية وإدارية', code: 'EXP-06', is_active: true, created_at: now, updated_at: now, sync_status: 'pending' as const },
      ];

      // Atomic local storage in Dexie
      await db.transaction(
        'rw',
        [db.organizations, db.branches, db.warehouses, db.treasuries, db.users, db.units, db.expense_categories, db.app_settings, db.sync_queue],
        async () => {
          await db.organizations.put(newOrg);
          await db.branches.put(newBranch);
          await db.warehouses.put(newWarehouse);
          await db.treasuries.put(newTreasury);
          await db.users.put(newUser);
          await db.units.bulkPut(defaultUnits);
          await db.expense_categories.bulkPut(defaultExpenseCategories);
          await db.app_settings.put({
            id: 'org_transport_token',
            org_id: orgId,
            value: transportToken,
            description: 'Organization transport token for RLS (never synced to cloud).',
            updated_at: now,
            sync_status: 'synced',
          });

          await SyncQueueManager.enqueue('organizations', orgId, 'insert', newOrg);
          await SyncQueueManager.enqueue('branches', branchId, 'insert', newBranch);
          await SyncQueueManager.enqueue('warehouses', warehouseId, 'insert', newWarehouse);
          await SyncQueueManager.enqueue('treasuries', treasuryId, 'insert', newTreasury);
          await SyncQueueManager.enqueue('users', userId, 'insert', newUser);
          for (const unit of defaultUnits) {
            await SyncQueueManager.enqueue('units', unit.id, 'insert', unit);
          }
          for (const category of defaultExpenseCategories) {
            await SyncQueueManager.enqueue('expense_categories', category.id, 'insert', category);
          }
        }
      );

      // Seed the default chart of accounts for the new organization
      await AccountingRepository.ensureDefaultChartOfAccounts(orgId);

      // Direct online sync to Supabase if connected
      if (isSupabaseConfigured()) {
        try {
          // Activate the org transport token for every subsequent cloud request
          setOrgTransportToken(transportToken);

          // 1. Register the organization row via SECURITY DEFINER RPC
          //    (no JWT / token exists yet, so the direct INSERT would be blocked by RLS).
          const { error: rpcError } = await supabase.rpc('falcon_register_organization', {
            p_id: orgId,
            p_name: derivedOrgName,
            p_currency: 'EGP',
            p_transport_token: transportToken,
          });
          if (rpcError) {
            throw rpcError;
          }

          // 2. Provision in cloud database via backend admin API route
          try {
            await fetch('/api/auth/register-user', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                email: email.trim(),
                password: password.trim(),
                fullName: fullName.trim(),
                orgId,
                orgName: derivedOrgName,
                activityType,
                transportToken,
                branchId,
                warehouseId,
                treasuryId,
                userId,
                role: 'super_admin',
              }),
            });
          } catch (apiErr) {
            console.warn('Backend auth registration error:', apiErr);
          }

          // 3. Direct client fallback upsert (strip offline-only sync_status)
          const { sync_status: _s1, ...cleanBranch } = newBranch;
          const { sync_status: _s2, ...cleanWarehouse } = newWarehouse;
          const { sync_status: _s3, ...cleanTreasury } = newTreasury;
          const { sync_status: _s4, ...cleanUser } = newUser;

          await supabase.from('branches').upsert(cleanBranch, { onConflict: 'id' });
          await supabase.from('warehouses').upsert(cleanWarehouse, { onConflict: 'id' });
          await supabase.from('treasuries').upsert(cleanTreasury, { onConflict: 'id' });
          await supabase.from('users').upsert(cleanUser, { onConflict: 'id' });

          // 4. Attach session in Supabase Auth client if supported
          try {
            await supabase.auth.signUp({
              email: email.trim(),
              password: password.trim(),
              options: {
                data: {
                  full_name: fullName.trim(),
                  role: 'super_admin',
                  org_id: orgId,
                },
              },
            });
          } catch (signUpErr) {
            console.warn('Client-side signUp skipped:', signUpErr);
          }
        } catch (cloudErr) {
          console.warn('Supabase cloud registration queued:', cloudErr);
        }
      }

      // Establish session and enter application
      toast.success('تم إنشاء حساب المنشأة بنجاح! مرحباً بك في منظومتك');
      setCurrentUser(newUser);
      router.replace('/');
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'حدث خطأ أثناء إنشاء الحساب.';
      toast.error(msg);
    } finally {
      setIsLoading(false);
    }
  };

  if (isCheckingAuth || currentUser) {
    return (
      <div className="min-h-screen w-full flex items-center justify-center bg-slate-50 dark:bg-[#070b18]">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
          <span className="text-xs font-bold text-slate-500 dark:text-slate-400">جاري التحقق من الجلسة...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen w-full flex flex-col lg:flex-row bg-slate-50 dark:bg-[#070b18] select-none overflow-x-hidden transition-colors duration-300">
      {/* 1. Mobile & Tablet Top Branding Banner (< lg) */}
      <div className="lg:hidden w-full bg-gradient-to-br from-[#0a1026] via-[#0f1738] to-[#070b1a] text-white px-6 py-8 flex flex-col items-center text-center shadow-lg relative overflow-hidden">
        <div className="absolute -top-16 -right-16 w-44 h-44 rounded-full bg-blue-600/20 blur-[60px] pointer-events-none" />

        {/* Compact Emblem */}
        <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-blue-500 via-indigo-600 to-cyan-500 flex items-center justify-center shadow-lg p-3 mb-3 z-10">
          <Layers className="w-8 h-8 text-white stroke-[2.2]" />
        </div>

        <h1 className="text-2xl font-black text-white tracking-tight z-10">
          Falcon ERP
        </h1>
        <p className="text-xs font-semibold text-blue-200/90 z-10 mt-1">
          منظومة الإدارة المالية والمخزنية المتكاملة
        </p>
      </div>

      {/* 2. Desktop Right Branding Panel (>= lg) with UserPlus Icon */}
      <div className="hidden lg:block lg:w-[50%] xl:w-[52%] min-h-screen">
        <AuthBrandingPanel mode="register" />
      </div>

      {/* 3. Form Side (Left on Desktop, Below Banner on Mobile) */}
      <div className="w-full lg:w-[50%] xl:w-[48%] min-h-screen flex flex-col items-center py-6 sm:py-8 px-4 sm:px-8 relative overflow-y-auto">
        <div className="w-full max-w-[440px] my-auto flex flex-col items-center">
          {/* Top bar controls */}
          <div className="w-full flex items-center justify-between mb-3 sm:mb-4">
            <span className="text-xs font-bold text-muted-foreground">Falcon System Registration</span>
            <Button
              variant="ghost"
              size="icon"
              onClick={toggleTheme}
              className="w-9 h-9 rounded-xl text-muted-foreground hover:text-foreground"
              title={isDarkMode ? 'التبديل إلى الوضع الفاتح' : 'التبديل إلى الوضع الداكن'}
            >
              {isDarkMode ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4 text-slate-600" />}
            </Button>
          </div>

          <Card className="w-full border-slate-200/80 dark:border-slate-800/80 bg-white dark:bg-[#0f172a] shadow-2xl shadow-slate-200/50 dark:shadow-black/60 rounded-3xl overflow-hidden">
            {/* shadcn Tabs Switcher */}
            <div className="p-5 sm:p-6 pb-0">
              <Tabs defaultValue="register" className="w-full">
                <TabsList className="grid w-full grid-cols-2 bg-slate-100 dark:bg-slate-900/90 p-1 rounded-2xl h-11 border border-slate-200/60 dark:border-slate-800/80">
                  <TabsTrigger
                    value="login"
                    onClick={() => router.push('/login')}
                    className="rounded-xl text-xs font-black cursor-pointer text-slate-600 dark:text-slate-400 hover:text-foreground transition-all"
                  >
                    تسجيل الدخول
                  </TabsTrigger>
                  <TabsTrigger
                    value="register"
                    className="rounded-xl text-xs font-black cursor-default data-[state=active]:bg-blue-600 data-[state=active]:text-white data-[state=active]:shadow-md transition-all"
                  >
                    إنشاء حساب منشأة
                  </TabsTrigger>
                </TabsList>
              </Tabs>
            </div>

            <CardHeader className="text-center pb-2 pt-4 sm:pt-5">
              <CardTitle className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white tracking-tight">
                إنشاء حساب منشأة
              </CardTitle>
              <CardDescription className="text-xs sm:text-sm font-medium text-slate-500 dark:text-slate-400">
                سجل منشأتك الآن للبدء في إدارة نشاطك التجاري والمخزون.
              </CardDescription>
            </CardHeader>

            <CardContent className="space-y-3 sm:space-y-3.5 p-5 sm:p-6 pt-2 sm:pt-3">
              {/* Register Form */}
              <form onSubmit={handleRegister} className="space-y-3 sm:space-y-3.5">
                {/* Full Name */}
                <div className="space-y-1.5">
                  <Label htmlFor="fullName" className="block text-slate-700 dark:text-slate-300 font-bold text-xs sm:text-sm text-right">
                    الاسم الكامل
                  </Label>
                  <Input
                    id="fullName"
                    type="text"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    placeholder="أدخل اسمك بالكامل"
                    required
                    className="h-10.5 sm:h-11 bg-slate-50 dark:bg-[#090e1a] border-slate-200 dark:border-slate-800 rounded-xl focus-visible:ring-2 focus-visible:ring-primary/30 text-sm"
                    icon={<UserIcon className="w-4 h-4 text-slate-400" />}
                  />
                </div>

                {/* Email Address */}
                <div className="space-y-1.5">
                  <Label htmlFor="email" className="block text-slate-700 dark:text-slate-300 font-bold text-xs sm:text-sm text-right">
                    البريد الإلكتروني
                  </Label>
                  <Input
                    id="email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="example@domain.com"
                    required
                    className="h-10.5 sm:h-11 bg-slate-50 dark:bg-[#090e1a] border-slate-200 dark:border-slate-800 rounded-xl focus-visible:ring-2 focus-visible:ring-primary/30 text-sm"
                    icon={<Mail className="w-4 h-4 text-slate-400" />}
                  />
                </div>

                {/* Activity Type */}
                <div className="space-y-1.5">
                  <Label htmlFor="activityType" className="block text-slate-700 dark:text-slate-300 font-bold text-xs sm:text-sm text-right">
                    نوع النشاط التجاري
                  </Label>
                  <Select value={activityType} onValueChange={setActivityType}>
                    <SelectTrigger className="h-10.5 sm:h-11 bg-slate-50 dark:bg-[#090e1a] border-slate-200 dark:border-slate-800 rounded-xl focus-visible:ring-2 focus-visible:ring-primary/30 text-sm font-semibold flex items-center justify-between px-3">
                      <div className="flex items-center gap-2">
                        <Store className="w-4 h-4 text-slate-400 shrink-0" />
                        <SelectValue placeholder="اختر نوع النشاط" />
                      </div>
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="retail">تجارة عامة وتجزئة وجملة</SelectItem>
                      <SelectItem value="supermarket">سوبرماركت ومواد غذائية</SelectItem>
                      <SelectItem value="clothing">ملابس وأحذية وأزياء</SelectItem>
                      <SelectItem value="electronics">أجهزة وإلكترونيات وكمبيوتر</SelectItem>
                      <SelectItem value="hardware">حدايد وبويات وقطع غيار</SelectItem>
                      <SelectItem value="pharmacy">صيدلية ومستلزمات طبية</SelectItem>
                      <SelectItem value="services">خدمات ومطاعم وكافيهات</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Password */}
                <div className="space-y-1.5">
                  <Label htmlFor="password" className="block text-slate-700 dark:text-slate-300 font-bold text-xs sm:text-sm text-right">
                    كلمة المرور
                  </Label>
                  <Input
                    id="password"
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    required
                    className="h-10.5 sm:h-11 bg-slate-50 dark:bg-[#090e1a] border-slate-200 dark:border-slate-800 rounded-xl focus-visible:ring-2 focus-visible:ring-primary/30 text-sm tracking-wider"
                    icon={<Lock className="w-4 h-4 text-slate-400" />}
                    trailingIcon={
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="cursor-pointer text-slate-400 hover:text-slate-600 focus:outline-none"
                        title={showPassword ? 'إخفاء كلمة المرور' : 'إظهار كلمة المرور'}
                      >
                        {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    }
                  />
                </div>

                {/* Confirm Password */}
                <div className="space-y-1.5">
                  <Label htmlFor="confirmPassword" className="block text-slate-700 dark:text-slate-300 font-bold text-xs sm:text-sm text-right">
                    تأكيد كلمة المرور
                  </Label>
                  <Input
                    id="confirmPassword"
                    type={showConfirmPassword ? 'text' : 'password'}
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="••••••••"
                    required
                    className="h-10.5 sm:h-11 bg-slate-50 dark:bg-[#090e1a] border-slate-200 dark:border-slate-800 rounded-xl focus-visible:ring-2 focus-visible:ring-primary/30 text-sm tracking-wider"
                    icon={<ShieldCheck className="w-4 h-4 text-slate-400" />}
                    trailingIcon={
                      <button
                        type="button"
                        onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                        className="cursor-pointer text-slate-400 hover:text-slate-600 focus:outline-none"
                        title={showConfirmPassword ? 'إخفاء كلمة المرور' : 'إظهار كلمة المرور'}
                      >
                        {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    }
                  />
                </div>

                {/* Submit Button */}
                <Button
                  type="submit"
                  disabled={isLoading}
                  className="w-full h-11 sm:h-12 bg-blue-600 hover:bg-blue-700 text-white font-bold text-sm sm:text-base rounded-xl shadow-lg shadow-blue-500/25 transition-all mt-3 active:scale-[0.99] cursor-pointer flex items-center justify-center gap-2"
                >
                  {isLoading ? (
                    <div className="flex items-center gap-2">
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      <span>جاري إنشاء الحساب والمنشأة...</span>
                    </div>
                  ) : (
                    <>
                      <UserPlus className="w-4 h-4 ml-1.5" />
                      <span>إنشاء الحساب</span>
                    </>
                  )}
                </Button>
              </form>
            </CardContent>

            <CardFooter className="flex justify-center border-t border-slate-100 dark:border-slate-800/80 py-3 sm:py-4">
              <p className="text-xs font-semibold text-slate-600 dark:text-slate-400">
                لديك حساب بالفعل؟{' '}
                <Link href="/login" className="text-primary font-bold hover:underline mr-1">
                  تسجيل الدخول
                </Link>
              </p>
            </CardFooter>
          </Card>
        </div>
      </div>
    </div>
  );
}
