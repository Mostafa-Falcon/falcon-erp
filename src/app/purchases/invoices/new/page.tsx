'use client';

import React from'react';
import { useRouter } from'next/navigation';
import { AppShell } from'@/components/layout/AppShell';
import { PurchaseInvoiceForm } from'@/components/purchases/PurchaseInvoiceForm';

export default function NewPurchaseInvoicePage() {
 const router = useRouter();

 return (
 <AppShell title="فاتورة مشتريات جديدة"subtitle="تسجيل مشتريات من المورد — يرفع الرصيد بالمخزن ويثبت ذمم المورد">
 <PurchaseInvoiceForm
 onSaved={() => {
 router.push('/purchases/invoices');
 }}
 />
 </AppShell>
 );
}