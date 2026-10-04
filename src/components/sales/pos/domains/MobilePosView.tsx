'use client';

import React, { useState } from 'react';
import {
  Smartphone,
  ShieldCheck,
  Wrench,
  Wallet,
  Barcode,
  Search,
  Plus,
  Minus,
  Trash2,
  Calendar,
  Sparkles,
  CreditCard,
  Banknote,
  Split,
  ChevronRight,
  CheckCircle2,
  AlertCircle,
  FileText,
} from 'lucide-react';
import { toast } from 'sonner';
import { Badge } from '@/components/ui/badge';
import { formatNumber } from '@/lib/format';
import { db } from '@/core/db/app_database';
import type { Product, Unit, ProductSerial, MaintenanceTicket } from '@/types';
import type { CartLine, UnitOption } from '../types';

interface MobilePosViewProps {
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
  onOpenCustomerModal: () => void;
  onOpenDiscountsModal: () => void;
  onOpenSplitModal: () => void;
  onOpenDigitalWalletModal: () => void;
  onOpenMaintenanceModal: () => void;
  onOpenInstallmentModal?: () => void;
  activeShift: any;
}

export function MobilePosView({
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
  onOpenCustomerModal,
  onOpenDiscountsModal,
  onOpenSplitModal,
  onOpenDigitalWalletModal,
  onOpenMaintenanceModal,
  onOpenInstallmentModal,
  activeShift,
}: MobilePosViewProps) {
  const [imeiInput, setImeiInput] = useState('');
  const [deviceCondition, setDeviceCondition] = useState<'new' | 'like_new' | 'used'>('new');
  const [warrantyMonths, setWarrantyMonths] = useState<number>(12);
  const [searchProduct, setSearchProduct] = useState('');
  const [activeTab, setActiveTab] = useState<'all' | 'phones' | 'accessories' | 'spare_parts'>('all');

  // Handle direct IMEI / Serial scan
  const handleImeiScan = async (e: React.FormEvent) => {
    e.preventDefault();
    const clean = imeiInput.trim();
    if (!clean) return;

    try {
      // 1. Look up serial in product_serials Dexie table
      const matchedSerial = await db.product_serials
        .where('serial_number')
        .equals(clean)
        .or('imei2')
        .equals(clean)
        .first();

      if (matchedSerial) {
        const prod = products.find((p) => p.id === matchedSerial.product_id);
        if (prod) {
          onAddToCart(prod, {
            serialNumber: matchedSerial.serial_number,
            deviceCondition: matchedSerial.condition || deviceCondition,
            warrantyDays: (matchedSerial.warranty_months || warrantyMonths) * 30,
            price: matchedSerial.selling_price || prod.sale_price,
          });
          toast.success(`📱 تم مطابقة سيريال الجهاز: «${prod.name}» (${clean})`);
          setImeiInput('');
          return;
        }
      }

      // 2. Fallback: match by product barcode/sku
      const prodBySku = products.find((p) => p.sku.toLowerCase() === clean.toLowerCase());
      if (prodBySku) {
        onAddToCart(prodBySku, {
          serialNumber: clean,
          deviceCondition,
          warrantyDays: warrantyMonths * 30,
        });
        toast.success(`تمت إضافة «${prodBySku.name}» برقم تسلسلي ${clean}`);
        setImeiInput('');
        return;
      }

      toast.info(`سيريال/كود جديد: «${clean}». يرجى اختيار الجهاز لربط السيريال.`);
    } catch (err) {
      console.error('IMEI lookup error:', err);
    }
  };

  const filteredProducts = products.filter((p) => {
    if (!searchProduct) return true;
    const q = searchProduct.toLowerCase();
    return p.name.toLowerCase().includes(q) || p.sku.toLowerCase().includes(q);
  });

  return (
    <div className="flex-1 flex flex-col md:flex-row overflow-hidden bg-slate-900/10">
      {/* LEFT COLUMN: Mobile Fast Operations, IMEI Scanner & Accessories Grid */}
      <div className="flex-1 flex flex-col min-w-0 border-b md:border-b-0 md:border-l border-slate-200 dark:border-slate-800 bg-white dark:bg-[#0b101b]">
        {/* TOP WIDGETS: Digital Wallets, Maintenance Tickets & Installments */}
        <div className="p-3 border-b border-slate-200 dark:border-slate-800 bg-slate-50/80 dark:bg-slate-900/60 flex flex-wrap items-center justify-between gap-2.5">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onOpenDigitalWalletModal}
              className="flex items-center gap-2 px-3 py-2 rounded-xl bg-gradient-to-r from-red-600 to-rose-600 text-white font-black text-xs shadow-md shadow-rose-600/20 hover:opacity-95 transition-all cursor-pointer"
            >
              <Wallet className="w-4 h-4" />
              <span>فودافون كاش / إنستاباي</span>
            </button>

            <button
              type="button"
              onClick={onOpenMaintenanceModal}
              className="flex items-center gap-2 px-3 py-2 rounded-xl bg-sky-600 hover:bg-sky-700 text-white font-black text-xs shadow-md shadow-sky-600/20 transition-all cursor-pointer"
            >
              <Wrench className="w-4 h-4" />
              <span>تسليم وتحصيل صيانة</span>
            </button>
          </div>

          <div className="flex items-center gap-2">
            <Badge variant="outline" className="bg-sky-500/10 text-sky-600 border-sky-500/30 text-xs font-black">
              📱 كاشير الموبايل والإلكترونيات
            </Badge>
          </div>
        </div>

        {/* FAST IMEI & SERIAL NUMBER SCANNER BAR */}
        <div className="p-3 border-b border-slate-200 dark:border-slate-800 bg-sky-50/40 dark:bg-sky-950/20">
          <form onSubmit={handleImeiScan} className="flex flex-col sm:flex-row gap-2">
            <div className="relative flex-1">
              <Barcode className="w-4 h-4 absolute right-3 top-1/2 -translate-y-1/2 text-sky-600" />
              <input
                type="text"
                value={imeiInput}
                onChange={(e) => setImeiInput(e.target.value)}
                placeholder="امسح أو اكتب رقم السيريال / IMEI الجهاز (15 رقم)..."
                className="w-full h-10 pr-9 pl-3 rounded-xl bg-white dark:bg-slate-900 border border-sky-200 dark:border-sky-800 text-xs font-bold font-mono focus:outline-none focus:ring-2 focus:ring-sky-500"
              />
            </div>

            {/* Condition selector */}
            <div className="flex items-center gap-1 bg-white dark:bg-slate-900 p-1 rounded-xl border border-slate-200 dark:border-slate-800">
              <button
                type="button"
                onClick={() => setDeviceCondition('new')}
                className={`px-2.5 py-1 rounded-lg text-3xs font-black transition-all ${
                  deviceCondition === 'new' ? 'bg-sky-600 text-white' : 'text-slate-500'
                }`}
              >
                جديد زيرو
              </button>
              <button
                type="button"
                onClick={() => setDeviceCondition('like_new')}
                className={`px-2.5 py-1 rounded-lg text-3xs font-black transition-all ${
                  deviceCondition === 'like_new' ? 'bg-purple-600 text-white' : 'text-slate-500'
                }`}
              >
                كسر زيرو
              </button>
              <button
                type="button"
                onClick={() => setDeviceCondition('used')}
                className={`px-2.5 py-1 rounded-lg text-3xs font-black transition-all ${
                  deviceCondition === 'used' ? 'bg-amber-600 text-white' : 'text-slate-500'
                }`}
              >
                مستعمل
              </button>
            </div>

            <button
              type="submit"
              className="px-4 py-2 rounded-xl bg-sky-600 hover:bg-sky-700 text-white font-black text-xs shadow-md shadow-sky-600/20"
            >
              مطابقة السيريال
            </button>
          </form>
        </div>

        {/* Accessories & Devices Search & Grid */}
        <div className="p-3 border-b border-slate-200 dark:border-slate-800 flex gap-2">
          <div className="relative flex-1">
            <Search className="w-4 h-4 absolute right-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={searchProduct}
              onChange={(e) => setSearchProduct(e.target.value)}
              placeholder="ابحث عن جهاز، شاحن، جراب، سكرين، سماعة، كابل..."
              className="w-full h-9 pr-9 pl-3 rounded-xl bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-xs font-bold focus:outline-none focus:ring-2 focus:ring-sky-500"
            />
          </div>
        </div>

        {/* Items Grid */}
        <div className="flex-1 overflow-y-auto p-3.5 grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
          {filteredProducts.map((p) => {
            const avail = availableFor(p.id, p.base_unit_id);
            const isOutOfStock = p.item_type === 'storable' && avail <= 0;

            return (
              <div
                key={p.id}
                onClick={() => {
                  if (isOutOfStock) {
                    toast.error(`الصنف «${p.name}» نافد من المخزن`);
                    return;
                  }
                  onAddToCart(p, {
                    serialNumber: imeiInput.trim() || undefined,
                    deviceCondition,
                    warrantyDays: warrantyMonths * 30,
                  });
                  if (imeiInput) setImeiInput('');
                }}
                className={`group flex flex-col justify-between p-3 rounded-2xl border transition-all cursor-pointer select-none ${
                  isOutOfStock
                    ? 'opacity-50 grayscale border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/50'
                    : 'bg-white dark:bg-slate-900/90 border-slate-200 dark:border-slate-800 hover:border-sky-500 hover:shadow-lg hover:shadow-sky-500/10 hover:-translate-y-0.5'
                }`}
              >
                <div>
                  <div className="flex items-start justify-between gap-1 mb-1.5">
                    <span className="text-xl">📱</span>
                    <Badge variant="outline" className="text-4xs px-1.5 py-0.2 font-mono">
                      {p.sku}
                    </Badge>
                  </div>
                  <h4 className="font-black text-xs text-slate-900 dark:text-white leading-tight line-clamp-2">
                    {p.name}
                  </h4>
                </div>

                <div className="mt-3 pt-2 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
                  <span className="text-sm font-black text-sky-600 dark:text-sky-400 font-mono">
                    {formatNumber(p.sale_price || 0)} <span className="text-4xs">ج.م</span>
                  </span>
                  <span className="text-4xs text-slate-400 font-bold">
                    متاح: {avail}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* RIGHT COLUMN: Mobile Cart & Warranty Summary */}
      <div className="w-full md:w-[380px] lg:w-[420px] flex flex-col bg-white dark:bg-[#0c121e] border-t md:border-t-0 md:border-r border-slate-200 dark:border-slate-800">
        {/* Cart Header */}
        <div className="p-3.5 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between bg-slate-50 dark:bg-slate-900/60">
          <div>
            <span className="font-black text-sm text-slate-900 dark:text-white">
              فاتورة مبيعات الأجهزة والقطع
            </span>
            <span className="text-3xs text-slate-400 font-mono block">
              {cart.length} أصناف مسجلة
            </span>
          </div>

          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={onOpenCustomerModal}
              title="تحديد عميل"
              className="px-2.5 py-1 rounded-lg text-3xs font-bold bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300"
            >
              العميل
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

        {/* Cart Items List */}
        <div className="flex-1 overflow-y-auto p-3 space-y-2">
          {cart.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-center p-6 text-slate-400">
              <Smartphone className="w-10 h-10 mb-2 opacity-30 stroke-[1.5]" />
              <p className="text-xs font-bold">لا توجد أجهزة أو مبيعات بالسلة</p>
              <p className="text-3xs text-slate-500 mt-1">امسح سيريال الجهاز أو اختر من القائمة</p>
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
                        {prod?.name || 'صنف'}
                      </h5>
                      <div className="flex items-center gap-1.5 flex-wrap mt-0.5">
                        {line.serialNumber && (
                          <span className="text-4xs font-mono font-bold px-1.5 py-0.5 rounded bg-sky-100 dark:bg-sky-950/60 text-sky-800 dark:text-sky-300">
                            IMEI: {line.serialNumber}
                          </span>
                        )}
                        {line.deviceCondition && (
                          <span className="text-4xs font-bold px-1.5 py-0.5 rounded bg-purple-100 dark:bg-purple-950/60 text-purple-800 dark:text-purple-300">
                            {line.deviceCondition === 'new' ? 'جديد زيرو' : line.deviceCondition === 'like_new' ? 'كسر زيرو' : 'مستعمل'}
                          </span>
                        )}
                        {line.warrantyDays && (
                          <span className="text-4xs font-bold px-1.5 py-0.5 rounded bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 flex items-center gap-1">
                            <ShieldCheck className="w-3 h-3" />
                            <span>ضمان {Math.round(line.warrantyDays / 30)} شهر</span>
                          </span>
                        )}
                      </div>
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

        {/* Checkout & Total Bar */}
        <div className="p-3.5 border-t border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/80 space-y-2.5">
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
              <span>صافي الفاتورة:</span>
              <span className="text-sky-600 dark:text-sky-400 font-mono">{formatNumber(total)} ج.م</span>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2 pt-1">
            <button
              type="button"
              disabled={cart.length === 0 || isSaving}
              onClick={() => onCheckout('cash')}
              className="h-11 rounded-xl bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white font-black text-xs flex items-center justify-center gap-1.5 shadow-md shadow-emerald-600/20 transition-all cursor-pointer"
            >
              <Banknote className="w-4 h-4" />
              <span>دفع كاش (F10)</span>
            </button>
            <button
              type="button"
              disabled={cart.length === 0 || isSaving}
              onClick={() => onCheckout('card')}
              className="h-11 rounded-xl bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-black text-xs flex items-center justify-center gap-1.5 shadow-md shadow-blue-600/20 transition-all cursor-pointer"
            >
              <CreditCard className="w-4 h-4" />
              <span>فيزا / بطاقة (F7)</span>
            </button>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              disabled={cart.length === 0}
              onClick={onOpenSplitModal}
              className="h-8 rounded-lg bg-slate-200 hover:bg-slate-300 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 font-bold text-3xs flex items-center justify-center gap-1"
            >
              <Split className="w-3.5 h-3.5" />
              <span>دفع مجزأ (F9)</span>
            </button>
            <button
              type="button"
              onClick={onOpenDiscountsModal}
              className="h-8 rounded-lg bg-slate-200 hover:bg-slate-300 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 font-bold text-3xs flex items-center justify-center gap-1"
            >
              <span>خصم (F4)</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
