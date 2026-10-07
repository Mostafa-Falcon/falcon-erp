'use client';

import React from 'react';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { SlidersHorizontal, RotateCcw } from 'lucide-react';

export interface CustomerColumnConfig {
    code: boolean;
    name: boolean;
    phone: boolean;
    purchases: boolean;
    balance: boolean;
    lastActivity: boolean;
}

export const DEFAULT_CUSTOMER_COLUMNS: CustomerColumnConfig = {
    code: true,
    name: true,
    phone: true,
    purchases: true,
    balance: true,
    lastActivity: true,
};

const COLUMN_LABELS: Record<keyof CustomerColumnConfig, string> = {
    code: 'معرف الاتصال / الكود',
    name: 'اسم العميل / المشروع',
    phone: 'رقم الهاتف والتواصل',
    purchases: 'المجموع (المسحوبات)',
    balance: 'الرصيد الحالي',
    lastActivity: 'آخر حركة / التاريخ',
};

interface ColumnsCustomizerModalProps {
    isOpen: boolean;
    onClose: () => void;
    columns: CustomerColumnConfig;
    onChange: (columns: CustomerColumnConfig) => void;
}

export function ColumnsCustomizerModal({
    isOpen,
    onClose,
    columns,
    onChange,
}: ColumnsCustomizerModalProps) {
    const toggleColumn = (key: keyof CustomerColumnConfig) => {
        // Prevent hiding the name column
        if (key === 'name') return;
        const updated = { ...columns, [key]: !columns[key] };
        onChange(updated);
        try {
            localStorage.setItem('falcon_customer_columns', JSON.stringify(updated));
        } catch { }
    };

    const handleReset = () => {
        onChange(DEFAULT_CUSTOMER_COLUMNS);
        try {
            localStorage.setItem('falcon_customer_columns', JSON.stringify(DEFAULT_CUSTOMER_COLUMNS));
        } catch { }
    };

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="max-w-md rounded-3xl p-6 select-none" dir="rtl">
                <DialogHeader className="pb-3 border-b border-slate-100 dark:border-slate-800">
                    <DialogTitle className="text-base font-black text-slate-900 dark:text-white flex items-center gap-2">
                        <SlidersHorizontal className="w-5 h-5 text-pink-600" />
                        <span>تخصيص أعمدة جدول العملاء</span>
                    </DialogTitle>
                </DialogHeader>

                <div className="py-3 space-y-2.5">
                    <p className="text-xs text-slate-400 font-bold mb-3">
                        حدد الأعمدة التي ترغب في إظهارها أو إخفائها من جدول سجل العملاء:
                    </p>

                    {(Object.keys(COLUMN_LABELS) as (keyof CustomerColumnConfig)[]).map((key) => {
                        const isName = key === 'name';
                        const checked = columns[key];

                        return (
                            <label
                                key={key}
                                className={`flex items-center justify-between p-3 rounded-2xl border transition-all cursor-pointer ${checked
                                    ? 'bg-pink-50/50 border-pink-200/60 dark:bg-pink-950/20 dark:border-pink-900/40 text-slate-900 dark:text-white'
                                    : 'bg-slate-50/50 border-slate-200/60 dark:bg-slate-900/50 dark:border-slate-800 text-slate-400'
                                    } ${isName ? 'opacity-80 cursor-not-allowed' : ''}`}
                            >
                                <span className="text-xs font-bold">{COLUMN_LABELS[key]}</span>
                                <input
                                    type="checkbox"
                                    checked={checked}
                                    disabled={isName}
                                    onChange={() => toggleColumn(key)}
                                    className="w-4 h-4 rounded text-pink-600 focus:ring-pink-500 cursor-pointer"
                                />
                            </label>
                        );
                    })}
                </div>

                <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
                    <Button
                        variant="ghost"
                        size="sm"
                        onClick={handleReset}
                        className="text-xs font-bold text-slate-400 hover:text-slate-600 gap-1 rounded-xl"
                    >
                        <RotateCcw className="w-3.5 h-3.5" />
                        <span>إعادة الضبط للافتراضي</span>
                    </Button>

                    <Button
                        onClick={onClose}
                        className="px-6 bg-pink-600 hover:bg-pink-700 text-white text-xs font-bold rounded-xl"
                    >
                        تم وحفظ
                    </Button>
                </div>
            </DialogContent>
        </Dialog>
    );
}