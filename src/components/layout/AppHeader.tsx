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
  title = 'لوحة المتابعة الرئيسية',
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
    // Format dynamic current date
    const d = new Date();
    const formatted = d.toISOString().slice(0, 10);
    setCurrentDate(formatted);

    // Load real notifications from Dexie
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

  const userInitial = currentUser?.full_name?.trim()?.charAt(0) || currentUser?.username?.charAt(0) || 'ع';

  return (
    <header className="h-16 bg-white dark:bg-[#131b2e] border-b border-slate-200 dark:border-slate-800 px-4 sm:px-6 flex items-center justify-between sticky top-0 z-30 shadow-xs transition-colors duration-200 select-none">
      {/* Modals & Dialogs */}
      <CalculatorModal isOpen={isCalcOpen} onClose={() => setIsCalcOpen(false)} />
      <SupportModal isOpen={isSupportOpen} onClose={() => setIsSupportOpen(false)} />

      {/* Right side: Sidebar Toggle & Page Title */}
      <div className="flex items-center gap-2 sm:gap-3 min-w-0">
        <button
          onClick={onToggleSidebar}
          title={sidebarOpen ? 'طي القائمة' : 'توسيع القائمة'}
          className="p-1.5 sm:p-2 rounded-lg text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer shrink-0"
        >
          <Icons.ToggleSidebar />
        </button>

        <h1 className="text-sm sm:text-xl font-extrabold text-slate-900 dark:text-white transition-colors truncate max-w-[140px] sm:max-w-none">
          {title}
        </h1>
      </div>

      {/* Left side: The Complete Navbar Control Suite matching Screenshots */}
      <div className="flex items-center gap-1.5 sm:gap-2.5 shrink-0">
        {/* 1. Date Display */}
        <div className="hidden md:flex items-center gap-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 px-3 py-1.5 rounded-lg text-xs font-semibold text-slate-600 dark:text-slate-400">
          <Calendar className="w-3.5 h-3.5 text-slate-400" />
          <span dir="ltr">{currentDate}</span>
        </div>

        {/* 2. Real Notifications Button & Popover Dropdown */}
        <div className="relative">
          <button
            onClick={() => setIsNotifOpen(!isNotifOpen)}
            title="مركز الإشعارات والتنبيهات"
            className="relative p-1.5 sm:p-2 rounded-lg text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
          >
            <Bell className="w-4 h-4 sm:w-5 sm:h-5" />
            {unreadCount > 0 && (
              <span className="absolute top-0.5 right-0.5 sm:top-1 sm:right-1 bg-red-500 text-white text-[9px] font-black px-1 min-w-[16px] h-4 rounded-full flex items-center justify-center shadow-xs">
                {unreadCount}
              </span>
            )}
          </button>

          {/* Notification Dropdown Popover */}
          <NotificationDropdown isOpen={isNotifOpen} onClose={() => setIsNotifOpen(false)} />
        </div>

        {/* 3. Technical Support Headset Button (Desktop/Tablet) */}
        <button
          onClick={() => setIsSupportOpen(true)}
          title="الدعم الفني والمساعدة"
          className="hidden sm:flex p-2 rounded-lg text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
        >
          <Headphones className="w-5 h-5" />
        </button>

        {/* 4. POS Cashier Quick Workstation Button */}
        <button
          onClick={() => router.push('/sales/pos')}
          title="نقطة البيع السريعة (POS - F1)"
          className="p-1.5 sm:p-2 rounded-lg text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
        >
          <Store className="w-4 h-4 sm:w-5 sm:h-5" />
        </button>

        {/* 5. Built-in Interactive Calculator Button (Desktop/Tablet) */}
        <button
          onClick={() => setIsCalcOpen(true)}
          title="الآلة الحاسبة السريعة"
          className="hidden sm:flex p-2 rounded-lg text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
        >
          <Calculator className="w-5 h-5" />
        </button>

        {/* 6. Cloud Sync Status Pill Button */}
        <button
          onClick={() => triggerSync()}
          disabled={isSyncing}
          title={isOnline ? 'المزامنة السحابية نشطة (اضغط للمزامنة الفورية)' : 'أنت غير متصل بالإنترنت'}
          className={`flex items-center gap-1 sm:gap-1.5 px-2 sm:px-3 py-1 sm:py-1.5 rounded-full text-[11px] sm:text-xs font-bold border transition-all cursor-pointer ${
            isOnline
              ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800 hover:bg-emerald-100/70'
              : 'bg-red-50 dark:bg-red-950/40 text-red-600 dark:text-red-400 border-red-200 dark:border-red-800'
          }`}
        >
          {isSyncing ? (
            <RefreshCw className="w-3.5 h-3.5 animate-spin text-emerald-600" />
          ) : (
            <span
              className={`w-2 h-2 rounded-full ${
                isOnline ? 'bg-emerald-500 shadow-[0_0_8px_#22c55e]' : 'bg-red-500'
              }`}
            />
          )}
          <span className="hidden sm:inline">{isOnline ? 'متصل' : 'غير متصل'}</span>
          <Cloud className="w-3.5 h-3.5 opacity-70" />
        </button>

        {/* 7. Dark / Light Mode Toggle Button */}
        <button
          onClick={onToggleTheme}
          title={isDark ? 'التحويل للوضع النهاري (Light Mode)' : 'التحويل للوضع الليلي (Dark Mode)'}
          className="p-2 rounded-lg text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
        >
          {isDark ? (
            <Sun className="w-5 h-5 text-amber-400" />
          ) : (
            <Moon className="w-5 h-5 text-slate-600" />
          )}
        </button>

        {/* 8. User Profile Avatar & Menu Popover */}
        <div className="relative">
          <button
            onClick={() => setIsUserMenuOpen(!isUserMenuOpen)}
            className="flex items-center gap-2 p-1 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
          >
            <div className="w-9 h-9 rounded-full bg-emerald-50 dark:bg-emerald-950 border-2 border-emerald-500 text-emerald-600 dark:text-emerald-400 font-black text-sm flex items-center justify-center">
              {userInitial}
            </div>
            <div className="hidden sm:flex flex-col text-right">
              <span className="text-xs font-black text-slate-900 dark:text-white leading-tight">
                {currentUser?.full_name || currentUser?.username || 'مستخدم النظام'}
              </span>
              <span className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400">
                {getRoleLabel()}
              </span>
            </div>
          </button>

          {isUserMenuOpen && (
            <div className="absolute left-0 mt-2 w-56 bg-white dark:bg-[#131b2e] rounded-2xl shadow-xl border border-slate-200 dark:border-slate-800 p-2 z-50 animate-in fade-in-50 zoom-in-95 duration-150">
              <div className="px-3 py-2 border-b border-slate-100 dark:border-slate-800">
                <p className="text-xs font-black text-slate-900 dark:text-white">
                  {currentUser?.full_name || currentUser?.username}
                </p>
                <p className="text-[10px] text-slate-400">
                  {currentUser?.email || currentUser?.username}
                </p>
              </div>

              <div className="py-1">
                <button
                  onClick={() => {
                    setIsUserMenuOpen(false);
                    router.push('/employees');
                  }}
                  className="w-full text-right px-3 py-2 text-xs font-bold text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800/60 rounded-lg transition-colors cursor-pointer flex items-center justify-between"
                >
                  <span>إدارة الموظفين والصلاحيات</span>
                  <span className="text-slate-400 text-[10px]">👥</span>
                </button>
                <button
                  onClick={() => {
                    setIsUserMenuOpen(false);
                    router.push('/settings');
                  }}
                  className="w-full text-right px-3 py-2 text-xs font-bold text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800/60 rounded-lg transition-colors cursor-pointer flex items-center justify-between"
                >
                  <span>إعدادات النظام والمؤسسة</span>
                  <span className="text-slate-400 text-[10px]">⚙️</span>
                </button>
              </div>

              <div className="pt-1 border-t border-slate-100 dark:border-slate-800">
                <button
                  onClick={handleLogout}
                  className="w-full text-right px-3 py-2 text-xs font-bold text-red-600 hover:bg-red-50 dark:hover:bg-red-950/40 rounded-lg transition-colors cursor-pointer flex items-center justify-between"
                >
                  <span>تسجيل الخروج</span>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
                    <polyline points="16 17 21 12 16 7" />
                    <line x1="21" y1="12" x2="9" y2="12" />
                  </svg>
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};
