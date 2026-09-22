/**
 * 🦅 LOGIXA FALCON ERP - INVENTORY & CATALOG TYPES
 */

import type { EntityId, ISODateString } from './common';

export type ItemType = 'storable' | 'service' | 'composite';

export interface ProductCategory {
  id: EntityId;
  org_id: EntityId;
  parent_id?: EntityId | null; // For hierarchical trees
  name: string;
  code?: string;
  is_active: boolean;
  created_at: ISODateString;
  updated_at: ISODateString;
  sync_status?: 'synced' | 'pending' | 'failed';
}

export interface ProductBrand {
  id: EntityId;
  org_id: EntityId;
  name: string;
  created_at: ISODateString;
  updated_at: ISODateString;
  sync_status?: 'synced' | 'pending' | 'failed';
}

export interface ProductTypeItem {
  id: EntityId;
  org_id: EntityId;
  name: string;
  code?: string;
  is_active?: boolean;
  created_at: ISODateString;
  updated_at: ISODateString;
  sync_status?: 'synced' | 'pending' | 'failed';
}

export interface Unit {
  id: EntityId;
  org_id: EntityId;
  name: string; // e.g. قطعة, علبة, كرتونة, كجم, متر
  symbol: string; // e.g. pcs, box, ctn, kg, m
  is_active: boolean;
  created_at: ISODateString;
  updated_at: ISODateString;
  sync_status?: 'synced' | 'pending' | 'failed';
}

export interface Product {
  id: EntityId;
  org_id: EntityId;
  sku: string; // Barcode or Item Code
  name: string;
  category_id?: EntityId | null;
  brand_id?: EntityId | null;
  item_type: ItemType;
  product_type?: string; // نوع الصنف التجاري العام (حسب نشاط المنشأة)
  
  // Measurement & Level configuration
  measurement_type?: 'unit' | 'weight'; // قطعة/وحدات أو بالوزن (كيلو)
  has_levels?: boolean; // هل له مستويات تعبئة منفصلة
  scale_code?: string; // كود ميزان الباركود
  
  // Base unit configuration
  base_unit_id: EntityId;
  
  // Pricing
  purchase_price: number;
  cost_price?: number; // Alias for purchase_price
  raw_purchase_price?: number; // سعر الشراء الأصلي قبل الخصم
  purchase_discount_value?: number; // قيمة أو نسبة الخصم عند الشراء
  purchase_discount_type?: 'percent' | 'amount'; // نوع الخصم: نسبة مئوية أو مبلغ ثابت
  sale_price: number;
  old_sale_price?: number; // سعر البيع القديم في حالة التسعير المزدوج
  has_dual_pricing?: boolean; // هل الصنف مفعل به التسعير المزدوج
  wholesale_price?: number;
  min_sale_price?: number;
  
  // Tax / VAT
  tax_rate: number; // e.g. 14 for 14%
  is_tax_inclusive: boolean;
  
  // Inventory tracking flags
  tracks_batch: boolean; // For batch / lot numbers
  tracks_expiry: boolean; // For expiry dates (food, consumables, chemicals)
  expiry_alert_days?: number; // أيام التنبيه قبل انتهاء الصلاحية
  min_stock_alert: number;
  max_stock_limit?: number;
  
  // Extended specifications & metadata
  name_en?: string; // اسم الصنف بالإنجليزي
  scientific_name?: string; // الوصف الإضافي / المواصفات الفنية / الموديل
  shelf_location?: string; // المكان / الرف
  alternate_barcodes?: string[]; // باركود بديل
  substitute_ids?: EntityId[]; // معرفات الأصناف البديلة المدخلة بواسطة صاحب المنشأة
  is_taxable?: boolean; // صنف ضريبي
  is_quick_pos?: boolean; // صنف سريع في شاشة البيع POS Quick Access
  notes?: string; // ملاحظات الصنف
  
  description?: string;
  image_url?: string;
  is_active: boolean;
  created_at: ISODateString;
  updated_at: ISODateString;
  sync_status?: 'synced' | 'pending' | 'failed';
}

/**
 * Multi-unit hierarchy (e.g. 1 Carton = 12 Boxes = 144 Pieces)
 */
export interface ProductUnit {
  id: EntityId;
  product_id: EntityId;
  unit_id: EntityId;
  conversion_factor: number; // How many base units in this unit (explicitly set)
  /** ترتيب المستوى داخل صنف: 1 = الوحدة الأساسية، 2+ = المستويات الأعلى (بالتسلسل). */
  level_order?: number;
  /** نسخة ثابتة من اسم المستوى كما أدخله صاحب المنشأة وقت الحفظ (عرض بدون JOIN حتى offline). */
  unit_name?: string;
  /** الكمية المتاحة معبّرة بوحدة المستوى نفسه (سيلو المستوى). */
  available_quantity?: number;
  barcode?: string;
  purchase_price?: number; // Independent purchase price
  cost_price?: number; // Alias for purchase_price
  raw_purchase_price?: number; // سعر الشراء الأصلي قبل الخصم
  purchase_discount_value?: number; // قيمة أو نسبة الخصم
  purchase_discount_type?: 'percent' | 'amount'; // نوع الخصم
  sale_price?: number; // Independent sale price
  old_sale_price?: number; // سعر البيع القديم للمستوى
  has_dual_pricing?: boolean; // هل المستوى مفعل به التسعير المزدوج
  wholesale_price?: number; // Independent wholesale price
  min_sale_price?: number; // Independent min sale price
  is_default_sale?: boolean;
  is_default_purchase?: boolean;
  created_at: ISODateString;
  updated_at: ISODateString;
  sync_status?: 'synced' | 'pending' | 'failed';
}

