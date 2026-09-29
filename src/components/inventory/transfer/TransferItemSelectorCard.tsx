import React from'react';
import { Product } from'@/types';
import { Icons } from'@/components/ui/Icons';
import { SelectableUnitOption } from'./types';
import {
 Select,
 SelectContent,
 SelectItem,
 SelectTrigger,
 SelectValue,
} from'@/components/ui/select';

interface TransferItemSelectorCardProps {
 searchQuery: string;
 onSearchChange: (val: string) => void;
 searchResults: Product[];
 isSearchOpen: boolean;
 onSearchOpenChange: (open: boolean) => void;
 selectedProduct: Product | null;
 onSelectProduct: (prod: Product) => void;
 onClearSelectedProduct: () => void;
 availableUnits: SelectableUnitOption[];
 selectedUnitOption: SelectableUnitOption | null;
 onUnitChange: (unitId: string) => void;
 quantity: number;
 onQuantityChange: (qty: number) => void;
 availableSenderStock: number;
 onAddItem: () => void;
}

export const TransferItemSelectorCard: React.FC<TransferItemSelectorCardProps> = ({
 searchQuery,
 onSearchChange,
 searchResults,
 isSearchOpen,
 onSearchOpenChange,
 selectedProduct,
 onSelectProduct,
 onClearSelectedProduct,
 availableUnits,
 selectedUnitOption,
 onUnitChange,
 quantity,
 onQuantityChange,
 availableSenderStock,
 onAddItem,
}) => {
 return (
 <div className="bg-surface rounded-2xl border border-slate-200/80 dark:border-slate-800 p-5 sm:p-6 shadow-xs">
 <div className="flex items-center gap-2 mb-4 pb-3 border-b border-slate-100 dark:border-slate-800">
 <div className="w-8 h-8 rounded-lg bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
 <Icons.ShoppingCart />
 </div>
 <h2 className="text-sm font-bold text-slate-800 dark:text-slate-100">
 إضافة أصناف للتحويل
 </h2>
 </div>

 <div className="grid grid-cols-1 lg:grid-cols-12 gap-3 items-end">
 {/* Product Autocomplete Search (6 cols) */}
 <div className="lg:col-span-6 relative">
 <label className="block text-xs font-bold text-slate-600 dark:text-slate-400 mb-1.5">
 اكتب اسم الصنف أو الباركود
 </label>
 <div className="relative">
 <input
 type="text"
 value={searchQuery}
 onChange={(e) => {
 onSearchChange(e.target.value);
 onSearchOpenChange(true);
 }}
 onFocus={() => onSearchOpenChange(true)}
 placeholder="اكتب اسم الصنف أو الباركود..."
 className="w-full h-10 pr-9 pl-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 text-xs font-bold text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-1 focus:ring-blue-500"
 />
 <div className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400">
 <Icons.Search />
 </div>
 {searchQuery && (
 <button
 type="button"
 onClick={onClearSelectedProduct}
 className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer"
 >
 <Icons.X />
 </button>
 )}
 </div>

 {/* Autocomplete Dropdown */}
 {isSearchOpen && searchResults.length > 0 && (
 <div className="absolute z-20 top-full mt-1.5 w-full bg-surface border border-slate-200 dark:border-slate-800 rounded-xl shadow-xl overflow-hidden max-h-60 overflow-y-auto">
 {searchResults.map((p) => (
 <button
 key={p.id}
 type="button"
 onClick={() => onSelectProduct(p)}
 className="w-full text-right px-4 py-2.5 hover:bg-blue-50 dark:hover:bg-slate-800/80 border-b border-slate-100 dark:border-slate-800/50 last:border-0 flex items-center justify-between transition-colors cursor-pointer"
 >
 <div>
 <span className="block text-xs font-bold text-slate-800 dark:text-slate-100">
 {p.name}
 </span>
 <span className="text-2xs text-slate-400">
 {p.sku ?`باركود: ${p.sku}`:''}
 </span>
 </div>
 <div className="text-left">
 <span className="text-2xs font-mono text-slate-500">
 {p.purchase_price ?`${p.purchase_price} ج.م`:''}
 </span>
 </div>
 </button>
 ))}
 </div>
 )}

 {/* Selected Product Pill & Stock Indicator */}
 {selectedProduct && (
 <div className="mt-2 flex items-center gap-2">
 <span className="text-2xs font-bold px-2.5 py-1 rounded-lg bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300 border border-blue-200/60 dark:border-blue-800/40">
 الصنف: {selectedProduct.name}
 </span>
 <span className="text-2xs font-bold px-2.5 py-1 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
 الرصيد المتاح: {availableSenderStock} قطعة
 </span>
 </div>
 )}
 </div>

 {/* Unit Selector (2 cols) - Using Shadcn Select */}
 <div className="lg:col-span-2">
 <label className="block text-xs font-bold text-slate-600 dark:text-slate-400 mb-1.5">
 الوحدة
 </label>
 <Select
 value={selectedUnitOption?.unitId ??''}
 onValueChange={onUnitChange}
 disabled={!selectedProduct || availableUnits.length === 0}
 >
 <SelectTrigger className="w-full h-10 rounded-xl bg-surface border-slate-200 dark:border-slate-800 text-xs font-bold">
 <SelectValue placeholder="الوحدة"/>
 </SelectTrigger>
 {availableUnits.length > 0 && (
 <SelectContent className="z-50 bg-surface border border-slate-200 dark:border-slate-800 rounded-xl shadow-xl">
 {availableUnits.map((u) => (
 <SelectItem
 key={u.id}
 value={u.unitId}
 className=""
 >
 {u.unitName} {u.conversionFactor > 1 ?`(${u.conversionFactor} ق)`:''}
 </SelectItem>
 ))}
 </SelectContent>
 )}
 </Select>
 </div>

 {/* Quantity (2 cols) */}
 <div className="lg:col-span-2">
 <label className="block text-xs font-bold text-slate-600 dark:text-slate-400 mb-1.5">
 الكمية المحولة
 </label>
 <input
 type="number"
 min="1"
 value={quantity}
 onChange={(e) => onQuantityChange(Math.max(1, parseInt(e.target.value) || 1))}
 className="w-full h-10 px-3 text-center rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 text-xs font-black text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-1 focus:ring-blue-500"
 />
 </div>

 {/* Add Button (2 cols) */}
 <div className="lg:col-span-2">
 <button
 type="button"
 onClick={onAddItem}
 disabled={!selectedProduct || !selectedUnitOption}
 className="w-full h-10 bg-blue-600 hover:bg-blue-700 disabled:opacity-40 text-white text-xs font-bold rounded-xl shadow-xs flex items-center justify-center gap-1 cursor-pointer transition-all active:scale-95"
 >
 <Icons.Plus /> إضافة
 </button>
 </div>
 </div>
 </div>
 );
};