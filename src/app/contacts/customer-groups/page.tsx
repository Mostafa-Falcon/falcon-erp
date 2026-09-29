'use client';

import React, { useEffect, useState, Suspense } from'react';
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
 Dialog,
 DialogContent,
 DialogHeader,
 DialogTitle,
} from'@/components/ui/dialog';
import { Textarea } from'@/components/ui/textarea';
import { Users, Plus, Search, Tag, Percent, ShieldCheck } from'lucide-react';
import { useSessionStore } from'@/core/state/useSessionStore';
import { CrmRepository } from'@/modules/contacts/crm_repository';
import type { CustomerGroup } from'@/types';
import { toast } from'sonner';

function CustomerGroupsContent() {
 const { currentUser } = useSessionStore();
 const orgId = currentUser?.org_id ||'';

 const [groups, setGroups] = useState<CustomerGroup[]>([]);
 const [isLoading, setIsLoading] = useState(true);
 const [search, setSearch] = useState('');

 // Dialog State
 const [isOpen, setIsOpen] = useState(false);
 const [name, setName] = useState('');
 const [code, setCode] = useState('');
 const [discountPercentage, setDiscountPercentage] = useState<number>(0);
 const [creditLimitMultiplier, setCreditLimitMultiplier] = useState<number>(1.0);
 const [description, setDescription] = useState('');

 const loadData = async () => {
 if (!orgId) return;
 try {
 setIsLoading(true);
 const list = await CrmRepository.getCustomerGroups(orgId);
 setGroups(list);
 } catch (err) {
 console.error(err);
 toast.error('حدث خطأ أثناء تحميل مجموعات العملاء');
 } finally {
 setIsLoading(false);
 }
 };

 useEffect(() => {
 loadData();
 }, [orgId]);

 const handleCreate = async () => {
 if (!name.trim()) {
 toast.error('يرجى كتابة اسم المجموعة');
 return;
 }

 try {
 await CrmRepository.createCustomerGroup({
 orgId,
 name,
 code,
 discountPercentage,
 creditLimitMultiplier,
 description,
 });

 toast.success('تمت إضافة مجموعة العملاء بنجاح');
 setIsOpen(false);
 setName('');
 setCode('');
 setDiscountPercentage(0);
 setDescription('');
 loadData();
 } catch (err) {
 console.error(err);
 toast.error('فشل إضافة المجموعة');
 }
 };

 const filtered = groups.filter((g) => g.name.toLowerCase().includes(search.toLowerCase()));

 return (
 <div className="p-6 space-y-6 max-w-[1600px] mx-auto">
 {/* Header */}
 <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
 <div>
 <h1 className="text-2xl font-black text-slate-900 dark:text-white flex items-center gap-2">
 <Users className="w-7 h-7 text-primary"/>
 مجموعات وشرائح العملاء (Customer Groups)
 </h1>
 <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
 تصنيف العملاء (VIP، جملة، تجزئة، صيدليات) وتحديد الخصومات التلقائية والتسهيلات الائتمانية
 </p>
 </div>
 <Button onClick={() => setIsOpen(true)} className="bg-primary hover:bg-blue-700 text-white font-bold gap-2">
 <Plus className="w-4 h-4"/>
 إضافة مجموعة جديدة
 </Button>
 </div>

 {/* Filter Bar */}
 <Card className="bg-surface border-slate-200 dark:border-slate-800">
 <CardContent className="p-4">
 <div className="relative">
 <Search className="w-4 h-4 absolute right-3 top-1/2 -translate-y-1/2 text-slate-400"/>
 <Input
 placeholder="ابحث باسم المجموعة..."
 value={search}
 onChange={(e) => setSearch(e.target.value)}
 className="pr-9 h-10 text-xs font-bold"
 />
 </div>
 </CardContent>
 </Card>

 {/* Table */}
 <Card className="bg-surface border-slate-200 dark:border-slate-800 overflow-hidden">
 <Table>
 <TableHeader className="bg-slate-50 dark:bg-slate-800/50">
 <TableRow>
 <TableHead className="text-right font-black">رمز المجموعة</TableHead>
 <TableHead className="text-right font-black">اسم المجموعة</TableHead>
 <TableHead className="text-right font-black">نسبة الخصم التلقائي</TableHead>
 <TableHead className="text-right font-black">مضاعف الحد الائتماني</TableHead>
 <TableHead className="text-right font-black">الوصف</TableHead>
 <TableHead className="text-center font-black">الحالة</TableHead>
 </TableRow>
 </TableHeader>
 <TableBody>
 {isLoading ? (
 <TableRow>
 <TableCell colSpan={6} className="text-center py-8 text-slate-500">
 جاري تحميل المجموعات...
 </TableCell>
 </TableRow>
 ) : filtered.length === 0 ? (
 <TableRow>
 <TableCell colSpan={6} className="text-center py-8 text-slate-500 font-bold">
 لا توجد مجموعات عملاء مسجلة
 </TableCell>
 </TableRow>
 ) : (
 filtered.map((g) => (
 <TableRow key={g.id} className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40">
 <TableCell className="font-bold text-slate-500 text-xs">
 {g.code ||'-'}
 </TableCell>
 <TableCell className="font-black text-slate-900 dark:text-white">
 {g.name}
 </TableCell>
 <TableCell className="font-bold text-emerald-600 dark:text-emerald-400">
 {g.discount_percentage}%
 </TableCell>
 <TableCell className="font-bold text-slate-700 dark:text-slate-300">
 {g.credit_limit_multiplier}x
 </TableCell>
 <TableCell className="text-xs text-slate-500 max-w-xs truncate">
 {g.description ||'-'}
 </TableCell>
 <TableCell className="text-center">
 <Badge className="bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-400">
 نشطة
 </Badge>
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
 <DialogTitle>إضافة مجموعة عملاء جديدة</DialogTitle>
 </DialogHeader>

 <div className="space-y-3 pt-2">
 <div>
 <label className="text-xs font-bold block mb-1">اسم المجموعة *</label>
 <Input
 placeholder="مثلاً: عملاء الجملة المميزون"
 value={name}
 onChange={(e) => setName(e.target.value)}
 className="h-10 text-xs font-bold"
 />
 </div>

 <div className="grid grid-cols-2 gap-3">
 <div>
 <label className="text-xs font-bold block mb-1">كود/رمز المجموعة</label>
 <Input
 placeholder="GRP-01"
 value={code}
 onChange={(e) => setCode(e.target.value)}
 className="h-10 text-xs font-bold"
 />
 </div>
 <div>
 <label className="text-xs font-bold block mb-1">نسبة الخصم (%)</label>
 <Input
 type="number"
 value={discountPercentage}
 onChange={(e) => setDiscountPercentage(parseFloat(e.target.value) || 0)}
 className="h-10 text-xs font-bold"
 />
 </div>
 </div>

 <div>
 <label className="text-xs font-bold block mb-1">مضاعف الحد الائتماني</label>
 <Input
 type="number"
 step="0.1"
 value={creditLimitMultiplier}
 onChange={(e) => setCreditLimitMultiplier(parseFloat(e.target.value) || 1)}
 className="h-10 text-xs font-bold"
 />
 </div>

 <div>
 <label className="text-xs font-bold block mb-1">الوصف والملاحظات</label>
 <Textarea
 placeholder="أدخل وصف شروط وصلاحيات هذه المجموعة..."
 value={description}
 onChange={(e) => setDescription(e.target.value)}
 rows={3}
 className="text-xs font-bold"
 />
 </div>

 <Button onClick={handleCreate} className="w-full bg-primary hover:bg-blue-700 text-white font-bold h-10">
 حفظ المجموعة
 </Button>
 </div>
 </DialogContent>
 </Dialog>
 </div>
 );
}

export default function CustomerGroupsPage() {
 return (
 <AppShell>
 <Suspense fallback={<div className="p-8 text-center">جاري التحميل...</div>}>
 <CustomerGroupsContent />
 </Suspense>
 </AppShell>
 );
}