'use client';

import React, { useEffect, useRef } from'react';
import { Search, X, Loader2 } from'lucide-react';
import { Input } from'@/components/ui/input';
import { Badge } from'@/components/ui/badge';
import { Button } from'@/components/ui/button';
import { Card } from'@/components/ui/card';
import { formatNumber } from'@/lib/format';
import type { Product, Unit } from'@/types';

interface BarcodeSearchBarProps {
 searchInput: string;
 setSearchInput: (v: string) => void;
 searchResults: Product[];
 selectedIndex: number;
 setSelectedIndex: (v: number) => void;
 stockByProductId: Record<
 string,
 { totalStock: number; formattedStock: string; isZero: boolean }
 >;
 isSearching: boolean;
 showDropdown: boolean;
 setShowDropdown: (v: boolean) => void;
 searchContainerRef: React.RefObject<HTMLDivElement | null>;
 handleAddItem: (p: Product) => void;
 handleBarcodeKeyDown: (e: React.KeyboardEvent<HTMLInputElement>) => void;
 unitsById: Record<string, Unit>;
 currency?: string;
}

export function BarcodeSearchBar({
 searchInput,
 setSearchInput,
 searchResults,
 selectedIndex,
 setSelectedIndex,
 stockByProductId,
 isSearching,
 showDropdown,
 setShowDropdown,
 searchContainerRef,
 handleAddItem,
 handleBarcodeKeyDown,
 unitsById,
 currency ='ج.م',
}: BarcodeSearchBarProps) {
 const listRef = useRef<HTMLDivElement>(null);

 // Auto-scroll the selected item into view when navigating via keyboard
 useEffect(() => {
 if (!showDropdown || !listRef.current) return;
 const selectedElement = listRef.current.querySelector(
`[data-index="${selectedIndex}"]`
 ) as HTMLElement | null;
 if (selectedElement) {
 selectedElement.scrollIntoView({ block:'nearest'});
 }
 }, [selectedIndex, showDropdown]);

 return (
 <div className="relative"ref={searchContainerRef}>
 <div className="relative flex items-center">
 {/* Right side inside input: Count Badge matching screenshot */}
 <div className="absolute right-3 z-10 flex items-center gap-1.5 pointer-events-none">
 {isSearching ? (
 <Loader2 className="w-4 h-4 text-primary animate-spin"/>
 ) : (
 <div className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-blue-50 dark:bg-blue-950/60 border border-blue-200/60 dark:border-blue-800/60 text-blue-600 dark:text-blue-400 text-xs font-bold shadow-2xs">
 <Search className="w-3.5 h-3.5"/>
 <span>{searchResults.length > 0 ? searchResults.length : 0}</span>
 </div>
 )}
 </div>

 <Input
 type="text"
 value={searchInput}
 onChange={(e) => {
 setSearchInput(e.target.value);
 setShowDropdown(true);
 }}
 onKeyDown={handleBarcodeKeyDown}
 onFocus={() => {
 if (searchResults.length > 0) setShowDropdown(true);
 }}
 placeholder="ابحث بالاسم أو امسح الباركود بجهاز المسح الضوئي (Scanner) ثم اضغط Enter..."
 className="h-13 text-sm rounded-2xl pl-10 pr-20 bg-surface border-2 border-emerald-500/30 focus-visible:border-emerald-600 dark:border-slate-800 shadow-sm focus-visible:ring-2 focus-visible:ring-emerald-500/20 font-medium"
 />

 {/* Left side inside input: Clear button */}
 {searchInput && (
 <Button
 type="button"
 variant="ghost"
 size="icon"
 onClick={() => {
 setSearchInput('');
 setShowDropdown(false);
 setSelectedIndex(0);
 }}
 className="absolute left-2.5 h-8 w-8 rounded-full text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
 >
 <X className="w-4 h-4"/>
 </Button>
 )}
 </div>

 {/* Smart Search Dropdown matching screenshot */}
 {showDropdown && searchResults.length > 0 && (
 <Card
 ref={listRef}
 className="absolute top-full right-0 left-0 mt-1.5 z-50 p-1 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md rounded-2xl border border-slate-200/90 dark:border-slate-800 shadow-2xl max-h-84 overflow-y-auto divide-y divide-slate-100/70 dark:divide-slate-800/50"
 >
 {searchResults.map((product, idx) => {
 const isSelected = idx === selectedIndex;
 const stock = stockByProductId[product.id];
 const baseUnitName = unitsById[product.base_unit_id]?.name ||'وحدة';

 return (
 <div
 key={product.id}
 data-index={idx}
 onMouseEnter={() => setSelectedIndex(idx)}
 onClick={() => handleAddItem(product)}
 className={`w-full text-right px-4 py-3 rounded-xl transition-all flex items-center justify-between group cursor-pointer ${
 isSelected
 ?'bg-emerald-50/90 dark:bg-emerald-950/60 text-emerald-950 dark:text-emerald-100 border-r-4 border-emerald-600 shadow-2xs'
 :'hover:bg-slate-50 dark:hover:bg-slate-800/50 text-slate-800 dark:text-slate-200'
 }`}
 >
 {/* Right side: Product Name */}
 <div className="flex items-center gap-3 min-w-0 flex-1 pl-4">
 <div className="truncate">
 <div
 className={`text-sm font-black truncate transition-colors ${
 isSelected
 ?'text-emerald-700 dark:text-emerald-300'
 :'text-slate-900 dark:text-slate-100 group-hover:text-emerald-600'
 }`}
 >
 {product.name}
 </div>
 <div className="text-xs text-muted-foreground flex items-center gap-2 mt-0.5">
 <span className="font-mono text-2xs">
 {product.sku || (product as unknown as { barcode?: string }).barcode ||''}
 </span>
 </div>
 </div>
 </div>

 {/* Left side: Stock Badge + Price matching screenshot */}
 <div className="flex items-center gap-3 shrink-0">
 {/* Stock Quantity Badge */}
 {stock ? (
 <span
 className={`text-xs font-bold px-2.5 py-0.5 rounded-md border ${
 stock.isZero
 ?'text-rose-600 bg-rose-50 border-rose-200/80 dark:bg-rose-950/40 dark:text-rose-400 dark:border-rose-900'
 :'text-emerald-700 bg-emerald-50 border-emerald-200/80 dark:bg-emerald-950/40 dark:text-emerald-400 dark:border-emerald-900'
 }`}
 >
 {stock.formattedStock}
 </span>
 ) : (
 <span className="text-xs font-bold px-2 py-0.5 rounded-md border text-slate-500 bg-slate-50 border-slate-200/60 dark:bg-slate-800 dark:text-slate-400">
 0 {baseUnitName}
 </span>
 )}

 {/* Price in Bold Blue Font */}
 <div className="text-sm font-black text-blue-600 dark:text-blue-400 min-w-16 text-left">
 {formatNumber(product.sale_price)} {currency}
 </div>
 </div>
 </div>
 );
 })}
 </Card>
 )}

 {/* Empty Search Result State */}
 {showDropdown && searchResults.length === 0 && !isSearching && searchInput.trim() && (
 <Card className="absolute top-full right-0 left-0 mt-2 p-4 bg-surface rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xl z-50 text-center text-xs font-bold text-muted-foreground">
 لا توجد أصناف مطابقة لكلمة البحث
 </Card>
 )}
 </div>
 );
}