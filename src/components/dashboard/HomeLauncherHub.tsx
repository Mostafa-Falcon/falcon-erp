'use client';

import React, { useEffect, useState } from'react';
import Link from'next/link';
import { useSessionStore } from'@/core/state/useSessionStore';
import {
 Store,
 BarChart3,
 RotateCcw,
 FileText,
 Users,
 ShoppingCart,
 Truck,
 Receipt,
 Pill,
 ShieldCheck,
 PlusCircle,
 QrCode,
 ArrowLeftRight,
 Settings,
 History,
 TrendingUp,
 User,
 RefreshCw,
 Sparkles,
 Layers,
 ShoppingBag,
 Briefcase,
} from'lucide-react';

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

 const userName = currentUser?.full_name || currentUser?.username ||'المسؤول';

 return (
 <div className="flex flex-col gap-6 w-full select-none"dir="rtl">
 {/* Top Banner & Cloud Sync Indicator */}
 <div className="flex items-center justify-between">
 <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-emerald-700 dark:text-emerald-400 text-xs font-bold">
 <RefreshCw className="w-3.5 h-3.5"/>
 <span>متصل (سحابي)</span>
 <span className="w-2 h-2 rounded-full bg-emerald-500 inline-block"></span>
 </div>
 </div>

 {/* Royal Blue Welcome Card */}
 <div className="w-full rounded-2xl bg-gradient-to-r from-[#2051a5] to-[#1c448c] text-white p-6 sm:p-7 shadow-md flex items-center justify-between relative overflow-hidden">
 {/* Right Details */}
 <div className="flex flex-col gap-1.5 z-10">
 <div className="flex items-center gap-2">
 <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-white">
 أهلاً بك {userName}
 </h1>
 <span className="text-2xl">👋</span>
 </div>
 <p className="text-sm font-semibold text-blue-100/90">
 الفرع: {branchName}
 </p>
 </div>

 {/* Left User Circle Avatar */}
 <div className="w-16 h-16 sm:w-18 sm:h-18 rounded-full bg-white/20 border border-white/30 flex items-center justify-center text-white shadow-inner shrink-0 z-10">
 <User className="w-9 h-9 text-white"/>
 </div>

 {/* Subtle Background Glow */}
 <div className="absolute -left-10 -bottom-10 w-40 h-40 rounded-full bg-white/10 blur-2xl pointer-events-none"/>
 <div className="absolute right-1/3 -top-10 w-32 h-32 rounded-full bg-blue-400/10 blur-xl pointer-events-none"/>
 </div>

 {/* 4 Large Module Columns Grid */}
 <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-5 w-full">
 {/* ========================================================================= */}
 {/* 1. المبيعات (Sales - Fuchsia/Magenta) */}
 {/* ========================================================================= */}
 <div className="bg-surface rounded-2xl p-4 sm:p-5 border border-slate-200/80 dark:border-slate-800 shadow-xs flex flex-col gap-3.5">
 {/* Header */}
 <div className="flex items-center gap-2 text-slate-800 dark:text-slate-100 font-bold text-base">
 <Sparkles className="w-5 h-5 text-[#d9008f]"/>
 <span>المبيعات</span>
 </div>

 {/* Big Primary Action: نقطة البيع */}
 <Link
 href="/sales/pos"
 className="w-full h-28 rounded-xl bg-[#d9008f] hover:bg-[#c20080] text-white flex flex-col items-center justify-center gap-1.5 shadow-sm hover:shadow-md transition-all duration-200 group cursor-pointer"
 >
 <Store className="w-7 h-7 text-white group-hover:scale-110 transition-transform duration-200"/>
 <span className="font-extrabold text-lg text-white">نقطة البيع</span>
 <span className="text-2xs text-white/80 font-medium">فتح العملية</span>
 </Link>

 {/* 2x2 Sub Actions */}
 <div className="grid grid-cols-2 gap-2.5">
 <Link
 href="/reports/sales"
 className="h-16 rounded-xl bg-[#d9008f] hover:bg-[#c20080] text-white flex flex-col items-center justify-center gap-1 text-center shadow-xs hover:shadow-sm transition-all duration-150 cursor-pointer"
 >
 <BarChart3 className="w-4 h-4 text-white"/>
 <span className="text-xs font-bold text-white">تقرير مبيعات</span>
 </Link>

 <Link
 href="/sales/returns"
 className="h-16 rounded-xl bg-[#d9008f] hover:bg-[#c20080] text-white flex flex-col items-center justify-center gap-1 text-center shadow-xs hover:shadow-sm transition-all duration-150 cursor-pointer"
 >
 <RotateCcw className="w-4 h-4 text-white"/>
 <span className="text-xs font-bold text-white">مرتجع بيع</span>
 </Link>

 <Link
 href="/sales/invoices"
 className="h-16 rounded-xl bg-[#d9008f] hover:bg-[#c20080] text-white flex flex-col items-center justify-center gap-1 text-center shadow-xs hover:shadow-sm transition-all duration-150 cursor-pointer"
 >
 <FileText className="w-4 h-4 text-white"/>
 <span className="text-xs font-bold text-white">عروض أسعار</span>
 </Link>

 <Link
 href="/contacts/customers"
 className="h-16 rounded-xl bg-[#d9008f] hover:bg-[#c20080] text-white flex flex-col items-center justify-center gap-1 text-center shadow-xs hover:shadow-sm transition-all duration-150 cursor-pointer"
 >
 <Users className="w-4 h-4 text-white"/>
 <span className="text-xs font-bold text-white">العملاء</span>
 </Link>
 </div>
 </div>

 {/* ========================================================================= */}
 {/* 2. المشتريات (Purchases - Warm Amber) */}
 {/* ========================================================================= */}
 <div className="bg-surface rounded-2xl p-4 sm:p-5 border border-slate-200/80 dark:border-slate-800 shadow-xs flex flex-col gap-3.5">
 {/* Header */}
 <div className="flex items-center gap-2 text-slate-800 dark:text-slate-100 font-bold text-base">
 <ShoppingBag className="w-5 h-5 text-[#d97706]"/>
 <span>المشتريات</span>
 </div>

 {/* Big Primary Action: إضافة مشتريات */}
 <Link
 href="/purchases/invoices"
 className="w-full h-28 rounded-xl bg-[#d97706] hover:bg-[#b45309] text-white flex flex-col items-center justify-center gap-1.5 shadow-sm hover:shadow-md transition-all duration-200 group cursor-pointer"
 >
 <ShoppingCart className="w-7 h-7 text-white group-hover:scale-110 transition-transform duration-200"/>
 <span className="font-extrabold text-lg text-white">إضافة مشتريات</span>
 <span className="text-2xs text-white/80 font-medium">فتح العملية</span>
 </Link>

 {/* Sub Actions (Row of 2 + 1 Full Width) */}
 <div className="flex flex-col gap-2.5">
 <div className="grid grid-cols-2 gap-2.5">
 <Link
 href="/purchases/returns"
 className="h-16 rounded-xl bg-[#d97706] hover:bg-[#b45309] text-white flex flex-col items-center justify-center gap-1 text-center shadow-xs hover:shadow-sm transition-all duration-150 cursor-pointer"
 >
 <RotateCcw className="w-4 h-4 text-white"/>
 <span className="text-xs font-bold text-white">مرتجع شراء</span>
 </Link>

 <Link
 href="/contacts/suppliers"
 className="h-16 rounded-xl bg-[#d97706] hover:bg-[#b45309] text-white flex flex-col items-center justify-center gap-1 text-center shadow-xs hover:shadow-sm transition-all duration-150 cursor-pointer"
 >
 <Truck className="w-4 h-4 text-white"/>
 <span className="text-xs font-bold text-white">الموردين</span>
 </Link>
 </div>

 <Link
 href="/accounts/expenses"
 className="h-16 rounded-xl bg-[#d97706] hover:bg-[#b45309] text-white flex flex-col items-center justify-center gap-1 text-center shadow-xs hover:shadow-sm transition-all duration-150 cursor-pointer w-full"
 >
 <Receipt className="w-4 h-4 text-white"/>
 <span className="text-xs font-bold text-white">المصروفات</span>
 </Link>
 </div>
 </div>

 {/* ========================================================================= */}
 {/* 3. المخزون والأصناف (Inventory & Products - Teal) */}
 {/* ========================================================================= */}
 <div className="bg-surface rounded-2xl p-4 sm:p-5 border border-slate-200/80 dark:border-slate-800 shadow-xs flex flex-col gap-3.5">
 {/* Header */}
 <div className="flex items-center gap-2 text-slate-800 dark:text-slate-100 font-bold text-base">
 <Layers className="w-5 h-5 text-[#0d9488]"/>
 <span>المخزون والأصناف</span>
 </div>

 {/* Big Primary Action: دليل الأصناف */}
 <Link
 href="/items"
 className="w-full h-28 rounded-xl bg-[#0d9488] hover:bg-[#0f766e] text-white flex flex-col items-center justify-center gap-1.5 shadow-sm hover:shadow-md transition-all duration-200 group cursor-pointer"
 >
 <Layers className="w-7 h-7 text-white group-hover:scale-110 transition-transform duration-200"/>
 <span className="font-extrabold text-lg text-white">دليل الأصناف</span>
 <span className="text-2xs text-white/80 font-medium">إدارة الكميات والأسعار</span>
 </Link>

 {/* 2x2 Sub Actions */}
 <div className="grid grid-cols-2 gap-2.5">
 <Link
 href="/items/new"
 className="h-16 rounded-xl bg-[#0d9488] hover:bg-[#0f766e] text-white flex flex-col items-center justify-center gap-1 text-center shadow-xs hover:shadow-sm transition-all duration-150 cursor-pointer"
 >
 <PlusCircle className="w-4 h-4 text-white"/>
 <span className="text-xs font-bold text-white">إضافة صنف</span>
 </Link>

 <Link
 href="/inventory/status"
 className="h-16 rounded-xl bg-[#0d9488] hover:bg-[#0f766e] text-white flex flex-col items-center justify-center gap-1 text-center shadow-xs hover:shadow-sm transition-all duration-150 cursor-pointer"
 >
 <ShieldCheck className="w-4 h-4 text-white"/>
 <span className="text-xs font-bold text-white">حالة المخزون</span>
 </Link>

 <Link
 href="/items/barcode"
 className="h-16 rounded-xl bg-[#0d9488] hover:bg-[#0f766e] text-white flex flex-col items-center justify-center gap-1 text-center shadow-xs hover:shadow-sm transition-all duration-150 cursor-pointer"
 >
 <QrCode className="w-4 h-4 text-white"/>
 <span className="text-xs font-bold text-white">طباعة باركود</span>
 </Link>

 <Link
 href="/inventory/transfer"
 className="h-16 rounded-xl bg-[#0d9488] hover:bg-[#0f766e] text-white flex flex-col items-center justify-center gap-1 text-center shadow-xs hover:shadow-sm transition-all duration-150 cursor-pointer"
 >
 <ArrowLeftRight className="w-4 h-4 text-white"/>
 <span className="text-xs font-bold text-white">تحويل مخزون</span>
 </Link>
 </div>
 </div>

 {/* ========================================================================= */}
 {/* 4. الشؤون الإدارية والمالية (Admin & Finance - Indigo) */}
 {/* ========================================================================= */}
 <div className="bg-surface rounded-2xl p-4 sm:p-5 border border-slate-200/80 dark:border-slate-800 shadow-xs flex flex-col gap-3.5">
 {/* Header */}
 <div className="flex items-center gap-2 text-slate-800 dark:text-slate-100 font-bold text-base">
 <Briefcase className="w-5 h-5 text-[#4f46e5]"/>
 <span>الشؤون الإدارية والمالية</span>
 </div>

 {/* Big Primary Action: الإعدادات */}
 <Link
 href="/settings"
 className="w-full h-28 rounded-xl bg-[#4f46e5] hover:bg-[#4338ca] text-white flex flex-col items-center justify-center gap-1.5 shadow-sm hover:shadow-md transition-all duration-200 group cursor-pointer"
 >
 <Settings className="w-7 h-7 text-white group-hover:scale-110 transition-transform duration-200"/>
 <span className="font-extrabold text-lg text-white">الإعدادات</span>
 <span className="text-2xs text-white/80 font-medium">فتح الإعدادات</span>
 </Link>

 {/* Sub Actions (Row of 2 + 1 Full Width) */}
 <div className="flex flex-col gap-2.5">
 <div className="grid grid-cols-2 gap-2.5">
 <Link
 href="/employees"
 className="h-16 rounded-xl bg-[#4f46e5] hover:bg-[#4338ca] text-white flex flex-col items-center justify-center gap-1 text-center shadow-xs hover:shadow-sm transition-all duration-150 cursor-pointer"
 >
 <Briefcase className="w-4 h-4 text-white"/>
 <span className="text-xs font-bold text-white">المستخدمين</span>
 </Link>

 <Link
 href="/settings"
 className="h-16 rounded-xl bg-[#4f46e5] hover:bg-[#4338ca] text-white flex flex-col items-center justify-center gap-1 text-center shadow-xs hover:shadow-sm transition-all duration-150 cursor-pointer"
 >
 <History className="w-4 h-4 text-white"/>
 <span className="text-xs font-bold text-white">سجل النشاط</span>
 </Link>
 </div>

 <Link
 href="/reports/sales"
 className="h-16 rounded-xl bg-[#4f46e5] hover:bg-[#4338ca] text-white flex flex-col items-center justify-center gap-1 text-center shadow-xs hover:shadow-sm transition-all duration-150 cursor-pointer w-full"
 >
 <TrendingUp className="w-4 h-4 text-white"/>
 <span className="text-xs font-bold text-white">الأرباح والخسائر</span>
 </Link>
 </div>
 </div>
 </div>
 </div>
 );
};