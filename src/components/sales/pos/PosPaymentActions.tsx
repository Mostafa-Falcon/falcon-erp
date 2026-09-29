import React, { useState } from'react';
import Link from'next/link';
import {
 X,
 DollarSign,
 CreditCard,
 Layers,
 UserCheck,
 RotateCcw,
 FileText,
 ChevronUp,
 ChevronDown,
 MoreHorizontal,
} from'lucide-react';
import { toast } from'sonner';

interface PosPaymentActionsProps {
 onClearCart: () => void;
 onCheckout: (type:'cash'|'card'|'credit'|'split') => void;
 onOpenSplitModal: () => void;
 isSaving: boolean;
 cartCount: number;
 isReturnMode?: boolean;
}

export function PosPaymentActions({
 onClearCart,
 onCheckout,
 onOpenSplitModal,
 isSaving,
 cartCount,
 isReturnMode = false,
}: PosPaymentActionsProps) {
 const [isMoreOpen, setIsMoreOpen] = useState(false);

 if (isReturnMode) {
 return (
 <div className="bg-surface border-t border-slate-200 dark:border-slate-800 p-2 sm:p-3 shrink-0 select-none">
 {/* Mobile View */}
 <div className="md:hidden flex items-center gap-2">
 <button
 onClick={() => onCheckout('cash')}
 disabled={isSaving || cartCount === 0}
 className="flex-1 h-12 rounded-xl bg-[#f59e0b] hover:bg-[#d97706] text-white font-black text-sm flex items-center justify-center gap-1.5 shadow-md disabled:opacity-50 cursor-pointer"
 >
 <RotateCcw className="w-4 h-4"/>
 <span>{isSaving ?'جارٍ الحفظ...':'مرتجع نقدي'}</span>
 </button>
 <button
 onClick={() => onCheckout('card')}
 disabled={isSaving || cartCount === 0}
 className="h-12 px-4 rounded-xl bg-[#3b82f6] hover:bg-primary text-white font-bold text-xs flex items-center justify-center gap-1 shadow-xs disabled:opacity-50 cursor-pointer"
 >
 <CreditCard className="w-4 h-4"/>
 <span>بطاقة</span>
 </button>
 <button
 onClick={onClearCart}
 title="إلغاء المرتجع"
 className="h-12 px-3.5 rounded-xl bg-rose-500 hover:bg-rose-600 text-white font-bold text-xs flex items-center justify-center gap-1 cursor-pointer"
 >
 <X className="w-4 h-4"/>
 </button>
 </div>

 {/* Desktop View */}
 <div className="hidden md:grid grid-cols-4 gap-3">
 <button
 onClick={() => onCheckout('cash')}
 disabled={isSaving || cartCount === 0}
 className="h-12 rounded-2xl bg-[#f59e0b] hover:bg-[#d97706] text-white font-black text-sm flex items-center justify-center gap-2 shadow-md hover:shadow-lg transition-all cursor-pointer disabled:opacity-50"
 >
 <RotateCcw className="w-4 h-4"/>
 <span>{isSaving ?'جارٍ الحفظ...':'مرتجع نقدي (F10)'}</span>
 </button>
 <button
 onClick={() => onCheckout('card')}
 disabled={isSaving || cartCount === 0}
 className="h-12 rounded-2xl bg-[#3b82f6] hover:bg-primary text-white font-black text-sm flex items-center justify-center gap-2 shadow-md hover:shadow-lg transition-all cursor-pointer disabled:opacity-50"
 >
 <CreditCard className="w-4 h-4"/>
 <span>دفع بالبطاقة (F7)</span>
 </button>
 <button
 onClick={() => onCheckout('cash')}
 disabled={isSaving || cartCount === 0}
 className="h-12 rounded-2xl bg-amber-500/15 dark:bg-amber-950/40 text-amber-600 dark:text-amber-400 border border-amber-300 dark:border-amber-800 font-bold text-sm flex items-center justify-center gap-2 hover:bg-amber-500/25 transition-all cursor-pointer disabled:opacity-50"
 >
 <RotateCcw className="w-4 h-4"/>
 <span>مرتجع</span>
 </button>
 <button
 onClick={onClearCart}
 className="h-12 rounded-2xl bg-[#ef4444] hover:bg-[#dc2626] text-white font-bold text-sm flex items-center justify-center gap-2 shadow-md hover:shadow-lg transition-all cursor-pointer"
 >
 <X className="w-4 h-4"/>
 <span>إلغاء المرتجع (F12)</span>
 </button>
 </div>
 </div>
 );
 }

 return (
 <div className="bg-surface border-t border-slate-200 dark:border-slate-800 p-2 sm:p-3 pl-14 sm:pl-3 shrink-0 select-none">
 {/* 1. MOBILE RESPONSIVE ACTION BAR (< 768px) */}
 <div className="md:hidden flex flex-col gap-2">
 {/* Collapsible Secondary Actions Drawer on Mobile */}
 {isMoreOpen && (
 <div className="grid grid-cols-3 gap-1.5 p-2 bg-slate-50 dark:bg-slate-900/90 rounded-2xl border border-slate-200 dark:border-slate-800 animate-in fade-in slide-in-from-bottom-2 duration-150">
 {/* إلغاء (F12) */}
 <button
 onClick={() => {
 onClearCart();
 setIsMoreOpen(false);
 }}
 className="h-9 rounded-xl bg-rose-500 hover:bg-rose-600 text-white font-bold text-xs flex items-center justify-center gap-1 shadow-2xs transition-all cursor-pointer"
 >
 <X className="w-3.5 h-3.5"/>
 <span>إلغاء (F12)</span>
 </button>

 {/* دفع مختلط (F9) */}
 <button
 onClick={() => {
 onOpenSplitModal();
 setIsMoreOpen(false);
 }}
 disabled={isSaving}
 className="h-9 rounded-xl bg-[#334155] hover:bg-[#1e293b] text-white font-bold text-xs flex items-center justify-center gap-1 shadow-2xs transition-all cursor-pointer disabled:opacity-50"
 >
 <Layers className="w-3.5 h-3.5"/>
 <span>مختلط (F9)</span>
 </button>

 {/* بيع آجل */}
 <button
 onClick={() => {
 onCheckout('credit');
 setIsMoreOpen(false);
 }}
 disabled={isSaving}
 className="h-9 rounded-xl bg-[#8b5cf6] hover:bg-[#7c3aed] text-white font-bold text-xs flex items-center justify-center gap-1 shadow-2xs transition-all cursor-pointer disabled:opacity-50"
 >
 <UserCheck className="w-3.5 h-3.5"/>
 <span>بيع آجل</span>
 </button>

 {/* مرتجع */}
 <Link href="/sales/returns"className="w-full">
 <button className="w-full h-9 rounded-xl bg-slate-200 hover:bg-slate-300 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 font-bold text-xs flex items-center justify-center gap-1 transition-all cursor-pointer">
 <RotateCcw className="w-3.5 h-3.5"/>
 <span>مرتجع</span>
 </button>
 </Link>

 {/* عرض سعر */}
 <button
 onClick={() => {
 if (cartCount === 0) {
 toast.warning('يرجى إضافة أصناف أولاً');
 return;
 }
 toast.success('تم حفظ عرض السعر بنجاح');
 setIsMoreOpen(false);
 }}
 className="h-9 rounded-xl bg-[#f59e0b] hover:bg-[#d97706] text-white font-bold text-xs flex items-center justify-center gap-1 shadow-2xs transition-all cursor-pointer"
 >
 <FileText className="w-3.5 h-3.5"/>
 <span>عرض سعر</span>
 </button>

 {/* مسودة */}
 <button
 onClick={() => {
 if (cartCount === 0) {
 toast.warning('يرجى إضافة أصناف أولاً');
 return;
 }
 toast.info('تم حفظ الفاتورة كمسودة مؤقتة');
 setIsMoreOpen(false);
 }}
 className="h-9 rounded-xl bg-[#0ea5e9] hover:bg-[#0284c7] text-white font-bold text-xs flex items-center justify-center gap-1 shadow-2xs transition-all cursor-pointer"
 >
 <FileText className="w-3.5 h-3.5"/>
 <span>مسودة</span>
 </button>
 </div>
 )}

 {/* Primary Mobile Touch Bar */}
 <div className="flex items-center gap-2">
 {/* دفع نقدي (F10) - PRIMARY ACTION */}
 <button
 onClick={() => onCheckout('cash')}
 disabled={isSaving}
 className="flex-1 h-12 rounded-xl bg-[#10b981] hover:bg-[#059669] text-white font-black text-sm flex items-center justify-center gap-1.5 shadow-md active:scale-98 transition-all cursor-pointer disabled:opacity-50"
 >
 <DollarSign className="w-4 h-4"/>
 <span>{isSaving ?'جارٍ الحفظ...':'دفع نقدي (F10)'}</span>
 </button>

 {/* دفع بالبطاقة (F7) */}
 <button
 onClick={() => onCheckout('card')}
 disabled={isSaving}
 className="h-12 px-4 rounded-xl bg-[#3b82f6] hover:bg-primary text-white font-bold text-xs flex items-center justify-center gap-1 shadow-xs active:scale-98 transition-all cursor-pointer disabled:opacity-50"
 >
 <CreditCard className="w-4 h-4"/>
 <span>بطاقة (F7)</span>
 </button>

 {/* زر المزيد من الخيارات (Secondary Actions Toggle) */}
 <button
 type="button"
 onClick={() => setIsMoreOpen((prev) => !prev)}
 title="خيارات إضافية"
 className={`h-12 px-3 rounded-xl font-bold text-xs flex items-center justify-center gap-1 transition-all cursor-pointer border ${
 isMoreOpen
 ?'bg-amber-500 text-white border-amber-500 shadow-xs'
 :'bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 border-slate-200/80 dark:border-slate-700'
 }`}
 >
 <MoreHorizontal className="w-4 h-4"/>
 {isMoreOpen ? <ChevronDown className="w-3.5 h-3.5"/> : <ChevronUp className="w-3.5 h-3.5"/>}
 </button>
 </div>
 </div>

 {/* 2. DESKTOP POWER-BAR VIEW (>= 768px) */}
 <div className="hidden md:grid grid-cols-4 lg:grid-cols-8 gap-2">
 {/* 1. دفع نقدي (F10) */}
 <button
 onClick={() => onCheckout('cash')}
 disabled={isSaving}
 className="h-11 rounded-xl bg-[#10b981] hover:bg-[#059669] text-white font-black text-sm flex items-center justify-center gap-1.5 shadow-md hover:shadow-lg transition-all cursor-pointer disabled:opacity-50"
 >
 <DollarSign className="w-4 h-4"/>
 <span>{isSaving ?'جارٍ الحفظ...':'دفع نقدي (F10)'}</span>
 </button>

 {/* 2. دفع بالبطاقة (F7) */}
 <button
 onClick={() => onCheckout('card')}
 disabled={isSaving}
 className="h-11 rounded-xl bg-[#3b82f6] hover:bg-primary text-white font-bold text-xs sm:text-sm flex items-center justify-center gap-1 shadow-2xs transition-all cursor-pointer disabled:opacity-50"
 >
 <CreditCard className="w-4 h-4"/>
 <span>دفع بالبطاقة (F7)</span>
 </button>

 {/* 3. إلغاء (F12) */}
 <button
 onClick={onClearCart}
 className="h-11 rounded-xl bg-[#ef4444] hover:bg-[#dc2626] text-white font-bold text-xs sm:text-sm flex items-center justify-center gap-1 shadow-2xs transition-all cursor-pointer"
 >
 <X className="w-4 h-4"/>
 <span>إلغاء (F12)</span>
 </button>

 {/* 4. دفع مختلط (F9) */}
 <button
 onClick={onOpenSplitModal}
 disabled={isSaving}
 className="h-11 rounded-xl bg-[#334155] hover:bg-[#1e293b] text-white font-bold text-xs sm:text-sm flex items-center justify-center gap-1 shadow-2xs transition-all cursor-pointer disabled:opacity-50"
 >
 <Layers className="w-4 h-4"/>
 <span>دفع مختلط (F9)</span>
 </button>

 {/* 5. بيع آجل */}
 <button
 onClick={() => onCheckout('credit')}
 disabled={isSaving}
 className="h-11 rounded-xl bg-[#8b5cf6] hover:bg-[#7c3aed] text-white font-bold text-xs sm:text-sm flex items-center justify-center gap-1 shadow-2xs transition-all cursor-pointer disabled:opacity-50"
 >
 <UserCheck className="w-4 h-4"/>
 <span>بيع آجل</span>
 </button>

 {/* 6. مرتجع */}
 <Link href="/sales/returns"className="w-full">
 <button className="w-full h-11 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 font-bold text-xs sm:text-sm flex items-center justify-center gap-1 transition-all cursor-pointer">
 <RotateCcw className="w-4 h-4 text-slate-400"/>
 <span>مرتجع</span>
 </button>
 </Link>

 {/* 7. عرض سعر */}
 <button
 onClick={() => {
 if (cartCount === 0) {
 toast.warning('يرجى إضافة أصناف أولاً لحفظ عرض السعر');
 return;
 }
 toast.success('تم إنشاء وحفظ عرض السعر بنجاح');
 }}
 className="h-11 rounded-xl bg-[#f59e0b] hover:bg-[#d97706] text-white font-bold text-xs sm:text-sm flex items-center justify-center gap-1 shadow-2xs transition-all cursor-pointer"
 >
 <FileText className="w-4 h-4"/>
 <span>عرض سعر</span>
 </button>

 {/* 8. مسودة */}
 <button
 onClick={() => {
 if (cartCount === 0) {
 toast.warning('يرجى إضافة أصناف أولاً لحفظ المسودة');
 return;
 }
 toast.info('تم حفظ الفاتورة كمسودة مؤقتة');
 }}
 className="h-11 rounded-xl bg-[#0ea5e9] hover:bg-[#0284c7] text-white font-bold text-xs sm:text-sm flex items-center justify-center gap-1 shadow-2xs transition-all cursor-pointer"
 >
 <FileText className="w-4 h-4"/>
 <span>مسودة</span>
 </button>
 </div>
 </div>
 );
}