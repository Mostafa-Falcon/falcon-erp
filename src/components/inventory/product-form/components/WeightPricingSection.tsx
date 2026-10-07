import React from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { Button } from '@/components/ui/button';
import { Scale, TrendingUp } from 'lucide-react';
import { calculatePriceDetails } from '../utils';

interface WeightPricingSectionProps {
    weightUnitName: string;
    scaleCode: string;
    setScaleCode: (val: string) => void;
    weightOpeningStock: string;
    setWeightOpeningStock: (val: string) => void;
    weightPurchasePrice: string;
    setWeightPurchasePrice: (val: string) => void;
    weightDualPricing: boolean;
    setWeightDualPricing: (val: boolean) => void;
    weightDiscount: string;
    setWeightDiscount: (val: string) => void;
    weightDiscountType: 'percent' | 'amount';
    setWeightDiscountType: React.Dispatch<React.SetStateAction<'percent' | 'amount'>>;
    weightOldSalePrice: string;
    setWeightOldSalePrice: (val: string) => void;
    weightNewSalePrice: string;
    setWeightNewSalePrice: (val: string) => void;
    weightSalePrice: string;
    setWeightSalePrice: (val: string) => void;
}

export const WeightPricingSection: React.FC<WeightPricingSectionProps> = ({
    weightUnitName,
    scaleCode,
    setScaleCode,
    weightOpeningStock,
    setWeightOpeningStock,
    weightPurchasePrice,
    setWeightPurchasePrice,
    weightDualPricing,
    setWeightDualPricing,
    weightDiscount,
    setWeightDiscount,
    weightDiscountType,
    setWeightDiscountType,
    weightOldSalePrice,
    setWeightOldSalePrice,
    weightNewSalePrice,
    setWeightNewSalePrice,
    weightSalePrice,
    setWeightSalePrice,
}) => {
    const activeSale = weightDualPricing
        ? weightNewSalePrice || weightSalePrice
        : weightSalePrice;
    const priceDetails = calculatePriceDetails(
        weightPurchasePrice,
        activeSale,
        weightDiscount,
        weightDiscountType
    );

    return (
        <Card className="border border-blue-200 dark:border-blue-900/60 bg-surface shadow-xs rounded-2xl">
            <CardHeader className="pb-3 border-b border-slate-100 dark:border-slate-800">
                <CardTitle className="text-sm font-black text-slate-800 dark:text-slate-200 flex items-center gap-2">
                    <Scale className="w-5 h-5 text-blue-600" />
                    <span>بيانات تسعير الوزن (كيلوجرام / ميزان إلكتروني)</span>
                </CardTitle>
            </CardHeader>
            <CardContent className="p-5 space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div>
                        <Label className="block text-xs font-black text-slate-700 dark:text-slate-300 mb-2">
                            الوحدة الأساسية
                        </Label>
                        <Input
                            type="text"
                            disabled
                            value={weightUnitName}
                            className="h-11 font-bold text-xs opacity-75"
                        />
                    </div>

                    <div>
                        <Label className="block text-xs font-black text-slate-700 dark:text-slate-300 mb-2">
                            الرصيد الافتتاحي (كجم)
                        </Label>
                        <Input
                            type="number"
                            min={0}
                            step="any"
                            value={weightOpeningStock}
                            onChange={(e) => setWeightOpeningStock(e.target.value)}
                            placeholder=""
                            className="h-11 text-sm font-mono font-bold"
                        />
                    </div>

                    <div>
                        <Label className="block text-xs font-black text-blue-700 dark:text-blue-300 mb-2">
                            كود الميزان الإلكتروني (PLU)
                        </Label>
                        <Input
                            type="text"
                            value={scaleCode}
                            onChange={(e) => setScaleCode(e.target.value)}
                            placeholder="كود الباركود الوزني"
                            className="h-11 text-sm font-mono"
                        />
                    </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 items-end">
                    <div>
                        <Label className="block text-xs font-black text-slate-700 dark:text-slate-300 mb-2">
                            سعر شراء الكيلو
                        </Label>
                        <Input
                            type="number"
                            min={0}
                            step="any"
                            value={weightPurchasePrice}
                            onChange={(e) => setWeightPurchasePrice(e.target.value)}
                            placeholder=""
                            className="h-11 text-sm font-mono font-bold"
                        />
                    </div>

                    <div className="flex items-center justify-between p-2.5 h-11 rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-slate-100 dark:border-slate-800">
                        <span className="text-xs font-black text-slate-600 dark:text-slate-400">
                            تسعير مزدوج
                        </span>
                        <Switch
                            checked={weightDualPricing}
                            onCheckedChange={setWeightDualPricing}
                        />
                    </div>

                    <div>
                        <Label className="block text-xs font-black text-slate-700 dark:text-slate-300 mb-2">
                            الخصم
                        </Label>
                        <div className="flex gap-1.5">
                            <Input
                                type="number"
                                min={0}
                                value={weightDiscount}
                                onChange={(e) => setWeightDiscount(e.target.value)}
                                placeholder=""
                                className="h-11 text-xs font-mono flex-1"
                            />
                            <Button
                                type="button"
                                onClick={() =>
                                    setWeightDiscountType((prev) =>
                                        prev === 'percent' ? 'amount' : 'percent'
                                    )
                                }
                                className="h-11 px-3.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-black shrink-0 cursor-pointer shadow-2xs"
                            >
                                {weightDiscountType === 'percent' ? '%' : 'ج.م'}
                            </Button>
                        </div>
                        {weightDiscount && parseFloat(weightDiscount) > 0 && priceDetails.grossCost > 0 && (
                            <div className="flex items-center justify-between mt-1 px-1 text-3xs font-bold">
                                <span className="text-slate-600 dark:text-slate-400">
                                    صافي الشراء:{''}
                                    <strong className="text-blue-700 dark:text-blue-400 font-mono">
                                        {priceDetails.netCost.toFixed(2)} ج.م
                                    </strong>
                                </span>
                                <span className="text-slate-400 font-mono">
                                    (خصم {priceDetails.discountAmount.toFixed(2)} ج.م)
                                </span>
                            </div>
                        )}
                    </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-12 gap-3 items-end">
                    {weightDualPricing ? (
                        <>
                            <div className="sm:col-span-5">
                                <Label className="block text-xs font-black text-slate-700 dark:text-slate-300 mb-2">
                                    سعر بيع الكيلو القديم
                                </Label>
                                <Input
                                    type="number"
                                    min={0}
                                    step="any"
                                    value={weightOldSalePrice}
                                    onChange={(e) => setWeightOldSalePrice(e.target.value)}
                                    placeholder=""
                                    className="h-11 text-sm font-mono font-bold text-slate-700 dark:text-slate-300"
                                />
                            </div>
                            <div className="sm:col-span-5">
                                <Label className="block text-xs font-black text-slate-700 dark:text-slate-300 mb-2">
                                    سعر بيع الكيلو الجديد *
                                </Label>
                                <Input
                                    type="number"
                                    min={0}
                                    step="any"
                                    value={weightNewSalePrice}
                                    onChange={(e) => {
                                        setWeightNewSalePrice(e.target.value);
                                        setWeightSalePrice(e.target.value);
                                    }}
                                    placeholder=""
                                    className="h-11 text-sm font-mono font-black text-blue-600"
                                />
                            </div>
                        </>
                    ) : (
                        <div className="sm:col-span-10">
                            <Label className="block text-xs font-black text-slate-700 dark:text-slate-300 mb-2">
                                سعر بيع الكيلو الحالي *
                            </Label>
                            <Input
                                type="number"
                                min={0}
                                step="any"
                                value={weightSalePrice}
                                onChange={(e) => {
                                    setWeightSalePrice(e.target.value);
                                    setWeightNewSalePrice(e.target.value);
                                }}
                                placeholder=""
                                className="h-11 text-sm font-mono font-black text-emerald-600"
                            />
                        </div>
                    )}

                    <div
                        className={`sm:col-span-2 min-h-11 py-1 px-1.5 rounded-xl border flex flex-col items-center justify-center transition-all ${priceDetails.marginPercent < 0
                            ? 'bg-red-50/60 dark:bg-red-950/40 border-red-200 dark:border-red-800/80 text-red-700 dark:text-red-400'
                            : 'bg-emerald-50/60 dark:bg-emerald-950/40 border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-300'
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
};