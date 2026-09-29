'use client';

import React from'react';
import { Suspense } from'react';
import { useRouter, useSearchParams } from'next/navigation';
import { AppShell } from'@/components/layout/AppShell';
import { PurchaseReturnForm } from'@/components/purchases/PurchaseReturnForm';

function NewReturnContent() {
 const params = useSearchParams();
 const router = useRouter();

 return (
 <AppShell title="مرتجع مشتريات جديد"subtitle="إرجاع بضاعة للمورد — يخصم من المخزون ويُسوي الذمم">
 <PurchaseReturnForm
 presetInvoiceId={params.get('invoice')}
 presetSupplierId={params.get('supplier')}
 presetWarehouseId={params.get('warehouse')}
 onSaved={() => {
 router.push('/purchases/returns');
 }}
 />
 </AppShell>
 );
}

export default function NewPurchaseReturnPage() {
 return (
 <Suspense fallback={<div />}>
 <NewReturnContent />
 </Suspense>
 );
}