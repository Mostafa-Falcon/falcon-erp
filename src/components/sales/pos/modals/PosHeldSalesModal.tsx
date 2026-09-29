import React, { useState } from'react';
import { Briefcase, X, Play, Trash2, Plus, Clock, ShoppingCart } from'lucide-react';
import { formatNumber, formatDateTime } from'@/lib/format';
import type { HeldSale, CartLine } from'../types';

interface PosHeldSalesModalProps {
 isOpen: boolean;
 onClose: () => void;
 heldSales: HeldSale[];
 activeCartCount: number;
 onHoldCurrentSale: (note?: string) => void;
 onResumeSale: (heldId: string) => void;
 onDeleteHeldSale: (heldId: string) => void;
}

export function PosHeldSalesModal({
 isOpen,
 onClose,
 heldSales,
 activeCartCount,
 onHoldCurrentSale,
 onResumeSale,
 onDeleteHeldSale,
}: PosHeldSalesModalProps) {
 const [newHoldNote, setNewHoldNote] = useState('');

 if (!isOpen) return null;

 return (
 <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-150">
 <div className="bg-surface border border-slate-200 dark:border-slate-800 w-full max-w-lg rounded-2xl p-6 shadow-2xl space-y-4">
 <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
 <div className="flex items-center gap-2">
 <div className="p-2 rounded-xl bg-teal-50 dark:bg-teal-950/50 text-teal-600">
 <Briefcase className="w-5 h-5"/>
 </div>
 <div>
 <h3 className="font-bold text-base text-slate-900 dark:text-white">المبيعات المعلقة (سلات الانتظار)</h3>
 <p className="text-xs text-slate-400">حفظ الفواتير مؤقتاً لخدمة عميل آخر واستئنافها لاحقاً</p>
 </div>
 </div>
 <button
 onClick={onClose}
 className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer"
 >
 <X className="w-4 h-4"/>
 </button>
 </div>

 {/* Hold Current Sale Section */}
 {activeCartCount > 0 && (
 <div className="p-3 bg-teal-50/50 dark:bg-teal-950/30 rounded-xl border border-teal-200/70 dark:border-teal-800/60 space-y-2">
 <span className="text-xs font-bold text-teal-900 dark:text-teal-200 flex items-center gap-1.5">
 <ShoppingCart className="w-3.5 h-3.5"/>
 <span>تعليق الفاتورة الحالية ({activeCartCount} أصناف):</span>
 </span>
 <div className="flex gap-2">
 <input
 type="text"
 value={newHoldNote}
 onChange={(e) => setNewHoldNote(e.target.value)}
 placeholder="اسم العميل أو ملاحظة لتمييز الفاتورة..."
 className="flex-1 h-9 bg-surface border border-teal-200 dark:border-teal-800 rounded-lg px-3 text-xs font-bold focus:outline-none focus:ring-2 focus:ring-teal-500"
 />
 <button
 type="button"
 onClick={() => {
 onHoldCurrentSale(newHoldNote.trim() || undefined);
 setNewHoldNote('');
 }}
 className="h-9 px-3 rounded-lg bg-teal-600 hover:bg-teal-700 text-white text-xs font-bold flex items-center gap-1 cursor-pointer transition-colors shadow-xs"
 >
 <Plus className="w-3.5 h-3.5"/>
 <span>تعليق السلة الآن</span>
 </button>
 </div>
 </div>
 )}

 {/* Held Sales List */}
 <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
 {heldSales.length === 0 ? (
 <div className="py-12 text-center text-slate-400">
 <Clock className="w-8 h-8 mx-auto mb-2 text-slate-300 dark:text-slate-600 stroke-[1.5]"/>
 <p className="font-bold text-xs">لا توجد فواتير معلقة حالياً</p>
 <p className="text-2xs text-slate-400 mt-1">عند تعليق أي سلة نشطة ستظهر هنا لاسترجاعها</p>
 </div>
 ) : (
 heldSales.map((h) => (
 <div
 key={h.id}
 className="p-3 bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-slate-200 dark:border-slate-700/80 flex items-center justify-between gap-3 hover:border-teal-300 dark:hover:border-teal-700 transition-colors"
 >
 <div className="space-y-1">
 <div className="font-bold text-xs text-slate-900 dark:text-white flex items-center gap-2">
 <span>{h.customerName ||'عميل نقدي'}</span>
 <span className="text-3xs bg-teal-50 dark:bg-teal-950/60 text-teal-700 dark:text-teal-300 border border-teal-200/80 px-1.5 py-0.2 rounded font-mono">
 {h.cart.length} أصناف
 </span>
 </div>
 <div className="text-3xs text-slate-400 flex items-center gap-2">
 <Clock className="w-3 h-3 text-slate-400"/>
 <span>{formatDateTime(h.createdAt)}</span>
 {h.notes && <span>• {h.notes}</span>}
 </div>
 <div className="text-xs font-black font-mono text-emerald-600 dark:text-emerald-400">
 الإجمالي: {formatNumber(h.total)} ج.م
 </div>
 </div>

 <div className="flex items-center gap-1.5">
 <button
 type="button"
 onClick={() => {
 onResumeSale(h.id);
 onClose();
 }}
 title="استرجاع ومتابعة الفاتورة"
 className="h-8 px-3 rounded-lg bg-teal-600 hover:bg-teal-700 text-white font-bold text-xs flex items-center gap-1 cursor-pointer transition-colors shadow-xs"
 >
 <Play className="w-3 h-3"/>
 <span>استئناف</span>
 </button>
 <button
 type="button"
 onClick={() => onDeleteHeldSale(h.id)}
 title="حذف الفاتورة المعلقة"
 className="w-8 h-8 rounded-lg bg-rose-50 hover:bg-rose-100 dark:bg-rose-950/40 text-rose-600 flex items-center justify-center transition-colors cursor-pointer"
 >
 <Trash2 className="w-3.5 h-3.5"/>
 </button>
 </div>
 </div>
 ))
 )}
 </div>
 </div>
 </div>
 );
}