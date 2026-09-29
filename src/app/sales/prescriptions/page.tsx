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
 FileCheck,
 Plus,
 Search,
 CheckCircle2,
 XCircle,
 Clock,
 Eye,
 User,
 Stethoscope,
 Pill,
} from'lucide-react';
import { useSessionStore } from'@/core/state/useSessionStore';
import { PrescriptionsRepository } from'@/modules/sales/prescriptions_repository';
import type { Prescription, PrescriptionStatus } from'@/types';
import { toast } from'sonner';

function PrescriptionsContent() {
 const { currentUser, activeBranchId } = useSessionStore();
 const orgId = currentUser?.org_id ||'';
 const branchId = activeBranchId || currentUser?.branch_id ||'';

 const [prescriptions, setPrescriptions] = useState<Prescription[]>([]);
 const [isLoading, setIsLoading] = useState(true);
 const [search, setSearch] = useState('');
 const [statusFilter, setStatusFilter] = useState<string>('all');

 // New Prescription Dialog
 const [isAddOpen, setIsAddOpen] = useState(false);
 const [patientName, setPatientName] = useState('');
 const [patientPhone, setPatientPhone] = useState('');
 const [doctorName, setDoctorName] = useState('');
 const [diagnosis, setDiagnosis] = useState('');
 const [itemsSummary, setItemsSummary] = useState('');
 const [notes, setNotes] = useState('');

 // View Details Dialog
 const [selectedPrescription, setSelectedPrescription] = useState<Prescription | null>(null);
 const [isDetailOpen, setIsDetailOpen] = useState(false);

 const loadData = async () => {
 if (!orgId) return;
 try {
 setIsLoading(true);
 const list = await PrescriptionsRepository.getPrescriptions(orgId);
 setPrescriptions(list);
 } catch (err) {
 console.error(err);
 toast.error('حدث خطأ أثناء تحميل الروشتات');
 } finally {
 setIsLoading(false);
 }
 };

 useEffect(() => {
 loadData();
 }, [orgId]);

 const filtered = useMemo(() => {
 return prescriptions.filter((p) => {
 const matchSearch =
 p.patient_name.toLowerCase().includes(search.toLowerCase()) ||
 (p.doctor_name && p.doctor_name.toLowerCase().includes(search.toLowerCase())) ||
 (p.patient_phone && p.patient_phone.includes(search));
 const matchStatus = statusFilter ==='all'|| p.status === statusFilter;
 return matchSearch && matchStatus;
 });
 }, [prescriptions, search, statusFilter]);

 const stats = useMemo(() => {
 const total = prescriptions.length;
 const pending = prescriptions.filter((p) => p.status ==='pending_review').length;
 const approved = prescriptions.filter((p) => p.status ==='approved'|| p.status ==='dispensed').length;
 const rejected = prescriptions.filter((p) => p.status ==='rejected').length;
 return { total, pending, approved, rejected };
 }, [prescriptions]);

 const handleCreatePrescription = async () => {
 if (!patientName.trim()) {
 toast.error('يرجى إدخال اسم المريض');
 return;
 }

 try {
 await PrescriptionsRepository.createPrescription({
 orgId,
 branchId,
 patientName,
 patientPhone,
 doctorName,
 diagnosis,
 itemsSummary,
 notes,
 userId: currentUser?.id,
 });

 toast.success('تمت إضافة الروشتة بنجاح للمراجعة الصيدلانية');
 setIsAddOpen(false);
 setPatientName('');
 setPatientPhone('');
 setDoctorName('');
 setDiagnosis('');
 setItemsSummary('');
 setNotes('');
 loadData();
 } catch (err) {
 console.error(err);
 toast.error('فشل إضافة الروشتة');
 }
 };

 const handleStatusChange = async (id: string, status: PrescriptionStatus) => {
 try {
 await PrescriptionsRepository.updateStatus(id, status);
 toast.success('تم تحديث حالة المراجعة بنجاح');
 loadData();
 if (selectedPrescription && selectedPrescription.id === id) {
 setSelectedPrescription((prev) => (prev ? { ...prev, status } : null));
 }
 } catch (err) {
 console.error(err);
 toast.error('فشل تحديث حالة الروشتة');
 }
 };

 const getStatusBadge = (status: PrescriptionStatus) => {
 switch (status) {
 case'dispensed':
 return <Badge className="bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-400">تم الصرف</Badge>;
 case'approved':
 return <Badge className="bg-blue-100 text-blue-800 dark:bg-blue-950/60 dark:text-blue-400">معتمدة للصرف</Badge>;
 case'rejected':
 return <Badge className="bg-rose-100 text-rose-800 dark:bg-rose-950/60 dark:text-rose-400">مرفوضة</Badge>;
 case'pending_review':
 default:
 return <Badge className="bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-400">قيد المراجعة</Badge>;
 }
 };

 return (
 <div className="p-6 space-y-6 max-w-[1600px] mx-auto">
 {/* Header */}
 <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
 <div>
 <h1 className="text-2xl font-black text-slate-900 dark:text-white flex items-center gap-2">
 <FileCheck className="w-7 h-7 text-primary"/>
 مراجعة الروشتات والوصفات الصيدلانية
 </h1>
 <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
 مراجعة واعتماد الروشتات والتشخيصات وتجهيز الأدوية للصرف
 </p>
 </div>
 <Button onClick={() => setIsAddOpen(true)} className="bg-primary hover:bg-blue-700 text-white font-bold gap-2">
 <Plus className="w-4 h-4"/>
 إدخال روشتة جديدة
 </Button>
 </div>

 {/* Stats Cards */}
 <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
 <Card className="bg-surface border-slate-200 dark:border-slate-800 shadow-xs">
 <CardContent className="p-4 flex items-center justify-between">
 <div>
 <p className="text-xs font-bold text-slate-500">إجمالي الروشتات</p>
 <p className="text-2xl font-black text-slate-900 dark:text-white mt-1">{stats.total}</p>
 </div>
 <div className="w-10 h-10 rounded-xl bg-blue-50 dark:bg-blue-950/50 flex items-center justify-center text-primary">
 <FileCheck className="w-5 h-5"/>
 </div>
 </CardContent>
 </Card>

 <Card className="bg-surface border-slate-200 dark:border-slate-800 shadow-xs">
 <CardContent className="p-4 flex items-center justify-between">
 <div>
 <p className="text-xs font-bold text-slate-500">قيد المراجعة الصيدلانية</p>
 <p className="text-2xl font-black text-amber-600 dark:text-amber-400 mt-1">{stats.pending}</p>
 </div>
 <div className="w-10 h-10 rounded-xl bg-amber-50 dark:bg-amber-950/50 flex items-center justify-center text-amber-600">
 <Clock className="w-5 h-5"/>
 </div>
 </CardContent>
 </Card>

 <Card className="bg-surface border-slate-200 dark:border-slate-800 shadow-xs">
 <CardContent className="p-4 flex items-center justify-between">
 <div>
 <p className="text-xs font-bold text-slate-500">الروشتات المعتمدة / المصروفة</p>
 <p className="text-2xl font-black text-emerald-600 dark:text-emerald-400 mt-1">{stats.approved}</p>
 </div>
 <div className="w-10 h-10 rounded-xl bg-emerald-50 dark:bg-emerald-950/50 flex items-center justify-center text-emerald-600">
 <CheckCircle2 className="w-5 h-5"/>
 </div>
 </CardContent>
 </Card>

 <Card className="bg-surface border-slate-200 dark:border-slate-800 shadow-xs">
 <CardContent className="p-4 flex items-center justify-between">
 <div>
 <p className="text-xs font-bold text-slate-500">الروشتات المرفوضة</p>
 <p className="text-2xl font-black text-rose-600 dark:text-rose-400 mt-1">{stats.rejected}</p>
 </div>
 <div className="w-10 h-10 rounded-xl bg-rose-50 dark:bg-rose-950/50 flex items-center justify-center text-rose-600">
 <XCircle className="w-5 h-5"/>
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
 placeholder="البحث باسم المريض، رقم الهاتف، أو اسم الطبيب..."
 value={search}
 onChange={(e) => setSearch(e.target.value)}
 className="pr-9 h-10 text-xs font-bold"
 />
 </div>

 <div className="flex items-center gap-3 w-full md:w-auto">
 <Select value={statusFilter} onValueChange={setStatusFilter}>
 <SelectTrigger className="w-[180px] h-10 text-xs font-bold">
 <SelectValue placeholder="حالة المراجعة"/>
 </SelectTrigger>
 <SelectContent>
 <SelectItem value="all">كل الحالات</SelectItem>
 <SelectItem value="pending_review">قيد المراجعة</SelectItem>
 <SelectItem value="approved">معتمدة للصرف</SelectItem>
 <SelectItem value="dispensed">تم الصرف</SelectItem>
 <SelectItem value="rejected">مرفوضة</SelectItem>
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
 <TableHead className="text-right font-black">اسم المريض</TableHead>
 <TableHead className="text-right font-black">رقم الهاتف</TableHead>
 <TableHead className="text-right font-black">الطبيب المعالج</TableHead>
 <TableHead className="text-right font-black">التاريخ</TableHead>
 <TableHead className="text-right font-black">ملخص الأدوية</TableHead>
 <TableHead className="text-center font-black">الحالة</TableHead>
 <TableHead className="text-center font-black">الإجراءات</TableHead>
 </TableRow>
 </TableHeader>
 <TableBody>
 {isLoading ? (
 <TableRow>
 <TableCell colSpan={7} className="text-center py-8 text-slate-500">
 جاري تحميل الروشتات...
 </TableCell>
 </TableRow>
 ) : filtered.length === 0 ? (
 <TableRow>
 <TableCell colSpan={7} className="text-center py-8 text-slate-500 font-bold">
 لا توجد روشتات مطابقة للبحث
 </TableCell>
 </TableRow>
 ) : (
 filtered.map((p) => (
 <TableRow key={p.id} className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40">
 <TableCell className="font-bold text-slate-900 dark:text-white">
 {p.patient_name}
 </TableCell>
 <TableCell className="text-xs text-slate-600 dark:text-slate-400">
 {p.patient_phone ||'-'}
 </TableCell>
 <TableCell className="text-xs font-bold text-slate-700 dark:text-slate-300">
 {p.doctor_name ||'غير محدد'}
 </TableCell>
 <TableCell className="text-xs text-slate-500">
 {new Date(p.created_at).toLocaleDateString('ar-EG')}
 </TableCell>
 <TableCell className="text-xs text-slate-600 max-w-xs truncate">
 {p.items_summary || p.diagnosis ||'بدون تفاصيل'}
 </TableCell>
 <TableCell className="text-center">
 {getStatusBadge(p.status)}
 </TableCell>
 <TableCell className="text-center">
 <div className="flex items-center justify-center gap-1">
 <Button
 size="xs"
 variant="ghost"
 onClick={() => {
 setSelectedPrescription(p);
 setIsDetailOpen(true);
 }}
 title="معاينة الروشتة"
 >
 <Eye className="w-4 h-4 text-slate-600 dark:text-slate-300"/>
 </Button>
 {p.status ==='pending_review'&& (
 <>
 <Button
 size="xs"
 variant="ghost"
 className="text-emerald-600 hover:text-emerald-700"
 onClick={() => handleStatusChange(p.id,'approved')}
 title="اعتماد الروشتة"
 >
 <CheckCircle2 className="w-4 h-4"/>
 </Button>
 <Button
 size="xs"
 variant="ghost"
 className="text-rose-600 hover:text-rose-700"
 onClick={() => handleStatusChange(p.id,'rejected')}
 title="رفض"
 >
 <XCircle className="w-4 h-4"/>
 </Button>
 </>
 )}
 </div>
 </TableCell>
 </TableRow>
 ))
 )}
 </TableBody>
 </Table>
 </Card>

 {/* Add Prescription Dialog */}
 <Dialog open={isAddOpen} onOpenChange={setIsAddOpen}>
 <DialogContent className="max-w-lg">
 <DialogHeader>
 <DialogTitle>إدخال روشتة جديدة للمراجعة الصيدلانية</DialogTitle>
 </DialogHeader>

 <div className="space-y-4 pt-2">
 <div>
 <label className="text-xs font-bold block mb-1">اسم المريض *</label>
 <Input
 placeholder="أدخل اسم المريض بالكامل..."
 value={patientName}
 onChange={(e) => setPatientName(e.target.value)}
 className="h-10 text-xs font-bold"
 />
 </div>

 <div className="grid grid-cols-2 gap-3">
 <div>
 <label className="text-xs font-bold block mb-1">رقم الهاتف</label>
 <Input
 placeholder="07xxxxxxxx"
 value={patientPhone}
 onChange={(e) => setPatientPhone(e.target.value)}
 className="h-10 text-xs font-bold"
 />
 </div>
 <div>
 <label className="text-xs font-bold block mb-1">اسم الطبيب والمعالج</label>
 <Input
 placeholder="د. أحمد علي"
 value={doctorName}
 onChange={(e) => setDoctorName(e.target.value)}
 className="h-10 text-xs font-bold"
 />
 </div>
 </div>

 <div>
 <label className="text-xs font-bold block mb-1">التشخيص / حالة المريض</label>
 <Input
 placeholder="مثلاً: التهاب شعب هوائية، ضغط مرتقع..."
 value={diagnosis}
 onChange={(e) => setDiagnosis(e.target.value)}
 className="h-10 text-xs font-bold"
 />
 </div>

 <div>
 <label className="text-xs font-bold block mb-1">الأدوية والجرعات المطلوبة</label>
 <Textarea
 placeholder="أدخل قائمة الأدوية بالجرعات (مثلاً: أوجمنتين 1جم 1x2، بنادول أدۆانس...)"
 value={itemsSummary}
 onChange={(e) => setItemsSummary(e.target.value)}
 rows={3}
 className="text-xs font-bold"
 />
 </div>

 <div>
 <label className="text-xs font-bold block mb-1">ملاحظات الصيدلي</label>
 <Textarea
 placeholder="ملاحظات الحساسية أو التداخلات الدوائية..."
 value={notes}
 onChange={(e) => setNotes(e.target.value)}
 rows={2}
 className="text-xs font-bold"
 />
 </div>

 <Button onClick={handleCreatePrescription} className="w-full bg-primary hover:bg-blue-700 text-white font-bold h-10">
 حفظ وإرسال للمراجعة
 </Button>
 </div>
 </DialogContent>
 </Dialog>

 {/* Details Dialog */}
 <Dialog open={isDetailOpen} onOpenChange={setIsDetailOpen}>
 <DialogContent className="max-w-md">
 <DialogHeader>
 <DialogTitle className="flex items-center justify-between">
 <span>تفاصيل الروشتة</span>
 {selectedPrescription && getStatusBadge(selectedPrescription.status)}
 </DialogTitle>
 </DialogHeader>

 {selectedPrescription && (
 <div className="space-y-4 pt-2 text-xs">
 <div className="bg-slate-50 dark:bg-slate-800 p-3 rounded-xl space-y-2">
 <div className="flex justify-between">
 <span className="text-slate-500 font-bold">اسم المريض:</span>
 <span className="font-black text-slate-900 dark:text-white">{selectedPrescription.patient_name}</span>
 </div>
 <div className="flex justify-between">
 <span className="text-slate-500 font-bold">الهاتف:</span>
 <span className="font-bold">{selectedPrescription.patient_phone ||'غير مسجل'}</span>
 </div>
 <div className="flex justify-between">
 <span className="text-slate-500 font-bold">الطبيب:</span>
 <span className="font-bold">{selectedPrescription.doctor_name ||'غير مسجل'}</span>
 </div>
 </div>

 <div>
 <span className="font-bold block mb-1 text-slate-500">التشخيص:</span>
 <p className="p-2.5 bg-slate-100 dark:bg-slate-800/60 rounded-lg font-bold">
 {selectedPrescription.diagnosis ||'بدون تشخيص'}
 </p>
 </div>

 <div>
 <span className="font-bold block mb-1 text-slate-500">الأدوية المطلوبة:</span>
 <p className="p-2.5 bg-slate-100 dark:bg-slate-800/60 rounded-lg font-bold whitespace-pre-wrap">
 {selectedPrescription.items_summary ||'لم تسجل أدوية'}
 </p>
 </div>

 {selectedPrescription.notes && (
 <div>
 <span className="font-bold block mb-1 text-slate-500">ملاحظات الصيدلي:</span>
 <p className="p-2.5 bg-amber-50 dark:bg-amber-950/40 text-amber-900 dark:text-amber-300 rounded-lg font-bold">
 {selectedPrescription.notes}
 </p>
 </div>
 )}
 </div>
 )}
 </DialogContent>
 </Dialog>
 </div>
 );
}

export default function PrescriptionsPage() {
 return (
 <AppShell>
 <Suspense fallback={<div className="p-8 text-center">جاري التحميل...</div>}>
 <PrescriptionsContent />
 </Suspense>
 </AppShell>
 );
}