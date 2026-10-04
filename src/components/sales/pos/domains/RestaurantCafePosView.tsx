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
  // 1. Local state for tables & sections
  const [tables, setTables] = useState<RestaurantTable[]>([]);
  const [selectedSection, setSelectedSection] = useState<string>('الكل');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [searchItem, setSearchItem] = useState('');
  const [isFloorMapOpen, setIsFloorMapOpen] = useState(false);
  const [isKotModalOpen, setIsKotModalOpen] = useState(false);

  // 2. Modifiers & Customization Modal State
  const [customizingProduct, setCustomizingProduct] = useState<Product | null>(null);
  const [activeModifiers, setActiveModifiers] = useState<OrderModifier[]>([]);
  const [selectedModifiers, setSelectedModifiers] = useState<CartModifier[]>([]);
  const [kitchenNotes, setKitchenNotes] = useState('');
  const [selectedUnitId, setSelectedUnitId] = useState<string>('');

  // 3. Load or initialize tables
  useEffect(() => {
    async function loadTables() {
      if (!orgId) return;
      try {
        const localTables = await db.restaurant_tables.where('org_id').equals(orgId).toArray();
        if (localTables && localTables.length > 0) {
          setTables(localTables);
        } else {
          // Provide sensible default tables for modern restaurant/cafe
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

  // 4. Default modifiers for food/drinks
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

  // 5. Sections
  const tableSections = useMemo(() => {
    const set = new Set(tables.map((t) => t.section_name || 'عام'));
    return ['الكل', ...Array.from(set)];
  }, [tables]);

  const filteredTables = useMemo(() => {
    if (selectedSection === 'الكل') return tables;
    return tables.filter((t) => (t.section_name || 'عام') === selectedSection);
  }, [tables, selectedSection]);

  // 6. Products Categories & Filtering
  const categories = useMemo(() => {
    const cats = new Set(products.map((p) => p.category_id).filter(Boolean));
    return ['all', ...Array.from(cats)];
  }, [products]);

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

  // Handlers for customization
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
    <div className="flex-1 flex flex-col md:flex-row overflow-hidden bg-slate-900/10">
      {/* LEFT COLUMN: Food/Drink Items & Menu Grid */}
      <div className="flex-1 flex flex-col min-w-0 border-b md:border-b-0 md:border-l border-slate-200 dark:border-slate-800 bg-white dark:bg-[#0b101b]">
        {/* Top Control Bar: Order Mode Selector (صالة / سفري / توصيل) */}
        <div className="p-3 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between gap-3 bg-slate-50/80 dark:bg-slate-900/60">
          {/* Order Types */}
          <div className="flex items-center gap-1.5 p-1 bg-slate-200/80 dark:bg-slate-800 rounded-2xl">
            <button
              type="button"
              onClick={() => setOrderType('dine_in')}
              className={`flex items-center gap-2 px-3.5 py-1.5 rounded-xl font-black text-xs transition-all ${
                orderType === 'dine_in'
                  ? 'bg-amber-600 text-white shadow-md shadow-amber-600/30'
                  : 'text-slate-600 dark:text-slate-300 hover:bg-white/40'
              }`}
            >
              <Utensils className="w-4 h-4" />
              <span>صالة (طاولات)</span>
            </button>
            <button
              type="button"
              onClick={() => {
                setOrderType('takeaway');
                setActiveTable(null);
              }}
              className={`flex items-center gap-2 px-3.5 py-1.5 rounded-xl font-black text-xs transition-all ${
                orderType === 'takeaway'
                  ? 'bg-emerald-600 text-white shadow-md shadow-emerald-600/30'
                  : 'text-slate-600 dark:text-slate-300 hover:bg-white/40'
              }`}
            >
              <ShoppingBag className="w-4 h-4" />
              <span>سفري (Takeaway)</span>
            </button>
            <button
              type="button"
              onClick={() => {
                setOrderType('delivery');
                setActiveTable(null);
              }}
              className={`flex items-center gap-2 px-3.5 py-1.5 rounded-xl font-black text-xs transition-all ${
                orderType === 'delivery'
                  ? 'bg-blue-600 text-white shadow-md shadow-blue-600/30'
                  : 'text-slate-600 dark:text-slate-300 hover:bg-white/40'
              }`}
            >
              <Truck className="w-4 h-4" />
              <span>دليفري (توصيل)</span>
            </button>
          </div>

          {/* Active Table indicator or Floor Map button */}
          {orderType === 'dine_in' && (
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setIsFloorMapOpen(true)}
                className={`flex items-center gap-2 px-3.5 py-1.5 rounded-xl text-xs font-black border transition-all cursor-pointer ${
                  activeTable
                    ? 'bg-amber-500/10 border-amber-500/40 text-amber-700 dark:text-amber-300'
                    : 'bg-rose-500/10 border-rose-500/40 text-rose-700 dark:text-rose-300 animate-pulse'
                }`}
              >
                <Users className="w-4 h-4" />
                <span>{activeTable ? `طاولة: ${activeTable}` : 'حدد طاولة الصالة'}</span>
              </button>
            </div>
          )}

          {/* KOT Print Quick Action */}
          <button
            type="button"
            onClick={() => {
              if (cart.length === 0) {
                toast.warning('السلة فارغة، أضف أصنافاً لبون المطبخ');
                return;
              }
              setIsKotModalOpen(true);
            }}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-black bg-purple-600/10 hover:bg-purple-600/20 text-purple-700 dark:text-purple-300 border border-purple-500/30 transition-all cursor-pointer"
          >
            <ChefHat className="w-4 h-4" />
            <span className="hidden sm:inline">بون المطبخ (KOT)</span>
          </button>
        </div>

        {/* Search & Categories Bar */}
        <div className="p-3 border-b border-slate-200 dark:border-slate-800 flex flex-col sm:flex-row gap-2.5">
          <div className="relative flex-1">
            <Search className="w-4 h-4 absolute right-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={searchItem}
              onChange={(e) => setSearchItem(e.target.value)}
              placeholder={isCafeMode ? 'ابحث عن مشروب، قهوة، موهيتو، كيك...' : 'ابحث عن وجبة، ساندوتش، طبق، مشروب...'}
              className="w-full h-9 pr-9 pl-3 rounded-xl bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-xs font-bold focus:outline-none focus:ring-2 focus:ring-amber-500"
            />
            {searchItem && (
              <button
                type="button"
                onClick={() => setSearchItem('')}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>

        {/* Visual Food & Beverage Touch Grid */}
        <div className="flex-1 overflow-y-auto p-3.5 grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
          {filteredProducts.map((p) => {
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
                  // Single touch adds directly, or right-click / customize opens options
                  onAddToCart(p, {
                    orderType,
                    tableNumber: activeTable || undefined,
                  });
                }}
                className={`group relative flex flex-col justify-between p-3 rounded-2xl border transition-all cursor-pointer select-none ${
                  isOutOfStock
                    ? 'opacity-50 grayscale border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/50'
                    : 'bg-white dark:bg-slate-900/90 border-slate-200 dark:border-slate-800 hover:border-amber-500 hover:shadow-lg hover:shadow-amber-500/10 hover:-translate-y-0.5'
                }`}
              >
                <div>
                  <div className="flex items-start justify-between gap-1 mb-1.5">
                    <span className="text-xl">
                      {isCafeMode ? '☕' : '🍽️'}
                    </span>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        openCustomizer(p);
                      }}
                      title="تخصيص الإضافات والملاحظات"
                      className="w-7 h-7 rounded-lg bg-slate-100 hover:bg-amber-100 dark:bg-slate-800 dark:hover:bg-amber-950/60 text-slate-600 hover:text-amber-600 flex items-center justify-center transition-colors"
                    >
                      <Sliders className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  <h4 className="font-black text-xs text-slate-900 dark:text-white leading-tight line-clamp-2">
                    {p.name}
                  </h4>
                  <span className="text-4xs text-slate-400 font-mono mt-0.5 block">
                    {p.sku}
                  </span>
                </div>

                <div className="mt-3 pt-2 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
                  <div className="flex flex-col">
                    <span className="text-sm font-black text-amber-600 dark:text-amber-400">
                      {formatNumber(p.sale_price || 0)} <span className="text-4xs">ج.م</span>
                    </span>
                  </div>
                  <span className="text-4xs text-slate-400 font-bold">
                    {p.item_type !== 'storable' ? 'جاهز' : `متاح: ${avail}`}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* RIGHT COLUMN: Active Table / Order Cart Summary & Fast Actions */}
      <div className="w-full md:w-[380px] lg:w-[420px] flex flex-col bg-white dark:bg-[#0c121e] border-t md:border-t-0 md:border-r border-slate-200 dark:border-slate-800">
        {/* Ticket Header */}
        <div className="p-3.5 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between bg-slate-50 dark:bg-slate-900/60">
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
              {cart.length} أصناف في الفاتورة الحالية
            </span>
          </div>

          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={onOpenCustomerModal}
              title="تحديد عميل"
              className="px-2 py-1 rounded-lg text-3xs font-bold bg-slate-200 dark:bg-slate-800 hover:bg-slate-300 text-slate-700 dark:text-slate-300"
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

        {/* Cart Items List */}
        <div className="flex-1 overflow-y-auto p-3 space-y-2">
          {cart.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-center p-6 text-slate-400">
              <Utensils className="w-10 h-10 mb-2 opacity-30 stroke-[1.5]" />
              <p className="text-xs font-bold">لا توجد طلبات مضافة بعد</p>
              <p className="text-3xs text-slate-500 mt-1">اضغط على الأصناف في القائمة لإضافتها للطلب</p>
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
        <div className="p-3.5 border-t border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/80 space-y-2.5">
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
              <span>بطاقة / فيزا (F7)</span>
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
              <span>تقسيم الحساب</span>
            </button>
            <button
              type="button"
              onClick={onOpenDiscountsModal}
              className="h-8 rounded-lg bg-slate-200 hover:bg-slate-300 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 font-bold text-3xs flex items-center justify-center gap-1"
            >
              <Tag className="w-3.5 h-3.5" />
              <span>خصم / خدمة</span>
            </button>
          </div>
        </div>
      </div>

      {/* FLOOR MAP & TABLES MODAL */}
      <Dialog open={isFloorMapOpen} onOpenChange={setIsFloorMapOpen}>
        <DialogContent className="max-w-3xl bg-surface border border-slate-200 dark:border-slate-800 rounded-3xl p-6" dir="rtl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-lg font-black text-slate-900 dark:text-white">
              <Utensils className="w-5 h-5 text-amber-500" />
              <span>مخطط طاولات الصالة وتوزيع الجلوس</span>
            </DialogTitle>
          </DialogHeader>

          {/* Section Tabs */}
          <div className="flex items-center gap-2 overflow-x-auto pb-2 border-b border-slate-200 dark:border-slate-800">
            {tableSections.map((sec) => (
              <button
                key={sec}
                type="button"
                onClick={() => setSelectedSection(sec)}
                className={`px-3 py-1.5 rounded-xl text-xs font-black transition-all ${
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
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 py-4 max-h-[60vh] overflow-y-auto">
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
                  className={`p-4 rounded-2xl border text-center transition-all cursor-pointer ${
                    isSelected
                      ? 'border-amber-500 bg-amber-500/10 ring-2 ring-amber-500/40'
                      : isOccupied
                      ? 'border-rose-300 dark:border-rose-900/60 bg-rose-50/50 dark:bg-rose-950/20'
                      : 'border-slate-200 dark:border-slate-800 hover:border-emerald-500 hover:bg-emerald-500/5'
                  }`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-3xs font-bold text-slate-400">
                      {tbl.section_name || 'الصالة'}
                    </span>
                    <span
                      className={`w-2.5 h-2.5 rounded-full ${
                        isOccupied ? 'bg-rose-500' : 'bg-emerald-500'
                      }`}
                    />
                  </div>

                  <h3 className="text-lg font-black text-slate-900 dark:text-white font-mono">
                    {tbl.table_number}
                  </h3>

                  <div className="mt-2 text-3xs text-slate-500 flex items-center justify-center gap-1 font-bold">
                    <Users className="w-3 h-3" />
                    <span>{tbl.capacity} مقاعد</span>
                  </div>

                  {isOccupied && (
                    <span className="mt-2 inline-block text-4xs font-bold text-rose-600 bg-rose-100 dark:bg-rose-950 px-2 py-0.5 rounded-full">
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
              className="px-4 py-2 rounded-xl bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold text-xs"
            >
              إغلاق
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ITEM CUSTOMIZER / MODIFIERS MODAL */}
      <Dialog open={Boolean(customizingProduct)} onOpenChange={(open) => !open && setCustomizingProduct(null)}>
        <DialogContent className="max-w-md bg-surface border border-slate-200 dark:border-slate-800 rounded-3xl p-6" dir="rtl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-base font-black text-slate-900 dark:text-white">
              <Sliders className="w-4 h-4 text-amber-500" />
              <span>تخصيص: «{customizingProduct?.name}»</span>
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-2">
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
                      className={`p-2.5 rounded-xl border text-xs font-bold transition-all ${
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
                الإضافات والتعديلات المتاحة:
              </label>
              <div className="space-y-1.5 max-h-48 overflow-y-auto">
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
                      className={`p-2.5 rounded-xl border flex items-center justify-between transition-all cursor-pointer ${
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
                placeholder="مثال: بدون بصل، سكر خفيف، حار جداً، بدون ثلج..."
                className="w-full h-10 px-3 rounded-xl bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-xs font-bold focus:outline-none focus:ring-2 focus:ring-amber-500"
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
        <DialogContent className="max-w-sm bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-3xl p-6" dir="rtl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-base font-black text-slate-900 dark:text-white">
              <ChefHat className="w-5 h-5 text-purple-600" />
              <span>معاينة وطباعة بون المطبخ (KOT)</span>
            </DialogTitle>
          </DialogHeader>

          {/* Simulated Thermal Kitchen Ticket Slip */}
          <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-900 border border-dashed border-slate-300 dark:border-slate-700 font-mono space-y-3">
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
