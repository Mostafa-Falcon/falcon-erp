import React from'react';
import { Tag, Truck } from'lucide-react';

interface PosTotalsBarProps {
 cartCount: number;
 subtotal: number;
 totalDiscount: number;
 shippingFee?: number;
 totalTax?: number;
 total: number;
 isReturnMode?: boolean;
 onOpenDiscountsModal?: () => void;
}

export function PosTotalsBar({
 cartCount,
 subtotal,
 totalDiscount,
 shippingFee = 0,
 totalTax = 0,
 total,
 isReturnMode = false,
 onOpenDiscountsModal,
}: PosTotalsBarProps) {
 return (
 <div className="bg-[#0b1329] text-white px-3 sm:px-6 py-2 border-t border-slate-800 shadow-lg shrink-0 select-none">
 <div className="flex flex-row items-center justify-between gap-2 sm:gap-4">
 {/* Right side: Items count & Discount pill */}
 <div className="flex items-center gap-1.5 sm:gap-6">
 <div className="flex items-center gap-1.5 bg-slate-800/80 px-2 sm:px-2.5 py-1 rounded-xl border border-slate-700/60">
 <span className="text-3xs sm:text-xs font-bold text-slate-400">الأصناف:</span>
 <span className="text-xs sm:text-base font-black text-white font-mono">{cartCount}</span>
 </div>

 {/* Subtotal (Desktop only) */}
 <div className="hidden md:flex items-baseline gap-1 text-slate-400 text-xs">
 <span className="font-semibold text-2xs">قبل الخصم:</span>
 <span className="font-bold text-slate-200 font-mono">
 {subtotal.toFixed(2)}
 </span>
 </div>

 {/* إجمالي الخصومات */}
 <button
 type="button"
 onClick={onOpenDiscountsModal}
 title="اضغط لتعديل وإضافة خصومات الفاتورة والأصناف"
 className="flex items-center gap-1 group hover:bg-slate-800/80 px-2 py-1 rounded-xl transition-all cursor-pointer border border-transparent hover:border-amber-500/30 text-amber-400"
 >
 <Tag className="w-3 h-3 text-amber-400 shrink-0"/>
 <span className="text-3xs sm:text-xs font-bold">خصم:</span>
 <span className="text-xs sm:text-sm font-black font-mono">
 {totalDiscount.toFixed(2)}
 </span>
 </button>

 {/* ضريبة القيمة المضافة إن وجدت (Desktop) */}
 {totalTax > 0 && (
 <div className="hidden lg:flex items-baseline gap-1 text-xs text-slate-400">
 <span className="font-semibold text-2xs">ضريبة:</span>
 <span className="font-bold text-slate-300 font-mono">+{totalTax.toFixed(2)}</span>
 </div>
 )}

 {/* مصاريف الشحن إن وجدت (Desktop) */}
 {shippingFee > 0 && (
 <div className="hidden lg:flex items-baseline gap-1 text-xs text-emerald-400">
 <Truck className="w-3 h-3"/>
 <span className="font-bold font-mono">+{shippingFee.toFixed(2)}</span>
 </div>
 )}
 </div>

 {/* Left side: Grand Net Total */}
 <div className="flex items-baseline gap-1 sm:gap-2 shrink-0">
 <span className="text-2xs sm:text-xs font-bold text-slate-400">
 {isReturnMode ?'المرتجع:':'الصافي:'}
 </span>
 <span
 className={`text-base sm:text-2xl lg:text-3xl font-black font-mono tracking-tight drop-shadow-sm ${
 isReturnMode ?'text-[#f59e0b]':'text-[#00e5a3]'
 }`}
 >
 {total.toFixed(2)}{''}
 <span className={`text-3xs sm:text-sm font-bold ${isReturnMode ?'text-amber-300':'text-emerald-300'}`}>
 ج.م
 </span>
 </span>
 </div>
 </div>
 </div>
 );
}