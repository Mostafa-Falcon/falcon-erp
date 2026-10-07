'use client';

import React, { useState } from 'react';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Banknote } from 'lucide-react';
import { formatNumber } from '@/lib/format';
import type { Contact, Treasury } from '@/types';
import { TreasuryRepository } from '@/modules/treasury/treasury_repository';
import { ContactsRepository } from '@/modules/contacts/contacts_repository';
import { toast } from 'sonner';

interface DisburseAdvanceModalProps {
    isOpen: boolean;
    onClose: () => void;
    customer: Contact;
    treasuries: Treasury[];
    onSuccess: () => void;
}

export function DisburseAdvanceModal({
    isOpen,
    onClose,
    customer,
    treasuries,
    onSuccess,
}: DisburseAdvanceModalProps) {
    const [amount, setAmount] = useState('');
    const [selectedTreasuryId, setSelectedTreasuryId] = useState(() => {
        const def = treasuries.find((t) => t.is_default) || treasuries[0];
        return def?.id || '';
    });
    const [notes, setNotes] = useState('');
    const [isProcessing, setIsProcessing] = useState(false);

    const handleDisburse = async () => {
        if (!amount || Number(amount) <= 0) {
            toast.error('يرجى إدخال مبلغ سلفة صحيح');
            return;
        }
        if (!selectedTreasuryId) {
            toast.error('يرجى تحديد الخزينة');
            return;
        }

        try {
            setIsProcessing(true);
            const val = Number(amount);

            // 1. Record Financial Payment Voucher
            const v = await TreasuryRepository.createVoucher({
                orgId: customer.org_id,
                treasuryId: selectedTreasuryId,
                contactId: customer.id,
                type: 'payment',
                amount: val,
                description: notes || `صرف سلفة نقدية للعميل: ${customer.name}`,
                userId: 'current-user',
            });

            // 2. Adjust Balance (Debit increases customer debt)
            await ContactsRepository.adjustBalance({
                orgId: customer.org_id,
                contactId: customer.id,
                referenceType: 'payment_voucher',
                referenceId: v.id,
                debit: val,
                credit: 0,
                notes: notes || 'سند صرف سلفة نقدية',
            });

            toast.success(`تم صرف سلفة بمبلغ ${formatNumber(val)} ج.م بنجاح`);
            setAmount('');
            setNotes('');
            onSuccess();
            onClose();
        } catch (err) {
            console.error(err);
            toast.error('فشل في تسجيل صرف السلفة');
        } finally {
            setIsProcessing(false);
        }
    };

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="max-w-md rounded-3xl p-6 select-none" dir="rtl">
                <DialogHeader className="pb-3 border-b border-slate-100 dark:border-slate-800">
                    <DialogTitle className="text-base font-black text-slate-900 dark:text-white flex items-center gap-2 text-indigo-600">
                        <Banknote className="w-5 h-5" />
                        <span>صرف سلفة نقدية (سند صرف)</span>
                    </DialogTitle>
                </DialogHeader>

                <div className="space-y-4 py-2">
                    <div>
                        <label className="text-xs font-bold text-slate-500 block mb-1.5">
                            مبلغ السلفة (ج.م) *
                        </label>
                        <Input
                            type="number"
                            value={amount}
                            onChange={(e) => setAmount(e.target.value)}
                            placeholder="0.00"
                            className="h-11 font-mono font-black text-base rounded-xl"
                            autoFocus
                        />
                    </div>

                    <div>
                        <label className="text-xs font-bold text-slate-500 block mb-1.5">
                            صرف من خزينة *
                        </label>
                        <select
                            value={selectedTreasuryId}
                            onChange={(e) => setSelectedTreasuryId(e.target.value)}
                            className="w-full h-11 px-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-surface text-xs font-bold"
                        >
                            {treasuries.map((t) => (
                                <option key={t.id} value={t.id}>
                                    {t.name} (رصيدها: {formatNumber(t.current_balance)} ج.م)
                                </option>
                            ))}
                        </select>
                    </div>

                    <div>
                        <label className="text-xs font-bold text-slate-500 block mb-1.5">
                            البيان / سبب السلفة
                        </label>
                        <Input
                            value={notes}
                            onChange={(e) => setNotes(e.target.value)}
                            placeholder="سلفة كاش مؤقتة..."
                            className="h-11 text-xs rounded-xl"
                        />
                    </div>
                </div>

                <div className="pt-2 border-t border-slate-100 dark:border-slate-800 flex items-center justify-end gap-2">
                    <Button variant="ghost" onClick={onClose} className="h-10 text-xs font-bold rounded-xl">
                        إلغاء
                    </Button>
                    <Button
                        onClick={handleDisburse}
                        disabled={isProcessing || !amount || Number(amount) <= 0}
                        className="h-10 px-5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-xl shadow-sm shadow-indigo-500/20"
                    >
                        {isProcessing ? 'جاري الصرف...' : 'تأكيد وصرف السلفة'}
                    </Button>
                </div>
            </DialogContent>
        </Dialog>
    );
}