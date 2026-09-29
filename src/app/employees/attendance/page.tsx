'use client';

import React, { useEffect, useState, useMemo } from'react';
import { AppShell } from'@/components/layout/AppShell';
import { Button } from'@/components/ui/button';
import { cn } from'@/lib/utils';
import {
 Calendar,
 Clock,
 UserCheck,
 UserX,
 FileDown,
 Search,
 FilterX,
 PlusCircle,
 Fingerprint,
 RefreshCw,
 Printer,
 FileText,
 LayoutGrid,
 ChevronDown,
 CheckCircle2,
 AlertCircle,
 MoreVertical,
 Activity,
 History,
 Timer
} from'lucide-react';
import { Input } from'@/components/ui/input';
import {
 Select,
 SelectContent,
 SelectItem,
 SelectTrigger,
 SelectValue
} from'@/components/ui/select';
import { useSessionStore } from'@/core/state/useSessionStore';
import { AttendanceRepository } from'@/modules/employees/attendance_repository';
import { EmployeeRepository } from'@/modules/employees/employee_repository';
import type { EmployeeAttendance, User } from'@/types';
import { format } from'date-fns';
import { ar } from'date-fns/locale';
import { toast } from'sonner';

import {
 Dialog,
 DialogContent,
 DialogHeader,
 DialogTitle,
 DialogTrigger,
 DialogFooter
} from'@/components/ui/dialog';
import { InputOTP, InputOTPGroup, InputOTPSlot } from'@/components/ui/input-otp';
import { Avatar, AvatarFallback, AvatarImage } from'@/components/ui/avatar';

import {
 DropdownMenu,
 DropdownMenuContent,
 DropdownMenuItem,
 DropdownMenuTrigger,
 DropdownMenuSeparator,
 DropdownMenuLabel
} from'@/components/ui/dropdown-menu';
import { Trash2, Edit2, ShieldAlert } from'lucide-react';

import { DatePicker } from'@/components/ui/date-picker';

