'use client';

import React, { useEffect, useState, useMemo } from'react';
import { db } from'@/core/db/app_database';
import { ContactsRepository } from'@/modules/contacts/contacts_repository';
import { formatNumber } from'@/lib/format';
import type { Contact, ContactTransaction, SalesInvoice, FinancialVoucher, Treasury } from'@/types';
import { toast } from'sonner';

// Profile Modular Subcomponents
import { ProfileHeader } from'./ProfileHeader';
import { ProfileNavTabs, type ProfileTabId } from'./ProfileNavTabs';
import { ProfileOverviewTab } from'./tabs/ProfileOverviewTab';
import { StatementTab } from'./tabs/StatementTab';
import { SalesInvoicesTab } from'./tabs/SalesInvoicesTab';
import { PurchasedItemsTab } from'./tabs/PurchasedItemsTab';
import { PaymentsTab } from'./tabs/PaymentsTab';
import { ActivitiesTab } from'./tabs/ActivitiesTab';
import { CollectPaymentModal } from'./modals/CollectPaymentModal';
import { DisburseAdvanceModal } from'./modals/DisburseAdvanceModal';

interface CustomerProfileViewProps {
 customerId: string;
 onBack: () => void;
 onCustomerUpdated?: () => void;
}

export function CustomerProfileView({
 customerId,
 onBack,
 onCustomerUpdated,
}: CustomerProfileViewProps) {
 const [customer, setCustomer] = useState<Contact | null>(null);
 const [activeTab, setActiveTab] = useState<ProfileTabId>('profile');
 const [loading, setLoading] = useState(true);

 // Associated Data
 const [transactions, setTransactions] = useState<ContactTransaction[]>([]);
 const [salesInvoices, setSalesInvoices] = useState<SalesInvoice[]>([]);
 const [purchasedItems, setPurchasedItems] = useState<
 { id: string; name: string; quantity: number; total: number; date: string }[]
 >([]);
 const [vouchers, setVouchers] = useState<FinancialVoucher[]>([]);
 const [treasuries, setTreasuries] = useState<Treasury[]>([]);

 // Modals
 const [paymentModalOpen, setPaymentModalOpen] = useState(false);
 const [advanceModalOpen, setAdvanceModalOpen] = useState(false);
 const [isSettling, setIsSettling] = useState(false);

 const loadData = async () => {
 try {
 setLoading(true);
 const c = await ContactsRepository.getById(customerId);
 if (!c) {
 toast.error('لم يتم العثور على العميل');
 onBack();
 return;
 }
 setCustomer(c);

 // 1. Transactions
 const txs = await ContactsRepository.getStatement(customerId);
 setTransactions(txs as any);

 // 2. Sales Invoices
 const invs = await db.sales_invoices
 .where('customer_id')
 .equals(customerId)
 .reverse()
 .sortBy('invoice_date');
 setSalesInvoices(invs);

 // 3. Purchased Items
 const invIds = invs.map((i) => i.id);
 if (invIds.length > 0) {
 const items = await db.sales_invoice_items.where('invoice_id').anyOf(invIds).toArray();
 const productIds = Array.from(new Set(items.map((it) => it.product_id)));
 const products = await db.products.where('id').anyOf(productIds).toArray();
 const prodMap = new Map(products.map((p) => [p.id, p.name]));

 const summary = items.map((it) => {
 const inv = invs.find((i) => i.id === it.invoice_id);
 return {
 id: it.id,
 name: prodMap.get(it.product_id) || it.notes ||'صنف مباع',
 quantity: it.quantity,
 total: it.total,
 date: inv?.invoice_date ||'',
 };
 });
 setPurchasedItems(summary);
 } else {
 setPurchasedItems([]);
 }

 // 4. Vouchers
 const fvs = await db.financial_vouchers
 .where('contact_id')
 .equals(customerId)
 .reverse()
 .sortBy('created_at');
 setVouchers(fvs);

 // 5. Treasuries
 const trList = await db.treasuries
 .where('org_id')
 .equals(c.org_id)
 .and((t) => t.is_active)
 .toArray();
 setTreasuries(trList);
 } catch (err) {
 console.error('Failed to load customer profile:', err);
 toast.error('حدث خطأ أثناء تحميل بيانات العميل');
 } finally {
 setLoading(false);
 }
 };

 useEffect(() => {
 loadData();
 }, [customerId]);

 // Financial Stats
 const stats = useMemo(() => {
 const totalInvoicesAmount = salesInvoices.reduce((acc, i) => acc + (i.total || 0), 0);
 const totalReceivedPayments = vouchers
 .filter((v) => v.type ==='receipt')
 .reduce((acc, v) => acc + (v.amount || 0), 0);
 const totalAdvances = vouchers
 .filter((v) => v.type ==='payment')
 .reduce((acc, v) => acc + (v.amount || 0), 0);

 const uniqueProductsCount = new Set(purchasedItems.map((p) => p.name)).size;

 return {
 totalInvoicesAmount,
 totalReceivedPayments,
 totalAdvances,
 invoicesCount: salesInvoices.length,
 uniqueProductsCount,
 vouchersCount: vouchers.length,
 };
 }, [salesInvoices, vouchers, purchasedItems]);

 // Handle Settlement (تصفية الحساب)
 const handleSettleAccount = async () => {
 if (!customer) return;
 if (customer.current_balance === 0) {
 toast.info('حساب العميل متزن بالفعل ورصيده صفر');
 return;
 }

 if (
 !confirm(
`هل أنت متأكد من تصفية حساب العميل وتسوية الرصيد الحالي (${formatNumber(
 customer.current_balance
 )} ج.م)؟`
 )
 ) {
 return;
 }

 try {
 setIsSettling(true);
 const bal = customer.current_balance;
 if (bal > 0) {
 await ContactsRepository.adjustBalance({
 orgId: customer.org_id,
 contactId: customer.id,
 referenceType:'receipt_voucher',
 referenceId:'settlement',
 debit: 0,
 credit: bal,
 notes:'تسوية وتصفية رصيد حساب العميل',
 });
 } else {
 await ContactsRepository.adjustBalance({
 orgId: customer.org_id,
 contactId: customer.id,
 referenceType:'payment_voucher',
 referenceId:'settlement',
 debit: Math.abs(bal),
 credit: 0,
 notes:'تسوية وتصفية رصيد حساب العميل',
 });
 }
 toast.success('تمت تسوية وتصفية رصيد الحساب بنجاح');
 await loadData();
 if (onCustomerUpdated) onCustomerUpdated();
 } catch {
 toast.error('فشل في تصفية الحساب');
 } finally {
 setIsSettling(false);
 }
 };

 const handleToggleActive = async () => {
 if (!customer) return;
 try {
 await ContactsRepository.setActive(customer.id, !customer.is_active);
 toast.success(customer.is_active ?'تم تعطيل حساب العميل':'تم تفعيل حساب العميل');
 await loadData();
 if (onCustomerUpdated) onCustomerUpdated();
 } catch {
 toast.error('فشل في تعديل حالة الحساب');
 }
 };

 if (loading || !customer) {
 return (
 <div className="bg-surface rounded-3xl border border-slate-200/80 dark:border-slate-800 p-16 text-center">
 <div className="w-10 h-10 border-3 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-3"/>
 <p className="text-xs font-bold text-slate-500">جاري تحميل بروفايل العميل...</p>
 </div>
 );
 }

 return (
 <div className="space-y-6 text-right select-none"dir="rtl">
 {/* 1. Header Card */}
 <ProfileHeader
 customer={customer}
 onBack={onBack}
 onOpenReceiptModal={() => setPaymentModalOpen(true)}
 onOpenAdvanceModal={() => setAdvanceModalOpen(true)}
 onSettleAccount={handleSettleAccount}
 isProcessing={isSettling}
 />

 {/* 2. Main Layout (Sidebar Tabs + Tab Content) */}
 <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
 {/* Sub-Navigation Tabs */}
 <div className="lg:col-span-3">
 <ProfileNavTabs
 activeTab={activeTab}
 onSelectTab={setActiveTab}
 counts={{
 statement: transactions.length,
 sales: salesInvoices.length,
 inventory: purchasedItems.length,
 payments: vouchers.length,
 }}
 />
 </div>

 {/* Tab Content Body */}
 <div className="lg:col-span-9">
 {activeTab ==='profile'&& (
 <ProfileOverviewTab
 customer={customer}
 stats={stats}
 onToggleActive={handleToggleActive}
 />
 )}

 {activeTab ==='statement'&& (
 <StatementTab
 transactions={transactions}
 customerName={customer.name}
 />
 )}

 {activeTab ==='sales'&& (
 <SalesInvoicesTab salesInvoices={salesInvoices} />
 )}

 {activeTab ==='inventory'&& (
 <PurchasedItemsTab purchasedItems={purchasedItems} />
 )}

 {activeTab ==='payments'&& (
 <PaymentsTab
 vouchers={vouchers}
 onOpenReceiptModal={() => setPaymentModalOpen(true)}
 onOpenPaymentModal={() => setAdvanceModalOpen(true)}
 />
 )}

 {activeTab ==='activities'&& (
 <ActivitiesTab customer={customer} />
 )}
 </div>
 </div>

 {/* Modals */}
 {paymentModalOpen && (
 <CollectPaymentModal
 isOpen={paymentModalOpen}
 onClose={() => setPaymentModalOpen(false)}
 customer={customer}
 treasuries={treasuries}
 onSuccess={() => {
 loadData();
 if (onCustomerUpdated) onCustomerUpdated();
 }}
 />
 )}

 {advanceModalOpen && (
 <DisburseAdvanceModal
 isOpen={advanceModalOpen}
 onClose={() => setAdvanceModalOpen(false)}
 customer={customer}
 treasuries={treasuries}
 onSuccess={() => {
 loadData();
 if (onCustomerUpdated) onCustomerUpdated();
 }}
 />
 )}
 </div>
 );
}