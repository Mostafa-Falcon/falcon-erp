'use client';

import React, { useEffect, useState } from'react';
import { Suspense } from'react';
import { AppShell } from'@/components/layout/AppShell';
import { Button } from'@/components/ui/button';
import { Input } from'@/components/ui/input';
import { useSessionStore } from'@/core/state/useSessionStore';
import { db } from'@/core/db/app_database';
import { ProductTypeRepository } from'@/modules/inventory/lookups/product_type_repository';
import type { ProductTypeItem, Product } from'@/types';
import { Tags, Plus, Search, Trash2, Edit2, PackageCheck } from'lucide-react';
import { v4 as uuidv4 } from'uuid';

function ProductTypesContent() {
 const { currentUser } = useSessionStore();
 const orgId = currentUser?.org_id ||'';

 const [types, setTypes] = useState<ProductTypeItem[]>([]);
 const [products, setProducts] = useState<Product[]>([]);
 const [isLoading, setIsLoading] = useState(true);
 const [searchQuery, setSearchQuery] = useState('');

 // Add / Edit Modal
 const [isModalOpen, setIsModalOpen] = useState(false);
 const [editingType, setEditingType] = useState<ProductTypeItem | null>(null);
 const [typeName, setTypeName] = useState('');
 const [typeCode, setTypeCode] = useState('');
 const [isSaving, setIsSaving] = useState(false);
 const [errorMessage, setErrorMessage] = useState('');

 const loadData = async () => {
 if (!orgId) return;
 try {
 setIsLoading(true);
 const [typeList, prodList] = await Promise.all([
 db.product_types.where('org_id').equals(orgId).toArray(),
 db.products.where('org_id').equals(orgId).toArray(),
 ]);
 setTypes(typeList.sort((a, b) => a.name.localeCompare(b.name,'ar')));
 setProducts(prodList);
 } catch (err) {
 console.error('Error loading product types:', err);
 } finally {
 setIsLoading(false);
 }
 };

 useEffect(() => {
 loadData();
 }, [orgId]);

 const handleOpenAdd = () => {
 setEditingType(null);
 setTypeName('');
 setTypeCode('');
 setErrorMessage('');
 setIsModalOpen(true);
 };

 const handleOpenEdit = (t: ProductTypeItem) => {
 setEditingType(t);
 setTypeName(t.name);
 setTypeCode(t.code ||'');
 setErrorMessage('');
 setIsModalOpen(true);
 };

 const handleSave = async () => {
 if (!typeName.trim()) {
 setErrorMessage('يرجى كتابة اسم نوع المنتج');
 return;
 }

 try {
 setIsSaving(true);
 setErrorMessage('');

 if (editingType) {
 await ProductTypeRepository.updateProductType(
 editingType.id,
 { name: typeName.trim(), code: typeCode.trim() || undefined },
 orgId
 );
 } else {
 await ProductTypeRepository.createProductType(typeName.trim(), orgId, typeCode.trim() || undefined);
 }

 setIsModalOpen(false);
 await loadData();
 } catch (err) {
 console.error('Error saving product type:', err);
 setErrorMessage('حدث خطأ أثناء الحفظ، يرجى المحاولة ثانية');
 } finally {
 setIsSaving(false);
 }
 };

 const handleDelete = async (t: ProductTypeItem) => {
 if (confirm(`هل أنت متأكد من حذف نوع المنتج"${t.name}"؟`)) {
 try {
 await ProductTypeRepository.deleteProductType(t.id, orgId);
 await loadData();
 } catch (err) {
 console.error('Error deleting product type:', err);
 }
 }
 };

 const filteredTypes = types.filter((t) =>
 t.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
 (t.code && t.code.toLowerCase().includes(searchQuery.toLowerCase()))
 );

 return (
 <div className="p-6 space-y-6 max-w-6xl mx-auto"dir="rtl">
 {/* Header */}
 <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-surface p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
 <div className="flex items-center gap-3">
 <div className="w-12 h-12 rounded-xl bg-blue-50 dark:bg-blue-950/50 flex items-center justify-center text-primary">
 <Tags className="w-6 h-6"/>
 </div>
 <div>
 <h1 className="text-xl font-black text-slate-900 dark:text-white">أنواع المنتجات</h1>
 <p className="text-xs text-slate-500 dark:text-slate-400 font-bold mt-0.5">
 تصنيف المنتجات حسب النوع (بضاعة مخزنية، خدمات، مواد ترويجية، مجموعات)
 </p>
 </div>
 </div>

 <Button
 onClick={handleOpenAdd}
 className="bg-primary hover:bg-blue-700 text-white font-black text-xs h-10 px-5 rounded-xl flex items-center gap-2 shadow-md shadow-blue-500/20"
 >
 <Plus className="w-4 h-4"/>
 إضافة نوع منتج
 </Button>
 </div>

 {/* Search Bar */}
 <div className="flex items-center gap-3 bg-surface p-4 rounded-xl border border-slate-200 dark:border-slate-800">
 <div className="relative flex-1">
 <Search className="w-4 h-4 absolute right-3 top-3 text-slate-400"/>
 <Input
 value={searchQuery}
 onChange={(e) => setSearchQuery(e.target.value)}
 placeholder="البحث باسم النوع أو الكود..."
 className="pr-9 h-10 text-xs font-bold rounded-lg border-slate-200"
 />
 </div>
 <div className="text-xs font-bold text-slate-500 px-2">
 إجمالي الأنواع: <span className="font-black text-slate-900 dark:text-white">{types.length}</span>
 </div>
 </div>

 {/* Types Grid */}
 <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
 {isLoading ? (
 <div className="col-span-full py-12 text-center text-slate-400 font-bold">
 جاري تحميل أنواع المنتجات...
 </div>
 ) : filteredTypes.length === 0 ? (
 <div className="col-span-full py-12 text-center text-slate-400 font-bold">
 لا توجد أنواع منتجات مسجلة
 </div>
 ) : (
 filteredTypes.map((t) => {
 return (
 <div
 key={t.id}
 className="bg-surface p-4 rounded-xl border border-slate-200 dark:border-slate-800 flex items-center justify-between hover:shadow-md transition-shadow"
 >
 <div className="space-y-1">
 <div className="flex items-center gap-2">
 <h3 className="text-sm font-black text-slate-900 dark:text-white">{t.name}</h3>
 {t.code && (
 <span className="text-3xs font-mono bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded text-slate-500">
 {t.code}
 </span>
 )}
 </div>
 <span className="text-3xs text-slate-400">
 {t.is_active !== false ?'مفعل':'معطل'}
 </span>
 </div>

 <div className="flex items-center gap-1">
 <Button
 variant="ghost"
 size="sm"
 onClick={() => handleOpenEdit(t)}
 className="h-8 w-8 p-0 text-slate-400 hover:text-blue-600"
 >
 <Edit2 className="w-4 h-4"/>
 </Button>
 <Button
 variant="ghost"
 size="sm"
 onClick={() => handleDelete(t)}
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
 {editingType ?'تعديل نوع منتج':'إضافة نوع منتج جديد'}
 </h3>

 <div className="space-y-3">
 <div>
 <label className="text-xs font-black text-slate-700 dark:text-slate-300 block mb-1">
 اسم نوع المنتج
 </label>
 <Input
 value={typeName}
 onChange={(e) => setTypeName(e.target.value)}
 placeholder="مثال: مخزون قياسي، خدمة، تجميعة، عينة"
 className="h-10 text-xs font-bold rounded-lg"
 autoFocus
 />
 </div>

 <div>
 <label className="text-xs font-black text-slate-700 dark:text-slate-300 block mb-1">
 الكود التعريفي
 </label>
 <Input
 value={typeCode}
 onChange={(e) => setTypeCode(e.target.value)}
 placeholder="مثال: TYPE-STD"
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

export default function ProductTypesPage() {
 return (
 <AppShell>
 <Suspense fallback={<div className="p-8 text-center text-xs font-bold">جاري تحميل أنواع المنتجات...</div>}>
 <ProductTypesContent />
 </Suspense>
 </AppShell>
 );
}