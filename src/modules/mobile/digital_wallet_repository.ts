/**
 * 🦅 LOGIXA FALCON ERP - DIGITAL WALLETS & TOP-UP SERVICES REPOSITORY
 * Handles Vodafone Cash, InstaPay, Fawry, and Mobile Recharge Services with accounting & shift integration.
 */

import { db } from '@/core/db/app_database';
import { SyncQueueManager } from '@/core/sync/sync_queue_manager';
import { TreasuryRepository } from '@/modules/treasury/treasury_repository';
import { AccountingRepository } from '@/modules/accounting/accounting_repository';
import type { DigitalWalletTransaction, WalletServiceType } from '@/types';
import { v4 as uuidv4 } from 'uuid';

export class DigitalWalletRepository {
  /**
   * Execute a digital wallet or recharge service transaction
   */
  public static async executeTransaction(params: {
    orgId: string;
    branchId: string;
    shiftId?: string | null;
    treasuryId: string; // Wallet or Treasury account ID
    serviceType: WalletServiceType;
    serviceLabel: string;
    phoneNumber?: string;
    amount: number;
    commissionAmount: number;
    referenceNumber?: string;
    customerId?: string | null;
    customerName?: string;
    notes?: string;
    userId: string;
  }): Promise<DigitalWalletTransaction> {
    const now = new Date().toISOString();
    const id = uuidv4();

    const amount = Math.max(0, params.amount);
    const commission = Math.max(0, params.commissionAmount);
    const totalCollected = amount + commission;

    const transaction: DigitalWalletTransaction = {
      id,
      org_id: params.orgId,
      branch_id: params.branchId,
      shift_id: params.shiftId || null,
      treasury_id: params.treasuryId,
      service_type: params.serviceType,
      service_label: params.serviceLabel.trim(),
      phone_number: params.phoneNumber?.trim() || '',
      amount,
      commission_amount: commission,
      total_collected: totalCollected,
      reference_number: params.referenceNumber?.trim() || '',
      customer_id: params.customerId || null,
      customer_name: params.customerName?.trim() || '',
      notes: params.notes?.trim() || '',
      user_id: params.userId,
      created_at: now,
      updated_at: now,
      sync_status: 'pending',
    };

    await db.transaction('rw', [db.digital_wallet_transactions, db.treasuries, db.cashier_shifts], async () => {
      // 1. Save Transaction Record
      await db.digital_wallet_transactions.put(transaction);
      await SyncQueueManager.enqueue('digital_wallet_transactions', id, 'insert', transaction);

      // 2. Adjust Treasury/Wallet Balance:
      // Cash-Out (سحب نقدي لعميل): النقدية بالدرج تنقص بالمبلغ الكاش، والعمولة ربح صافي
      // Cash-In / Top-up (إيداع/شحن لعميل): النقدية بالدرج تزيد بالمبلغ الكلي (المبلغ + العمولة)
      if (params.treasuryId) {
        const netCashAdjustment = params.serviceType === 'vodafone_cash_withdraw'
          ? -amount + commission
          : totalCollected;

        await TreasuryRepository.adjustBalance(params.treasuryId, netCashAdjustment);
      }

      // 3. Update active cashier shift running totals if attached
      if (params.shiftId) {
        const shift = await db.cashier_shifts.get(params.shiftId);
        if (shift && shift.status === 'open') {
          const shiftAdjustment = params.serviceType === 'vodafone_cash_withdraw'
            ? -amount + commission
            : totalCollected;

          const updatedShift = {
            ...shift,
            expected_closing_balance: Math.max(0, shift.expected_closing_balance + shiftAdjustment),
            sync_status: 'pending' as const,
          };
          await db.cashier_shifts.put(updatedShift);
        }
      }
    });

    // 4. Post Journal Entry for Commission Revenue
    try {
      if (commission > 0) {
        await AccountingRepository.postServiceRevenue({
          orgId: params.orgId,
          branchId: params.branchId,
          referenceId: id,
          referenceNumber: params.referenceNumber || `WAL-${id.slice(0, 6)}`,
          amount: commission,
          treasuryId: params.treasuryId,
          customerId: params.customerId || undefined,
          description: `إيراد عمولة خدمة شحن/محفظة (${params.serviceLabel}) - رقم: ${params.phoneNumber || '—'}`,
          userId: params.userId,
        });
      }
    } catch (e) {
      console.warn('[Accounting] Digital wallet commission revenue entry warning:', e);
    }

    return transaction;
  }

  /**
   * Get wallet transactions for a shift or date range
   */
  public static async getTransactions(
    orgId: string,
    shiftId?: string | null
  ): Promise<DigitalWalletTransaction[]> {
    let query = db.digital_wallet_transactions.where('org_id').equals(orgId);
    if (shiftId) {
      query = query.filter((t) => t.shift_id === shiftId);
    }
    return await query.reverse().limit(100).toArray();
  }
}
