'use client';

import React from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Checkbox } from '@/components/ui/checkbox';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import {
  Package,
  Pill,
  Star,
  MoreVertical,
  Eye,
  IdCard,
  Edit,
  Barcode,
  Boxes,
  Trash2,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  Layers,
  Copy,
  Check,
  Building2,
  Tag,
  AlertTriangle,
  CheckCircle2,
  XCircle,
} from 'lucide-react';
import { formatNumber } from '@/lib/format';
import { cn } from '@/lib/utils';
import type {
  Product,
  ProductBrand,
  ProductUnit,
  Unit,
} from '@/types';
import type { VisibleColumns, SortField, SortDirection } from './types';
import { toast } from 'sonner';

interface ItemTableProps {
  products: Product[];
  isLoading: boolean;
  selectedIds: Set<string>;
  toggleSelectAll: () => void;
  toggleSelectRow: (id: string) => void;
  visibleColumns: VisibleColumns;
  sortField: SortField | null;
  sortDirection: SortDirection;
  onSort: (field: SortField) => void;
  brands: ProductBrand[];
  unitsById: Record<string, Unit>;
  productUnitsByProduct: Record<string, ProductUnit[]>;
  stockMap: Record<string, number>;
  catName: (id?: string | null) => string;
  unitName: (id?: string | null) => string;
  onResetFilters: () => void;
  onOpenDetail: (p: Product) => void;
  onOpenItemCard: (p: Product) => void;
  onOpenOpeningStock: (p: Product) => void;
  onToggleQuickPos: (p: Product) => void;
  onArchive: (p: Product) => void;
  density?: 'compact' | 'medium' | 'relaxed';
  isPharmacy?: boolean;
}

