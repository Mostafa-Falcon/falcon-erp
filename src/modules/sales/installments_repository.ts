/**
 * 🦅 LOGIXA FALCON ERP - INSTALLMENTS & GUARANTORS REPOSITORY
 * Handles installment plan creation, interest/markup calculation,
 * monthly schedule generation, guarantors, payment collection, and accounting entries.
 */

import { db } from '@/core/db/app_database';
import { SyncQueueManager } from '@/core/sync/sync_queue_manager';
import { TreasuryRepository } from '@/modules/treasury/treasury_repository';
import { ContactsRepository } from '@/modules/contacts/contacts_repository';
import { AccountingRepository } from '@/modules/accounting/accounting_repository';
import type {
  InstallmentPlan,
  InstallmentSchedule,
  Guarantor,
  InstallmentFrequency,
  InstallmentStatus,
} from '@/types';
import { v4 as uuidv4 } from 'uuid';

export class InstallmentsRepository {
  /**
   * Generate next sequential plan number e.g. INS-00101
   */
  public static async nextPlanNumber(orgId: string): Promise<string> {
    const count = await db.installment_plans.where('org_id').equals(orgId).count();
    const seq = (count + 1).toString().padStart(5, '0');
    return `INS-${seq}`;
  }

  /**
   * Calculate Installment Plan Financial Breakdown
   */
  public static calculatePlanBreakdown(
    totalInvoiceAmount: number,
    downPayment: number,
    interestRatePercent: number,
    numberOfInstallments: number
  ) {
    const total = Math.max(0, totalInvoiceAmount);
    const down = Math.min(total, Math.max(0, downPayment));
    const financedAmount = Math.max(0, total - down);
    const rate = Math.max(0, interestRatePercent);
    const numInstallments = Math.max(1, numberOfInstallments);

    const interestAmount = Number((financedAmount * (rate / 100)).toFixed(2));
    const totalFinancedWithInterest = Number((financedAmount + interestAmount).toFixed(2));
    const installmentAmount = Number((totalFinancedWithInterest / numInstallments).toFixed(2));

    return {
      totalInvoiceAmount: total,
      downPayment: down,
      financedAmount,
      interestRatePercent: rate,
      interestAmount,
      totalFinancedWithInterest,
      numberOfInstallments: numInstallments,
      installmentAmount,
    };
  }

