'use client';

import React, { useEffect, useMemo, useState, useRef } from'react';
import { useRouter } from'next/navigation';
import { AppShell } from'@/components/layout/AppShell';
import { Button } from'@/components/ui/button';
import { Input } from'@/components/ui/input';
import { Badge } from'@/components/ui/badge';
import { ScrollArea } from'@/components/ui/scroll-area';
import { Separator } from'@/components/ui/separator';
import {
 Table,
 TableBody,
 TableCell,
 TableHead,
 TableHeader,
 TableRow,
} from'@/components/ui/table';
import { Textarea } from'@/components/ui/textarea';
import { useSessionStore } from'@/core/state/useSessionStore';
import { InventoryRepository } from'@/modules/inventory/inventory_repository';
import { ProductRepository } from'@/modules/inventory/product_repository';
import { formatNumber } from'@/lib/format';
import { cn } from'@/lib/utils';
import {
 Save,
 Check,
 Warehouse as WarehouseIcon,
 Search,
 Plus,
 Inbox,
 Trash2,
 Barcode,
 ArrowUpDown,
 Filter,
 AlertTriangle,
 CheckCircle2,
 XCircle,
 Package,
 Layers,
 Calendar,
 RefreshCw,
 Sparkles,
 MapPin,
 ChevronDown,
 ChevronUp,
 Layers3,
 HelpCircle,
} from'lucide-react';
import type {
 Product,
 Warehouse,
 StocktakeItem,
 ProductUnit,
 ProductBatch,
 Unit,
 ProductCategory,
} from'@/types';
import { toast } from'sonner';

type CountItem = {
 product: Product;
 baseUnit?: Unit;
 secondaryUnits: (ProductUnit & { unit_name?: string })[];
 batches: ProductBatch[];
 selectedBatchId?: string | null;
 expected_quantity: number;
 actual_quantity: number;
 difference: number;
 unit_cost: number;
 diff_value: number;
 // تفصيل العد بالوحدات
 unitBreakdown?: {
 baseQty: number;
 secQty: number; // للوحدة الفرعية الأولى
 };
 isExpanded?: boolean;
};

