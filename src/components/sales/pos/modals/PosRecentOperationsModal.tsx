'use client';

import React, { useState, useEffect, useMemo } from'react';
import {
 Dialog,
 DialogContent,
 DialogHeader,
 DialogTitle,
 DialogDescription,
} from'@/components/ui/dialog';
import { Button } from'@/components/ui/button';
import { Input } from'@/components/ui/input';
import { Badge } from'@/components/ui/badge';
import {
 History,
 Printer,
 RotateCcw,
 Edit3,
 Trash2,
 Search,
 FileText,
 Clock,
 User,
 Coins,
 CheckCircle2,
 AlertCircle,
 Loader2,
 X,
} from'lucide-react';
import { db } from'@/core/db/app_database';
import { formatNumber, formatDateTime } from'@/lib/format';
import type {
 SalesInvoice,
 CashierShift,
 User as UserType,
 Product,
 Unit,
 Contact,
 Treasury,
 Warehouse,
} from'@/types';
import { toast } from'sonner';

// Sub-modals for actions
import { PosInvoiceReturnModal } from'./PosInvoiceReturnModal';
import { EditInvoiceModal } from'@/components/sales/invoices/EditInvoiceModal';
import { DeleteInvoiceDialog } from'@/components/sales/invoices/DeleteInvoiceDialog';
import { InvoiceDetailModal } from'@/components/sales/invoices/InvoiceDetailModal';

interface PosRecentOperationsModalProps {
 isOpen: boolean;
 onClose: () => void;
 activeShift: CashierShift | null;
 currentUser: UserType | null;
 products: Product[];
 unitsById: Record<string, Unit>;
 customers: Contact[];
 treasuries: Treasury[];
 warehouses: Warehouse[];
 users: UserType[];
 onPrintInvoice: (invoice: SalesInvoice) => void;
 onShiftDataChanged: () => void;
}

