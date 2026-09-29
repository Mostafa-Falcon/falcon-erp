import React, { useState, useMemo, useEffect } from'react';
import {
 LayoutGrid,
 X,
 Search,
 Star,
 Sparkles,
 Calendar,
 Layers,
 Package,
} from'lucide-react';
import { formatNumber } from'@/lib/format';
import type { Product, Unit } from'@/types';

interface PosQuickItemsSidebarProps {
 products: Product[];
 unitsById: Record<string, Unit>;
 availableFor: (pId: string) => number;
 onAddToCart: (product: Product) => void;
 onClose: () => void;
 orgId: string;
}

export function PosQuickItemsSidebar({
 products,
 unitsById,
 availableFor,
 onAddToCart,
 onClose,
 orgId,
}: PosQuickItemsSidebarProps) {
 // Default is strictly'quick'(الأصناف السريعة)
 const [activeTab, setActiveTab] = useState<'quick'|'all'>('quick');
 const [searchQuery, setSearchQuery] = useState('');
 const [starredIds, setStarredIds] = useState<string[]>([]);

 // Load Starred / Quick items from localStorage
 useEffect(() => {
 if (!orgId) return;
 try {
 const saved = localStorage.getItem(`falcon_pos_starred_items_${orgId}`);
 if (saved) {
 setStarredIds(JSON.parse(saved));
 } else {
 // Initial starred items: strictly products with is_quick_pos
 const defaultStarred = products
 .filter((p) => p.is_quick_pos)
 .map((p) => p.id);
 setStarredIds(defaultStarred);
 }
 } catch (e) {
 console.error('Failed to load starred items:', e);
 }
 }, [orgId, products]);

 // Toggle star
 const toggleStar = (e: React.MouseEvent, productId: string) => {
 e.stopPropagation();
 const updated = starredIds.includes(productId)
 ? starredIds.filter((id) => id !== productId)
 : [...starredIds, productId];

 setStarredIds(updated);
 if (orgId) {
 localStorage.setItem(`falcon_pos_starred_items_${orgId}`, JSON.stringify(updated));
 }
 };

 // Quick items list (strictly quick/starred)
 const quickItems = useMemo(() => {
 return products.filter(
 (p) => starredIds.includes(p.id) || p.is_quick_pos === true
 );
 }, [products, starredIds]);

 // Filtered Products based on active tab and search query
 const displayedProducts = useMemo(() => {
 const pool = activeTab ==='quick'? quickItems : products;
 const q = searchQuery.trim().toLowerCase();
 if (!q) return pool;

 return pool.filter(
 (p) =>
 p.name.toLowerCase().includes(q) ||
 p.sku.toLowerCase().includes(q) ||
 (p.scientific_name && p.scientific_name.toLowerCase().includes(q))
 );
 }, [activeTab, quickItems, products, searchQuery]);

 return (
 <div className="h-full flex flex-col bg-surface text-slate-900 dark:text-slate-100 select-none overflow-hidden font-sans">
 {/* 1. Sidebar Header */}
 <div className="p-3.5 border-b border-slate-200/80 dark:border-slate-800 flex items-center justify-between bg-slate-50/70 dark:bg-slate-900/50 shrink-0">
 <div className="flex items-center gap-2">
 <div className="p-1.5 rounded-lg bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400">
 <LayoutGrid className="w-4 h-4"/>
 </div>
 <h2 className="font-black text-sm text-slate-900 dark:text-white tracking-tight">
 كتالوج الأصناف
 </h2>
 <span className="text-3xs font-mono font-bold text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-950/60 border border-blue-200/60 dark:border-blue-900/60 px-1.5 py-0.2 rounded-md">
 {displayedProducts.length}
 </span>
 </div>

 <button
 onClick={onClose}
 title="إغلاق كتالوج الأصناف"
 className="p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
 >
 <X className="w-4 h-4"/>
 </button>
 </div>

 {/* 2. Tabs & Mini Search Filter */}
 <div className="p-3 border-b border-slate-200/80 dark:border-slate-800 space-y-2.5 bg-surface shrink-0">
 {/* Tab Buttons: السريعة (Default) & الكل */}
 <div className="flex items-center gap-1.5 bg-slate-100 dark:bg-slate-800/80 p-1 rounded-xl border border-slate-200/70 dark:border-slate-700/60">
 {/* Tab 1: السريعة (Default) */}
 <button
 type="button"
 onClick={() => setActiveTab('quick')}
 className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
 activeTab ==='quick'
 ?'bg-blue-600 text-white shadow-xs'
 :'text-slate-600 dark:text-slate-300 hover:text-slate-900'
 }`}
 >
 <Star className={`w-3.5 h-3.5 ${activeTab ==='quick'?'fill-amber-300 text-amber-300':'text-amber-500'}`} />
 <span>السريعة ({quickItems.length})</span>
 </button>

 {/* Tab 2: الكل */}
 <button
 type="button"
 onClick={() => setActiveTab('all')}
 className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
 activeTab ==='all'
 ?'bg-blue-600 text-white shadow-xs'
 :'text-slate-600 dark:text-slate-300 hover:text-slate-900'
 }`}
 >
 <Layers className="w-3.5 h-3.5"/>
 <span>الكل ({products.length})</span>
 </button>
 </div>

 {/* Search input inside sidebar */}
 <div className="relative flex items-center">
 <Search className="w-3.5 h-3.5 text-slate-400 absolute right-3 pointer-events-none"/>
 <input
 type="text"
 value={searchQuery}
 onChange={(e) => setSearchQuery(e.target.value)}
 placeholder={
 activeTab ==='quick'
 ?'بحث في الأصناف السريعة...'
 :'بحث في كل الأصناف...'
 }
 className="w-full h-8 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl pr-8 pl-7 text-xs font-bold text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-1 focus:ring-blue-500"
 />
 {searchQuery && (
 <button
 onClick={() => setSearchQuery('')}
 className="absolute left-2.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
 >
 <X className="w-3.5 h-3.5"/>
 </button>
 )}
 </div>
 </div>

 {/* 3. Products List / Cards */}
 <div className="flex-1 overflow-y-auto p-3 space-y-2.5">
 {displayedProducts.length === 0 ? (
 <div className="py-16 text-center text-slate-400 space-y-2">
 <Sparkles className="w-8 h-8 mx-auto text-slate-300 dark:text-slate-600 stroke-[1.5]"/>
 <p className="font-bold text-xs">
 {activeTab ==='quick'
 ?'لا توجد أصناف في قائمة الأصناف السريعة حالياً'
 :'لا توجد أصناف مطابقة لكلمة البحث'}
 </p>
 <p className="text-2xs text-slate-400 max-w-[240px] mx-auto">
 {activeTab ==='quick'
 ?'انتقل لتبويب «الكل» وانقر على ⭐ بجوار أي صنف لإضافته للأصناف السريعة'
 :'جرب البحث باسم أو باركود آخر'}
 </p>
 </div>
 ) : (
 displayedProducts.map((product) => {
 const avail = availableFor(product.id);
 const isStarred = starredIds.includes(product.id);
 const unitName = unitsById[product.base_unit_id]?.name ||'علبة';

 return (
 <div
 key={product.id}
 onClick={() => onAddToCart(product)}
 className="bg-slate-50 hover:bg-blue-50/70 dark:bg-slate-800/40 dark:hover:bg-blue-950/40 border border-slate-200/80 hover:border-blue-400/80 dark:border-slate-700/80 rounded-2xl p-3 flex items-center justify-between gap-2.5 cursor-pointer transition-all shadow-2xs group relative"
 >
 {/* Right side in RTL: Avatar + Product Info */}
 <div className="flex items-center gap-3 min-w-0">
 {/* Medical / Product Emblem Avatar */}
 <div className="w-10 h-10 rounded-full bg-blue-100 dark:bg-blue-950/80 text-blue-600 dark:text-blue-400 flex items-center justify-center shrink-0 border border-blue-200/60 dark:border-blue-800/60 shadow-inner group-hover:scale-105 transition-transform">
 <Package className="w-5 h-5"/>
 </div>

 {/* Name, Price & Stock Info */}
 <div className="flex flex-col text-right min-w-0">
 <span className="font-bold text-xs sm:text-sm text-slate-900 dark:text-white group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors truncate">
 {product.name}
 </span>

 <span className="text-xs font-black font-mono text-blue-600 dark:text-blue-400 mt-0.5">
 {formatNumber(product.sale_price)} ج.م
 </span>

 <span className="text-3xs font-semibold text-slate-500 dark:text-slate-400">
 المتاح: {avail} {unitName}
 </span>
 </div>
 </div>

 {/* Left side in RTL: Star Quick Toggle */}
 <div className="flex flex-col items-end gap-2 shrink-0">
 <button
 type="button"
 onClick={(e) => toggleStar(e, product.id)}
 title={isStarred ?'إزالة من الأصناف السريعة':'إضافة للأصناف السريعة'}
 className="p-1 rounded-lg hover:bg-slate-200/60 dark:hover:bg-slate-700/60 text-slate-400 hover:text-amber-500 transition-colors cursor-pointer"
 >
 <Star
 className={`w-4 h-4 ${
 isStarred
 ?'fill-amber-400 text-amber-500'
 :'text-slate-300 dark:text-slate-600'
 }`}
 />
 </button>

 {product.tracks_expiry && (
 <span className="text-4xs font-mono text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/40 px-1.5 py-0.2 rounded flex items-center gap-0.5">
 <Calendar className="w-2.5 h-2.5"/>
 <span>صلاحية</span>
 </span>
 )}
 </div>
 </div>
 );
 })
 )}
 </div>
 </div>
 );
}