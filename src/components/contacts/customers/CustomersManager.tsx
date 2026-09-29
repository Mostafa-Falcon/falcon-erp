'use client';

import React, { useEffect, useMemo, useState } from'react';
import { useRouter, useSearchParams } from'next/navigation';
import { AppShell } from'@/components/layout/AppShell';
import { Button } from'@/components/ui/button';
import { Plus, Upload } from'lucide-react';
import { useSessionStore } from'@/core/state/useSessionStore';
import { ContactsRepository } from'@/modules/contacts/contacts_repository';
import { db } from'@/core/db/app_database';
import type { Contact } from'@/types';
import { toast } from'sonner';

// Modular Components
import { CustomersKpiCards } from'./CustomersKpiCards';
import { CustomersToolbar, type CustomerFilterTab } from'./CustomersToolbar';
import { CustomersSubBar } from'./CustomersSubBar';
import { CustomersTable } from'./CustomersTable';
import { CustomersPagination } from'./CustomersPagination';
import { ColumnsCustomizerModal, DEFAULT_CUSTOMER_COLUMNS, type CustomerColumnConfig } from'./ColumnsCustomizerModal';
import { ImportCustomersModal } from'./ImportCustomersModal';
import { CustomerProfileView } from'@/components/contacts/profile/CustomerProfileView';

