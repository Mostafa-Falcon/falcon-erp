'use client';

import React, { useEffect, useState, useMemo } from'react';
import { AppShell } from'@/components/layout/AppShell';
import { Button } from'@/components/ui/button';
import {
 Card,
 CardContent,
 CardHeader,
 CardTitle,
 CardDescription,
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
 Banknote,
 FileSpreadsheet,
 Receipt,
 Wallet,
 Search,
 FilterX,
 Plus,
 CheckCircle2,
 Clock,
 MoreVertical,
 Download,
 Trash2,
 AlertCircle,
 Edit2,
 RefreshCw,
 Printer,
 FileText,
 LayoutGrid,
 CalendarDays,
 Coins
} from'lucide-react';
import { Input } from'@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from'@/components/ui/select';
import { useSessionStore } from'@/core/state/useSessionStore';
import { SalaryRepository } from'@/modules/employees/salary_repository';
import { EmployeeRepository } from'@/modules/employees/employee_repository';
import type { EmployeeSalaryStatement, User, Treasury } from'@/types';
import { formatNumber } from'@/lib/format';
import { toast } from'sonner';
import { cn } from'@/lib/utils';
import { Badge } from'@/components/ui/badge';
import { Separator } from'@/components/ui/separator';

import {
 Dialog,
 DialogContent,
 DialogHeader,
 DialogTitle,
 DialogFooter
} from'@/components/ui/dialog';
import {
 DropdownMenu,
 DropdownMenuContent,
 DropdownMenuItem,
 DropdownMenuTrigger,
 DropdownMenuSeparator,
 DropdownMenuLabel
} from'@/components/ui/dropdown-menu';
import { TreasuryRepository } from'@/modules/treasury/treasury_repository';

