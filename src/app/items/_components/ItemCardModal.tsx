'use client';

import React from'react';
import Link from'next/link';
import {
 Dialog,
 DialogContent,
 DialogHeader,
 DialogTitle,
 DialogFooter,
} from'@/components/ui/dialog';
import { Button } from'@/components/ui/button';
import { Badge } from'@/components/ui/badge';
import { IdCard, Barcode, Edit, Boxes, Layers, ExternalLink } from'lucide-react';
import { formatNumber, ITEM_TYPE_LABELS } from'@/lib/format';
import type { Product, Warehouse, StockLevel, ProductUnit, Unit } from'@/types';

interface ItemCardModalProps {
 product: Product | null;
 warehouses: Warehouse[];
 stockLevels: StockLevel[];
 unitsById: Record<string, Unit>;
 productUnits: ProductUnit[];
 catName: (id?: string | null) => string;
 unitName: (id?: string | null) => string;
 onClose: () => void;
 onOpenOpeningStock: (product: Product) => void;
}

export function ItemCardModal({
 product,
 warehouses,
 stockLevels,
 unitsById,
 productUnits,
 catName,
 unitName,
 onClose,
 onOpenOpeningStock,
}: ItemCardModalProps) {
 if (!product) return null;

 const totalStock = stockLevels
 .filter((s) => s.product_id === product.id)
 .reduce((sum, s) => sum + s.quantity, 0);

 return (
 <Dialog open={!!product} onOpenChange={(open) => !open && onClose()}>
 <DialogContent className="max-w-xl text-right p-6"dir="rtl">
 <DialogHeader className="space-y-1.5 border-b border-slate-100 dark:border-slate-800 pb-3">
 <div className="flex items-center justify-between">
 <DialogTitle className="text-lg font-black flex items-center gap-2 text-slate-900 dark:text-white">
 <IdCard className="w-5 h-5 text-emerald-600"/>
 <span>بطاقة الصنف (كارت تعريفي)</span>
 </DialogTitle>
 <Badge
 variant={product.is_active ?'secondary':'destructive'}
 className="text-xs font-bold px-2.5 py-0.5 rounded-full"
 >
 {product.is_active ?'نشط':'معطل'}
 </Badge>
 </div>
 <p className="text-xs text-slate-500 font-bold flex items-center gap-2">
 <span>الاسم: <strong className="text-slate-900 dark:text-white">{product.name}</strong></span>
 {product.name_en && <span>({product.name_en})</span>}
 </p>
 </DialogHeader>

 <div className="space-y-4 py-2">
 {/* Main Info Grid */}
 <div className="grid grid-cols-3 gap-2.5">
 <div className="bg-slate-50 dark:bg-slate-900 p-3 rounded-2xl border border-slate-100 dark:border-slate-800 text-center">
 <span className="text-3xs font-bold text-slate-400 block mb-0.5">الباركود / SKU</span>
 <span className="text-xs font-black font-mono text-slate-800 dark:text-slate-200">
 {product.sku}
 </span>
 </div>

 <div className="bg-slate-50 dark:bg-slate-900 p-3 rounded-2xl border border-slate-100 dark:border-slate-800 text-center">
 <span className="text-3xs font-bold text-slate-400 block mb-0.5">سعر البيع الأساسي</span>
 <span className="text-sm font-black font-mono text-[#558b2f]">
 {formatNumber(product.sale_price)} <span className="text-3xs font-normal">ج.م</span>
 </span>
 </div>

 <div className="bg-slate-50 dark:bg-slate-900 p-3 rounded-2xl border border-slate-100 dark:border-slate-800 text-center">
 <span className="text-3xs font-bold text-slate-400 block mb-0.5">إجمالي الرصيد</span>
 <span className="text-sm font-black font-mono text-blue-600 dark:text-blue-400">
 {formatNumber(totalStock)} <span className="text-3xs font-normal">{unitName(product.base_unit_id)}</span>
 </span>
 </div>
 </div>

 {/* Secondary Units (if any) */}
 {productUnits.length > 0 && (
 <div className="p-3 bg-emerald-50/50 dark:bg-emerald-950/20 rounded-2xl border border-emerald-100 dark:border-emerald-900/40">
 <span className="text-2xs font-black text-emerald-800 dark:text-emerald-300 block mb-2">
 الوحدات والعبوات المتعددة:
 </span>
 <div className="grid grid-cols-2 gap-2 text-xs">
 {productUnits.map((u) => (
 <div key={u.id} className="bg-surface p-2 rounded-xl border border-emerald-200/60 dark:border-emerald-800/40 flex items-center justify-between font-bold">
 <span>{unitsById[u.unit_id]?.name ||'وحدة فرعية'}</span>
 <span className="font-mono text-2xs text-slate-600 dark:text-slate-300">
 معامل التحويل: {u.conversion_factor} {unitName(product.base_unit_id)}
 </span>
 </div>
 ))}
 </div>
 </div>
 )}

 {/* Warehouse Stock breakdown */}
 <div>
 <div className="flex items-center justify-between mb-2">
 <span className="text-xs font-black text-slate-700 dark:text-slate-300">
 توزيع الرصيد عبر المستودعات:
 </span>
 <Button
 variant="ghost"
 size="sm"
 onClick={() => {
 onClose();
 onOpenOpeningStock(product);
 }}
 className="h-7 px-2.5 text-2xs font-black text-blue-600 hover:text-blue-700 hover:bg-blue-50 dark:hover:bg-blue-950/50 rounded-lg gap-1"
 >
 <Boxes className="w-3.5 h-3.5"/>
 <span>إضافة رصيد مستودع</span>
 </Button>
 </div>

 <div className="rounded-xl border border-slate-100 dark:border-slate-800 overflow-hidden text-xs">
 <table className="w-full text-right">
 <thead className="bg-slate-50 dark:bg-slate-900/60 text-3xs text-slate-400 font-bold border-b border-slate-100 dark:border-slate-800">
 <tr>
 <th className="py-2 px-3">المستودع</th>
 <th className="py-2 px-3 text-center">الكمية المتوفرة</th>
 <th className="py-2 px-3 text-left">الوحدة</th>
 </tr>
 </thead>
 <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
 {warehouses.map((w) => {
 const level = stockLevels.find(
 (s) => s.warehouse_id === w.id && s.product_id === product.id
 );
 const qty = level?.quantity ?? 0;
 return (
 <tr key={w.id}>
 <td className="py-2 px-3 font-bold text-slate-800 dark:text-slate-200">
 {w.name}
 </td>
 <td className="py-2 px-3 text-center font-mono font-black text-slate-900 dark:text-white">
 {formatNumber(qty)}
 </td>
 <td className="py-2 px-3 text-left font-bold text-slate-400">
 {unitName(product.base_unit_id)}
 </td>
 </tr>
 );
 })}
 </tbody>
 </table>
 </div>
 </div>
 </div>

 <DialogFooter className="gap-2 sm:gap-0 pt-3 border-t border-slate-100 dark:border-slate-800">
 <div className="flex items-center gap-2 w-full justify-between">
 <div className="flex items-center gap-2">
 <Link href={`/items/barcode?id=${product.id}`} prefetch={false}>
 <Button
 variant="outline"
 size="sm"
 className="rounded-xl text-xs font-bold h-9 px-3 gap-1.5"
 >
 <Barcode className="w-3.5 h-3.5 text-amber-500"/>
 <span>طباعة باركود</span>
 </Button>
 </Link>
 <Link href={`/items/new?edit=${product.id}`}>
 <Button
 variant="outline"
 size="sm"
 className="rounded-xl text-xs font-bold h-9 px-3 gap-1.5"
 >
 <Edit className="w-3.5 h-3.5 text-[#558b2f]"/>
 <span>تعديل</span>
 </Button>
 </Link>
 </div>

 <Button
 variant="default"
 size="sm"
 onClick={onClose}
 className="rounded-xl text-xs font-bold h-9 px-4"
 >
 إغلاق
 </Button>
 </div>
 </DialogFooter>
 </DialogContent>
 </Dialog>
 );
}