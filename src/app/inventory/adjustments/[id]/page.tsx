'use client';

import React, { useEffect, useState, use } from'react';
import { useRouter } from'next/navigation';
import Link from'next/link';
import { AppShell } from'@/components/layout/AppShell';
import { Button } from'@/components/ui/button';
import { Badge } from'@/components/ui/badge';
import { ScrollArea } from'@/components/ui/scroll-area';
import {
 Table,
 TableBody,
 TableCell,
 TableHead,
 TableHeader,
 TableRow,
} from'@/components/ui/table';
import { Skeleton } from'@/components/ui/skeleton';
import { useSessionStore } from'@/core/state/useSessionStore';
import { InventoryRepository } from'@/modules/inventory/inventory_repository';
import { formatNumber, formatDate, formatDateTime } from'@/lib/format';
import { cn } from'@/lib/utils';
import {
 ArrowRight,
 Printer,
 Check,
 Trash2,
 Warehouse as WarehouseIcon,
 Calendar,
 User as UserIcon,
 FileText,
 AlertTriangle,
 CheckCircle2,
 Plus,
 Package,
 ArrowUpDown,
} from'lucide-react';
import type { StocktakeSession, StocktakeItem, Product, Warehouse, User, Unit } from'@/types';
import { toast } from'sonner';

interface EnrichedItem extends StocktakeItem {
 product?: Product;
 unitName?: string;
}

