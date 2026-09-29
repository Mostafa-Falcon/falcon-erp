'use client';

import React, { useEffect, useState } from'react';
import { Suspense } from'react';
import { AppShell } from'@/components/layout/AppShell';
import { Button } from'@/components/ui/button';
import { Input } from'@/components/ui/input';
import { useSessionStore } from'@/core/state/useSessionStore';
import { db } from'@/core/db/app_database';
import { formatNumber, formatDate } from'@/lib/format';
import type { Product } from'@/types';
import { Tag, Plus, Search, Trash2, Edit2, Calendar, Percent, CheckCircle, Clock } from'lucide-react';
import { v4 as uuidv4 } from'uuid';

interface PromotionalDiscount {
 id: string;
 name: string;
 type:'percentage'|'fixed';
 value: number;
 start_date: string;
 end_date: string;
 is_active: boolean;
 notes?: string;
}

const DEFAULT_DISCOUNTS: PromotionalDiscount[] = [
 {
 id:'1',
 name:'عرض الخصم الموسمي الصيفي',
 type:'percentage',
 value: 10,
 start_date:'2026-06-01',
 end_date:'2026-09-30',
 is_active: true,
 notes:'خصم تلقائي عند الكاشير',
 },
 {
 id:'2',
 name:'تصفية المخزون القريب من الانتهاء',
 type:'percentage',
 value: 25,
 start_date:'2026-09-01',
 end_date:'2026-10-15',
 is_active: true,
 notes:'للأصناف المتبقي عليها أقل من شهرين',
 },
];

