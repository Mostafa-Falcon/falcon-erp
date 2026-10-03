'use client';

import { KpiCard } from '@/components/ui/kpi-card';
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
import { Textarea } from'@/components/ui/textarea';
import { useSessionStore } from'@/core/state/useSessionStore';
import { EmployeeDocumentRepository } from'@/modules/employees/employee_document_repository';
import { EmployeeRepository } from'@/modules/employees/employee_repository';
import { cn } from'@/lib/utils';
import { toast } from'sonner';
import { format } from'date-fns';
import { ar } from'date-fns/locale';
import {
 ExternalLink,
 FileBadge,
 FileText,
 FilterX,
 FolderOpen,
 IdCard,
 Plus,
 Search,
 Trash2,
} from'lucide-react';
import type { EmployeeDocument, User as Employee } from'@/types';

const DOCUMENT_TYPE_LABELS: Record<string, string> = {
 contract:'عقد عمل',
 id_card:'بطاقة رقم قومي',
 certificate:'شهادة / مؤهل',
 medical:'تقرير طبي',
 other:'مستند آخر',
};

const DOCUMENT_TYPES = Object.keys(DOCUMENT_TYPE_LABELS);

export default function EmployeeDocumentsPage() {
 const { currentUser } = useSessionStore();
 const orgId = currentUser?.org_id ||'';

 const [documents, setDocuments] = useState<EmployeeDocument[]>([]);
 const [employees, setEmployees] = useState<Employee[]>([]);
 const [isLoading, setIsLoading] = useState(true);
 const [searchQuery, setSearchQuery] = useState('');
 const [typeFilter, setTypeFilter] = useState('all');

 const [isDialogOpen, setIsDialogOpen] = useState(false);
 const [isSubmitting, setIsSubmitting] = useState(false);
 const [selectedEmpId, setSelectedEmpId] = useState('');
 const [title, setTitle] = useState('');
 const [documentType, setDocumentType] = useState('contract');
 const [fileUrl, setFileUrl] = useState('');
 const [notes, setNotes] = useState('');

 const loadData = async () => {
 if (!orgId) return;
 setIsLoading(true);
 try {
 const [docList, empList] = await Promise.all([
 EmployeeDocumentRepository.getByOrg(orgId),
 EmployeeRepository.getEmployeesByOrg(orgId),
 ]);
 setDocuments(docList.sort((a, b) => b.created_at.localeCompare(a.created_at)));
 setEmployees(empList);
 } catch {
 toast.error('خطأ في تحميل المستندات.');
 } finally {
 setIsLoading(false);
 }
 };

 useEffect(() => {
 loadData();
 // eslint-disable-next-line react-hooks/exhaustive-deps
 }, [orgId]);

 const employeeName = (id: string) => employees.find((e) => e.id === id)?.full_name ||'موظف';

 const resetForm = () => {
 setSelectedEmpId('');
 setTitle('');
 setDocumentType('contract');
 setFileUrl('');
 setNotes('');
 };

 const handleAddDocument = async () => {
 if (!selectedEmpId) {
 toast.error('اختر الموظف أولاً.');
 return;
 }
 if (!title.trim()) {
 toast.error('أدخل عنوان المستند.');
 return;
 }
 setIsSubmitting(true);
 try {
 await EmployeeDocumentRepository.addDocument({
 orgId,
 employeeId: selectedEmpId,
 title: title.trim(),
 documentType,
 fileUrl: fileUrl.trim() || undefined,
 notes: notes.trim() || undefined,
 createdBy: currentUser?.id,
 });
 toast.success('تم حفظ المستند بنجاح.');
 setIsDialogOpen(false);
 resetForm();
 await loadData();
 } catch {
 toast.error('حدث خطأ أثناء الحفظ.');
 } finally {
 setIsSubmitting(false);
 }
 };

 const handleDelete = async (doc: EmployeeDocument) => {
 if (!confirm('هل أنت متأكد من حذف هذا المستند؟')) return;
 try {
 await EmployeeDocumentRepository.deleteDocument(doc.id);
 toast.success('تم حذف المستند.');
 await loadData();
 } catch {
 toast.error('خطأ أثناء الحذف.');
 }
 };

 const stats = useMemo(() => {
 const employeesWithDocs = new Set(documents.map((d) => d.employee_id)).size;
 const contracts = documents.filter((d) => d.document_type ==='contract').length;
 const withFiles = documents.filter((d) => !!d.file_url).length;
 return { total: documents.length, employeesWithDocs, contracts, withFiles };
 }, [documents]);

 const filteredDocuments = useMemo(() => {
 const q = searchQuery.trim().toLowerCase();
 return documents.filter((doc) => {
 const matchesSearch =
 !q ||
 doc.title.toLowerCase().includes(q) ||
 employeeName(doc.employee_id).toLowerCase().includes(q);
 const matchesType = typeFilter ==='all'|| doc.document_type === typeFilter;
 return matchesSearch && matchesType;
 });
 // eslint-disable-next-line react-hooks/exhaustive-deps
 }, [documents, employees, searchQuery, typeFilter]);

 return (
 <AppShell
 title="مستندات وأوراق الموظفين"
 subtitle="أرشيف العقود وبطاقات الرقم القومي والشهادات والمستندات الرسمية لكل موظف."
 >
 <div className="flex flex-col gap-6 pb-12"dir="rtl">
 <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <KpiCard
            label="إجمالي المستندات"
            value={stats.total}
            unit="ملف"
            variant="blue"
            icon={<FolderOpen className="w-5 h-5" />}
          />
          <KpiCard
            label="موظفون لديهم ملف"
            value={stats.employeesWithDocs}
            unit="موظف"
            variant="indigo"
            icon={<FileBadge className="w-5 h-5" />}
          />
          <KpiCard
            label="عقود العمل"
            value={stats.contracts}
            unit="عقد"
            variant="emerald"
            icon={<FileText className="w-5 h-5" />}
          />
          <KpiCard
            label="ملفات مرفقة"
            value={stats.withFiles}
            unit="مرفق"
            variant="amber"
            icon={<IdCard className="w-5 h-5" />}
          />
        </div>

        <Card className="rounded-2xl border-slate-200 dark:border-slate-800 shadow-xs overflow-hidden">
 <CardHeader className="p-5 border-b border-slate-100 dark:border-slate-800 flex flex-col lg:flex-row lg:items-center justify-between gap-5 bg-surface">
 <div className="flex flex-col md:flex-row items-stretch md:items-center gap-4 flex-1">
 <div className="relative group flex-1 md:max-w-xs">
 <Search className="absolute right-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 group-focus-within:text-blue-500 transition-colors"/>
 <Input
 value={searchQuery}
 onChange={(e) => setSearchQuery(e.target.value)}
 placeholder="بحث بعنوان المستند أو اسم الموظف..."
 className="h-11 pr-10 bg-slate-50/50 dark:bg-slate-950/50 border-slate-200 dark:border-slate-800 rounded-xl text-xs font-bold focus:bg-white dark:focus:bg-slate-900 transition-all"
 />
 </div>

 <div className="flex items-center gap-3">
 <Select value={typeFilter} onValueChange={setTypeFilter}>
 <SelectTrigger className="w-44 h-11 rounded-xl border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950/50 text-xs font-black">
 <SelectValue placeholder="تصفية بالنوع"/>
 </SelectTrigger>
 <SelectContent className="rounded-xl shadow-xl">
 <SelectItem value="all">الكل (جميع الأنواع)</SelectItem>
 {DOCUMENT_TYPES.map((type) => (
 <SelectItem key={type} value={type}>
 {DOCUMENT_TYPE_LABELS[type]}
 </SelectItem>
 ))}
 </SelectContent>
 </Select>

 <Button
 variant="ghost"
 onClick={() => {
 setSearchQuery('');
 setTypeFilter('all');
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
 <Plus className="w-4 h-4"/> إضافة مستند
 </Button>

 <DialogContent className="sm:max-w-lg rounded-3xl p-0 overflow-hidden border-none shadow-2xl"dir="rtl">
 <div className="bg-white dark:bg-slate-950 p-8">
 <DialogHeader className="mb-8">
 <div className="w-14 h-14 rounded-2xl bg-blue-50 dark:bg-blue-900/30 flex items-center justify-center text-blue-600 mb-4 shadow-inner">
 <FileBadge className="w-7 h-7"/>
 </div>
 <DialogTitle className="text-right font-black text-xl">إضافة مستند موظف</DialogTitle>
 <DialogDescription className="text-right font-bold text-slate-400 mt-1">
 سجّل بيانات المستند ورابط الملف إن وجد.
 </DialogDescription>
 </DialogHeader>

 <div className="space-y-6 mb-8">
 <div className="space-y-2.5">
 <label className="text-2xs font-black text-slate-500 pr-1 uppercase tracking-wider">الموظف</label>
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
 <label className="text-2xs font-black text-slate-500 pr-1 uppercase tracking-wider">عنوان المستند</label>
 <Input
 value={title}
 onChange={(e) => setTitle(e.target.value)}
 placeholder="مثال: عقد عمل 2026"
 className="h-12 rounded-2xl border-slate-200 shadow-xs"
 />
 </div>
 <div className="space-y-2.5">
 <label className="text-2xs font-black text-slate-500 pr-1 uppercase tracking-wider">نوع المستند</label>
 <Select value={documentType} onValueChange={setDocumentType}>
 <SelectTrigger className="h-12 rounded-2xl border-slate-200 bg-slate-50/30 font-black">
 <SelectValue />
 </SelectTrigger>
 <SelectContent className="rounded-2xl">
 {DOCUMENT_TYPES.map((type) => (
 <SelectItem key={type} value={type}>
 {DOCUMENT_TYPE_LABELS[type]}
 </SelectItem>
 ))}
 </SelectContent>
 </Select>
 </div>
 </div>

 <div className="space-y-2.5">
 <label className="text-2xs font-black text-slate-500 pr-1 uppercase tracking-wider">رابط الملف (اختياري)</label>
 <Input
 value={fileUrl}
 onChange={(e) => setFileUrl(e.target.value)}
 placeholder="https://..."
 className="h-12 rounded-2xl border-slate-200 shadow-xs text-left"
 dir="ltr"
 />
 </div>

 <div className="space-y-2.5">
 <label className="text-2xs font-black text-slate-500 pr-1 uppercase tracking-wider">ملاحظات</label>
 <Textarea
 value={notes}
 onChange={(e) => setNotes(e.target.value)}
 placeholder="ملاحظات إضافية..."
 className="rounded-2xl border-slate-200 shadow-xs min-h-20"
 />
 </div>
 </div>

 <DialogFooter className="gap-3">
 <Button variant="ghost"onClick={() => setIsDialogOpen(false)} className="rounded-xl font-bold h-12 px-8">
 تراجع
 </Button>
 <Button
 onClick={handleAddDocument}
 disabled={isSubmitting}
 className="flex-1 rounded-2xl bg-blue-600 hover:bg-blue-700 text-white font-black h-12 shadow-xl shadow-blue-500/20 text-sm"
 >
 {isSubmitting ?'جاري الحفظ...':'حفظ المستند'}
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
 <TableHead className="py-4 px-6 text-center text-2xs font-black text-slate-500 uppercase tracking-widest h-14">المستند</TableHead>
 <TableHead className="py-4 px-6 text-center text-2xs font-black text-slate-500 uppercase tracking-widest h-14">النوع</TableHead>
 <TableHead className="py-4 px-6 text-center text-2xs font-black text-slate-500 uppercase tracking-widest h-14">تاريخ الرفع</TableHead>
 <TableHead className="py-4 px-6 text-center text-2xs font-black text-slate-500 uppercase tracking-widest h-14">الملف</TableHead>
 <TableHead className="py-4 px-6 text-center text-2xs font-black text-slate-500 uppercase tracking-widest h-14">إجراءات</TableHead>
 </TableRow>
 </TableHeader>
 <TableBody>
 {isLoading ? (
 <TableRow>
 <TableCell colSpan={6} className="py-24 text-center">
 <div className="flex flex-col items-center gap-4">
 <div className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"/>
 <span className="text-sm font-bold text-slate-400">جاري تحميل المستندات...</span>
 </div>
 </TableCell>
 </TableRow>
 ) : filteredDocuments.length === 0 ? (
 <TableRow>
 <TableCell colSpan={6} className="py-32 text-center">
 <div className="flex flex-col items-center gap-5">
 <div className="w-20 h-20 bg-slate-50 dark:bg-slate-900 rounded-3xl flex items-center justify-center text-slate-200 border border-slate-100 dark:border-slate-800">
 <FolderOpen className="w-10 h-10"/>
 </div>
 <div className="space-y-1.5">
 <h4 className="text-base font-black text-slate-900 dark:text-white">لا توجد مستندات</h4>
 <p className="text-xs text-slate-400 max-w-sm mx-auto">لم يتم رفع أي مستندات للطاقم حتى الآن.</p>
 </div>
 </div>
 </TableCell>
 </TableRow>
 ) : (
 filteredDocuments.map((doc) => (
 <TableRow key={doc.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30 transition-colors border-b border-slate-100 dark:border-slate-800/50">
 <TableCell className="py-4 px-6">
 <span className="text-sm font-black text-slate-900 dark:text-white">{employeeName(doc.employee_id)}</span>
 </TableCell>
 <TableCell className="py-4 px-6 text-center">
 <div className="flex flex-col items-center">
 <span className="text-sm font-black text-slate-800 dark:text-slate-200">{doc.title}</span>
 {doc.notes && <span className="text-3xs font-bold text-slate-400 mt-0.5">{doc.notes}</span>}
 </div>
 </TableCell>
 <TableCell className="py-4 px-6 text-center">
 <Badge variant="secondary"className="px-3 py-1 rounded-lg text-3xs font-black bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border-none">
 {doc.document_type ? DOCUMENT_TYPE_LABELS[doc.document_type] || doc.document_type :'غير محدد'}
 </Badge>
 </TableCell>
 <TableCell className="py-4 px-6 text-center">
 <span className="text-2xs font-black text-slate-600 dark:text-slate-300 font-mono">
 {format(new Date(doc.created_at),'dd MMM yyyy', { locale: ar })}
 </span>
 </TableCell>
 <TableCell className="py-4 px-6 text-center">
 {doc.file_url ? (
 <a
 href={doc.file_url}
 target="_blank"
 rel="noopener noreferrer"
 className="inline-flex items-center gap-1.5 text-blue-600 hover:text-blue-700 text-2xs font-black"
 >
 <ExternalLink className="w-3.5 h-3.5"/> فتح
 </a>
 ) : (
 <span className="text-2xs font-bold text-slate-300">—</span>
 )}
 </TableCell>
 <TableCell className="py-4 px-6 text-center">
 <Button
 onClick={() => handleDelete(doc)}
 size="sm"
 className="h-8 w-8 p-0 bg-slate-50 text-slate-500 hover:bg-red-600 hover:text-white rounded-lg"
 title="حذف"
 >
 <Trash2 className="w-4 h-4"/>
 </Button>
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
 </AppShell>
 );
}
