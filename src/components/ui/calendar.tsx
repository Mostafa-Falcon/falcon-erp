'use client';

import * as React from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';
import { buttonVariants } from '@/components/ui/button';

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

const WEEKDAYS_AR = ['أحد', 'اثنين', 'ثلاثاء', 'أربعاء', 'خميس', 'جمعة', 'سبت'];

export function Calendar({
  selected,
  onSelect,
  className,
  minYear = 2020,
  maxYear = 2040,
}: CalendarProps) {
  const selectedDate = React.useMemo(() => {
    if (!selected) return undefined;
    if (typeof selected === 'string') {
      const parts = selected.split('-');
      if (parts.length === 3) {
        const y = parseInt(parts[0], 10);
        const m = parseInt(parts[1], 10) - 1;
        const d = parseInt(parts[2], 10);
        if (!isNaN(y) && !isNaN(m) && !isNaN(d)) {
          return new Date(y, m, d);
        }
      }
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
    <div className={cn('p-3.5 select-none w-[290px] bg-popover text-popover-foreground', className)} dir="rtl">
      {/* Navigation Header */}
      <div className="flex items-center justify-between gap-1 pb-3 border-b border-border/60">
        <button
          type="button"
          onClick={handleNextMonth}
          className={cn(
            buttonVariants({ variant: 'outline' }),
            'h-7 w-7 bg-surface p-0 opacity-80 hover:opacity-100 cursor-pointer rounded-lg border-border'
          )}
          title="الشهر التالي"
        >
          <ChevronRight className="h-4 w-4" />
        </button>

        <div className="flex items-center gap-1.5 font-bold text-xs">
          <select
            value={month}
            onChange={handleMonthChange}
            className="h-7 px-2 rounded-lg border border-border bg-slate-50 dark:bg-slate-900 text-xs font-bold cursor-pointer focus:outline-none focus:ring-1 focus:ring-primary"
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
            className="h-7 px-2 rounded-lg border border-border bg-slate-50 dark:bg-slate-900 text-xs font-bold font-mono cursor-pointer focus:outline-none focus:ring-1 focus:ring-primary"
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
            buttonVariants({ variant: 'outline' }),
            'h-7 w-7 bg-surface p-0 opacity-80 hover:opacity-100 cursor-pointer rounded-lg border-border'
          )}
          title="الشهر السابق"
        >
          <ChevronLeft className="h-4 w-4" />
        </button>
      </div>

      {/* Weekdays row */}
      <div className="grid grid-cols-7 gap-1 text-center my-2">
        {WEEKDAYS_AR.map((wd, i) => (
          <span
            key={i}
            className="text-3xs font-black text-muted-foreground py-0.5"
          >
            {wd}
          </span>
        ))}
      </div>

      {/* Days grid */}
      <div className="grid grid-cols-7 gap-1 text-center">
        {days.map((d, index) => {
          if (d === null) {
            return <div key={`empty-${index}`} className="h-8 w-8" />;
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
                  ? 'bg-primary text-primary-foreground shadow-xs font-black ring-2 ring-primary/20 scale-105'
                  : isCurrentDay
                  ? 'bg-primary/10 text-primary border border-primary/30 font-black'
                  : 'text-foreground hover:bg-slate-100 dark:hover:bg-slate-800'
              )}
            >
              {d}
            </button>
          );
        })}
      </div>

      {/* Quick shortcuts */}
      <div className="flex items-center justify-between pt-3 mt-2 border-t border-border/60 text-2xs">
        <button
          type="button"
          onClick={() => {
            onSelect?.(today);
            setCurrentMonth(new Date(today.getFullYear(), today.getMonth(), 1));
          }}
          className="text-primary font-bold hover:underline cursor-pointer"
        >
          اليوم
        </button>

        <button
          type="button"
          onClick={() => {
            onSelect?.(undefined);
          }}
          className="text-muted-foreground hover:text-foreground font-bold cursor-pointer"
        >
          مسح
        </button>
      </div>
    </div>
  );
}