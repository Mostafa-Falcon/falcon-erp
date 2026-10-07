import { StockTransfer, StockTransferItem, Product, Branch, Warehouse } from '@/types';

export interface SelectableUnitOption {
    id: string;
    unitId: string;
    unitName: string;
    conversionFactor: number;
}

export interface TransferDraftItem {
    productId: string;
    productName: string;
    barcode: string;
    unitId: string;
    unit: string;
    unitFactor: number;
    quantity: number; // in chosen unit
    baseQuantity: number; // in base units
    costPrice: number;
    availableStock: number; // in base units in sender branch
    unitCost: number;
}

export interface TransferStats {
    total: number;
    pending: number;
    inTransit: number;
    completed: number;
}

export type TransferFilterStatus = 'all' | 'pending' | 'in_transit' | 'completed' | 'cancelled';