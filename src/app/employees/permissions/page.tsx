'use client';

import React, { useEffect, useState, useMemo } from'react';
import { AppShell } from'@/components/layout/AppShell';
import { Button } from'@/components/ui/button';
import { cn } from'@/lib/utils';
import {
 ShieldCheck,
 Lock,
 Key,
 Search,
 ChevronRight,
 CheckCircle2,
 Save,
 UserCog,
 User,
 Activity,
 Archive,
 ShoppingBag,
 ShoppingBasket,
 Wallet,
 MoreVertical,
 Undo2,
 Trash2,
 Zap,
 Info,
 RefreshCw
} from'lucide-react';
import { Input } from'@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from'@/components/ui/card';
import { Badge } from'@/components/ui/badge';
import { Switch } from'@/components/ui/switch';
import { useSessionStore } from'@/core/state/useSessionStore';
import { EmployeeRepository } from'@/modules/employees/employee_repository';
import type { User as Employee, UserRole } from'@/types';
import { toast } from'sonner';
import { Tabs, TabsContent, TabsList, TabsTrigger } from'@/components/ui/tabs';
import { Separator } from'@/components/ui/separator';
import { ScrollArea } from'@/components/ui/scroll-area';

// Define the system's permission matrix structure
const PERMISSION_GROUPS = [
 {
 id:'dashboard',
 label:'لوحة المتابعة والتحليلات',
 icon: <Activity className="w-4 h-4"/>,
 color:'blue',
 permissions: [
 { id:'dashboard_view', label:'عرض الإحصائيات العامة', desc:'مشاهدة الأرباح، الرسوم البيانية، ومؤشرات الأداء.'},
 { id:'reports_view', label:'عرض التقارير المتقدمة', desc:'الاطلاع على تقارير المبيعات والمخزون التفصيلية.'}
 ]
 },
 {
 id:'inventory',
 label:'المخزون والأصناف',
 icon: <Archive className="w-4 h-4"/>,
 color:'emerald',
 permissions: [
 { id:'inventory_view', label:'عرض الأصناف والكميات', desc:'تصفح قائمة الأصناف والمنتجات المتاحة.'},
 { id:'inventory_add', label:'إضافة أصناف جديدة', desc:'تسجيل صنف جديد في النظام.'},
 { id:'inventory_edit', label:'تعديل بيانات الأصناف', desc:'تعديل الأسعار، الباركود، والحدود الدنيا.'},
 { id:'inventory_transfer', label:'التحويل المخزني', desc:'نقل الأصناف بين الفروع والمستودعات.'},
 { id:'inventory_adjust', label:'الجرد والتسويات', desc:'إجراء جرد فعلي وتعديل فروقات المخزون.'},
 { id:'inventory_delete', label:'حذف أصناف (خطر)', desc:'إمكانية إزالة صنف من النظام نهائياً.'}
 ]
 },
 {
 id:'sales',
 label:'المبيعات ونقاط البيع',
 icon: <ShoppingBag className="w-4 h-4"/>,
 color:'teal',
 permissions: [
 { id:'sales_pos', label:'استخدام نقطة البيع (POS)', desc:'فتح شاشة الكاشير وبيع الأصناف المباشر.'},
 { id:'sales_view', label:'عرض فواتير البيع', desc:'تصفح سجل الفواتير الصادرة مسبقاً.'},
 { id:'sales_return', label:'عمل مرتجعات بيع', desc:'إمكانية إرجاع فواتير أو أصناف مباعة.'},
 { id:'sales_discount', label:'منح خصومات إضافية', desc:'تجاوز السعر المحدد ومنح خصم يدوي.'}
 ]
 },
 {
 id:'purchases',
 label:'المشتريات والموردين',
 icon: <ShoppingBasket className="w-4 h-4"/>,
 color:'amber',
 permissions: [
 { id:'purchases_view', label:'عرض فواتير الشراء', desc:'مشاهدة سجل التوريدات والمشتريات.'},
 { id:'purchases_add', label:'إدخال مشتريات جديدة', desc:'تسجيل فواتير شراء وزيادة رصيد الأصناف.'},
 { id:'purchases_return', label:'مرتجع مشتريات', desc:'إرجاع بضاعة تالفة أو راكدة للمورد.'}
 ]
 },
 {
 id:'finance',
 label:'الحسابات والمالية',
 icon: <Wallet className="w-4 h-4"/>,
 color:'red',
 permissions: [
 { id:'finance_view', label:'عرض الخزائن والبنوك', desc:'الاطلاع على الأرصدة النقدية المتاحة.'},
 { id:'finance_expenses_view', label:'عرض سجل المصروفات', desc:'مشاهدة النثريات والمدفوعات الإدارية.'},
 { id:'finance_expenses_add', label:'إضافة مصروفات', desc:'تسجيل سند صرف أو مصروفات جديدة.'},
 { id:'finance_vouchers', label:'سندات القبض والصرف', desc:'إدارة المعاملات المالية المباشرة.'},
 { id:'finance_journal', label:'القيود المحاسبية', desc:'الوصول لدفتر اليومية وشجرة الحسابات.'}
 ]
 },
 {
 id:'hr',
 label:'الموظفين والإدارة',
 icon: <UserCog className="w-4 h-4"/>,
 color:'purple',
 permissions: [
 { id:'employees_view', label:'عرض دليل الموظفين', desc:'تصفح بيانات الموظفين وعقودهم.'},
 { id:'employees_attendance', label:'إدارة الحضور والرواتب', desc:'متابعة الدوام وصرف المستحقات.'},
 { id:'employees_permissions', label:'تعديل الصلاحيات (خطر)', desc:'تعديل وصول المستخدمين لصفحات النظام.'}
 ]
 }
];

