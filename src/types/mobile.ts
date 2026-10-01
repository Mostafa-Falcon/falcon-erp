/**
 * 🦅 LOGIXA FALCON ERP - MOBILE, MAINTENANCE & DIGITAL WALLET TYPES
 */

import type { EntityId, ISODateString } from './common';

// ==========================================
// PRODUCT SERIALS / IMEI TRACKING
// ==========================================

export type SerialStatus = 'in_stock' | 'sold' | 'under_maintenance' | 'returned' | 'transferred' | 'damaged';
export type DeviceCondition = 'new' | 'used' | 'refurbished';

export interface ProductSerial {
  id: EntityId;
  org_id: EntityId;
  branch_id?: EntityId;
  warehouse_id?: EntityId;
  product_id: EntityId;
  product_name?: string;
  serial_number: string; // IMEI 1 or Serial Number
  imei2?: string; // Secondary IMEI for dual SIM devices
  condition: DeviceCondition;
  status: SerialStatus;
  cost_price: number;
  selling_price?: number;
  warranty_months?: number;
  supplier_id?: EntityId | null;
  customer_id?: EntityId | null; // Selected if trade-in or sold
  purchase_invoice_id?: EntityId | null;
  sale_invoice_id?: EntityId | null;
  notes?: string;
  created_at: ISODateString;
  updated_at: ISODateString;
  sync_status?: 'synced' | 'pending' | 'failed';
}

// ==========================================
// MAINTENANCE CENTER / REPAIR TICKETS
// ==========================================

export type RepairStatus =
  | 'received' // تم الاستلام
  | 'diagnosing' // جاري الفحص
  | 'waiting_approval' // في انتظار موافقة العميل
  | 'repairing' // جاري الإصلاح
  | 'ready' // جاهز للتسليم
  | 'delivered' // تم التسليم والمحاسبة
  | 'cancelled'; // ملغي / تعذر الإصلاح

export type PaymentStatus = 'unpaid' | 'partially_paid' | 'paid';

export interface MaintenanceTicket {
  id: EntityId;
  org_id: EntityId;
  branch_id: EntityId;
  warehouse_id: EntityId;
  ticket_number: string; // e.g. REP-00101
  customer_id?: EntityId | null;
  customer_name: string;
  customer_phone: string;
  device_model: string; // e.g. iPhone 14 Pro Max 256GB Deep Purple
  imei_or_serial?: string;
  passcode_or_pattern?: string; // رمز النمط أو الباسكود
  problem_description: string;
  accessories_received?: string; // الشاحن، الجراب، العلبة، الخ
  status: RepairStatus;
  payment_status: PaymentStatus;
  technician_id?: EntityId | null;
  technician_name?: string;
  estimated_cost: number;
  actual_parts_cost: number;
  labor_fee: number;
  discount_amount: number;
  total_amount: number;
  paid_amount: number;
  remaining_amount: number;
  treasury_id?: EntityId | null;
  notes?: string;
  received_at: ISODateString;
  ready_at?: ISODateString | null;
  delivered_at?: ISODateString | null;
  created_by?: EntityId;
  created_at: ISODateString;
  updated_at: ISODateString;
  sync_status?: 'synced' | 'pending' | 'failed';
}

export interface MaintenanceTicketItem {
  id: EntityId;
  ticket_id: EntityId;
  product_id: EntityId;
  product_name: string;
  unit_id: string;
  conversion_factor: number;
  quantity: number;
  unit_price: number;
  unit_cost: number;
  total: number;
}

// ==========================================
// DIGITAL WALLETS & TOP-UP SERVICES
// ==========================================

export type WalletServiceType =
  | 'vodafone_cash_deposit' // تحويل كاش لعميل
  | 'vodafone_cash_withdraw' // سحب كاش من عميل
  | 'instapay_transfer' // تحويل إنستاباي
  | 'fawry_payment' // مدفوعات فوري
  | 'topup_recharge' // شحن رصيد كروت/تطاير
  | 'other_wallet_service';

export interface DigitalWalletTransaction {
  id: EntityId;
  org_id: EntityId;
  branch_id: EntityId;
  shift_id?: EntityId | null;
  treasury_id: EntityId; // Wallet or Treasury account ID
  service_type: WalletServiceType;
  service_label: string;
  phone_number?: string;
  amount: number; // المبلغ المحول/المشحون
  commission_amount: number; // عمولة المحل (الربح الصافي)
  total_collected: number; // المبلغ المحصل من العميل (المبلغ + العمولة)
  reference_number?: string;
  customer_id?: EntityId | null;
  customer_name?: string;
  notes?: string;
  user_id: EntityId;
  created_at: ISODateString;
  updated_at: ISODateString;
  sync_status?: 'synced' | 'pending' | 'failed';
}
