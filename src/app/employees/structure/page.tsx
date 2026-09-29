'use client';

import React, { useEffect, useState, useMemo } from'react';
import { AppShell } from'@/components/layout/AppShell';
import { Button } from'@/components/ui/button';
import { cn } from'@/lib/utils';
import {
 Building2,
 FolderTree,
 Users,
 Layers,
 Plus,
 Search,
 MoreVertical,
 Edit2,
 Trash2,
 ChevronRight,
 UserCircle2,
 Briefcase,
 LayoutGrid,
 Activity,
 UserCheck,
 CheckCircle,
 AlertCircle
} from'lucide-react';
import { Input } from'@/components/ui/input';
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
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from'@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from'@/components/ui/select';
import { useSessionStore } from'@/core/state/useSessionStore';
import { DepartmentRepository } from'@/modules/employees/department_repository';
import { EmployeeRepository } from'@/modules/employees/employee_repository';
import type { Department, User as Employee } from'@/types';
import { toast } from'sonner';
import { Badge } from'@/components/ui/badge';
import { Separator } from'@/components/ui/separator';

export default function StructurePage() {
 const { currentUser } = useSessionStore();
 const orgId = currentUser?.org_id ||'';

 const [departments, setDepartments] = useState<Department[]>([]);
 const [employees, setEmployees] = useState<Employee[]>([]);
 const [isLoading, setIsLoading] = useState(true);
 const [searchQuery, setSearchQuery] = useState('');

 // Dialog States
 const [isDialogOpen, setIsDialogOpen] = useState(false);
 const [isSubmitting, setIsSubmitting] = useState(false);
 const [editingDept, setEditingDept] = useState<Department | null>(null);

 // Form State
 const [formData, setFormData] = useState({
 name:'',
 code:'',
 manager_id:'',
 parent_id:'',
 description:''
 });

 const loadData = async () => {
 if (!orgId) return;
 setIsLoading(true);
 try {
 const [deptList, empList] = await Promise.all([
 DepartmentRepository.getAll(orgId),
 EmployeeRepository.getEmployeesByOrg(orgId)
 ]);
 setDepartments(deptList);
 setEmployees(empList);
 } catch (err) {
 toast.error('خطأ في تحميل البيانات');
 } finally {
 setIsLoading(false);
 }
 };

 useEffect(() => {
 loadData();
 }, [orgId]);

 const handleOpenAdd = () => {
 setEditingDept(null);
 setFormData({ name:'', code:'', manager_id:'', parent_id:'', description:''});
 setIsDialogOpen(true);
 };

 const handleOpenEdit = (dept: Department) => {
 setEditingDept(dept);
 setFormData({
 name: dept.name,
 code: dept.code ||'',
 manager_id: dept.manager_id ||'',
 parent_id: dept.parent_id ||'',
 description: dept.description ||''
 });
 setIsDialogOpen(true);
 };

 const handleSave = async () => {
 if (!formData.name) {
 toast.error('يرجى إدخال اسم القسم');
 return;
 }
 setIsSubmitting(true);
 try {
 if (editingDept) {
 await DepartmentRepository.updateDepartment(editingDept.id, {
 ...formData,
 manager_id: formData.manager_id || null,
 parent_id: formData.parent_id || null
 });
 toast.success('تم تحديث القسم بنجاح');
 } else {
 await DepartmentRepository.addDepartment({
 org_id: orgId,
 name: formData.name,
 code: formData.code,
 manager_id: formData.manager_id || null,
 parent_id: formData.parent_id || null,
 description: formData.description,
 is_active: true
 });
 toast.success('تمت إضافة القسم بنجاح');
 }
 setIsDialogOpen(false);
 loadData();
 } catch (err) {
 toast.error('حدث خطأ أثناء الحفظ');
 } finally {
 setIsSubmitting(false);
 }
 };

 const handleDelete = async (id: string) => {
 if (!confirm('هل أنت متأكد من حذف هذا القسم؟')) return;
 try {
 await DepartmentRepository.deleteDepartment(id);
 toast.success('تم حذف القسم بنجاح');
 loadData();
 } catch (err) {
 toast.error('خطأ في الحذف');
 }
 };

 const filteredDepts = useMemo(() => {
 const q = searchQuery.toLowerCase().trim();
 return departments.filter(d =>
 d.name.toLowerCase().includes(q) ||
 (d.code ||'').toLowerCase().includes(q)
 );
 }, [departments, searchQuery]);

 const stats = useMemo(() => {
 return {
 deptsCount: departments.length,
 empsCount: employees.filter(e => e.is_active).length
 };
 }, [departments, employees]);

 return (
 <AppShell
 title="الهيكل التنظيمي والأقسام"
 subtitle="بناء وإدارة الهيكل الإداري للمنشأة، توزيع الصلاحيات، وتعيين مديري الأقسام."
 >
 <div className="flex flex-col gap-6"dir="rtl">

 {/* 📋 Header Actions & Search */}
 <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
 <div className="flex flex-wrap items-center gap-3">
 <Button onClick={handleOpenAdd} className="h-11 px-6 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-black text-sm gap-2 shadow-lg shadow-blue-500/20 active:scale-95 transition-all">
 <Plus className="w-5 h-5"/> إضافة قسم جديد
 </Button>
 <Button variant="outline"className="h-11 px-5 border-slate-200 dark:border-slate-800 font-bold text-sm gap-2 rounded-xl bg-surface shadow-xs">
 <FolderTree className="w-5 h-5 text-slate-400"/> عرض شجرة الهيكل
 </Button>
 </div>

 <div className="relative group w-full md:w-80">
 <Search className="absolute right-3.5 top-1/2 -translate-y-1/2 w-4.5 h-4.5 text-slate-400 group-focus-within:text-blue-500 transition-colors"/>
 <Input
 value={searchQuery}
 onChange={e => setSearchQuery(e.target.value)}
 placeholder="ابحث عن قسم..."
 className="h-11 pr-11 bg-surface border-slate-200 dark:border-slate-800 rounded-2xl text-xs font-bold shadow-xs focus:ring-blue-500/20"
 />
 </div>
 </div>

 {/* 🏗️ Main Layout Grid */}
 <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 items-start">

 {/* Summary Sidebar Card */}
 <div className="lg:col-span-1 space-y-4 lg:sticky lg:top-4">
 <Card className="border-slate-200 dark:border-slate-800 shadow-xs overflow-hidden">
 <CardHeader className="p-5 bg-slate-50/50 dark:bg-slate-900/50 border-b border-slate-100 dark:border-slate-800">
 <div className="flex items-center gap-3">
 <div className="w-10 h-10 rounded-xl bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 flex items-center justify-center shadow-inner">
 <Activity className="w-5 h-5"/>
 </div>
 <div>
 <CardTitle className="text-sm font-black">إحصائيات الهيكل</CardTitle>
 <CardDescription className="text-3xs font-bold">ملخص الأقسام والكوادر</CardDescription>
 </div>
 </div>
 </CardHeader>
 <CardContent className="p-5 space-y-4">
 <SummaryBox label="إجمالي الأقسام"value={stats.deptsCount} icon={<Layers className="w-4 h-4"/>} color="blue"/>
 <SummaryBox label="إجمالي الموظفين"value={stats.empsCount} icon={<Users className="w-4 h-4"/>} color="emerald"/>

 <Separator className="opacity-50"/>

 <div className="pt-2">
 <p className="text-3xs font-black text-slate-400 uppercase tracking-widest mb-3 pr-1">أقسام بدون مدير</p>
 <div className="space-y-2">
 {departments.filter(d => !d.manager_id).length === 0 ? (
 <div className="flex items-center gap-2 text-emerald-600 bg-emerald-50 dark:bg-emerald-950/20 px-3 py-2 rounded-lg border border-emerald-100 dark:border-emerald-900/40">
 <CheckCircle className="w-3.5 h-3.5"/>
 <span className="text-3xs font-bold">جميع الأقسام لديها مديرون</span>
 </div>
 ) : (
 departments.filter(d => !d.manager_id).map(d => (
 <div key={d.id} className="flex items-center justify-between text-amber-600 bg-amber-50 dark:bg-amber-950/20 px-3 py-2 rounded-lg border border-amber-100 dark:border-amber-900/40">
 <span className="text-3xs font-bold truncate max-w-[120px]">{d.name}</span>
 <AlertCircle className="w-3.5 h-3.5 shrink-0"/>
 </div>
 ))
 )}
 </div>
 </div>
 </CardContent>
 </Card>
 </div>

 {/* Departments Grid Area */}
 <div className="lg:col-span-3">
 {isLoading ? (
 <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
 {[1,2,3,4].map(i => <div key={i} className="h-32 bg-slate-100 dark:bg-slate-800 animate-pulse rounded-2xl"/>)}
 </div>
 ) : filteredDepts.length === 0 ? (
 <div className="py-24 text-center bg-surface rounded-[2rem] border border-slate-200 dark:border-slate-800 border-dashed">
 <div className="w-20 h-20 bg-slate-50 dark:bg-slate-800 rounded-3xl mx-auto flex items-center justify-center text-slate-200 mb-5">
 <LayoutGrid className="w-10 h-10"/>
 </div>
 <h4 className="text-base font-black text-slate-900 dark:text-white">لا توجد أقسام مسجلة</h4>
 <p className="text-xs text-slate-400 mt-1 max-w-xs mx-auto">قم بإضافة الأقسام الإدارية والتشغيلية لمنشأتك للبدء في تنظيم العمل.</p>
 <Button onClick={handleOpenAdd} variant="link"className="mt-4 text-blue-600 font-black">إضافة أول قسم الآن</Button>
 </div>
 ) : (
 <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
 {filteredDepts.map(dept => {
 const manager = employees.find(e => e.id === dept.manager_id);
 const deptEmpsCount = employees.filter(e => e.permissions?.includes(`dept_${dept.id}`) || false).length; // تبسيط للحساب

 return (
 <DepartmentCard
 key={dept.id}
 dept={dept}
 managerName={manager?.full_name}
 empsCount={employees.filter(e => e.role === dept.name || e.username.includes(dept.name.toLowerCase())).length} // تجريبي للرقم
 onEdit={() => handleOpenEdit(dept)}
 onDelete={() => handleDelete(dept.id)}
 />
 );
 })}
 </div>
 )}
 </div>
 </div>

 {/* 🏗️ Dialog: Department Form */}
 <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
 <DialogContent className="sm:max-w-xl rounded-[2.5rem] p-0 overflow-hidden border-none shadow-2xl"dir="rtl">
 <div className="bg-white dark:bg-slate-950 p-8">
 <DialogHeader className="mb-8">
 <div className="w-14 h-14 rounded-2xl bg-blue-50 dark:bg-blue-900/30 flex items-center justify-center text-blue-600 mb-4 shadow-inner">
 <Plus className="w-7 h-7"/>
 </div>
 <DialogTitle className="text-right font-black text-xl">{editingDept ?'تعديل بيانات القسم':'إضافة قسم جديد للهيكل'}</DialogTitle>
 <DialogDescription className="text-right font-bold text-slate-400 mt-1.5">أدخل بيانات القسم التنظيمية والمدير المسئول.</DialogDescription>
 </DialogHeader>

 <div className="space-y-6 mb-10">
 <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
 <div className="space-y-2.5">
 <label className="text-2xs font-black text-slate-500 pr-1 uppercase tracking-wider">اسم القسم <span className="text-red-500">*</span></label>
 <Input
 value={formData.name}
 onChange={e => setFormData(prev => ({ ...prev, name: e.target.value }))}
 placeholder="مثال: قسم المبيعات"
 className="h-12 rounded-2xl border-slate-200 bg-slate-50/30 font-bold focus:ring-blue-500/20"
 />
 </div>
 <div className="space-y-2.5">
 <label className="text-2xs font-black text-slate-500 pr-1 uppercase tracking-wider">كود القسم (اختياري)</label>
 <Input
 value={formData.code}
 onChange={e => setFormData(prev => ({ ...prev, code: e.target.value }))}
 placeholder="مثال: SALES-01"
 className="h-12 rounded-2xl border-slate-200 bg-slate-50/30 font-mono font-bold"
 />
 </div>
 </div>

 <div className="space-y-2.5">
 <label className="text-2xs font-black text-slate-500 pr-1 uppercase tracking-wider">المدير المسئول</label>
 <Select value={formData.manager_id} onValueChange={v => setFormData(prev => ({ ...prev, manager_id: v }))}>
 <SelectTrigger className="h-13 rounded-2xl border-slate-200 bg-slate-50/30 font-bold">
 <SelectValue placeholder="اختر مدير القسم من الموظفين..."/>
 </SelectTrigger>
 <SelectContent className="rounded-2xl shadow-2xl">
 {employees.map(e => (
 <SelectItem key={e.id} value={e.id} className="py-3 rounded-xl mb-1">
 <div className="flex items-center gap-3">
 <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center text-3xs font-black">{e.full_name.charAt(0)}</div>
 <span className="text-sm font-black">{e.full_name}</span>
 </div>
 </SelectItem>
 ))}
 </SelectContent>
 </Select>
 </div>

 <div className="space-y-2.5">
 <label className="text-2xs font-black text-slate-500 pr-1 uppercase tracking-wider">القسم الرئيسي (يتبع لـ)</label>
 <Select value={formData.parent_id} onValueChange={v => setFormData(prev => ({ ...prev, parent_id: v }))}>
 <SelectTrigger className="h-13 rounded-2xl border-slate-200 bg-slate-50/30 font-bold">
 <SelectValue placeholder="قسم رئيسي (مستوى أعلى)..."/>
 </SelectTrigger>
 <SelectContent className="rounded-2xl">
 <SelectItem value="root"className="font-bold py-3">بدون (قسم رئيسي في الهيكل)</SelectItem>
 {departments.filter(d => d.id !== editingDept?.id).map(d => (
 <SelectItem key={d.id} value={d.id} className="py-3 rounded-xl mb-1">{d.name}</SelectItem>
 ))}
 </SelectContent>
 </Select>
 </div>

 <div className="space-y-2.5">
 <label className="text-2xs font-black text-slate-500 pr-1 uppercase tracking-wider">وصف القسم / المهام</label>
 <Input
 value={formData.description}
 onChange={e => setFormData(prev => ({ ...prev, description: e.target.value }))}
 placeholder="نبذة مختصرة عن مهام هذا القسم..."
 className="h-12 rounded-2xl border-slate-200"
 />
 </div>
 </div>

 <DialogFooter className="gap-3">
 <Button variant="ghost"onClick={() => setIsDialogOpen(false)} className="rounded-xl font-bold h-13 px-8">إلغاء</Button>
 <Button onClick={handleSave} disabled={isSubmitting} className="flex-1 rounded-2xl bg-blue-600 hover:bg-blue-700 text-white font-black h-13 shadow-xl shadow-blue-500/20 text-sm transition-all active:scale-95">
 {isSubmitting ?'جاري الحفظ...': (editingDept ?'تحديث بيانات القسم':'إضافة القسم الآن')}
 </Button>
 </DialogFooter>
 </div>
 </DialogContent>
 </Dialog>

 </div>
 </AppShell>
 );
}

