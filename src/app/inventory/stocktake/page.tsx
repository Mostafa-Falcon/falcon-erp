'use client';

import React, { useEffect, useState } from'react';
import { Suspense } from'react';
import { AppShell } from'@/components/layout/AppShell';
import { Button } from'@/components/ui/button';
import { Input } from'@/components/ui/input';
import {
 Select,
 SelectContent,
 SelectItem,
 SelectTrigger,
 SelectValue,
} from'@/components/ui/select';
import { useSessionStore } from'@/core/state/useSessionStore';
import { db } from'@/core/db/app_database';
import { formatNumber, formatDateTime } from'@/lib/format';
import type { StocktakeSession, StocktakeItem, Warehouse, Product } from'@/types';
import { ClipboardCheck, Plus, Search, CheckCircle2, Clock, XCircle, Box, AlertTriangle } from'lucide-react';
import { StocktakeRepository } from'@/modules/inventory/stocktake/stocktake_repository';

function StocktakeContent() {
 const { currentUser, activeBranchId } = useSessionStore();
 const orgId = currentUser?.org_id ||'';
 const branchId = activeBranchId || currentUser?.branch_id ||'';

 const [sessions, setSessions] = useState<StocktakeSession[]>([]);
 const [warehouses, setWarehouses] = useState<Warehouse[]>([]);
 const [products, setProducts] = useState<Product[]>([]);
 const [isLoading, setIsLoading] = useState(true);
 const [searchQuery, setSearchQuery] = useState('');
 const [statusFilter, setStatusFilter] = useState<string>('all');

 // New Session Modal
 const [isNewModalOpen, setIsNewModalOpen] = useState(false);
 const [selectedWarehouseId, setSelectedWarehouseId] = useState('');
 const [sessionNotes, setSessionNotes] = useState('');
 const [isSubmitting, setIsSubmitting] = useState(false);

 // Active Session Details Modal
 const [activeSession, setActiveSession] = useState<StocktakeSession | null>(null);
 const [sessionItems, setSessionItems] = useState<StocktakeItem[]>([]);

 const loadData = async () => {
 if (!orgId) return;
 try {
 setIsLoading(true);
 const [sessList, whList, prodList] = await Promise.all([
 db.stocktake_sessions.where('org_id').equals(orgId).reverse().sortBy('created_at'),
 db.warehouses.where('org_id').equals(orgId).toArray(),
 db.products.where('org_id').equals(orgId).toArray(),
 ]);
 setSessions(sessList);
 setWarehouses(whList);
 setProducts(prodList);
 if (whList.length > 0 && !selectedWarehouseId) {
 setSelectedWarehouseId(whList[0].id);
 }
 } catch (err) {
 console.error('Error loading stocktake data:', err);
 } finally {
 setIsLoading(false);
 }
 };

 useEffect(() => {
 loadData();
 }, [orgId, branchId]);

 const handleCreateSession = async () => {
 if (!orgId || !selectedWarehouseId) return;
 try {
 setIsSubmitting(true);
 const newSession = await StocktakeRepository.createStocktakeSession({
 orgId,
 branchId,
 warehouseId: selectedWarehouseId,
 userId: currentUser?.id ||'system',
 notes: sessionNotes || undefined,
 });

 // Seed items from current stock levels
 const stockLevels = await db.stock_levels
 .where('warehouse_id')
 .equals(selectedWarehouseId)
 .toArray();

 const itemsToCreate: Omit<StocktakeItem,'id'|'session_id'>[] = stockLevels.map((sl) => {
 const prod = products.find((p) => p.id === sl.product_id);
 const cost = prod?.cost_price || 0;
 return {
 product_id: sl.product_id,
 batch_id: null,
 expected_quantity: sl.quantity,
 actual_quantity: sl.quantity,
 difference_quantity: 0,
 unit_cost: cost,
 difference_value: 0,
 };
 });

 await StocktakeRepository.updateStocktakeItems(newSession.id, itemsToCreate);

 setIsNewModalOpen(false);
 setSessionNotes('');
 await loadData();
 } catch (err) {
 console.error('Error creating stocktake session:', err);
 } finally {
 setIsSubmitting(false);
 }
 };

 const handleViewSession = async (sess: StocktakeSession) => {
 setActiveSession(sess);
 try {
 const { items } = await StocktakeRepository.getStocktakeDetail(sess.id);
 setSessionItems(items);
 } catch (err) {
 console.error('Error fetching session items:', err);
 }
 };

 const handleCompleteSession = async (sessionId: string) => {
 try {
 const result = await StocktakeRepository.commitStocktakeSession(
 sessionId,
 currentUser?.id ||'system'
 );
 if (!result.success) {
 console.error('Error completing session:', result.error);
 return;
 }
 setActiveSession(null);
 await loadData();
 } catch (err) {
 console.error('Error completing session:', err);
 }
 };

 const filteredSessions = sessions.filter((s) => {
 const matchQuery = s.session_number.toLowerCase().includes(searchQuery.toLowerCase()) ||
 (s.notes && s.notes.toLowerCase().includes(searchQuery.toLowerCase()));
 const matchStatus = statusFilter ==='all'|| s.status === statusFilter;
 return matchQuery && matchStatus;
 });

 const getWarehouseName = (whId: string) => {
 return warehouses.find((w) => w.id === whId)?.name ||'المستودع الرئيسي';
 };

 return (
 <div className="p-6 space-y-6 max-w-7xl mx-auto"dir="rtl">
 {/* Header */}
 <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-surface p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
 <div className="flex items-center gap-3">
 <div className="w-12 h-12 rounded-xl bg-blue-50 dark:bg-blue-950/50 flex items-center justify-center text-primary">
 <ClipboardCheck className="w-6 h-6"/>
 </div>
 <div>
 <h1 className="text-xl font-black text-slate-900 dark:text-white">الجرد الفعلي للمخزون</h1>
 <p className="text-xs text-slate-500 dark:text-slate-400 font-bold mt-0.5">
 جلسات جرد الأصناف، مقارنة الأرصدة الدفترية بالفعلية، واعتماد الفروقات
 </p>
 </div>
 </div>

 <Button
 onClick={() => setIsNewModalOpen(true)}
 className="bg-primary hover:bg-blue-700 text-white font-black text-xs h-10 px-5 rounded-xl flex items-center gap-2 shadow-md shadow-blue-500/20"
 >
 <Plus className="w-4 h-4"/>
 بدء جلسة جرد جديدة
 </Button>
 </div>

 {/* KPI Cards */}
 <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
 <div className="bg-surface p-4 rounded-xl border border-slate-200 dark:border-slate-800 flex items-center gap-3">
 <div className="w-10 h-10 rounded-lg bg-blue-50 dark:bg-blue-950/40 text-blue-600 flex items-center justify-center font-bold">
 <Box className="w-5 h-5"/>
 </div>
 <div>
 <span className="text-xs font-bold text-slate-500">إجمالي الجلسات</span>
 <div className="text-lg font-black text-slate-900 dark:text-white">{sessions.length}</div>
 </div>
 </div>

 <div className="bg-surface p-4 rounded-xl border border-slate-200 dark:border-slate-800 flex items-center gap-3">
 <div className="w-10 h-10 rounded-lg bg-amber-50 dark:bg-amber-950/40 text-amber-600 flex items-center justify-center font-bold">
 <Clock className="w-5 h-5"/>
 </div>
 <div>
 <span className="text-xs font-bold text-slate-500">جلسات قيد المراجعة (مسودة)</span>
 <div className="text-lg font-black text-slate-900 dark:text-white">
 {sessions.filter((s) => s.status ==='draft').length}
 </div>
 </div>
 </div>

 <div className="bg-surface p-4 rounded-xl border border-slate-200 dark:border-slate-800 flex items-center gap-3">
 <div className="w-10 h-10 rounded-lg bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 flex items-center justify-center font-bold">
 <CheckCircle2 className="w-5 h-5"/>
 </div>
 <div>
 <span className="text-xs font-bold text-slate-500">جلسات معتمدة ومكتملة</span>
 <div className="text-lg font-black text-slate-900 dark:text-white">
 {sessions.filter((s) => s.status ==='completed').length}
 </div>
 </div>
 </div>
 </div>

 {/* Filters & Search */}
 <div className="flex flex-col sm:flex-row items-center gap-3 bg-surface p-4 rounded-xl border border-slate-200 dark:border-slate-800">
 <div className="relative flex-1 w-full">
 <Search className="w-4 h-4 absolute right-3 top-3 text-slate-400"/>
 <Input
 value={searchQuery}
 onChange={(e) => setSearchQuery(e.target.value)}
 placeholder="البحث برقم الجلسة أو الملاحظات..."
 className="pr-9 h-10 text-xs font-bold rounded-lg border-slate-200 dark:border-slate-800"
 />
 </div>

 <Select value={statusFilter} onValueChange={setStatusFilter}>
 <SelectTrigger className="w-full sm:w-48 h-10 text-xs font-bold rounded-lg">
 <SelectValue placeholder="الحالة"/>
 </SelectTrigger>
 <SelectContent>
 <SelectItem value="all">كل الحالات</SelectItem>
 <SelectItem value="draft">مسودة (جارية)</SelectItem>
 <SelectItem value="completed">مكتملة ومعتمدة</SelectItem>
 <SelectItem value="cancelled">ملغاة</SelectItem>
 </SelectContent>
 </Select>
 </div>

 {/* Sessions List */}
 <div className="bg-surface rounded-2xl border border-slate-200 dark:border-slate-800 overflow-hidden shadow-sm">
 <div className="overflow-x-auto">
 <table className="w-full text-right border-collapse">
 <thead>
 <tr className="bg-slate-50 dark:bg-slate-800/60 border-b border-slate-200 dark:border-slate-800 text-2xs font-black text-slate-500">
 <th className="py-3.5 px-4">رقم الجلسة</th>
 <th className="py-3.5 px-4">المستودع</th>
 <th className="py-3.5 px-4">تاريخ البدء</th>
 <th className="py-3.5 px-4">الحالة</th>
 <th className="py-3.5 px-4">فارق القيمة</th>
 <th className="py-3.5 px-4 text-center">الإجراء</th>
 </tr>
 </thead>
 <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-xs font-bold text-slate-700 dark:text-slate-300">
 {isLoading ? (
 <tr>
 <td colSpan={6} className="py-12 text-center text-slate-400 font-bold">
 جاري تحميل سجلات الجرد الفعلي...
 </td>
 </tr>
 ) : filteredSessions.length === 0 ? (
 <tr>
 <td colSpan={6} className="py-12 text-center text-slate-400 font-bold">
 لا توجد جلسات جرد مطابقة
 </td>
 </tr>
 ) : (
 filteredSessions.map((s) => (
 <tr key={s.id} className="hover:bg-slate-50/70 dark:hover:bg-slate-800/40 transition-colors">
 <td className="py-3 px-4 font-black text-primary">{s.session_number}</td>
 <td className="py-3 px-4">{getWarehouseName(s.warehouse_id)}</td>
 <td className="py-3 px-4 text-slate-500 text-2xs">{formatDateTime(s.created_at)}</td>
 <td className="py-3 px-4">
 {s.status ==='completed'&& (
 <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-3xs font-black bg-emerald-50 text-emerald-600 dark:bg-emerald-950/40">
 <CheckCircle2 className="w-3 h-3"/> معتمدة
 </span>
 )}
 {s.status ==='draft'&& (
 <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-3xs font-black bg-amber-50 text-amber-600 dark:bg-amber-950/40">
 <Clock className="w-3 h-3"/> مسودة جارية
 </span>
 )}
 {s.status ==='cancelled'&& (
 <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-3xs font-black bg-rose-50 text-rose-600 dark:bg-rose-950/40">
 <XCircle className="w-3 h-3"/> ملغاة
 </span>
 )}
 </td>
 <td className="py-3 px-4 font-black text-slate-900 dark:text-white">
 {formatNumber(s.total_difference_value || 0)} ج.م
 </td>
 <td className="py-3 px-4 text-center">
 <Button
 variant="outline"
 size="sm"
 onClick={() => handleViewSession(s)}
 className="h-8 text-xs font-bold rounded-lg border-slate-200 dark:border-slate-700 hover:bg-blue-50 hover:text-blue-600"
 >
 عرض التفاصيل
 </Button>
 </td>
 </tr>
 ))
 )}
 </tbody>
 </table>
 </div>
 </div>

 {/* New Session Modal */}
 {isNewModalOpen && (
 <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
 <div className="bg-surface rounded-2xl border border-slate-200 dark:border-slate-800 max-w-md w-full p-6 space-y-4 shadow-xl">
 <h3 className="text-base font-black text-slate-900 dark:text-white">بدء جلسة جرد فعلي جديدة</h3>
 <p className="text-xs text-slate-500 font-bold">
 سيتم تحميل قائمة الأصناف المخزنة حالياً في المستودع المحدد لمقارنتها بالعد الفعلي.
 </p>

 <div className="space-y-3">
 <div>
 <label className="text-xs font-black text-slate-700 dark:text-slate-300 block mb-1">المستودع</label>
 <Select value={selectedWarehouseId} onValueChange={setSelectedWarehouseId}>
 <SelectTrigger className="h-10 text-xs font-bold rounded-lg w-full">
 <SelectValue placeholder="اختر المستودع"/>
 </SelectTrigger>
 <SelectContent>
 {warehouses.map((w) => (
 <SelectItem key={w.id} value={w.id}>
 {w.name}
 </SelectItem>
 ))}
 </SelectContent>
 </Select>
 </div>

 <div>
 <label className="text-xs font-black text-slate-700 dark:text-slate-300 block mb-1">ملاحظات الجلسة</label>
 <Input
 value={sessionNotes}
 onChange={(e) => setSessionNotes(e.target.value)}
 placeholder="مثال: جرد دوري نهاية الشهر أو قسم محدد"
 className="h-10 text-xs font-bold rounded-lg"
 />
 </div>
 </div>

 <div className="flex items-center justify-end gap-2 pt-2">
 <Button
 variant="outline"
 onClick={() => setIsNewModalOpen(false)}
 className="h-9 text-xs font-bold rounded-lg"
 >
 إلغاء
 </Button>
 <Button
 disabled={isSubmitting || !selectedWarehouseId}
 onClick={handleCreateSession}
 className="h-9 bg-primary hover:bg-blue-700 text-white text-xs font-black rounded-lg"
 >
 {isSubmitting ?'جاري الإنشاء...':'بدء الجلسة'}
 </Button>
 </div>
 </div>
 </div>
 )}

 {/* View Session Details Modal */}
 {activeSession && (
 <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
 <div className="bg-surface rounded-2xl border border-slate-200 dark:border-slate-800 max-w-2xl w-full p-6 space-y-4 shadow-xl max-h-[85vh] flex flex-col">
 <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
 <div>
 <h3 className="text-base font-black text-slate-900 dark:text-white">
 تفاصيل الجلسة: {activeSession.session_number}
 </h3>
 <span className="text-xs text-slate-500 font-bold">
 {getWarehouseName(activeSession.warehouse_id)} • {formatDateTime(activeSession.created_at)}
 </span>
 </div>
 <Button variant="ghost"size="sm"onClick={() => setActiveSession(null)}>
 إغلاق
 </Button>
 </div>

 <div className="flex-1 overflow-y-auto space-y-2">
 <table className="w-full text-right border-collapse text-xs">
 <thead>
 <tr className="bg-slate-50 dark:bg-slate-800 text-2xs font-black text-slate-500 border-b border-slate-200 dark:border-slate-700">
 <th className="py-2 px-3">الصنف</th>
 <th className="py-2 px-3">الرصيد الدفتري</th>
 <th className="py-2 px-3">العد الفعلي</th>
 <th className="py-2 px-3">الفارق</th>
 </tr>
 </thead>
 <tbody className="divide-y divide-slate-100 dark:divide-slate-800 font-bold">
 {sessionItems.length === 0 ? (
 <tr>
 <td colSpan={4} className="py-6 text-center text-slate-400">
 لا توجد أصناف مسجلة في هذه الجلسة
 </td>
 </tr>
 ) : (
 sessionItems.map((it) => {
 const prod = products.find((p) => p.id === it.product_id);
 return (
 <tr key={it.id}>
 <td className="py-2 px-3">{prod?.name ||'صنف غير معرف'}</td>
 <td className="py-2 px-3">{it.expected_quantity}</td>
 <td className="py-2 px-3">{it.actual_quantity}</td>
 <td className="py-2 px-3">
 <span
 className={
 it.difference_quantity === 0
 ?'text-emerald-600'
 : it.difference_quantity < 0
 ?'text-rose-600'
 :'text-blue-600'
 }
 >
 {it.difference_quantity > 0 ?`+${it.difference_quantity}`: it.difference_quantity}
 </span>
 </td>
 </tr>
 );
 })
 )}
 </tbody>
 </table>
 </div>

 <div className="flex items-center justify-between pt-3 border-t border-slate-100 dark:border-slate-800">
 <div className="text-xs font-bold text-slate-500">
 الحالة: <span className="font-black text-slate-800 dark:text-slate-200">{activeSession.status}</span>
 </div>
 <div className="flex items-center gap-2">
 {activeSession.status ==='draft'&& (
 <Button
 onClick={() => handleCompleteSession(activeSession.id)}
 className="bg-emerald-600 hover:bg-emerald-700 text-white font-black text-xs h-9 rounded-lg"
 >
 اعتماد وإغلاق الجلسة
 </Button>
 )}
 <Button variant="outline"onClick={() => setActiveSession(null)} className="h-9 text-xs rounded-lg">
 إغلاق
 </Button>
 </div>
 </div>
 </div>
 </div>
 )}
 </div>
 );
}

export default function StocktakePage() {
 return (
 <AppShell>
 <Suspense fallback={<div className="p-8 text-center text-xs font-bold">جاري تحميل الجرد الفعلي...</div>}>
 <StocktakeContent />
 </Suspense>
 </AppShell>
 );
}