export default function StocktakeDetailPage({
 params,
}: {
 params: Promise<{ id: string }>;
}) {
 const resolvedParams = use(params);
 const sessionId = resolvedParams.id;

 const router = useRouter();
 const { currentUser } = useSessionStore();

 const [session, setSession] = useState<StocktakeSession | null>(null);
 const [items, setItems] = useState<EnrichedItem[]>([]);
 const [warehouse, setWarehouse] = useState<Warehouse | null>(null);
 const [creator, setCreator] = useState<User | null>(null);
 const [isLoading, setIsLoading] = useState(true);
 const [isCommitting, setIsCommitting] = useState(false);
 const [isDeleting, setIsDeleting] = useState(false);

 const loadData = async () => {
 try {
 const { db } = await import('@/core/db/app_database');
 const { session: sess, items: rawItems } = await InventoryRepository.getStocktakeDetail(sessionId);

 setSession(sess);

 const [wh, usr, prods, unts] = await Promise.all([
 db.warehouses.get(sess.warehouse_id),
 db.users.get(sess.created_by),
 db.products.where('org_id').equals(sess.org_id).toArray(),
 db.units.where('org_id').equals(sess.org_id).toArray(),
 ]);

 setWarehouse(wh || null);
 setCreator(usr || null);

 const prodsMap = new Map(prods.map((p) => [p.id, p]));
 const untsMap = new Map(unts.map((u) => [u.id, u]));

 const enriched: EnrichedItem[] = rawItems.map((it) => {
 const prod = prodsMap.get(it.product_id);
 const unit = prod?.base_unit_id ? untsMap.get(prod.base_unit_id) : undefined;
 return {
 ...it,
 product: prod,
 unitName: unit?.name ||'قطعة',
 };
 });

 setItems(enriched);
 } catch (err) {
 console.error(err);
 toast.error('لم يتم العثور على جلسة الجرد أو حدث خطأ في التحميل.');
 router.push('/inventory/adjustments');
 } finally {
 setIsLoading(false);
 }
 };

 useEffect(() => {
 loadData();
 }, [sessionId]);

 const handleCommit = async () => {
 if (!session || session.status !=='draft') return;
 if (!confirm('هل أنت متأكد من اعتماد وتسوية هذا الجرد وتحديث أرصدة المخزن؟')) return;

 setIsCommitting(true);
 try {
 const res = await InventoryRepository.commitStocktakeSession(session.id, currentUser!.id);
 if (!res.success) throw new Error(res.error);
 toast.success('تم اعتماد الجرد وتحديث أرصدة المخازن بنجاح.');
 await loadData();
 } catch (err) {
 console.error(err);
 toast.error(err instanceof Error ? err.message :'حدث خطأ أثناء اعتماد الجرد.');
 } finally {
 setIsCommitting(false);
 }
 };

 const handleDelete = async () => {
 if (!session || session.status !=='draft') return;
 if (!confirm(`هل أنت متأكد من حذف مسودة الجرد رقم ${session.session_number}؟`)) return;

 setIsDeleting(true);
 try {
 const res = await InventoryRepository.deleteStocktakeSession(session.id);
 if (!res.success) throw new Error(res.error);
 toast.success('تم حذف مسودة الجرد بنجاح.');
 router.push('/inventory/adjustments');
 } catch (err) {
 console.error(err);
 toast.error(err instanceof Error ? err.message :'حدث خطأ أثناء حذف الجرد.');
 setIsDeleting(false);
 }
 };

 // إحصائيات الجلسة
 const stats = React.useMemo(() => {
 let matchCount = 0;
 let shortageCount = 0;
 let surplusCount = 0;
 let totalShortageVal = 0;
 let totalSurplusVal = 0;

 for (const it of items) {
 if (it.difference_quantity === 0) {
 matchCount++;
 } else if (it.difference_quantity < 0) {
 shortageCount++;
 totalShortageVal += Math.abs(it.difference_value);
 } else {
 surplusCount++;
 totalSurplusVal += it.difference_value;
 }
 }

 return {
 matchCount,
 shortageCount,
 surplusCount,
 totalShortageVal,
 totalSurplusVal,
 };
 }, [items]);

 if (isLoading || !session) {
 return (
 <AppShell title="تفاصيل الجرد المخزوني"subtitle="جاري التحميل...">
 <div className="space-y-4">
 <Skeleton className="h-32 w-full rounded-2xl"/>
 <Skeleton className="h-96 w-full rounded-2xl"/>
 </div>
 </AppShell>
 );
 }

 return (
 <AppShell
 title={`تقرير جرد رقم: ${session.session_number}`}
 subtitle="استعراض ومراجعة بيانات الحصر والفروقات الدفترية والأثر المالي"
 actions={
 <div className="flex items-center gap-2">
 <Link href="/inventory/adjustments">
 <Button variant="outline"size="sm"className="h-10 px-4 text-xs font-black rounded-xl gap-1.5">
 <ArrowRight className="w-4 h-4"/>
 <span>العودة للقائمة</span>
 </Button>
 </Link>

 <Button
 variant="outline"
 size="sm"
 onClick={() => window.print()}
 className="h-10 px-4 text-xs font-black rounded-xl gap-1.5 border-slate-300 dark:border-slate-700"
 >
 <Printer className="w-4 h-4"/>
 <span>طباعة التقرير</span>
 </Button>

 {session.status ==='draft'&& (
 <>
 <Button
 variant="outline"
 size="sm"
 onClick={handleDelete}
 disabled={isDeleting || isCommitting}
 className="h-10 px-4 text-xs font-black rounded-xl gap-1.5 text-red-600 border-red-200 hover:bg-red-50 dark:border-red-900/50"
 >
 <Trash2 className="w-4 h-4"/>
 <span>حذف المسودة</span>
 </Button>

 <Button
 size="sm"
 onClick={handleCommit}
 disabled={isCommitting || isDeleting}
 className="h-10 px-5 bg-[#558b2f] hover:bg-[#436d25] text-white text-xs font-black rounded-xl shadow-md gap-1.5"
 >
 <Check className="w-4 h-4"/>
 <span>اعتماد وتسوية الجرد الآن</span>
 </Button>
 </>
 )}
 </div>
 }
 >
 <div className="space-y-5">
 {/* كارت رأس التقرير ومعلومات الجلسة */}
 <div className="bg-surface rounded-2xl border border-slate-200/80 dark:border-slate-800 p-6 shadow-sm">
 <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-100 dark:border-slate-800 pb-5">
 <div>
 <div className="flex items-center gap-3">
 <h2 className="text-xl font-black text-slate-900 dark:text-white font-mono">
 {session.session_number}
 </h2>
 <Badge
 className={cn(
'font-black text-xs px-3 py-1',
 session.status ==='completed'
 ?'bg-emerald-50 text-emerald-700 border-emerald-200'
 : session.status ==='draft'
 ?'bg-blue-50 text-blue-700 border-blue-200'
 :'bg-red-50 text-red-700 border-red-200'
 )}
 variant="outline"
 >
 {session.status ==='completed'?'معتمد ومُسوّى': session.status ==='draft'?'مسودة معلقة':'ملغي'}
 </Badge>
 </div>
 <p className="text-xs text-slate-400 mt-1">
 تم الإنشاء في {formatDateTime(session.created_at)}
 {session.completed_at &&`• تم الاعتماد في ${formatDateTime(session.completed_at)}`}
 </p>
 </div>

 <div className="flex flex-wrap items-center gap-4 text-xs font-bold text-slate-600 dark:text-slate-300">
 <div className="flex items-center gap-1.5 bg-slate-50 dark:bg-slate-800 px-3 py-1.5 rounded-xl border border-slate-100 dark:border-slate-700">
 <WarehouseIcon className="w-4 h-4 text-[#558b2f]"/>
 <span>المخزن: {warehouse?.name ||'—'}</span>
 </div>

 <div className="flex items-center gap-1.5 bg-slate-50 dark:bg-slate-800 px-3 py-1.5 rounded-xl border border-slate-100 dark:border-slate-700">
 <UserIcon className="w-4 h-4 text-primary"/>
 <span>بواسطة: {creator?.full_name || creator?.username ||'—'}</span>
 </div>
 </div>
 </div>

 {session.notes && (
 <div className="mt-4 p-3.5 bg-slate-50 dark:bg-slate-900 rounded-xl text-xs font-medium text-slate-600 dark:text-slate-300 flex items-start gap-2">
 <FileText className="w-4 h-4 text-slate-400 shrink-0 mt-0.5"/>
 <div>
 <span className="font-black text-slate-700 dark:text-slate-200">ملاحظات الجرد: </span>
 <span>{session.notes}</span>
 </div>
 </div>
 )}

 {/* ملخص الإحصائيات والأرقام */}
 <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-5">
 <div className="p-3 bg-slate-50/70 dark:bg-slate-900/50 rounded-xl border border-slate-100 dark:border-slate-800">
 <span className="text-3xs font-black text-slate-400">إجمالي الأصناف</span>
 <p className="text-lg font-black text-slate-900 dark:text-white mt-0.5">{items.length} صنف</p>
 </div>

 <div className="p-3 bg-slate-50/70 dark:bg-slate-900/50 rounded-xl border border-slate-100 dark:border-slate-800">
 <span className="text-3xs font-black text-slate-400">أصناف متطابقة</span>
 <p className="text-lg font-black text-slate-600 dark:text-slate-300 mt-0.5">{stats.matchCount}</p>
 </div>

 <div className="p-3 bg-red-50/40 dark:bg-red-950/20 rounded-xl border border-red-100 dark:border-red-900/30">
 <span className="text-3xs font-black text-red-500">أصناف عجز (-)</span>
 <p className="text-lg font-black text-red-600 mt-0.5">
 {stats.shortageCount}{''}
 <span className="text-xs font-mono font-normal">({formatNumber(stats.totalShortageVal)} ج)</span>
 </p>
 </div>

 <div className="p-3 bg-emerald-50/40 dark:bg-emerald-950/20 rounded-xl border border-emerald-100 dark:border-emerald-900/30">
 <span className="text-3xs font-black text-emerald-600">أصناف زيادة (+)</span>
 <p className="text-lg font-black text-emerald-600 mt-0.5">
 {stats.surplusCount}{''}
 <span className="text-xs font-mono font-normal">({formatNumber(stats.totalSurplusVal)} ج)</span>
 </p>
 </div>
 </div>
 </div>

 {/* جدول بنود وأصناف الجلسة */}
 <div className="bg-surface rounded-2xl border border-slate-200/80 dark:border-slate-800 overflow-hidden shadow-sm">
 <div className="p-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-slate-50/50 dark:bg-slate-900/40">
 <h3 className="text-xs font-black text-slate-900 dark:text-white flex items-center gap-2">
 <Package className="w-4 h-4 text-[#558b2f]"/>
 <span>الأصناف المحصورة ({items.length})</span>
 </h3>

 <div className="flex items-center gap-2">
 <span className="text-2xs font-bold text-slate-400">صافي قيمة التسوية:</span>
 <span
 className={cn(
'text-sm font-black font-mono px-2.5 py-0.5 rounded-lg',
 session.total_difference_value >= 0
 ?'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/30'
 :'bg-red-50 text-red-700 dark:bg-red-950/30'
 )}
 >
 {session.total_difference_value >= 0 ?'+':''}
 {formatNumber(session.total_difference_value)} ج.م
 </span>
 </div>
 </div>

 <ScrollArea className="h-[450px]">
 <Table>
 <TableHeader className="sticky top-0 z-10 bg-slate-50 dark:bg-slate-900 shadow-xs">
 <TableRow>
 <TableHead className="text-2xs font-black uppercase tracking-wider">الصنف</TableHead>
 <TableHead className="text-2xs font-black uppercase tracking-wider text-center">الوحدة</TableHead>
 <TableHead className="text-2xs font-black uppercase tracking-wider text-center">الرصيد الدفتري</TableHead>
 <TableHead className="text-2xs font-black uppercase tracking-wider text-center">الكمية الفعلية</TableHead>
 <TableHead className="text-2xs font-black uppercase tracking-wider text-center">فرق الكمية</TableHead>
 <TableHead className="text-2xs font-black uppercase tracking-wider text-left">سعر التكلفة</TableHead>
 <TableHead className="text-2xs font-black uppercase tracking-wider text-left">قيمة الفرق</TableHead>
 </TableRow>
 </TableHeader>

 <TableBody className="text-xs font-bold divide-y divide-slate-100 dark:divide-slate-800">
 {items.length === 0 ? (
 <TableRow>
 <TableCell colSpan={7} className="py-20 text-center text-slate-400">
 لا توجد أصناف في ورقة الجرد هذه.
 </TableCell>
 </TableRow>
 ) : (
 items.map((it) => (
 <TableRow key={it.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/40 transition-colors">
 <TableCell className="py-3">
 <div className="flex flex-col">
 <span className="font-black text-slate-900 dark:text-white">
 {it.product?.name ||'صنف غير معروف'}
 </span>
 <span className="text-3xs font-mono text-slate-400">
 كود: {it.product?.sku ||'—'}
 </span>
 </div>
 </TableCell>

 <TableCell className="text-center text-slate-500 font-bold">
 {it.unitName}
 </TableCell>

 <TableCell className="text-center font-mono text-slate-600 dark:text-slate-300">
 {formatNumber(it.expected_quantity)}
 </TableCell>

 <TableCell className="text-center font-mono font-black text-slate-900 dark:text-white">
 {formatNumber(it.actual_quantity)}
 </TableCell>

 <TableCell className="text-center">
 <Badge
 className={cn(
'font-black text-xs font-mono px-2 py-0.5',
 it.difference_quantity === 0
 ?'bg-slate-100 dark:bg-slate-800 text-slate-500 border-none'
 : it.difference_quantity > 0
 ?'bg-emerald-50 text-emerald-700 border-emerald-200'
 :'bg-red-50 text-red-700 border-red-200'
 )}
 variant="outline"
 >
 {it.difference_quantity > 0 ?`+${it.difference_quantity}`: it.difference_quantity}
 </Badge>
 </TableCell>

 <TableCell className="text-left font-mono text-slate-500">
 {formatNumber(it.unit_cost)} ج
 </TableCell>

 <TableCell
 className={cn(
'text-left font-black text-sm font-mono',
 it.difference_value === 0
 ?'text-slate-400'
 : it.difference_value > 0
 ?'text-emerald-600'
 :'text-red-600'
 )}
 >
 {it.difference_value > 0 ?'+':''}
 {formatNumber(it.difference_value)} ج.م
 </TableCell>
 </TableRow>
 ))
 )}
 </TableBody>
 </Table>
 </ScrollArea>
 </div>
 </div>
 </AppShell>
 );
}