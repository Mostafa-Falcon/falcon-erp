'use client';

import React, { useEffect, useState } from'react';
import { Suspense } from'react';
import { AppShell } from'@/components/layout/AppShell';
import { Button } from'@/components/ui/button';
import { Input } from'@/components/ui/input';
import { useSessionStore } from'@/core/state/useSessionStore';
import { db } from'@/core/db/app_database';
import { ProductRepository } from'@/modules/inventory/product_repository';
import { formatNumber } from'@/lib/format';
import type { Product, StockLevel } from'@/types';
import { Copy, Plus, Search, Trash2, ArrowRight, Layers, Box, CheckCircle } from'lucide-react';
import Link from'next/link';

function SubstitutesContent() {
 const { currentUser } = useSessionStore();
 const orgId = currentUser?.org_id ||'';

 const [products, setProducts] = useState<Product[]>([]);
 const [stockLevels, setStockLevels] = useState<StockLevel[]>([]);
 const [isLoading, setIsLoading] = useState(true);
 const [searchQuery, setSearchQuery] = useState('');

 // Add Substitute Modal
 const [isModalOpen, setIsModalOpen] = useState(false);
 const [selectedMainProdId, setSelectedMainProdId] = useState('');
 const [selectedSubProdId, setSelectedSubProdId] = useState('');
 const [subSearch, setSubSearch] = useState('');
 const [isSaving, setIsSaving] = useState(false);

 const loadData = async () => {
 if (!orgId) return;
 try {
 setIsLoading(true);
 const [allProds, allStock] = await Promise.all([
 db.products.where('org_id').equals(orgId).toArray(),
 db.stock_levels.toArray(),
 ]);
 setProducts(allProds);
 setStockLevels(allStock);
 } catch (err) {
 console.error('Error loading substitutes:', err);
 } finally {
 setIsLoading(false);
 }
 };

 useEffect(() => {
 loadData();
 }, [orgId]);

 const getStock = (prodId: string) => {
 return stockLevels
 .filter((s) => s.product_id === prodId)
 .reduce((sum, s) => sum + s.quantity, 0);
 };

 const handleOpenAdd = (mainId?: string) => {
 setSelectedMainProdId(mainId || (products[0]?.id ??''));
 setSelectedSubProdId('');
 setSubSearch('');
 setIsModalOpen(true);
 };

 const handleAddSubstitute = async () => {
 if (!selectedMainProdId || !selectedSubProdId || selectedMainProdId === selectedSubProdId) {
 return;
 }
 try {
 setIsSaving(true);
 await ProductRepository.addSubstitute(selectedMainProdId, selectedSubProdId);
 setIsModalOpen(false);
 await loadData();
 } catch (err) {
 console.error('Error adding substitute:', err);
 } finally {
 setIsSaving(false);
 }
 };

 const handleRemoveSubstitute = async (mainId: string, subId: string) => {
 if (confirm('هل أنت متأكد من إزالة هذا البديل؟')) {
 try {
 await ProductRepository.removeSubstitute(mainId, subId);
 await loadData();
 } catch (err) {
 console.error('Error removing substitute:', err);
 }
 }
 };

 // Filter products that have substitutes or match query
 const productsWithSubstitutes = products.filter((p) => {
 const hasSubs = p.substitute_ids && p.substitute_ids.length > 0;
 const matchQ =
 !searchQuery ||
 p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
 (p.sku && p.sku.toLowerCase().includes(searchQuery.toLowerCase()));
 return hasSubs && matchQ;
 });

 return (
 <div className="p-6 space-y-6 max-w-7xl mx-auto"dir="rtl">
 {/* Header */}
 <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-surface p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
 <div className="flex items-center gap-3">
 <div className="w-12 h-12 rounded-xl bg-blue-50 dark:bg-blue-950/50 flex items-center justify-center text-primary">
 <Copy className="w-6 h-6"/>
 </div>
 <div>
 <h1 className="text-xl font-black text-slate-900 dark:text-white">بدائل الأصناف المعتمدة</h1>
 <p className="text-xs text-slate-500 dark:text-slate-400 font-bold mt-0.5">
 شبكة البدائل والمثائل التي يدخلها صاحب المنشأة لعرضها فوراً عند نفاد الصنف الأصلي
 </p>
 </div>
 </div>

 <Button
 onClick={() => handleOpenAdd()}
 className="bg-primary hover:bg-blue-700 text-white font-black text-xs h-10 px-5 rounded-xl flex items-center gap-2 shadow-md shadow-blue-500/20"
 >
 <Plus className="w-4 h-4"/>
 ربط بديل جديد لصنف
 </Button>
 </div>

 {/* Search Bar */}
 <div className="flex items-center gap-3 bg-surface p-4 rounded-xl border border-slate-200 dark:border-slate-800">
 <div className="relative flex-1">
 <Search className="w-4 h-4 absolute right-3 top-3 text-slate-400"/>
 <Input
 value={searchQuery}
 onChange={(e) => setSearchQuery(e.target.value)}
 placeholder="البحث باسم الصنف الرئيسي أو الكود..."
 className="pr-9 h-10 text-xs font-bold rounded-lg border-slate-200"
 />
 </div>
 <div className="text-xs font-bold text-slate-500 px-2">
 أصناف لها بدائل: <span className="font-black text-slate-900 dark:text-white">{productsWithSubstitutes.length}</span>
 </div>
 </div>

 {/* List of Main Items and their Substitutes */}
 <div className="space-y-4">
 {isLoading ? (
 <div className="py-16 text-center text-slate-400 font-bold">
 جاري تحميل شبكة بدائل الأصناف...
 </div>
 ) : productsWithSubstitutes.length === 0 ? (
 <div className="bg-surface p-12 rounded-2xl border border-dashed border-slate-300 dark:border-slate-800 text-center space-y-3">
 <Layers className="w-10 h-10 text-slate-400 mx-auto"/>
 <h3 className="text-sm font-black text-slate-800 dark:text-slate-200">
 لا توجد بدائل مدخلة حالياً
 </h3>
 <p className="text-xs text-slate-500 max-w-sm mx-auto">
 يمكنك ربط البدائل للأصناف بسهولة بالضغط على زر &quot;ربط بديل جديد لصنف&quot; أعلاه أو من شاشة بطاقة أي صنف.
 </p>
 <Button
 onClick={() => handleOpenAdd()}
 className="bg-primary text-white text-xs font-bold rounded-lg mt-2"
 >
 إضافة أول بديل
 </Button>
 </div>
 ) : (
 productsWithSubstitutes.map((mainProd) => {
 const subItems = (mainProd.substitute_ids || [])
 .map((id) => products.find((p) => p.id === id))
 .filter(Boolean) as Product[];

 const mainStock = getStock(mainProd.id);

 return (
 <div
 key={mainProd.id}
 className="bg-surface rounded-2xl border border-slate-200 dark:border-slate-800 p-5 space-y-4 shadow-sm"
 >
 {/* Main Product Bar */}
 <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100 dark:border-slate-800">
 <div className="flex items-center gap-3">
 <div className="w-9 h-9 rounded-lg bg-blue-50 dark:bg-blue-950/40 flex items-center justify-center text-primary">
 <Box className="w-5 h-5"/>
 </div>
 <div>
 <div className="flex items-center gap-2">
 <Link
 href={`/items/${mainProd.id}`}
 className="text-sm font-black text-slate-900 dark:text-white hover:text-blue-600"
 >
 {mainProd.name}
 </Link>
 <span className="text-3xs font-mono text-slate-400 bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded">
 {mainProd.sku}
 </span>
 </div>
 <span className="text-2xs text-slate-500 font-bold">
 السعر: {formatNumber(mainProd.sale_price)} ج.م • الرصيد الحالي: {formatNumber(mainStock)}
 </span>
 </div>
 </div>

 <Button
 variant="outline"
 size="sm"
 onClick={() => handleOpenAdd(mainProd.id)}
 className="h-8 text-xs font-bold rounded-lg border-blue-200 text-blue-600 hover:bg-blue-50"
 >
 <Plus className="w-3.5 h-3.5 ml-1"/>
 إضافة بديل آخر لهذا الصنف
 </Button>
 </div>

 {/* Substitutes Cards */}
 <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
 {subItems.map((sub) => {
 const subStock = getStock(sub.id);
 return (
 <div
 key={sub.id}
 className="bg-slate-50/70 dark:bg-slate-800/40 p-3.5 rounded-xl border border-slate-200/60 dark:border-slate-700/60 flex items-center justify-between hover:bg-slate-100/70 transition-colors"
 >
 <div className="space-y-0.5">
 <Link
 href={`/items/${sub.id}`}
 className="text-xs font-black text-slate-800 dark:text-slate-200 hover:text-blue-600 line-clamp-1"
 >
 {sub.name}
 </Link>
 <div className="text-2xs text-slate-500 flex items-center gap-2">
 <span>{formatNumber(sub.sale_price)} ج.م</span>
 <span>•</span>
 <span className={subStock > 0 ?'text-emerald-600 font-bold':'text-rose-500'}>
 رصيد: {formatNumber(subStock)}
 </span>
 </div>
 </div>

 <Button
 variant="ghost"
 size="sm"
 onClick={() => handleRemoveSubstitute(mainProd.id, sub.id)}
 className="h-7 w-7 p-0 text-slate-400 hover:text-rose-600"
 >
 <Trash2 className="w-3.5 h-3.5"/>
 </Button>
 </div>
 );
 })}
 </div>
 </div>
 );
 })
 )}
 </div>

 {/* Add Substitute Modal */}
 {isModalOpen && (
 <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
 <div className="bg-surface rounded-2xl border border-slate-200 dark:border-slate-800 max-w-md w-full p-6 space-y-4 shadow-xl">
 <h3 className="text-base font-black text-slate-900 dark:text-white">
 ربط بديل لصنف
 </h3>

 <div className="space-y-3">
 <div>
 <label className="text-xs font-black text-slate-700 dark:text-slate-300 block mb-1">
 الصنف الرئيسي
 </label>
 <select
 value={selectedMainProdId}
 onChange={(e) => setSelectedMainProdId(e.target.value)}
 className="w-full h-10 px-3 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 text-xs font-bold"
 >
 {products.map((p) => (
 <option key={p.id} value={p.id}>
 {p.name} ({p.sku})
 </option>
 ))}
 </select>
 </div>

 <div>
 <label className="text-xs font-black text-slate-700 dark:text-slate-300 block mb-1">
 اختر الصنف البديل
 </label>
 <Input
 value={subSearch}
 onChange={(e) => setSubSearch(e.target.value)}
 placeholder="ابحث لاختيار البديل..."
 className="h-9 text-xs mb-2 rounded-lg"
 />

 <div className="max-h-48 overflow-y-auto space-y-1 border border-slate-100 dark:border-slate-800 rounded-lg p-1">
 {products
 .filter((p) => p.id !== selectedMainProdId)
 .filter((p) => !subSearch || p.name.toLowerCase().includes(subSearch.toLowerCase()))
 .slice(0, 15)
 .map((p) => (
 <div
 key={p.id}
 onClick={() => setSelectedSubProdId(p.id)}
 className={`p-2 rounded-md text-xs cursor-pointer flex items-center justify-between ${
 selectedSubProdId === p.id
 ?'bg-blue-50 text-blue-600 font-black'
 :'hover:bg-slate-50 dark:hover:bg-slate-800'
 }`}
 >
 <span>{p.name}</span>
 <span className="text-slate-400 font-mono text-2xs">{formatNumber(p.sale_price)} ج.م</span>
 </div>
 ))}
 </div>
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
 disabled={isSaving || !selectedSubProdId}
 onClick={handleAddSubstitute}
 className="h-9 bg-primary hover:bg-blue-700 text-white text-xs font-black rounded-lg"
 >
 {isSaving ?'جاري الربط...':'تأكيد البديل'}
 </Button>
 </div>
 </div>
 </div>
 )}
 </div>
 );
}

export default function SubstitutesPage() {
 return (
 <AppShell>
 <Suspense fallback={<div className="p-8 text-center text-xs font-bold">جاري تحميل بدائل الأصناف...</div>}>
 <SubstitutesContent />
 </Suspense>
 </AppShell>
 );
}