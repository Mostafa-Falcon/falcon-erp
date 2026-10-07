import React from 'react';
import { Button } from '@/components/ui/button';
import { Check, Trash2 } from 'lucide-react';

interface FormActionsProps {
    isSaving: boolean;
    onCancel: () => void;
    handleResetForm: () => void;
    isPharmacy?: boolean;
}

export const FormActions: React.FC<FormActionsProps> = ({
    isSaving,
    onCancel,
    handleResetForm,
    isPharmacy = false,
}) => {
    return (
        <div className="p-3.5 sm:p-5 bg-surface rounded-2xl border border-slate-200/90 dark:border-slate-800 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-3 transition-all">
            <div className="flex flex-1 items-center gap-2.5 sm:gap-3">
                <Button
                    type="submit"
                    disabled={isSaving}
                    className="flex-1 sm:flex-initial h-11 px-8 bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-black rounded-xl shadow-md cursor-pointer transition-all flex items-center justify-center gap-2"
                >
                    {isSaving ? (
                        <span>جاري الحفظ...</span>
                    ) : (
                        <>
                            <Check className="w-4 h-4" />
                            <span>{isPharmacy ? 'حفظ الدواء النهائي' : 'حفظ البيانات'}</span>
                        </>
                    )}
                </Button>

                <Button
                    type="button"
                    variant="outline"
                    onClick={onCancel}
                    className="h-11 px-5 rounded-xl border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 text-xs font-black cursor-pointer"
                >
                    إلغاء
                </Button>
            </div>

            <Button
                type="button"
                onClick={handleResetForm}
                className="h-11 px-5 bg-red-600 hover:bg-red-700 text-white text-xs font-black rounded-xl shadow-xs cursor-pointer flex items-center justify-center gap-2 self-stretch sm:self-auto"
            >
                <Trash2 className="w-4 h-4" />
                <span>تفريغ البيانات</span>
            </Button>
        </div>
    );
};