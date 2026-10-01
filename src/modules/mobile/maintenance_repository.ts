/**
 * 🦅 LOGIXA FALCON ERP - MAINTENANCE REPAIR TICKETS REPOSITORY
 * Handles job cards, repair status tracking, spare parts stock deductions, and payments.
 */

import { db } from '@/core/db/app_database';
import { SyncQueueManager } from '@/core/sync/sync_queue_manager';
import { InventoryRepository } from '@/modules/inventory/inventory_repository';
import { TreasuryRepository } from '@/modules/treasury/treasury_repository';
import { AccountingRepository } from '@/modules/accounting/accounting_repository';
import { ContactsRepository } from '@/modules/contacts/contacts_repository';
import type {
  MaintenanceTicket,
  MaintenanceTicketItem,
  RepairStatus,
  PaymentStatus,
} from '@/types';
import { v4 as uuidv4 } from 'uuid';

export class MaintenanceRepository {
  /**
   * Generate next sequential ticket number e.g. REP-00101
   */
  public static async nextTicketNumber(orgId: string): Promise<string> {
    const count = await db.maintenance_tickets.where('org_id').equals(orgId).count();
    const seq = (count + 1).toString().padStart(5, '0');
    return `REP-${seq}`;
  }

  /**
   * Create a new maintenance ticket
   */
  public static async createTicket(params: {
    orgId: string;
    branchId: string;
    warehouseId: string;
    customerId?: string | null;
    customerName: string;
    customerPhone: string;
    deviceModel: string;
    imeiOrSerial?: string;
    passcodeOrPattern?: string;
    problemDescription: string;
    accessoriesReceived?: string;
    technicianId?: string | null;
    technicianName?: string;
    estimatedCost?: number;
    laborFee?: number;
    treasuryId?: string | null;
    notes?: string;
    userId: string;
  }): Promise<MaintenanceTicket> {
    const now = new Date().toISOString();
    const id = uuidv4();
    const ticketNumber = await MaintenanceRepository.nextTicketNumber(params.orgId);

    const laborFee = params.laborFee || 0;
    const estimatedCost = params.estimatedCost || laborFee;

    const ticket: MaintenanceTicket = {
      id,
      org_id: params.orgId,
      branch_id: params.branchId,
      warehouse_id: params.warehouseId,
      ticket_number: ticketNumber,
      customer_id: params.customerId || null,
      customer_name: params.customerName.trim(),
      customer_phone: params.customerPhone.trim(),
      device_model: params.deviceModel.trim(),
      imei_or_serial: params.imeiOrSerial?.trim() || '',
      passcode_or_pattern: params.passcodeOrPattern?.trim() || '',
      problem_description: params.problemDescription.trim(),
      accessories_received: params.accessoriesReceived?.trim() || '',
      status: 'received',
      payment_status: 'unpaid',
      technician_id: params.technicianId || null,
      technician_name: params.technicianName || '',
      estimated_cost: estimatedCost,
      actual_parts_cost: 0,
      labor_fee: laborFee,
      discount_amount: 0,
      total_amount: estimatedCost,
      paid_amount: 0,
      remaining_amount: estimatedCost,
      treasury_id: params.treasuryId || null,
      notes: params.notes?.trim() || '',
      received_at: now,
      created_by: params.userId,
      created_at: now,
      updated_at: now,
      sync_status: 'pending',
    };

    await db.maintenance_tickets.put(ticket);
    await SyncQueueManager.enqueue('maintenance_tickets', id, 'insert', ticket);

    return ticket;
  }

  /**
   * Update repair ticket status e.g. received -> diagnosing -> ready -> delivered
   */
  public static async updateStatus(
    ticketId: string,
    newStatus: RepairStatus,
    userId: string,
    notes?: string
  ): Promise<MaintenanceTicket> {
    const ticket = await db.maintenance_tickets.get(ticketId);
    if (!ticket) throw new Error('تكت الصيانة غير موجود.');

    const now = new Date().toISOString();
    const updated: MaintenanceTicket = {
      ...ticket,
      status: newStatus,
      ready_at: newStatus === 'ready' ? now : ticket.ready_at,
      delivered_at: newStatus === 'delivered' ? now : ticket.delivered_at,
      notes: notes ? `${ticket.notes || ''}\n[${now}] ${notes}` : ticket.notes,
      updated_at: now,
      sync_status: 'pending',
    };

    await db.maintenance_tickets.put(updated);
    await SyncQueueManager.enqueue('maintenance_tickets', ticketId, 'update', updated);

    return updated;
  }

