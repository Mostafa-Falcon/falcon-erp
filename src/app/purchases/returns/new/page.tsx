'use client';

import React from 'react';
import { Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { AppShell } from '@/components/layout/AppShell';
import { Button } from '@/components/ui/button';
import { ArrowRight } from 'lucide-react';
import { PurchaseReturnForm } from '@/components/purchases/PurchaseReturnForm';

function NewReturnContent() {
  const params = useSearchParams();
  const router = useRouter();

  return (
    <AppShell
      title="مرتجع مشتريات جديد"
      subtitle="إرجاع بضاعة للمورد — يخصم من المخزون ويُسوي الذمم المالية"
      actions={
        <Button
          variant="outline"
          onClick={() => router.push('/purchases/returns')}
          className="h-10 px-4 rounded-xl font-bold text-xs flex items-center gap-1.5 shadow-2xs hover:bg-slate-100 dark:hover:bg-slate-800 transition-all cursor-pointer"
        >
          <ArrowRight className="w-4 h-4" />
          <span>الرجوع للمرتجعات</span>
        </Button>
      }
    >
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