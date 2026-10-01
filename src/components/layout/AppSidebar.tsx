'use client';

import React, { useEffect, useState } from'react';
import Link from'next/link';
import { usePathname } from'next/navigation';
import { Icons } from'@/components/ui/Icons';
import { useSessionStore } from'@/core/state/useSessionStore';
import { ScrollArea } from'@/components/ui/scroll-area';
import {
 Accordion,
 AccordionContent,
 AccordionItem,
 AccordionTrigger,
} from'@/components/ui/accordion';
import { Input } from'@/components/ui/input';
import { Separator } from'@/components/ui/separator';
import { cn } from'@/lib/utils';
import {
 Package,
 PlusCircle,
 Printer,
 ArrowLeftRight,
 ClipboardCheck,
 Trash2,
 Bell,
 Building2,
 FolderTree,
 Tags,
 BadgeDollarSign,
 Copy,
 ShieldCheck,
 Tag,
 SlidersHorizontal,
 Repeat2,
 ArrowRightToLine,
 FileDown,
 Archive,
 HeartPulse,
 FileUp,
 Settings,
 Store,
 QrCode,
 Wallet,
 Smartphone,
 Wrench,
 Check,
 History,
 UserCheck,
 CalendarX,
 FileText,
 Briefcase,
 FileCheck,
 Bike,
 FolderOpen,
 HandCoins,
 Contact,
 Truck,
 Users,
 Handshake,
 BookOpen,
 Scale,
 Landmark,
 TrendingUp,
 ShoppingCart,
 Receipt,
 RotateCcw,
 Undo2,
 BarChart3,
 CreditCard,
 Layers,
 PieChart,
} from'lucide-react';
import type { Branch } from'@/types';
import { getDomainProfile } from'@/core/constants/domain_profiles';
import { getSubscriptionProfile, getSubscriptionPermissions } from'@/core/constants/subscription_profiles';

interface AppSidebarProps {
 isOpen: boolean;
 /** Resolved`lg`match. Owned by the shell so the breakpoint has one source. */
 isDesktop: boolean;
 onClose?: () => void;
}

interface NavItem {
 id: string;
 label: string;
 icon: React.ReactNode;
 href?: string;
 subItems?: { label: string; href: string; icon?: React.ReactNode }[];
}

