import { v4 as uuidv4 } from'uuid';
import { db } from'@/core/db/app_database';
import { SyncQueueManager } from'@/core/sync/sync_queue_manager';
import type { Prescription, PrescriptionStatus } from'@/types';

export class PrescriptionsRepository {
 /**
 * Get all prescriptions for an organization
 */
 public static async getPrescriptions(orgId: string): Promise<Prescription[]> {
 return await db.prescriptions
 .where('org_id')
 .equals(orgId)
 .reverse()
 .sortBy('created_at');
 }

 /**
 * Create a prescription entry
 */
 public static async createPrescription(data: {
 orgId: string;
 branchId: string;
 patientName: string;
 patientPhone?: string;
 doctorName?: string;
 diagnosis?: string;
 imageUrl?: string;
 itemsSummary?: string;
 notes?: string;
 userId?: string;
 }): Promise<Prescription> {
 const now = new Date().toISOString();
 const id = uuidv4();

 const prescription: Prescription = {
 id,
 org_id: data.orgId,
 branch_id: data.branchId,
 patient_name: data.patientName,
 patient_phone: data.patientPhone,
 doctor_name: data.doctorName,
 prescription_date: now,
 diagnosis: data.diagnosis,
 status:'pending_review',
 image_url: data.imageUrl,
 items_summary: data.itemsSummary,
 notes: data.notes,
 created_by: data.userId,
 created_at: now,
 updated_at: now,
 sync_status:'pending',
 };

 await db.transaction('rw', [db.prescriptions, db.sync_queue], async () => {
 await db.prescriptions.add(prescription);
 await SyncQueueManager.enqueue('prescriptions', id,'insert', prescription);
 });

 return prescription;
 }

 /**
 * Update status of prescription review
 */
 public static async updateStatus(id: string, status: PrescriptionStatus, notes?: string): Promise<Prescription | null> {
 const existing = await db.prescriptions.get(id);
 if (!existing) return null;

 const now = new Date().toISOString();
 const updated: Prescription = {
 ...existing,
 status,
 notes: notes !== undefined ? notes : existing.notes,
 updated_at: now,
 sync_status:'pending',
 };

 await db.transaction('rw', [db.prescriptions, db.sync_queue], async () => {
 await db.prescriptions.put(updated);
 await SyncQueueManager.enqueue('prescriptions', id,'update', updated);
 });

 return updated;
 }
}