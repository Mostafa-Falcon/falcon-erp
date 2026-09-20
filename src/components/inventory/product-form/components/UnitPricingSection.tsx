import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { Button } from '@/components/ui/button';
import { Trash2, TrendingUp, Plus, X } from 'lucide-react';
import type { UnitLevelItem } from '../types';
import { calculatePriceDetails } from '../utils';

interface UnitPricingSectionProps {
  unitLevels: UnitLevelItem[];
  handleAddSmallerUnit: () => void;
  updateUnitLevel: (idx: number, patch: Partial<UnitLevelItem>) => void;
  removeUnitLevel: (idx: number) => void;
}

export const UnitPricingSection: React.FC<UnitPricingSectionProps> = ({
  unitLevels,
  handleAddSmallerUnit,
  updateUnitLevel,
  removeUnitLevel,
}) => {
  return (
    <>
      {unitLevels.map((lvl, idx) => {
        const isFirst = idx === 0;
        const activeSale = lvl.dualPricing
          ? lvl.newSalePrice || lvl.salePrice
          : lvl.salePrice;
        const priceDetails = calculatePriceDetails(
          lvl.purchasePrice,
          activeSale,
          lvl.discountValue,
          lvl.discountType
        );

        return (
          <Card
            key={lvl.id}
            className="border border-slate-200/90 dark:border-slate-800 bg-white dark:bg-[#131b2e] shadow-xs overflow-hidden rounded-2xl"
          >
            <CardContent className="p-5 space-y-4">
              {/* السطر 1: الشارة، اسم الوحدة، معامل التفكيك، الرصيد، سويتش مسموح بالبيع */}
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-3 flex-1 min-w-[280px]">
                  <div
                    className={`w-7 h-7 rounded-full flex items-center justify-center font-black text-xs shrink-0 ${
                      isFirst
                        ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                        : 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300'
                    }`}
                  >
                    {idx + 1}
                  </div>

                  <div className="flex-1">
                    <Label className="block text-[11px] font-black text-slate-500 mb-1">
                      اسم الوحدة {isFirst ? '(الأساسية / الكبرى)' : `(المستوى ${idx + 1})`}
                    </Label>
                    <Input
                      type="text"
                      value={lvl.unitName}
                      onChange={(e) =>
                        updateUnitLevel(idx, { unitName: e.target.value })
                      }
                      placeholder={
                        isFirst
                          ? 'مثال: قطعة، كرتونة، كجم...'
                          : 'مثال: باكت، شريط، جرام...'
                      }
                      className="h-10 text-xs font-bold"
                    />
                  </div>

                  {!isFirst && (
                    <div className="w-32">
                      <Label className="block text-[11px] font-black text-slate-600 dark:text-slate-400 mb-1">
                        معامل التفكيك
                      </Label>
                      <div className="relative">
                        <Input
                          type="number"
                          min={1}
                          value={lvl.conversionFactor}
                          onChange={(e) =>
                            updateUnitLevel(idx, {
                              conversionFactor: e.target.value,
                            })
                          }
                          placeholder=""
                          className="h-10 text-xs font-mono font-bold pr-3 pl-8"
                        />
                        {lvl.conversionFactor && (
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            onClick={() =>
                              updateUnitLevel(idx, { conversionFactor: '' })
                            }
                            className="absolute left-1 top-1 w-8 h-8 text-slate-400 hover:text-slate-600 cursor-pointer rounded-lg"
                          >
                            <X className="w-3.5 h-3.5" />
                          </Button>
                        )}
                      </div>
                    </div>
                  )}

                  <div className="w-28">
                    <Label className="block text-[11px] font-black text-slate-500 mb-1">
                      الرصيد الافتتاحي
                    </Label>
                    <div className="relative">
                      <Input
                        type="number"
                        min={0}
                        value={lvl.openingStock}
                        onChange={(e) =>
                          updateUnitLevel(idx, { openingStock: e.target.value })
                        }
                        placeholder=""
                        className="h-10 text-xs font-mono font-bold pr-3 pl-8"
                      />
                      {lvl.openingStock !== '' && (
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          onClick={() =>
                            updateUnitLevel(idx, { openingStock: '' })
                          }
                          className="absolute left-1 top-1 w-8 h-8 text-slate-400 hover:text-slate-600 cursor-pointer rounded-lg"
                        >
                          <X className="w-3.5 h-3.5" />
                        </Button>
                      )}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <div className="flex items-center gap-2">
                    <Switch
                      checked={lvl.allowSale}
                      onCheckedChange={(checked) =>
                        updateUnitLevel(idx, { allowSale: checked })
                      }
                      id={`allow-sale-${idx}`}
                    />
                    <Label
                      htmlFor={`allow-sale-${idx}`}
                      className="text-xs font-black text-emerald-700 dark:text-emerald-400 cursor-pointer"
                    >
                      مسموح بالبيع
                    </Label>
                  </div>

                  {!isFirst && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      onClick={() => removeUnitLevel(idx)}
                      className="w-8 h-8 rounded-lg text-red-500 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-950/40 cursor-pointer"
                      title="حذف هذا المستوى"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  )}
                </div>
              </div>

              {/* شريط معادلة التحويل والحساب التلقائي للصيدليات والمستويات */}
              {!isFirst && (
                <div className="flex flex-wrap items-center justify-between gap-2 px-3 py-2 rounded-xl bg-blue-50/80 dark:bg-blue-950/30 border border-blue-200/70 dark:border-blue-900/50 text-xs">
                  <div className="flex items-center gap-2 font-bold text-blue-900 dark:text-blue-200">
                    <span className="text-[11px] font-black">معادلة التفكيك:</span>
                    <span className="font-mono bg-white dark:bg-slate-900 px-2.5 py-0.5 rounded-lg border border-blue-200 dark:border-blue-800 text-xs shadow-2xs">
                      1 {unitLevels[idx - 1]?.unitName || (idx === 1 ? 'علبة' : 'شريط')} = {lvl.conversionFactor || (idx === 1 ? '3' : '10')} {lvl.unitName || (idx === 1 ? 'شريط' : 'قرص')}
                    </span>
                  </div>

                  {unitLevels[idx - 1]?.salePrice && parseFloat(unitLevels[idx - 1].salePrice) > 0 && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        const factor = parseFloat(lvl.conversionFactor) || (idx === 1 ? 3 : 10);
                        const prevSale = parseFloat(unitLevels[idx - 1].salePrice);
                        const prevCost = parseFloat(unitLevels[idx - 1].purchasePrice || '0');
                        if (factor > 0) {
                          updateUnitLevel(idx, {
                            salePrice: (prevSale / factor).toFixed(2),
                            newSalePrice: (prevSale / factor).toFixed(2),
                            purchasePrice: prevCost > 0 ? (prevCost / factor).toFixed(2) : lvl.purchasePrice,
                          });
                        }
                      }}
                      className="h-7 px-3 text-[11px] font-black text-blue-700 dark:text-blue-300 hover:bg-blue-100 dark:hover:bg-blue-900/50 rounded-lg cursor-pointer gap-1 transition-colors"
                    >
                      <TrendingUp className="w-3 h-3 text-blue-600" />
                      <span>تحديث السعر تلقائياً (قسمة على المعامل)</span>
                    </Button>
                  )}
                </div>
              )}

              {/* السطر 2: سعر الشراء، الخصم، وسويتش تسعير مزدوج */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 items-end">
                <div>
                  <Label className="block text-[11px] font-black text-slate-600 dark:text-slate-400 mb-1">
                    سعر الشراء
                  </Label>
                  <Input
                    type="number"
                    min={0}
                    step="any"
                    value={lvl.purchasePrice}
                    onChange={(e) =>
                      updateUnitLevel(idx, { purchasePrice: e.target.value })
                    }
                    placeholder=""
                    className="h-10 text-xs font-mono font-bold"
                  />
                </div>

                <div>
                  <Label className="block text-[11px] font-black text-slate-600 dark:text-slate-400 mb-1">
                    الخصم
                  </Label>
                  <div className="flex gap-1.5">
                    <Input
                      type="number"
                      min={0}
                      value={lvl.discountValue}
                      onChange={(e) =>
                        updateUnitLevel(idx, { discountValue: e.target.value })
                      }
                      placeholder=""
                      className="h-10 text-xs font-mono flex-1"
                    />
                    <Button
                      type="button"
                      onClick={() =>
                        updateUnitLevel(idx, {
                          discountType:
                            lvl.discountType === 'percent' ? 'amount' : 'percent',
                        })
                      }
                      className="h-10 px-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-black shrink-0 cursor-pointer shadow-2xs"
                    >
                      {lvl.discountType === 'percent' ? '%' : 'ج.م'}
                    </Button>
                  </div>
                  {lvl.discountValue && parseFloat(lvl.discountValue) > 0 && priceDetails.grossCost > 0 && (
                    <div className="flex items-center justify-between mt-1 px-1 text-[10px] font-bold">
                      <span className="text-slate-600 dark:text-slate-400">
                        صافي الشراء:{' '}
                        <strong className="text-emerald-700 dark:text-emerald-400 font-mono">
                          {priceDetails.netCost.toFixed(2)} ج.م
                        </strong>
                      </span>
                      <span className="text-slate-400 font-mono">
                        (خصم {priceDetails.discountAmount.toFixed(2)} ج.م)
                      </span>
                    </div>
                  )}
                </div>

                <div className="flex items-center justify-between p-2 h-10 rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-slate-100 dark:border-slate-800">
                  <span className="text-xs font-black text-slate-600 dark:text-slate-400">
                    تسعير مزدوج
                  </span>
                  <Switch
                    checked={lvl.dualPricing}
                    onCheckedChange={(checked) =>
                      updateUnitLevel(idx, { dualPricing: checked })
                    }
                  />
                </div>
              </div>

              {/* السطر 3: أسعار البيع وهامش الربح */}
              <div className="grid grid-cols-1 sm:grid-cols-12 gap-3 items-end">
                {lvl.dualPricing ? (
                  <>
                    <div className="sm:col-span-5">
                      <Label className="block text-[11px] font-black text-slate-600 dark:text-slate-400 mb-1">
                        سعر البيع القديم
                      </Label>
                      <Input
                        type="number"
                        min={0}
                        step="any"
                        value={lvl.oldSalePrice}
                        onChange={(e) =>
                          updateUnitLevel(idx, { oldSalePrice: e.target.value })
                        }
                        placeholder=""
                        className="h-11 text-sm font-mono font-bold text-slate-700 dark:text-slate-300"
                      />
                    </div>

                    <div className="sm:col-span-5">
                      <Label className="block text-[11px] font-black text-slate-700 dark:text-slate-300 mb-1">
                        سعر البيع الجديد *
                      </Label>
                      <Input
                        type="number"
                        min={0}
                        step="any"
                        value={lvl.newSalePrice}
                        onChange={(e) => {
                          const val = e.target.value;
                          updateUnitLevel(idx, {
                            newSalePrice: val,
                            salePrice: val,
                          });
                        }}
                        placeholder=""
                        className="h-11 text-sm font-mono font-black text-slate-900 dark:text-white"
                      />
                    </div>
                  </>
                ) : (
                  <div className="sm:col-span-10">
                    <Label className="block text-[11px] font-black text-slate-700 dark:text-slate-300 mb-1">
                      سعر البيع الحالي *
                    </Label>
                    <Input
                      type="number"
                      min={0}
                      step="any"
                      value={lvl.salePrice}
                      onChange={(e) => {
                        const val = e.target.value;
                        updateUnitLevel(idx, {
                          salePrice: val,
                          newSalePrice: val,
                        });
                      }}
                      placeholder=""
                      className="h-11 text-sm font-mono font-black text-slate-900 dark:text-white"
                    />
                  </div>
                )}

                <div
                  className={`sm:col-span-2 min-h-11 py-1 px-1.5 rounded-xl border flex flex-col items-center justify-center transition-all ${
                    priceDetails.marginPercent < 0
                      ? 'bg-red-50/60 dark:bg-red-950/40 border-red-200 dark:border-red-800/80 text-red-700 dark:text-red-400'
                      : 'bg-emerald-50/60 dark:bg-emerald-950/40 border-emerald-200 dark:border-emerald-800/80 text-emerald-800 dark:text-emerald-300'
                  }`}
                  title={`صافي التكلفة: ${priceDetails.netCost.toFixed(2)} ج.م | الربح: ${priceDetails.profitText}`}
                >
                  <div className="flex items-center gap-1 text-[10px] font-bold">
                    <TrendingUp className="w-3 h-3" />
                    <span>هامش الربح</span>
                  </div>
                  <span className="text-xs font-black font-mono">
                    {priceDetails.marginText}
                  </span>
                  {priceDetails.salePrice > 0 && priceDetails.grossCost > 0 && (
                    <span className="text-[9px] font-bold font-mono opacity-80">
                      {priceDetails.profitText}
                    </span>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        );
      })}

      {/* زر إضافة وحدة أصغر (بحد أقصى 3 مستويات) */}
      {unitLevels.length < 3 && (
        <Button
          type="button"
          variant="outline"
          onClick={handleAddSmallerUnit}
          className="w-full h-12 rounded-2xl bg-emerald-50 hover:bg-emerald-100 dark:bg-emerald-950/40 dark:hover:bg-emerald-900/50 border-dashed border-emerald-300 dark:border-emerald-800 text-emerald-700 dark:text-emerald-300 text-xs font-black flex items-center justify-center gap-2 cursor-pointer shadow-xs transition-all"
        >
          <Plus className="w-4 h-4" />
          <span>إضافة وحدة أصغر (المستوى {unitLevels.length + 1})</span>
        </Button>
      )}
    </>
  );
};
