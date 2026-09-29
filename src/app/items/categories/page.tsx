'use client';

import React, { useEffect, useState } from'react';
import { Suspense } from'react';
import { AppShell } from'@/components/layout/AppShell';
import { Button } from'@/components/ui/button';
import { Input } from'@/components/ui/input';
import { useSessionStore } from'@/core/state/useSessionStore';
import { db } from'@/core/db/app_database';
import { ProductRepository } from'@/modules/inventory/product_repository';
import type { ProductCategory, Product } from'@/types';
import { FolderTree, Plus, Search, Trash2, Edit2, PackageCheck } from 'lucide-react';
import { toast } from 'sonner';
import { v4 as uuidv4 } from'uuid';

function CategoriesContent() {
 const { currentUser } = useSessionStore();
 const orgId = currentUser?.org_id ||'';

 const [categories, setCategories] = useState<ProductCategory[]>([]);
 const [products, setProducts] = useState<Product[]>([]);
 const [isLoading, setIsLoading] = useState(true);
 const [searchQuery, setSearchQuery] = useState('');

 // Add / Edit Modal
 const [isModalOpen, setIsModalOpen] = useState(false);
 const [editingCategory, setEditingCategory] = useState<ProductCategory | null>(null);
 const [categoryName, setCategoryName] = useState('');
 const [categoryCode, setCategoryCode] = useState('');
 const [isSaving, setIsSaving] = useState(false);
 const [errorMessage, setErrorMessage] = useState('');

 const loadData = async () => {
 if (!orgId) return;
 try {
 setIsLoading(true);
 const [catList, prodList] = await Promise.all([
 db.product_categories.where('org_id').equals(orgId).toArray(),
 db.products.where('org_id').equals(orgId).toArray(),
 ]);
 setCategories(catList.sort((a, b) => a.name.localeCompare(b.name,'ar')));
 setProducts(prodList);
 } catch (err) {
 console.error('Error loading categories:', err);
 } finally {
 setIsLoading(false);
 }
 };

 useEffect(() => {
 loadData();
 }, [orgId]);

 const handleOpenAdd = () => {
 setEditingCategory(null);
 setCategoryName('');
 setCategoryCode('');
 setErrorMessage('');
 setIsModalOpen(true);
 };

 const handleOpenEdit = (c: ProductCategory) => {
 setEditingCategory(c);
 setCategoryName(c.name);
 setCategoryCode(c.code ||'');
 setErrorMessage('');
 setIsModalOpen(true);
 };

 const handleSave = async () => {
 if (!categoryName.trim()) {
 setErrorMessage('يرجى كتابة اسم التصنيف أو المجموعة');
 return;
 }

 try {
 setIsSaving(true);
 setErrorMessage('');

 if (editingCategory) {
 await ProductRepository.updateCategory(editingCategory.id, {
 name: categoryName.trim(),
 code: categoryCode.trim() || undefined,
 });
 } else {
 await ProductRepository.createCategory({
 org_id: orgId,
 name: categoryName.trim(),
 code: categoryCode.trim() || undefined,
 is_active: true,
 });
 }

 setIsModalOpen(false);
 await loadData();
 } catch (err) {
 console.error('Error saving category:', err);
 setErrorMessage('حدث خطأ أثناء الحفظ، يرجى المحاولة ثانية');
 } finally {
 setIsSaving(false);
 }
 };

  const handleDelete = async (c: ProductCategory) => {
    const linkedCount = products.filter((p) => p.category_id === c.id).length;
    if (linkedCount > 0) {
      toast.error(`لا يمكن حذف هذا التصنيف لوجود ${linkedCount} صنف مرتبط به حالياً.`);
      return;
    }

    if (confirm(`هل أنت متأكد من حذف التصنيف "${c.name}"؟`)) {
      try {
        await ProductRepository.deleteCategory(c.id);
        toast.success(`تم حذف التصنيف "${c.name}" بنجاح`);
        await loadData();
      } catch (err) {
        console.error('Error deleting category:', err);
        toast.error('حدث خطأ أثناء حذف التصنيف');
      }
    }
  };

 const filteredCategories = categories.filter((c) =>
 c.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
 (c.code && c.code.toLowerCase().includes(searchQuery.toLowerCase()))
 );

 return (
 <div className="p-6 space-y-6 max-w-6xl mx-auto"dir="rtl">
 {/* Header */}
 <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-surface p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
 <div className="flex items-center gap-3">
 <div className="w-12 h-12 rounded-xl bg-blue-50 dark:bg-blue-950/50 flex items-center justify-center text-primary">
 <FolderTree className="w-6 h-6"/>
 </div>
 <div>
 <h1 className="text-xl font-black text-slate-900 dark:text-white">المجموعات العامة والتصنيفات</h1>
 <p className="text-xs text-slate-500 dark:text-slate-400 font-bold mt-0.5">
 تنظيم شجرة أصناف المتجر والمجموعات الرئيسية والفرعية
 </p>
 </div>
 </div>

 <Button
 onClick={handleOpenAdd}
 className="bg-primary hover:bg-blue-700 text-white font-black text-xs h-10 px-5 rounded-xl flex items-center gap-2 shadow-md shadow-blue-500/20"
 >
 <Plus className="w-4 h-4"/>
 إضافة مجموعة جديدة
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
 <div className="text-xs font-bold text-slate-500 px-2">
 إجمالي المجموعات: <span className="font-black text-slate-900 dark:text-white">{categories.length}</span>
 </div>
 </div>

 {/* Categories Grid */}
 <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
 {isLoading ? (
 <div className="col-span-full py-12 text-center text-slate-400 font-bold">
 جاري تحميل المجموعات العامة والتصنيفات...
 </div>
 ) : filteredCategories.length === 0 ? (
 <div className="col-span-full py-12 text-center text-slate-400 font-bold">
 لا توجد مجموعات تطابق شروط البحث
 </div>
 ) : (
 filteredCategories.map((c) => {
 const count = products.filter((p) => p.category_id === c.id).length;
 return (
 <div
 key={c.id}
 className="bg-surface p-4 rounded-xl border border-slate-200 dark:border-slate-800 flex items-center justify-between hover:shadow-md transition-shadow"
 >
 <div className="space-y-1">
 <div className="flex items-center gap-2">
 <h3 className="text-sm font-black text-slate-900 dark:text-white">{c.name}</h3>
 {c.code && (
 <span className="text-3xs font-mono bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded text-slate-500">
 {c.code}
 </span>
 )}
 </div>
 <div className="flex items-center gap-1.5 text-xs text-slate-500">
 <PackageCheck className="w-3.5 h-3.5 text-emerald-600"/>
 <span>{count} صنف مسجل</span>
 </div>
 </div>

 <div className="flex items-center gap-1">
 <Button
 variant="ghost"
 size="sm"
 onClick={() => handleOpenEdit(c)}
 className="h-8 w-8 p-0 text-slate-400 hover:text-blue-600"
 >
 <Edit2 className="w-4 h-4"/>
 </Button>
 <Button
 variant="ghost"
 size="sm"
 onClick={() => handleDelete(c)}
 className="h-8 w-8 p-0 text-slate-400 hover:text-rose-600"
 >
 <Trash2 className="w-4 h-4"/>
 </Button>
 </div>
 </div>
 );
 })
 )}
 </div>

 {/* Add / Edit Modal */}
 {isModalOpen && (
 <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
 <div className="bg-surface rounded-2xl border border-slate-200 dark:border-slate-800 max-w-sm w-full p-6 space-y-4 shadow-xl">
 <h3 className="text-base font-black text-slate-900 dark:text-white">
 {editingCategory ?'تعديل مجموعة عامة':'إضافة مجموعة جديدة'}
 </h3>

 <div className="space-y-3">
 <div>
 <label className="text-xs font-black text-slate-700 dark:text-slate-300 block mb-1">
 اسم المجموعة
 </label>
 <Input
 value={categoryName}
 onChange={(e) => setCategoryName(e.target.value)}
 placeholder="مثال: بقالة، مستلزمات منزلية، عناية شخصية"
 className="h-10 text-xs font-bold rounded-lg"
 autoFocus
 />
 </div>

 <div>
 <label className="text-xs font-black text-slate-700 dark:text-slate-300 block mb-1">
 كود المجموعة (اختياري)
 </label>
 <Input
 value={categoryCode}
 onChange={(e) => setCategoryCode(e.target.value)}
 placeholder="مثال: CAT-01"
 className="h-10 text-xs font-bold rounded-lg"
 />
 </div>

 {errorMessage && <p className="text-xs text-rose-600 font-bold">{errorMessage}</p>}
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
 disabled={isSaving}
 onClick={handleSave}
 className="h-9 bg-primary hover:bg-blue-700 text-white text-xs font-black rounded-lg"
 >
 {isSaving ?'جاري الحفظ...':'حفظ'}
 </Button>
 </div>
 </div>
 </div>
 )}
 </div>
 );
}

export default function CategoriesPage() {
 return (
 <AppShell>
 <Suspense fallback={<div className="p-8 text-center text-xs font-bold">جاري تحميل المجموعات العامة...</div>}>
 <CategoriesContent />
 </Suspense>
 </AppShell>
 );
}