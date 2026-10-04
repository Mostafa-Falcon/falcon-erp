'use client';

import React, { useState, useEffect, useSyncExternalStore, Suspense } from 'react';
import { useRouter } from 'next/navigation';
import { AppSidebar } from './AppSidebar';
import { AppHeader } from './AppHeader';
import { useSessionStore } from '@/core/state/useSessionStore';
import { useGlobalShortcuts } from '@/core/hooks/useGlobalShortcuts';
import { useIsDesktop } from '@/core/hooks/useMediaQuery';
import { PageContainer, PageHeader } from './PageContainer';
import { realtimeSyncListener } from '@/core/sync/realtime_sync_listener';
import { syncCoordinator } from '@/core/sync/sync_coordinator';
import { PullSyncService } from '@/core/sync/pull_sync_service';
import { notifyCloudDataChanged } from '@/core/sync/sync_events';
import { networkListener } from '@/core/sync/network_listener';
import { restoreOrgTransportToken } from '@/core/supabase/supabase_client';
import { ensureCleanLookupState } from '@/core/db/seed';
import { AccountSuspensionGuard } from '@/components/auth/AccountSuspensionGuard';

import { MobileBottomNav } from './MobileBottomNav';

interface AppShellProps {
    title?: string;
    subtitle?: string;
    actions?: React.ReactNode;
    children: React.ReactNode;
    hideHeaderBanner?: boolean;
    defaultSidebarCollapsed?: boolean;
}

const emptySubscribe = () => () => { };

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
    defaultSidebarCollapsed = false,
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
    const [sidebarOpen, setSidebarOpen] = useState(!defaultSidebarCollapsed);

    const isDesktop = useIsDesktop();

    useEffect(() => {
        if (typeof window !== 'undefined') {
            const isDesktopWidth = window.innerWidth >= 1024;
            if (defaultSidebarCollapsed) {
                setSidebarOpen(false);
            } else if (isDesktopWidth) {
                setSidebarOpen(true);
            }
        }
    }, [defaultSidebarCollapsed, isDesktop]);

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
            router.replace('/login');
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
            <div className="flex h-[100dvh] min-h-[100dvh] w-full items-center justify-center bg-app">
                <div className="flex flex-col items-center gap-3">
                    <div className="h-9 w-9 animate-spin rounded-full border-3 border-items border-t-transparent" />
                    <span className="text-xs font-bold text-muted-foreground">جاري التحقق من بيانات الدخول...</span>
                </div>
            </div>
        );
    }

    return (
        <AccountSuspensionGuard>
            <div className="flex h-[100dvh] min-h-[100dvh] w-full overflow-hidden bg-app transition-colors duration-200 select-none">
                <Suspense fallback={<div className="w-(--spacing-sidebar) shrink-0" />}>
                    <AppSidebar
                        isOpen={sidebarOpen}
                        isDesktop={isDesktop}
                        onClose={() => setSidebarOpen(false)}
                    />
                </Suspense>

                <div className="flex h-full min-w-0 flex-1 flex-col overflow-hidden">
                    <AppHeader
                        sidebarOpen={sidebarOpen}
                        onToggleSidebar={() => setSidebarOpen(!sidebarOpen)}
                        isDark={isDark}
                        onToggleTheme={toggleTheme}
                        title={title}
                    />

                    <main className="min-h-0 flex-1 overflow-y-auto overflow-x-hidden pb-16 lg:pb-0">
                        <PageContainer>
                            {!hideHeaderBanner && <PageHeader title={title} subtitle={subtitle} actions={actions} />}
                            {children}
                        </PageContainer>
                    </main>

                    {/* Mobile Bottom Navigation */}
                    <MobileBottomNav
                        onToggleSidebar={() => setSidebarOpen(!sidebarOpen)}
                        sidebarOpen={sidebarOpen}
                    />
                </div>
            </div>
        </AccountSuspensionGuard>
    );
};