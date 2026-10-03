'use client';

import { KpiCard } from '@/components/ui/kpi-card';
import React, { useEffect, useState, useMemo } from'react';
import { AppShell } from'@/components/layout/AppShell';
import { Button } from'@/components/ui/button';
import {
 Card,
 CardContent,
 CardHeader,
} from'@/components/ui/card';
import {
 Table,
 TableBody,
 TableCell,
 TableHead,
 TableHeader,
 TableRow,
} from'@/components/ui/table';
import {
 Calendar,
 Clock,
 FileCheck,
 ShieldAlert,
 Search,
 FilterX,
 Plus,
 MoreVertical,
 CheckCircle2,
 XCircle,
 FileText,
 User,
 CalendarDays,
 AlertCircle,
 Trash2,
 Undo2,
 CheckCircle,
 Palmtree,
 Activity
} from'lucide-react';
import { Input } from'@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from'@/components/ui/select';
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
import { useSessionStore } from'@/core/state/useSessionStore';
import { LeaveRepository, type LeaveBalance } from'@/modules/employees/leave_repository';
import { EmployeeRepository } from'@/modules/employees/employee_repository';
import type { EmployeeLeave, User as Employee, LeaveType, LeaveStatus } from'@/types';
import { format } from'date-fns';
import { formatNumber } from'@/lib/format';
import { Printer } from'lucide-react';
import { ar } from'date-fns/locale';
import { toast } from'sonner';
import { cn } from'@/lib/utils';
import { Badge } from'@/components/ui/badge';
import { Separator } from'@/components/ui/separator';

import { DatePicker } from'@/components/ui/date-picker';

