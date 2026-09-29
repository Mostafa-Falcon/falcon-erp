'use client';

import React from'react';
import { AppShell } from'@/components/layout/AppShell';
import { CustomerForm } from'@/components/contacts/forms/CustomerForm';
import { useSessionStore } from'@/core/state/useSessionStore';

export default function NewCustomerPage() {
 const { currentUser } = useSessionStore();
 const orgId = currentUser?.org_id ||'';

 return (
 <AppShell
 title="إضافة عميل جديد"
 subtitle="تسجيل بيانات عميل جديد في المنظومة وإعداد الرصيد والحد الائتماني"
 >
 <CustomerForm orgId={orgId} />
 </AppShell>
 );
}