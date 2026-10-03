'use client';

import { KpiCard } from '@/components/ui/kpi-card';
import React, { useEffect, useState, useMemo } from'react';
import { AppShell } from'@/components/layout/AppShell';
import { Button } from'@/components/ui/button';
import { cn } from'@/lib/utils';
import {
 History,
 Search,
 FilterX,
 User,
 Download,
 ShieldCheck,
 Zap,
 Trash2,
 Edit2,
 Plus,
 LogIn,
 RefreshCw,
 MoreVertical,
 Activity,
 FileText,
 AlertCircle,
 Eye,
 CalendarDays,
 UserCheck,
 Clock,
 LayoutGrid
} from'lucide-react';
import { Input } from'@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from'@/components/ui/select';
import { useSessionStore } from'@/core/state/useSessionStore';
import { ActivityRepository } from'@/modules/employees/activity_repository';
import type { ActivityLog } from'@/types';
import { format } from'date-fns';
import { ar } from'date-fns/locale';
import { toast } from'sonner';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from'@/components/ui/card';
import { Badge } from'@/components/ui/badge';
import {
 Table,
 TableBody,
 TableCell,
 TableHead,
 TableHeader,
 TableRow,
} from'@/components/ui/table';
import { formatNumber } from'@/lib/format';
import {
 Dialog,
 DialogContent,
 DialogHeader,
 DialogTitle,
 DialogFooter,
 DialogDescription
} from'@/components/ui/dialog';
import {
 DropdownMenu,
 DropdownMenuContent,
 DropdownMenuItem,
 DropdownMenuTrigger,
 DropdownMenuSeparator,
 DropdownMenuLabel
} from'@/components/ui/dropdown-menu';

