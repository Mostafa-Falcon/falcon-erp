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
import {
 FileText,
 Search,
 Zap,
 RotateCcw,
 X,
 Loader2,
 Truck,
 Package,
} from'lucide-react';
import { db } from'@/core/db/app_database';
import { formatNumber, formatDateTime } from'@/lib/format';
import type { PurchaseInvoice, CashierShift, User as UserType, Contact } from'@/types';

interface PosPurchaseInvoiceSelectReturnModalProps {
 isOpen: boolean;
 onClose: () => void;
 activeShift: CashierShift | null;
 currentUser: UserType | null;
 contacts: Contact[];
 onSelectInvoice: (invoice: PurchaseInvoice) => void;
}

export function PosPurchaseInvoiceSelectReturnModal({
 isOpen,
 onClose,
 activeShift,
 currentUser,
 contacts,
 onSelectInvoice,
}: PosPurchaseInvoiceSelectReturnModalProps) {
 const [invoices, setInvoices] = useState<PurchaseInvoice[]>([]);
 const [searchQuery, setSearchQuery] = useState('');
 const [isLoading, setIsLoading] = useState(false);
 const [selectedInvoice, setSelectedInvoice] = useState<PurchaseInvoice | null>(null);

 useEffect(() => {
 if (!isOpen) {
 setSelectedInvoice(null);
 setSearchQuery('');
 return;
 }

 let isMounted = true;
 const loadInvoices = async () => {
 setIsLoading(true);
 try {
 let list: PurchaseInvoice[] = [];
 if (currentUser?.org_id) {
 list = await db.purchase_invoices
 .where('org_id')
 .equals(currentUser.org_id)
 .reverse()
 .limit(50)
 .toArray();
 } else {
 list = await db.purchase_invoices.toCollection().reverse().limit(50).toArray();
 }

 // Only active purchase invoices that are not cancelled
 const cleanList = list.filter((inv) => inv.status !=='cancelled');
 if (isMounted) setInvoices(cleanList);
 } catch (err) {
 console.error('Error loading purchase invoices for return selection:', err);
 } finally {
 if (isMounted) setIsLoading(false);
 }
 };

 loadInvoices();
 return () => {
 isMounted = false;
 };
 }, [isOpen, currentUser]);

 const suppliersMap = useMemo(() => {
 const map: Record<string, string> = {};
 for (const c of contacts) map[c.id] = c.name;
 return map;
 }, [contacts]);

 const filteredInvoices = useMemo(() => {
 const q = searchQuery.trim().toLowerCase();
 if (!q) return invoices;

 return invoices.filter((inv) => {
 const sysNum = (inv.system_invoice_number ||'').toLowerCase();
 const supNum = (inv.invoice_number ||'').toLowerCase();
 const supName = (inv.supplier_id ? suppliersMap[inv.supplier_id] ||'':'مورد غير محدد').toLowerCase();
 return sysNum.includes(q) || supNum.includes(q) || supName.includes(q);
 });
 }, [invoices, searchQuery, suppliersMap]);

 const handleStartReturn = () => {
 if (!selectedInvoice) return;
 onSelectInvoice(selectedInvoice);
 onClose();
 };

 return (
 <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
 <DialogContent
 className="max-w-xl max-h-[90vh] overflow-hidden flex flex-col p-6 rounded-3xl border-slate-200 dark:border-slate-800 bg-surface shadow-2xl text-right"
 dir="rtl"
 >
 {/* Header with Lightning Icon */}
 <DialogHeader className="pb-3 border-b border-slate-100 dark:border-slate-800/80 flex flex-col items-center text-center space-y-1 shrink-0 relative">
 <div className="flex items-center justify-center gap-2">
 <div className="w-9 h-9 rounded-full bg-orange-50 dark:bg-orange-950/60 text-orange-500 flex items-center justify-center border border-orange-200/60 dark:border-orange-800/60 shadow-xs">
 <Zap className="w-5 h-5 fill-orange-500"/>
 </div>
 <DialogTitle className="text-lg font-black text-slate-900 dark:text-white">
 بحث ذكي عن فاتورة مرتجع مشتريات
 </DialogTitle>
 </div>
 <DialogDescription className="text-xs font-medium text-slate-500 dark:text-slate-400">
 ابحث برقم الفاتورة أو اسم المورد لبدء تسجيل مرتجع مشتريات أصنافها
 </DialogDescription>
 </DialogHeader>

 {/* Smart Search Input with Amber/Orange Focus Outline */}
 <div className="py-3 shrink-0">
 <div className="relative">
 <Search className="w-4 h-4 text-slate-400 absolute right-3.5 top-1/2 -translate-y-1/2"/>
 <input
 type="text"
 autoFocus
 value={searchQuery}
 onChange={(e) => {
 setSearchQuery(e.target.value);
 if (
 selectedInvoice &&
 e.target.value !== selectedInvoice.system_invoice_number &&
 e.target.value !== selectedInvoice.invoice_number
 ) {
 setSelectedInvoice(null);
 }
 }}
 placeholder="اكتب رقم الفاتورة أو اسم المورد للبحث اللحظي..."
 className="w-full h-11 pr-10 pl-10 text-xs font-bold rounded-2xl bg-white dark:bg-[#0d1322] border-2 border-orange-500 dark:border-orange-500 focus:outline-none focus:ring-2 focus:ring-orange-400/30 text-slate-900 dark:text-white placeholder:text-slate-400 placeholder:font-normal transition-all shadow-xs"
 />
 {searchQuery && (
 <button
 type="button"
 onClick={() => {
 setSearchQuery('');
 setSelectedInvoice(null);
 }}
 className="w-6 h-6 rounded-full bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 absolute left-3 top-1/2 -translate-y-1/2 flex items-center justify-center transition-colors cursor-pointer"
 >
 <X className="w-3.5 h-3.5"/>
 </button>
 )}
 </div>
 </div>

 {/* Main Content Area */}
 <div className="flex-1 overflow-y-auto pr-1 min-h-[260px] flex flex-col">
 {isLoading ? (
 <div className="flex-1 py-16 text-center text-xs font-bold text-slate-400 flex flex-col items-center justify-center gap-2">
 <Loader2 className="w-6 h-6 animate-spin text-orange-500"/>
 <span>جاري البحث وتحميل فواتير المشتريات...</span>
 </div>
 ) : selectedInvoice ? (
 /* Selected Invoice Detail Card View */
 <div className="flex-1 flex flex-col justify-between py-2 animate-in fade-in-50 duration-200">
 <div className="p-4 rounded-2xl border border-slate-200 dark:border-slate-800 bg-surface-2 space-y-3 shadow-2xs">
 <div className="flex items-center justify-between text-xs font-bold text-slate-600 dark:text-slate-300">
 <span className="text-slate-400">رقم الفاتورة بالنظام:</span>
 <span className="font-mono font-black text-slate-900 dark:text-white text-sm">
 {selectedInvoice.system_invoice_number || selectedInvoice.invoice_number}
 </span>
 </div>

 {selectedInvoice.invoice_number && (
 <div className="flex items-center justify-between text-xs font-bold text-slate-600 dark:text-slate-300">
 <span className="text-slate-400">رقم فاتورة المورد:</span>
 <span className="font-mono text-slate-700 dark:text-slate-200">
 {selectedInvoice.invoice_number}
 </span>
 </div>
 )}

 <div className="flex items-center justify-between text-xs font-bold text-slate-600 dark:text-slate-300">
 <span className="text-slate-400">المورد:</span>
 <span className="text-slate-800 dark:text-slate-200">
 {selectedInvoice.supplier_id
 ? suppliersMap[selectedInvoice.supplier_id] ||'مورد محدد'
 :'مورد غير محدد'}
 </span>
 </div>

 <div className="flex items-center justify-between text-xs font-bold text-slate-600 dark:text-slate-300">
 <span className="text-slate-400">تاريخ الشراء:</span>
 <span className="text-slate-600 dark:text-slate-400 font-medium">
 {formatDateTime(selectedInvoice.created_at || selectedInvoice.invoice_date)}
 </span>
 </div>

 <div className="pt-2 border-t border-slate-200 dark:border-slate-700/80 flex items-center justify-between">
 <span className="text-xs font-bold text-slate-400">إجمالي الفاتورة:</span>
 <span className="font-black text-base font-mono text-emerald-600 dark:text-emerald-400">
 {formatNumber(selectedInvoice.total)} ج.م
 </span>
 </div>
 </div>

 {/* Start Return Button */}
 <div className="pt-6">
 <Button
 type="button"
 onClick={handleStartReturn}
 className="w-full h-12 rounded-2xl bg-orange-600 hover:bg-orange-700 text-white font-black text-sm flex items-center justify-center gap-2 shadow-md hover:shadow-lg transition-all cursor-pointer"
 >
 <Package className="w-5 h-5"/>
 <span>بدء إجراء مرتجع المشتريات للفاتورة المختارة</span>
 </Button>
 </div>
 </div>
 ) : (
 /* Invoices List View */
 <div className="space-y-2">
 <div className="text-2xs font-bold text-slate-400 pb-1">
 {searchQuery ?'نتائج البحث:':'أحدث فواتير المشتريات المسجلة:'}
 </div>

 {filteredInvoices.length === 0 ? (
 <div className="py-16 text-center text-xs font-bold text-slate-400">
 {searchQuery
 ?'لا توجد فواتير مشتريات مطابقة لبيانات البحث'
 :'لا توجد فواتير مشتريات مسجلة مؤخراً'}
 </div>
 ) : (
 filteredInvoices.map((inv) => {
 const supplierName = inv.supplier_id
 ? suppliersMap[inv.supplier_id] ||'مورد محدد'
 :'مورد غير محدد';

 return (
 <div
 key={inv.id}
 onClick={() => {
 setSelectedInvoice(inv);
 setSearchQuery(inv.system_invoice_number || inv.invoice_number);
 }}
 className="p-3.5 rounded-2xl border border-slate-200/80 dark:border-slate-800 bg-surface hover:border-orange-400 dark:hover:border-orange-500 transition-all flex items-center justify-between gap-3 cursor-pointer group shadow-2xs hover:shadow-xs"
 >
 {/* Left: Total Amount */}
 <span className="text-sm font-black font-mono text-emerald-600 dark:text-emerald-400">
 {formatNumber(inv.total)} ج.م
 </span>

 {/* Right: Invoice Info & Orange Truck/File Icon */}
 <div className="flex items-center gap-3">
 <div className="text-right">
 <span className="text-sm font-black font-mono text-slate-900 dark:text-white block group-hover:text-orange-600 dark:group-hover:text-orange-400 transition-colors">
 {inv.system_invoice_number || inv.invoice_number}
 </span>
 <span className="text-xs text-slate-400 font-medium">
 {supplierName} ▪ {formatDateTime(inv.created_at || inv.invoice_date)}
 </span>
 </div>
 <div className="w-9 h-9 rounded-xl bg-orange-50 dark:bg-orange-950/60 text-orange-600 dark:text-orange-400 flex items-center justify-center border border-orange-200/60 dark:border-orange-900/60 shrink-0 group-hover:scale-105 transition-transform">
 <FileText className="w-4 h-4"/>
 </div>
 </div>
 </div>
 );
 })
 )}
 </div>
 )}
 </div>

 {/* Cancel Button */}
 <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex justify-center shrink-0">
 <button
 type="button"
 onClick={onClose}
 className="text-xs font-bold text-orange-600 hover:text-orange-700 dark:text-orange-400 py-1 px-4 rounded-lg transition-colors cursor-pointer"
 >
 إلغاء
 </button>
 </div>
 </DialogContent>
 </Dialog>
 );
}