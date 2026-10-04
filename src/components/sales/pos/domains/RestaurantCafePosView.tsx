'use client';

import React, { useState, useEffect, useMemo } from 'react';
import {
  Utensils,
  Coffee,
  ShoppingBag,
  Truck,
  Plus,
  Minus,
  Trash2,
  Printer,
  Sliders,
  CheckCircle2,
  Clock,
  Users,
  Search,
  Tag,
  CreditCard,
  Banknote,
  Split,
  ChevronRight,
  Sparkles,
  Layers,
  Flame,
  ChefHat,
  Receipt,
  X,
  ArrowRight,
} from 'lucide-react';
import { toast } from 'sonner';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { formatNumber } from '@/lib/format';
import { db } from '@/core/db/app_database';
import type { Product, Unit, RestaurantTable, OrderModifier, KitchenOrderTicket } from '@/types';
import type { CartLine, CartModifier, UnitOption } from '../types';

interface RestaurantCafePosViewProps {
  cart: CartLine[];
  products: Product[];
  unitsById: Record<string, Unit>;
  unitOptions: Record<string, UnitOption[]>;
  batches: Record<string, any[]>;
  availableFor: (pId: string, unitId?: string, factor?: number, batchId?: string) => number;
  onAddToCart: (product: Product, options?: any) => void;
  onUpdateQty: (key: string, delta: number) => void;
  onSetQty: (key: string, qty: number) => void;
  onRemoveLine: (key: string) => void;
  onUnitChange: (key: string, newUnitId: string, factor: number, price?: number) => void;
  onClearCart: () => void;
  orderType: 'dine_in' | 'takeaway' | 'delivery';
  setOrderType: (type: 'dine_in' | 'takeaway' | 'delivery') => void;
  activeTable: string | null;
  setActiveTable: (table: string | null) => void;
  orgId: string;
  branchId: string;
  onCheckout: (type: 'cash' | 'card' | 'credit' | 'split') => void;
  isSaving: boolean;
  subtotal: number;
  totalDiscount: number;
  shippingFee: number;
  totalTax: number;
  total: number;
  customerMode: string;
  selectedCustomerId: string;
  onOpenCustomerModal: () => void;
  onOpenDiscountsModal: () => void;
  onOpenSplitModal: () => void;
  lastAddedKey?: string | null;
  activeShift: any;
  isCafeMode?: boolean;
}

