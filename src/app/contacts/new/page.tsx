'use client';

import React, { useEffect, useState, Suspense } from'react';
import { useRouter, useSearchParams } from'next/navigation';
import { AppShell } from'@/components/layout/AppShell';
import { useSessionStore } from'@/core/state/useSessionStore';
import { ContactsRepository } from'@/modules/contacts/contacts_repository';
import type { Contact, ContactType } from'@/types';

// Specialized forms
import { CustomerForm } from'@/components/contacts/forms/CustomerForm';
import { SupplierForm } from'@/components/contacts/forms/SupplierForm';
import { BothContactForm } from'@/components/contacts/forms/BothContactForm';

function NewContactRouter() {
 const router = useRouter();
 const searchParams = useSearchParams();
 const requestedType = (searchParams.get('type') as ContactType | null) ?? null;
 const editId = searchParams.get('edit');
 const { currentUser } = useSessionStore();
 const orgId = currentUser?.org_id ||'';

 const [contact, setContact] = useState<Contact | null>(null);
 const [isLoading, setIsLoading] = useState(!!editId);

 useEffect(() => {
 if (!editId || !orgId) return;
 const load = async () => {
 try {
 const c = await ContactsRepository.getById(editId);
 if (c && c.org_id === orgId) {
 setContact(c);
 }
 } catch (err) {
 console.error('Load contact edit error:', err);
 } finally {
 setIsLoading(false);
 }
 };
 load();
 }, [editId, orgId]);

 if (isLoading) {
 return (
 <AppShell title="جاري التحميل...">
 <div className="bg-surface rounded-3xl border border-slate-200/80 dark:border-slate-800 py-20 text-center text-slate-400 text-xs font-bold">
 <div className="w-8 h-8 border-3 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-3"/>
 <span>جاري تحميل بيانات جهة التعامل...</span>
 </div>
 </AppShell>
 );
 }

 // Determine which specialized form to render
 const resolvedType: ContactType = contact?.type || requestedType ||'customer';

 if (resolvedType ==='supplier') {
 return (
 <AppShell
 title={contact ?`تعديل المورد: ${contact.name}`:'إضافة مورد جديد'}
 subtitle="إدارة بيانات شركة التوريد ومسؤولي المبيعات وشروط السداد"
 >
 <SupplierForm orgId={orgId} initial={contact} />
 </AppShell>
 );
 }

 if (resolvedType ==='both') {
 return (
 <AppShell
 title={contact ?`تعديل الحساب المزدوج: ${contact.name}`:'إضافة حساب مورد وعميل (مزدوج)'}
 subtitle="إدارة جهات التعامل التي تعمل كمورد وعميل في آن واحد مع مقاصة الأرصدة"
 >
 <BothContactForm orgId={orgId} initial={contact} />
 </AppShell>
 );
 }

 // Default: Customer
 return (
 <AppShell
 title={contact ?`تعديل بيانات العميل: ${contact.name}`:'إضافة عميل جديد'}
 subtitle="تسجيل بيانات العميل، أرقام التواصل، والحد الائتماني لمتابعة المبيعات"
 >
 <CustomerForm orgId={orgId} initial={contact} />
 </AppShell>
 );
}

export default function NewContactPage() {
 return (
 <Suspense
 fallback={
 <div className="h-screen w-full flex items-center justify-center bg-app">
 <div className="w-9 h-9 border-3 border-blue-600 border-t-transparent rounded-full animate-spin"/>
 </div>
 }
 >
 <NewContactRouter />
 </Suspense>
 );
}