'use client';

import React, { useEffect, useMemo, useState } from'react';
import { AppShell } from'@/components/layout/AppShell';
import { Button } from'@/components/ui/button';
import { Input } from'@/components/ui/input';
import {
 Plus,
 ChevronDown,
 ChevronRight,
 Search,
 Printer,
 MoreVertical,
 Layers,
 Briefcase
} from'lucide-react';
import { useSessionStore } from'@/core/state/useSessionStore';
import { AccountingRepository } from'@/modules/accounting/accounting_repository';
import { formatNumber } from'@/lib/format';
import { toast } from'sonner';
import { cn } from'@/lib/utils';
import type { Account } from'@/types';

export default function ChartOfAccountsPage() {
 const { currentUser } = useSessionStore();
 const orgId = currentUser?.org_id ||'';

 const [accounts, setAccounts] = useState<Account[]>([]);
 const [isLoading, setIsLoading] = useState(true);
 const [searchQuery, setSearchQuery] = useState('');

 const loadData = async () => {
 if (!orgId) return;
 try {
 setIsLoading(true);
 const { db } = await import('@/core/db/app_database');
 await AccountingRepository.ensureDefaultChartOfAccounts(orgId);
 const list = await db.accounts.where('org_id').equals(orgId).toArray();
 setAccounts(list);
 } catch (err) {
 console.error('Load accounts error:', err);
 toast.error('حدث خطأ أثناء تحميل شجرة الحسابات');
 } finally {
 setIsLoading(false);
 }
 };

 useEffect(() => {
 loadData();
 }, [orgId]);

 const tree = useMemo(() => {
 const map: Record<string, Account & { children: any[] }> = {};
 const roots: any[] = [];

 accounts.forEach(a => {
 map[a.id] = { ...a, children: [] };
 });

 accounts.forEach(a => {
 if (a.parent_id && map[a.parent_id]) {
 map[a.parent_id].children.push(map[a.id]);
 } else {
 roots.push(map[a.id]);
 }
 });

 return roots.sort((a, b) => a.code.localeCompare(b.code));
 }, [accounts]);

 const headerActions = (
 <div className="flex items-center gap-2">
 <Button variant="outline"className="h-10 px-4 border-slate-200 dark:border-slate-800 rounded-xl font-bold text-xs gap-2">
 <Printer className="w-4 h-4 text-slate-400"/> طباعة الشجرة
 </Button>
 <Button className="h-10 px-5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-black text-xs gap-2 shadow-md shadow-blue-500/10 transition-all active:scale-95">
 <Plus className="w-4 h-4"/> إضافة حساب جديد
 </Button>
 </div>
 );

 return (
 <AppShell
 title="شجرة الحسابات (COA)"
 subtitle="هيكل الحسابات المالي المنظم للمؤسسة (الأصول، الخصوم، الإيرادات، المصروفات)."
 actions={headerActions}
 >
 <div className="space-y-6 text-right"dir="rtl">

 {/* Header Information Card */}
 <div className="bg-surface rounded-3xl border border-slate-200/80 dark:border-slate-800 p-8 shadow-xs relative overflow-hidden group">
 <div className="absolute top-0 right-0 w-32 h-32 bg-blue-500/5 rounded-full -mr-16 -mt-16 blur-2xl group-hover:bg-blue-500/10 transition-colors"/>
 <div className="relative z-10 flex flex-col items-center text-center space-y-3">
 <h2 className="text-2xl font-black text-slate-900 dark:text-white">شجرة الحسابات (COA)</h2>
 <p className="text-sm font-bold text-slate-400 max-w-2xl leading-relaxed">
 هيكل الحسابات المالي المنظم للمؤسسة يمثل العمود الفقري للنظام المحاسبي، حيث يتم تصنيف كافة الحركات المالية تحت (الأصول، الخصوم، الإيرادات، المصروفات).
 </p>
 </div>
 </div>

 {/* Search Bar Row */}
 <div className="flex items-center justify-between gap-4">
 <div className="relative group w-full max-w-md">
 <Search className="absolute right-4 top-1/2 -translate-y-1/2 w-4.5 h-4.5 text-slate-400 group-focus-within:text-blue-500 transition-colors"/>
 <Input
 value={searchQuery}
 onChange={(e) => setSearchQuery(e.target.value)}
 placeholder="بحث في الحسابات..."
 className="h-12 pr-11 bg-surface border-slate-200 dark:border-slate-800 rounded-2xl text-sm font-bold shadow-xs transition-all focus:ring-4 focus:ring-blue-500/5 focus:border-blue-500/50"
 />
 </div>
 </div>

 {/* Tree Container */}
 <div className="bg-surface rounded-3xl border border-slate-200/80 dark:border-slate-800 overflow-hidden shadow-xs">
 <div className="p-6">
 {isLoading ? (
 <div className="py-20 flex flex-col items-center justify-center gap-3">
 <div className="w-8 h-8 border-3 border-blue-600 border-t-transparent rounded-full animate-spin"/>
 <span className="text-xs font-bold text-slate-400">جاري تحميل الشجرة المحاسبية...</span>
 </div>
 ) : (
 <div className="space-y-1">
 {tree.map(node => (
 <AccountTreeNode key={node.id} node={node} level={0} />
 ))}
 </div>
 )}
 </div>
 </div>

 </div>
 </AppShell>
 );
}

