'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useSessionStore } from '@/core/state/useSessionStore';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Icons } from '@/components/ui/Icons';
import {
  TrendingUp,
  ShoppingBag,
  Boxes,
  Wallet,
  Sparkles,
  Store,
  ShieldCheck,
  Zap,
} from 'lucide-react';
import { getDomainProfile } from '@/core/constants/domain_profiles';
import { getSubscriptionProfile } from '@/core/constants/subscription_profiles';

interface KpiStats {
  todaySales: number;
  salesCount: number;
  todayPurchases: number;
  purchasesCount: number;
  productsCount: number;
  lowStockCount: number;
  treasuryBalance: number;
}

export const WelcomeBanner: React.FC = () => {
  const { currentUser, activeBranchId } = useSessionStore();
  const [branchName, setBranchName] = useState<string | null>(null);
  const [domainType, setDomainType] = useState<string>('retail');
  const [subTier, setSubTier] = useState<string>('standard');
  const [stats, setStats] = useState<KpiStats>({
    todaySales: 0,
    salesCount: 0,
    todayPurchases: 0,
    purchasesCount: 0,
    productsCount: 0,
    lowStockCount: 0,
    treasuryBalance: 0,
  });

  const domain = getDomainProfile(domainType);
  const subProfile = getSubscriptionProfile(subTier);

  useEffect(() => {
    const orgId = currentUser?.org_id;
    if (!orgId) return;

    let isSubscribed = true;

    const loadDashboardData = async () => {
      try {
        const { db } = await import('@/core/db/app_database');
        
        // 0. Load organization domain/activity & subscription tier
        const org = await db.organizations.get(orgId);
        if (org && isSubscribed) {
          if (org.activity_type) setDomainType(org.activity_type);
          if (org.subscription_tier) setSubTier(org.subscription_tier);
        }

        // 1. Branch info
        const bid = activeBranchId || currentUser?.branch_id;
        if (bid) {
          const branch = await db.branches.get(bid);
          if (branch && isSubscribed) {
            setBranchName(branch.name);
          }
        } else {
          const main = await db.branches.where('org_id').equals(orgId).and((b) => b.is_main).first();
          if (main && isSubscribed) {
            setBranchName(main.name);
          }
        }

        // 2. Real KPI Counts from Dexie
        const todayStr = new Date().toISOString().slice(0, 10);

        const allSales = await db.sales_invoices.where('org_id').equals(orgId).toArray();
        const todaySalesList = allSales.filter((inv) => inv.created_at.startsWith(todayStr));
        const todaySalesSum = todaySalesList.reduce((sum, inv) => sum + (Number(inv.total) || 0), 0);

        const allPurchases = await db.purchase_invoices.where('org_id').equals(orgId).toArray();
        const todayPurchasesList = allPurchases.filter((inv) => inv.created_at.startsWith(todayStr));
        const todayPurchasesSum = todayPurchasesList.reduce((sum, inv) => sum + (Number(inv.total) || 0), 0);

        const prodCount = await db.products.where('org_id').equals(orgId).count();
        const allStock = await db.stock_levels.toArray();
        const lowStock = allStock.filter((s) => Number(s.available_quantity || 0) <= 5).length;

        const allTreasuries = await db.treasuries.where('org_id').equals(orgId).toArray();
        const totalCash = allTreasuries.reduce((sum, t) => sum + (Number(t.current_balance) || 0), 0);

        if (isSubscribed) {
          setStats({
            todaySales: todaySalesSum,
            salesCount: todaySalesList.length,
            todayPurchases: todayPurchasesSum,
            purchasesCount: todayPurchasesList.length,
            productsCount: prodCount,
            lowStockCount: lowStock,
            treasuryBalance: totalCash,
          });
        }
      } catch (err) {
        console.warn('KPI load notice:', err);
      }
    };

    loadDashboardData();

    return () => {
      isSubscribed = false;
    };
  }, [currentUser, activeBranchId]);

  const displayName = currentUser?.full_name || currentUser?.username || 'مستخدم المنظومة';

  const getRoleLabel = () => {
    switch (currentUser?.role) {
      case 'owner':
      case 'super_admin':
        return 'صاحب المنشأة';
      case 'admin':
        return 'مدير النظام';
      case 'manager':
        return 'مدير فرع';
      case 'cashier':
        return 'كاشير مبيعات';
      case 'accountant':
        return 'محاسب مالي';
      default:
        return 'مستخدم معتمد';
    }
  };

  return (
    <div className="flex flex-col gap-4 select-none">
      {/* 1. Slim Executive Header Bar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 bg-white dark:bg-[#111726] border border-slate-200/80 dark:border-slate-800 p-4 sm:p-5 rounded-2xl shadow-xs">
        <div className="flex items-center gap-3.5">
          <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-[#16a34a] to-[#15803d] flex items-center justify-center text-white font-bold shadow-xs shrink-0">
            <Sparkles className="w-5 h-5 text-white" />
          </div>

          <div className="flex flex-col">
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-lg sm:text-xl font-black text-slate-900 dark:text-white tracking-tight">
                لوحة المتابعة والمؤشرات الحيوية
              </h1>
              <Badge className="bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800 font-bold text-xs py-0.5 px-2">
                مرحباً بك، {displayName}
              </Badge>
            </div>

            <div className="flex flex-wrap items-center gap-2 mt-1 text-xs text-slate-500 dark:text-slate-400 font-medium">
              <span className="flex items-center gap-1 font-bold text-slate-800 dark:text-slate-200">
                <span>{domain.icon}</span>
                <span>{domain.nameAr}</span>
              </span>
              <span>•</span>
              <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] border ${subProfile.badgeStyle}`} title={subProfile.description}>
                <span>{subProfile.icon}</span>
                <span>{subProfile.badgeName}</span>
              </span>
              <span>•</span>
              <span className="flex items-center gap-1">
                <Store className="w-3.5 h-3.5 text-slate-400" />
                <span>{branchName || 'الفرع الرئيسي'}</span>
              </span>
              <span>•</span>
              <span className="flex items-center gap-1">
                <ShieldCheck className="w-3.5 h-3.5 text-slate-400" />
                <span>{getRoleLabel()}</span>
              </span>
              <span>•</span>
              <span className="flex items-center gap-1 text-emerald-600 dark:text-emerald-400 font-semibold">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                <span>قاعدة بيانات محلية متزامنة</span>
              </span>
            </div>

            {subProfile.id === 'trial' && (
              <div className="mt-2.5 p-3 rounded-xl bg-rose-50/90 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 text-xs font-bold text-rose-900 dark:text-rose-200 flex items-center justify-between gap-2 shadow-2xs">
                <div className="flex items-center gap-2">
                  <Zap className="w-4 h-4 text-rose-600 shrink-0" />
                  <span>
                    <strong>وضع الحساب التجريبي الاستكشافي (7 أيام):</strong> يمكنك إضافة أصناف تجريبية واستعراض الكاشير، بينما تنفيذ البيع والمشتريات محجوب لحين الترقية عبر إدارة لوجيسكا.
                  </span>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Quick Launch Action Buttons */}
        <div className="flex items-center gap-2.5 pt-2 md:pt-0 shrink-0">
          <Link href="/sales/pos" className="w-full sm:w-auto">
            <Button className="w-full sm:w-auto h-10 px-4 rounded-xl bg-[#16a34a] hover:bg-[#15803d] text-white font-black shadow-xs hover:shadow-sm transition-all gap-2 cursor-pointer text-xs sm:text-sm">
              <Icons.CashRegister />
              <span>{domain.posTitle}</span>
              <span className="bg-white/20 text-white text-[10px] px-1.5 py-0.5 rounded-md font-mono">F1</span>
            </Button>
          </Link>

          <Link href="/purchases/invoices/new" className="w-full sm:w-auto">
            <Button
              variant="outline"
              className="w-full sm:w-auto h-10 px-3.5 rounded-xl border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 font-bold gap-1.5 cursor-pointer text-xs sm:text-sm"
            >
              <Icons.Purchases />
              <span>+ فاتورة شراء</span>
              <span className="bg-slate-100 dark:bg-slate-800 text-slate-500 text-[10px] px-1.5 py-0.5 rounded-md font-mono">F2</span>
            </Button>
          </Link>
        </div>
      </div>

      {/* 2. Executive 4-KPI Metric Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-3.5 sm:gap-4">
        {/* KPI 1: مبيعات اليوم */}
        <Card className="p-4 rounded-2xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-[#111726] shadow-2xs hover:shadow-xs transition-all">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 dark:text-slate-400">مبيعات اليوم</span>
            <div className="w-8 h-8 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
              <TrendingUp className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2.5 flex items-baseline justify-between">
            <div className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white font-mono tracking-tight">
              {stats.todaySales.toLocaleString('ar-EG', { minimumFractionDigits: 2 })}
              <span className="text-xs font-bold text-slate-500 mr-1.5">ج.م</span>
            </div>
          </div>
          <div className="mt-2 flex items-center justify-between text-xs text-slate-500 dark:text-slate-400 border-t border-slate-100 dark:border-slate-800/80 pt-2">
            <span>الفواتير الصادرة اليوم</span>
            <Badge variant="secondary" className="font-bold text-[11px] py-0 px-2 font-mono">
              {stats.salesCount} فاتورة
            </Badge>
          </div>
        </Card>

        {/* KPI 2: مشتريات وتوريد */}
        <Card className="p-4 rounded-2xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-[#111726] shadow-2xs hover:shadow-xs transition-all">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 dark:text-slate-400">مشتريات اليوم</span>
            <div className="w-8 h-8 rounded-xl bg-amber-50 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400 flex items-center justify-center">
              <ShoppingBag className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2.5 flex items-baseline justify-between">
            <div className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white font-mono tracking-tight">
              {stats.todayPurchases.toLocaleString('ar-EG', { minimumFractionDigits: 2 })}
              <span className="text-xs font-bold text-slate-500 mr-1.5">ج.م</span>
            </div>
          </div>
          <div className="mt-2 flex items-center justify-between text-xs text-slate-500 dark:text-slate-400 border-t border-slate-100 dark:border-slate-800/80 pt-2">
            <span>حركات التوريد المنفذة</span>
            <Badge variant="secondary" className="font-bold text-[11px] py-0 px-2 font-mono">
              {stats.purchasesCount} توريدات
            </Badge>
          </div>
        </Card>

        {/* KPI 3: حالة المخزون والأصناف */}
        <Card className="p-4 rounded-2xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-[#111726] shadow-2xs hover:shadow-xs transition-all">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 dark:text-slate-400">إجمالي الأصناف النشطة</span>
            <div className="w-8 h-8 rounded-xl bg-sky-50 dark:bg-sky-950/60 text-sky-600 dark:text-sky-400 flex items-center justify-center">
              <Boxes className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2.5 flex items-baseline justify-between">
            <div className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white font-mono tracking-tight">
              {stats.productsCount}
              <span className="text-xs font-bold text-slate-500 mr-1.5">صنف مسجل</span>
            </div>
          </div>
          <div className="mt-2 flex items-center justify-between text-xs text-slate-500 dark:text-slate-400 border-t border-slate-100 dark:border-slate-800/80 pt-2">
            <span>تنبيهات النواقص</span>
            <Badge
              variant={stats.lowStockCount > 0 ? 'destructive' : 'secondary'}
              className="font-bold text-[11px] py-0 px-2 font-mono"
            >
              {stats.lowStockCount > 0 ? `${stats.lowStockCount} بحاجة للطلب` : 'المخزون آمن'}
            </Badge>
          </div>
        </Card>

        {/* KPI 4: الخزينة والسيولة النقدية */}
        <Card className="p-4 rounded-2xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-[#111726] shadow-2xs hover:shadow-xs transition-all">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 dark:text-slate-400">رصيد الخزائن النقدية</span>
            <div className="w-8 h-8 rounded-xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 flex items-center justify-center">
              <Wallet className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2.5 flex items-baseline justify-between">
            <div className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white font-mono tracking-tight">
              {stats.treasuryBalance.toLocaleString('ar-EG', { minimumFractionDigits: 2 })}
              <span className="text-xs font-bold text-slate-500 mr-1.5">ج.م</span>
            </div>
          </div>
          <div className="mt-2 flex items-center justify-between text-xs text-slate-500 dark:text-slate-400 border-t border-slate-100 dark:border-slate-800/80 pt-2">
            <span>السيولة المتاحة فوراً</span>
            <span className="text-[11px] font-bold text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
              <Zap className="w-3 h-3" />
              جاهز للعمليات
            </span>
          </div>
        </Card>
      </div>
    </div>
  );
};