'use client';

import React, { useState, useEffect, useMemo } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import {
  Shield,
  Truck,
  Tag,
  Percent,
  DollarSign,
  Package,
  Layers,
  X,
  CheckCircle,
} from 'lucide-react';
import { formatNumber } from '@/lib/format';
import type { CartLine } from '../types';
import type { Product, Unit } from '@/types';
import { toast } from 'sonner';

interface PosDiscountsModalProps {
  isOpen: boolean;
  onClose: () => void;
  cart: CartLine[];
  products: Product[];
  unitsById: Record<string, Unit>;
  globalDiscount: number;
  shippingFee: number;
  onApplyDiscounts: (params: {
    globalDiscount: number;
    globalDiscountPercent: number;
    shippingFee: number;
    lineDiscounts: Record<string, number>;
  }) => void;
}

export function PosDiscountsModal({
  isOpen,
  onClose,
  cart,
  products,
  unitsById,
  globalDiscount: initialGlobalDiscount,
  shippingFee: initialShippingFee,
  onApplyDiscounts,
}: PosDiscountsModalProps) {
  const [activeTab, setActiveTab] = useState<'global' | 'items' | 'shipping'>('global');

  // Global Discount State
  const [globalMode, setGlobalMode] = useState<'amount' | 'percentage'>('amount');
  const [globalValue, setGlobalValue] = useState<string>('');

  // Shipping Fee State
  const [shippingValue, setShippingValue] = useState<string>('');

  // Line discounts state: key -> discount amount in EGP
  const [lineDiscounts, setLineDiscounts] = useState<Record<string, { value: string; mode: 'amount' | 'percentage' }>>({});

  // Initialize values on open
  useEffect(() => {
    if (isOpen) {
      setGlobalMode('amount');
      setGlobalValue(initialGlobalDiscount > 0 ? String(initialGlobalDiscount) : '');
      setShippingValue(initialShippingFee > 0 ? String(initialShippingFee) : '');

      const initialLineMap: Record<string, { value: string; mode: 'amount' | 'percentage' }> = {};
      for (const line of cart) {
        initialLineMap[line.key] = {
          value: line.discount > 0 ? String(line.discount) : '',
          mode: 'amount',
        };
      }
      setLineDiscounts(initialLineMap);
    }
  }, [isOpen, initialGlobalDiscount, initialShippingFee, cart]);

  const getProductName = (id: string) => products.find((p) => p.id === id)?.name || 'صنف';
  const getProductSku = (id: string) => products.find((p) => p.id === id)?.sku || '—';

  // Subtotal of cart
  const subtotal = useMemo(() => {
    return cart.reduce((sum, l) => sum + l.qty * l.price, 0);
  }, [cart]);

  // Computed line discounts
  const calculatedLineDiscounts = useMemo(() => {
    const map: Record<string, number> = {};
    for (const line of cart) {
      const state = lineDiscounts[line.key];
      const val = parseFloat(state?.value || '0') || 0;
      const lineSub = line.qty * line.price;

      if (state?.mode === 'percentage') {
        map[line.key] = Math.min(lineSub, Number(((lineSub * val) / 100).toFixed(2)));
      } else {
        map[line.key] = Math.min(lineSub, val);
      }
    }
    return map;
  }, [cart, lineDiscounts]);

  const totalItemDiscounts = useMemo(() => {
    return Object.values(calculatedLineDiscounts).reduce((sum, d) => sum + d, 0);
  }, [calculatedLineDiscounts]);

  // Computed global discount
  const calculatedGlobalDiscount = useMemo(() => {
    const val = parseFloat(globalValue) || 0;
    const remainingAfterItemDiscounts = Math.max(0, subtotal - totalItemDiscounts);

    if (globalMode === 'percentage') {
      return Math.min(
        remainingAfterItemDiscounts,
        Number(((remainingAfterItemDiscounts * val) / 100).toFixed(2))
      );
    }
    return Math.min(remainingAfterItemDiscounts, val);
  }, [globalValue, globalMode, subtotal, totalItemDiscounts]);

  const calculatedShipping = useMemo(() => {
    return Math.max(0, parseFloat(shippingValue) || 0);
  }, [shippingValue]);

  const totalDiscounts = totalItemDiscounts + calculatedGlobalDiscount;
  const finalTotal = Math.max(0, subtotal - totalDiscounts) + calculatedShipping;

  // Apply Changes
  const handleApply = () => {
    onApplyDiscounts({
      globalDiscount: calculatedGlobalDiscount,
      globalDiscountPercent: globalMode === 'percentage' ? Number(parseFloat(globalValue) || 0) : 0,
      shippingFee: calculatedShipping,
      lineDiscounts: calculatedLineDiscounts,
    });
    toast.success('تم تطبيق الخصومات والإضافات على الفاتورة بنجاح!');
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent
        className="w-[95vw] sm:max-w-xl max-h-[92vh] overflow-hidden flex flex-col p-3.5 sm:p-6 rounded-3xl border-slate-200 dark:border-slate-800 bg-white dark:bg-[#111726] shadow-2xl text-right"
        dir="rtl"
      >
        {/* Header matching user's design */}
        <DialogHeader className="pb-2.5 sm:pb-3 border-b border-slate-100 dark:border-slate-800 flex flex-col items-center text-center space-y-1 shrink-0 relative">
          <div className="flex items-center justify-center gap-2">
            <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-full bg-blue-50 dark:bg-blue-950/60 text-blue-500 flex items-center justify-center border border-blue-200/60 dark:border-blue-800/60 shadow-xs">
              <Shield className="w-4 h-4 sm:w-5 sm:h-5 fill-blue-500/20 text-blue-600 dark:text-blue-400" />
            </div>
            <DialogTitle className="text-base sm:text-lg font-black text-slate-900 dark:text-white">
              إضافات وخصومات الفاتورة
            </DialogTitle>
          </div>
          <DialogDescription className="text-[11px] sm:text-xs font-medium text-slate-500 dark:text-slate-400">
            تطبيق خصم إجمالي أو على أصناف محددة ومصاريف التوصيل
          </DialogDescription>
        </DialogHeader>

        {/* Tab Navigation Controls */}
        <div className="flex items-center justify-center gap-2 py-1.5 sm:py-2 shrink-0">
          <div className="flex items-center bg-slate-100 dark:bg-slate-900/80 p-0.5 sm:p-1 rounded-2xl border border-slate-200/80 dark:border-slate-800 w-full">
            <button
              type="button"
              onClick={() => setActiveTab('global')}
              className={`flex-1 py-1.5 rounded-xl text-[11px] sm:text-xs font-black transition-all flex items-center justify-center gap-1 sm:gap-1.5 cursor-pointer ${
                activeTab === 'global'
                  ? 'bg-white dark:bg-slate-800 text-fuchsia-600 dark:text-fuchsia-400 shadow-xs'
                  : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
              }`}
            >
              <Tag className="w-3.5 h-3.5 shrink-0" />
              <span className="hidden xs:inline">خصم الفاتورة الإجمالي</span>
              <span className="inline xs:hidden">الفاتورة</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('items')}
              className={`flex-1 py-1.5 rounded-xl text-[11px] sm:text-xs font-black transition-all flex items-center justify-center gap-1 sm:gap-1.5 cursor-pointer ${
                activeTab === 'items'
                  ? 'bg-white dark:bg-slate-800 text-blue-600 dark:text-blue-400 shadow-xs'
                  : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
              }`}
            >
              <Package className="w-3.5 h-3.5 shrink-0" />
              <span className="hidden xs:inline">خصم الأصناف ({cart.length})</span>
              <span className="inline xs:hidden">الأصناف ({cart.length})</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('shipping')}
              className={`flex-1 py-1.5 rounded-xl text-[11px] sm:text-xs font-black transition-all flex items-center justify-center gap-1 sm:gap-1.5 cursor-pointer ${
                activeTab === 'shipping'
                  ? 'bg-white dark:bg-slate-800 text-emerald-600 dark:text-emerald-400 shadow-xs'
                  : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
              }`}
            >
              <Truck className="w-3.5 h-3.5 shrink-0" />
              <span className="hidden xs:inline">مصاريف الشحن</span>
              <span className="inline xs:hidden">الشحن</span>
            </button>
          </div>
        </div>

        {/* Scrollable Tab Content */}
        <div className="flex-1 overflow-y-auto space-y-4 py-2 pr-1 text-xs min-h-[160px]">
          {/* TAB 1: Global Invoice Discount */}
          {activeTab === 'global' && (
            <div className="space-y-3 animate-in fade-in-50 duration-200">
              <div className="p-4 rounded-2xl bg-slate-50/70 dark:bg-slate-900/40 border border-slate-200/80 dark:border-slate-800 space-y-3">
                <div className="flex items-center justify-between">
                  <Label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                    نوع الخصم الإجمالي:
                  </Label>
                  <div className="flex items-center gap-1 bg-white dark:bg-slate-800 p-0.5 rounded-xl border border-slate-200 dark:border-slate-700">
                    <button
                      type="button"
                      onClick={() => setGlobalMode('amount')}
                      className={`px-3 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                        globalMode === 'amount'
                          ? 'bg-fuchsia-500 text-white shadow-2xs'
                          : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
                      }`}
                    >
                      مبلغ ثابت (ج.م)
                    </button>
                    <button
                      type="button"
                      onClick={() => setGlobalMode('percentage')}
                      className={`px-3 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                        globalMode === 'percentage'
                          ? 'bg-fuchsia-500 text-white shadow-2xs'
                          : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
                      }`}
                    >
                      نسبة مئوية (%)
                    </button>
                  </div>
                </div>

                <div className="relative">
                  {globalMode === 'percentage' ? (
                    <Percent className="w-4 h-4 text-slate-400 absolute right-3.5 top-1/2 -translate-y-1/2" />
                  ) : (
                    <DollarSign className="w-4 h-4 text-slate-400 absolute right-3.5 top-1/2 -translate-y-1/2" />
                  )}
                  <Input
                    type="number"
                    min="0"
                    step="any"
                    autoFocus
                    value={globalValue}
                    onChange={(e) => setGlobalValue(e.target.value)}
                    placeholder={globalMode === 'percentage' ? 'أدخل النسبة المئوية للخصم (مثال: 10)...' : 'أدخل قيمة الخصم بالجنيه...'}
                    className="h-11 pr-10 pl-10 text-sm font-black font-mono rounded-2xl bg-white dark:bg-[#0d1322] border-2 border-fuchsia-500/80 focus-visible:ring-fuchsia-400"
                  />
                  {globalValue && (
                    <button
                      type="button"
                      onClick={() => setGlobalValue('')}
                      className="w-5 h-5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-400 hover:text-slate-600 absolute left-3 top-1/2 -translate-y-1/2 flex items-center justify-center cursor-pointer"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  )}
                </div>

                {parseFloat(globalValue) > 0 && (
                  <div className="flex items-center justify-between text-xs font-bold text-fuchsia-600 dark:text-fuchsia-400 pt-1">
                    <span>قيمة الخصم المقتطعة:</span>
                    <span className="font-mono font-black text-sm">
                      {formatNumber(calculatedGlobalDiscount)} ج.م
                    </span>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* TAB 2: Item Specific Discounts */}
          {activeTab === 'items' && (
            <div className="space-y-2 animate-in fade-in-50 duration-200">
              {cart.length === 0 ? (
                <div className="py-12 text-center text-slate-400 font-bold">
                  السلة فارغة! يرجى إضافة أصناف أولاً لتطبيق الخصم عليها.
                </div>
              ) : (
                cart.map((line, idx) => {
                  const state = lineDiscounts[line.key] || { value: '', mode: 'amount' };
                  const lineSub = line.qty * line.price;
                  const discountAmt = calculatedLineDiscounts[line.key] || 0;
                  const netTotal = Math.max(0, lineSub - discountAmt);

                  return (
                    <div
                      key={line.key}
                      className="p-3 rounded-2xl border border-slate-200/80 dark:border-slate-800 bg-slate-50/50 dark:bg-[#131b2e] flex flex-col sm:flex-row items-center justify-between gap-3 shadow-2xs"
                    >
                      {/* Product details */}
                      <div className="flex items-center gap-2.5 flex-1 min-w-0">
                        <span className="w-6 h-6 rounded-full bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-300 font-black text-[11px] flex items-center justify-center shrink-0">
                          {idx + 1}
                        </span>
                        <div className="min-w-0">
                          <span className="font-black text-xs text-slate-900 dark:text-white truncate block">
                            {getProductName(line.productId)}
                          </span>
                          <span className="text-[10px] text-slate-400 font-mono">
                            {line.qty} × {line.price.toFixed(2)} = {lineSub.toFixed(2)} ج.م
                          </span>
                        </div>
                      </div>

                      {/* Discount input for this item */}
                      <div className="flex items-center gap-2 shrink-0">
                        {/* Mode toggle */}
                        <button
                          type="button"
                          onClick={() => {
                            const nextMode = state.mode === 'amount' ? 'percentage' : 'amount';
                            setLineDiscounts((prev) => ({
                              ...prev,
                              [line.key]: { ...state, mode: nextMode },
                            }));
                          }}
                          className="h-8 px-2 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 text-[10px] font-black text-slate-600 dark:text-slate-300 transition-colors cursor-pointer"
                        >
                          {state.mode === 'percentage' ? '%' : 'ج.م'}
                        </button>

                        <Input
                          type="number"
                          min="0"
                          step="any"
                          value={state.value}
                          onChange={(e) => {
                            const val = e.target.value;
                            setLineDiscounts((prev) => ({
                              ...prev,
                              [line.key]: { ...state, value: val },
                            }));
                          }}
                          placeholder="الخصم..."
                          className="h-8 w-20 text-center font-black font-mono text-xs rounded-xl bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700"
                        />

                        {/* Net item price */}
                        <div className="text-left min-w-[70px]">
                          <span className="text-xs font-black font-mono text-blue-600 dark:text-blue-400 block">
                            {netTotal.toFixed(2)} ج.م
                          </span>
                          {discountAmt > 0 && (
                            <span className="text-[9px] text-red-500 font-bold block">
                              -{discountAmt.toFixed(2)}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          )}

          {/* TAB 3: Shipping / Delivery Fee */}
          {activeTab === 'shipping' && (
            <div className="space-y-3 animate-in fade-in-50 duration-200">
              <div className="p-4 rounded-2xl bg-slate-50/70 dark:bg-slate-900/40 border border-slate-200/80 dark:border-slate-800 space-y-2">
                <Label className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                  <Truck className="w-4 h-4 text-emerald-500" />
                  <span>مصاريف الشحن / التوصيل:</span>
                </Label>

                <div className="relative">
                  <Truck className="w-4 h-4 text-slate-400 absolute right-3.5 top-1/2 -translate-y-1/2" />
                  <Input
                    type="number"
                    min="0"
                    step="any"
                    autoFocus
                    value={shippingValue}
                    onChange={(e) => setShippingValue(e.target.value)}
                    placeholder="0.0"
                    className="h-11 pr-10 pl-10 text-sm font-black font-mono rounded-2xl bg-white dark:bg-[#0d1322] border-2 border-emerald-500/80 focus-visible:ring-emerald-400"
                  />
                  {shippingValue && (
                    <button
                      type="button"
                      onClick={() => setShippingValue('')}
                      className="w-5 h-5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-400 hover:text-slate-600 absolute left-3 top-1/2 -translate-y-1/2 flex items-center justify-center cursor-pointer"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Summary Box */}
          <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-[#131b2e] border border-slate-200/80 dark:border-slate-800 space-y-1.5 text-xs">
            <div className="flex items-center justify-between text-slate-500">
              <span>الإجمالي قبل الخصومات:</span>
              <span className="font-mono font-bold text-slate-700 dark:text-slate-300">
                {formatNumber(subtotal)} ج.م
              </span>
            </div>

            {totalDiscounts > 0 && (
              <div className="flex items-center justify-between text-fuchsia-600 dark:text-fuchsia-400 font-bold">
                <span>إجمالي الخصومات المطبقة:</span>
                <span className="font-mono font-black">
                  -{formatNumber(totalDiscounts)} ج.م
                </span>
              </div>
            )}

            {calculatedShipping > 0 && (
              <div className="flex items-center justify-between text-emerald-600 dark:text-emerald-400 font-bold">
                <span>مصاريف الشحن والتوصيل:</span>
                <span className="font-mono font-black">
                  +{formatNumber(calculatedShipping)} ج.م
                </span>
              </div>
            )}

            <div className="pt-2 border-t border-slate-200 dark:border-slate-700 flex items-center justify-between">
              <span className="font-black text-slate-800 dark:text-white">الصافي النهائي:</span>
              <span className="font-black font-mono text-base text-emerald-600 dark:text-emerald-400">
                {formatNumber(finalTotal)} ج.م
              </span>
            </div>
          </div>
        </div>

        {/* Action Buttons matching screenshot */}
        <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex flex-col items-center gap-2 shrink-0">
          <Button
            type="button"
            onClick={handleApply}
            className="w-full h-11 rounded-2xl bg-fuchsia-600 hover:bg-fuchsia-700 text-white font-black text-sm shadow-md hover:shadow-lg transition-all cursor-pointer"
          >
            تطبيق التعديلات
          </Button>

          <button
            type="button"
            onClick={onClose}
            className="text-xs font-bold text-pink-600 hover:text-pink-700 dark:text-pink-400 py-1 transition-colors cursor-pointer"
          >
            إلغاء
          </button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
