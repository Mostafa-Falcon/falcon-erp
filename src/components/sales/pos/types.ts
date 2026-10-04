import type { Product, ProductBatch, Unit, Contact, OrderModifier } from '@/types';

export interface CartModifier {
  id: string;
  name: string;
  price: number;
}

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
  serialNumber?: string;
  maxReturnQty?: number;
  isReturnLine?: boolean;
  originalInvoiceItemId?: string;

  // Domain Specific Extensions
  selectedModifiers?: CartModifier[];
  kitchenNotes?: string;
  orderType?: 'dine_in' | 'takeaway' | 'delivery';
  tableId?: string;
  tableNumber?: string;
  deviceCondition?: 'new' | 'like_new' | 'used';
  deviceImei?: string;
  warrantyDays?: number;
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
  tableNumber?: string;
  orderType?: 'dine_in' | 'takeaway' | 'delivery';
}

export interface UnitOption {
  unitId: string;
  factor: number;
  price?: number;
}