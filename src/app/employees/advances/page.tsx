'use client';

import React, { useEffect, useMemo, useState } from'react';
import { AppShell } from'@/components/layout/AppShell';
import { Button } from'@/components/ui/button';
import { Input } from'@/components/ui/input';
import { Card, CardContent, CardHeader } from'@/components/ui/card';
import {
 Table,
 TableBody,
 TableCell,
 TableHead,
 TableHeader,
 TableRow,
} from'@/components/ui/table';
import {
 Select,
 SelectContent,
 SelectItem,
 SelectTrigger,
 SelectValue,
} from'@/components/ui/select';
import {
 Dialog,
 DialogContent,
 DialogDescription,
 DialogFooter,
 DialogHeader,
 DialogTitle,
} from'@/components/ui/dialog';
import { Badge } from'@/components/ui/badge';
import { useSessionStore } from'@/core/state/useSessionStore';
import { EmployeeAdvanceRepository } from'@/modules/employees/employee_advance_repository';
import { EmployeeRepository } from'@/modules/employees/employee_repository';
import { TreasuryRepository } from'@/modules/treasury/treasury_repository';
import { formatNumber } from'@/lib/format';
import { cn } from'@/lib/utils';
import { toast } from'sonner';
import {
 BadgeDollarSign,
 Banknote,
 CheckCircle2,
 Clock,
 FilterX,
 HandCoins,
 Plus,
 Search,
 Trash2,
 Wallet,
 XCircle,
} from'lucide-react';
import type {
 EmployeeAdvance,
 EmployeeAdvanceStatus,
 EmployeeAdvanceType,
 Treasury,
 User as Employee,
} from'@/types';

const ADVANCE_TYPE_LABELS: Record<EmployeeAdvanceType, string> = {
 advance_salary:'سلفة من الراتب',
 loan:'قرض',
 bonus:'مكافأة',
 allowance:'بدل',
 deduction:'خصم',
};

const CASH_OUT_TYPES: EmployeeAdvanceType[] = ['advance_salary','loan','bonus','allowance'];

