'use client';

import React, { useState, useEffect, useSyncExternalStore } from 'react';
import { useRouter } from 'next/navigation';
import { AppSidebar } from './AppSidebar';
import { AppHeader } from './AppHeader';
import { useSessionStore } from '@/core/state/useSessionStore';
import { useGlobalShortcuts } from '@/core/hooks/useGlobalShortcuts';
import { realtimeSyncListener } from '@/core/sync/realtime_sync_listener';
import { syncCoordinator } from '@/core/sync/sync_coordinator';
import { PullSyncService } from '@/core/sync/pull_sync_service';
import { notifyCloudDataChanged } from '@/core/sync/sync_events';
import { networkListener } from '@/core/sync/network_listener';
import { restoreOrgTransportToken } from '@/core/supabase/supabase_client';
import { ensureCleanLookupState } from '@/core/db/seed';
import { AccountSuspensionGuard } from '@/components/auth/AccountSuspensionGuard';

interface AppShellProps {
  title?: string;
  subtitle?: string;
  actions?: React.ReactNode;
  children: React.ReactNode;
  hideHeaderBanner?: boolean;
}

const emptySubscribe = () => () => {};

const subscribeTheme = (callback: () => void) => {
  window.addEventListener('storage', callback);
  window.addEventListener('falcon_theme_change', callback);
  const mql = window.matchMedia('(prefers-color-scheme: dark)');
  mql.addEventListener('change', callback);
  return () => {
    window.removeEventListener('storage', callback);
    window.removeEventListener('falcon_theme_change', callback);
    mql.removeEventListener('change', callback);
  };
};

const getThemeSnapshot = () => {
  if (typeof window === 'undefined') return false;
  const savedTheme = localStorage.getItem('falcon_theme');
  return savedTheme === 'dark';
};

const getThemeServerSnapshot = () => false;

/**
 * 🦅 Falcon ERP Universal Responsive AppShell
 * Unifies the Top Header, Collapsible Sidebar, Breadcrumbs, and Content Container.
 * Keeps every ERP page DRY and consistent across the whole system.
 */
export const AppShell: React.FC<AppShellProps> = ({
  title,
  subtitle,
  actions,
  children,
  hideHeaderBanner = false,
}) => {
  const router = useRouter();
  const { currentUser } = useSessionStore();

  useGlobalShortcuts();

  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);
  const isDark = useSyncExternalStore(
    subscribeTheme,
    getThemeSnapshot,
    getThemeServerSnapshot
  );
  const [sidebarOpen, setSidebarOpen] = useState(true);

  // Auto-detect mobile screen width & set initial sidebar state
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const isMobile = window.innerWidth < 1024;
      setSidebarOpen(!isMobile);
    }
  }, []);

  useEffect(() => {
    if (isDark) {
      document.documentElement.classList.add('dark');
      document.documentElement.setAttribute('data-theme', 'dark');
    } else {
      document.documentElement.classList.remove('dark');
      document.documentElement.setAttribute('data-theme', 'light');
    }
  }, [isDark]);

  useEffect(() => {
    if (!mounted) return;
    if (!currentUser) {
      const checkAndRedirect = async () => {
        try {
          const { db } = await import('@/core/db/app_database');
          const orgCount = await db.organizations.count();
          const userCount = await db.users.count();
          if (orgCount === 0 || userCount === 0) {
            router.replace('/register');
          } else {
            router.replace('/login');
          }
        } catch {
          router.replace('/login');
        }
      };
      checkAndRedirect();
    }
  }, [mounted, currentUser, router]);

  // تفعيل المزامنة اللحظية مع Supabase Realtime + دورة سحب (pull) ودفع (push) ذكية
  useEffect(() => {
    if (!currentUser?.org_id) return;
    const orgId = currentUser.org_id;

    let reconcileInterval: ReturnType<typeof setInterval> | null = null;

    // سحب أولاً (تحديث الحالة من السحابة) ثم دفع العمليات المعلقة
    const reconcile = async () => {
      await PullSyncService.pullAll(orgId).catch(console.warn);
      await syncCoordinator.triggerSync().catch(console.error);
      notifyCloudDataChanged();
    };

    ensureCleanLookupState().catch(console.warn);
    restoreOrgTransportToken()
      .then(() => {
        realtimeSyncListener.start(orgId);
        return reconcile();
      })
      .catch(console.warn);

    // عند عودة الاتصال: سحب ما فات ثم دفع
    const unsubscribeNetwork = networkListener.subscribe((isOnline) => {
      if (isOnline) {
        reconcile();
      }
    });

    // دورة أمان احتياطية كل 20 ثانية لتقارب الحالة بين الأجهزة
    // (الـ realtime مسؤول عن اللحظية؛ هذه الدورة تضمن التقارب حتى لو تأخر الحدث)
    reconcileInterval = setInterval(() => {
      if (networkListener.getStatus()) {
        reconcile();
      }
    }, 20000);

    return () => {
      realtimeSyncListener.stop();
      unsubscribeNetwork();
      if (reconcileInterval) {
        clearInterval(reconcileInterval);
      }
    };
  }, [currentUser?.org_id]);

  const toggleTheme = () => {
    const nextTheme = !isDark;
    localStorage.setItem('falcon_theme', nextTheme ? 'dark' : 'light');
    window.dispatchEvent(new Event('falcon_theme_change'));
  };

  if (!mounted || !currentUser) {
    return (
      <div className="h-screen w-full flex items-center justify-center bg-[#f4f6f8] dark:bg-[#0b0f19]">
        <div className="flex flex-col items-center gap-3">
          <div className="w-9 h-9 border-3 border-[#16a34a] border-t-transparent rounded-full animate-spin" />
          <span className="text-xs font-bold text-slate-500 dark:text-slate-400">جاري التحقق من بيانات الدخول...</span>
        </div>
      </div>
    );
  }

  return (
    <AccountSuspensionGuard>
      <div className="flex h-screen w-full bg-[#f4f6f9] dark:bg-[#0b0f19] overflow-hidden transition-colors duration-200 select-none">
        <AppSidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />

        <div className="flex-1 flex flex-col h-full overflow-hidden">
          <AppHeader
            sidebarOpen={sidebarOpen}
            onToggleSidebar={() => setSidebarOpen(!sidebarOpen)}
            isDark={isDark}
            onToggleTheme={toggleTheme}
            title={title}
          />

          <main className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-7 flex flex-col gap-6">
            {!hideHeaderBanner && (title || actions) && (
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white dark:bg-[#131b2e] p-5 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-sm">
                <div>
                  <h2 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white mb-1">{title}</h2>
                  {subtitle && (
                    <p className="text-xs font-semibold text-slate-500 dark:text-slate-400">{subtitle}</p>
                  )}
                </div>
                {actions && <div className="shrink-0">{actions}</div>}
              </div>
            )}
            {children}
          </main>
        </div>
      </div>
    </AccountSuspensionGuard>
  );
};