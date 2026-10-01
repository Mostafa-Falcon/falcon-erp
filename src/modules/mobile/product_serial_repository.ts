/**
 * 🦅 LOGIXA FALCON ERP - PRODUCT SERIAL / IMEI REPOSITORY
 * Manages IMEI / Serial numbers for mobile phones, devices, warranty, and trade-in.
 */

import { db } from '@/core/db/app_database';
import { SyncQueueManager } from '@/core/sync/sync_coordinator';
import type { ProductSerial, DeviceCondition, SerialStatus } from '@/types';
import { v4 as uuidv4 } from 'uuid';

export class ProductSerialRepository {
  /**
   * Register a new serial/IMEI number
   */
  public static async registerSerial(params: {
    orgId: string;
    branchId?: string;
    warehouseId?: string;
    productId: string;
    productName?: string;
    serialNumber: string;
    imei2?: string;
    condition?: DeviceCondition;
    costPrice?: number;
    sellingPrice?: number;
    warrantyMonths?: number;
    supplierId?: string | null;
    customerId?: string | null;
    purchaseInvoiceId?: string | null;
    notes?: string;
  }): Promise<ProductSerial> {
    const cleanSerial = params.serialNumber.trim();
    if (!cleanSerial) throw new Error('رقم الـ IMEI / السيريال مطلوب.');

    // Check uniqueness within the organization
    const existing = await db.product_serials
      .where('org_id')
      .equals(params.orgId)
      .and((s) => s.serial_number === cleanSerial)
      .first();

    if (existing && existing.status === 'in_stock') {
      throw new Error(`رقم الـ IMEI / السيريال «${cleanSerial}» مسجل مسبقاً ومتوفر في المخزن!`);
    }

    const now = new Date().toISOString();
    const id = uuidv4();

    const serialRecord: ProductSerial = {
      id,
      org_id: params.orgId,
      branch_id: params.branchId,
      warehouse_id: params.warehouseId,
      product_id: params.productId,
      product_name: params.productName,
      serial_number: cleanSerial,
      imei2: params.imei2?.trim() || '',
      condition: params.condition || 'new',
      status: 'in_stock',
      cost_price: params.costPrice || 0,
      selling_price: params.sellingPrice || 0,
      warranty_months: params.warrantyMonths || 12,
      supplier_id: params.supplierId || null,
      customer_id: params.customerId || null,
      purchase_invoice_id: params.purchaseInvoiceId || null,
      notes: params.notes?.trim() || '',
      created_at: now,
      updated_at: now,
      sync_status: 'pending',
    };

    await db.product_serials.put(serialRecord);
    await SyncQueueManager.enqueue('product_serials', id, 'insert', serialRecord);

    return serialRecord;
  }

  /**
   * Get all available in-stock serials for a product
   */
  public static async getAvailableSerials(
    orgId: string,
    productId: string,
    warehouseId?: string
  ): Promise<ProductSerial[]> {
    let query = db.product_serials
      .where('org_id')
      .equals(orgId)
      .filter((s) => s.product_id === productId && s.status === 'in_stock');

    if (warehouseId) {
      query = query.filter((s) => !s.warehouse_id || s.warehouse_id === warehouseId);
    }

    return await query.toArray();
  }

  /**
   * Mark serial as sold in a sales invoice
   */
  public static async markSerialSold(
    serialNumber: string,
    saleInvoiceId: string,
    customerId?: string | null
  ): Promise<ProductSerial | null> {
    const serial = await db.product_serials
      .where('serial_number')
      .equals(serialNumber.trim())
      .first();

    if (!serial) return null;

    const now = new Date().toISOString();
    const updated: ProductSerial = {
      ...serial,
      status: 'sold',
      sale_invoice_id: saleInvoiceId,
      customer_id: customerId || serial.customer_id,
      updated_at: now,
      sync_status: 'pending',
    };

    await db.product_serials.put(updated);
    await SyncQueueManager.enqueue('product_serials', serial.id, 'update', updated);

    return updated;
  }

  /**
   * Search serial by number or IMEI
   */
  public static async findSerial(orgId: string, query: string): Promise<ProductSerial[]> {
    const q = query.trim().toLowerCase();
    if (!q) return [];

    return await db.product_serials
      .where('org_id')
      .equals(orgId)
      .filter((s) =>
        s.serial_number.toLowerCase().includes(q) ||
        (s.imei2 || '').toLowerCase().includes(q) ||
        (s.product_name || '').toLowerCase().includes(q)
      )
      .limit(30)
      .toArray();
  }
}
