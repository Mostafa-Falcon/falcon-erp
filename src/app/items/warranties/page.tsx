'use client';

import React, { useEffect, useState } from'react';
import { Suspense } from'react';
import { AppShell } from'@/components/layout/AppShell';
import { Button } from'@/components/ui/button';
import { Input } from'@/components/ui/input';
import { useSessionStore } from'@/core/state/useSessionStore';
import { ShieldCheck, Plus, Search, Trash2, Edit2, Clock, CheckCircle } from'lucide-react';
import { v4 as uuidv4 } from'uuid';

interface WarrantyPolicy {
 id: string;
 name: string;
 duration_months: number;
 coverage_type:'full'|'replacement'|'maintenance';
 terms?: string;
 is_active: boolean;
}

const DEFAULT_WARRANTIES: WarrantyPolicy[] = [
 { id:'1', name:'ضمان استبدال فوري (سنة كاملة)', duration_months: 12, coverage_type:'replacement', terms:'استبدال مباشر في حالة وجود عيوب صناعة', is_active: true },
 { id:'2', name:'ضمان صيانة الوكيل (سنتان)', duration_months: 24, coverage_type:'maintenance', terms:'الصيانة لدى مراكز الخدمة المعتمدة', is_active: true },
 { id:'3', name:'ضمان تجربة واختبار (14 يوم)', duration_months: 1, coverage_type:'full', terms:'استرجاع أو استبدال كامل حسب حماية المستهلك', is_active: true },
];

