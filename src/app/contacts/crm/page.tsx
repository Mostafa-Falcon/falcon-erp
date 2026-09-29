'use client';

import React, { useEffect, useMemo, useState, Suspense } from'react';
import { AppShell } from'@/components/layout/AppShell';
import { Button } from'@/components/ui/button';
import { Badge } from'@/components/ui/badge';
import { Input } from'@/components/ui/input';
import { Card, CardContent } from'@/components/ui/card';
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
 DialogHeader,
 DialogTitle,
} from'@/components/ui/dialog';
import { Textarea } from'@/components/ui/textarea';
import {
 Briefcase,
 Plus,
 Search,
 Phone,
 Building2,
 DollarSign,
 CheckCircle2,
 XCircle,
 Clock,
 TrendingUp,
} from'lucide-react';
import { useSessionStore } from'@/core/state/useSessionStore';
import { CrmRepository } from'@/modules/contacts/crm_repository';
import { formatNumber } from'@/lib/format';
import type { CrmLead, LeadStatus, SalesRep } from'@/types';
import { toast } from'sonner';

function CrmContent() {
 const { currentUser } = useSessionStore();
 const orgId = currentUser?.org_id ||'';

 const [leads, setLeads] = useState<CrmLead[]>([]);
 const [salesReps, setSalesReps] = useState<SalesRep[]>([]);
 const [isLoading, setIsLoading] = useState(true);
 const [search, setSearch] = useState('');
 const [statusFilter, setStatusFilter] = useState<string>('all');

 // Dialog State
 const [isOpen, setIsOpen] = useState(false);
 const [companyName, setCompanyName] = useState('');
 const [contactPerson, setContactPerson] = useState('');
 const [phone, setPhone] = useState('');
 const [email, setEmail] = useState('');
 const [source, setSource] = useState('مباشر');
 const [estimatedValue, setEstimatedValue] = useState<number>(1000000);
 const [selectedRepId, setSelectedRepId] = useState<string>('');
 const [notes, setNotes] = useState('');

 const loadData = async () => {
 if (!orgId) return;
 try {
 setIsLoading(true);
 const [ldList, repList] = await Promise.all([
 CrmRepository.getLeads(orgId),
 CrmRepository.getSalesReps(orgId),
 ]);
 setLeads(ldList);
 setSalesReps(repList);
 } catch (err) {
 console.error(err);
 toast.error('حدث خطأ أثناء تحميل بيانات الـ CRM');
 } finally {
 setIsLoading(false);
 }
 };

 useEffect(() => {
 loadData();
 }, [orgId]);

 const filtered = useMemo(() => {
 return leads.filter((l) => {
 const matchSearch =
 l.company_name.toLowerCase().includes(search.toLowerCase()) ||
 l.contact_person.toLowerCase().includes(search.toLowerCase()) ||
 l.phone.includes(search);
 const matchStatus = statusFilter ==='all'|| l.status === statusFilter;
 return matchSearch && matchStatus;
 });
 }, [leads, search, statusFilter]);

 const stats = useMemo(() => {
 const totalCount = leads.length;
 const newCount = leads.filter((l) => l.status ==='new').length;
 const negotiatingCount = leads.filter((l) => l.status ==='negotiating'|| l.status ==='contacted').length;
 const wonCount = leads.filter((l) => l.status ==='won').length;
 const pipelineValue = leads.reduce((acc, l) => acc + l.estimated_value, 0);
 return { totalCount, newCount, negotiatingCount, wonCount, pipelineValue };
 }, [leads]);

 const handleCreate = async () => {
 if (!companyName.trim() || !phone.trim()) {
 toast.error('يرجى كتابة اسم الجيل / المنشأة ورقم الهاتف');
 return;
 }

 try {
 const rep = salesReps.find((r) => r.id === selectedRepId);

 await CrmRepository.createLead({
 orgId,
 companyName,
 contactPerson,
 phone,
 email,
 source,
 estimatedValue,
 salesRepId: selectedRepId || undefined,
 salesRepName: rep?.name,
 notes,
 });

 toast.success('تمت إضافة الفرصة للعميل بنجاح');
 setIsOpen(false);
 setCompanyName('');
 setContactPerson('');
 setPhone('');
 setEmail('');
 setNotes('');
 loadData();
 } catch (err) {
 console.error(err);
 toast.error('فشل إضافة العميل');
 }
 };

 const handleUpdateStatus = async (id: string, status: LeadStatus) => {
 try {
 await CrmRepository.updateLeadStatus(id, status);
 toast.success('تم تحديث حالة الفرصة بنجاح');
 loadData();
 } catch (err) {
 console.error(err);
 toast.error('فشل تحديث الحالة');
 }
 };

 const getStatusBadge = (status: LeadStatus) => {
 switch (status) {
 case'won':
 return <Badge className="bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-400">صفقة ناجحة (Won)</Badge>;
 case'lost':
 return <Badge className="bg-rose-100 text-rose-800 dark:bg-rose-950/60 dark:text-rose-400">صفقة ملغاة (Lost)</Badge>;
 case'negotiating':
 return <Badge className="bg-purple-100 text-purple-800 dark:bg-purple-950/60 dark:text-purple-400">مفاوضات وقائم</Badge>;
 case'contacted':
 return <Badge className="bg-blue-100 text-blue-800 dark:bg-blue-950/60 dark:text-blue-400">تم التواصل</Badge>;
 case'new':
 default:
 return <Badge className="bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-400">عميل جديد</Badge>;
 }
 };

 return (
 <div className="p-6 space-y-6 max-w-[1600px] mx-auto">
 {/* Header */}
 <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
 <div>
 <h1 className="text-2xl font-black text-slate-900 dark:text-white flex items-center gap-2">
 <Briefcase className="w-7 h-7 text-primary"/>
 متابعة العلاقات والفرص الاستثمارية (CRM)
 </h1>
 <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
 متابعة العملاء المحتملين وصنع الفرص وتتبع خطط المبيعات وتفاعل المندوبين
 </p>
 </div>
 <Button onClick={() => setIsOpen(true)} className="bg-primary hover:bg-blue-700 text-white font-bold gap-2">
 <Plus className="w-4 h-4"/>
 إضافة عميل محتمل جديد
 </Button>
 </div>

 {/* Summary Cards */}
 <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
 <Card className="bg-surface border-slate-200 dark:border-slate-800 shadow-xs">
 <CardContent className="p-4 flex items-center justify-between">
 <div>
 <p className="text-xs font-bold text-slate-500">إجمالي الفرص والعملاء</p>
 <p className="text-2xl font-black text-slate-900 dark:text-white mt-1">{stats.totalCount}</p>
 </div>
 <div className="w-10 h-10 rounded-xl bg-blue-50 dark:bg-blue-950/50 flex items-center justify-center text-primary">
 <Briefcase className="w-5 h-5"/>
 </div>
 </CardContent>
 </Card>

 <Card className="bg-surface border-slate-200 dark:border-slate-800 shadow-xs">
 <CardContent className="p-4 flex items-center justify-between">
 <div>
 <p className="text-xs font-bold text-slate-500">مرحلة المفاوضات</p>
 <p className="text-2xl font-black text-purple-600 dark:text-purple-400 mt-1">{stats.negotiatingCount}</p>
 </div>
 <div className="w-10 h-10 rounded-xl bg-purple-50 dark:bg-purple-950/50 flex items-center justify-center text-purple-600">
 <Clock className="w-5 h-5"/>
 </div>
 </CardContent>
 </Card>

 <Card className="bg-surface border-slate-200 dark:border-slate-800 shadow-xs">
 <CardContent className="p-4 flex items-center justify-between">
 <div>
 <p className="text-xs font-bold text-slate-500">صفقات مكتملة (Won)</p>
 <p className="text-2xl font-black text-emerald-600 dark:text-emerald-400 mt-1">{stats.wonCount}</p>
 </div>
 <div className="w-10 h-10 rounded-xl bg-emerald-50 dark:bg-emerald-950/50 flex items-center justify-center text-emerald-600">
 <CheckCircle2 className="w-5 h-5"/>
 </div>
 </CardContent>
 </Card>

 <Card className="bg-surface border-slate-200 dark:border-slate-800 shadow-xs">
 <CardContent className="p-4 flex items-center justify-between">
 <div>
 <p className="text-xs font-bold text-slate-500">إجمالي قيمة الفرص</p>
 <p className="text-2xl font-black text-slate-900 dark:text-white mt-1">{formatNumber(stats.pipelineValue)} د.ع</p>
 </div>
 <div className="w-10 h-10 rounded-xl bg-amber-50 dark:bg-amber-950/50 flex items-center justify-center text-amber-600">
 <TrendingUp className="w-5 h-5"/>
 </div>
 </CardContent>
 </Card>
 </div>

 {/* Filter Bar */}
 <Card className="bg-surface border-slate-200 dark:border-slate-800">
 <CardContent className="p-4 flex flex-col md:flex-row gap-4 items-center justify-between">
 <div className="relative flex-1 w-full">
 <Search className="w-4 h-4 absolute right-3 top-1/2 -translate-y-1/2 text-slate-400"/>
 <Input
 placeholder="البحث بالشركة، الشخص المسؤول، أو الهاتف..."
 value={search}
 onChange={(e) => setSearch(e.target.value)}
 className="pr-9 h-10 text-xs font-bold"
 />
 </div>

 <div className="flex items-center gap-3 w-full md:w-auto">
 <Select value={statusFilter} onValueChange={setStatusFilter}>
 <SelectTrigger className="w-[180px] h-10 text-xs font-bold">
 <SelectValue placeholder="حالة الفرصة"/>
 </SelectTrigger>
 <SelectContent>
 <SelectItem value="all">كل الحالات</SelectItem>
 <SelectItem value="new">عميل جديد</SelectItem>
 <SelectItem value="contacted">تم التواصل</SelectItem>
 <SelectItem value="negotiating">مفاوضات</SelectItem>
 <SelectItem value="won">صفقة ناجحة</SelectItem>
 <SelectItem value="lost">صفقة ملغاة</SelectItem>
 </SelectContent>
 </Select>
 </div>
 </CardContent>
 </Card>

 {/* Table */}
 <Card className="bg-surface border-slate-200 dark:border-slate-800 overflow-hidden">
 <Table>
 <TableHeader className="bg-slate-50 dark:bg-slate-800/50">
 <TableRow>
 <TableHead className="text-right font-black">المنشأة / العميل</TableHead>
 <TableHead className="text-right font-black">الشخص المسؤول وهاتفه</TableHead>
 <TableHead className="text-right font-black">القيمة التقديرية</TableHead>
 <TableHead className="text-right font-black">المندوب المتابع</TableHead>
 <TableHead className="text-right font-black">المصدر</TableHead>
 <TableHead className="text-center font-black">الحالة</TableHead>
 <TableHead className="text-center font-black">تحديث المرحلة</TableHead>
 </TableRow>
 </TableHeader>
 <TableBody>
 {isLoading ? (
 <TableRow>
 <TableCell colSpan={7} className="text-center py-8 text-slate-500">
 جاري التحميل...
 </TableCell>
 </TableRow>
 ) : filtered.length === 0 ? (
 <TableRow>
 <TableCell colSpan={7} className="text-center py-8 text-slate-500 font-bold">
 لا يوجد عملاء مطبقين
 </TableCell>
 </TableRow>
 ) : (
 filtered.map((l) => (
 <TableRow key={l.id} className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40">
 <TableCell className="font-black text-slate-900 dark:text-white">
 {l.company_name}
 </TableCell>
 <TableCell className="text-xs">
 <div className="font-bold text-slate-700 dark:text-slate-300">{l.contact_person ||'-'}</div>
 <div className="text-slate-400 text-3xs">{l.phone}</div>
 </TableCell>
 <TableCell className="font-bold text-xs text-primary">
 {formatNumber(l.estimated_value)} د.ع
 </TableCell>
 <TableCell className="text-xs font-bold text-slate-700 dark:text-slate-300">
 {l.sales_rep_name ||'غير معين'}
 </TableCell>
 <TableCell className="text-xs text-slate-500">
 {l.source ||'مباشر'}
 </TableCell>
 <TableCell className="text-center">
 {getStatusBadge(l.status)}
 </TableCell>
 <TableCell className="text-center">
 <div className="flex items-center justify-center gap-1">
 {l.status !=='won'&& (
 <Button
 size="xs"
 variant="ghost"
 className="text-emerald-600 hover:text-emerald-700"
 onClick={() => handleUpdateStatus(l.id,'won')}
 title="تحويل لصفقة ناجحة"
 >
 <CheckCircle2 className="w-4 h-4"/>
 </Button>
 )}
 {l.status !=='lost'&& (
 <Button
 size="xs"
 variant="ghost"
 className="text-rose-600 hover:text-rose-700"
 onClick={() => handleUpdateStatus(l.id,'lost')}
 title="إلغاء الصفقة"
 >
 <XCircle className="w-4 h-4"/>
 </Button>
 )}
 </div>
 </TableCell>
 </TableRow>
 ))
 )}
 </TableBody>
 </Table>
 </Card>

 {/* Modal */}
 <Dialog open={isOpen} onOpenChange={setIsOpen}>
 <DialogContent className="max-w-md">
 <DialogHeader>
 <DialogTitle>إضافة عميل / فرصة استثمارية جديد</DialogTitle>
 </DialogHeader>

 <div className="space-y-3 pt-2">
 <div>
 <label className="text-xs font-bold block mb-1">اسم المنشأة / العميل *</label>
 <Input
 placeholder="أدخل اسم المركز أو الصيدلية..."
 value={companyName}
 onChange={(e) => setCompanyName(e.target.value)}
 className="h-10 text-xs font-bold"
 />
 </div>

 <div className="grid grid-cols-2 gap-3">
 <div>
 <label className="text-xs font-bold block mb-1">الشخص المسؤول</label>
 <Input
 placeholder="اسم مسؤول المشتريات"
 value={contactPerson}
 onChange={(e) => setContactPerson(e.target.value)}
 className="h-10 text-xs font-bold"
 />
 </div>
 <div>
 <label className="text-xs font-bold block mb-1">رقم الهاتف *</label>
 <Input
 placeholder="07xxxxxxxx"
 value={phone}
 onChange={(e) => setPhone(e.target.value)}
 className="h-10 text-xs font-bold"
 />
 </div>
 </div>

 <div className="grid grid-cols-2 gap-3">
 <div>
 <label className="text-xs font-bold block mb-1">القيمة التقديرية (د.ع)</label>
 <Input
 type="number"
 value={estimatedValue}
 onChange={(e) => setEstimatedValue(parseFloat(e.target.value) || 0)}
 className="h-10 text-xs font-bold"
 />
 </div>
 <div>
 <label className="text-xs font-bold block mb-1">المندوب المتابع</label>
 <Select value={selectedRepId} onValueChange={setSelectedRepId}>
 <SelectTrigger className="h-10 text-xs font-bold">
 <SelectValue placeholder="اختر المندوب"/>
 </SelectTrigger>
 <SelectContent>
 <SelectItem value="">بدون مندوب</SelectItem>
 {salesReps.map((r) => (
 <SelectItem key={r.id} value={r.id}>
 {r.name}
 </SelectItem>
 ))}
 </SelectContent>
 </Select>
 </div>
 </div>

 <div>
 <label className="text-xs font-bold block mb-1">ملاحظات الفرصة</label>
 <Textarea
 placeholder="أدخل تفاصيل الاتصال والاحتياجات..."
 value={notes}
 onChange={(e) => setNotes(e.target.value)}
 rows={3}
 className="text-xs font-bold"
 />
 </div>

 <Button onClick={handleCreate} className="w-full bg-primary hover:bg-blue-700 text-white font-bold h-10">
 حفظ الفرصة
 </Button>
 </div>
 </DialogContent>
 </Dialog>
 </div>
 );
}

export default function CrmPage() {
 return (
 <AppShell>
 <Suspense fallback={<div className="p-8 text-center">جاري التحميل...</div>}>
 <CrmContent />
 </Suspense>
 </AppShell>
 );
}