export default function PayrollPage() {
 const { currentUser } = useSessionStore();
 const orgId = currentUser?.org_id ||'';

 const [selectedMonth, setSelectedMonth] = useState(new Date().toISOString().slice(0, 7)); // YYYY-MM
 const [statements, setStatements] = useState<EmployeeSalaryStatement[]>([]);
 const [employees, setEmployees] = useState<User[]>([]);
 const [treasuries, setTreasuries] = useState<Treasury[]>([]);
 const [isLoading, setIsLoading] = useState(true);
 const [isGenerating, setIsGenerating] = useState(false);
 const [isProcessing, setIsProcessing] = useState(false);
 const [searchQuery, setSearchQuery] = useState('');

 // Edit Modal State
 const [editDialogOpen, setEditDialogOpen] = useState(false);
 const [selectedStmt, setSelectedStmt] = useState<EmployeeSalaryStatement | null>(null);
 const [editForm, setEditValues] = useState({
 bonus: 0,
 overtime: 0,
 loan_deduction: 0,
 notes:''
 });

 // Pay Modal State
 const [payDialogOpen, setPayDialogOpen] = useState(false);
 const [targetTreasuryId, setTargetTreasuryId] = useState('');

 const loadData = async () => {
 if (!orgId) return;
 setIsLoading(true);
 try {
 const [stmtList, empList, trList] = await Promise.all([
 SalaryRepository.getByMonth(orgId, selectedMonth),
 EmployeeRepository.getEmployeesByOrg(orgId),
 TreasuryRepository.getTreasuries(orgId)
 ]);
 setStatements(stmtList);
 setEmployees(empList);
 setTreasuries(trList);
 if (trList.length > 0) setTargetTreasuryId(trList.find(t => t.is_default)?.id || trList[0].id);
 } catch (err) {
 console.error(err);
 toast.error('خطأ في تحميل الرواتب');
 } finally {
 setIsLoading(false);
 }
 };

 useEffect(() => {
 loadData();
 }, [orgId, selectedMonth]);

 const stats = useMemo(() => {
 const total = statements.reduce((acc, s) => acc + s.net_salary, 0);
 const paid = statements.filter(s => s.status ==='paid').reduce((acc, s) => acc + s.net_salary, 0);
 const pending = total - paid;
 return { total, paid, pending, count: statements.length };
 }, [statements]);

 const handleGenerate = async () => {
 setIsGenerating(true);
 try {
 await SalaryRepository.generateDrafts(orgId, selectedMonth);
 toast.success('تم إنشاء مسيرات الرواتب بنجاح');
 loadData();
 } catch (err) {
 toast.error('خطأ أثناء إنشاء الرواتب');
 } finally {
 setIsGenerating(false);
 }
 };

 const handleOpenEdit = (stmt: EmployeeSalaryStatement) => {
 setSelectedStmt(stmt);
 setEditValues({
 bonus: stmt.bonus || 0,
 overtime: stmt.overtime || 0,
 loan_deduction: stmt.loan_deduction || 0,
 notes: stmt.notes ||''
 });
 setEditDialogOpen(true);
 };

 const handleSaveEdit = async () => {
 if (!selectedStmt) return;
 setIsProcessing(true);
 try {
 await SalaryRepository.updateStatement(selectedStmt.id, editForm);
 toast.success('تم تحديث بيانات الراتب');
 setEditDialogOpen(false);
 loadData();
 } catch (err) {
 toast.error('خطأ في التحديث');
 } finally {
 setIsProcessing(false);
 }
 };

 const handleMarkPaid = async () => {
 if (!selectedStmt || !targetTreasuryId) {
 toast.error('يرجى اختيار الخزينة');
 return;
 }
 setIsProcessing(true);
 try {
 await SalaryRepository.markPaid(selectedStmt.id, targetTreasuryId);
 toast.success('تم تأكيد عملية الصرف');
 setPayDialogOpen(false);
 loadData();
 } catch (err: any) {
 toast.error(err.message ||'خطأ أثناء الصرف');
 } finally {
 setIsProcessing(false);
 }
 };

 const handleDelete = async (id: string) => {
 if (!confirm('هل أنت متأكد من حذف مسير الراتب لهذا الموظف؟')) return;
 try {
 await SalaryRepository.deleteStatement(id);
 toast.success('تم الحذف بنجاح');
 loadData();
 } catch {
 toast.error('خطأ في الحذف');
 }
 };

 const filteredStatements = useMemo(() => {
 const q = searchQuery.toLowerCase().trim();
 return statements.filter(s => {
 const emp = employees.find(e => e.id === s.employee_id);
 return !q || emp?.full_name.toLowerCase().includes(q);
 });
 }, [statements, employees, searchQuery]);

 return (
 <AppShell
 title="مسير الرواتب ومستحقات الكوادر"
 subtitle="احتساب وصرف الرواتب الشهرية واليومية، البدلات، الخصومات، والربط المباشر مع الحسابات العامة."
 >
 <div className="flex flex-col gap-6"dir="rtl">

 {/* 📊 KPI Grid: Professional Unified Height */}
 <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
 <StatCard
 label="إجمالي مستحقات الشهر"
 value={stats.total}
 icon={<Banknote className="w-5 h-5 text-blue-600"/>}
 color="blue"
 subLabel="مجموع الرواتب الصافية"
 />
 <StatCard
 label="إجمالي المبالغ المصروفة"
 value={stats.paid}
 icon={<CheckCircle2 className="w-5 h-5 text-emerald-600"/>}
 color="emerald"
 subLabel="تم تسليمها للموظفين"
 />
 <StatCard
 label="المتبقي بانتظار الصرف"
 value={stats.pending}
 icon={<Clock className="w-5 h-5 text-amber-600"/>}
 color="amber"
 subLabel="مستحقات لم تصرف بعد"
 />
 <StatCard
 label="إجمالي القوى العاملة"
 value={stats.count}
 icon={<Receipt className="w-5 h-5 text-indigo-600"/>}
 color="indigo"
 isNumber
 subLabel="موظف مسجل في المسير"
 />
 </div>

 {/* 🛠️ Modern Toolbar & Table Area */}
 <Card className="rounded-2xl border-slate-200 dark:border-slate-800 shadow-xs">
 <CardHeader className="p-5 border-b border-slate-100 dark:border-slate-800 flex flex-col xl:flex-row xl:items-center justify-between gap-5 bg-surface">
 <div className="flex flex-col md:flex-row items-stretch md:items-center gap-4 flex-1 max-w-4xl">

 <div className="relative group flex-1 min-w-[280px]">
 <Search className="absolute right-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 group-focus-within:text-blue-500 transition-colors"/>
 <Input
 value={searchQuery}
 onChange={e => setSearchQuery(e.target.value)}
 placeholder="ابحث عن اسم الموظف..."
 className="h-11 pr-10 bg-slate-50/50 dark:bg-slate-950/50 border-slate-200 dark:border-slate-800 rounded-xl text-xs font-bold focus:bg-white dark:focus:bg-slate-900 transition-all"
 />
 </div>

 <div className="flex items-center gap-3">
 <div className="relative">
 <CalendarDays className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none"/>
 <Input
 type="month"
 value={selectedMonth}
 onChange={e => setSelectedMonth(e.target.value)}
 className="h-11 pr-10 w-44 rounded-xl font-black text-xs bg-slate-50/50 dark:bg-slate-950/50 border-slate-200 dark:border-slate-800 shadow-xs cursor-pointer"
 />
 </div>

 <Button
 variant="ghost"
 onClick={() => setSearchQuery('')}
 className="h-11 px-4 text-red-500 hover:text-red-600 font-bold text-xs gap-2 rounded-xl hover:bg-red-50 dark:hover:bg-red-950/20"
 >
 <FilterX className="w-4 h-4"/> <span className="hidden md:inline">مسح الفلاتر</span>
 </Button>
 </div>
 </div>

 <div className="flex items-center gap-2.5">
 <Button variant="outline"className="h-11 px-5 border-slate-200 dark:border-slate-800 font-bold text-xs gap-2 rounded-xl bg-surface hover:bg-slate-50 dark:hover:bg-slate-800 transition-all shadow-xs">
 <Download className="w-4 h-4 text-emerald-600"/> <span className="hidden sm:inline">تصدير الكشف</span>
 </Button>

 <Button
 onClick={handleGenerate}
 disabled={isGenerating}
 className="h-11 px-6 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-black text-xs gap-2 shadow-lg shadow-blue-500/20 active:scale-95 transition-all"
 >
 {isGenerating ? <RefreshCw className="w-4 h-4 animate-spin"/> : <Plus className="w-4 h-4"/>}
 {isGenerating ?'جاري الاحتساب...':'توليد مسير الشهر الجديد'}
 </Button>
 </div>
 </CardHeader>

 <CardContent className="p-0">
 <div className="overflow-x-auto">
 <Table>
 <TableHeader>
 <TableRow className="bg-slate-50/50 dark:bg-slate-900/50 border-b border-slate-100 dark:border-slate-800">
 <TableHead className="py-4 px-6 text-right text-2xs font-black text-slate-500 uppercase tracking-widest h-14">الموظف والكادر</TableHead>
 <TableHead className="py-4 px-6 text-center text-2xs font-black text-slate-500 uppercase tracking-widest h-14">الراتب الأساسي</TableHead>
 <TableHead className="py-4 px-6 text-center text-2xs font-black text-slate-500 uppercase tracking-widest h-14">بدلات وحوافز (+)</TableHead>
 <TableHead className="py-4 px-6 text-center text-2xs font-black text-slate-500 uppercase tracking-widest h-14">خصومات وسلف (-)</TableHead>
 <TableHead className="py-4 px-6 text-center text-2xs font-black text-slate-500 uppercase tracking-widest h-14">صافي المستحق</TableHead>
 <TableHead className="py-4 px-6 text-center text-2xs font-black text-slate-500 uppercase tracking-widest h-14">حالة الصرف</TableHead>
 <TableHead className="py-4 px-6 text-center text-2xs font-black text-slate-500 uppercase tracking-widest h-14">إجراءات</TableHead>
 </TableRow>
 </TableHeader>
 <TableBody>
 {isLoading ? (
 <TableRow>
 <TableCell colSpan={7} className="py-24 text-center">
 <div className="flex flex-col items-center gap-4">
 <div className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"/>
 <span className="text-sm font-bold text-slate-500">جاري تحميل مسيرات الرواتب...</span>
 </div>
 </TableCell>
 </TableRow>
 ) : filteredStatements.length === 0 ? (
 <TableRow>
 <TableCell colSpan={7} className="py-32 text-center">
 <div className="flex flex-col items-center gap-5">
 <div className="w-20 h-20 bg-slate-50 dark:bg-slate-900 rounded-3xl flex items-center justify-center text-slate-200 border border-slate-100 dark:border-slate-800">
 <Coins className="w-10 h-10"/>
 </div>
 <div className="space-y-1.5">
 <h4 className="text-base font-black text-slate-900 dark:text-white">لا توجد مسيرات مسجلة</h4>
 <p className="text-xs text-slate-400 max-w-sm mx-auto">لم يتم العثور على سجلات مطابقة لهذا الشهر. يمكنك البدء بتوليد المسير الآن.</p>
 </div>
 <Button onClick={handleGenerate} className="rounded-xl font-black px-10 h-11 bg-blue-600">توليد المسير الآن</Button>
 </div>
 </TableCell>
 </TableRow>
 ) : (
 filteredStatements.map(s => {
 const emp = employees.find(e => e.id === s.employee_id);
 const totalAdditions = (s.allowances || 0) + (s.bonus || 0) + (s.overtime || 0);
 const totalDeductions = (s.deductions || 0) + (s.loan_deduction || 0);

 return (
 <TableRow key={s.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30 transition-colors group border-b border-slate-100 dark:border-slate-800/50">
 <TableCell className="py-4 px-6">
 <div className="flex items-center gap-4">
 <div className="w-11 h-11 rounded-2xl bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 flex items-center justify-center text-sm font-black shadow-xs shrink-0 border border-blue-100/50 dark:border-blue-900/50">
 {emp?.full_name.charAt(0)}
 </div>
 <div className="flex flex-col min-w-0">
 <span className="text-sm font-black text-slate-900 dark:text-white truncate group-hover:text-blue-600 transition-colors">{emp?.full_name}</span>
 <span className="text-3xs font-bold text-slate-400 uppercase tracking-tighter truncate mt-0.5">{emp?.role}</span>
 </div>
 </div>
 </TableCell>
 <TableCell className="py-4 px-6 text-center font-mono font-bold text-slate-500 dark:text-slate-400">{formatNumber(s.basic_salary)}</TableCell>
 <TableCell className="py-4 px-6 text-center">
 <div className="flex flex-col items-center">
 <span className="font-mono font-black text-emerald-600">+{formatNumber(totalAdditions)}</span>
 {(s.bonus! > 0 || s.overtime! > 0) && (
 <span className="text-4xs text-slate-400 font-bold bg-emerald-50 dark:bg-emerald-950 px-1.5 py-0.5 rounded mt-1">حوافز: {s.bonus} | إضافي: {s.overtime}</span>
 )}
 </div>
 </TableCell>
 <TableCell className="py-4 px-6 text-center">
 <div className="flex flex-col items-center">
 <span className="font-mono font-black text-red-600">-{formatNumber(totalDeductions)}</span>
 {(s.loan_deduction! > 0) && (
 <span className="text-4xs text-slate-400 font-bold bg-red-50 dark:bg-red-950 px-1.5 py-0.5 rounded mt-1">سلف: {s.loan_deduction}</span>
 )}
 </div>
 </TableCell>
 <TableCell className="py-4 px-6 text-center">
 <Badge variant="outline"className="text-sm font-black text-blue-700 dark:text-blue-300 font-mono bg-blue-50/50 dark:bg-blue-900/30 border-blue-200 dark:border-blue-800 px-4 py-1.5 rounded-xl shadow-xs">
 {formatNumber(s.net_salary)}
 </Badge>
 </TableCell>
 <TableCell className="py-4 px-6 text-center">
 <StatusBadge status={s.status} />
 </TableCell>
 <TableCell className="py-4 px-6 text-center">
 <DropdownMenu>
 <DropdownMenuTrigger asChild>
 <Button variant="ghost"size="icon"className="h-9 w-9 text-slate-400 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-xl transition-all shadow-xs border border-transparent hover:border-blue-100 dark:hover:border-blue-900/50">
 <MoreVertical className="w-5 h-5"/>
 </Button>
 </DropdownMenuTrigger>
 <DropdownMenuContent align="end"className="w-56 rounded-2xl p-2 shadow-xl border-slate-200 dark:border-slate-800">
 <DropdownMenuLabel className="text-3xs font-black text-slate-400 uppercase px-2.5 py-2">إدارة سجل الموظف</DropdownMenuLabel>

 {s.status ==='draft'&& (
 <>
 <DropdownMenuItem onClick={() => handleOpenEdit(s)} className="gap-3 font-bold text-xs py-3.5 px-3 rounded-xl cursor-pointer">
 <Edit2 className="w-4 h-4 text-blue-500"/> تعديل المستحقات والبدلات
 </DropdownMenuItem>
 <DropdownMenuItem onClick={() => { setSelectedStmt(s); setPayDialogOpen(true); }} className="gap-3 font-bold text-xs py-3.5 px-3 rounded-xl text-emerald-600 cursor-pointer hover:bg-emerald-50 dark:hover:bg-emerald-950/20">
 <CheckCircle2 className="w-4 h-4"/> اعتماد وصرف الراتب
 </DropdownMenuItem>
 </>
 )}

 {s.status ==='paid'&& (
 <DropdownMenuItem className="gap-3 font-bold text-xs py-3.5 px-3 rounded-xl cursor-pointer">
 <Receipt className="w-4 h-4 text-slate-500"/> عرض إيصال الصرف المالي
 </DropdownMenuItem>
 )}

 <DropdownMenuSeparator className="my-2 opacity-50"/>
 <DropdownMenuItem onClick={() => handleDelete(s.id)} className="gap-3 font-bold text-xs py-3.5 px-3 rounded-xl text-red-600 cursor-pointer hover:bg-red-50 dark:hover:bg-red-950/20">
 <Trash2 className="w-4 h-4"/> حذف من هذا المسير
 </DropdownMenuItem>
 </DropdownMenuContent>
 </DropdownMenu>
 </TableCell>
 </TableRow>
 );
 })
 )}
 </TableBody>
 </Table>
 </div>
 </CardContent>

 {/* 📊 Modern Footer Info Bar */}
 <div className="p-5 bg-slate-50/50 dark:bg-slate-900/50 border-t border-slate-100 dark:border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-5">
 <div className="flex flex-wrap items-center justify-center gap-6 text-xs font-bold text-slate-500">
 <div className="flex items-center gap-2">
 <div className="w-2 h-2 rounded-full bg-blue-500"/>
 إجمالي المستحقات: <span className="font-black text-slate-900 dark:text-white">{formatNumber(stats.total)} ج.م</span>
 </div>
 <Separator orientation="vertical"className="h-4 hidden sm:block opacity-50"/>
 <div className="flex items-center gap-2">
 <div className="w-2 h-2 rounded-full bg-emerald-500"/>
 تم صرفه: <span className="font-black text-emerald-600">{formatNumber(stats.paid)} ج.م</span>
 </div>
 <Separator orientation="vertical"className="h-4 hidden sm:block opacity-50"/>
 <div className="flex items-center gap-2">
 <div className="w-2 h-2 rounded-full bg-amber-500"/>
 المتبقي: <span className="font-black text-amber-600">{formatNumber(stats.pending)} ج.م</span>
 </div>
 </div>

 <div className="flex items-center gap-3">
 <span className="text-3xs font-black text-slate-400 uppercase tracking-[0.2em] opacity-60">Engine: Falcon v1.0</span>
 <div className="flex items-center gap-1.5">
 <Button variant="outline"size="sm"className="h-8 w-8 p-0 rounded-lg font-black border-slate-200 dark:border-slate-800 bg-surface shadow-xs">1</Button>
 </div>
 </div>
 </div>
 </Card>

 {/* 📋 Dialogs: More Organized Layout */}
 <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
 <DialogContent className="sm:max-w-lg rounded-[2rem] p-0 overflow-hidden border-none shadow-2xl"dir="rtl">
 <div className="bg-white dark:bg-slate-950 p-8">
 <DialogHeader className="mb-8">
 <div className="w-14 h-14 rounded-2xl bg-blue-50 dark:bg-blue-900/30 flex items-center justify-center text-blue-600 mb-4 shadow-inner">
 <Edit2 className="w-7 h-7"/>
 </div>
 <DialogTitle className="text-right font-black text-xl">تعديل تسوية الراتب</DialogTitle>
 <p className="text-sm font-bold text-slate-400 text-right mt-1.5">{employees.find(e => e.id === selectedStmt?.employee_id)?.full_name}</p>
 </DialogHeader>

 <div className="grid grid-cols-2 gap-5 mb-8">
 <div className="space-y-2.5">
 <label className="text-2xs font-black text-emerald-600 pr-1 uppercase tracking-wider">مكافآت وحوافز (+)</label>
 <Input
 type="number"
 value={editForm.bonus}
 onChange={e => setEditValues(prev => ({ ...prev, bonus: Number(e.target.value) }))}
 className="h-12 rounded-2xl font-mono font-black border-slate-200 bg-slate-50/30 text-emerald-600 text-lg text-center"
 />
 </div>
 <div className="space-y-2.5">
 <label className="text-2xs font-black text-blue-600 pr-1 uppercase tracking-wider">ساعات إضافية (+)</label>
 <Input
 type="number"
 value={editForm.overtime}
 onChange={e => setEditValues(prev => ({ ...prev, overtime: Number(e.target.value) }))}
 className="h-12 rounded-2xl font-mono font-black border-slate-200 bg-slate-50/30 text-blue-600 text-lg text-center"
 />
 </div>
 <div className="space-y-2.5">
 <label className="text-2xs font-black text-red-600 pr-1 uppercase tracking-wider">خصم سلف / عهدة (-)</label>
 <Input
 type="number"
 value={editForm.loan_deduction}
 onChange={e => setEditValues(prev => ({ ...prev, loan_deduction: Number(e.target.value) }))}
 className="h-12 rounded-2xl font-mono font-black border-slate-200 bg-slate-50/30 text-red-600 text-lg text-center"
 />
 </div>
 <div className="bg-slate-900 dark:bg-blue-900/20 rounded-2xl p-4 flex flex-col justify-center border border-slate-800 dark:border-blue-800/30">
 <span className="text-3xs font-black text-slate-400 block mb-1">الصافي الجديد</span>
 <span className="text-xl font-black text-white font-mono leading-none">
 {formatNumber((selectedStmt?.basic_salary || 0) + (selectedStmt?.allowances || 0) + editForm.bonus + editForm.overtime - (selectedStmt?.deductions || 0) - editForm.loan_deduction)}
 </span>
 </div>
 <div className="col-span-2 space-y-2.5 pt-2">
 <label className="text-2xs font-black text-slate-500 pr-1 uppercase tracking-wider">ملاحظات التعديل</label>
 <Input
 value={editForm.notes}
 onChange={e => setEditValues(prev => ({ ...prev, notes: e.target.value }))}
 placeholder="أدخل سبب التعديل هنا لغايات التدقيق..."
 className="h-12 rounded-2xl border-slate-200 shadow-sm"
 />
 </div>
 </div>

 <DialogFooter className="gap-3 sm:justify-start">
 <Button variant="ghost"onClick={() => setEditDialogOpen(false)} className="rounded-xl font-bold h-12 px-8">إلغاء</Button>
 <Button onClick={handleSaveEdit} disabled={isProcessing} className="flex-1 rounded-2xl bg-blue-600 hover:bg-blue-700 font-black h-12 shadow-lg shadow-blue-500/20 text-sm">
 {isProcessing ?'جاري الحفظ...':'حفظ وإعادة احتساب الراتب'}
 </Button>
 </DialogFooter>
 </div>
 </DialogContent>
 </Dialog>

 <Dialog open={payDialogOpen} onOpenChange={setPayDialogOpen}>
 <DialogContent className="sm:max-w-md rounded-[2.5rem] p-0 overflow-hidden border-none shadow-2xl"dir="rtl">
 <div className="bg-white dark:bg-slate-950 p-8">
 <DialogHeader className="mb-8">
 <DialogTitle className="text-right font-black text-xl">صرف المستحقات المالية</DialogTitle>
 <p className="text-xs font-bold text-slate-400 text-right mt-1">تأكيد عملية دفع الراتب وتسجيلها في السجلات المالية</p>
 </DialogHeader>

 <div className="space-y-6">
 <div className="p-6 bg-gradient-to-br from-emerald-600 to-teal-700 rounded-[2rem] flex items-center justify-between shadow-xl shadow-emerald-500/10 relative overflow-hidden">
 <div className="absolute top-0 right-0 w-32 h-32 bg-white/5 rounded-full -mr-16 -mt-16"/>
 <div className="relative z-10">
 <span className="text-3xs font-black text-white/60 uppercase block mb-1 tracking-widest">المبلغ الصافي</span>
 <span className="text-3xl font-black text-white font-mono">{formatNumber(selectedStmt?.net_salary || 0)} <span className="text-sm font-sans">ج.م</span></span>
 </div>
 <div className="w-14 h-14 rounded-2xl bg-white/10 backdrop-blur-md flex items-center justify-center text-white relative z-10 shadow-lg border border-white/10">
 <Banknote className="w-8 h-8"/>
 </div>
 </div>

 <div className="space-y-2.5">
 <label className="text-2xs font-black text-slate-500 pr-1 uppercase tracking-wider">اختر مصدر الصرف (الخزينة / البنك)</label>
 <Select value={targetTreasuryId} onValueChange={setTargetTreasuryId}>
 <SelectTrigger className="h-14 rounded-2xl font-bold bg-slate-50/50 dark:bg-slate-900 border-slate-200 dark:border-slate-800 shadow-xs focus:ring-emerald-500/20">
 <SelectValue placeholder="اختر الخزينة..."/>
 </SelectTrigger>
 <SelectContent className="rounded-2xl p-1 shadow-2xl border-slate-200">
 {treasuries.map(t => (
 <SelectItem key={t.id} value={t.id} className="font-bold py-3 px-3 rounded-xl mb-1 last:mb-0">
 <div className="flex items-center justify-between w-full min-w-[300px] gap-6">
 <div className="flex flex-col">
 <span className="text-sm">{t.name}</span>
 <span className="text-4xs text-slate-400 font-black uppercase">{t.type ==='safe'?'خزينة نقدية':'حساب بنكي'}</span>
 </div>
 <Badge variant="secondary"className="bg-white dark:bg-slate-800 font-mono text-2xs font-black px-3 py-1 rounded-lg border-slate-100 shadow-xs">{formatNumber(t.current_balance)} ج.م</Badge>
 </div>
 </SelectItem>
 ))}
 </SelectContent>
 </Select>
 </div>

 <div className="p-5 bg-amber-50 dark:bg-amber-950/20 border border-amber-100 dark:border-amber-900/50 rounded-2xl flex gap-4">
 <div className="w-10 h-10 rounded-full bg-amber-100 dark:bg-amber-900/40 flex items-center justify-center shrink-0">
 <AlertCircle className="w-5 h-5 text-amber-600"/>
 </div>
 <p className="text-2xs font-bold text-amber-800 dark:text-amber-500 leading-relaxed pt-1">عند الضغط على تأكيد، سيتم خصم المبلغ من الخزينة المختارة وتسجيل العملية كقيد مصروفات رواتب آلياً.</p>
 </div>
 </div>

 <DialogFooter className="gap-3 mt-8">
 <Button variant="ghost"onClick={() => setPayDialogOpen(false)} className="rounded-2xl font-bold h-14 px-8">تراجع</Button>
 <Button onClick={handleMarkPaid} disabled={isProcessing} className="flex-1 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white font-black h-14 shadow-xl shadow-emerald-500/20 text-base transition-all active:scale-95">
 {isProcessing ?'جاري التنفيذ...':'تأكيد عملية الصرف الآن'}
 </Button>
 </DialogFooter>
 </div>
 </DialogContent>
 </Dialog>

 </div>
 </AppShell>
 );
}

function StatCard({
 label,
 value,
 icon,
 color,
 isNumber = false,
 subLabel
}: {
 label: string,
 value: string | number,
 icon: React.ReactNode,
 color:'emerald'|'amber'|'red'|'blue'|'indigo',
 isNumber?: boolean,
 subLabel?: string
}) {
 const colors = {
 blue:'bg-blue-50 text-blue-600 border-blue-100 dark:bg-blue-900/20 dark:border-blue-900/50',
 emerald:'bg-emerald-50 text-emerald-600 border-emerald-100 dark:bg-emerald-950/20 dark:border-emerald-900/50',
 amber:'bg-amber-50 text-amber-600 border-amber-100 dark:bg-amber-950/20 dark:border-amber-900/50',
 red:'bg-red-50 text-red-600 border-red-100 dark:bg-red-950/20 dark:border-red-900/50',
 indigo:'bg-indigo-50 text-indigo-600 border-indigo-100 dark:bg-indigo-950/20 dark:border-indigo-900/50'
 };

 return (
 <Card className="hover:border-blue-200 dark:hover:border-blue-900/50 transition-all group shadow-xs hover:shadow-md border-slate-200 dark:border-slate-800 rounded-[1.25rem]">
 <CardContent className="p-5">
 <div className="flex items-center gap-4">
 <div className={`w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 shadow-inner group-hover:scale-110 transition-transform ${colors[color]}`}>
 {icon}
 </div>
 <div className="flex flex-col min-w-0">
 <span className="text-3xs font-black text-slate-400 uppercase tracking-wider truncate mb-1">{label}</span>
 <div className="flex items-baseline gap-1.5 overflow-hidden">
 <span className={cn("text-2xl font-black font-mono leading-none truncate", colors[color].split('')[1])}>
 {isNumber ? value : formatNumber(value as number)}
 </span>
 {!isNumber && <span className="text-3xs font-bold text-slate-400">ج.م</span>}
 </div>
 </div>
 </div>
 {subLabel && (
 <div className="mt-4 pt-3 border-t border-slate-50 dark:border-slate-800 flex items-center gap-2 text-3xs font-bold text-slate-400/80">
 <div className="w-1 h-1 rounded-full bg-slate-300"/>
 {subLabel}
 </div>
 )}
 </CardContent>
 </Card>
 );
}

function StatusBadge({ status }: { status: EmployeeSalaryStatement['status'] }) {
 const config = {
 paid: { label:'تم الصرف', class:'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400', icon: <CheckCircle2 className="w-3 h-3"/> },
 approved: { label:'معتمد', class:'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-400', icon: <CheckCircle2 className="w-3 h-3"/> },
 cancelled: { label:'ملغي', class:'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-400', icon: <XCircle className="w-3 h-3"/> },
 draft: { label:'مسودة', class:'bg-slate-100 text-slate-600 dark:bg-slate-800', icon: <Clock className="w-3 h-3"/> },
 };

 const item = config[status] || config.draft;

 return (
 <Badge variant="outline"className={cn("gap-1.5 px-3 py-1 border-transparent shadow-xs font-black rounded-lg", item.class)}>
 {item.icon}
 {item.label}
 </Badge>
 );
}

function XCircle({ className }: { className?: string }) {
 return (
 <svg className={className} width="15"height="15"viewBox="0 0 24 24"fill="none"stroke="currentColor"strokeWidth="2.5">
 <circle cx="12"cy="12"r="10"/>
 <line x1="15"y1="9"x2="9"y2="15"/>
 <line x1="9"y1="9"x2="15"y2="15"/>
 </svg>
 );
}