export default function LeavesPage() {
 const { currentUser, activeBranchId } = useSessionStore();
 const orgId = currentUser?.org_id ||'';
 const branchId = activeBranchId || currentUser?.branch_id ||'';

 const [leaves, setLeaves] = useState<EmployeeLeave[]>([]);
 const [employees, setEmployees] = useState<Employee[]>([]);
 const [balances, setBalances] = useState<Record<string, LeaveBalance>>({});
 const [isLoading, setIsLoading] = useState(true);
 const [searchQuery, setSearchQuery] = useState('');
 const [statusFilter, setStatusFilter] = useState<string>('all');

 // Form State
 const [isDialogOpen, setIsDialogOpen] = useState(false);
 const [isSubmitting, setIsSubmitting] = useState(false);
 const [selectedEmpId, setSelectedEmpId] = useState('');
 const [leaveType, setLeaveType] = useState<LeaveType>('annual');
 const [startDate, setStartDate] = useState(new Date().toISOString().split('T')[0]);
 const [endDate, setEndDate] = useState(new Date().toISOString().split('T')[0]);
 const [reason, setReason] = useState('');

 const loadData = async () => {
 if (!orgId) return;
 setIsLoading(true);
 try {
 const [leaveList, empList] = await Promise.all([
 LeaveRepository.getByOrg(orgId),
 EmployeeRepository.getEmployeesByOrg(orgId)
 ]);
 setLeaves(leaveList.sort((a, b) => b.created_at.localeCompare(a.created_at)));
 setEmployees(empList);
 const year = new Date().getFullYear();
 const balanceEntries = await Promise.all(
 empList.map(async (emp) => [emp.id, await LeaveRepository.getBalance(emp.id, year)] as const)
 );
 setBalances(Object.fromEntries(balanceEntries));
 } catch (err) {
 toast.error('خطأ في تحميل البيانات');
 } finally {
 setIsLoading(false);
 }
 };

 useEffect(() => {
 loadData();
 }, [orgId]);

 const stats = useMemo(() => {
 const pending = leaves.filter(l => l.status ==='pending').length;
 const approved = leaves.filter(l => l.status ==='approved').length;
 const rejected = leaves.filter(l => l.status ==='rejected').length;
 const today = new Date().toISOString().split('T')[0];
 const todayOnLeave = leaves.filter(l => l.status ==='approved'&& today >= l.start_date && today <= l.end_date).length;
 return { pending, approved, rejected, todayOnLeave, total: leaves.length };
 }, [leaves]);

 const handleAddLeave = async () => {
 if (!selectedEmpId || !startDate || !endDate) {
 toast.error('يرجى إكمال البيانات المطلوبة');
 return;
 }
 setIsSubmitting(true);
 try {
 const start = new Date(startDate);
 const end = new Date(endDate);
 const diff = end.getTime() - start.getTime();
 const days = Math.max(1, Math.ceil(diff / (1000 * 3600 * 24)) + 1);

 await LeaveRepository.addLeave({
 org_id: orgId,
 branch_id: branchId,
 employee_id: selectedEmpId,
 leave_type: leaveType,
 start_date: startDate,
 end_date: endDate,
 days_count: days,
 reason: reason,
 status:'pending'
 });
 toast.success('تم تقديم الطلب بنجاح');
 setIsDialogOpen(false);
 resetForm();
 loadData();
 } catch (err) {
 toast.error('حدث خطأ أثناء الحفظ');
 } finally {
 setIsSubmitting(false);
 }
 };

 const resetForm = () => {
 setSelectedEmpId('');
 setLeaveType('annual');
 setStartDate(new Date().toISOString().split('T')[0]);
 setEndDate(new Date().toISOString().split('T')[0]);
 setReason('');
 };

 const handleStatusUpdate = async (id: string, status: LeaveStatus) => {
 try {
 await LeaveRepository.updateStatus(id, status, currentUser?.id);
 toast.success(`تم ${status ==='approved'?'الموافقة على':'رفض'} الطلب`);
 loadData();
 } catch (err) {
 toast.error(err instanceof Error ? err.message :'خطأ في التحديث');
 }
 };

 const filteredLeaves = useMemo(() => {
 const q = searchQuery.toLowerCase().trim();
 return leaves.filter(l => {
 const emp = employees.find(e => e.id === l.employee_id);
 const matchesSearch = !q || emp?.full_name.toLowerCase().includes(q);
 const matchesStatus = statusFilter ==='all'|| l.status === statusFilter;
 return matchesSearch && matchesStatus;
 });
 }, [leaves, employees, searchQuery, statusFilter]);

 return (
 <AppShell
 title="إدارة الإجازات والغياب"
 subtitle="مراجعة طلبات الإجازات المقدمة من الموظفين واتخاذ القرارات الإدارية المناسبة."
 >
 <div className="flex flex-col gap-6 pb-12"dir="rtl">

 {/* 📊 KPI Dashboard Section — Linear Style */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <KpiCard
            label="طلبات قيد المراجعة"
            value={stats.pending}
            unit="طلب"
            variant="amber"
            icon={<Clock className="w-5 h-5" />}
          />
          <KpiCard
            label="موظفون في إجازة"
            value={stats.todayOnLeave}
            unit="موظف"
            variant="blue"
            icon={<Palmtree className="w-5 h-5" />}
          />
          <KpiCard
            label="إجازات معتمدة"
            value={stats.approved}
            unit="إجازة"
            variant="emerald"
            icon={<CheckCircle className="w-5 h-5" />}
          />
          <KpiCard
            label="إجمالي الطلبات"
            value={stats.total}
            unit="طلب"
            variant="indigo"
            icon={<FileText className="w-5 h-5" />}
          />
        </div>

        {/* 🛠️ Comprehensive Management Toolbar */}
 <Card className="rounded-2xl border-slate-200 dark:border-slate-800 shadow-xs overflow-hidden">
 <CardHeader className="p-5 border-b border-slate-100 dark:border-slate-800 flex flex-col lg:flex-row lg:items-center justify-between gap-5 bg-surface">
 <div className="flex flex-col md:flex-row items-stretch md:items-center gap-4 flex-1">

 <div className="relative group flex-1 md:max-w-xs">
 <Search className="absolute right-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 group-focus-within:text-blue-500 transition-colors"/>
 <Input
 value={searchQuery}
 onChange={e => setSearchQuery(e.target.value)}
 placeholder="بحث باسم الموظف..."
 className="h-11 pr-10 bg-slate-50/50 dark:bg-slate-950/50 border-slate-200 dark:border-slate-800 rounded-xl text-xs font-bold focus:bg-white dark:focus:bg-slate-900 transition-all"
 />
 </div>

 <div className="flex items-center gap-3">
 <Select value={statusFilter} onValueChange={setStatusFilter}>
 <SelectTrigger className="w-40 h-11 rounded-xl border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950/50 text-xs font-black">
 <SelectValue placeholder="تصفية بالحالة"/>
 </SelectTrigger>
 <SelectContent className="rounded-xl shadow-xl">
 <SelectItem value="all">الكل (جميع الطلبات)</SelectItem>
 <SelectItem value="pending">قيد الانتظار</SelectItem>
 <SelectItem value="approved">مقبولة / معتمدة</SelectItem>
 <SelectItem value="rejected">مرفوضة</SelectItem>
 </SelectContent>
 </Select>

 <Button
 variant="ghost"
 onClick={() => { setSearchQuery(''); setStatusFilter('all'); }}
 className="h-11 px-4 text-red-500 hover:text-red-600 font-bold text-xs gap-2 rounded-xl hover:bg-red-50 dark:hover:bg-red-950/20"
 >
 <FilterX className="w-4 h-4"/> <span className="hidden sm:inline">مسح الفلاتر</span>
 </Button>
 </div>
 </div>

 <div className="flex items-center gap-2.5">
 <Button variant="outline"className="h-11 px-5 border-slate-200 dark:border-slate-800 font-bold text-xs gap-2 rounded-xl bg-surface hover:bg-slate-50 dark:hover:bg-slate-800 transition-all shadow-xs">
 <Printer className="w-4 h-4 text-slate-500"/> <span className="hidden sm:inline">طباعة السجل</span>
 </Button>

 <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
 <Button onClick={() => { resetForm(); setIsDialogOpen(true); }} className="h-11 px-6 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-black text-xs gap-2 shadow-lg shadow-blue-500/20 active:scale-95 transition-all cursor-pointer">
 <Plus className="w-4 h-4"/> تقديم طلب إجازة جديد
 </Button>

 <DialogContent className="sm:max-w-lg rounded-[2.5rem] p-0 overflow-hidden border-none shadow-2xl"dir="rtl">
 <div className="bg-white dark:bg-slate-950 p-8">
 <DialogHeader className="mb-8">
 <div className="w-14 h-14 rounded-2xl bg-blue-50 dark:bg-blue-900/30 flex items-center justify-center text-blue-600 mb-4 shadow-inner">
 <Calendar className="w-7 h-7"/>
 </div>
 <DialogTitle className="text-right font-black text-xl">تقديم طلب إجازة / مغادرة</DialogTitle>
 <DialogDescription className="text-right font-bold text-slate-400 mt-1">يرجى تحديد الموظف ونوع الفترة المطلوبة للإجازة.</DialogDescription>
 </DialogHeader>

 <div className="space-y-6 mb-8">
 <div className="space-y-2.5">
 <label className="text-2xs font-black text-slate-500 pr-1 uppercase tracking-wider">اسم الموظف المستفيد</label>
 <Select value={selectedEmpId} onValueChange={setSelectedEmpId}>
 <SelectTrigger className="h-13 rounded-2xl border-slate-200 bg-slate-50/30 font-bold">
 <SelectValue placeholder="اختر الموظف من القائمة..."/>
 </SelectTrigger>
 <SelectContent className="rounded-2xl shadow-2xl">
 {employees.map(e => (
 <SelectItem key={e.id} value={e.id} className="py-3 px-3 rounded-xl mb-1">
 <div className="flex items-center gap-3">
 <div className="w-8 h-8 rounded-lg bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-3xs font-black">{e.full_name.charAt(0)}</div>
 <div className="flex flex-col">
 <span className="text-sm font-black">{e.full_name}</span>
 <span className="text-4xs text-slate-400 uppercase">{e.role}</span>
 </div>
 </div>
 </SelectItem>
 ))}
 </SelectContent>
 </Select>
 </div>

 <div className="grid grid-cols-2 gap-5">
 <div className="space-y-2.5">
 <label className="text-2xs font-black text-slate-500 pr-1 uppercase tracking-wider">نوع الإجازة</label>
 <Select value={leaveType} onValueChange={(v: any) => setLeaveType(v)}>
 <SelectTrigger className="h-12 rounded-2xl border-slate-200 bg-slate-50/30 font-black">
 <SelectValue />
 </SelectTrigger>
 <SelectContent className="rounded-2xl">
 <SelectItem value="annual"className="font-bold">إجازة سنوية</SelectItem>
 <SelectItem value="sick"className="font-bold">إجازة مرضية</SelectItem>
 <SelectItem value="unpaid"className="font-bold">بدون راتب</SelectItem>
 <SelectItem value="emergency"className="font-bold">إجازة طارئة</SelectItem>
 <SelectItem value="departure"className="font-bold">مغادرة (ساعات)</SelectItem>
 </SelectContent>
 </Select>
 </div>
 <div className="space-y-2.5">
 <label className="text-2xs font-black text-slate-500 pr-1 uppercase tracking-wider">بداية من</label>
 <DatePicker
 date={startDate}
 onSelect={(d) => d && setStartDate(d.toISOString().split('T')[0])}
 className="h-12 w-full rounded-2xl border-slate-200"
 />
 </div>
 </div>

 <div className="grid grid-cols-2 gap-5">
 <div className="space-y-2.5">
 <label className="text-2xs font-black text-slate-500 pr-1 uppercase tracking-wider">نهاية في</label>
 <DatePicker
 date={endDate}
 onSelect={(d) => d && setEndDate(d.toISOString().split('T')[0])}
 className="h-12 w-full rounded-2xl border-slate-200"
 />
 </div>
 <div className="bg-blue-50/50 dark:bg-blue-900/20 rounded-2xl p-4 flex flex-col justify-center border border-blue-100 dark:border-blue-800/30">
 <span className="text-3xs font-black text-blue-400 block mb-1">إجمالي المدة</span>
 <span className="text-xl font-black text-blue-700 dark:text-blue-300 font-mono leading-none">
 {Math.max(1, Math.ceil((new Date(endDate).getTime() - new Date(startDate).getTime()) / (1000 * 3600 * 24)) + 1)} <span className="text-xs font-sans">يوم</span>
 </span>
 </div>
 </div>

 <div className="space-y-2.5">
 <label className="text-2xs font-black text-slate-500 pr-1 uppercase tracking-wider">سبب الإجازة / ملاحظات</label>
 <Input
 value={reason}
 onChange={e => setReason(e.target.value)}
 placeholder="اكتب تفاصيل إضافية عن سبب الطلب..."
 className="h-12 rounded-2xl border-slate-200 shadow-xs"
 />
 </div>
 </div>

 <DialogFooter className="gap-3">
 <Button variant="ghost"onClick={() => setIsDialogOpen(false)} className="rounded-xl font-bold h-13 px-8">تراجع</Button>
 <Button onClick={handleAddLeave} disabled={isSubmitting} className="flex-1 rounded-2xl bg-blue-600 hover:bg-blue-700 text-white font-black h-13 shadow-xl shadow-blue-500/20 text-sm">
 {isSubmitting ?'جاري الإرسال...':'تأكيد وإرسال الطلب الآن'}
 </Button>
 </DialogFooter>
 </div>
 </DialogContent>
 </Dialog>
 </div>
 </CardHeader>

 <CardContent className="p-0">
 <div className="overflow-x-auto">
 <Table>
 <TableHeader>
 <TableRow className="bg-slate-50/50 dark:bg-slate-900/50 border-b border-slate-100 dark:border-slate-800">
 <TableHead className="py-4 px-6 text-right text-2xs font-black text-slate-500 uppercase tracking-widest h-14">الموظف</TableHead>
 <TableHead className="py-4 px-6 text-center text-2xs font-black text-slate-500 uppercase tracking-widest h-14">نوع الإجازة</TableHead>
 <TableHead className="py-4 px-6 text-center text-2xs font-black text-slate-500 uppercase tracking-widest h-14">الفترة الزمنية</TableHead>
 <TableHead className="py-4 px-6 text-center text-2xs font-black text-slate-500 uppercase tracking-widest h-14">الأيام</TableHead>
 <TableHead className="py-4 px-6 text-center text-2xs font-black text-slate-500 uppercase tracking-widest h-14">الرصيد السنوي</TableHead>
 <TableHead className="py-4 px-6 text-center text-2xs font-black text-slate-500 uppercase tracking-widest h-14">الحالة</TableHead>
 <TableHead className="py-4 px-6 text-center text-2xs font-black text-slate-500 uppercase tracking-widest h-14">القرار الإداري</TableHead>
 </TableRow>
 </TableHeader>
 <TableBody>
 {isLoading ? (
 <TableRow>
 <TableCell colSpan={7} className="py-24 text-center">
 <div className="flex flex-col items-center gap-4">
 <div className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"/>
 <span className="text-sm font-bold text-slate-400">جاري تحميل سجلات الإجازات...</span>
 </div>
 </TableCell>
 </TableRow>
 ) : filteredLeaves.length === 0 ? (
 <TableRow>
 <TableCell colSpan={7} className="py-32 text-center">
 <div className="flex flex-col items-center gap-5">
 <div className="w-20 h-20 bg-slate-50 dark:bg-slate-900 rounded-3xl flex items-center justify-center text-slate-200 border border-slate-100 dark:border-slate-800">
 <Palmtree className="w-10 h-10"/>
 </div>
 <div className="space-y-1.5">
 <h4 className="text-base font-black text-slate-900 dark:text-white">لا توجد طلبات إجازة</h4>
 <p className="text-xs text-slate-400 max-w-sm mx-auto">لم يتم العثور على أي طلبات مسجلة للموظفين حالياً.</p>
 </div>
 </div>
 </TableCell>
 </TableRow>
 ) : (
 filteredLeaves.map(l => {
 const emp = employees.find(e => e.id === l.employee_id);
 return (
 <TableRow key={l.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30 transition-colors group border-b border-slate-100 dark:border-slate-800/50">
 <TableCell className="py-4 px-6">
 <div className="flex items-center gap-4">
 <div className="w-11 h-11 rounded-2xl bg-indigo-50 dark:bg-indigo-900/20 text-indigo-600 dark:text-indigo-400 flex items-center justify-center text-sm font-black shadow-xs shrink-0 border border-indigo-100/50 dark:border-indigo-900/50">
 {emp?.full_name.charAt(0)}
 </div>
 <div className="flex flex-col min-w-0">
 <span className="text-sm font-black text-slate-900 dark:text-white truncate group-hover:text-indigo-600 transition-colors">{emp?.full_name}</span>
 <span className="text-3xs font-bold text-slate-400 uppercase tracking-tighter truncate mt-0.5">{emp?.role}</span>
 </div>
 </div>
 </TableCell>
 <TableCell className="py-4 px-6 text-center">
 <Badge variant="secondary"className="px-3 py-1 rounded-lg text-3xs font-black bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border-none">
 {LEAVE_TYPE_LABELS[l.leave_type]}
 </Badge>
 </TableCell>
 <TableCell className="py-4 px-6 text-center">
 <div className="flex flex-col items-center gap-1">
 <div className="text-2xs font-black text-slate-700 dark:text-slate-300 font-mono">
 {format(new Date(l.start_date),'dd MMM yyyy', { locale: ar })}
 </div>
 <div className="text-4xs font-bold text-slate-400 flex items-center gap-1">
 <Undo2 className="w-3 h-3 rotate-180"/> {format(new Date(l.end_date),'dd MMM yyyy', { locale: ar })}
 </div>
 </div>
 </TableCell>
 <TableCell className="py-4 px-6 text-center">
 <span className="text-xs font-black text-blue-600 bg-blue-50 dark:bg-blue-900/20 px-2.5 py-1 rounded-lg">{l.days_count} يوم</span>
 </TableCell>
 <TableCell className="py-4 px-6 text-center">
 {(() => {
 const balance = balances[l.employee_id];
 if (!balance) return <span className="text-2xs font-bold text-slate-300">—</span>;
 const low = balance.remaining <= 0;
 return (
 <div className="flex flex-col items-center">
 <span className={cn('text-xs font-black font-mono', low ?'text-red-500':'text-emerald-600')}>
 {balance.remaining} / {balance.entitled}
 </span>
 <span className="text-4xs font-bold text-slate-400">متبقي / مستحق</span>
 </div>
 );
 })()}
 </TableCell>
 <TableCell className="py-4 px-6 text-center">
 <StatusBadge status={l.status} />
 </TableCell>
 <TableCell className="py-4 px-6 text-center">
 {l.status ==='pending'? (
 <div className="flex items-center justify-center gap-2 opacity-0 group-hover:opacity-100 transition-all">
 <Button
 onClick={() => handleStatusUpdate(l.id,'approved')}
 size="sm"
 className="h-8 w-8 p-0 bg-emerald-50 text-emerald-600 hover:bg-emerald-600 hover:text-white rounded-lg transition-all"
 title="موافقة"
 >
 <CheckCircle2 className="w-4 h-4"/>
 </Button>
 <Button
 onClick={() => handleStatusUpdate(l.id,'rejected')}
 size="sm"
 className="h-8 w-8 p-0 bg-red-50 text-red-600 hover:bg-red-600 hover:text-white rounded-lg transition-all"
 title="رفض"
 >
 <XCircle className="w-4 h-4"/>
 </Button>
 </div>
 ) : (
 <div className="flex flex-col items-center gap-1 opacity-60 group-hover:opacity-100 transition-opacity">
 <span className="text-4xs font-black text-slate-400 uppercase tracking-tighter">اتخذ القرار</span>
 {l.approved_by && <span className="text-5xs font-bold text-slate-500 bg-slate-100 px-1.5 rounded">ID: {l.approved_by.slice(0, 8)}</span>}
 </div>
 )}
 </TableCell>
 </TableRow>
 );
 })
 )}
 </TableBody>
 </Table>
 </div>
 </CardContent>

 {/* 🔍 Interactive Footer stats */}
 <div className="p-5 bg-slate-50/50 dark:bg-slate-900/50 border-t border-slate-100 dark:border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-5">
 <div className="flex flex-wrap items-center justify-center gap-6 text-2xs font-bold text-slate-500">
 <div className="flex items-center gap-2">
 <div className="w-2 h-2 rounded-full bg-blue-500"/>
 إجمالي الموظفين في إجازة حالياً: <span className="font-black text-slate-900 dark:text-white">{stats.todayOnLeave}</span>
 </div>
 <Separator orientation="vertical"className="h-4 hidden sm:block opacity-50"/>
 <div className="flex items-center gap-2">
 <div className="w-2 h-2 rounded-full bg-amber-500"/>
 طلبات بانتظار الاعتماد: <span className="font-black text-amber-600">{stats.pending}</span>
 </div>
 </div>
 <div className="flex items-center gap-2 font-mono text-3xs text-slate-300 uppercase tracking-widest">
 HR Management System • v1.0
 </div>
 </div>
 </Card>

 </div>
 </AppShell>
 );
}

const LEAVE_TYPE_LABELS: Record<LeaveType, string> = {
 annual:'إجازة سنوية',
 sick:'مرضية',
 unpaid:'بدون راتب',
 emergency:'طارئة',
 departure:'مغادرة قصيرة',
};

function StatusBadge({ status }: { status: LeaveStatus }) {
 const config = {
 pending: { label:'قيد المراجعة', class:'bg-amber-100 text-amber-700 dark:bg-amber-950/40 dark:text-amber-400', icon: <Clock className="w-3 h-3"/> },
 approved: { label:'تمت الموافقة', class:'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400', icon: <CheckCircle2 className="w-3 h-3"/> },
 rejected: { label:'مرفوضة', class:'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-400', icon: <XCircle className="w-3 h-3"/> },
 cancelled: { label:'ملغاة', class:'bg-slate-100 text-slate-600 dark:bg-slate-800', icon: <Undo2 className="w-3 h-3"/> },
 };

 const item = config[status] || config.pending;

 return (
 <Badge variant="outline"className={cn("gap-1.5 px-3 py-1 border-transparent shadow-xs font-black rounded-lg", item.class)}>
 {item.icon}
 {item.label}
 </Badge>
 );
}
