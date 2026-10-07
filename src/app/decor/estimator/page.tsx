'use client';

import React, { useState, useMemo } from 'react';
import { AppShell } from '@/components/layout/AppShell';
import {
  Ruler,
  Calculator,
  Plus,
  Trash2,
  Printer,
  Sparkles,
  Layers,
  CheckCircle2,
  Maximize2,
  FileText,
  BadgeDollarSign,
  RotateCcw,
  Boxes,
  Hammer
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { formatNumber } from '@/lib/format';
import { toast } from 'sonner';

interface EstimateLine {
  id: string;
  category: string;
  name: string;
  length: number;
  heightOrWidth: number;
  count: number;
  wastagePercent: number;
  netArea: number;
  grossArea: number;
  unit: string;
  materialPricePerUnit: number;
  laborPricePerUnit: number;
  totalCostPerUnit: number;
  marginPercent: number;
  salePricePerUnit: number;
  totalSalePrice: number;
}

const PRESET_MATERIALS = [
  { category: 'واجهات وأبواب', name: 'كلادينج خليجي 4 مم مع شاسيه حديد', unit: 'م²', matCost: 800, laborCost: 250, defaultMargin: 30 },
  { category: 'واجهات وأبواب', name: 'زجاج سيكوريت 10 مم شفاف مع ماكينة إيطالي', unit: 'م²', matCost: 1050, laborCost: 300, defaultMargin: 35 },
  { category: 'أسقف وجبس بورد', name: 'أسقف معلقة كناوف أخضر/أبيض مقاوم للرطوبة', unit: 'م²', matCost: 180, laborCost: 120, defaultMargin: 25 },
  { category: 'حوائط وتجليد', name: 'تجليد بديل خشب PVC كوري عالي الجودة', unit: 'م²', matCost: 320, laborCost: 110, defaultMargin: 30 },
  { category: 'حوائط وتجليد', name: 'ألواح بديل رخام UV 3 مم مع الفواصل الذهبية', unit: 'م²', matCost: 380, laborCost: 120, defaultMargin: 30 },
  { category: 'أرضيات تجارية', name: 'باركيه ألماني HDF كلاس 32 شامل الفوم والوزرات', unit: 'م²', matCost: 280, laborCost: 70, defaultMargin: 25 },
  { category: 'أرضيات تجارية', name: 'إيبوكسي أرضيات تجاري مقاوم للاحتكاك 3D', unit: 'م²', matCost: 340, laborCost: 160, defaultMargin: 35 },
  { category: 'إضاءة وليد', name: 'ليد بروفايل ألومنيوم غاطس مع محول أصلي', unit: 'م.ط', matCost: 95, laborCost: 45, defaultMargin: 35 },
];

export default function DecorEstimatorPage() {
  const [estimateLines, setEstimateLines] = useState<EstimateLine[]>([
    {
      id: 'est-1',
      category: 'واجهات وأبواب',
      name: 'كلادينج واجهة المحل الخارجية',
      length: 6,
      heightOrWidth: 3.2,
      count: 1,
      wastagePercent: 7,
      netArea: 19.2,
      grossArea: 20.54,
      unit: 'م²',
      materialPricePerUnit: 800,
      laborPricePerUnit: 250,
      totalCostPerUnit: 1050,
      marginPercent: 30,
      salePricePerUnit: 1365,
      totalSalePrice: 28037,
    },
    {
      id: 'est-2',
      category: 'أسقف وجبس بورد',
      name: 'أسقف معلقة جبس بورد كناوف',
      length: 8,
      heightOrWidth: 5,
      count: 1,
      wastagePercent: 5,
      netArea: 40,
      grossArea: 42,
      unit: 'م²',
      materialPricePerUnit: 180,
      laborPricePerUnit: 120,
      totalCostPerUnit: 300,
      marginPercent: 25,
      salePricePerUnit: 375,
      totalSalePrice: 15750,
    },
  ]);

  // Selected Preset
  const [selectedPresetIndex, setSelectedPresetIndex] = useState(0);
  const activePreset = PRESET_MATERIALS[selectedPresetIndex];

  // Calculator Inputs
  const [customName, setCustomName] = useState(activePreset.name);
  const [length, setLength] = useState<number>(4);
  const [heightOrWidth, setHeightOrWidth] = useState<number>(2.8);
  const [count, setCount] = useState<number>(1);
  const [wastagePercent, setWastagePercent] = useState<number>(5);
  const [materialCost, setMaterialCost] = useState<number>(activePreset.matCost);
  const [laborCost, setLaborCost] = useState<number>(activePreset.laborCost);
  const [marginPercent, setMarginPercent] = useState<number>(activePreset.defaultMargin);

  // When changing preset
  const handlePresetSelect = (idx: number) => {
    setSelectedPresetIndex(idx);
    const p = PRESET_MATERIALS[idx];
    setCustomName(p.name);
    setMaterialCost(p.matCost);
    setLaborCost(p.laborCost);
    setMarginPercent(p.defaultMargin);
  };

  // Dynamic Live Calculations for current item
  const liveNetArea = useMemo(() => {
    return Math.round(length * heightOrWidth * count * 100) / 100;
  }, [length, heightOrWidth, count]);

  const liveGrossArea = useMemo(() => {
    const w = liveNetArea * (wastagePercent / 100);
    return Math.round((liveNetArea + w) * 100) / 100;
  }, [liveNetArea, wastagePercent]);

  const liveTotalCostPerUnit = useMemo(() => {
    return materialCost + laborCost;
  }, [materialCost, laborCost]);

  const liveSalePricePerUnit = useMemo(() => {
    return Math.round(liveTotalCostPerUnit * (1 + marginPercent / 100));
  }, [liveTotalCostPerUnit, marginPercent]);

  const liveTotalSale = useMemo(() => {
    return Math.round(liveGrossArea * liveSalePricePerUnit);
  }, [liveGrossArea, liveSalePricePerUnit]);

  // Add Item to Estimate
  const handleAddEstimateLine = () => {
    if (liveGrossArea <= 0) {
      toast.error('المساحة المحسوبة يجب أن تكون أكبر من صفر');
      return;
    }

    const newLine: EstimateLine = {
      id: `est-${Date.now()}`,
      category: activePreset.category,
      name: customName.trim() || activePreset.name,
      length,
      heightOrWidth,
      count,
      wastagePercent,
      netArea: liveNetArea,
      grossArea: liveGrossArea,
      unit: activePreset.unit,
      materialPricePerUnit: materialCost,
      laborPricePerUnit: laborCost,
      totalCostPerUnit: liveTotalCostPerUnit,
      marginPercent,
      salePricePerUnit: liveSalePricePerUnit,
      totalSalePrice: liveTotalSale,
    };

    setEstimateLines([...estimateLines, newLine]);
    toast.success(`تمت إضافة بند: ${newLine.name}`);
  };

  // Remove line
  const handleRemoveLine = (id: string) => {
    setEstimateLines(estimateLines.filter((l) => l.id !== id));
  };

  // Overall Totals
  const totalNetAreaSum = useMemo(() => {
    return estimateLines.reduce((acc, l) => acc + l.netArea, 0);
  }, [estimateLines]);

  const totalEstimatePrice = useMemo(() => {
    return estimateLines.reduce((acc, l) => acc + l.totalSalePrice, 0);
  }, [estimateLines]);

  return (
    <AppShell title="حاسبة المقاسات والخامات الميدانية">
      <div className="flex flex-col gap-5 p-3 sm:p-6 select-none" dir="rtl">
        {/* Header */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-surface p-4 sm:p-5 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-2xs">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-blue-600 to-indigo-700 flex items-center justify-center text-white text-xl shadow-xs shrink-0">
              📐
            </div>
            <div>
              <h1 className="text-lg sm:text-xl font-black text-slate-900 dark:text-white">
                حاسبة الأمتار والخامات ومقايسات التجهيز (م² / م.ط)
              </h1>
              <p className="text-xs text-slate-500 dark:text-slate-400 font-medium mt-0.5">
                حساب مسطحات الجدران والواجهات، نسبة الهالك، تكلفة الخامات والمصنعيات، وهامش الربح
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => {
                if (estimateLines.length === 0) {
                  toast.error('لا توجد بنود لطباعتها بالمقايسة');
                  return;
                }
                window.print();
              }}
              className="px-4 py-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 text-slate-800 dark:text-slate-200 rounded-xl font-bold text-xs flex items-center gap-2 transition-colors cursor-pointer"
            >
              <Printer className="w-4 h-4" />
              <span>طباعة المقايسة التقديرية</span>
            </button>
          </div>
        </div>

        {/* 2-Columns: Calculator Inputs on Left, Current Estimate Sheet on Right */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
          {/* ========================================================= */}
          {/* Column 1: Live Interactive Calculator (5 cols)           */}
          {/* ========================================================= */}
          <div className="lg:col-span-5 bg-surface rounded-2xl border border-slate-200/80 dark:border-slate-800 p-4 sm:p-5 flex flex-col gap-4 shadow-2xs">
            <div className="flex items-center gap-2 pb-2 border-b border-slate-100 dark:border-slate-800">
              <Calculator className="w-4 h-4 text-amber-500" />
              <h3 className="font-black text-sm text-slate-900 dark:text-white">
                حاسبة المقاس والتكلفة التقديرية
              </h3>
            </div>

            {/* Quick Presets Picker */}
            <div className="space-y-1.5">
              <label className="text-3xs font-bold text-slate-500 block">
                اختر نوع الخامة أو البند المطلوب حسابه:
              </label>
              <div className="grid grid-cols-2 gap-1.5 max-h-36 overflow-y-auto no-scrollbar p-1 bg-slate-50 dark:bg-slate-900/50 rounded-xl border border-slate-200/60 dark:border-slate-800">
                {PRESET_MATERIALS.map((p, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => handlePresetSelect(idx)}
                    className={`p-2 rounded-lg text-right text-3xs font-bold transition-all cursor-pointer ${
                      selectedPresetIndex === idx
                        ? 'bg-amber-600 text-white shadow-2xs'
                        : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-amber-50'
                    }`}
                  >
                    <span className="block truncate">{p.name}</span>
                    <span className="text-3xs opacity-80 block mt-0.5">{p.unit}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Item Title Input */}
            <div className="space-y-1">
              <label className="text-3xs font-bold text-slate-500 block">
                توصيف البند بالمقايسة:
              </label>
              <input
                type="text"
                value={customName}
                onChange={(e) => setCustomName(e.target.value)}
                className="w-full h-8.5 px-3 text-xs bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl font-bold"
              />
            </div>

            {/* Dimensional inputs */}
            <div className="grid grid-cols-3 gap-2">
              <div className="space-y-1">
                <label className="text-3xs font-bold text-slate-500 block">
                  الطول (متر)
                </label>
                <input
                  type="number"
                  step="0.1"
                  value={length}
                  onChange={(e) => setLength(Number(e.target.value) || 0)}
                  className="w-full h-8.5 text-center text-xs bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl font-bold"
                />
              </div>

              <div className="space-y-1">
                <label className="text-3xs font-bold text-slate-500 block">
                  الارتفاع / العرض (م)
                </label>
                <input
                  type="number"
                  step="0.1"
                  value={heightOrWidth}
                  onChange={(e) => setHeightOrWidth(Number(e.target.value) || 0)}
                  className="w-full h-8.5 text-center text-xs bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl font-bold"
                />
              </div>

              <div className="space-y-1">
                <label className="text-3xs font-bold text-slate-500 block">
                  التكرار (العدد)
                </label>
                <input
                  type="number"
                  min="1"
                  value={count}
                  onChange={(e) => setCount(Number(e.target.value) || 1)}
                  className="w-full h-8.5 text-center text-xs bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl font-bold"
                />
              </div>
            </div>

            {/* Wastage and Pricing Inputs */}
            <div className="grid grid-cols-3 gap-2">
              <div className="space-y-1">
                <label className="text-3xs font-bold text-slate-500 block">
                  نسبة الهالك %
                </label>
                <input
                  type="number"
                  value={wastagePercent}
                  onChange={(e) => setWastagePercent(Number(e.target.value) || 0)}
                  className="w-full h-8.5 text-center text-xs bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl font-bold text-amber-600"
                />
              </div>

              <div className="space-y-1">
                <label className="text-3xs font-bold text-slate-500 block">
                  خامات (ج.م/{activePreset.unit})
                </label>
                <input
                  type="number"
                  value={materialCost}
                  onChange={(e) => setMaterialCost(Number(e.target.value) || 0)}
                  className="w-full h-8.5 text-center text-xs bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl font-bold"
                />
              </div>

              <div className="space-y-1">
                <label className="text-3xs font-bold text-slate-500 block">
                  مصنعية (ج.م/{activePreset.unit})
                </label>
                <input
                  type="number"
                  value={laborCost}
                  onChange={(e) => setLaborCost(Number(e.target.value) || 0)}
                  className="w-full h-8.5 text-center text-xs bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl font-bold"
                />
              </div>
            </div>

            {/* Profit Margin % */}
            <div className="space-y-1">
              <div className="flex items-center justify-between text-3xs font-bold">
                <span className="text-slate-500">هامش ربح الشركة والمقايسة:</span>
                <span className="text-amber-600 dark:text-amber-400">{marginPercent}%</span>
              </div>
              <input
                type="range"
                min="10"
                max="60"
                step="5"
                value={marginPercent}
                onChange={(e) => setMarginPercent(Number(e.target.value))}
                className="w-full accent-amber-600 cursor-pointer"
              />
            </div>

            {/* Calculation Result Callout Box */}
            <div className="p-3.5 rounded-2xl bg-amber-50/80 dark:bg-amber-950/40 border border-amber-200/80 dark:border-amber-900/50 space-y-2">
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div>
                  <span className="text-3xs text-slate-500 block font-medium">المساحة الصافية:</span>
                  <span className="font-black text-slate-800 dark:text-slate-200">
                    {liveNetArea} {activePreset.unit}
                  </span>
                </div>
                <div>
                  <span className="text-3xs text-slate-500 block font-medium">المساحة + الهالك:</span>
                  <span className="font-black text-amber-700 dark:text-amber-400">
                    {liveGrossArea} {activePreset.unit}
                  </span>
                </div>
                <div>
                  <span className="text-3xs text-slate-500 block font-medium">سعر بيع المتر للعميل:</span>
                  <span className="font-black text-slate-800 dark:text-slate-200">
                    {formatNumber(liveSalePricePerUnit)} ج.م
                  </span>
                </div>
                <div>
                  <span className="text-3xs text-slate-500 block font-medium">إجمالي قيمة البند:</span>
                  <span className="font-black text-amber-600 dark:text-amber-400 text-sm">
                    {formatNumber(liveTotalSale)} ج.م
                  </span>
                </div>
              </div>
            </div>

            {/* Insert Button */}
            <button
              type="button"
              onClick={handleAddEstimateLine}
              className="w-full py-2.5 rounded-xl bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs flex items-center justify-center gap-2 shadow-xs cursor-pointer transition-all"
            >
              <Plus className="w-4 h-4" />
              <span>إدراج البند في جدول المقايسة</span>
            </button>
          </div>

          {/* ========================================================= */}
          {/* Column 2: Estimate Breakdown Table (7 cols)               */}
          {/* ========================================================= */}
          <div className="lg:col-span-7 bg-surface rounded-2xl border border-slate-200/80 dark:border-slate-800 p-4 sm:p-5 flex flex-col justify-between shadow-2xs gap-4">
            <div>
              <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
                <div className="flex items-center gap-2">
                  <FileText className="w-4 h-4 text-amber-600" />
                  <h3 className="font-black text-sm text-slate-900 dark:text-white">
                    جدول بنود المقايسة الميدانية ({estimateLines.length})
                  </h3>
                </div>
                {estimateLines.length > 0 && (
                  <button
                    type="button"
                    onClick={() => setEstimateLines([])}
                    className="text-3xs text-rose-600 font-bold hover:underline cursor-pointer"
                  >
                    مسح كافة البنود
                  </button>
                )}
              </div>

              {/* Table */}
              <div className="mt-3 overflow-x-auto">
                {estimateLines.length === 0 ? (
                  <div className="text-center py-12 text-slate-400">
                    <Ruler className="w-10 h-10 mx-auto text-slate-300 dark:text-slate-700 mb-2 stroke-[1.5]" />
                    <p className="font-bold text-xs">لا توجد بنود مضافة للمقايسة بعد</p>
                    <p className="text-3xs text-slate-400 mt-1">
                      استخدم الحاسبة بالجانب الأيمن لحساب الأمتار وإدراج البنود
                    </p>
                  </div>
                ) : (
                  <table className="w-full text-right text-xs">
                    <thead>
                      <tr className="border-b border-slate-100 dark:border-slate-800 text-slate-400 text-3xs font-bold">
                        <th className="pb-2">البند والمواصفة</th>
                        <th className="pb-2 text-center">الأبعاد</th>
                        <th className="pb-2 text-center">المساحة (م²)</th>
                        <th className="pb-2 text-center">سعر المتر</th>
                        <th className="pb-2 text-left">الإجمالي</th>
                        <th className="pb-2 text-center w-8"></th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800/80">
                      {estimateLines.map((line) => (
                        <tr key={line.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-900/40">
                          <td className="py-2.5 font-bold text-slate-900 dark:text-white">
                            <div>{line.name}</div>
                            <span className="text-3xs text-slate-400 block font-normal">
                              {line.category}
                            </span>
                          </td>
                          <td className="py-2.5 text-center text-3xs text-slate-500 font-mono">
                            {line.length}×{line.heightOrWidth} ({line.count})
                          </td>
                          <td className="py-2.5 text-center font-bold text-slate-800 dark:text-slate-200">
                            {line.grossArea} {line.unit}
                          </td>
                          <td className="py-2.5 text-center text-slate-600 dark:text-slate-300">
                            {formatNumber(line.salePricePerUnit)}
                          </td>
                          <td className="py-2.5 text-left font-black text-amber-600 dark:text-amber-400">
                            {formatNumber(line.totalSalePrice)} ج.م
                          </td>
                          <td className="py-2.5 text-center">
                            <button
                              type="button"
                              onClick={() => handleRemoveLine(line.id)}
                              className="text-slate-400 hover:text-rose-600 p-1 rounded-md"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            </div>

            {/* Summary Totals Footer */}
            {estimateLines.length > 0 && (
              <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                <div className="space-y-0.5">
                  <span className="text-3xs text-slate-400 block font-medium">
                    إجمالي المساحة المقدرة للبنود:
                  </span>
                  <span className="text-xs font-bold text-slate-800 dark:text-slate-200">
                    {Math.round(totalNetAreaSum * 100) / 100} متر مسطح
                  </span>
                </div>

                <div className="flex items-center gap-4">
                  <div className="text-left">
                    <span className="text-3xs text-slate-400 block font-medium">
                      إجمالي قيمة المقايسة للعميل:
                    </span>
                    <span className="text-lg font-black text-amber-600 dark:text-amber-400">
                      {formatNumber(totalEstimatePrice)} ج.م
                    </span>
                  </div>

                  <button
                    type="button"
                    onClick={() => {
                      toast.success('تم تصدير المقايسة وحفظها كمسودة مشروع');
                    }}
                    className="px-4 py-2.5 rounded-xl bg-amber-600 hover:bg-amber-700 text-white font-black text-xs shadow-xs cursor-pointer"
                  >
                    اعتماد كمشروع
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </AppShell>
  );
}
