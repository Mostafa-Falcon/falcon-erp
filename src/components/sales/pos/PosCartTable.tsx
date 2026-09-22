'use client';

import React, { useEffect, useRef } from 'react';
import {
  Barcode,
  Trash2,
  Plus,
  Minus,
  Scale,
  Tag,
  Calendar,
  AlertTriangle,
  Layers,
  Sparkles,
} from 'lucide-react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Popover, PopoverTrigger, PopoverContent } from '@/components/ui/popover';
import type { Product, ProductBatch, Unit } from '@/types';
import type { CartLine, UnitOption } from './types';
import { isExpired, daysToExpiry, formatNumber } from '@/lib/format';

interface PosCartTableProps {
  cart: CartLine[];
  products: Product[];
  unitsById: Record<string, Unit>;
  unitOptions: Record<string, UnitOption[]>;
  batches: Record<string, ProductBatch[]>;
  availableFor: (pId: string, unitId?: string, factor?: number, batchId?: string) => number;
  onUpdateQty: (key: string, delta: number) => void;
  onSetQty: (key: string, qty: number) => void;
  onSetLineBatch?: (key: string, batchId: string) => void;
  onSetLineDiscount?: (key: string, discount: number) => void;
  onOpenDiscountsModal?: () => void;
  onRemoveLine: (key: string) => void;
  onReadLiveWeight: (targetKey?: string) => void;
  isReadingScale: boolean;
  onUnitChange: (key: string, newUnitId: string, factor: number, price?: number) => void;
  onToggleLinePriceTier?: (key: string) => void;
  lastAddedKey?: string | null;
  onFocusSearch?: () => void;
}

