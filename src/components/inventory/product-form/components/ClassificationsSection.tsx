import React from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Plus } from 'lucide-react';
import type { ProductBrand, ProductCategory, ProductTypeItem } from '@/types';
import type { ModalType } from '../types';

interface ClassificationsSectionProps {
  brandId: string;
  setBrandId: (val: string) => void;
  uniqueBrands: ProductBrand[];
  categoryId: string;
  setCategoryId: (val: string) => void;
  uniqueCategories: ProductCategory[];
  productType: string;
  setProductType: (val: string) => void;
  uniqueProductTypes: ProductTypeItem[];
  setActiveModal: (type: ModalType) => void;
  isPharmacy?: boolean;
}

export const ClassificationsSection: React.FC<ClassificationsSectionProps> = ({
  brandId,
  setBrandId,
  uniqueBrands,
  categoryId,
  setCategoryId,
  uniqueCategories,
  productType,
  setProductType,
  uniqueProductTypes,
  setActiveModal,
  isPharmacy = false,
}) => {
  return (
    <Card className="border border-slate-200/90 dark:border-slate-800 bg-white dark:bg-[#131b2e] shadow-xs rounded-2xl">
      <CardHeader className="pb-3 border-b border-slate-100 dark:border-slate-800">
        <CardTitle className="text-sm font-black text-slate-800 dark:text-slate-200 flex items-center gap-2">
          <span className="w-2.5 h-2.5 rounded-full bg-emerald-600" />
          <span>{isPharmacy ? 'تصنيفات الدواء والشركة' : 'التصنيفات والبيانات'}</span>
        </CardTitle>
      </CardHeader>
      <CardContent className="p-4 space-y-4">
        {/* 1. الشركة / الماركة / المصنع */}
        <div>
          <div className="flex items-center justify-between mb-1.5">
            <Label className="text-xs font-black text-slate-600 dark:text-slate-400">
              {isPharmacy ? 'شركة الأدوية المصنعة / المورد' : 'الشركة المصنعة / الماركة'}
            </Label>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => setActiveModal('brand')}
              className="h-6 px-1.5 text-[11px] font-bold text-emerald-700 dark:text-emerald-400 hover:text-emerald-800 hover:bg-emerald-50 dark:hover:bg-emerald-950/50 flex items-center gap-0.5 cursor-pointer rounded-lg"
            >
              <Plus className="w-3 h-3" />
              <span>إضافة / إدارة</span>
            </Button>
          </div>
          <Select value={brandId} onValueChange={setBrandId}>
            <SelectTrigger className="w-full h-11 bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold">
              <SelectValue placeholder={isPharmacy ? 'اختر شركة الأدوية...' : 'اختر من القائمة...'} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="none">بدون تحديد</SelectItem>
              {uniqueBrands.map((b) => (
                <SelectItem key={`brand-${b.id}`} value={b.id}>
                  {b.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* 2. المجموعة / التصنيف / الشكل الصيدلاني */}
        <div>
          <div className="flex items-center justify-between mb-1.5">
            <Label className="text-xs font-black text-slate-600 dark:text-slate-400">
              {isPharmacy ? 'المجموعة الدوائية / الشكل الصيدلاني' : 'المجموعة / التصنيف'}
            </Label>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => setActiveModal('category')}
              className="h-6 px-1.5 text-[11px] font-bold text-emerald-700 dark:text-emerald-400 hover:text-emerald-800 hover:bg-emerald-50 dark:hover:bg-emerald-950/50 flex items-center gap-0.5 cursor-pointer rounded-lg"
            >
              <Plus className="w-3 h-3" />
              <span>إضافة / إدارة</span>
            </Button>
          </div>
          <Select value={categoryId} onValueChange={setCategoryId}>
            <SelectTrigger className="w-full h-11 bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold">
              <SelectValue placeholder={isPharmacy ? 'اختر المجموعة الدوائية...' : 'اختر من القائمة...'} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="none">بدون تحديد</SelectItem>
              {uniqueCategories.map((c) => (
                <SelectItem key={`cat-${c.id}`} value={c.id}>
                  {c.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* 3. نوع المنتج */}
        <div>
          <div className="flex items-center justify-between mb-1.5">
            <Label className="text-xs font-black text-slate-600 dark:text-slate-400">
              {isPharmacy ? 'تصنيف الدواء / نوع المستحضر' : 'نوع المنتج'}
            </Label>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => setActiveModal('product_type')}
              className="h-6 px-1.5 text-[11px] font-bold text-emerald-700 dark:text-emerald-400 hover:text-emerald-800 hover:bg-emerald-50 dark:hover:bg-emerald-950/50 flex items-center gap-0.5 cursor-pointer rounded-lg"
            >
              <Plus className="w-3 h-3" />
              <span>إضافة / إدارة</span>
            </Button>
          </div>
          <Select value={productType} onValueChange={setProductType}>
            <SelectTrigger className="w-full h-11 bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold">
              <SelectValue placeholder={isPharmacy ? 'اختر نوع المستحضر...' : 'اختر من القائمة...'} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="none">بدون تحديد</SelectItem>
              {uniqueProductTypes.map((t) => (
                <SelectItem key={`type-${t.id}`} value={t.name}>
                  {t.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </CardContent>
    </Card>
  );
};
