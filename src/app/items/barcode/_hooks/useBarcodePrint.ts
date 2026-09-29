'use client';

import { useState, useEffect, useMemo, useRef } from'react';
import { useSearchParams } from'next/navigation';
import { useSessionStore } from'@/core/state/useSessionStore';
import { db } from'@/core/db/app_database';
import { ProductRepository } from'@/modules/inventory/products';
import type { Product, Unit } from'@/types';
import { PrintItem, BarcodeSettings, DEFAULT_BARCODE_SETTINGS } from'../types';

export function useBarcodePrint() {
 const searchParams = useSearchParams();
 const initialId = searchParams.get('id');

 const { currentUser } = useSessionStore();
 const orgId = currentUser?.org_id ||'';

 // Selected items queue for printing
 const [printItems, setPrintItems] = useState<PrintItem[]>([]);
 const [unitsById, setUnitsById] = useState<Record<string, Unit>>({});
 const [orgName, setOrgName] = useState('');
 const [currency, setCurrency] = useState('ر.س');

 // Fast on-demand search
 const [searchInput, setSearchInput] = useState('');
 const [searchResults, setSearchResults] = useState<Product[]>([]);
 const [selectedIndex, setSelectedIndex] = useState<number>(0);
 const [stockByProductId, setStockByProductId] = useState<
 Record<string, { totalStock: number; formattedStock: string; isZero: boolean }>
 >({});
 const [isSearching, setIsSearching] = useState(false);
 const [showDropdown, setShowDropdown] = useState(false);
 const searchContainerRef = useRef<HTMLDivElement>(null);

 // Table filtering & pagination
 const [tableFilter, setTableFilter] = useState('');
 const [pageSize, setPageSize] = useState(25);
 const [currentPage, setCurrentPage] = useState(1);

 // Settings Modal
 const [isSettingsOpen, setIsSettingsOpen] = useState(false);
 const [settings, setSettings] = useState<BarcodeSettings>(DEFAULT_BARCODE_SETTINGS);

 // Load initial settings & units
 useEffect(() => {
 try {
 const saved = localStorage.getItem('falcon_barcode_settings');
 if (saved) setSettings({ ...DEFAULT_BARCODE_SETTINGS, ...JSON.parse(saved) });
 } catch {}

 const loadMeta = async () => {
 if (!orgId) return;
 try {
 const [org, units] = await Promise.all([
 db.organizations.get(orgId),
 db.units.where('org_id').equals(orgId).toArray(),
 ]);
 if (org) {
 setOrgName(org.name);
 if (org.currency) setCurrency(org.currency);
 }
 const map: Record<string, Unit> = {};
 for (const u of units) map[u.id] = u;
 setUnitsById(map);

 // If URL has ?id=..., load this product directly without scanning the whole DB
 if (initialId) {
 const target = await db.products.get(initialId);
 if (target) {
 setPrintItems([
 {
 product: target,
 copies: 2,
 barcode: target.sku || (target as unknown as { barcode?: string }).barcode ||'',
 price: target.sale_price,
 unitName: map[target.base_unit_id]?.name || map[target.base_unit_id]?.symbol ||'',
 },
 ]);
 }
 }
 } catch (err) {
 console.error('Error loading barcode meta:', err);
 }
 };

 loadMeta();
 }, [orgId, initialId]);

 // Click outside to close search dropdown
 useEffect(() => {
 const handleDocClick = (e: MouseEvent) => {
 if (searchContainerRef.current && !searchContainerRef.current.contains(e.target as Node)) {
 setShowDropdown(false);
 }
 };
 document.addEventListener('mousedown', handleDocClick);
 return () => document.removeEventListener('mousedown', handleDocClick);
 }, []);

 // Debounced fast indexed search & stock calculation
 useEffect(() => {
 const q = searchInput.trim();
 if (!q || !orgId) {
 setSearchResults([]);
 setIsSearching(false);
 setShowDropdown(false);
 setSelectedIndex(0);
 return;
 }

 setIsSearching(true);
 const timer = setTimeout(async () => {
 try {
 let results: Product[] = [];
 const directMatch = await ProductRepository.findByBarcode(q, orgId);
 if (directMatch?.product) {
 results = [directMatch.product];
 } else {
 results = await ProductRepository.search(q, orgId, 20);
 }

 setSearchResults(results);
 setSelectedIndex(0);
 setShowDropdown(results.length > 0);

 // Fetch stock levels and secondary units for found products
 if (results.length > 0) {
 const pIds = results.map((r) => r.id);
 const [stockLevels, productUnits] = await Promise.all([
 db.stock_levels.where('product_id').anyOf(pIds).toArray(),
 db.product_units.where('product_id').anyOf(pIds).toArray(),
 ]);

 const stockMap: Record<
 string,
 { totalStock: number; formattedStock: string; isZero: boolean }
 > = {};

 for (const prod of results) {
 const pStocks = stockLevels.filter(
 (s) => s.product_id === prod.id && s.org_id === orgId
 );
 const totalQty = pStocks.reduce((sum, s) => sum + (s.quantity || 0), 0);
 const baseUnitName = unitsById[prod.base_unit_id]?.name ||'وحدة';

 const pSubUnits = productUnits.filter((u) => u.product_id === prod.id);
 const subUnit = pSubUnits.find(
 (u) => u.conversion_factor && u.conversion_factor > 1
 );

 let formattedStock ='';
 if (totalQty <= 0) {
 formattedStock =`0 ${baseUnitName}`;
 } else if (subUnit && subUnit.conversion_factor > 1) {
 const subUnitName = unitsById[subUnit.unit_id]?.name ||'وحدة فرعية';
 const mainQty = Math.floor(totalQty);
 const remainder = Math.round((totalQty - mainQty) * subUnit.conversion_factor);
 if (mainQty > 0 && remainder > 0) {
 formattedStock =`${mainQty} ${baseUnitName} ${remainder} ${subUnitName}`;
 } else if (mainQty > 0) {
 formattedStock =`${mainQty} ${baseUnitName}`;
 } else {
 formattedStock =`${remainder} ${subUnitName}`;
 }
 } else {
 formattedStock =`${Number.isInteger(totalQty) ? totalQty : totalQty.toFixed(1)} ${baseUnitName}`;
 }

 stockMap[prod.id] = {
 totalStock: totalQty,
 formattedStock,
 isZero: totalQty <= 0,
 };
 }

 setStockByProductId(stockMap);
 }
 } catch (err) {
 console.error('Search error:', err);
 } finally {
 setIsSearching(false);
 }
 }, 150);

 return () => clearTimeout(timer);
 }, [searchInput, orgId, unitsById]);

 const handleAddItem = (p: Product) => {
 setPrintItems((prev) => {
 const idx = prev.findIndex((item) => item.product.id === p.id);
 if (idx >= 0) {
 const next = [...prev];
 next[idx] = { ...next[idx], copies: next[idx].copies + 1 };
 return next;
 }
 return [
 ...prev,
 {
 product: p,
 copies: 2,
 barcode: p.sku || (p as unknown as { barcode?: string }).barcode ||'',
 price: p.sale_price,
 unitName: unitsById[p.base_unit_id]?.name || unitsById[p.base_unit_id]?.symbol ||'',
 },
 ];
 });
 setSearchInput('');
 setShowDropdown(false);
 setSelectedIndex(0);
 };

 const handleBarcodeKeyDown = async (e: React.KeyboardEvent<HTMLInputElement>) => {
 if (e.key ==='ArrowDown') {
 e.preventDefault();
 if (!showDropdown && searchResults.length > 0) {
 setShowDropdown(true);
 setSelectedIndex(0);
 } else if (searchResults.length > 0) {
 setSelectedIndex((prev) => (prev + 1) % searchResults.length);
 }
 return;
 }

 if (e.key ==='ArrowUp') {
 e.preventDefault();
 if (searchResults.length > 0) {
 setSelectedIndex((prev) => (prev - 1 + searchResults.length) % searchResults.length);
 }
 return;
 }

 if (e.key ==='Escape') {
 e.preventDefault();
 setShowDropdown(false);
 return;
 }

 if (e.key ==='Enter') {
 e.preventDefault();
 if (!searchInput.trim()) return;

 if (showDropdown && selectedIndex >= 0 && selectedIndex < searchResults.length) {
 handleAddItem(searchResults[selectedIndex]);
 return;
 }

 const q = searchInput.trim();
 const match = await ProductRepository.findByBarcode(q, orgId);
 if (match?.product) {
 handleAddItem(match.product);
 } else if (searchResults.length > 0) {
 handleAddItem(searchResults[0]);
 }
 }
 };

 const handleUpdateCopies = (productId: string, delta: number) => {
 setPrintItems((prev) =>
 prev.map((item) => {
 if (item.product.id === productId) {
 return { ...item, copies: Math.max(1, item.copies + delta) };
 }
 return item;
 })
 );
 };

 const handleSetCopies = (productId: string, val: number) => {
 setPrintItems((prev) =>
 prev.map((item) => {
 if (item.product.id === productId) {
 return { ...item, copies: Math.max(1, val || 1) };
 }
 return item;
 })
 );
 };

 const handleRemoveItem = (productId: string) => {
 setPrintItems((prev) => prev.filter((item) => item.product.id !== productId));
 };

 const handleClearAll = () => {
 if (printItems.length === 0) return;
 if (confirm('هل أنت متأكد من تفريغ قائمة الطباعة الحالية؟')) {
 setPrintItems([]);
 }
 };

 const saveSettings = (newSettings: BarcodeSettings) => {
 setSettings(newSettings);
 try {
 localStorage.setItem('falcon_barcode_settings', JSON.stringify(newSettings));
 } catch {}
 setIsSettingsOpen(false);
 };

 // Filtered table rows
 const filteredItems = useMemo(() => {
 const q = tableFilter.trim().toLowerCase();
 if (!q) return printItems;
 return printItems.filter(
 (item) =>
 item.product.name.toLowerCase().includes(q) ||
 item.barcode.toLowerCase().includes(q)
 );
 }, [printItems, tableFilter]);

 const totalLabelsCount = useMemo(() => {
 return printItems.reduce((sum, item) => sum + item.copies, 0);
 }, [printItems]);

 const totalPages = Math.max(1, Math.ceil(filteredItems.length / pageSize));
 const pagedItems = filteredItems.slice((currentPage - 1) * pageSize, currentPage * pageSize);

 // Flattened array for printing
 const flatPrintLabels = useMemo(() => {
 const list: PrintItem[] = [];
 for (const item of printItems) {
 for (let i = 0; i < item.copies; i++) {
 list.push(item);
 }
 }
 return list;
 }, [printItems]);

 const handlePrint = () => {
 if (flatPrintLabels.length === 0) return;
 window.print();
 };

 return {
 orgName,
 currency,
 unitsById,
 printItems,
 filteredItems,
 pagedItems,
 totalLabelsCount,
 currentPage,
 totalPages,
 pageSize,
 setPageSize,
 setCurrentPage,
 tableFilter,
 setTableFilter,
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
 handleUpdateCopies,
 handleSetCopies,
 handleRemoveItem,
 handleClearAll,
 isSettingsOpen,
 setIsSettingsOpen,
 settings,
 saveSettings,
 flatPrintLabels,
 handlePrint,
 };
}