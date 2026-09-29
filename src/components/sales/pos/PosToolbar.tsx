import React from'react';
import Link from'next/link';
import { useRouter } from'next/navigation';
import {
 Home,
 Receipt,
 Search,
 Layers,
 Clock,
 Briefcase,
 RotateCcw,
 FileText,
 Scale,
 UserCheck,
 Truck,
 LogOut,
} from'lucide-react';
import { toast } from'sonner';
import type { CashierShift } from'@/types';

interface PosToolbarProps {
 activeShift: CashierShift | null;
 onOpenLookupModal: () => void;
 onToggleQuickSidebar: () => void;
 isQuickSidebarOpen?: boolean;
 onOpenRecentOperations: () => void;
 onOpenReturnOptions: () => void;
 onOpenPurchaseReturnOptions: () => void;
 onOpenExpenseModal: () => void;
 onOpenSupplierPaymentModal: () => void;
 onOpenCustomerPaymentModal?: () => void;
 onOpenHeldModal: () => void;
 onOpenCustomerModal: () => void;
 onOpenShiftModal: () => void;
 onReadLiveWeight: () => void;
 isReadingScale: boolean;
 heldCount: number;
}

export function PosToolbar({
 activeShift,
 onOpenLookupModal,
 onToggleQuickSidebar,
 isQuickSidebarOpen,
 onOpenRecentOperations,
 onOpenReturnOptions,
 onOpenPurchaseReturnOptions,
 onOpenExpenseModal,
 onOpenSupplierPaymentModal,
 onOpenCustomerPaymentModal,
 onOpenHeldModal,
 onOpenCustomerModal,
 onOpenShiftModal,
 onReadLiveWeight,
 isReadingScale,
 heldCount,
}: PosToolbarProps) {
 const router = useRouter();

 return (
 <div className="bg-white/95 dark:bg-surface/95 border-b border-slate-200/80 dark:border-slate-800 px-2 sm:px-4 py-1.5 shrink-0 select-none">
 {/* 1. MOBILE CLEAN TOOLBAR (< 768px) - NO OVERFLOW OR CLIPPING */}
 <div className="flex md:hidden items-center justify-between gap-1.5 w-full">
 {/* Home */}
 <Link
 href="/"
 title="الرئيسية"
 className="w-8 h-8 rounded-xl bg-blue-600 hover:bg-blue-700 text-white flex items-center justify-center shadow-xs transition-colors shrink-0 cursor-pointer"
 >
 <Home className="w-4 h-4"/>
 </Link>

 {/* أصناف سريعة */}
 <button
 type="button"
 onClick={onToggleQuickSidebar}
 className={`flex-1 h-8 px-2 rounded-xl font-black text-xs flex items-center justify-center gap-1 shadow-2xs transition-all cursor-pointer ${
 isQuickSidebarOpen
 ?'bg-[#d97706] text-white ring-2 ring-amber-400/50'
 :'bg-[#f59e0b] hover:bg-[#d97706] text-white'
 }`}
 >
 <Layers className="w-3.5 h-3.5"/>
 <span>أصناف سريعة</span>
 </button>

 {/* استعلام أصناف */}
 <button
 onClick={onOpenLookupModal}
 className="flex-1 h-8 px-2 rounded-xl bg-[#8b5cf6] hover:bg-[#7c3aed] text-white font-black text-xs flex items-center justify-center gap-1 shadow-2xs transition-all cursor-pointer"
 >
 <Search className="w-3.5 h-3.5"/>
 <span>استعلام (F3)</span>
 </button>

 {/* المزيد من العمليات Popover */}
 <div className="relative">
 <button
 type="button"
 onClick={onOpenRecentOperations}
 title="آخر العمليات"
 className="w-8 h-8 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 flex items-center justify-center transition-colors cursor-pointer shrink-0 relative"
 >
 <Clock className="w-4 h-4"/>
 </button>
 </div>

 {/* مبيعات معلقة / زر المصروفات السريع */}
 <button
 type="button"
 onClick={onOpenExpenseModal}
 title="إضافة مصروفات"
 className="w-8 h-8 rounded-xl bg-[#e11d48] hover:bg-[#be123c] text-white flex items-center justify-center shadow-2xs transition-all cursor-pointer shrink-0"
 >
 <Receipt className="w-4 h-4"/>
 </button>

 {heldCount > 0 && (
 <button
 onClick={onOpenHeldModal}
 title="مبيعات معلقة"
 className="h-8 px-2 rounded-xl bg-[#0d9488] text-white font-black text-xs flex items-center gap-1 shadow-2xs cursor-pointer shrink-0"
 >
 <Briefcase className="w-3.5 h-3.5"/>
 <span className="font-mono">{heldCount}</span>
 </button>
 )}
 </div>

 {/* 2. DESKTOP EXPANDED ROW (>= 768px) */}
 <div className="hidden md:flex flex-nowrap items-center gap-2 overflow-x-auto custom-scrollbar min-w-max">
 {/* Home Icon Square Button */}
 <Link
 href="/"
 title="الرئيسية"
 className="w-8 h-8 rounded-xl bg-blue-600 hover:bg-blue-700 text-white flex items-center justify-center shadow-xs transition-colors shrink-0 cursor-pointer"
 >
 <Home className="w-4 h-4"/>
 </Link>

 {/* إضافة مصروفات */}
 <button
 type="button"
 onClick={onOpenExpenseModal}
 className="h-8 px-3 rounded-xl bg-[#e11d48] hover:bg-[#be123c] text-white font-bold text-xs flex items-center gap-1.5 shadow-2xs transition-all cursor-pointer shrink-0"
 >
 <Receipt className="w-3.5 h-3.5"/>
 <span>إضافة مصروفات</span>
 </button>

 {/* استعلام أصناف (F3) */}
 <button
 onClick={onOpenLookupModal}
 className="h-8 px-3 rounded-xl bg-[#8b5cf6] hover:bg-[#7c3aed] text-white font-bold text-xs flex items-center gap-1.5 shadow-2xs transition-all cursor-pointer shrink-0"
 >
 <Search className="w-3.5 h-3.5"/>
 <span>استعلام أصناف (F3)</span>
 </button>

 {/* أصناف سريعة */}
 <button
 type="button"
 onClick={onToggleQuickSidebar}
 className={`h-8 px-3 rounded-xl font-bold text-xs flex items-center gap-1.5 shadow-2xs transition-all cursor-pointer shrink-0 ${
 isQuickSidebarOpen
 ?'bg-[#d97706] text-white ring-2 ring-amber-400/50 scale-102'
 :'bg-[#f59e0b] hover:bg-[#d97706] text-white'
 }`}
 >
 <Layers className="w-3.5 h-3.5"/>
 <span>أصناف سريعة</span>
 </button>

 {/* آخر العمليات */}
 <button
 type="button"
 onClick={onOpenRecentOperations}
 className="h-8 px-3 rounded-xl bg-primary hover:bg-[#1d4ed8] text-white font-bold text-xs flex items-center gap-1.5 shadow-2xs transition-all cursor-pointer shrink-0"
 >
 <Clock className="w-3.5 h-3.5"/>
 <span>آخر العمليات</span>
 </button>

 {/* مبيعات معلقة */}
 <button
 onClick={onOpenHeldModal}
 className="h-8 px-3 rounded-xl bg-[#0d9488] hover:bg-[#0f766e] text-white font-bold text-xs flex items-center gap-1.5 shadow-2xs transition-all cursor-pointer shrink-0 relative"
 >
 <Briefcase className="w-3.5 h-3.5"/>
 <span>مبيعات معلقة</span>
 {heldCount > 0 && (
 <span className="bg-white text-teal-700 font-mono text-3xs font-black px-1.5 py-0.2 rounded-full">
 {heldCount}
 </span>
 )}
 </button>

 {/* مرتجع مبيعات */}
 <button
 type="button"
 onClick={onOpenReturnOptions}
 className="h-8 px-3 rounded-xl bg-[#10b981] hover:bg-[#059669] text-white font-bold text-xs flex items-center gap-1.5 shadow-2xs transition-all cursor-pointer shrink-0"
 >
 <RotateCcw className="w-3.5 h-3.5"/>
 <span>مرتجع مبيعات</span>
 </button>

 {/* مرتجع مشتريات */}
 <button
 type="button"
 onClick={onOpenPurchaseReturnOptions}
 className="h-8 px-3 rounded-xl bg-[#ea580c] hover:bg-[#c2410c] text-white font-bold text-xs flex items-center gap-1.5 shadow-2xs transition-all cursor-pointer shrink-0"
 >
 <RotateCcw className="w-3.5 h-3.5"/>
 <span>مرتجع مشتريات</span>
 </button>

 {/* وزن الميزان (F6) */}
 <button
 onClick={onReadLiveWeight}
 disabled={isReadingScale}
 title="سحب الوزن المباشر من الميزان الإلكتروني (F6)"
 className="h-8 px-3 rounded-xl bg-cyan-600 hover:bg-cyan-700 text-white font-bold text-xs flex items-center gap-1.5 shadow-2xs transition-all cursor-pointer shrink-0 disabled:opacity-50"
 >
 <Scale className={`w-3.5 h-3.5 ${isReadingScale ?'animate-spin':''}`} />
 <span>وزن الميزان (F6)</span>
 </button>

 {/* تحصيل عميل */}
 <button
 type="button"
 onClick={onOpenCustomerPaymentModal || onOpenCustomerModal}
 className="h-8 px-3 rounded-xl bg-[#059669] hover:bg-[#047857] text-white font-bold text-xs flex items-center gap-1.5 shadow-2xs transition-all cursor-pointer shrink-0"
 >
 <UserCheck className="w-3.5 h-3.5"/>
 <span>تحصيل عميل</span>
 </button>

 {/* دفع لمورد */}
 <button
 type="button"
 onClick={onOpenSupplierPaymentModal}
 className="h-8 px-3 rounded-xl bg-[#e11d48] hover:bg-[#be123c] text-white font-bold text-xs flex items-center gap-1.5 shadow-2xs transition-all cursor-pointer shrink-0"
 >
 <Truck className="w-3.5 h-3.5"/>
 <span>دفع لمورد</span>
 </button>

 {/* إغلاق الوردية */}
 <button
 type="button"
 onClick={() => {
 if (activeShift) {
 router.push('/sales/shifts/close');
 } else {
 toast.error('لا توجد وردية مفتوحة حالياً');
 onOpenShiftModal();
 }
 }}
 className="h-8 px-3 rounded-xl bg-[#be123c] hover:bg-[#9f1239] text-white font-bold text-xs flex items-center gap-1.5 shadow-2xs transition-all cursor-pointer shrink-0"
 >
 <LogOut className="w-3.5 h-3.5"/>
 <span>إغلاق الوردية</span>
 </button>
 </div>
 </div>
 );
}