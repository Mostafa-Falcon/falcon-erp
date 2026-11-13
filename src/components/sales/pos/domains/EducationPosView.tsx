'use client';

import React, { useState, useMemo } from 'react';
import {
  GraduationCap,
  BookOpen,
  Search,
  Plus,
  Minus,
  Trash2,
  CreditCard,
  Banknote,
  Split,
  UserCheck,
  Receipt,
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { formatNumber } from '@/lib/format';
import type { Product, Unit } from '@/types';
import type { CartLine, UnitOption } from '../types';

interface EducationPosViewProps {
  cart: CartLine[];
  products: Product[];
  unitsById: Record<string, Unit>;
  unitOptions: Record<string, UnitOption[]>;
  availableFor: (pId: string, unitId?: string, factor?: number, batchId?: string) => number;
  onAddToCart: (product: Product, options?: any) => void;
  onUpdateQty: (key: string, delta: number) => void;
  onSetQty: (key: string, qty: number) => void;
  onRemoveLine: (key: string) => void;
  onUnitChange: (key: string, newUnitId: string, factor: number, price?: number) => void;
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
  customerMode?: string;
  selectedCustomerId?: string | null;
  onOpenCustomerModal: () => void;
  onOpenDiscountsModal: () => void;
  onOpenSplitModal: () => void;
  lastAddedKey?: string | null;
  activeShift: any;
}

export function EducationPosView({
  cart,
  products,
  unitsById,
  unitOptions,
  availableFor,
  onAddToCart,
  onUpdateQty,
  onSetQty,
  onRemoveLine,
  onUnitChange,
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
  customerMode,
  selectedCustomerId,
  onOpenCustomerModal,
  onOpenDiscountsModal,
  onOpenSplitModal,
  lastAddedKey,
  activeShift,
}: EducationPosViewProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');

  // Extract unique categories from products
  const categories = useMemo(() => {
    const set = new Set<string>();
    products.forEach((p) => {
      if (p.category_name) set.add(p.category_name);
    });
    return Array.from(set);
  }, [products]);

  // Filter products by search and category
  const filteredProducts = useMemo(() => {
    return products.filter((p) => {
      const matchSearch =
        !searchQuery.trim() ||
        p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        p.sku?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        p.barcode?.includes(searchQuery);

      const matchCat =
        selectedCategory === 'all' || p.category_name === selectedCategory;

      return matchSearch && matchCat;
    });
  }, [products, searchQuery, selectedCategory]);

  return (
    <div className="flex h-full flex-col lg:flex-row gap-4 p-4 bg-slate-50 dark:bg-slate-950 overflow-hidden">
      {/* Catalog & Search Section */}
      <div className="flex-1 flex flex-col min-w-0 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
        {/* Top Domain Header */}
        <div className="p-4 border-b border-slate-200 dark:border-slate-800 bg-emerald-500/5 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
              <GraduationCap className="w-6 h-6" />
            </div>
            <div>
              <h2 className="font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                نقطة بيع المراكز التعليمية والأكاديميات
                <Badge className="bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20">
                  كورس / ملازم / كتب
                </Badge>
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                حجز الدورات الدراسية، تسجيل الطلاب بيع الملازم والكتب الأكاديمية
              </p>
            </div>
          </div>

          <button
            onClick={onOpenCustomerModal}
            className="flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 hover:bg-emerald-100 dark:hover:bg-emerald-900/40 transition-colors"
          >
            <UserCheck className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
            <span>{selectedCustomerId ? 'الطالب المحدد' : 'اختيار الطالب / المتدرب'}</span>
          </button>
        </div>

        {/* Search & Categories */}
        <div className="p-4 border-b border-slate-200 dark:border-slate-800 space-y-3">
          <div className="relative">
            <Search className="w-4 h-4 absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="ابحث عن كورس، ملزمة، مادة دراسية، أو كود المادة..."
              className="w-full pr-10 pl-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all"
            />
          </div>

          {/* Category Pills */}
          <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
            <button
              onClick={() => setSelectedCategory('all')}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-colors ${
                selectedCategory === 'all'
                  ? 'bg-emerald-600 text-white shadow-sm'
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700'
              }`}
            >
              جميع المواد والخدمات
            </button>
            {categories.map((cat) => (
              <button
                key={cat}
                onClick={() => setSelectedCategory(cat)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-colors ${
                  selectedCategory === cat
                    ? 'bg-emerald-600 text-white shadow-sm'
                    : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700'
                }`}
              >
                {cat}
              </button>
            ))}
          </div>
        </div>

        {/* Products Grid */}
        <div className="flex-1 p-4 overflow-y-auto grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
          {filteredProducts.map((product) => {
            const avail = availableFor(product.id);
            return (
              <div
                key={product.id}
                onClick={() => onAddToCart(product)}
                className="group relative flex flex-col justify-between p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950/50 hover:border-emerald-500/50 hover:bg-emerald-50/30 dark:hover:bg-emerald-950/20 cursor-pointer transition-all duration-200"
              >
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="p-1.5 rounded-lg bg-emerald-100 dark:bg-emerald-950 text-emerald-600 dark:text-emerald-400">
                      <BookOpen className="w-4 h-4" />
                    </span>
                    <span className="text-[11px] font-medium text-slate-400 dark:text-slate-500">
                      متاح: {avail}
                    </span>
                  </div>
                  <h3 className="font-semibold text-xs text-slate-800 dark:text-slate-200 line-clamp-2 mb-1 group-hover:text-emerald-600 dark:group-hover:text-emerald-400 transition-colors">
                    {product.name}
                  </h3>
                  {product.category_name && (
                    <span className="inline-block text-[10px] text-slate-500 dark:text-slate-400 bg-slate-200/60 dark:bg-slate-800/60 px-1.5 py-0.5 rounded">
                      {product.category_name}
                    </span>
                  )}
                </div>

                <div className="mt-3 pt-2 border-t border-slate-200/60 dark:border-slate-800/60 flex items-center justify-between">
                  <span className="font-bold text-sm text-emerald-600 dark:text-emerald-400">
                    {formatNumber(product.sale_price || 0)} <span className="text-[10px] font-normal text-slate-500">ج.م</span>
                  </span>
                  <span className="p-1.5 rounded-lg bg-emerald-600 text-white opacity-0 group-hover:opacity-100 transition-opacity">
                    <Plus className="w-3.5 h-3.5" />
                  </span>
                </div>
              </div>
            );
          })}
          {filteredProducts.length === 0 && (
            <div className="col-span-full flex flex-col items-center justify-center py-12 text-slate-400">
              <BookOpen className="w-12 h-12 mb-2 stroke-1 text-slate-300 dark:text-slate-700" />
              <p className="text-sm">لا توجد أصناف أو كورسات مطابقة</p>
            </div>
          )}
        </div>
      </div>

      {/* Cart & Checkout Panel */}
      <div className="w-full lg:w-[400px] flex flex-col bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
        {/* Cart Header */}
        <div className="p-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between bg-slate-50/50 dark:bg-slate-950/50">
          <div className="flex items-center gap-2">
            <Receipt className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
            <h3 className="font-bold text-sm text-slate-900 dark:text-slate-100">
              فاتورة التسجيل والحجز ({cart.length})
            </h3>
          </div>
          {cart.length > 0 && (
            <button
              onClick={onClearCart}
              className="text-xs font-semibold text-rose-600 dark:text-rose-400 hover:underline flex items-center gap-1"
            >
              <Trash2 className="w-3.5 h-3.5" />
              تفريغ السلة
            </button>
          )}
        </div>

        {/* Cart Items List */}
        <div className="flex-1 p-3 overflow-y-auto space-y-2 min-h-[220px]">
          {cart.map((item) => (
            <div
              key={item.key}
              className="p-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/40 dark:bg-slate-950/40 flex items-center justify-between gap-3"
            >
              <div className="flex-1 min-w-0">
                <h4 className="font-semibold text-xs text-slate-800 dark:text-slate-200 truncate">
                  {item.product.name}
                </h4>
                <div className="text-[11px] text-slate-500 mt-0.5 flex items-center gap-2">
                  <span>{formatNumber(item.unit_price)} ج.م</span>
                  <span>×</span>
                  <span className="font-bold text-slate-700 dark:text-slate-300">{item.quantity}</span>
                </div>
              </div>

              {/* Quantity controls */}
              <div className="flex items-center gap-1 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg p-0.5">
                <button
                  onClick={() => onUpdateQty(item.key, -1)}
                  className="p-1 rounded text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
                >
                  <Minus className="w-3 h-3" />
                </button>
                <span className="w-6 text-center text-xs font-bold">{item.quantity}</span>
                <button
                  onClick={() => onUpdateQty(item.key, 1)}
                  className="p-1 rounded text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
                >
                  <Plus className="w-3 h-3" />
                </button>
              </div>

              <button
                onClick={() => onRemoveLine(item.key)}
                className="p-1.5 text-slate-400 hover:text-rose-600 transition-colors"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          ))}

          {cart.length === 0 && (
            <div className="h-full flex flex-col items-center justify-center py-16 text-slate-400">
              <GraduationCap className="w-10 h-10 mb-2 stroke-1 text-slate-300 dark:text-slate-700" />
              <p className="text-xs">السلة فارغة، اختر كورسات أو مستلزمات</p>
            </div>
          )}
        </div>

        {/* Totals & Payment Actions */}
        <div className="p-4 border-t border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950/50 space-y-3">
          <div className="space-y-1.5 text-xs">
            <div className="flex justify-between text-slate-500">
              <span>المجموع الفرعي:</span>
              <span>{formatNumber(subtotal)} ج.م</span>
            </div>
            {totalDiscount > 0 && (
              <div className="flex justify-between text-emerald-600 font-medium">
                <span>الخصم:</span>
                <span>-{formatNumber(totalDiscount)} ج.م</span>
              </div>
            )}
            {totalTax > 0 && (
              <div className="flex justify-between text-slate-500">
                <span>الضريبة:</span>
                <span>{formatNumber(totalTax)} ج.م</span>
              </div>
            )}
            <div className="flex justify-between text-base font-bold text-slate-900 dark:text-slate-100 pt-2 border-t border-slate-200 dark:border-slate-800">
              <span>الإجمالي المستحق:</span>
              <span className="text-emerald-600 dark:text-emerald-400">{formatNumber(total)} ج.م</span>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="grid grid-cols-2 gap-2 pt-1">
            <button
              disabled={cart.length === 0 || isSaving}
              onClick={() => onCheckout('cash')}
              className="py-2.5 px-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 disabled:bg-slate-300 dark:disabled:bg-slate-800 text-white font-semibold text-xs flex items-center justify-center gap-1.5 shadow-sm transition-colors"
            >
              <Banknote className="w-4 h-4" />
              دفع نقدي (كاش)
            </button>
            <button
              disabled={cart.length === 0 || isSaving}
              onClick={() => onCheckout('card')}
              className="py-2.5 px-3 rounded-xl bg-sky-600 hover:bg-sky-700 disabled:bg-slate-300 dark:disabled:bg-slate-800 text-white font-semibold text-xs flex items-center justify-center gap-1.5 shadow-sm transition-colors"
            >
              <CreditCard className="w-4 h-4" />
              دفع بنكي / شبكة
            </button>
          </div>
          <button
            disabled={cart.length === 0 || isSaving}
            onClick={onOpenSplitModal}
            className="w-full py-2 rounded-xl border border-slate-200 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-50 text-slate-700 dark:text-slate-300 font-medium text-xs flex items-center justify-center gap-1.5 transition-colors"
          >
            <Split className="w-3.5 h-3.5" />
            دفع متعدد / آجل
          </button>
        </div>
      </div>
    </div>
  );
}
