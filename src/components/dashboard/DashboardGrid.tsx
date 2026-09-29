'use client';

import React from'react';
import Link from'next/link';
import { Card } from'@/components/ui/card';
import { Badge } from'@/components/ui/badge';
import { Icons } from'@/components/ui/Icons';
import {
 ArrowLeft,
 ChevronLeft,
 Receipt,
 RotateCcw,
 Clock,
 Truck,
 PlusCircle,
 ShieldCheck,
 Barcode,
 Wallet,
 Coins,
 SlidersHorizontal,
} from'lucide-react';

interface SubActionItem {
 title: string;
 href: string;
 icon: React.ReactNode;
}

interface ModuleSectionProps {
 title: string;
 badge: string;
 accent: {
 text: string;
 border: string;
 heroGradient: string;
 heroHoverGradient: string;
 hoverBorder: string;
 iconBg: string;
 };
 headerIcon: React.ReactNode;
 hero: {
 title: string;
 shortcut?: string;
 href: string;
 icon: React.ReactNode;
 };
 actions: [SubActionItem, SubActionItem, SubActionItem];
}

const ModuleCard: React.FC<ModuleSectionProps> = ({
 title,
 badge,
 accent,
 headerIcon,
 hero,
 actions,
}) => {
 return (
 <Card className="flex flex-col justify-between p-4 rounded-2xl border border-slate-200/80 dark:border-slate-800 bg-surface shadow-2xs hover:shadow-xs transition-all duration-200">
 {/* Module Header */}
 <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800/80">
 <div className="flex items-center gap-2">
 <div
 className={`w-8 h-8 rounded-xl flex items-center justify-center border shadow-2xs ${accent.iconBg} ${accent.text} ${accent.border}`}
 >
 {headerIcon}
 </div>
 <h2 className="font-bold text-slate-900 dark:text-white text-sm">
 {title}
 </h2>
 </div>
 <Badge
 variant="secondary"
 className="text-3xs font-bold py-0.5 px-2 bg-slate-100 dark:bg-slate-800/70 text-slate-600 dark:text-slate-300 border border-slate-200/60 dark:border-slate-700/60"
 >
 {badge}
 </Badge>
 </div>

 {/* Primary Hero Action */}
 <div className="my-3">
 <Link
 href={hero.href}
 className={`group relative w-full h-[68px] rounded-xl bg-gradient-to-l ${accent.heroGradient} hover:${accent.heroHoverGradient} text-white px-3.5 py-2.5 flex items-center justify-between shadow-2xs hover:shadow-xs transition-all duration-200 cursor-pointer overflow-hidden`}
 >
 <div className="flex items-center gap-2.5 z-10">
 <div className="w-9 h-9 rounded-lg bg-white/20 border border-white/25 flex items-center justify-center text-white shrink-0 group-hover:scale-105 transition-transform duration-200">
 {hero.icon}
 </div>
 <div className="flex flex-col text-right">
 <span className="font-bold text-sm leading-tight text-white">
 {hero.title}
 </span>
 <span className="text-3xs text-white/80 font-medium mt-0.5">فتح العملية الفورية</span>
 </div>
 </div>

 <div className="flex items-center gap-1.5 z-10">
 {hero.shortcut && (
 <span className="bg-white/25 border border-white/30 text-white font-mono text-3xs font-bold px-1.5 py-0.5 rounded-md">
 {hero.shortcut}
 </span>
 )}
 <div className="w-6 h-6 rounded-md bg-white/15 flex items-center justify-center text-white group-hover:-translate-x-0.5 transition-transform duration-200">
 <ArrowLeft className="w-3.5 h-3.5"/>
 </div>
 </div>
 </Link>
 </div>

 {/* 3 Direct Active Actions */}
 <div className="space-y-1.5">
 {actions.map((item, idx) => (
 <Link
 key={idx}
 href={item.href}
 className={`group h-10 rounded-xl bg-slate-50/70 dark:bg-slate-800/40 hover:bg-white dark:hover:bg-slate-800/90 border border-slate-200/60 dark:border-slate-800/80 hover:${accent.hoverBorder} px-3 flex items-center justify-between transition-all duration-150 shadow-2xs cursor-pointer`}
 >
 <div className="flex items-center gap-2">
 <span className={`${accent.text} shrink-0`}>{item.icon}</span>
 <span className="font-semibold text-xs text-slate-700 dark:text-slate-200 group-hover:text-slate-900 dark:group-hover:text-white">
 {item.title}
 </span>
 </div>
 <ChevronLeft className="w-3.5 h-3.5 text-slate-400 group-hover:text-slate-600 dark:group-hover:text-slate-200 group-hover:-translate-x-0.5 transition-transform"/>
 </Link>
 ))}
 </div>
 </Card>
 );
};