  /**
   * Create a new Installment Plan with Schedule and Guarantors
   */
  public static async createPlan(params: {
    orgId: string;
    branchId: string;
    invoiceId?: string | null;
    invoiceNumber?: string;
    customerId: string;
    customerName: string;
    customerPhone: string;
    totalInvoiceAmount: number;
    downPayment: number;
    interestRatePercent: number;
    numberOfInstallments: number;
    installmentFrequency?: InstallmentFrequency;
    startDate: string; // YYYY-MM-DD
    treasuryIdForDownPayment?: string | null;
    notes?: string;
    guarantors?: {
      fullName: string;
      nationalId: string;
      phone: string;
      workPlace?: string;
      relationship?: string;
      address?: string;
      notes?: string;
    }[];
    userId: string;
  }): Promise<{ plan: InstallmentPlan; schedules: InstallmentSchedule[] }> {
    const now = new Date().toISOString();
    const planId = uuidv4();
    const planNumber = await InstallmentsRepository.nextPlanNumber(params.orgId);

    const calc = InstallmentsRepository.calculatePlanBreakdown(
      params.totalInvoiceAmount,
      params.downPayment,
      params.interestRatePercent,
      params.numberOfInstallments
    );

    const plan: InstallmentPlan = {
      id: planId,
      org_id: params.orgId,
      branch_id: params.branchId,
      invoice_id: params.invoiceId || null,
      invoice_number: params.invoiceNumber || '',
      customer_id: params.customerId,
      customer_name: params.customerName.trim(),
      customer_phone: params.customerPhone.trim(),
      plan_number: planNumber,
      total_invoice_amount: calc.totalInvoiceAmount,
      down_payment: calc.downPayment,
      financed_amount: calc.financedAmount,
      interest_rate_percent: calc.interestRatePercent,
      interest_amount: calc.interestAmount,
      total_financed_with_interest: calc.totalFinancedWithInterest,
      number_of_installments: calc.numberOfInstallments,
      installment_frequency: params.installmentFrequency || 'monthly',
      installment_amount: calc.installmentAmount,
      start_date: params.startDate,
      status: 'active',
      notes: params.notes?.trim() || '',
      created_by: params.userId,
      created_at: now,
      updated_at: now,
      sync_status: 'pending',
    };

    // Generate Monthly Schedule Items
    const schedules: InstallmentSchedule[] = [];
    const basePrincipalPerInstallment = calc.financedAmount / calc.numberOfInstallments;
    const baseInterestPerInstallment = calc.interestAmount / calc.numberOfInstallments;

    let currentDueDate = new Date(params.startDate);

    for (let i = 1; i <= calc.numberOfInstallments; i++) {
      const scheduleId = uuidv4();
      const dueDateStr = currentDueDate.toISOString().split('T')[0];

      const isLast = i === calc.numberOfInstallments;
      // Adjust rounding on last installment if necessary
      const principal = isLast
        ? Number((calc.financedAmount - basePrincipalPerInstallment * (calc.numberOfInstallments - 1)).toFixed(2))
        : Number(basePrincipalPerInstallment.toFixed(2));

      const interest = isLast
        ? Number((calc.interestAmount - baseInterestPerInstallment * (calc.numberOfInstallments - 1)).toFixed(2))
        : Number(baseInterestPerInstallment.toFixed(2));

      const lineTotal = Number((principal + interest).toFixed(2));

      schedules.push({
        id: scheduleId,
        plan_id: planId,
        org_id: params.orgId,
        installment_number: i,
        due_date: dueDateStr,
        amount: lineTotal,
        principal_amount: principal,
        interest_amount: interest,
        paid_amount: 0,
        remaining_amount: lineTotal,
        status: 'unpaid',
        created_at: now,
        updated_at: now,
        sync_status: 'pending',
      });

      // Increment 1 month for next installment
      currentDueDate.setMonth(currentDueDate.getMonth() + 1);
    }

    // Prepare Guarantors
    const guarantorRecords: Guarantor[] = (params.guarantors || []).map((g) => ({
      id: uuidv4(),
      plan_id: planId,
      org_id: params.orgId,
      customer_id: params.customerId,
      full_name: g.fullName.trim(),
      national_id: g.nationalId.trim(),
      phone: g.phone.trim(),
      work_place: g.workPlace?.trim() || '',
      relationship: g.relationship?.trim() || '',
      address: g.address?.trim() || '',
      notes: g.notes?.trim() || '',
      created_at: now,
      updated_at: now,
      sync_status: 'pending',
    }));

    await db.transaction(
      'rw',
      [
        db.installment_plans,
        db.installment_schedules,
        db.guarantors,
        db.treasuries,
        db.contacts,
        db.contact_transactions,
      ],
      async () => {
        // Save Plan Header
        await db.installment_plans.put(plan);
        await SyncQueueManager.enqueue('installment_plans', planId, 'insert', plan);

        // Save Schedules Bulk
        await db.installment_schedules.bulkAdd(schedules);
        for (const s of schedules) {
          await SyncQueueManager.enqueue('installment_schedules', s.id, 'insert', s);
        }

        // Save Guarantors Bulk
        if (guarantorRecords.length > 0) {
          await db.guarantors.bulkAdd(guarantorRecords);
          for (const g of guarantorRecords) {
            await SyncQueueManager.enqueue('guarantors', g.id, 'insert', g);
          }
        }

        // Record Down Payment in Treasury if paid
        if (calc.downPayment > 0 && params.treasuryIdForDownPayment) {
          await TreasuryRepository.adjustBalance(params.treasuryIdForDownPayment, calc.downPayment);
        }

        // Adjust Customer Debt for total financed with interest
        await ContactsRepository.adjustBalance({
          orgId: params.orgId,
          contactId: params.customerId,
          referenceType: 'installment_plan',
          referenceId: planId,
          debit: calc.totalFinancedWithInterest,
          credit: 0,
          notes: `فتح خطة تقسيط #${planNumber} (المحسب مع الفوائد: ${calc.totalFinancedWithInterest} ج.م)`,
        });
      }
    );

    return { plan, schedules };
  }

