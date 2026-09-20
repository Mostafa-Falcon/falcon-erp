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
    <div className="p-4 sm:p-5 bg-white dark:bg-[#131b2e] rounded-2xl border border-slate-200/90 dark:border-slate-800 shadow-sm flex flex-wrap items-center justify-between gap-3 transition-all">
      <div className="flex items-center gap-3">
        <Button
          type="submit"
          disabled={isSaving}
          className="h-11 px-8 bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-black rounded-xl shadow-md cursor-pointer transition-all flex items-center gap-2"
        >
          {isSaving ? (
            <span>جاري الحفظ...</span>
          ) : (
            <>
              <Check className="w-4 h-4" />
              <span>{isPharmacy ? 'حفظ الدواء النهائي' : 'حفظ الصنف النهائي'}</span>
            </>
          )}
        </Button>

        <Button
          type="button"
          variant="outline"
          onClick={onCancel}
          className="h-11 px-6 rounded-xl border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 text-xs font-black cursor-pointer"
        >
          إلغاء
        </Button>
      </div>

      <Button
        type="button"
        onClick={handleResetForm}
        className="h-11 px-6 bg-red-600 hover:bg-red-700 text-white text-xs font-black rounded-xl shadow-xs cursor-pointer flex items-center gap-2"
      >
        <Trash2 className="w-4 h-4" />
        <span>تفريغ البيانات</span>
      </Button>
    </div>
  );
};
