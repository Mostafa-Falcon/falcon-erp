import React from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { DatePicker } from '@/components/ui/date-picker';
import { Clock, Info, Trash2, Calendar as CalendarIcon, Plus, Wand2 } from 'lucide-react';
import type { FormBatchEntry, UnitLevelItem, ItemTypeMode } from '../types';
import { generateAutoBatchNumber } from '../utils';

interface ExpiryBatchesSectionProps {
  enableExpiryTracking: boolean;
  setEnableExpiryTracking: (val: boolean) => void;
  batchEntries: FormBatchEntry[];
  itemTypeMode: ItemTypeMode;
  unitLevels: UnitLevelItem[];
  handleAddBatch: () => void;
  handleUpdateBatch: (idx: number, patch: Partial<FormBatchEntry>) => void;
  handleRemoveBatch: (idx: number) => void;
  isPharmacy?: boolean;
}

export const ExpiryBatchesSection: React.FC<ExpiryBatchesSectionProps> = ({
  enableExpiryTracking,
  setEnableExpiryTracking,
  batchEntries,
  itemTypeMode,
  unitLevels,
  handleAddBatch,
  handleUpdateBatch,
  handleRemoveBatch,
  isPharmacy = false,
}) => {
  return (
    <Card className="border border-slate-200/90 dark:border-slate-800 bg-white dark:bg-[#131b2e] shadow-xs rounded-2xl">
      <CardHeader className="pb-3 border-b border-slate-100 dark:border-slate-800">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm font-black text-slate-800 dark:text-slate-200 flex items-center gap-2">
            <Clock className="w-4 h-4 text-emerald-600" />
            <span>
              {isPharmacy
                ? 'تواريخ الصلاحية وأرقام التشغيلات للأدوية (Lots & Expiry)'
                : 'تواريخ الصلاحية والتشغيلات'}
            </span>
          </CardTitle>
          <div className="flex items-center gap-2.5">
            <span className="text-xs font-black text-slate-700 dark:text-slate-300">
              تفعيل تتبع الصلاحية والتشغيلات
            </span>
            <Switch
              checked={enableExpiryTracking}
              onCheckedChange={setEnableExpiryTracking}
            />
          </div>
        </div>
      </CardHeader>
      <CardContent className="p-4 sm:p-5">
        {enableExpiryTracking ? (
          <div className="space-y-4">
            {isPharmacy && (
              <div className="p-3 rounded-xl bg-emerald-50/80 dark:bg-emerald-950/40 border border-emerald-200/80 dark:border-emerald-800 text-xs font-bold text-emerald-900 dark:text-emerald-200 flex items-center gap-2">
                <Info className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>
                  تتبع تواريخ الصلاحية وأرقام التشغيلات (Lot / Batch) مفعّل تلقائياً لمنع بيع الأدوية منتهية الصلاحية وإصدار التنبيهات.
                </span>
              </div>
            )}

            {batchEntries.length === 0 ? (
              <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200/80 dark:border-slate-800 flex items-center justify-center gap-2 text-slate-600 dark:text-slate-400 text-xs font-medium">
                <Info className="w-4 h-4 text-slate-400" />
                <span>
                  لم تتم إضافة أي تواريخ صلاحية بعد. اضغط على &apos;[إضافة تاريخ جديد]&apos; بالأسفل.
                </span>
              </div>
            ) : (
              <div className="space-y-3">
                {batchEntries.map((b, idx) => {
                  const currentDateObj =
                    b.year && b.month && b.day
                      ? new Date(
                          parseInt(b.year, 10),
                          parseInt(b.month, 10) - 1,
                          parseInt(b.day, 10)
                        )
                      : undefined;

                  return (
                    <div
                      key={b.id}
                      className="p-3.5 rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-900/40 grid grid-cols-1 sm:grid-cols-12 gap-3 items-end"
                    >
                      {/* 1. الكمية */}
                      <div className="sm:col-span-2">
                        <Label className="block text-[11px] font-black text-slate-500 mb-1">
                          الكمية
                        </Label>
                        <Input
                          type="number"
                          min={1}
                          step="any"
                          value={b.quantity}
                          onChange={(e) =>
                            handleUpdateBatch(idx, { quantity: e.target.value })
                          }
                          placeholder="1"
                          className="h-10 text-xs font-mono font-bold"
                        />
                      </div>

                      {/* 2. الوحدة المرتبطة */}
                      <div className="sm:col-span-3">
                        <Label className="block text-[11px] font-black text-slate-500 mb-1">
                          الوحدة المرتبطة
                        </Label>
                        <Select
                          value={b.unitLevelId}
                          onValueChange={(val) =>
                            handleUpdateBatch(idx, { unitLevelId: val })
                          }
                        >
                          <SelectTrigger className="w-full h-10 bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold">
                            <SelectValue placeholder="اختر الوحدة..." />
                          </SelectTrigger>
                          <SelectContent>
                            {itemTypeMode === 'unit' ? (
                              <>
                                <SelectItem value="level-1">
                                  {unitLevels[0]?.unitName
                                    ? `${unitLevels[0].unitName} (المستوى 1)`
                                    : 'الوحدة الأساسية (المستوى 1)'}
                                </SelectItem>
                                {unitLevels.length > 1 && (
                                  <SelectItem value="level-2">
                                    {unitLevels[1]?.unitName
                                      ? `${unitLevels[1].unitName} (المستوى 2)`
                                      : 'المستوى 2'}
                                  </SelectItem>
                                )}
                                {unitLevels.length > 2 && (
                                  <SelectItem value="level-3">
                                    {unitLevels[2]?.unitName
                                      ? `${unitLevels[2].unitName} (المستوى 3)`
                                      : 'المستوى 3'}
                                  </SelectItem>
                                )}
                              </>
                            ) : (
                              <SelectItem value="weight">
                                كيلوجرام (كجم)
                              </SelectItem>
                            )}
                          </SelectContent>
                        </Select>
                      </div>

                      {/* 3. تاريخ الصلاحية: يوم / شهر / سنة + زر التقويم */}
                      <div className="sm:col-span-4">
                        <Label className="block text-[11px] font-black text-slate-500 mb-1">
                          تاريخ الصلاحية (يوم / شهر / سنة)
                        </Label>
                        <div className="flex items-center gap-1.5">
                          <Input
                            type="number"
                            min={1}
                            max={31}
                            value={b.day}
                            onChange={(e) =>
                              handleUpdateBatch(idx, { day: e.target.value })
                            }
                            placeholder="يوم"
                            className="h-10 text-xs font-mono font-bold text-center w-14"
                          />

                          <Input
                            type="number"
                            min={1}
                            max={12}
                            value={b.month}
                            onChange={(e) =>
                              handleUpdateBatch(idx, { month: e.target.value })
                            }
                            placeholder="شهر"
                            className="h-10 text-xs font-mono font-bold text-center w-14"
                          />

                          <Input
                            type="number"
                            min={2024}
                            max={2040}
                            value={b.year}
                            onChange={(e) =>
                              handleUpdateBatch(idx, { year: e.target.value })
                            }
                            placeholder="سنة"
                            className="h-10 text-xs font-mono font-bold text-center flex-1 min-w-[64px]"
                          />

                          <DatePicker
                            date={currentDateObj}
                            onSelect={(newDate) => {
                              if (newDate) {
                                handleUpdateBatch(idx, {
                                  year: String(newDate.getFullYear()),
                                  month: String(newDate.getMonth() + 1).padStart(2, '0'),
                                  day: String(newDate.getDate()).padStart(2, '0'),
                                });
                              } else {
                                handleUpdateBatch(idx, { year: '', month: '', day: '' });
                              }
                            }}
                            trigger={
                              <Button
                                type="button"
                                variant="outline"
                                className="w-10 h-10 p-0 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 hover:border-emerald-500 hover:text-emerald-600 dark:hover:text-emerald-400 flex items-center justify-center shrink-0 cursor-pointer shadow-2xs transition-colors"
                                title="اختيار من التقويم"
                              >
                                <CalendarIcon className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                              </Button>
                            }
                          />
                        </div>
                      </div>

                      {/* 4. رقم التشغيلة */}
                      <div className="sm:col-span-2">
                        <div className="flex items-center justify-between mb-1">
                          <Label className="block text-[11px] font-black text-slate-500 truncate">
                            رقم التشغيلة
                          </Label>
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                              const newBatchNum = generateAutoBatchNumber(b.year, b.month);
                              handleUpdateBatch(idx, { batchNumber: newBatchNum });
                            }}
                            className="h-5 px-1 text-[10px] font-bold text-emerald-600 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-950/50 flex items-center gap-0.5 rounded cursor-pointer shrink-0"
                            title="توليد رقم تشغيلة جديد تلقائياً"
                          >
                            <Wand2 className="w-3 h-3" />
                            <span>تلقائي</span>
                          </Button>
                        </div>
                        <Input
                          type="text"
                          value={b.batchNumber}
                          onChange={(e) =>
                            handleUpdateBatch(idx, { batchNumber: e.target.value })
                          }
                          placeholder="LOT-202709-1001"
                          className="h-10 text-xs font-mono font-bold"
                        />
                      </div>

                      {/* 5. زر الحذف */}
                      <div className="sm:col-span-1 flex justify-end">
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          onClick={() => handleRemoveBatch(idx)}
                          className="w-10 h-10 rounded-xl text-red-500 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-950/40 cursor-pointer shrink-0"
                          title="حذف هذا التاريخ"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            <div className="flex justify-center pt-1">
              <Button
                type="button"
                variant="outline"
                onClick={handleAddBatch}
                className="h-11 px-6 rounded-xl border-dashed border-emerald-400 dark:border-emerald-700 text-emerald-700 dark:text-emerald-300 hover:bg-emerald-50 dark:hover:bg-emerald-950/40 text-xs font-bold flex items-center gap-2 cursor-pointer shadow-2xs"
              >
                <Plus className="w-4 h-4" />
                <span>إضافة تاريخ تشغيلة جديد</span>
              </Button>
            </div>
          </div>
        ) : (
          <p className="text-xs text-slate-400 text-center py-3">
            تتبع الصلاحية متوقف لهذا الصنف حالياً.
          </p>
        )}
      </CardContent>
    </Card>
  );
};
