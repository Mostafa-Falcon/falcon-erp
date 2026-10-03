'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useSessionStore } from '@/core/state/useSessionStore';
import {
  Store,
  BarChart3,
  RotateCcw,
  FileText,
  Users,
  ShoppingCart,
  Truck,
  Receipt,
  ShieldCheck,
  PlusCircle,
  QrCode,
  ArrowLeftRight,
  Settings,
  History,
  TrendingUp,
  User,
  Sparkles,
  Layers,
  ShoppingBag,
  Briefcase,
  ChevronLeft,
} from 'lucide-react';

export const HomeLauncherHub: React.FC = () => {
  const { currentUser, activeBranchId } = useSessionStore();
  const [branchName, setBranchName] = useState('الفرع الرئيسي');

  useEffect(() => {
    const orgId = currentUser?.org_id;
    if (!orgId) return;

    Promise.resolve()
      .then(async () => {
        const { db } = await import('@/core/db/app_database');
        const bid = activeBranchId || currentUser?.branch_id;
        if (bid) {
          const branch = await db.branches.get(bid);
          if (branch) {
            setBranchName(branch.name);
            return;
          }
        }
        const main = await db.branches.where('org_id').equals(orgId).and((b) => b.is_main).first();
        if (main) setBranchName(main.name);
      })
      .catch(() => {
        setBranchName('الفرع الرئيسي');
      });
  }, [currentUser, activeBranchId]);

  const userName = currentUser?.full_name || currentUser?.username || 'المسؤول';

  return (
    <div className="flex flex-col gap-6 w-full select-none" dir="rtl">
      {/* Welcome Banner — Modern SaaS Linear Style */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-blue-700 via-indigo-700 to-slate-900 dark:from-blue-950 dark:via-indigo-950 dark:to-slate-900 border border-blue-500/20 dark:border-blue-800/30 p-6 sm:p-7 text-white shadow-sm flex items-center justify-between">
        {/* Glow Highlights */}
        <div className="absolute -left-12 -bottom-12 w-48 h-48 rounded-full bg-blue-400/20 blur-3xl pointer-events-none" />
        <div className="absolute right-1/4 -top-12 w-48 h-48 rounded-full bg-indigo-400/15 blur-2xl pointer-events-none" />

        {/* User & Branch details */}
        <div className="flex flex-col gap-1.5 z-10">
          <div className="flex items-center gap-2">
            <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-white">
              أهلاً بك، {userName}
            </h1>
            <span className="text-2xl">👋</span>
          </div>
          <div className="flex items-center gap-2.5 mt-0.5">
            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-white/15 backdrop-blur-xs text-xs font-semibold text-blue-100 border border-white/20">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
              الفرع: {branchName}
            </span>
            <span className="text-xs text-blue-200/80 font-medium hidden sm:inline">
              منظومة فالكون السحابية المتكاملة
            </span>
          </div>
        </div>

        {/* User Initial Circle Avatar */}
        <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-2xl bg-white/10 border border-white/20 backdrop-blur-md flex items-center justify-center text-white shadow-inner shrink-0 z-10 font-black text-xl">
          {userName.charAt(0)}
        </div>
      </div>

      {/* 4 Large Module Columns Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-5 w-full">
        {/* ========================================================================= */}
        {/* 1. المبيعات (Sales) */}
        {/* ========================================================================= */}
        <div className="bg-surface rounded-2xl p-4 sm:p-5 border border-slate-200/80 dark:border-slate-800/80 shadow-2xs hover:shadow-xs transition-shadow flex flex-col gap-3.5">
          {/* Header */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-slate-900 dark:text-white font-black text-base">
              <div className="w-8 h-8 rounded-xl bg-blue-50 dark:bg-blue-950/60 border border-blue-200/60 dark:border-blue-900/60 flex items-center justify-center text-blue-600 dark:text-blue-400">
                <Sparkles className="w-4 h-4" />
              </div>
              <span>المبيعات</span>
            </div>
          </div>

          {/* Primary Action: نقطة البيع */}
          <Link
            href="/sales/pos"
            className="w-full h-24 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white flex flex-col items-center justify-center gap-1 shadow-xs hover:shadow-md transition-all duration-200 group cursor-pointer"
          >
            <Store className="w-6 h-6 text-white group-hover:scale-110 transition-transform duration-200" />
            <span className="font-black text-base text-white">نقطة البيع (POS)</span>
            <span className="text-3xs text-blue-100/90 font-medium">فتح شاشة الكاشير السريعة</span>
          </Link>

          {/* 2x2 Sub Actions */}
          <div className="grid grid-cols-2 gap-2">
            <Link
              href="/reports/sales"
              className="h-14 rounded-xl bg-slate-50/70 hover:bg-slate-100 dark:bg-slate-900/50 dark:hover:bg-slate-800/70 border border-slate-200/70 dark:border-slate-800 flex flex-col items-center justify-center gap-1 text-center transition-all cursor-pointer group"
            >
              <BarChart3 className="w-4 h-4 text-blue-600 dark:text-blue-400 group-hover:scale-110 transition-transform" />
              <span className="text-xs font-bold text-slate-700 dark:text-slate-300">تقرير المبيعات</span>
            </Link>

            <Link
              href="/sales/returns"
              className="h-14 rounded-xl bg-slate-50/70 hover:bg-slate-100 dark:bg-slate-900/50 dark:hover:bg-slate-800/70 border border-slate-200/70 dark:border-slate-800 flex flex-col items-center justify-center gap-1 text-center transition-all cursor-pointer group"
            >
              <RotateCcw className="w-4 h-4 text-slate-500 group-hover:scale-110 transition-transform" />
              <span className="text-xs font-bold text-slate-700 dark:text-slate-300">مرتجع بيع</span>
            </Link>

            <Link
              href="/sales/invoices"
              className="h-14 rounded-xl bg-slate-50/70 hover:bg-slate-100 dark:bg-slate-900/50 dark:hover:bg-slate-800/70 border border-slate-200/70 dark:border-slate-800 flex flex-col items-center justify-center gap-1 text-center transition-all cursor-pointer group"
            >
              <FileText className="w-4 h-4 text-slate-500 group-hover:scale-110 transition-transform" />
              <span className="text-xs font-bold text-slate-700 dark:text-slate-300">فواتير البيع</span>
            </Link>

            <Link
              href="/contacts/customers"
              className="h-14 rounded-xl bg-slate-50/70 hover:bg-slate-100 dark:bg-slate-900/50 dark:hover:bg-slate-800/70 border border-slate-200/70 dark:border-slate-800 flex flex-col items-center justify-center gap-1 text-center transition-all cursor-pointer group"
            >
              <Users className="w-4 h-4 text-slate-500 group-hover:scale-110 transition-transform" />
              <span className="text-xs font-bold text-slate-700 dark:text-slate-300">دليل العملاء</span>
            </Link>
          </div>
        </div>

        {/* ========================================================================= */}
        {/* 2. المشتريات (Purchases) */}
        {/* ========================================================================= */}
        <div className="bg-surface rounded-2xl p-4 sm:p-5 border border-slate-200/80 dark:border-slate-800/80 shadow-2xs hover:shadow-xs transition-shadow flex flex-col gap-3.5">
          {/* Header */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-slate-900 dark:text-white font-black text-base">
              <div className="w-8 h-8 rounded-xl bg-amber-50 dark:bg-amber-950/60 border border-amber-200/60 dark:border-amber-900/60 flex items-center justify-center text-amber-600 dark:text-amber-400">
                <ShoppingBag className="w-4 h-4" />
              </div>
              <span>المشتريات</span>
            </div>
          </div>

          {/* Primary Action: إضافة مشتريات */}
          <Link
            href="/purchases/invoices"
            className="w-full h-24 rounded-xl bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-700 hover:to-orange-700 text-white flex flex-col items-center justify-center gap-1 shadow-xs hover:shadow-md transition-all duration-200 group cursor-pointer"
          >
            <ShoppingCart className="w-6 h-6 text-white group-hover:scale-110 transition-transform duration-200" />
            <span className="font-black text-base text-white">فواتير الشراء</span>
            <span className="text-3xs text-amber-100/90 font-medium">تسجيل وتوريد الفواتير</span>
          </Link>

          {/* Sub Actions */}
          <div className="flex flex-col gap-2">
            <div className="grid grid-cols-2 gap-2">
              <Link
                href="/purchases/returns"
                className="h-14 rounded-xl bg-slate-50/70 hover:bg-slate-100 dark:bg-slate-900/50 dark:hover:bg-slate-800/70 border border-slate-200/70 dark:border-slate-800 flex flex-col items-center justify-center gap-1 text-center transition-all cursor-pointer group"
              >
                <RotateCcw className="w-4 h-4 text-amber-600 dark:text-amber-400 group-hover:scale-110 transition-transform" />
                <span className="text-xs font-bold text-slate-700 dark:text-slate-300">مرتجع شراء</span>
              </Link>

              <Link
                href="/contacts/suppliers"
                className="h-14 rounded-xl bg-slate-50/70 hover:bg-slate-100 dark:bg-slate-900/50 dark:hover:bg-slate-800/70 border border-slate-200/70 dark:border-slate-800 flex flex-col items-center justify-center gap-1 text-center transition-all cursor-pointer group"
              >
                <Truck className="w-4 h-4 text-slate-500 group-hover:scale-110 transition-transform" />
                <span className="text-xs font-bold text-slate-700 dark:text-slate-300">الموردين</span>
              </Link>
            </div>

            <Link
              href="/accounts/expenses"
              className="h-12 rounded-xl bg-slate-50/70 hover:bg-slate-100 dark:bg-slate-900/50 dark:hover:bg-slate-800/70 border border-slate-200/70 dark:border-slate-800 flex items-center justify-center gap-2 text-center transition-all cursor-pointer group w-full"
            >
              <Receipt className="w-4 h-4 text-rose-500 group-hover:scale-110 transition-transform" />
              <span className="text-xs font-bold text-slate-700 dark:text-slate-300">سندات المصروفات النقدية</span>
            </Link>
          </div>
        </div>

        {/* ========================================================================= */}
        {/* 3. المخزون والأصناف (Inventory) */}
        {/* ========================================================================= */}
        <div className="bg-surface rounded-2xl p-4 sm:p-5 border border-slate-200/80 dark:border-slate-800/80 shadow-2xs hover:shadow-xs transition-shadow flex flex-col gap-3.5">
          {/* Header */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-slate-900 dark:text-white font-black text-base">
              <div className="w-8 h-8 rounded-xl bg-teal-50 dark:bg-teal-950/60 border border-teal-200/60 dark:border-teal-900/60 flex items-center justify-center text-teal-600 dark:text-teal-400">
                <Layers className="w-4 h-4" />
              </div>
              <span>المخزون والأصناف</span>
            </div>
          </div>

          {/* Primary Action: دليل الأصناف */}
          <Link
            href="/items"
            className="w-full h-24 rounded-xl bg-gradient-to-r from-teal-600 to-emerald-600 hover:from-teal-700 hover:to-emerald-700 text-white flex flex-col items-center justify-center gap-1 shadow-xs hover:shadow-md transition-all duration-200 group cursor-pointer"
          >
            <Layers className="w-6 h-6 text-white group-hover:scale-110 transition-transform duration-200" />
            <span className="font-black text-base text-white">دليل الأصناف</span>
            <span className="text-3xs text-teal-100/90 font-medium">إدارة الكميات والأسعار</span>
          </Link>

          {/* 2x2 Sub Actions */}
          <div className="grid grid-cols-2 gap-2">
            <Link
              href="/items/new"
              className="h-14 rounded-xl bg-slate-50/70 hover:bg-slate-100 dark:bg-slate-900/50 dark:hover:bg-slate-800/70 border border-slate-200/70 dark:border-slate-800 flex flex-col items-center justify-center gap-1 text-center transition-all cursor-pointer group"
            >
              <PlusCircle className="w-4 h-4 text-teal-600 dark:text-teal-400 group-hover:scale-110 transition-transform" />
              <span className="text-xs font-bold text-slate-700 dark:text-slate-300">إضافة صنف</span>
            </Link>

            <Link
              href="/inventory/status"
              className="h-14 rounded-xl bg-slate-50/70 hover:bg-slate-100 dark:bg-slate-900/50 dark:hover:bg-slate-800/70 border border-slate-200/70 dark:border-slate-800 flex flex-col items-center justify-center gap-1 text-center transition-all cursor-pointer group"
            >
              <ShieldCheck className="w-4 h-4 text-slate-500 group-hover:scale-110 transition-transform" />
              <span className="text-xs font-bold text-slate-700 dark:text-slate-300">حالة الرصيد</span>
            </Link>

            <Link
              href="/items/barcode"
              className="h-14 rounded-xl bg-slate-50/70 hover:bg-slate-100 dark:bg-slate-900/50 dark:hover:bg-slate-800/70 border border-slate-200/70 dark:border-slate-800 flex flex-col items-center justify-center gap-1 text-center transition-all cursor-pointer group"
            >
              <QrCode className="w-4 h-4 text-slate-500 group-hover:scale-110 transition-transform" />
              <span className="text-xs font-bold text-slate-700 dark:text-slate-300">طباعة باركود</span>
            </Link>

            <Link
              href="/inventory/transfer"
              className="h-14 rounded-xl bg-slate-50/70 hover:bg-slate-100 dark:bg-slate-900/50 dark:hover:bg-slate-800/70 border border-slate-200/70 dark:border-slate-800 flex flex-col items-center justify-center gap-1 text-center transition-all cursor-pointer group"
            >
              <ArrowLeftRight className="w-4 h-4 text-slate-500 group-hover:scale-110 transition-transform" />
              <span className="text-xs font-bold text-slate-700 dark:text-slate-300">تحويل مخزون</span>
            </Link>
          </div>
        </div>

        {/* ========================================================================= */}
        {/* 4. الشؤون الإدارية والمالية (Finance & Admin) */}
        {/* ========================================================================= */}
        <div className="bg-surface rounded-2xl p-4 sm:p-5 border border-slate-200/80 dark:border-slate-800/80 shadow-2xs hover:shadow-xs transition-shadow flex flex-col gap-3.5">
          {/* Header */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-slate-900 dark:text-white font-black text-base">
              <div className="w-8 h-8 rounded-xl bg-violet-50 dark:bg-violet-950/60 border border-violet-200/60 dark:border-violet-900/60 flex items-center justify-center text-violet-600 dark:text-violet-400">
                <Briefcase className="w-4 h-4" />
              </div>
              <span>الشؤون الإدارية والمالية</span>
            </div>
          </div>

          {/* Primary Action: الإعدادات العامة */}
          <Link
            href="/settings"
            className="w-full h-24 rounded-xl bg-gradient-to-r from-violet-600 to-purple-600 hover:from-violet-700 hover:to-purple-700 text-white flex flex-col items-center justify-center gap-1 shadow-xs hover:shadow-md transition-all duration-200 group cursor-pointer"
          >
            <Settings className="w-6 h-6 text-white group-hover:scale-110 transition-transform duration-200" />
            <span className="font-black text-base text-white">إعدادات المنشأة</span>
            <span className="text-3xs text-violet-100/90 font-medium">الفروع والمستخدمين والتفضيلات</span>
          </Link>

          {/* Sub Actions */}
          <div className="flex flex-col gap-2">
            <div className="grid grid-cols-2 gap-2">
              <Link
                href="/employees"
                className="h-14 rounded-xl bg-slate-50/70 hover:bg-slate-100 dark:bg-slate-900/50 dark:hover:bg-slate-800/70 border border-slate-200/70 dark:border-slate-800 flex flex-col items-center justify-center gap-1 text-center transition-all cursor-pointer group"
              >
                <Users className="w-4 h-4 text-violet-600 dark:text-violet-400 group-hover:scale-110 transition-transform" />
                <span className="text-xs font-bold text-slate-700 dark:text-slate-300">طاقم العمل</span>
              </Link>

              <Link
                href="/accounts/journal"
                className="h-14 rounded-xl bg-slate-50/70 hover:bg-slate-100 dark:bg-slate-900/50 dark:hover:bg-slate-800/70 border border-slate-200/70 dark:border-slate-800 flex flex-col items-center justify-center gap-1 text-center transition-all cursor-pointer group"
              >
                <BookOpenIcon className="w-4 h-4 text-slate-500 group-hover:scale-110 transition-transform" />
                <span className="text-xs font-bold text-slate-700 dark:text-slate-300">قيود اليومية</span>
              </Link>
            </div>

            <Link
              href="/reports/profits"
              className="h-12 rounded-xl bg-slate-50/70 hover:bg-slate-100 dark:bg-slate-900/50 dark:hover:bg-slate-800/70 border border-slate-200/70 dark:border-slate-800 flex items-center justify-center gap-2 text-center transition-all cursor-pointer group w-full"
            >
              <TrendingUp className="w-4 h-4 text-emerald-500 group-hover:scale-110 transition-transform" />
              <span className="text-xs font-bold text-slate-700 dark:text-slate-300">تقرير الأرباح والخسائر</span>
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
};

function BookOpenIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg
      {...props}
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z" />
      <path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z" />
    </svg>
  );
}