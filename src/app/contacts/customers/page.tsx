'use client';

import { Suspense } from'react';
import { CustomersManager } from'@/components/contacts/CustomersManager';

export default function CustomersPage() {
 return (
 <Suspense fallback={<div className="p-8 text-center text-xs font-bold text-slate-400">جاري تحميل سجل العملاء...</div>}>
 <CustomersManager />
 </Suspense>
 );
}