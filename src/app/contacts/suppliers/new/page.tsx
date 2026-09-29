'use client';

import React from'react';
import { AppShell } from'@/components/layout/AppShell';
import { SupplierForm } from'@/components/contacts/forms/SupplierForm';
import { useSessionStore } from'@/core/state/useSessionStore';

export default function NewSupplierPage() {
 const { currentUser } = useSessionStore();
 const orgId = currentUser?.org_id ||'';

 return (
 <AppShell
 title="إضافة مورد جديد"
 subtitle="تسجيل شركة توريد أو مورد جديد وإعداد بيانات المندوب والرصيد الدائن"
 >
 <SupplierForm orgId={orgId} />
 </AppShell>
 );
}