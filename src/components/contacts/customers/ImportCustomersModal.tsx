'use client';

import React, { useState, useRef } from 'react';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Upload, FileSpreadsheet, Check, AlertCircle, Trash2, X } from 'lucide-react';
import { ContactsRepository } from '@/modules/contacts/contacts_repository';
import { toast } from 'sonner';

interface ParsedCustomerRow {
    name: string;
    phone: string;
    code: string;
    balance: number;
}

interface ImportCustomersModalProps {
    isOpen: boolean;
    onClose: () => void;
    orgId: string;
    onImportComplete: () => void;
}

export function ImportCustomersModal({
    isOpen,
    onClose,
    orgId,
    onImportComplete,
}: ImportCustomersModalProps) {
    const [inputText, setInputText] = useState('');
    const [parsedRows, setParsedRows] = useState<ParsedCustomerRow[]>([]);
    const [isProcessing, setIsProcessing] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const parseText = (text: string) => {
        const lines = text.split('\n').map((l) => l.trim()).filter((l) => l.length > 0);
        const rows: ParsedCustomerRow[] = [];

        for (const line of lines) {
            const parts = line.split(/[,\t]/).map((p) => p.trim().replace(/^"|"$/g, ''));
            if (parts.length >= 1 && parts[0] && parts[0] !== 'اسم العميل' && parts[0] !== 'Name') {
                rows.push({
                    name: parts[0],
                    phone: parts[1] || '',
                    code: parts[2] || '',
                    balance: Number(parts[3]) || 0,
                });
            }
        }
        setParsedRows(rows);
    };

    const handleTextChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
        const val = e.target.value;
        setInputText(val);
        parseText(val);
    };

    const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = (event) => {
            const content = (event.target?.result as string) || '';
            setInputText(content);
            parseText(content);
        };
        reader.readAsText(file);
    };

    const handleImport = async () => {
        if (parsedRows.length === 0) {
            toast.error('لا توجد بيانات صالحة للاستيراد');
            return;
        }

        try {
            setIsProcessing(true);
            let count = 0;

            for (const row of parsedRows) {
                if (!row.name.trim()) continue;
                await ContactsRepository.createContact(
                    {
                        org_id: orgId,
                        name: row.name.trim(),
                        phone: row.phone.trim() || undefined,
                        code: row.code.trim() || undefined,
                        type: 'customer',
                        credit_limit: 0,
                        is_active: true,
                    },
                    row.balance
                );
                count++;
            }

            toast.success(`تم استيراد ${count} عميل بنجاح`);
            setInputText('');
            setParsedRows([]);
            onImportComplete();
            onClose();
        } catch (err) {
            console.error(err);
            toast.error('حدث خطأ أثناء استيراد البيانات');
        } finally {
            setIsProcessing(false);
        }
    };

    const handleClear = () => {
        setInputText('');
        setParsedRows([]);
        if (fileInputRef.current) fileInputRef.current.value = '';
    };

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="max-w-2xl rounded-3xl p-6 select-none" dir="rtl">
                <DialogHeader className="pb-3 border-b border-slate-100 dark:border-slate-800">
                    <DialogTitle className="text-base font-black text-slate-900 dark:text-white flex items-center gap-2">
                        <FileSpreadsheet className="w-5 h-5 text-pink-600" />
                        <span>استيراد بيانات العملاء من Excel / CSV</span>
                    </DialogTitle>
                </DialogHeader>

                <div className="space-y-4 py-2">
                    {/* Instructions */}
                    <div className="bg-slate-50 dark:bg-slate-900/50 p-3.5 rounded-2xl border border-slate-100 dark:border-slate-800 text-xs text-slate-500">
                        <p className="font-bold text-slate-700 dark:text-slate-300 mb-1">صيغة الملف أو السطور المدعومة:</p>
                        <code className="text-pink-600 font-mono text-2xs font-black bg-pink-50 dark:bg-pink-950/40 px-2 py-0.5 rounded inline-block">
                            اسم العميل, الهاتف, الكود, الرصيد الافتتاحي
                        </code>
                    </div>

                    {/* Action buttons */}
                    <div className="flex items-center justify-between gap-3">
                        <input
                            type="file"
                            ref={fileInputRef}
                            onChange={handleFileUpload}
                            accept=".csv,.txt"
                            className="hidden"
                        />
                        <Button
                            variant="outline"
                            onClick={() => fileInputRef.current?.click()}
                            className="h-10 text-xs font-bold gap-2 rounded-xl border-slate-200 dark:border-slate-800"
                        >
                            <Upload className="w-4 h-4 text-pink-600" />
                            <span>اختيار ملف من جهازك</span>
                        </Button>

                        {parsedRows.length > 0 && (
                            <Button
                                variant="ghost"
                                size="sm"
                                onClick={handleClear}
                                className="text-xs font-bold text-rose-500 hover:text-rose-600 gap-1"
                            >
                                <Trash2 className="w-3.5 h-3.5" /> مسح البيانات
                            </Button>
                        )}
                    </div>

                    {/* Text Area */}
                    <div>
                        <textarea
                            value={inputText}
                            onChange={handleTextChange}
                            rows={4}
                            placeholder={`محمد علي, 01012345678, C-101, 0\nشركة النور, 01223456789, C-102, 500`}
                            className="w-full p-3.5 rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50 text-xs font-mono focus:bg-white transition-all outline-none"
                        />
                    </div>

                    {/* Preview Table */}
                    {parsedRows.length > 0 && (
                        <div>
                            <div className="flex items-center justify-between mb-2">
                                <span className="text-xs font-black text-slate-700 dark:text-slate-300">
                                    معاينة البيانات قبل الإدراج ({parsedRows.length} عميل)
                                </span>
                                <span className="text-3xs font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-md">
                                    جاهز للاستيراد
                                </span>
                            </div>

                            <div className="max-h-48 overflow-y-auto rounded-2xl border border-slate-100 dark:border-slate-800">
                                <table className="w-full text-right text-xs">
                                    <thead className="sticky top-0 bg-slate-100 dark:bg-slate-800 text-3xs font-black text-slate-500">
                                        <tr>
                                            <th className="py-2.5 px-3">الاسم</th>
                                            <th className="py-2.5 px-3">الهاتف</th>
                                            <th className="py-2.5 px-3">الكود</th>
                                            <th className="py-2.5 px-3 text-left">الرصيد</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800 font-bold">
                                        {parsedRows.slice(0, 50).map((row, idx) => (
                                            <tr key={idx} className="hover:bg-slate-50/50">
                                                <td className="py-2 px-3 text-slate-900 dark:text-white">{row.name}</td>
                                                <td className="py-2 px-3 font-mono text-slate-500" dir="ltr">{row.phone || '—'}</td>
                                                <td className="py-2 px-3 font-mono text-slate-400">{row.code || '—'}</td>
                                                <td className="py-2 px-3 text-left font-mono">{row.balance} ج.م</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-end gap-2">
                    <Button variant="ghost" onClick={onClose} className="h-10 text-xs font-bold rounded-xl">
                        إلغاء
                    </Button>
                    <Button
                        onClick={handleImport}
                        disabled={isProcessing || parsedRows.length === 0}
                        className="h-10 px-6 bg-pink-600 hover:bg-pink-700 text-white text-xs font-bold rounded-xl shadow-md shadow-pink-500/20"
                    >
                        {isProcessing ? 'جاري الاستيراد...' : `تأكيد واستيراد (${parsedRows.length})`}
                    </Button>
                </div>
            </DialogContent>
        </Dialog>
    );
}