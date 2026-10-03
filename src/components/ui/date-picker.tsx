'use client';

import * as React from 'react';
import { Calendar as CalendarIcon, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';

export interface DatePickerProps {
  /** Selected date value as a string (YYYY-MM-DD), Date, or null */
  value?: Date | string | null;
  /** Synonym for value */
  date?: Date | string | null;
  /** Callback returning ISO format string (YYYY-MM-DD) or empty string on clear */
  onChange?: (dateStr: string) => void;
  /** Callback returning Date object or undefined on clear */
  onSelect?: (date: Date | undefined) => void;
  /** Placeholder when no date is selected */
  placeholder?: string;
  /** Class name for the trigger button */
  className?: string;
  /** Alignment of popover dropdown */
  align?: 'start' | 'center' | 'end';
  /** Disabled state */
  disabled?: boolean;
  /** Whether to show a clear 'x' icon when date is selected */
  clearable?: boolean;
  /** Custom trigger element */
  trigger?: React.ReactNode;
}

export function DatePicker({
  value,
  date,
  onChange,
  onSelect,
  placeholder = 'اختر التاريخ...',
  className,
  align = 'start',
  disabled = false,
  clearable = true,
  trigger,
}: DatePickerProps) {
  const [open, setOpen] = React.useState(false);

  const rawDate = value !== undefined ? value : date;

  const selectedDate = React.useMemo(() => {
    if (!rawDate) return undefined;
    if (typeof rawDate === 'string') {
      const parts = rawDate.split('-');
      if (parts.length === 3) {
        const y = parseInt(parts[0], 10);
        const m = parseInt(parts[1], 10) - 1;
        const d = parseInt(parts[2], 10);
        if (!isNaN(y) && !isNaN(m) && !isNaN(d)) {
          return new Date(y, m, d);
        }
      }
      const parsed = new Date(rawDate);
      return isNaN(parsed.getTime()) ? undefined : parsed;
    }
    return rawDate;
  }, [rawDate]);

  const formattedLabel = React.useMemo(() => {
    if (!selectedDate) return placeholder;
    const y = selectedDate.getFullYear();
    const m = String(selectedDate.getMonth() + 1).padStart(2, '0');
    const d = String(selectedDate.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  }, [selectedDate, placeholder]);

  const handleSelect = (newDate: Date | undefined) => {
    onSelect?.(newDate);
    if (onChange) {
      if (newDate) {
        const y = newDate.getFullYear();
        const m = String(newDate.getMonth() + 1).padStart(2, '0');
        const d = String(newDate.getDate()).padStart(2, '0');
        onChange(`${y}-${m}-${d}`);
      } else {
        onChange('');
      }
    }
    setOpen(false);
  };

  const handleClear = (e: React.MouseEvent) => {
    e.stopPropagation();
    onSelect?.(undefined);
    onChange?.('');
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        {trigger ? (
          trigger
        ) : (
          <Button
            type="button"
            variant="outline"
            disabled={disabled}
            className={cn(
              'h-10 justify-between gap-2.5 px-3 rounded-xl border-slate-200/80 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-900/60 text-xs font-bold transition-all shadow-2xs hover:bg-slate-100/80 dark:hover:bg-slate-800/80',
              !selectedDate && 'text-slate-400 font-medium',
              className
            )}
          >
            <div className="flex items-center gap-2 truncate">
              <CalendarIcon className="h-4 w-4 shrink-0 text-slate-400 group-hover:text-primary" />
              <span className="font-mono text-xs font-bold">{formattedLabel}</span>
            </div>
            {clearable && selectedDate && !disabled && (
              <span
                role="button"
                onClick={handleClear}
                className="p-0.5 rounded-md hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors"
                title="مسح التاريخ"
              >
                <X className="w-3.5 h-3.5" />
              </span>
            )}
          </Button>
        )}
      </PopoverTrigger>
      <PopoverContent
        className="w-auto rounded-2xl border-border p-0 shadow-2xl z-50 bg-popover"
        align={align}
      >
        <Calendar selected={selectedDate} onSelect={handleSelect} />
      </PopoverContent>
    </Popover>
  );
}