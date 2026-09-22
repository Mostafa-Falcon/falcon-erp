'use client';

import React from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Clock,
  Printer,
  FileSpreadsheet,
  FileText,
  Menu,
  SlidersHorizontal,
  Search,
  Barcode,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
} from 'lucide-react';
import { formatNumber, formatDateTime } from '@/lib/format';
import { cn } from '@/lib/utils';
import type { InventoryTransaction } from '@/types';
import {
  TableDensity,
  MovementColumnsState,
  TRANSACTION_TYPE_LABELS,
} from './types';

interface MovementsTabProps {
  density: TableDensity;
  setDensity: (d: TableDensity) => void;
  movementColumns: MovementColumnsState;
  setMovementColumns: React.Dispatch<React.SetStateAction<MovementColumnsState>>;
  searchQuery: string;
  setSearchQuery: (q: string) => void;
  pageSize: number;
  setPageSize: (s: number) => void;
  currentPage: number;
  setCurrentPage: React.Dispatch<React.SetStateAction<number>>;
  totalPages: number;
  filteredTransactions: InventoryTransaction[];
  paginatedTransactions: InventoryTransaction[];
  handleTxSort: (field: 'created_at' | 'quantity' | 'total_cost' | 'transaction_type') => void;
  exportMovementsToCsv: () => void;
  baseUName: string;
  rowPadding: string;
  creatorName?: string;
}