function WarrantiesContent() {
 const [warranties, setWarranties] = useState<WarrantyPolicy[]>(DEFAULT_WARRANTIES);
 const [searchQuery, setSearchQuery] = useState('');

 // Add / Edit Modal
 const [isModalOpen, setIsModalOpen] = useState(false);
 const [editingItem, setEditingItem] = useState<WarrantyPolicy | null>(null);
 const [name, setName] = useState('');
 const [months, setMonths] = useState('12');
 const [coverageType, setCoverageType] = useState<'full'|'replacement'|'maintenance'>('full');
 const [terms, setTerms] = useState('');

 useEffect(() => {
 try {
 const saved = localStorage.getItem('falcon_warranties');
 if (saved) setWarranties(JSON.parse(saved));
 } catch {}
 }, []);

 const saveWarranties = (list: WarrantyPolicy[]) => {
 setWarranties(list);
 try {
 localStorage.setItem('falcon_warranties', JSON.stringify(list));
 } catch {}
 };

 const handleOpenAdd = () => {
 setEditingItem(null);
 setName('');
 setMonths('12');
 setCoverageType('full');
 setTerms('');
 setIsModalOpen(true);
 };

 const handleOpenEdit = (w: WarrantyPolicy) => {
 setEditingItem(w);
 setName(w.name);
 setMonths(w.duration_months.toString());
 setCoverageType(w.coverage_type);
 setTerms(w.terms ||'');
 setIsModalOpen(true);
 };

 const handleSave = () => {
 if (!name.trim()) return;

 if (editingItem) {
 const updated = warranties.map((w) =>
 w.id === editingItem.id
 ? {
 ...w,
 name: name.trim(),
 duration_months: parseInt(months) || 12,
 coverage_type: coverageType,
 terms: terms.trim() || undefined,
 }
 : w
 );
 saveWarranties(updated);
 } else {
 const newW: WarrantyPolicy = {
 id: uuidv4(),
 name: name.trim(),
 duration_months: parseInt(months) || 12,
 coverage_type: coverageType,
 terms: terms.trim() || undefined,
 is_active: true,
 };
 saveWarranties([...warranties, newW]);
 }
 setIsModalOpen(false);
 };

 const handleDelete = (id: string) => {
 if (confirm('هل أنت متأكد من حذف سياسة الضمان هذه؟')) {
 saveWarranties(warranties.filter((w) => w.id !== id));
 }
 };

 const filtered = warranties.filter((w) =>
 w.name.toLowerCase().includes(searchQuery.toLowerCase())
 );

 return (
 <div className="p-6 space-y-6 max-w-6xl mx-auto"dir="rtl">
 {/* Header */}
 <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-surface p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
 <div className="flex items-center gap-3">
 <div className="w-12 h-12 rounded-xl bg-blue-50 dark:bg-blue-950/50 flex items-center justify-center text-primary">
 <ShieldCheck className="w-6 h-6"/>
 </div>
 <div>
 <h1 className="text-xl font-black text-slate-900 dark:text-white">ضمانات وسياسات الأصناف</h1>
 <p className="text-xs text-slate-500 dark:text-slate-400 font-bold mt-0.5">
 تحديد فترات وشروط الضمان المعتمدة للمنتجات والأجهزة ومطابقتها مع فواتير البيع
 </p>
 </div>
 </div>

 <Button
 onClick={handleOpenAdd}
 className="bg-primary hover:bg-blue-700 text-white font-black text-xs h-10 px-5 rounded-xl flex items-center gap-2 shadow-md shadow-blue-500/20"
 >
 <Plus className="w-4 h-4"/>
 إضافة وثيقة ضمان جديدة
 </Button>
 </div>

 {/* Search Bar */}
 <div className="flex items-center gap-3 bg-surface p-4 rounded-xl border border-slate-200 dark:border-slate-800">
 <div className="relative flex-1">
 <Search className="w-4 h-4 absolute right-3 top-3 text-slate-400"/>
 <Input
 value={searchQuery}
 onChange={(e) => setSearchQuery(e.target.value)}
 placeholder="البحث باسم الضمان أو الشروط..."
 className="pr-9 h-10 text-xs font-bold rounded-lg border-slate-200"
 />
 </div>
 </div>

 {/* Warranties Grid */}
 <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
 {filtered.map((w) => (
 <div
 key={w.id}
 className="bg-surface p-5 rounded-2xl border border-slate-200 dark:border-slate-800 space-y-3 hover:shadow-md transition-shadow relative"
 >
 <div className="flex items-center justify-between">
 <h3 className="text-sm font-black text-slate-900 dark:text-white">{w.name}</h3>
 <div className="flex items-center gap-1">
 <Button
 variant="ghost"
 size="sm"
 onClick={() => handleOpenEdit(w)}
 className="h-8 w-8 p-0 text-slate-400 hover:text-blue-600"
 >
 <Edit2 className="w-4 h-4"/>
 </Button>
 <Button
 variant="ghost"
 size="sm"
 onClick={() => handleDelete(w.id)}
 className="h-8 w-8 p-0 text-slate-400 hover:text-rose-600"
 >
 <Trash2 className="w-4 h-4"/>
 </Button>
 </div>
 </div>

 <div className="flex items-center gap-2 text-xs font-bold text-primary">
 <Clock className="w-4 h-4"/>
 <span>المدة: {w.duration_months} شهر ({Math.round(w.duration_months / 12 * 10) / 10} سنة)</span>
 </div>

 <p className="text-xs text-slate-500 font-bold min-h-[36px]">
 {w.terms ||'لا توجد شروط خاصة مسجلة'}
 </p>

 <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-2xs font-black">
 <span className="text-slate-400">نوع التغطية:</span>
 <span className="px-2 py-0.5 rounded-full bg-blue-50 text-blue-600 dark:bg-blue-950/40">
 {w.coverage_type ==='replacement'?'استبدال كامل': w.coverage_type ==='maintenance'?'صيانة وإصلاح':'شامل'}
 </span>
 </div>
 </div>
 ))}
 </div>

 {/* Add / Edit Modal */}
 {isModalOpen && (
 <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
 <div className="bg-surface rounded-2xl border border-slate-200 dark:border-slate-800 max-w-sm w-full p-6 space-y-4 shadow-xl">
 <h3 className="text-base font-black text-slate-900 dark:text-white">
 {editingItem ?'تعديل وثيقة الضمان':'إضافة وثيقة ضمان'}
 </h3>

 <div className="space-y-3">
 <div>
 <label className="text-xs font-black text-slate-700 dark:text-slate-300 block mb-1">
 اسم وثيقة الضمان
 </label>
 <Input
 value={name}
 onChange={(e) => setName(e.target.value)}
 placeholder="مثال: ضمان الوكيل المعتمد"
 className="h-10 text-xs font-bold rounded-lg"
 autoFocus
 />
 </div>

 <div>
 <label className="text-xs font-black text-slate-700 dark:text-slate-300 block mb-1">
 المدة بالأشهر
 </label>
 <Input
 type="number"
 value={months}
 onChange={(e) => setMonths(e.target.value)}
 className="h-10 text-xs font-bold rounded-lg"
 />
 </div>

 <div>
 <label className="text-xs font-black text-slate-700 dark:text-slate-300 block mb-1">
 نوع التغطية
 </label>
 <select
 value={coverageType}
 onChange={(e) => setCoverageType(e.target.value as any)}
 className="w-full h-10 px-3 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 text-xs font-bold"
 >
 <option value="full">شامل (استبدال وصيانة)</option>
 <option value="replacement">استبدال مباشر فقط</option>
 <option value="maintenance">صيانة وقطع غيار فقط</option>
 </select>
 </div>

 <div>
 <label className="text-xs font-black text-slate-700 dark:text-slate-300 block mb-1">
 الشروط والأحكام
 </label>
 <Input
 value={terms}
 onChange={(e) => setTerms(e.target.value)}
 placeholder="مثال: لا يشمل سوء الاستخدام أو السوائل"
 className="h-10 text-xs font-bold rounded-lg"
 />
 </div>
 </div>

 <div className="flex items-center justify-end gap-2 pt-2">
 <Button
 variant="outline"
 onClick={() => setIsModalOpen(false)}
 className="h-9 text-xs font-bold rounded-lg"
 >
 إلغاء
 </Button>
 <Button
 onClick={handleSave}
 className="h-9 bg-primary hover:bg-blue-700 text-white text-xs font-black rounded-lg"
 >
 حفظ
 </Button>
 </div>
 </div>
 </div>
 )}
 </div>
 );
}

export default function WarrantiesPage() {
 return (
 <AppShell>
 <Suspense fallback={<div className="p-8 text-center text-xs font-bold">جاري تحميل ضمانات الأصناف...</div>}>
 <WarrantiesContent />
 </Suspense>
 </AppShell>
 );
}