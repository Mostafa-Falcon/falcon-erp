import { v4 as uuidv4 } from'uuid';
import { db } from'@/core/db/app_database';
import { SyncQueueManager } from'@/core/sync/sync_queue_manager';
import { roundMoney } from'@/lib/decimal';
import type { PurchaseOrder, PurchaseOrderItem, PurchaseOrderStatus } from'@/types';

export class PurchaseOrdersRepository {
 /**
 * Get all purchase orders for an organization
 */
 public static async getPurchaseOrders(orgId: string): Promise<PurchaseOrder[]> {
 return await db.purchase_orders
 .where('org_id')
 .equals(orgId)
 .reverse()
 .sortBy('created_at');
 }

 /**
 * Get purchase order by ID
 */
 public static async getPurchaseOrderById(id: string): Promise<PurchaseOrder | undefined> {
 return await db.purchase_orders.get(id);
 }

 /**
 * Get purchase order items
 */
 public static async getPurchaseOrderItems(poId: string): Promise<PurchaseOrderItem[]> {
 return await db.purchase_order_items.where('po_id').equals(poId).toArray();
 }

 /**
 * Create new purchase order
 */
 public static async createPurchaseOrder(params: {
 orgId: string;
 branchId: string;
 warehouseId: string;
 supplierId: string;
 supplierName?: string;
 orderDate?: string;
 expectedDeliveryDate?: string;
 items: {
 productId: string;
 productName: string;
 unitId: string;
 quantity: number;
 unitCost: number;
 taxRate?: number;
 }[];
 discountAmount?: number;
 notes?: string;
 userId: string;
 }): Promise<PurchaseOrder> {
 if (!params.items || params.items.length === 0) {
 throw new Error('أمر الشراء يجب أن يحتوي على صنف واحد على الأقل');
 }

 const now = new Date().toISOString();
 const poId = uuidv4();
 const count = await db.purchase_orders.where('branch_id').equals(params.branchId).count();
 const poNumber =`PO-${String(count + 1).padStart(6,'0')}`;

 let subtotal = 0;
 let totalTax = 0;

 const poItems: PurchaseOrderItem[] = params.items.map((item) => {
 const lineCost = roundMoney(item.quantity * item.unitCost);
 const taxRate = item.taxRate || 0;
 const taxAmount = roundMoney((lineCost * taxRate) / 100);
 const lineTotal = roundMoney(lineCost + taxAmount);

 subtotal += lineCost;
 totalTax += taxAmount;

 return {
 id: uuidv4(),
 po_id: poId,
 product_id: item.productId,
 product_name: item.productName,
 unit_id: item.unitId,
 quantity: item.quantity,
 received_quantity: 0,
 unit_cost: item.unitCost,
 tax_rate: taxRate,
 tax_amount: taxAmount,
 total: lineTotal,
 };
 });

 const discount = roundMoney(params.discountAmount || 0);
 const finalTotal = roundMoney(Math.max(0, subtotal - discount + totalTax));

 const po: PurchaseOrder = {
 id: poId,
 org_id: params.orgId,
 branch_id: params.branchId,
 warehouse_id: params.warehouseId,
 supplier_id: params.supplierId,
 supplier_name: params.supplierName,
 po_number: poNumber,
 order_date: params.orderDate || now,
 expected_delivery_date: params.expectedDeliveryDate,
 status:'sent',
 subtotal: roundMoney(subtotal),
 discount_amount: discount,
 tax_amount: roundMoney(totalTax),
 total: finalTotal,
 notes: params.notes,
 created_by: params.userId,
 created_at: now,
 updated_at: now,
 sync_status:'pending',
 };

 await db.transaction('rw', [db.purchase_orders, db.purchase_order_items, db.sync_queue], async () => {
 await db.purchase_orders.add(po);
 await db.purchase_order_items.bulkAdd(poItems);

 await SyncQueueManager.enqueue('purchase_orders', poId,'insert', po);
 for (const item of poItems) {
 await SyncQueueManager.enqueue('purchase_order_items', item.id,'insert', item);
 }
 });

 return po;
 }

 /**
 * Update status of purchase order
 */
 public static async updateStatus(id: string, status: PurchaseOrderStatus): Promise<PurchaseOrder | null> {
 const po = await db.purchase_orders.get(id);
 if (!po) return null;

 const now = new Date().toISOString();
 const updated: PurchaseOrder = {
 ...po,
 status,
 updated_at: now,
 sync_status:'pending',
 };

 await db.transaction('rw', [db.purchase_orders, db.sync_queue], async () => {
 await db.purchase_orders.put(updated);
 await SyncQueueManager.enqueue('purchase_orders', id,'update', updated);
 });

 return updated;
 }
}