'use client';

import React, { useEffect, useState } from'react';
import { Suspense } from'react';
import { AppShell } from'@/components/layout/AppShell';
import { Button } from'@/components/ui/button';
import { Input } from'@/components/ui/input';
import { useSessionStore } from'@/core/state/useSessionStore';
import { db } from'@/core/db/app_database';
import { ProductRepository } from'@/modules/inventory/product_repository';
import type { ProductBrand, Product } from'@/types';
import { Building2, Plus, Search, Trash2, Edit2, PackageCheck } from 'lucide-react';
import { toast } from 'sonner';
import { v4 as uuidv4 } from 'uuid';

function BrandsContent() {
 const { currentUser } = useSessionStore();
 const orgId = currentUser?.org_id ||'';

 const [brands, setBrands] = useState<ProductBrand[]>([]);
 const [products, setProducts] = useState<Product[]>([]);
 const [isLoading, setIsLoading] = useState(true);
 const [searchQuery, setSearchQuery] = useState('');

 // Add / Edit Modal
 const [isModalOpen, setIsModalOpen] = useState(false);
 const [editingBrand, setEditingBrand] = useState<ProductBrand | null>(null);
 const [brandName, setBrandName] = useState('');
 const [isSaving, setIsSaving] = useState(false);
 const [errorMessage, setErrorMessage] = useState('');

 const loadData = async () => {
 if (!orgId) return;
 try {
 setIsLoading(true);
 const [brandList, prodList] = await Promise.all([
 db.product_brands.where('org_id').equals(orgId).toArray(),
 db.products.where('org_id').equals(orgId).toArray(),
 ]);
 setBrands(brandList.sort((a, b) => a.name.localeCompare(b.name,'ar')));
 setProducts(prodList);
 } catch (err) {
 console.error('Error loading brands:', err);
 } finally {
 setIsLoading(false);
 }
 };

 useEffect(() => {
 loadData();
 }, [orgId]);

 const handleOpenAdd = () => {
 setEditingBrand(null);
 setBrandName('');
 setErrorMessage('');
 setIsModalOpen(true);
 };

 const handleOpenEdit = (b: ProductBrand) => {
 setEditingBrand(b);
 setBrandName(b.name);
 setErrorMessage('');
 setIsModalOpen(true);
 };

 const handleSave = async () => {
 if (!brandName.trim()) {
 setErrorMessage('يرجى كتابة اسم الشركة أو الماركة');
 return;
 }

 try {
 setIsSaving(true);
 setErrorMessage('');

 if (editingBrand) {
 await ProductRepository.updateBrand(editingBrand.id, {
 name: brandName.trim(),
 });
 } else {
 await ProductRepository.createBrand({
 org_id: orgId,
 name: brandName.trim(),
 });
 }

 setIsModalOpen(false);
 await loadData();
 } catch (err) {
 console.error('Error saving brand:', err);
 setErrorMessage('حدث خطأ أثناء الحفظ، يرجى المحاولة ثانية');
 } finally {
 setIsSaving(false);
 }
 };

  const handleDelete = async (b: ProductBrand) => {
    const linkedCount = products.filter((p) => p.brand_id === b.id).length;
    if (linkedCount > 0) {
      toast.error(`لا يمكن حذف هذه الشركة لوجود ${linkedCount} صنف مرتبط بها حالياً.`);
      return;
    }

    if (confirm(`هل أنت متأكد من حذف الشركة "${b.name}"؟`)) {
      try {
        await ProductRepository.deleteBrand(b.id);
        toast.success(`تم حذف الشركة "${b.name}" بنجاح`);
        await loadData();
      } catch (err) {
        console.error('Error deleting brand:', err);
        toast.error('حدث خطأ أثناء حذف الشركة');
      }
    }
  };

 const filteredBrands = brands.filter((b) =>
 b.name.toLowerCase().includes(searchQuery.toLowerCase())
 );

 return (
 <div className="p-6 space-y-6 max-w-6xl mx-auto"dir="rtl">
 {/* Header */}
 <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-surface p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
 <div className="flex items-center gap-3">
 <div className="w-12 h-12 rounded-xl bg-blue-50 dark:bg-blue-950/50 flex items-center justify-center text-primary">
 <Building2 className="w-6 h-6"/>
 </div>
 <div>
 <h1 className="text-xl font-black text-slate-900 dark:text-white">الشركات المصنعة والماركات</h1>
 <p className="text-xs text-slate-500 dark:text-slate-400 font-bold mt-0.5">
 إدارة أسماء الشركات الموردة والمصنعة للأصناف والمنتجات
 </p>
 </div>
 </div>

 <Button
 onClick={handleOpenAdd}
 className="bg-primary hover:bg-blue-700 text-white font-black text-xs h-10 px-5 rounded-xl flex items-center gap-2 shadow-md shadow-blue-500/20"
 >
 <Plus className="w-4 h-4"/>
 إضافة شركة مصنعة
 </Button>
 </div>

 {/* Search Bar */}
 <div className="flex items-center gap-3 bg-surface p-4 rounded-xl border border-slate-200 dark:border-slate-800">
 <div className="relative flex-1">
 <Search className="w-4 h-4 absolute right-3 top-3 text-slate-400"/>
 <Input
 value={searchQuery}
 onChange={(e) => setSearchQuery(e.target.value)}
 placeholder="البحث بالاسم..."
 className="pr-9 h-10 text-xs font-bold rounded-lg border-slate-200"
 />
 </div>
 <div className="text-xs font-bold text-slate-500 px-2">
 إجمالي الشركات: <span className="font-black text-slate-900 dark:text-white">{brands.length}</span>
 </div>
 </div>

 {/* Brands Grid */}
 <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
 {isLoading ? (
 <div className="col-span-full py-12 text-center text-slate-400 font-bold">
 جاري تحميل الشركات والماركات...
 </div>
 ) : filteredBrands.length === 0 ? (
 <div className="col-span-full py-12 text-center text-slate-400 font-bold">
 لا توجد شركات مصنعة مطابقة
 </div>
 ) : (
 filteredBrands.map((b) => {
 const count = products.filter((p) => p.brand_id === b.id).length;
 return (
 <div
 key={b.id}
 className="bg-surface p-4 rounded-xl border border-slate-200 dark:border-slate-800 flex items-center justify-between hover:shadow-md transition-shadow"
 >
 <div className="space-y-1">
 <h3 className="text-sm font-black text-slate-900 dark:text-white">{b.name}</h3>
 <div className="flex items-center gap-1.5 text-xs text-slate-500">
 <PackageCheck className="w-3.5 h-3.5 text-emerald-600"/>
 <span>{count} صنف مسجل</span>
 </div>
 </div>

 <div className="flex items-center gap-1">
 <Button
 variant="ghost"
 size="sm"
 onClick={() => handleOpenEdit(b)}
 className="h-8 w-8 p-0 text-slate-400 hover:text-blue-600"
 >
 <Edit2 className="w-4 h-4"/>
 </Button>
 <Button
 variant="ghost"
 size="sm"
 onClick={() => handleDelete(b)}
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
 {editingBrand ?'تعديل شركة مصنعة':'إضافة شركة مصنعة جديدة'}
 </h3>

 <div className="space-y-2">
 <label className="text-xs font-black text-slate-700 dark:text-slate-300 block">
 اسم الشركة أو الماركة التجارية
 </label>
 <Input
 value={brandName}
 onChange={(e) => setBrandName(e.target.value)}
 placeholder="مثال: المراعي، جهينة، إيفا"
 className="h-10 text-xs font-bold rounded-lg"
 autoFocus
 />
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

export default function BrandsPage() {
 return (
 <AppShell title="الشركات المصنعة والماركات">
 <Suspense fallback={<div className="p-8 text-center text-xs font-bold">جاري تحميل الشركات المصنعة...</div>}>
 <BrandsContent />
 </Suspense>
 </AppShell>
 );
}