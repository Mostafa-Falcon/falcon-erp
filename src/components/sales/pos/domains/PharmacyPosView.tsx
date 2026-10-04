'use client';

import React, { useState, useMemo } from 'react';
import {
  Pill,
  Search,
  Calendar,
  AlertTriangle,
  Plus,
  Minus,
  Trash2,
  Tag,
  CreditCard,
  Banknote,
  Split,
  Layers,
  Sparkles,
  FileSpreadsheet,
  CheckCircle2,
  ArrowRight,
  Receipt,
} from 'lucide-react';
import { toast } from 'sonner';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { formatNumber, isExpired, daysToExpiry } from '@/lib/format';
import type { Product, Unit, ProductBatch } from '@/types';
import type { CartLine, UnitOption } from '../types';

interface PharmacyPosViewProps {
  cart: CartLine[];
  products: Product[];
  unitsById: Record<string, Unit>;
  unitOptions: Record<string, UnitOption[]>;
  batches: Record<string, ProductBatch[]>;
  availableFor: (pId: string, unitId?: string, factor?: number, batchId?: string) => number;
  onAddToCart: (product: Product, options?: any) => void;
  onUpdateQty: (key: string, delta: number) => void;
  onSetQty: (key: string, qty: number) => void;
  onRemoveLine: (key: string) => void;
  onUnitChange: (key: string, newUnitId: string, factor: number, price?: number) => void;
  onSetLineBatch?: (key: string, batchId: string) => void;
  onClearCart: () => void;
  orgId: string;
  branchId: string;
  onCheckout: (type: 'cash' | 'card' | 'credit' | 'split') => void;
  isSaving: boolean;
  subtotal: number;
  totalDiscount: number;
  shippingFee: number;
  totalTax: number;
  total: number;
  onOpenCustomerModal: () => void;
  onOpenDiscountsModal: () => void;
  onOpenSplitModal: () => void;
  activeShift: any;
}