export default function NewStocktakePage() {
 const router = useRouter();
 const { currentUser, activeBranchId } = useSessionStore();
 const orgId = currentUser?.org_id ||'';

 const [warehouses, setWarehouses] = useState<Warehouse[]>([]);
 const [selectedWarehouse, setSelectedWarehouse] = useState('');
 const [searchQuery, setSearchQuery] = useState('');
 const [allProducts, setAllProducts] = useState<Product[]>([]);
 const [allUnits, setAllUnits] = useState<Unit[]>([]);
 const [allCategories, setAllCategories] = useState<ProductCategory[]>([]);
 const [items, setItems] = useState<CountItem[]>([]);
 const [notes, setNotes] = useState('');
 const [isSaving, setIsSaving] = useState(false);
 const [isLoading, setIsLoading] = useState(true);
 const [activeFilter, setActiveFilter] = useState<'all'|'diff'|'shortage'|'surplus'|'match'>('all');
 const [selectedCategoryFilter, setSelectedCategoryFilter] = useState<string>('all');
 const [isBulkLoading, setIsBulkLoading] = useState(false);

 const searchInputRef = useRef<HTMLInputElement>(null);

 // تحميل البيانات الأساسية
 useEffect(() => {
 if (!orgId) return;
 const load = async () => {
 try {
 const { db } = await import('@/core/db/app_database');
 const [whs, prods, unts, cats] = await Promise.all([
 InventoryRepository.getWarehouses(orgId),
 ProductRepository.getAll(orgId),
 db.units.where('org_id').equals(orgId).toArray(),
 db.product_categories.where('org_id').equals(orgId).toArray(),
 ]);

 setWarehouses(whs);
 setAllProducts(prods.filter((p) => p.item_type ==='storable'));
 setAllUnits(unts);
 setAllCategories(cats);

 if (whs.length > 0) {
 setSelectedWarehouse(whs[0].id);
 }
 } catch (err) {
 console.error('Error loading initial data:', err);
 toast.error('حدث خطأ أثناء تحميل بيانات المخازن والأصناف.');
 } finally {
 setIsLoading(false);
 }
 };
 load();
 }, [orgId]);

 // نتائج البحث التلقائي
 const searchResults = useMemo(() => {
 if (!searchQuery.trim()) return [];
 const q = searchQuery.toLowerCase().trim();
 return allProducts
 .filter((p) => {
 const matchName = p.name.toLowerCase().includes(q);
 const matchSku = p.sku.toLowerCase().includes(q);
 const matchAlt = p.alternate_barcodes?.some((b) => b.toLowerCase().includes(q));
 const matchShelf = p.shelf_location?.toLowerCase().includes(q);
 return matchName || matchSku || matchAlt || matchShelf;
 })
 .slice(0, 7);
 }, [searchQuery, allProducts]);

 // دالة مساعدة لإنشاء عنصر الجرد مع كامل بيانات وحداته وتشغيلاته
 const buildCountItem = async (p: Product, warehouseId: string): Promise<CountItem> => {
 const { db } = await import('@/core/db/app_database');

 const [stockLevel, secUnits, batches] = await Promise.all([
 db.stock_levels.get(`${warehouseId}_${p.id}`),
 db.product_units.where('product_id').equals(p.id).toArray(),
 db.product_batches
 .where('product_id')
 .equals(p.id)
 .and((b) => b.warehouse_id === warehouseId)
 .toArray(),
 ]);

 const baseUnit = allUnits.find((u) => u.id === p.base_unit_id);
 const enrichedSecUnits = secUnits.map((su) => ({
 ...su,
 unit_name: allUnits.find((u) => u.id === su.unit_id)?.name ||'وحدة فرعية',
 }));

 const expected = stockLevel?.quantity || 0;

 return {
 product: p,
 baseUnit,
 secondaryUnits: enrichedSecUnits,
 batches,
 selectedBatchId: batches.length === 1 ? batches[0].id : null,
 expected_quantity: expected,
 actual_quantity: expected, // يبدأ بالرصيد الدفتري لسهولة المطابقة والتعديل
 difference: 0,
 unit_cost: p.purchase_price || 0,
 diff_value: 0,
 unitBreakdown: {
 baseQty: Math.floor(expected),
 secQty: 0,
 },
 isExpanded: false,
 };
 };

 // إضافة صنف إلى ورقة الجرد
 const addItem = async (p: Product, incrementExisting = false) => {
 const existingIndex = items.findIndex((it) => it.product.id === p.id);
 if (existingIndex !== -1) {
 if (incrementExisting) {
 // زيادة الكمية الفعلية تلقائياً عند مسح الباركود مكرراً
 const current = items[existingIndex];
 const newActual = current.actual_quantity + 1;
 const diff = newActual - current.expected_quantity;
 const updated = [...items];
 updated[existingIndex] = {
 ...current,
 actual_quantity: newActual,
 difference: diff,
 diff_value: diff * current.unit_cost,
 };
 setItems(updated);
 toast.info(`تمت زيادة كمية: ${p.name} (+1)`);
 } else {
 toast.error('الصنف مدرج بالفعل في ورقة الجرد.');
 }
 setSearchQuery('');
 return;
 }

 try {
 const newItem = await buildCountItem(p, selectedWarehouse);
 setItems((prev) => [newItem, ...prev]);
 setSearchQuery('');
 toast.success(`تمت إضافة ${p.name} لورقة الجرد`);
 } catch (e) {
 console.error(e);
 toast.error('فشل في إدراج الصنف.');
 }
 };

 // معالجة الضغط على Enter في حقل البحث لمسح الباركود السريع
 const handleBarcodeKeyDown = async (e: React.KeyboardEvent<HTMLInputElement>) => {
 if (e.key !=='Enter') return;
 e.preventDefault();

 const query = searchQuery.trim();
 if (!query) return;

 // 1. فحص الباركود عبر ProductRepository
 const match = await ProductRepository.findByBarcode(query, orgId);
 if (match) {
 await addItem(match.product, true);
 return;
 }

 // 2. فحص الباركود البديل أو المباشر في المنتجات المحملة
 const found = allProducts.find(
 (p) =>
 p.sku.toLowerCase() === query.toLowerCase() ||
 p.alternate_barcodes?.some((b) => b.toLowerCase() === query.toLowerCase())
 );

 if (found) {
 await addItem(found, true);
 return;
 }

 // 3. إن كان هناك نتيجة أولى في القائمة المنبثقة
 if (searchResults.length > 0) {
 await addItem(searchResults[0], true);
 return;
 }

 toast.error(`لم يتم العثور على أي صنف بالباركود: ${query}`);
 };

 // تحديث الكمية الفعلية للصنف
 const updateActualQty = (productId: string, val: number | string) => {
 const qty = typeof val ==='number'? val : parseFloat(val) || 0;
 setItems((prev) =>
 prev.map((it) => {
 if (it.product.id !== productId) return it;
 const diff = qty - it.expected_quantity;
 return {
 ...it,
 actual_quantity: qty,
 difference: diff,
 diff_value: diff * it.unit_cost,
 };
 })
 );
 };

 // تحديث العد عبر الوحدات المتعددة (علبة + شريط)
 const updateMultiUnitQty = (
 productId: string,
 baseCount: number,
 secCount: number,
 conversionFactor: number
 ) => {
 // الكمية الإجمالية = عدد العلب + (عدد الأشرطة / معامل التحويل)
 const factor = conversionFactor > 0 ? conversionFactor : 1;
 const totalBaseQty = Number((baseCount + secCount / factor).toFixed(4));

 setItems((prev) =>
 prev.map((it) => {
 if (it.product.id !== productId) return it;
 const diff = totalBaseQty - it.expected_quantity;
 return {
 ...it,
 actual_quantity: totalBaseQty,
 difference: diff,
 diff_value: diff * it.unit_cost,
 unitBreakdown: {
 baseQty: baseCount,
 secQty: secCount,
 },
 };
 })
 );
 };

 // حذف صنف من الورقة
 const removeItem = (productId: string) => {
 setItems((prev) => prev.filter((it) => it.product.id !== productId));
 };

 // مسح الورقة بالكامل
 const clearAllItems = () => {
 if (items.length === 0) return;
 if (confirm('هل أنت متأكد من مسح جميع الأصناف المدرجة بالورقة؟')) {
 setItems([]);
 toast.info('تم تفريغ الورقة.');
 }
 };

 // الجرد الشامل: تحميل كافة أصناف المخزن المستهدف
 const handleLoadAllWarehouseItems = async () => {
 if (!selectedWarehouse) {
 toast.error('يرجى اختيار المخزن أولاً.');
 return;
 }

 setIsBulkLoading(true);
 try {
 let candidateProducts = allProducts;
 if (selectedCategoryFilter !=='all') {
 candidateProducts = allProducts.filter((p) => p.category_id === selectedCategoryFilter);
 }

 const countItems = await Promise.all(
 candidateProducts.map((p) => buildCountItem(p, selectedWarehouse))
 );

 setItems(countItems);
 toast.success(`تم تحميل ${countItems.length} صنف للجرد الشامل بنجاح.`);
 } catch (err) {
 console.error(err);
 toast.error('حدث خطأ أثناء تحميل أصناف المخزن.');
 } finally {
 setIsBulkLoading(false);
 }
 };

 // تصفية العناصر المعروضة في الجدول
 const filteredItems = useMemo(() => {
 return items.filter((it) => {
 // فلتر التصنيف
 if (selectedCategoryFilter !=='all'&& it.product.category_id !== selectedCategoryFilter) {
 return false;
 }
 // فلتر الفروقات
 if (activeFilter ==='diff') return it.difference !== 0;
 if (activeFilter ==='shortage') return it.difference < 0;
 if (activeFilter ==='surplus') return it.difference > 0;
 if (activeFilter ==='match') return it.difference === 0;
 return true;
 });
 }, [items, activeFilter, selectedCategoryFilter]);

 // إحصائيات الجرد
 const stats = useMemo(() => {
 const totalCounted = items.length;
 let matchCount = 0;
 let shortageCount = 0;
 let surplusCount = 0;
 let totalShortageValue = 0;
 let totalSurplusValue = 0;
 let netVarianceValue = 0;

 for (const it of items) {
 if (it.difference === 0) {
 matchCount++;
 } else if (it.difference < 0) {
 shortageCount++;
 totalShortageValue += Math.abs(it.diff_value);
 } else {
 surplusCount++;
 totalSurplusValue += it.diff_value;
 }
 netVarianceValue += it.diff_value;
 }

 return {
 totalCounted,
 matchCount,
 shortageCount,
 surplusCount,
 totalShortageValue,
 totalSurplusValue,
 netVarianceValue,
 };
 }, [items]);

 // حفظ واعتماد الجرد
 const handleSave = async (status:'draft'|'completed') => {
 if (!selectedWarehouse || items.length === 0) {
 toast.error('يرجى اختيار المخزن وإدراج أصناف للجرد.');
 return;
 }

 setIsSaving(true);
 try {
 const session = await InventoryRepository.createStocktakeSession({
 orgId,
 branchId: activeBranchId || currentUser!.branch_id!,
 warehouseId: selectedWarehouse,
 userId: currentUser!.id,
 notes,
 });

 const stocktakeItems: Omit<StocktakeItem,'id'|'session_id'>[] = items.map((it) => ({
 product_id: it.product.id,
 batch_id: it.selectedBatchId || null,
 expected_quantity: it.expected_quantity,
 actual_quantity: it.actual_quantity,
 difference_quantity: it.difference,
 unit_cost: it.unit_cost,
 difference_value: it.diff_value,
 }));

 await InventoryRepository.updateStocktakeItems(session.id, stocktakeItems);

 if (status ==='completed') {
 const res = await InventoryRepository.commitStocktakeSession(session.id, currentUser!.id);
 if (!res.success) throw new Error(res.error);
 toast.success('تم اعتماد الجرد وتحديث أرصدة المخازن والتسوية المالية بنجاح.');
 } else {
 toast.success('تم حفظ مسودة الجرد بنجاح.');
 }

 router.push('/inventory/adjustments');
 } catch (err) {
 console.error(err);
 toast.error(err instanceof Error ? err.message :'حدث خطأ أثناء حفظ الجرد.');
 } finally {
 setIsSaving(false);
 }
 };

 return (
 <AppShell
 title="جلسة جرد مخزوني ذكية"
 subtitle="جرد تفصيلي بالباركود والوحدات والتشغيلات مع التسوية المالية الفورية"
 actions={
 <div className="flex items-center gap-2">
 <Button
 variant="outline"
 onClick={() => handleSave('draft')}
 disabled={isSaving || items.length === 0}
 className="h-10 px-4 text-xs font-black rounded-xl flex items-center gap-2 border-slate-300 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800"
 >
 <Save className="w-4 h-4 text-slate-500"/>
 <span>حفظ كمسودة</span>
 </Button>

 <Button
 onClick={() => handleSave('completed')}
 disabled={isSaving || items.length === 0}
 className="h-10 px-6 bg-[#558b2f] hover:bg-[#436d25] text-white text-xs font-black rounded-xl shadow-md flex items-center gap-2 transition-all active:scale-95"
 >
 <Check className="w-4 h-4"/>
 <span>اعتماد وتسوية الأرصدة</span>
 </Button>
 </div>
 }
 >
 <div className="space-y-4 pb-12">
 {/* شريط الإحصائيات الذكية السريعة */}
 <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
 <div className="bg-surface p-3.5 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-xs flex items-center justify-between">
 <div>
 <p className="text-3xs font-black text-slate-400">الأصناف بالورقة</p>
 <h4 className="text-xl font-black text-slate-900 dark:text-white mt-0.5">{stats.totalCounted}</h4>
 </div>
 <div className="w-10 h-10 rounded-xl bg-blue-50 dark:bg-blue-900/30 flex items-center justify-center text-blue-600">
 <Package className="w-5 h-5"/>
 </div>
 </div>

 <div className="bg-surface p-3.5 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-xs flex items-center justify-between">
 <div>
 <p className="text-3xs font-black text-slate-400">أصناف متطابقة</p>
 <h4 className="text-xl font-black text-slate-700 dark:text-slate-200 mt-0.5">{stats.matchCount}</h4>
 </div>
 <div className="w-10 h-10 rounded-xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-500">
 <CheckCircle2 className="w-5 h-5"/>
 </div>
 </div>

 <div className="bg-surface p-3.5 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-xs flex items-center justify-between">
 <div>
 <p className="text-3xs font-black text-red-500">أصناف عجز (-)</p>
 <h4 className="text-xl font-black text-red-600 mt-0.5">
 {stats.shortageCount}{''}
 <span className="text-xs font-normal text-red-400 font-mono">
 ({formatNumber(stats.totalShortageValue)} ج)
 </span>
 </h4>
 </div>
 <div className="w-10 h-10 rounded-xl bg-red-50 dark:bg-red-900/30 flex items-center justify-center text-red-600">
 <AlertTriangle className="w-5 h-5"/>
 </div>
 </div>

 <div className="bg-surface p-3.5 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-xs flex items-center justify-between">
 <div>
 <p className="text-3xs font-black text-emerald-600">أصناف زيادة (+)</p>
 <h4 className="text-xl font-black text-emerald-600 mt-0.5">
 {stats.surplusCount}{''}
 <span className="text-xs font-normal text-emerald-400 font-mono">
 ({formatNumber(stats.totalSurplusValue)} ج)
 </span>
 </h4>
 </div>
 <div className="w-10 h-10 rounded-xl bg-emerald-50 dark:bg-emerald-900/30 flex items-center justify-center text-emerald-600">
 <Plus className="w-5 h-5"/>
 </div>
 </div>

 <div className="bg-surface p-3.5 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-xs flex items-center justify-between col-span-2 sm:col-span-1">
 <div>
 <p className="text-3xs font-black text-slate-400">صافي أثر التسوية</p>
 <h4
 className={cn(
'text-lg font-black mt-0.5 font-mono',
 stats.netVarianceValue >= 0 ?'text-[#558b2f]':'text-red-600'
 )}
 >
 {stats.netVarianceValue >= 0 ?'+':''}
 {formatNumber(stats.netVarianceValue)}{''}
 <span className="text-3xs font-bold">ج.م</span>
 </h4>
 </div>
 <div
 className={cn(
'w-10 h-10 rounded-xl flex items-center justify-center',
 stats.netVarianceValue >= 0
 ?'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600'
 :'bg-red-50 dark:bg-red-950/40 text-red-600'
 )}
 >
 <ArrowUpDown className="w-5 h-5"/>
 </div>
 </div>
 </div>

 {/* قسم البحث السريع واختيار المخزن والعمليات الجماعية */}
 <div className="bg-surface rounded-2xl border border-slate-200/80 dark:border-slate-800 p-5 shadow-sm space-y-4">
 <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-3 border-b border-slate-100 dark:border-slate-800 pb-3">
 <div className="flex items-center gap-3">
 <div className="w-8 h-8 rounded-lg bg-[#558b2f]/10 text-[#558b2f] flex items-center justify-center">
 <Barcode className="w-4 h-4"/>
 </div>
 <div>
 <h3 className="text-sm font-black text-slate-900 dark:text-white">إدخال الأصناف والمخزن المستهدف</h3>
 <p className="text-2xs text-slate-400">
 يدعم قارئ الباركود، باركود الوحدات الفرعية (العبوة/العلبة)، والبحث بالاسم أو الرف
 </p>
 </div>
 </div>

 <div className="flex flex-wrap items-center gap-2 w-full lg:w-auto">
 <div className="flex items-center gap-2 bg-slate-50 dark:bg-slate-900 px-3 py-1.5 rounded-xl border border-slate-200/80 dark:border-slate-700">
 <WarehouseIcon className="w-4 h-4 text-[#558b2f]"/>
 <span className="text-xs font-black text-slate-500">المخزن:</span>
 <select
 value={selectedWarehouse}
 onChange={(e) => setSelectedWarehouse(e.target.value)}
 className="bg-transparent border-none text-xs font-black text-[#558b2f] focus:ring-0 cursor-pointer pr-2"
 disabled={items.length > 0}
 >
 {warehouses.map((w) => (
 <option key={w.id} value={w.id}>
 {w.name} {w.is_main ?'(الرئيسي)':''}
 </option>
 ))}
 </select>
 </div>

 <Button
 variant="outline"
 size="sm"
 onClick={handleLoadAllWarehouseItems}
 disabled={isBulkLoading || !selectedWarehouse}
 className="h-9 px-3 text-xs font-black rounded-xl border-blue-200 dark:border-blue-800 text-blue-700 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-950/40 gap-1.5"
 >
 <RefreshCw className={cn('w-3.5 h-3.5', isBulkLoading &&'animate-spin')} />
 <span>جرد شامل لكافة أصناف المخزن</span>
 </Button>

 {items.length > 0 && (
 <Button
 variant="ghost"
 size="sm"
 onClick={clearAllItems}
 className="h-9 px-3 text-xs font-bold text-slate-400 hover:text-red-600 rounded-xl"
 >
 <Trash2 className="w-3.5 h-3.5 ml-1"/>
 <span>تفريغ الورقة</span>
 </Button>
 )}
 </div>
 </div>

 {/* مدخل الباركود مع القائمة المنبثقة الذكية */}
 <div className="relative">
 <div className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 flex items-center gap-2 pointer-events-none">
 <Search className="w-5 h-5 text-slate-400"/>
 </div>

 <Input
 ref={searchInputRef}
 value={searchQuery}
 onChange={(e) => setSearchQuery(e.target.value)}
 onKeyDown={handleBarcodeKeyDown}
 placeholder="امسح الباركود بجهاز المسح أو ابحث باسم الصنف / الكود / الرف... (اضغط Enter للإضافة المباشرة)"
 className="h-13 pr-12 pl-24 text-sm font-bold rounded-2xl bg-slate-50 dark:bg-slate-900 border-2 border-slate-100 dark:border-slate-800 focus:border-[#558b2f] transition-all shadow-inner"
 autoFocus
 />

 <div className="absolute left-3 top-1/2 -translate-y-1/2 flex items-center gap-1.5 text-3xs font-mono bg-white dark:bg-slate-800 px-2.5 py-1 rounded-lg border border-slate-200 dark:border-slate-700 text-slate-400">
 <Barcode className="w-3.5 h-3.5 text-[#558b2f]"/>
 <span>Enter = مسح فوري</span>
 </div>

 {/* قائمة نتائج البحث السريع */}
 {searchResults.length > 0 && (
 <div className="absolute top-full right-0 left-0 mt-2 bg-white dark:bg-[#1e293b] border border-slate-200 dark:border-slate-700 rounded-2xl shadow-2xl z-50 overflow-hidden animate-in fade-in slide-in-from-top-2 duration-150 divide-y divide-slate-100 dark:divide-slate-800">
 {searchResults.map((p) => {
 const isAlreadyIn = items.some((it) => it.product.id === p.id);
 return (
 <button
 key={p.id}
 type="button"
 onClick={() => addItem(p)}
 className={cn(
'w-full flex items-center justify-between p-3.5 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors text-right group',
 isAlreadyIn &&'bg-blue-50/40 dark:bg-blue-950/20'
 )}
 >
 <div className="flex flex-col">
 <div className="flex items-center gap-2">
 <span className="text-sm font-black text-slate-900 dark:text-white group-hover:text-[#558b2f]">
 {p.name}
 </span>
 {p.shelf_location && (
 <span className="text-3xs bg-slate-100 dark:bg-slate-700 text-slate-500 px-1.5 py-0.5 rounded-md flex items-center gap-1">
 <MapPin className="w-2.5 h-2.5"/> {p.shelf_location}
 </span>
 )}
 </div>
 <div className="flex items-center gap-3 text-2xs text-slate-400 font-mono mt-0.5">
 <span>كود: {p.sku}</span>
 {p.tracks_batch && (
 <span className="text-amber-600 bg-amber-50 dark:bg-amber-950/40 px-1.5 py-0.2 rounded text-3xs">
 يتبع التشغيلات
 </span>
 )}
 <span>التكلفة: {formatNumber(p.purchase_price)} ج</span>
 </div>
 </div>

 <div className="flex items-center gap-2">
 {isAlreadyIn ? (
 <Badge className="bg-blue-100 text-blue-700 dark:bg-blue-900/50 text-3xs font-bold">
 مدرج بالورقة
 </Badge>
 ) : (
 <span className="text-xs font-black text-[#558b2f] flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
 <Plus className="w-3.5 h-3.5"/> إدراج
 </span>
 )}
 </div>
 </button>
 );
 })}
 </div>
 )}
 </div>
 </div>

 {/* جدول الجرد والفلاتر المتقدمة */}
 <div className="bg-surface rounded-2xl border border-slate-200/80 dark:border-slate-800 overflow-hidden shadow-md">
 {/* شريط الفلاتر والتبويبات */}
 <div className="p-4 border-b border-slate-100 dark:border-slate-800 flex flex-col md:flex-row md:items-center justify-between gap-3 bg-slate-50/50 dark:bg-slate-900/30">
 <div className="flex flex-wrap items-center gap-1.5">
 <Button
 variant={activeFilter ==='all'?'default':'outline'}
 size="sm"
 onClick={() => setActiveFilter('all')}
 className={cn(
'h-8 px-3 text-xs font-black rounded-lg',
 activeFilter ==='all'&&'bg-slate-900 text-white dark:bg-white dark:text-slate-900'
 )}
 >
 الكل ({items.length})
 </Button>

 <Button
 variant={activeFilter ==='diff'?'default':'outline'}
 size="sm"
 onClick={() => setActiveFilter('diff')}
 className={cn(
'h-8 px-3 text-xs font-black rounded-lg',
 activeFilter ==='diff'&&'bg-amber-600 text-white'
 )}
 >
 بها فروقات ({stats.shortageCount + stats.surplusCount})
 </Button>

 <Button
 variant={activeFilter ==='shortage'?'default':'outline'}
 size="sm"
 onClick={() => setActiveFilter('shortage')}
 className={cn(
'h-8 px-3 text-xs font-black rounded-lg',
 activeFilter ==='shortage'&&'bg-red-600 text-white'
 )}
 >
 عجز فقط ({stats.shortageCount})
 </Button>

 <Button
 variant={activeFilter ==='surplus'?'default':'outline'}
 size="sm"
 onClick={() => setActiveFilter('surplus')}
 className={cn(
'h-8 px-3 text-xs font-black rounded-lg',
 activeFilter ==='surplus'&&'bg-emerald-600 text-white'
 )}
 >
 زيادة فقط ({stats.surplusCount})
 </Button>

 <Button
 variant={activeFilter ==='match'?'default':'outline'}
 size="sm"
 onClick={() => setActiveFilter('match')}
 className={cn(
'h-8 px-3 text-xs font-black rounded-lg',
 activeFilter ==='match'&&'bg-slate-600 text-white'
 )}
 >
 مطابق ({stats.matchCount})
 </Button>
 </div>

 {/* فلتر الفئة / التصنيف */}
 {allCategories.length > 0 && (
 <div className="flex items-center gap-2 text-xs font-bold text-slate-500">
 <Filter className="w-3.5 h-3.5"/>
 <span>تصنيف:</span>
 <select
 value={selectedCategoryFilter}
 onChange={(e) => setSelectedCategoryFilter(e.target.value)}
 className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-xs font-bold px-2 py-1"
 >
 <option value="all">كافة الأقسام</option>
 {allCategories.map((c) => (
 <option key={c.id} value={c.id}>
 {c.name}
 </option>
 ))}
 </select>
 </div>
 )}
 </div>

 {/* جدول الأصناف المحصورة */}
 <ScrollArea className="h-[460px]">
 <Table>
 <TableHeader className="sticky top-0 z-10 bg-slate-50 dark:bg-slate-900 shadow-xs">
 <TableRow>
 <TableHead className="text-2xs font-black uppercase tracking-wider">الصنف والتفاصيل</TableHead>
 <TableHead className="text-2xs font-black uppercase tracking-wider text-center">الوحدة الأساسية</TableHead>
 <TableHead className="text-2xs font-black uppercase tracking-wider text-center">الرصيد الدفتري</TableHead>
 <TableHead className="text-2xs font-black uppercase tracking-wider text-center">الكمية الفعلية المحصورة</TableHead>
 <TableHead className="text-2xs font-black uppercase tracking-wider text-center">فرق الكمية</TableHead>
 <TableHead className="text-2xs font-black uppercase tracking-wider text-left">قيمة التسوية (ج.م)</TableHead>
 <TableHead className="text-2xs font-black uppercase tracking-wider text-center w-14"></TableHead>
 </TableRow>
 </TableHeader>

 <TableBody className="text-xs font-bold divide-y divide-slate-100 dark:divide-slate-800">
 {filteredItems.length === 0 ? (
 <TableRow>
 <TableCell colSpan={7} className="py-24 text-center">
 <div className="flex flex-col items-center gap-3 text-slate-400">
 <Inbox className="w-12 h-12 opacity-20"/>
 <span className="text-sm font-black">
 {items.length === 0
 ?'ورقة الجرد فارغة حالياً. استخدم المسح بالباركود أو اضغط"جرد شامل"لبدء الحصر.'
 :'لا توجد أصناف تطابق معايير الفلتر المحددة.'}
 </span>
 </div>
 </TableCell>
 </TableRow>
 ) : (
 filteredItems.map((it) => {
 const hasUnits = it.secondaryUnits && it.secondaryUnits.length > 0;
 const hasBatches = it.product.tracks_batch && it.batches && it.batches.length > 0;

 return (
 <React.Fragment key={it.product.id}>
 <TableRow className="hover:bg-slate-50/60 dark:hover:bg-slate-800/40 transition-colors">
 <TableCell className="py-3">
 <div className="flex flex-col">
 <div className="flex items-center gap-2">
 <span className="font-black text-slate-900 dark:text-white text-sm">
 {it.product.name}
 </span>
 {it.product.shelf_location && (
 <span className="text-4xs bg-slate-100 dark:bg-slate-800 text-slate-500 font-mono px-1.5 py-0.5 rounded">
 رف: {it.product.shelf_location}
 </span>
 )}
 </div>
 <div className="flex items-center gap-2 text-3xs text-slate-400 font-mono mt-0.5">
 <span>{it.product.sku}</span>
 <span>• التكلفة: {formatNumber(it.unit_cost)} ج</span>
 {(hasUnits || hasBatches) && (
 <button
 type="button"
 onClick={() => {
 setItems((prev) =>
 prev.map((item) =>
 item.product.id === it.product.id
 ? { ...item, isExpanded: !item.isExpanded }
 : item
 )
 );
 }}
 className="text-[#558b2f] hover:underline font-bold flex items-center gap-0.5 cursor-pointer mr-2"
 >
 <Layers3 className="w-3 h-3"/>
 <span>
 {hasUnits ?'تفكيك الوحدات':''} {hasBatches ?'• التشغيلات':''}
 </span>
 {it.isExpanded ? (
 <ChevronUp className="w-3 h-3"/>
 ) : (
 <ChevronDown className="w-3 h-3"/>
 )}
 </button>
 )}
 </div>
 </div>
 </TableCell>

 <TableCell className="text-center text-slate-500 font-bold">
 {it.baseUnit?.name ||'قطعة'}
 </TableCell>

 <TableCell className="text-center font-mono text-sm text-slate-600 dark:text-slate-300">
 {formatNumber(it.expected_quantity)}
 </TableCell>

 <TableCell className="text-center">
 <div className="flex items-center justify-center gap-1.5">
 <Input
 type="number"
 step="any"
 value={it.actual_quantity}
 onChange={(e) => updateActualQty(it.product.id, e.target.value)}
 className={cn(
'h-9 w-24 text-center font-black rounded-xl text-sm border-2 transition-all',
 it.difference === 0
 ?'border-slate-200 dark:border-slate-700 bg-surface'
 : it.difference > 0
 ?'border-emerald-500/50 bg-emerald-50/20 text-emerald-700'
 :'border-red-500/50 bg-red-50/20 text-red-700'
 )}
 />
 </div>
 </TableCell>

 <TableCell className="text-center">
 <Badge
 className={cn(
'font-black text-xs font-mono px-2 py-0.5 shadow-xs',
 it.difference === 0
 ?'bg-slate-100 dark:bg-slate-800 text-slate-500 border-none'
 : it.difference > 0
 ?'bg-emerald-50 text-emerald-700 border-emerald-200'
 :'bg-red-50 text-red-700 border-red-200'
 )}
 variant="outline"
 >
 {it.difference > 0 ?`+${it.difference}`: it.difference}
 </Badge>
 </TableCell>

 <TableCell
 className={cn(
'text-left font-black text-sm font-mono',
 it.diff_value === 0
 ?'text-slate-400'
 : it.diff_value > 0
 ?'text-emerald-600'
 :'text-red-600'
 )}
 >
 {it.diff_value > 0 ?'+':''}
 {formatNumber(it.diff_value)}
 </TableCell>

 <TableCell className="text-center">
 <Button
 variant="ghost"
 size="icon"
 onClick={() => removeItem(it.product.id)}
 className="w-8 h-8 rounded-lg text-slate-300 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/30 transition-colors"
 >
 <Trash2 className="w-4 h-4"/>
 </Button>
 </TableCell>
 </TableRow>

 {/* قسم التوسيع لجرد الوحدات المتعددة والتشغيلات */}
 {it.isExpanded && (
 <TableRow className="bg-slate-50/90 dark:bg-slate-900/60 border-y border-slate-200/60 dark:border-slate-800">
 <TableCell colSpan={7} className="p-4">
 <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
 {/* تفكيك الحصر بالوحدات (مثال: علب وأشرطة) */}
 {hasUnits && (
 <div className="bg-white dark:bg-slate-950 p-3.5 rounded-xl border border-slate-200/70 dark:border-slate-800 space-y-2">
 <div className="flex items-center gap-1.5 text-xs font-black text-slate-800 dark:text-slate-200">
 <Layers className="w-3.5 h-3.5 text-[#558b2f]"/>
 <span>حساب الحصر بالوحدات المتعددة ({it.baseUnit?.name ||'علبة'} + {it.secondaryUnits[0]?.unit_name ||'شريط'})</span>
 </div>
 <p className="text-3xs text-slate-400">
 معامل التحويل: 1 {it.baseUnit?.name ||'علبة'} = {it.secondaryUnits[0]?.conversion_factor} {it.secondaryUnits[0]?.unit_name ||'شريط'}
 </p>

 <div className="flex items-center gap-3 pt-1">
 <div className="flex-1">
 <label className="text-3xs font-bold text-slate-500">
 عدد ({it.baseUnit?.name ||'العلب'}):
 </label>
 <Input
 type="number"
 value={it.unitBreakdown?.baseQty ?? Math.floor(it.actual_quantity)}
 onChange={(e) => {
 const base = parseFloat(e.target.value) || 0;
 const sec = it.unitBreakdown?.secQty || 0;
 updateMultiUnitQty(it.product.id, base, sec, it.secondaryUnits[0].conversion_factor);
 }}
 className="h-8 text-center font-bold text-xs mt-1"
 />
 </div>

 <div className="flex-1">
 <label className="text-3xs font-bold text-slate-500">
 عدد ({it.secondaryUnits[0]?.unit_name ||'الأشرطة'}):
 </label>
 <Input
 type="number"
 value={it.unitBreakdown?.secQty ?? 0}
 onChange={(e) => {
 const sec = parseFloat(e.target.value) || 0;
 const base = it.unitBreakdown?.baseQty ?? Math.floor(it.actual_quantity);
 updateMultiUnitQty(it.product.id, base, sec, it.secondaryUnits[0].conversion_factor);
 }}
 className="h-8 text-center font-bold text-xs mt-1"
 />
 </div>
 </div>
 </div>
 )}

 {/* تشغيلات الصنف وتواريخ الصلاحية */}
 {hasBatches ? (
 <div className="bg-white dark:bg-slate-950 p-3.5 rounded-xl border border-slate-200/70 dark:border-slate-800 space-y-2">
 <div className="flex items-center gap-1.5 text-xs font-black text-slate-800 dark:text-slate-200">
 <Calendar className="w-3.5 h-3.5 text-amber-500"/>
 <span>تشغيلات وتواريخ الصلاحية المسجلة في المخزن</span>
 </div>

 <div className="space-y-1.5 max-h-32 overflow-y-auto pr-1">
 {it.batches.map((b) => (
 <div
 key={b.id}
 className={cn(
'p-2 rounded-lg border text-xs flex items-center justify-between cursor-pointer transition-colors',
 it.selectedBatchId === b.id
 ?'border-[#558b2f] bg-emerald-50/40 dark:bg-emerald-950/20'
 :'border-slate-100 dark:border-slate-800'
 )}
 onClick={() => {
 setItems((prev) =>
 prev.map((item) =>
 item.product.id === it.product.id
 ? { ...item, selectedBatchId: b.id }
 : item
 )
 );
 }}
 >
 <div className="flex items-center gap-2">
 <span className="font-mono font-black">{b.batch_number}</span>
 {b.expiry_date && (
 <span className="text-3xs text-slate-400 font-mono">
 ينتهي: {b.expiry_date}
 </span>
 )}
 </div>
 <Badge variant="outline"className="text-3xs font-mono">
 رصيد: {b.current_quantity}
 </Badge>
 </div>
 ))}
 </div>
 </div>
 ) : (
 <div className="bg-white dark:bg-slate-950 p-3.5 rounded-xl border border-slate-200/70 dark:border-slate-800 flex items-center justify-center text-slate-400 text-xs">
 هذا الصنف لا يتبع نظام أرقام التشغيلات (Batch Tracking).
 </div>
 )}
 </div>
 </TableCell>
 </TableRow>
 )}
 </React.Fragment>
 );
 })
 )}
 </TableBody>
 </Table>
 </ScrollArea>
 </div>

 {/* ملاحظات الجرد */}
 <div className="bg-surface rounded-2xl border border-slate-200/80 dark:border-slate-800 p-5 shadow-sm">
 <h3 className="text-xs font-black text-slate-800 dark:text-slate-200 mb-2">ملاحظات وتقرير جلسة الجرد</h3>
 <Textarea
 value={notes}
 onChange={(e) => setNotes(e.target.value)}
 placeholder="اكتب هنا أي تفاصيل تخص أسباب العجز أو الزيادة، أو أسماء لجنة الجرد..."
 className="w-full min-h-[85px] rounded-xl bg-slate-50 dark:bg-slate-950 border-slate-200 dark:border-slate-800 p-3 font-bold text-xs"
 />
 </div>
 </div>
 </AppShell>
 );
}