function DiscountsContent() {
 const { currentUser } = useSessionStore();
 const [discounts, setDiscounts] = useState<PromotionalDiscount[]>(DEFAULT_DISCOUNTS);
 const [searchQuery, setSearchQuery] = useState('');

 // Add / Edit Modal
 const [isModalOpen, setIsModalOpen] = useState(false);
 const [editingItem, setEditingItem] = useState<PromotionalDiscount | null>(null);
 const [name, setName] = useState('');
 const [type, setType] = useState<'percentage'|'fixed'>('percentage');
 const [value, setValue] = useState('10');
 const [startDate, setStartDate] = useState(new Date().toISOString().split('T')[0]);
 const [endDate, setEndDate] = useState(
 new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
 );
 const [notes, setNotes] = useState('');

 useEffect(() => {
 try {
 const saved = localStorage.getItem('falcon_discounts');
 if (saved) setDiscounts(JSON.parse(saved));
 } catch {}
 }, []);

 const saveDiscounts = (list: PromotionalDiscount[]) => {
 setDiscounts(list);
 try {
 localStorage.setItem('falcon_discounts', JSON.stringify(list));
 } catch {}
 };

 const handleOpenAdd = () => {
 setEditingItem(null);
 setName('');
 setType('percentage');
 setValue('10');
 setStartDate(new Date().toISOString().split('T')[0]);
 setEndDate(new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]);
 setNotes('');
 setIsModalOpen(true);
 };

 const handleOpenEdit = (d: PromotionalDiscount) => {
 setEditingItem(d);
 setName(d.name);
 setType(d.type);
 setValue(d.value.toString());
 setStartDate(d.start_date);
 setEndDate(d.end_date);
 setNotes(d.notes ||'');
 setIsModalOpen(true);
 };

 const handleSave = () => {
 if (!name.trim()) return;

 if (editingItem) {
 const updated = discounts.map((d) =>
 d.id === editingItem.id
 ? {
 ...d,
 name: name.trim(),
 type,
 value: parseFloat(value) || 0,
 start_date: startDate,
 end_date: endDate,
 notes: notes.trim() || undefined,
 }
 : d
 );
 saveDiscounts(updated);
 } else {
 const newD: PromotionalDiscount = {
 id: uuidv4(),
 name: name.trim(),
 type,
 value: parseFloat(value) || 0,
 start_date: startDate,
 end_date: endDate,
 is_active: true,
 notes: notes.trim() || undefined,
 };
 saveDiscounts([...discounts, newD]);
 }
 setIsModalOpen(false);
 };

 const handleDelete = (id: string) => {
 if (confirm('هل أنت متأكد من حذف هذا العرض الترويجي؟')) {
 saveDiscounts(discounts.filter((d) => d.id !== id));
 }
 };

 const toggleActive = (id: string) => {
 saveDiscounts(
 discounts.map((d) => (d.id === id ? { ...d, is_active: !d.is_active } : d))
 );
 };

 const filtered = discounts.filter(
 (d) =>
 d.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
 (d.notes && d.notes.toLowerCase().includes(searchQuery.toLowerCase()))
 );

 return (
 <div className="p-6 space-y-6 max-w-6xl mx-auto"dir="rtl">
 {/* Header */}
 <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-surface p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
 <div className="flex items-center gap-3">
 <div className="w-12 h-12 rounded-xl bg-blue-50 dark:bg-blue-950/50 flex items-center justify-center text-primary">
 <Tag className="w-6 h-6"/>
 </div>
 <div>
 <h1 className="text-xl font-black text-slate-900 dark:text-white">العروض والخصومات الترويجية</h1>
 <p className="text-xs text-slate-500 dark:text-slate-400 font-bold mt-0.5">
 إدارة حملات التخفيضات والعروض المؤقتة وربطها بنقاط البيع والفواتير
 </p>
 </div>
 </div>

 <Button
 onClick={handleOpenAdd}
 className="bg-primary hover:bg-blue-700 text-white font-black text-xs h-10 px-5 rounded-xl flex items-center gap-2 shadow-md shadow-blue-500/20"
 >
 <Plus className="w-4 h-4"/>
 إنشاء عرض جديد
 </Button>
 </div>

 {/* Search Bar */}
 <div className="flex items-center gap-3 bg-surface p-4 rounded-xl border border-slate-200 dark:border-slate-800">
 <div className="relative flex-1">
 <Search className="w-4 h-4 absolute right-3 top-3 text-slate-400"/>
 <Input
 value={searchQuery}
 onChange={(e) => setSearchQuery(e.target.value)}
 placeholder="البحث باسم العرض..."
 className="pr-9 h-10 text-xs font-bold rounded-lg border-slate-200"
 />
 </div>
 </div>

 {/* Discounts Grid */}
 <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-2 gap-4">
 {filtered.map((d) => (
 <div
 key={d.id}
 className="bg-surface p-5 rounded-2xl border border-slate-200 dark:border-slate-800 space-y-4 hover:shadow-md transition-shadow relative"
 >
 <div className="flex items-center justify-between">
 <div className="flex items-center gap-2">
 <h3 className="text-base font-black text-slate-900 dark:text-white">{d.name}</h3>
 <span
 onClick={() => toggleActive(d.id)}
 className={`cursor-pointer px-2 py-0.5 rounded-full text-3xs font-black ${
 d.is_active
 ?'bg-emerald-50 text-emerald-600 dark:bg-emerald-950/40'
 :'bg-slate-100 text-slate-500'
 }`}
 >
 {d.is_active ?'نشط الآن':'متوقف'}
 </span>
 </div>

 <div className="flex items-center gap-1">
 <Button
 variant="ghost"
 size="sm"
 onClick={() => handleOpenEdit(d)}
 className="h-8 w-8 p-0 text-slate-400 hover:text-blue-600"
 >
 <Edit2 className="w-4 h-4"/>
 </Button>
 <Button
 variant="ghost"
 size="sm"
 onClick={() => handleDelete(d.id)}
 className="h-8 w-8 p-0 text-slate-400 hover:text-rose-600"
 >
 <Trash2 className="w-4 h-4"/>
 </Button>
 </div>
 </div>

 <div className="flex items-center justify-between bg-slate-50 dark:bg-slate-800/60 p-3 rounded-xl">
 <span className="text-xs font-bold text-slate-500">قيمة الخصم:</span>
 <span className="text-base font-black text-primary">
 {d.type ==='percentage'?`${d.value}% خصم`:`${formatNumber(d.value)} ج.م`}
 </span>
 </div>

 <div className="flex items-center gap-4 text-xs text-slate-500 font-bold">
 <div className="flex items-center gap-1">
 <Calendar className="w-3.5 h-3.5 text-slate-400"/>
 <span>من: {formatDate(d.start_date)}</span>
 </div>
 <div className="flex items-center gap-1">
 <Clock className="w-3.5 h-3.5 text-slate-400"/>
 <span>إلى: {formatDate(d.end_date)}</span>
 </div>
 </div>

 {d.notes && (
 <p className="text-2xs text-slate-400 font-bold border-t border-slate-100 dark:border-slate-800 pt-2">
 {d.notes}
 </p>
 )}
 </div>
 ))}
 </div>

 {/* Add / Edit Modal */}
 {isModalOpen && (
 <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
 <div className="bg-surface rounded-2xl border border-slate-200 dark:border-slate-800 max-w-sm w-full p-6 space-y-4 shadow-xl">
 <h3 className="text-base font-black text-slate-900 dark:text-white">
 {editingItem ?'تعديل العرض':'إنشاء عرض جديد'}
 </h3>

 <div className="space-y-3">
 <div>
 <label className="text-xs font-black text-slate-700 dark:text-slate-300 block mb-1">
 اسم العرض الترويجي
 </label>
 <Input
 value={name}
 onChange={(e) => setName(e.target.value)}
 placeholder="مثال: خصم نهاية الأسبوع"
 className="h-10 text-xs font-bold rounded-lg"
 autoFocus
 />
 </div>

 <div className="grid grid-cols-2 gap-2">
 <div>
 <label className="text-xs font-black text-slate-700 dark:text-slate-300 block mb-1">
 النوع
 </label>
 <select
 value={type}
 onChange={(e) => setType(e.target.value as any)}
 className="w-full h-10 px-2 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 text-xs font-bold"
 >
 <option value="percentage">نسبة مئوية (%)</option>
 <option value="fixed">مبلغ ثابت (ج.م)</option>
 </select>
 </div>

 <div>
 <label className="text-xs font-black text-slate-700 dark:text-slate-300 block mb-1">
 القيمة
 </label>
 <Input
 type="number"
 value={value}
 onChange={(e) => setValue(e.target.value)}
 className="h-10 text-xs font-bold rounded-lg"
 />
 </div>
 </div>

 <div className="grid grid-cols-2 gap-2">
 <div>
 <label className="text-xs font-black text-slate-700 dark:text-slate-300 block mb-1">
 تاريخ البدء
 </label>
 <Input
 type="date"
 value={startDate}
 onChange={(e) => setStartDate(e.target.value)}
 className="h-10 text-xs font-bold rounded-lg"
 />
 </div>

 <div>
 <label className="text-xs font-black text-slate-700 dark:text-slate-300 block mb-1">
 تاريخ الانتهاء
 </label>
 <Input
 type="date"
 value={endDate}
 onChange={(e) => setEndDate(e.target.value)}
 className="h-10 text-xs font-bold rounded-lg"
 />
 </div>
 </div>

 <div>
 <label className="text-xs font-black text-slate-700 dark:text-slate-300 block mb-1">
 ملاحظات وشروط
 </label>
 <Input
 value={notes}
 onChange={(e) => setNotes(e.target.value)}
 placeholder="ملاحظات العرض"
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

export default function DiscountsPage() {
 return (
 <AppShell>
 <Suspense fallback={<div className="p-8 text-center text-xs font-bold">جاري تحميل العروض والخصومات...</div>}>
 <DiscountsContent />
 </Suspense>
 </AppShell>
 );
}