'use client';

import React from'react';
import {
 Dialog,
 DialogContent,
 DialogHeader,
 DialogTitle,
} from'@/components/ui/dialog';
import { Button } from'@/components/ui/button';
import { RotateCcw, FileText, ShoppingBag, X } from'lucide-react';

interface PosReturnOptionsModalProps {
 isOpen: boolean;
 onClose: () => void;
 onSelectFreeReturn: () => void;
 onSelectInvoiceReturn: () => void;
}

export function PosReturnOptionsModal({
 isOpen,
 onClose,
 onSelectFreeReturn,
 onSelectInvoiceReturn,
}: PosReturnOptionsModalProps) {
 return (
 <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
 <DialogContent
 className="max-w-xl p-6 sm:p-8 rounded-3xl border-slate-200 dark:border-slate-800 bg-surface shadow-2xl text-center"
 dir="rtl"
 >
 {/* Header with Title & Icon */}
 <div className="flex items-center justify-center gap-3 pb-2">
 <div className="w-11 h-11 rounded-2xl bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 flex items-center justify-center border border-blue-200/50 dark:border-blue-900/50 shadow-inner shrink-0">
 <RotateCcw className="w-5 h-5"/>
 </div>
 <DialogTitle className="text-xl font-black text-slate-900 dark:text-white">
 خيارات مرتجع المبيعات
 </DialogTitle>
 </div>

 <p className="text-xs font-semibold text-slate-400 pt-1 pb-6">
 يرجى اختيار نوع عملية المرتجع التي ترغب في إتمامها:
 </p>

 {/* Two Choice Cards */}
 <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pb-6">
 {/* Option 1: مرتجع مبيعات حر */}
 <button
 type="button"
 onClick={() => {
 onClose();
 onSelectFreeReturn();
 }}
 className="p-6 rounded-2xl border-2 border-blue-100 dark:border-blue-950/80 bg-blue-50/40 hover:bg-blue-50/80 dark:bg-blue-950/20 dark:hover:bg-blue-950/40 hover:border-blue-500/80 transition-all flex flex-col items-center justify-center text-center gap-3 group cursor-pointer shadow-xs hover:shadow-md hover:scale-102"
 >
 <div className="w-14 h-14 rounded-2xl bg-blue-500/10 dark:bg-blue-500/20 text-blue-600 dark:text-blue-400 flex items-center justify-center group-hover:scale-110 transition-transform">
 <ShoppingBag className="w-7 h-7"/>
 </div>
 <div>
 <span className="text-base font-black text-blue-600 dark:text-blue-400 block mb-1">
 مرتجع مبيعات حر
 </span>
 <span className="text-xs font-semibold text-slate-400 block">
 إرجاع أصناف بدون فاتورة أصلية
 </span>
 </div>
 </button>

 {/* Option 2: مرتجع مبيعات مباشر (من فاتورة) */}
 <button
 type="button"
 onClick={() => {
 onClose();
 onSelectInvoiceReturn();
 }}
 className="p-6 rounded-2xl border-2 border-amber-100 dark:border-amber-950/80 bg-amber-50/40 hover:bg-amber-50/80 dark:bg-amber-950/20 dark:hover:bg-amber-950/40 hover:border-amber-500/80 transition-all flex flex-col items-center justify-center text-center gap-3 group cursor-pointer shadow-xs hover:shadow-md hover:scale-102"
 >
 <div className="w-14 h-14 rounded-2xl bg-amber-500/10 dark:bg-amber-500/20 text-amber-600 dark:text-amber-400 flex items-center justify-center group-hover:scale-110 transition-transform">
 <FileText className="w-7 h-7"/>
 </div>
 <div>
 <span className="text-base font-black text-amber-600 dark:text-amber-400 block mb-1">
 مرتجع مبيعات مباشر
 </span>
 <span className="text-xs font-semibold text-slate-400 block">
 إرجاع من فاتورة مسجلة
 </span>
 </div>
 </button>
 </div>

 {/* Cancel Button */}
 <div className="flex justify-center pt-2">
 <button
 type="button"
 onClick={onClose}
 className="text-pink-600 hover:text-pink-700 dark:text-pink-400 text-sm font-bold transition-colors cursor-pointer"
 >
 إلغاء
 </button>
 </div>
 </DialogContent>
 </Dialog>
 );
}