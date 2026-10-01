/**
 * 🦅 LOGIXA FALCON ERP - INSTALLMENT SALES & GUARANTORS TYPES
 * Standard Retail, Home Appliances & Electronics Deferred Installment System.
 */

import type { EntityId, ISODateString } from './common';

export type PlanStatus = 'active' | 'completed' | 'defaulted' | 'cancelled';
export type InstallmentStatus = 'unpaid' | 'partially_paid' | 'paid' | 'overdue';
export type InstallmentFrequency = 'monthly' | 'weekly';

export interface InstallmentPlan {
  id: EntityId;
  org_id: EntityId;
  branch_id: EntityId;
  invoice_id?: EntityId | null; // Linked Sales Invoice ID if applicable
  invoice_number?: string;
  customer_id: EntityId;
  customer_name: string;
  customer_phone: string;
  plan_number: string; // e.g. INS-00101
  total_invoice_amount: number; // إجمالي الفاتورة الأصلية
  down_payment: number; // المبلغ المقدم المدفوع كاش
  financed_amount: number; // المبلغ المتبقي للتقسيط (الإجمالي - المقدم)
  interest_rate_percent: number; // نسبة الفائدة / المرابحة (٪)
  interest_amount: number; // مبلغ الفائدة/المرابحة الكلي
  total_financed_with_interest: number; // إجمالي الممول مع الفائدة
  number_of_installments: number; // عدد الأقساط (مثلاً 6، 12، 24)
  installment_frequency: InstallmentFrequency;
  installment_amount: number; // قيمة القسط الشهري الثابت
  start_date: string; // YYYY-MM-DD تاريخ بداية التقسيط / القسط الأول
  status: PlanStatus;
  notes?: string;
  created_by?: EntityId;
  created_at: ISODateString;
  updated_at: ISODateString;
  sync_status?: 'synced' | 'pending' | 'failed';
}

export interface InstallmentSchedule {
  id: EntityId;
  plan_id: EntityId;
  org_id: EntityId;
  installment_number: number; // رقم القسط (1، 2، 3...)
  due_date: string; // YYYY-MM-DD تاريخ استحقاق القسط
  amount: number; // قيمة القسط الكلية
  principal_amount: number; // من أصل المبلغ
  interest_amount: number; // من الفائدة
  paid_amount: number; // المبلغ المسدد من هذا القسط
  remaining_amount: number; // المتبقي من هذا القسط
  status: InstallmentStatus;
  paid_at?: ISODateString | null;
  treasury_id?: EntityId | null; // الخزينة المسدد فيها القسط
  voucher_id?: EntityId | null; // رقم سند القبض
  notes?: string;
  created_at: ISODateString;
  updated_at: ISODateString;
  sync_status?: 'synced' | 'pending' | 'failed';
}

export interface Guarantor {
  id: EntityId;
  plan_id: EntityId;
  org_id: EntityId;
  customer_id?: EntityId | null;
  full_name: string; // اسم الضامن بالكامل
  national_id: string; // الرقم القومي للضامن
  phone: string; // رقم هاتف الضامن
  work_place?: string; // جهة عمل الضامن
  relationship?: string; // صلة القرابة بالعميل
  address?: string; // عنوان الضامن
  notes?: string; // أرقام الشيكات أو إيصالات الأمانة
  created_at: ISODateString;
  updated_at: ISODateString;
  sync_status?: 'synced' | 'pending' | 'failed';
}
