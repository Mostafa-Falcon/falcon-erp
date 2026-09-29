'use client';

import React, { useState, useEffect, useMemo } from'react';
import {
 Dialog,
 DialogContent,
} from'@/components/ui/dialog';
import { Button } from'@/components/ui/button';
import { Input } from'@/components/ui/input';
import { Label } from'@/components/ui/label';
import { Badge } from'@/components/ui/badge';
import { Textarea } from'@/components/ui/textarea';
import {
 Select,
 SelectContent,
 SelectItem,
 SelectTrigger,
 SelectValue,
} from'@/components/ui/select';
import {
 Lock,
 Loader2,
 Clock,
 Wallet,
 Coins,
 CreditCard,
 Building2,
 Printer,
 RotateCcw,
 Store,
 ShoppingBag,
 Layers,
 Copy,
 Receipt,
 FileSpreadsheet,
 X,
 Play,
 Square,
 CircleDot
} from'lucide-react';
import { db } from'@/core/db/app_database';
import { SalesRepository } from'@/modules/sales/sales_repository';
import { formatNumber } from'@/lib/format';
import type {
 CashierShift,
 SalesInvoice,
 SalesInvoiceItem,
 SalesReturn,
 Treasury,
 User as UserType,
 Product,
 Unit,
 Expense,
 FinancialVoucher
} from'@/types';
import { toast } from'sonner';

interface AdminCloseShiftModalProps {
 shift: CashierShift | null;
 isOpen: boolean;
 onClose: () => void;
 currentUser: UserType | null;
 users: UserType[];
 treasuries: Treasury[];
 onShiftClosed: () => void;
}

interface TopProductItem {
 id: string;
 name: string;
 barcode: string;
 price: number;
 qtySold: number;
 unitName: string;
 stockBefore: number;
 stockRemaining: number;
 totalRevenue: number;
}

