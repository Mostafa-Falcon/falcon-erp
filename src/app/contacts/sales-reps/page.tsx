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
import { UserCheck, Plus, Search, Phone, Mail, DollarSign, Target, Percent } from'lucide-react';
import { useSessionStore } from'@/core/state/useSessionStore';
import { CrmRepository } from'@/modules/contacts/crm_repository';
import { formatNumber } from'@/lib/format';
import type { SalesRep } from'@/types';
import { toast } from'sonner';

function SalesRepsContent() {
 const { currentUser } = useSessionStore();
 const orgId = currentUser?.org_id ||'';

 const [reps, setReps] = useState<SalesRep[]>([]);
 const [isLoading, setIsLoading] = useState(true);
 const [search, setSearch] = useState('');

 // Dialog State
 const [isOpen, setIsOpen] = useState(false);
 const [name, setName] = useState('');
 const [code, setCode] = useState('');
 const [phone, setPhone] = useState('');
 const [email, setEmail] = useState('');
 const [commissionRate, setCommissionRate] = useState<number>(3);
 const [targetMonthly, setTargetMonthly] = useState<number>(10000000);

 const loadData = async () => {
 if (!orgId) return;
 try {
 setIsLoading(true);
 const list = await CrmRepository.getSalesReps(orgId);
 setReps(list);
 } catch (err) {
 console.error(err);
 toast.error('حدث خطأ أثناء تحميل مندوبي المبيعات');
 } finally {
 setIsLoading(false);
 }
 };

 useEffect(() => {
 loadData();
 }, [orgId]);

 const handleCreate = async () => {
 if (!name.trim() || !phone.trim()) {
 toast.error('يرجى كتابة اسم مندوب المبيعات ورقم الهاتف');
 return;
 }

 try {
 await CrmRepository.createSalesRep({
 orgId,
 name,
 code,
 phone,
 email,
 commissionRate,
 targetMonthly,
 });

 toast.success('تمت إضافة مندوب المبيعات بنجاح');
 setIsOpen(false);
 setName('');
 setCode('');
 setPhone('');
 setEmail('');
 loadData();
 } catch (err) {
 console.error(err);
 toast.error('فشل إضافة مندوب المبيعات');
 }
 };

 const filtered = reps.filter(
 (r) =>
 r.name.toLowerCase().includes(search.toLowerCase()) ||
 r.phone.includes(search)
 );

 return (
 <div className="p-6 space-y-6 max-w-[1600px] mx-auto">
 {/* Header */}
 <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
 <div>
 <h1 className="text-2xl font-black text-slate-900 dark:text-white flex items-center gap-2">
 <UserCheck className="w-7 h-7 text-primary"/>
 مندوبي المبيعات والعمولات (Sales Representatives)
 </h1>
 <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
 إدارة أهداف المبيعات الشهرية للمندوبين وحساب نِسَب العمولات
 </p>
 </div>
 <Button onClick={() => setIsOpen(true)} className="bg-primary hover:bg-blue-700 text-white font-bold gap-2">
 <Plus className="w-4 h-4"/>
 إضافة مندوب مبيعات
 </Button>
 </div>

 {/* Filter Bar */}
 <Card className="bg-surface border-slate-200 dark:border-slate-800">
 <CardContent className="p-4">
 <div className="relative">
 <Search className="w-4 h-4 absolute right-3 top-1/2 -translate-y-1/2 text-slate-400"/>
 <Input
 placeholder="ابحث باسم المندوب أو رقم الهاتف..."
 value={search}
 onChange={(e) => setSearch(e.target.value)}
 className="pr-9 h-10 text-xs font-bold"
 />
 </div>
 </CardContent>
 </Card>

 {/* Grid Cards */}
 <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
 {isLoading ? (
 <div className="col-span-full text-center py-8 text-slate-500">جاري التحميل...</div>
 ) : filtered.length === 0 ? (
 <div className="col-span-full text-center py-12 text-slate-500 font-bold bg-surface rounded-2xl border">
 لا يوجد مندوبي مبيعات مسجلين بعد.
 </div>
 ) : (
 filtered.map((r) => (
 <Card key={r.id} className="bg-surface border-slate-200 dark:border-slate-800">
 <CardContent className="p-4 space-y-3">
 <div className="flex items-center gap-3">
 <div className="w-10 h-10 rounded-xl bg-blue-50 dark:bg-blue-950/50 flex items-center justify-center text-primary">
 <UserCheck className="w-5 h-5"/>
 </div>
 <div>
 <h3 className="font-black text-slate-900 dark:text-white text-sm">{r.name}</h3>
 <p className="text-2xs text-slate-500">{r.phone}</p>
 </div>
 </div>

 <div className="bg-slate-50 dark:bg-slate-800/60 p-2.5 rounded-xl text-xs space-y-1.5">
 <div className="flex justify-between text-slate-600 dark:text-slate-400">
 <span>نسبة العمولة:</span>
 <span className="font-bold text-primary">{r.commission_rate}%</span>
 </div>
 <div className="flex justify-between text-slate-600 dark:text-slate-400">
 <span>الهدف الشهري:</span>
 <span className="font-bold">{formatNumber(r.target_monthly)} د.ع</span>
 </div>
 </div>

 <div className="flex items-center justify-between pt-1">
 <Badge className="bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-400">
 نشط
 </Badge>
 </div>
 </CardContent>
 </Card>
 ))
 )}
 </div>

 {/* Modal */}
 <Dialog open={isOpen} onOpenChange={setIsOpen}>
 <DialogContent className="max-w-md">
 <DialogHeader>
 <DialogTitle>إضافة مندوب مبيعات جديد</DialogTitle>
 </DialogHeader>

 <div className="space-y-3 pt-2">
 <div>
 <label className="text-xs font-bold block mb-1">اسم المندوب *</label>
 <Input
 placeholder="أدخل اسم المندوب..."
 value={name}
 onChange={(e) => setName(e.target.value)}
 className="h-10 text-xs font-bold"
 />
 </div>

 <div className="grid grid-cols-2 gap-3">
 <div>
 <label className="text-xs font-bold block mb-1">رقم الهاتف *</label>
 <Input
 placeholder="07xxxxxxxx"
 value={phone}
 onChange={(e) => setPhone(e.target.value)}
 className="h-10 text-xs font-bold"
 />
 </div>
 <div>
 <label className="text-xs font-bold block mb-1">الكود الوظيفي</label>
 <Input
 placeholder="REP-01"
 value={code}
 onChange={(e) => setCode(e.target.value)}
 className="h-10 text-xs font-bold"
 />
 </div>
 </div>

 <div>
 <label className="text-xs font-bold block mb-1">البريد الإلكتروني</label>
 <Input
 placeholder="rep@pharmacy.com"
 value={email}
 onChange={(e) => setEmail(e.target.value)}
 className="h-10 text-xs font-bold"
 />
 </div>

 <div className="grid grid-cols-2 gap-3">
 <div>
 <label className="text-xs font-bold block mb-1">نسبة العمولة (%)</label>
 <Input
 type="number"
 value={commissionRate}
 onChange={(e) => setCommissionRate(parseFloat(e.target.value) || 0)}
 className="h-10 text-xs font-bold"
 />
 </div>
 <div>
 <label className="text-xs font-bold block mb-1">الهدف الشهري (د.ع)</label>
 <Input
 type="number"
 value={targetMonthly}
 onChange={(e) => setTargetMonthly(parseFloat(e.target.value) || 0)}
 className="h-10 text-xs font-bold"
 />
 </div>
 </div>

 <Button onClick={handleCreate} className="w-full bg-primary hover:bg-blue-700 text-white font-bold h-10">
 حفظ المندوب
 </Button>
 </div>
 </DialogContent>
 </Dialog>
 </div>
 );
}

export default function SalesRepsPage() {
 return (
 <AppShell>
 <Suspense fallback={<div className="p-8 text-center">جاري التحميل...</div>}>
 <SalesRepsContent />
 </Suspense>
 </AppShell>
 );
}