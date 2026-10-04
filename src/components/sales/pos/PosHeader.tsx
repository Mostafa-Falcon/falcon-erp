import React, { useState } from'react';
import { useRouter } from'next/navigation';
import {
 Menu,
 ArrowRight,
 Calendar,
 Bell,
 Headphones,
 HardDrive,
 Calculator,
 Clock,
 Plus,
 Moon,
 Sun,
} from'lucide-react';
import { formatNumber } from'@/lib/format';
import { toast } from'sonner';
import { useNotificationStore } from'@/core/state/useNotificationStore';
import { NotificationDropdown } from'@/components/layout/NotificationDropdown';
import type { CashierShift, User as UserType } from'@/types';
import { getDomainProfile } from '@/core/constants/domain_profiles';

interface PosHeaderProps {
 currentUser: UserType | null;
 activeShift: CashierShift | null;
 onOpenShiftModal: () => void;
 onOpenSupportModal: () => void;
 onOpenCalcModal: () => void;
 isDark: boolean;
 onToggleTheme: () => void;
 activityType?: string;
 isTrial?: boolean;
 orgName?: string;
 branchName?: string;
}

export function PosHeader({
 currentUser,
 activeShift,
 onOpenShiftModal,
 onOpenSupportModal,
 onOpenCalcModal,
 isDark,
 onToggleTheme,
 activityType,
 isTrial,
 orgName,
 branchName,
}: PosHeaderProps) {
 const router = useRouter();
 const { unreadCount } = useNotificationStore();
 const [isNotificationOpen, setIsNotificationOpen] = useState(false);

 return (
 <header className="h-13 sm:h-14 bg-surface border-b border-slate-200/90 dark:border-slate-800 px-2.5 sm:px-4 flex items-center justify-between shadow-2xs shrink-0 select-none">
 {/* Right side: Brand & Page Title */}
 <div className="flex items-center gap-1 sm:gap-2 min-w-0">
 <button
 onClick={() => router.push('/')}
 title="القائمة الرئيسية"
 className="p-1.5 rounded-lg text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer shrink-0"
 >
 <ArrowRight className="w-4 h-4 sm:w-5 sm:h-5"/>
 </button>

 <h1 className="text-xs sm:text-base font-black text-slate-900 dark:text-white tracking-tight truncate">
 <span className="inline sm:hidden">الكاشير</span>
 <span className="hidden sm:inline">نقطة البيع (الكاشير)</span>
 </h1>

 {activityType && (
   <span
     className="hidden sm:inline-flex items-center gap-1.5 text-2xs font-bold px-2.5 py-1 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-100/80 dark:bg-slate-800/80 text-slate-800 dark:text-slate-200"
   >
     <span>{getDomainProfile(activityType).icon}</span>
     <span>{getDomainProfile(activityType).posTitle}</span>
   </span>
 )}

 {(orgName || branchName) && (
   <span className="hidden lg:inline-flex items-center gap-1.5 text-2xs font-bold text-slate-700 dark:text-slate-300 bg-slate-100/70 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700/80 rounded-lg px-2.5 py-1 mr-1">
     <span>{orgName}</span>
     {branchName && <span className="text-slate-400 font-normal">({branchName})</span>}
   </span>
 )}
 </div>

 {/* Left side: Controls, Status, Quick Tools, Date */}
 <div className="flex items-center gap-1 sm:gap-2 shrink-0">
 {/* Date Indicator (Desktop) */}
 <div className="hidden xl:flex items-center gap-1.5 bg-slate-100 dark:bg-slate-800 border border-slate-200/70 dark:border-slate-700 px-2.5 py-1 rounded-lg text-xs font-bold text-slate-600 dark:text-slate-300">
 <Calendar className="w-3.5 h-3.5 text-slate-400"/>
 <span>{new Date().toISOString().slice(0, 10)}</span>
 </div>

 {/* Notifications (Desktop/Tablet) with real live unread count */}
 <div className="relative hidden md:block">
 <button
 onClick={() => setIsNotificationOpen((prev) => !prev)}
 title="الإشعارات"
 className="relative p-1.5 rounded-lg text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
 >
 <Bell className="w-4 h-4"/>
 {unreadCount > 0 && (
 <span className="absolute -top-1 -right-1 bg-red-500 text-white text-4xs font-black px-1.5 py-0.2 rounded-full">
 {unreadCount}
 </span>
 )}
 </button>
 <NotificationDropdown isOpen={isNotificationOpen} onClose={() => setIsNotificationOpen(false)} />
 </div>

 {/* Support Headset (Desktop/Tablet) */}
 <button
 title="الدعم الفني المباشر"
 onClick={onOpenSupportModal}
 className="hidden md:flex p-1.5 rounded-lg text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
 >
 <Headphones className="w-4 h-4"/>
 </button>

 {/* Cash Drawer Tool (Desktop/Tablet) */}
 <button
 title="فتح درج النقدية"
 onClick={() => toast.success('تم إرسال أمر فتح درج النقدية الكهرومغناطيسي')}
 className="hidden md:flex p-1.5 rounded-lg text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
 >
 <HardDrive className="w-4 h-4"/>
 </button>

 {/* Calculator Tool (Desktop/Tablet) */}
 <button
 title="الآلة الحاسبة"
 onClick={onOpenCalcModal}
 className="hidden md:flex p-1.5 rounded-lg text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
 >
 <Calculator className="w-4 h-4"/>
 </button>

 {/* Online Badge */}
 <div
 title="متصل بالشبكة وسيرفر المزامنة"
 className="flex items-center gap-1 bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800 text-emerald-700 dark:text-emerald-400 text-3xs sm:text-xs font-bold px-1.5 sm:px-2.5 py-0.5 sm:py-1 rounded-full"
 >
 <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"/>
 <span className="hidden sm:inline">متصل</span>
 </div>

 {/* Shift Status Badge */}
 {activeShift ? (
 <div className="flex items-center gap-1 bg-purple-50 dark:bg-purple-950/60 border border-purple-200 dark:border-purple-800 rounded-lg px-1.5 sm:px-2.5 py-0.5 sm:py-1 text-2xs sm:text-xs">
 <button
 onClick={() => router.push('/sales/shifts/close')}
 title="عرض وتدقيق وإغلاق الوردية"
 className="flex items-center gap-1 font-bold text-purple-700 dark:text-purple-300 hover:underline cursor-pointer"
 >
 <Clock className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-purple-600 dark:text-purple-400"/>
 <span>#{activeShift.shift_number}</span>
 <span className="hidden md:inline font-mono text-2xs text-purple-600 dark:text-purple-400">
 ({formatNumber(activeShift.expected_closing_balance)} ج.م)
 </span>
 </button>
 <button
 onClick={() => router.push('/sales/shifts/close')}
 title="إغلاق الوردية الحالية"
 className="mr-0.5 text-4xs sm:text-3xs font-black bg-red-100 hover:bg-red-200 text-red-700 dark:bg-red-950/80 dark:hover:bg-red-900/80 dark:text-red-300 px-1 py-0.5 rounded cursor-pointer transition-colors"
 >
 إغلاق
 </button>
 </div>
 ) : (
          <div
            className="flex items-center gap-1.5 bg-amber-50 dark:bg-amber-950/50 border border-amber-200/80 dark:border-amber-800/60 rounded-lg px-2.5 py-1 text-2xs text-amber-700 dark:text-amber-400 font-bold"
            title="الوردية مغلقة حالياً — يرجى فتح الوردية من النموذج أدناه"
          >
            <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
            <span>الوردية مغلقة</span>
          </div>
        )}

 {/* Theme Toggle */}
 <button
 onClick={onToggleTheme}
 title="تبديل الوضع الليلي"
 className="p-1 sm:p-1.5 rounded-lg text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
 >
 {isDark ? <Sun className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-amber-400"/> : <Moon className="w-3.5 h-3.5 sm:w-4 sm:h-4"/>}
 </button>

 {/* User Initial Circle */}
 <div className="w-6 h-6 sm:w-8 sm:h-8 rounded-full bg-emerald-100 dark:bg-emerald-900 text-emerald-800 dark:text-emerald-200 font-bold flex items-center justify-center text-3xs sm:text-xs border border-emerald-300 dark:border-emerald-700 shrink-0">
 {currentUser?.full_name ? currentUser.full_name.charAt(0) :'ع'}
 </div>
 </div>
 </header>
 );
}