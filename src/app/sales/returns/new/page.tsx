'use client';

import React from'react';
import { Suspense } from'react';
import { useRouter, useSearchParams } from'next/navigation';
import { AppShell } from'@/components/layout/AppShell';
import { SalesReturnForm } from'@/components/sales/SalesReturnForm';

function NewReturnContent() {
 const params = useSearchParams();
 const router = useRouter();

 return (
 <AppShell title="مرتجع مبيعات جديد"subtitle="استرجاع بضاعة من العميل — يعيد للمخزون المبلغ أو يسوّي حساب العميل">
 <SalesReturnForm
 presetInvoiceId={params.get('invoice')}
 presetCustomerId={params.get('customer')}
 presetWarehouseId={params.get('warehouse')}
 onSaved={() => {
 router.push('/sales/returns');
 }}
 />
 </AppShell>
 );
}

export default function NewSalesReturnPage() {
 return (
 <Suspense fallback={<div />}>
 <NewReturnContent />
 </Suspense>
 );
}