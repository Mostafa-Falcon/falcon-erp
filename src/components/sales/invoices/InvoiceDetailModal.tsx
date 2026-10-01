'use client';

import React, { useState, useEffect } from'react';
import {
 Dialog,
 DialogContent,
 DialogHeader,
 DialogTitle,
} from'@/components/ui/dialog';
import { Button } from'@/components/ui/button';
import { Badge } from'@/components/ui/badge';
import {
 Receipt,
 Printer,
 Calendar,
 User,
 Building2,
 Wallet,
 Clock,
 Package,
 CreditCard,
 FileText,
 X,
 Store,
 ChevronRight,
 Share2,
} from'lucide-react';
import { db } from'@/core/db/app_database';
import { formatNumber, formatDateTime } from'@/lib/format';
import type { SalesInvoice, SalesInvoiceItem, Product, Unit, Contact, Treasury, User as UserType, Warehouse } from'@/types';
import { toast } from'sonner';

interface InvoiceDetailModalProps {
 invoice: SalesInvoice | null;
 isOpen: boolean;
 onClose: () => void;
 products: Product[];
 units: Unit[];
 customers: Contact[];
 treasuries: Treasury[];
 users: UserType[];
 warehouses: Warehouse[];
}

export function InvoiceDetailModal({
 invoice,
 isOpen,
 onClose,
 products,
 units,
 customers,
 treasuries,
 users,
 warehouses,
}: InvoiceDetailModalProps) {
 const [items, setItems] = useState<SalesInvoiceItem[]>([]);
 const [isLoading, setIsLoading] = useState(false);

 useEffect(() => {
 if (!invoice || !isOpen) return;

 let isMounted = true;
 const loadItems = async () => {
 setIsLoading(true);
 try {
 const list = await db.sales_invoice_items.where('invoice_id').equals(invoice.id).toArray();
 if (isMounted) setItems(list);
 } catch (err) {
 console.error('Error loading invoice items:', err);
 } finally {
 if (isMounted) setIsLoading(false);
 }
 };

 loadItems();
 return () => {
 isMounted = false;
 };
 }, [invoice, isOpen]);

 if (!invoice) return null;

 const customer = customers.find((c) => c.id === invoice.customer_id);
 const cashier = users.find((u) => u.id === invoice.created_by);
 const treasury = treasuries.find((t) => t.id === invoice.treasury_id);
 const warehouse = warehouses.find((w) => w.id === invoice.warehouse_id);

 const getProductName = (id: string) => products.find((p) => p.id === id)?.name ||'صنف غير معروف';
 const getProductSku = (id: string) => products.find((p) => p.id === id)?.sku ||'—';
 const getUnitName = (id: string) => units.find((u) => u.id === id)?.name ||'وحدة';

 const isCancelled = invoice.is_deleted || invoice.status ==='cancelled';

 const handlePrintReceipt = () => {
 window.print();
 };

 const handleShareInvoice = async () => {
 const shareText = `🧾 فاتورة مبيعات #${invoice.invoice_number}\nالعميل: ${customer?.name ||'عميل نقدي'}\nالإجمالي: ${formatNumber(invoice.total)} ج.م\nالتاريخ: ${formatDateTime(invoice.invoice_date || invoice.created_at)}`;
 if (navigator.share) {
 try {
 await navigator.share({
 title:`فاتورة #${invoice.invoice_number}`,
 text: shareText,
 });
 toast.success('تم فتح خيارات المشاركة بنجاح');
 } catch (e) {
 // user cancelled
 }
 } else {
 await navigator.clipboard.writeText(shareText);
 toast.success('تم نسخ تفاصيل الفاتورة للحافظة لمشاركتها عبر الواتساب أو التطبيقات');
 }
 };

 return (
 <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
 <DialogContent
 className="max-w-3xl max-h-[90vh] overflow-y-auto p-6 rounded-2xl border-slate-200 dark:border-slate-800 bg-surface shadow-2xl text-right"
 dir="rtl"
 >
 {/* Header */}
 <DialogHeader className="pb-4 border-b border-slate-100 dark:border-slate-800 flex flex-row items-center justify-between gap-4 space-y-0">
 <div>
 <Badge
 className={`text-xs font-bold px-3 py-1 rounded-full ${
 isCancelled
 ?'bg-rose-50 text-rose-600 border border-rose-200 dark:bg-rose-950/50 dark:text-rose-400 dark:border-rose-800'
 :'bg-emerald-50 text-emerald-600 border border-emerald-200 dark:bg-emerald-950/50 dark:text-emerald-400 dark:border-emerald-800'
 }`}
 >
 {isCancelled ?'ملغاة / محذوفة':'مكتملة ومحفوظة'}
 </Badge>
 </div>

 <div className="flex items-center gap-3">
 <div className="text-left">
 <DialogTitle className="text-base font-black text-slate-900 dark:text-white flex items-center gap-2">
 <span>تفاصيل الفاتورة</span>
 <span className="font-mono text-pink-600 dark:text-pink-400">#{invoice.invoice_number}</span>
 </DialogTitle>
 <p className="text-xs font-semibold text-slate-400 mt-0.5 font-sans">
 {formatDateTime(invoice.created_at || invoice.invoice_date)}
 </p>
 </div>
 <div className="w-10 h-10 rounded-xl bg-pink-50 dark:bg-pink-950/60 text-pink-600 dark:text-pink-400 flex items-center justify-center border border-pink-100 dark:border-pink-900/60 shrink-0">
 <Receipt className="w-5 h-5"/>
 </div>
 </div>
 </DialogHeader>

 {/* Metadata info cards */}
 <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-2 text-xs">
 {/* العميل */}
 <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-900/50 border border-slate-200/80 dark:border-slate-800 space-y-1">
 <span className="text-slate-400 font-bold block">العميل:</span>
 <span className="font-bold text-slate-900 dark:text-white block">
 {customer?.name ||'عميل نقدي'}
 </span>
 {customer?.phone && (
 <span className="text-3xs font-mono text-slate-500 block">{customer.phone}</span>
 )}
 </div>

 {/* الكاشير */}
 <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-900/50 border border-slate-200/80 dark:border-slate-800 space-y-1">
 <span className="text-slate-400 font-bold block">بواسطة (الكاشير):</span>
 <span className="font-bold text-slate-900 dark:text-white block">
 {cashier?.full_name || cashier?.username ||'—'}
 </span>
 {invoice.shift_id && (
 <span className="text-3xs font-bold text-purple-600 block">وردية كاشير</span>
 )}
 </div>

 {/* الخزينة / طريقة الدفع */}
 <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-900/50 border border-slate-200/80 dark:border-slate-800 space-y-1">
 <span className="text-slate-400 font-bold block">طريقة الدفع:</span>
 <div className="flex items-center gap-1.5 font-bold text-slate-900 dark:text-white">
 <Badge variant="outline"className="text-3xs font-mono">
 {invoice.payment_type}
 </Badge>
 <span>{treasury?.name ||'الخزينة'}</span>
 </div>
 </div>

 {/* المخزن */}
 <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-900/50 border border-slate-200/80 dark:border-slate-800 space-y-1">
 <span className="text-slate-400 font-bold block">مخزن الصرف:</span>
 <span className="font-bold text-slate-900 dark:text-white block">
 {warehouse?.name ||'المخزن الرئيسي'}
 </span>
 </div>
 </div>

 {/* Cancellation Notice if deleted */}
 {isCancelled && (
 <div className="p-3 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900 text-xs text-rose-700 dark:text-rose-300 font-bold flex items-center justify-between">
 <span>⚠️ تم إلغاء هذه الفاتورة واسترجاع كمياتها للمخزن وتسوية الخزينة.</span>
 {invoice.delete_reason && <span>السبب: {invoice.delete_reason}</span>}
 </div>
 )}

 {/* Items Table */}
 <div className="border border-slate-200/90 dark:border-slate-800 rounded-2xl overflow-hidden mt-1">
 <div className="px-4 py-2.5 bg-slate-50/70 dark:bg-slate-900/50 border-b border-slate-200/80 dark:border-slate-800 flex items-center justify-between">
 <h5 className="text-xs font-bold text-slate-700 dark:text-slate-300">
 بنود وأصناف الفاتورة ({items.length})
 </h5>
 </div>

 {isLoading ? (
 <div className="py-12 text-center text-xs font-bold text-slate-400">
 جاري تحميل أصناف الفاتورة...
 </div>
 ) : items.length === 0 ? (
 <div className="py-10 text-center text-xs font-bold text-slate-400">
 لا توجد أصناف مسجلة في الفاتورة.
 </div>
 ) : (
 <div className="overflow-x-auto">
 <table className="w-full text-right text-xs">
 <thead className="bg-slate-50/50 dark:bg-slate-900/30 border-b border-slate-200 dark:border-slate-800 text-2xs font-bold text-slate-500">
 <tr>
 <th className="py-2.5 px-3">#</th>
 <th className="py-2.5 px-3">الصنف</th>
 <th className="py-2.5 px-3">الوحدة</th>
 <th className="py-2.5 px-3 text-center">الكمية</th>
 <th className="py-2.5 px-3 text-left">سعر الوحدة</th>
 <th className="py-2.5 px-3 text-left">الخصم</th>
 <th className="py-2.5 px-3 text-left">الإجمالي</th>
 </tr>
 </thead>
 <tbody className="divide-y divide-slate-100 dark:divide-slate-800/80 font-bold">
 {items.map((item, idx) => (
 <tr key={item.id} className="hover:bg-slate-50/70 dark:hover:bg-slate-800/40">
 <td className="py-2.5 px-3 font-mono text-slate-400">{idx + 1}</td>
 <td className="py-2.5 px-3">
 <div className="space-y-0.5">
 <span className="text-slate-900 dark:text-white block font-bold">
 {getProductName(item.product_id)}
 </span>
 <span className="text-3xs font-mono text-slate-400 block">
 كود: {getProductSku(item.product_id)}
 </span>
 </div>
 </td>
 <td className="py-2.5 px-3 text-slate-600 dark:text-slate-400">
 {getUnitName(item.unit_id)}
 </td>
 <td className="py-2.5 px-3 text-center font-mono font-bold text-slate-900 dark:text-white">
 {item.quantity}
 </td>
 <td className="py-2.5 px-3 text-left font-mono">
 {formatNumber(item.unit_price)} ج.م
 </td>
 <td className="py-2.5 px-3 text-left font-mono text-rose-600">
 {item.discount_amount > 0 ?`-${formatNumber(item.discount_amount)}`:'0.00'}
 </td>
 <td className="py-2.5 px-3 text-left font-mono font-black text-slate-900 dark:text-white">
 {formatNumber(item.total)} ج.م
 </td>
 </tr>
 ))}
 </tbody>
 </table>
 </div>
 )}
 </div>

 {/* Financial Summary */}
 <div className="bg-slate-50/70 dark:bg-slate-900/50 border border-slate-200/80 dark:border-slate-800 rounded-2xl p-4 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4 text-xs">
 <div className="space-y-1 text-slate-500 font-semibold">
 {invoice.notes && (
 <p className="text-slate-600 dark:text-slate-400">
 <span className="font-bold">ملاحظات:</span> {invoice.notes}
 </p>
 )}
 <p>
 <span className="font-bold">حالة الدفع:</span>{''}
 {invoice.remaining_amount > 0 ? (
 <span className="text-rose-600 font-bold">متبقي آجل ({formatNumber(invoice.remaining_amount)} ج.م)</span>
 ) : (
 <span className="text-emerald-600 font-bold">مدفوعة بالكامل</span>
 )}
 </p>
 </div>

 <div className="space-y-1.5 text-left border-t sm:border-t-0 sm:border-r border-slate-200 dark:border-slate-800 pt-2 sm:pt-0 sm:pr-6 font-mono min-w-[200px]">
 <div className="flex justify-between text-slate-500 font-semibold">
 <span>المجموع الفرعي:</span>
 <span>{formatNumber(invoice.subtotal)} ج.م</span>
 </div>
 {invoice.discount_amount > 0 && (
 <div className="flex justify-between text-rose-600 font-semibold">
 <span>إجمالي الخصم:</span>
 <span>-{formatNumber(invoice.discount_amount)} ج.م</span>
 </div>
 )}
 <div className="flex justify-between text-sm font-black text-slate-900 dark:text-white pt-1 border-t border-slate-200 dark:border-slate-800">
 <span>صافي الفاتورة:</span>
 <span className="text-pink-600 dark:text-pink-400">{formatNumber(invoice.total)} ج.م</span>
 </div>
 <div className="flex justify-between text-slate-600 dark:text-slate-300 font-bold text-2xs">
 <span>المبلغ المدفوع:</span>
 <span>{formatNumber(invoice.paid_amount)} ج.م</span>
 </div>
 </div>
 </div>

 {/* Modal Footer actions */}
 <div className="pt-2 flex items-center justify-between gap-3">
 <div className="flex items-center gap-2">
 <Button
 type="button"
 onClick={handlePrintReceipt}
 className="h-9 px-4 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs flex items-center gap-1.5 shadow-2xs cursor-pointer"
 >
 <Printer className="w-4 h-4"/>
 <span>طباعة إيصال</span>
 </Button>

 <Button
 type="button"
 variant="outline"
 onClick={handleShareInvoice}
 className="h-9 px-4 rounded-xl border-slate-200 dark:border-slate-800 text-xs font-bold flex items-center gap-1.5 cursor-pointer"
 >
 <Share2 className="w-4 h-4 text-emerald-600"/>
 <span>مشاركة الفاتورة</span>
 </Button>
 </div>

 <Button
 type="button"
 variant="outline"
 onClick={onClose}
 className="h-9 px-6 rounded-xl border-pink-400 text-pink-600 hover:bg-pink-50 dark:hover:bg-pink-950/40 font-bold text-xs cursor-pointer"
 >
 إغلاق
 </Button>
 </div>

 </DialogContent>
 </Dialog>
 );
}