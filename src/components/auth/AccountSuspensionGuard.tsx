'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { useSessionStore } from '@/core/state/useSessionStore';
import { db } from '@/core/db/app_database';
import { supabase, isSupabaseConfigured } from '@/core/supabase/supabase_client';
import { networkListener } from '@/core/sync/network_listener';
import { Button } from '@/components/ui/button';
import { ShieldAlert, RefreshCw, LogOut, PhoneCall, Building2 } from 'lucide-react';
import { toast } from 'sonner';
import { useRouter } from 'next/navigation';

interface AccountSuspensionGuardProps {
  children: React.ReactNode;
}

/**
 * 🦅 Falcon ERP - Account Suspension Guard
 * Enforces remote suspension/activation controlled via external dashboard (Logixa Workstation / Systems).
 * Immediately blocks access if the organization or the user account is deactivated in Supabase.
 */
export const AccountSuspensionGuard: React.FC<AccountSuspensionGuardProps> = ({ children }) => {
  const { currentUser, logout } = useSessionStore();
  const router = useRouter();

  const [isChecking, setIsChecking] = useState<boolean>(true);
  const [isSuspended, setIsSuspended] = useState<boolean>(false);
  const [suspensionReason, setSuspensionReason] = useState<string>('');
  const [orgName, setOrgName] = useState<string>('');
  const [isRevalidating, setIsRevalidating] = useState<boolean>(false);

  const checkStatus = useCallback(async (forceCloud = false) => {
    if (!currentUser || !currentUser.org_id) {
      setIsChecking(false);
      setIsSuspended(false);
      return;
    }

    try {
      // 1. Local Dexie check
      const [localOrg, localUser] = await Promise.all([
        db.organizations.get(currentUser.org_id),
        db.users.get(currentUser.id),
      ]);

      if (localOrg) {
        setOrgName(localOrg.name || '');
      }

      let suspended = false;
      let reason = '';

      if (localOrg && localOrg.is_active === false) {
        suspended = true;
        reason = 'تم تعليق وصول المنشأة بالكامل من قبل إدارة المنظومة.';
      } else if (localUser && localUser.is_active === false) {
        suspended = true;
        reason = 'تم إيقاف حسابك من قبل الإدارة.';
      }

      setIsSuspended(suspended);
      setSuspensionReason(reason);

      // 2. Authoritative Cloud check when online
      if ((forceCloud || suspended || networkListener.getStatus()) && isSupabaseConfigured()) {
        try {
          const { data: cloudOrg, error: orgErr } = await supabase
            .from('organizations')
            .select('is_active, name')
            .eq('id', currentUser.org_id)
            .maybeSingle();

          if (!orgErr && cloudOrg) {
            if (cloudOrg.name) setOrgName(cloudOrg.name);

            // If cloud state differs from local, synchronize Dexie
            if (cloudOrg.is_active !== undefined) {
              if (localOrg && localOrg.is_active !== cloudOrg.is_active) {
                await db.organizations.update(currentUser.org_id, {
                  is_active: cloudOrg.is_active,
                  updated_at: new Date().toISOString(),
                });
              }

              if (cloudOrg.is_active === false) {
                setIsSuspended(true);
                setSuspensionReason('تم تعليق وصول المنشأة بالكامل من قبل إدارة المنظومة.');
                return;
              }
            }
          }

          const { data: cloudUser, error: userErr } = await supabase
            .from('users')
            .select('is_active')
            .eq('id', currentUser.id)
            .maybeSingle();

          if (!userErr && cloudUser && cloudUser.is_active !== undefined) {
            if (localUser && localUser.is_active !== cloudUser.is_active) {
              await db.users.update(currentUser.id, {
                is_active: cloudUser.is_active,
                updated_at: new Date().toISOString(),
              });
            }

            if (cloudUser.is_active === false) {
              setIsSuspended(true);
              setSuspensionReason('تم إيقاف حسابك من قبل إدارة المنظومة.');
              return;
            }
          }

          // If both are active in cloud
          if (cloudOrg?.is_active && (cloudUser?.is_active ?? true)) {
            setIsSuspended(false);
            setSuspensionReason('');
          }
        } catch (cloudErr) {
          console.warn('[AccountSuspensionGuard] Cloud check error:', cloudErr);
        }
      }
    } catch (err) {
      console.error('[AccountSuspensionGuard] Status verification failed:', err);
    } finally {
      setIsChecking(false);
    }
  }, [currentUser]);

  useEffect(() => {
    checkStatus();

    // Listen for Realtime events and storage signals
    const handleStorageChange = () => checkStatus();
    const handleCloudEvent = () => checkStatus();

    window.addEventListener('storage', handleStorageChange);
    window.addEventListener('falcon_cloud_data_changed', handleCloudEvent);

    // Periodic check every 60 seconds
    const interval = setInterval(() => {
      checkStatus();
    }, 60000);

    return () => {
      window.removeEventListener('storage', handleStorageChange);
      window.removeEventListener('falcon_cloud_data_changed', handleCloudEvent);
      clearInterval(interval);
    };
  }, [checkStatus]);

  const handleRevalidateNow = async () => {
    setIsRevalidating(true);
    try {
      await checkStatus(true);
      if (!isSuspended) {
        toast.success('تم التأكد من تفعيل الحساب بنجاح!');
      } else {
        toast.error('لا يزال الحساب موقوفاً. يرجى التواصل مع إدارة النظام لتفعيله.');
      }
    } finally {
      setIsRevalidating(false);
    }
  };

  const handleLogout = async () => {
    await logout();
    router.replace('/login');
  };

  // If loading and we haven't determined status yet
  if (isChecking && !currentUser) {
    return <>{children}</>;
  }

  // If account is suspended, render the full-screen suspension barrier
  if (isSuspended) {
    return (
      <div
        className="fixed inset-0 z-[99999] bg-slate-950/95 backdrop-blur-md flex items-center justify-center p-4 text-center font-sans"
        dir="rtl"
      >
        <div className="max-w-md w-full bg-slate-900 border border-red-900/60 rounded-3xl p-6 sm:p-8 shadow-2xl space-y-6 text-white relative overflow-hidden">
          {/* Subtle decorative glow */}
          <div className="absolute -top-24 -left-24 w-48 h-48 bg-red-600/20 rounded-full blur-3xl pointer-events-none" />
          <div className="absolute -bottom-24 -right-24 w-48 h-48 bg-amber-600/10 rounded-full blur-3xl pointer-events-none" />

          {/* Icon Header */}
          <div className="w-16 h-16 rounded-2xl bg-red-950/80 border border-red-800/80 text-red-500 flex items-center justify-center mx-auto shadow-lg shadow-red-950/50">
            <ShieldAlert className="w-8 h-8 animate-pulse" />
          </div>

          {/* Title & Description */}
          <div className="space-y-2">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-red-950 text-red-400 border border-red-800 text-[11px] font-black">
              إشعار إيقاف إداري
            </span>
            <h2 className="text-lg sm:text-xl font-black text-white">
              تم إيقاف هذا الحساب مؤقتاً
            </h2>
            <p className="text-xs sm:text-sm font-medium text-slate-300 leading-relaxed">
              {suspensionReason ||
                'تم تعليق صلاحية الوصول إلى هذه المنظومة من قبل إدارة النظام المركزية. يرجى التواصل مع الدعم الفني لتجديد الاشتراك أو إعادة التفعيل.'}
            </p>
          </div>

          {/* Organization badge */}
          {orgName && (
            <div className="flex items-center justify-center gap-2 p-2.5 rounded-xl bg-slate-800/80 border border-slate-700/60 text-xs font-bold text-slate-300">
              <Building2 className="w-4 h-4 text-slate-400" />
              <span>المنشأة: {orgName}</span>
            </div>
          )}

          {/* Actions */}
          <div className="space-y-3 pt-2">
            <Button
              onClick={handleRevalidateNow}
              disabled={isRevalidating}
              className="w-full h-11 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-xl flex items-center justify-center gap-2 transition-all cursor-pointer shadow-md shadow-blue-600/20"
            >
              <RefreshCw className={`w-4 h-4 ${isRevalidating ? 'animate-spin' : ''}`} />
              {isRevalidating ? 'جاري التحقق من السحابة...' : 'التحقق من حالة الحساب الآن'}
            </Button>

            <Button
              onClick={handleLogout}
              variant="outline"
              className="w-full h-10 border-slate-700 hover:bg-slate-800 text-slate-300 font-bold text-xs rounded-xl flex items-center justify-center gap-2 cursor-pointer"
            >
              <LogOut className="w-4 h-4" />
              تسجيل الخروج والعودة لشاشة الدخول
            </Button>
          </div>

          {/* Footer note */}
          <div className="pt-2 border-t border-slate-800 flex items-center justify-center gap-1.5 text-[11px] text-slate-500 font-semibold">
            <PhoneCall className="w-3.5 h-3.5" />
            <span>لإعادة التفعيل، يرجى التواصل مع الدعم الفني لشركة لوجيسكا</span>
          </div>
        </div>
      </div>
    );
  }

  return <>{children}</>;
};