export function MovementsTab({
  density,
  setDensity,
  movementColumns,
  setMovementColumns,
  searchQuery,
  setSearchQuery,
  pageSize,
  setPageSize,
  currentPage,
  setCurrentPage,
  totalPages,
  filteredTransactions,
  paginatedTransactions,
  handleTxSort,
  exportMovementsToCsv,
  baseUName,
  rowPadding,
  creatorName,
}: MovementsTabProps) {
  return (
    <div className="space-y-3">
      {/* Toolbar matching Screenshots 2, 3 */}
      <div className="bg-white dark:bg-[#131b2e] rounded-2xl border border-slate-200/80 dark:border-slate-800 p-3 shadow-xs flex flex-col md:flex-row items-center justify-between gap-3">
        <div className="flex items-center gap-2 w-full md:w-auto">
          {/* Print */}
          <Button
            variant="outline"
            size="icon"
            onClick={() => window.print()}
            title="طباعة"
            className="w-9 h-9 rounded-xl text-slate-600 border-slate-200 dark:border-slate-700 cursor-pointer"
          >
            <Printer className="w-4 h-4" />
          </Button>

          {/* CSV */}
          <Button
            variant="outline"
            size="icon"
            onClick={exportMovementsToCsv}
            title="تصدير ملف CSV"
            className="w-9 h-9 rounded-xl text-emerald-600 border-emerald-200 hover:bg-emerald-50 dark:hover:bg-emerald-950/40 cursor-pointer"
          >
            <FileText className="w-4 h-4" />
          </Button>

          {/* Excel */}
          <Button
            variant="outline"
            size="icon"
            onClick={exportMovementsToCsv}
            title="تصدير إكسل Excel"
            className="w-9 h-9 rounded-xl text-emerald-700 border-emerald-300 hover:bg-emerald-50 dark:hover:bg-emerald-950/40 cursor-pointer"
          >
            <FileSpreadsheet className="w-4 h-4" />
          </Button>

          {/* Density Popover matching Screenshot 2 */}
          <Popover>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                size="icon"
                title="تغيير كثافة الجدول"
                className="w-9 h-9 rounded-xl text-slate-500 border-slate-200 dark:border-slate-700 cursor-pointer"
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

          {/* Column Customizer matching Screenshot 3 */}
          <Popover>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                size="sm"
                className="h-9 px-3 text-xs font-black rounded-xl border-slate-200 dark:border-slate-700 gap-1.5 text-slate-600 dark:text-slate-300 shadow-2xs cursor-pointer"
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
                تخصيص الأعمدة
              </h4>
              <div className="space-y-2 text-xs font-bold">
                <label className="flex items-center gap-2 cursor-pointer">
                  <Checkbox
                    checked={movementColumns.type}
                    onCheckedChange={(c) => setMovementColumns((p) => ({ ...p, type: !!c }))}
                  />
                  <span>نوع الحركة</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <Checkbox
                    checked={movementColumns.datetime}
                    onCheckedChange={(c) => setMovementColumns((p) => ({ ...p, datetime: !!c }))}
                  />
                  <span>التاريخ والوقت</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <Checkbox
                    checked={movementColumns.quantity}
                    onCheckedChange={(c) => setMovementColumns((p) => ({ ...p, quantity: !!c }))}
                  />
                  <span>الكمية</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <Checkbox
                    checked={movementColumns.prices}
                    onCheckedChange={(c) => setMovementColumns((p) => ({ ...p, prices: !!c }))}
                  />
                  <span>الأسعار والخصم</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <Checkbox
                    checked={movementColumns.reference}
                    onCheckedChange={(c) => setMovementColumns((p) => ({ ...p, reference: !!c }))}
                  />
                  <span>المصدر / التاريخ</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <Checkbox
                    checked={movementColumns.creator}
                    onCheckedChange={(c) => setMovementColumns((p) => ({ ...p, creator: !!c }))}
                  />
                  <span>بواسطة</span>
                </label>
              </div>
            </PopoverContent>
          </Popover>

          {/* Page Size */}
          <div className="flex items-center gap-1.5 mr-2">
            <span className="text-[11px] font-bold text-slate-400">عرض</span>
            <Select value={String(pageSize)} onValueChange={(v) => setPageSize(Number(v))}>
              <SelectTrigger className="h-9 w-20 rounded-xl bg-slate-50 dark:bg-slate-900 text-xs font-mono font-black">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="25">25</SelectItem>
                <SelectItem value="50">50</SelectItem>
                <SelectItem value="100">100</SelectItem>
              </SelectContent>
            </Select>
            <span className="text-[11px] font-bold text-slate-400">إدخالات</span>
          </div>
        </div>

        {/* Search Box with Badge and Barcode matching Screenshot 3 & 4 */}
        <div className="relative w-full md:w-80">
          <div className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none">
            <Barcode className="w-4 h-4" />
          </div>
          <Input
            type="text"
            placeholder="بحث سريع في الجدول..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="h-10 pr-9 pl-20 bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-xs font-bold rounded-xl"
          />
          <div className="absolute left-2.5 top-1/2 -translate-y-1/2">
            <Badge className="bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300 border border-emerald-200 text-[10px] font-mono font-black h-5 px-1.5 flex items-center gap-1">
              <Search className="w-3 h-3 text-emerald-600" />
              <span>{filteredTransactions.length}</span>
            </Badge>
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white dark:bg-[#131b2e] rounded-2xl border border-slate-200/80 dark:border-slate-800 overflow-hidden shadow-md">
        <Table>
          <TableHeader className="bg-slate-50/90 dark:bg-slate-900/90 border-b border-slate-200/80 dark:border-slate-800">
            <TableRow>
              {movementColumns.type && (
                <TableHead
                  onClick={() => handleTxSort('transaction_type')}
                  className="text-[11px] font-black uppercase cursor-pointer select-none hover:text-blue-600 transition-colors"
                >
                  <div className="flex items-center gap-1">
                    <span>نوع الحركة</span>
                    <span className="text-[10px] text-slate-400">⇅</span>
                  </div>
                </TableHead>
              )}
              {movementColumns.datetime && (
                <TableHead
                  onClick={() => handleTxSort('created_at')}
                  className="text-[11px] font-black uppercase cursor-pointer select-none hover:text-blue-600 transition-colors"
                >
                  <div className="flex items-center gap-1">
                    <span>التاريخ والوقت</span>
                    <span className="text-[10px] text-slate-400">⇅</span>
                  </div>
                </TableHead>
              )}
              {movementColumns.quantity && (
                <TableHead
                  onClick={() => handleTxSort('quantity')}
                  className="text-[11px] font-black uppercase text-center cursor-pointer select-none hover:text-blue-600 transition-colors"
                >
                  <div className="flex items-center justify-center gap-1">
                    <span>الكمية</span>
                    <span className="text-[10px] text-slate-400">⇅</span>
                  </div>
                </TableHead>
              )}
              {movementColumns.prices && (
                <TableHead
                  onClick={() => handleTxSort('total_cost')}
                  className="text-[11px] font-black uppercase text-center cursor-pointer select-none hover:text-blue-600 transition-colors"
                >
                  <div className="flex items-center justify-center gap-1">
                    <span>الأسعار والخصم</span>
                    <span className="text-[10px] text-slate-400">⇅</span>
                  </div>
                </TableHead>
              )}
              {movementColumns.reference && (
                <TableHead className="text-[11px] font-black uppercase text-center">المصدر / التاريخ ⇅</TableHead>
              )}
              {movementColumns.creator && (
                <TableHead className="text-[11px] font-black uppercase text-left">بواسطة ⇅</TableHead>
              )}
            </TableRow>
          </TableHeader>
          <TableBody className="text-xs font-bold divide-y divide-slate-100 dark:divide-slate-800/80">
            {paginatedTransactions.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="py-20 text-center text-slate-400">
                  <Clock className="w-10 h-10 opacity-20 mx-auto mb-2" />
                  <span>لا توجد حركات مخزنية مسجلة لهذا الصنف حتى الآن.</span>
                </TableCell>
              </TableRow>
            ) : (
              paginatedTransactions.map((tx) => {
                const typeMeta = TRANSACTION_TYPE_LABELS[tx.transaction_type] || {
                  label: tx.transaction_type,
                  color: 'bg-slate-100 text-slate-700',
                };
                return (
                  <TableRow key={tx.id} className="hover:bg-slate-50/70 dark:hover:bg-slate-800/40">
                    {/* نوع الحركة */}
                    {movementColumns.type && (
                      <TableCell className={rowPadding}>
                        <Badge
                          variant="secondary"
                          className={cn('text-[10px] font-bold px-2.5 py-0.5 rounded-full border-none', typeMeta.color)}
                        >
                          {typeMeta.label}
                        </Badge>
                      </TableCell>
                    )}

                    {/* التاريخ والوقت */}
                    {movementColumns.datetime && (
                      <TableCell className={cn(rowPadding, 'text-slate-500 font-mono text-[11px]')}>
                        {formatDateTime(tx.created_at)}
                      </TableCell>
                    )}

                    {/* الكمية */}
                    {movementColumns.quantity && (
                      <TableCell className={cn(rowPadding, 'text-center font-mono font-black text-slate-900 dark:text-white')}>
                        {formatNumber(tx.level_quantity ?? tx.quantity)}{' '}
                        <span className="text-slate-500 font-bold">{tx.unit_name || baseUName}</span>
                      </TableCell>
                    )}

                    {/* الأسعار والخصم */}
                    {movementColumns.prices && (
                      <TableCell className={cn(rowPadding, 'text-center font-mono font-bold text-slate-700 dark:text-slate-300')}>
                        {formatNumber(tx.total_cost || tx.unit_cost * tx.quantity)} ج.م
                      </TableCell>
                    )}

                    {/* المصدر / الكود */}
                    {movementColumns.reference && (
                      <TableCell className={cn(rowPadding, 'text-center font-mono text-slate-500 text-[11px]')}>
                        {tx.reference_id || 'OS-MANUAL'}
                      </TableCell>
                    )}

                    {/* بواسطة */}
                    {movementColumns.creator && (
                      <TableCell className={cn(rowPadding, 'text-left font-sans text-slate-600 dark:text-slate-300')}>
                        {creatorName || 'النظام'}
                      </TableCell>
                    )}
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>

        {/* Bottom Pagination matching Screenshot 2 */}
        <div className="p-4 border-t border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/40 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs font-bold">
          <span className="text-slate-500">
            عرض {filteredTransactions.length === 0 ? 0 : (currentPage - 1) * pageSize + 1} إلى{' '}
            {Math.min(currentPage * pageSize, filteredTransactions.length)} من إجمالي {filteredTransactions.length} حركة
          </span>

          <div className="flex items-center gap-1.5" dir="ltr">
            <Button
              variant="outline"
              size="icon"
              onClick={() => setCurrentPage(1)}
              disabled={currentPage === 1}
              className="w-8 h-8 rounded-lg cursor-pointer"
            >
              <ChevronsLeft className="w-4 h-4" />
            </Button>
            <Button
              variant="outline"
              size="icon"
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              disabled={currentPage === 1}
              className="w-8 h-8 rounded-lg cursor-pointer"
            >
              <ChevronLeft className="w-4 h-4" />
            </Button>
            <div className="px-3 py-1 bg-white dark:bg-[#131b2e] border border-slate-200 dark:border-slate-700 rounded-lg text-xs font-mono font-black">
              {currentPage} / {totalPages}
            </div>
            <Button
              variant="outline"
              size="icon"
              onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
              disabled={currentPage >= totalPages}
              className="w-8 h-8 rounded-lg cursor-pointer"
            >
              <ChevronRight className="w-4 h-4" />
            </Button>
            <Button
              variant="outline"
              size="icon"
              onClick={() => setCurrentPage(totalPages)}
              disabled={currentPage >= totalPages}
              className="w-8 h-8 rounded-lg cursor-pointer"
            >
              <ChevronsRight className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