  /**
   * Add spare part item to ticket and deduct from stock
   */
  public static async addSparePart(params: {
    ticketId: string;
    productId: string;
    productName: string;
    unitId: string;
    conversionFactor: number;
    quantity: number;
    unitPrice: number;
    unitCost: number;
    userId: string;
  }): Promise<{ item: MaintenanceTicketItem; ticket: MaintenanceTicket }> {
    const ticket = await db.maintenance_tickets.get(params.ticketId);
    if (!ticket) throw new Error('تكت الصيانة غير موجود.');

    const now = new Date().toISOString();
    const itemId = uuidv4();
    const lineTotal = params.quantity * params.unitPrice;
    const lineCost = params.quantity * params.unitCost;

    const newItem: MaintenanceTicketItem = {
      id: itemId,
      ticket_id: params.ticketId,
      product_id: params.productId,
      product_name: params.productName,
      unit_id: params.unitId,
      conversion_factor: params.conversionFactor,
      quantity: params.quantity,
      unit_price: params.unitPrice,
      unit_cost: params.unitCost,
      total: lineTotal,
    };

    // Deduct stock via InventoryRepository
    await InventoryRepository.recordStockMovement({
      orgId: ticket.org_id,
      warehouseId: ticket.warehouse_id,
      productId: params.productId,
      transactionType: 'adjustment_out',
      quantity: params.quantity,
      unitId: params.unitId,
      conversionFactor: params.conversionFactor,
      unitCost: params.unitCost,
      referenceType: 'maintenance_ticket',
      referenceId: ticket.id,
      userId: params.userId,
      notes: `استهلاك قطعة غيار لصيانة تكت #${ticket.ticket_number} (${ticket.device_model})`,
    });

    await db.maintenance_ticket_items.put(newItem);

    // Recalculate ticket totals
    const allItems = await db.maintenance_ticket_items.where('ticket_id').equals(params.ticketId).toArray();
    const partsTotal = allItems.reduce((sum, i) => sum + i.total, 0);
    const partsCostTotal = allItems.reduce((sum, i) => sum + (i.quantity * i.unit_cost), 0);

    const newTotal = partsTotal + ticket.labor_fee - ticket.discount_amount;
    const newRemaining = Math.max(0, newTotal - ticket.paid_amount);

    const updatedTicket: MaintenanceTicket = {
      ...ticket,
      actual_parts_cost: partsCostTotal,
      total_amount: newTotal,
      remaining_amount: newRemaining,
      updated_at: now,
      sync_status: 'pending',
    };

    await db.maintenance_tickets.put(updatedTicket);
    await SyncQueueManager.enqueue('maintenance_tickets', ticket.id, 'update', updatedTicket);

    return { item: newItem, ticket: updatedTicket };
  }

  /**
   * Pay maintenance ticket (Cash, Card, or Credit)
   */
  public static async payTicket(params: {
    ticketId: string;
    amountPaid: number;
    treasuryId: string;
    userId: string;
    notes?: string;
  }): Promise<MaintenanceTicket> {
    const ticket = await db.maintenance_tickets.get(params.ticketId);
    if (!ticket) throw new Error('تكت الصيانة غير موجود.');

    if (ticket.remaining_amount <= 0) {
      throw new Error('تم سداد تكلفة تكت الصيانة بالكامل مسبقاً.');
    }

    const payAmount = Math.min(params.amountPaid, ticket.remaining_amount);
    const now = new Date().toISOString();

    const newPaid = ticket.paid_amount + payAmount;
    const newRemaining = Math.max(0, ticket.total_amount - newPaid);
    const newPayStatus: PaymentStatus = newRemaining === 0 ? 'paid' : 'partially_paid';

    const updatedTicket: MaintenanceTicket = {
      ...ticket,
      paid_amount: newPaid,
      remaining_amount: newRemaining,
      payment_status: newPayStatus,
      status: ticket.status === 'ready' ? 'delivered' : ticket.status,
      delivered_at: ticket.status === 'ready' || newRemaining === 0 ? now : ticket.delivered_at,
      treasury_id: params.treasuryId,
      updated_at: now,
      sync_status: 'pending',
    };

    await db.transaction(
      'rw',
      [db.maintenance_tickets, db.treasuries, db.contacts, db.contact_transactions],
      async () => {
        await db.maintenance_tickets.put(updatedTicket);
        await SyncQueueManager.enqueue('maintenance_tickets', ticket.id, 'update', updatedTicket);

        // 1. Adjust Treasury Balance
        if (payAmount > 0 && params.treasuryId) {
          await TreasuryRepository.adjustBalance(params.treasuryId, payAmount);
        }

        // 2. Adjust Customer Debt if linked to a contact
        if (ticket.customer_id) {
          await ContactsRepository.adjustBalance({
            orgId: ticket.org_id,
            contactId: ticket.customer_id,
            referenceType: 'maintenance_ticket',
            referenceId: ticket.id,
            debit: ticket.total_amount,
            credit: payAmount,
            notes: `سداد تكلفة صيانة تكت #${ticket.ticket_number} للجهاز (${ticket.device_model})`,
          });
        }
      }
    );

    // 3. Post Accounting Journal Entry
    try {
      await AccountingRepository.postServiceRevenue({
        orgId: ticket.org_id,
        branchId: ticket.branch_id,
        referenceId: ticket.id,
        referenceNumber: ticket.ticket_number,
        amount: payAmount,
        treasuryId: params.treasuryId,
        customerId: ticket.customer_id || undefined,
        description: `إيراد صيانة أجهزة - تكت #${ticket.ticket_number} (${ticket.device_model})`,
        userId: params.userId,
      });
    } catch (e) {
      console.warn('[Accounting] Maintenance payment journal entry warning:', e);
    }

    return updatedTicket;
  }
}
