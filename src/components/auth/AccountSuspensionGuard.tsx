'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { useSessionStore } from '@/core/state/useSessionStore';
import { db } from '@/core/db/app_database';
import { supabase, isSupabaseConfigured } from '@/core/supabase/supabase_client';
import { networkListener } from '@/core/sync/network_listener';
import { Button } from '@/components/ui/button';
import {
  ShieldAlert,
  RefreshCw,
  LogOut,
  PhoneCall,
  Building2,
  MessageSquare,
  Sparkles,
  KeyRound,
  Check,
  Copy,
  Clock,
  User,
  ExternalLink
} from 'lucide-react';
import { toast } from 'sonner';
import { useRouter } from 'next/navigation';

interface AccountSuspensionGuardProps {
  children: React.ReactNode;
}

type SuspensionType = 'trial_expired' | 'trial_pending' | 'admin' | 'user';

/**
 * 🦅 Falcon ERP - Account Suspension & Trial Activation Guard
 * World-class, modern SaaS barrier for trial activation and administrative suspensions.
 * Protects all routes while providing a stunning, friction-free activation UX.
 */
export const AccountSuspensionGuard: React.FC<AccountSuspensionGuardProps> = ({ children }) => {
  const { currentUser, logout } = useSessionStore();
  const router = useRouter();

  const [isChecking, setIsChecking] = useState<boolean>(true);
  const [isSuspended, setIsSuspended] = useState<boolean>(false);
  const [suspensionType, setSuspensionType] = useState<SuspensionType>('trial_pending');
  const [suspensionReason, setSuspensionReason] = useState<string>('');
  const [orgName, setOrgName] = useState<string>('');
  const [subTier, setSubTier] = useState<string>('trial');
  const [isRevalidating, setIsRevalidating] = useState<boolean>(false);
  const [copiedNumber, setCopiedNumber] = useState<boolean>(false);

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
        if (localOrg.subscription_tier) {
          setSubTier(localOrg.subscription_tier);
        }
      }

      let suspended = false;
      let reason = '';
      let type: SuspensionType = 'trial_pending';

      const localExpiresAt = localOrg?.subscription_expires_at;
      const localIsExpired = localExpiresAt ? new Date(localExpiresAt) < new Date() : false;
      const isTrial = (localOrg?.subscription_tier || 'trial') === 'trial';

      if (localOrg && localOrg.is_active === false) {
        suspended = true;
        if (isTrial) {
          type = 'trial_pending';
          reason = 'حسابك التجريبي بانتظار الاعتماد والتفعيل. يرجى التواصل معنا عبر الواتساب لتفعيل اشتراكك وبدء العمل بكامل الإمكانيات.';
        } else {
          type = 'admin';
          reason = 'تم تعليق وصول المنشأة بالكامل من قبل إدارة المنظومة.';
        }
      } else if (localUser && localUser.is_active === false) {
        suspended = true;
        type = 'user';
        reason = 'تم إيقاف حسابك من قبل إدارة المنظومة.';
      } else if (localIsExpired) {
        suspended = true;
        type = 'trial_expired';
        reason = 'انتهت فترة التجربة المجانية (7 أيام) أو اشتراك المنشأة. يرجى التواصل معنا عبر الواتساب لاختيار باقة الاشتراك وتفعيل حسابك.';
      }

      setIsSuspended(suspended);
      setSuspensionType(type);
      setSuspensionReason(reason);

      // 2. Authoritative Cloud check when online
      if ((forceCloud || suspended || networkListener.getStatus()) && isSupabaseConfigured()) {
        try {
          const { data: cloudOrg, error: orgErr } = await supabase
            .from('organizations')
            .select('is_active, name, subscription_tier, subscription_expires_at')
            .eq('id', currentUser.org_id)
            .maybeSingle();

          if (!orgErr && cloudOrg) {
            if (cloudOrg.name) setOrgName(cloudOrg.name);
            if (cloudOrg.subscription_tier) setSubTier(cloudOrg.subscription_tier);

            const effectiveExpiresAt = cloudOrg.subscription_expires_at || localExpiresAt;
            const cloudIsExpired = effectiveExpiresAt ? new Date(effectiveExpiresAt) < new Date() : false;
            const cloudIsTrial = (cloudOrg.subscription_tier || 'trial') === 'trial';

            // Synchronize Dexie with cloud
            if (localOrg) {
              await db.organizations.update(currentUser.org_id, {
                is_active: cloudOrg.is_active ?? localOrg.is_active ?? true,
                subscription_tier: cloudOrg.subscription_tier || localOrg.subscription_tier || 'trial',
                subscription_expires_at: cloudOrg.subscription_expires_at || localOrg.subscription_expires_at,
                updated_at: new Date().toISOString(),
              });
            }

            if (cloudOrg.is_active === false) {
              setIsSuspended(true);
              if (cloudIsTrial) {
                setSuspensionType('trial_pending');
                setSuspensionReason('حسابك التجريبي بانتظار الاعتماد والتفعيل. يرجى التواصل معنا عبر الواتساب لتفعيل اشتراكك وبدء العمل بكامل الإمكانيات.');
              } else {
                setSuspensionType('admin');
                setSuspensionReason('تم تعليق وصول المنشأة بالكامل من قبل إدارة المنظومة.');
              }
              return;
            }

            if (cloudIsExpired) {
              setIsSuspended(true);
              setSuspensionType('trial_expired');
              setSuspensionReason('انتهت فترة التجربة المجانية (7 أيام) أو اشتراك المنشأة. يرجى التواصل معنا عبر الواتساب لاختيار باقة الاشتراك وتفعيل حسابك.');
              return;
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
              setSuspensionType('user');
              setSuspensionReason('تم إيقاف حسابك من قبل إدارة المنظومة.');
              return;
            }
          }

          // If active and NOT expired in both local and cloud
          if (cloudOrg?.is_active && (cloudUser?.is_active ?? true) && !localIsExpired) {
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

    const handleStorageChange = () => checkStatus();
    const handleCloudEvent = () => checkStatus();

    window.addEventListener('storage', handleStorageChange);
    window.addEventListener('falcon_cloud_data_changed', handleCloudEvent);

    const interval = setInterval(() => {
      checkStatus();
    }, 45000);

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
        toast.success('تم التأكد من تفعيل الحساب بنجاح! مرحباً بك.');
      } else {
        toast.error('لا يزال الحساب بحاجة إلى تفعيل. يرجى التواصل عبر الواتساب للاعتماد الفوري.');
      }
    } finally {
      setIsRevalidating(false);
    }
  };

  const handleCopyNumber = () => {
    navigator.clipboard.writeText('01116603371');
    setCopiedNumber(true);
    toast.success('تم نسخ رقم الواتساب: 01116603371');
    setTimeout(() => setCopiedNumber(false), 2500);
  };

  const handleLogout = async () => {
    await logout();
    router.replace('/login');
  };

  if (isChecking && !currentUser) {
    return <>{children}</>;
  }

  // If account is suspended or trial needs activation, render world-class suspension barrier
  if (isSuspended) {
    const isTrialBarrier = suspensionType === 'trial_expired' || suspensionType === 'trial_pending';
    const cleanOrgName = orgName || 'مؤسستي التجارية';
    const userName = currentUser?.full_name || currentUser?.username || 'صاحب المنشأة';

    const whatsappMessage = encodeURIComponent(
      `مرحباً شركة لوجيسكا، أود تفعيل حساب منشأتي (${cleanOrgName}) في Falcon ERP.\nاسم المستخدم: ${currentUser?.username || currentUser?.email || ''}\nرقم الهاتف: ${currentUser?.phone || ''}`
    );

    return (
      <div
        className="fixed inset-0 z-[99999] bg-[#040714] text-white flex items-center justify-center p-4 sm:p-6 overflow-y-auto font-sans select-none"
        dir="rtl"
      >
        {/* Dynamic Background Glow Orbs */}
        <div className="fixed inset-0 overflow-hidden pointer-events-none">
          <div className="absolute top-1/4 -right-28 w-96 h-96 bg-blue-600/20 rounded-full blur-[120px] animate-pulse" />
          <div className="absolute bottom-1/4 -left-28 w-96 h-96 bg-emerald-500/15 rounded-full blur-[140px]" />
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-indigo-500/10 rounded-full blur-[150px]" />
          {/* Subtle Grid Pattern */}
          <div className="absolute inset-0 bg-[linear-gradient(to_right,#ffffff05_1px,transparent_1px),linear-gradient(to_bottom,#ffffff05_1px,transparent_1px)] bg-[size:4rem_4rem] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_50%,#000_70%,transparent_100%)]" />
        </div>

        {/* Central Premium Container */}
        <div className="relative z-10 max-w-lg w-full bg-slate-900/85 backdrop-blur-2xl border border-white/10 rounded-3xl p-6 sm:p-8 shadow-2xl shadow-blue-950/40 text-center space-y-6">
          {/* Header Badge */}
          <div className="flex items-center justify-center">
            {isTrialBarrier ? (
              <span className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full text-xs font-black bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 shadow-inner">
                <Sparkles className="w-3.5 h-3.5 animate-spin text-emerald-400" />
                <span>حساب تجريبي • بانتظار التفعيل الرسمي</span>
              </span>
            ) : (
              <span className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full text-xs font-black bg-rose-500/15 border border-rose-500/30 text-rose-400 shadow-inner">
                <ShieldAlert className="w-3.5 h-3.5 animate-pulse text-rose-400" />
                <span>إشعار إداري • تعليق الحساب مؤقتاً</span>
              </span>
            )}
          </div>

          {/* Hero Emblem */}
          <div className="relative mx-auto w-20 h-20 flex items-center justify-center">
            <div
              className={`absolute inset-0 rounded-3xl blur-xl opacity-60 ${
                isTrialBarrier ? 'bg-gradient-to-tr from-emerald-500 to-blue-600' : 'bg-gradient-to-tr from-rose-500 to-amber-600'
              }`}
            />
            <div
              className={`relative w-20 h-20 rounded-3xl border flex items-center justify-center shadow-xl ${
                isTrialBarrier
                  ? 'bg-slate-950/90 border-emerald-500/40 text-emerald-400'
                  : 'bg-slate-950/90 border-rose-500/40 text-rose-400'
              }`}
            >
              {isTrialBarrier ? (
                <KeyRound className="w-9 h-9 stroke-[2.2] animate-bounce" />
              ) : (
                <ShieldAlert className="w-9 h-9 stroke-[2.2] animate-pulse" />
              )}
            </div>
          </div>

          {/* Titles & Description */}
          <div className="space-y-2">
            <h1 className="text-xl sm:text-2xl font-black text-white tracking-tight">
              {isTrialBarrier ? 'حسابك التجريبي بانتظار التفعيل' : 'تم إيقاف هذا الحساب مؤقتاً'}
            </h1>
            <p className="text-xs sm:text-sm font-medium text-slate-300 leading-relaxed px-2">
              {suspensionReason ||
                (isTrialBarrier
                  ? 'انتهت فترة التجربة المجانية (7 أيام) أو اشتراك المنشأة. يرجى التواصل معنا عبر الواتساب على رقم 01116603371 لاختيار الاشتراك المناسب وتفعيل حسابك.'
                  : 'تم تعليق وصول المنشأة بالكامل من قبل إدارة المنظومة. يرجى التواصل مع الدعم الفني للاعتماد.')}
            </p>
          </div>

          {/* Details Card (Linear / SaaS Style) */}
          <div className="p-4 rounded-2xl bg-slate-950/70 border border-white/5 space-y-2.5 text-xs text-right">
            <div className="flex items-center justify-between text-slate-400 font-medium">
              <span className="flex items-center gap-1.5">
                <Building2 className="w-3.5 h-3.5 text-blue-400" />
                <span>اسم المنشأة</span>
              </span>
              <span className="font-black text-white truncate max-w-[200px]">{cleanOrgName}</span>
            </div>

            <div className="flex items-center justify-between text-slate-400 font-medium">
              <span className="flex items-center gap-1.5">
                <User className="w-3.5 h-3.5 text-indigo-400" />
                <span>صاحب الحساب</span>
              </span>
              <span className="font-bold text-slate-200">{userName}</span>
            </div>

            <div className="flex items-center justify-between text-slate-400 font-medium">
              <span className="flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5 text-amber-400" />
                <span>حالة الترخيص</span>
              </span>
              <span
                className={`font-black px-2 py-0.5 rounded-md text-3xs ${
                  isTrialBarrier
                    ? 'bg-amber-950/60 text-amber-300 border border-amber-800/60'
                    : 'bg-rose-950/60 text-rose-300 border border-rose-800/60'
                }`}
              >
                {isTrialBarrier ? 'نسخة تجريبية • بانتظار الاعتماد' : 'موقوف إدارياً'}
              </span>
            </div>
          </div>

          {/* Action CTAs */}
          <div className="space-y-3 pt-1">
            {/* Primary WhatsApp Action */}
            <a
              href={`https://wa.me/201116603371?text=${whatsappMessage}`}
              target="_blank"
              rel="noopener noreferrer"
              className="w-full h-12 bg-gradient-to-r from-emerald-500 via-emerald-600 to-teal-600 hover:from-emerald-600 hover:to-teal-700 text-white font-black text-sm rounded-2xl flex items-center justify-center gap-2 shadow-lg shadow-emerald-500/25 transition-all transform active:scale-98 cursor-pointer"
            >
              <MessageSquare className="w-5 h-5 fill-current" />
              <span>التواصل الفوري عبر الواتساب للتفعيل (01116603371)</span>
              <ExternalLink className="w-3.5 h-3.5 opacity-70" />
            </a>

            {/* Quick Actions Row */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              {/* Copy Number */}
              <button
                type="button"
                onClick={handleCopyNumber}
                className="h-10 px-3 rounded-xl bg-slate-800/80 hover:bg-slate-700/80 border border-slate-700/60 text-slate-200 font-bold text-xs flex items-center justify-center gap-1.5 transition-all cursor-pointer"
              >
                {copiedNumber ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4 text-slate-400" />}
                <span>{copiedNumber ? 'تم نسخ الرقم' : 'نسخ رقم الواتساب'}</span>
              </button>

              {/* Re-validate Status */}
              <Button
                type="button"
                onClick={handleRevalidateNow}
                disabled={isRevalidating}
                className="h-10 px-3 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-xl flex items-center justify-center gap-1.5 shadow-md shadow-blue-600/20 cursor-pointer"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isRevalidating ? 'animate-spin' : ''}`} />
                <span>{isRevalidating ? 'جاري الفحص...' : 'فحص حالة التفعيل'}</span>
              </Button>
            </div>

            {/* Logout button */}
            <Button
              type="button"
              onClick={handleLogout}
              variant="ghost"
              className="w-full h-10 text-slate-400 hover:text-white hover:bg-white/5 font-semibold text-xs rounded-xl flex items-center justify-center gap-2 cursor-pointer transition-colors"
            >
              <LogOut className="w-4 h-4" />
              <span>تسجيل الخروج والعودة لشاشة الدخول</span>
            </Button>
          </div>

          {/* Footer Branding */}
          <div className="pt-3 border-t border-white/5 flex items-center justify-center gap-2 text-3xs text-slate-400 font-semibold">
            <PhoneCall className="w-3 h-3 text-emerald-400" />
            <span>شركة لوجيسكا للأنظمة السحابية والبرمجيات المتطورة • دعم فني على مدار الساعة</span>
          </div>
        </div>
      </div>
    );
  }

  return <>{children}</>;
};