  /**
   * Pay a specific installment schedule item
   */
  public static async payScheduleItem(params: {
    scheduleId: string;
    amountPaid: number;
    treasuryId: string;
    userId: string;
    notes?: string;
  }): Promise<{ schedule: InstallmentSchedule; plan: InstallmentPlan }> {
    const schedule = await db.installment_schedules.get(params.scheduleId);
    if (!schedule) throw new Error('قسط التقسيط المطلوب غير موجود.');

    const plan = await db.installment_plans.get(schedule.plan_id);
    if (!plan) throw new Error('خطة التقسيط المرتبطة غير موجودة.');

    if (schedule.remaining_amount <= 0) {
      throw new Error('هذا القسط مسدد بالكامل مسبقاً.');
    }

    const payAmount = Math.min(params.amountPaid, schedule.remaining_amount);
    const now = new Date().toISOString();

    const newPaid = Number((schedule.paid_amount + payAmount).toFixed(2));
    const newRemaining = Number(Math.max(0, schedule.amount - newPaid).toFixed(2));
    const newStatus: InstallmentStatus = newRemaining === 0 ? 'paid' : 'partially_paid';

    const updatedSchedule: InstallmentSchedule = {
      ...schedule,
      paid_amount: newPaid,
      remaining_amount: newRemaining,
      status: newStatus,
      paid_at: now,
      treasury_id: params.treasuryId,
      notes: params.notes?.trim() || schedule.notes,
      updated_at: now,
      sync_status: 'pending',
    };

    await db.transaction(
      'rw',
      [
        db.installment_plans,
        db.installment_schedules,
        db.treasuries,
        db.contacts,
        db.contact_transactions,
      ],
      async () => {
        await db.installment_schedules.put(updatedSchedule);
        await SyncQueueManager.enqueue('installment_schedules', schedule.id, 'update', updatedSchedule);

        // Adjust Treasury
        if (payAmount > 0 && params.treasuryId) {
          await TreasuryRepository.adjustBalance(params.treasuryId, payAmount);
        }

        // Adjust Customer Debt Balance
        await ContactsRepository.adjustBalance({
          orgId: plan.org_id,
          contactId: plan.customer_id,
          referenceType: 'installment_schedule',
          referenceId: schedule.id,
          debit: 0,
          credit: payAmount,
          notes: `سداد قسط تقسيط رقم (${schedule.installment_number}) خطة #${plan.plan_number}`,
        });

        // Check if all schedules for this plan are completed
        const allSchedules = await db.installment_schedules.where('plan_id').equals(plan.id).toArray();
        const uncompleted = allSchedules.filter((s) => (s.id === schedule.id ? newRemaining > 0 : s.remaining_amount > 0));

        if (uncompleted.length === 0) {
          const completedPlan: InstallmentPlan = {
            ...plan,
            status: 'completed',
            updated_at: now,
            sync_status: 'pending',
          };
          await db.installment_plans.put(completedPlan);
          await SyncQueueManager.enqueue('installment_plans', plan.id, 'update', completedPlan);
        }
      }
    );

    // Post Double-Entry Accounting Entry for Interest Revenue Recognition
    try {
      const interestPortion = Math.min(payAmount, schedule.interest_amount);
      if (interestPortion > 0) {
        await AccountingRepository.postServiceRevenue({
          orgId: plan.org_id,
          branchId: plan.branch_id,
          referenceId: schedule.id,
          referenceNumber: `${plan.plan_number}-Q${schedule.installment_number}`,
          amount: interestPortion,
          treasuryId: params.treasuryId,
          customerId: plan.customer_id,
          description: `إيراد أرباح/فوائد تقسيط - خطة #${plan.plan_number} (قسط ${schedule.installment_number}/${plan.number_of_installments})`,
          userId: params.userId,
        });
      }
    } catch (e) {
      console.warn('[Accounting] Installment payment journal entry warning:', e);
    }

    const updatedPlan = (await db.installment_plans.get(plan.id)) || plan;
    return { schedule: updatedSchedule, plan: updatedPlan };
  }
}
