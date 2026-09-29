import { useState, useEffect, useMemo, useCallback } from'react';
import { useSessionStore } from'@/core/state/useSessionStore';
import type {
 KpiData,
 StockAlertItem,
 ExpiryAlertItem,
 ContactDebtItem,
 RecentInvoiceItem,
 DeliveryShipmentItem,
 DailySalesPoint,
 MonthlySalesPoint,
} from'./types';
import {
 isDateMatchingFilter,
 formatPayment,
 formatArabicDateTime,
 computeSvgPath,
} from'./utils';

export function useMonitoringDashboard() {
 const { currentUser } = useSessionStore();
 const [dateRange, setDateRange] = useState('آخر 30 يوم');
 const [selectedDate, setSelectedDate] = useState('');
 const [recentTab, setRecentTab] = useState<'sales'|'purchases'>('sales');

 // Search queries for tables
 const [shortageSearch, setShortageSearch] = useState('');
 const [expirySearch, setExpirySearch] = useState('');
 const [customerSearch, setCustomerSearch] = useState('');
 const [supplierSearch, setSupplierSearch] = useState('');
 const [recentSearch, setRecentSearch] = useState('');
 const [deliverySearch, setDeliverySearch] = useState('');

 // 100% Real Live Data States
 const [kpis, setKpis] = useState<KpiData>({
 totalSales: 0,
 netProfit: 0,
 creditSales: 0,
 salesReturns: 0,
 totalPurchases: 0,
 purchasesReturns: 0,
 expenses: 0,
 cashCollected: 0,
 });

 const [dailySalesPoints, setDailySalesPoints] = useState<DailySalesPoint[]>([]);
 const [monthlySalesPoints, setMonthlySalesPoints] = useState<MonthlySalesPoint[]>([]);
 const [stockShortages, setStockShortages] = useState<StockAlertItem[]>([]);
 const [expiryItems, setExpiryItems] = useState<ExpiryAlertItem[]>([]);
 const [customerDebts, setCustomerDebts] = useState<ContactDebtItem[]>([]);
 const [supplierDebts, setSupplierDebts] = useState<ContactDebtItem[]>([]);
 const [recentSales, setRecentSales] = useState<RecentInvoiceItem[]>([]);
 const [recentPurchases, setRecentPurchases] = useState<RecentInvoiceItem[]>([]);
 const [deliveryShipments, setDeliveryShipments] = useState<DeliveryShipmentItem[]>([]);
 const [loading, setLoading] = useState(true);
 const [refreshIndex, setRefreshIndex] = useState(0);

 const refreshData = useCallback(() => {
 setRefreshIndex((prev) => prev + 1);
 }, []);

 const checkDateMatch = useCallback(
 (isoString?: string) => isDateMatchingFilter(isoString, dateRange, selectedDate),
 [dateRange, selectedDate]
 );

 useEffect(() => {
 const orgId = currentUser?.org_id;
 if (!orgId) return;

 let isMounted = true;

 const fetchRealData = async () => {
 try {
 const { db } = await import('@/core/db/app_database');

 // 1. Fetch Real Invoices, Returns, Expenses, and Treasuries
 const [allSales, allPurchases, allSalesReturns, allPurchReturns, allExpenses, allTreasuries] = await Promise.all([
 db.sales_invoices.where('org_id').equals(orgId).toArray(),
 db.purchase_invoices.where('org_id').equals(orgId).toArray(),
 db.sales_returns.where('org_id').equals(orgId).toArray(),
 db.purchase_returns.where('org_id').equals(orgId).toArray(),
 db.expenses.where('org_id').equals(orgId).toArray(),
 db.treasuries.where('org_id').equals(orgId).toArray(),
 ]);

 // Filter by Date Range
 const filteredSales = allSales.filter((s) => checkDateMatch(s.invoice_date || s.created_at));
 const filteredPurchases = allPurchases.filter((p) => checkDateMatch(p.invoice_date || p.created_at));
 const filteredSalesRets = allSalesReturns.filter((r) => checkDateMatch(r.return_date || r.created_at));
 const filteredPurchRets = allPurchReturns.filter((r) => checkDateMatch(r.return_date || r.created_at));
 const filteredExpenses = allExpenses.filter((e) => checkDateMatch(e.created_at));

 // Real KPI sums
 const salesTotal = filteredSales.reduce((acc, s) => acc + (Number(s.total) || 0), 0);
 const creditSalesTotal = filteredSales.filter((s) => s.payment_type ==='credit').reduce((acc, s) => acc + (Number(s.total) || 0), 0);
 const salesReturnTotal = filteredSalesRets.reduce((acc, r) => acc + (Number(r.total) || 0), 0);
 const purchaseTotal = filteredPurchases.reduce((acc, p) => acc + (Number(p.total) || 0), 0);
 const purchReturnTotal = filteredPurchRets.reduce((acc, r) => acc + (Number(r.total) || 0), 0);
 const expenseTotal = filteredExpenses.reduce((acc, e) => acc + (Number(e.amount) || 0), 0);
 const cashBalance = allTreasuries.reduce((acc, t) => acc + (Number(t.current_balance) || 0), 0);

 const netSales = salesTotal - salesReturnTotal;
 const netPurchases = purchaseTotal - purchReturnTotal;
 const realNetProfit = netSales - netPurchases - expenseTotal;

 // 2. Real Daily Trend Data (Last 30 Days)
 const dailyPoints: DailySalesPoint[] = [];
 const now = new Date();
 for (let i = 29; i >= 0; i--) {
 const d = new Date(now);
 d.setDate(d.getDate() - i);
 const dateKey = d.toISOString().slice(0, 10);
 const dayLabel =`${d.getDate()}/${d.getMonth() + 1}`;
 const daySalesSum = allSales
 .filter((s) => (s.invoice_date || s.created_at).startsWith(dateKey))
 .reduce((acc, s) => acc + (Number(s.total) || 0), 0);
 dailyPoints.push({ label: dayLabel, date: dateKey, amount: daySalesSum });
 }

 // 3. Real Monthly Trend Data (Current Fiscal Year Months)
 const arabicMonths = ['يناير','فبراير','مارس','أبريل','مايو','يونيو','يوليو','أغسطس','سبتمبر','أكتوبر','نوفمبر','ديسمبر'];
 const currentYear = now.getFullYear();
 const monthlyPoints: MonthlySalesPoint[] = arabicMonths.map((name, monthIndex) => {
 const monthStr =`${currentYear}-${String(monthIndex + 1).padStart(2,'0')}`;
 const monthSales = allSales
 .filter((s) => (s.invoice_date || s.created_at).startsWith(monthStr))
 .reduce((acc, s) => acc + (Number(s.total) || 0), 0);
 return { monthName: name, amount: monthSales };
 });

 // 4. Real Products & Stock Shortages
 const products = await db.products.where('org_id').equals(orgId).toArray();
 const stockLevels = await db.stock_levels.toArray();
 const stockMap = new Map<string, number>();
 stockLevels.forEach((sl) => {
 stockMap.set(sl.product_id, (stockMap.get(sl.product_id) || 0) + (Number(sl.available_quantity) || 0));
 });

 const realShortages: StockAlertItem[] = [];
 products.forEach((p) => {
 const qty = stockMap.get(p.id) ?? 0;
 const limit = Number(p.min_stock_alert) || 5;
 if (qty <= limit) {
 realShortages.push({
 id: p.id,
 name: p.name,
 sku: p.sku ||'N/A',
 remainingStock: qty,
 safetyLimit: limit,
 purchasePrice: Number(p.purchase_price) || 0,
 salePrice: Number(p.sale_price) || 0,
 });
 }
 });

 // 5. Real Batches Nearing Expiry (within 90 days)
 const allBatches = await db.product_batches.toArray();
 const productMap = new Map(products.map((p) => [p.id, p.name]));
 const realExpiry: ExpiryAlertItem[] = [];
 const currentTimestamp = Date.now();

 allBatches.forEach((batch) => {
 if (batch.expiry_date) {
 const expTime = new Date(batch.expiry_date).getTime();
 const daysRemaining = Math.ceil((expTime - currentTimestamp) / (1000 * 60 * 60 * 24));
 if (daysRemaining <= 90) {
 realExpiry.push({
 id: batch.id,
 name: productMap.get(batch.product_id) ||'صنف غير معرف',
 batchNumber: batch.batch_number ||'N/A',
 currentQuantity: Number(batch.current_quantity) || 0,
 expiryDate: batch.expiry_date,
 daysRemaining,
 isExpired: daysRemaining < 0,
 });
 }
 }
 });

 // 6. Real Customer & Supplier Debts from Contacts
 const contacts = await db.contacts.where('org_id').equals(orgId).toArray();
 const realCustDebts: ContactDebtItem[] = contacts
 .filter((c) => (c.type ==='customer'|| c.type ==='both') && Number(c.current_balance) > 0)
 .map((c) => ({
 id: c.id,
 name: c.name,
 phone: c.phone || c.mobile,
 balance: Number(c.current_balance) || 0,
 creditLimit: Number(c.credit_limit) || 0,
 }));

 const realSuppDebts: ContactDebtItem[] = contacts
 .filter((c) => (c.type ==='supplier'|| c.type ==='both') && Number(c.current_balance) !== 0)
 .map((c) => ({
 id: c.id,
 name: c.name,
 phone: c.phone || c.mobile,
 balance: Math.abs(Number(c.current_balance) || 0),
 creditLimit: Number(c.credit_limit) || 0,
 }));

 // 7. Real Recent Invoices
 const contactMap = new Map(contacts.map((c) => [c.id, c.name]));

 const recentSalesList: RecentInvoiceItem[] = allSales.slice(-25).reverse().map((s) => ({
 id: s.id,
 invoiceNumber: s.invoice_number,
 partyName: (s.customer_id ? contactMap.get(s.customer_id) : undefined) ||'عميل نقدي',
 total: Number(s.total) || 0,
 remainingAmount: Number(s.remaining_amount) || 0,
 paymentMethod: formatPayment(s.payment_type),
 date: (s.invoice_date || s.created_at).slice(0, 10),
 formattedDateTime: formatArabicDateTime(s.invoice_date || s.created_at),
 status: s.status ==='completed'?'مكتملة': s.status ==='draft'?'مسودة':'معلقة',
 }));

 const recentPurchasesList: RecentInvoiceItem[] = allPurchases.slice(-25).reverse().map((p) => ({
 id: p.id,
 invoiceNumber: p.invoice_number,
 partyName: (p.supplier_id ? contactMap.get(p.supplier_id) : undefined) ||'مورد نقدي',
 total: Number(p.total) || 0,
 remainingAmount: Number(p.remaining_amount) || 0,
 paymentMethod: formatPayment(p.payment_type),
 date: (p.invoice_date || p.created_at).slice(0, 10),
 formattedDateTime: formatArabicDateTime(p.invoice_date || p.created_at),
 status: p.status ==='completed'?'مستلمة':'مسجلة',
 }));

 // 8. Real Delivery Shipments
 const deliverySales = allSales.filter((s) => {
 const notes = (s.notes ||'').toLowerCase();
 return notes.includes('توصيل') || notes.includes('شحن') || notes.includes('دليفري') || notes.includes('delivery');
 });

 const deliveryList: DeliveryShipmentItem[] = deliverySales
 .slice(-25)
 .reverse()
 .map((s, idx) => ({
 id: s.id,
 index: idx + 1,
 invoiceNumber: s.invoice_number,
 customerName: (s.customer_id ? contactMap.get(s.customer_id) : undefined) ||'عميل نقدي',
 total: Number(s.total) || 0,
 paymentMethod: formatPayment(s.payment_type),
 status: s.status ==='completed'?'تم التسليم':'قيد التوصيل',
 }));

 if (isMounted) {
 setKpis({
 totalSales: salesTotal,
 netProfit: realNetProfit,
 creditSales: creditSalesTotal,
 salesReturns: salesReturnTotal,
 totalPurchases: purchaseTotal,
 purchasesReturns: purchReturnTotal,
 expenses: expenseTotal,
 cashCollected: cashBalance,
 });

 setDailySalesPoints(dailyPoints);
 setMonthlySalesPoints(monthlyPoints);
 setStockShortages(realShortages);
 setExpiryItems(realExpiry);
 setCustomerDebts(realCustDebts);
 setSupplierDebts(realSuppDebts);
 setRecentSales(recentSalesList);
 setRecentPurchases(recentPurchasesList);
 setDeliveryShipments(deliveryList);
 setLoading(false);
 }
 } catch (err) {
 console.warn('Monitoring data query notice:', err);
 if (isMounted) setLoading(false);
 }
 };

 fetchRealData();
 return () => {
 isMounted = false;
 };
 }, [currentUser, checkDateMatch, refreshIndex]);

 // Filtered Shortages
 const filteredShortages = useMemo(() => {
 if (!shortageSearch.trim()) return stockShortages;
 const q = shortageSearch.toLowerCase();
 return stockShortages.filter((item) =>
 item.name.toLowerCase().includes(q) || item.sku.toLowerCase().includes(q)
 );
 }, [stockShortages, shortageSearch]);

 // Filtered Expiry
 const filteredExpiry = useMemo(() => {
 if (!expirySearch.trim()) return expiryItems;
 const q = expirySearch.toLowerCase();
 return expiryItems.filter((item) =>
 item.name.toLowerCase().includes(q) || item.batchNumber.toLowerCase().includes(q)
 );
 }, [expiryItems, expirySearch]);

 // Filtered Customer Debts
 const filteredCustomerDebts = useMemo(() => {
 if (!customerSearch.trim()) return customerDebts;
 const q = customerSearch.toLowerCase();
 return customerDebts.filter((c) => c.name.toLowerCase().includes(q));
 }, [customerDebts, customerSearch]);

 // Filtered Supplier Debts
 const filteredSupplierDebts = useMemo(() => {
 if (!supplierSearch.trim()) return supplierDebts;
 const q = supplierSearch.toLowerCase();
 return supplierDebts.filter((s) => s.name.toLowerCase().includes(q));
 }, [supplierDebts, supplierSearch]);

 // Filtered Recent Invoices
 const displayedRecent = recentTab ==='sales'? recentSales : recentPurchases;
 const filteredRecent = useMemo(() => {
 if (!recentSearch.trim()) return displayedRecent;
 const q = recentSearch.toLowerCase();
 return displayedRecent.filter((item) =>
 item.invoiceNumber.toLowerCase().includes(q) ||
 item.partyName.toLowerCase().includes(q)
 );
 }, [displayedRecent, recentSearch]);

 // Filtered Delivery Shipments
 const filteredDeliveries = useMemo(() => {
 if (!deliverySearch.trim()) return deliveryShipments;
 const q = deliverySearch.toLowerCase();
 return deliveryShipments.filter((item) =>
 item.invoiceNumber.toLowerCase().includes(q) ||
 item.customerName.toLowerCase().includes(q)
 );
 }, [deliveryShipments, deliverySearch]);

 // Dynamic SVG Curve Computation for Daily Chart
 const maxDailySales = useMemo(() => {
 const max = Math.max(...dailySalesPoints.map((p) => p.amount), 0);
 return max > 0 ? max : 100;
 }, [dailySalesPoints]);

 const dailySvgPath = useMemo(() => {
 return computeSvgPath(dailySalesPoints, maxDailySales);
 }, [dailySalesPoints, maxDailySales]);

 // Dynamic SVG Curve Computation for Monthly Chart
 const maxMonthlySales = useMemo(() => {
 const max = Math.max(...monthlySalesPoints.map((p) => p.amount), 0);
 return max > 0 ? max : 100;
 }, [monthlySalesPoints]);

 const monthlySvgPath = useMemo(() => {
 return computeSvgPath(monthlySalesPoints, maxMonthlySales);
 }, [monthlySalesPoints, maxMonthlySales]);

 return {
 dateRange,
 setDateRange,
 selectedDate,
 setSelectedDate,
 recentTab,
 setRecentTab,
 shortageSearch,
 setShortageSearch,
 expirySearch,
 setExpirySearch,
 customerSearch,
 setCustomerSearch,
 supplierSearch,
 setSupplierSearch,
 recentSearch,
 setRecentSearch,
 deliverySearch,
 setDeliverySearch,
 kpis,
 dailySalesPoints,
 monthlySalesPoints,
 stockShortages,
 expiryItems,
 customerDebts,
 supplierDebts,
 recentSales,
 recentPurchases,
 deliveryShipments,
 loading,
 refreshData,
 filteredShortages,
 filteredExpiry,
 filteredCustomerDebts,
 filteredSupplierDebts,
 displayedRecent,
 filteredRecent,
 filteredDeliveries,
 maxDailySales,
 dailySvgPath,
 maxMonthlySales,
 monthlySvgPath,
 };
}