/**
 * 🦅 LOGIXA FALCON ERP - DELIVERY AGENTS & ORDERS TYPES
 */

import type { EntityId, ISODateString } from'./common';

export type DeliveryAgentStatus ='available'|'busy'|'off_duty';
export type DeliveryOrderStatus ='pending'|'out_for_delivery'|'delivered'|'cancelled';

export interface DeliveryAgent {
 id: EntityId;
 org_id: EntityId;
 branch_id?: EntityId;
 name: string;
 phone: string;
 national_id?: string;
 vehicle_type?: string;
 vehicle_number?: string;
 commission_rate: number; // percentage
 status: DeliveryAgentStatus;
 is_active: boolean;
 total_deliveries: number;
 created_at: ISODateString;
 updated_at: ISODateString;
 sync_status?:'synced'|'pending'|'failed';
}

export interface DeliveryOrder {
 id: EntityId;
 org_id: EntityId;
 branch_id: EntityId;
 invoice_id?: EntityId;
 invoice_number?: string;
 customer_name: string;
 customer_phone: string;
 delivery_address: string;
 agent_id?: EntityId;
 agent_name?: string;
 delivery_fee: number;
 cod_amount: number; // cash on delivery amount
 status: DeliveryOrderStatus;
 notes?: string;
 delivered_at?: ISODateString;
 created_at: ISODateString;
 updated_at: ISODateString;
 sync_status?:'synced'|'pending'|'failed';
}