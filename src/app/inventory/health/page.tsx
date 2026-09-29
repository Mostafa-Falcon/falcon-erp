'use client';

import React, { useEffect, useState } from'react';
import { Suspense } from'react';
import { AppShell } from'@/components/layout/AppShell';
import { Button } from'@/components/ui/button';
import { useSessionStore } from'@/core/state/useSessionStore';
import { db } from'@/core/db/app_database';
import { formatNumber } from'@/lib/format';
import type { Product, StockLevel, InventoryTransaction } from'@/types';
import { HeartPulse, AlertTriangle, CheckCircle, TrendingDown, ShieldAlert, ArrowRight, Activity, PackageX } from'lucide-react';
import Link from'next/link';

function InventoryHealthContent() {
 const { currentUser } = useSessionStore();
 const orgId = currentUser?.org_id ||'';

 const [products, setProducts] = useState<Product[]>([]);
 const [stockLevels, setStockLevels] = useState<StockLevel[]>([]);
 const [transactions, setTransactions] = useState<InventoryTransaction[]>([]);
 const [isLoading, setIsLoading] = useState(true);

 const loadData = async () => {
 if (!orgId) return;
 try {
 setIsLoading(true);
 const [prods, stocks, txs] = await Promise.all([
 db.products.where('org_id').equals(orgId).toArray(),
 db.stock_levels.toArray(),
 db.inventory_transactions.where('org_id').equals(orgId).toArray(),
 ]);
 setProducts(prods);
 setStockLevels(stocks);
 setTransactions(txs);
 } catch (err) {
 console.error('Error loading inventory health data:', err);
 } finally {
 setIsLoading(false);
 }
 };

 useEffect(() => {
 loadData();
 }, [orgId]);

 // Calculations
 const getProductStock = (prodId: string) => {
 return stockLevels
 .filter((s) => s.product_id === prodId)
 .reduce((sum, s) => sum + s.quantity, 0);
 };

 // Zero or negative stock
 const outOfStockItems = products.filter((p) => getProductStock(p.id) <= 0);

 // Low stock (below reorder level or < 5)
 const lowStockItems = products.filter((p) => {
 const stock = getProductStock(p.id);
 const limit = (p as any).min_stock_level || 5;
 return stock > 0 && stock <= limit;
 });

 // Stagnant items (no sale or movement in last 60 days)
 const stagnantItems = products.filter((p) => {
 const hasRecentTx = transactions.some((t) => {
 if (t.product_id !== p.id) return false;
 const txDate = new Date(t.created_at).getTime();
 const twoMonthsAgo = Date.now() - 60 * 24 * 60 * 60 * 1000;
 return txDate > twoMonthsAgo;
 });
 return !hasRecentTx && getProductStock(p.id) > 0;
 });

 // Health Score Calculation (out of 100)
 const totalItems = products.length || 1;
 const issuePercentage = ((outOfStockItems.length + lowStockItems.length + stagnantItems.length) / (totalItems * 3)) * 100;
 const healthScore = Math.max(10, Math.min(100, Math.round(100 - issuePercentage)));

 return (
 <div className="p-6 space-y-6 max-w-7xl mx-auto"dir="rtl">
 {/* Header */}
 <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-surface p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
 <div className="flex items-center gap-3">
 <div className="w-12 h-12 rounded-xl bg-blue-50 dark:bg-blue-950/50 flex items-center justify-center text-primary">
 <HeartPulse className="w-6 h-6"/>
 </div>
 <div>
 <h1 className="text-xl font-black text-slate-900 dark:text-white">صحة وكفاءة المخزون</h1>
 <p className="text-xs text-slate-500 dark:text-slate-400 font-bold mt-0.5">
 مؤشرات جودة التخزين ومعدلات الدوران وتحديد النواقص والبضاعة الراكدة
 </p>
 </div>
 </div>

 <div className="flex items-center gap-2">
 <Link href="/items/bulk-update">
 <Button variant="outline"className="h-10 text-xs font-bold rounded-xl border-slate-200">
 تصفية / تخفيض أسعار الراكد
 </Button>
 </Link>
 <Link href="/inventory/reorder">
 <Button className="h-10 bg-primary hover:bg-blue-700 text-white text-xs font-black rounded-xl">
 إعادة طلب النواقص
 </Button>
 </Link>
 </div>
 </div>

 {/* Main Score Banner */}
 <div className="bg-gradient-to-r from-blue-600 to-indigo-700 text-white p-6 rounded-2xl shadow-lg flex flex-col md:flex-row items-center justify-between gap-6">
 <div className="space-y-2">
 <div className="flex items-center gap-2 text-xs font-black bg-white/20 w-fit px-3 py-1 rounded-full backdrop-blur-sm">
 <Activity className="w-4 h-4"/>
 <span>مؤشر الصحة العام للمخازن</span>
 </div>
 <h2 className="text-2xl font-black">
 {healthScore >= 80 ?'المخزون في حالة ممتازة ومستقرة': healthScore >= 60 ?'المخزون بحالة جيدة مع بعض الملاحظات':'يتطلب المخزون تدخل فوري لتصفية الراكد وإعادة الطلب'}
 </h2>
 <p className="text-xs text-blue-100 max-w-xl font-bold">
 تم تقييم معدل دوران {products.length} صنف مسجل وحساب نسبة الركود والنواقص تلقائياً.
 </p>
 </div>

 <div className="flex items-center gap-4 bg-white/10 backdrop-blur-md p-4 rounded-2xl border border-white/20 shrink-0">
 <div className="text-center">
 <span className="text-4xl font-black">{healthScore}%</span>
 <span className="block text-2xs font-bold text-blue-200 mt-1">درجة السلامة</span>
 </div>
 </div>
 </div>

 {/* KPI Cards */}
 <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
 <div className="bg-surface p-5 rounded-2xl border border-slate-200 dark:border-slate-800 space-y-2">
 <div className="flex items-center justify-between">
 <span className="text-xs font-bold text-slate-500">أصناف نافدة بالكامل (رصيد صفر)</span>
 <div className="w-8 h-8 rounded-lg bg-rose-50 dark:bg-rose-950/40 text-rose-600 flex items-center justify-center">
 <PackageX className="w-4 h-4"/>
 </div>
 </div>
 <div className="text-2xl font-black text-rose-600">{outOfStockItems.length} صنف</div>
 <p className="text-2xs text-slate-400 font-bold">تتسبب في خسارة فرص بيع محققة</p>
 </div>

 <div className="bg-surface p-5 rounded-2xl border border-slate-200 dark:border-slate-800 space-y-2">
 <div className="flex items-center justify-between">
 <span className="text-xs font-bold text-slate-500">أوشكت على النفاد (حد الطلب)</span>
 <div className="w-8 h-8 rounded-lg bg-amber-50 dark:bg-amber-950/40 text-amber-600 flex items-center justify-center">
 <AlertTriangle className="w-4 h-4"/>
 </div>
 </div>
 <div className="text-2xl font-black text-amber-600">{lowStockItems.length} صنف</div>
 <p className="text-2xs text-slate-400 font-bold">تحتاج لإصدار أوامر شراء عاجلة</p>
 </div>

 <div className="bg-surface p-5 rounded-2xl border border-slate-200 dark:border-slate-800 space-y-2">
 <div className="flex items-center justify-between">
 <span className="text-xs font-bold text-slate-500">أصناف راكدة (بدون حركة 60+ يوم)</span>
 <div className="w-8 h-8 rounded-lg bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 flex items-center justify-center">
 <TrendingDown className="w-4 h-4"/>
 </div>
 </div>
 <div className="text-2xl font-black text-indigo-600">{stagnantItems.length} صنف</div>
 <p className="text-2xs text-slate-400 font-bold">رأس مال معطل يمكن استغلاله بعروض</p>
 </div>
 </div>

 {/* Stagnant Items Breakdown */}
 <div className="bg-surface rounded-2xl border border-slate-200 dark:border-slate-800 p-6 space-y-4 shadow-sm">
 <h3 className="text-base font-black text-slate-900 dark:text-white">
 قائمة أبرز الأصناف الراكدة المعطلة للسيولة
 </h3>

 <div className="overflow-x-auto">
 <table className="w-full text-right border-collapse text-xs">
 <thead>
 <tr className="bg-slate-50 dark:bg-slate-800 text-2xs font-black text-slate-500 border-b border-slate-200 dark:border-slate-700">
 <th className="py-3 px-4">الصنف</th>
 <th className="py-3 px-4">الكود</th>
 <th className="py-3 px-4">الرصيد الراكد</th>
 <th className="py-3 px-4">سعر التكلفة</th>
 <th className="py-3 px-4">إجمالي رأس المال المعطل</th>
 <th className="py-3 px-4 text-center">الإجراء الموصى به</th>
 </tr>
 </thead>
 <tbody className="divide-y divide-slate-100 dark:divide-slate-800 font-bold">
 {stagnantItems.length === 0 ? (
 <tr>
 <td colSpan={6} className="py-8 text-center text-slate-400">
 رائع! لا توجد أصناف راكدة في المخزون حالياً ومعدل الدوران سليم
 </td>
 </tr>
 ) : (
 stagnantItems.slice(0, 10).map((p) => {
 const stock = getProductStock(p.id);
 const tiedValue = stock * (p.cost_price || 0);

 return (
 <tr key={p.id}>
 <td className="py-3 px-4 font-black text-slate-900 dark:text-white">{p.name}</td>
 <td className="py-3 px-4 font-mono text-slate-400">{p.sku}</td>
 <td className="py-3 px-4">{formatNumber(stock)}</td>
 <td className="py-3 px-4">{formatNumber(p.cost_price || 0)} ج.م</td>
 <td className="py-3 px-4 font-black text-rose-600">{formatNumber(tiedValue)} ج.م</td>
 <td className="py-3 px-4 text-center">
 <Link href="/items/discounts">
 <Button variant="outline"size="sm"className="h-7 text-3xs font-black rounded-md">
 تطبيق خصم للتصفية
 </Button>
 </Link>
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

export default function InventoryHealthPage() {
 return (
 <AppShell>
 <Suspense fallback={<div className="p-8 text-center text-xs font-bold">جاري فحص صحة المخزون...</div>}>
 <InventoryHealthContent />
 </Suspense>
 </AppShell>
 );
}