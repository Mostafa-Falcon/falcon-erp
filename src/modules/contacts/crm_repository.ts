import { v4 as uuidv4 } from'uuid';
import { db } from'@/core/db/app_database';
import { SyncQueueManager } from'@/core/sync/sync_queue_manager';
import type { CustomerGroup, SalesRep, CrmLead, LeadStatus } from'@/types';

export class CrmRepository {
 // ==========================================
 // CUSTOMER GROUPS
 // ==========================================

 public static async getCustomerGroups(orgId: string): Promise<CustomerGroup[]> {
 return await db.customer_groups
 .where('org_id')
 .equals(orgId)
 .toArray();
 }

 public static async createCustomerGroup(data: {
 orgId: string;
 name: string;
 code?: string;
 discountPercentage?: number;
 creditLimitMultiplier?: number;
 description?: string;
 }): Promise<CustomerGroup> {
 const now = new Date().toISOString();
 const id = uuidv4();

 const group: CustomerGroup = {
 id,
 org_id: data.orgId,
 name: data.name,
 code: data.code,
 discount_percentage: data.discountPercentage || 0,
 credit_limit_multiplier: data.creditLimitMultiplier || 1.0,
 description: data.description,
 customers_count: 0,
 is_active: true,
 created_at: now,
 updated_at: now,
 sync_status:'pending',
 };

 await db.transaction('rw', [db.customer_groups, db.sync_queue], async () => {
 await db.customer_groups.add(group);
 await SyncQueueManager.enqueue('customer_groups', id,'insert', group);
 });

 return group;
 }

 // ==========================================
 // SALES REPS
 // ==========================================

 public static async getSalesReps(orgId: string): Promise<SalesRep[]> {
 return await db.sales_reps
 .where('org_id')
 .equals(orgId)
 .toArray();
 }

 public static async createSalesRep(data: {
 orgId: string;
 name: string;
 code?: string;
 phone: string;
 email?: string;
 commissionRate?: number;
 targetMonthly?: number;
 }): Promise<SalesRep> {
 const now = new Date().toISOString();
 const id = uuidv4();

 const rep: SalesRep = {
 id,
 org_id: data.orgId,
 name: data.name,
 code: data.code,
 phone: data.phone,
 email: data.email,
 commission_rate: data.commissionRate || 0,
 target_monthly: data.targetMonthly || 0,
 achieved_monthly: 0,
 is_active: true,
 created_at: now,
 updated_at: now,
 sync_status:'pending',
 };

 await db.transaction('rw', [db.sales_reps, db.sync_queue], async () => {
 await db.sales_reps.add(rep);
 await SyncQueueManager.enqueue('sales_reps', id,'insert', rep);
 });

 return rep;
 }

 // ==========================================
 // CRM LEADS
 // ==========================================

 public static async getLeads(orgId: string): Promise<CrmLead[]> {
 return await db.crm_leads
 .where('org_id')
 .equals(orgId)
 .reverse()
 .sortBy('created_at');
 }

 public static async createLead(data: {
 orgId: string;
 companyName: string;
 contactPerson: string;
 phone: string;
 email?: string;
 source?: string;
 estimatedValue?: number;
 salesRepId?: string;
 salesRepName?: string;
 notes?: string;
 }): Promise<CrmLead> {
 const now = new Date().toISOString();
 const id = uuidv4();

 const lead: CrmLead = {
 id,
 org_id: data.orgId,
 company_name: data.companyName,
 contact_person: data.contactPerson,
 phone: data.phone,
 email: data.email,
 source: data.source ||'مباشر',
 status:'new',
 estimated_value: data.estimatedValue || 0,
 sales_rep_id: data.salesRepId,
 sales_rep_name: data.salesRepName,
 notes: data.notes,
 created_at: now,
 updated_at: now,
 sync_status:'pending',
 };

 await db.transaction('rw', [db.crm_leads, db.sync_queue], async () => {
 await db.crm_leads.add(lead);
 await SyncQueueManager.enqueue('crm_leads', id,'insert', lead);
 });

 return lead;
 }

 public static async updateLeadStatus(id: string, status: LeadStatus): Promise<CrmLead | null> {
 const existing = await db.crm_leads.get(id);
 if (!existing) return null;

 const now = new Date().toISOString();
 const updated: CrmLead = {
 ...existing,
 status,
 updated_at: now,
 sync_status:'pending',
 };

 await db.transaction('rw', [db.crm_leads, db.sync_queue], async () => {
 await db.crm_leads.put(updated);
 await SyncQueueManager.enqueue('crm_leads', id,'update', updated);
 });

 return updated;
 }
}