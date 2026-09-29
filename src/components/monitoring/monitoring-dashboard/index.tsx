'use client';

import React from'react';
import { useMonitoringDashboard } from'./useMonitoringDashboard';
import { MonitoringHeader } from'./components/MonitoringHeader';
import { KpiCardsGrid } from'./components/KpiCardsGrid';
import { SalesChartsSection } from'./components/SalesChartsSection';
import { StockShortageTable } from'./components/StockShortageTable';
import { ExpiryAlertsTable } from'./components/ExpiryAlertsTable';
import { CustomerDebtsTable } from'./components/CustomerDebtsTable';
import { SupplierDebtsTable } from'./components/SupplierDebtsTable';
import { RecentInvoicesSection } from'./components/RecentInvoicesSection';
import { DeliveryShipmentsTable } from'./components/DeliveryShipmentsTable';

export const MonitoringDashboard: React.FC = () => {
 const {
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
 } = useMonitoringDashboard();

 return (
 <div className="flex flex-col gap-6 w-full select-none"dir="rtl">
 {/* 1. Header with Title & Date Filters */}
 <MonitoringHeader
 dateRange={dateRange}
 setDateRange={setDateRange}
 selectedDate={selectedDate}
 setSelectedDate={setSelectedDate}
 loading={loading}
 refreshData={refreshData}
 />

 {/* 2. The 8 KPI Cards (Real Data from Database) */}
 <KpiCardsGrid kpis={kpis} />

 {/* 3. Analytics Charts Section (Dynamic Splines from Real DB) */}
 <SalesChartsSection
 dailySvgPath={dailySvgPath}
 dailySalesPoints={dailySalesPoints}
 maxDailySales={maxDailySales}
 monthlySvgPath={monthlySvgPath}
 monthlySalesPoints={monthlySalesPoints}
 maxMonthlySales={maxMonthlySales}
 />

 {/* 4. Table 1: تقرير تنبيه نواقص المخزون والأصناف الحرجة */}
 <StockShortageTable
 stockShortages={stockShortages}
 filteredShortages={filteredShortages}
 shortageSearch={shortageSearch}
 setShortageSearch={setShortageSearch}
 />

 {/* 5. Table 2: تشغيلات قاربت على انتهاء الصلاحية */}
 <ExpiryAlertsTable
 expiryItems={expiryItems}
 filteredExpiry={filteredExpiry}
 expirySearch={expirySearch}
 setExpirySearch={setExpirySearch}
 />

 {/* 6. Side-by-Side Tables: مستحقات ومديونيات العملاء والموردين */}
 <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 w-full">
 <CustomerDebtsTable
 customerDebts={customerDebts}
 filteredCustomerDebts={filteredCustomerDebts}
 />
 <SupplierDebtsTable
 supplierDebts={supplierDebts}
 filteredSupplierDebts={filteredSupplierDebts}
 />
 </div>

 {/* 7. Table 5: العمليات والطلبات الأخيرة */}
 <RecentInvoicesSection
 recentTab={recentTab}
 setRecentTab={setRecentTab}
 recentSales={recentSales}
 recentPurchases={recentPurchases}
 displayedRecent={displayedRecent}
 filteredRecent={filteredRecent}
 recentSearch={recentSearch}
 setRecentSearch={setRecentSearch}
 />

 {/* 8. Table 6: الشحنات والتوصيل المنزلي */}
 <DeliveryShipmentsTable
 deliveryShipments={deliveryShipments}
 filteredDeliveries={filteredDeliveries}
 deliverySearch={deliverySearch}
 setDeliverySearch={setDeliverySearch}
 />
 </div>
 );
};

export default MonitoringDashboard;
export * from'./types';
export * from'./utils';
export { useMonitoringDashboard } from'./useMonitoringDashboard';