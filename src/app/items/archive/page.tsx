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
import type { Product } from'@/types';
import { Archive, Search, RotateCcw, Box, CheckCircle2 } from'lucide-react';
import Link from'next/link';

function ArchiveContent() {
 const { currentUser } = useSessionStore();
 const orgId = currentUser?.org_id ||'';

 const [archivedProducts, setArchivedProducts] = useState<Product[]>([]);
 const [isLoading, setIsLoading] = useState(true);
 const [searchQuery, setSearchQuery] = useState('');
 const [actionMessage, setActionMessage] = useState('');

 const loadData = async () => {
 if (!orgId) return;
 try {
 setIsLoading(true);
 const allProds = await db.products.where('org_id').equals(orgId).toArray();
 // Filter inactive or deleted items
 const archived = allProds.filter((p) => p.is_active === false || (p as any).is_deleted);
 setArchivedProducts(archived);
 } catch (err) {
 console.error('Error loading archived products:', err);
 } finally {
 setIsLoading(false);
 }
 };

 useEffect(() => {
 loadData();
 }, [orgId]);

 const handleRestore = async (prod: Product) => {
 try {
 const restored: Product = {
 ...prod,
 is_active: true,
 updated_at: new Date().toISOString(),
 sync_status:'pending',
 };
 await db.transaction('rw', [db.products, db.sync_queue], async () => {
 await db.products.put(restored);
 await SyncQueueManager.enqueue('products', prod.id,'update', restored);
 });
 setActionMessage(`تمت استعادة الصنف"${prod.name}"بنجاح إلى قائمة الأصناف النشطة`);
 await loadData();
 } catch (err) {
 console.error('Error restoring product:', err);
 }
 };

 const filteredProducts = archivedProducts.filter(
 (p) =>
 p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
 (p.sku && p.sku.toLowerCase().includes(searchQuery.toLowerCase()))
 );

 return (
 <div className="p-6 space-y-6 max-w-7xl mx-auto"dir="rtl">
 {/* Header */}
 <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-surface p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
 <div className="flex items-center gap-3">
 <div className="w-12 h-12 rounded-xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-600 dark:text-slate-300">
 <Archive className="w-6 h-6"/>
 </div>
 <div>
 <h1 className="text-xl font-black text-slate-900 dark:text-white">أرشيف الأصناف غير النشطة</h1>
 <p className="text-xs text-slate-500 dark:text-slate-400 font-bold mt-0.5">
 الأصناف المؤرشفة أو المعطلة مؤقتاً، مع إمكانية استعادتها للعمل في أي وقت
 </p>
 </div>
 </div>

 <Link href="/items">
 <Button variant="outline"className="h-10 text-xs font-bold rounded-xl border-slate-200">
 العودة لقائمة الأصناف النشطة
 </Button>
 </Link>
 </div>

 {actionMessage && (
 <div className="bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 text-emerald-700 p-4 rounded-xl text-xs font-black flex items-center gap-2">
 <CheckCircle2 className="w-4 h-4 text-emerald-600"/>
 {actionMessage}
 </div>
 )}

 {/* Search Bar */}
 <div className="flex items-center gap-3 bg-surface p-4 rounded-xl border border-slate-200 dark:border-slate-800">
 <div className="relative flex-1">
 <Search className="w-4 h-4 absolute right-3 top-3 text-slate-400"/>
 <Input
 value={searchQuery}
 onChange={(e) => setSearchQuery(e.target.value)}
 placeholder="البحث في الأرشيف بالاسم أو الكود..."
 className="pr-9 h-10 text-xs font-bold rounded-lg border-slate-200"
 />
 </div>
 <div className="text-xs font-bold text-slate-500 px-2">
 إجمالي المؤرشف: <span className="font-black text-slate-900 dark:text-white">{archivedProducts.length}</span>
 </div>
 </div>

 {/* Archive Table */}
 <div className="bg-surface rounded-2xl border border-slate-200 dark:border-slate-800 overflow-hidden shadow-sm">
 <div className="overflow-x-auto">
 <table className="w-full text-right border-collapse">
 <thead>
 <tr className="bg-slate-50 dark:bg-slate-800/60 border-b border-slate-200 dark:border-slate-800 text-2xs font-black text-slate-500">
 <th className="py-3.5 px-4">اسم الصنف</th>
 <th className="py-3.5 px-4">الكود التعريفي</th>
 <th className="py-3.5 px-4">سعر التكلفة</th>
 <th className="py-3.5 px-4">سعر البيع</th>
 <th className="py-3.5 px-4 text-center">الإجراء</th>
 </tr>
 </thead>
 <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-xs font-bold text-slate-700 dark:text-slate-300">
 {isLoading ? (
 <tr>
 <td colSpan={5} className="py-12 text-center text-slate-400 font-bold">
 جاري فحص الأرشيف...
 </td>
 </tr>
 ) : filteredProducts.length === 0 ? (
 <tr>
 <td colSpan={5} className="py-12 text-center text-slate-400 font-bold">
 لا توجد أصناف مؤرشفة حالياً
 </td>
 </tr>
 ) : (
 filteredProducts.map((p) => (
 <tr key={p.id} className="hover:bg-slate-50/70 dark:hover:bg-slate-800/40 transition-colors">
 <td className="py-3 px-4 font-black text-slate-900 dark:text-white">{p.name}</td>
 <td className="py-3 px-4 font-mono text-slate-400 text-2xs">{p.sku}</td>
 <td className="py-3 px-4">{formatNumber(p.cost_price || 0)} ج.م</td>
 <td className="py-3 px-4 font-black text-slate-900 dark:text-white">
 {formatNumber(p.sale_price)} ج.م
 </td>
 <td className="py-3 px-4 text-center">
 <Button
 size="sm"
 onClick={() => handleRestore(p)}
 className="h-8 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-black rounded-lg flex items-center gap-1 mx-auto"
 >
 <RotateCcw className="w-3.5 h-3.5"/>
 استعادة للنشط
 </Button>
 </td>
 </tr>
 ))
 )}
 </tbody>
 </table>
 </div>
 </div>
 </div>
 );
}

export default function ArchivePage() {
 return (
 <AppShell>
 <Suspense fallback={<div className="p-8 text-center text-xs font-bold">جاري تحميل أرشيف الأصناف...</div>}>
 <ArchiveContent />
 </Suspense>
 </AppShell>
 );
}