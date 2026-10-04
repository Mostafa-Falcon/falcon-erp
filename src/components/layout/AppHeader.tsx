'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Icons } from '@/components/ui/Icons';
import { useSyncStore } from '@/core/state/useSyncStore';
import { useSessionStore } from '@/core/state/useSessionStore';
import { useNotificationStore } from '@/core/state/useNotificationStore';
import { NotificationDropdown } from './NotificationDropdown';
import { CalculatorModal } from './CalculatorModal';
import { SupportModal } from './SupportModal';
import { formatLocalDateISO } from '@/lib/format';
import {
  Bell,
  Headphones,
  Calculator,
  Store,
  RefreshCw,
  Moon,
  Sun,
  Calendar,
  Cloud,
  ChevronDown,
  LogOut,
  Users,
  Settings,
} from 'lucide-react';

interface AppHeaderProps {
  sidebarOpen: boolean;
  onToggleSidebar: () => void;
  isDark: boolean;
  onToggleTheme: () => void;
  title?: string;
}

export const AppHeader: React.FC<AppHeaderProps> = ({
  sidebarOpen,
  onToggleSidebar,
  isDark,
  onToggleTheme,
  title = 'لوحة المتابعة',
}) => {
  const router = useRouter();
  const { isOnline, isSyncing, triggerSync } = useSyncStore();
  const { currentUser, logout } = useSessionStore();
  const { unreadCount, loadNotifications } = useNotificationStore();

  const [currentDate, setCurrentDate] = useState('2026-09-12');
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);
  const [isNotifOpen, setIsNotifOpen] = useState(false);
  const [isCalcOpen, setIsCalcOpen] = useState(false);
  const [isSupportOpen, setIsSupportOpen] = useState(false);

  useEffect(() => {
    setCurrentDate(formatLocalDateISO());
    if (currentUser?.org_id) {
      loadNotifications(currentUser.org_id);
    }
  }, [currentUser, loadNotifications]);

  const handleLogout = async () => {
    await logout();
    router.replace('/login');
  };

  const getRoleLabel = () => {
    if (!currentUser) return 'مستخدم';
    switch (currentUser.role) {
      case 'owner':
      case 'super_admin':
        return 'صاحب المنشأة';
      case 'admin':
        return 'مدير النظام';
      case 'manager':
        return 'مدير فرع';
      case 'cashier':
        return 'كاشير';
      case 'accountant':
        return 'محاسب مالي';
      case 'warehouse_keeper':
        return 'أمين مخزن';
      default:
        return 'موظف';
    }
  };

  const userInitial =
    currentUser?.full_name?.trim()?.charAt(0) ||
    currentUser?.username?.charAt(0) ||
    'ع';

  return (
    <header className="flex h-(--spacing-header) shrink-0 items-center justify-between border-b border-slate-200/80 dark:border-slate-800/80 bg-surface/90 backdrop-blur-md px-4 shadow-2xs select-none transition-colors duration-200 sm:px-6 z-30">
      {/* Modals & Dialogs */}
      <CalculatorModal isOpen={isCalcOpen} onClose={() => setIsCalcOpen(false)} />
      <SupportModal isOpen={isSupportOpen} onClose={() => setIsSupportOpen(false)} />

      {/* Right side: Sidebar Toggle & Clean Breadcrumb Hierarchy */}
      <div className="flex items-center gap-3 min-w-0">
        <button
          onClick={onToggleSidebar}
          title={sidebarOpen ? 'طي القائمة' : 'توسيع القائمة'}
          className="h-9 w-9 rounded-xl border border-slate-200/80 dark:border-slate-800 bg-surface hover:bg-slate-100 dark:hover:bg-slate-800/70 text-slate-600 dark:text-slate-300 transition-all flex items-center justify-center cursor-pointer shadow-2xs shrink-0"
        >
          <Icons.ToggleSidebar className="w-4 h-4" />
        </button>

        <div className="flex items-center gap-1.5 sm:gap-2 text-xs sm:text-sm min-w-0">
          <button
            onClick={() => router.push('/')}
            className="hidden sm:inline text-slate-400 hover:text-primary dark:text-slate-500 dark:hover:text-primary transition-colors font-medium shrink-0 cursor-pointer"
          >
            الرئيسية
          </button>
          <span className="hidden sm:inline text-slate-300 dark:text-slate-700 font-bold shrink-0">/</span>
          <span className="font-extrabold text-slate-900 dark:text-white truncate max-w-[140px] xs:max-w-[200px] sm:max-w-none">
            {title}
          </span>
        </div>
      </div>

      {/* Left side: Grouped Tool Suite (Modern SaaS Linear Style) */}
      <div className="flex items-center gap-2 sm:gap-3 shrink-0">
        {/* Group 1: Quick Action Workstations */}
        <div className="hidden sm:flex items-center bg-slate-100/70 dark:bg-slate-800/60 p-0.5 rounded-xl border border-slate-200/60 dark:border-slate-700/60">
          <button
            onClick={() => router.push('/sales/pos')}
            title="نقطة البيع السريعة (POS - F1)"
            className="h-8 px-2.5 rounded-lg text-slate-600 dark:text-slate-300 hover:bg-surface dark:hover:bg-slate-700 hover:text-primary dark:hover:text-white hover:shadow-2xs transition-all flex items-center gap-1.5 text-xs font-bold cursor-pointer"
          >
            <Store className="w-3.5 h-3.5" />
            <span className="hidden md:inline">نقطة البيع</span>
          </button>

          <button
            onClick={() => setIsCalcOpen(true)}
            title="الآلة الحاسبة"
            className="h-8 w-8 rounded-lg text-slate-600 dark:text-slate-300 hover:bg-surface dark:hover:bg-slate-700 hover:text-primary dark:hover:text-white hover:shadow-2xs transition-all flex items-center justify-center cursor-pointer"
          >
            <Calculator className="w-4 h-4" />
          </button>

          <button
            onClick={() => setIsSupportOpen(true)}
            title="الدعم الفني والمساعدة"
            className="h-8 w-8 rounded-lg text-slate-600 dark:text-slate-300 hover:bg-surface dark:hover:bg-slate-700 hover:text-primary dark:hover:text-white hover:shadow-2xs transition-all flex items-center justify-center cursor-pointer"
          >
            <Headphones className="w-4 h-4" />
          </button>
        </div>

        {/* Separator */}
        <div className="hidden sm:block h-5 w-px bg-slate-200 dark:bg-slate-800" />

        {/* Group 2: Cloud Sync & System Status */}
        <div className="flex items-center gap-2">
          {/* Cloud Sync Status */}
          <button
            onClick={() => triggerSync()}
            disabled={isSyncing}
            title={
              isOnline
                ? 'المزامنة السحابية نشطة (اضغط للتحديث الفوري)'
                : 'غير متصل بالإنترنت'
            }
            className={`flex items-center gap-1 sm:gap-1.5 px-2 sm:px-2.5 py-1 rounded-full text-2xs font-bold border transition-all cursor-pointer shadow-2xs ${
              isOnline
                ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400 border-emerald-200/80 dark:border-emerald-800/80 hover:bg-emerald-100/60'
                : 'bg-red-50 dark:bg-red-950/40 text-red-600 dark:text-red-400 border-red-200 dark:border-red-800'
            }`}
          >
            {isSyncing ? (
              <RefreshCw className="w-3 h-3 animate-spin text-emerald-600" />
            ) : (
              <span className="relative flex h-2 w-2">
                {isOnline && (
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                )}
                <span
                  className={`relative inline-flex rounded-full h-2 w-2 ${
                    isOnline ? 'bg-emerald-500' : 'bg-red-500'
                  }`}
                />
              </span>
            )}
            <span className="hidden md:inline">{isOnline ? 'متصل' : 'غير متصل'}</span>
            <Cloud className="w-3 h-3 opacity-60" />
          </button>

          {/* Date Display */}
          <div className="hidden lg:flex items-center gap-1.5 bg-slate-100/60 dark:bg-slate-800/50 border border-slate-200/60 dark:border-slate-800 px-2.5 py-1 rounded-full text-3xs font-semibold text-slate-500 dark:text-slate-400">
            <Calendar className="w-3 h-3 text-slate-400" />
            <span dir="ltr">{currentDate}</span>
          </div>
        </div>

        {/* Separator */}
        <div className="h-5 w-px bg-slate-200 dark:bg-slate-800" />

        {/* Group 3: Notifications & Theme Mode */}
        <div className="flex items-center gap-1">
          {/* Notifications */}
          <div className="relative">
            <button
              onClick={() => setIsNotifOpen(!isNotifOpen)}
              title="مركز الإشعارات"
              className="relative h-9 w-9 rounded-xl border border-slate-200/70 dark:border-slate-800 bg-surface hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 transition-all flex items-center justify-center cursor-pointer shadow-2xs"
            >
              <Bell className="w-4 h-4" />
              {unreadCount > 0 && (
                <span className="absolute -top-1 -right-1 bg-red-500 text-white text-4xs font-black px-1 min-w-[16px] h-4 rounded-full flex items-center justify-center shadow-xs animate-pulse">
                  {unreadCount}
                </span>
              )}
            </button>
            <NotificationDropdown isOpen={isNotifOpen} onClose={() => setIsNotifOpen(false)} />
          </div>

          {/* Theme Toggle */}
          <button
            onClick={onToggleTheme}
            title={isDark ? 'التحويل للوضع النهاري' : 'التحويل للوضع الليلي'}
            className="h-9 w-9 rounded-xl border border-slate-200/70 dark:border-slate-800 bg-surface hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 transition-all flex items-center justify-center cursor-pointer shadow-2xs"
          >
            {isDark ? (
              <Sun className="w-4 h-4 text-amber-400" />
            ) : (
              <Moon className="w-4 h-4 text-slate-600" />
            )}
          </button>
        </div>

        {/* Group 4: Modern User Profile Pill */}
        <div className="relative">
          <button
            onClick={() => setIsUserMenuOpen(!isUserMenuOpen)}
            className="flex items-center gap-2 p-1 pl-2 sm:pl-3 rounded-xl border border-slate-200/70 dark:border-slate-800 bg-surface hover:bg-slate-50 dark:hover:bg-slate-800/80 transition-all cursor-pointer shadow-2xs"
          >
            <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-blue-600 to-indigo-600 text-white font-black text-xs flex items-center justify-center shadow-xs">
              {userInitial}
            </div>
            <div className="hidden sm:flex flex-col text-right">
              <span className="text-xs font-black text-slate-900 dark:text-white leading-tight truncate max-w-[110px]">
                {currentUser?.full_name || currentUser?.username || 'مستخدم النظام'}
              </span>
              <span className="text-3xs font-semibold text-slate-400 dark:text-slate-500">
                {getRoleLabel()}
              </span>
            </div>
            <ChevronDown className="w-3.5 h-3.5 text-slate-400 hidden sm:block mr-0.5" />
          </button>

          {isUserMenuOpen && (
            <div className="absolute left-0 mt-2 w-60 bg-surface rounded-2xl shadow-xl border border-slate-200 dark:border-slate-800 p-2 z-50 animate-in fade-in-50 zoom-in-95 duration-150">
              <div className="px-3 py-2.5 border-b border-slate-100 dark:border-slate-800/80">
                <p className="text-xs font-black text-slate-900 dark:text-white">
                  {currentUser?.full_name || currentUser?.username}
                </p>
                <p className="text-3xs text-slate-400 truncate mt-0.5">
                  {currentUser?.email || currentUser?.username}
                </p>
                <div className="mt-1.5">
                  <span className="inline-block px-2 py-0.5 rounded-full text-4xs font-black bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 border border-blue-200/50 dark:border-blue-800/50">
                    {getRoleLabel()}
                  </span>
                </div>
              </div>

              <div className="py-1">
                <button
                  onClick={() => {
                    setIsUserMenuOpen(false);
                    router.push('/employees');
                  }}
                  className="w-full text-right px-3 py-2 text-xs font-bold text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800/60 rounded-xl transition-colors cursor-pointer flex items-center justify-between"
                >
                  <span>إدارة الموظفين والصلاحيات</span>
                  <Users className="w-3.5 h-3.5 text-slate-400" />
                </button>
                <button
                  onClick={() => {
                    setIsUserMenuOpen(false);
                    router.push('/settings');
                  }}
                  className="w-full text-right px-3 py-2 text-xs font-bold text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800/60 rounded-xl transition-colors cursor-pointer flex items-center justify-between"
                >
                  <span>إعدادات النظام والمنشأة</span>
                  <Settings className="w-3.5 h-3.5 text-slate-400" />
                </button>
              </div>

              <div className="pt-1 border-t border-slate-100 dark:border-slate-800/80">
                <button
                  onClick={handleLogout}
                  className="w-full text-right px-3 py-2 text-xs font-bold text-red-600 hover:bg-red-50 dark:hover:bg-red-950/40 rounded-xl transition-colors cursor-pointer flex items-center justify-between"
                >
                  <span>تسجيل الخروج</span>
                  <LogOut className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};