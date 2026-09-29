'use client';

import React, { useState, useEffect, useMemo } from'react';
import {
 Dialog,
 DialogContent,
 DialogHeader,
 DialogTitle,
 DialogFooter,
} from'@/components/ui/dialog';
import { Button } from'@/components/ui/button';
import { Input } from'@/components/ui/input';
import { Badge } from'@/components/ui/badge';
import { Search, Sparkles, Plus, Check } from'lucide-react';
import { formatNumber } from'@/lib/format';
import { cn } from'@/lib/utils';
import { ProductRepository } from'@/modules/inventory/product_repository';
import { toast } from'sonner';
import type { Product, ProductCategory } from'@/types';

interface AddSubstituteModalProps {
 currentProductId: string;
 orgId: string;
 existingSubstituteIds: string[];
 categories: ProductCategory[];
 onClose: () => void;
 onSuccess: () => void;
}

export function AddSubstituteModal({
 currentProductId,
 orgId,
 existingSubstituteIds,
 categories,
 onClose,
 onSuccess,
}: AddSubstituteModalProps) {
 const [allProducts, setAllProducts] = useState<Product[]>([]);
 const [searchQuery, setSearchQuery] = useState('');
 const [selectedProductId, setSelectedProductId] = useState<string | null>(null);
 const [isSubmitting, setIsSubmitting] = useState(false);
 const [isLoading, setIsLoading] = useState(true);

 const catMap = useMemo(() => {
 const map = new Map<string, string>();
 for (const c of categories) map.set(c.id, c.name);
 return map;
 }, [categories]);

 useEffect(() => {
 const loadCandidates = async () => {
 try {
 const prods = await ProductRepository.getAll(orgId);
 // Exclude current product and already added substitutes
 const excludeSet = new Set([currentProductId, ...existingSubstituteIds]);
 const candidates = prods.filter((p) => !excludeSet.has(p.id));
 setAllProducts(candidates);
 } catch (err) {
 console.error('Failed to load candidate substitutes:', err);
 } finally {
 setIsLoading(false);
 }
 };
 loadCandidates();
 }, [orgId, currentProductId, existingSubstituteIds]);

 const filteredProducts = useMemo(() => {
 const q = searchQuery.trim().toLowerCase();
 if (!q) return allProducts;
 return allProducts.filter(
 (p) =>
 p.name.toLowerCase().includes(q) ||
 p.sku.toLowerCase().includes(q) ||
 (p.name_en && p.name_en.toLowerCase().includes(q))
 );
 }, [allProducts, searchQuery]);

 const handleSave = async () => {
 if (!selectedProductId) {
 toast.error('يرجى اختيار صنف لربطه كبديل أولاً');
 return;
 }

 try {
 setIsSubmitting(true);
 await ProductRepository.addSubstitute(currentProductId, selectedProductId);
 toast.success('تم إضافة الصنف البديل بنجاح');
 onSuccess();
 } catch (err) {
 console.error('Failed to add substitute:', err);
 toast.error('فشل حفظ الصنف البديل');
 } finally {
 setIsSubmitting(false);
 }
 };

 return (
 <Dialog open onOpenChange={(open) => !open && onClose()}>
 <DialogContent
 className="max-w-xl p-6 rounded-3xl text-right bg-surface border border-slate-200 dark:border-slate-800 shadow-2xl space-y-4"
 dir="rtl"
 >
 <DialogHeader>
 <div className="flex items-center gap-2">
 <div className="w-10 h-10 rounded-2xl bg-blue-50 dark:bg-blue-950/60 text-blue-600 flex items-center justify-center">
 <Sparkles className="w-5 h-5 text-emerald-600"/>
 </div>
 <div>
 <DialogTitle className="text-base font-black text-slate-900 dark:text-white">
 إضافة صنف بديل
 </DialogTitle>
 <p className="text-xs text-slate-400 font-medium mt-0.5">
 اختر الصنف المتوافق من قائمة أصناف المنشأة لربطه كبديل مباشر لهذا الصنف
 </p>
 </div>
 </div>
 </DialogHeader>

 {/* Search */}
 <div className="relative">
 <div className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none">
 <Search className="w-4 h-4"/>
 </div>
 <Input
 type="text"
 placeholder="بحث بالاسم أو الباركود SKU..."
 value={searchQuery}
 onChange={(e) => setSearchQuery(e.target.value)}
 className="h-10 pr-9 pl-4 bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-xs font-bold rounded-xl"
 />
 </div>

 {/* Product List */}
 <div className="max-h-72 overflow-y-auto space-y-2 pr-1">
 {isLoading ? (
 <div className="py-12 text-center text-xs text-slate-400">جاري تحميل الأصناف...</div>
 ) : filteredProducts.length === 0 ? (
 <div className="py-12 text-center text-xs text-slate-400 font-bold">
 {searchQuery ?'لم يتم العثور على أي صنف مطابق للبحث.':'لا توجد أصناف أخرى متاحة للربط.'}
 </div>
 ) : (
 filteredProducts.map((p) => {
 const isSelected = selectedProductId === p.id;
 const catName = p.category_id ? catMap.get(p.category_id) ||'عام':'عام';
 return (
 <div
 key={p.id}
 onClick={() => setSelectedProductId(p.id)}
 className={cn(
'p-3 rounded-2xl border transition-all cursor-pointer flex items-center justify-between gap-3 select-none',
 isSelected
 ?'bg-blue-50/80 dark:bg-blue-950/50 border-blue-500 shadow-xs'
 :'bg-slate-50/60 dark:bg-slate-900/40 border-slate-200/80 dark:border-slate-800 hover:border-slate-300'
 )}
 >
 <div className="flex items-center gap-3">
 <div
 className={cn(
'w-7 h-7 rounded-xl flex items-center justify-center transition-all',
 isSelected
 ?'bg-blue-600 text-white shadow-xs'
 :'bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-transparent'
 )}
 >
 <Check className="w-4 h-4"/>
 </div>
 <div>
 <div className="flex items-center gap-2">
 <span className="font-black text-slate-900 dark:text-white text-xs">{p.name}</span>
 <Badge variant="outline"className="text-3xs font-mono px-1.5 py-0">
 {p.sku}
 </Badge>
 </div>
 <span className="text-2xs text-slate-400">{catName}</span>
 </div>
 </div>

 <div className="text-left font-mono font-black text-emerald-600 dark:text-emerald-400 text-xs">
 {formatNumber(p.sale_price)} ج.م
 </div>
 </div>
 );
 })
 )}
 </div>

 <DialogFooter className="gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
 <Button
 type="button"
 variant="outline"
 onClick={onClose}
 className="rounded-xl text-xs font-bold"
 >
 إلغاء
 </Button>
 <Button
 type="button"
 onClick={handleSave}
 disabled={!selectedProductId || isSubmitting}
 className="rounded-xl text-xs font-black bg-blue-600 hover:bg-blue-700 text-white gap-1.5 shadow-xs"
 >
 <Plus className="w-4 h-4"/>
 <span>{isSubmitting ?'جاري الحفظ...':'ربط الصنف كبديل'}</span>
 </Button>
 </DialogFooter>
 </DialogContent>
 </Dialog>
 );
}