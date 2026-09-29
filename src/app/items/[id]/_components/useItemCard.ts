'use client';

import { useState, useEffect, useMemo, useCallback } from'react';
import { useRouter } from'next/navigation';
import { useSessionStore } from'@/core/state/useSessionStore';
import { ProductRepository } from'@/modules/inventory/product_repository';
import { InventoryRepository } from'@/modules/inventory/inventory_repository';
import { formatNumber, formatDateTime, isExpired } from'@/lib/format';
import { toast } from'sonner';
import type {
 Product,
 ProductCategory,
 ProductBrand,
 ProductUnit,
 Unit,
 Warehouse,
 StockLevel,
 ProductBatch,
 InventoryTransaction,
} from'@/types';
import {
 TabKey,
 TableDensity,
 MovementColumnsState,
 BatchColumnsState,
 SubstituteColumnsState,
 StocktakeColumnsState,
 StocktakeRecord,
 SubstituteProductWithStock,
 TRANSACTION_TYPE_LABELS,
} from'./types';

export function useItemCard(productId: string) {
 const router = useRouter();
 const { currentUser } = useSessionStore();
 const orgId = currentUser?.org_id ||'';

 const [activeTab, setActiveTab] = useState<TabKey>('movements');
 const [product, setProduct] = useState<Product | null>(null);
 const [categories, setCategories] = useState<ProductCategory[]>([]);
 const [category, setCategory] = useState<ProductCategory | null>(null);
 const [brand, setBrand] = useState<ProductBrand | null>(null);
 const [unitsById, setUnitsById] = useState<Record<string, Unit>>({});
 const [productUnits, setProductUnits] = useState<ProductUnit[]>([]);
 const [warehouses, setWarehouses] = useState<Warehouse[]>([]);
 const [stockLevels, setStockLevels] = useState<StockLevel[]>([]);
 const [batches, setBatches] = useState<ProductBatch[]>([]);
 const [transactions, setTransactions] = useState<InventoryTransaction[]>([]);
 const [substitutes, setSubstitutes] = useState<SubstituteProductWithStock[]>([]);
 const [stocktakeRecords, setStocktakeRecords] = useState<StocktakeRecord[]>([]);
 const [isLoading, setIsLoading] = useState(true);

 // Modals
 const [showOpeningStockModal, setShowOpeningStockModal] = useState(false);
 const [showAddSubstituteModal, setShowAddSubstituteModal] = useState(false);

 // Density
 const [density, setDensity] = useState<TableDensity>('medium');

 // Movements Column & Sort State
 const [movementColumns, setMovementColumns] = useState<MovementColumnsState>({
 type: true,
 datetime: true,
 quantity: true,
 prices: true,
 reference: true,
 creator: true,
 });
 const [txSortField, setTxSortField] = useState<'created_at'|'quantity'|'total_cost'|'transaction_type'>('created_at');
 const [txSortDir, setTxSortDir] = useState<'asc'|'desc'>('desc');
 const [searchQuery, setSearchQuery] = useState('');
 const [pageSize, setPageSize] = useState<number>(25);
 const [currentPage, setCurrentPage] = useState<number>(1);

 // Batches Column & Sort State
 const [batchColumns, setBatchColumns] = useState<BatchColumnsState>({
 number: true,
 expiry: true,
 quantity: true,
 status: true,
 });
 const [batchSortField, setBatchSortField] = useState<'batch_number'|'expiry_date'|'current_quantity'>('expiry_date');
 const [batchSortDir, setBatchSortDir] = useState<'asc'|'desc'>('asc');
 const [batchSearch, setBatchSearch] = useState('');
 const [batchPageSize, setBatchPageSize] = useState<number>(25);
 const [batchCurrentPage, setBatchCurrentPage] = useState<number>(1);

 // Substitutes Column & Sort State
 const [substituteColumns, setSubstituteColumns] = useState<SubstituteColumnsState>({
 name: true,
 price: true,
 stock: true,
 });
 const [subSortField, setSubSortField] = useState<'name'|'sale_price'|'available_stock'>('name');
 const [subSortDir, setSubSortDir] = useState<'asc'|'desc'>('asc');
 const [subSearch, setSubSearch] = useState('');
 const [subPageSize, setSubPageSize] = useState<number>(25);
 const [subCurrentPage, setSubCurrentPage] = useState<number>(1);

 // Stocktake Column & Sort State
 const [stocktakeColumns, setStocktakeColumns] = useState<StocktakeColumnsState>({
 reference: true,
 datetime: true,
 previous_quantity: true,
 adjusted_quantity: true,
 creator: true,
 });
 const [stSortField, setStSortField] = useState<'session_number'|'created_at'|'system_quantity'|'actual_quantity'>('created_at');
 const [stSortDir, setStSortDir] = useState<'asc'|'desc'>('desc');
 const [stSearch, setStSearch] = useState('');
 const [stPageSize, setStPageSize] = useState<number>(25);
 const [stCurrentPage, setStCurrentPage] = useState<number>(1);

 const loadData = useCallback(async () => {
 if (!orgId || !productId) return;
 try {
 const { db } = await import('@/core/db/app_database');
 const prod = await ProductRepository.getById(productId);
 if (!prod) {
 router.push('/items');
 return;
 }

 const [cats, brs, unts, pUnits, whs, sLevels, bts, txs, userSubs, sItems] = await Promise.all([
 ProductRepository.getCategories(orgId),
 ProductRepository.getBrands(orgId),
 ProductRepository.getAllUnits(orgId),
 ProductRepository.getProductUnits(productId),
 InventoryRepository.getWarehouses(orgId),
 db.stock_levels.where('product_id').equals(productId).toArray(),
 db.product_batches.where('product_id').equals(productId).toArray(),
 db.inventory_transactions.where('product_id').equals(productId).reverse().sortBy('created_at'),
 ProductRepository.getSubstitutes(productId),
 db.stocktake_items.where('product_id').equals(productId).toArray(),
 ]);

 const unitMap: Record<string, Unit> = {};
 for (const u of unts) unitMap[u.id] = u;

 setProduct(prod);
 setCategories(cats);
 setCategory(cats.find((c) => c.id === prod.category_id) || null);
 setBrand(brs.find((b) => b.id === prod.brand_id) || null);
 setUnitsById(unitMap);
 setProductUnits(pUnits);
 setWarehouses(whs);
 setStockLevels(sLevels);
 setBatches(bts);
 setTransactions(txs);

 // 1. Compute real available stock for each user-defined substitute
 if (userSubs.length > 0) {
 const subIds = userSubs.map((s) => s.id);
 const subStockLevels = await db.stock_levels.where('product_id').anyOf(subIds).toArray();
 const stockMap = new Map<string, number>();
 for (const sl of subStockLevels) {
 stockMap.set(sl.product_id, (stockMap.get(sl.product_id) || 0) + sl.quantity);
 }
 const enrichedSubs: SubstituteProductWithStock[] = userSubs.map((s) => ({
 ...s,
 available_stock: stockMap.get(s.id) || 0,
 }));
 setSubstitutes(enrichedSubs);
 } else {
 setSubstitutes([]);
 }

 // 2. Load real stocktake records from Dexie
 if (sItems.length > 0) {
 const sessionIds = Array.from(new Set(sItems.map((si) => si.session_id)));
 const sessions = await db.stocktake_sessions.where('id').anyOf(sessionIds).toArray();
 const sessionMap = new Map(sessions.map((s) => [s.id, s]));

 const records: StocktakeRecord[] = sItems.map((si) => {
 const sess = sessionMap.get(si.session_id);
 return {
 id: si.id,
 session_id: si.session_id,
 session_number: sess?.session_number ||'ST-SESSION',
 created_at: sess?.created_at || new Date().toISOString(),
 system_quantity: si.expected_quantity ?? 0,
 actual_quantity: si.actual_quantity ?? 0,
 difference: si.difference_quantity ?? 0,
 created_by: sess?.created_by ||'المدير',
 };
 });
 setStocktakeRecords(records);
 } else {
 setStocktakeRecords([]);
 }
 } catch (err) {
 console.error('Failed to load item card:', err);
 } finally {
 setIsLoading(false);
 }
 }, [productId, orgId, router]);

 useEffect(() => {
 loadData();
 }, [loadData]);

 // Remove substitute handler
 const handleRemoveSubstitute = async (subId: string) => {
 try {
 await ProductRepository.removeSubstitute(productId, subId);
 toast.success('تم إزالة الصنف من قائمة البدائل');
 loadData();
 } catch (err) {
 console.error('Failed to remove substitute:', err);
 toast.error('حدث خطأ أثناء إزالة البديل');
 }
 };

 // Current stock
 const currentStock = stockLevels.reduce((sum, s) => sum + s.quantity, 0);
 const baseUName = product && unitsById[product.base_unit_id]?.name ? unitsById[product.base_unit_id].name :'وحدة';

 // Multi-unit formatted stock breakdown
 const secUnit = productUnits[0];
 let stockBreakdownText ='';
 if (secUnit && secUnit.conversion_factor && secUnit.conversion_factor > 1) {
 const factor = secUnit.conversion_factor;
 const baseQty = Math.floor(currentStock / factor);
 const remQty = Math.round(currentStock % factor);
 const secUName = unitsById[secUnit.unit_id]?.name ||'وحدة فرعية';
 stockBreakdownText =`${baseQty} ${baseUName} + ${remQty} ${secUName}`;
 } else {
 stockBreakdownText =`${formatNumber(currentStock)} ${baseUName}`;
 }

 // Sorting handlers
 const handleTxSort = (field:'created_at'|'quantity'|'total_cost'|'transaction_type') => {
 if (txSortField === field) {
 setTxSortDir((d) => (d ==='asc'?'desc':'asc'));
 } else {
 setTxSortField(field);
 setTxSortDir('desc');
 }
 };

 const handleBatchSort = (field:'batch_number'|'expiry_date'|'current_quantity') => {
 if (batchSortField === field) {
 setBatchSortDir((d) => (d ==='asc'?'desc':'asc'));
 } else {
 setBatchSortField(field);
 setBatchSortDir('asc');
 }
 };

 const handleSubSort = (field:'name'|'sale_price'|'available_stock') => {
 if (subSortField === field) {
 setSubSortDir((d) => (d ==='asc'?'desc':'asc'));
 } else {
 setSubSortField(field);
 setSubSortDir('asc');
 }
 };

 const handleStSort = (field:'session_number'|'created_at'|'system_quantity'|'actual_quantity') => {
 if (stSortField === field) {
 setStSortDir((d) => (d ==='asc'?'desc':'asc'));
 } else {
 setStSortField(field);
 setStSortDir('desc');
 }
 };

 // Filtered and sorted transactions
 const filteredTransactions = useMemo(() => {
 const q = searchQuery.trim().toLowerCase();
 let result = transactions;
 if (q) {
 result = result.filter(
 (tx) =>
 (tx.reference_id && tx.reference_id.toLowerCase().includes(q)) ||
 (tx.notes && tx.notes.toLowerCase().includes(q))
 );
 }
 return [...result].sort((a, b) => {
 let valA: any = a[txSortField];
 let valB: any = b[txSortField];
 if (txSortField ==='total_cost') {
 valA = a.total_cost || a.unit_cost * a.quantity;
 valB = b.total_cost || b.unit_cost * b.quantity;
 }
 if (valA < valB) return txSortDir ==='asc'? -1 : 1;
 if (valA > valB) return txSortDir ==='asc'? 1 : -1;
 return 0;
 });
 }, [transactions, searchQuery, txSortField, txSortDir]);

 const totalPages = Math.max(1, Math.ceil(filteredTransactions.length / pageSize));
 const paginatedTransactions = useMemo(() => {
 const start = (currentPage - 1) * pageSize;
 return filteredTransactions.slice(start, start + pageSize);
 }, [filteredTransactions, currentPage, pageSize]);

 // Filtered and sorted batches
 const filteredBatches = useMemo(() => {
 const q = batchSearch.trim().toLowerCase();
 let result = batches;
 if (q) {
 result = result.filter((b) => b.batch_number.toLowerCase().includes(q));
 }
 return [...result].sort((a, b) => {
 const valA: any = a[batchSortField];
 const valB: any = b[batchSortField];
 if (valA < valB) return batchSortDir ==='asc'? -1 : 1;
 if (valA > valB) return batchSortDir ==='asc'? 1 : -1;
 return 0;
 });
 }, [batches, batchSearch, batchSortField, batchSortDir]);

 const batchTotalPages = Math.max(1, Math.ceil(filteredBatches.length / batchPageSize));
 const paginatedBatches = useMemo(() => {
 const start = (batchCurrentPage - 1) * batchPageSize;
 return filteredBatches.slice(start, start + batchPageSize);
 }, [filteredBatches, batchCurrentPage, batchPageSize]);

 // Filtered and sorted substitutes
 const filteredSubstitutes = useMemo(() => {
 const q = subSearch.trim().toLowerCase();
 let result = substitutes;
 if (q) {
 result = result.filter(
 (s) =>
 s.name.toLowerCase().includes(q) ||
 s.sku.toLowerCase().includes(q) ||
 (s.name_en && s.name_en.toLowerCase().includes(q))
 );
 }
 return [...result].sort((a, b) => {
 const valA: any = a[subSortField];
 const valB: any = b[subSortField];
 if (valA < valB) return subSortDir ==='asc'? -1 : 1;
 if (valA > valB) return subSortDir ==='asc'? 1 : -1;
 return 0;
 });
 }, [substitutes, subSearch, subSortField, subSortDir]);

 const subTotalPages = Math.max(1, Math.ceil(filteredSubstitutes.length / subPageSize));
 const paginatedSubstitutes = useMemo(() => {
 const start = (subCurrentPage - 1) * subPageSize;
 return filteredSubstitutes.slice(start, start + subPageSize);
 }, [filteredSubstitutes, subCurrentPage, subPageSize]);

 // Filtered and sorted stocktake
 const filteredStocktake = useMemo(() => {
 const q = stSearch.trim().toLowerCase();
 let result = stocktakeRecords;
 if (q) {
 result = result.filter(
 (st) =>
 st.session_number.toLowerCase().includes(q) ||
 st.created_by.toLowerCase().includes(q)
 );
 }
 return [...result].sort((a, b) => {
 const valA: any = a[stSortField];
 const valB: any = b[stSortField];
 if (valA < valB) return stSortDir ==='asc'? -1 : 1;
 if (valA > valB) return stSortDir ==='asc'? 1 : -1;
 return 0;
 });
 }, [stocktakeRecords, stSearch, stSortField, stSortDir]);

 const stTotalPages = Math.max(1, Math.ceil(filteredStocktake.length / stPageSize));
 const paginatedStocktake = useMemo(() => {
 const start = (stCurrentPage - 1) * stPageSize;
 return filteredStocktake.slice(start, start + stPageSize);
 }, [filteredStocktake, stCurrentPage, stPageSize]);

 // Export functions
 const exportMovementsToCsv = () => {
 if (!transactions.length) return;
 const headers = ['نوع الحركة','التاريخ والوقت','الكمية','الأسعار والخصم','المصدر','الملاحظات'];
 const rows = transactions.map((t) => [
 TRANSACTION_TYPE_LABELS[t.transaction_type]?.label || t.transaction_type,
 formatDateTime(t.created_at),
 t.quantity,
 t.total_cost || t.unit_cost * t.quantity,
 t.reference_id ||'OS-MANUAL',
 t.notes ||'',
 ]);
 const csvContent ='\uFEFF'+ [headers.join(','), ...rows.map((r) => r.map((c) =>`"${c}"`).join(','))].join('\n');
 const blob = new Blob([csvContent], { type:'text/csv;charset=utf-8;'});
 const url = URL.createObjectURL(blob);
 const a = document.createElement('a');
 a.href = url;
 a.download =`حركات_الصنف_${product?.sku ||'item'}.csv`;
 a.click();
 URL.revokeObjectURL(url);
 };

 const exportBatchesToCsv = () => {
 if (!batches.length) return;
 const headers = ['رقم التشغيلة','تاريخ الانتهاء','الكمية المتبقية','الحالة'];
 const rows = batches.map((b) => [
 b.batch_number,
 b.expiry_date ? b.expiry_date.slice(0, 10) :'—',
 b.current_quantity,
 isExpired(b.expiry_date) ?'منتهي':'نشط',
 ]);
 const csvContent ='\uFEFF'+ [headers.join(','), ...rows.map((r) => r.map((c) =>`"${c}"`).join(','))].join('\n');
 const blob = new Blob([csvContent], { type:'text/csv;charset=utf-8;'});
 const url = URL.createObjectURL(blob);
 const a = document.createElement('a');
 a.href = url;
 a.download =`تشغيلات_الصنف_${product?.sku ||'batches'}.csv`;
 a.click();
 URL.revokeObjectURL(url);
 };

 const exportSubstitutesToCsv = () => {
 if (!substitutes.length) return;
 const headers = ['الصنف البديل','الباركود SKU','سعر البيع','المخزون المتاح'];
 const rows = substitutes.map((s) => [
 s.name,
 s.sku,
 s.sale_price,
 s.available_stock,
 ]);
 const csvContent ='\uFEFF'+ [headers.join(','), ...rows.map((r) => r.map((c) =>`"${c}"`).join(','))].join('\n');
 const blob = new Blob([csvContent], { type:'text/csv;charset=utf-8;'});
 const url = URL.createObjectURL(blob);
 const a = document.createElement('a');
 a.href = url;
 a.download =`بدائل_الصنف_${product?.sku ||'substitutes'}.csv`;
 a.click();
 URL.revokeObjectURL(url);
 };

 const exportStocktakeToCsv = () => {
 if (!stocktakeRecords.length) return;
 const headers = ['الرقم المرجعي','التاريخ والوقت','الكمية السابقة','الكمية المسواة','الفارق','بواسطة'];
 const rows = stocktakeRecords.map((st) => [
 st.session_number,
 formatDateTime(st.created_at),
 st.system_quantity,
 st.actual_quantity,
 st.difference,
 st.created_by,
 ]);
 const csvContent ='\uFEFF'+ [headers.join(','), ...rows.map((r) => r.map((c) =>`"${c}"`).join(','))].join('\n');
 const blob = new Blob([csvContent], { type:'text/csv;charset=utf-8;'});
 const url = URL.createObjectURL(blob);
 const a = document.createElement('a');
 a.href = url;
 a.download =`جرد_الصنف_${product?.sku ||'stocktake'}.csv`;
 a.click();
 URL.revokeObjectURL(url);
 };

 // Calculated metrics
 const totalPurchases = transactions
 .filter((t) => t.transaction_type ==='purchase')
 .reduce((sum, t) => sum + t.quantity, 0);

 const totalSales = transactions
 .filter((t) => t.transaction_type ==='sale')
 .reduce((sum, t) => sum + t.quantity, 0);

 const totalDamaged = transactions
 .filter((t) => t.transaction_type ==='damaged')
 .reduce((sum, t) => sum + t.quantity, 0);

 // Row padding based on density
 const rowPadding =
 density ==='compact'?'py-1 px-2.5 text-2xs': density ==='relaxed'?'py-4 px-4 text-sm':'py-2.5 px-3 text-xs';

 return {
 orgId,
 currentUser,
 product,
 categories,
 category,
 brand,
 unitsById,
 productUnits,
 warehouses,
 batches,
 substitutes,
 stocktakeRecords,
 isLoading,
 activeTab,
 setActiveTab,
 showOpeningStockModal,
 setShowOpeningStockModal,
 showAddSubstituteModal,
 setShowAddSubstituteModal,
 density,
 setDensity,
 movementColumns,
 setMovementColumns,
 batchColumns,
 setBatchColumns,
 substituteColumns,
 setSubstituteColumns,
 stocktakeColumns,
 setStocktakeColumns,
 searchQuery,
 setSearchQuery,
 pageSize,
 setPageSize,
 currentPage,
 setCurrentPage,
 totalPages,
 filteredTransactions,
 paginatedTransactions,
 batchSearch,
 setBatchSearch,
 batchPageSize,
 setBatchPageSize,
 batchCurrentPage,
 setBatchCurrentPage,
 batchTotalPages,
 filteredBatches,
 paginatedBatches,
 subSearch,
 setSubSearch,
 subPageSize,
 setSubPageSize,
 subCurrentPage,
 setSubCurrentPage,
 subTotalPages,
 filteredSubstitutes,
 paginatedSubstitutes,
 stSearch,
 setStSearch,
 stPageSize,
 setStPageSize,
 stCurrentPage,
 setStCurrentPage,
 stTotalPages,
 filteredStocktake,
 paginatedStocktake,
 handleTxSort,
 handleBatchSort,
 handleSubSort,
 handleStSort,
 handleRemoveSubstitute,
 exportMovementsToCsv,
 exportBatchesToCsv,
 exportSubstitutesToCsv,
 exportStocktakeToCsv,
 totalPurchases,
 totalSales,
 totalDamaged,
 stockBreakdownText,
 baseUName,
 rowPadding,
 loadData,
 };
}