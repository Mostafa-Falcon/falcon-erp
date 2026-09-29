'use client';
import React, { useEffect, useState, Suspense } from'react';
import Link from'next/link';
import { AppShell } from'@/components/layout/AppShell';
import { Button } from'@/components/ui/button';
import { Skeleton } from'@/components/ui/skeleton';
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
import { useSessionStore } from'@/core/state/useSessionStore';
import { InventoryRepository } from'@/modules/inventory/inventory_repository';
import { formatNumber, formatDate, formatDateTime } from'@/lib/format';
import { cn } from'@/lib/utils';
import { Plus, ClipboardList, Eye, Trash2 } from'lucide-react';
import type { StocktakeSession, Warehouse, User } from'@/types';
import { toast } from'sonner';

function StocktakeListPage() {
 const { currentUser } = useSessionStore();
 const orgId = currentUser?.org_id ||'';

 const [sessions, setSessions] = useState<StocktakeSession[]>([]);
 const [warehouses, setWarehouses] = useState<Warehouse[]>([]);
 const [users, setUsers] = useState<User[]>([]);
 const [isLoading, setIsLoading] = useState(true);

 const loadData = async () => {
 if (!orgId) return;
 try {
 const { db } = await import('@/core/db/app_database');
 const [sess, whs, usrs] = await Promise.all([
 InventoryRepository.getStocktakeSessions(orgId),
 db.warehouses.where('org_id').equals(orgId).toArray(),
 db.users.where('org_id').equals(orgId).toArray(),
 ]);
 setSessions(sess);
 setWarehouses(whs);
 setUsers(usrs);
 } catch (err) {
 console.error('Load stocktakes error:', err);
 } finally {
 setIsLoading(false);
 }
 };

 useEffect(() => {
 if (!orgId) return;
 loadData();
 }, [orgId]);

 const warehouseName = (id: string) => warehouses.find((w) => w.id === id)?.name ||'—';
 const userName = (id: string) => users.find((u) => u.id === id)?.full_name || users.find((u) => u.id === id)?.username ||'—';

 const handleDelete = async (sessionId: string, sessionNumber: string) => {
 if (!confirm(`هل أنت متأكد من حذف مسودة الجرد رقم ${sessionNumber}؟`)) return;

 try {
 const res = await InventoryRepository.deleteStocktakeSession(sessionId);
 if (!res.success) {
 toast.error(res.error ||'فشل حذف مسودة الجرد.');
 return;
 }
 toast.success('تم حذف مسودة الجرد بنجاح.');
 await loadData();
 } catch (err) {
 console.error(err);
 toast.error('حدث خطأ أثناء محاولة الحذف.');
 }
 };

 return (
 <AppShell
 title="الجرد المخزوني"
 subtitle="سجل عمليات الجرد المخزونية والمسودات"
 actions={
 <Link href="/inventory/adjustments/new">
 <Button className="h-10 px-5 bg-[#558b2f] hover:bg-[#436d25] text-white text-xs font-black rounded-xl shadow-xs flex items-center gap-2">
 <Plus className="w-4 h-4"/> جرد جديد
 </Button>
 </Link>
 }
 >
 <div className="bg-surface rounded-2xl border border-slate-200/80 dark:border-slate-800 overflow-hidden shadow-md">
 <ScrollArea className="h-[calc(100vh-250px)]">
 <Table>
 <TableHeader className="sticky top-0 z-10 bg-slate-50/90 dark:bg-slate-900/90 backdrop-blur-sm shadow-sm">
 <TableRow>
 <TableHead className="text-2xs font-black uppercase tracking-wider">الرقم المرجعي</TableHead>
 <TableHead className="text-2xs font-black uppercase tracking-wider">التاريخ</TableHead>
 <TableHead className="text-2xs font-black uppercase tracking-wider">المخزن</TableHead>
 <TableHead className="text-2xs font-black uppercase tracking-wider">الحالة</TableHead>
 <TableHead className="text-2xs font-black uppercase tracking-wider">قيمة الفرق</TableHead>
 <TableHead className="text-2xs font-black uppercase tracking-wider">ملاحظات</TableHead>
 <TableHead className="text-2xs font-black uppercase tracking-wider">بواسطة</TableHead>
 <TableHead className="text-2xs font-black uppercase tracking-wider text-center">الخيارات</TableHead>
 </TableRow>
 </TableHeader>
 <TableBody className="text-xs font-bold">
 {isLoading ? (
 Array.from({ length: 5 }).map((_, i) => (
 <TableRow key={i}>
 <TableCell colSpan={8} className="py-4 px-4">
 <Skeleton className="h-10 w-full opacity-50"/>
 </TableCell>
 </TableRow>
 ))
 ) : sessions.length === 0 ? (
 <TableRow>
 <TableCell colSpan={8} className="py-24 text-center">
 <div className="flex flex-col items-center gap-3 text-slate-400">
 <ClipboardList className="w-12 h-12 opacity-20"/>
 <span className="text-sm font-black">لا توجد عمليات جرد سابقة.</span>
 <Link href="/inventory/adjustments/new">
 <Button variant="outline"className="mt-2 text-2xs font-black rounded-lg">ابدأ أول جلسة جرد الآن</Button>
 </Link>
 </div>
 </TableCell>
 </TableRow>
 ) : (
 sessions.map((s) => (
 <TableRow key={s.id} className="hover:bg-slate-50/70 dark:hover:bg-slate-800/40 transition-colors group">
 <TableCell className="font-black text-primary py-4">{s.session_number}</TableCell>
 <TableCell className="text-slate-500 font-mono text-2xs">
 {formatDateTime(s.created_at)}
 </TableCell>
 <TableCell className="font-bold text-slate-700 dark:text-slate-300">{warehouseName(s.warehouse_id)}</TableCell>
 <TableCell>
 <Badge
 className={cn(
"text-3xs font-black shadow-xs",
 s.status ==='completed'
 ?"bg-emerald-50 text-emerald-700 border-emerald-100"
 : s.status ==='draft'
 ?"bg-blue-50 text-blue-700 border-blue-100"
 :"bg-red-50 text-red-700 border-red-100"
 )}
 variant="outline"
 >
 {s.status ==='completed'?'معتمد': s.status ==='draft'?'مسودة':'ملغي'}
 </Badge>
 </TableCell>
 <TableCell className={cn("font-black text-sm", s.total_difference_value >= 0 ?"text-[#558b2f]":"text-red-600")}>
 {formatNumber(s.total_difference_value)} <span className="text-3xs">ج.م</span>
 </TableCell>
 <TableCell className="text-slate-400 max-w-40 truncate italic">{s.notes ||'—'}</TableCell>
 <TableCell className="text-slate-600 dark:text-slate-400">{userName(s.created_by)}</TableCell>
 <TableCell>
 <div className="flex items-center justify-center gap-1.5">
 <Link href={`/inventory/adjustments/${s.id}`}>
 <Button size="icon"variant="ghost"title="عرض التفاصيل"className="w-8 h-8 rounded-lg text-slate-400 hover:text-primary hover:bg-blue-50">
 <Eye className="w-4 h-4"/>
 </Button>
 </Link>
 {s.status ==='draft'&& (
 <Button size="icon"variant="ghost"title="حذف المسودة"onClick={() => handleDelete(s.id, s.session_number)} className="w-8 h-8 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50">
 <Trash2 className="w-4 h-4"/>
 </Button>
 )}
 </div>
 </TableCell>
 </TableRow>
 ))
 )}
 </TableBody>
 </Table>
 </ScrollArea>
 </div>
 </AppShell>
 );
}

export default function StocktakeListPageWrapper() {
 return (
 <Suspense fallback={<div className="py-24 text-center text-slate-400">جاري التحميل...</div>}>
 <StocktakeListPage />
 </Suspense>
 );
}