export const DashboardGrid: React.FC = () => {
 return (
 <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4 w-full select-none">
 {/* 1. المبيعات (Sales) */}
 <ModuleCard
 title="المبيعات والكاشير"
 badge="العمليات النقدية"
 headerIcon={<Icons.Sales />}
 accent={{
 text:'text-sky-600 dark:text-sky-400',
 border:'border-sky-200/80 dark:border-sky-800/80',
 heroGradient:'from-[#0284c7] to-[#0369a1]',
 heroHoverGradient:'from-[#0369a1] to-[#075985]',
 hoverBorder:'border-sky-400 dark:border-sky-500',
 iconBg:'bg-sky-50 dark:bg-sky-950/60',
 }}
 hero={{
 title:'نقطة البيع (POS)',
 shortcut:'F1',
 href:'/sales/pos',
 icon: <Icons.CashRegister />,
 }}
 actions={[
 { title:'فواتير المبيعات', href:'/sales/invoices', icon: <Receipt className="w-3.5 h-3.5"/> },
 { title:'مرتجع مبيعات', href:'/sales/returns', icon: <RotateCcw className="w-3.5 h-3.5"/> },
 { title:'ورديات الكاشير', href:'/sales/shifts', icon: <Clock className="w-3.5 h-3.5"/> },
 ]}
 />

 {/* 2. المشتريات (Purchases) */}
 <ModuleCard
 title="المشتريات والتوريد"
 badge="التوريد والموردين"
 headerIcon={<Icons.Purchases />}
 accent={{
 text:'text-amber-600 dark:text-amber-400',
 border:'border-amber-200/80 dark:border-amber-800/80',
 heroGradient:'from-[#d97706] to-[#b45309]',
 heroHoverGradient:'from-[#b45309] to-[#92400e]',
 hoverBorder:'border-amber-400 dark:border-amber-500',
 iconBg:'bg-amber-50 dark:bg-amber-950/60',
 }}
 hero={{
 title:'فاتورة شراء وتوريد',
 shortcut:'F2',
 href:'/purchases/invoices/new',
 icon: <Icons.Purchases />,
 }}
 actions={[
 { title:'سجل فواتير الشراء', href:'/purchases/invoices', icon: <Receipt className="w-3.5 h-3.5"/> },
 { title:'مرتجع مشتريات', href:'/purchases/returns', icon: <RotateCcw className="w-3.5 h-3.5"/> },
 { title:'دليل الموردين', href:'/contacts/suppliers', icon: <Truck className="w-3.5 h-3.5"/> },
 ]}
 />

 {/* 3. المخزون والأصناف (Inventory) */}
 <ModuleCard
 title="المخزون والأصناف"
 badge="المستودع والباركود"
 headerIcon={<Icons.Items />}
 accent={{
 text:'text-emerald-600 dark:text-emerald-400',
 border:'border-emerald-200/80 dark:border-emerald-800/80',
 heroGradient:'from-[#16a34a] to-[#15803d]',
 heroHoverGradient:'from-[#15803d] to-[#166534]',
 hoverBorder:'border-emerald-400 dark:border-emerald-500',
 iconBg:'bg-emerald-50 dark:bg-emerald-950/60',
 }}
 hero={{
 title:'دليل الأصناف والأسعار',
 shortcut:'F3',
 href:'/items',
 icon: <Icons.Boxes />,
 }}
 actions={[
 { title:'إضافة صنف جديد', href:'/items/new', icon: <PlusCircle className="w-3.5 h-3.5"/> },
 { title:'جرد ونواقص المخزون', href:'/inventory/status', icon: <ShieldCheck className="w-3.5 h-3.5"/> },
 { title:'طباعة الباركود والملصقات', href:'/items/barcode', icon: <Barcode className="w-3.5 h-3.5"/> },
 ]}
 />

 {/* 4. الخزائن والمالية (Finance) */}
 <ModuleCard
 title="المالية والخزائن"
 badge="الصناديق والقيود"
 headerIcon={<Icons.Accounts />}
 accent={{
 text:'text-indigo-600 dark:text-indigo-400',
 border:'border-indigo-200/80 dark:border-indigo-800/80',
 heroGradient:'from-[#4f46e5] to-[#4338ca]',
 heroHoverGradient:'from-[#4338ca] to-[#3730a3]',
 hoverBorder:'border-indigo-400 dark:border-indigo-500',
 iconBg:'bg-indigo-50 dark:bg-indigo-950/60',
 }}
 hero={{
 title:'سندات القبض والصرف',
 href:'/accounts/vouchers',
 icon: <Receipt className="w-4 h-4"/>,
 }}
 actions={[
 { title:'الخزائن والبنوك', href:'/accounts/treasuries', icon: <Wallet className="w-3.5 h-3.5"/> },
 { title:'سجل المصروفات', href:'/accounts/expenses', icon: <Coins className="w-3.5 h-3.5"/> },
 { title:'إعدادات المنظومة', href:'/settings', icon: <SlidersHorizontal className="w-3.5 h-3.5"/> },
 ]}
 />
 </div>
 );
};