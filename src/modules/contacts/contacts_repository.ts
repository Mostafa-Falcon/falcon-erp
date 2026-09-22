import { v4 as uuidv4 } from 'uuid';
import { db } from '@/core/db/app_database';
import { SyncQueueManager } from '@/core/sync/sync_queue_manager';
import type { Contact, ContactTransaction, ContactType } from '@/types';
import { roundMoney } from '@/lib/decimal';

export class ContactsRepository {
  /**
   * Get contacts filtered by type (customer, supplier, both)
   */
  public static async getContacts(orgId: string, type?: ContactType): Promise<Contact[]> {
    const collection = db.contacts.where('org_id').equals(orgId);

    const results = await collection.and((c) => c.is_active).toArray();
    if (!type) return results;

    return results.filter((c) => c.type === type);
  }

  /**
   * Find contact by ID
   */
  public static async getById(id: string): Promise<Contact | undefined> {
    return await db.contacts.get(id);
  }

  /**
   * Update contact fields (excluding balance, which only changes via adjustBalance)
   */
  public static async updateContact(id: string, updates: Partial<Contact>): Promise<Contact | null> {
    const existing = await db.contacts.get(id);
    if (!existing) return null;

    const now = new Date().toISOString();
    const updated: Contact = {
      ...existing,
      ...updates,
      current_balance: existing.current_balance,
      updated_at: now,
      sync_status: 'pending',
    };
    await db.transaction('rw', [db.contacts, db.sync_queue], async () => {
            await db.contacts.put(updated);
      // DELTA-EXEMPT: عمود فقط semantic/metadata بدون تغيير في العدّاد
      // (current_balance محفوظة كما هي). الكتابة المطلقة هنا لا تحمل سباقًا حقيقيًا
      // لأن نفس الصف لا يُحدَّث بالتزامن على جهازين إلا كتغيير وصف.
      await SyncQueueManager.enqueue('contacts', id, 'update', updated);
    });
    return updated;
  }

  /**
   * Soft-delete (deactivate) or re-activate a contact
   */
  public static async setActive(id: string, isActive: boolean): Promise<Contact | null> {
    return await ContactsRepository.updateContact(id, { is_active: isActive });
  }

  /**
   * Create contact
   */
  public static async createContact(
    data: Omit<Contact, 'id' | 'current_balance' | 'created_at' | 'updated_at' | 'sync_status'>,
    openingBalance = 0
  ): Promise<Contact> {
    const now = new Date().toISOString();
    const contactId = uuidv4();

    const contact: Contact = {
      ...data,
      id: contactId,
      current_balance: openingBalance,
      created_at: now,
      updated_at: now,
      sync_status: 'pending',
    };

    await db.transaction('rw', [db.contacts, db.contact_transactions, db.sync_queue], async () => {
      await db.contacts.add(contact);
      await SyncQueueManager.enqueue('contacts', contactId, 'insert', contact);

      if (openingBalance !== 0) {
        const transId = uuidv4();
        const trans: ContactTransaction = {
          id: transId,
          org_id: data.org_id,
          contact_id: contactId,
          reference_type: 'opening_balance',
          reference_id: contactId,
          debit: openingBalance > 0 ? openingBalance : 0,
          credit: openingBalance < 0 ? Math.abs(openingBalance) : 0,
          balance_after: openingBalance,
          notes: 'رصيد افتتاحي',
          created_at: now,
          sync_status: 'pending',
        };
        await db.contact_transactions.add(trans);
        await SyncQueueManager.enqueue('contact_transactions', transId, 'insert', trans);
      }
    });

    return contact;
  }

  /**
   * Adjust contact balance and record transaction entry
   */
  public static async adjustBalance(params: {
    orgId: string;
    contactId: string;
    referenceType: 'sale_invoice' | 'sale_return' | 'purchase_invoice' | 'purchase_return' | 'receipt_voucher' | 'payment_voucher';
    referenceId: string;
    debit: number; // مدين (يزيد مديونية العميل)
    credit: number; // دائن (يسدد أو يزيد استحقاق المورد)
    notes?: string;
  }): Promise<number> {
    const contact = await db.contacts.get(params.contactId);
    if (!contact) throw new Error('جهة التعامل غير موجودة');

    const now = new Date().toISOString();
    // Balance calculation: positive = debit (owed to us), negative = credit (we owe)
    const delta = params.debit - params.credit;
    const newBalance = roundMoney(contact.current_balance + delta);

    const updatedContact: Contact = {
      ...contact,
      current_balance: newBalance,
      updated_at: now,
      sync_status: 'pending',
    };

    const transId = uuidv4();
    const trans: ContactTransaction = {
      id: transId,
      org_id: params.orgId,
      contact_id: params.contactId,
      reference_type: params.referenceType,
      reference_id: params.referenceId,
      debit: params.debit,
      credit: params.credit,
      balance_after: newBalance,
      notes: params.notes,
      created_at: now,
      sync_status: 'pending',
    };

    await db.transaction('rw', [db.contacts, db.contact_transactions, db.sync_queue], async () => {
      await db.contacts.put(updatedContact);
      await SyncQueueManager.enqueueDelta('contacts', params.contactId, { current_balance: delta }, {});

      await db.contact_transactions.add(trans);
      await SyncQueueManager.enqueue('contact_transactions', transId, 'insert', trans);
    });

    return newBalance;
  }

  /**
   * Get ledger/account statement for a contact
   */
  public static async getStatement(contactId: string): Promise<ContactTransaction[]> {
    return await db.contact_transactions
      .where('contact_id')
      .equals(contactId)
      .sortBy('created_at');
  }
}
