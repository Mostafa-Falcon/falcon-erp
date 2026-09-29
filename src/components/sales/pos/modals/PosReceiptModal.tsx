import React from'react';
import { CheckCircle2, Printer, X } from'lucide-react';
import { formatNumber } from'@/lib/format';
import type { SalesInvoice } from'@/types';

interface PosReceiptModalProps {
 invoice: SalesInvoice | null;
 onClose: () => void;
}

export function PosReceiptModal({ invoice, onClose }: PosReceiptModalProps) {
 if (!invoice) return null;

 return (
 <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-150">
 <div className="bg-surface border border-slate-200 dark:border-slate-800 w-full max-w-sm rounded-2xl p-6 shadow-2xl text-center space-y-4">
 <div className="w-12 h-12 rounded-full bg-emerald-100 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 mx-auto flex items-center justify-center">
 <CheckCircle2 className="w-6 h-6"/>
 </div>

 <h3 className="text-lg font-black text-slate-900 dark:text-white">
 تم إتمام عملية البيع بنجاح!
 </h3>
 <p className="text-xs text-slate-500 font-mono">
 رقم الفاتورة: #{invoice.invoice_number}
 </p>

 <div className="bg-slate-50 dark:bg-slate-800/60 p-3 rounded-xl border border-slate-100 dark:border-slate-700 text-xs flex justify-between font-mono font-bold">
 <span className="text-slate-500 dark:text-slate-400">المبلغ الإجمالي:</span>
 <span className="text-emerald-600 dark:text-emerald-400 text-sm">{formatNumber(invoice.total)} ج.م</span>
 </div>

 <div className="flex items-center gap-2 pt-2">
 <button
 onClick={() => window.print()}
 className="flex-1 h-10 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs flex items-center justify-center gap-1.5 cursor-pointer shadow-xs transition-colors"
 >
 <Printer className="w-4 h-4"/>
 <span>طباعة الإيصال</span>
 </button>
 <button
 onClick={onClose}
 className="h-10 px-4 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 font-bold text-xs hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer transition-colors"
 >
 فاتورة جديدة
 </button>
 </div>
 </div>
 </div>
 );
}