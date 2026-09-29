export interface KpiData {
 totalSales: number;
 netProfit: number;
 creditSales: number;
 salesReturns: number;
 totalPurchases: number;
 purchasesReturns: number;
 expenses: number;
 cashCollected: number;
}

export interface StockAlertItem {
 id: string;
 name: string;
 sku: string;
 remainingStock: number;
 safetyLimit: number;
 purchasePrice: number;
 salePrice: number;
}

export interface ExpiryAlertItem {
 id: string;
 name: string;
 batchNumber: string;
 currentQuantity: number;
 expiryDate: string;
 daysRemaining: number;
 isExpired: boolean;
}

export interface ContactDebtItem {
 id: string;
 name: string;
 phone?: string;
 balance: number;
 creditLimit?: number;
}

export interface RecentInvoiceItem {
 id: string;
 invoiceNumber: string;
 partyName: string;
 total: number;
 remainingAmount: number;
 paymentMethod: string;
 date: string;
 formattedDateTime: string;
 status: string;
}

export interface DeliveryShipmentItem {
 id: string;
 index: number;
 invoiceNumber: string;
 customerName: string;
 total: number;
 paymentMethod: string;
 status: string;
}

export interface DailySalesPoint {
 label: string;
 date: string;
 amount: number;
}

export interface MonthlySalesPoint {
 monthName: string;
 amount: number;
}