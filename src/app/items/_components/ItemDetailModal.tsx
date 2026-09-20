'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  X,
  Printer,
  Sparkles,
  IdCard,
  Package,
  Boxes,
} from 'lucide-react';
import { formatNumber, formatDateTime } from '@/lib/format';
import { cn } from '@/lib/utils';
import type { Product, Warehouse, StockLevel, ProductUnit, Unit, ProductBrand } from '@/types';

interface ItemDetailModalProps {
  product: Product;
  unitName: (id?: string | null) => string;
  catName: (id?: string | null) => string;
  brands: ProductBrand[];
  warehouses: Warehouse[];
  stockLevels: StockLevel[];
  productUnits: ProductUnit[];
  unitsById: Record<string, Unit>;
  stockMap: Record<string, number>;
  onClose: () => void;
}

export function ItemDetailModal({
  product,
  unitName,
  catName,
  brands,
  warehouses,
  stockLevels,
  productUnits,
  unitsById,
  stockMap,
  onClose,
}: ItemDetailModalProps) {
  const router = useRouter();
  const [showSubstitutes, setShowSubstitutes] = useState(false);

  const brandName = brands.find((b) => b.id === product.brand_id)?.name || 'عام';
  const currentStock = stockMap[product.id] || 0;
  const baseUName = unitName(product.base_unit_id);

  // Multi-unit formatted stock breakdown
  let stockBreakdownText = '';
  if (productUnits.length >= 2) {
    const u2 = productUnits[0];
    const u3 = productUnits[1];
    const u2Name = unitsById[u2.unit_id]?.name || 'شريط';
    const u3Name = unitsById[u3.unit_id]?.name || 'قرص';
    const f2 = u2.conversion_factor && u2.conversion_factor > 0 ? u2.conversion_factor : 1;
    const f3 = u3.conversion_factor && u3.conversion_factor > 0 ? u3.conversion_factor : 1;

    if (currentStock <= 0) {
      stockBreakdownText = `0 ${baseUName} + 0 ${u2Name}`;
    } else {
      const totalPills = Math.round(currentStock * f2 * f3);
      const boxes = Math.floor(totalPills / (f2 * f3));
      const remAfterBoxes = totalPills % (f2 * f3);
      const strips = Math.floor(remAfterBoxes / f3);
      const pills = remAfterBoxes % f3;
      if (pills > 0) {
        stockBreakdownText = `${boxes} ${baseUName} + ${strips} ${u2Name} + ${pills} ${u3Name}`;
      } else {
        stockBreakdownText = `${boxes} ${baseUName} + ${strips} ${u2Name}`;
      }
    }
  } else if (productUnits.length === 1) {
    const u2 = productUnits[0];
    const u2Name = unitsById[u2.unit_id]?.name || 'شريط';
    const f2 = u2.conversion_factor && u2.conversion_factor > 0 ? u2.conversion_factor : 1;
    if (currentStock <= 0) {
      stockBreakdownText = `0 ${baseUName} + 0 ${u2Name}`;
    } else if (f2 > 1) {
      const totalStrips = Math.round(currentStock * f2);
      const boxes = Math.floor(totalStrips / f2);
      const strips = totalStrips % f2;
      stockBreakdownText = `${boxes} ${baseUName} + ${strips} ${u2Name}`;
    } else {
      stockBreakdownText = `${formatNumber(currentStock)} ${baseUName}`;
    }
  } else {
    stockBreakdownText = `${formatNumber(currentStock)} ${baseUName}`;
  }

  // Stock values
  const stockCostValue = currentStock * (product.purchase_price || 0);
  const stockSaleValue = currentStock * (product.sale_price || 0);
  const profitPerUnit = (product.sale_price || 0) - (product.purchase_price || 0);
  const profitMargin =
    product.purchase_price && product.purchase_price > 0
      ? ((profitPerUnit / product.purchase_price) * 100).toFixed(2)
      : '0.00';

  const isOutOfStock = currentStock <= 0;
  const isLowStock = currentStock > 0 && currentStock <= (product.min_stock_alert || 0);

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent
        className="max-w-3xl max-h-[92vh] overflow-y-auto p-6 rounded-3xl text-right bg-white dark:bg-[#131b2e] border border-slate-200 dark:border-slate-800 shadow-2xl"
        dir="rtl"
      >
        {/* Header matching Image 1 */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-100 dark:border-slate-800">
          <div className="flex items-center gap-3">
            <button
              onClick={onClose}
              className="w-8 h-8 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-400 hover:text-slate-700 transition-colors cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
            <h2 className="text-lg font-black text-slate-900 dark:text-white">
              تفاصيل الصنف — {product.name}
            </h2>
          </div>

          {/* Top Actions matching Image 1 */}
          <div className="flex items-center gap-2">
            <Link href={`/items/${product.id}`}>
              <Button
                variant="ghost"
                size="sm"
                className="h-9 px-3 text-xs font-black text-[#0f766e] hover:text-[#115e59] hover:bg-[#0f766e]/10 rounded-xl gap-1.5"
              >
                <IdCard className="w-4 h-4" />
                <span>كرت الصنف الكامل</span>
              </Button>
            </Link>

            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowSubstitutes(!showSubstitutes)}
              className="h-9 px-3 text-xs font-black rounded-xl border-slate-200 dark:border-slate-700 gap-1.5 text-slate-700 dark:text-slate-200"
            >
              <Sparkles className="w-4 h-4 text-emerald-600" />
              <span>عرض البدائل</span>
            </Button>

            <Link href={`/items/barcode?id=${product.id}`} prefetch={false}>
              <Button
                size="sm"
                className="h-9 px-4 bg-[#0f766e] hover:bg-[#115e59] text-white rounded-xl text-xs font-black shadow-xs gap-1.5"
              >
                <Printer className="w-4 h-4" />
                <span>طباعة ملصق</span>
              </Button>
            </Link>
          </div>
        </div>

        {/* Section 1: Product Basic Info & Emblem */}
        <div className="flex flex-col sm:flex-row items-center sm:items-start gap-6 py-2">
          {/* Emblem / Product Box Icon */}
          <div className="w-32 h-32 sm:w-36 sm:h-36 rounded-3xl bg-linear-to-b from-blue-50 to-blue-100/60 dark:from-blue-950/50 dark:to-blue-900/30 border border-blue-200/80 dark:border-blue-800 flex flex-col items-center justify-center p-4 text-blue-600 shadow-sm shrink-0">
            <Boxes className="w-12 h-12 sm:w-14 sm:h-14 text-blue-600 dark:text-blue-400 mb-1.5" />
            <span className="text-xs font-black text-blue-800 dark:text-blue-300 text-center line-clamp-1">
              {catName(product.category_id)}
            </span>
          </div>

          {/* Details Table: Clean tight spacing with fixed label width so value sits right next to it */}
          <div className="flex-1 w-full text-xs font-bold space-y-1">
            <div className="flex items-center gap-3 py-1.5 border-b border-slate-100 dark:border-slate-800/80">
              <span className="text-slate-400 font-bold w-32 shrink-0">الاسم بالعربية</span>
              <span className="font-black text-slate-900 dark:text-white text-sm flex-1 break-words">
                {product.name}
              </span>
            </div>

            <div className="flex items-center gap-3 py-1.5 border-b border-slate-100 dark:border-slate-800/80">
              <span className="text-slate-400 font-bold w-32 shrink-0">English Name</span>
              <span className="font-sans font-medium text-slate-600 dark:text-slate-300 flex-1">
                {product.name_en || '—'}
              </span>
            </div>

            <div className="flex items-center gap-3 py-1.5 border-b border-slate-100 dark:border-slate-800/80">
              <span className="text-slate-400 font-bold w-32 shrink-0">SKU / الباركود</span>
              <span className="font-mono font-black text-slate-800 dark:text-slate-200 flex-1">
                {product.sku}
              </span>
            </div>

            <div className="flex items-center gap-3 py-1.5 border-b border-slate-100 dark:border-slate-800/80">
              <span className="text-slate-400 font-bold w-32 shrink-0">المجموعة / التصنيف</span>
              <span className="text-slate-800 dark:text-slate-200 font-black flex-1">
                {catName(product.category_id)}
              </span>
            </div>

            <div className="flex items-center gap-3 py-1.5 border-b border-slate-100 dark:border-slate-800/80">
              <span className="text-slate-400 font-bold w-32 shrink-0">الماركة</span>
              <span className="text-slate-800 dark:text-slate-200 flex-1">{brandName}</span>
            </div>

            <div className="flex items-center gap-3 py-1.5">
              <span className="text-slate-400 font-bold w-32 shrink-0">الوحدة الرئيسية</span>
              <span className="text-slate-800 dark:text-slate-200 font-black flex-1">{baseUName}</span>
            </div>
          </div>
        </div>

        {/* Expandable Substitutes Drawer (when user clicks "عرض البدائل") */}
        {showSubstitutes && (
          <div className="bg-blue-50/50 dark:bg-blue-950/30 p-4 rounded-2xl border border-blue-100 dark:border-blue-900/50 space-y-3 transition-all">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-blue-700 dark:text-blue-300 text-xs font-black">
                <Sparkles className="w-4 h-4 text-emerald-600" />
                <span>البدائل المقترحة في نفس المجموعة ({catName(product.category_id)})</span>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowSubstitutes(false)}
                className="h-7 px-2 text-[11px] text-slate-400 hover:text-slate-600"
              >
                إغلاق البدائل
              </Button>
            </div>
            <div className="text-xs text-slate-500 font-medium">
              يمكنك الاطلاع على قائمة البدائل المتوافقة ومقارنة أسعارها وتوافرها في المخزن من خلال صفحة كرت الصنف الكامل.
            </div>
            <div>
              <Link href={`/items/${product.id}?tab=substitutes`}>
                <Button size="sm" className="h-8 bg-[#0f766e] hover:bg-[#115e59] text-white text-xs font-black rounded-xl gap-1.5">
                  <IdCard className="w-3.5 h-3.5" />
                  <span>فتح جدول البدائل التفصيلي</span>
                </Button>
              </Link>
            </div>
          </div>
        )}

        {/* Section 2: هيكل الوحدات */}
        <div className="space-y-2 pt-1">
          <h3 className="text-xs font-black text-slate-700 dark:text-slate-200">هيكل الوحدات والأسعار</h3>
          <div className="space-y-2 bg-slate-50/70 dark:bg-slate-900/40 p-3 rounded-2xl border border-slate-100 dark:border-slate-800">
            {/* Unit 1: Base Unit */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 p-2.5 rounded-xl bg-white dark:bg-[#131b2e] border border-slate-200/70 dark:border-slate-800 text-xs font-bold shadow-2xs">
              <div className="flex items-center gap-2">
                <span className="w-5 h-5 rounded-full bg-blue-100 dark:bg-blue-950 text-blue-600 text-[11px] font-black flex items-center justify-center">
                  1
                </span>
                <span className="font-black text-slate-900 dark:text-white text-sm">{baseUName}</span>
                <span className="text-[11px] text-slate-400 font-mono mr-2">معامل التحويل: 1</span>
              </div>
              <div className="flex items-center gap-4 text-xs font-mono">
                <span className="text-slate-500">
                  شراء: <strong className="text-slate-800 dark:text-slate-200">{formatNumber(product.purchase_price)} ج.م</strong>
                </span>
                <span className="text-slate-500">
                  بيع: <strong className="text-emerald-600 font-black">{formatNumber(product.sale_price)} ج.م</strong>
                </span>
              </div>
            </div>

            {/* Unit 2: Secondary Units (if exist) */}
            {productUnits.map((u, idx) => {
              const uName = unitsById[u.unit_id]?.name || 'فرعي';
              return (
                <div
                  key={u.id}
                  className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 p-2.5 rounded-xl bg-white dark:bg-[#131b2e] border border-slate-200/70 dark:border-slate-800 text-xs font-bold shadow-2xs"
                >
                  <div className="flex items-center gap-2">
                    <span className="w-5 h-5 rounded-full bg-blue-100 dark:bg-blue-950 text-blue-600 text-[11px] font-black flex items-center justify-center">
                      {idx + 2}
                    </span>
                    <span className="font-black text-slate-900 dark:text-white text-sm">{uName}</span>
                    <span className="text-[11px] text-slate-400 font-mono mr-2">
                      معامل التحويل: {u.conversion_factor}
                    </span>
                  </div>
                  <div className="flex items-center gap-4 text-xs font-mono">
                    <span className="text-slate-500">
                      شراء: <strong className="text-slate-800 dark:text-slate-200">{formatNumber(u.purchase_price)} ج.م</strong>
                    </span>
                    <span className="text-slate-500">
                      بيع: <strong className="text-emerald-600 font-black">{formatNumber(u.sale_price)} ج.م</strong>
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Section 3: المخزون والأسعار - Perfectly balanced dual cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
          {/* Right Column: الأسعار (Pricing) */}
          <div className="space-y-2 bg-slate-50/70 dark:bg-slate-900/40 p-4 rounded-2xl border border-slate-100 dark:border-slate-800 text-xs flex flex-col justify-between">
            <div>
              <h4 className="text-xs font-black text-slate-700 dark:text-slate-200 border-b border-slate-200/60 dark:border-slate-800 pb-2 mb-2">
                الأسعار والتسعير
              </h4>
              <div className="space-y-2 font-bold">
                <div className="flex items-center justify-between py-1 border-b border-slate-100/60 dark:border-slate-800">
                  <span className="text-slate-400">سعر الشراء (التكلفة)</span>
                  <span className="font-mono text-slate-800 dark:text-slate-200 font-bold">
                    {formatNumber(product.purchase_price)} ج.م
                  </span>
                </div>

                <div className="flex items-center justify-between py-1 border-b border-slate-100/60 dark:border-slate-800">
                  <span className="text-slate-400">سعر البيع الافتراضي</span>
                  <span className="font-mono text-emerald-600 font-black text-sm">
                    {formatNumber(product.sale_price)} ج.م
                  </span>
                </div>

                <div className="flex items-center justify-between py-1 border-b border-slate-100/60 dark:border-slate-800">
                  <span className="text-slate-400">الربح الصافي للوحدة</span>
                  <span className="font-mono text-slate-900 dark:text-white font-black">
                    {formatNumber(profitPerUnit)} ج.م{' '}
                    <span className="text-[10px] text-emerald-600 font-bold">({profitMargin}%)</span>
                  </span>
                </div>

                <div className="flex items-center justify-between py-1 border-b border-slate-100/60 dark:border-slate-800">
                  <span className="text-slate-400">ضريبة القيمة المضافة</span>
                  <span className="font-mono text-slate-700 dark:text-slate-300">
                    {product.tax_rate ? `${product.tax_rate}%` : 'معفى من الضريبة'}
                  </span>
                </div>

                <div className="flex items-center justify-between py-1">
                  <span className="text-slate-400">السعر شامل الضريبة</span>
                  <span className="font-mono font-black text-slate-900 dark:text-white">
                    {formatNumber((product.sale_price || 0) * (1 + (product.tax_rate || 0) / 100))} ج.م
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Left Column: المخزون (Stock) */}
          <div className="space-y-2 bg-slate-50/70 dark:bg-slate-900/40 p-4 rounded-2xl border border-slate-100 dark:border-slate-800 text-xs flex flex-col justify-between">
            <div>
              <h4 className="text-xs font-black text-slate-700 dark:text-slate-200 border-b border-slate-200/60 dark:border-slate-800 pb-2 mb-2">
                حالة المخزون والمستودعات
              </h4>
              <div className="space-y-2 font-bold">
                <div className="flex items-center justify-between py-1 border-b border-slate-100/60 dark:border-slate-800">
                  <span className="text-slate-400">الرصيد الكلي الحالي</span>
                  <span className="font-mono font-black text-blue-600 dark:text-blue-400 text-sm">
                    {stockBreakdownText}
                  </span>
                </div>

                <div className="flex items-center justify-between py-1 border-b border-slate-100/60 dark:border-slate-800">
                  <span className="text-slate-400">حد التنبيه (الأدنى)</span>
                  <span className="font-mono text-slate-800 dark:text-slate-200">
                    {formatNumber(product.min_stock_alert)} {baseUName}
                  </span>
                </div>

                <div className="flex items-center justify-between py-1 border-b border-slate-100/60 dark:border-slate-800">
                  <span className="text-slate-400">حالة التوفر</span>
                  <Badge
                    variant="outline"
                    className={cn(
                      'text-[10px] font-black rounded-full px-2.5 py-0.5',
                      isOutOfStock
                        ? 'bg-red-50 text-red-600 border-red-200 dark:bg-red-950/40 dark:text-red-300'
                        : isLowStock
                        ? 'bg-amber-50 text-amber-600 border-amber-200 dark:bg-amber-950/40 dark:text-amber-300'
                        : 'bg-emerald-50 text-emerald-600 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300'
                    )}
                  >
                    {isOutOfStock ? 'نفذ المخزون' : isLowStock ? 'مخزون منخفض' : 'متوفر'}
                  </Badge>
                </div>

                <div className="flex items-center justify-between py-1 border-b border-slate-100/60 dark:border-slate-800">
                  <span className="text-slate-400">قيمة المخزون (بالتكلفة)</span>
                  <span className="font-mono text-slate-800 dark:text-slate-200">
                    {formatNumber(stockCostValue)} ج.م
                  </span>
                </div>

                <div className="flex items-center justify-between py-1">
                  <span className="text-slate-400">قيمة المخزون (بالبيع)</span>
                  <span className="font-mono text-slate-800 dark:text-slate-200 font-black">
                    {formatNumber(stockSaleValue)} ج.م
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Footer with Timestamps matching Image 2 */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-2 pt-3 border-t border-slate-100 dark:border-slate-800 text-[11px] text-slate-400 font-bold">
          <span>تاريخ الإضافة: {formatDateTime(product.created_at)}</span>
          <span>آخر تعديل: {formatDateTime(product.updated_at)}</span>
        </div>
      </DialogContent>
    </Dialog>
  );
}