export function CustomersManager() {
 const router = useRouter();
 const searchParams = useSearchParams();
 const selectedCustomerId = searchParams.get('id');

 const { currentUser } = useSessionStore();
 const orgId = currentUser?.org_id ||'';

 // Data State
 const [customers, setCustomers] = useState<Contact[]>([]);
 const [salesTotals, setSalesTotals] = useState<Record<string, number>>({});
 const [isLoading, setIsLoading] = useState(true);

 // Filters & Controls
 const [activeTab, setActiveTab] = useState<CustomerFilterTab>('all');
 const [searchQuery, setSearchQuery] = useState('');
 const [pageSize, setPageSize] = useState('50');
 const [currentPage, setCurrentPage] = useState(1);

 // Modals
 const [columnsModalOpen, setColumnsModalOpen] = useState(false);
 const [columnsConfig, setColumnsConfig] = useState<CustomerColumnConfig>(() => {
 if (typeof window !=='undefined') {
 try {
 const saved = localStorage.getItem('falcon_customer_columns');
 if (saved) return JSON.parse(saved);
 } catch {}
 }
 return DEFAULT_CUSTOMER_COLUMNS;
 });
 const [importModalOpen, setImportModalOpen] = useState(false);

 // Load Customers strictly (type ==='customer'only!)
 const loadCustomers = async () => {
 if (!orgId) return;
 try {
 setIsLoading(true);
 const list = await ContactsRepository.getContacts(orgId,'customer');
 setCustomers(list);

 // Total sales invoices per customer
 const invs = await db.sales_invoices.where('org_id').equals(orgId).toArray();
 const totalsMap: Record<string, number> = {};
 for (const inv of invs) {
 if (inv.customer_id) {
 totalsMap[inv.customer_id] = (totalsMap[inv.customer_id] || 0) + (inv.total || 0);
 }
 }
 setSalesTotals(totalsMap);
 } catch (err) {
 console.error('Failed to load customers:', err);
 toast.error('حدث خطأ أثناء تحميل سجل العملاء');
 } finally {
 setIsLoading(false);
 }
 };

 useEffect(() => {
 loadCustomers();
 }, [orgId]);

 // Reset pagination on filter change
 useEffect(() => {
 setCurrentPage(1);
 }, [searchQuery, activeTab, pageSize]);

 // Financial KPIs
 const kpiData = useMemo(() => {
 let totalDebt = 0;
 let totalCredit = 0;

 for (const c of customers) {
 if (c.current_balance > 0) totalDebt += c.current_balance;
 else if (c.current_balance < 0) totalCredit += Math.abs(c.current_balance);
 }

 return {
 totalCustomers: customers.length,
 totalDebt,
 totalCredit,
 netDebt: totalDebt - totalCredit,
 };
 }, [customers]);

 // Filtered List
 const filtered = useMemo(() => {
 const q = searchQuery.trim().toLowerCase();

 return customers.filter((c) => {
 if (activeTab ==='debit'&& c.current_balance <= 0) return false;
 if (activeTab ==='inactive'&& c.is_active) return false;

 if (q) {
 const nameMatch = (c.name ||'').toLowerCase().includes(q);
 const codeMatch = (c.code ||'').toLowerCase().includes(q);
 const phoneMatch = (c.phone ||'').toLowerCase().includes(q) || (c.mobile ||'').toLowerCase().includes(q);
 if (!nameMatch && !codeMatch && !phoneMatch) return false;
 }

 return true;
 }).sort((a, b) => a.name.localeCompare(b.name,'ar'));
 }, [customers, activeTab, searchQuery]);

 // Pagination Slicing
 const pSize = Number(pageSize) || 50;
 const totalPages = Math.max(1, Math.ceil(filtered.length / pSize));
 const currentPageSafe = Math.min(currentPage, totalPages);
 const paginatedCustomers = useMemo(() => {
 const start = (currentPageSafe - 1) * pSize;
 return filtered.slice(start, start + pSize);
 }, [filtered, currentPageSafe, pSize]);

 // Toggle Active Status
 const handleToggleActive = async (c: Contact) => {
 try {
 await ContactsRepository.setActive(c.id, !c.is_active);
 toast.success(c.is_active ?`تم تعطيل العميل: ${c.name}`:`تم تفعيل العميل: ${c.name}`);
 await loadCustomers();
 } catch {
 toast.error('فشل في تعديل حالة العميل');
 }
 };

 // If a customer ID is selected, display the CustomerProfileView!
 if (selectedCustomerId) {
 return (
 <AppShell>
 <CustomerProfileView
 customerId={selectedCustomerId}
 onBack={() => router.push('/contacts/customers')}
 onCustomerUpdated={loadCustomers}
 />
 </AppShell>
 );
 }

 return (
 <AppShell
 title="سجل العملاء الموحد"
 subtitle="إدارة قاعدة بيانات العملاء، الأرصدة والتحليلات المالية للفرع"
 actions={
 <div className="flex items-center gap-2.5">
 <Button
 variant="outline"
 onClick={() => setImportModalOpen(true)}
 className="h-11 px-4 border-pink-200 dark:border-pink-900/50 text-pink-600 dark:text-pink-400 hover:bg-pink-50 dark:hover:bg-pink-950/20 font-bold text-xs rounded-2xl gap-2 shadow-xs cursor-pointer"
 >
 <Upload className="w-4 h-4"/>
 <span>استيراد Excel</span>
 </Button>

 <Button
 onClick={() => router.push('/contacts/customers/new')}
 className="h-11 px-5 bg-gradient-to-r from-pink-600 to-rose-600 hover:from-pink-700 hover:to-rose-700 text-white font-bold text-xs rounded-2xl gap-2 shadow-md shadow-pink-500/20 cursor-pointer active:scale-95 transition-all"
 >
 <Plus className="w-4 h-4"/>
 <span>إضافة عميل جديد</span>
 </Button>
 </div>
 }
 >
 <div className="space-y-5 text-right select-none"dir="rtl">
 {/* 1. The 3 KPI Cards */}
 <CustomersKpiCards
 totalCustomers={kpiData.totalCustomers}
 totalDebt={kpiData.totalDebt}
 totalCredit={kpiData.totalCredit}
 />

 {/* 2. Main Content Card */}
 <div className="bg-surface rounded-3xl border border-slate-200/80 dark:border-slate-800 shadow-sm overflow-hidden">
 {/* Toolbar */}
 <CustomersToolbar
 searchQuery={searchQuery}
 onSearchChange={setSearchQuery}
 activeTab={activeTab}
 onTabChange={setActiveTab}
 onRefresh={loadCustomers}
 isLoading={isLoading}
 />

 {/* SubBar */}
 <CustomersSubBar
 resultsCount={filtered.length}
 pageSize={pageSize}
 onPageSizeChange={setPageSize}
 onOpenColumnsModal={() => setColumnsModalOpen(true)}
 />

 {/* Table */}
 <CustomersTable
 customers={paginatedCustomers}
 salesTotals={salesTotals}
 isLoading={isLoading}
 columns={columnsConfig}
 onViewDetails={(c) => router.push(`/contacts/customers?id=${c.id}`)}
 onEdit={(c) => router.push(`/contacts/new?edit=${c.id}`)}
 onToggleActive={handleToggleActive}
 />

 {/* Pagination & Summary */}
 <CustomersPagination
 netDebt={kpiData.netDebt}
 totalFilteredCount={filtered.length}
 currentPage={currentPageSafe}
 totalPages={totalPages}
 pageSize={pSize}
 onPageChange={setCurrentPage}
 />
 </div>
 </div>

 {/* Modals */}
 <ColumnsCustomizerModal
 isOpen={columnsModalOpen}
 onClose={() => setColumnsModalOpen(false)}
 columns={columnsConfig}
 onChange={setColumnsConfig}
 />

 <ImportCustomersModal
 isOpen={importModalOpen}
 onClose={() => setImportModalOpen(false)}
 orgId={orgId}
 onImportComplete={loadCustomers}
 />
 </AppShell>
 );
}