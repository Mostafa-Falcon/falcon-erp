import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Package, Scale, Pill } from 'lucide-react';
import type { ItemTypeMode } from '../types';

interface ItemTypeSelectorProps {
  itemTypeMode: ItemTypeMode;
  setItemTypeMode: (mode: ItemTypeMode) => void;
  isPharmacy?: boolean;
}

export const ItemTypeSelector: React.FC<ItemTypeSelectorProps> = ({
  itemTypeMode,
  setItemTypeMode,
  isPharmacy = false,
}) => {
  return (
    <Card className="border border-slate-200/90 dark:border-slate-800 bg-white dark:bg-[#131b2e] shadow-xs">
      <CardContent className="p-4 sm:p-5">
        <Label className="block text-xs font-black text-slate-800 dark:text-slate-200 mb-3">
          {isPharmacy
            ? 'طبيعة وتصنيف بيع المستحضر الدوائي *'
            : 'اختر نوع الصنف وطبيعة البيع *'}
        </Label>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {/* خيار 1: صنف بالقطعة والعبوة / وحدات متعددة */}
          <div
            onClick={() => setItemTypeMode('unit')}
            className={`p-4 rounded-2xl border-2 cursor-pointer transition-all flex items-center gap-3.5 ${
              itemTypeMode === 'unit'
                ? 'border-emerald-600 bg-emerald-50/40 dark:bg-emerald-950/30 shadow-xs'
                : 'border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/40'
            }`}
          >
            <div
              className={`w-11 h-11 rounded-2xl flex items-center justify-center shrink-0 ${
                itemTypeMode === 'unit'
                  ? 'bg-emerald-600 text-white shadow-xs'
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-500'
              }`}
            >
              {isPharmacy ? <Pill className="w-5 h-5" /> : <Package className="w-5 h-5" />}
            </div>
            <div className="flex-1">
              <div className="flex items-center justify-between">
                <h4 className="font-black text-sm text-slate-900 dark:text-white">
                  {isPharmacy
                    ? 'دواء / مستحضر بالعبوات والقطع (علبة / شريط / قرص / أمبول)'
                    : 'صنف بالقطعة (وحدات متعددة)'}
                </h4>
                {itemTypeMode === 'unit' && (
                  <span className="w-5 h-5 rounded-full bg-emerald-600 text-white flex items-center justify-center text-[10px]">
                    ✓
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 font-medium">
                {isPharmacy
                  ? 'علبة، شريط، قرص، كبسولة، أمبول، زجاجة مع معادلة التحويل والتفكيك التلقائي لأسعار التجزئة'
                  : 'قطعة، كرتونة، باكت، دستة، علبة، طرد مع معامل التفكيك وتعدد المستويات'}
              </p>
            </div>
          </div>

          {/* خيار 2: صنف بالوزن (ميزان إلكتروني) */}
          <div
            onClick={() => {
              if (isPharmacy) return;
              setItemTypeMode('weight');
            }}
            className={`p-4 rounded-2xl border-2 transition-all flex items-center gap-3.5 ${
              isPharmacy
                ? 'opacity-50 cursor-not-allowed border-slate-200 dark:border-slate-800 bg-slate-100/60 dark:bg-slate-900/40'
                : itemTypeMode === 'weight'
                ? 'border-blue-600 bg-blue-50/40 dark:bg-blue-950/30 shadow-xs cursor-pointer'
                : 'border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/40 cursor-pointer'
            }`}
          >
            <div
              className={`w-11 h-11 rounded-2xl flex items-center justify-center shrink-0 ${
                !isPharmacy && itemTypeMode === 'weight'
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'bg-slate-200 dark:bg-slate-800 text-slate-400'
              }`}
            >
              <Scale className="w-5 h-5" />
            </div>
            <div className="flex-1">
              <div className="flex items-center justify-between">
                <h4 className="font-black text-sm text-slate-900 dark:text-white">
                  صنف بالوزن (ميزان / كيلو)
                </h4>
                {isPharmacy ? (
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-400">
                    غير متاح بالصيدليات
                  </span>
                ) : itemTypeMode === 'weight' && (
                  <span className="w-5 h-5 rounded-full bg-blue-600 text-white flex items-center justify-center text-[10px]">
                    ✓
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 font-medium">
                {isPharmacy
                  ? 'نمط الصيدليات يعتمد حصرياً على بيع الأدوية والمستحضرات بالعبوة والشريط والقطع بدلاً من الميزان.'
                  : 'يباع بالوزن والميزان الإلكتروني (كيلو، جرام، طن)'}
              </p>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
