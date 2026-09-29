'use client';

import React, { useState, useEffect, useMemo, Suspense } from'react';
import { useRouter, useSearchParams } from'next/navigation';
import { Button } from'@/components/ui/button';
import {
 FileSpreadsheet,
 Coins,
 ShoppingBag,
 AlertTriangle,
} from'lucide-react';
import { db } from'@/core/db/app_database';
import { SalesRepository } from'@/modules/sales/sales_repository';
import { useSessionStore } from'@/core/state/useSessionStore';
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
 FinancialVoucher,
} from'@/types';
import { toast } from'sonner';

// Modular Subcomponents
import { ShiftHeaderTimeline } from'./close/ShiftHeaderTimeline';
import { ShiftKpiCards } from'./close/ShiftKpiCards';
import { ShiftFinancialAuditTab } from'./close/ShiftFinancialAuditTab';
import { ShiftPhysicalAuditTab } from'./close/ShiftPhysicalAuditTab';
import { ShiftTopProductsTab } from'./close/ShiftTopProductsTab';
import type { TopProductItem, ShiftFinancialMetrics } from'./close/types';

export function CloseShiftPageView() {
 const router = useRouter();
 const searchParams = useSearchParams();
 const queryShiftId = searchParams.get('id');

 const { currentUser, activeBranchId, setActiveShift: setStoreActiveShift } = useSessionStore();
 const orgId = currentUser?.org_id ||'';
 const branchId = activeBranchId || currentUser?.branch_id ||'';

 const [activeShift, setActiveShift] = useState<CashierShift | null>(null);
 const [openShifts, setOpenShifts] = useState<CashierShift[]>([]);
 const [users, setUsers] = useState<UserType[]>([]);
 const [treasuries, setTreasuries] = useState<Treasury[]>([]);
 const [activeTab, setActiveTab] = useState<'financial_audit'|'physical_audit'|'top_products'>('financial_audit');
 const [isLoadingPage, setIsLoadingPage] = useState(true);

 // Operational records for active shift
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

 // 1. Initial Page Load: Load open shifts, users, treasuries
 useEffect(() => {
 let isMounted = true;

 async function initPage() {
 try {
 setIsLoadingPage(true);
 const [allOpen, allUsers, allTreasuries] = await Promise.all([
 db.cashier_shifts.where('status').equals('open').toArray(),
 db.users.toArray(),
 db.treasuries.where('is_active').equals(1).toArray().catch(() => db.treasuries.toArray()),
 ]);

 if (!isMounted) return;

 // Filter open shifts by current org/branch if available
 let filteredOpen = allOpen;
 if (orgId) {
 filteredOpen = filteredOpen.filter((s) => s.org_id === orgId);
 }
 if (branchId) {
 const branchMatches = filteredOpen.filter((s) => s.branch_id === branchId);
 if (branchMatches.length > 0) {
 filteredOpen = branchMatches;
 }
 }

 setOpenShifts(filteredOpen);
 setUsers(allUsers);
 setTreasuries(allTreasuries);

 // Select active target shift
 let target: CashierShift | null = null;
 if (queryShiftId) {
 target = filteredOpen.find((s) => s.id === queryShiftId) || null;
 if (!target) {
 const foundFromDb = await db.cashier_shifts.get(queryShiftId);
 if (foundFromDb) target = foundFromDb;
 }
 }

 if (!target && currentUser?.id) {
 target = filteredOpen.find((s) => s.user_id === currentUser.id) || null;
 }

 if (!target && filteredOpen.length > 0) {
 target = filteredOpen[0];
 }

 setActiveShift(target);
 } catch (err) {
 console.error('CloseShiftPage init error:', err);
 toast.error('حدث خطأ أثناء تحميل بيانات صفحة إغلاق الوردية');
 } finally {
 if (isMounted) setIsLoadingPage(false);
 }
 }

 initPage();
 return () => {
 isMounted = false;
 };
 }, [queryShiftId, currentUser, orgId, branchId]);

 // 2. Load operational data whenever activeShift changes
 useEffect(() => {
 const current = activeShift;
 if (!current) return;

 let isMounted = true;
 async function loadShiftDetails(target: CashierShift) {
 try {
 const [invs, rets, exps, vchs, prods, levels, unts] = await Promise.all([
 db.sales_invoices.where('shift_id').equals(target.id).toArray(),
 db.sales_returns.where('shift_id').equals(target.id).toArray(),
 db.expenses.where('shift_id').equals(target.id).toArray(),
 db.financial_vouchers.where('shift_id').equals(target.id).toArray(),
 db.products.where('org_id').equals(target.org_id).toArray(),
 db.stock_levels.toArray(),
 db.units.toArray(),
 ]);

 if (!isMounted) return;

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
 setActualCash(String(target.expected_closing_balance || 0));
 setActualCard(String(target.total_sales_card || 0));
 setDestinationTreasuryId(target.treasury_id || (treasuries[0]?.id ??''));
 setCloseNotes(target.notes ||'');
 } catch (err) {
 console.error('Error loading shift details:', err);
 }
 }

 loadShiftDetails(current);
 return () => {
 isMounted = false;
 };
 }, [activeShift, treasuries]);

 // 3. Metrics Calculation
 const metrics: ShiftFinancialMetrics = useMemo(() => {
 if (!activeShift) {
 return {
 openingBalance: 0,
 totalCashSales: 0,
 totalCardSales: 0,
 totalCreditSales: 0,
 totalInvoiceSales: 0,
 totalCashReturns: 0,
 totalReturnAmount: 0,
 netSales: 0,
 customerDebtCollections: 0,
 cashExpenses: 0,
 supplierPayments: 0,
 expectedDrawerCash: 0,
 };
 }

 const totalCashSales = invoices.reduce((sum, inv) => {
 if (inv.payment_type ==='cash') return sum + (inv.paid_amount || inv.total || 0);
 return sum + (inv.cash_amount || 0);
 }, 0);

 const totalCardSales = invoices.reduce((sum, inv) => {
 if (inv.payment_type ==='card') return sum + (inv.paid_amount || inv.total || 0);
 return sum + (inv.card_amount || 0);
 }, 0);

 const totalCreditSales = invoices.reduce((sum, inv) => {
 if (inv.payment_type ==='credit') return sum + (inv.total || 0);
 return sum + (inv.remaining_amount || 0);
 }, 0);

 const totalInvoiceSales = invoices.reduce((sum, inv) => sum + (inv.total || 0), 0);

 const totalCashReturns = returns.reduce((sum, ret) => {
 return sum + (ret.refunded_amount || ret.total || 0);
 }, 0);

 const totalReturnAmount = returns.reduce((sum, ret) => sum + (ret.total || 0), 0);
 const netSales = totalInvoiceSales - totalReturnAmount;

 const customerDebtCollections = vouchers
 .filter((v) => v.type ==='receipt')
 .reduce((sum, v) => sum + (v.amount || 0), 0);

 const cashExpenses = expenses.reduce((sum, e) => sum + (e.amount || 0), 0);

 const supplierPayments = vouchers
 .filter((v) => v.type ==='payment')
 .reduce((sum, v) => sum + (v.amount || 0), 0);

 const openingBalance = activeShift.opening_balance || 0;
 const expectedDrawerCash = openingBalance + totalCashSales - totalCashReturns + customerDebtCollections - cashExpenses - supplierPayments;

 return {
 openingBalance,
 totalCashSales,
 totalCardSales,
 totalCreditSales,
 totalInvoiceSales,
 totalCashReturns,
 totalReturnAmount,
 netSales,
 customerDebtCollections,
 cashExpenses,
 supplierPayments,
 expectedDrawerCash,
 };
 }, [activeShift, invoices, returns, vouchers, expenses]);

 // 4. Top Selling Products Aggregation
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

 // 5. Confirm Close Handler
 const handleConfirmClose = async () => {
 if (!activeShift) return;

 try {
 setIsBusy(true);
 const actualCashVal = parseFloat(String(actualCash).replace(/,/g,'')) || 0;
 const actualCardVal = parseFloat(String(actualCard).replace(/,/g,'')) || 0;

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

 // If closed own shift, clear from session store
 if (activeShift.user_id === currentUser?.id) {
 setStoreActiveShift(null);
 }

 toast.success(`تم تدقيق وإغلاق الوردية #${activeShift.shift_number} بنجاح!`);
 router.push('/sales/shifts');
 } catch (err: any) {
 console.error('Error closing shift:', err);
 toast.error(err?.message ||'حدث خطأ أثناء تدقيق وإغلاق الوردية');
 } finally {
 setIsBusy(false);
 }
 };

 if (isLoadingPage) {
 return (
 <div className="min-h-screen w-full flex items-center justify-center bg-app dark:bg-[#090d16]">
 <div className="flex flex-col items-center gap-3">
 <div className="w-10 h-10 border-3 border-blue-600 border-t-transparent rounded-full animate-spin"/>
 <span className="text-xs font-bold text-slate-500">جاري تحميل بيانات وتدقيق الوردية...</span>
 </div>
 </div>
 );
 }

 if (!activeShift) {
 return (
 <div className="min-h-screen w-full flex flex-col items-center justify-center bg-app dark:bg-[#090d16] p-4 text-center space-y-4">
 <div className="w-16 h-16 rounded-3xl bg-amber-50 dark:bg-amber-950/50 text-amber-600 flex items-center justify-center">
 <AlertTriangle className="w-8 h-8"/>
 </div>
 <h2 className="text-lg font-black text-slate-900 dark:text-white">
 لا توجد وردية مفتوحة حالياً لتدقيقها
 </h2>
 <p className="text-xs text-slate-500 max-w-sm">
 لم يتم العثور على أي وردية مفتوحة تتطلب الإغلاق في هذا الفرع. يمكنك فتح وردية جديدة للبدء.
 </p>
 <div className="flex items-center gap-3 pt-2">
 <Button onClick={() => router.push('/sales/pos')} className="bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-xl px-5 h-10 cursor-pointer">
 العودة إلى نقطة البيع
 </Button>
 <Button variant="outline"onClick={() => router.push('/sales/shifts')} className="font-bold text-xs rounded-xl px-5 h-10 cursor-pointer">
 سجل الورديات
 </Button>
 </div>
 </div>
 );
 }

 return (
 <div className="min-h-screen w-full bg-app dark:bg-[#090d16] text-slate-900 dark:text-slate-100 flex flex-col font-sans select-none overflow-x-hidden"dir="rtl">
 {/* 1. Top Executive Header, Open Shifts & Timeline */}
 <div className="max-w-7xl w-full mx-auto p-4 sm:p-6 lg:p-8 space-y-6">
 <ShiftHeaderTimeline
 activeShift={activeShift}
 openShifts={openShifts}
 users={users}
 onSelectShift={(s) => setActiveShift(s)}
 onPrint={() => window.print()}
 />

 {/* 2. 4 Executive KPI Cards */}
 <ShiftKpiCards metrics={metrics} />

 {/* 3. Segmented Navigation Tabs */}
 <div className="flex justify-center">
 <div className="inline-flex p-1.5 bg-slate-200/70 dark:bg-slate-800/80 rounded-2xl border border-slate-200/80 dark:border-slate-700/80 shadow-inner max-w-full overflow-x-auto gap-1">
 <button
 type="button"
 onClick={() => setActiveTab('financial_audit')}
 className={`px-4 sm:px-6 py-2.5 rounded-xl text-xs sm:text-sm font-black transition-all flex items-center gap-2 shrink-0 cursor-pointer ${
 activeTab ==='financial_audit'
 ?'bg-surface text-blue-600 dark:text-blue-400 shadow-sm border border-slate-200/60 dark:border-slate-700/60'
 :'text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white'
 }`}
 >
 <FileSpreadsheet className="w-4 h-4"/>
 <span>التدقيق المالي للدرج</span>
 </button>

 <button
 type="button"
 onClick={() => setActiveTab('physical_audit')}
 className={`px-4 sm:px-6 py-2.5 rounded-xl text-xs sm:text-sm font-black transition-all flex items-center gap-2 shrink-0 cursor-pointer ${
 activeTab ==='physical_audit'
 ?'bg-surface text-blue-600 dark:text-blue-400 shadow-sm border border-slate-200/60 dark:border-slate-700/60'
 :'text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white'
 }`}
 >
 <Coins className="w-4 h-4"/>
 <span>الجرد الفعلي والتسوية</span>
 </button>

 <button
 type="button"
 onClick={() => setActiveTab('top_products')}
 className={`px-4 sm:px-6 py-2.5 rounded-xl text-xs sm:text-sm font-black transition-all flex items-center gap-2 shrink-0 cursor-pointer ${
 activeTab ==='top_products'
 ?'bg-surface text-blue-600 dark:text-blue-400 shadow-sm border border-slate-200/60 dark:border-slate-700/60'
 :'text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white'
 }`}
 >
 <ShoppingBag className="w-4 h-4"/>
 <span>الأصناف الأكثر مبيعاً</span>
 {topProductsList.length > 0 && (
 <span className="text-3xs font-mono px-2 py-0.5 rounded-full bg-blue-50 text-blue-600 dark:bg-blue-950/80 dark:text-blue-300 font-bold border border-blue-200/60 dark:border-blue-800/60">
 {topProductsList.length}
 </span>
 )}
 </button>
 </div>
 </div>

 {/* 4. Tab Contents */}
 {activeTab ==='financial_audit'&& (
 <ShiftFinancialAuditTab metrics={metrics} />
 )}

 {activeTab ==='physical_audit'&& (
 <ShiftPhysicalAuditTab
 metrics={metrics}
 actualCash={actualCash}
 setActualCash={setActualCash}
 actualCard={actualCard}
 setActualCard={setActualCard}
 destinationTreasuryId={destinationTreasuryId}
 setDestinationTreasuryId={setDestinationTreasuryId}
 treasuries={treasuries}
 closeNotes={closeNotes}
 setCloseNotes={setCloseNotes}
 isBusy={isBusy}
 onConfirmClose={handleConfirmClose}
 />
 )}

 {activeTab ==='top_products'&& (
 <ShiftTopProductsTab
 topProducts={topProductsList}
 totalSoldQty={totalItemsSoldQty}
 totalSoldRevenue={totalItemsRevenue}
 />
 )}
 </div>
 </div>
 );
}

export function CloseShiftPage() {
 return (
 <Suspense
 fallback={
 <div className="min-h-screen w-full flex items-center justify-center bg-app dark:bg-[#090d16]">
 <div className="flex flex-col items-center gap-3">
 <div className="w-10 h-10 border-3 border-blue-600 border-t-transparent rounded-full animate-spin"/>
 <span className="text-xs font-bold text-slate-500">جاري تحميل الصفحة...</span>
 </div>
 </div>
 }
 >
 <CloseShiftPageView />
 </Suspense>
 );
}