'use client';

import React from 'react';
import { Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { AppShell } from '@/components/layout/AppShell';
import { Button } from '@/components/ui/button';
import { ArrowRight } from 'lucide-react';
import { SalesReturnForm } from '@/components/sales/SalesReturnForm';

function NewReturnContent() {
  const params = useSearchParams();
  const router = useRouter();

  return (
    <AppShell
      title="مرتجع مبيعات جديد"
      subtitle="استرجاع بضاعة من العميل — يعيد للمخزون المبلغ أو يسوّي حساب العميل"
      actions={
        <Button
          variant="outline"
          onClick={() => router.push('/sales/returns')}
          className="h-10 px-4 rounded-xl font-bold text-xs flex items-center gap-1.5 shadow-2xs hover:bg-slate-100 dark:hover:bg-slate-800 transition-all cursor-pointer"
        >
          <ArrowRight className="w-4 h-4" />
          <span>الرجوع للمرتجعات</span>
        </Button>
      }
    >
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