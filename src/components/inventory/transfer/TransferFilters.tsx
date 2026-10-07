import React from 'react';
import { Icons } from '@/components/ui/Icons';
import { TransferFilterStatus } from './types';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';

interface TransferFiltersProps {
    searchQuery: string;
    onSearchChange: (value: string) => void;
    statusFilter: TransferFilterStatus;
    onStatusFilterChange: (status: TransferFilterStatus) => void;
}

export const TransferFilters: React.FC<TransferFiltersProps> = ({
    searchQuery,
    onSearchChange,
    statusFilter,
    onStatusFilterChange,
}) => {
    return (
        <div className="bg-surface rounded-2xl p-4 border border-slate-200/80 dark:border-slate-800 shadow-xs flex flex-col md:flex-row items-center justify-between gap-3">
            {/* Search Input */}
            <div className="relative w-full md:flex-1">
                <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => onSearchChange(e.target.value)}
                    placeholder="بحث برقم التحويل أو اسم الفرع..."
                    className="w-full h-10 pr-10 pl-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 text-xs font-bold text-slate-800 dark:text-slate-200 placeholder:text-slate-400 focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
                <div className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400">
                    <Icons.Search />
                </div>
                {searchQuery && (
                    <button
                        type="button"
                        onClick={() => onSearchChange('')}
                        className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                    >
                        <Icons.X />
                    </button>
                )}
            </div>

            {/* Filter Status Selector - Using Shadcn Select */}
            <div className="w-full md:w-64">
                <Select
                    value={statusFilter}
                    onValueChange={(val) => onStatusFilterChange(val as TransferFilterStatus)}
                >
                    <SelectTrigger className="w-full h-10 rounded-xl bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-xs font-bold">
                        <SelectValue placeholder="اختر من القائمة..." />
                    </SelectTrigger>
                    <SelectContent className="z-50 bg-surface border border-slate-200 dark:border-slate-800 rounded-xl shadow-xl">
                        <SelectItem value="all" className="">
                            كل الحالات (اختر من القائمة...)
                        </SelectItem>
                        <SelectItem value="pending" className="">
                            قيد الشحن (بانتظار الشحن)
                        </SelectItem>
                        <SelectItem value="in_transit" className="">
                            تم الشحن (في الطريق)
                        </SelectItem>
                        <SelectItem value="completed" className="">
                            تم الاستلام (مكتمل)
                        </SelectItem>
                        <SelectItem value="cancelled" className="">
                            ملغي
                        </SelectItem>
                    </SelectContent>
                </Select>
            </div>
        </div>
    );
};