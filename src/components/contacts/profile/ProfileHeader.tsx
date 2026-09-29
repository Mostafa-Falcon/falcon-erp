'use client';

import React from'react';
import { useRouter } from'next/navigation';
import { ArrowRight, ShoppingCart, Receipt, Banknote, Scale } from'lucide-react';
import { Button } from'@/components/ui/button';
import { formatNumber } from'@/lib/format';
import { cn } from'@/lib/utils';
import type { Contact } from'@/types';

interface ProfileHeaderProps {
 customer: Contact;
 onBack: () => void;
 onOpenReceiptModal: () => void;
 onOpenAdvanceModal: () => void;
 onSettleAccount: () => void;
 isProcessing: boolean;
}

export function ProfileHeader({
 customer,
 onBack,
 onOpenReceiptModal,
 onOpenAdvanceModal,
 onSettleAccount,
 isProcessing,
}: ProfileHeaderProps) {
 const router = useRouter();

 const isDebit = customer.current_balance > 0;
 const isCredit = customer.current_balance < 0;
 const isZero = customer.current_balance === 0;

 return (
 <div className="bg-surface rounded-3xl border border-slate-200/80 dark:border-slate-800 p-5 sm:p-6 shadow-sm">
 <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-5">
 {/* Right: Back Button, Avatar & Customer Details */}
 <div className="flex items-center gap-4">
 <button
 onClick={onBack}
 className="w-10 h-10 rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 hover:bg-slate-100 dark:hover:bg-slate-800 flex items-center justify-center text-slate-600 dark:text-slate-300 transition-colors shadow-xs cursor-pointer shrink-0"
 title="العودة لسجل العملاء"
 >
 <ArrowRight className="w-5 h-5"/>
 </button>

 <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-blue-600 to-indigo-600 text-white font-black text-lg flex items-center justify-center shadow-md shadow-blue-500/20 shrink-0">
 {customer.name.charAt(0)}
 </div>

 <div>
 <div className="flex items-center gap-3">
 <h1 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white">
 {customer.name}
 </h1>
 <span className="text-3xs font-black bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400 px-2 py-0.5 rounded-lg border border-blue-100 dark:border-blue-900/40">
 عميل موثق
 </span>
 </div>
 <p className="text-xs font-bold text-slate-400 mt-1">
 كود العميل: <span className="font-mono text-slate-600 dark:text-slate-300">{customer.code ||'بدون كود'}</span>
 </p>
 </div>
 </div>

 {/* Left: Current Balance & Quick Action Buttons */}
 <div className="flex flex-wrap items-center gap-2.5">
 {/* Balance Display Card */}
 <div
 className={cn(
"px-4 py-2 rounded-2xl border flex flex-col items-center justify-center shrink-0 min-w-[140px]",
 isDebit &&"bg-rose-50/70 border-rose-200 text-rose-700 dark:bg-rose-950/30 dark:border-rose-900/50 dark:text-rose-300",
 isCredit &&"bg-emerald-50/70 border-emerald-200 text-emerald-700 dark:bg-emerald-950/30 dark:border-emerald-900/50 dark:text-emerald-300",
 isZero &&"bg-slate-50 border-slate-200 text-slate-700 dark:bg-slate-900 dark:border-slate-800 dark:text-slate-300"
 )}
 >
 <span className="text-3xs font-bold opacity-80">صافي الرصيد الحالي</span>
 <span className="text-base font-black tracking-tight"dir="ltr">
 {formatNumber(customer.current_balance)} ج.م
 </span>
 </div>

 {/* بيع للعميل */}
 <Button
 onClick={() => router.push(`/sales/pos?customer_id=${customer.id}`)}
 className="h-11 px-4 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-2xl gap-2 shadow-sm shadow-blue-500/20 cursor-pointer active:scale-95 transition-all"
 >
 <ShoppingCart className="w-4 h-4"/>
 <span>بيع للعميل</span>
 </Button>

 {/* تحصيل دفعة */}
 <Button
 onClick={onOpenReceiptModal}
 className="h-11 px-4 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-2xl gap-2 shadow-sm shadow-emerald-500/20 cursor-pointer active:scale-95 transition-all"
 >
 <Receipt className="w-4 h-4"/>
 <span>تحصيل دفعة</span>
 </Button>

 {/* صرف سلفة */}
 <Button
 onClick={onOpenAdvanceModal}
 className="h-11 px-4 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-2xl gap-2 shadow-sm shadow-indigo-500/20 cursor-pointer active:scale-95 transition-all"
 >
 <Banknote className="w-4 h-4"/>
 <span>صرف سلفة</span>
 </Button>

 {/* تصفية الحساب */}
 <Button
 variant="outline"
 onClick={onSettleAccount}
 disabled={isZero || isProcessing}
 className="h-11 px-3.5 border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-300 font-bold text-xs rounded-2xl gap-1.5 hover:bg-slate-50 cursor-pointer disabled:opacity-40"
 >
 <Scale className="w-4 h-4"/>
 <span className="hidden sm:inline">تصفية الحساب</span>
 </Button>
 </div>
 </div>
 </div>
 );
}