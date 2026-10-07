'use client';

import React from 'react';
import { ScanBarcode, SlidersHorizontal } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';

interface CustomersSubBarProps {
    resultsCount: number;
    pageSize: string;
    onPageSizeChange: (val: string) => void;
    onOpenColumnsModal: () => void;
    onBarcodeClick?: () => void;
}

export function CustomersSubBar({
    resultsCount,
    pageSize,
    onPageSizeChange,
    onOpenColumnsModal,
    onBarcodeClick,
}: CustomersSubBarProps) {
    return (
        <div className="px-5 py-3.5 bg-slate-50/40 dark:bg-slate-900/30 border-b border-slate-100 dark:border-slate-800/60 flex flex-wrap items-center justify-between gap-4">
            {/* Right: Badge & Info */}
            <div className="flex items-center gap-3">
                <span className="bg-pink-50 dark:bg-pink-950/50 text-pink-600 dark:text-pink-400 font-mono text-xs font-black px-2.5 py-1 rounded-xl border border-pink-200/60 dark:border-pink-900/40">
                    {resultsCount} عميل
                </span>
                <span className="text-xs font-bold text-slate-400">
                    نتائج البحث السريع في السجل
                </span>
            </div>

            {/* Left: Controls */}
            <div className="flex items-center gap-3">
                <button
                    onClick={onBarcodeClick}
                    className="p-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-surface text-slate-500 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                    title="مسح باركود بطاقة العميل"
                >
                    <ScanBarcode className="w-4 h-4" />
                </button>

                <div className="flex items-center gap-2 text-xs font-bold text-slate-500">
                    <span>عرض</span>
                    <Select value={pageSize} onValueChange={onPageSizeChange}>
                        <SelectTrigger className="w-20 h-9 rounded-xl bg-surface border-slate-200 dark:border-slate-800 text-xs font-bold">
                            <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="10">10</SelectItem>
                            <SelectItem value="25">25</SelectItem>
                            <SelectItem value="50">50</SelectItem>
                            <SelectItem value="100">100</SelectItem>
                        </SelectContent>
                    </Select>
                    <span>إدخالات</span>
                </div>

                <Button
                    variant="outline"
                    onClick={onOpenColumnsModal}
                    className="h-9 border-slate-200 dark:border-slate-800 text-xs font-bold gap-1.5 rounded-xl bg-surface hover:bg-slate-50"
                >
                    <SlidersHorizontal className="w-3.5 h-3.5" />
                    <span>تخصيص الأعمدة</span>
                </Button>
            </div>
        </div>
    );
}