export function PosRecentOperationsModal({
 isOpen,
 onClose,
 activeShift,
 currentUser,
 products,
 unitsById,
 customers,
 treasuries,
 warehouses,
 users,
 onPrintInvoice,
 onShiftDataChanged,
}: PosRecentOperationsModalProps) {
 const [invoices, setInvoices] = useState<SalesInvoice[]>([]);
 const [isLoading, setIsLoading] = useState(false);
 const [searchQuery, setSearchQuery] = useState('');

 // Selected invoice for action submodals
 const [selectedForReturn, setSelectedForReturn] = useState<SalesInvoice | null>(null);
 const [selectedForEdit, setSelectedForEdit] = useState<SalesInvoice | null>(null);
 const [selectedForDelete, setSelectedForDelete] = useState<SalesInvoice | null>(null);
 const [selectedForDetail, setSelectedForDetail] = useState<SalesInvoice | null>(null);

 // Load Invoices for the active shift
 const loadShiftInvoices = async () => {
 if (!isOpen) return;
 try {
 setIsLoading(true);
 let list: SalesInvoice[] = [];

 if (activeShift) {
 list = await db.sales_invoices
 .where('shift_id')
 .equals(activeShift.id)
 .reverse()
 .toArray();
 }

 // If active shift has no invoices or no active shift, load latest branch invoices
 if (list.length === 0 && currentUser?.branch_id) {
 list = await db.sales_invoices
 .where('branch_id')
 .equals(currentUser.branch_id)
 .reverse()
 .limit(30)
 .toArray();
 } else if (list.length === 0) {
 list = await db.sales_invoices.toCollection().reverse().limit(30).toArray();
 }

 setInvoices(list);
 } catch (err) {
 console.error('Error loading recent shift operations:', err);
 } finally {
 setIsLoading(false);
 }
 };

 useEffect(() => {
 loadShiftInvoices();
 }, [isOpen, activeShift]);

 // Customer name lookup map
 const customersMap = useMemo(() => {
 const map: Record<string, string> = {};
 for (const c of customers) {
 map[c.id] = c.name;
 }
 return map;
 }, [customers]);

 // Format time relative or direct
 const formatInvoiceTime = (dateIso?: string) => {
 if (!dateIso) return'—';
 const d = new Date(dateIso);
 const now = new Date();
 const isToday =
 d.getDate() === now.getDate() &&
 d.getMonth() === now.getMonth() &&
 d.getFullYear() === now.getFullYear();

 const timeStr = d.toLocaleTimeString('ar-EG', {
 hour:'2-digit',
 minute:'2-digit',
 hour12: true,
 });

 return isToday ?`اليوم، ${timeStr}`:`${d.toLocaleDateString('ar-EG')} ${timeStr}`;
 };

 // Payment type Arabic label
 const getPaymentLabel = (type?: string) => {
 switch (type) {
 case'cash':
 return'نقدي';
 case'card':
 return'بطاقة / فيزا';
 case'credit':
 return'آجل';
 case'split':
 return'مجزأ';
 default:
 return'نقدي';
 }
 };

 // Filtered list
 const filteredInvoices = useMemo(() => {
 const q = searchQuery.trim().toLowerCase();
 if (!q) return invoices;

 return invoices.filter((inv) => {
 const invNum = (inv.invoice_number ||'').toLowerCase();
 const custName = (inv.customer_id ? customersMap[inv.customer_id] ||'':'عميل نقدي').toLowerCase();
 return invNum.includes(q) || custName.includes(q);
 });
 }, [invoices, searchQuery, customersMap]);

 return (
 <>
 <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
 <DialogContent
 className="max-w-4xl max-h-[90vh] overflow-hidden flex flex-col p-6 rounded-3xl border-slate-200 dark:border-slate-800 bg-surface shadow-2xl text-right"
 dir="rtl"
 >
 {/* 1. Header */}
 <DialogHeader className="pb-4 border-b border-slate-100 dark:border-slate-800 flex flex-row items-center justify-between space-y-0 shrink-0">
 <div className="flex items-center gap-3">
 <div className="w-11 h-11 rounded-2xl bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 flex items-center justify-center border border-blue-200/50 dark:border-blue-900/50 shrink-0 shadow-inner">
 <History className="w-5 h-5"/>
 </div>
 <div>
 <div className="flex items-center gap-2">
 <DialogTitle className="text-lg font-black text-slate-900 dark:text-white">
 آخر العمليات (الوردية الحالية)
 </DialogTitle>
 {activeShift && (
 <Badge className="bg-blue-50 hover:bg-blue-100 text-blue-700 dark:bg-blue-950/60 dark:text-blue-300 border border-blue-200/80 dark:border-blue-800 font-bold text-xs rounded-xl">
 وردية #{activeShift.shift_number}
 </Badge>
 )}
 </div>
 <DialogDescription className="text-xs font-semibold text-slate-400 mt-0.5">
 سجل فواتير المبيعات الصادرة بالوردية مع إمكانية الطباعة، الإرجاع، التعديل والحذف
 </DialogDescription>
 </div>
 </div>

 {/* Invoices Count Badge */}
 <div className="hidden sm:flex items-center gap-2">
 <span className="text-xs font-bold text-slate-400">
 إجمالي العمليات:
 </span>
 <span className="font-mono font-black text-sm px-2.5 py-1 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
 {invoices.length} فاتورة
 </span>
 </div>
 </DialogHeader>

 {/* 2. Search & Filter Bar */}
 <div className="py-3 flex items-center gap-3 shrink-0">
 <div className="relative flex-1">
 <Search className="w-4 h-4 text-slate-400 absolute right-3 top-1/2 -translate-y-1/2"/>
 <Input
 value={searchQuery}
 onChange={(e) => setSearchQuery(e.target.value)}
 placeholder="البحث برقم الفاتورة (INV-...) أو اسم العميل..."
 className="h-10 pr-9 pl-4 text-xs font-semibold rounded-xl bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-slate-800 focus-visible:ring-blue-500"
 />
 </div>
 </div>

 {/* 3. Invoices List View */}
 <div className="flex-1 overflow-y-auto pr-1 space-y-2.5 min-h-[320px]">
 {isLoading ? (
 <div className="py-24 flex flex-col items-center justify-center gap-3 text-slate-400 font-bold text-xs">
 <Loader2 className="w-7 h-7 animate-spin text-blue-600"/>
 <span>جاري تحميل فواتير الوردية...</span>
 </div>
 ) : filteredInvoices.length === 0 ? (
 <div className="py-24 flex flex-col items-center justify-center gap-3 text-slate-400">
 <div className="w-14 h-14 rounded-2xl bg-slate-100 dark:bg-slate-800/60 flex items-center justify-center text-slate-400">
 <FileText className="w-7 h-7"/>
 </div>
 <span className="text-sm font-bold text-slate-600 dark:text-slate-300">
 {searchQuery ?'لا توجد فواتير تطابق معايير البحث':'لا توجد عمليات بيع مسجلة في هذه الوردية حتى الآن'}
 </span>
 <span className="text-xs text-slate-400">
 أي عملية بيع جديدة تكتمل ستظهر هنا فوراً.
 </span>
 </div>
 ) : (
 filteredInvoices.map((inv) => {
 const customerName = inv.customer_id
 ? customersMap[inv.customer_id] ||'عميل محدد'
 :'عميل نقدي';
 const isCancelled = inv.is_deleted || inv.status ==='cancelled';

 return (
 <div
 key={inv.id}
 className={`p-3.5 sm:p-4 rounded-2xl border transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
 isCancelled
 ?'bg-rose-50/40 dark:bg-rose-950/10 border-rose-200/80 dark:border-rose-900/40 opacity-75'
 :'bg-surface border-slate-200/80 dark:border-slate-800/90 hover:border-blue-400/60 shadow-2xs hover:shadow-xs'
 }`}
 >
 {/* Right side in RTL: Invoice Info & Customer */}
 <div className="flex items-center gap-3.5 min-w-0">
 <div
 onClick={() => setSelectedForDetail(inv)}
 title="عرض تفاصيل الفاتورة"
 className={`w-11 h-11 rounded-2xl flex items-center justify-center shrink-0 cursor-pointer transition-transform hover:scale-105 ${
 isCancelled
 ?'bg-rose-100 text-rose-600 dark:bg-rose-950/60'
 :'bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 border border-blue-200/50 dark:border-blue-900/50'
 }`}
 >
 <FileText className="w-5 h-5"/>
 </div>

 <div className="space-y-1 min-w-0">
 <div className="flex items-center gap-2">
 <span
 onClick={() => setSelectedForDetail(inv)}
 className="text-sm font-black font-mono text-slate-900 dark:text-white hover:text-blue-600 cursor-pointer"
 >
 فاتورة #{inv.invoice_number}
 </span>

 {isCancelled && (
 <Badge className="bg-rose-100 text-rose-700 dark:bg-rose-950 dark:text-rose-400 text-3xs font-bold px-2 py-0.2 rounded-md">
 ملغاة / محذوفة
 </Badge>
 )}
 </div>

 <div className="flex items-center gap-2 text-xs font-semibold text-slate-400">
 <span>العميل: {customerName}</span>
 <span>▪</span>
 <span className="font-mono text-2xs text-slate-500 dark:text-slate-400">
 {formatInvoiceTime(inv.created_at || inv.invoice_date)}
 </span>
 </div>
 </div>
 </div>

 {/* Middle: Amount & Payment Type */}
 <div className="flex items-center justify-between sm:justify-end gap-4 shrink-0">
 <div className="text-right sm:text-left space-y-0.5 min-w-[90px]">
 <div className="text-base font-black font-mono text-emerald-600 dark:text-emerald-400">
 {formatNumber(inv.total)} ج.م
 </div>
 <span className="text-2xs font-semibold text-slate-400 block">
 {getPaymentLabel(inv.payment_type)}
 </span>
 </div>

 {/* Left Actions Toolbar (4 Action Buttons from the UI Screenshot) */}
 <div className="flex items-center gap-1.5 shrink-0">
 {/* 1. Print Button */}
 <button
 type="button"
 onClick={() => onPrintInvoice(inv)}
 title="طباعة الفاتورة"
 className="w-9 h-9 rounded-xl bg-blue-50 text-blue-600 dark:bg-blue-950/60 dark:text-blue-400 hover:bg-blue-600 hover:text-white dark:hover:bg-blue-600 dark:hover:text-white border border-blue-200/70 dark:border-blue-800/70 flex items-center justify-center transition-colors cursor-pointer"
 >
 <Printer className="w-4 h-4"/>
 </button>

 {/* 2. Return Button */}
 <button
 type="button"
 disabled={isCancelled}
 onClick={() => setSelectedForReturn(inv)}
 title="إنشاء مرتجع مبيعات"
 className="w-9 h-9 rounded-xl bg-amber-50 text-amber-600 dark:bg-amber-950/60 dark:text-amber-400 hover:bg-amber-600 hover:text-white dark:hover:bg-amber-600 dark:hover:text-white border border-amber-200/70 dark:border-amber-800/70 flex items-center justify-center transition-colors cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
 >
 <RotateCcw className="w-4 h-4"/>
 </button>

 {/* 3. Edit Button */}
 <button
 type="button"
 disabled={isCancelled}
 onClick={() => setSelectedForEdit(inv)}
 title="تعديل الفاتورة"
 className="w-9 h-9 rounded-xl bg-sky-50 text-sky-600 dark:bg-sky-950/60 dark:text-sky-400 hover:bg-sky-600 hover:text-white dark:hover:bg-sky-600 dark:hover:text-white border border-sky-200/70 dark:border-sky-800/70 flex items-center justify-center transition-colors cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
 >
 <Edit3 className="w-4 h-4"/>
 </button>

 {/* 4. Delete Button */}
 <button
 type="button"
 disabled={isCancelled}
 onClick={() => setSelectedForDelete(inv)}
 title="حذف الفاتورة واسترجاع المخزون"
 className="w-9 h-9 rounded-xl bg-rose-50 text-rose-600 dark:bg-rose-950/60 dark:text-rose-400 hover:bg-rose-600 hover:text-white dark:hover:bg-rose-600 dark:hover:text-white border border-rose-200/70 dark:border-rose-800/70 flex items-center justify-center transition-colors cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
 >
 <Trash2 className="w-4 h-4"/>
 </button>
 </div>
 </div>
 </div>
 );
 })
 )}
 </div>

 {/* 4. Footer */}
 <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between shrink-0">
 <span className="text-xs text-slate-400 font-semibold">
 تتم مزامنة كافة عمليات التعديل والإرجاع والحذف محلياً وسحابياً وفورياً.
 </span>
 <Button
 type="button"
 variant="outline"
 onClick={onClose}
 className="h-9 px-6 rounded-xl font-bold text-xs cursor-pointer"
 >
 إغلاق
 </Button>
 </div>
 </DialogContent>
 </Dialog>

 {/* Action Modals */}
 {/* 1. Return Modal */}
 <PosInvoiceReturnModal
 invoice={selectedForReturn}
 isOpen={Boolean(selectedForReturn)}
 onClose={() => setSelectedForReturn(null)}
 activeShift={activeShift}
 currentUser={currentUser}
 products={products}
 unitsById={unitsById}
 treasuries={treasuries}
 onReturnProcessed={() => {
 loadShiftInvoices();
 onShiftDataChanged();
 }}
 />

 {/* 2. Edit Modal */}
 <EditInvoiceModal
 invoice={selectedForEdit}
 isOpen={Boolean(selectedForEdit)}
 onClose={() => setSelectedForEdit(null)}
 currentUser={currentUser}
 products={products}
 units={Object.values(unitsById)}
 customers={customers}
 onUpdated={() => {
 loadShiftInvoices();
 onShiftDataChanged();
 }}
 />

 {/* 3. Delete Dialog */}
 <DeleteInvoiceDialog
 invoice={selectedForDelete}
 isOpen={Boolean(selectedForDelete)}
 onClose={() => setSelectedForDelete(null)}
 currentUser={currentUser}
 onDeleted={() => {
 loadShiftInvoices();
 onShiftDataChanged();
 }}
 />

 {/* 4. Invoice Detail Modal */}
 <InvoiceDetailModal
 invoice={selectedForDetail}
 isOpen={Boolean(selectedForDetail)}
 onClose={() => setSelectedForDetail(null)}
 products={products}
 units={Object.values(unitsById)}
 customers={customers}
 treasuries={treasuries}
 users={users}
 warehouses={warehouses}
 />
 </>
 );
}