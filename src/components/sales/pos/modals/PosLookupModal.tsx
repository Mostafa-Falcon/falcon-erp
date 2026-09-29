import React, { useState, useMemo } from'react';
import { Search, X } from'lucide-react';
import { formatNumber } from'@/lib/format';
import type { Product } from'@/types';

interface PosLookupModalProps {
 isOpen: boolean;
 onClose: () => void;
 products: Product[];
 availableFor: (pId: string) => number;
 onSelectProduct: (product: Product) => void;
}

export function PosLookupModal({
 isOpen,
 onClose,
 products,
 availableFor,
 onSelectProduct,
}: PosLookupModalProps) {
 const [filterQuery, setFilterQuery] = useState('');

 const filtered = useMemo(() => {
 const q = filterQuery.trim().toLowerCase();
 if (!q) return products.slice(0, 50);
 return products
 .filter(
 (p) =>
 p.name.toLowerCase().includes(q) ||
 p.sku.toLowerCase().includes(q)
 )
 .slice(0, 50);
 }, [products, filterQuery]);

 if (!isOpen) return null;

 return (
 <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-150">
 <div className="bg-surface border border-slate-200 dark:border-slate-800 w-full max-w-2xl rounded-2xl p-5 shadow-2xl space-y-4">
 <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
 <h3 className="font-bold text-base text-slate-900 dark:text-white flex items-center gap-2">
 <Search className="w-4 h-4 text-purple-600"/>
 <span>دليل واستعلام الأصناف (F3)</span>
 </h3>
 <button
 onClick={onClose}
 className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer"
 >
 <X className="w-4 h-4"/>
 </button>
 </div>

 {/* Filter input */}
 <div className="relative">
 <Search className="w-4 h-4 absolute right-3 top-1/2 -translate-y-1/2 text-slate-400"/>
 <input
 type="text"
 value={filterQuery}
 onChange={(e) => setFilterQuery(e.target.value)}
 placeholder="ابحث بالاسم أو الباركود أو الكود الدولي..."
 className="w-full h-10 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl pr-10 pl-3 text-xs font-bold text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-purple-500"
 autoFocus
 />
 </div>

 <div className="max-h-96 overflow-y-auto divide-y divide-slate-100 dark:divide-slate-800">
 {filtered.length === 0 ? (
 <div className="py-8 text-center text-slate-400 text-xs font-bold">
 لا توجد أصناف مطابقة لكلمة البحث
 </div>
 ) : (
 filtered.map((p) => {
 const avail = availableFor(p.id);
 return (
 <div
 key={p.id}
 onClick={() => {
 onSelectProduct(p);
 onClose();
 }}
 className="py-2.5 px-3 hover:bg-purple-50 dark:hover:bg-purple-950/40 flex items-center justify-between cursor-pointer rounded-xl transition-colors"
 >
 <div>
 <span className="font-bold text-xs text-slate-900 dark:text-white">{p.name}</span>
 <span className="text-3xs text-slate-400 block font-mono">باركود / SKU: {p.sku}</span>
 </div>
 <div className="flex items-center gap-3">
 <span className="font-mono font-bold text-xs text-purple-600 dark:text-purple-400">
 {formatNumber(p.sale_price)} ج.م
 </span>
 <span
 className={`text-3xs font-bold px-2 py-0.5 rounded ${
 avail > 0 ?'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400':'bg-red-50 text-red-600 dark:bg-red-950/40 dark:text-red-400'
 }`}
 >
 {avail > 0 ?`متاح: ${avail}`:'نفد'}
 </span>
 </div>
 </div>
 );
 })
 )}
 </div>
 </div>
 </div>
 );
}