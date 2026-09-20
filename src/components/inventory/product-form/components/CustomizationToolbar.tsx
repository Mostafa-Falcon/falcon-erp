import React from 'react';
import { SlidersHorizontal, FileText, Settings, Clock, Check, Pill } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface CustomizationToolbarProps {
  showSpecs: boolean;
  setShowSpecs: (val: boolean) => void;
  showAdvanced: boolean;
  setShowAdvanced: (val: boolean) => void;
  showExpiry: boolean;
  setShowExpiry: (val: boolean) => void;
  setEnableExpiryTracking: (val: boolean) => void;
  isPharmacy?: boolean;
}

export const CustomizationToolbar: React.FC<CustomizationToolbarProps> = ({
  showSpecs,
  setShowSpecs,
  showAdvanced,
  setShowAdvanced,
  showExpiry,
  setShowExpiry,
  setEnableExpiryTracking,
  isPharmacy = false,
}) => {
  return (
    <div className="flex flex-wrap items-center justify-between gap-3 p-3 rounded-2xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200/80 dark:border-slate-800 shadow-2xs">
      <div className="flex flex-wrap items-center gap-2">
        <div className="flex items-center gap-1.5 px-2 py-1 text-xs font-black text-slate-800 dark:text-slate-200 shrink-0">
          <SlidersHorizontal className="w-4 h-4 text-emerald-600" />
          <span>تخصيص واجهة الإدخال:</span>
        </div>

        {isPharmacy && (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-xl text-[11px] font-black bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border border-emerald-500/20">
            <Pill className="w-3.5 h-3.5 text-emerald-600" />
            <span>نمط أدوية ومستحضرات الصيدلية</span>
          </span>
        )}

        {/* تبديل: المواصفات / المادة الفعالة */}
        <Button
          type="button"
          variant={showSpecs ? 'default' : 'outline'}
          size="sm"
          onClick={() => setShowSpecs(!showSpecs)}
          className={`h-8 px-3 rounded-xl text-xs font-black cursor-pointer transition-all ${
            showSpecs
              ? 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs border-emerald-600'
              : 'border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:border-emerald-500'
          }`}
        >
          <FileText className="w-3.5 h-3.5 ml-1" />
          <span>{isPharmacy ? 'المادة الفعالة والاسم العلمي' : 'المواصفات الإضافية'}</span>
          {showSpecs && <Check className="w-3 h-3 mr-1" />}
        </Button>

        {/* تبديل: الإعدادات المتقدمة */}
        <Button
          type="button"
          variant={showAdvanced ? 'default' : 'outline'}
          size="sm"
          onClick={() => setShowAdvanced(!showAdvanced)}
          className={`h-8 px-3 rounded-xl text-xs font-black cursor-pointer transition-all ${
            showAdvanced
              ? 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs border-emerald-600'
              : 'border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:border-emerald-500'
          }`}
        >
          <Settings className="w-3.5 h-3.5 ml-1" />
          <span>الإعدادات المتقدمة</span>
          {showAdvanced && <Check className="w-3 h-3 mr-1" />}
        </Button>

        {/* تبديل: تتبع الصلاحية */}
        <Button
          type="button"
          variant={showExpiry ? 'default' : 'outline'}
          size="sm"
          onClick={() => {
            const next = !showExpiry;
            setShowExpiry(next);
            setEnableExpiryTracking(next);
          }}
          className={`h-8 px-3 rounded-xl text-xs font-black cursor-pointer transition-all ${
            showExpiry
              ? 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs border-emerald-600'
              : 'border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:border-emerald-500'
          }`}
        >
          <Clock className="w-3.5 h-3.5 ml-1" />
          <span>تتبع الصلاحية والتشغيلات</span>
          {showExpiry && <Check className="w-3 h-3 mr-1" />}
        </Button>
      </div>

      <p className="text-[11px] text-slate-500 font-medium hidden sm:block">
        {isPharmacy
          ? 'في نمط الصيدلية: المادة الفعالة وتتبع تواريخ الصلاحية مفعّلة لضمان الإدارة الدقيقة للأدوية'
          : 'قم بتفعيل ما تحتاجه فقط لتبسيط وتسريع عملية الإدخال'}
      </p>
    </div>
  );
};
