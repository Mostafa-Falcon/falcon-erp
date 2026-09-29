'use client';

import React, { useEffect, useState } from'react';
import { Suspense } from'react';
import { AppShell } from'@/components/layout/AppShell';
import { Button } from'@/components/ui/button';
import { Input } from'@/components/ui/input';
import { useSessionStore } from'@/core/state/useSessionStore';
import { db } from'@/core/db/app_database';
import { BadgeDollarSign, Plus, Search, Trash2, Edit2, Percent, Users } from'lucide-react';
import { v4 as uuidv4 } from'uuid';

interface PriceGroup {
 id: string;
 name: string;
 code: string;
 discount_percentage: number;
 description?: string;
 is_default?: boolean;
}

const DEFAULT_PRICE_GROUPS: PriceGroup[] = [
 { id:'1', name:'سعر القطاعي (الافتراضي)', code:'RETAIL', discount_percentage: 0, is_default: true, description:'السعر القياسي للمستهلك النهائي'},
 { id:'2', name:'سعر الجملة', code:'WHOLESALE', discount_percentage: 15, is_default: false, description:'خصم خاص لكبار العملاء والموزعين'},
 { id:'3', name:'سعر نصف الجملة', code:'SEMI_WHOLESALE', discount_percentage: 8, is_default: false, description:'للمشتريات متوسطة الحجم'},
 { id:'4', name:'عملاء VIP ومؤسسات', code:'VIP', discount_percentage: 12, is_default: false, description:'تعاقدات المؤسسات والشركات'},
];

