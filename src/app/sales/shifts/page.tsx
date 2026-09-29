'use client';

import React, { Suspense } from'react';
import { AppShell } from'@/components/layout/AppShell';
import { ShiftsManager } from'@/components/sales/shifts/ShiftsManager';

export default function ShiftsPage() {
 return (
 <AppShell
 title="ورديات الكاشير"
 subtitle="فتح وإغلاق ورديات الكاشير، تدقيق حركة المبيعات، ومطابقة النقدية والعجز والزيادة"
 >
 <Suspense fallback={<div className="p-8 text-center text-xs font-bold text-slate-400">جاري تحميل الورديات...</div>}>
 <ShiftsManager />
 </Suspense>
 </AppShell>
 );
}