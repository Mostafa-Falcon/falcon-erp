import React from'react';
import { Layers, X, Plus } from'lucide-react';
import { formatNumber } from'@/lib/format';
import type { Product } from'@/types';

interface PosQuickItemsModalProps {
 isOpen: boolean;
 onClose: () => void;
 products: Product[];
 availableFor: (pId: string) => number;
 onSelectItem: (product: Product) => void;
}

export function PosQuickItemsModal({
 isOpen,
 onClose,
 products,
 availableFor,
 onSelectItem,
}: PosQuickItemsModalProps) {
 if (!isOpen) return null;

 const quickItems = products.slice(0, 24);

 return (
 <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-150">
 <div className="bg-surface border border-slate-200 dark:border-slate-800 w-full max-w-2xl rounded-2xl p-6 shadow-2xl space-y-4">
 <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
 <div className="flex items-center gap-2">
 <div className="p-2 rounded-xl bg-amber-50 dark:bg-amber-950/50 text-amber-600">
 <Layers className="w-5 h-5"/>
 </div>
 <div>
 <h3 className="font-bold text-base text-slate-900 dark:text-white">الأصناف السريعة والشائعة</h3>
 <p className="text-xs text-slate-400">إضافة فورية بضغطة واحدة للأصناف الأكثر تداولاً</p>
 </div>
 </div>
 <button
 onClick={onClose}
 className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer"
 >
 <X className="w-4 h-4"/>
 </button>
 </div>

 <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2.5 max-h-96 overflow-y-auto pr-1">
 {quickItems.map((p) => {
 const avail = availableFor(p.id);
 return (
 <button
 key={p.id}
 onClick={() => {
 onSelectItem(p);
 }}
 className="p-3 bg-slate-50 hover:bg-amber-50/60 dark:bg-slate-800/40 dark:hover:bg-amber-950/30 rounded-xl border border-slate-200/80 hover:border-amber-400 dark:border-slate-700/80 text-right flex flex-col justify-between transition-all cursor-pointer group shadow-2xs"
 >
 <div>
 <span className="font-bold text-xs text-slate-900 dark:text-white group-hover:text-amber-700 dark:group-hover:text-amber-300 line-clamp-2">
 {p.name}
 </span>
 <span className="text-3xs text-slate-400 font-mono block mt-1">
 {p.sku}
 </span>
 </div>
 <div className="flex items-center justify-between mt-3 pt-2 border-t border-slate-200/50 dark:border-slate-700/50">
 <span className="text-xs font-black font-mono text-emerald-600 dark:text-emerald-400">
 {formatNumber(p.sale_price)} ج.م
 </span>
 <span
 className={`text-4xs font-bold px-1.5 py-0.2 rounded ${
 avail > 0 ?'bg-emerald-50 text-emerald-700':'bg-red-50 text-red-600'
 }`}
 >
 {avail > 0 ?`${avail}`:'نفد'}
 </span>
 </div>
 </button>
 );
 })}
 </div>
 </div>
 </div>
 );
}