export function RestaurantCafePosView({
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
  orderType,
  setOrderType,
  activeTable,
  setActiveTable,
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
  isCafeMode = false,
}: RestaurantCafePosViewProps) {
  // Mobile responsive view mode: 'catalog' shows food/drinks grid, 'cart' shows order details & checkout
  const [mobileTab, setMobileTab] = useState<'catalog' | 'cart'>('catalog');

  // Tables & Sections state
  const [tables, setTables] = useState<RestaurantTable[]>([]);
  const [selectedSection, setSelectedSection] = useState<string>('الكل');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [searchItem, setSearchItem] = useState('');
  const [isFloorMapOpen, setIsFloorMapOpen] = useState(false);
  const [isKotModalOpen, setIsKotModalOpen] = useState(false);

  // Modifiers & Customization Modal State
  const [customizingProduct, setCustomizingProduct] = useState<Product | null>(null);
  const [selectedModifiers, setSelectedModifiers] = useState<CartModifier[]>([]);
  const [kitchenNotes, setKitchenNotes] = useState('');
  const [selectedUnitId, setSelectedUnitId] = useState<string>('');

  // Load or initialize default tables
  useEffect(() => {
    async function loadTables() {
      if (!orgId) return;
      try {
        const localTables = await db.restaurant_tables.where('org_id').equals(orgId).toArray();
        if (localTables && localTables.length > 0) {
          setTables(localTables);
        } else {
          const defaultTables: RestaurantTable[] = [
            { id: 't_01', org_id: orgId, table_number: 'T-01', section_name: 'الصالة الداخلية', capacity: 2, status: 'available', created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
            { id: 't_02', org_id: orgId, table_number: 'T-02', section_name: 'الصالة الداخلية', capacity: 4, status: 'available', created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
            { id: 't_03', org_id: orgId, table_number: 'T-03', section_name: 'الصالة الداخلية', capacity: 4, status: 'available', created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
            { id: 't_04', org_id: orgId, table_number: 'T-04', section_name: 'الصالة الداخلية', capacity: 6, status: 'available', created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
            { id: 't_05', org_id: orgId, table_number: 'O-01', section_name: 'التراس الخارجي', capacity: 4, status: 'available', created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
            { id: 't_06', org_id: orgId, table_number: 'O-02', section_name: 'التراس الخارجي', capacity: 4, status: 'available', created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
            { id: 't_07', org_id: orgId, table_number: 'VIP-1', section_name: 'قسم العائلات وVIP', capacity: 8, status: 'available', created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
            { id: 't_08', org_id: orgId, table_number: 'VIP-2', section_name: 'قسم العائلات وVIP', capacity: 6, status: 'available', created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
          ];
          await db.restaurant_tables.bulkPut(defaultTables);
          setTables(defaultTables);
        }
      } catch (e) {
        console.error('Error loading tables:', e);
      }
    }
    loadTables();
  }, [orgId]);

  // Modifiers list
  const availableModifiersList: OrderModifier[] = useMemo(() => {
    if (isCafeMode) {
      return [
        { id: 'm_size_l', org_id: orgId, name: 'حجم كبير (Large)', category: 'الحجم', type: 'size', price: 15, is_active: true, created_at: '', updated_at: '' },
        { id: 'm_shot_dbl', org_id: orgId, name: 'دبل شوت إسبريسو إضافي', category: 'القهوة', type: 'addon', price: 20, is_active: true, created_at: '', updated_at: '' },
        { id: 'm_milk_oat', org_id: orgId, name: 'حليب شوفان / لوز', category: 'الحليب', type: 'addon', price: 25, is_active: true, created_at: '', updated_at: '' },
        { id: 'm_flavor_vanilla', org_id: orgId, name: 'سيرب فانيليا / كراميل', category: 'النكهات', type: 'addon', price: 15, is_active: true, created_at: '', updated_at: '' },
        { id: 'm_sugar_zero', org_id: orgId, name: 'بدون سكر (سادة)', category: 'تخصيص', type: 'customization', price: 0, is_active: true, created_at: '', updated_at: '' },
        { id: 'm_ice_extra', org_id: orgId, name: 'ثلج إضافي', category: 'تخصيص', type: 'customization', price: 0, is_active: true, created_at: '', updated_at: '' },
      ];
    }
    return [
      { id: 'm_size_l', org_id: orgId, name: 'وجبة / حجم كبير L', category: 'الحجم', type: 'size', price: 25, is_active: true, created_at: '', updated_at: '' },
      { id: 'm_extra_cheese', org_id: orgId, name: 'جبنة إضافية (موتزاريلا/شيدر)', category: 'إضافات', type: 'addon', price: 20, is_active: true, created_at: '', updated_at: '' },
      { id: 'm_extra_sauce', org_id: orgId, name: 'صوص رانش / باربكيو إضافي', category: 'إضافات', type: 'addon', price: 12, is_active: true, created_at: '', updated_at: '' },
      { id: 'm_fries_large', org_id: orgId, name: 'ترقية بطاطس حجم كبير', category: 'ترقية', type: 'addon', price: 18, is_active: true, created_at: '', updated_at: '' },
      { id: 'm_no_onion', org_id: orgId, name: 'بدون بصل', category: 'تخصيص', type: 'customization', price: 0, is_active: true, created_at: '', updated_at: '' },
      { id: 'm_spicy', org_id: orgId, name: 'حار سبايسي 🌶️', category: 'تخصيص', type: 'customization', price: 0, is_active: true, created_at: '', updated_at: '' },
    ];
  }, [isCafeMode, orgId]);

  // Sections
  const tableSections = useMemo(() => {
    const set = new Set(tables.map((t) => t.section_name || 'عام'));
    return ['الكل', ...Array.from(set)];
  }, [tables]);

  const filteredTables = useMemo(() => {
    if (selectedSection === 'الكل') return tables;
    return tables.filter((t) => (t.section_name || 'عام') === selectedSection);
  }, [tables, selectedSection]);

  // Products Categories & Filtering
  const filteredProducts = useMemo(() => {
    return products.filter((p) => {
      if (selectedCategory !== 'all' && p.category_id !== selectedCategory) return false;
      if (searchItem) {
        const q = searchItem.toLowerCase();
        return p.name.toLowerCase().includes(q) || p.sku.toLowerCase().includes(q);
      }
      return true;
    });
  }, [products, selectedCategory, searchItem]);

  // Customization
  const openCustomizer = (prod: Product) => {
    setCustomizingProduct(prod);
    setSelectedUnitId(prod.base_unit_id);
    setSelectedModifiers([]);
    setKitchenNotes('');
  };

  const confirmCustomization = () => {
    if (!customizingProduct) return;
    onAddToCart(customizingProduct, {
      unitId: selectedUnitId,
      selectedModifiers,
      kitchenNotes: kitchenNotes.trim() || undefined,
      orderType,
      tableNumber: activeTable || undefined,
    });
    setCustomizingProduct(null);
  };

  // Generate KOT Ticket
  const currentKotTicket: KitchenOrderTicket = useMemo(() => {
    return {
      ticketNumber: `KOT-${Math.floor(1000 + Math.random() * 9000)}`,
      orderType,
      tableNumber: activeTable || undefined,
      timestamp: new Date().toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' }),
      cashierName: activeShift?.user_id || 'كاشير الصالة',
      items: cart.map((line) => {
        const prod = products.find((p) => p.id === line.productId);
        return {
          name: prod?.name || 'صنف',
          qty: line.qty,
          modifiers: line.selectedModifiers?.map((m) => m.name),
          kitchenNotes: line.kitchenNotes,
        };
      }),
    };
  }, [cart, orderType, activeTable, activeShift, products]);

  return (
    <div className="flex-1 flex flex-col md:flex-row overflow-hidden bg-slate-100/60 dark:bg-[#070b13]">
      {/* 
        LEFT COLUMN: Menu, Items Grid & Floor Map Actions
        On mobile: visible only when mobileTab === 'catalog'
      */}
      <div
        className={`flex-1 flex flex-col min-w-0 border-b md:border-b-0 md:border-l border-slate-200 dark:border-slate-800 bg-white dark:bg-[#0b101b] ${
          mobileTab === 'catalog' ? 'flex' : 'hidden md:flex'
        }`}
      >
        {/* Top Control Bar: Responsive Order Modes & Table Selection */}
        <div className="p-2 sm:p-3 border-b border-slate-200 dark:border-slate-800 bg-slate-50/90 dark:bg-slate-900/60 space-y-2">
          {/* Mobile Tab Toggle Bar (< md only) */}
          <div className="md:hidden flex items-center bg-slate-200/90 dark:bg-slate-800 p-0.5 rounded-xl border border-slate-300/80 dark:border-slate-700">
            <button
              type="button"
              onClick={() => setMobileTab('catalog')}
              className={`flex-1 py-1.5 px-3 rounded-lg text-xs font-black transition-all flex items-center justify-center gap-1.5 ${
                mobileTab === 'catalog'
                  ? 'bg-white dark:bg-slate-700 text-amber-600 dark:text-amber-400 shadow-xs'
                  : 'text-slate-600 dark:text-slate-400'
              }`}
            >
              <Utensils className="w-3.5 h-3.5" />
              <span>المنيو والأصناف</span>
            </button>
            <button
              type="button"
              onClick={() => setMobileTab('cart')}
              className={`flex-1 py-1.5 px-3 rounded-lg text-xs font-black transition-all flex items-center justify-center gap-1.5 ${
                mobileTab === 'cart'
                  ? 'bg-white dark:bg-slate-700 text-amber-600 dark:text-amber-400 shadow-xs'
                  : 'text-slate-600 dark:text-slate-400'
              }`}
            >
              <Receipt className="w-3.5 h-3.5" />
              <span>الطلب ({cart.length})</span>
              {total > 0 && (
                <span className="text-4xs bg-amber-500 text-slate-950 px-1.5 py-0.2 rounded-full font-mono font-black">
                  {formatNumber(total)}
                </span>
              )}
            </button>
          </div>

          {/* Row 1: Order Mode Segmented Selector */}
          <div className="grid grid-cols-3 gap-1 sm:gap-1.5 p-1 bg-slate-200/80 dark:bg-slate-800 rounded-xl">
            <button
              type="button"
              onClick={() => setOrderType('dine_in')}
              className={`flex items-center justify-center gap-1 sm:gap-2 py-1.5 px-2 rounded-lg font-black text-xs transition-all ${
                orderType === 'dine_in'
                  ? 'bg-amber-600 text-white shadow-sm'
                  : 'text-slate-600 dark:text-slate-300 hover:bg-white/40'
              }`}
            >
              <Utensils className="w-3.5 h-3.5" />
              <span>صالة</span>
            </button>
            <button
              type="button"
              onClick={() => {
                setOrderType('takeaway');
                setActiveTable(null);
              }}
              className={`flex items-center justify-center gap-1 sm:gap-2 py-1.5 px-2 rounded-lg font-black text-xs transition-all ${
                orderType === 'takeaway'
                  ? 'bg-emerald-600 text-white shadow-sm'
                  : 'text-slate-600 dark:text-slate-300 hover:bg-white/40'
              }`}
            >
              <ShoppingBag className="w-3.5 h-3.5" />
              <span>سفري</span>
            </button>
            <button
              type="button"
              onClick={() => {
                setOrderType('delivery');
                setActiveTable(null);
              }}
              className={`flex items-center justify-center gap-1 sm:gap-2 py-1.5 px-2 rounded-lg font-black text-xs transition-all ${
                orderType === 'delivery'
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'text-slate-600 dark:text-slate-300 hover:bg-white/40'
              }`}
            >
              <Truck className="w-3.5 h-3.5" />
              <span>دليفري</span>
            </button>
          </div>

          {/* Row 2: Table Picker & KOT Buttons */}
          <div className="flex items-center justify-between gap-2">
            {orderType === 'dine_in' ? (
              <button
                type="button"
                onClick={() => setIsFloorMapOpen(true)}
                className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 px-3 rounded-xl text-xs font-black border transition-all cursor-pointer ${
                  activeTable
                    ? 'bg-amber-500/10 border-amber-500/40 text-amber-700 dark:text-amber-300'
                    : 'bg-rose-500/10 border-rose-500/40 text-rose-700 dark:text-rose-300 animate-pulse'
                }`}
              >
                <Users className="w-3.5 h-3.5" />
                <span>{activeTable ? `طاولة #${activeTable}` : '📍 اختر رقم الطاولة'}</span>
              </button>
            ) : (
              <div className="flex-1 text-4xs text-slate-400 font-bold px-1">
                {orderType === 'takeaway' ? 'طلب سفري خارجي بدون طاولة' : 'طلب دليفري وتوصيل منازل'}
              </div>
            )}

            <button
              type="button"
              onClick={() => {
                if (cart.length === 0) {
                  toast.warning('السلة فارغة، أضف أصنافاً لبون المطبخ');
                  return;
                }
                setIsKotModalOpen(true);
              }}
              className="flex items-center gap-1 py-1.5 px-2.5 rounded-xl text-xs font-black bg-purple-600/10 hover:bg-purple-600/20 text-purple-700 dark:text-purple-300 border border-purple-500/30 transition-all cursor-pointer"
            >
              <ChefHat className="w-3.5 h-3.5" />
              <span>بون المطبخ</span>
            </button>
          </div>
        </div>

        {/* Search Input Bar */}
        <div className="p-2 sm:p-3 border-b border-slate-200 dark:border-slate-800">
          <div className="relative">
            <Search className="w-4 h-4 absolute right-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={searchItem}
              onChange={(e) => setSearchItem(e.target.value)}
              placeholder={isCafeMode ? 'ابحث عن مشروب، قهوة، موهيتو، كيك...' : 'ابحث عن وجبة، طبق، ساندوتش، مشروب...'}
              className="w-full h-9 pr-9 pl-8 rounded-xl bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-xs font-bold focus:outline-none focus:ring-2 focus:ring-amber-500"
            />
            {searchItem && (
              <button
                type="button"
                onClick={() => setSearchItem('')}
                className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>

        {/* Visual Food & Beverage Touch Grid */}
        <div className="flex-1 overflow-y-auto p-2.5 sm:p-3.5 grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2 sm:gap-3">
          {filteredProducts.length === 0 ? (
            <div className="col-span-full py-12 flex flex-col items-center justify-center text-center text-slate-400">
              <span className="text-4xl mb-2">{isCafeMode ? '☕' : '🍽️'}</span>
              <p className="text-sm font-black text-slate-700 dark:text-slate-200">
                {searchItem ? `لا توجد نتائج تطابق «${searchItem}»` : 'لا توجد منتجات مسجلة حتى الآن'}
              </p>
              <p className="text-xs text-slate-400 mt-1 max-w-xs">
                يمكنك إضافة وجبات ومشروبات من إدارة المخزون وقائمة المنتجات للبدء بالبيع الفوري
              </p>
            </div>
          ) : (
            filteredProducts.map((p) => {
              const avail = availableFor(p.id, p.base_unit_id);
              const isOutOfStock = p.item_type === 'storable' && avail <= 0;

              return (
                <div
                  key={p.id}
                  onClick={() => {
                    if (isOutOfStock) {
                      toast.error(`الصنف «${p.name}» غير متوفر حالياً`);
                      return;
                    }
                    onAddToCart(p, {
                      orderType,
                      tableNumber: activeTable || undefined,
                    });
                  }}
                  className={`group relative flex flex-col justify-between p-2.5 sm:p-3 rounded-2xl border transition-all cursor-pointer select-none active:scale-97 ${
                    isOutOfStock
                      ? 'opacity-50 grayscale border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/50'
                      : 'bg-white dark:bg-slate-900/90 border-slate-200 dark:border-slate-800 hover:border-amber-500 hover:shadow-md'
                  }`}
                >
                  <div>
                    <div className="flex items-start justify-between gap-1 mb-1">
                      <span className="text-lg sm:text-xl">
                        {isCafeMode ? '☕' : '🍽️'}
                      </span>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          openCustomizer(p);
                        }}
                        title="تخصيص الإضافات والملاحظات"
                        className="w-6 h-6 rounded-lg bg-slate-100 hover:bg-amber-100 dark:bg-slate-800 dark:hover:bg-amber-950/60 text-slate-600 hover:text-amber-600 flex items-center justify-center transition-colors"
                      >
                        <Sliders className="w-3 h-3" />
                      </button>
                    </div>

                    <h4 className="font-black text-xs text-slate-900 dark:text-white leading-tight line-clamp-2">
                      {p.name}
                    </h4>
                  </div>

                  <div className="mt-2 pt-2 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
                    <span className="text-xs sm:text-sm font-black text-amber-600 dark:text-amber-400 font-mono">
                      {formatNumber(p.sale_price || 0)} <span className="text-4xs">ج.م</span>
                    </span>
                    <span className="text-4xs text-slate-400 font-bold">
                      {p.item_type !== 'storable' ? 'جاهز' : `متاح: ${avail}`}
                    </span>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Floating Mobile Sticky Checkout Bar (< md only, shown when cart has items) */}
        {cart.length > 0 && (
          <div
            onClick={() => setMobileTab('cart')}
            className="md:hidden sticky bottom-2 mx-3 z-30 p-3 rounded-2xl bg-gradient-to-r from-amber-600 to-amber-700 text-white shadow-xl shadow-amber-600/30 flex items-center justify-between cursor-pointer animate-in slide-in-from-bottom duration-200 active:scale-98"
          >
            <div className="flex items-center gap-2.5">
              <span className="w-8 h-8 rounded-xl bg-white/20 flex items-center justify-center font-black text-xs font-mono">
                {cart.length}
              </span>
              <div className="flex flex-col text-right">
                <span className="text-xs font-black">
                  السلة • {formatNumber(total)} ج.م
                </span>
                <span className="text-4xs text-amber-200">
                  اضغط لمراجعة الطلب والمحاسبة
                </span>
              </div>
            </div>
            <span className="text-xs font-black bg-white text-amber-800 px-3.5 py-1.5 rounded-xl shadow-sm flex items-center gap-1">
              متابعة الدفع 👈
            </span>
          </div>
        )}
      </div>

      {/* 
        RIGHT COLUMN: Cart, Ticket Summary & Checkout Buttons
        On mobile: visible only when mobileTab === 'cart'
      */}
      <div
        className={`w-full md:w-[380px] lg:w-[420px] flex flex-col bg-white dark:bg-[#0c121e] border-t md:border-t-0 md:border-r border-slate-200 dark:border-slate-800 ${
          mobileTab === 'cart' ? 'flex flex-1' : 'hidden md:flex'
        }`}
      >
        {/* Ticket Header & Back Button for Mobile */}
        <div className="p-3 border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/60 flex flex-col gap-2">
          {/* Mobile Back to Catalog Button */}
          <button
            type="button"
            onClick={() => setMobileTab('catalog')}
            className="md:hidden flex items-center justify-center gap-1.5 py-1.5 px-3 rounded-xl bg-amber-500/10 hover:bg-amber-500/20 text-amber-700 dark:text-amber-300 font-black text-xs border border-amber-500/30 transition-all cursor-pointer"
          >
            <ArrowRight className="w-4 h-4" />
            <span>العودة للمنيو وإضافة المزيد من الأصناف</span>
          </button>

          <div className="flex items-center justify-between">
            <div>
              <div className="flex items-center gap-2">
                <span className="font-black text-sm text-slate-900 dark:text-white">
                  {orderType === 'dine_in' ? 'طلب صالة' : orderType === 'takeaway' ? 'طلب سفري' : 'طلب دليفري'}
                </span>
                {activeTable && (
                  <Badge variant="outline" className="bg-amber-500/10 text-amber-600 border-amber-500/30 text-xs font-black">
                    طاولة #{activeTable}
                  </Badge>
                )}
              </div>
              <span className="text-3xs text-slate-400 font-mono">
                {cart.length} أصناف مسجلة بالطلب
              </span>
            </div>

            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={onOpenCustomerModal}
                title="تحديد عميل"
                className="px-2.5 py-1 rounded-lg text-3xs font-bold bg-slate-200 dark:bg-slate-800 hover:bg-slate-300 text-slate-700 dark:text-slate-300"
              >
                العميل
              </button>
              <button
                type="button"
                onClick={onClearCart}
                title="إلغاء الطلب"
                className="p-1.5 rounded-lg text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/40"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>

        {/* Cart Items List */}
        <div className="flex-1 overflow-y-auto p-3 space-y-2">
          {cart.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-center p-6 text-slate-400">
              <Utensils className="w-10 h-10 mb-2 opacity-30 stroke-[1.5]" />
              <p className="text-xs font-bold">لا توجد طلبات مضافة بعد</p>
              <button
                type="button"
                onClick={() => setMobileTab('catalog')}
                className="md:hidden mt-3 px-4 py-2 rounded-xl bg-amber-600 text-white font-black text-xs shadow-sm"
              >
                فتح القائمة وإضافة أصناف
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
                        {prod?.name || 'صنف'}
                      </h5>
                      {/* Modifiers List */}
                      {line.selectedModifiers && line.selectedModifiers.length > 0 && (
                        <div className="flex items-center gap-1 flex-wrap mt-0.5">
                          {line.selectedModifiers.map((m) => (
                            <span
                              key={m.id}
                              className="text-4xs font-bold px-1.5 py-0.5 rounded bg-amber-100 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300"
                            >
                              +{m.name} ({m.price} ج.م)
                            </span>
                          ))}
                        </div>
                      )}
                      {/* Kitchen Note */}
                      {line.kitchenNotes && (
                        <span className="text-4xs font-bold text-rose-600 dark:text-rose-400 block mt-0.5">
                          📝 {line.kitchenNotes}
                        </span>
                      )}
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
                    {/* Stepper */}
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

        {/* Totals & Fast Checkout Bar */}
        <div className="p-3 border-t border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/80 space-y-2">
          <div className="space-y-1 text-xs">
            <div className="flex justify-between text-slate-500 font-bold">
              <span>المجموع الفرعي:</span>
              <span>{formatNumber(subtotal)} ج.م</span>
            </div>
            {totalDiscount > 0 && (
              <div className="flex justify-between text-rose-500 font-bold">
                <span>الخصم:</span>
                <span>-{formatNumber(totalDiscount)} ج.م</span>
              </div>
            )}
            {totalTax > 0 && (
              <div className="flex justify-between text-slate-500 font-bold">
                <span>الضريبة:</span>
                <span>+{formatNumber(totalTax)} ج.م</span>
              </div>
            )}
            <div className="flex justify-between text-slate-900 dark:text-white font-black text-base pt-1 border-t border-slate-200 dark:border-slate-800">
              <span>الإجمالي المطلوب:</span>
              <span className="text-amber-600 dark:text-amber-400 font-mono">{formatNumber(total)} ج.م</span>
            </div>
          </div>

          {/* Payment Actions Grid */}
          <div className="grid grid-cols-2 gap-2 pt-1">
            <button
              type="button"
              disabled={cart.length === 0 || isSaving}
              onClick={() => onCheckout('cash')}
              className="h-10 sm:h-11 rounded-xl bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white font-black text-xs flex items-center justify-center gap-1.5 shadow-md shadow-emerald-600/20 transition-all cursor-pointer"
            >
              <Banknote className="w-4 h-4" />
              <span>دفع كاش (F10)</span>
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

          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              disabled={cart.length === 0}
              onClick={onOpenSplitModal}
              className="h-7 sm:h-8 rounded-lg bg-slate-200 hover:bg-slate-300 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 font-bold text-3xs flex items-center justify-center gap-1"
            >
              <Split className="w-3.5 h-3.5" />
              <span>تقسيم الحساب</span>
            </button>
            <button
              type="button"
              onClick={onOpenDiscountsModal}
              className="h-7 sm:h-8 rounded-lg bg-slate-200 hover:bg-slate-300 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 font-bold text-3xs flex items-center justify-center gap-1"
            >
              <Tag className="w-3.5 h-3.5" />
              <span>خصم / خدمة</span>
            </button>
          </div>
        </div>
      </div>

      {/* FLOOR MAP & TABLES MODAL */}
      <Dialog open={isFloorMapOpen} onOpenChange={setIsFloorMapOpen}>
        <DialogContent className="max-w-3xl bg-surface border border-slate-200 dark:border-slate-800 rounded-3xl p-4 sm:p-6" dir="rtl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-base sm:text-lg font-black text-slate-900 dark:text-white">
              <Utensils className="w-5 h-5 text-amber-500" />
              <span>مخطط طاولات الصالة وتوزيع الجلوس</span>
            </DialogTitle>
          </DialogHeader>

          {/* Section Tabs */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-2 border-b border-slate-200 dark:border-slate-800 no-scrollbar">
            {tableSections.map((sec) => (
              <button
                key={sec}
                type="button"
                onClick={() => setSelectedSection(sec)}
                className={`px-3 py-1.5 rounded-xl text-xs font-black transition-all shrink-0 ${
                  selectedSection === sec
                    ? 'bg-amber-600 text-white'
                    : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300'
                }`}
              >
                {sec}
              </button>
            ))}
          </div>

          {/* Table Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 sm:gap-3 py-3 max-h-[60vh] overflow-y-auto">
            {filteredTables.map((tbl) => {
              const isSelected = activeTable === tbl.table_number;
              const isOccupied = tbl.status === 'occupied';

              return (
                <div
                  key={tbl.id}
                  onClick={() => {
                    setActiveTable(tbl.table_number);
                    setOrderType('dine_in');
                    setIsFloorMapOpen(false);
                    toast.success(`تم اختيار طاولة #${tbl.table_number} للطلب الحالي`);
                  }}
                  className={`p-3 sm:p-4 rounded-2xl border text-center transition-all cursor-pointer ${
                    isSelected
                      ? 'border-amber-500 bg-amber-500/10 ring-2 ring-amber-500/40'
                      : isOccupied
                      ? 'border-rose-300 dark:border-rose-900/60 bg-rose-50/50 dark:bg-rose-950/20'
                      : 'border-slate-200 dark:border-slate-800 hover:border-emerald-500 hover:bg-emerald-500/5'
                  }`}
                >
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-3xs font-bold text-slate-400">
                      {tbl.section_name || 'الصالة'}
                    </span>
                    <span
                      className={`w-2.5 h-2.5 rounded-full ${
                        isOccupied ? 'bg-rose-500' : 'bg-emerald-500'
                      }`}
                    />
                  </div>

                  <h3 className="text-base sm:text-lg font-black text-slate-900 dark:text-white font-mono">
                    {tbl.table_number}
                  </h3>

                  <div className="mt-1 text-3xs text-slate-500 flex items-center justify-center gap-1 font-bold">
                    <Users className="w-3 h-3" />
                    <span>{tbl.capacity} مقاعد</span>
                  </div>

                  {isOccupied && (
                    <span className="mt-1.5 inline-block text-4xs font-bold text-rose-600 bg-rose-100 dark:bg-rose-950 px-2 py-0.5 rounded-full">
                      مشغولة
                    </span>
                  )}
                </div>
              );
            })}
          </div>

          <DialogFooter>
            <button
              type="button"
              onClick={() => setIsFloorMapOpen(false)}
              className="w-full sm:w-auto px-4 py-2 rounded-xl bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold text-xs"
            >
              إغلاق
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ITEM CUSTOMIZER / MODIFIERS MODAL */}
      <Dialog open={Boolean(customizingProduct)} onOpenChange={(open) => !open && setCustomizingProduct(null)}>
        <DialogContent className="max-w-md bg-surface border border-slate-200 dark:border-slate-800 rounded-3xl p-5 sm:p-6" dir="rtl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-base font-black text-slate-900 dark:text-white">
              <Sliders className="w-4 h-4 text-amber-500" />
              <span>تخصيص: «{customizingProduct?.name}»</span>
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-3.5 py-2">
            {/* Unit / Size Selector if available */}
            {customizingProduct && (unitOptions[customizingProduct.id] || []).length > 1 && (
              <div>
                <label className="text-xs font-black text-slate-700 dark:text-slate-300 block mb-1.5">
                  الحجم / الوحدة:
                </label>
                <div className="grid grid-cols-2 gap-2">
                  {(unitOptions[customizingProduct.id] || []).map((u) => (
                    <button
                      key={u.unitId}
                      type="button"
                      onClick={() => setSelectedUnitId(u.unitId)}
                      className={`p-2 rounded-xl border text-xs font-bold transition-all ${
                        selectedUnitId === u.unitId
                          ? 'border-amber-500 bg-amber-500/10 text-amber-600 dark:text-amber-400'
                          : 'border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400'
                      }`}
                    >
                      {unitsById[u.unitId]?.name || u.unitId}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Modifiers List */}
            <div>
              <label className="text-xs font-black text-slate-700 dark:text-slate-300 block mb-1.5">
                الإضافات والتعديلات:
              </label>
              <div className="space-y-1.5 max-h-44 overflow-y-auto">
                {availableModifiersList.map((m) => {
                  const isChecked = selectedModifiers.some((sm) => sm.id === m.id);
                  return (
                    <div
                      key={m.id}
                      onClick={() => {
                        if (isChecked) {
                          setSelectedModifiers((prev) => prev.filter((sm) => sm.id !== m.id));
                        } else {
                          setSelectedModifiers((prev) => [...prev, { id: m.id, name: m.name, price: m.price }]);
                        }
                      }}
                      className={`p-2 rounded-xl border flex items-center justify-between transition-all cursor-pointer ${
                        isChecked
                          ? 'border-emerald-500 bg-emerald-500/10 text-emerald-800 dark:text-emerald-300'
                          : 'border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-900'
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        <div
                          className={`w-4 h-4 rounded-md border flex items-center justify-center ${
                            isChecked ? 'border-emerald-500 bg-emerald-500 text-white' : 'border-slate-300 dark:border-slate-700'
                          }`}
                        >
                          {isChecked && <CheckCircle2 className="w-3 h-3" />}
                        </div>
                        <span className="text-xs font-bold">{m.name}</span>
                      </div>
                      <span className="text-xs font-black font-mono">
                        {m.price > 0 ? `+${m.price} ج.م` : 'مجاناً'}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Kitchen Notes */}
            <div>
              <label className="text-xs font-black text-slate-700 dark:text-slate-300 block mb-1.5">
                ملاحظات التحضير والمطبخ:
              </label>
              <input
                type="text"
                value={kitchenNotes}
                onChange={(e) => setKitchenNotes(e.target.value)}
                placeholder="مثال: بدون بصل، سكر خفيف، حار جداً..."
                className="w-full h-9 px-3 rounded-xl bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-xs font-bold focus:outline-none focus:ring-2 focus:ring-amber-500"
              />
            </div>
          </div>

          <DialogFooter className="gap-2">
            <button
              type="button"
              onClick={() => setCustomizingProduct(null)}
              className="px-4 py-2 rounded-xl bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold text-xs"
            >
              إلغاء
            </button>
            <button
              type="button"
              onClick={confirmCustomization}
              className="px-5 py-2 rounded-xl bg-amber-600 hover:bg-amber-700 text-white font-black text-xs shadow-md shadow-amber-600/20"
            >
              إضافة للطلب
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* KOT KITCHEN ORDER TICKET MODAL */}
      <Dialog open={isKotModalOpen} onOpenChange={setIsKotModalOpen}>
        <DialogContent className="max-w-sm bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-3xl p-5 sm:p-6" dir="rtl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-base font-black text-slate-900 dark:text-white">
              <ChefHat className="w-5 h-5 text-purple-600" />
              <span>معاينة وطباعة بون المطبخ (KOT)</span>
            </DialogTitle>
          </DialogHeader>

          {/* Simulated Thermal Kitchen Ticket Slip */}
          <div className="p-3 sm:p-4 rounded-xl bg-slate-50 dark:bg-slate-900 border border-dashed border-slate-300 dark:border-slate-700 font-mono space-y-3">
            <div className="text-center pb-2 border-b border-dashed border-slate-300 dark:border-slate-700">
              <h3 className="font-black text-sm">
                {isCafeMode ? '☕ بون تحضير الباريستا' : '👨‍🍳 بون تحضير المطبخ (KOT)'}
              </h3>
              <div className="text-2xs text-slate-500 mt-1">
                تذكرة: #{currentKotTicket.ticketNumber} | الوقت: {currentKotTicket.timestamp}
              </div>
              <div className="text-xs font-black text-purple-600 mt-1">
                {currentKotTicket.orderType === 'dine_in'
                  ? `صالة - طاولة #${currentKotTicket.tableNumber || 'غير محددة'}`
                  : currentKotTicket.orderType === 'takeaway'
                  ? 'طلب سفري (تيك أواي)'
                  : 'طلب توصيل منازل (دليفري)'}
              </div>
            </div>

            <div className="space-y-2 py-1">
              {currentKotTicket.items.map((item, idx) => (
                <div key={idx} className="border-b border-slate-200 dark:border-slate-800 pb-1.5">
                  <div className="flex justify-between font-black text-xs text-slate-900 dark:text-white">
                    <span>{item.name}</span>
                    <span className="font-mono text-sm bg-slate-200 dark:bg-slate-800 px-1.5 rounded">
                      x{item.qty}
                    </span>
                  </div>
                  {item.modifiers && item.modifiers.length > 0 && (
                    <div className="text-3xs text-amber-600 dark:text-amber-400 mt-0.5">
                      + {item.modifiers.join(', ')}
                    </div>
                  )}
                  {item.kitchenNotes && (
                    <div className="text-3xs text-rose-600 dark:text-rose-400 font-bold mt-0.5">
                      ⚠️ {item.kitchenNotes}
                    </div>
                  )}
                </div>
              ))}
            </div>

            <div className="text-center text-3xs text-slate-400 pt-1">
              falcon-erp • طابعة المطبخ الحرارية
            </div>
          </div>

          <DialogFooter className="gap-2">
            <button
              type="button"
              onClick={() => setIsKotModalOpen(false)}
              className="px-4 py-2 rounded-xl bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold text-xs"
            >
              إغلاق
            </button>
            <button
              type="button"
              onClick={() => {
                window.print();
                toast.success('تم إرسال أمر الطباعة إلى طابعة المطبخ بنجاح');
                setIsKotModalOpen(false);
              }}
              className="px-5 py-2 rounded-xl bg-purple-600 hover:bg-purple-700 text-white font-black text-xs flex items-center gap-1.5"
            >
              <Printer className="w-4 h-4" />
              <span>طباعة البون الآن</span>
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
