import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Package, Scale, Pill } from 'lucide-react';
import type { ItemTypeMode } from '../types';

interface ItemTypeSelectorProps {
  itemTypeMode: ItemTypeMode;
  setItemTypeMode: (mode: ItemTypeMode) => void;
  isPharmacy?: boolean;
  hideWeight?: boolean;
  activityType?: string;
}

export const ItemTypeSelector: React.FC<ItemTypeSelectorProps> = ({
  itemTypeMode,
  setItemTypeMode,
  isPharmacy = false,
  hideWeight = false,
  activityType,
}) => {
  const isShopFitting =
    activityType === 'shop_fitting' ||
    activityType === 'decoration' ||
    activityType === 'decor' ||
    activityType === 'fitout';

  return (
    <Card className="border border-slate-200/90 dark:border-slate-800 bg-surface shadow-xs">
      <CardContent className="p-3.5 sm:p-4">
        <Label className="block text-2xs sm:text-xs font-black text-slate-700 dark:text-slate-300 mb-2">
          {isPharmacy
            ? 'طبيعة وتصنيف بيع المستحضر الدوائي *'
            : isShopFitting
              ? 'طبيعة تسعير ووحدات الصنف وتفكيك المستويات *'
              : 'نوع الصنف وطبيعة البيع *'}
        </Label>
        <div className={`grid ${hideWeight ? 'grid-cols-1' : 'grid-cols-1 sm:grid-cols-2'} gap-3`}>
          {/* خيار 1: صنف بالقطعة والعبوة / وحدات متعددة */}
          <div
            onClick={() => setItemTypeMode('unit')}
            className={`p-3 sm:p-3.5 rounded-xl border cursor-pointer transition-all flex items-center gap-3 ${itemTypeMode === 'unit'
              ? 'border-emerald-500 bg-emerald-50/50 dark:bg-emerald-950/30 shadow-2xs'
              : 'border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/40'
              }`}
          >
            <div
              className={`w-9 h-9 sm:w-10 sm:h-10 rounded-xl flex items-center justify-center shrink-0 ${itemTypeMode === 'unit'
                ? 'bg-emerald-600 text-white shadow-2xs'
                : 'bg-slate-100 dark:bg-slate-800 text-slate-500'
                }`}
            >
              {isPharmacy ? <Pill className="w-4 h-4 sm:w-5 sm:h-5" /> : <Package className="w-4 h-4 sm:w-5 sm:h-5" />}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between gap-2">
                <h4 className="font-black text-xs sm:text-sm text-slate-900 dark:text-white truncate">
                  {isPharmacy
                    ? 'دواء / مستحضر بالعبوات والقطع (علبة / شريط / قرص)'
                    : isShopFitting
                      ? 'صنف بالوحدات والقياسات (لوح / متر / قطعة / كرتونة)'
                      : 'صنف بالقطعة (وحدات وتجزئة متعددة)'}
                </h4>
                {itemTypeMode === 'unit' && (
                  <span className="w-4 h-4 rounded-full bg-emerald-600 text-white flex items-center justify-center text-3xs font-black shrink-0">
                    ✓
                  </span>
                )}
              </div>
              <p className="text-3xs sm:text-2xs text-slate-500 dark:text-slate-400 mt-0.5 font-medium truncate">
                {isPharmacy
                  ? 'علبة، شريط، قرص مع معادلة التحويل والتفكيك التلقائي لأسعار التجزئة'
                  : isShopFitting
                    ? 'لوح، متر مربع، متر طولي، قطعة، عود، كرتونة، باكت مع تفكيك المستويات'
                    : 'قطعة، كرتونة، باكت، دستة مع معامل التفكيك وتعدد المستويات'}
              </p>
            </div>
          </div>

          {/* خيار 2: صنف بالوزن (ميزان إلكتروني) - مخفي تماماً عند تفعيل hideWeight */}
          {!hideWeight && (
            <div
              onClick={() => {
                if (isPharmacy) return;
                setItemTypeMode('weight');
              }}
              className={`p-4 rounded-2xl border-2 transition-all flex items-center gap-3.5 ${isPharmacy
                ? 'opacity-50 cursor-not-allowed border-slate-200 dark:border-slate-800 bg-slate-100/60 dark:bg-slate-900/40'
                : itemTypeMode === 'weight'
                  ? 'border-blue-600 bg-blue-50/40 dark:bg-blue-950/30 shadow-xs cursor-pointer'
                  : 'border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/40 cursor-pointer'
                }`}
            >
              <div
                className={`w-11 h-11 rounded-2xl flex items-center justify-center shrink-0 ${!isPharmacy && itemTypeMode === 'weight'
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
                    <span className="text-3xs font-bold px-2 py-0.5 rounded-full bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-400">
                      غير متاح بالصيدليات
                    </span>
                  ) : itemTypeMode === 'weight' && (
                    <span className="w-5 h-5 rounded-full bg-blue-600 text-white flex items-center justify-center text-3xs">
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
          )}
        </div>
      </CardContent>
    </Card>
  );
};