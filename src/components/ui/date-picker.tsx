'use client';

import * as React from'react';
import { Calendar as CalendarIcon } from'lucide-react';
import { cn } from'@/lib/utils';
import { Button } from'@/components/ui/button';
import { Calendar } from'@/components/ui/calendar';
import {
 Popover,
 PopoverContent,
 PopoverTrigger,
} from'@/components/ui/popover';

export interface DatePickerProps {
 date?: Date | string | null;
 onSelect: (date: Date | undefined) => void;
 placeholder?: string;
 className?: string;
 align?:'start'|'center'|'end';
 disabled?: boolean;
 trigger?: React.ReactNode;
}

export function DatePicker({
 date,
 onSelect,
 placeholder ='اختر التاريخ...',
 className,
 align ='center',
 disabled = false,
 trigger,
}: DatePickerProps) {
 const [open, setOpen] = React.useState(false);

 const selectedDate = React.useMemo(() => {
 if (!date) return undefined;
 if (typeof date ==='string') {
 const parsed = new Date(date);
 return isNaN(parsed.getTime()) ? undefined : parsed;
 }
 return date;
 }, [date]);

 const formattedLabel = React.useMemo(() => {
 if (!selectedDate) return placeholder;
 const y = selectedDate.getFullYear();
 const m = String(selectedDate.getMonth() + 1).padStart(2,'0');
 const d = String(selectedDate.getDate()).padStart(2,'0');
 return`${y}-${m}-${d}`;
 }, [selectedDate, placeholder]);

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
 // Matches the height of Input / SelectTrigger (h-11) so the three
 // control types stay on one baseline when placed side by side.
'h-11 justify-between gap-2 px-3 text-start text-sm font-normal',
 !selectedDate &&'text-muted-foreground',
 className
 )}
 >
 <span className="font-mono font-bold">{formattedLabel}</span>
 <CalendarIcon className="h-4 w-4 shrink-0 text-muted-foreground"/>
 </Button>
 )}
 </PopoverTrigger>
 <PopoverContent className="w-auto rounded-2xl border-line p-0 shadow-2xl"align={align}>
 <Calendar
 selected={selectedDate}
 onSelect={(newDate) => {
 onSelect(newDate);
 setOpen(false);
 }}
 />
 </PopoverContent>
 </Popover>
 );
}