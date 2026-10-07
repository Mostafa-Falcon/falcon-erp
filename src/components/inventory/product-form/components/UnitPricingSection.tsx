import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { Button } from '@/components/ui/button';
import { Trash2, TrendingUp, Plus, X, Sparkles, Layers } from 'lucide-react';
import type { UnitLevelItem } from '../types';
import { calculatePriceDetails } from '../utils';

interface UnitPricingSectionProps {
    unitLevels: UnitLevelItem[];
    handleAddSmallerUnit: () => void;
    updateUnitLevel: (idx: number, patch: Partial<UnitLevelItem>) => void;
    removeUnitLevel: (idx: number) => void;
    isPharmacy?: boolean;
}

const PHARMACY_QUICK_UNITS = [
    'علبة',
    'شريط',
    'قرص',
    'كبسولة',
    'أمبول',
    'زجاجة',
    'مرهم',
    'قطرة',
    'بخاخة',
    'كيس',
];

export const UnitPricingSection: React.FC<UnitPricingSectionProps> = ({
    unitLevels,
    handleAddSmallerUnit,
    updateUnitLevel,
    removeUnitLevel,
    isPharmacy = false,
}) => {
    return (
        <div className="space-y-4">
            {/* شريط الميزان والمعادلة الحسابية لتفكيك وحدات ومستويات الأصناف */}
            {unitLevels.length > 1 && (
                <div className="p-3.5 sm:p-4 rounded-2xl bg-gradient-to-r from-emerald-50 via-teal-50 to-blue-50 dark:from-emerald-950/40 dark:via-teal-950/30 dark:to-blue-950/40 border border-emerald-200/80 dark:border-emerald-800/60 shadow-2xs flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs text-slate-800 dark:text-slate-200">
                    <div className="flex items-center gap-2 font-bold shrink-0">
                        <Sparkles className="w-4 h-4 text-emerald-600 shrink-0 animate-pulse" />
                        <span>معادلة تفكيك المستويات ({unitLevels.length} مستويات منفصلة):</span>
                    </div>
                    <div className="flex flex-wrap items-center gap-1.5 font-mono text-xs bg-white/95 dark:bg-slate-900/95 px-3.5 py-1.5 rounded-xl border border-emerald-300 dark:border-emerald-800 shadow-2xs font-black text-emerald-800 dark:text-emerald-300">
                        <span>1 {unitLevels[0]?.unitName || (isPharmacy ? 'علبة' : 'الوحدة الكبرى')}</span>
                        <span className="text-slate-400">=</span>
                        <span>
                            {unitLevels[1]?.conversionFactor || 1} {unitLevels[1]?.unitName || (isPharmacy ? 'شريط' : 'المستوى 2')}
                        </span>
                        {unitLevels.length > 2 && (
                            <>
                                <span className="text-slate-400">=</span>
                                <span>
                                    {((parseFloat(unitLevels[1]?.conversionFactor || '1') || 1) *
                                        (parseFloat(unitLevels[2]?.conversionFactor || '1') || 1))}{' '}
                                    {unitLevels[2]?.unitName || (isPharmacy ? 'قرص' : 'المستوى 3')}
                                </span>
                            </>
                        )}
                    </div>
                </div>
            )}

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

                let levelTitle = isFirst
                    ? 'الوحدة الكبرى الأساسية (المستوى 1)'
                    : idx === 1
                        ? 'الوحدة الفرعية الوسيطة (المستوى 2)'
                        : 'وحدة التجزئة الصغرى (المستوى 3)';

                let unitLabelText = isFirst
                    ? 'اسم الوحدة الأساسية *'
                    : `اسم الوحدة (${idx === 1 ? 'المستوى 2' : 'المستوى 3'}) *`;

                if (isPharmacy) {
                    if (idx === 0) {
                        levelTitle = 'الوحدة الكبرى (العلبة)';
                        unitLabelText = 'اسم الوحدة الكبرى (علبة)';
                    } else if (idx === 1) {
                        levelTitle = 'الوحدة الفرعية (الشريط)';
                        unitLabelText = 'اسم الوحدة الفرعية (شريط)';
                    } else if (idx === 2) {
                        levelTitle = 'وحدة التجزئة (القرص / الكبسولة)';
                        unitLabelText = 'اسم وحدة التجزئة (قرص)';
                    }
                }

                return (
                    <Card
                        key={lvl.id}
                        className="border border-slate-200/90 dark:border-slate-800 bg-surface shadow-xs overflow-hidden rounded-2xl transition-all"
                    >
                        <CardContent className="p-4 sm:p-5 space-y-4">
                            {/* ترويسة المستوى: الشارة، العنوان، مسموح بالبيع، زر الحذف */}
                            <div className="flex items-center justify-between gap-3 pb-3 border-b border-slate-100 dark:border-slate-800/80">
                                <div className="flex items-center gap-2.5">
                                    <div
                                        className={`w-7 h-7 rounded-xl flex items-center justify-center font-black text-xs shrink-0 shadow-2xs ${
                                            isFirst
                                                ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800'
                                                : idx === 1
                                                    ? 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300 border border-amber-200 dark:border-amber-800'
                                                    : 'bg-sky-100 text-sky-800 dark:bg-sky-950 dark:text-sky-300 border border-sky-200 dark:border-sky-800'
                                        }`}
                                    >
                                        {idx + 1}
                                    </div>
                                    <div>
                                        <h4 className="text-xs sm:text-sm font-black text-slate-900 dark:text-white">
                                            {levelTitle}
                                        </h4>
                                        <p className="text-3xs text-slate-500 font-medium">
                                            {isFirst
                                                ? 'الوحدة الرئيسية المعتمدة لحساب المخزون وحركات الشراء الأساسية'
                                                : `وحدة فرعية مشتقة تفكك من المستوى السابق بمعدل ثابت`}
                                        </p>
                                    </div>
                                </div>

                                <div className="flex items-center gap-2 sm:gap-3 shrink-0">
                                    <div className="flex items-center gap-1.5 bg-slate-50 dark:bg-slate-900/60 px-2.5 py-1 rounded-xl border border-slate-200/60 dark:border-slate-800">
                                        <Switch
                                            checked={lvl.allowSale}
                                            onCheckedChange={(checked) =>
                                                updateUnitLevel(idx, { allowSale: checked })
                                            }
                                            id={`allow-sale-${idx}`}
                                        />
                                        <Label
                                            htmlFor={`allow-sale-${idx}`}
                                            className="text-2xs sm:text-xs font-bold text-slate-700 dark:text-slate-300 cursor-pointer select-none"
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
                                            className="w-8 h-8 rounded-xl text-red-500 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-950/40 cursor-pointer"
                                            title="حذف هذا المستوى"
                                        >
                                            <Trash2 className="w-4 h-4" />
                                        </Button>
                                    )}
                                </div>
                            </div>

                            {/* السطر الأول: تعريف الوحدة، معامل التفكيك، والرصيد الافتتاحي */}
                            {isFirst ? (
                                <div className="grid grid-cols-1 sm:grid-cols-12 gap-3 items-start">
                                    <div className="sm:col-span-7">
                                        <Label className="block text-2xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                                            {unitLabelText}
                                        </Label>
                                        <Input
                                            type="text"
                                            value={lvl.unitName}
                                            onChange={(e) =>
                                                updateUnitLevel(idx, { unitName: e.target.value })
                                            }
                                            placeholder={
                                                isPharmacy
                                                    ? 'مثال: علبة'
                                                    : 'مثال: لوح، متر مربع، متر طولي، قطعة، كرتونة، دستة...'
                                            }
                                            className="h-10 text-xs font-bold rounded-xl"
                                        />

                                        {isPharmacy && (
                                            <div className="flex flex-wrap gap-1 mt-1.5">
                                                {PHARMACY_QUICK_UNITS.map((uName) => (
                                                    <button
                                                        key={uName}
                                                        type="button"
                                                        onClick={() => updateUnitLevel(idx, { unitName: uName })}
                                                        className={`px-2 py-0.5 rounded-md text-3xs font-bold cursor-pointer transition-colors ${
                                                            lvl.unitName === uName
                                                                ? 'bg-emerald-600 text-white'
                                                                : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-emerald-50 dark:hover:bg-emerald-950/40 hover:text-emerald-700'
                                                        }`}
                                                    >
                                                        {uName}
                                                    </button>
                                                ))}
                                            </div>
                                        )}
                                    </div>

                                    <div className="sm:col-span-5">
                                        <Label className="block text-2xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                                            الرصيد الافتتاحي (بالمخزن)
                                        </Label>
                                        <div className="relative">
                                            <Input
                                                type="number"
                                                min={0}
                                                value={lvl.openingStock}
                                                onChange={(e) =>
                                                    updateUnitLevel(idx, { openingStock: e.target.value })
                                                }
                                                placeholder="0"
                                                className="h-10 text-xs font-mono font-bold rounded-xl pr-3 pl-8"
                                            />
                                            {lvl.openingStock !== '' && (
                                                <Button
                                                    type="button"
                                                    variant="ghost"
                                                    size="icon"
                                                    onClick={() => updateUnitLevel(idx, { openingStock: '' })}
                                                    className="absolute left-1 top-1 w-8 h-8 text-slate-400 hover:text-slate-600 cursor-pointer rounded-lg"
                                                >
                                                    <X className="w-3.5 h-3.5" />
                                                </Button>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            ) : (
                                <div className="grid grid-cols-1 sm:grid-cols-12 gap-3 items-start">
                                    <div className="sm:col-span-5">
                                        <Label className="block text-2xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                                            {unitLabelText}
                                        </Label>
                                        <Input
                                            type="text"
                                            value={lvl.unitName}
                                            onChange={(e) =>
                                                updateUnitLevel(idx, { unitName: e.target.value })
                                            }
                                            placeholder={
                                                isPharmacy
                                                    ? idx === 1
                                                        ? 'مثال: شريط'
                                                        : 'مثال: قرص أو كبسولة'
                                                    : 'مثال: متر، قطعة، باكت...'
                                            }
                                            className="h-10 text-xs font-bold rounded-xl"
                                        />

                                        {isPharmacy && (
                                            <div className="flex flex-wrap gap-1 mt-1.5">
                                                {PHARMACY_QUICK_UNITS.map((uName) => (
                                                    <button
                                                        key={uName}
                                                        type="button"
                                                        onClick={() => updateUnitLevel(idx, { unitName: uName })}
                                                        className={`px-2 py-0.5 rounded-md text-3xs font-bold cursor-pointer transition-colors ${
                                                            lvl.unitName === uName
                                                                ? 'bg-emerald-600 text-white'
                                                                : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-emerald-50 dark:hover:bg-emerald-950/40 hover:text-emerald-700'
                                                        }`}
                                                    >
                                                        {uName}
                                                    </button>
                                                ))}
                                            </div>
                                        )}
                                    </div>

                                    <div className="sm:col-span-4">
                                        <Label className="block text-2xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                                            معامل التفكيك (من المستوى السابق) *
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
                                                placeholder="مثال: 12"
                                                className="h-10 text-xs font-mono font-bold rounded-xl pr-3 pl-8"
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

                                    <div className="sm:col-span-3">
                                        <Label className="block text-2xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
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
                                                placeholder="0"
                                                className="h-10 text-xs font-mono font-bold rounded-xl pr-3 pl-8"
                                            />
                                            {lvl.openingStock !== '' && (
                                                <Button
                                                    type="button"
                                                    variant="ghost"
                                                    size="icon"
                                                    onClick={() => updateUnitLevel(idx, { openingStock: '' })}
                                                    className="absolute left-1 top-1 w-8 h-8 text-slate-400 hover:text-slate-600 cursor-pointer rounded-lg"
                                                >
                                                    <X className="w-3.5 h-3.5" />
                                                </Button>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* شريط معادلة التحويل والحساب التلقائي للصيدليات والمستويات */}
                            {!isFirst && (
                                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 px-3.5 py-2.5 rounded-xl bg-blue-50/80 dark:bg-blue-950/30 border border-blue-200/70 dark:border-blue-900/50 text-xs">
                                    <div className="flex items-center gap-2 font-bold text-blue-900 dark:text-blue-200">
                                        <span className="text-2xs font-black">
                                            {isPharmacy ? 'معادلة تفكيك الدواء:' : 'معادلة التفكيك:'}
                                        </span>
                                        <span className="font-mono bg-surface px-2.5 py-0.5 rounded-lg border border-blue-200 dark:border-blue-800 text-xs shadow-2xs">
                                            1 {unitLevels[idx - 1]?.unitName || (isPharmacy ? (idx === 1 ? 'علبة' : 'شريط') : `المستوى ${idx}`)} = {lvl.conversionFactor || 1} {lvl.unitName || (isPharmacy ? (idx === 1 ? 'شريط' : 'قرص') : `المستوى ${idx + 1}`)}
                                        </span>
                                    </div>

                                    {unitLevels[idx - 1]?.salePrice && parseFloat(unitLevels[idx - 1].salePrice) > 0 && (
                                        <Button
                                            type="button"
                                            variant="ghost"
                                            size="sm"
                                            onClick={() => {
                                                const factor = parseFloat(lvl.conversionFactor) || 1;
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
                                            className="h-7 px-3 text-2xs font-black text-blue-700 dark:text-blue-300 hover:bg-blue-100 dark:hover:bg-blue-900/50 rounded-lg cursor-pointer gap-1 transition-colors self-start sm:self-auto"
                                        >
                                            <TrendingUp className="w-3 h-3 text-blue-600" />
                                            <span>تحديث السعر تلقائياً (قسمة على المعامل)</span>
                                        </Button>
                                    )}
                                </div>
                            )}

                            {/* السطر الثاني: سعر الشراء، الخصم، وسويتش تسعير مزدوج */}
                            <div className="grid grid-cols-1 sm:grid-cols-12 gap-3 items-end pt-1">
                                <div className="sm:col-span-4">
                                    <Label className="block text-2xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                                        سعر الشراء (التكلفة)
                                    </Label>
                                    <Input
                                        type="number"
                                        min={0}
                                        step="any"
                                        value={lvl.purchasePrice}
                                        onChange={(e) =>
                                            updateUnitLevel(idx, { purchasePrice: e.target.value })
                                        }
                                        placeholder="0.00"
                                        className="h-10 text-xs font-mono font-bold rounded-xl"
                                    />
                                </div>

                                <div className="sm:col-span-5">
                                    <Label className="block text-2xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                                        الخصم المكتسب
                                    </Label>
                                    <div className="flex gap-1.5">
                                        <Input
                                            type="number"
                                            min={0}
                                            value={lvl.discountValue}
                                            onChange={(e) =>
                                                updateUnitLevel(idx, { discountValue: e.target.value })
                                            }
                                            placeholder="0"
                                            className="h-10 text-xs font-mono rounded-xl flex-1"
                                        />
                                        <Button
                                            type="button"
                                            onClick={() =>
                                                updateUnitLevel(idx, {
                                                    discountType:
                                                        lvl.discountType === 'percent' ? 'amount' : 'percent',
                                                })
                                            }
                                            className="h-10 px-3.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-black shrink-0 cursor-pointer shadow-2xs"
                                        >
                                            {lvl.discountType === 'percent' ? '%' : 'ج.م'}
                                        </Button>
                                    </div>
                                    {lvl.discountValue && parseFloat(lvl.discountValue) > 0 && priceDetails.grossCost > 0 && (
                                        <div className="flex items-center justify-between mt-1 px-1 text-3xs font-bold">
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

                                <div className="sm:col-span-3">
                                    <div className="flex items-center justify-between p-2.5 h-10 rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200/60 dark:border-slate-800">
                                        <span className="text-2xs sm:text-xs font-bold text-slate-700 dark:text-slate-300">
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
                            </div>

                            {/* السطر الثالث: أسعار البيع وهامش الربح */}
                            <div className="grid grid-cols-1 sm:grid-cols-12 gap-3 items-end pt-1">
                                {lvl.dualPricing ? (
                                    <>
                                        <div className="sm:col-span-4">
                                            <Label className="block text-2xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
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
                                                placeholder="0.00"
                                                className="h-10 text-xs font-mono font-bold text-slate-700 dark:text-slate-300 rounded-xl"
                                            />
                                        </div>

                                        <div className="sm:col-span-5">
                                            <Label className="block text-2xs font-bold text-slate-900 dark:text-white mb-1.5">
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
                                                placeholder="0.00"
                                                className="h-10 text-xs font-mono font-black text-slate-900 dark:text-white rounded-xl"
                                            />
                                        </div>
                                    </>
                                ) : (
                                    <div className="sm:col-span-9">
                                        <Label className="block text-2xs font-bold text-slate-900 dark:text-white mb-1.5">
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
                                            placeholder="0.00"
                                            className="h-10 text-xs font-mono font-black text-slate-900 dark:text-white rounded-xl"
                                        />
                                    </div>
                                )}

                                <div
                                    className={`sm:col-span-3 min-h-10 py-1.5 px-2 rounded-xl border flex flex-col items-center justify-center transition-all ${
                                        priceDetails.marginPercent < 0
                                            ? 'bg-red-50/60 dark:bg-red-950/40 border-red-200 dark:border-red-800/80 text-red-700 dark:text-red-400'
                                            : 'bg-emerald-50/60 dark:bg-emerald-950/40 border-emerald-200 dark:border-emerald-800/80 text-emerald-800 dark:text-emerald-300'
                                    }`}
                                    title={`صافي التكلفة: ${priceDetails.netCost.toFixed(2)} ج.م | الربح: ${priceDetails.profitText}`}
                                >
                                    <div className="flex items-center gap-1 text-3xs font-bold">
                                        <TrendingUp className="w-3 h-3" />
                                        <span>هامش الربح</span>
                                    </div>
                                    <span className="text-xs font-black font-mono">
                                        {priceDetails.marginText}
                                    </span>
                                    {priceDetails.salePrice > 0 && priceDetails.grossCost > 0 && (
                                        <span className="text-4xs font-bold font-mono opacity-80">
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
                    className="w-full h-11 rounded-2xl bg-emerald-50/80 hover:bg-emerald-100 dark:bg-emerald-950/40 dark:hover:bg-emerald-900/50 border-dashed border-emerald-300 dark:border-emerald-800 text-emerald-700 dark:text-emerald-300 text-xs font-black flex items-center justify-center gap-2 cursor-pointer shadow-xs transition-all"
                >
                    <Plus className="w-4 h-4" />
                    <span>
                        {isPharmacy
                            ? `إضافة وحدة دوائية أصغر (مثل: ${unitLevels.length === 1 ? 'شريط' : 'قرص'})`
                            : `إضافة وحدة أصغر (المستوى ${unitLevels.length + 1})`}
                    </span>
                </Button>
            )}
        </div>
    );
};