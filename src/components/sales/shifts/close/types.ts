export interface TopProductItem {
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

export interface ShiftFinancialMetrics {
 openingBalance: number;
 totalCashSales: number;
 totalCardSales: number;
 totalCreditSales: number;
 totalInvoiceSales: number;
 totalCashReturns: number;
 totalReturnAmount: number;
 netSales: number;
 customerDebtCollections: number;
 cashExpenses: number;
 supplierPayments: number;
 expectedDrawerCash: number;
}