export function PharmacyPosView({
  cart,
  products,
  unitsById,
  unitOptions,
  batches,
  availableFor,
  onAddToCart,
  onUpdateQty,
  onSetQty,
  onRemoveLine,
  onUnitChange,
  onSetLineBatch,
  onClearCart,
  orgId,
  branchId,
  onCheckout,
  isSaving,
  subtotal,
  totalDiscount,
  shippingFee,
  totalTax,
  total,
  onOpenCustomerModal,
  onOpenDiscountsModal,
  onOpenSplitModal,
  activeShift,
}: PharmacyPosViewProps) {
  // Mobile responsive view mode
  const [mobileTab, setMobileTab] = useState<'catalog' | 'cart'>('catalog');

  const [searchQuery, setSearchQuery] = useState('');
  const [substituteActiveFor, setSubstituteActiveFor] = useState<Product | null>(null);

  // Search medicines
  const searchResults = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return [];
    return products
      .filter((p) => {
        const nameMatch = p.name.toLowerCase().includes(q);
        const skuMatch = p.sku.toLowerCase().includes(q);
        const activeIngredientMatch = (p as any).active_ingredient?.toLowerCase().includes(q);
        return nameMatch || skuMatch || activeIngredientMatch;
      })
      .slice(0, 15);
  }, [products, searchQuery]);

  // Find substitutes for active ingredient
  const substitutesList = useMemo(() => {
    if (!substituteActiveFor) return [];
    const activeIngredient = (substituteActiveFor as any).active_ingredient?.trim().toLowerCase();
    if (!activeIngredient) return [];
    return products.filter((p) => {
      if (p.id === substituteActiveFor.id) return false;
      const ing = (p as any).active_ingredient?.trim().toLowerCase();
      return ing && ing === activeIngredient;
    });
  }, [substituteActiveFor, products]);

  return (
    <div className="flex-1 flex flex-col md:flex-row overflow-hidden bg-slate-100/60 dark:bg-[#070b13]">
      {/* 
        LEFT COLUMN: Medicine Search & Expiry / Substitutes
        On mobile: visible only when mobileTab === 'catalog'
      */}
      <div
        className={`flex-1 flex flex-col min-w-0 border-b md:border-b-0 md:border-l border-slate-200 dark:border-slate-800 bg-white dark:bg-[#0b101b] ${
          mobileTab === 'catalog' ? 'flex' : 'hidden md:flex'
        }`}
      >
        {/* Mobile Tab Toggle Bar (< md only) */}
        <div className="md:hidden p-2 border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/60">
          <div className="flex items-center bg-slate-200/90 dark:bg-slate-800 p-0.5 rounded-xl border border-slate-300/80 dark:border-slate-700">
            <button
              type="button"
              onClick={() => setMobileTab('catalog')}
              className={`flex-1 py-1.5 px-3 rounded-lg text-xs font-black transition-all flex items-center justify-center gap-1.5 ${
                mobileTab === 'catalog'
                  ? 'bg-white dark:bg-slate-700 text-emerald-600 dark:text-emerald-400 shadow-xs'
                  : 'text-slate-600 dark:text-slate-400'
              }`}
            >
              <Pill className="w-3.5 h-3.5" />
              <span>دليل الأدوية والصرف</span>
            </button>
            <button
              type="button"
              onClick={() => setMobileTab('cart')}
              className={`flex-1 py-1.5 px-3 rounded-lg text-xs font-black transition-all flex items-center justify-center gap-1.5 ${
                mobileTab === 'cart'
                  ? 'bg-white dark:bg-slate-700 text-emerald-600 dark:text-emerald-400 shadow-xs'
                  : 'text-slate-600 dark:text-slate-400'
              }`}
            >
              <Receipt className="w-3.5 h-3.5" />
              <span>الروشتة ({cart.length})</span>
              {total > 0 && (
                <span className="text-4xs bg-emerald-500 text-slate-950 px-1.5 py-0.2 rounded-full font-mono font-black">
                  {formatNumber(total)}
                </span>
              )}
            </button>
          </div>
        </div>

        {/* Header Widget */}
        <div className="p-2.5 sm:p-3 border-b border-slate-200 dark:border-slate-800 bg-slate-50/80 dark:bg-slate-900/60 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="p-1 rounded-lg bg-emerald-500/10 text-emerald-600">
              <Pill className="w-4 h-4" />
            </span>
            <span className="font-black text-xs text-slate-900 dark:text-white">
              كاشير ونقطة بيع الصيدلية (FEFO)
            </span>
          </div>

          <Badge variant="outline" className="bg-emerald-500/10 text-emerald-600 border-emerald-500/30 text-3xs font-black">
            صرف الأدوية
          </Badge>
        </div>

        {/* Medicine Search Bar */}
        <div className="p-2 sm:p-3 border-b border-slate-200 dark:border-slate-800">
          <div className="relative">
            <Search className="w-4 h-4 absolute right-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              autoFocus
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="ابحث بالاسم التجاري، الباركود، أو المادة الفعالة..."
              className="w-full h-10 pr-9 pl-3 rounded-xl bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-xs font-bold focus:outline-none focus:ring-2 focus:ring-emerald-500"
            />
          </div>
        </div>

        {/* Search Results / Medicines Grid */}
        <div className="flex-1 overflow-y-auto p-2 sm:p-3 space-y-2">
          {searchResults.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-center p-6 text-slate-400">
              <Pill className="w-10 h-10 mb-2 opacity-30 stroke-[1.5]" />
              <p className="text-xs font-bold">ابحث عن دواء أو مستحضر للبدء بالصرف</p>
              <p className="text-3xs text-slate-500 mt-1">يدعم البحث بالمادة الفعالة والتشغيلات وتنبيهات الصلاحية</p>
            </div>
          ) : (
            searchResults.map((prod) => {
              const prodBatches = batches[prod.id] || [];
              const hasBatches = prodBatches.length > 0;
              const nearestBatch = prodBatches[0];
              const days = nearestBatch?.expiry_date ? daysToExpiry(nearestBatch.expiry_date) : Infinity;
              const nearExp = days >= 0 && days <= 90;
              const expired = nearestBatch?.expiry_date ? isExpired(nearestBatch.expiry_date) : false;
              const avail = availableFor(prod.id, prod.base_unit_id);

              return (
                <div
                  key={prod.id}
                  className="p-2.5 sm:p-3 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/80 hover:border-emerald-500 hover:shadow-md transition-all flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2.5"
                >
                  <div className="flex items-start gap-2.5">
                    <span className="text-xl mt-0.5">💊</span>
                    <div>
                      <div className="flex items-center gap-2">
                        <h4 className="font-black text-xs sm:text-sm text-slate-900 dark:text-white">
                          {prod.name}
                        </h4>
                        <span className="text-4xs text-slate-400 font-mono">
                          {prod.sku}
                        </span>
                      </div>

                      {(prod as any).active_ingredient && (
                        <div className="flex items-center gap-1.5 mt-1 flex-wrap">
                          <span className="text-4xs sm:text-3xs text-slate-500 font-bold">
                            المادة الفعالة: {(prod as any).active_ingredient}
                          </span>
                          <button
                            type="button"
                            onClick={() => setSubstituteActiveFor(prod)}
                            className="px-1.5 py-0.2 rounded bg-emerald-50 hover:bg-emerald-100 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300 font-black text-4xs transition-colors"
                          >
                            البدائل
                          </button>
                        </div>
                      )}

                      {/* Expiry Badge */}
                      {hasBatches && nearestBatch?.expiry_date && (
                        <div className="flex items-center gap-1.5 mt-1 text-4xs sm:text-3xs font-bold">
                          <Calendar className="w-3 h-3 text-amber-500" />
                          <span>صلاحية:</span>
                          <span
                            className={
                              expired
                                ? 'text-rose-600 font-black line-through'
                                : nearExp
                                ? 'text-amber-600 font-black'
                                : 'text-slate-600 dark:text-slate-300'
                            }
                          >
                            {nearestBatch.expiry_date}
                          </span>
                          {nearExp && !expired && (
                            <span className="px-1 py-0.2 rounded bg-amber-100 dark:bg-amber-950 text-amber-800 dark:text-amber-300 text-4xs font-black">
                              أوشك
                            </span>
                          )}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Actions: Quick add by Unit */}
                  <div className="flex items-center justify-between sm:justify-end gap-2 w-full sm:w-auto pt-1 sm:pt-0 border-t sm:border-t-0 border-slate-100 dark:border-slate-800">
                    <div className="text-right sm:text-left font-black text-xs sm:text-sm text-emerald-600 dark:text-emerald-400 font-mono">
                      {formatNumber(prod.sale_price || 0)} <span className="text-4xs">ج.م</span>
                      <span className="text-4xs text-slate-400 font-bold block">
                        متاح: {avail}
                      </span>
                    </div>

                    <div className="flex items-center gap-1">
                      {(unitOptions[prod.id] || []).map((u) => (
                        <button
                          key={u.unitId}
                          type="button"
                          onClick={() => {
                            onAddToCart(prod, {
                              unitId: u.unitId,
                              factor: u.factor,
                              price: u.price,
                            });
                            setSearchQuery('');
                          }}
                          className="px-2.5 py-1 rounded-xl border border-slate-200 dark:border-slate-800 hover:border-emerald-500 bg-slate-50 dark:bg-slate-800 hover:bg-emerald-50 text-xs font-black text-slate-800 dark:text-slate-200 transition-all cursor-pointer"
                        >
                          +{unitsById[u.unitId]?.name || 'وحدة'}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Floating Mobile Sticky Checkout Bar */}
        {cart.length > 0 && (
          <div
            onClick={() => setMobileTab('cart')}
            className="md:hidden sticky bottom-2 mx-3 z-30 p-3 rounded-2xl bg-gradient-to-r from-emerald-600 to-teal-700 text-white shadow-xl shadow-emerald-600/30 flex items-center justify-between cursor-pointer animate-in slide-in-from-bottom duration-200 active:scale-98"
          >
            <div className="flex items-center gap-2.5">
              <span className="w-8 h-8 rounded-xl bg-white/20 flex items-center justify-center font-black text-xs font-mono">
                {cart.length}
              </span>
              <div className="flex flex-col text-right">
                <span className="text-xs font-black">
                  الروشتة • {formatNumber(total)} ج.م
                </span>
                <span className="text-4xs text-emerald-200">
                  اضغط لمراجعة الأصناف وإتمام الصرف
                </span>
              </div>
            </div>
            <span className="text-xs font-black bg-white text-emerald-800 px-3.5 py-1.5 rounded-xl shadow-sm flex items-center gap-1">
              صرف ودفع 👈
            </span>
          </div>
        )}
      </div>

      {/* 
        RIGHT COLUMN: Pharmacy Prescription & Dispense Cart
        On mobile: visible only when mobileTab === 'cart'
      */}
      <div
        className={`w-full md:w-[380px] lg:w-[420px] flex flex-col bg-white dark:bg-[#0c121e] border-t md:border-t-0 md:border-r border-slate-200 dark:border-slate-800 ${
          mobileTab === 'cart' ? 'flex flex-1' : 'hidden md:flex'
        }`}
      >
        {/* Cart Header */}
        <div className="p-3 border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/60 flex flex-col gap-2">
          {/* Mobile Back Button */}
          <button
            type="button"
            onClick={() => setMobileTab('catalog')}
            className="md:hidden flex items-center justify-center gap-1.5 py-1.5 px-3 rounded-xl bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 font-black text-xs border border-emerald-500/30 transition-all cursor-pointer"
          >
            <ArrowRight className="w-4 h-4" />
            <span>العودة لدليل الأدوية وصرف المزيد</span>
          </button>

          <div className="flex items-center justify-between">
            <div>
              <span className="font-black text-sm text-slate-900 dark:text-white">
                روشتة وصرف الأدوية
              </span>
              <span className="text-3xs text-slate-400 font-mono block">
                {cart.length} مستحضرات في الروشتة الحالية
              </span>
            </div>

            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={onOpenCustomerModal}
                title="تحديد عميل"
                className="px-2.5 py-1 rounded-lg text-3xs font-bold bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300"
              >
                العميل / المريض
              </button>
              <button
                type="button"
                onClick={onClearCart}
                title="إلغاء الفاتورة"
                className="p-1.5 rounded-lg text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/40"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>

        {/* Cart Items */}
        <div className="flex-1 overflow-y-auto p-3 space-y-2">
          {cart.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-center p-6 text-slate-400">
              <Pill className="w-10 h-10 mb-2 opacity-30 stroke-[1.5]" />
              <p className="text-xs font-bold">الروشتة فارغة</p>
              <button
                type="button"
                onClick={() => setMobileTab('catalog')}
                className="md:hidden mt-3 px-4 py-2 rounded-xl bg-emerald-600 text-white font-black text-xs shadow-sm"
              >
                فتح دليل الأدوية
              </button>
            </div>
          ) : (
            cart.map((line) => {
              const prod = products.find((p) => p.id === line.productId);
              return (
                <div
                  key={line.key}
                  className="p-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/40 flex flex-col gap-1.5"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <h5 className="font-black text-xs text-slate-900 dark:text-white">
                        {prod?.name || 'مستحضر'}
                      </h5>
                      <span className="text-4xs text-slate-400 font-mono block">
                        وحدة: {unitsById[line.unitId]?.name || line.unitId}
                      </span>
                    </div>

                    <button
                      type="button"
                      onClick={() => onRemoveLine(line.key)}
                      className="text-slate-400 hover:text-rose-500 p-1"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  <div className="flex items-center justify-between pt-1 border-t border-slate-200/60 dark:border-slate-800">
                    <div className="flex items-center gap-1 bg-white dark:bg-slate-800 rounded-lg p-0.5 border border-slate-200 dark:border-slate-700">
                      <button
                        type="button"
                        onClick={() => onUpdateQty(line.key, -1)}
                        className="w-6 h-6 rounded flex items-center justify-center text-slate-600 dark:text-slate-300 hover:bg-slate-100"
                      >
                        <Minus className="w-3 h-3" />
                      </button>
                      <span className="w-8 text-center text-xs font-black font-mono">
                        {line.qty}
                      </span>
                      <button
                        type="button"
                        onClick={() => onUpdateQty(line.key, 1)}
                        className="w-6 h-6 rounded flex items-center justify-center text-slate-600 dark:text-slate-300 hover:bg-slate-100"
                      >
                        <Plus className="w-3 h-3" />
                      </button>
                    </div>

                    <div className="text-left font-black text-xs text-slate-900 dark:text-white">
                      {formatNumber(line.qty * line.price - line.discount)} <span className="text-4xs">ج.م</span>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Totals & Fast Checkout */}
        <div className="p-3 border-t border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/80 space-y-2">
          <div className="space-y-1 text-xs">
            <div className="flex justify-between text-slate-500 font-bold">
              <span>المجموع:</span>
              <span>{formatNumber(subtotal)} ج.م</span>
            </div>
            {totalDiscount > 0 && (
              <div className="flex justify-between text-rose-500 font-bold">
                <span>الخصم:</span>
                <span>-{formatNumber(totalDiscount)} ج.م</span>
              </div>
            )}
            <div className="flex justify-between text-slate-900 dark:text-white font-black text-base pt-1 border-t border-slate-200 dark:border-slate-800">
              <span>الإجمالي:</span>
              <span className="text-emerald-600 dark:text-emerald-400 font-mono">{formatNumber(total)} ج.م</span>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2 pt-1">
            <button
              type="button"
              disabled={cart.length === 0 || isSaving}
              onClick={() => onCheckout('cash')}
              className="h-10 sm:h-11 rounded-xl bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white font-black text-xs flex items-center justify-center gap-1.5 shadow-md shadow-emerald-600/20 transition-all cursor-pointer"
            >
              <Banknote className="w-4 h-4" />
              <span>صرف نقدي (F10)</span>
            </button>
            <button
              type="button"
              disabled={cart.length === 0 || isSaving}
              onClick={() => onCheckout('card')}
              className="h-10 sm:h-11 rounded-xl bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-black text-xs flex items-center justify-center gap-1.5 shadow-md shadow-blue-600/20 transition-all cursor-pointer"
            >
              <CreditCard className="w-4 h-4" />
              <span>بطاقة / فيزا (F7)</span>
            </button>
          </div>
        </div>
      </div>

      {/* SUBSTITUTES & GENERICS MODAL */}
      <Dialog open={Boolean(substituteActiveFor)} onOpenChange={(o) => !o && setSubstituteActiveFor(null)}>
        <DialogContent className="max-w-md bg-surface border border-slate-200 dark:border-slate-800 rounded-3xl p-5 sm:p-6" dir="rtl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-base font-black text-slate-900 dark:text-white">
              <Pill className="w-5 h-5 text-emerald-500" />
              <span>بدائل ومثائل: «{substituteActiveFor?.name}»</span>
            </DialogTitle>
          </DialogHeader>

          <div className="py-2 space-y-2 max-h-64 overflow-y-auto">
            {substitutesList.length === 0 ? (
              <p className="text-center text-xs text-slate-400 py-4">
                لم يتم العثور على بدائل مسجلة بنفس المادة الفعالة
              </p>
            ) : (
              substitutesList.map((sub) => (
                <div
                  key={sub.id}
                  className="p-3 rounded-xl border border-slate-200 dark:border-slate-800 flex items-center justify-between"
                >
                  <div>
                    <h5 className="font-black text-xs text-slate-900 dark:text-white">
                      {sub.name}
                    </h5>
                    <span className="text-3xs text-emerald-600 font-bold block">
                      {formatNumber(sub.sale_price || 0)} ج.م
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      onAddToCart(sub);
                      setSubstituteActiveFor(null);
                      toast.success(`تم اختيار البديل: «${sub.name}»`);
                    }}
                    className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-black text-xs"
                  >
                    صرف البديل
                  </button>
                </div>
              ))
            )}
          </div>

          <DialogFooter>
            <button
              type="button"
              onClick={() => setSubstituteActiveFor(null)}
              className="px-4 py-2 rounded-xl bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold text-xs"
            >
              إغلاق
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
