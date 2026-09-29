'use client';

import React, { useEffect, useState } from'react';
import { Suspense } from'react';
import { AppShell } from'@/components/layout/AppShell';
import { Button } from'@/components/ui/button';
import { Input } from'@/components/ui/input';
import { useSessionStore } from'@/core/state/useSessionStore';
import { db } from'@/core/db/app_database';
import { SyncQueueManager } from'@/core/sync/sync_queue_manager';
import { formatNumber } from'@/lib/format';
import type { Product, ProductCategory, ProductBrand } from'@/types';
import { FileDown, Search, CheckSquare, Square, Percent, Tag, Save, CheckCircle2, AlertCircle } from'lucide-react';

function BulkUpdateContent() {
 const { currentUser } = useSessionStore();
 const orgId = currentUser?.org_id ||'';

 const [products, setProducts] = useState<Product[]>([]);
 const [categories, setCategories] = useState<ProductCategory[]>([]);
 const [brands, setBrands] = useState<ProductBrand[]>([]);
 const [isLoading, setIsLoading] = useState(true);
 const [searchQuery, setSearchQuery] = useState('');
 const [selectedCategory, setSelectedCategory] = useState('all');

 // Selected items ids for bulk operation
 const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

 // Action fields
 const [priceChangeType, setPriceChangeType] = useState<'percent_increase'|'percent_decrease'|'fixed_increase'|'fixed_decrease'>('percent_increase');
 const [priceChangeValue, setPriceChangeValue] = useState('5');
 const [targetCategoryId, setTargetCategoryId] = useState('');
 const [isUpdating, setIsUpdating] = useState(false);
 const [feedback, setFeedback] = useState<{ type:'success'|'error'; message: string } | null>(null);

 const loadData = async () => {
 if (!orgId) return;
 try {
 setIsLoading(true);
 const [prods, cats, brs] = await Promise.all([
 db.products.where('org_id').equals(orgId).toArray(),
 db.product_categories.where('org_id').equals(orgId).toArray(),
 db.product_brands.where('org_id').equals(orgId).toArray(),
 ]);
 setProducts(prods);
 setCategories(cats);
 setBrands(brs);
 } catch (err) {
 console.error('Error loading products for bulk update:', err);
 } finally {
 setIsLoading(false);
 }
 };

 useEffect(() => {
 loadData();
 }, [orgId]);

 const filteredProducts = products.filter((p) => {
 const matchCat = selectedCategory ==='all'|| p.category_id === selectedCategory;
 const matchQ =
 !searchQuery ||
 p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
 (p.sku && p.sku.toLowerCase().includes(searchQuery.toLowerCase()));
 return matchCat && matchQ;
 });

 const toggleSelectAll = () => {
 if (selectedIds.size === filteredProducts.length) {
 setSelectedIds(new Set());
 } else {
 setSelectedIds(new Set(filteredProducts.map((p) => p.id)));
 }
 };

 const toggleSelectItem = (id: string) => {
 const next = new Set(selectedIds);
 if (next.has(id)) next.delete(id);
 else next.add(id);
 setSelectedIds(next);
 };

 const handleApplyPriceChange = async () => {
 if (selectedIds.size === 0) {
 setFeedback({ type:'error', message:'يرجى تحديد صنف واحد على الأقل أولاً'});
 return;
 }
 const val = parseFloat(priceChangeValue);
 if (isNaN(val) || val <= 0) {
 setFeedback({ type:'error', message:'يرجى إدخال قيمة تعديل صحيحة'});
 return;
 }

 try {
 setIsUpdating(true);
 const now = new Date().toISOString();

 await db.transaction('rw', [db.products, db.sync_queue], async () => {
 for (const id of selectedIds) {
 const prod = products.find((p) => p.id === id);
 if (!prod) continue;

 let newPrice = prod.sale_price;
 if (priceChangeType ==='percent_increase') {
 newPrice = prod.sale_price * (1 + val / 100);
 } else if (priceChangeType ==='percent_decrease') {
 newPrice = Math.max(0, prod.sale_price * (1 - val / 100));
 } else if (priceChangeType ==='fixed_increase') {
 newPrice = prod.sale_price + val;
 } else if (priceChangeType ==='fixed_decrease') {
 newPrice = Math.max(0, prod.sale_price - val);
 }

 const updatedProd: Product = {
 ...prod,
 sale_price: Math.round(newPrice * 100) / 100,
 updated_at: now,
 sync_status:'pending',
 };
 await db.products.put(updatedProd);
 await SyncQueueManager.enqueue('products', id,'update', updatedProd);
 }
 });

 setFeedback({
 type:'success',
 message:`تم تحديث أسعار ${selectedIds.size} صنف بنجاح`,
 });
 setSelectedIds(new Set());
 await loadData();
 } catch (err) {
 console.error('Bulk price update error:', err);
 setFeedback({ type:'error', message:'حدث خطأ أثناء التحديث الجماعي'});
 } finally {
 setIsUpdating(false);
 }
 };

 const handleApplyCategoryChange = async () => {
 if (selectedIds.size === 0 || !targetCategoryId) {
 setFeedback({ type:'error', message:'يرجى تحديد الأصناف والمجموعة المستهدفة'});
 return;
 }

 try {
 setIsUpdating(true);
 const now = new Date().toISOString();

 await db.transaction('rw', [db.products, db.sync_queue], async () => {
 for (const id of selectedIds) {
 const prod = products.find((p) => p.id === id);
 if (!prod) continue;
 const updatedProd: Product = {
 ...prod,
 category_id: targetCategoryId,
 updated_at: now,
 sync_status:'pending',
 };
 await db.products.put(updatedProd);
 await SyncQueueManager.enqueue('products', id,'update', updatedProd);
 }
 });

 setFeedback({
 type:'success',
 message:`تم نقل ${selectedIds.size} صنف إلى المجموعة المحددة`,
 });
 setSelectedIds(new Set());
 await loadData();
 } catch (err) {
 console.error('Bulk category update error:', err);
 setFeedback({ type:'error', message:'حدث خطأ أثناء نقل الأصناف'});
 } finally {
 setIsUpdating(false);
 }
 };

 return (
 <div className="p-6 space-y-6 max-w-7xl mx-auto"dir="rtl">
 {/* Header */}
 <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-surface p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
 <div className="flex items-center gap-3">
 <div className="w-12 h-12 rounded-xl bg-blue-50 dark:bg-blue-950/50 flex items-center justify-center text-primary">
 <FileDown className="w-6 h-6"/>
 </div>
 <div>
 <h1 className="text-xl font-black text-slate-900 dark:text-white">التحديث والتعديل الجماعي</h1>
 <p className="text-xs text-slate-500 dark:text-slate-400 font-bold mt-0.5">
 تعديل أسعار مجموعة من الأصناف بنسبة أو قيمة دفعة واحدة، أو نقلها لتصنيف آخر
 </p>
 </div>
 </div>
 </div>

 {feedback && (
 <div
 className={`p-4 rounded-xl text-xs font-black flex items-center gap-2 border ${
 feedback.type ==='success'
 ?'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-200 text-emerald-700'
 :'bg-rose-50 dark:bg-rose-950/40 border-rose-200 text-rose-700'
 }`}
 >
 {feedback.type ==='success'? (
 <CheckCircle2 className="w-4 h-4 text-emerald-600"/>
 ) : (
 <AlertCircle className="w-4 h-4 text-rose-600"/>
 )}
 {feedback.message}
 </div>
 )}

 {/* Bulk Action Controls Bar */}
 <div className="bg-surface p-5 rounded-2xl border border-slate-200 dark:border-slate-800 space-y-4 shadow-sm">
 <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
 <div className="text-xs font-black text-slate-700 dark:text-slate-300">
 الأصناف المحددة حالياً:{''}
 <span className="text-primary text-sm font-black">{selectedIds.size}</span> صنف
 </div>

 <Button
 variant="outline"
 size="sm"
 onClick={toggleSelectAll}
 className="h-8 text-xs font-bold rounded-lg border-slate-200"
 >
 {selectedIds.size === filteredProducts.length && filteredProducts.length > 0 ? (
 <span className="flex items-center gap-1.5">
 <CheckSquare className="w-4 h-4 text-primary"/> إلغاء تحديد الكل
 </span>
 ) : (
 <span className="flex items-center gap-1.5">
 <Square className="w-4 h-4"/> تحديد كل المعروض
 </span>
 )}
 </Button>
 </div>

 <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
 {/* Price Adjustment Panel */}
 <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 space-y-3">
 <span className="text-xs font-black text-slate-800 dark:text-slate-200 block">
 1. تعديل أسعار البيع جماعياً
 </span>
 <div className="flex flex-col sm:flex-row gap-2">
 <select
 value={priceChangeType}
 onChange={(e) => setPriceChangeType(e.target.value as any)}
 className="h-9 px-3 rounded-lg border border-slate-200 dark:border-slate-700 bg-surface text-xs font-bold"
 >
 <option value="percent_increase">زيادة بنسبة (%)</option>
 <option value="percent_decrease">تخفيض بنسبة (%)</option>
 <option value="fixed_increase">زيادة بمبلغ ثابت (ج.م)</option>
 <option value="fixed_decrease">تخفيض بمبلغ ثابت (ج.م)</option>
 </select>

 <Input
 type="number"
 value={priceChangeValue}
 onChange={(e) => setPriceChangeValue(e.target.value)}
 className="h-9 w-24 text-xs font-black rounded-lg bg-surface"
 />

 <Button
 disabled={isUpdating || selectedIds.size === 0}
 onClick={handleApplyPriceChange}
 className="h-9 bg-primary hover:bg-blue-700 text-white text-xs font-black rounded-lg"
 >
 تطبيق السعر
 </Button>
 </div>
 </div>

 {/* Category Assignment Panel */}
 <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 space-y-3">
 <span className="text-xs font-black text-slate-800 dark:text-slate-200 block">
 2. نقل الأصناف المحددة إلى مجموعة
 </span>
 <div className="flex flex-col sm:flex-row gap-2">
 <select
 value={targetCategoryId}
 onChange={(e) => setTargetCategoryId(e.target.value)}
 className="h-9 flex-1 px-3 rounded-lg border border-slate-200 dark:border-slate-700 bg-surface text-xs font-bold"
 >
 <option value="">اختر المجموعة...</option>
 {categories.map((c) => (
 <option key={c.id} value={c.id}>
 {c.name}
 </option>
 ))}
 </select>

 <Button
 disabled={isUpdating || selectedIds.size === 0 || !targetCategoryId}
 onClick={handleApplyCategoryChange}
 className="h-9 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-black rounded-lg"
 >
 نقل للمجموعة
 </Button>
 </div>
 </div>
 </div>
 </div>

 {/* Filter and Search */}
 <div className="flex flex-col sm:flex-row items-center gap-3 bg-surface p-4 rounded-xl border border-slate-200 dark:border-slate-800">
 <div className="relative flex-1 w-full">
 <Search className="w-4 h-4 absolute right-3 top-3 text-slate-400"/>
 <Input
 value={searchQuery}
 onChange={(e) => setSearchQuery(e.target.value)}
 placeholder="البحث باسم الصنف أو الباركود..."
 className="pr-9 h-10 text-xs font-bold rounded-lg border-slate-200"
 />
 </div>

 <select
 value={selectedCategory}
 onChange={(e) => setSelectedCategory(e.target.value)}
 className="w-full sm:w-56 h-10 px-3 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 text-xs font-bold"
 >
 <option value="all">كل المجموعات العامة</option>
 {categories.map((c) => (
 <option key={c.id} value={c.id}>
 {c.name}
 </option>
 ))}
 </select>
 </div>

 {/* Table of Items */}
 <div className="bg-surface rounded-2xl border border-slate-200 dark:border-slate-800 overflow-hidden shadow-sm">
 <div className="overflow-x-auto">
 <table className="w-full text-right border-collapse">
 <thead>
 <tr className="bg-slate-50 dark:bg-slate-800/60 border-b border-slate-200 dark:border-slate-800 text-2xs font-black text-slate-500">
 <th className="py-3.5 px-4 w-12 text-center">اختيار</th>
 <th className="py-3.5 px-4">اسم الصنف</th>
 <th className="py-3.5 px-4">الكود / الباركود</th>
 <th className="py-3.5 px-4">المجموعة</th>
 <th className="py-3.5 px-4">سعر التكلفة</th>
 <th className="py-3.5 px-4">سعر البيع</th>
 </tr>
 </thead>
 <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-xs font-bold text-slate-700 dark:text-slate-300">
 {isLoading ? (
 <tr>
 <td colSpan={6} className="py-12 text-center text-slate-400 font-bold">
 جاري تحميل الأصناف...
 </td>
 </tr>
 ) : filteredProducts.length === 0 ? (
 <tr>
 <td colSpan={6} className="py-12 text-center text-slate-400 font-bold">
 لا توجد أصناف مطابقة
 </td>
 </tr>
 ) : (
 filteredProducts.map((p) => {
 const isSelected = selectedIds.has(p.id);
 const cat = categories.find((c) => c.id === p.category_id);

 return (
 <tr
 key={p.id}
 onClick={() => toggleSelectItem(p.id)}
 className={`cursor-pointer transition-colors ${
 isSelected
 ?'bg-blue-50/70 dark:bg-blue-950/30'
 :'hover:bg-slate-50/70 dark:hover:bg-slate-800/40'
 }`}
 >
 <td className="py-3 px-4 text-center"onClick={(e) => e.stopPropagation()}>
 <input
 type="checkbox"
 checked={isSelected}
 onChange={() => toggleSelectItem(p.id)}
 className="w-4 h-4 rounded text-blue-600 cursor-pointer"
 />
 </td>
 <td className="py-3 px-4 font-black text-slate-900 dark:text-white">{p.name}</td>
 <td className="py-3 px-4 font-mono text-slate-400 text-2xs">{p.sku}</td>
 <td className="py-3 px-4 text-slate-500">{cat?.name ||'عام'}</td>
 <td className="py-3 px-4">{formatNumber(p.cost_price || 0)} ج.م</td>
 <td className="py-3 px-4 font-black text-primary">
 {formatNumber(p.sale_price)} ج.م
 </td>
 </tr>
 );
 })
 )}
 </tbody>
 </table>
 </div>
 </div>
 </div>
 );
}

export default function BulkUpdatePage() {
 return (
 <AppShell>
 <Suspense fallback={<div className="p-8 text-center text-xs font-bold">جاري تحميل التحديث الجماعي...</div>}>
 <BulkUpdateContent />
 </Suspense>
 </AppShell>
 );
}