export interface ProductBatch {
  id: EntityId;
  org_id?: EntityId;
  product_id: EntityId;
  warehouse_id: EntityId;
  batch_number: string;
  expiry_date?: ISODateString | null;
  initial_quantity: number; // in base units
  current_quantity: number; // in base units
  quantity_in?: number; // Alias for current_quantity
  purchase_price?: number;
  /** الوحدة/المستوى الذي سُجّل به هذا التاريخ (معرّف ثابت). */
  unit_id?: string;
  /** نسخة ثابتة من اسم المستوى كما أدخله صاحب المنشأة (مثلاً علبة / كرتونة). */
  unit_name?: string;
  /** الكمية كما أُدخلت بوحدة المستوى (معلومة عرض؛ الكميات الأساسية تبقى SSOT). */
  level_quantity?: number;
  created_at: ISODateString;
  updated_at: ISODateString;
  sync_status?: 'synced' | 'pending' | 'failed';
}

export interface Warehouse {
  id: EntityId;
  org_id: EntityId;
  branch_id?: EntityId;
  code: string;
  name: string;
  location?: string;
  is_main: boolean;
  is_active: boolean;
  created_at: ISODateString;
  updated_at: ISODateString;
  sync_status?: 'synced' | 'pending' | 'failed';
}

export interface StockLevel {
  id: EntityId; // `${warehouse_id}_${product_id}`
  org_id: EntityId;
  warehouse_id: EntityId;
  product_id: EntityId;
  batch_id?: EntityId | null;
  quantity: number; // Total in base unit
  reserved_quantity: number;
  available_quantity: number;
  updated_at: ISODateString;
  sync_status?: 'synced' | 'pending' | 'failed';
}

export type InventoryTransactionType = 
  | 'opening_stock' 
  | 'opening_balance'
  | 'purchase'
  | 'sale' 
  | 'sale_return' 
  | 'purchase_return' 
  | 'transfer_in' 
  | 'transfer_out' 
  | 'adjustment_in' 
  | 'adjustment_out' 
  | 'damaged';

export interface InventoryTransaction {
  id: EntityId;
  org_id: EntityId;
  warehouse_id: EntityId;
  product_id: EntityId;
  batch_id?: EntityId | null;
  transaction_type: InventoryTransactionType;
  reference_type?: 'sale_invoice' | 'purchase_invoice' | 'transfer' | 'manual' | 'adjustment';
  reference_id?: EntityId | null;
  quantity: number;
  unit_id: EntityId;
  unit_conversion_factor: number;
  base_quantity: number; // quantity * conversion_factor
  unit_cost: number;
  total_cost: number;
  balance_after: number; // running balance in warehouse
  /** نسخة ثابتة من اسم الصنف وقت الحركة (عرض بدون JOIN حتى offline). */
  product_name?: string;
  /** نسخة ثابتة من اسم الوحدة/المستوى التي سُجّلت بها الحركة. */
  unit_name?: string;
  /** الكمية كما أُدخلت بوحدة الحركة المختارة (سيلو المستوى). */
  level_quantity?: number;
  batch_number?: string;
  expiry_date?: string | null;
  /** الرصيد قبل الحركة (بالوحدة الأساسية). */
  prev_quantity?: number;
  /** الرصيد بعد الحركة (بالوحدة الأساسية). */
  new_quantity?: number;
  /** رقم مستند مرجعي قابل للقراءة (رقم فاتورة / تشغيلة). */
  reference_number?: string;
  notes?: string;
  created_by: EntityId;
  created_at: ISODateString;
  sync_status?: 'synced' | 'pending' | 'failed';
}

export interface StockTransfer {
  id: EntityId;
  org_id: EntityId;
  transfer_no: string;
  from_warehouse_id: EntityId;
  to_warehouse_id: EntityId;
  from_branch_id?: EntityId;
  to_branch_id?: EntityId;
  status: 'draft' | 'pending' | 'in_transit' | 'completed' | 'cancelled';
  notes?: string;
  created_by: EntityId;
  created_at: ISODateString;
  completed_at?: ISODateString | null;
  items_count?: number;
  items?: (StockTransferItem & { product_name?: string; unit_name?: string; batch_number?: string })[];
  sync_status?: 'synced' | 'pending' | 'failed';
}

export interface StockTransferItem {
  id: EntityId;
  transfer_id: EntityId;
  product_id: EntityId;
  batch_id?: EntityId | null;
  unit_id: EntityId;
  conversion_factor: number;
  quantity: number; // In selected unit
  base_quantity: number; // quantity * conversion_factor
  unit_cost: number;
  total_cost: number;
}

export interface StocktakeSession {
  id: EntityId;
  org_id: EntityId;
  branch_id: EntityId;
  warehouse_id: EntityId;
  session_number: string;
  status: 'draft' | 'completed' | 'cancelled';
  notes?: string;
  total_difference_value: number;
  created_by: EntityId;
  created_at: ISODateString;
  completed_at?: ISODateString | null;
  sync_status?: 'synced' | 'pending' | 'failed';
}

export interface StocktakeItem {
  id: EntityId;
  session_id: EntityId;
  product_id: EntityId;
  batch_id?: EntityId | null;
  expected_quantity: number;
  actual_quantity: number;
  difference_quantity: number;
  unit_cost: number;
  difference_value: number;
}
