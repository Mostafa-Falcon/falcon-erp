'use client';

import React from'react';
import { AppShell } from'@/components/layout/AppShell';
import { BothContactForm } from'@/components/contacts/forms/BothContactForm';
import { useSessionStore } from'@/core/state/useSessionStore';

export default function NewBothContactPage() {
 const { currentUser } = useSessionStore();
 const orgId = currentUser?.org_id ||'';

 return (
 <AppShell
 title="إضافة حساب مورد وعميل (مزدوج)"
 subtitle="تسجيل جهة تعامل تعمل كمورد وعميل في آن واحد مع مقاصة الأرصدة"
 >
 <BothContactForm orgId={orgId} />
 </AppShell>
 );
}