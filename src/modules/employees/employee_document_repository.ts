import { v4 as uuidv4 } from'uuid';
import { db } from'@/core/db/app_database';
import { SyncQueueManager } from'@/core/sync/sync_queue_manager';
import type { EmployeeDocument } from'@/types';

/**
 * 🦅 Falcon ERP - Employee Documents
 * Stores metadata for contracts, IDs, certificates and any signed paperwork.
 * Files are referenced by URL (no binary is pushed through the outbox).
 */
export class EmployeeDocumentRepository {
 public static async getByEmployee(employeeId: string): Promise<EmployeeDocument[]> {
 return await db.employee_documents
 .where('employee_id')
 .equals(employeeId)
 .reverse()
 .sortBy('created_at');
 }

 public static async getByOrg(orgId: string): Promise<EmployeeDocument[]> {
 return await db.employee_documents.where('org_id').equals(orgId).toArray();
 }

 public static async addDocument(params: {
 orgId: string;
 employeeId: string;
 title: string;
 documentType?: string;
 fileUrl?: string;
 fileType?: string;
 notes?: string;
 createdBy?: string | null;
 }): Promise<EmployeeDocument> {
 const now = new Date().toISOString();
 const id = uuidv4();
 const record: EmployeeDocument = {
 id,
 org_id: params.orgId,
 employee_id: params.employeeId,
 title: params.title.trim(),
 document_type: params.documentType,
 file_url: params.fileUrl,
 file_type: params.fileType,
 notes: params.notes,
 created_by: params.createdBy ?? null,
 created_at: now,
 updated_at: now,
 sync_status:'pending',
 };

 await db.transaction('rw', [db.employee_documents, db.sync_queue], async () => {
 await db.employee_documents.put(record);
 await SyncQueueManager.enqueue('employee_documents', id,'insert', record);
 });

 return record;
 }

 public static async updateDocument(
 id: string,
 updates: Partial<EmployeeDocument>
 ): Promise<void> {
 const now = new Date().toISOString();
 await db.transaction('rw', [db.employee_documents, db.sync_queue], async () => {
 await db.employee_documents.update(id, {
 ...updates,
 updated_at: now,
 sync_status:'pending',
 });
 const record = await db.employee_documents.get(id);
 if (record) {
 await SyncQueueManager.enqueue('employee_documents', id,'update', record);
 }
 });
 }

 public static async deleteDocument(id: string): Promise<void> {
 await db.transaction('rw', [db.employee_documents, db.sync_queue], async () => {
 await db.employee_documents.delete(id);
 await SyncQueueManager.enqueue('employee_documents', id,'delete', { id });
 });
 }
}