export function AdminCloseShiftModal({
 shift,
 isOpen,
 onClose,
 currentUser,
 users,
 treasuries,
 onShiftClosed,
}: AdminCloseShiftModalProps) {
 // Current active inspected shift (allows instant switching between open shifts)
 const [activeShift, setActiveShift] = useState<CashierShift | null>(shift);
 const [openShifts, setOpenShifts] = useState<CashierShift[]>([]);
 const [activeTab, setActiveTab] = useState<'financial_audit'|'physical_audit'|'top_products'>('financial_audit');

 // Loaded operational shift records
 const [invoices, setInvoices] = useState<SalesInvoice[]>([]);
 const [invoiceItems, setInvoiceItems] = useState<SalesInvoiceItem[]>([]);
 const [returns, setReturns] = useState<SalesReturn[]>([]);
 const [expenses, setExpenses] = useState<Expense[]>([]);
 const [vouchers, setVouchers] = useState<FinancialVoucher[]>([]);
 const [productsMap, setProductsMap] = useState<Record<string, Product>>({});
 const [stockMap, setStockMap] = useState<Record<string, number>>({});
 const [unitsMap, setUnitsMap] = useState<Record<string, Unit>>({});

 // Settlement Form State
 const [actualCash, setActualCash] = useState<string>('');
 const [actualCard, setActualCard] = useState<string>('');
 const [destinationTreasuryId, setDestinationTreasuryId] = useState<string>('');
 const [closeNotes, setCloseNotes] = useState<string>('');
 const [isBusy, setIsBusy] = useState(false);

 // Synchronize on open or when initial shift prop changes
 useEffect(() => {
 if (isOpen) {
 setActiveShift(shift);
 setActiveTab('financial_audit');
 }
 }, [isOpen, shift]);

 // Load all open shifts in the branch/org for the top switcher bar
 useEffect(() => {
 if (!isOpen) return;

 let isMounted = true;
 async function loadOpenShifts() {
 try {
 const orgId = currentUser?.org_id || shift?.org_id;
 const branchId = shift?.branch_id || currentUser?.branch_id;
 const query = db.cashier_shifts.where('status').equals('open');

 let allOpen = await query.toArray();
 if (orgId) {
 allOpen = allOpen.filter((s) => s.org_id === orgId);
 }
 if (branchId) {
 allOpen = allOpen.filter((s) => !s.branch_id || s.branch_id === branchId);
 }

 if (isMounted) {
 setOpenShifts(allOpen);
 }
 } catch (err) {
 console.warn('Error loading open shifts switcher:', err);
 }
 }

 loadOpenShifts();
 return () => {
 isMounted = false;
 };
 }, [isOpen, shift, currentUser]);

 // Load full operational data for currently selected activeShift
 useEffect(() => {
 const currentShift = activeShift;
 if (!currentShift || !isOpen) return;

 let isMounted = true;
 async function fetchShiftData(current: CashierShift) {
 try {
 const [invs, rets, exps, vchs, prods, levels, unts] = await Promise.all([
 db.sales_invoices.where('shift_id').equals(current.id).toArray(),
 db.sales_returns.where('shift_id').equals(current.id).toArray(),
 db.expenses.where('shift_id').equals(current.id).toArray(),
 db.financial_vouchers.where('shift_id').equals(current.id).toArray(),
 db.products.where('org_id').equals(current.org_id).toArray(),
 db.stock_levels.toArray(),
 db.units.toArray(),
 ]);

 if (!isMounted) return;

 // Fetch invoice items for top selling products
 const invIds = invs.map((i) => i.id);
 let items: SalesInvoiceItem[] = [];
 if (invIds.length > 0) {
 items = await db.sales_invoice_items.where('invoice_id').anyOf(invIds).toArray();
 }

 const pMap: Record<string, Product> = {};
 for (const p of prods) pMap[p.id] = p;

 const sMap: Record<string, number> = {};
 for (const l of levels) {
 sMap[l.product_id] = (sMap[l.product_id] || 0) + (l.quantity || 0);
 }

 const uMap: Record<string, Unit> = {};
 for (const u of unts) uMap[u.id] = u;

 setInvoices(invs);
 setInvoiceItems(items);
 setReturns(rets);
 setExpenses(exps);
 setVouchers(vchs);
 setProductsMap(pMap);
 setStockMap(sMap);
 setUnitsMap(uMap);

 // Pre-fill actual counts
 setActualCash(String(current.expected_closing_balance || 0));
 setActualCard(String(current.total_sales_card || 0));
 setDestinationTreasuryId(current.treasury_id || (treasuries[0]?.id ??''));
 setCloseNotes(current.notes ||'');
 } catch (err) {
 console.error('Error fetching shift details for audit:', err);
 toast.error('حدث خطأ أثناء تحميل بيانات تدقيق الوردية');
 }
 }

 fetchShiftData(currentShift);
 return () => {
 isMounted = false;
 };
 }, [activeShift, isOpen, treasuries]);

 // Helpers
 const getUserName = (id?: string | null) => {
 if (!id) return '—';
 const u = users.find((user) => user.id === id);
 return u?.full_name || u?.username || '—';
 };

 // Timeline & Duration Computations
 const openedDate = activeShift ? new Date(activeShift.opened_at) : new Date();
 const now = new Date();

 const formatShiftTimeOnly = (date: Date) => {
 return date.toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit', hour12: true });
 };

 const formatShiftDateOnly = (date: Date) => {
 return date.toISOString().split('T')[0];
 };

 const calcDurationText = (startIso?: string, endIso?: string): string => {
 if (!startIso || !endIso) return '—';
 const diffMs = Math.max(0, new Date(endIso).getTime() - new Date(startIso).getTime());
 const totalMins = Math.floor(diffMs / (1000 * 60));
 const hours = Math.floor(totalMins / 60);
 const mins = totalMins % 60;
 const days = Math.floor(hours / 24);

 if (days > 0) {
 const remHours = hours % 24;
 return `${days} يوم و ${remHours} ساعة`;
 }
 return `${hours} ساعة و ${mins} دقيقة`;
 };

 const durationLabel = calcDurationText(activeShift?.opened_at, now.toISOString());

 // Financial Computations
 const totalCashSales = invoices.reduce((sum, inv) => {
 if (inv.payment_type === 'cash') return sum + (inv.paid_amount || inv.total || 0);
 return sum + (inv.cash_amount || 0);
 }, 0);

 const totalCardSales = invoices.reduce((sum, inv) => {
 if (inv.payment_type === 'card') return sum + (inv.paid_amount || inv.total || 0);
 return sum + (inv.card_amount || 0);
 }, 0);

 const totalCreditSales = invoices.reduce((sum, inv) => {
 if (inv.payment_type === 'credit') return sum + (inv.total || 0);
 return sum + (inv.remaining_amount || 0);
 }, 0);

 const totalInvoiceSales = invoices.reduce((sum, inv) => sum + (inv.total || 0), 0);

 const totalCashReturns = returns.reduce((sum, ret) => {
 return sum + (ret.refunded_amount || ret.total || 0);
 }, 0);

 const totalReturnAmount = returns.reduce((sum, ret) => sum + (ret.total || 0), 0);
 const netSales = totalInvoiceSales - totalReturnAmount;

 // Collections & Expenses from shift
 const customerDebtCollections = vouchers
 .filter((v) => v.type === 'receipt')
 .reduce((sum, v) => sum + (v.amount || 0), 0);

 const cashExpenses = expenses.reduce((sum, e) => sum + (e.amount || 0), 0);

 const supplierPayments = vouchers
 .filter((v) => v.type === 'payment')
 .reduce((sum, v) => sum + (v.amount || 0), 0);

 // Exact Expected Cash in Drawer
 const openingBalance = activeShift?.opening_balance || 0;
 const expectedDrawerCash = openingBalance + totalCashSales - totalCashReturns + customerDebtCollections - cashExpenses - supplierPayments;

 // Actual Input Parsers & Differences
 const actualCashVal = parseFloat(String(actualCash).replace(/,/g,'')) || 0;
 const cashDiff = actualCashVal - expectedDrawerCash;

 const actualCardVal = parseFloat(String(actualCard).replace(/,/g,'')) || 0;
 const cardDiff = actualCardVal - totalCardSales;

 // Top Selling Products Aggregation
 const topProductsList: TopProductItem[] = useMemo(() => {
 const map: Record<string, { qty: number; revenue: number }> = {};
 for (const item of invoiceItems) {
 if (!map[item.product_id]) {
 map[item.product_id] = { qty: 0, revenue: 0 };
 }
 map[item.product_id].qty += item.quantity || 0;
 map[item.product_id].revenue += item.total || 0;
 }

 const list: TopProductItem[] = Object.keys(map).map((pId) => {
 const p = productsMap[pId];
 const curStock = stockMap[pId] || 0;
 const sold = map[pId].qty;
 const unit = p?.base_unit_id ? unitsMap[p.base_unit_id]?.name ||'علبة':'علبة';

 return {
 id: pId,
 name: p?.name ||'صنف غير محدد',
 barcode: p?.sku ||'---',
 price: p?.sale_price || 0,
 qtySold: sold,
 unitName: unit,
 stockBefore: curStock + sold,
 stockRemaining: curStock,
 totalRevenue: map[pId].revenue,
 };
 });

 return list.sort((a, b) => b.qtySold - a.qtySold);
 }, [invoiceItems, productsMap, stockMap, unitsMap]);

 const totalItemsSoldQty = topProductsList.reduce((sum, it) => sum + it.qtySold, 0);
 const totalItemsRevenue = topProductsList.reduce((sum, it) => sum + it.totalRevenue, 0);

 // Confirm Close Handler
 const handleConfirmClose = async () => {
 if (!activeShift) return;

 try {
 setIsBusy(true);
 const auditNote = closeNotes.trim()
 ?`${closeNotes.trim()} [تم التدقيق والإغلاق الإداري بواسطة: ${currentUser?.full_name || currentUser?.username}]`
 :`إغلاق وتدقيق إداري بواسطة: ${currentUser?.full_name || currentUser?.username}`;

 await SalesRepository.closeShift(
 activeShift.id,
 actualCashVal,
 auditNote,
 currentUser?.id,
 destinationTreasuryId || activeShift.treasury_id,
 actualCardVal
 );

 toast.success(`تم تدقيق وإغلاق الوردية #${activeShift.shift_number} بنجاح!`);
 onShiftClosed();
 onClose();
 } catch (err: any) {
 console.error('Error closing shift:', err);
 toast.error(err?.message ||'حدث خطأ أثناء تدقيق وإغلاق الوردية');
 } finally {
 setIsBusy(false);
 }
 };

 const handlePrint = () => {
 window.print();
 };

 if (!activeShift) return null;

 return (
 <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
 <DialogContent
 className="max-w-5xl w-[96vw] max-h-[94vh] p-0 rounded-3xl border-slate-200 dark:border-slate-800 bg-[#f8fafc] dark:bg-[#0c1322] shadow-2xl overflow-hidden flex flex-col font-sans"
 dir="rtl"
 onInteractOutside={(e) => e.preventDefault()}
 >
 {/* ==============================================================
 1. EXECUTIVE TOP HEADER (هيدر الإغلاق والتدقيق)
 ============================================================== */}
 <header className="px-6 py-4 bg-surface border-b border-slate-200/90 dark:border-slate-800 flex items-center justify-between shrink-0 shadow-2xs">
 {/* Right: Title & Shift Badge */}
 <div className="flex items-center gap-3">
 <div className="w-10 h-10 rounded-2xl bg-blue-50 dark:bg-blue-950/50 text-blue-600 dark:text-blue-400 flex items-center justify-center shadow-inner shrink-0">
 <Lock className="w-5 h-5"/>
 </div>
 <div className="flex items-center gap-2.5">
 <h2 className="text-base sm:text-lg font-black text-slate-900 dark:text-white tracking-tight">
 إغلاق وتدقيق الوردية
 </h2>
 <Badge className="bg-blue-50 hover:bg-blue-100 text-blue-700 dark:bg-blue-950/60 dark:text-blue-300 dark:hover:bg-blue-900 border border-blue-200/80 dark:border-blue-800 font-black px-2.5 py-1 text-xs rounded-xl shadow-2xs">
 وردية #{activeShift.shift_number} ({getUserName(activeShift.user_id)})
 </Badge>
 </div>
 </div>

 {/* Left: Tools & Close */}
 <div className="flex items-center gap-2">
 <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400 text-xs font-bold border border-emerald-200/60 dark:border-emerald-800/60">
 <CircleDot className="w-3.5 h-3.5 animate-pulse text-emerald-600"/>
 <span>تحديث لحظي</span>
 </div>

 <button
 onClick={handlePrint}
 title="طباعة تقرير التدقيق"
 className="p-2 rounded-xl text-slate-600 hover:text-slate-950 dark:text-slate-400 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
 >
 <Printer className="w-4 h-4"/>
 </button>

 <button
 onClick={onClose}
 title="إغلاق النافذة"
 className="p-2 rounded-xl text-slate-400 hover:text-slate-800 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
 >
 <X className="w-4 h-4"/>
 </button>
 </div>
 </header>

 {/* Scrollable Body */}
 <div className="flex-1 overflow-y-auto p-5 sm:p-6 space-y-5">
 
 {/* ==============================================================
 2. OPEN SHIFTS SWITCHER BAR (شريط الورديات المفتوحة للمنشأة)
 ============================================================== */}
 {openShifts.length > 0 && (
 <div className="p-3 bg-surface rounded-2xl border border-slate-200/80 dark:border-slate-800 flex flex-wrap items-center justify-between gap-3 shadow-2xs">
 <div className="flex items-center gap-2 text-xs font-black text-slate-700 dark:text-slate-300">
 <Store className="w-4 h-4 text-blue-600"/>
 <span>الورديات المفتوحة ({openShifts.length}):</span>
 </div>

 <div className="flex flex-wrap items-center gap-2">
 {openShifts.map((s) => {
 const isSelected = s.id === activeShift.id;
 const cashierName = getUserName(s.user_id);
 return (
 <button
 key={s.id}
 type="button"
 onClick={() => setActiveShift(s)}
 className={`flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
 isSelected
 ?'bg-blue-600 text-white shadow-xs scale-102 ring-2 ring-blue-500/30'
 :'bg-slate-100 dark:bg-slate-800/70 text-slate-700 dark:text-slate-300 hover:bg-slate-200/80 dark:hover:bg-slate-800 border border-slate-200/60 dark:border-slate-700/60'
 }`}
 >
 <div className={`w-2 h-2 rounded-full ${isSelected ?'bg-white animate-pulse':'bg-slate-400'}`} />
 <span>{cashierName}</span>
 <span className="opacity-75 font-mono text-2xs">#{s.shift_number}</span>
 </button>
 );
 })}
 </div>
 </div>
 )}

 {/* ==============================================================
 3. TIMELINE & DURATION BAR (خط بداية ونهاية الوردية التفاعلي)
 ============================================================== */}
 <div className="p-4 bg-surface rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-2xs">
 <div className="flex items-center justify-between relative">
 
 {/* Start (Right in RTL) */}
 <div className="flex items-center gap-3 z-10">
 <div className="w-9 h-9 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shadow-xs">
 <Play className="w-4 h-4 fill-emerald-600"/>
 </div>
 <div className="text-right">
 <span className="text-2xs font-semibold text-slate-400 block">بداية الوردية</span>
 <div className="flex items-baseline gap-1.5">
 <span className="text-xs sm:text-sm font-black text-slate-900 dark:text-white font-mono">
 {formatShiftTimeOnly(openedDate)}
 </span>
 <span className="text-3xs font-mono text-slate-400">
 {formatShiftDateOnly(openedDate)}
 </span>
 </div>
 </div>
 </div>

 {/* Center Track & Duration Pill */}
 <div className="flex-1 mx-6 hidden sm:flex flex-col items-center justify-center relative">
 <div className="w-full h-1 bg-gradient-to-l from-emerald-500 via-blue-500 to-rose-500 rounded-full opacity-80"/>
 <div className="absolute -top-3.5 px-3 py-1 bg-surface border border-slate-200/90 dark:border-slate-700 rounded-full shadow-2xs flex items-center gap-1.5 text-xs font-bold text-blue-600 dark:text-blue-400">
 <Clock className="w-3.5 h-3.5"/>
 <span>مدة التشغيل: {durationLabel}</span>
 </div>
 </div>

 {/* End / Audit (Left in RTL) */}
 <div className="flex items-center gap-3 z-10 text-left">
 <div className="text-left">
 <span className="text-2xs font-semibold text-slate-400 block">وقت التدقيق</span>
 <div className="flex items-baseline gap-1.5">
 <span className="text-xs sm:text-sm font-black text-slate-900 dark:text-white font-mono">
 {formatShiftTimeOnly(now)}
 </span>
 <span className="text-3xs font-bold text-rose-500">
 (الآن جاري الإغلاق)
 </span>
 </div>
 </div>
 <div className="w-9 h-9 rounded-xl bg-rose-50 dark:bg-rose-950/60 text-rose-600 dark:text-rose-400 flex items-center justify-center shadow-xs">
 <Square className="w-4 h-4 fill-rose-600"/>
 </div>
 </div>

 </div>
 </div>

 {/* ==============================================================
 4. 4 EXECUTIVE KPI SUMMARY CARDS (بطاقات الملخص المالي العلوية)
 ============================================================== */}
 <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
 
 {/* Card 1: الرصيد المتوقع في الدرج (Featured in green) */}
 <div className="p-4 rounded-2xl bg-emerald-50/70 dark:bg-emerald-950/20 border-2 border-emerald-500/80 dark:border-emerald-600/70 flex items-center justify-between shadow-xs">
 <div className="space-y-1">
 <span className="text-xs font-bold text-emerald-800 dark:text-emerald-300">
 الرصيد المتوقع في الدرج
 </span>
 <div className="text-lg sm:text-xl font-black font-mono text-emerald-700 dark:text-emerald-400">
 {formatNumber(expectedDrawerCash)} <span className="text-xs font-bold">ج.م</span>
 </div>
 </div>
 <div className="w-10 h-10 rounded-2xl bg-emerald-600 text-white flex items-center justify-center shadow-md">
 <Wallet className="w-5 h-5"/>
 </div>
 </div>

 {/* Card 2: صافي المبيعات */}
 <div className="p-4 rounded-2xl bg-surface border border-slate-200/80 dark:border-slate-800 flex items-center justify-between shadow-2xs">
 <div className="space-y-1">
 <span className="text-xs font-bold text-slate-500 dark:text-slate-400">
 صافي المبيعات
 </span>
 <div className="text-lg sm:text-xl font-black font-mono text-slate-900 dark:text-white">
 {formatNumber(netSales)} <span className="text-xs font-bold">ج.م</span>
 </div>
 </div>
 <div className="w-10 h-10 rounded-2xl bg-blue-50 dark:bg-blue-950/50 text-blue-600 dark:text-blue-400 flex items-center justify-center shadow-inner">
 <Receipt className="w-5 h-5"/>
 </div>
 </div>

 {/* Card 3: إجمالي المرتجعات */}
 <div className="p-4 rounded-2xl bg-surface border border-slate-200/80 dark:border-slate-800 flex items-center justify-between shadow-2xs">
 <div className="space-y-1">
 <span className="text-xs font-bold text-slate-500 dark:text-slate-400">
 إجمالي المرتجعات
 </span>
 <div className="text-lg sm:text-xl font-black font-mono text-rose-600 dark:text-rose-400">
 {formatNumber(totalReturnAmount)} <span className="text-xs font-bold">ج.م</span>
 </div>
 </div>
 <div className="w-10 h-10 rounded-2xl bg-rose-50 dark:bg-rose-950/50 text-rose-600 dark:text-rose-400 flex items-center justify-center shadow-inner">
 <RotateCcw className="w-5 h-5"/>
 </div>
 </div>

 {/* Card 4: التحصيلات والمصروفات */}
 <div className="p-4 rounded-2xl bg-surface border border-slate-200/80 dark:border-slate-800 flex items-center justify-between shadow-2xs">
 <div className="space-y-1">
 <span className="text-xs font-bold text-slate-500 dark:text-slate-400">
 التحصيلات والمصروفات
 </span>
 <div className="text-xs sm:text-sm font-black font-mono text-slate-800 dark:text-slate-200">
 <span className="text-emerald-600">+{formatNumber(customerDebtCollections)}</span> /{''}
 <span className="text-rose-600">-{formatNumber(cashExpenses + supplierPayments)}</span>{''}
 <span className="text-3xs font-bold">ج.م</span>
 </div>
 </div>
 <div className="w-10 h-10 rounded-2xl bg-purple-50 dark:bg-purple-950/50 text-purple-600 dark:text-purple-400 flex items-center justify-center shadow-inner">
 <Coins className="w-5 h-5"/>
 </div>
 </div>

 </div>

 {/* ==============================================================
 5. TABS NAVIGATION (تبويبات التدقيق، الجرد الفعلي، والأصناف)
 ============================================================== */}
 <div className="border-b border-slate-200 dark:border-slate-800 flex items-center justify-center gap-3 sm:gap-8">
 <button
 type="button"
 onClick={() => setActiveTab('financial_audit')}
 className={`pb-3 px-3 text-xs sm:text-sm font-black transition-all border-b-2 flex items-center gap-2 cursor-pointer ${
 activeTab ==='financial_audit'
 ?'border-blue-600 text-blue-600 dark:text-blue-400'
 :'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-300'
 }`}
 >
 <FileSpreadsheet className="w-4 h-4"/>
 <span>التدقيق المالي للدرج</span>
 </button>

 <button
 type="button"
 onClick={() => setActiveTab('physical_audit')}
 className={`pb-3 px-3 text-xs sm:text-sm font-black transition-all border-b-2 flex items-center gap-2 cursor-pointer ${
 activeTab ==='physical_audit'
 ?'border-blue-600 text-blue-600 dark:text-blue-400'
 :'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-300'
 }`}
 >
 <Coins className="w-4 h-4"/>
 <span>الجرد الفعلي والتسوية</span>
 </button>

 <button
 type="button"
 onClick={() => setActiveTab('top_products')}
 className={`pb-3 px-3 text-xs sm:text-sm font-black transition-all border-b-2 flex items-center gap-2 cursor-pointer ${
 activeTab ==='top_products'
 ?'border-blue-600 text-blue-600 dark:text-blue-400'
 :'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-300'
 }`}
 >
 <ShoppingBag className="w-4 h-4"/>
 <span>الأصناف الأكثر مبيعاً</span>
 </button>
 </div>

 {/* ==============================================================
 TAB 1: التدقيق المالي للدرج (Financial Drawer Audit)
 ============================================================== */}
 {activeTab ==='financial_audit'&& (
 <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
 
 {/* Right Column: حساب رصيد الدرج المتوقع (Cash Flow) */}
 <div className="bg-surface p-5 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-2xs space-y-4">
 <div className="flex items-center gap-2 pb-3 border-b border-slate-100 dark:border-slate-800">
 <Coins className="w-4 h-4 text-blue-600"/>
 <h3 className="text-xs sm:text-sm font-black text-slate-900 dark:text-white">
 حساب رصيد الدرج المتوقع (Cash Flow)
 </h3>
 </div>

 <div className="space-y-2.5 text-xs font-semibold">
 
 {/* 1. رصيد فتح الوردية */}
 <div className="flex items-center justify-between text-slate-600 dark:text-slate-400">
 <span>رصيد فتح الوردية</span>
 <span className="font-mono font-bold text-slate-900 dark:text-white">
 {formatNumber(openingBalance)} ج.م
 </span>
 </div>

 {/* 2. المبيعات النقدية الصافية */}
 <div className="flex items-center justify-between text-slate-600 dark:text-slate-400">
 <span>المبيعات النقدية الصافية</span>
 <span className="font-mono font-bold text-emerald-600 dark:text-emerald-400">
 + {formatNumber(totalCashSales)} ج.م
 </span>
 </div>

 {/* 3. تحصيلات الديون من العملاء */}
 <div className="flex items-center justify-between text-slate-600 dark:text-slate-400">
 <span>تحصيلات الديون من العملاء</span>
 <span className="font-mono font-bold text-emerald-600 dark:text-emerald-400">
 + {formatNumber(customerDebtCollections)} ج.م
 </span>
 </div>

 {/* 4. المرتجعات النقدية المسددة */}
 <div className="flex items-center justify-between text-slate-600 dark:text-slate-400">
 <span>المرتجعات النقدية المسددة</span>
 <span className="font-mono font-bold text-rose-600 dark:text-rose-400">
 - {formatNumber(totalCashReturns)} ج.م
 </span>
 </div>

 {/* 5. المصروفات النقدية الخارجة */}
 <div className="flex items-center justify-between text-slate-600 dark:text-slate-400">
 <span>المصروفات النقدية الخارجة</span>
 <span className="font-mono font-bold text-rose-600 dark:text-rose-400">
 - {formatNumber(cashExpenses)} ج.م
 </span>
 </div>

 {/* 6. المدفوعات النقدية للموردين */}
 <div className="flex items-center justify-between text-slate-600 dark:text-slate-400">
 <span>المدفوعات النقدية للموردين</span>
 <span className="font-mono font-bold text-rose-600 dark:text-rose-400">
 - {formatNumber(supplierPayments)} ج.م
 </span>
 </div>

 {/* Total Divider */}
 <div className="pt-3 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between text-xs sm:text-sm">
 <span className="font-black text-slate-900 dark:text-white">
 إجمالي النقدية المتوقعة في الدرج:
 </span>
 <span className="font-mono font-black text-emerald-600 dark:text-emerald-400 text-base sm:text-lg">
 {formatNumber(expectedDrawerCash)} ج.م
 </span>
 </div>

 </div>
 </div>

 {/* Left Column: تفصيل المبيعات حسب طريقة الدفع */}
 <div className="bg-surface p-5 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-2xs space-y-4 flex flex-col justify-between">
 <div>
 <div className="flex items-center gap-2 pb-3 border-b border-slate-100 dark:border-slate-800">
 <CreditCard className="w-4 h-4 text-blue-600"/>
 <h3 className="text-xs sm:text-sm font-black text-slate-900 dark:text-white">
 تفصيل المبيعات حسب طريقة الدفع
 </h3>
 </div>

 <div className="overflow-x-auto">
 <table className="w-full text-right text-xs mt-2">
 <thead>
 <tr className="border-b border-slate-200/80 dark:border-slate-800 text-slate-400 font-bold">
 <th className="pb-2">طريقة الدفع</th>
 <th className="pb-2 text-center">المبيعات</th>
 <th className="pb-2 text-left">المرتجعات</th>
 </tr>
 </thead>
 <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60 font-semibold">
 
 {/* كاش */}
 <tr>
 <td className="py-2.5 text-slate-800 dark:text-slate-200">النقدية في الدرج (كاش)</td>
 <td className="py-2.5 font-mono text-center text-slate-900 dark:text-white font-bold">
 {formatNumber(totalCashSales)} ج.م
 </td>
 <td className="py-2.5 font-mono text-left text-rose-600 font-bold">
 {totalCashReturns > 0 ?`-${formatNumber(totalCashReturns)} ج.م`:'0.00'}
 </td>
 </tr>

 {/* فيزا */}
 <tr>
 <td className="py-2.5 text-slate-800 dark:text-slate-200">الدفع بالبطاقة (كارت/فيزا)</td>
 <td className="py-2.5 font-mono text-center text-slate-900 dark:text-white font-bold">
 {formatNumber(totalCardSales)} ج.م
 </td>
 <td className="py-2.5 font-mono text-left text-slate-400">0.00</td>
 </tr>

 {/* كريديت */}
 <tr>
 <td className="py-2.5 text-slate-800 dark:text-slate-200">البيع الآجل (كريديت)</td>
 <td className="py-2.5 font-mono text-center text-slate-900 dark:text-white font-bold">
 {formatNumber(totalCreditSales)} ج.م
 </td>
 <td className="py-2.5 font-mono text-left text-slate-400">0.00</td>
 </tr>

 {/* تحصيلات */}
 <tr>
 <td className="py-2.5 text-slate-800 dark:text-slate-200">تحصيلات عملاء نقدية</td>
 <td className="py-2.5 font-mono text-center text-emerald-600 font-bold">
 {formatNumber(customerDebtCollections)} ج.م
 </td>
 <td className="py-2.5 font-mono text-left text-slate-400">0.00</td>
 </tr>

 {/* مصاريف */}
 <tr>
 <td className="py-2.5 text-slate-800 dark:text-slate-200">مصاريف نقدية</td>
 <td className="py-2.5 font-mono text-center text-slate-400">0.00</td>
 <td className="py-2.5 font-mono text-left text-rose-600 font-bold">
 {cashExpenses > 0 ?`-${formatNumber(cashExpenses)} ج.م`:'0.00'}
 </td>
 </tr>

 {/* مدفوعات موردين */}
 <tr>
 <td className="py-2.5 text-slate-800 dark:text-slate-200">مدفوعات موردين نقدية</td>
 <td className="py-2.5 font-mono text-center text-slate-400">0.00</td>
 <td className="py-2.5 font-mono text-left text-rose-600 font-bold">
 {supplierPayments > 0 ?`-${formatNumber(supplierPayments)} ج.م`:'0.00'}
 </td>
 </tr>

 </tbody>
 </table>
 </div>
 </div>

 {/* Footer summary */}
 <div className="pt-3 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between text-xs sm:text-sm bg-blue-50/50 dark:bg-blue-950/20 p-3 rounded-xl">
 <span className="font-black text-blue-900 dark:text-blue-200">
 صافي مبيعات الوردية:
 </span>
 <span className="font-mono font-black text-blue-700 dark:text-blue-300 text-base">
 {formatNumber(netSales)} ج.م
 </span>
 </div>

 </div>

 </div>
 )}

 {/* ==============================================================
 TAB 2: الجرد الفعلي والتسوية (Physical Cash Count & Settlement)
 ============================================================== */}
 {activeTab ==='physical_audit'&& (
 <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
 
 {/* Right Side: Actual Cash & Card Inputs */}
 <div className="space-y-4">
 
 {/* Card 1: الجرد الفعلي للنقدية (كاش الدرج) */}
 <div className="bg-surface p-5 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-2xs space-y-3">
 <div className="flex items-center justify-between">
 <div>
 <h4 className="text-xs sm:text-sm font-black text-slate-900 dark:text-white">
 الجرد الفعلي للنقدية (كاش الدرج) <span className="text-red-500">*</span>
 </h4>
 <span className="text-2xs font-semibold text-slate-400">
 الرصيد المتوقع: {formatNumber(expectedDrawerCash)} ج.م
 </span>
 </div>

 {/* Difference Badge */}
 <Badge
 className={`font-black text-xs px-2.5 py-1 rounded-lg ${
 cashDiff === 0
 ?'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
 : cashDiff < 0
 ?'bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300'
 :'bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300'
 }`}
 >
 {cashDiff === 0
 ?'مطابق تماماً'
 : cashDiff < 0
 ?`${formatNumber(cashDiff)} ج.م عجز`
 :`+${formatNumber(cashDiff)} ج.م زيادة`}
 </Badge>
 </div>

 <div className="relative">
 <Input
 type="number"
 step="0.01"
 min="0"
 value={actualCash}
 onChange={(e) => setActualCash(e.target.value)}
 placeholder="أدخل المبلغ الفعلي بعد الجرد..."
 className="h-11 rounded-xl text-xs font-bold font-mono text-left bg-slate-50/70 dark:bg-slate-900/70 border-slate-200 dark:border-slate-800 focus:bg-white"
 dir="ltr"
 autoFocus
 />
 <button
 type="button"
 onClick={() => setActualCash(String(expectedDrawerCash))}
 className="absolute left-2.5 top-2.5 text-3xs font-bold text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-1 cursor-pointer"
 >
 <Copy className="w-3 h-3"/>
 <span>مطابقة</span>
 </button>
 </div>
 </div>

 {/* Card 2: جرد ماكينة الفيزا (البطاقة) */}
 <div className="bg-surface p-5 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-2xs space-y-3">
 <div className="flex items-center justify-between">
 <div>
 <h4 className="text-xs sm:text-sm font-black text-slate-900 dark:text-white">
 جرد ماكينة الفيزا (البطاقة)
 </h4>
 <span className="text-2xs font-semibold text-slate-400">
 الرصيد المتوقع: {formatNumber(totalCardSales)} ج.م
 </span>
 </div>

 {/* Difference Badge */}
 <Badge
 className={`font-black text-xs px-2.5 py-1 rounded-lg ${
 cardDiff === 0
 ?'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
 : cardDiff < 0
 ?'bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300'
 :'bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300'
 }`}
 >
 {cardDiff === 0
 ?'مطابق تماماً'
 : cardDiff < 0
 ?`${formatNumber(cardDiff)} ج.م عجز`
 :`+${formatNumber(cardDiff)} ج.م زيادة`}
 </Badge>
 </div>

 <div className="relative">
 <Input
 type="number"
 step="0.01"
 min="0"
 value={actualCard}
 onChange={(e) => setActualCard(e.target.value)}
 placeholder="أدخل إجمالي إيصالات الفيزا..."
 className="h-11 rounded-xl text-xs font-bold font-mono text-left bg-slate-50/70 dark:bg-slate-900/70 border-slate-200 dark:border-slate-800 focus:bg-white"
 dir="ltr"
 />
 <button
 type="button"
 onClick={() => setActualCard(String(totalCardSales))}
 className="absolute left-2.5 top-2.5 text-3xs font-bold text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-1 cursor-pointer"
 >
 <Copy className="w-3 h-3"/>
 <span>مطابقة</span>
 </button>
 </div>
 </div>

 </div>

 {/* Left Side: Destination Treasury & Notes & Confirm Button */}
 <div className="space-y-4 flex flex-col justify-between">
 
 <div className="space-y-4">
 {/* Card 3: ترحيل النقدية الصافية إلى */}
 <div className="bg-surface p-5 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-2xs space-y-2">
 <Label className="text-xs font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
 <Building2 className="w-4 h-4 text-blue-600"/>
 <span>ترحيل النقدية الصافية إلى:</span>
 </Label>
 <Select value={destinationTreasuryId} onValueChange={setDestinationTreasuryId}>
 <SelectTrigger className="h-11 rounded-xl text-xs font-bold bg-slate-50/70 dark:bg-slate-900/70 border-slate-200 dark:border-slate-800">
 <SelectValue placeholder="اختر الخزينة..."/>
 </SelectTrigger>
 <SelectContent className="rounded-xl border-slate-200 dark:border-slate-800">
 {treasuries.map((t) => (
 <SelectItem key={t.id} value={t.id}>
 {t.name} (رصيدها الحالي: {formatNumber(t.current_balance)} ج.م)
 </SelectItem>
 ))}
 </SelectContent>
 </Select>
 </div>

 {/* Card 4: ملاحظات التدقيق والتسوية */}
 <div className="bg-surface p-5 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-2xs space-y-2">
 <Label className="text-xs font-bold text-slate-800 dark:text-slate-200">
 ملاحظات التدقيق والتسوية (اختياري):
 </Label>
 <Textarea
 rows={3}
 value={closeNotes}
 onChange={(e) => setCloseNotes(e.target.value)}
 placeholder="اكتب أي ملاحظات حول العجز أو الزيادة أو سبب الإغلاق..."
 className="rounded-xl text-xs font-bold bg-slate-50/70 dark:bg-slate-900/70 border-slate-200 dark:border-slate-800 resize-none"
 />
 </div>
 </div>

 {/* Primary Action Button */}
 <Button
 type="button"
 onClick={handleConfirmClose}
 disabled={isBusy}
 className="w-full h-12 bg-rose-600 hover:bg-rose-700 text-white text-xs sm:text-sm font-black rounded-2xl gap-2 shadow-md hover:shadow-lg transition-all cursor-pointer"
 >
 {isBusy ? <Loader2 className="w-5 h-5 animate-spin"/> : <Lock className="w-5 h-5"/>}
 <span>تأكيد التدقيق وإغلاق الوردية نهائياً</span>
 </Button>

 </div>

 </div>
 )}

 {/* ==============================================================
 TAB 3: الأصناف الأكثر مبيعاً (Top Selling Products)
 ============================================================== */}
 {activeTab ==='top_products'&& (
 <div className="space-y-4">
 
 {/* Header Stats */}
 <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
 <div className="p-3.5 rounded-2xl bg-surface border border-slate-200/80 dark:border-slate-800 flex items-center justify-between shadow-2xs">
 <div>
 <span className="text-2xs font-bold text-slate-400">إجمالي الأصناف</span>
 <div className="text-base font-black text-slate-900 dark:text-white">
 {topProductsList.length} صنف
 </div>
 </div>
 <div className="w-8 h-8 rounded-xl bg-blue-50 dark:bg-blue-950 text-blue-600 flex items-center justify-center">
 <Layers className="w-4 h-4"/>
 </div>
 </div>

 <div className="p-3.5 rounded-2xl bg-surface border border-slate-200/80 dark:border-slate-800 flex items-center justify-between shadow-2xs">
 <div>
 <span className="text-2xs font-bold text-slate-400">إجمالي الكميات المباعة</span>
 <div className="text-base font-black text-slate-900 dark:text-white">
 {totalItemsSoldQty} وحدة
 </div>
 </div>
 <div className="w-8 h-8 rounded-xl bg-purple-50 dark:bg-purple-950 text-purple-600 flex items-center justify-center">
 <ShoppingBag className="w-4 h-4"/>
 </div>
 </div>

 <div className="p-3.5 rounded-2xl bg-surface border border-slate-200/80 dark:border-slate-800 flex items-center justify-between shadow-2xs">
 <div>
 <span className="text-2xs font-bold text-slate-400">إجمالي إيراد الأصناف</span>
 <div className="text-base font-black text-emerald-600 font-mono">
 {formatNumber(totalItemsRevenue)} ج.م
 </div>
 </div>
 <div className="w-8 h-8 rounded-xl bg-emerald-50 dark:bg-emerald-950 text-emerald-600 flex items-center justify-center">
 <Receipt className="w-4 h-4"/>
 </div>
 </div>
 </div>

 {/* Products Table */}
 <div className="bg-surface rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-2xs overflow-hidden">
 <div className="overflow-x-auto">
 <table className="w-full text-right text-xs">
 <thead>
 <tr className="bg-slate-50/70 dark:bg-slate-900/50 border-b border-slate-200/80 dark:border-slate-800 text-slate-500 font-bold">
 <th className="py-3 px-4 w-12 text-center">#</th>
 <th className="py-3 px-4">الصنف والباركود</th>
 <th className="py-3 px-4 text-center">قبل البيع</th>
 <th className="py-3 px-4 text-center">المباع بالوردية</th>
 <th className="py-3 px-4 text-center">المتبقي (بعد البيع)</th>
 <th className="py-3 px-4 text-left">الإجمالي</th>
 </tr>
 </thead>
 <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60 font-semibold">
 {topProductsList.length === 0 ? (
 <tr>
 <td colSpan={6} className="py-8 text-center text-slate-400 font-bold">
 لم يتم تسجيل مبيعات أصناف في هذه الوردية بعد.
 </td>
 </tr>
 ) : (
 topProductsList.map((item, idx) => (
 <tr key={item.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30 transition-colors">
 <td className="py-3 px-4 text-center font-bold text-slate-400">
 <span className="w-6 h-6 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 inline-flex items-center justify-center text-2xs">
 {idx + 1}
 </span>
 </td>

 <td className="py-3 px-4">
 <div className="font-black text-slate-900 dark:text-white">
 {item.name}
 </div>
 <div className="text-3xs font-mono text-slate-400 flex items-center gap-2 mt-0.5">
 <span>{item.barcode}</span>
 <span>•</span>
 <span>السعر: {formatNumber(item.price)} ج.م</span>
 </div>
 </td>

 <td className="py-3 px-4 text-center">
 <Badge variant="outline"className="text-cyan-700 bg-cyan-50 dark:bg-cyan-950/40 dark:text-cyan-300 border-cyan-200 dark:border-cyan-800 font-bold">
 {item.stockBefore} {item.unitName}
 </Badge>
 </td>

 <td className="py-3 px-4 text-center">
 <Badge className="bg-blue-50 text-blue-700 dark:bg-blue-950 dark:text-blue-300 border border-blue-200 dark:border-blue-800 font-bold">
 -{item.qtySold} {item.unitName}
 </Badge>
 </td>

 <td className="py-3 px-4 text-center">
 <Badge
 variant="outline"
 className={`font-bold ${
 item.stockRemaining <= 0
 ?'bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-950/40 dark:text-rose-300'
 : item.stockRemaining <= 5
 ?'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/40 dark:text-amber-300'
 :'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300'
 }`}
 >
 {item.stockRemaining} {item.unitName}
 </Badge>
 </td>

 <td className="py-3 px-4 text-left font-mono font-black text-emerald-600 dark:text-emerald-400">
 {formatNumber(item.totalRevenue)} ج.م
 </td>
 </tr>
 ))
 )}
 </tbody>
 </table>
 </div>
 </div>

 </div>
 )}

 </div>

 </DialogContent>
 </Dialog>
 );
}