export default function ActivityLogPage() {
 const { currentUser } = useSessionStore();
 const orgId = currentUser?.org_id ||'';

 const [logs, setLogs] = useState<ActivityLog[]>([]);
 const [isLoading, setIsLoading] = useState(true);
 const [searchQuery, setSearchQuery] = useState('');
 const [typeFilter, setTypeFilter] = useState('all');

 // Detail Modal State
 const [selectedLog, setSelectedLog] = useState<ActivityLog | null>(null);
 const [isDetailOpen, setIsDetailOpen] = useState(false);

 const loadData = async () => {
 if (!orgId) return;
 setIsLoading(true);
 try {
 const list = await ActivityRepository.filterLogs(orgId, searchQuery, typeFilter);
 setLogs(list);
 } catch (err) {
 toast.error('خطأ في تحميل سجل النشاطات');
 } finally {
 setIsLoading(false);
 }
 };

 useEffect(() => {
 loadData();
 }, [orgId, searchQuery, typeFilter]);

 const stats = useMemo(() => {
 const today = new Date().toISOString().split('T')[0];
 const todayLogs = logs.filter(l => l.created_at.startsWith(today));
 const sensitive = logs.filter(l => isSensitive(l));
 const uniqueUsers = new Set(logs.map(l => l.user_id)).size;
 return { today: todayLogs.length, sensitive: sensitive.length, users: uniqueUsers };
 }, [logs]);

 const handleDeleteLog = async (id: string) => {
 if (!confirm('هل أنت متأكد من حذف هذا السجل؟')) return;
 try {
 await ActivityRepository.deleteLog(id);
 toast.success('تم حذف السجل بنجاح');
 loadData();
 } catch {
 toast.error('خطأ في الحذف');
 }
 };

 const handleClearAll = async () => {
 if (!confirm('سيتم مسح كافة السجلات المعروضة حالياً، هل تريد الاستمرار؟')) return;
 try {
 await ActivityRepository.clearAll(orgId);
 toast.success('تم مسح السجل بالكامل');
 loadData();
 } catch {
 toast.error('خطأ في مسح السجلات');
 }
 };

 return (
 <AppShell
 title="سجل نشاطات الكوادر والنظام"
 subtitle="مراقبة حية وشاملة لكافة الحركات والعمليات التي تمت من قبل الموظفين لضمان الشفافية والأمان."
 >
 <div className="flex flex-col gap-6 pb-12"dir="rtl">

 {/* 📊 KPI Dashboard — Linear Style */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <KpiCard
            label="حركات اليوم"
            value={stats.today}
            unit="عملية"
            variant="blue"
            icon={<Activity className="w-5 h-5" />}
          />
          <KpiCard
            label="عمليات حساسة"
            value={stats.sensitive}
            unit="عملية"
            variant="rose"
            icon={<ShieldCheck className="w-5 h-5" />}
          />
          <KpiCard
            label="مسؤولين نشطين"
            value={stats.users}
            unit="مستخدم"
            variant="indigo"
            icon={<UserCheck className="w-5 h-5" />}
          />
          <KpiCard
            label="إجمالي الأرشيف"
            value={logs.length}
            unit="سجل"
            variant="emerald"
            icon={<History className="w-5 h-5" />}
          />
        </div>

        {/* 🔍 Dynamic Filter Bar */}
 <Card className="rounded-2xl border-slate-200 dark:border-slate-800 shadow-xs overflow-hidden">
 <CardHeader className="p-5 border-b border-slate-100 dark:border-slate-800 flex flex-col xl:flex-row xl:items-center justify-between gap-5 bg-surface">
 <div className="flex flex-col md:flex-row items-stretch md:items-center gap-4 flex-1">
 <div className="relative group flex-1 md:max-w-md">
 <Search className="absolute right-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 group-focus-within:text-blue-500 transition-colors"/>
 <Input
 value={searchQuery}
 onChange={e => setSearchQuery(e.target.value)}
 placeholder="بحث باسم المسؤول، نوع النشاط، أو تفاصيل الحركة..."
 className="h-11 pr-11 bg-slate-50/50 dark:bg-slate-950/50 border-slate-200 dark:border-slate-800 rounded-xl text-xs font-bold focus:bg-white dark:focus:bg-slate-900 transition-all shadow-xs"
 />
 </div>

 <div className="flex items-center gap-3">
 <Select value={typeFilter} onValueChange={setTypeFilter}>
 <SelectTrigger className="w-48 h-11 rounded-xl border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950/50 text-xs font-black">
 <SelectValue placeholder="نوع العملية"/>
 </SelectTrigger>
 <SelectContent className="rounded-xl shadow-xl border-slate-200">
 <SelectItem value="all"className="font-bold py-2.5">جميع النشاطات</SelectItem>
 <SelectItem value="auth"className="font-bold py-2.5">الأمان (دخول/خروج)</SelectItem>
 <SelectItem value="inventory"className="font-bold py-2.5">المخزون والأصناف</SelectItem>
 <SelectItem value="finance"className="font-bold py-2.5">الحسابات والمالية</SelectItem>
 <SelectItem value="sales"className="font-bold py-2.5">المبيعات والفواتير</SelectItem>
 <SelectItem value="delete"className="font-bold py-2.5 text-red-600">عمليات الحذف</SelectItem>
 </SelectContent>
 </Select>

 <Button
 variant="ghost"
 onClick={() => { setSearchQuery(''); setTypeFilter('all'); }}
 className="h-11 px-4 text-red-500 hover:text-red-600 font-bold text-xs gap-2 rounded-xl hover:bg-red-50 dark:hover:bg-red-950/20"
 >
 <FilterX className="w-4 h-4"/> <span className="hidden sm:inline">إعادة ضبط</span>
 </Button>
 </div>
 </div>

 <div className="flex items-center gap-2.5">
 <Button variant="outline"onClick={loadData} className="h-11 w-11 p-0 border-slate-200 dark:border-slate-800 rounded-xl bg-surface shadow-xs">
 <RefreshCw className={cn("w-4 h-4 text-slate-400", isLoading &&"animate-spin")} />
 </Button>
 <Button variant="outline"className="h-11 px-5 border-slate-200 dark:border-slate-800 font-bold text-xs gap-2 rounded-xl bg-surface shadow-xs">
 <Download className="w-4 h-4 text-emerald-600"/> <span className="hidden sm:inline">تصدير السجل</span>
 </Button>
 <Button onClick={handleClearAll} variant="destructive"className="h-11 px-5 rounded-xl font-black text-xs gap-2 shadow-lg shadow-red-500/20">
 <Trash2 className="w-4 h-4"/> <span className="hidden sm:inline">مسح السجلات</span>
 </Button>
 </div>
 </CardHeader>

 <CardContent className="p-0">
 <div className="overflow-x-auto">
 <Table>
 <TableHeader>
 <TableRow className="bg-slate-50/50 dark:bg-slate-900/50 border-b border-slate-100 dark:border-slate-800">
 <TableHead className="py-4 px-6 text-right text-2xs font-black text-slate-500 uppercase tracking-widest h-14">التوقيت واللحظة</TableHead>
 <TableHead className="py-4 px-6 text-right text-2xs font-black text-slate-500 uppercase tracking-widest h-14">المسؤول عن الحركة</TableHead>
 <TableHead className="py-4 px-6 text-right text-2xs font-black text-slate-500 uppercase tracking-widest h-14">النشاط / الحركة</TableHead>
 <TableHead className="py-4 px-6 text-center text-2xs font-black text-slate-500 uppercase tracking-widest h-14">القسم</TableHead>
 <TableHead className="py-4 px-6 text-center text-2xs font-black text-slate-500 uppercase tracking-widest h-14">الحساسية</TableHead>
 <TableHead className="py-4 px-6 text-center text-2xs font-black text-slate-500 uppercase tracking-widest h-14">إجراءات</TableHead>
 </TableRow>
 </TableHeader>
 <TableBody>
 {isLoading && logs.length === 0 ? (
 <TableRow>
 <TableCell colSpan={6} className="py-24 text-center">
 <div className="flex flex-col items-center gap-4">
 <div className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"/>
 <span className="text-sm font-bold text-slate-400 font-black">جاري جلب سجل النشاطات...</span>
 </div>
 </TableCell>
 </TableRow>
 ) : logs.length === 0 ? (
 <TableRow>
 <TableCell colSpan={6} className="py-32 text-center">
 <div className="flex flex-col items-center gap-5">
 <div className="w-20 h-20 bg-slate-50 dark:bg-slate-900 rounded-3xl flex items-center justify-center text-slate-200 border border-slate-100 dark:border-slate-800">
 <History className="w-10 h-10"/>
 </div>
 <div className="space-y-1.5">
 <h4 className="text-base font-black text-slate-900 dark:text-white">لا توجد نشاطات مسجلة</h4>
 <p className="text-xs text-slate-400 max-w-sm mx-auto">لم يتم العثور على أي حركات مطابقة للبحث أو الفلترة المحددة.</p>
 </div>
 </div>
 </TableCell>
 </TableRow>
 ) : (
 logs.map(log => (
 <TableRow key={log.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30 transition-colors group border-b border-slate-100 dark:border-slate-800/50">
 <TableCell className="py-4 px-6">
 <div className="flex flex-col">
 <span className="text-2xs font-black text-slate-700 dark:text-slate-300 font-mono"dir="ltr">{format(new Date(log.created_at),'yyyy-MM-dd HH:mm:ss')}</span>
 <span className="text-4xs font-bold text-blue-500 mt-0.5 flex items-center gap-1">
 <Clock className="w-2.5 h-2.5"/> منذ {formatTimeAgo(log.created_at)}
 </span>
 </div>
 </TableCell>
 <TableCell className="py-4 px-6">
 <div className="flex items-center gap-3">
 <div className="w-10 h-10 rounded-2xl bg-slate-50 dark:bg-slate-800 flex items-center justify-center text-slate-400 group-hover:bg-blue-50 group-hover:text-blue-600 transition-all shadow-xs shrink-0 border border-slate-100 dark:border-slate-800">
 <User className="w-4.5 h-4.5"/>
 </div>
 <div className="flex flex-col min-w-0">
 <span className="text-sm font-black text-slate-900 dark:text-white truncate group-hover:text-blue-600 transition-colors">{log.user_name ||'مسؤول النظام'}</span>
 <span className="text-5xs font-bold text-slate-400 font-mono truncate tracking-tight">{log.user_id}</span>
 </div>
 </div>
 </TableCell>
 <TableCell className="py-4 px-6">
 <div className="flex flex-col gap-1">
 <div className="flex items-center gap-2">
 <div className="w-6 h-6 rounded-lg bg-slate-50 dark:bg-slate-800 flex items-center justify-center shadow-xs">
 {getActionIcon(log.action)}
 </div>
 <span className="text-xs font-black text-slate-800 dark:text-slate-200">{log.action}</span>
 </div>
 <p className="text-3xs font-bold text-slate-400 truncate max-w-xs pr-8">
 {log.details ||`تم إجراء ${log.action} على ${log.entity_type} (${log.entity_id?.slice(0,8)})`}
 </p>
 </div>
 </TableCell>
 <TableCell className="py-4 px-6 text-center">
 <Badge variant="outline"className={cn("px-2.5 py-1 rounded-lg border-none text-4xs font-black uppercase tracking-tighter shadow-xs", getEntityStyles(log.entity_type))}>
 {getEntityLabel(log.entity_type)}
 </Badge>
 </TableCell>
 <TableCell className="py-4 px-6 text-center">
 {isSensitive(log) ? (
 <Badge className="bg-red-50 text-red-600 border border-red-100 dark:bg-red-950/30 dark:border-red-900/50 text-4xs font-black px-3 py-1 rounded-full shadow-xs">حساس 🚩</Badge>
 ) : (
 <Badge variant="secondary"className="bg-slate-50 text-slate-400 border border-slate-100 dark:bg-slate-800/50 dark:border-slate-800 text-4xs font-bold px-3 py-1 rounded-full">آمن ✅</Badge>
 )}
 </TableCell>
 <TableCell className="py-4 px-6 text-center">
 <DropdownMenu>
 <DropdownMenuTrigger asChild>
 <Button variant="ghost"size="icon"className="h-9 w-9 text-slate-300 hover:text-slate-600 dark:hover:text-white rounded-xl transition-all shadow-xs border border-transparent hover:border-slate-100 dark:hover:border-slate-800">
 <MoreVertical className="w-5 h-5"/>
 </Button>
 </DropdownMenuTrigger>
 <DropdownMenuContent align="end"className="w-56 rounded-2xl p-2 shadow-2xl border-slate-200 dark:border-slate-800">
 <DropdownMenuLabel className="text-3xs font-black text-slate-400 uppercase px-2.5 py-2">تفاصيل وإجراءات السجل</DropdownMenuLabel>
 <DropdownMenuItem onClick={() => { setSelectedLog(log); setIsDetailOpen(true); }} className="gap-3 font-bold text-xs py-3.5 px-3 rounded-xl cursor-pointer">
 <Eye className="w-4 h-4 text-blue-500"/> عرض التفاصيل الكاملة
 </DropdownMenuItem>
 <DropdownMenuSeparator className="my-2 opacity-50"/>
 <DropdownMenuItem onClick={() => handleDeleteLog(log.id)} className="gap-3 font-bold text-xs py-3.5 px-3 rounded-xl text-red-600 cursor-pointer hover:bg-red-50 dark:hover:bg-red-950/20">
 <Trash2 className="w-4 h-4"/> إزالة هذا السجل نهائياً
 </DropdownMenuItem>
 </DropdownMenuContent>
 </DropdownMenu>
 </TableCell>
 </TableRow>
 ))
 )}
 </TableBody>
 </Table>
 </div>
 </CardContent>

 {/* 📋 Footer Info */}
 <div className="p-4 bg-slate-50/50 dark:bg-slate-900/50 border-t border-slate-100 dark:border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-4 text-3xs font-bold text-slate-400">
 <div className="flex items-center gap-4">
 <span>عرض آخر 100 حركة تمت على النظام.</span>
 <div className="h-3 w-px bg-slate-200 dark:bg-slate-700 hidden sm:block"/>
 <span className="flex items-center gap-1.5"><CalendarDays className="w-3 h-3"/> تم التحديث: {new Date().toLocaleTimeString('ar-EG')}</span>
 </div>
 <div className="flex items-center gap-1.5 font-mono opacity-60 uppercase tracking-widest">
 Falcon Audit Engine • Logixa Systems
 </div>
 </div>
 </Card>

 {/* 📋 Log Detail Dialog */}
 <Dialog open={isDetailOpen} onOpenChange={setIsDetailOpen}>
 <DialogContent className="sm:max-w-2xl rounded-[2.5rem] p-0 overflow-hidden border-none shadow-2xl"dir="rtl">
 <div className="bg-white dark:bg-slate-950 p-8">
 <DialogHeader className="mb-8 border-b border-slate-50 dark:border-slate-900 pb-6">
 <div className="flex items-center gap-4">
 <div className={cn("w-16 h-16 rounded-[1.5rem] flex items-center justify-center shadow-inner", isSensitive(selectedLog!) ?"bg-red-50 text-red-600":"bg-blue-50 text-blue-600")}>
 {selectedLog && getActionIcon(selectedLog.action,'w-8 h-8')}
 </div>
 <div>
 <DialogTitle className="text-right font-black text-xl">تفاصيل نشاط المسؤول</DialogTitle>
 <DialogDescription className="text-right font-bold text-slate-400 mt-1.5 flex items-center gap-2">
 <User className="w-3.5 h-3.5"/> المسؤول: {selectedLog?.user_name}
 </DialogDescription>
 </div>
 </div>
 </DialogHeader>

 {selectedLog && (
 <div className="space-y-6 mb-10">
 <div className="grid grid-cols-2 gap-6">
 <DetailBox label="نوع العملية"value={selectedLog.action} icon={<Zap className="w-4 h-4 text-blue-500"/>} />
 <DetailBox label="القسم المتأثر"value={getEntityLabel(selectedLog.entity_type)} icon={<LayoutGrid className="w-4 h-4 text-emerald-500"/>} />
 <DetailBox label="التوقيت الدقيق"value={format(new Date(selectedLog.created_at),'yyyy-MM-dd HH:mm:ss')} icon={<Clock className="w-4 h-4 text-amber-500"/>} />
 <DetailBox label="معرف البيانات"value={selectedLog.entity_id ||'N/A'} icon={<FileText className="w-4 h-4 text-indigo-500"/>} />
 </div>

 <div className="p-6 bg-slate-50 dark:bg-slate-900 rounded-3xl border border-slate-100 dark:border-slate-800 shadow-inner">
 <label className="text-3xs font-black text-slate-400 uppercase tracking-widest block mb-3 pr-1">وصف الحركة التقني (Detailed Context)</label>
 <p className="text-sm font-bold text-slate-700 dark:text-slate-300 leading-relaxed whitespace-pre-wrap">
 {selectedLog.details ||'لا توجد تفاصيل إضافية مسجلة لهذه العملية.'}
 </p>
 </div>

 <div className="flex items-center gap-3 p-4 bg-blue-50/30 dark:bg-blue-900/10 rounded-2xl border border-blue-100 dark:border-blue-900/30">
 <ShieldCheck className="w-5 h-5 text-blue-600 shrink-0"/>
 <p className="text-2xs font-bold text-blue-700 dark:text-blue-400">هذا السجل موثق عبر محرك Audit Engine الخاص بـ Falcon ERP ولا يمكن تعديل بياناته بعد تسجيلها.</p>
 </div>
 </div>
 )}

 <DialogFooter className="gap-3">
 <Button variant="outline"onClick={() => setIsDetailOpen(false)} className="rounded-2xl font-bold h-13 px-8 border-slate-200">إغلاق النافذة</Button>
 <Button onClick={() => handleDeleteLog(selectedLog!.id)} variant="destructive"className="rounded-2xl font-black h-13 px-8 shadow-lg shadow-red-500/20">
 <Trash2 className="w-4 h-4"/> حذف هذا السجل
 </Button>
 </DialogFooter>
 </div>
 </DialogContent>
 </Dialog>

 </div>
 </AppShell>
 );
}

function DetailBox({ label, value, icon }: { label: string, value: string, icon: React.ReactNode }) {
 return (
 <div className="space-y-1.5 p-4 rounded-2xl border border-slate-100 dark:border-slate-800 bg-surface shadow-xs">
 <div className="flex items-center gap-2 text-3xs font-black text-slate-400 uppercase tracking-wider">
 {icon} {label}
 </div>
 <p className="text-xs font-black text-slate-800 dark:text-white truncate">{value}</p>
 </div>
 );
}

function formatTimeAgo(dateStr: string) {
  const now = new Date();
  const past = new Date(dateStr);
  const diffMs = now.getTime() - past.getTime();
  const diffMin = Math.floor(diffMs / 60000);
  if (diffMin < 1) return 'الآن';
  if (diffMin < 60) return `${diffMin} دقيقة`;
  const diffHrs = Math.floor(diffMin / 60);
  if (diffHrs < 24) return `${diffHrs} ساعة`;
  return `${Math.floor(diffHrs / 24)} يوم`;
}

function getActionIcon(action: string, className = "w-3.5 h-3.5") {
  if (action.includes('إضافة')) return <Plus className={cn(className, "text-emerald-500")} />;
  if (action.includes('تعديل')) return <Edit2 className={cn(className, "text-blue-500")} />;
  if (action.includes('حذف')) return <Trash2 className={cn(className, "text-red-500")} />;
  if (action.includes('دخول')) return <LogIn className={cn(className, "text-indigo-500")} />;
  return <Zap className={cn(className, "text-slate-400")} />;
}

function getEntityLabel(type: string) {
  const labels: Record<string, string> = {
    inventory: 'المخزون',
    finance: 'الحسابات',
    sales: 'المبيعات',
    auth: 'الأمان',
    employees: 'الموظفين',
    settings: 'الإعدادات'
  };
  return labels[type] || 'النظام';
}

function getEntityStyles(type: string) {
  const styles: Record<string, string> = {
    inventory: 'bg-emerald-50 text-emerald-600 dark:bg-emerald-950/30 dark:text-emerald-400',
    finance: 'bg-red-50 text-red-600 dark:bg-red-950/30 dark:text-red-400',
    sales: 'bg-blue-50 text-blue-600 dark:bg-blue-950/30 dark:text-blue-400',
    auth: 'bg-indigo-50 text-indigo-600 dark:bg-indigo-950/30 dark:text-indigo-400',
    employees: 'bg-purple-50 text-purple-600 dark:bg-purple-950/30 dark:text-purple-400',
    settings: 'bg-slate-50 text-slate-600 dark:bg-slate-800 dark:text-slate-300'
  };
  return styles[type] || styles.settings;
}

function isSensitive(log: any) {
  if (!log) return false;
  return log.action.includes('حذف') || log.action.includes('تعديل') || log.entity_type === 'finance';
}