export default function AdvancesPage() {
 const { currentUser, activeBranchId } = useSessionStore();
 const orgId = currentUser?.org_id ||'';
 const branchId = activeBranchId || currentUser?.branch_id ||'';

 const [advances, setAdvances] = useState<EmployeeAdvance[]>([]);
 const [employees, setEmployees] = useState<Employee[]>([]);
 const [treasuries, setTreasuries] = useState<Treasury[]>([]);
 const [isLoading, setIsLoading] = useState(true);
 const [searchQuery, setSearchQuery] = useState('');
 const [statusFilter, setStatusFilter] = useState<string>('all');

 const [isDialogOpen, setIsDialogOpen] = useState(false);
 const [isSubmitting, setIsSubmitting] = useState(false);
 const [selectedEmpId, setSelectedEmpId] = useState('');
 const [adjustmentType, setAdjustmentType] = useState<EmployeeAdvanceType>('advance_salary');
 const [amount, setAmount] = useState('');
 const [reason, setReason] = useState('');

 const [payTarget, setPayTarget] = useState<EmployeeAdvance | null>(null);
 const [payTreasuryId, setPayTreasuryId] = useState('');
 const [isPaying, setIsPaying] = useState(false);

 const loadData = async () => {
 if (!orgId) return;
 setIsLoading(true);
 try {
 const [advanceList, empList, treasuryList] = await Promise.all([
 EmployeeAdvanceRepository.getByOrg(orgId),
 EmployeeRepository.getEmployeesByOrg(orgId),
 TreasuryRepository.getTreasuries(orgId),
 ]);
 setAdvances(advanceList.sort((a, b) => b.created_at.localeCompare(a.created_at)));
 setEmployees(empList);
 setTreasuries(treasuryList);
 } catch {
 toast.error('خطأ في تحميل بيانات السلف.');
 } finally {
 setIsLoading(false);
 }
 };

 useEffect(() => {
 loadData();
 // eslint-disable-next-line react-hooks/exhaustive-deps
 }, [orgId]);

 const employeeName = (id: string) => employees.find((e) => e.id === id)?.full_name ||'موظف';

 const stats = useMemo(() => {
 const pending = advances.filter((a) => a.status ==='pending');
 const approved = advances.filter((a) => a.status ==='approved');
 const paid = advances.filter((a) => a.status ==='paid'|| a.status ==='deducted_from_salary');
 const pendingTotal = approved.reduce((sum, a) => sum + (a.amount || 0), 0);
 return {
 pendingCount: pending.length,
 approvedCount: approved.length,
 paidTotal: paid.reduce((sum, a) => sum + (a.amount || 0), 0),
 pendingTotal,
 };
 }, [advances]);

 const resetForm = () => {
 setSelectedEmpId('');
 setAdjustmentType('advance_salary');
 setAmount('');
 setReason('');
 };

 const handleAddAdvance = async () => {
 const value = Number(amount);
 if (!selectedEmpId) {
 toast.error('اختر الموظف أولاً.');
 return;
 }
 if (!(value > 0)) {
 toast.error('أدخل قيمة صحيحة أكبر من صفر.');
 return;
 }
 setIsSubmitting(true);
 try {
 await EmployeeAdvanceRepository.addAdvance({
 orgId,
 branchId,
 employeeId: selectedEmpId,
 adjustmentType,
 amount: value,
 reason: reason.trim() || undefined,
 createdBy: currentUser?.id,
 });
 toast.success('تم تسجيل الطلب بنجاح.');
 setIsDialogOpen(false);
 resetForm();
 await loadData();
 } catch (err) {
 toast.error(err instanceof Error ? err.message :'حدث خطأ أثناء الحفظ.');
 } finally {
 setIsSubmitting(false);
 }
 };

 const handleStatusUpdate = async (advance: EmployeeAdvance, status: EmployeeAdvanceStatus) => {
 try {
 await EmployeeAdvanceRepository.updateStatus(advance.id, status, currentUser?.id);
 toast.success(status ==='approved'?'تم اعتماد الطلب.':'تم رفض الطلب.');
 await loadData();
 } catch {
 toast.error('خطأ في تحديث حالة الطلب.');
 }
 };

 const openPayDialog = (advance: EmployeeAdvance) => {
 setPayTarget(advance);
 const preferred = treasuries.find((t) => t.is_default) || treasuries[0];
 setPayTreasuryId(preferred?.id ||'');
 };

 const handlePay = async () => {
 if (!payTarget) return;
 setIsPaying(true);
 try {
 const result = await EmployeeAdvanceRepository.markPaid(
 payTarget.id,
 payTreasuryId || undefined,
 currentUser?.id
 );
 if (!result.success) {
 toast.error(result.error ||'تعذر صرف الطلب.');
 return;
 }
 toast.success('تم صرف الطلب وترحيل القيد بنجاح.');
 setPayTarget(null);
 await loadData();
 } finally {
 setIsPaying(false);
 }
 };

 const handleDelete = async (advance: EmployeeAdvance) => {
 if (advance.status ==='paid') {
 toast.error('لا يمكن حذف طلب تم صرفه.');
 return;
 }
 if (!confirm('هل أنت متأكد من حذف هذا الطلب؟')) return;
 try {
 await EmployeeAdvanceRepository.deleteAdvance(advance.id);
 toast.success('تم حذف الطلب.');
 await loadData();
 } catch {
 toast.error('خطأ أثناء الحذف.');
 }
 };

 const filteredAdvances = useMemo(() => {
 const q = searchQuery.trim().toLowerCase();
 return advances.filter((a) => {
 const name = employeeName(a.employee_id).toLowerCase();
 const matchesSearch = !q || name.includes(q) || (a.reason ||'').toLowerCase().includes(q);
 const matchesStatus = statusFilter ==='all'|| a.status === statusFilter;
 return matchesSearch && matchesStatus;
 });
 // eslint-disable-next-line react-hooks/exhaustive-deps
 }, [advances, employees, searchQuery, statusFilter]);

 const payTargetMovesCash = payTarget ? CASH_OUT_TYPES.includes(payTarget.adjustment_type) : false;

 return (
 <AppShell
 title="السلف والمكافآت والخصومات"
 subtitle="تسجيل واعتماد وصرف السلف والقروض والمكافآت مع ترحيل القيد المحاسبي تلقائياً."
 >
 <div className="flex flex-col gap-6 pb-12"dir="rtl">
 <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
 <StatCard label="بانتظار الاعتماد"value={stats.pendingCount} color="amber"icon={<Clock className="w-5 h-5"/>} description="طلبات لم يتم البت فيها"/>
 <StatCard label="معتمدة للصرف"value={stats.approvedCount} color="blue"icon={<CheckCircle2 className="w-5 h-5"/>} description="جاهزة للصرف أو الخصم"/>
 <StatCard label="إجمالي المعتمد"value={stats.pendingTotal} color="indigo"icon={<HandCoins className="w-5 h-5"/>} description="قيمة الالتزامات القائمة"/>
 <StatCard label="إجمالي المصروف"value={stats.paidTotal} color="emerald"icon={<Banknote className="w-5 h-5"/>} description="ما تم صرفه فعلياً"/>
 </div>

 <Card className="rounded-2xl border-slate-200 dark:border-slate-800 shadow-xs overflow-hidden">
 <CardHeader className="p-5 border-b border-slate-100 dark:border-slate-800 flex flex-col lg:flex-row lg:items-center justify-between gap-5 bg-surface">
 <div className="flex flex-col md:flex-row items-stretch md:items-center gap-4 flex-1">
 <div className="relative group flex-1 md:max-w-xs">
 <Search className="absolute right-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 group-focus-within:text-blue-500 transition-colors"/>
 <Input
 value={searchQuery}
 onChange={(e) => setSearchQuery(e.target.value)}
 placeholder="بحث باسم الموظف أو السبب..."
 className="h-11 pr-10 bg-slate-50/50 dark:bg-slate-950/50 border-slate-200 dark:border-slate-800 rounded-xl text-xs font-bold focus:bg-white dark:focus:bg-slate-900 transition-all"
 />
 </div>

 <div className="flex items-center gap-3">
 <Select value={statusFilter} onValueChange={setStatusFilter}>
 <SelectTrigger className="w-44 h-11 rounded-xl border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950/50 text-xs font-black">
 <SelectValue placeholder="تصفية بالحالة"/>
 </SelectTrigger>
 <SelectContent className="rounded-xl shadow-xl">
 <SelectItem value="all">الكل (جميع الطلبات)</SelectItem>
 <SelectItem value="pending">قيد الانتظار</SelectItem>
 <SelectItem value="approved">معتمدة</SelectItem>
 <SelectItem value="paid">مصروفة</SelectItem>
 <SelectItem value="deducted_from_salary">مخصومة من الراتب</SelectItem>
 <SelectItem value="rejected">مرفوضة</SelectItem>
 </SelectContent>
 </Select>

 <Button
 variant="ghost"
 onClick={() => {
 setSearchQuery('');
 setStatusFilter('all');
 }}
 className="h-11 px-4 text-red-500 hover:text-red-600 font-bold text-xs gap-2 rounded-xl hover:bg-red-50 dark:hover:bg-red-950/20"
 >
 <FilterX className="w-4 h-4"/> <span className="hidden sm:inline">مسح الفلاتر</span>
 </Button>
 </div>
 </div>

 <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
 <Button
 onClick={() => {
 resetForm();
 setIsDialogOpen(true);
 }}
 className="h-11 px-6 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-black text-xs gap-2 shadow-lg shadow-blue-500/20 active:scale-95 transition-all cursor-pointer"
 >
 <Plus className="w-4 h-4"/> تسجيل سلفة أو مكافأة
 </Button>

 <DialogContent className="sm:max-w-lg rounded-3xl p-0 overflow-hidden border-none shadow-2xl"dir="rtl">
 <div className="bg-white dark:bg-slate-950 p-8">
 <DialogHeader className="mb-8">
 <div className="w-14 h-14 rounded-2xl bg-blue-50 dark:bg-blue-900/30 flex items-center justify-center text-blue-600 mb-4 shadow-inner">
 <BadgeDollarSign className="w-7 h-7"/>
 </div>
 <DialogTitle className="text-right font-black text-xl">تسجيل سلفة / مكافأة / خصم</DialogTitle>
 <DialogDescription className="text-right font-bold text-slate-400 mt-1">
 يتم الاعتماد أولاً ثم الصرف من الخزينة مع ترحيل القيد تلقائياً.
 </DialogDescription>
 </DialogHeader>

 <div className="space-y-6 mb-8">
 <div className="space-y-2.5">
 <label className="text-2xs font-black text-slate-500 pr-1 uppercase tracking-wider">الموظف المستفيد</label>
 <Select value={selectedEmpId} onValueChange={setSelectedEmpId}>
 <SelectTrigger className="h-12 rounded-2xl border-slate-200 bg-slate-50/30 font-bold">
 <SelectValue placeholder="اختر الموظف..."/>
 </SelectTrigger>
 <SelectContent className="rounded-2xl shadow-2xl">
 {employees.map((emp) => (
 <SelectItem key={emp.id} value={emp.id} className="py-2.5">
 {emp.full_name}
 </SelectItem>
 ))}
 </SelectContent>
 </Select>
 </div>

 <div className="grid grid-cols-2 gap-5">
 <div className="space-y-2.5">
 <label className="text-2xs font-black text-slate-500 pr-1 uppercase tracking-wider">نوع الطلب</label>
 <Select value={adjustmentType} onValueChange={(v) => setAdjustmentType(v as EmployeeAdvanceType)}>
 <SelectTrigger className="h-12 rounded-2xl border-slate-200 bg-slate-50/30 font-black">
 <SelectValue />
 </SelectTrigger>
 <SelectContent className="rounded-2xl">
 <SelectItem value="advance_salary">سلفة من الراتب</SelectItem>
 <SelectItem value="loan">قرض</SelectItem>
 <SelectItem value="bonus">مكافأة</SelectItem>
 <SelectItem value="allowance">بدل</SelectItem>
 <SelectItem value="deduction">خصم</SelectItem>
 </SelectContent>
 </Select>
 </div>
 <div className="space-y-2.5">
 <label className="text-2xs font-black text-slate-500 pr-1 uppercase tracking-wider">القيمة (ج.م)</label>
 <Input
 type="number"
 value={amount}
 onChange={(e) => setAmount(e.target.value)}
 placeholder="0.00"
 className="h-12 rounded-2xl border-slate-200 shadow-xs text-left font-mono"
 dir="ltr"
 />
 </div>
 </div>

 <div className="space-y-2.5">
 <label className="text-2xs font-black text-slate-500 pr-1 uppercase tracking-wider">السبب / ملاحظات</label>
 <Input
 value={reason}
 onChange={(e) => setReason(e.target.value)}
 placeholder="اكتب سبب الطلب..."
 className="h-12 rounded-2xl border-slate-200 shadow-xs"
 />
 </div>
 </div>

 <DialogFooter className="gap-3">
 <Button variant="ghost"onClick={() => setIsDialogOpen(false)} className="rounded-xl font-bold h-12 px-8">
 تراجع
 </Button>
 <Button
 onClick={handleAddAdvance}
 disabled={isSubmitting}
 className="flex-1 rounded-2xl bg-blue-600 hover:bg-blue-700 text-white font-black h-12 shadow-xl shadow-blue-500/20 text-sm"
 >
 {isSubmitting ?'جاري الحفظ...':'تأكيد الحفظ'}
 </Button>
 </DialogFooter>
 </div>
 </DialogContent>
 </Dialog>
 </CardHeader>

 <CardContent className="p-0">
 <div className="overflow-x-auto">
 <Table>
 <TableHeader>
 <TableRow className="bg-slate-50/50 dark:bg-slate-900/50 border-b border-slate-100 dark:border-slate-800">
 <TableHead className="py-4 px-6 text-right text-2xs font-black text-slate-500 uppercase tracking-widest h-14">الموظف</TableHead>
 <TableHead className="py-4 px-6 text-center text-2xs font-black text-slate-500 uppercase tracking-widest h-14">النوع</TableHead>
 <TableHead className="py-4 px-6 text-center text-2xs font-black text-slate-500 uppercase tracking-widest h-14">القيمة</TableHead>
 <TableHead className="py-4 px-6 text-center text-2xs font-black text-slate-500 uppercase tracking-widest h-14">السبب</TableHead>
 <TableHead className="py-4 px-6 text-center text-2xs font-black text-slate-500 uppercase tracking-widest h-14">الحالة</TableHead>
 <TableHead className="py-4 px-6 text-center text-2xs font-black text-slate-500 uppercase tracking-widest h-14">إجراءات</TableHead>
 </TableRow>
 </TableHeader>
 <TableBody>
 {isLoading ? (
 <TableRow>
 <TableCell colSpan={6} className="py-24 text-center">
 <div className="flex flex-col items-center gap-4">
 <div className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"/>
 <span className="text-sm font-bold text-slate-400">جاري تحميل السلف...</span>
 </div>
 </TableCell>
 </TableRow>
 ) : filteredAdvances.length === 0 ? (
 <TableRow>
 <TableCell colSpan={6} className="py-32 text-center">
 <div className="flex flex-col items-center gap-5">
 <div className="w-20 h-20 bg-slate-50 dark:bg-slate-900 rounded-3xl flex items-center justify-center text-slate-200 border border-slate-100 dark:border-slate-800">
 <HandCoins className="w-10 h-10"/>
 </div>
 <div className="space-y-1.5">
 <h4 className="text-base font-black text-slate-900 dark:text-white">لا توجد طلبات</h4>
 <p className="text-xs text-slate-400 max-w-sm mx-auto">لم يتم تسجيل أي سلف أو مكافآت حتى الآن.</p>
 </div>
 </div>
 </TableCell>
 </TableRow>
 ) : (
 filteredAdvances.map((advance) => (
 <TableRow key={advance.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30 transition-colors group border-b border-slate-100 dark:border-slate-800/50">
 <TableCell className="py-4 px-6">
 <span className="text-sm font-black text-slate-900 dark:text-white">{employeeName(advance.employee_id)}</span>
 </TableCell>
 <TableCell className="py-4 px-6 text-center">
 <Badge variant="secondary"className="px-3 py-1 rounded-lg text-3xs font-black bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border-none">
 {ADVANCE_TYPE_LABELS[advance.adjustment_type]}
 </Badge>
 </TableCell>
 <TableCell className="py-4 px-6 text-center">
 <span className="text-sm font-black font-mono text-slate-800 dark:text-slate-200">{formatNumber(advance.amount)}</span>
 </TableCell>
 <TableCell className="py-4 px-6 text-center">
 <span className="text-2xs font-bold text-slate-500">{advance.reason ||'—'}</span>
 </TableCell>
 <TableCell className="py-4 px-6 text-center">
 <StatusBadge status={advance.status} />
 </TableCell>
 <TableCell className="py-4 px-6 text-center">
 <div className="flex items-center justify-center gap-2">
 {advance.status ==='pending'&& (
 <>
 <Button
 onClick={() => handleStatusUpdate(advance,'approved')}
 size="sm"
 className="h-8 w-8 p-0 bg-emerald-50 text-emerald-600 hover:bg-emerald-600 hover:text-white rounded-lg"
 title="اعتماد"
 >
 <CheckCircle2 className="w-4 h-4"/>
 </Button>
 <Button
 onClick={() => handleStatusUpdate(advance,'rejected')}
 size="sm"
 className="h-8 w-8 p-0 bg-red-50 text-red-600 hover:bg-red-600 hover:text-white rounded-lg"
 title="رفض"
 >
 <XCircle className="w-4 h-4"/>
 </Button>
 </>
 )}
 {advance.status ==='approved'&& (
 <Button
 onClick={() => openPayDialog(advance)}
 size="sm"
 className="h-8 px-3 bg-blue-50 text-blue-600 hover:bg-blue-600 hover:text-white rounded-lg text-2xs font-black gap-1.5"
 >
 <Wallet className="w-3.5 h-3.5"/> صرف
 </Button>
 )}
 {advance.status !=='paid'&& (
 <Button
 onClick={() => handleDelete(advance)}
 size="sm"
 className="h-8 w-8 p-0 bg-slate-50 text-slate-500 hover:bg-red-600 hover:text-white rounded-lg"
 title="حذف"
 >
 <Trash2 className="w-4 h-4"/>
 </Button>
 )}
 </div>
 </TableCell>
 </TableRow>
 ))
 )}
 </TableBody>
 </Table>
 </div>
 </CardContent>
 </Card>
 </div>

 <Dialog open={!!payTarget} onOpenChange={(open) => !open && setPayTarget(null)}>
 <DialogContent className="sm:max-w-md rounded-3xl"dir="rtl">
 <DialogHeader>
 <DialogTitle className="text-right font-black text-lg">صرف الطلب</DialogTitle>
 <DialogDescription className="text-right font-bold text-slate-400">
 {payTarget ?`${employeeName(payTarget.employee_id)} — ${ADVANCE_TYPE_LABELS[payTarget.adjustment_type]} بقيمة ${formatNumber(payTarget.amount)} ج.م`:''}
 </DialogDescription>
 </DialogHeader>

 {payTargetMovesCash ? (
 <div className="space-y-2.5 py-2">
 <label className="text-2xs font-black text-slate-500 pr-1 uppercase tracking-wider">الخزينة المصدر</label>
 <Select value={payTreasuryId} onValueChange={setPayTreasuryId}>
 <SelectTrigger className="h-12 rounded-2xl border-slate-200 bg-slate-50/30 font-bold">
 <SelectValue placeholder="اختر الخزينة..."/>
 </SelectTrigger>
 <SelectContent className="rounded-2xl shadow-2xl">
 {treasuries.map((t) => (
 <SelectItem key={t.id} value={t.id}>
 {t.name} — رصيد {formatNumber(t.current_balance)}
 </SelectItem>
 ))}
 </SelectContent>
 </Select>
 </div>
 ) : (
 <p className="py-2 text-xs font-bold text-slate-500">
 هذا النوع لا يحرك النقدية — سيتم تحديث الحالة فقط.
 </p>
 )}

 <DialogFooter className="gap-3">
 <Button variant="ghost"onClick={() => setPayTarget(null)} className="rounded-xl font-bold h-11 px-6">
 تراجع
 </Button>
 <Button
 onClick={handlePay}
 disabled={isPaying || (payTargetMovesCash && !payTreasuryId)}
 className="flex-1 rounded-2xl bg-blue-600 hover:bg-blue-700 text-white font-black h-11"
 >
 {isPaying ?'جاري الصرف...':'تأكيد الصرف'}
 </Button>
 </DialogFooter>
 </DialogContent>
 </Dialog>
 </AppShell>
 );
}

function StatusBadge({ status }: { status: EmployeeAdvanceStatus }) {
 const config: Record<EmployeeAdvanceStatus, { label: string; className: string; icon: React.ReactNode }> = {
 pending: { label:'قيد المراجعة', className:'bg-amber-100 text-amber-700 dark:bg-amber-950/40 dark:text-amber-400', icon: <Clock className="w-3 h-3"/> },
 approved: { label:'معتمدة', className:'bg-blue-100 text-blue-700 dark:bg-blue-950/40 dark:text-blue-400', icon: <CheckCircle2 className="w-3 h-3"/> },
 paid: { label:'مصروفة', className:'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400', icon: <Banknote className="w-3 h-3"/> },
 deducted_from_salary: { label:'مخصومة من الراتب', className:'bg-indigo-100 text-indigo-700 dark:bg-indigo-950/40 dark:text-indigo-400', icon: <Wallet className="w-3 h-3"/> },
 rejected: { label:'مرفوضة', className:'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-400', icon: <XCircle className="w-3 h-3"/> },
 cancelled: { label:'ملغاة', className:'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300', icon: <XCircle className="w-3 h-3"/> },
 };

 const item = config[status];

 return (
 <Badge variant="outline"className={cn('gap-1.5 px-3 py-1 border-transparent shadow-xs font-black rounded-lg', item.className)}>
 {item.icon}
 {item.label}
 </Badge>
 );
}

function StatCard({
 label,
 value,
 icon,
 color,
 description,
}: {
 label: string;
 value: number;
 icon: React.ReactNode;
 color:'emerald'|'amber'|'blue'|'indigo';
 description?: string;
}) {
 const colors = {
 blue:'bg-blue-50 text-blue-600 border-blue-100 dark:bg-blue-900/20 dark:border-blue-900/50',
 emerald:'bg-emerald-50 text-emerald-600 border-emerald-100 dark:bg-emerald-950/20 dark:border-emerald-900/50',
 amber:'bg-amber-50 text-amber-600 border-amber-100 dark:bg-amber-950/20 dark:border-amber-900/50',
 indigo:'bg-indigo-50 text-indigo-600 border-indigo-100 dark:bg-indigo-950/20 dark:border-indigo-900/50',
 };

 return (
 <Card className="hover:border-slate-300 dark:hover:border-slate-700 transition-all group shadow-xs hover:shadow-md border-slate-200 dark:border-slate-800 rounded-2xl bg-surface">
 <CardContent className="p-5">
 <div className="flex items-center justify-between">
 <div className={cn('w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 shadow-inner group-hover:scale-110 transition-transform', colors[color])}>
 {icon}
 </div>
 <div className="text-right">
 <span className="text-3xs font-black text-slate-400 block mb-0.5 uppercase tracking-wider">{label}</span>
 <span className={cn('text-2xl font-black font-mono leading-none', colors[color].split('')[1])}>{formatNumber(value)}</span>
 </div>
 </div>
 {description && (
 <p className="mt-4 text-3xs font-bold text-slate-400 border-t border-slate-50 dark:border-slate-800 pt-3">{description}</p>
 )}
 </CardContent>
 </Card>
 );
}