export const AppSidebar: React.FC<AppSidebarProps> = ({ isOpen, isDesktop, onClose }) => {
 const pathname = usePathname();
 const { currentUser, activeBranchId, setActiveBranchId } = useSessionStore();
 const [orgName, setOrgName] = useState('لوجيسكا ERP');
 const [orgActivity, setOrgActivity] = useState('retail');
 const [orgSubscription, setOrgSubscription] = useState('standard');
 const [branchName, setBranchName] = useState('الفرع الرئيسي');
 const [searchQuery, setSearchQuery] = useState('');

 const domain = getDomainProfile(orgActivity);
 const subProfile = getSubscriptionProfile(orgSubscription);

 // Branch switcher state
 const [branches, setBranches] = useState<Branch[]>([]);
 const [isBranchMenuOpen, setIsBranchMenuOpen] = useState(false);

 useEffect(() => {
 const orgId = currentUser?.org_id;
 if (!orgId) return;

 Promise.resolve()
 .then(async () => {
 const { db } = await import('@/core/db/app_database');
 const org = await db.organizations.get(orgId);
 if (org) {
 setOrgName(org.name);
 if (org.activity_type) setOrgActivity(org.activity_type);
 if (org.subscription_tier) setOrgSubscription(org.subscription_tier);
 }

 // Fetch all active branches
 const branchList = await db.branches.where('org_id').equals(orgId).and(b => b.is_active).toArray();
 setBranches(branchList);

 const bid = activeBranchId || currentUser?.branch_id;
 if (bid) {
 const branch = branchList.find(b => b.id === bid);
 if (branch) {
 setBranchName(branch.name);
 if (!activeBranchId) setActiveBranchId(bid);
 return;
 }
 }

 const main = branchList.find(b => b.is_main);
 if (main) {
 setBranchName(main.name);
 if (!activeBranchId) setActiveBranchId(main.id);
 }
 })
 .catch(() => {
 setBranchName('الفرع الرئيسي');
 });
 }, [currentUser, activeBranchId, setActiveBranchId]);

 const handleSwitchBranch = (branch: Branch) => {
 setActiveBranchId(branch.id);
 setBranchName(branch.name);
 setIsBranchMenuOpen(false);
 // Optional: Refresh page or notify user
 };

 const navItems: NavItem[] = [
 { id:'home', label:'الرئيسية', icon: <Icons.Home />, href:'/'},
 { id:'monitoring', label:'لوحة المتابعة', icon: <Icons.Monitoring />, href:'/monitoring'},
 {
 id:'items',
 label: domain.itemsCategoryLabel,
 icon: <Icons.Items />,
 subItems: [
 { label: domain.itemsListLabel, href:'/items', icon: <Package className="w-4 h-4"/> },
 { label: domain.itemsAddLabel, href:'/items/new', icon: <PlusCircle className="w-4 h-4"/> },
 { label:'طباعة الملصقات والباركود', href:'/items/barcode', icon: <Printer className="w-4 h-4"/> },
 { label:'تحويل مخزون', href:'/inventory/transfer', icon: <ArrowLeftRight className="w-4 h-4"/> },
 { label:'الجرد الفعلي للمخزون', href:'/inventory/stocktake', icon: <ClipboardCheck className="w-4 h-4"/> },
 { label:'المخزون التالف والمنتهي', href:'/inventory/damages', icon: <Trash2 className="w-4 h-4"/> },
 { label: domain.expiryAlertsLabel, href:'/inventory/expiry-alerts', icon: <Bell className="w-4 h-4"/> },
 { label: domain.brandsLabel, href:'/items/brands', icon: <Building2 className="w-4 h-4"/> },
 { label:'المجموعات والتصنيفات', href:'/items/categories', icon: <FolderTree className="w-4 h-4"/> },
 { label:'أنواع المنتجات', href:'/items/types', icon: <Tags className="w-4 h-4"/> },
 { label:'مجموعات التسعير', href:'/items/price-groups', icon: <BadgeDollarSign className="w-4 h-4"/> },
 { label: domain.substitutesLabel, href:'/items/substitutes', icon: <Copy className="w-4 h-4"/> },
 { label:'ضمانات الأصناف', href:'/items/warranties', icon: <ShieldCheck className="w-4 h-4"/> },
 { label:'العروض والخصومات', href:'/items/discounts', icon: <Tag className="w-4 h-4"/> },
 { label:'تسويات المخزون', href:'/inventory/adjustments', icon: <SlidersHorizontal className="w-4 h-4"/> },
 { label:'تبادل الأصناف', href:'/items/exchange', icon: <Repeat2 className="w-4 h-4"/> },
 { label:'رصيد أول المدة', href:'/items/opening-balance', icon: <ArrowRightToLine className="w-4 h-4"/> },
 { label:'تحديث جماعي للأسعار', href:'/items/bulk-update', icon: <FileDown className="w-4 h-4"/> },
 { label:'أرشيف الأصناف', href:'/items/archive', icon: <Archive className="w-4 h-4"/> },
 { label:'صحة المخزون والركود', href:'/inventory/health', icon: <HeartPulse className="w-4 h-4"/> },
 { label:'استيراد وتصدير بيانات', href:'/items/import', icon: <FileUp className="w-4 h-4"/> },
 ],
 },
 {
 id:'purchases',
 label:'المشتريات',
 icon: <Icons.Purchases />,
 subItems: [
 { label:'إضافة مشتريات', href:'/purchases/invoices/new', icon: <ShoppingCart className="w-4 h-4"/> },
 { label:'كل المشتريات', href:'/purchases/invoices', icon: <Receipt className="w-4 h-4"/> },
 { label:'أوامر الشراء (PO)', href:'/purchases/orders', icon: <ShoppingCart className="w-4 h-4"/> },
 { label:'مرتجع مشتريات بفاتورة', href:'/purchases/returns', icon: <RotateCcw className="w-4 h-4"/> },
 { label:'مرتجع مشتريات حرة', href:'/purchases/returns/new', icon: <Undo2 className="w-4 h-4"/> },
 { label:'تقرير المشتريات', href:'/reports/purchases', icon: <BarChart3 className="w-4 h-4"/> },
 { label:'قائمة المصاريف', href:'/accounts/expenses', icon: <Wallet className="w-4 h-4"/> },
 { label:'إضافة المصاريف', href:'/accounts/expenses?action=new', icon: <CreditCard className="w-4 h-4"/> },
 { label:'فئات المصاريف', href:'/accounts/expenses?tab=categories', icon: <Layers className="w-4 h-4"/> },
 { label:'تقرير المصاريف', href:'/reports/expenses', icon: <PieChart className="w-4 h-4"/> },
 ],
 },
 {
 id:'sales',
 label:'المبيعات',
 icon: <Icons.Sales />,
 subItems: [
 { label: domain.posTitle, href:'/sales/pos'},
 { label:'فواتير المبيعات', href:'/sales/invoices'},
 { label:'إدارة المبيعات بالتقسيط', href:'/sales/installments', icon: <CreditCard className="w-4 h-4 text-indigo-500"/> },
 { label:'عروض الأسعار', href:'/sales/quotes', icon: <FileText className="w-4 h-4"/> },
 { label:'مراجعة الروشتات', href:'/sales/prescriptions', icon: <FileCheck className="w-4 h-4"/> },
 { label:'مرتجعات المبيعات', href:'/sales/returns'},
 { label:'ورديات الكاشير', href:'/sales/shifts'},
 ],
 },
 {
 id:'mobile',
 label:'الموبايل والصيانة',
 icon: <Smartphone className="w-4 h-4 text-sky-500"/>,
 subItems: [
 { label:'مركز أذونات الصيانة', href:'/mobile/maintenance', icon: <Wrench className="w-4 h-4"/> },
 { label:'تتبع السيريال والـ IMEI', href:'/mobile/serials', icon: <QrCode className="w-4 h-4"/> },
 { label:'المحافظ والشحن كاش', href:'/mobile/wallets', icon: <Wallet className="w-4 h-4"/> },
 ],
 },
 {
 id:'contacts',
 label:'العملاء والموردين',
 icon: <Icons.Contacts />,
 subItems: [
 { label:'دليل الموردين', href:'/contacts/suppliers', icon: <Truck className="w-4 h-4"/> },
 { label:'دليل العملاء', href:'/contacts/customers', icon: <Users className="w-4 h-4"/> },
 { label:'دليل مورد / عميل', href:'/contacts/both', icon: <Handshake className="w-4 h-4"/> },
 { label:'مجموعات العملاء', href:'/contacts/customer-groups', icon: <Users className="w-4 h-4"/> },
 { label:'مندوبي المبيعات', href:'/contacts/sales-reps', icon: <UserCheck className="w-4 h-4"/> },
 { label:'مندوبي التوصيل', href:'/contacts/delivery-agents', icon: <Bike className="w-4 h-4"/> },
 { label:'متابعة الـ CRM', href:'/contacts/crm', icon: <Briefcase className="w-4 h-4"/> },
 ],
 },
 {
 id:'employees',
 label:'الموظفين والمستخدمين',
 icon: <Icons.Employees />,
 subItems: [
 { label:'دليل الموظفين', href:'/employees/directory', icon: <Contact className="w-4 h-4"/> },
 { label:'الحضور والانصراف', href:'/employees/attendance', icon: <UserCheck className="w-4 h-4"/> },
 { label:'مسيرات الرواتب', href:'/employees/payroll', icon: <FileText className="w-4 h-4"/> },
 { label:'الإجازات والمغادرات', href:'/employees/leaves', icon: <CalendarX className="w-4 h-4"/> },
 { label:'السلف والمكافآت', href:'/employees/advances', icon: <HandCoins className="w-4 h-4"/> },
 { label:'مستندات الموظفين', href:'/employees/documents', icon: <FolderOpen className="w-4 h-4"/> },
 { label:'الهيكل والأقسام', href:'/employees/structure', icon: <Building2 className="w-4 h-4"/> },
 { label:'مصفوفة الصلاحيات', href:'/employees/permissions', icon: <ShieldCheck className="w-4 h-4"/> },
 { label:'سجل النشاطات', href:'/employees/activity', icon: <History className="w-4 h-4"/> },
 ],
 },
 {
 id:'accounts',
 label:'إدارة الحسابات',
 icon: <Icons.Accounts />,
 subItems: [
 { label:'شجرة الحسابات', href:'/accounts/chart'},
 { label:'قيود اليومية', href:'/accounts/journal'},
 { label:'دفتر الأستاذ', href:'/accounts/ledger', icon: <BookOpen className="w-4 h-4"/> },
 { label:'الخزائن والبنوك', href:'/accounts/treasuries'},
 { label:'سندات القبض والصرف', href:'/accounts/vouchers'},
 { label:'المصروفات', href:'/accounts/expenses'},
 ],
 },
 {
 id:'reports',
 label:'التقارير',
 icon: <Icons.Reports />,
 subItems: [
 { label:'تقارير المبيعات', href:'/reports/sales'},
 { label:'تقارير الأرباح', href:'/reports/profits'},
 { label:'ميزان المراجعة', href:'/reports/trial', icon: <Scale className="w-4 h-4"/> },
 { label:'الميزانية العمومية', href:'/reports/balance-sheet', icon: <Landmark className="w-4 h-4"/> },
 { label:'قائمة الدخل', href:'/reports/income', icon: <TrendingUp className="w-4 h-4"/> },
 { label:'التدفقات النقدية', href:'/reports/cash-flow', icon: <BadgeDollarSign className="w-4 h-4"/> },
 { label:'أعمار الديون (AR/AP)', href:'/reports/aging', icon: <History className="w-4 h-4"/> },
 { label:'حركة المخزون', href:'/reports/inventory'},
 { label:'الانتهاء (الصلاحية)', href:'/reports/expiry'},
 { label:'تقييم المخزون', href:'/reports/valuation'},
 ],
 },
 {
 id:'settings',
 label:'الإعدادات',
 icon: <Icons.Settings />,
 subItems: [
 { label:'إعدادات المنشأة والنظام', href:'/settings', icon: <Settings className="w-4 h-4"/> },
 { label:'تفضيلات وتخصيص النظام', href:'/settings/preferences', icon: <SlidersHorizontal className="w-4 h-4"/> },
 { label:'الفروع والمناطق', href:'/settings/branches', icon: <Store className="w-4 h-4"/> },
 { label:'سياسات المخزون', href:'/settings/inventory', icon: <Archive className="w-4 h-4"/> },
 { label:'إعدادات الباركود', href:'/settings/barcode', icon: <QrCode className="w-4 h-4"/> },
 { label:'إعدادات الفاتورة', href:'/settings/invoices', icon: <Printer className="w-4 h-4"/> },
 ],
 },
 ];

 const perms = getSubscriptionPermissions(orgSubscription);

 // Filter top-level modules and sub-items based on subscription permissions
 const allowedNavItems = navItems.filter((item) => {
 // 1. Module'employees'(HR / الموظفين والمستخدمين) requires perms.canManageEmployees
 if (item.id ==='employees'&& !perms.canManageEmployees) {
 return false;
 }
 // 2. Module'purchases'(المشتريات) requires perms.canExecutePurchases
 if (item.id ==='purchases'&& !perms.canExecutePurchases) {
 return false;
 }
 return true;
 }).map((item) => {
 // Hide'الفروع والمناطق'under Settings if perms.canManageBranches is false
 if (item.id ==='settings'&& !perms.canManageBranches && item.subItems) {
 return {
 ...item,
 subItems: item.subItems.filter((sub) => sub.href !=='/settings/branches'),
 };
 }
 return item;
 });

 const filteredNavItems = allowedNavItems.filter((item) => {
 if (!searchQuery.trim()) return true;
 const q = searchQuery.toLowerCase();
 const matchesItem = item.label.toLowerCase().includes(q);
 const matchesSub = item.subItems?.some((sub) => sub.label.toLowerCase().includes(q));
 return matchesItem || matchesSub;
 });

 const activeParentId = allowedNavItems.find(item =>
 item.subItems?.some(sub => {
 const baseHref = sub.href.split('?')[0];
 return pathname === sub.href || pathname === baseHref || (baseHref !=='/'&& pathname.startsWith(baseHref));
 })
 )?.id;

 const handleNavClick = () => {
 if (!isDesktop && onClose) {
 onClose();
 }
 };

 return (
 <>
 {/* Mobile scrim — below`lg`only. */}
 {isOpen && !isDesktop && (
 <div
 className="fixed inset-0 z-40 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200 lg:hidden"
 onClick={onClose}
 aria-hidden
 />
 )}

 <aside
 className={cn(
'fixed right-0 top-0 z-50 flex h-screen w-(--spacing-sidebar) shrink-0 select-none',
'flex-col border-e border-line bg-surface shadow-2xl',
'transition-transform duration-300 ease-in-out motion-reduce:transition-none',
 isDesktop &&'sticky z-40 shadow-sm',
 // Below`lg`this is a drawer, so the closed state must stay mounted
 // for the slide-out transition to run. At`lg`+ it collapses outright
 // and the main column reclaims the space.
 isOpen ?'translate-x-0':'translate-x-full lg:hidden'
 )}
 data-state={isOpen ?'open':'closed'}
 {...(isOpen ? {} : { inert: true })}
 >
 {/* Top Header */}
 <div className="p-4 space-y-4">
 <div className="flex items-center justify-between gap-3 px-1">
 <div className="flex items-center gap-3 min-w-0">
 <div className="w-10 h-10 rounded-xl bg-primary flex items-center justify-center text-white shadow-lg shrink-0 transform -rotate-3 hover:rotate-0 transition-transform">
 <svg width="24"height="24"viewBox="0 0 24 24"fill="none"stroke="currentColor"strokeWidth="2.5">
 <rect x="5"y="3"width="14"height="18"rx="2"/>
 <line x1="9"y1="8"x2="15"y2="8"/>
 <line x1="9"y1="12"x2="15"y2="12"/>
 <line x1="9"y1="16"x2="13"y2="16"/>
 </svg>
 </div>
 <div className="flex flex-col min-w-0">
 <span className="font-black text-slate-900 dark:text-white text-base leading-tight truncate">
 {orgName}
 </span>
 <div className="flex flex-wrap items-center gap-1.5 mt-1">
 <span className={cn(
"inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-3xs font-black border truncate shadow-2xs",
 domain.badgeStyle
 )}>
 <span>{domain.icon}</span>
 <span className="truncate">{domain.nameAr}</span>
 </span>

 <span className={cn(
"inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-3xs font-black border truncate shadow-2xs",
 subProfile.badgeStyle
 )} title={subProfile.description}>
 <span>{subProfile.icon}</span>
 <span className="truncate">{subProfile.badgeName}</span>
 </span>
 </div>
 </div>
 </div>

 {/* Mobile Close Button (< 1024px) */}
 <button
 onClick={onClose}
 className="lg:hidden p-1.5 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
 title="إغلاق القائمة"
 >
 <svg width="20"height="24"viewBox="0 0 24 24"fill="none"stroke="currentColor"strokeWidth="2">
 <line x1="18"y1="6"x2="6"y2="18"/>
 <line x1="6"y1="6"x2="18"y2="18"/>
 </svg>
 </button>
 </div>

 <div className="relative group">
 <Icons.Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 group-focus-within:text-primary transition-colors"/>
 <Input
 value={searchQuery}
 onChange={(e) => setSearchQuery(e.target.value)}
 placeholder="بحث سريع... (F4)"
 className="h-10 bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-slate-800 rounded-xl pr-9 pl-3 text-xs font-bold"
 />
 </div>
 </div>

 <Separator className="opacity-50"/>

 {/* Nav List with ScrollArea */}
 <ScrollArea className="flex-1 px-3">
 <div className="py-4 space-y-1">
 <Accordion type="single"collapsible defaultValue={activeParentId} className="w-full space-y-1">
 {filteredNavItems.map((item) => {
 if (item.href && !item.subItems) {
 const isActive = pathname === item.href;
 return (
 <Link
 key={item.id}
 href={item.href}
 onClick={handleNavClick}
 className={cn(
"flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-black transition-all",
 isActive
 ?"bg-blue-50 dark:bg-blue-950/40 text-primary dark:text-[#60a5fa] border-r-4 border-primary shadow-sm"
 :"text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-900"
 )}
 >
 <span className={cn("shrink-0", isActive ?"text-primary":"text-slate-400")}>
 {item.icon}
 </span>
 <span>{item.label}</span>
 </Link>
 );
 }

 const hasActiveChild = item.subItems?.some(s => {
 const baseHref = s.href.split('?')[0];
 return pathname === s.href || pathname === baseHref || (baseHref !=='/'&& pathname.startsWith(baseHref));
 });

 return (
 <AccordionItem key={item.id} value={item.id} className="border-none">
 <AccordionTrigger className={cn(
"flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-black hover:no-underline transition-all",
 hasActiveChild
 ?"bg-slate-50 dark:bg-slate-900/50 text-primary dark:text-[#60a5fa]"
 :"text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-900"
 )}>
 <div className="flex items-center gap-3">
 <span className={cn("shrink-0", hasActiveChild ?"text-primary":"text-slate-400")}>
 {item.icon}
 </span>
 <span>{item.label}</span>
 </div>
 </AccordionTrigger>
 <AccordionContent className="pb-1 pr-9 pl-2 space-y-1">
 {item.subItems?.map((sub, idx) => {
 const baseHref = sub.href.split('?')[0];
 const isSubActive = pathname === baseHref;
 return (
 <Link
 key={idx}
 href={sub.href}
 onClick={handleNavClick}
 className={cn(
"flex items-center justify-between py-2 px-3 rounded-lg text-2xs font-black transition-all group",
 isSubActive
 ?"bg-blue-50 dark:bg-blue-950/30 text-primary dark:text-[#60a5fa] shadow-inner"
 :"text-slate-600 dark:text-slate-400 hover:text-primary hover:bg-slate-50/70 dark:hover:bg-slate-800/40"
 )}
 >
 <span className="truncate">{sub.label}</span>
 {sub.icon && (
 <span className={cn("shrink-0 transition-colors", isSubActive ?"text-primary dark:text-[#60a5fa]":"text-slate-400 group-hover:text-primary")}>
 {sub.icon}
 </span>
 )}
 </Link>
 );
 })}
 </AccordionContent>
 </AccordionItem>
 );
 })}
 </Accordion>
 </div>
 </ScrollArea>

 {/* Bottom Branch Selector */}
 <div className="p-4 mt-auto relative">
 <Separator className="mb-4 opacity-50"/>

 {/* Branch Switcher Popover Menu */}
 {isBranchMenuOpen && (
 <>
 <div className="fixed inset-0 z-50"onClick={() => setIsBranchMenuOpen(false)} />
 <div className="absolute bottom-full left-4 z-60 mb-2 w-[calc(var(--spacing-sidebar)-2rem)] rounded-2xl border border-line bg-surface p-1 shadow-2xl animate-in fade-in slide-in-from-bottom-2 duration-200">
 <div className="mb-1 border-b border-line/60 p-2.5 text-3xs font-black uppercase tracking-widest text-muted-foreground">
 تبديل الفرع النشط
 </div>
 <div className="max-h-70 space-y-0.5 overflow-y-auto">
 {branches.map((b) => (
 <button
 key={b.id}
 onClick={() => handleSwitchBranch(b)}
 className={cn(
"w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-black transition-all text-right cursor-pointer group",
 activeBranchId === b.id
 ?"bg-blue-50 dark:bg-blue-950/40 text-primary dark:text-[#60a5fa]"
 :"text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800/60"
 )}
 >
 <div className="flex items-center gap-3">
 <div className={cn(
"w-8 h-8 rounded-lg flex items-center justify-center transition-colors",
 activeBranchId === b.id ?"bg-blue-100 dark:bg-blue-900":"bg-slate-100 dark:bg-slate-800 group-hover:bg-slate-200"
 )}>
 <Store className="w-4 h-4"/>
 </div>
 <div className="flex flex-col">
 <span>{b.name}</span>
 <span className="text-4xs font-bold opacity-60 uppercase">{b.is_main ?'الرئيسي': b.code}</span>
 </div>
 </div>
 {activeBranchId === b.id && <Check className="w-4 h-4"/>}
 </button>
 ))}
 </div>
 </div>
 </>
 )}

 <div
 onClick={() => setIsBranchMenuOpen(!isBranchMenuOpen)}
 className={cn(
"flex items-center justify-between p-3 rounded-2xl border transition-all group shadow-inner cursor-pointer",
 isBranchMenuOpen
 ?"bg-blue-50 dark:bg-blue-950/40 border-primary ring-4 ring-blue-500/10"
 :"bg-slate-50 dark:bg-slate-900 border-slate-200/80 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-800"
 )}
 >
 <div className="flex items-center gap-3 min-w-0">
 <div className={cn(
"w-9 h-9 rounded-xl flex items-center justify-center shadow-xs transition-transform group-hover:scale-110",
 isBranchMenuOpen ?"bg-primary text-white":"bg-emerald-100 dark:bg-emerald-950 text-[#16a34a]"
 )}>
 <Icons.Warehouse className="w-5 h-5"/>
 </div>
 <div className="flex flex-col min-w-0">
 <span className="text-3xs font-black text-slate-400 uppercase tracking-widest leading-none mb-1">
 الفرع الحالي
 </span>
 <span className="font-black text-slate-900 dark:text-white text-xs truncate">
 {branchName}
 </span>
 </div>
 </div>
 <span className={cn(
"w-4 h-4 transition-colors flex items-center justify-center",
 isBranchMenuOpen ?"text-primary":"text-slate-400 group-hover:text-primary"
 )}>
 <Icons.SwitchArrows />
 </span>
 </div>
 </div>
 </aside>
 </>
 );
};