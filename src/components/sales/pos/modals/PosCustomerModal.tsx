import React from'react';
import { Users, X } from'lucide-react';
import { formatNumber } from'@/lib/format';
import type { Contact } from'@/types';

interface PosCustomerModalProps {
 isOpen: boolean;
 onClose: () => void;
 customers: Contact[];
 selectedCustomerId: string;
 onSelectCustomer: (customer: Contact | null) => void;
}

export function PosCustomerModal({
 isOpen,
 onClose,
 customers,
 selectedCustomerId,
 onSelectCustomer,
}: PosCustomerModalProps) {
 if (!isOpen) return null;

 return (
 <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-150">
 <div className="bg-surface border border-slate-200 dark:border-slate-800 w-full max-w-md rounded-2xl p-5 shadow-2xl space-y-4">
 <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
 <h3 className="font-bold text-base text-slate-900 dark:text-white flex items-center gap-2">
 <Users className="w-4 h-4 text-blue-600"/>
 <span>اختيار العميل للفاتورة</span>
 </h3>
 <button
 onClick={onClose}
 className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer"
 >
 <X className="w-4 h-4"/>
 </button>
 </div>

 <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
 {/* Cash General Customer */}
 <div
 onClick={() => {
 onSelectCustomer(null);
 onClose();
 }}
 className={`p-3 rounded-xl border cursor-pointer transition-colors ${
 !selectedCustomerId ?'border-blue-500 bg-blue-50/50 dark:bg-blue-950/30':'border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/40'
 }`}
 >
 <div className="font-bold text-xs text-slate-900 dark:text-white">عميل نقدي عام</div>
 <div className="text-3xs text-slate-400">سداد فوري بدون تسجيل حساب مدين</div>
 </div>

 {customers
 .filter((c) => c.type ==='customer')
 .map((c) => (
 <div
 key={c.id}
 onClick={() => {
 onSelectCustomer(c);
 onClose();
 }}
 className={`p-3 rounded-xl border cursor-pointer transition-colors ${
 selectedCustomerId === c.id ?'border-blue-500 bg-blue-50/50 dark:bg-blue-950/30':'border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/40'
 }`}
 >
 <div className="font-bold text-xs text-slate-900 dark:text-white">{c.name}</div>
 <div className="text-3xs text-slate-400 mt-0.5">
 هاتف: {c.phone ||'غير مسجل'} • الرصيد: {formatNumber(c.current_balance)} ج.م
 </div>
 </div>
 ))}
 </div>
 </div>
 </div>
 );
}