function PriceGroupsContent() {
 const { currentUser } = useSessionStore();
 const [priceGroups, setPriceGroups] = useState<PriceGroup[]>(DEFAULT_PRICE_GROUPS);
 const [searchQuery, setSearchQuery] = useState('');

 // Add / Edit Modal
 const [isModalOpen, setIsModalOpen] = useState(false);
 const [editingGroup, setEditingGroup] = useState<PriceGroup | null>(null);
 const [name, setName] = useState('');
 const [code, setCode] = useState('');
 const [discount, setDiscount] = useState('0');
 const [desc, setDesc] = useState('');

 // Load from localStorage if persisted
 useEffect(() => {
 try {
 const saved = localStorage.getItem('falcon_price_groups');
 if (saved) {
 setPriceGroups(JSON.parse(saved));
 }
 } catch {}
 }, []);

 const saveGroups = (newGroups: PriceGroup[]) => {
 setPriceGroups(newGroups);
 try {
 localStorage.setItem('falcon_price_groups', JSON.stringify(newGroups));
 } catch {}
 };

 const handleOpenAdd = () => {
 setEditingGroup(null);
 setName('');
 setCode('');
 setDiscount('0');
 setDesc('');
 setIsModalOpen(true);
 };

 const handleOpenEdit = (g: PriceGroup) => {
 setEditingGroup(g);
 setName(g.name);
 setCode(g.code);
 setDiscount(g.discount_percentage.toString());
 setDesc(g.description ||'');
 setIsModalOpen(true);
 };

 const handleSave = () => {
 if (!name.trim()) return;

 if (editingGroup) {
 const updated = priceGroups.map((g) =>
 g.id === editingGroup.id
 ? {
 ...g,
 name: name.trim(),
 code: code.trim() || g.code,
 discount_percentage: parseFloat(discount) || 0,
 description: desc.trim() || undefined,
 }
 : g
 );
 saveGroups(updated);
 } else {
 const newG: PriceGroup = {
 id: uuidv4(),
 name: name.trim(),
 code: code.trim() ||`PG-${Date.now().toString().slice(-4)}`,
 discount_percentage: parseFloat(discount) || 0,
 description: desc.trim() || undefined,
 is_default: false,
 };
 saveGroups([...priceGroups, newG]);
 }
 setIsModalOpen(false);
 };

 const handleDelete = (id: string) => {
 if (confirm('هل أنت متأكد من حذف مجموعة التسعير هذه؟')) {
 saveGroups(priceGroups.filter((g) => g.id !== id));
 }
 };

 const filteredGroups = priceGroups.filter(
 (g) =>
 g.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
 g.code.toLowerCase().includes(searchQuery.toLowerCase())
 );

 return (
 <div className="p-6 space-y-6 max-w-6xl mx-auto"dir="rtl">
 {/* Header */}
 <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-surface p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
 <div className="flex items-center gap-3">
 <div className="w-12 h-12 rounded-xl bg-blue-50 dark:bg-blue-950/50 flex items-center justify-center text-primary">
 <BadgeDollarSign className="w-6 h-6"/>
 </div>
 <div>
 <h1 className="text-xl font-black text-slate-900 dark:text-white">مجموعات وشرائح التسعير</h1>
 <p className="text-xs text-slate-500 dark:text-slate-400 font-bold mt-0.5">
 تحديد فئات تسعير مخصصة للعملاء (قطاعي، جملة، VIP) مع نسب خصم أو هوامش ربح محددة
 </p>
 </div>
 </div>

 <Button
 onClick={handleOpenAdd}
 className="bg-primary hover:bg-blue-700 text-white font-black text-xs h-10 px-5 rounded-xl flex items-center gap-2 shadow-md shadow-blue-500/20"
 >
 <Plus className="w-4 h-4"/>
 إضافة شريحة تسعير
 </Button>
 </div>

 {/* Search Bar */}
 <div className="flex items-center gap-3 bg-surface p-4 rounded-xl border border-slate-200 dark:border-slate-800">
 <div className="relative flex-1">
 <Search className="w-4 h-4 absolute right-3 top-3 text-slate-400"/>
 <Input
 value={searchQuery}
 onChange={(e) => setSearchQuery(e.target.value)}
 placeholder="البحث باسم المجموعة أو الكود..."
 className="pr-9 h-10 text-xs font-bold rounded-lg border-slate-200"
 />
 </div>
 </div>

 {/* Price Groups Grid */}
 <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-2 gap-4">
 {filteredGroups.map((g) => (
 <div
 key={g.id}
 className="bg-surface p-5 rounded-2xl border border-slate-200 dark:border-slate-800 space-y-3 hover:shadow-md transition-shadow relative overflow-hidden"
 >
 {g.is_default && (
 <span className="absolute top-0 left-0 bg-blue-600 text-white text-3xs font-black px-3 py-1 rounded-br-xl">
 الافتراضي
 </span>
 )}

 <div className="flex items-center justify-between">
 <div>
 <h3 className="text-base font-black text-slate-900 dark:text-white">{g.name}</h3>
 <span className="text-2xs font-mono text-slate-400 font-bold">{g.code}</span>
 </div>

 <div className="flex items-center gap-1">
 <Button
 variant="ghost"
 size="sm"
 onClick={() => handleOpenEdit(g)}
 className="h-8 w-8 p-0 text-slate-400 hover:text-blue-600"
 >
 <Edit2 className="w-4 h-4"/>
 </Button>
 {!g.is_default && (
 <Button
 variant="ghost"
 size="sm"
 onClick={() => handleDelete(g.id)}
 className="h-8 w-8 p-0 text-slate-400 hover:text-rose-600"
 >
 <Trash2 className="w-4 h-4"/>
 </Button>
 )}
 </div>
 </div>

 <p className="text-xs text-slate-500 font-bold min-h-[32px]">
 {g.description ||'لا يوجد وصف لهذه الشريحة'}
 </p>

 <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
 <div className="flex items-center gap-1.5 text-xs font-black text-primary">
 <Percent className="w-4 h-4"/>
 <span>نسبة التخفيض عن الأساسي:</span>
 </div>
 <span className="text-sm font-black text-slate-900 dark:text-white">
 {g.discount_percentage}%
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
 {editingGroup ?'تعديل مجموعة تسعير':'إضافة مجموعة تسعير جديدة'}
 </h3>

 <div className="space-y-3">
 <div>
 <label className="text-xs font-black text-slate-700 dark:text-slate-300 block mb-1">
 اسم الشريحة
 </label>
 <Input
 value={name}
 onChange={(e) => setName(e.target.value)}
 placeholder="مثال: سعر جملة خاص"
 className="h-10 text-xs font-bold rounded-lg"
 autoFocus
 />
 </div>

 <div>
 <label className="text-xs font-black text-slate-700 dark:text-slate-300 block mb-1">
 الكود التعريفي
 </label>
 <Input
 value={code}
 onChange={(e) => setCode(e.target.value)}
 placeholder="مثال: WHOLESALE_2"
 className="h-10 text-xs font-bold rounded-lg"
 />
 </div>

 <div>
 <label className="text-xs font-black text-slate-700 dark:text-slate-300 block mb-1">
 نسبة الخصم (%)
 </label>
 <Input
 type="number"
 value={discount}
 onChange={(e) => setDiscount(e.target.value)}
 className="h-10 text-xs font-bold rounded-lg"
 />
 </div>

 <div>
 <label className="text-xs font-black text-slate-700 dark:text-slate-300 block mb-1">
 الوصف والملاحظات
 </label>
 <Input
 value={desc}
 onChange={(e) => setDesc(e.target.value)}
 placeholder="وصف الفئة والشروط"
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

export default function PriceGroupsPage() {
 return (
 <AppShell>
 <Suspense fallback={<div className="p-8 text-center text-xs font-bold">جاري تحميل مجموعات التسعير...</div>}>
 <PriceGroupsContent />
 </Suspense>
 </AppShell>
 );
}