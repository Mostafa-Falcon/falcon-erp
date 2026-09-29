'use client';

import React from'react';
import { Boxes } from'lucide-react';
import { formatNumber } from'@/lib/format';
import type { Product, ProductCategory, ProductBrand } from'@/types';

interface ItemCardHeaderBannerProps {
 product: Product;
 category: ProductCategory | null;
 brand: ProductBrand | null;
 baseUName: string;
}

export function ItemCardHeaderBanner({
 product,
 category,
 brand,
 baseUName,
}: ItemCardHeaderBannerProps) {
 return (
 <div className="bg-surface p-5 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-xs flex items-center justify-between gap-4">
 <div className="flex items-center gap-5 w-full">
 {/* Emblem on the far right in RTL */}
 <div className="w-14 h-14 rounded-2xl bg-blue-50 dark:bg-blue-950/50 flex items-center justify-center text-blue-600 shadow-2xs shrink-0">
 <Boxes className="w-7 h-7"/>
 </div>

 {/* 7 Clean Columns matching Screenshot 2 */}
 <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-7 gap-6 text-xs font-bold w-full">
 <div>
 <span className="text-2xs text-slate-400 block mb-1">المجموعة / التصنيف</span>
 <span className="font-black text-slate-800 dark:text-white">{category?.name ||'عام'}</span>
 </div>

 <div>
 <span className="text-2xs text-slate-400 block mb-1">الماركة</span>
 <span className="text-slate-700 dark:text-slate-300">{brand?.name ||'عام'}</span>
 </div>

 <div>
 <span className="text-2xs text-slate-400 block mb-1">SKU</span>
 <span className="font-mono text-slate-700 dark:text-slate-300">{product.sku}</span>
 </div>

 <div>
 <span className="text-2xs text-slate-400 block mb-1">الوحدة</span>
 <span className="text-slate-700 dark:text-slate-300">{baseUName}</span>
 </div>

 <div>
 <span className="text-2xs text-slate-400 block mb-1">حد التنبيه</span>
 <span className="font-mono text-slate-700 dark:text-slate-300">{product.min_stock_alert || 0}</span>
 </div>

 <div>
 <span className="text-2xs text-slate-400 block mb-1">التكلفة</span>
 <span className="font-mono font-bold text-slate-800 dark:text-white">
 {formatNumber(product.purchase_price)} ج.م
 </span>
 </div>

 <div>
 <span className="text-2xs text-slate-400 block mb-1">سعر البيع</span>
 <span className="font-mono font-black text-[#558b2f]">
 {formatNumber(product.sale_price)} ج.م
 </span>
 </div>
 </div>
 </div>
 </div>
 );
}