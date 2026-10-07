'use client';

import React, { useState, useMemo } from 'react';
import {
  Hammer,
  Ruler,
  Paintbrush,
  Layers,
  Box,
  Store,
  CheckCircle2,
  Sparkles,
  Calculator,
  Printer,
  Trash2,
  Plus,
  Minus,
  Search,
  Receipt,
  Building,
  CreditCard,
  Banknote,
  Send,
  Calendar,
  AlertCircle,
  FileText,
  BadgeDollarSign,
  Maximize2
} from 'lucide-react';
import { toast } from 'sonner';
import { Badge } from '@/components/ui/badge';
import { formatNumber } from '@/lib/format';
import type { Product, Unit } from '@/types';
import type { CartLine, UnitOption } from '../types';

interface ShopFittingPosViewProps {
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

// نموذج باقات وبنود التجهيز والديكور الافتراضية
interface FitoutTemplateItem {
  id: string;
  title: string;
  category: 'packages' | 'materials_per_meter' | 'counters_stands' | 'signs_lighting';
  unitLabel: string; // م²، م.ط، وحدة، طقم
  defaultPrice: number;
  costPrice: number;
  description: string;
  badge: string;
  icon: string;
}

const TEMPLATE_ITEMS: FitoutTemplateItem[] = [
  // باقات متكاملة
  {
    id: 'pkg-clothing',
    title: 'باقة تجهيز بوتيك ملابس متكامل (حتى 50 م²)',
    category: 'packages',
    unitLabel: 'مشروع كامل',
    defaultPrice: 85000,
    costPrice: 58000,
    description: 'تشمل: 6 ستاندات جدارية ذهبي/أسود، 2 جزيرة وسطية، 2 بروفة قياس، كاونتر كاشير، إضاءة تراك لايت، أرضية HDF',
    badge: 'الأكثر طلباً',
    icon: '👔',
  },
  {
    id: 'pkg-pharmacy',
    title: 'باقة تجهيز صيدلية مودرن متكاملة',
    category: 'packages',
    unitLabel: 'مشروع كامل',
    defaultPrice: 120000,
    costPrice: 82000,
    description: 'تشمل: وحدات أدراج أدوية سحب ثقيل، فاترينات زجاج سيكوريت مع ليد، كاونتر استقبال وصرف روشتات، لافتة مضيئة 3D',
    badge: 'طبي معتمد',
    icon: '💊',
  },
  {
    id: 'pkg-cafe',
    title: 'باقة تجهيز كافيه / مقهى كلاسيك وبار',
    category: 'packages',
    unitLabel: 'مشروع كامل',
    defaultPrice: 95000,
    costPrice: 65000,
    description: 'تشمل: بار كافيه رخام صناعي وخشب، تجليد حوائط بديل خشب، إضاءة معلقة دافئة، سقف معلق جبس بورد',
    badge: 'كافيهات',
    icon: '☕',
  },
  {
    id: 'pkg-supermarket',
    title: 'باقة تجهيز ميني ماركت وبقالة',
    category: 'packages',
    unitLabel: 'مشروع كامل',
    defaultPrice: 75000,
    costPrice: 52000,
    description: 'تشمل: أرفف جدارية صاج محمل بودرة إلكتروستاتيك، جزر عرض وسطية، كاونتر كاشير بصينية دفع، حواجز تنظيم',
    badge: 'تجاري',
    icon: '🛒',
  },

  // بنود بالمتر (م² وم.ط)
  {
    id: 'mat-cladding',
    title: 'واجهات كلادينج خليجي مقاوم للحريق (م²)',
    category: 'materials_per_meter',
    unitLabel: 'م²',
    defaultPrice: 1450,
    costPrice: 980,
    description: 'توريد وتركيب شامل شاسيه علب حديد محمل مع دهان برايمر مانع للصدأ وسيليكون ألماني مانع لتسرب الأمطار',
    badge: 'واجهات',
    icon: '🏢',
  },
  {
    id: 'mat-securit',
    title: 'زجاج سيكوريت 10 مم شفاف مع الإكسسوارات (م²)',
    category: 'materials_per_meter',
    unitLabel: 'م²',
    defaultPrice: 1650,
    costPrice: 1100,
    description: 'شامل الماكينات الهيدروليكية الإيطالية، المفصلات والمقابض ستانلس ستيل 304، والأقفال الأرضية',
    badge: 'أبواب وواجهات',
    icon: '🪟',
  },
  {
    id: 'mat-gypsum',
    title: 'أسقف معلقة جبس بورد كناوف أخضر/أبيض (م²)',
    category: 'materials_per_meter',
    unitLabel: 'م²',
    defaultPrice: 380,
    costPrice: 240,
    description: 'شامل الشاسيه المجلفن، زوايا، أوميجا، التثبيت، معجون الفواصل والفيبر تيب جاهز للنقاشة',
    badge: 'أسقف',
    icon: '📐',
  },
  {
    id: 'mat-wood-panel',
    title: 'تجليد حوائط بديل خشب وبديل رخام UV (م²)',
    category: 'materials_per_meter',
    unitLabel: 'م²',
    defaultPrice: 550,
    costPrice: 360,
    description: 'شامل الشاسيه الداخلي، الفواصل الذهبية والفضية، التثبيت بالسيليكون العظم مع عزل الرطوبة',
    badge: 'حوائط',
    icon: '🪵',
  },
  {
    id: 'mat-led-profile',
    title: 'شريط ليد بروفايل ألومنيوم غاطس/بارز (م.ط)',
    category: 'materials_per_meter',
    unitLabel: 'م.ط',
    defaultPrice: 190,
    costPrice: 115,
    description: 'مسطرة ألومنيوم + ناشر إضاءة أوبال، شريط ليد كوري 240 ليد/م، محول MeanWell الأصلي',
    badge: 'إضاءة خطية',
    icon: '💡',
  },
  {
    id: 'mat-parquet',
    title: 'أرضيات باركيه ألماني HDF كلاس 32 مقاوم للبري (م²)',
    category: 'materials_per_meter',
    unitLabel: 'م²',
    defaultPrice: 420,
    costPrice: 290,
    description: 'شامل فوم العزل الأبيض، وزرات خشب محيطية، وزوايا التقفيل عند الأبواب',
    badge: 'أرضيات',
    icon: '📦',
  },

  // كاونترات وأثاث تجاري
  {
    id: 'cnt-cashier-modern',
    title: 'كاونتر كاشير واستقبال تجاري مودرن 2 متر',
    category: 'counters_stands',
    unitLabel: 'وحدة',
    defaultPrice: 14500,
    costPrice: 9500,
    description: 'خشب إم دي إف مصفح HPL مقاوم للخدش، مزود بأدراج بكوالين سنتر لوك، مسار مخفي للكابلات وليد ديكوري',
    badge: 'كاونترات',
    icon: '🛎️',
  },
  {
    id: 'cnt-island-display',
    title: 'جزيرة عرض وسطية مدرجة (Center Island)',
    category: 'counters_stands',
    unitLabel: 'وحدة',
    defaultPrice: 8500,
    costPrice: 5400,
    description: 'ارتفاع 110 سم مع 3 مستويات عرض، خشب مع شاسيه حديد دهان حراري بودرة ذهبي/أسود',
    badge: 'جزر عرض',
    icon: '🪑',
  },
  {
    id: 'cnt-fitting-room',
    title: 'كابينة بروفة قياس ملابس مع المرآة والإضاءة',
    category: 'counters_stands',
    unitLabel: 'وحدة',
    defaultPrice: 6200,
    costPrice: 3800,
    description: 'مقاس 120×120 سم، مرآة ليد لمس 180 سم، شماعات ستانلس، ستارة قماش قطيفة عازلة للضوء',
    badge: 'بروفات',
    icon: '🚪',
  },
  {
    id: 'cnt-wall-rack',
    title: 'ستاند ملابس جداري ستانلس دهان حراري 3 متر',
    category: 'counters_stands',
    unitLabel: 'وحدة',
    defaultPrice: 4800,
    costPrice: 3100,
    description: 'شامل أرفف خشبية علوية + مواسير تعليق جانبية وأمامية، تثبيت صلب بالجدار',
    badge: 'أرفف حائط',
    icon: '🧲',
  },

  // لافتات وإضاءات
  {
    id: 'sign-3d-letters',
    title: 'يافطة واجهة حروف بارزة مضيئة 3D LED (حرف)',
    category: 'signs_lighting',
    unitLabel: 'حرف / وحدة',
    defaultPrice: 650,
    costPrice: 400,
    description: 'جوانب ستانلس أو زنكور مع وجه أكريليك 3 مم مضيء بموديولات سامسونج الأصلية المقاومة للحرارة والمطر',
    badge: 'لافتات',
    icon: '✨',
  },
  {
    id: 'sign-track-light-kit',
    title: 'طقم إضاءة موجهة تراك لايت (مجرى 2م + 4 اسبوتات)',
    category: 'signs_lighting',
    unitLabel: 'طقم',
    defaultPrice: 2200,
    costPrice: 1400,
    description: 'اسبوتات 30 وات عدسة زووم تركيز، لون إضاءة دافئ (Warm 3000K) لإبراز تفاصيل المعروضات',
    badge: 'إضاءة معارض',
    icon: '🔦',
  },
];

export function ShopFittingPosView({
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
}: ShopFittingPosViewProps) {
  // Navigation & Category Filters
  const [activeTab, setActiveTab] = useState<'all' | 'packages' | 'materials_per_meter' | 'counters_stands' | 'signs_lighting'>('all');
  const [searchQuery, setSearchQuery] = useState('');

  // Shop & Project Context State
  const [projectName, setProjectName] = useState('تجهيز محل تجاري');
  const [projectArea, setProjectArea] = useState('60'); // m²
  const [shopType, setShopType] = useState('ملابس وأزياء');
  const [downPaymentPercent, setDownPaymentPercent] = useState<number>(40);
  const [customProductsMap, setCustomProductsMap] = useState<Record<string, Product>>({});

  // Quick Dimension Calculator Modal State
  const [isCalcOpen, setIsCalcOpen] = useState(false);
  const [calcItem, setCalcItem] = useState<FitoutTemplateItem | null>(null);
  const [calcLength, setCalcLength] = useState<number>(4);
  const [calcHeight, setCalcHeight] = useState<number>(2.8);
  const [calcMultiplier, setCalcMultiplier] = useState<number>(1);
  const [calcWastagePercent, setCalcWastagePercent] = useState<number>(5);

  // Calculated Area
  const calcRawArea = useMemo(() => {
    return calcLength * calcHeight * calcMultiplier;
  }, [calcLength, calcHeight, calcMultiplier]);

  const calcFinalArea = useMemo(() => {
    const wastage = calcRawArea * (calcWastagePercent / 100);
    return Math.round((calcRawArea + wastage) * 100) / 100;
  }, [calcRawArea, calcWastagePercent]);

  // Filtered Templates
  const filteredTemplates = useMemo(() => {
    return TEMPLATE_ITEMS.filter((item) => {
      const matchesTab = activeTab === 'all' || item.category === activeTab;
      const matchesSearch =
        !searchQuery.trim() ||
        item.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.unitLabel.includes(searchQuery);
      return matchesTab && matchesSearch;
    });
  }, [activeTab, searchQuery]);

  // Handle Add Item to Cart
  const handleAddTemplateItem = (item: FitoutTemplateItem, customQty?: number) => {
    const qty = customQty || 1;
    const ephemeralProduct: Product = {
      id: `fitout_${item.id}_${Date.now()}`,
      org_id: orgId || '',
      sku: `DEC-${item.id.slice(0, 8).toUpperCase()}`,
      name: `${item.title} [${item.unitLabel}]`,
      category_id: null,
      base_unit_id: item.unitLabel,
      item_type: 'service',
      purchase_price: item.costPrice,
      sale_price: item.defaultPrice,
      min_sale_price: item.defaultPrice * 0.9,
      min_stock_alert: 0,
      is_active: true,
      tax_rate: 0,
      is_tax_inclusive: true,
      tracks_batch: false,
      tracks_expiry: false,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    setCustomProductsMap((prev) => ({ ...prev, [ephemeralProduct.id]: ephemeralProduct }));
    onAddToCart(ephemeralProduct, { qty: customQty || 1 });
    toast.success(`تمت إضافة: ${item.title}`);
  };

  // Confirm Calculator Addition
  const handleApplyCalculatedArea = () => {
    if (!calcItem) return;
    const qty = calcFinalArea > 0 ? calcFinalArea : 1;

    const ephemeralProduct: Product = {
      id: `fitout_calc_${calcItem.id}_${Date.now()}`,
      org_id: orgId || '',
      sku: `CALC-${Date.now().toString().slice(-6)}`,
      name: `${calcItem.title} (${calcLength}م × ${calcHeight}م × ${calcMultiplier} قطعة + هالك ${calcWastagePercent}%)`,
      category_id: null,
      base_unit_id: calcItem.unitLabel,
      item_type: 'service',
      purchase_price: calcItem.costPrice,
      sale_price: calcItem.defaultPrice,
      min_sale_price: calcItem.defaultPrice * 0.9,
      min_stock_alert: 0,
      is_active: true,
      tax_rate: 0,
      is_tax_inclusive: true,
      tracks_batch: false,
      tracks_expiry: false,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    setCustomProductsMap((prev) => ({ ...prev, [ephemeralProduct.id]: ephemeralProduct }));
    onAddToCart(ephemeralProduct, { qty });
    setIsCalcOpen(false);
    toast.success(`تم إدراج ${calcFinalArea} ${calcItem.unitLabel} بمقايسة المشروع`);
  };

  // Payment Breakdown Calculations
  const downPaymentAmount = useMemo(() => {
    return Math.round(total * (downPaymentPercent / 100));
  }, [total, downPaymentPercent]);

  const remainingAmount = useMemo(() => {
    return Math.max(0, total - downPaymentAmount);
  }, [total, downPaymentAmount]);

  // Quick Print Quotation
  const handlePrintQuotation = () => {
    if (cart.length === 0) {
      toast.error('المقايسة فارغة! يرجى إضافة بنود أو باقات أولاً');
      return;
    }
    window.print();
  };

  return (
    <div className="flex flex-col lg:flex-row gap-3 h-[calc(100vh-130px)] select-none overflow-hidden" dir="rtl">
      {/* ========================================================================= */}
      {/* 1. Left / Center: Decor & Fit-out Catalog, Packages & Dimension Tools   */}
      {/* ========================================================================= */}
      <div className="flex-1 flex flex-col bg-slate-50/50 dark:bg-slate-950/40 rounded-2xl border border-slate-200 dark:border-slate-800/80 overflow-hidden">
        {/* Domain Banner / Project Header */}
        <div className="bg-gradient-to-r from-amber-700 via-amber-800 to-slate-900 text-white p-3.5 sm:p-4 shrink-0 shadow-xs flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-500/20 border border-amber-400/40 backdrop-blur-xs flex items-center justify-center text-xl shrink-0">
              🏗️
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-black text-amber-50 tracking-tight">
                  كاشير مقايسات وتجهيز المحلات والديكور
                </h2>
                <Badge className="bg-amber-400/20 text-amber-200 border-amber-400/30 text-3xs font-bold py-0">
                  Shop Fitting & Decor
                </Badge>
              </div>
              <p className="text-3xs text-amber-200/80 font-medium mt-0.5">
                إصدار مقايسات كميات، حساب أمتار وخامات (م²)، عقود توريد وتركيب، وجدولة دفعات التجهيز
              </p>
            </div>
          </div>

          {/* Quick Project Details Tag */}
          <div className="flex items-center gap-2 bg-slate-900/60 backdrop-blur-md px-3 py-1.5 rounded-xl border border-white/10 text-xs">
            <Store className="w-4 h-4 text-amber-400 shrink-0" />
            <input
              type="text"
              value={projectName}
              onChange={(e) => setProjectName(e.target.value)}
              placeholder="اسم المشروع / المحل"
              className="bg-transparent text-white font-bold text-xs border-b border-transparent focus:border-amber-400 focus:outline-hidden w-32 sm:w-40"
            />
            <span className="text-amber-300 font-black">|</span>
            <input
              type="number"
              value={projectArea}
              onChange={(e) => setProjectArea(e.target.value)}
              placeholder="المساحة"
              className="bg-transparent text-amber-300 font-black text-xs w-10 text-center border-b border-transparent focus:border-amber-400 focus:outline-hidden"
            />
            <span className="text-3xs text-slate-300 font-bold">م²</span>
          </div>
        </div>

        {/* Category Tabs & Quick Search */}
        <div className="p-3 border-b border-slate-200 dark:border-slate-800/80 bg-surface flex flex-col sm:flex-row items-center justify-between gap-2.5 shrink-0">
          {/* Tabs */}
          <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar w-full sm:w-auto">
            {[
              { id: 'all', label: 'الكل', icon: '⚡' },
              { id: 'packages', label: 'باقات المحلات', icon: '🏬' },
              { id: 'materials_per_meter', label: 'بنود بالمتر (م²)', icon: '📐' },
              { id: 'counters_stands', label: 'كاونترات وأثاث', icon: '🛎️' },
              { id: 'signs_lighting', label: 'لافتات وإضاءة', icon: '✨' },
            ].map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id as any)}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all shrink-0 flex items-center gap-1.5 cursor-pointer ${
                  activeTab === tab.id
                    ? 'bg-amber-600 text-white shadow-xs font-black'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white bg-slate-100 dark:bg-slate-800/60'
                }`}
              >
                <span>{tab.icon}</span>
                <span>{tab.label}</span>
              </button>
            ))}
          </div>

          {/* Search Box */}
          <div className="relative w-full sm:w-64">
            <Search className="w-4 h-4 text-slate-400 absolute right-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="بحث في الخامات والباقات..."
              className="w-full h-8.5 pr-9 pl-3 text-xs bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl focus:outline-hidden focus:border-amber-500 font-medium text-slate-800 dark:text-slate-200"
            />
          </div>
        </div>

        {/* Template Catalog Grid */}
        <div className="flex-1 overflow-y-auto p-3.5 grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
          {filteredTemplates.map((item) => {
            const isPerMeter = item.category === 'materials_per_meter';
            return (
              <div
                key={item.id}
                className="bg-surface rounded-2xl p-3.5 border border-slate-200/90 dark:border-slate-800/90 shadow-2xs hover:shadow-xs hover:border-amber-400/60 dark:hover:border-amber-500/40 transition-all flex flex-col justify-between group"
              >
                <div>
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-xl bg-amber-500/10 dark:bg-amber-500/20 text-base flex items-center justify-center shrink-0">
                        {item.icon}
                      </div>
                      <Badge className="bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-none text-3xs font-bold py-0.5 px-2">
                        {item.badge}
                      </Badge>
                    </div>
                    <span className="text-3xs font-bold text-amber-700 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/50 px-2 py-0.5 rounded-md border border-amber-200/50 dark:border-amber-900/50">
                      {item.unitLabel}
                    </span>
                  </div>

                  <h3 className="font-bold text-xs text-slate-900 dark:text-white leading-snug line-clamp-2">
                    {item.title}
                  </h3>
                  <p className="text-3xs text-slate-500 dark:text-slate-400 mt-1 line-clamp-2 leading-relaxed">
                    {item.description}
                  </p>
                </div>

                <div className="mt-3 pt-2.5 border-t border-slate-100 dark:border-slate-800/80 flex items-center justify-between">
                  <div>
                    <span className="text-3xs text-slate-400 block font-medium">سعر التجهيز:</span>
                    <span className="text-sm font-black text-amber-600 dark:text-amber-400">
                      {formatNumber(item.defaultPrice)} ج.م
                    </span>
                  </div>

                  <div className="flex items-center gap-1.5">
                    {/* Dimension Calculator Trigger for per-meter materials */}
                    {isPerMeter && (
                      <button
                        type="button"
                        onClick={() => {
                          setCalcItem(item);
                          setIsCalcOpen(true);
                        }}
                        title="حاسبة الأمتار الفورية (طول × ارتفاع)"
                        className="p-1.5 rounded-xl bg-blue-50 hover:bg-blue-100 text-blue-700 dark:bg-blue-950/60 dark:hover:bg-blue-900/60 dark:text-blue-300 border border-blue-200/70 dark:border-blue-800/60 transition-colors cursor-pointer"
                      >
                        <Calculator className="w-4 h-4" />
                      </button>
                    )}

                    {/* Standard Add button */}
                    <button
                      type="button"
                      onClick={() => handleAddTemplateItem(item)}
                      className="px-3 py-1.5 rounded-xl bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs flex items-center gap-1 transition-all shadow-2xs hover:shadow-xs cursor-pointer active:scale-95"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>إدراج</span>
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Dimension Calculator Drawer / Modal */}
        {isCalcOpen && calcItem && (
          <div className="p-4 bg-blue-50/95 dark:bg-slate-900/95 border-t border-blue-200 dark:border-blue-900 backdrop-blur-md flex flex-col md:flex-row items-center justify-between gap-4 animate-in slide-in-from-bottom-2">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-blue-600 text-white flex items-center justify-center font-bold text-lg shrink-0 shadow-xs">
                📐
              </div>
              <div>
                <h4 className="font-black text-xs text-blue-950 dark:text-blue-100">
                  حاسبة أمتار المقايسة: {calcItem.title}
                </h4>
                <p className="text-3xs text-blue-800/80 dark:text-blue-300 font-medium">
                  احسب إجمالي الأمتار المربعة مع نسبة الهالك وأضفها مباشرة للمقايسة
                </p>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              {/* Length */}
              <div className="flex flex-col gap-0.5">
                <span className="text-3xs text-slate-500 font-bold">الطول (متر):</span>
                <input
                  type="number"
                  step="0.1"
                  value={calcLength}
                  onChange={(e) => setCalcLength(Number(e.target.value) || 0)}
                  className="w-16 h-8 text-center bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg text-xs font-bold"
                />
              </div>

              <span className="text-slate-400 font-black mt-3">×</span>

              {/* Height / Width */}
              <div className="flex flex-col gap-0.5">
                <span className="text-3xs text-slate-500 font-bold">الارتفاع / العرض (متر):</span>
                <input
                  type="number"
                  step="0.1"
                  value={calcHeight}
                  onChange={(e) => setCalcHeight(Number(e.target.value) || 0)}
                  className="w-16 h-8 text-center bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg text-xs font-bold"
                />
              </div>

              <span className="text-slate-400 font-black mt-3">×</span>

              {/* Multiplier / Count */}
              <div className="flex flex-col gap-0.5">
                <span className="text-3xs text-slate-500 font-bold">عدد الحوائط/المقاطع:</span>
                <input
                  type="number"
                  min="1"
                  value={calcMultiplier}
                  onChange={(e) => setCalcMultiplier(Number(e.target.value) || 1)}
                  className="w-14 h-8 text-center bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg text-xs font-bold"
                />
              </div>

              {/* Wastage % */}
              <div className="flex flex-col gap-0.5">
                <span className="text-3xs text-slate-500 font-bold">نسبة هالك %:</span>
                <input
                  type="number"
                  min="0"
                  max="20"
                  value={calcWastagePercent}
                  onChange={(e) => setCalcWastagePercent(Number(e.target.value) || 0)}
                  className="w-14 h-8 text-center bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg text-xs font-bold"
                />
              </div>

              {/* Result Summary */}
              <div className="p-2 rounded-xl bg-blue-100/70 dark:bg-blue-950/70 border border-blue-300/80 dark:border-blue-800 text-center px-3">
                <span className="text-3xs text-blue-800 dark:text-blue-300 font-bold block">الإجمالي الصافي + الهالك:</span>
                <span className="text-sm font-black text-blue-900 dark:text-blue-200">
                  {calcFinalArea} {calcItem.unitLabel}
                </span>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center gap-1.5 mt-2 md:mt-0">
                <button
                  type="button"
                  onClick={handleApplyCalculatedArea}
                  className="px-3.5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-black text-xs transition-all shadow-xs cursor-pointer"
                >
                  إدراج الكمية ({calcFinalArea} {calcItem.unitLabel})
                </button>
                <button
                  type="button"
                  onClick={() => setIsCalcOpen(false)}
                  className="px-3 py-2 bg-slate-200 hover:bg-slate-300 dark:bg-slate-800 text-slate-700 dark:text-slate-300 rounded-xl font-bold text-xs transition-colors cursor-pointer"
                >
                  إلغاء
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* ========================================================================= */}
      {/* 2. Right: Cart / BOQ Quotation Breakdown & Milestones Checkout          */}
      {/* ========================================================================= */}
      <div className="w-full lg:w-[410px] xl:w-[450px] flex flex-col bg-surface rounded-2xl border border-slate-200 dark:border-slate-800/80 overflow-hidden shrink-0 shadow-xs">
        {/* Cart Header */}
        <div className="p-3.5 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between bg-slate-50/60 dark:bg-slate-900/60">
          <div className="flex items-center gap-2">
            <Receipt className="w-4 h-4 text-amber-600 dark:text-amber-400" />
            <h3 className="font-black text-sm text-slate-900 dark:text-white">
              مقايسة بنود المشروع ({cart.length})
            </h3>
          </div>

          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={handlePrintQuotation}
              title="طباعة عرض سعر المقايسة"
              className="p-1.5 rounded-xl hover:bg-slate-200 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 transition-colors cursor-pointer"
            >
              <Printer className="w-4 h-4" />
            </button>
            {cart.length > 0 && (
              <button
                type="button"
                onClick={onClearCart}
                className="text-3xs font-bold text-rose-600 hover:text-rose-700 bg-rose-50 dark:bg-rose-950/40 px-2 py-1 rounded-lg border border-rose-200/60 dark:border-rose-900/50 cursor-pointer"
              >
                تفريغ المقايسة
              </button>
            )}
          </div>
        </div>

        {/* Customer Select Bar */}
        <div className="p-2.5 border-b border-slate-200 dark:border-slate-800 bg-amber-500/5 flex items-center justify-between">
          <button
            type="button"
            onClick={onOpenCustomerModal}
            className="flex items-center gap-2 text-xs font-bold text-amber-800 dark:text-amber-300 hover:underline cursor-pointer"
          >
            <Building className="w-3.5 h-3.5 text-amber-600" />
            <span>{selectedCustomerId ? 'العميل: محدد للمشروع' : '+ تعيين عميل / صاحب المحل'}</span>
          </button>
          <span className="text-3xs font-bold text-slate-500 dark:text-slate-400">
            المشروع: {projectName}
          </span>
        </div>

        {/* Cart Line Items */}
        <div className="flex-1 overflow-y-auto p-3 space-y-2">
          {cart.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-center p-6 text-slate-400">
              <Hammer className="w-10 h-10 text-slate-300 dark:text-slate-700 mb-2 stroke-[1.5]" />
              <p className="font-bold text-xs text-slate-600 dark:text-slate-400">
                المقايسة فارغة حتى الآن
              </p>
              <p className="text-3xs text-slate-400 mt-1 max-w-[240px]">
                اختر الباقات الجاهزة أو أضف بنود الخامات والواجهات بالمتر لحساب تكلفة التجهيز
              </p>
            </div>
          ) : (
            cart.map((line) => {
              const prod = products.find((p) => p.id === line.productId) || customProductsMap[line.productId];
              const lineTotal = (line.price || 0) * (line.qty || 0);
              return (
                <div
                  key={line.key}
                  className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200/80 dark:border-slate-800/80 flex flex-col gap-2"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <h4 className="font-bold text-xs text-slate-900 dark:text-white leading-tight">
                        {prod?.name || 'بند مقايسة وتجهيز'}
                      </h4>
                      <span className="text-3xs text-slate-400 block mt-0.5">
                        كود: {prod?.sku || line.productId.slice(0, 8)}
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={() => onRemoveLine(line.key)}
                      className="text-slate-400 hover:text-rose-600 p-1 rounded-md transition-colors cursor-pointer"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  {/* Quantity & Price Controls */}
                  <div className="flex items-center justify-between pt-1 border-t border-slate-100 dark:border-slate-800/60">
                    <div className="flex items-center gap-1.5 bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700 px-1 py-0.5">
                      <button
                        type="button"
                        onClick={() => onUpdateQty(line.key, -1)}
                        className="w-5 h-5 rounded flex items-center justify-center text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-700 font-bold cursor-pointer"
                      >
                        <Minus className="w-3 h-3" />
                      </button>
                      <input
                        type="number"
                        step="0.1"
                        min="0.1"
                        value={line.qty}
                        onChange={(e) => onSetQty(line.key, Number(e.target.value) || 1)}
                        className="w-12 text-center text-xs font-black bg-transparent focus:outline-hidden"
                      />
                      <button
                        type="button"
                        onClick={() => onUpdateQty(line.key, 1)}
                        className="w-5 h-5 rounded flex items-center justify-center text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-700 font-bold cursor-pointer"
                      >
                        <Plus className="w-3 h-3" />
                      </button>
                    </div>

                    <div className="text-left">
                      <span className="text-3xs text-slate-400 block font-medium">
                        {formatNumber(line.price)} ج.م / وحدة
                      </span>
                      <span className="text-xs font-black text-amber-600 dark:text-amber-400">
                        {formatNumber(lineTotal)} ج.م
                      </span>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Milestone / Down Payment Section */}
        {cart.length > 0 && (
          <div className="p-3 bg-amber-500/10 border-t border-amber-500/20 shrink-0 space-y-2">
            <div className="flex items-center justify-between text-xs font-bold text-amber-900 dark:text-amber-200">
              <span className="flex items-center gap-1.5">
                <BadgeDollarSign className="w-4 h-4 text-amber-600" />
                <span>عربون ومقدم التعاقد ({downPaymentPercent}%):</span>
              </span>
              <span className="font-black text-sm text-amber-700 dark:text-amber-300">
                {formatNumber(downPaymentAmount)} ج.م
              </span>
            </div>

            {/* Down Payment Percent Selector */}
            <div className="flex items-center gap-1.5">
              {[25, 40, 50, 70, 100].map((pct) => (
                <button
                  key={pct}
                  type="button"
                  onClick={() => setDownPaymentPercent(pct)}
                  className={`flex-1 py-1 rounded-lg text-3xs font-black transition-all cursor-pointer ${
                    downPaymentPercent === pct
                      ? 'bg-amber-600 text-white shadow-2xs'
                      : 'bg-white/80 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-amber-100'
                  }`}
                >
                  {pct}%
                </button>
              ))}
            </div>

            <div className="flex items-center justify-between text-3xs text-slate-500 dark:text-slate-400 font-medium pt-1">
              <span>المتبقي على مستخلصات التركيب والتسليم:</span>
              <span className="font-bold text-slate-700 dark:text-slate-300">
                {formatNumber(remainingAmount)} ج.م
              </span>
            </div>
          </div>
        )}

        {/* Totals & Final Checkout Bar */}
        <div className="p-3.5 bg-slate-50 dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800 shrink-0 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-600 dark:text-slate-400">
              إجمالي قيمة مقايسة التجهيز:
            </span>
            <span className="text-lg font-black text-slate-900 dark:text-white">
              {formatNumber(total)} ج.م
            </span>
          </div>

          {/* Quick Action Checkout Buttons */}
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              disabled={cart.length === 0 || isSaving}
              onClick={() => onCheckout('cash')}
              className="py-2.5 px-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs flex items-center justify-center gap-1.5 transition-all shadow-xs disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
            >
              <Banknote className="w-4 h-4" />
              <span>تحصيل كاش فوري</span>
            </button>

            <button
              type="button"
              disabled={cart.length === 0 || isSaving}
              onClick={() => onCheckout('card')}
              className="py-2.5 px-3 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs flex items-center justify-center gap-1.5 transition-all shadow-xs disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
            >
              <CreditCard className="w-4 h-4" />
              <span>دفع بنكي / شبكة</span>
            </button>
          </div>

          <button
            type="button"
            disabled={cart.length === 0 || isSaving}
            onClick={() => onCheckout('credit')}
            className="w-full py-2 px-3 rounded-xl bg-amber-600 hover:bg-amber-700 text-white font-black text-xs flex items-center justify-center gap-1.5 transition-all shadow-xs disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
          >
            <FileText className="w-4 h-4" />
            <span>اعتماد عقد التجهيز على دفعات (آجل / مستخلصات)</span>
          </button>
        </div>
      </div>
    </div>
  );
}
