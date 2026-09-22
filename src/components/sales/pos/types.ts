import type { Product, ProductBatch, Unit, Contact } from '@/types';

export interface CartLine {
  key: string;
  productId: string;
  batchId: string;
  unitId: string;
  factor: number;
  qty: number;
  price: number;
  discount: number;
  cost: number;
  taxRate: number;
  priceTier?: 'default' | 'old' | 'wholesale';
  maxReturnQty?: number;
  isReturnLine?: boolean;
  originalInvoiceItemId?: string;
}

export interface HeldSale {
  id: string;
  createdAt: string;
  customerName?: string;
  customerId?: string;
  customerMode: 'cash' | 'customer' | 'both' | 'supplier';
  cart: CartLine[];
  globalDiscount: number;
  notes?: string;
  total: number;
}

export interface UnitOption {
  unitId: string;
  factor: number;
  price?: number;
}
