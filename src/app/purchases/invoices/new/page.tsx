'use client';

import React, { Suspense } from 'react';
import { useRouter } from 'next/navigation';
import { AppShell } from '@/components/layout/AppShell';
import { PurchaseInvoiceForm } from '@/components/purchases/PurchaseInvoiceForm';

function NewPurchaseInvoiceContent() {
  const router = useRouter();

  return (
    <AppShell
      title="فاتورة مشتريات جديدة"
      subtitle="تسجيل مشتريات من المورد — يرفع الرصيد بالمخزن ويثبت ذمم المورد"
      actions={
        <button
          onClick={() => router.back()}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 text-xs font-medium transition cursor-pointer"
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

export default function NewPurchaseInvoicePage() {
  return (
    <Suspense fallback={<div className="py-20 text-center text-sm font-bold text-slate-400">جاري تحميل صفحة المشتريات...</div>}>
      <NewPurchaseInvoiceContent />
    </Suspense>
  );
}