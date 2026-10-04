/**
 * 🦅 LOGIXA FALCON ERP - RESTAURANTS, CAFES & FOOD SERVICES TYPES
 */

import type { EntityId, ISODateString } from './common';

export type TableStatus = 'available' | 'occupied' | 'reserved' | 'billing';
export type RestaurantOrderType = 'dine_in' | 'takeaway' | 'delivery';

export interface RestaurantTable {
  id: EntityId;
  org_id: EntityId;
  branch_id?: EntityId;
  table_number: string; // e.g. "T-01", "12", "VIP-1"
  section_name?: string; // e.g. "الصالة الداخلية", "الحديقة / الخارجي", "العائلات", "VIP"
  capacity: number; // e.g. 2, 4, 6, 8
  status: TableStatus;
  current_invoice_id?: EntityId | null;
  current_order_total?: number;
  opened_at?: ISODateString | null;
  notes?: string;
  created_at: ISODateString;
  updated_at: ISODateString;
  sync_status?: 'synced' | 'pending' | 'failed';
}

export type ModifierType = 'size' | 'addon' | 'customization';

export interface OrderModifier {
  id: EntityId;
  org_id: EntityId;
  name: string; // e.g. "حجم كبير L", "شوت إسبريسو إضافي", "حليب لوز", "جبنة إضافية", "بدون بصل"
  category?: string; // "الأحجام", "الإضافات والمقبلات", "تخصيصات المطبخ", "خيارات الحليب"
  type: ModifierType;
  price: number;
  is_active: boolean;
  created_at: ISODateString;
  updated_at: ISODateString;
  sync_status?: 'synced' | 'pending' | 'failed';
}

export interface KitchenTicketItem {
  name: string;
  qty: number;
  modifiers?: string[];
  kitchenNotes?: string;
}

export interface KitchenOrderTicket {
  ticketNumber: string;
  orderType: RestaurantOrderType;
  tableNumber?: string;
  sectionName?: string;
  timestamp: string;
  cashierName?: string;
  customerName?: string;
  items: KitchenTicketItem[];
}