function AccountTreeNode({ node, level }: { node: Account & { children: any[] }, level: number }) {
 const [isExpanded, setIsOpen] = useState(true);
 const hasChildren = node.children.length > 0;

 // Custom colors for root nodes
 const rootColors: Record<string, string> = {
'1000':'text-blue-600',
'2000':'text-red-600',
'3000':'text-purple-600',
'4000':'text-emerald-600',
'5000':'text-amber-600',
 };

 const isRoot = level === 0;
 const colorClass = isRoot ? rootColors[node.code] ||'text-slate-900':'text-slate-700 dark:text-slate-200';

 return (
 <div className="space-y-1">
 <div
 className={cn(
"group flex items-center justify-between p-3 rounded-2xl transition-all cursor-pointer border border-transparent",
 isRoot ?"hover:bg-slate-50 dark:hover:bg-slate-900/50":"hover:bg-slate-50/50 dark:hover:bg-slate-900/30",
 !isRoot &&"mr-4"
 )}
 onClick={() => hasChildren && setIsOpen(!isExpanded)}
 >
 <div className="flex items-center gap-3">
 <div className="w-6 flex items-center justify-center">
 {hasChildren ? (
 isExpanded ? <ChevronDown className="w-4 h-4 text-slate-400"/> : <ChevronRight className="w-4 h-4 text-slate-400"/>
 ) : <div className="w-1.5 h-1.5 rounded-full bg-slate-200 dark:bg-slate-800"/>}
 </div>

 <div className={cn(
"w-10 h-10 rounded-xl flex items-center justify-center shrink-0 transition-transform group-hover:scale-110",
 isRoot ?"bg-slate-100 dark:bg-slate-800 shadow-sm":"bg-white dark:bg-slate-950 border border-slate-100 dark:border-slate-800"
 )}>
 {isRoot ? <Briefcase className={cn("w-5 h-5", colorClass)} /> : <Layers className="w-4 h-4 text-slate-400"/>}
 </div>

 <div className="flex flex-col">
 <span className={cn("text-sm font-black", colorClass)}>
 {node.name} {node.name_en && <span className="text-2xs opacity-60 font-bold font-mono">({node.name_en})</span>}
 </span>
 <span className="text-2xs font-bold text-slate-400 font-mono tracking-wider">{node.code}</span>
 </div>
 </div>

 <div className="flex items-center gap-6">
 <div className="text-left"dir="ltr">
 <span className={cn(
"text-sm font-black font-mono",
 node.current_balance > 0 ?"text-blue-600":"text-slate-400"
 )}>
 {formatNumber(node.current_balance)} <span className="text-3xs font-sans opacity-70 ml-0.5">ج.م</span>
 </span>
 </div>

 <div className="flex items-center opacity-0 group-hover:opacity-100 transition-all gap-1">
 <Button variant="ghost"size="icon"className="w-8 h-8 rounded-lg text-slate-400 hover:text-blue-600 hover:bg-blue-50 transition-colors">
 <Plus className="w-4 h-4"/>
 </Button>
 <Button variant="ghost"size="icon"className="w-8 h-8 rounded-lg text-slate-400 hover:text-slate-600">
 <MoreVertical className="w-4 h-4"/>
 </Button>
 </div>
 </div>
 </div>

 {isExpanded && hasChildren && (
 <div className="mr-8 pr-4 border-r border-slate-100 dark:border-slate-800 space-y-1 py-1">
 {node.children.map(child => (
 <AccountTreeNode key={child.id} node={child} level={level + 1} />
 ))}
 </div>
 )}
 </div>
 );
}