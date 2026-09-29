'use client';

import React, { useState } from'react';
import {
 Dialog,
 DialogContent,
 DialogHeader,
 DialogTitle,
 DialogDescription,
} from'@/components/ui/dialog';
import { Button } from'@/components/ui/button';
import { Input } from'@/components/ui/input';
import { Label } from'@/components/ui/label';
import { AlertTriangle, Loader2, Trash2 } from'lucide-react';
import { SalesRepository } from'@/modules/sales/sales_repository';
import type { SalesInvoice, User as UserType } from'@/types';
import { toast } from'sonner';

interface DeleteInvoiceDialogProps {
 invoice: SalesInvoice | null;
 isOpen: boolean;
 onClose: () => void;
 currentUser: UserType | null;
 onDeleted: () => void;
}

export function DeleteInvoiceDialog({
 invoice,
 isOpen,
 onClose,
 currentUser,
 onDeleted,
}: DeleteInvoiceDialogProps) {
 const [reason, setReason] = useState('');
 const [isBusy, setIsBusy] = useState(false);

 if (!invoice) return null;

 const handleDelete = async (e: React.FormEvent) => {
 e.preventDefault();
 if (!currentUser) return;

 try {
 setIsBusy(true);
 await SalesRepository.deleteSalesInvoice({
 invoiceId: invoice.id,
 userId: currentUser.id,
 reason: reason.trim() || undefined,
 });

 toast.success(`تم حذف وإلغاء الفاتورة #${invoice.invoice_number} بنجاح واسترجاع الأصناف للمخزن`);
 onDeleted();
 onClose();
 } catch (err: any) {
 console.error(err);
 toast.error(err?.message ||'حدث خطأ أثناء حذف الفاتورة');
 } finally {
 setIsBusy(false);
 }
 };

 return (
 <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
 <DialogContent
 className="max-w-md p-6 rounded-2xl border-slate-200 dark:border-slate-800 bg-surface shadow-2xl text-right"
 dir="rtl"
 >
 <DialogHeader className="pb-4 border-b border-slate-100 dark:border-slate-800 space-y-2">
 <div className="flex items-center gap-3">
 <div className="w-12 h-12 rounded-2xl bg-rose-50 dark:bg-rose-950/50 text-rose-600 dark:text-rose-400 flex items-center justify-center shadow-inner shrink-0">
 <Trash2 className="w-6 h-6"/>
 </div>
 <div>
 <DialogTitle className="text-base font-black text-slate-900 dark:text-white">
 تأكيد حذف فاتورة المبيعات
 </DialogTitle>
 <DialogDescription className="text-xs font-semibold text-slate-400 mt-0.5">
 رقم الفاتورة: #{invoice.invoice_number}
 </DialogDescription>
 </div>
 </div>
 </DialogHeader>

 <form onSubmit={handleDelete} className="space-y-4 pt-2 text-xs">
 <div className="p-3.5 rounded-xl bg-rose-50/70 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-900 text-rose-800 dark:text-rose-200 space-y-1 font-semibold">
 <p className="font-bold flex items-center gap-1.5">
 <AlertTriangle className="w-4 h-4 shrink-0 text-rose-600"/>
 <span>تنبيه هام عند الحذف:</span>
 </p>
 <p>
 سيتم نقل الفاتورة إلى <b>أرشيف المحذوفات</b>، واسترجاع كميات الأصناف تلقائياً إلى المخزن، وخصم المبلغ من الخزينة وتسوية مديونية العميل.
 </p>
 </div>

 <div className="space-y-1.5">
 <Label htmlFor="del-reason"className="text-xs font-bold text-slate-700 dark:text-slate-300">
 سبب الحذف أو الإلغاء (اختياري)
 </Label>
 <Input
 id="del-reason"
 value={reason}
 onChange={(e) => setReason(e.target.value)}
 placeholder="مثال: خطأ في إدخال الأصناف أو تراجع الزبون..."
 className="h-10 rounded-xl text-xs font-semibold bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-slate-800"
 />
 </div>

 <div className="flex items-center justify-end gap-2 pt-2">
 <Button
 type="button"
 variant="outline"
 onClick={onClose}
 className="h-9 px-4 rounded-xl text-xs font-bold"
 >
 إلغاء
 </Button>

 <Button
 type="submit"
 disabled={isBusy}
 className="h-9 px-5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs flex items-center gap-1.5 shadow-2xs cursor-pointer"
 >
 {isBusy ? <Loader2 className="w-4 h-4 animate-spin"/> : <Trash2 className="w-4 h-4"/>}
 <span>تأكيد الحذف والإلغاء</span>
 </Button>
 </div>
 </form>
 </DialogContent>
 </Dialog>
 );
}