'use client';

import React from 'react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Printer,
  FileSpreadsheet,
  FileText,
  SlidersHorizontal,
  Search,
  Barcode,
  Menu,
  RefreshCw,
} from 'lucide-react';
import type { VisibleColumns } from './types';

interface ItemTableToolbarProps {
  onPrint: () => void;
  onExportCsv: () => void;
  onForceSync?: () => void;
  visibleColumns: VisibleColumns;
  setVisibleColumns: React.Dispatch<React.SetStateAction<VisibleColumns>>;
  pageSize: number;
  setPageSize: (size: number) => void;
  density: 'compact' | 'medium' | 'relaxed';
  setDensity: (d: 'compact' | 'medium' | 'relaxed') => void;
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  totalFiltered: number;
}

export function ItemTableToolbar({
  onPrint,
  onExportCsv,
  onForceSync,
  visibleColumns,
  setVisibleColumns,
  pageSize,
  setPageSize,
  density,
  setDensity,
  searchQuery,
  setSearchQuery,
  totalFiltered,
}: ItemTableToolbarProps) {
  return (
    <div className="bg-white dark:bg-[#131b2e] rounded-2xl border border-slate-200/80 dark:border-slate-800 p-3 shadow-xs flex flex-col md:flex-row items-center justify-between gap-3">
      {/* Right side in RTL (Left side visually): Print, CSV, Excel, Layout, Columns, Page Size */}
      <div className="flex flex-wrap items-center gap-2 w-full md:w-auto">
        {/* Re-sync / Refresh Button */}
        {onForceSync && (
          <Button
            variant="outline"
            size="icon"
            onClick={onForceSync}
            title="إعادة مزامنة الأصناف كاملة من السحابة"
            className="w-9 h-9 rounded-xl text-blue-600 dark:text-blue-400 border-blue-200 dark:border-blue-800 hover:bg-blue-50 dark:hover:bg-blue-950/40 shadow-2xs"
          >
            <RefreshCw className="w-4 h-4" />
          </Button>
        )}

        {/* Print Button */}
        <Button
          variant="outline"
          size="icon"
          onClick={onPrint}
          title="طباعة الجدول"
          className="w-9 h-9 rounded-xl text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:bg-slate-50 shadow-2xs"
        >
          <Printer className="w-4 h-4" />
        </Button>

        {/* CSV Export Button */}
        <Button
          variant="outline"
          size="icon"
          onClick={onExportCsv}
          title="تصدير إلى CSV"
          className="w-9 h-9 rounded-xl text-emerald-600 border-emerald-200 hover:bg-emerald-50 dark:border-emerald-800 dark:hover:bg-emerald-950/40 shadow-2xs"
        >
          <FileText className="w-4 h-4" />
        </Button>

        {/* Excel Export Button */}
        <Button
          variant="outline"
          size="icon"
          onClick={onExportCsv}
          title="تصدير إلى Excel"
          className="w-9 h-9 rounded-xl text-emerald-700 border-emerald-300 hover:bg-emerald-100/60 dark:border-emerald-700 dark:hover:bg-emerald-950 shadow-2xs"
        >
          <FileSpreadsheet className="w-4 h-4" />
        </Button>

        {/* Table Density Popover matching Screenshot 2 */}
        <Popover>
          <PopoverTrigger asChild>
            <Button
              variant="outline"
              size="icon"
              title="تغيير كثافة الجدول"
              className="w-9 h-9 rounded-xl text-slate-500 border-slate-200 dark:border-slate-700 hover:bg-slate-50 shadow-2xs"
            >
              <Menu className="w-4 h-4" />
            </Button>
          </PopoverTrigger>
          <PopoverContent
            className="w-44 p-1.5 bg-white dark:bg-[#131b2e] border border-slate-200 dark:border-slate-800 rounded-2xl shadow-xl z-50 text-right space-y-1"
            dir="rtl"
          >
            <button
              onClick={() => setDensity('compact')}
              className={cn(
                'w-full flex items-center justify-between p-2 rounded-xl text-xs font-bold transition-colors cursor-pointer',
                density === 'compact'
                  ? 'bg-blue-50 text-blue-600 dark:bg-blue-950/50 dark:text-blue-400 font-black'
                  : 'hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200'
              )}
            >
              <span>مكثف (صغير)</span>
              <Menu className="w-3.5 h-3.5 opacity-60" />
            </button>

            <button
              onClick={() => setDensity('medium')}
              className={cn(
                'w-full flex items-center justify-between p-2 rounded-xl text-xs font-bold transition-colors cursor-pointer',
                density === 'medium'
                  ? 'bg-blue-50 text-blue-600 dark:bg-blue-950/50 dark:text-blue-400 font-black'
                  : 'hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200'
              )}
            >
              <span>متوسط (قياسي)</span>
              <Menu className="w-4 h-4 text-blue-600" />
            </button>

            <button
              onClick={() => setDensity('relaxed')}
              className={cn(
                'w-full flex items-center justify-between p-2 rounded-xl text-xs font-bold transition-colors cursor-pointer',
                density === 'relaxed'
                  ? 'bg-blue-50 text-blue-600 dark:bg-blue-950/50 dark:text-blue-400 font-black'
                  : 'hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200'
              )}
            >
              <span>مريح (واسع)</span>
              <Menu className="w-5 h-5 opacity-60" />
            </button>
          </PopoverContent>
        </Popover>

        {/* Column customizer popover */}
        <Popover>
          <PopoverTrigger asChild>
            <Button
              variant="outline"
              size="sm"
              className="h-9 px-3 text-xs font-black rounded-xl border-slate-200 dark:border-slate-700 gap-1.5 text-slate-600 dark:text-slate-300 shadow-2xs"
            >
              <SlidersHorizontal className="w-3.5 h-3.5" />
              <span>تخصيص الأعمدة</span>
            </Button>
          </PopoverTrigger>
          <PopoverContent
            className="w-56 p-3 bg-white dark:bg-[#131b2e] border border-slate-200 dark:border-slate-800 rounded-2xl shadow-xl z-50 text-right"
            dir="rtl"
          >
            <h4 className="text-xs font-black text-slate-900 dark:text-white mb-2 pb-1.5 border-b border-slate-100 dark:border-slate-800">
              إظهار وإخفاء الأعمدة
            </h4>
            <div className="space-y-2 text-xs font-bold">
              <label className="flex items-center gap-2 cursor-pointer">
                <Checkbox
                  checked={visibleColumns.nameEn}
                  onCheckedChange={(c) => setVisibleColumns((p) => ({ ...p, nameEn: !!c }))}
                />
                <span>English Name</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <Checkbox
                  checked={visibleColumns.purchasePrice}
                  onCheckedChange={(c) => setVisibleColumns((p) => ({ ...p, purchasePrice: !!c }))}
                />
                <span>سعر الشراء</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <Checkbox
                  checked={visibleColumns.salePrice}
                  onCheckedChange={(c) => setVisibleColumns((p) => ({ ...p, salePrice: !!c }))}
                />
                <span>سعر البيع</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <Checkbox
                  checked={visibleColumns.stock}
                  onCheckedChange={(c) => setVisibleColumns((p) => ({ ...p, stock: !!c }))}
                />
                <span>المخزون الحالي</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <Checkbox
                  checked={visibleColumns.category}
                  onCheckedChange={(c) => setVisibleColumns((p) => ({ ...p, category: !!c }))}
                />
                <span>المجموعة</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <Checkbox
                  checked={visibleColumns.barcode}
                  onCheckedChange={(c) => setVisibleColumns((p) => ({ ...p, barcode: !!c }))}
                />
                <span>الباركود / SKU</span>
              </label>
            </div>
          </PopoverContent>
        </Popover>

        {/* Page size select */}
        <div className="flex items-center gap-1.5 mr-2">
          <span className="text-[11px] font-bold text-slate-400">عرض</span>
          <Select value={String(pageSize)} onValueChange={(val) => setPageSize(Number(val))}>
            <SelectTrigger className="h-9 w-20 rounded-xl bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-xs font-mono font-black">
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="bg-white dark:bg-[#131b2e] border border-slate-200 dark:border-slate-800 rounded-xl shadow-lg z-50">
              <SelectItem value="25">25</SelectItem>
              <SelectItem value="50">50</SelectItem>
              <SelectItem value="100">100</SelectItem>
            </SelectContent>
          </Select>
          <span className="text-[11px] font-bold text-slate-400">إدخالات</span>
        </div>
      </div>

      {/* Left side in RTL (Right side visually): Fast Search & Barcode Icon matching Image 4 */}
      <div className="relative w-full md:w-80">
        <div className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none">
          <Barcode className="w-4 h-4 text-slate-400" />
        </div>

        <Input
          type="text"
          placeholder="بحث سريع في الجدول..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="h-10 pr-10 pl-24 bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-xs font-bold rounded-xl focus:border-[#558b2f]"
        />

        <div className="absolute left-2.5 top-1/2 -translate-y-1/2 flex items-center gap-1.5">
          <Badge className="bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 text-[10px] font-mono font-black h-5 px-1.5 flex items-center gap-1">
            <Search className="w-3 h-3 text-emerald-600" />
            <span>{totalFiltered}</span>
          </Badge>
        </div>
      </div>
    </div>
  );
}
