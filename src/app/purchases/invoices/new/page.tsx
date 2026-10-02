'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import { AppShell } from '@/components/layout/AppShell';
import { PurchaseInvoiceForm } from '@/components/purchases/PurchaseInvoiceForm';

export default function NewPurchaseInvoicePage() {
  const router = useRouter();

  return (
    <AppShell
      title="فاتورة مشتريات جديدة"
      subtitle="تسجيل مشتريات من المورد — يرفع الرصيد بالمخزن ويثبت ذمم المورد"
      actions={
        <button
          onClick={() => router.back()}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 text-xs font-medium transition"
        >
          رجوع
        </button>
      }
    >
      <PurchaseInvoiceForm
        onSaved={() => {
          router.push('/purchases/invoices');
        }}
      />
    </AppShell>
  );
}