export default function AttendancePage() {
 const { currentUser, activeBranchId } = useSessionStore();
 const orgId = currentUser?.org_id ||'';
 const branchId = activeBranchId || currentUser?.branch_id ||'';

 const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
 const [attendance, setAttendance] = useState<EmployeeAttendance[]>([]);
 const [employees, setEmployees] = useState<User[]>([]);
 const [isLoading, setIsLoading] = useState(true);
 const [isProcessing, setIsProcessing] = useState(false);
 const [searchQuery, setSearchQuery] = useState('');

 // PIN Auth State
 const [pinValue, setPinValue] = useState('');
 const [pinDialogOpen, setPinDialogOpen] = useState(false);

 // Manual Log State
 const [manualDialogOpen, setManualDialogOpen] = useState(false);
 const [selectedEmpId, setSelectedEmpId] = useState('');
 const [manualStatus, setManualStatus] = useState<EmployeeAttendance['status']>('present');
 const [manualNotes, setManualNotes] = useState('');

 const loadData = async () => {
 if (!orgId) return;
 setIsLoading(true);
 try {
 const [attList, empList] = await Promise.all([
 AttendanceRepository.getAttendanceByDate(orgId, selectedDate),
 EmployeeRepository.getEmployeesByOrg(orgId)
 ]);
 setAttendance(attList);
 setEmployees(empList);
 } catch (err) {
 console.error(err);
 toast.error('خطأ في تحميل البيانات');
 } finally {
 setIsLoading(false);
 }
 };

 useEffect(() => {
 loadData();
 }, [orgId, selectedDate]);

 const handlePinComplete = async (pin: string) => {
 const emp = employees.find(e => e.pin_code_hash === pin);
 if (!emp) {
 toast.error('رمز PIN غير صحيح');
 setPinValue('');
 return;
 }

 setIsProcessing(true);
 try {
 const today = new Date().toISOString().split('T')[0];
 const existing = await AttendanceRepository.getEmployeeAttendance(emp.id, orgId, today);

 if (!existing || !existing.check_in) {
 await AttendanceRepository.checkIn(emp.id, orgId, branchId);
 toast.success(`تم تسجيل حضور: ${emp.full_name}`);
 } else if (!existing.check_out) {
 await AttendanceRepository.checkOut(existing.id);
 toast.success(`تم تسجيل انصراف: ${emp.full_name}`);
 } else {
 toast.info('تم تسجيل الحضور والانصراف مسبقاً اليوم');
 }
 setPinDialogOpen(false);
 setPinValue('');
 await loadData();
 } catch (err: any) {
 toast.error(err.message ||'حدث خطأ أثناء المعالجة');
 } finally {
 setIsProcessing(false);
 }
 };

 const handleManualLog = async () => {
 if (!selectedEmpId) {
 toast.error('يرجى اختيار الموظف أولاً');
 return;
 }
 setIsProcessing(true);
 try {
 await AttendanceRepository.markManualStatus(selectedEmpId, orgId, branchId, selectedDate, manualStatus, manualNotes);
 toast.success('تم تسجيل الحالة يدوياً');
 setManualDialogOpen(false);
 setSelectedEmpId('');
 setManualNotes('');
 await loadData();
 } catch (err: any) {
 toast.error(err.message);
 } finally {
 setIsProcessing(false);
 }
 };

 const stats = useMemo(() => {
 const present = attendance.filter(a => a.status ==='present'|| a.status ==='late').length;
 const late = attendance.filter(a => a.status ==='late').length;
 const absent = employees.length - present;
 return { present, late, absent, total: employees.length };
 }, [attendance, employees]);

 const filteredAttendance = useMemo(() => {
 const q = searchQuery.toLowerCase().trim();
 if (!q) return attendance;
 return attendance.filter(a => {
 const emp = employees.find(e => e.id === a.employee_id);
 return emp?.full_name.toLowerCase().includes(q);
 });
 }, [attendance, employees, searchQuery]);

 return (
 <AppShell
 title="دفتر الحضور والانصراف ومراقبة الدوام"
 subtitle="متابعة أوقات الحضور والانصراف، احتساب ساعات العمل الفعلية، وتسجيل الدوام اليدوي والآلي."
 actions={
 <div className="flex items-center gap-3">
 <div className="flex items-center gap-2 bg-surface border border-slate-200 dark:border-slate-800 px-4 py-2 rounded-xl text-xs font-black shadow-xs">
 <Calendar className="w-4 h-4 text-blue-500"/>
 <span>{format(new Date(selectedDate),'dd MMMM yyyy', { locale: ar })}</span>
 </div>

 {/* PIN Quick Access Dialog */}
 <Dialog open={pinDialogOpen} onOpenChange={setPinDialogOpen}>
 <DialogTrigger asChild>
 <Button variant="outline"className="h-11 px-5 border-slate-200 dark:border-slate-800 rounded-xl font-bold text-xs gap-2 bg-surface text-blue-600 hover:bg-blue-50">
 <Fingerprint className="w-4 h-4"/> بصمة سريعة (PIN)
 </Button>
 </DialogTrigger>
 <DialogContent className="sm:max-w-md rounded-3xl"dir="rtl">
 <DialogHeader>
 <DialogTitle className="text-center font-black text-lg">تسجيل حضور / انصراف سريع</DialogTitle>
 </DialogHeader>
 <div className="flex flex-col items-center py-6 space-y-6">
 <div className="w-16 h-16 rounded-full bg-blue-50 flex items-center justify-center text-blue-600">
 <Fingerprint className="w-8 h-8"/>
 </div>
 <div className="text-center space-y-1">
 <p className="text-sm font-bold text-slate-700">أدخل رمز PIN الخاص بك</p>
 <p className="text-xs text-slate-400">سيتم التعرف على الموظف وتسجيل الحالة تلقائياً</p>
 </div>
 <InputOTP
 maxLength={4}
 value={pinValue}
 onChange={setPinValue}
 onComplete={handlePinComplete}
 disabled={isProcessing}
 >
 <InputOTPGroup>
 <InputOTPSlot index={0} className="w-14 h-14 text-2xl font-black rounded-xl"/>
 <InputOTPSlot index={1} className="w-14 h-14 text-2xl font-black rounded-xl"/>
 <InputOTPSlot index={2} className="w-14 h-14 text-2xl font-black rounded-xl"/>
 <InputOTPSlot index={3} className="w-14 h-14 text-2xl font-black rounded-xl"/>
 </InputOTPGroup>
 </InputOTP>
 {isProcessing && <div className="text-3xs font-black text-blue-600 animate-pulse">جاري التحقق...</div>}
 </div>
 </DialogContent>
 </Dialog>

 {/* Manual Registration Dialog */}
 <Dialog open={manualDialogOpen} onOpenChange={setManualDialogOpen}>
 <DialogTrigger asChild>
 <Button className="h-11 px-5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-black text-xs gap-2 shadow-lg shadow-blue-500/20">
 <PlusCircle className="w-4 h-4"/> تسجيل يدوي لموظف
 </Button>
 </DialogTrigger>
 <DialogContent className="sm:max-w-md rounded-3xl"dir="rtl">
 <DialogHeader>
 <DialogTitle className="text-right font-black text-lg">تسجيل حضور يدوي</DialogTitle>
 </DialogHeader>
 <div className="space-y-4 py-4">
 <div className="space-y-2">
 <label className="text-xs font-black text-slate-500">اختر الموظف</label>
 <Select value={selectedEmpId} onValueChange={setSelectedEmpId}>
 <SelectTrigger className="h-12 rounded-xl">
 <SelectValue placeholder="قائمة الموظفين..."/>
 </SelectTrigger>
 <SelectContent className="rounded-xl">
 {employees.map(e => (
 <SelectItem key={e.id} value={e.id}>{e.full_name}</SelectItem>
 ))}
 </SelectContent>
 </Select>
 </div>
 <div className="grid grid-cols-2 gap-4">
 <div className="space-y-2">
 <label className="text-xs font-black text-slate-500">الحالة</label>
 <Select value={manualStatus} onValueChange={(v: any) => setManualStatus(v)}>
 <SelectTrigger className="h-11 rounded-xl">
 <SelectValue />
 </SelectTrigger>
 <SelectContent className="rounded-xl">
 <SelectItem value="present">حضور (منضبط)</SelectItem>
 <SelectItem value="late">تأخير</SelectItem>
 <SelectItem value="absent">غياب</SelectItem>
 <SelectItem value="excused">بإذن</SelectItem>
 <SelectItem value="leave">إجازة</SelectItem>
 </SelectContent>
 </Select>
 </div>
 <div className="space-y-2">
 <label className="text-xs font-black text-slate-500">التاريخ</label>
 <DatePicker
 date={selectedDate}
 onSelect={(d) => d && setSelectedDate(d.toISOString().split('T')[0])}
 className="h-11 w-full rounded-xl"
 />
 </div>
 </div>
 <div className="space-y-2">
 <label className="text-xs font-black text-slate-500">ملاحظات إضافية</label>
 <Input
 value={manualNotes}
 onChange={e => setManualNotes(e.target.value)}
 placeholder="مثال: تأخير بسبب المواصلات، إذن مسبق..."
 className="h-11 rounded-xl"
 />
 </div>
 </div>
 <DialogFooter className="gap-2">
 <Button variant="ghost"onClick={() => setManualDialogOpen(false)} className="rounded-xl font-bold">إلغاء</Button>
 <Button onClick={handleManualLog} disabled={isProcessing} className="flex-1 rounded-xl bg-blue-600 font-black">
 {isProcessing ?'جاري التسجيل...':'إثبات الحضور الآن'}
 </Button>
 </DialogFooter>
 </DialogContent>
 </Dialog>
 </div>
 }
 >
 <div className="space-y-6 text-right"dir="rtl">

 {/* KPI Section */}
 <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
 <StatCard
 label="المتواجدون حالياً"
 value={stats.present}
 unit="موظف"
 icon={<CheckCircle2 className="w-6 h-6"/>}
 color="emerald"
 />
 <StatCard
 label="حالات الغياب"
 value={stats.absent}
 unit="حالة"
 icon={<UserX className="w-6 h-6"/>}
 color="red"
 />
 <StatCard
 label="حالات التأخير"
 value={stats.late}
 unit="حالة"
 icon={<Clock className="w-6 h-6"/>}
 color="amber"
 />
 </div>

 {/* Table/Toolbar Container */}
 <div className="bg-surface rounded-3xl border border-slate-200/80 dark:border-slate-800 shadow-sm overflow-hidden flex flex-col">

 {/* Toolbar */}
 <div className="p-4 border-b border-slate-100 dark:border-slate-800/80 flex flex-wrap items-center justify-between gap-4">
 <div className="flex items-center gap-2">
 <button className="w-10 h-10 rounded-xl flex items-center justify-center text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"title="تحديث">
 <RefreshCw className="w-4 h-4"/>
 </button>
 <button className="w-10 h-10 rounded-xl flex items-center justify-center text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"title="طباعة">
 <Printer className="w-4 h-4"/>
 </button>
 <button className="w-10 h-10 rounded-xl flex items-center justify-center text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"title="PDF">
 <FileText className="w-4 h-4 text-red-500"/>
 </button>
 <button className="w-10 h-10 rounded-xl flex items-center justify-center text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"title="Excel">
 <FileDown className="w-4 h-4 text-emerald-600"/>
 </button>

 <div className="h-6 w-[1px] bg-slate-100 dark:bg-slate-800 mx-2"/>

 <Button variant="ghost"className="h-10 border border-slate-100 dark:border-slate-800 rounded-xl text-xs font-bold gap-2 text-slate-600 dark:text-slate-400">
 <LayoutGrid className="w-4 h-4"/> تخصيص الأعمدة
 </Button>
 </div>

 <div className="flex items-center gap-4">
 <div className="relative group w-72">
 <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 group-focus-within:text-blue-500 transition-colors"/>
 <Input
 value={searchQuery}
 onChange={e => setSearchQuery(e.target.value)}
 placeholder="بحث باسم الموظف..."
 className="h-11 pr-10 bg-slate-50/50 dark:bg-slate-900/50 border-slate-200 dark:border-slate-800 rounded-2xl text-xs font-bold"
 />
 </div>

 <div className="flex items-center gap-2">
 <span className="text-xs font-bold text-slate-400">عرض</span>
 <Select defaultValue="25">
 <SelectTrigger className="w-20 h-10 rounded-xl border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50 text-xs font-black">
 <SelectValue />
 </SelectTrigger>
 <SelectContent>
 <SelectItem value="10">10</SelectItem>
 <SelectItem value="25">25</SelectItem>
 <SelectItem value="50">50</SelectItem>
 <SelectItem value="100">100</SelectItem>
 </SelectContent>
 </Select>
 <span className="text-xs font-bold text-slate-400">إدخالات</span>
 </div>
 </div>
 </div>

 {/* Table Content */}
 <div className="overflow-x-auto">
 <table className="w-full text-right border-collapse min-w-[900px]">
 <thead>
 <tr className="bg-slate-50/50 dark:bg-slate-900/50 border-b border-slate-100 dark:border-slate-800 text-2xs font-black text-slate-400 uppercase tracking-widest">
 <th className="py-4 px-6">الموظف</th>
 <th className="py-4 px-6 text-center">وقت الحضور</th>
 <th className="py-4 px-6 text-center">وقت الانصراف</th>
 <th className="py-4 px-6 text-center">ساعات العمل</th>
 <th className="py-4 px-6 text-center">الانضباط والحالة</th>
 <th className="py-4 px-6 text-center">إجراءات</th>
 </tr>
 </thead>
 <tbody className="divide-y divide-slate-50 dark:divide-slate-800/40">
 {isLoading ? (
 <tr><td colSpan={6} className="py-20 text-center text-slate-400 font-bold">جاري التحميل...</td></tr>
 ) : filteredAttendance.length === 0 ? (
 <tr>
 <td colSpan={6} className="py-32 text-center">
 <div className="flex flex-col items-center gap-4">
 <div className="w-20 h-20 bg-slate-50 dark:bg-slate-900 rounded-3xl flex items-center justify-center text-slate-300">
 <Activity className="w-10 h-10"/>
 </div>
 <div className="space-y-1">
 <h4 className="text-sm font-black text-slate-900 dark:text-white">لا توجد بيانات</h4>
 <p className="text-xs text-slate-400">لم يتم العثور على سجلات مطابقة للبحث أو الفلترة.</p>
 </div>
 </div>
 </td>
 </tr>
 ) : (
 filteredAttendance.map(record => {
 const emp = employees.find(e => e.id === record.employee_id);
 return (
 <tr key={record.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-900/20 transition-colors group">
 <td className="py-4 px-6">
 <div className="flex items-center gap-3">
 <div className="w-10 h-10 rounded-xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-500 font-black">
 {emp?.full_name.charAt(0)}
 </div>
 <div className="flex flex-col">
 <span className="text-sm font-black text-slate-900 dark:text-white">{emp?.full_name}</span>
 <span className="text-3xs font-bold text-slate-400 uppercase tracking-tight">{emp?.role}</span>
 </div>
 </div>
 </td>
 <td className="py-4 px-6 text-center">
 <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-emerald-50 dark:bg-emerald-950/30 text-emerald-600 dark:text-emerald-400 text-xs font-black font-mono">
 <Timer className="w-3.5 h-3.5"/>
 {record.check_in ? format(new Date(record.check_in),'hh:mm a') :'--:--'}
 </div>
 </td>
 <td className="py-4 px-6 text-center text-xs font-mono font-bold text-slate-500">
 {record.check_out ? format(new Date(record.check_out),'hh:mm a') :'لم ينصرف'}
 </td>
 <td className="py-4 px-6 text-center">
 <span className="text-xs font-black text-slate-700 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 px-2.5 py-1 rounded-lg">
 {record.work_hours?.toFixed(1) ||'0.0'} س
 </span>
 </td>
 <td className="py-4 px-6 text-center">
 <StatusBadge status={record.status} />
 </td>
 <td className="py-4 px-6 text-center">
 <DropdownMenu>
 <DropdownMenuTrigger asChild>
 <button className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-xl transition-colors">
 <MoreVertical className="w-5 h-5"/>
 </button>
 </DropdownMenuTrigger>
 <DropdownMenuContent align="end"className="w-48 rounded-2xl">
 <DropdownMenuLabel className="text-3xs font-black text-slate-400 uppercase">إجراءات السجل</DropdownMenuLabel>
 <DropdownMenuItem onClick={() => { setSelectedEmpId(record.employee_id); setManualStatus(record.status); setManualNotes(record.notes ||''); setManualDialogOpen(true); }} className="gap-2 font-bold text-xs py-2.5 cursor-pointer">
 <Edit2 className="w-4 h-4 text-blue-500"/> تعديل بيانات السجل
 </DropdownMenuItem>
 <DropdownMenuSeparator />
 <DropdownMenuItem
 onClick={async () => {
 if (confirm('هل أنت متأكد من حذف هذا السجل؟')) {
 await AttendanceRepository.deleteAttendance(record.id);
 toast.success('تم حذف السجل بنجاح');
 loadData();
 }
 }}
 className="gap-2 font-bold text-xs py-2.5 text-red-600 cursor-pointer"
 >
 <Trash2 className="w-4 h-4"/> حذف السجل نهائياً
 </DropdownMenuItem>
 </DropdownMenuContent>
 </DropdownMenu>
 </td>
 </tr>
 );
 })
 )}
 </tbody>
 </table>
 </div>

 {/* Footer Pagination */}
 <div className="p-4 bg-slate-50/30 dark:bg-slate-900/30 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
 <span className="text-2xs font-bold text-slate-400">
 عرض 1 إلى {filteredAttendance.length} من إجمالي {attendance.length} سجلات
 </span>
 <div className="flex items-center gap-1">
 <Button variant="outline"size="sm"className="h-8 w-8 p-0 rounded-lg">1</Button>
 </div>
 </div>
 </div>

 </div>
 </AppShell>
 );
}

function StatCard({ label, value, unit, icon, color }: { label: string, value: number, unit?: string, icon: React.ReactNode, color:'emerald'|'amber'|'red'|'blue'}) {
 const colors = {
 emerald:'bg-emerald-50 text-emerald-600 border-emerald-100 dark:bg-emerald-950/20 dark:border-emerald-900/50',
 amber:'bg-amber-50 text-amber-600 border-amber-100 dark:bg-amber-950/20 dark:border-amber-900/50',
 red:'bg-red-50 text-red-600 border-red-100 dark:bg-red-950/20 dark:border-red-900/50',
 blue:'bg-blue-50 text-blue-600 border-blue-100 dark:bg-blue-950/20 dark:border-blue-900/50'
 };

 return (
 <div className="bg-surface rounded-3xl border border-slate-200/80 dark:border-slate-800 p-6 flex items-center justify-between shadow-xs group hover:border-slate-300 dark:hover:border-slate-700 transition-all">
 <div className="flex items-center gap-4">
 <div className={`w-14 h-14 rounded-2xl flex items-center justify-center shrink-0 shadow-inner group-hover:scale-110 transition-transform ${colors[color]}`}>
 {icon}
 </div>
 <div>
 <span className="text-xs font-black text-slate-400 block mb-1">{label}</span>
 <div className={cn("text-2xl font-black flex items-baseline gap-1.5", colors[color].split('')[1])}>
 {value}
 {unit && <span className="text-3xs font-bold text-slate-400">{unit}</span>}
 </div>
 </div>
 </div>
 </div>
 );
}

function StatusBadge({ status }: { status: EmployeeAttendance['status'] }) {
 const config = {
 present: { label:'منضبط', class:'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-400'},
 late: { label:'تأخير', class:'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-400'},
 absent: { label:'غائب', class:'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-400'},
 excused: { label:'بإذن', class:'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-400'},
 leave: { label:'إجازة', class:'bg-purple-100 text-purple-700 dark:bg-purple-900/40 dark:text-purple-400'},
 };

 return (
 <span className={cn("px-3 py-1.5 rounded-full text-3xs font-black shadow-xs border border-white/20", config[status].class)}>
 {config[status].label}
 </span>
 );
}