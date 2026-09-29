'use client';

import * as React from'react';
import { ChevronLeft, ChevronRight } from'lucide-react';
import { cn } from'@/lib/utils';
import { buttonVariants } from'@/components/ui/button';

export interface CalendarProps {
 selected?: Date | string | null;
 onSelect?: (date: Date | undefined) => void;
 className?: string;
 minYear?: number;
 maxYear?: number;
}

const MONTHS_AR = [
'يناير',
'فبراير',
'مارس',
'أبريل',
'مايو',
'يونيو',
'يوليو',
'أغسطس',
'سبتمبر',
'أكتوبر',
'نوفمبر',
'ديسمبر',
];

const WEEKDAYS_AR = ['أحد','اثنين','ثلاثاء','أربعاء','خميس','جمعة','سبت'];

export function Calendar({
 selected,
 onSelect,
 className,
 minYear = 2020,
 maxYear = 2040,
}: CalendarProps) {
 const selectedDate = React.useMemo(() => {
 if (!selected) return undefined;
 if (typeof selected ==='string') {
 const parsed = new Date(selected);
 return isNaN(parsed.getTime()) ? undefined : parsed;
 }
 return selected;
 }, [selected]);

 const [currentMonth, setCurrentMonth] = React.useState<Date>(() => {
 return selectedDate || new Date();
 });

 // Keep view updated if selected changes from outside
 React.useEffect(() => {
 if (selectedDate) {
 setCurrentMonth(new Date(selectedDate.getFullYear(), selectedDate.getMonth(), 1));
 }
 }, [selectedDate]);

 const year = currentMonth.getFullYear();
 const month = currentMonth.getMonth();

 const handlePrevMonth = () => {
 setCurrentMonth(new Date(year, month - 1, 1));
 };

 const handleNextMonth = () => {
 setCurrentMonth(new Date(year, month + 1, 1));
 };

 const handleMonthChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
 setCurrentMonth(new Date(year, parseInt(e.target.value, 10), 1));
 };

 const handleYearChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
 setCurrentMonth(new Date(parseInt(e.target.value, 10), month, 1));
 };

 // Generate day grid
 const daysInMonth = new Date(year, month + 1, 0).getDate();
 const firstDayIndex = new Date(year, month, 1).getDay(); // 0 = Sunday

 const days: (number | null)[] = [];
 for (let i = 0; i < firstDayIndex; i++) {
 days.push(null);
 }
 for (let d = 1; d <= daysInMonth; d++) {
 days.push(d);
 }

 const isSameDay = (d1: Date, d2: Date) => {
 return (
 d1.getFullYear() === d2.getFullYear() &&
 d1.getMonth() === d2.getMonth() &&
 d1.getDate() === d2.getDate()
 );
 };

 const today = new Date();

 return (
 <div className={cn('p-3 select-none w-[280px]', className)} dir="rtl">
 {/* Navigation Header */}
 <div className="flex items-center justify-between gap-1 pb-3">
 <button
 type="button"
 onClick={handleNextMonth}
 className={cn(
 buttonVariants({ variant:'outline'}),
'h-7 w-7 bg-transparent p-0 opacity-70 hover:opacity-100 cursor-pointer rounded-lg'
 )}
 title="الشهر التالي"
 >
 <ChevronRight className="h-4 w-4"/>
 </button>

 <div className="flex items-center gap-1.5 font-bold text-xs">
 <select
 value={month}
 onChange={handleMonthChange}
 className="h-7 px-1.5 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 text-xs font-bold cursor-pointer focus:outline-none"
 >
 {MONTHS_AR.map((name, idx) => (
 <option key={idx} value={idx}>
 {name}
 </option>
 ))}
 </select>

 <select
 value={year}
 onChange={handleYearChange}
 className="h-7 px-1.5 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 text-xs font-bold font-mono cursor-pointer focus:outline-none"
 >
 {Array.from({ length: maxYear - minYear + 1 }, (_, i) => minYear + i).map((y) => (
 <option key={y} value={y}>
 {y}
 </option>
 ))}
 </select>
 </div>

 <button
 type="button"
 onClick={handlePrevMonth}
 className={cn(
 buttonVariants({ variant:'outline'}),
'h-7 w-7 bg-transparent p-0 opacity-70 hover:opacity-100 cursor-pointer rounded-lg'
 )}
 title="الشهر السابق"
 >
 <ChevronLeft className="h-4 w-4"/>
 </button>
 </div>

 {/* Weekdays row */}
 <div className="grid grid-cols-7 gap-1 text-center mb-1">
 {WEEKDAYS_AR.map((wd, i) => (
 <span
 key={i}
 className="text-3xs font-bold text-slate-400 py-1"
 >
 {wd}
 </span>
 ))}
 </div>

 {/* Days grid */}
 <div className="grid grid-cols-7 gap-1 text-center">
 {days.map((d, index) => {
 if (d === null) {
 return <div key={`empty-${index}`} className="h-8 w-8"/>;
 }

 const cellDate = new Date(year, month, d);
 const isSelected = selectedDate ? isSameDay(cellDate, selectedDate) : false;
 const isCurrentDay = isSameDay(cellDate, today);

 return (
 <button
 key={`day-${d}`}
 type="button"
 onClick={() => {
 onSelect?.(cellDate);
 }}
 className={cn(
'h-8 w-8 text-xs rounded-xl flex items-center justify-center font-bold transition-all cursor-pointer font-mono',
 isSelected
 ?'bg-emerald-600 text-white shadow-xs font-black'
 : isCurrentDay
 ?'bg-emerald-50 dark:bg-emerald-950/50 text-emerald-600 dark:text-emerald-400 border border-emerald-300 dark:border-emerald-700'
 :'text-slate-800 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800'
 )}
 >
 {d}
 </button>
 );
 })}
 </div>

 {/* Quick shortcuts */}
 <div className="flex items-center justify-between pt-3 mt-2 border-t border-slate-100 dark:border-slate-800 text-2xs">
 <button
 type="button"
 onClick={() => {
 onSelect?.(today);
 setCurrentMonth(new Date(today.getFullYear(), today.getMonth(), 1));
 }}
 className="text-emerald-600 dark:text-emerald-400 font-bold hover:underline cursor-pointer"
 >
 اليوم
 </button>

 <button
 type="button"
 onClick={() => {
 onSelect?.(undefined);
 }}
 className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 font-bold cursor-pointer"
 >
 مسح
 </button>
 </div>
 </div>
 );
}