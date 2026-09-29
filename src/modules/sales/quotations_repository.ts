import { v4 as uuidv4 } from'uuid';
import { db } from'@/core/db/app_database';
import { SyncQueueManager } from'@/core/sync/sync_queue_manager';
import { roundMoney } from'@/lib/decimal';
import type { Quotation, QuotationItem, QuotationStatus } from'@/types';

export class QuotationsRepository {
 /**
 * Get all quotations for an organization
 */
 public static async getQuotations(orgId: string): Promise<Quotation[]> {
 return await db.quotations
 .where('org_id')
 .equals(orgId)
 .reverse()
 .sortBy('created_at');
 }

 /**
 * Get quotation by ID
 */
 public static async getQuotationById(id: string): Promise<Quotation | undefined> {
 return await db.quotations.get(id);
 }

 /**
 * Get quotation items
 */
 public static async getQuotationItems(quotationId: string): Promise<QuotationItem[]> {
 return await db.quotation_items.where('quotation_id').equals(quotationId).toArray();
 }

 /**
 * Create a new quotation with items
 */
 public static async createQuotation(params: {
 orgId: string;
 branchId: string;
 customerId?: string | null;
 customerName?: string;
 customerPhone?: string;
 validUntil?: string;
 items: {
 productId: string;
 productName: string;
 unitId: string;
 unitName?: string;
 conversionFactor: number;
 quantity: number;
 unitPrice: number;
 discountAmount?: number;
 taxRate?: number;
 }[];
 discountAmount?: number;
 discountPercent?: number;
 notes?: string;
 userId: string;
 }): Promise<Quotation> {
 if (!params.items || params.items.length === 0) {
 throw new Error('عرض السعر يجب أن يحتوي على صنف واحد على الأقل');
 }

 const now = new Date().toISOString();
 const quotationId = uuidv4();
 const count = await db.quotations.where('branch_id').equals(params.branchId).count();
 const quotationNumber =`QT-${String(count + 1).padStart(6,'0')}`;

 let subtotal = 0;
 let totalTax = 0;

 const quotationItems: QuotationItem[] = params.items.map((item) => {
 const lineTotalBeforeDisc = roundMoney(item.quantity * item.unitPrice);
 const disc = item.discountAmount || 0;
 const lineNet = roundMoney(Math.max(0, lineTotalBeforeDisc - disc));
 const taxRate = item.taxRate || 0;
 const taxAmount = roundMoney((lineNet * taxRate) / 100);
 const lineTotal = roundMoney(lineNet + taxAmount);

 subtotal += lineTotalBeforeDisc;
 totalTax += taxAmount;

 return {
 id: uuidv4(),
 quotation_id: quotationId,
 product_id: item.productId,
 product_name: item.productName,
 unit_id: item.unitId,
 unit_name: item.unitName,
 conversion_factor: item.conversionFactor,
 quantity: item.quantity,
 unit_price: item.unitPrice,
 discount_amount: disc,
 tax_rate: taxRate,
 tax_amount: taxAmount,
 total: lineTotal,
 };
 });

 const discount =
 params.discountPercent !== undefined && params.discountPercent > 0
 ? roundMoney((subtotal * params.discountPercent) / 100)
 : roundMoney(params.discountAmount || 0);

 const finalTotal = roundMoney(Math.max(0, subtotal - discount + totalTax));

 const quotation: Quotation = {
 id: quotationId,
 org_id: params.orgId,
 branch_id: params.branchId,
 quotation_number: quotationNumber,
 customer_id: params.customerId,
 customer_name: params.customerName,
 customer_phone: params.customerPhone,
 valid_until: params.validUntil,
 status:'pending',
 subtotal: roundMoney(subtotal),
 discount_amount: discount,
 discount_percent: params.discountPercent || 0,
 tax_amount: roundMoney(totalTax),
 total: finalTotal,
 notes: params.notes,
 created_by: params.userId,
 created_at: now,
 updated_at: now,
 sync_status:'pending',
 };

 await db.transaction('rw', [db.quotations, db.quotation_items, db.sync_queue], async () => {
 await db.quotations.add(quotation);
 await db.quotation_items.bulkAdd(quotationItems);

 await SyncQueueManager.enqueue('quotations', quotationId,'insert', quotation);
 for (const item of quotationItems) {
 await SyncQueueManager.enqueue('quotation_items', item.id,'insert', item);
 }
 });

 return quotation;
 }

 /**
 * Update quotation status
 */
 public static async updateStatus(id: string, status: QuotationStatus): Promise<Quotation | null> {
 const quotation = await db.quotations.get(id);
 if (!quotation) return null;

 const now = new Date().toISOString();
 const updated: Quotation = {
 ...quotation,
 status,
 updated_at: now,
 sync_status:'pending',
 };

 await db.transaction('rw', [db.quotations, db.sync_queue], async () => {
 await db.quotations.put(updated);
 await SyncQueueManager.enqueue('quotations', id,'update', updated);
 });

 return updated;
 }
}