export function ItemTable({
  products,
  isLoading,
  selectedIds,
  toggleSelectAll,
  toggleSelectRow,
  visibleColumns,
  sortField,
  sortDirection,
  onSort,
  brands,
  unitsById,
  productUnitsByProduct,
  stockMap,
  catName,
  unitName,
  onResetFilters,
  onOpenDetail,
  onOpenItemCard,
  onOpenOpeningStock,
  onToggleQuickPos,
  onArchive,
  density = 'medium',
  isPharmacy = false,
}: ItemTableProps) {
  const [copiedSku, setCopiedSku] = React.useState<string | null>(null);

  const handleCopySku = (sku: string) => {
    navigator.clipboard.writeText(sku);
    setCopiedSku(sku);
    toast.success(`تم نسخ الباركود: ${sku}`);
    setTimeout(() => setCopiedSku(null), 2000);
  };

  const rowPadding =
    density === 'compact'
      ? 'py-2 px-3'
      : density === 'relaxed'
      ? 'py-4 px-4'
      : 'py-3 px-3.5';

  // Sort icon indicator
  const renderSortIcon = (field: SortField) => {
    if (sortField !== field || sortDirection === 'none') {
      return <ArrowUpDown className="w-3 h-3 text-slate-400 opacity-60 inline-block mr-1" />;
    }
    if (sortDirection === 'asc') {
      return <ArrowUp className="w-3 h-3 text-emerald-600 inline-block mr-1" />;
    }
    return <ArrowDown className="w-3 h-3 text-emerald-600 inline-block mr-1" />;
  };

  // Stock Badge renderer with clean status & unit breakdown
  const renderStockBadge = (p: Product) => {
    const stock = stockMap[p.id] || 0;
    if (p.item_type !== 'storable') {
      return (
        <Badge
          variant="secondary"
          className="text-[11px] font-bold text-slate-500 bg-slate-100 dark:bg-slate-800 border-0 px-2.5 py-0.5 rounded-full"
        >
          خدمي
        </Badge>
      );
    }

    const baseUName = unitName(p.base_unit_id);
    const secUnits = (productUnitsByProduct[p.id] || []).filter(
      (u) => u.unit_id !== p.base_unit_id && u.level_order !== 1 && (unitsById[u.unit_id]?.name || u.unit_name) !== baseUName
    );

    let stockText = '';
    if (secUnits.length >= 2) {
      // 3 Levels (e.g. علبة + شريط + قرص)
      const u2 = secUnits[0];
      const u3 = secUnits[1];
      const u2Name = unitsById[u2.unit_id]?.name || u2.unit_name || 'شريط';
      const u3Name = unitsById[u3.unit_id]?.name || u3.unit_name || 'قرص';
      const f2 = u2.conversion_factor && u2.conversion_factor > 0 ? u2.conversion_factor : 1;
      const f3 = u3.conversion_factor && u3.conversion_factor > 0 ? u3.conversion_factor : 1;

      if (stock <= 0) {
        stockText = `0 ${baseUName} + 0 ${u2Name}`;
      } else {
        const totalPills = Math.round(stock * f2 * f3);
        const boxes = Math.floor(totalPills / (f2 * f3));
        const remAfterBoxes = totalPills % (f2 * f3);
        const strips = Math.floor(remAfterBoxes / f3);
        const pills = remAfterBoxes % f3;
        if (pills > 0) {
          stockText = `${boxes} ${baseUName} + ${strips} ${u2Name} + ${pills} ${u3Name}`;
        } else {
          stockText = `${boxes} ${baseUName} + ${strips} ${u2Name}`;
        }
      }
    } else if (secUnits.length === 1) {
      // 2 Levels (e.g. علبة + شريط)
      const u2 = secUnits[0];
      const u2Name = unitsById[u2.unit_id]?.name || 'شريط';
      const f2 = u2.conversion_factor && u2.conversion_factor > 0 ? u2.conversion_factor : 1;

      if (stock <= 0) {
        stockText = `0 ${baseUName} + 0 ${u2Name}`;
      } else {
        if (f2 > 1) {
          const totalStrips = Math.round(stock * f2);
          const boxes = Math.floor(totalStrips / f2);
          const strips = totalStrips % f2;
          stockText = `${boxes} ${baseUName} + ${strips} ${u2Name}`;
        } else {
          stockText = `${formatNumber(stock)} ${baseUName}`;
        }
      }
    } else {
      // 1 Level (e.g. علبة)
      if (stock <= 0) {
        stockText = `0 ${baseUName}`;
      } else {
        stockText = `${formatNumber(stock)} ${baseUName}`;
      }
    }

    // Colors matching stock health
    const badgeStyle =
      stock <= 0
        ? 'bg-rose-50/90 text-rose-600 border-rose-200/70 dark:bg-rose-950/30 dark:text-rose-300 dark:border-rose-900/50'
        : stock <= (p.min_stock_alert || 0)
        ? 'bg-amber-50/90 text-amber-700 border-amber-200/70 dark:bg-amber-950/30 dark:text-amber-300 dark:border-amber-900/50'
        : 'bg-emerald-50/90 text-emerald-700 border-emerald-200/70 dark:bg-emerald-950/30 dark:text-emerald-300 dark:border-emerald-900/50';

    return (
      <div
        className={cn(
          'inline-flex items-center justify-center px-3 py-1 rounded-xl border text-xs font-bold transition-all shadow-2xs select-none min-w-[110px]',
          badgeStyle
        )}
      >
        <span>{stockText}</span>
      </div>
    );
  };

  return (
    <div className="bg-white dark:bg-[#111726] rounded-2xl border border-slate-200/80 dark:border-slate-800 overflow-hidden shadow-sm print:border-none">
      <div className="overflow-x-auto">
        <Table className="w-full">
          <TableHeader className="bg-slate-50/90 dark:bg-slate-900/90 border-b border-slate-200/80 dark:border-slate-800 text-right select-none">
            <TableRow>
              {/* Checkbox */}
              <TableHead className="w-12 text-center">
                <Checkbox
                  checked={products.length > 0 && selectedIds.size === products.length}
                  onCheckedChange={toggleSelectAll}
                  aria-label="تحديد جميع الأصناف"
                />
              </TableHead>

              {/* 1. الصنف */}
              <TableHead
                onClick={() => onSort('name')}
                className="text-xs font-black uppercase text-slate-700 dark:text-slate-300 cursor-pointer hover:text-emerald-600 transition-colors min-w-[220px]"
              >
                <div className="flex items-center gap-1">
                  <span>الصنف</span>
                  {renderSortIcon('name')}
                </div>
              </TableHead>

              {/* 2. English Name */}
              {visibleColumns.nameEn && (
                <TableHead
                  onClick={() => onSort('name_en')}
                  className="text-xs font-black uppercase text-slate-700 dark:text-slate-300 cursor-pointer hover:text-emerald-600 transition-colors min-w-[140px]"
                >
                  <div className="flex items-center gap-1">
                    <span>English Name</span>
                    {renderSortIcon('name_en')}
                  </div>
                </TableHead>
              )}

              {/* 3. سعر الشراء */}
              {visibleColumns.purchasePrice && (
                <TableHead
                  onClick={() => onSort('purchase_price')}
                  className="text-xs font-black uppercase text-slate-700 dark:text-slate-300 text-center cursor-pointer hover:text-emerald-600 transition-colors min-w-[110px]"
                >
                  <div className="flex items-center justify-center gap-1">
                    <span>سعر الشراء</span>
                    {renderSortIcon('purchase_price')}
                  </div>
                </TableHead>
              )}

              {/* 4. سعر البيع */}
              {visibleColumns.salePrice && (
                <TableHead
                  onClick={() => onSort('sale_price')}
                  className="text-xs font-black uppercase text-slate-700 dark:text-slate-300 text-center cursor-pointer hover:text-emerald-600 transition-colors min-w-[140px]"
                >
                  <div className="flex items-center justify-center gap-1">
                    <span>سعر البيع</span>
                    {renderSortIcon('sale_price')}
                  </div>
                </TableHead>
              )}

              {/* 5. المخزون الحالي */}
              {visibleColumns.stock && (
                <TableHead
                  onClick={() => onSort('stock')}
                  className="text-xs font-black uppercase text-slate-700 dark:text-slate-300 text-center cursor-pointer hover:text-emerald-600 transition-colors min-w-[140px]"
                >
                  <div className="flex items-center justify-center gap-1">
                    <span>المخزون الحالي</span>
                    {renderSortIcon('stock')}
                  </div>
                </TableHead>
              )}

              {/* 6. المجموعة / القسم */}
              {visibleColumns.category && (
                <TableHead
                  onClick={() => onSort('category')}
                  className="text-xs font-black uppercase text-slate-700 dark:text-slate-300 text-center cursor-pointer hover:text-emerald-600 transition-colors min-w-[120px]"
                >
                  <div className="flex items-center justify-center gap-1">
                    <span>المجموعة</span>
                    {renderSortIcon('category')}
                  </div>
                </TableHead>
              )}

              {/* 7. SKU / الباركود */}
              {visibleColumns.barcode && (
                <TableHead
                  onClick={() => onSort('sku')}
                  className="text-xs font-black uppercase text-slate-700 dark:text-slate-300 text-center cursor-pointer hover:text-emerald-600 transition-colors min-w-[140px]"
                >
                  <div className="flex items-center justify-center gap-1">
                    <span>SKU / الباركود</span>
                    {renderSortIcon('sku')}
                  </div>
                </TableHead>
              )}

              {/* 8. الخيارات */}
              <TableHead className="w-20 text-center text-xs font-black uppercase text-slate-700 dark:text-slate-300">
                الخيارات
              </TableHead>
            </TableRow>
          </TableHeader>

          <TableBody className="text-xs font-bold divide-y divide-slate-100 dark:divide-slate-800/60">
            {isLoading ? (
              Array.from({ length: 6 }).map((_, i) => (
                <TableRow key={i}>
                  <TableCell colSpan={9} className="py-4 px-4">
                    <Skeleton className="h-10 w-full opacity-60 rounded-xl" />
                  </TableCell>
                </TableRow>
              ))
            ) : products.length === 0 ? (
              <TableRow>
                <TableCell colSpan={9} className="py-20 text-center">
                  <div className="flex flex-col items-center gap-3 text-slate-400">
                    <div className="w-14 h-14 rounded-2xl bg-slate-100 dark:bg-slate-800/80 flex items-center justify-center text-slate-400">
                      <Package className="w-7 h-7 opacity-40" />
                    </div>
                    <span className="text-sm font-black text-slate-600 dark:text-slate-300">
                      لا توجد أصناف تطابق شروط التصفية المحددة
                    </span>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={onResetFilters}
                      className="rounded-xl text-xs font-bold cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-800"
                    >
                      إعادة ضبط الفلاتر
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ) : (
              products.map((p) => {
                const baseUName = unitName(p.base_unit_id);
                const secUnits = (productUnitsByProduct[p.id] || []).filter(
                  (u) => u.unit_id !== p.base_unit_id && u.level_order !== 1 && (unitsById[u.unit_id]?.name || u.unit_name) !== baseUName
                );
                const secUnit = secUnits[0];
                const isSelected = selectedIds.has(p.id);
                const brand = p.brand_id ? brands.find((b) => b.id === p.brand_id) : null;

                return (
                  <TableRow
                    key={p.id}
                    className={cn(
                      'hover:bg-slate-50/80 dark:hover:bg-slate-800/50 transition-colors group',
                      isSelected && 'bg-emerald-50/40 dark:bg-emerald-950/20'
                    )}
                  >
                    {/* Checkbox */}
                    <TableCell className={cn('text-center', rowPadding)}>
                      <Checkbox
                        checked={isSelected}
                        onCheckedChange={() => toggleSelectRow(p.id)}
                        aria-label={`تحديد ${p.name}`}
                      />
                    </TableCell>

                    {/* 1. اسم الصنف مع الأيقونة والبيانات الفرعية */}
                    <TableCell className={rowPadding}>
                      <div className="flex items-center gap-3">
                        {/* Product Icon Box */}
                        <div className="w-8 h-8 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200/60 dark:border-emerald-900/60 flex items-center justify-center shrink-0 text-emerald-600 dark:text-emerald-400 group-hover:scale-105 transition-transform shadow-2xs">
                          {isPharmacy ? <Pill className="w-4 h-4" /> : <Package className="w-4 h-4" />}
                        </div>

                        <div className="flex flex-col min-w-0">
                          {/* Name & Quick Badges */}
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <span
                              onClick={() => onOpenDetail(p)}
                              title="اضغط لعرض تفاصيل الصنف"
                              className="font-black text-slate-900 dark:text-white group-hover:text-emerald-600 transition-colors text-sm cursor-pointer hover:underline truncate"
                            >
                              {p.name}
                            </span>

                            {/* Fast Moving Badge */}
                            {p.is_quick_pos && (
                              <Badge className="bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300 border-none text-[10px] font-black h-4 px-1.5 rounded-md flex items-center gap-0.5 shadow-2xs">
                                <Star className="w-2.5 h-2.5 fill-amber-500 text-amber-500" />
                                <span>سريع</span>
                              </Badge>
                            )}

                            {!p.is_active && (
                              <Badge variant="destructive" className="h-4 px-1 text-[9px] font-bold">
                                معطل
                              </Badge>
                            )}
                          </div>

                          {/* Brand / Note subline */}
                          <div className="flex items-center gap-2 text-[11px] text-slate-400 font-medium mt-0.5">
                            {brand && (
                              <span className="flex items-center gap-0.5 text-slate-500 dark:text-slate-400">
                                <Building2 className="w-3 h-3 text-slate-400" />
                                <span>{brand.name}</span>
                              </span>
                            )}
                            {p.item_type !== 'storable' && (
                              <span className="text-[10px] text-blue-500 font-bold">صنف خدمي</span>
                            )}
                          </div>
                        </div>
                      </div>
                    </TableCell>

                    {/* 2. English Name */}
                    {visibleColumns.nameEn && (
                      <TableCell className={cn('text-slate-500 dark:text-slate-400 font-medium font-sans text-xs', rowPadding)}>
                        {p.name_en ? (
                          <span className="truncate block max-w-[180px]">{p.name_en}</span>
                        ) : (
                          <span className="text-slate-300 dark:text-slate-600">—</span>
                        )}
                      </TableCell>
                    )}

                    {/* 3. سعر الشراء */}
                    {visibleColumns.purchasePrice && (
                      <TableCell className={cn('text-center font-mono text-xs text-slate-700 dark:text-slate-300', rowPadding)}>
                        <span className="font-bold">{Number(p.purchase_price || 0).toFixed(2)}</span>{' '}
                        <span className="text-[10px] text-slate-400 font-sans">ج.م</span>
                      </TableCell>
                    )}

                    {/* 4. سعر البيع والوحدات المتعددة (علبة / شريط / قرص) */}
                    {visibleColumns.salePrice && (
                      <TableCell className={cn('text-center', rowPadding)}>
                        <div className="flex flex-col items-center gap-1">
                          {/* Level 1: علبة */}
                          <div className="flex items-center justify-between w-full max-w-[130px] font-mono text-xs px-1">
                            <span className="text-[10px] font-sans font-bold text-slate-400">
                              {unitName(p.base_unit_id)}:
                            </span>
                            <span className="font-bold text-emerald-600 dark:text-emerald-400">
                              {Number(p.sale_price || 0).toFixed(2)}{' '}
                              <span className="text-[9px] font-sans font-medium text-slate-400">ج.م</span>
                            </span>
                          </div>

                          {/* Level 2: شريط */}
                          {secUnits[0] && secUnits[0].sale_price !== undefined && (
                            <div className="flex items-center justify-between w-full max-w-[130px] font-mono text-[11px] px-1">
                              <span className="text-[9px] font-sans font-bold text-slate-400">
                                {unitsById[secUnits[0].unit_id]?.name || secUnits[0].unit_name || 'شريط'}:
                              </span>
                              <span className="font-bold text-emerald-600 dark:text-emerald-400">
                                {Number(secUnits[0].sale_price || 0).toFixed(2)}{' '}
                                <span className="text-[8px] font-sans font-medium text-slate-400">ج.م</span>
                              </span>
                            </div>
                          )}

                          {/* Level 3: قرص / كبسولة */}
                          {secUnits[1] && secUnits[1].sale_price !== undefined && (
                            <div className="flex items-center justify-between w-full max-w-[130px] font-mono text-[10px] px-1">
                              <span className="text-[9px] font-sans font-bold text-slate-400">
                                {unitsById[secUnits[1].unit_id]?.name || secUnits[1].unit_name || 'قرص'}:
                              </span>
                              <span className="font-bold text-emerald-600 dark:text-emerald-400">
                                {Number(secUnits[1].sale_price || 0).toFixed(2)}{' '}
                                <span className="text-[8px] font-sans font-medium text-slate-400">ج.م</span>
                              </span>
                            </div>
                          )}
                        </div>
                      </TableCell>
                    )}

                    {/* 5. المخزون الحالي */}
                    {visibleColumns.stock && (
                      <TableCell className={cn('text-center', rowPadding)}>
                        {renderStockBadge(p)}
                      </TableCell>
                    )}

                    {/* 6. المجموعة / القسم */}
                    {visibleColumns.category && (
                      <TableCell className={cn('text-center', rowPadding)}>
                        <Badge
                          variant="secondary"
                          className={cn(
                            'font-bold text-xs px-2.5 py-1 rounded-xl shadow-2xs border',
                            catName(p.category_id) === 'أدوية'
                              ? 'bg-blue-50/70 text-blue-700 border-blue-200/60 dark:bg-blue-950/40 dark:text-blue-300 dark:border-blue-900/40'
                              : catName(p.category_id) === 'مستلزمات'
                              ? 'bg-purple-50/70 text-purple-700 border-purple-200/60 dark:bg-purple-950/40 dark:text-purple-300 dark:border-purple-900/40'
                              : 'bg-slate-100 text-slate-700 border-slate-200/60 dark:bg-slate-800 dark:text-slate-300'
                          )}
                        >
                          <span>{catName(p.category_id)}</span>
                        </Badge>
                      </TableCell>
                    )}

                    {/* 7. SKU / الباركود */}
                    {visibleColumns.barcode && (
                      <TableCell className={cn('text-center', rowPadding)}>
                        {p.sku ? (
                          <div
                            onClick={() => handleCopySku(p.sku)}
                            title="اضغط لنسخ الباركود"
                            className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-slate-50 dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 text-xs font-mono font-bold text-slate-700 dark:text-slate-300 hover:border-emerald-400 hover:text-emerald-600 transition-all cursor-pointer group/sku"
                          >
                            <Barcode className="w-3.5 h-3.5 text-slate-400 group-hover/sku:text-emerald-500" />
                            <span>{p.sku}</span>
                            {copiedSku === p.sku ? (
                              <Check className="w-3 h-3 text-emerald-600 animate-in zoom-in-50" />
                            ) : (
                              <Copy className="w-3 h-3 text-slate-400 opacity-0 group-hover/sku:opacity-100 transition-opacity" />
                            )}
                          </div>
                        ) : (
                          <span className="text-slate-300 dark:text-slate-600">—</span>
                        )}
                      </TableCell>
                    )}

                    {/* 8. الخيارات (Action Menu) */}
                    <TableCell className={cn('text-center', rowPadding)}>
                      <Popover>
                        <PopoverTrigger asChild>
                          <Button
                            variant="ghost"
                            size="icon"
                            title="خيارات إضافية"
                            className="w-8 h-8 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 dark:hover:text-slate-200 cursor-pointer"
                          >
                            <MoreVertical className="w-4 h-4" />
                          </Button>
                        </PopoverTrigger>
                          <PopoverContent
                            className="w-52 p-1.5 bg-white dark:bg-[#131b2e] border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl z-50 text-right space-y-0.5"
                            dir="rtl"
                          >
                            {/* 1. تفاصيل الصنف */}
                            <button
                              onClick={() => onOpenDetail(p)}
                              className="w-full flex items-center gap-2.5 p-2 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-800 text-xs font-bold text-slate-700 dark:text-slate-200 text-right cursor-pointer"
                            >
                              <Eye className="w-4 h-4 text-blue-500" />
                              <span>تفاصيل الصنف</span>
                            </button>

                            {/* 2. كرت الصنف */}
                            <button
                              onClick={() => onOpenItemCard(p)}
                              className="w-full flex items-center gap-2.5 p-2 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-800 text-xs font-bold text-slate-700 dark:text-slate-200 text-right cursor-pointer"
                            >
                              <IdCard className="w-4 h-4 text-emerald-600" />
                              <span>كرت الصنف</span>
                            </button>

                            {/* 3. طباعة ملصق */}
                            <Link
                              href={`/items/barcode?id=${p.id}`}
                              prefetch={false}
                              className="w-full flex items-center gap-2.5 p-2 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-800 text-xs font-bold text-slate-700 dark:text-slate-200 text-right"
                            >
                              <Barcode className="w-4 h-4 text-indigo-500" />
                              <span>طباعة ملصق</span>
                            </Link>

                            {/* 4. تعديل */}
                            <Link
                              href={`/items/new?edit=${p.id}`}
                              className="w-full flex items-center gap-2.5 p-2 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-800 text-xs font-bold text-slate-700 dark:text-slate-200 text-right"
                            >
                              <Edit className="w-4 h-4 text-amber-500" />
                              <span>تعديل الصنف</span>
                            </Link>

                            {/* 5. إضافة للأصناف السريعة */}
                            <button
                              onClick={() => onToggleQuickPos(p)}
                              className="w-full flex items-center gap-2.5 p-2 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-800 text-xs font-bold text-amber-600 dark:text-amber-400 text-right cursor-pointer"
                            >
                              <Star
                                className={cn('w-4 h-4 text-amber-500', p.is_quick_pos && 'fill-amber-500')}
                              />
                              <span>
                                {p.is_quick_pos ? 'إزالة من الأصناف السريعة' : 'إضافة للأصناف السريعة'}
                              </span>
                            </button>

                            {/* 6. إضافة كميات افتتاحية */}
                            <button
                              onClick={() => onOpenOpeningStock(p)}
                              className="w-full flex items-center gap-2.5 p-2 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-800 text-xs font-bold text-blue-600 dark:text-blue-400 text-right cursor-pointer"
                            >
                              <Boxes className="w-4 h-4 text-blue-500" />
                              <span>إضافة كميات افتتاحية</span>
                            </button>

                            {/* 7. أرشفة / حذف */}
                            <button
                              onClick={() => onArchive(p)}
                              className="w-full flex items-center gap-2.5 p-2 rounded-xl hover:bg-rose-50 dark:hover:bg-rose-950/40 text-xs font-bold text-rose-600 dark:text-rose-400 text-right cursor-pointer border-t border-slate-100 dark:border-slate-800 mt-1 pt-2"
                            >
                              <Trash2 className="w-4 h-4 text-rose-500" />
                              <span>أرشفة / حذف</span>
                            </button>
                          </PopoverContent>
                        </Popover>
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
