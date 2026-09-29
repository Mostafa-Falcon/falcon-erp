import React from'react';
import { useRouter } from'next/navigation';
import {
 ArrowRight,
 ArrowLeft,
 Lock,
 CircleDot,
 HardDrive,
 Printer,
 Store,
 Play,
 Square,
 Clock,
 ShoppingBag,
} from'lucide-react';
import { Badge } from'@/components/ui/badge';
import { Button } from'@/components/ui/button';
import { toast } from'sonner';
import type { CashierShift, User as UserType } from'@/types';

interface ShiftHeaderTimelineProps {
 activeShift: CashierShift;
 openShifts: CashierShift[];
 users: UserType[];
 onSelectShift: (shift: CashierShift) => void;
 onPrint: () => void;
}

export function ShiftHeaderTimeline({
 activeShift,
 openShifts,
 users,
 onSelectShift,
 onPrint,
}: ShiftHeaderTimelineProps) {
 const router = useRouter();

 const getUserName = (id?: string | null) => {
 if (!id) return'—';
 const u = users.find((user) => user.id === id);
 return u?.full_name || u?.username ||'—';
 };

 const openedDate = new Date(activeShift.opened_at);
 const now = new Date();

 const formatShiftTimeOnly = (date: Date) => {
 return date.toLocaleTimeString('ar-EG', { hour:'2-digit', minute:'2-digit', hour12: true });
 };

 const formatShiftDateOnly = (date: Date) => {
 return date.toISOString().split('T')[0];
 };

 const calcDurationText = (startIso: string, endIso: string): string => {
 const diffMs = Math.max(0, new Date(endIso).getTime() - new Date(startIso).getTime());
 const totalMins = Math.floor(diffMs / (1000 * 60));
 const hours = Math.floor(totalMins / 60);
 const mins = totalMins % 60;
 const days = Math.floor(hours / 24);

 if (days > 0) {
 const remHours = hours % 24;
 return`${days} يوم و ${remHours} ساعة`;
 }
 return`${hours} ساعة و ${mins} دقيقة`;
 };

 const durationLabel = calcDurationText(activeShift.opened_at, now.toISOString());

 return (
 <div className="space-y-4">
 {/* 1. Header Bar */}
 <header className="h-16 bg-surface border border-slate-200/80 dark:border-slate-800 px-4 sm:px-6 flex items-center justify-between shadow-xs rounded-2xl">
 {/* Right side in RTL: Back button + Title */}
 <div className="flex items-center gap-3">
 <button
 onClick={() => router.push('/sales/pos')}
 title="العودة لنقطة البيع (الكاشير)"
 className="p-2 rounded-xl text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
 >
 <ArrowRight className="w-5 h-5"/>
 </button>

 <div className="flex items-center gap-2.5">
 <div className="w-10 h-10 rounded-2xl bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 flex items-center justify-center shadow-inner shrink-0 border border-blue-200/50 dark:border-blue-900/50">
 <Lock className="w-5 h-5"/>
 </div>
 <div>
 <div className="flex items-center gap-2">
 <h1 className="text-base sm:text-lg font-black text-slate-900 dark:text-white tracking-tight">
 إغلاق وتدقيق الوردية
 </h1>
 <Badge className="bg-blue-50 hover:bg-blue-100 text-blue-700 dark:bg-blue-950/60 dark:text-blue-300 border border-blue-200/80 dark:border-blue-800 font-black px-2.5 py-0.5 text-xs rounded-xl shadow-2xs">
 وردية #{activeShift.shift_number} ({getUserName(activeShift.user_id)})
 </Badge>
 </div>
 <span className="text-2xs font-semibold text-slate-400 hidden sm:inline-block">
 لوجيسكا ERP | نظام إدارة الموارد ونقاط البيع v1
 </span>
 </div>
 </div>
 </div>

 {/* Left side in RTL: Action tools & Navigation */}
 <div className="flex items-center gap-2 sm:gap-3">
 {/* Realtime Live Pulse */}
 <div className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400 text-xs font-bold border border-emerald-200/60 dark:border-emerald-800/60">
 <CircleDot className="w-3.5 h-3.5 animate-pulse text-emerald-600"/>
 <span>تحديث لحظي</span>
 </div>

 {/* Open Cash Drawer Button */}
 <button
 onClick={() => toast.success('تم إرسال أمر فتح درج النقدية الكهرومغناطيسي')}
 title="فتح درج النقدية"
 className="p-2 rounded-xl text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer border border-slate-200/60 dark:border-slate-800"
 >
 <HardDrive className="w-4 h-4"/>
 </button>

 {/* Print Report Button */}
 <button
 onClick={onPrint}
 title="طباعة تقرير تدقيق الوردية"
 className="p-2 rounded-xl text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer border border-slate-200/60 dark:border-slate-800"
 >
 <Printer className="w-4 h-4"/>
 </button>

 {/* Back to Shifts List */}
 <Button
 variant="outline"
 onClick={() => router.push('/sales/shifts')}
 className="text-xs font-bold rounded-xl h-9 px-3 gap-1.5 cursor-pointer border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800"
 >
 <ArrowLeft className="w-3.5 h-3.5"/>
 <span className="hidden sm:inline">سجل الورديات</span>
 </Button>
 </div>
 </header>

 {/* 2. Open Shifts Switcher Bar (If multiple shifts exist) */}
 {openShifts.length > 0 && (
 <div className="p-3 bg-surface rounded-2xl border border-slate-200/80 dark:border-slate-800 flex flex-wrap items-center justify-between gap-3 shadow-2xs">
 <div className="flex items-center gap-2 text-xs font-black text-slate-700 dark:text-slate-300">
 <Store className="w-4 h-4 text-blue-600"/>
 <span>الورديات المفتوحة بالفرع ({openShifts.length}):</span>
 </div>

 <div className="flex flex-wrap items-center gap-2">
 {openShifts.map((s) => {
 const isSelected = s.id === activeShift.id;
 const cashierName = getUserName(s.user_id);
 return (
 <button
 key={s.id}
 type="button"
 onClick={() => onSelectShift(s)}
 className={`flex items-center gap-2 px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
 isSelected
 ?'bg-blue-600 text-white shadow-xs scale-102 ring-2 ring-blue-500/30'
 :'bg-slate-100 dark:bg-slate-800/70 text-slate-700 dark:text-slate-300 hover:bg-slate-200/80 dark:hover:bg-slate-800 border border-slate-200/60 dark:border-slate-700/60'
 }`}
 >
 <div className={`w-2 h-2 rounded-full ${isSelected ?'bg-white animate-pulse':'bg-slate-400'}`} />
 <span>{cashierName}</span>
 <span className="opacity-75 font-mono text-2xs">#{s.shift_number}</span>
 </button>
 );
 })}
 </div>
 </div>
 )}

 {/* 3. Sleek Timeline & Duration Card */}
 <div className="p-4 sm:p-5 bg-surface rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-2xs">
 <div className="flex items-center justify-between relative">
 {/* Start (Right in RTL) */}
 <div className="flex items-center gap-3.5 z-10">
 <div className="w-11 h-11 rounded-2xl bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shadow-xs border border-emerald-200/60 dark:border-emerald-800/60 shrink-0">
 <Play className="w-4 h-4 fill-emerald-600"/>
 </div>
 <div className="text-right">
 <span className="text-2xs font-bold text-slate-400 block">بداية الوردية</span>
 <div className="flex items-baseline gap-2 mt-0.5">
 <span className="text-sm sm:text-base font-black text-slate-900 dark:text-white font-mono">
 {formatShiftTimeOnly(openedDate)}
 </span>
 <span className="text-xs font-mono text-slate-400">
 {formatShiftDateOnly(openedDate)}
 </span>
 </div>
 </div>
 </div>

 {/* Center Progress Track with Duration Tag */}
 <div className="flex-1 mx-6 hidden md:flex flex-col items-center justify-center relative">
 <div className="w-full h-2 bg-gradient-to-l from-emerald-500 via-blue-500 to-rose-500 rounded-full opacity-80 shadow-inner"/>
 <div className="absolute -top-4 px-4 py-1 bg-surface border border-slate-200 dark:border-slate-700 rounded-full shadow-xs flex items-center gap-2 text-xs font-bold text-blue-600 dark:text-blue-400">
 <Clock className="w-3.5 h-3.5 text-blue-500"/>
 <span>مدة التشغيل: {durationLabel}</span>
 </div>
 </div>

 {/* End / Current Audit Time (Left in RTL) */}
 <div className="flex items-center gap-3.5 z-10 text-left">
 <div className="text-left">
 <span className="text-2xs font-bold text-slate-400 block">وقت التدقيق الحالي</span>
 <div className="flex items-baseline gap-2 mt-0.5">
 <span className="text-sm sm:text-base font-black text-slate-900 dark:text-white font-mono">
 {formatShiftTimeOnly(now)}
 </span>
 <span className="text-xs font-bold text-rose-600 dark:text-rose-400 bg-rose-50 dark:bg-rose-950/50 px-2 py-0.5 rounded-lg border border-rose-200/60 dark:border-rose-800/60">
 الآن جاري الإغلاق
 </span>
 </div>
 </div>
 <div className="w-11 h-11 rounded-2xl bg-rose-50 dark:bg-rose-950/60 text-rose-600 dark:text-rose-400 flex items-center justify-center shadow-xs border border-rose-200/60 dark:border-rose-800/60 shrink-0">
 <Square className="w-4 h-4 fill-rose-600"/>
 </div>
 </div>
 </div>
 </div>
 </div>
 );
}