export default function PermissionsPage() {
 const { currentUser } = useSessionStore();
 const orgId = currentUser?.org_id ||'';

 const [employees, setEmployees] = useState<Employee[]>([]);
 const [isLoading, setIsLoading] = useState(true);
 const [isSaving, setIsSaving] = useState(false);
 const [searchQuery, setSearchQuery] = useState('');

 const [selectedEmpId, setSelectedEmpId] = useState<string | null>(null);
 const [currentPermissions, setCurrentPermissions] = useState<string[]>([]);

 const loadData = async () => {
 if (!orgId) return;
 setIsLoading(true);
 try {
 const list = await EmployeeRepository.getEmployeesByOrg(orgId);
 setEmployees(list);
 // Select first employee by default if none selected
 if (list.length > 0 && !selectedEmpId) {
 setSelectedEmpId(list[0].id);
 setCurrentPermissions(list[0].permissions || []);
 }
 } catch (err) {
 toast.error('خطأ في تحميل قائمة الموظفين');
 } finally {
 setIsLoading(false);
 }
 };

 useEffect(() => {
 loadData();
 }, [orgId]);

 const selectedEmployee = useMemo(() =>
 employees.find(e => e.id === selectedEmpId),
 [employees, selectedEmpId]);

 const handleSelectEmployee = (emp: Employee) => {
 setSelectedEmpId(emp.id);
 setCurrentPermissions(emp.permissions || []);
 };

 const togglePermission = (id: string) => {
 setCurrentPermissions(prev =>
 prev.includes(id) ? prev.filter(p => p !== id) : [...prev, id]
 );
 };

 const handleSavePermissions = async () => {
 if (!selectedEmpId) return;
 setIsSaving(true);
 try {
 await EmployeeRepository.updateEmployee(selectedEmpId, {
 permissions: currentPermissions
 });
 toast.success('تم تحديث مصفوفة الصلاحيات بنجاح');
 loadData();
 } catch (err) {
 toast.error('حدث خطأ أثناء حفظ التعديلات');
 } finally {
 setIsSaving(false);
 }
 };

 const filteredEmployees = useMemo(() => {
 const q = searchQuery.toLowerCase().trim();
 return employees.filter(e => e.full_name.toLowerCase().includes(q) || e.role.toLowerCase().includes(q));
 }, [employees, searchQuery]);

 return (
 <AppShell
 title="مصفوفة الصلاحيات والوصول"
 subtitle="التحكم الكامل في مستوى وصول الموظفين لأقسام النظام، العمليات المالية، والبيانات الحساسة."
 >
 <div className="flex flex-col gap-6"dir="rtl">

 {/* 🏗️ Main Layout: 2 Columns */}
 <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 items-start">

 {/* Sidebar: Employees List */}
 <Card className="lg:col-span-1 border-slate-200 dark:border-slate-800 shadow-xs overflow-hidden h-[calc(100vh-220px)] flex flex-col sticky top-4">
 <CardHeader className="p-4 bg-slate-50/50 dark:bg-slate-900/50 border-b border-slate-100 dark:border-slate-800">
 <div className="flex items-center gap-3 mb-4">
 <div className="w-9 h-9 rounded-xl bg-blue-600 text-white flex items-center justify-center shadow-md">
 <UserCog className="w-5 h-5"/>
 </div>
 <CardTitle className="text-sm font-black">قائمة المستخدمين</CardTitle>
 </div>
 <div className="relative group">
 <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 group-focus-within:text-blue-500 transition-colors"/>
 <Input
 placeholder="بحث باسم الموظف..."
 value={searchQuery}
 onChange={e => setSearchQuery(e.target.value)}
 className="h-10 pr-9 rounded-xl text-2xs font-bold bg-white dark:bg-slate-950"
 />
 </div>
 </CardHeader>

 <CardContent className="p-0 flex-1 overflow-hidden">
 <ScrollArea className="h-full">
 <div className="p-2 space-y-1">
 {isLoading ? (
 [1,2,3].map(i => <div key={i} className="h-14 bg-slate-100 dark:bg-slate-800 animate-pulse rounded-xl"/>)
 ) : filteredEmployees.length === 0 ? (
 <div className="py-10 text-center text-slate-400 text-xs font-bold">لا يوجد موظفين.</div>
 ) : (
 filteredEmployees.map(emp => (
 <button
 key={emp.id}
 onClick={() => handleSelectEmployee(emp)}
 className={cn(
"w-full flex items-center gap-3 p-3 rounded-xl transition-all text-right group border border-transparent",
 selectedEmpId === emp.id
 ?"bg-blue-50 dark:bg-blue-900/20 border-blue-100 dark:border-blue-900/50 shadow-xs"
 :"hover:bg-slate-50 dark:hover:bg-slate-900"
 )}
 >
 <div className={cn(
"w-10 h-10 rounded-xl flex items-center justify-center font-black text-sm shrink-0 shadow-inner",
 selectedEmpId === emp.id ?"bg-blue-600 text-white":"bg-slate-100 dark:bg-slate-800 text-slate-400"
 )}>
 {emp.full_name.charAt(0)}
 </div>
 <div className="flex flex-col min-w-0">
 <span className={cn("text-xs font-black truncate", selectedEmpId === emp.id ?"text-blue-700 dark:text-blue-400":"text-slate-900 dark:text-white")}>
 {emp.full_name}
 </span>
 <span className="text-4xs font-bold text-slate-400 uppercase tracking-tighter truncate mt-0.5">{emp.role}</span>
 </div>
 {selectedEmpId === emp.id && <ChevronRight className="w-4 h-4 mr-auto text-blue-500 animate-in fade-in slide-in-from-left-2 duration-300"/>}
 </button>
 ))
 )}
 </div>
 </ScrollArea>
 </CardContent>
 </Card>

 {/* Main Area: Permissions Matrix Editor */}
 <div className="lg:col-span-3 space-y-6">
 {selectedEmployee ? (
 <>
 <Card className="border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
 <CardHeader className="p-6 bg-surface border-b border-slate-100 dark:border-slate-800 flex flex-row items-center justify-between gap-4">
 <div className="flex items-center gap-4">
 <div className="w-14 h-14 rounded-2xl bg-blue-50 dark:bg-blue-900/30 flex items-center justify-center text-blue-600 shadow-inner shrink-0">
 <ShieldCheck className="w-8 h-8"/>
 </div>
 <div>
 <CardTitle className="text-lg font-black text-slate-900 dark:text-white">صلاحيات: {selectedEmployee.full_name}</CardTitle>
 <div className="flex items-center gap-2 mt-1.5">
 <Badge variant="outline"className="px-2 py-0 h-5 text-4xs font-black uppercase bg-slate-50 dark:bg-slate-800 text-slate-400">{selectedEmployee.role}</Badge>
 <span className="text-3xs font-bold text-slate-400 flex items-center gap-1.5">
 <div className="w-1 h-1 rounded-full bg-slate-300"/>
 تعديل صلاحيات الوصول المباشر
 </span>
 </div>
 </div>
 </div>
 <Button
 onClick={handleSavePermissions}
 disabled={isSaving}
 className="h-11 px-8 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-black text-sm gap-2 shadow-lg shadow-blue-500/20 active:scale-95 transition-all"
 >
 {isSaving ? <RefreshCw className="w-4 h-4 animate-spin"/> : <Save className="w-4 h-4"/>}
 {isSaving ?'جاري الحفظ...':'حفظ وتثبيت الصلاحيات'}
 </Button>
 </CardHeader>

 <CardContent className="p-8">
 <div className="grid grid-cols-1 md:grid-cols-2 gap-x-12 gap-y-10">
 {PERMISSION_GROUPS.map(group => (
 <div key={group.id} className="space-y-5 animate-in fade-in slide-in-from-bottom-2 duration-300">
 <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
 <div className="flex items-center gap-3">
 <div className={cn("w-8 h-8 rounded-lg flex items-center justify-center shadow-xs",
 group.color ==='blue'?"bg-blue-50 text-blue-600":
 group.color ==='emerald'?"bg-emerald-50 text-emerald-600":
 group.color ==='teal'?"bg-teal-50 text-teal-600":
 group.color ==='amber'?"bg-amber-50 text-amber-600":
 group.color ==='red'?"bg-red-50 text-red-600":
"bg-purple-50 text-purple-600"
 )}>
 {group.icon}
 </div>
 <h4 className="text-sm font-black text-slate-800 dark:text-white">{group.label}</h4>
 </div>
 <Badge variant="secondary"className="text-4xs font-black opacity-60">
 {group.permissions.filter(p => currentPermissions.includes(p.id)).length} / {group.permissions.length}
 </Badge>
 </div>

 <div className="space-y-4 pr-1">
 {group.permissions.map(perm => (
 <div
 key={perm.id}
 className="flex items-start justify-between gap-4 group/item"
 onClick={() => togglePermission(perm.id)}
 >
 <div className="space-y-1 cursor-pointer flex-1">
 <p className={cn("text-xs font-black transition-colors",
 currentPermissions.includes(perm.id) ?"text-slate-900 dark:text-white":"text-slate-400"
 )}>
 {perm.label}
 </p>
 <p className="text-3xs font-medium text-slate-400 leading-relaxed max-w-[280px]">
 {perm.desc}
 </p>
 </div>
 <Switch
 checked={currentPermissions.includes(perm.id)}
 onCheckedChange={() => togglePermission(perm.id)}
 className="data-[state=checked]:bg-blue-600 scale-90"
 />
 </div>
 ))}
 </div>
 </div>
 ))}
 </div>
 </CardContent>

 <div className="p-4 bg-slate-50/50 dark:bg-slate-900 border-t border-slate-100 dark:border-slate-800 flex items-center gap-3">
 <div className="w-10 h-10 rounded-xl bg-amber-50 flex items-center justify-center text-amber-600 shrink-0 shadow-inner">
 <Info className="w-5 h-5"/>
 </div>
 <p className="text-3xs font-bold text-amber-700 dark:text-amber-500 leading-relaxed">
 تنبيه: الصلاحيات التي تحمل وسم (خطر) تمنح المستخدم قدرة على حذف البيانات أو تعديل وصول الآخرين. يرجى مراجعتها بدقة قبل الحفظ.
 </p>
 </div>
 </Card>

 {/* 📊 Activity Insight Section */}
 <Card className="border-slate-200 dark:border-slate-800 shadow-xs overflow-hidden opacity-80 hover:opacity-100 transition-opacity">
 <CardContent className="p-6 flex items-center justify-between bg-slate-50/30 dark:bg-slate-900/30">
 <div className="flex items-center gap-4">
 <div className="w-10 h-10 rounded-xl bg-white dark:bg-slate-800 flex items-center justify-center text-slate-400 shadow-xs">
 <Activity className="w-5 h-5"/>
 </div>
 <div>
 <h5 className="text-xs font-black text-slate-700 dark:text-slate-200">سجل نشاط المسؤول</h5>
 <p className="text-3xs font-bold text-slate-400 mt-0.5">آخر عمليات هذا الموظف تمت قبل 3 ساعات.</p>
 </div>
 </div>
 <Button variant="outline"className="h-9 px-4 rounded-xl text-3xs font-black border-slate-200 dark:border-slate-700 hover:bg-white dark:hover:bg-slate-800">عرض كامل السجل</Button>
 </CardContent>
 </Card>
 </>
 ) : (
 <div className="h-[400px] flex flex-col items-center justify-center text-center space-y-4 bg-slate-50/50 dark:bg-slate-900/50 rounded-[2.5rem] border border-slate-100 dark:border-slate-800 border-dashed">
 <div className="w-20 h-20 bg-white dark:bg-slate-800 rounded-3xl flex items-center justify-center text-slate-200 shadow-xs">
 <Lock className="w-10 h-10 opacity-30"/>
 </div>
 <div className="space-y-1">
 <h4 className="text-base font-black text-slate-900 dark:text-white">اختر موظفاً للمتابعة</h4>
 <p className="text-xs text-slate-400 max-w-xs mx-auto">يرجى تحديد الموظف من القائمة الجانبية لعرض وتعديل مصفوفة صلاحيات الوصول الخاصة به.</p>
 </div>
 </div>
 )}
 </div>
 </div>

 </div>
 </AppShell>
 );
}
