'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/components/ui/card';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { AuthBrandingPanel } from '@/components/auth/AuthBrandingPanel';
import { AuthRepository } from '@/modules/auth/auth_repository';
import { useSessionStore } from '@/core/state/useSessionStore';
import { toast } from 'sonner';
import { db } from '@/core/db/app_database';
import { Layers, Eye, EyeOff, Lock, User, Sun, Moon, LogIn } from 'lucide-react';

export default function LoginPage() {
  const router = useRouter();
  const { currentUser, setCurrentUser } = useSessionStore();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [isCheckingAuth, setIsCheckingAuth] = useState(true);
  const [isRegistrationEnabled, setIsRegistrationEnabled] = useState(true);

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

    // Check if registration is enabled
    db.app_settings.get('enable_registration').then((setting) => {
      if (setting && setting.value === 'false') {
        setIsRegistrationEnabled(false);
      }
    }).catch(() => {});
  }, []);

  const toggleTheme = () => {
    const next = !isDarkMode;
    setIsDarkMode(next);
    if (next) {
      document.documentElement.classList.add('dark');
      document.documentElement.setAttribute('data-theme', 'dark');
      localStorage.setItem('falcon_theme', 'dark');
    } else {
      document.documentElement.classList.remove('dark');
      document.documentElement.setAttribute('data-theme', 'light');
      localStorage.setItem('falcon_theme', 'light');
    }
    window.dispatchEvent(new Event('falcon_theme_change'));
  };

  // If already authenticated, redirect to home and prevent returning to login
  useEffect(() => {
    const storedUser = AuthRepository.getCurrentUser();
    if (storedUser || currentUser) {
      router.replace('/');
    } else {
      setIsCheckingAuth(false);
    }
  }, [currentUser, router]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      // 1. PIN or Quick code login (especially for cashiers)
      if (/^\d{4,6}$/.test(password) && !email.includes('@')) {
        const userByPin = await AuthRepository.loginWithPin(password);
        if (userByPin) {
          toast.success(`مرحباً بك مجدداً يا ${userByPin.full_name}`);
          setCurrentUser(userByPin);
          router.replace('/');
          return;
        }
      }

      // 2. Email / Username credential authentication
      const result = await AuthRepository.loginWithEmail(email, password);
      if (result.user) {
        toast.success(`تم تسجيل الدخول بنجاح! مرحباً بك يا ${result.user.full_name}`);
        setCurrentUser(result.user);
        router.replace('/');
      } else {
        toast.error(result.error || 'فشل تسجيل الدخول. يرجى التحقق من البيانات.');
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'حدث خطأ غير متوقع أثناء تسجيل الدخول.';
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
        
        {/* Emblem */}
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

      {/* 2. Desktop Right Branding Panel (>= lg) */}
      <div className="hidden lg:block lg:w-[50%] xl:w-[52%] min-h-screen">
        <AuthBrandingPanel />
      </div>

      {/* 3. Form Side (Left on Desktop, Below Banner on Mobile) */}
      <div className="w-full lg:w-[50%] xl:w-[48%] min-h-screen flex flex-col items-center py-6 sm:py-8 px-4 sm:px-8 relative overflow-y-auto">
        <div className="w-full max-w-[430px] my-auto flex flex-col items-center">
          {/* Top bar controls */}
          <div className="w-full flex items-center justify-between mb-3 sm:mb-4">
            <span className="text-xs font-bold text-muted-foreground">Falcon System Access</span>
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
              <Tabs defaultValue="login" className="w-full">
                <TabsList className="grid w-full grid-cols-2 bg-slate-100 dark:bg-slate-900/90 p-1 rounded-2xl h-11 border border-slate-200/60 dark:border-slate-800/80">
                  <TabsTrigger
                    value="login"
                    className="rounded-xl text-xs font-black cursor-default data-[state=active]:bg-blue-600 data-[state=active]:text-white data-[state=active]:shadow-md transition-all"
                  >
                    تسجيل الدخول
                  </TabsTrigger>
                  <TabsTrigger
                    value="register"
                    onClick={() => router.push('/register')}
                    className="rounded-xl text-xs font-bold cursor-pointer text-muted-foreground hover:text-foreground transition-all"
                  >
                    إنشاء حساب منشأة
                  </TabsTrigger>
                </TabsList>
              </Tabs>
            </div>

          <CardHeader className="text-center pb-3 pt-5">
            <CardTitle className="text-2xl sm:text-3xl font-black text-foreground tracking-tight">
              تسجيل الدخول
            </CardTitle>
            <CardDescription className="text-xs sm:text-sm font-medium text-muted-foreground">
              سجل دخولك الآن للوصول إلى لوحة التحكم الخاصة بمنشأتك
            </CardDescription>
          </CardHeader>

          <CardContent className="space-y-4">
            <form onSubmit={handleLogin} className="space-y-4">
              {/* Email / Username Field */}
              <div className="space-y-2">
                <Label htmlFor="email" className="block text-foreground font-bold text-xs sm:text-sm text-right">
                  البريد الإلكتروني أو اسم المستخدم
                </Label>
                <Input
                  id="email"
                  type="text"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="example@domain.com"
                  required
                  className="h-11 sm:h-12 bg-slate-50 dark:bg-[#090e1a] border-slate-200 dark:border-slate-800 rounded-xl focus-visible:ring-2 focus-visible:ring-primary/30 text-sm"
                  icon={<User className="w-4 h-4 text-muted-foreground" />}
                />
              </div>

              {/* Password Field */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-semibold text-muted-foreground hover:text-primary transition-colors cursor-pointer">
                    نسيت كلمة المرور؟
                  </span>
                  <Label htmlFor="password" className="block text-foreground font-bold text-xs sm:text-sm text-right">
                    كلمة المرور
                  </Label>
                </div>
                <Input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  required
                  className="h-11 sm:h-12 bg-slate-50 dark:bg-[#090e1a] border-slate-200 dark:border-slate-800 rounded-xl focus-visible:ring-2 focus-visible:ring-primary/30 text-sm tracking-wider"
                  icon={<Lock className="w-4 h-4 text-muted-foreground" />}
                  trailingIcon={
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="cursor-pointer text-muted-foreground hover:text-foreground focus:outline-none"
                      title={showPassword ? 'إخفاء كلمة المرور' : 'إظهار كلمة المرور'}
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  }
                />
              </div>

              {/* Submit Button */}
              <Button
                type="submit"
                disabled={isLoading}
                className="w-full h-12 bg-blue-600 hover:bg-blue-700 text-white font-bold text-base rounded-xl shadow-lg shadow-blue-500/25 transition-all mt-4 active:scale-[0.99] cursor-pointer flex items-center justify-center gap-2"
              >
                {isLoading ? (
                  <div className="flex items-center gap-2">
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    <span>جاري التحقق من الحساب...</span>
                  </div>
                ) : (
                  <>
                    <LogIn className="w-4 h-4 ml-1.5" />
                    <span>تسجيل الدخول</span>
                  </>
                )}
              </Button>
            </form>
          </CardContent>

          {isRegistrationEnabled && (
            <CardFooter className="flex justify-center border-t border-slate-100 dark:border-slate-800/80 pt-4 pb-4">
              <p className="text-xs font-semibold text-muted-foreground">
                ليس لديك حساب؟{' '}
                <Link href="/register" className="text-primary font-bold hover:underline mr-1">
                  إنشاء حساب جديد
                </Link>
              </p>
            </CardFooter>
          )}
          </Card>
        </div>
      </div>
    </div>
  );
}