function SummaryBox({ label, value, icon, color }: { label: string, value: number, icon: React.ReactNode, color:'blue'|'emerald'}) {
 const colors = {
 blue:'bg-blue-50 text-blue-600 dark:bg-blue-900/20 dark:text-blue-400 border-blue-100 dark:border-blue-900/50',
 emerald:'bg-emerald-50 text-emerald-600 dark:bg-emerald-950/20 dark:text-emerald-400 border-emerald-100 dark:border-emerald-900/50',
 };

 return (
 <div className={cn("flex items-center justify-between p-4 rounded-2xl border shadow-xs", colors[color])}>
 <div className="flex items-center gap-3">
 <div className="w-8 h-8 rounded-lg bg-white/60 dark:bg-slate-900/60 flex items-center justify-center shadow-xs">{icon}</div>
 <span className="text-xs font-black opacity-80">{label}</span>
 </div>
 <span className="text-lg font-black font-mono">{value}</span>
 </div>
 );
}

function DepartmentCard({ dept, managerName, empsCount, onEdit, onDelete }: { dept: Department, managerName?: string, empsCount: number, onEdit: () => void, onDelete: () => void }) {
 return (
 <Card className="hover:border-blue-200 dark:hover:border-blue-900/50 transition-all group shadow-xs hover:shadow-md border-slate-200 dark:border-slate-800 rounded-[1.5rem] overflow-hidden">
 <CardContent className="p-6">
 <div className="flex items-start justify-between">
 <div className="flex items-center gap-4">
 <div className="w-14 h-14 rounded-2xl bg-slate-50 dark:bg-slate-900 text-slate-400 flex items-center justify-center shadow-inner group-hover:bg-blue-50 group-hover:text-blue-600 transition-colors border border-slate-100 dark:border-slate-800">
 <Building2 className="w-7 h-7"/>
 </div>
 <div className="flex flex-col">
 <h4 className="text-base font-black text-slate-900 dark:text-white group-hover:text-blue-600 transition-colors">{dept.name}</h4>
 <div className="flex items-center gap-2 mt-1.5">
 <Badge variant="outline"className="px-2 py-0 h-5 text-4xs font-black font-mono uppercase bg-slate-50 dark:bg-slate-800 border-slate-200 text-slate-400">{dept.code ||'NO-CODE'}</Badge>
 {dept.parent_id && <Badge variant="secondary"className="px-2 py-0 h-5 text-4xs font-black bg-blue-50 text-blue-500 dark:bg-blue-900/30 border-none">قسم فرعي</Badge>}
 </div>
 </div>
 </div>

 <DropdownMenu>
 <DropdownMenuTrigger asChild>
 <Button variant="ghost"size="icon"className="h-8 w-8 text-slate-300 hover:text-slate-600 rounded-xl transition-colors">
 <MoreVertical className="w-5 h-5"/>
 </Button>
 </DropdownMenuTrigger>
 <DropdownMenuContent align="end"className="w-48 rounded-2xl p-1.5 shadow-xl border-slate-200 dark:border-slate-800">
 <DropdownMenuItem onClick={onEdit} className="gap-2.5 font-bold text-xs py-3 px-3 rounded-xl cursor-pointer">
 <Edit2 className="w-4 h-4 text-blue-500"/> تعديل القسم
 </DropdownMenuItem>
 <DropdownMenuSeparator className="my-1 opacity-50"/>
 <DropdownMenuItem onClick={onDelete} className="gap-2.5 font-bold text-xs py-3 px-3 rounded-xl text-red-600 cursor-pointer hover:bg-red-50 dark:hover:bg-red-950/20">
 <Trash2 className="w-4 h-4"/> حذف القسم نهائياً
 </DropdownMenuItem>
 </DropdownMenuContent>
 </DropdownMenu>
 </div>

 <div className="mt-8 grid grid-cols-2 gap-4">
 <div className="space-y-1.5">
 <span className="text-3xs font-black text-slate-400 uppercase tracking-widest flex items-center gap-1.5">
 <UserCircle2 className="w-3 h-3"/> مدير القسم
 </span>
 <p className="text-xs font-black text-slate-700 dark:text-slate-300 truncate">
 {managerName ||'لم يتم التعيين'}
 </p>
 </div>
 <div className="space-y-1.5 text-left border-r border-slate-100 dark:border-slate-800 pr-4">
 <span className="text-3xs font-black text-slate-400 uppercase tracking-widest flex items-center gap-1.5 justify-end">
 القوى العاملة <Users className="w-3 h-3"/>
 </span>
 <p className="text-sm font-black text-blue-600 font-mono">
 {empsCount} <span className="text-3xs font-sans text-slate-400">موظف</span>
 </p>
 </div>
 </div>

 {dept.description && (
 <div className="mt-5 pt-4 border-t border-slate-50 dark:border-slate-800">
 <p className="text-3xs font-bold text-slate-400 line-clamp-1 italic">{dept.description}</p>
 </div>
 )}
 </CardContent>
 </Card>
 );
}