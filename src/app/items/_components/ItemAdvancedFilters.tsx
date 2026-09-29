'use client';

import React from'react';
import { Button } from'@/components/ui/button';
import { Checkbox } from'@/components/ui/checkbox';
import {
 Select,
 SelectContent,
 SelectItem,
 SelectTrigger,
 SelectValue,
} from'@/components/ui/select';
import { SlidersHorizontal, Filter, RotateCcw, EyeOff } from'lucide-react';
import type { ProductCategory, ProductBrand, Warehouse, Unit } from'@/types';

interface ItemAdvancedFiltersProps {
 categories: ProductCategory[];
 brands: ProductBrand[];
 units: Unit[];
 warehouses: Warehouse[];
 categoryFilter: string;
 setCategoryFilter: (val: string) => void;
 brandFilter: string;
 setBrandFilter: (val: string) => void;
 typeFilter: string;
 setTypeFilter: (val: string) => void;
 unitFilter: string;
 setUnitFilter: (val: string) => void;
 taxFilter: string;
 setTaxFilter: (val: string) => void;
 warehouseFilter: string;
 setWarehouseFilter: (val: string) => void;
 showInactive: boolean;
 setShowInactive: (val: boolean) => void;
 onReset: () => void;
 onClose: () => void;
}

export function ItemAdvancedFilters({
 categories,
 brands,
 units,
 warehouses,
 categoryFilter,
 setCategoryFilter,
 brandFilter,
 setBrandFilter,
 typeFilter,
 setTypeFilter,
 unitFilter,
 setUnitFilter,
 taxFilter,
 setTaxFilter,
 warehouseFilter,
 setWarehouseFilter,
 showInactive,
 setShowInactive,
 onReset,
 onClose,
}: ItemAdvancedFiltersProps) {
 return (
 <div className="bg-surface p-5 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-sm animate-in fade-in slide-in-from-top-2 duration-150 space-y-4">
 {/* Header of Advanced Filters matching Image 3 */}
 <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
 <div className="flex items-center gap-2 text-slate-900 dark:text-white font-black text-sm">
 <SlidersHorizontal className="w-4 h-4 text-[#558b2f]"/>
 <span>تصفية متقدمة</span>
 </div>

 <Button
 variant="outline"
 size="sm"
 onClick={onClose}
 className="h-8 px-3 text-xs font-bold rounded-xl border-[#558b2f]/40 text-[#558b2f] hover:bg-[#558b2f]/10 gap-1.5"
 >
 <Filter className="w-3.5 h-3.5"/>
 <span>إخفاء الفلاتر</span>
 </Button>
 </div>

 {/* Grid of 5 filters matching Image 3 */}
 <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
 {/* 1. المجموعة / التصنيف */}
 <div className="space-y-1.5">
 <label className="text-2xs font-black text-slate-600 dark:text-slate-300 block text-right">
 المجموعة / التصنيف
 </label>
 <Select value={categoryFilter} onValueChange={setCategoryFilter}>
 <SelectTrigger className="w-full h-10 rounded-xl bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-xs font-bold text-right">
 <SelectValue placeholder="الكل"/>
 </SelectTrigger>
 <SelectContent className="z-50 bg-surface border border-slate-200 dark:border-slate-800 rounded-xl shadow-xl max-h-56">
 <SelectItem value="all">الكل</SelectItem>
 {categories.map((c) => (
 <SelectItem key={c.id} value={c.id}>
 {c.name}
 </SelectItem>
 ))}
 </SelectContent>
 </Select>
 </div>

 {/* 2. نوع الصنف */}
 <div className="space-y-1.5">
 <label className="text-2xs font-black text-slate-600 dark:text-slate-300 block text-right">
 نوع الصنف
 </label>
 <Select value={typeFilter} onValueChange={setTypeFilter}>
 <SelectTrigger className="w-full h-10 rounded-xl bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-xs font-bold text-right">
 <SelectValue placeholder="الكل"/>
 </SelectTrigger>
 <SelectContent className="z-50 bg-surface border border-slate-200 dark:border-slate-800 rounded-xl shadow-xl">
 <SelectItem value="all">الكل</SelectItem>
 <SelectItem value="storable">بضاعة مخزنية</SelectItem>
 <SelectItem value="service">خدمة</SelectItem>
 <SelectItem value="composite">صنف مجمع</SelectItem>
 </SelectContent>
 </Select>
 </div>

 {/* 3. الماركة / الشركة */}
 <div className="space-y-1.5">
 <label className="text-2xs font-black text-slate-600 dark:text-slate-300 block text-right">
 الماركة / الشركة
 </label>
 <Select value={brandFilter} onValueChange={setBrandFilter}>
 <SelectTrigger className="w-full h-10 rounded-xl bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-xs font-bold text-right">
 <SelectValue placeholder="الكل"/>
 </SelectTrigger>
 <SelectContent className="z-50 bg-surface border border-slate-200 dark:border-slate-800 rounded-xl shadow-xl max-h-56">
 <SelectItem value="all">الكل</SelectItem>
 {brands.map((b) => (
 <SelectItem key={b.id} value={b.id}>
 {b.name}
 </SelectItem>
 ))}
 </SelectContent>
 </Select>
 </div>

 {/* 4. الوحدة */}
 <div className="space-y-1.5">
 <label className="text-2xs font-black text-slate-600 dark:text-slate-300 block text-right">
 الوحدة
 </label>
 <Select value={unitFilter} onValueChange={setUnitFilter}>
 <SelectTrigger className="w-full h-10 rounded-xl bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-xs font-bold text-right">
 <SelectValue placeholder="الكل"/>
 </SelectTrigger>
 <SelectContent className="z-50 bg-surface border border-slate-200 dark:border-slate-800 rounded-xl shadow-xl max-h-56">
 <SelectItem value="all">الكل</SelectItem>
 {units.map((u) => (
 <SelectItem key={u.id} value={u.id}>
 {u.name}
 </SelectItem>
 ))}
 </SelectContent>
 </Select>
 </div>

 {/* 5. الضريبة */}
 <div className="space-y-1.5">
 <label className="text-2xs font-black text-slate-600 dark:text-slate-300 block text-right">
 الضريبة
 </label>
 <Select value={taxFilter} onValueChange={setTaxFilter}>
 <SelectTrigger className="w-full h-10 rounded-xl bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-xs font-bold text-right">
 <SelectValue placeholder="الكل"/>
 </SelectTrigger>
 <SelectContent className="z-50 bg-surface border border-slate-200 dark:border-slate-800 rounded-xl shadow-xl">
 <SelectItem value="all">الكل</SelectItem>
 <SelectItem value="0">معفى من الضريبة (0%)</SelectItem>
 <SelectItem value="14">ضريبة القيمة المضافة (14%)</SelectItem>
 </SelectContent>
 </Select>
 </div>
 </div>

 {/* Bottom Action Row matching Image 3 */}
 <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-3 border-t border-slate-100 dark:border-slate-800">
 {/* Right side: Checkbox for Inactive/Stopped Items */}
 <label className="flex items-center gap-2 cursor-pointer text-xs font-bold text-slate-700 dark:text-slate-300">
 <Checkbox
 checked={showInactive}
 onCheckedChange={(c) => setShowInactive(!!c)}
 />
 <span>عرض الأصناف المتوقفة فقط</span>
 </label>

 {/* Left side: Reset & Apply Buttons */}
 <div className="flex items-center gap-2">
 <Button
 variant="default"
 size="sm"
 onClick={onReset}
 className="h-10 px-4 bg-slate-700 hover:bg-slate-800 text-white rounded-xl text-xs font-black flex items-center gap-1.5"
 >
 <RotateCcw className="w-3.5 h-3.5"/>
 <span>إعادة تعيين</span>
 </Button>

 <Button
 size="sm"
 onClick={onClose}
 className="h-10 px-5 bg-[#0f766e] hover:bg-[#115e59] text-white rounded-xl text-xs font-black shadow-sm flex items-center gap-1.5"
 >
 <Filter className="w-3.5 h-3.5"/>
 <span>تطبيق التصفية</span>
 </Button>
 </div>
 </div>
 </div>
 );
}