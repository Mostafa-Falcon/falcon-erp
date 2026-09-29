import { v4 as uuidv4 } from'uuid';
import { db } from'@/core/db/app_database';
import { SyncQueueManager } from'@/core/sync/sync_queue_manager';
import type { DeliveryAgent, DeliveryAgentStatus, DeliveryOrder, DeliveryOrderStatus } from'@/types';

export class DeliveryRepository {
 // ==========================================
 // DELIVERY AGENTS
 // ==========================================

 public static async getDeliveryAgents(orgId: string): Promise<DeliveryAgent[]> {
 return await db.delivery_agents
 .where('org_id')
 .equals(orgId)
 .toArray();
 }

 public static async createDeliveryAgent(data: {
 orgId: string;
 branchId?: string;
 name: string;
 phone: string;
 nationalId?: string;
 vehicleType?: string;
 vehicleNumber?: string;
 commissionRate?: number;
 }): Promise<DeliveryAgent> {
 const now = new Date().toISOString();
 const id = uuidv4();

 const agent: DeliveryAgent = {
 id,
 org_id: data.orgId,
 branch_id: data.branchId,
 name: data.name,
 phone: data.phone,
 national_id: data.nationalId,
 vehicle_type: data.vehicleType ||'دراجة نارية',
 vehicle_number: data.vehicleNumber,
 commission_rate: data.commissionRate || 0,
 status:'available',
 is_active: true,
 total_deliveries: 0,
 created_at: now,
 updated_at: now,
 sync_status:'pending',
 };

 await db.transaction('rw', [db.delivery_agents, db.sync_queue], async () => {
 await db.delivery_agents.add(agent);
 await SyncQueueManager.enqueue('delivery_agents', id,'insert', agent);
 });

 return agent;
 }

 public static async updateAgentStatus(id: string, status: DeliveryAgentStatus): Promise<DeliveryAgent | null> {
 const existing = await db.delivery_agents.get(id);
 if (!existing) return null;

 const now = new Date().toISOString();
 const updated: DeliveryAgent = {
 ...existing,
 status,
 updated_at: now,
 sync_status:'pending',
 };

 await db.transaction('rw', [db.delivery_agents, db.sync_queue], async () => {
 await db.delivery_agents.put(updated);
 await SyncQueueManager.enqueue('delivery_agents', id,'update', updated);
 });

 return updated;
 }

 // ==========================================
 // DELIVERY ORDERS
 // ==========================================

 public static async getDeliveryOrders(orgId: string): Promise<DeliveryOrder[]> {
 return await db.delivery_orders
 .where('org_id')
 .equals(orgId)
 .reverse()
 .sortBy('created_at');
 }

 public static async createDeliveryOrder(data: {
 orgId: string;
 branchId: string;
 invoiceId?: string;
 invoiceNumber?: string;
 customerName: string;
 customerPhone: string;
 deliveryAddress: string;
 agentId?: string;
 agentName?: string;
 deliveryFee?: number;
 codAmount?: number;
 notes?: string;
 }): Promise<DeliveryOrder> {
 const now = new Date().toISOString();
 const id = uuidv4();

 const order: DeliveryOrder = {
 id,
 org_id: data.orgId,
 branch_id: data.branchId,
 invoice_id: data.invoiceId,
 invoice_number: data.invoiceNumber,
 customer_name: data.customerName,
 customer_phone: data.customerPhone,
 delivery_address: data.deliveryAddress,
 agent_id: data.agentId,
 agent_name: data.agentName,
 delivery_fee: data.deliveryFee || 0,
 cod_amount: data.codAmount || 0,
 status: data.agentId ?'out_for_delivery':'pending',
 notes: data.notes,
 created_at: now,
 updated_at: now,
 sync_status:'pending',
 };

 await db.transaction('rw', [db.delivery_orders, db.sync_queue], async () => {
 await db.delivery_orders.add(order);
 await SyncQueueManager.enqueue('delivery_orders', id,'insert', order);
 });

 return order;
 }

 public static async updateOrderStatus(id: string, status: DeliveryOrderStatus): Promise<DeliveryOrder | null> {
 const existing = await db.delivery_orders.get(id);
 if (!existing) return null;

 const now = new Date().toISOString();
 const updated: DeliveryOrder = {
 ...existing,
 status,
 delivered_at: status ==='delivered'? now : existing.delivered_at,
 updated_at: now,
 sync_status:'pending',
 };

 await db.transaction('rw', [db.delivery_orders, db.sync_queue], async () => {
 await db.delivery_orders.put(updated);
 await SyncQueueManager.enqueue('delivery_orders', id,'update', updated);
 });

 return updated;
 }
}