export function PosCartTable({
  cart,
  products,
  unitsById,
  unitOptions,
  batches,
  availableFor,
  onUpdateQty,
  onSetQty,
  onSetLineBatch,
  onSetLineDiscount,
  onOpenDiscountsModal,
  onRemoveLine,
  onReadLiveWeight,
  isReadingScale,
  onUnitChange,
  onToggleLinePriceTier,
  lastAddedKey,
  onFocusSearch,
}: PosCartTableProps) {
  const lineProduct = (line: CartLine) => products.find((p) => p.id === line.productId);
  const lineSubtotal = (line: CartLine) => line.qty * line.price;
  const lineTotal = (line: CartLine) => lineSubtotal(line) - line.discount;

  // Refs for auto-focusing on quantity inputs
  const qtyInputRefs = useRef<Record<string, HTMLInputElement | null>>({});

  // Auto-focus on newly added line's quantity input
  useEffect(() => {
    if (lastAddedKey && qtyInputRefs.current[lastAddedKey]) {
      const input = qtyInputRefs.current[lastAddedKey];
      input?.focus();
      input?.select();
    }
  }, [lastAddedKey]);

  return (
    <main className="flex-1 overflow-y-auto px-2.5 sm:px-4 py-2 sm:py-3">
      {/* 1. Mobile Cards View (< 768px) */}
      <div className="md:hidden space-y-2.5">
        {cart.length === 0 ? (
          <div className="py-14 px-4 text-center bg-white dark:bg-[#111726] border border-slate-200/80 dark:border-slate-800 rounded-2xl shadow-2xs">
            <Barcode className="w-10 h-10 mx-auto text-slate-300 dark:text-slate-600 stroke-[1.5] mb-2.5" />
            <p className="font-black text-sm text-slate-700 dark:text-slate-200">
              الفاتورة فارغة حالياً
            </p>
            <p className="text-[11px] text-slate-400 mt-1 max-w-xs mx-auto leading-relaxed">
              امسح الباركود أو ابحث عن صنف لإضافته مباشرة إلى الفاتورة.
            </p>
          </div>
        ) : (
          cart.map((line, index) => {
            const product = lineProduct(line);
            const rawOpts = product ? unitOptions[product.id] || [] : [];
            const opts = Array.from(new Map(rawOpts.map((o) => [o.unitId, o])).values());
            const totalLineVal = lineTotal(line);
            const avail = product
              ? availableFor(product.id, line.unitId, line.factor, line.batchId)
              : 0;
            const prodBatches = product
              ? (batches[product.id] || []).filter((b) => b.current_quantity > 0)
              : [];
            const hasBatches = product?.tracks_batch && prodBatches.length > 0;

            return (
              <div
                key={line.key}
                className="bg-white dark:bg-[#111726] border border-slate-200/80 dark:border-slate-800 rounded-2xl p-3 shadow-2xs flex flex-col gap-2.5"
              >
                {/* Header: Item Title, SKU, Return Badge & Action buttons */}
                <div className="flex items-start justify-between gap-2 border-b border-slate-100 dark:border-slate-800/80 pb-2">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1.5">
                      <span className="w-5 h-5 rounded-full bg-slate-100 dark:bg-slate-800 text-[10px] font-bold text-slate-500 flex items-center justify-center shrink-0">
                        {index + 1}
                      </span>
                      <h3 className="font-black text-xs text-slate-900 dark:text-white leading-tight truncate">
                        {product?.name || 'صنف غير معروف'}
                      </h3>
                    </div>
                    <div className="text-[10px] text-slate-400 font-mono mt-1 flex items-center gap-2">
                      <span>كود: {product?.sku || line.productId}</span>
                      {line.isReturnLine && (
                        <Badge variant="destructive" className="h-4 px-1 text-[9px]">
                          مرتجع
                        </Badge>
                      )}
                      <span
                        className={`font-bold ${
                          avail <= 0
                            ? 'text-rose-600 dark:text-rose-400'
                            : avail <= 5
                            ? 'text-amber-600 dark:text-amber-400'
                            : 'text-emerald-600 dark:text-emerald-400'
                        }`}
                      >
                        (المتاح: {avail})
                      </span>
                    </div>
                  </div>

                  {/* Actions: Discount & Delete */}
                  <div className="flex items-center gap-1 shrink-0">
                    <button
                      type="button"
                      onClick={onOpenDiscountsModal}
                      title="خصم الصنف"
                      className="w-8 h-8 rounded-xl bg-amber-50 hover:bg-amber-100 dark:bg-amber-950/40 text-amber-600 flex items-center justify-center transition-colors cursor-pointer"
                    >
                      <Tag className="w-3.5 h-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => onRemoveLine(line.key)}
                      title="حذف الصنف"
                      className="w-8 h-8 rounded-xl bg-rose-50 hover:bg-rose-100 dark:bg-rose-950/40 text-rose-600 flex items-center justify-center transition-colors cursor-pointer"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                {/* Batch & Unit Selector Row (if applicable) */}
                <div className="grid grid-cols-2 gap-2">
                  {/* Unit Selector */}
                  <div>
                    <label className="text-[10px] font-bold text-slate-400 block mb-1">الوحدة:</label>
                    <Select
                      value={line.unitId}
                      onValueChange={(newU) => {
                        const matched = opts.find((o) => o.unitId === newU);
                        onUnitChange(line.key, newU, matched?.factor || 1, matched?.price);
                      }}
                    >
                      <SelectTrigger className="h-8 rounded-xl bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-xs font-bold">
                        <SelectValue placeholder="الوحدة" />
                      </SelectTrigger>
                      <SelectContent className="z-50 bg-white dark:bg-[#131b2e] border border-slate-200 dark:border-slate-800 rounded-xl shadow-xl">
                        {opts.map((o) => (
                          <SelectItem key={o.unitId} value={o.unitId} className="text-xs font-bold py-1.5 px-2.5">
                            {unitsById[o.unitId]?.name || o.unitId}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Batch Selector or Info */}
                  <div>
                    <label className="text-[10px] font-bold text-slate-400 block mb-1">الدفعة والصلاحية:</label>
                    {hasBatches ? (
                      <Select
                        value={line.batchId || prodBatches[0]?.id || ''}
                        onValueChange={(newBatchId) => {
                          if (onSetLineBatch) {
                            onSetLineBatch(line.key, newBatchId);
                          }
                        }}
                      >
                        <SelectTrigger className="h-8 rounded-xl bg-amber-50/60 dark:bg-amber-950/30 border-amber-200/80 dark:border-amber-800/80 text-xs font-mono font-bold text-amber-900 dark:text-amber-200">
                          <SelectValue placeholder="اختر الدفعة" />
                        </SelectTrigger>
                        <SelectContent className="z-50 bg-white dark:bg-[#131b2e] border border-slate-200 dark:border-slate-800 rounded-xl shadow-xl max-h-56">
                          {prodBatches.map((b) => {
                            const expDate = b.expiry_date || 'بدون تاريخ';
                            const exp = b.expiry_date ? isExpired(b.expiry_date) : false;
                            const batchQtyInUnit = Number((b.current_quantity / line.factor).toFixed(2));
                            return (
                              <SelectItem key={b.id} value={b.id} className="text-xs font-bold py-1.5 px-2.5">
                                <div className="flex items-center justify-between gap-1 w-full">
                                  <span className={exp ? 'text-rose-600 line-through' : ''}>{expDate}</span>
                                  <span className="text-[9px] text-slate-400 font-mono">({batchQtyInUnit})</span>
                                </div>
                              </SelectItem>
                            );
                          })}
                        </SelectContent>
                      </Select>
                    ) : (
                      <div className="h-8 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200/70 dark:border-slate-800 text-slate-400 text-xs font-bold flex items-center px-2.5">
                        بدون تاريخ
                      </div>
                    )}
                  </div>
                </div>

                {/* Stepper + Price & Total Row */}
                <div className="flex items-center justify-between gap-2 pt-1 border-t border-slate-100 dark:border-slate-800/60">
                  {/* Stepper */}
                  <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-800 rounded-xl p-0.5 border border-slate-200/80 dark:border-slate-700">
                    <button
                      type="button"
                      onClick={() => onUpdateQty(line.key, -1)}
                      className="w-8 h-8 rounded-lg bg-white dark:bg-slate-700 text-slate-600 dark:text-slate-200 hover:bg-slate-200 flex items-center justify-center transition-colors cursor-pointer"
                    >
                      <Minus className="w-3.5 h-3.5" />
                    </button>

                    <input
                      type="number"
                      step="any"
                      value={line.qty}
                      onFocus={(e) => e.target.select()}
                      onChange={(e) => {
                        const val = parseFloat(e.target.value);
                        onSetQty(line.key, isNaN(val) ? 0 : val);
                      }}
                      className="w-12 text-center bg-transparent font-black text-xs text-slate-900 dark:text-white focus:outline-none"
                    />

                    <button
                      type="button"
                      onClick={() => onUpdateQty(line.key, 1)}
                      className="w-8 h-8 rounded-lg bg-white dark:bg-slate-700 text-emerald-600 dark:text-emerald-400 hover:bg-slate-200 flex items-center justify-center transition-colors cursor-pointer"
                    >
                      <Plus className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  {/* Pricing info */}
                  <div className="text-left flex flex-col items-end">
                    <div className="text-[10px] text-slate-400 font-mono">
                      {line.price.toFixed(2)} ج.م × {line.qty}
                    </div>
                    <div className="font-mono font-black text-sm text-emerald-600 dark:text-emerald-400">
                      {totalLineVal.toFixed(2)} <span className="text-[10px] font-normal text-slate-400">ج.م</span>
                    </div>
                    {product?.has_dual_pricing && onToggleLinePriceTier && (
                      <button
                        type="button"
                        onClick={() => onToggleLinePriceTier(line.key)}
                        title={line.priceTier === 'old' ? 'التبديل إلى سعر البيع الجديد' : 'التبديل إلى سعر البيع القديم'}
                        className={`text-[9px] font-bold px-1.5 py-0.5 rounded-md transition-colors cursor-pointer ${
                          line.priceTier === 'old'
                            ? 'bg-violet-100 text-violet-700 dark:bg-violet-950/50 dark:text-violet-300'
                            : 'bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400'
                        }`}
                      >
                        {line.priceTier === 'old' ? 'سعر قديم' : 'سعر جديد'}
                      </button>
                    )}
                    {line.discount > 0 && (
                      <span className="text-[9px] text-rose-500 font-bold">
                        خصم: {line.discount} ج.م
                      </span>
                    )}
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* 2. Desktop/Tablet Table View (>= 768px) */}
      <div className="hidden md:block bg-white dark:bg-[#111726] border border-slate-200/80 dark:border-slate-800 rounded-2xl shadow-xs overflow-hidden overflow-x-auto">
        <table className="w-full text-right text-xs">
          {/* Table Header */}
          <thead className="bg-slate-50/80 dark:bg-slate-900/60 border-b border-slate-200/80 dark:border-slate-800 text-slate-500 dark:text-slate-400 font-bold">
            <tr>
              <th className="py-3 px-3 text-center w-12">#</th>
              <th className="py-3 px-3">الصنف</th>
              <th className="py-3 px-3 text-center min-w-[150px]">تاريخ الصلاحية / الدفعة</th>
              <th className="py-3 px-3 text-center min-w-[110px]">الوحدة</th>
              <th className="py-3 px-3 text-center w-36">الكمية</th>
              <th className="py-3 px-3 text-center w-28">السعر</th>
              <th className="py-3 px-3 text-center w-32">الإجمالي</th>
              <th className="py-3 px-3 text-center w-14"></th>
            </tr>
          </thead>

          {/* Table Body */}
          <tbody className="divide-y divide-slate-100 dark:divide-slate-800/80 font-medium">
            {cart.length === 0 ? (
              <tr>
                <td colSpan={8} className="py-20 text-center text-slate-400">
                  <div className="flex flex-col items-center justify-center gap-2">
                    <Barcode className="w-10 h-10 text-slate-300 dark:text-slate-600 stroke-[1.5]" />
                    <p className="font-bold text-sm text-slate-600 dark:text-slate-400">
                      الفاتورة فارغة حالياً
                    </p>
                    <p className="text-xs text-slate-400">
                      امسح الباركود أو ابحث عن صنف لإضافته مباشرة إلى الفاتورة (اضغط F2 للبحث).
                    </p>
                  </div>
                </td>
              </tr>
            ) : (
              cart.map((line, index) => {
                const product = lineProduct(line);
                const rawOpts = product ? unitOptions[product.id] || [] : [];
                const opts = Array.from(new Map(rawOpts.map((o) => [o.unitId, o])).values());
                const totalLineVal = lineTotal(line);

                // Available stock in current line's unit and batch
                const avail = product
                  ? availableFor(product.id, line.unitId, line.factor, line.batchId)
                  : 0;

                // Product batches sorted by FEFO
                const prodBatches = product
                  ? (batches[product.id] || []).filter((b) => b.current_quantity > 0)
                  : [];

                const selectedBatch = prodBatches.find((b) => b.id === line.batchId);
                const hasBatches = product?.tracks_batch && prodBatches.length > 0;

                return (
                  <tr
                    key={line.key}
                    className="hover:bg-slate-50/60 dark:hover:bg-slate-800/40 transition-colors group"
                  >
                    {/* # Index */}
                    <td className="py-3.5 px-3 text-center font-bold text-slate-400">{index + 1}</td>

                    {/* Product Name & SKU */}
                    <td className="py-3.5 px-3">
                      <div className="font-black text-sm text-slate-900 dark:text-white leading-tight">
                        {product?.name || 'صنف غير معروف'}
                      </div>
                      <div className="text-[10px] text-slate-400 font-mono mt-0.5 flex items-center gap-2">
                        <span>كود: {product?.sku || line.productId}</span>
                        {line.isReturnLine && (
                          <Badge variant="destructive" className="h-4 px-1 text-[9px]">
                            مرتجع
                          </Badge>
                        )}
                      </div>
                    </td>

                    {/* Expiry Date / Batch Picker (FEFO) */}
                    <td className="py-3.5 px-3 text-center">
                      {hasBatches ? (
                        <div className="inline-block w-full max-w-[170px]">
                          <Select
                            value={line.batchId || prodBatches[0]?.id || ''}
                            onValueChange={(newBatchId) => {
                              if (onSetLineBatch) {
                                onSetLineBatch(line.key, newBatchId);
                              }
                            }}
                          >
                            <SelectTrigger className="h-8 rounded-xl bg-amber-50/60 dark:bg-amber-950/30 border-amber-200/80 dark:border-amber-800/80 text-xs font-mono font-bold text-amber-900 dark:text-amber-200">
                              <SelectValue placeholder="اختر الدفعة" />
                            </SelectTrigger>
                            <SelectContent className="z-50 bg-white dark:bg-[#131b2e] border border-slate-200 dark:border-slate-800 rounded-xl shadow-xl max-h-56">
                              {prodBatches.map((b) => {
                                const expDate = b.expiry_date || 'بدون تاريخ';
                                const days = b.expiry_date ? daysToExpiry(b.expiry_date) : Infinity;
                                const nearExp = days >= 0 && days <= 90;
                                const exp = b.expiry_date ? isExpired(b.expiry_date) : false;
                                const batchQtyInUnit = Number((b.current_quantity / line.factor).toFixed(2));

                                return (
                                  <SelectItem
                                    key={b.id}
                                    value={b.id}
                                    className="text-xs font-bold cursor-pointer py-2 px-2.5"
                                  >
                                    <div className="flex items-center justify-between gap-2 w-full">
                                      <div className="flex items-center gap-1.5">
                                        <Calendar className="w-3 h-3 text-amber-500 shrink-0" />
                                        <span className={exp ? 'text-rose-600 line-through' : nearExp ? 'text-amber-600 font-black' : ''}>
                                          {expDate}
                                        </span>
                                        {nearExp && !exp && (
                                          <span className="text-[9px] bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300 px-1 rounded">
                                            قريب
                                          </span>
                                        )}
                                      </div>
                                      <Badge
                                        variant="outline"
                                        className="text-[10px] font-mono border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800"
                                      >
                                        متاح: {batchQtyInUnit}
                                      </Badge>
                                    </div>
                                  </SelectItem>
                                );
                              })}
                            </SelectContent>
                          </Select>
                        </div>
                      ) : (
                        <span className="text-slate-400 text-xs font-bold bg-slate-50 dark:bg-slate-800/60 px-2 py-1 rounded-lg">
                          بدون تاريخ
                        </span>
                      )}
                    </td>

                    {/* Unit Selector */}
                    <td className="py-3.5 px-3 text-center">
                      <div className="inline-block w-28">
                        <Select
                          value={line.unitId}
                          onValueChange={(newU) => {
                            const matched = opts.find((o) => o.unitId === newU);
                            onUnitChange(line.key, newU, matched?.factor || 1, matched?.price);
                          }}
                        >
                          <SelectTrigger className="h-8 rounded-xl bg-slate-100 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-xs font-bold">
                            <SelectValue placeholder="الوحدة" />
                          </SelectTrigger>
                          <SelectContent className="z-50 bg-white dark:bg-[#131b2e] border border-slate-200 dark:border-slate-800 rounded-xl shadow-xl">
                            {opts.map((o) => (
                              <SelectItem
                                key={o.unitId}
                                value={o.unitId}
                                className="text-xs font-bold cursor-pointer py-1.5 px-2.5"
                              >
                                {unitsById[o.unitId]?.name || o.unitId}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </td>

                    {/* Quantity Stepper & Available count */}
                    <td className="py-3.5 px-3 text-center">
                      <div className="flex flex-col items-center gap-1">
                        <div className="flex items-center justify-center gap-1 bg-slate-100 dark:bg-slate-800 rounded-xl p-0.5 border border-slate-200/80 dark:border-slate-700 focus-within:ring-2 focus-within:ring-emerald-500/30 focus-within:border-emerald-500">
                          <button
                            type="button"
                            onClick={() => onUpdateQty(line.key, -1)}
                            className="w-7 h-7 rounded-lg bg-white dark:bg-slate-700 text-slate-600 dark:text-slate-200 hover:bg-slate-200 flex items-center justify-center transition-colors cursor-pointer"
                          >
                            <Minus className="w-3.5 h-3.5" />
                          </button>

                          <input
                            ref={(el) => {
                              qtyInputRefs.current[line.key] = el;
                            }}
                            type="number"
                            step="any"
                            value={line.qty}
                            onFocus={(e) => e.target.select()}
                            onChange={(e) => {
                              const val = parseFloat(e.target.value);
                              onSetQty(line.key, isNaN(val) ? 0 : val);
                            }}
                            onKeyDown={(e) => {
                              if (e.key === 'ArrowUp') {
                                e.preventDefault();
                                onUpdateQty(line.key, 1);
                              } else if (e.key === 'ArrowDown') {
                                e.preventDefault();
                                onUpdateQty(line.key, -1);
                              } else if (e.key === 'Enter') {
                                e.preventDefault();
                                if (onFocusSearch) {
                                  onFocusSearch();
                                }
                              }
                            }}
                            className="w-14 text-center bg-transparent font-black text-xs text-slate-900 dark:text-white focus:outline-none"
                          />

                          <button
                            type="button"
                            onClick={() => onUpdateQty(line.key, 1)}
                            className="w-7 h-7 rounded-lg bg-white dark:bg-slate-700 text-emerald-600 dark:text-emerald-400 hover:bg-slate-200 flex items-center justify-center transition-colors cursor-pointer"
                          >
                            <Plus className="w-3.5 h-3.5" />
                          </button>

                          {(product?.measurement_type === 'weight' || product?.scale_code || line.factor === 0.001) && (
                            <Popover>
                              <PopoverTrigger asChild>
                                <button
                                  type="button"
                                  title="خيارات الوزن والميزان السريع"
                                  className="w-7 h-7 rounded-lg bg-cyan-50 dark:bg-cyan-950/60 border border-cyan-200 dark:border-cyan-800 text-cyan-600 dark:text-cyan-400 hover:bg-cyan-100 dark:hover:bg-cyan-900/50 flex items-center justify-center transition-colors cursor-pointer"
                                >
                                  <Scale className={`w-3.5 h-3.5 ${isReadingScale ? 'animate-spin' : ''}`} />
                                </button>
                              </PopoverTrigger>
                              <PopoverContent align="center" className="w-80 p-3.5 text-right font-sans">
                                <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-2 mb-2.5">
                                  <div className="flex items-center gap-1.5 font-black text-xs text-slate-800 dark:text-slate-100">
                                    <Scale className="w-4 h-4 text-cyan-600 dark:text-cyan-400" />
                                    <span>خيارات الوزن (ميزان الصنف)</span>
                                  </div>
                                  <Badge variant="outline" className="text-[10px] font-mono bg-cyan-50 dark:bg-cyan-950/50 text-cyan-700 dark:text-cyan-300 border-cyan-200 dark:border-cyan-800">
                                    {line.factor < 1 ? 'الوحدة: جرام' : 'الوحدة: كيلوجرام'}
                                  </Badge>
                                </div>

                                {/* Live Scale Read Button */}
                                <button
                                  type="button"
                                  onClick={() => onReadLiveWeight(line.key)}
                                  disabled={isReadingScale}
                                  className="w-full mb-3 flex items-center justify-center gap-2 py-2 px-3 rounded-xl bg-cyan-600 hover:bg-cyan-700 text-white text-xs font-bold shadow-xs transition-colors cursor-pointer"
                                >
                                  <Scale className={`w-4 h-4 ${isReadingScale ? 'animate-spin' : ''}`} />
                                  <span>{isReadingScale ? 'جاري القراءة من الميزان...' : 'قراءة الوزن من الميزان الإلكتروني (F6)'}</span>
                                </button>

                                {/* Quick Weight Presets */}
                                <div className="space-y-1.5">
                                  <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400">
                                    أوزان سريعة جاهزة:
                                  </span>
                                  <div className="grid grid-cols-3 gap-1.5">
                                    {[
                                      { label: '100 جم', kgVal: 0.1, gVal: 100 },
                                      { label: 'ربع كيلو (250 جم)', kgVal: 0.25, gVal: 250 },
                                      { label: 'نصف كيلو (500 جم)', kgVal: 0.5, gVal: 500 },
                                      { label: '3/4 كيلو (750 جم)', kgVal: 0.75, gVal: 750 },
                                      { label: '1 كجم', kgVal: 1.0, gVal: 1000 },
                                      { label: '2 كجم', kgVal: 2.0, gVal: 2000 },
                                    ].map((preset) => {
                                      const targetQty = line.factor < 1 ? preset.gVal : preset.kgVal;
                                      return (
                                        <button
                                          key={preset.label}
                                          type="button"
                                          onClick={() => onSetQty(line.key, targetQty)}
                                          className="py-1.5 px-1 text-center rounded-lg bg-slate-100 hover:bg-cyan-100 hover:text-cyan-800 dark:bg-slate-800 dark:hover:bg-cyan-950/80 dark:hover:text-cyan-300 text-[10px] font-bold text-slate-700 dark:text-slate-300 border border-slate-200/60 dark:border-slate-700 transition-colors cursor-pointer"
                                        >
                                          {preset.label}
                                        </button>
                                      );
                                    })}
                                  </div>
                                </div>

                                {/* Custom Grams / KG Direct Inputs */}
                                <div className="mt-3 pt-2.5 border-t border-slate-100 dark:border-slate-800 grid grid-cols-2 gap-2">
                                  <div>
                                    <label className="text-[10px] font-bold text-slate-500 block mb-1">
                                      تحديد بالجرام:
                                    </label>
                                    <div className="flex items-center gap-1 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg px-2 py-1">
                                      <input
                                        type="number"
                                        placeholder="مثال: 350"
                                        className="w-full bg-transparent text-xs font-mono font-bold focus:outline-none"
                                        onKeyDown={(e) => {
                                          if (e.key === 'Enter') {
                                            const grams = parseFloat((e.target as HTMLInputElement).value);
                                            if (!isNaN(grams) && grams > 0) {
                                              const newQty = line.factor < 1 ? grams : grams / 1000;
                                              onSetQty(line.key, newQty);
                                            }
                                          }
                                        }}
                                      />
                                      <span className="text-[9px] text-slate-400 font-bold">جم</span>
                                    </div>
                                  </div>

                                  <div>
                                    <label className="text-[10px] font-bold text-slate-500 block mb-1">
                                      تحديد بالكيلو:
                                    </label>
                                    <div className="flex items-center gap-1 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg px-2 py-1">
                                      <input
                                        type="number"
                                        step="0.001"
                                        placeholder="مثال: 1.25"
                                        className="w-full bg-transparent text-xs font-mono font-bold focus:outline-none"
                                        onKeyDown={(e) => {
                                          if (e.key === 'Enter') {
                                            const kg = parseFloat((e.target as HTMLInputElement).value);
                                            if (!isNaN(kg) && kg > 0) {
                                              const newQty = line.factor < 1 ? kg * 1000 : kg;
                                              onSetQty(line.key, newQty);
                                            }
                                          }
                                        }}
                                      />
                                      <span className="text-[9px] text-slate-400 font-bold">كجم</span>
                                    </div>
                                  </div>
                                </div>
                              </PopoverContent>
                            </Popover>
                          )}
                        </div>

                        {/* Available Stock Indicator */}
                        {line.maxReturnQty !== undefined ? (
                          <span className="text-[10px] font-bold text-rose-500 dark:text-rose-400 font-mono">
                            المتاح للإرجاع: {line.maxReturnQty}
                          </span>
                        ) : (
                          <span
                            className={`text-[10px] font-mono font-bold ${
                              avail <= 0
                                ? 'text-rose-600 dark:text-rose-400'
                                : avail <= 5
                                ? 'text-amber-600 dark:text-amber-400'
                                : 'text-emerald-600 dark:text-emerald-400'
                            }`}
                          >
                            المتاح: {avail}
                          </span>
                        )}
                      </div>
                    </td>

                    {/* Unit Price */}
                    <td className="py-3.5 px-3 text-center font-mono font-bold text-sm text-slate-800 dark:text-slate-200">
                      {line.price.toFixed(2)}{' '}
                      <span className="text-[10px] font-normal text-slate-400">ج.م</span>
                      {product?.has_dual_pricing && onToggleLinePriceTier && (
                        <div className="mt-1">
                          <button
                            type="button"
                            onClick={() => onToggleLinePriceTier(line.key)}
                            title={line.priceTier === 'old' ? 'التبديل إلى سعر البيع الجديد' : 'التبديل إلى سعر البيع القديم'}
                            className={`text-[9px] font-bold px-1.5 py-0.5 rounded-md transition-colors cursor-pointer ${
                              line.priceTier === 'old'
                                ? 'bg-violet-50 text-violet-700 dark:bg-violet-950/40 dark:text-violet-300 border border-violet-200 dark:border-violet-800'
                                : 'bg-slate-100 text-slate-400 hover:text-slate-600 dark:bg-slate-800 dark:text-slate-500 border border-slate-100 dark:border-slate-700'
                            }`}
                          >
                            {line.priceTier === 'old' ? 'سعر قديم' : 'سعر جديد'}
                          </button>
                        </div>
                      )}
                    </td>

                    {/* Line Total */}
                    <td className="py-3.5 px-3 text-center">
                      <div className="font-mono font-black text-sm text-emerald-600 dark:text-emerald-400">
                        {totalLineVal.toFixed(2)}{' '}
                        <span className="text-[10px] font-normal text-slate-400">ج.م</span>
                      </div>
                      {line.discount > 0 ? (
                        <button
                          type="button"
                          onClick={onOpenDiscountsModal}
                          title="تعديل خصم الصنف"
                          className="text-[10px] text-red-500 hover:text-red-600 font-bold hover:underline cursor-pointer"
                        >
                          خصم: {line.discount} ج.م
                        </button>
                      ) : (
                        <button
                          type="button"
                          onClick={onOpenDiscountsModal}
                          title="إضافة خصم على هذا الصنف"
                          className="text-[10px] text-slate-400 hover:text-amber-500 font-semibold transition-colors cursor-pointer"
                        >
                          + خصم
                        </button>
                      )}
                    </td>

                    {/* Actions: Delete */}
                    <td className="py-3.5 px-3 text-center">
                      <div className="flex items-center justify-center gap-1">
                        <button
                          type="button"
                          onClick={onOpenDiscountsModal}
                          title="خصم الصنف"
                          className="w-7 h-7 rounded-lg bg-amber-50 hover:bg-amber-100 dark:bg-amber-950/40 text-amber-600 flex items-center justify-center transition-colors cursor-pointer"
                        >
                          <Tag className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => onRemoveLine(line.key)}
                          title="حذف الصنف"
                          className="w-7 h-7 rounded-lg bg-rose-50 hover:bg-rose-100 dark:bg-rose-950/40 text-rose-600 flex items-center justify-center transition-colors cursor-pointer"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </main>
  );
}
