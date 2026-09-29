'use client';

import React, { useEffect, useState, useMemo } from'react';
import {
 Dialog,
 DialogContent,
 DialogHeader,
 DialogTitle,
} from'@/components/ui/dialog';
import { Button } from'@/components/ui/button';
import { Badge } from'@/components/ui/badge';
import {
 Clock,
 User,
 Wallet,
 Receipt,
 FileText,
 Printer,
 TrendingDown,
 TrendingUp,
 Eye,
 FileSpreadsheet,
 Columns,
 ChevronDown,
 Info,
 RotateCcw,
 SlidersHorizontal
} from'lucide-react';
import { db } from'@/core/db/app_database';
import { formatNumber } from'@/lib/format';
import type { CashierShift, SalesInvoice, SalesReturn, User as UserType, Treasury, Contact } from'@/types';
import { toast } from'sonner';

interface ShiftDetailModalProps {
 shift: CashierShift | null;
 isOpen: boolean;
 onClose: () => void;
 users: UserType[];
 treasuries: Treasury[];
}

interface MovementItem {
 id: string;
 type:'invoice'|'return';
 number: string;
 time: string;
 customerName: string;
 total: number;
 paymentType: string;
 timestamp: string;
}

export function ShiftDetailModal({
 shift,
 isOpen,
 onClose,
 users,
 treasuries,
}: ShiftDetailModalProps) {
 const [invoices, setInvoices] = useState<SalesInvoice[]>([]);
 const [returns, setReturns] = useState<SalesReturn[]>([]);
 const [customers, setCustomers] = useState<Record<string, Contact>>({});
 const [isLoading, setIsLoading] = useState(false);
 const [pageSize, setPageSize] = useState(25);
 const [currentPage, setCurrentPage] = useState(1);

 useEffect(() => {
 if (!shift || !isOpen) return;

 let isMounted = true;
 const loadShiftDetails = async () => {
 setIsLoading(true);
 try {
 const [invs, rets, contacts] = await Promise.all([
 db.sales_invoices.where('shift_id').equals(shift.id).reverse().toArray(),
 db.sales_returns.where('shift_id').equals(shift.id).reverse().toArray(),
 db.contacts.toArray(),
 ]);

 if (!isMounted) return;
 setInvoices(invs);
 setReturns(rets);

 const cmap: Record<string, Contact> = {};
 for (const c of contacts) cmap[c.id] = c;
 setCustomers(cmap);
 } catch (err) {
 console.error('Error loading shift details:', err);
 } finally {
 if (isMounted) setIsLoading(false);
 }
 };

 loadShiftDetails();
 return () => {
 isMounted = false;
 };
 }, [shift, isOpen]);

 const getUserName = (id?: string | null) => {
 if (!id) return'—';
 const u = users.find((user) => user.id === id);
 return u?.full_name || u?.username ||'—';
 };

 const formatShiftDateTime = (dateIso?: string | null): string => {
 if (!dateIso) return'---';
 const d = new Date(dateIso);
 const now = new Date();
 const isToday = d.toDateString() === now.toDateString();
 const yesterday = new Date(now);
 yesterday.setDate(yesterday.getDate() - 1);
 const isYesterday = d.toDateString() === yesterday.toDateString();

 const timeStr = d.toLocaleTimeString('ar-EG', { hour:'2-digit', minute:'2-digit', hour12: true });

 if (isToday) return`اليوم، ${timeStr}`;
 if (isYesterday) return`أمس، ${timeStr}`;

 const months = [
'يناير','فبراير','مارس','أبريل','مايو','يونيو',
'يوليو','أغسطس','سبتمبر','أكتوبر','نوفمبر','ديسمبر'
 ];
 return`${d.getDate()} ${months[d.getMonth()]} ${d.getFullYear()}، ${timeStr}`;
 };

 const formatMovementTime = (dateIso?: string | null): string => {
 if (!dateIso) return'---';
 const d = new Date(dateIso);
 return d.toLocaleTimeString('ar-EG', { hour:'2-digit', minute:'2-digit', hour12: true });
 };

 // Financial summary
 const totalSales = useMemo(() => invoices.reduce((acc, inv) => acc + (inv.total || 0), 0), [invoices]);
 const totalReturns = useMemo(() => returns.reduce((acc, ret) => acc + (ret.refunded_amount || ret.total || 0), 0), [returns]);
 const netSales = totalSales - totalReturns;

 // Combined movements list
 const movements: MovementItem[] = useMemo(() => {
 const list: MovementItem[] = [];

 for (const inv of invoices) {
 list.push({
 id: inv.id,
 type:'invoice',
 number: inv.invoice_number,
 time: formatMovementTime(inv.created_at),
 customerName: (inv.customer_id && customers[inv.customer_id]?.name) ||'عميل نقدي',
 total: inv.total,
 paymentType: inv.payment_type ||'cash',
 timestamp: inv.created_at,
 });
 }

 for (const ret of returns) {
 list.push({
 id: ret.id,
 type:'return',
 number: ret.return_number,
 time: formatMovementTime(ret.created_at),
 customerName: (ret.customer_id && customers[ret.customer_id]?.name) ||'عميل نقدي',
 total: ret.refunded_amount || ret.total,
 paymentType:'cash',
 timestamp: ret.created_at,
 });
 }

 return list.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
 }, [invoices, returns, customers]);

 const totalPages = Math.max(1, Math.ceil(movements.length / pageSize));
 const paginatedMovements = useMemo(() => {
 const start = (currentPage - 1) * pageSize;
 return movements.slice(start, start + pageSize);
 }, [movements, currentPage, pageSize]);

 if (!shift) return null;

 const isShiftOpen = shift.status ==='open';

 return (
 <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
 <DialogContent
 className="max-w-4xl max-h-[92vh] overflow-y-auto p-6 rounded-2xl border-slate-200 dark:border-slate-800 bg-surface shadow-2xl text-right"
 dir="rtl"
 >
 {/* ==============================================================
 1. MODAL HEADER (زي الصورة بالظبط: البادج على اليمين والعنوان والأيقونة على اليسار)
 ============================================================== */}
 <DialogHeader className="pb-4 border-b border-slate-100 dark:border-slate-800 flex flex-row items-center justify-between gap-4 space-y-0">
 {/* Right side in RTL: Status Badge */}
 <div>
 <Badge
 className={`text-xs font-bold px-3 py-1 rounded-full ${
 isShiftOpen
 ?'bg-emerald-50 text-emerald-600 border border-emerald-200 dark:bg-emerald-950/50 dark:text-emerald-400 dark:border-emerald-800'
 :'bg-rose-50 text-rose-600 border border-rose-200 dark:bg-rose-950/50 dark:text-rose-400 dark:border-rose-800'
 }`}
 >
 {isShiftOpen ?'مفتوحة':'مغلقة'}
 </Badge>
 </div>

 {/* Left side in RTL: Icon + Title + Subtitle */}
 <div className="flex items-center gap-3">
 <div className="text-left">
 <DialogTitle className="text-base font-black text-slate-900 dark:text-white">
 تفاصيل الوردية #{shift.shift_number}
 </DialogTitle>
 <p className="text-xs font-semibold text-slate-400 mt-0.5 font-sans">
 الكاشير: {getUserName(shift.user_id)} • {formatShiftDateTime(shift.opened_at)}
 </p>
 </div>
 <div className="w-10 h-10 rounded-xl bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 flex items-center justify-center border border-blue-100 dark:border-blue-900/60 shrink-0">
 <FileText className="w-5 h-5"/>
 </div>
 </div>
 </DialogHeader>

 {/* ==============================================================
 2. 4 KPI SUMMARY CARDS (إجمالي الفواتير، المبيعات، المرتجعات، صافي الوردية)
 ============================================================== */}
 <div className="grid grid-cols-2 md:grid-cols-4 gap-3 pt-2">
 
 {/* إجمالي الفواتير */}
 <div className="bg-blue-50/40 dark:bg-blue-950/20 border border-blue-200/70 dark:border-blue-900/50 rounded-2xl p-4 flex items-center justify-between">
 <div className="w-10 h-10 rounded-xl bg-blue-100/70 dark:bg-blue-900/50 text-blue-600 dark:text-blue-400 flex items-center justify-center shrink-0">
 <Receipt className="w-5 h-5"/>
 </div>
 <div className="text-left space-y-1">
 <span className="text-2xs font-bold text-slate-500 dark:text-slate-400 block">
 إجمالي الفواتير
 </span>
 <span className="text-xl font-black text-blue-600 dark:text-blue-400 font-mono block">
 {invoices.length}
 </span>
 </div>
 </div>

 {/* إجمالي المبيعات */}
 <div className="bg-emerald-50/40 dark:bg-emerald-950/20 border border-emerald-200/70 dark:border-emerald-900/50 rounded-2xl p-4 flex items-center justify-between">
 <div className="w-10 h-10 rounded-xl bg-emerald-100/70 dark:bg-emerald-900/50 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0">
 <TrendingUp className="w-5 h-5"/>
 </div>
 <div className="text-left space-y-1">
 <span className="text-2xs font-bold text-slate-500 dark:text-slate-400 block">
 إجمالي المبيعات
 </span>
 <span className="text-xl font-black text-emerald-600 dark:text-emerald-400 font-mono block">
 {formatNumber(totalSales)} <span className="text-xs font-bold">ج.م</span>
 </span>
 </div>
 </div>

 {/* إجمالي المرتجعات */}
 <div className="bg-rose-50/40 dark:bg-rose-950/20 border border-rose-200/70 dark:border-rose-900/50 rounded-2xl p-4 flex items-center justify-between">
 <div className="w-10 h-10 rounded-xl bg-rose-100/70 dark:bg-rose-900/50 text-rose-600 dark:text-rose-400 flex items-center justify-center shrink-0">
 <TrendingDown className="w-5 h-5"/>
 </div>
 <div className="text-left space-y-1">
 <span className="text-2xs font-bold text-slate-500 dark:text-slate-400 block">
 إجمالي المرتجعات
 </span>
 <span className="text-xl font-black text-rose-600 dark:text-rose-400 font-mono block">
 {formatNumber(totalReturns)} <span className="text-xs font-bold">ج.م</span>
 </span>
 </div>
 </div>

 {/* صافي الوردية */}
 <div className="bg-blue-50/40 dark:bg-blue-950/20 border border-blue-200/70 dark:border-blue-900/50 rounded-2xl p-4 flex items-center justify-between">
 <div className="w-10 h-10 rounded-xl bg-blue-100/70 dark:bg-blue-900/50 text-blue-600 dark:text-blue-400 flex items-center justify-center shrink-0">
 <Wallet className="w-5 h-5"/>
 </div>
 <div className="text-left space-y-1">
 <span className="text-2xs font-bold text-slate-500 dark:text-slate-400 block">
 صافي الوردية
 </span>
 <span className="text-xl font-black text-blue-600 dark:text-blue-400 font-mono block">
 {formatNumber(netSales)} <span className="text-xs font-bold">ج.م</span>
 </span>
 </div>
 </div>

 </div>

 {/* ==============================================================
 3. SECTION HEADING (قائمة الحركات - الفواتير والمرتجعات)
 ============================================================== */}
 <div className="pt-3">
 <h4 className="text-sm font-bold text-slate-800 dark:text-white">
 قائمة الحركات (الفواتير والمرتجعات)
 </h4>
 </div>

 {/* ==============================================================
 4. TOOLBAR ROW (الطباعة، الإكسيل، تخصيص الأعمدة، عرض 25 إدخالات)
 ============================================================== */}
 <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
 {/* Export icons & tools */}
 <div className="flex items-center gap-2">
 <button
 type="button"
 onClick={() => window.print()}
 title="طباعة"
 className="w-8 h-8 rounded-lg border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 flex items-center justify-center transition-colors cursor-pointer"
 >
 <Printer className="w-4 h-4"/>
 </button>

 <button
 type="button"
 onClick={() => toast.info('جاري تصدير الملف كـ PDF')}
 title="تصدير PDF"
 className="w-8 h-8 rounded-lg border border-pink-200 dark:border-pink-900/50 text-pink-600 bg-pink-50/50 dark:bg-pink-950/40 hover:bg-pink-100 flex items-center justify-center transition-colors cursor-pointer"
 >
 <FileText className="w-4 h-4"/>
 </button>

 <button
 type="button"
 onClick={() => toast.info('جاري تصدير الملف كـ Excel')}
 title="تصدير Excel"
 className="w-8 h-8 rounded-lg border border-emerald-200 dark:border-emerald-900/50 text-emerald-600 bg-emerald-50/50 dark:bg-emerald-950/40 hover:bg-emerald-100 flex items-center justify-center transition-colors cursor-pointer"
 >
 <FileSpreadsheet className="w-4 h-4"/>
 </button>

 <button
 type="button"
 title="خيارات العرض"
 className="w-8 h-8 rounded-lg border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 flex items-center justify-center transition-colors cursor-pointer"
 >
 <SlidersHorizontal className="w-4 h-4"/>
 </button>
 </div>

 {/* Right side in RTL: Column customization & Rows selector */}
 <div className="flex items-center gap-3">
 <button
 type="button"
 onClick={() => toast.info('تخصيص الأعمدة متاح')}
 className="h-8 px-3 rounded-lg border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer"
 >
 <Columns className="w-3.5 h-3.5"/>
 <span>تخصيص الأعمدة</span>
 </button>

 <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-600 dark:text-slate-400">
 <span>عرض</span>
 <select
 value={pageSize}
 onChange={(e) => {
 setPageSize(Number(e.target.value));
 setCurrentPage(1);
 }}
 className="h-8 px-2 rounded-lg border border-slate-200 dark:border-slate-800 bg-surface text-xs font-bold text-slate-800 dark:text-slate-200 focus:outline-none cursor-pointer"
 >
 <option value={10}>10</option>
 <option value={25}>25</option>
 <option value={50}>50</option>
 <option value={100}>100</option>
 </select>
 <span>إدخالات</span>
 </div>
 </div>
 </div>

 {/* ==============================================================
 5. MOVEMENTS TABLE (النوع، رقم الحركة، الوقت، العميل، القيمة، طريقة الدفع، عرض)
 ============================================================== */}
 <div className="border border-slate-200/90 dark:border-slate-800 rounded-2xl overflow-hidden mt-1">
 {isLoading ? (
 <div className="py-16 text-center text-xs font-bold text-slate-400">
 جاري تحميل حركات الوردية...
 </div>
 ) : movements.length === 0 ? (
 <div className="py-14 text-center text-xs font-bold text-slate-400">
 لا توجد حركات بيع أو مرتجعات مسجلة في هذه الوردية حتى الآن.
 </div>
 ) : (
 <div className="overflow-x-auto">
 <table className="w-full text-right text-xs">
 <thead className="bg-slate-50/80 dark:bg-slate-900/60 border-b border-slate-200 dark:border-slate-800 text-2xs font-bold text-slate-500">
 <tr>
 <th className="py-3 px-3 text-right">
 <span className="inline-flex items-center gap-1 cursor-pointer hover:text-slate-800">
 النوع
 <span className="text-3xs text-slate-400">↕</span>
 </span>
 </th>
 <th className="py-3 px-3 text-right">
 <span className="inline-flex items-center gap-1 cursor-pointer hover:text-slate-800">
 رقم الحركة
 <span className="text-3xs text-slate-400">↕</span>
 </span>
 </th>
 <th className="py-3 px-3 text-right">
 <span className="inline-flex items-center gap-1 cursor-pointer hover:text-slate-800">
 الوقت
 <span className="text-3xs text-slate-400">↕</span>
 </span>
 </th>
 <th className="py-3 px-3 text-right">
 <span className="inline-flex items-center gap-1 cursor-pointer hover:text-slate-800">
 العميل
 <span className="text-3xs text-slate-400">↕</span>
 </span>
 </th>
 <th className="py-3 px-3 text-right">
 <span className="inline-flex items-center gap-1 cursor-pointer hover:text-slate-800">
 القيمة الإجمالية
 <span className="text-3xs text-slate-400">↕</span>
 </span>
 </th>
 <th className="py-3 px-3 text-right">
 <span className="inline-flex items-center gap-1 cursor-pointer hover:text-slate-800">
 طريقة الدفع
 <span className="text-3xs text-slate-400">↕</span>
 </span>
 </th>
 <th className="py-3 px-3 text-center">
 <span className="inline-flex items-center gap-1 cursor-pointer hover:text-slate-800">
 عرض
 <span className="text-3xs text-slate-400">↕</span>
 </span>
 </th>
 </tr>
 </thead>
 <tbody className="divide-y divide-slate-100 dark:divide-slate-800/80 font-bold">
 {paginatedMovements.map((item) => (
 <tr
 key={item.id}
 className="hover:bg-slate-50/70 dark:hover:bg-slate-800/40 transition-colors"
 >
 {/* النوع */}
 <td className="py-3 px-3">
 {item.type ==='invoice'? (
 <Badge className="bg-emerald-50 text-emerald-600 dark:bg-emerald-950/40 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800 text-3xs font-bold px-2.5 py-0.5 rounded-full">
 فاتورة
 </Badge>
 ) : (
 <Badge className="bg-rose-50 text-rose-600 dark:bg-rose-950/40 dark:text-rose-400 border border-rose-200 dark:border-rose-800 text-3xs font-bold px-2.5 py-0.5 rounded-full">
 مرتجع
 </Badge>
 )}
 </td>

 {/* رقم الحركة */}
 <td className="py-3 px-3 font-mono font-bold text-slate-800 dark:text-slate-200">
 {item.number}
 </td>

 {/* الوقت */}
 <td className="py-3 px-3 font-mono font-semibold text-slate-600 dark:text-slate-400">
 {item.time}
 </td>

 {/* العميل */}
 <td className="py-3 px-3 text-slate-700 dark:text-slate-300">
 {item.customerName}
 </td>

 {/* القيمة الإجمالية */}
 <td className="py-3 px-3 font-mono font-black text-slate-900 dark:text-white">
 {formatNumber(item.total)} ج.م
 </td>

 {/* طريقة الدفع */}
 <td className="py-3 px-3 font-mono text-xs text-slate-600 dark:text-slate-400">
 {item.paymentType}
 </td>

 {/* زر عرض */}
 <td className="py-3 px-3 text-center">
 <button
 type="button"
 onClick={() => toast.info(`تفاصيل الحركة #${item.number}`)}
 title="عرض الحركة"
 className="w-7 h-7 rounded-full text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-950/60 inline-flex items-center justify-center transition-colors cursor-pointer"
 >
 <Eye className="w-4 h-4"/>
 </button>
 </td>
 </tr>
 ))}
 </tbody>
 </table>
 </div>
 )}
 </div>

 {/* ==============================================================
 6. PAGINATION ROW (عرض 1 إلى 25 من إجمالي 57 حركة)
 ============================================================== */}
 <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-2 text-xs font-semibold text-slate-500 dark:text-slate-400">
 {/* Info text */}
 <div className="flex items-center gap-1.5">
 <Info className="w-3.5 h-3.5 text-slate-400"/>
 <span>
 عرض {movements.length === 0 ? 0 : (currentPage - 1) * pageSize + 1} إلى{''}
 {Math.min(currentPage * pageSize, movements.length)} من إجمالي {movements.length} حركة
 </span>
 </div>

 {/* Controls with pink/magenta active page */}
 <div className="flex items-center gap-1">
 <button
 type="button"
 disabled={currentPage === 1}
 onClick={() => setCurrentPage(1)}
 className="px-2 py-1 rounded-lg border border-slate-200 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-40 cursor-pointer font-mono"
 >
 |&lt;
 </button>
 <button
 type="button"
 disabled={currentPage === 1}
 onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
 className="px-2 py-1 rounded-lg border border-slate-200 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-40 cursor-pointer font-mono"
 >
 &lt;
 </button>
 <span className="px-3 py-1 rounded-lg bg-pink-50 border border-pink-200 text-pink-600 font-bold font-mono">
 {currentPage} / {totalPages}
 </span>
 <button
 type="button"
 disabled={currentPage >= totalPages}
 onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
 className="px-2 py-1 rounded-lg border border-slate-200 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-40 cursor-pointer font-mono"
 >
 &gt;
 </button>
 <button
 type="button"
 disabled={currentPage >= totalPages}
 onClick={() => setCurrentPage(totalPages)}
 className="px-2 py-1 rounded-lg border border-slate-200 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-40 cursor-pointer font-mono"
 >
 &gt;|
 </button>
 </div>
 </div>

 {/* ==============================================================
 7. FOOTER BUTTON: إغلاق باللون الوردي المعتمد بالصورة
 ============================================================== */}
 <div className="pt-2 flex justify-start">
 <Button
 type="button"
 variant="outline"
 onClick={onClose}
 className="border-pink-400 text-pink-600 hover:bg-pink-50 dark:hover:bg-pink-950/40 rounded-xl px-6 h-9 font-bold text-xs cursor-pointer shadow-2xs"
 >
 إغلاق
 </Button>
 </div>

 </DialogContent>
 </Dialog>
 );
}