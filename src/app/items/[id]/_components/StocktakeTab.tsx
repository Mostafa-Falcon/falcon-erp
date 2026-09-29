'use client';

import React from'react';
import Link from'next/link';
import { Button } from'@/components/ui/button';
import { Badge } from'@/components/ui/badge';
import { Input } from'@/components/ui/input';
import { Checkbox } from'@/components/ui/checkbox';
import {
 Popover,
 PopoverContent,
 PopoverTrigger,
} from'@/components/ui/popover';
import {
 Table,
 TableBody,
 TableCell,
 TableHead,
 TableHeader,
 TableRow,
} from'@/components/ui/table';
import {
 Select,
 SelectContent,
 SelectItem,
 SelectTrigger,
 SelectValue,
} from'@/components/ui/select';
import {
 Printer,
 FileSpreadsheet,
 FileText,
 Menu,
 SlidersHorizontal,
 Search,
 Barcode,
 ClipboardList,
 ChevronLeft,
 ChevronRight,
 ChevronsLeft,
 ChevronsRight,
} from'lucide-react';
import { formatNumber, formatDateTime } from'@/lib/format';
import { cn } from'@/lib/utils';
import type { TableDensity, StocktakeColumnsState, StocktakeRecord } from'./types';

interface StocktakeTabProps {
 density: TableDensity;
 setDensity: (d: TableDensity) => void;
 stocktakeColumns: StocktakeColumnsState;
 setStocktakeColumns: React.Dispatch<React.SetStateAction<StocktakeColumnsState>>;
 stSearch: string;
 setStSearch: (q: string) => void;
 stPageSize: number;
 setStPageSize: (s: number) => void;
 stCurrentPage: number;
 setStCurrentPage: React.Dispatch<React.SetStateAction<number>>;
 stTotalPages: number;
 filteredStocktake: StocktakeRecord[];
 paginatedStocktake: StocktakeRecord[];
 handleStSort: (field:'session_number'|'created_at'|'system_quantity'|'actual_quantity') => void;
 exportStocktakeToCsv: () => void;
 baseUName: string;
 rowPadding: string;
}

export function StocktakeTab({
 density,
 setDensity,
 stocktakeColumns,
 setStocktakeColumns,
 stSearch,
 setStSearch,
 stPageSize,
 setStPageSize,
 stCurrentPage,
 setStCurrentPage,
 stTotalPages,
 filteredStocktake,
 paginatedStocktake,
 handleStSort,
 exportStocktakeToCsv,
 baseUName,
 rowPadding,
}: StocktakeTabProps) {
 return (
 <div className="space-y-3">
 {/* Toolbar matching Screenshot 2 */}
 <div className="bg-surface rounded-2xl border border-slate-200/80 dark:border-slate-800 p-3 shadow-xs flex flex-col md:flex-row items-center justify-between gap-3">
 <div className="flex items-center gap-2 w-full md:w-auto">
 {/* Print */}
 <Button
 variant="outline"
 size="icon"
 onClick={() => window.print()}
 title="طباعة"
 className="w-9 h-9 rounded-xl text-slate-600 border-slate-200 dark:border-slate-700 cursor-pointer"
 >
 <Printer className="w-4 h-4"/>
 </Button>

 {/* CSV */}
 <Button
 variant="outline"
 size="icon"
 onClick={exportStocktakeToCsv}
 title="تصدير ملف CSV"
 className="w-9 h-9 rounded-xl text-emerald-600 border-emerald-200 hover:bg-emerald-50 dark:hover:bg-emerald-950/40 cursor-pointer"
 >
 <FileText className="w-4 h-4"/>
 </Button>

 {/* Excel */}
 <Button
 variant="outline"
 size="icon"
 onClick={exportStocktakeToCsv}
 title="تصدير إكسل Excel"
 className="w-9 h-9 rounded-xl text-emerald-700 border-emerald-300 hover:bg-emerald-50 dark:hover:bg-emerald-950/40 cursor-pointer"
 >
 <FileSpreadsheet className="w-4 h-4"/>
 </Button>

 {/* Density Popover */}
 <Popover>
 <PopoverTrigger asChild>
 <Button
 variant="outline"
 size="icon"
 title="تغيير كثافة الجدول"
 className="w-9 h-9 rounded-xl text-slate-500 border-slate-200 dark:border-slate-700 cursor-pointer"
 >
 <Menu className="w-4 h-4"/>
 </Button>
 </PopoverTrigger>
 <PopoverContent
 className="w-44 p-1.5 bg-surface border border-slate-200 dark:border-slate-800 rounded-2xl shadow-xl z-50 text-right space-y-1"
 dir="rtl"
 >
 <button
 onClick={() => setDensity('compact')}
 className={cn(
'w-full flex items-center justify-between p-2 rounded-xl text-xs font-bold transition-colors cursor-pointer',
 density ==='compact'?'bg-blue-50 text-blue-600 font-black':'text-slate-700'
 )}
 >
 <span>مكثف (صغير)</span>
 </button>
 <button
 onClick={() => setDensity('medium')}
 className={cn(
'w-full flex items-center justify-between p-2 rounded-xl text-xs font-bold transition-colors cursor-pointer',
 density ==='medium'?'bg-blue-50 text-blue-600 font-black':'text-slate-700'
 )}
 >
 <span>متوسط (قياسي)</span>
 </button>
 <button
 onClick={() => setDensity('relaxed')}
 className={cn(
'w-full flex items-center justify-between p-2 rounded-xl text-xs font-bold transition-colors cursor-pointer',
 density ==='relaxed'?'bg-blue-50 text-blue-600 font-black':'text-slate-700'
 )}
 >
 <span>مريح (واسع)</span>
 </button>
 </PopoverContent>
 </Popover>

 {/* Column Customizer matching Screenshot 2 */}
 <Popover>
 <PopoverTrigger asChild>
 <Button
 variant="outline"
 size="sm"
 className="h-9 px-3 text-xs font-black rounded-xl border-slate-200 dark:border-slate-700 gap-1.5 text-slate-600 dark:text-slate-300 shadow-2xs cursor-pointer"
 >
 <SlidersHorizontal className="w-3.5 h-3.5"/>
 <span>تخصيص الأعمدة</span>
 </Button>
 </PopoverTrigger>
 <PopoverContent
 className="w-56 p-3 bg-surface border border-slate-200 dark:border-slate-800 rounded-2xl shadow-xl z-50 text-right"
 dir="rtl"
 >
 <h4 className="text-xs font-black text-slate-900 dark:text-white mb-2 pb-1.5 border-b border-slate-100 dark:border-slate-800">
 تخصيص الأعمدة
 </h4>
 <div className="space-y-2 text-xs font-bold">
 <label className="flex items-center gap-2 cursor-pointer">
 <Checkbox
 checked={stocktakeColumns.reference}
 onCheckedChange={(c) => setStocktakeColumns((p) => ({ ...p, reference: !!c }))}
 />
 <span>الرقم المرجعي</span>
 </label>
 <label className="flex items-center gap-2 cursor-pointer">
 <Checkbox
 checked={stocktakeColumns.datetime}
 onCheckedChange={(c) => setStocktakeColumns((p) => ({ ...p, datetime: !!c }))}
 />
 <span>التاريخ والوقت</span>
 </label>
 <label className="flex items-center gap-2 cursor-pointer">
 <Checkbox
 checked={stocktakeColumns.previous_quantity}
 onCheckedChange={(c) => setStocktakeColumns((p) => ({ ...p, previous_quantity: !!c }))}
 />
 <span>الكمية السابقة</span>
 </label>
 <label className="flex items-center gap-2 cursor-pointer">
 <Checkbox
 checked={stocktakeColumns.adjusted_quantity}
 onCheckedChange={(c) => setStocktakeColumns((p) => ({ ...p, adjusted_quantity: !!c }))}
 />
 <span>الكمية المسواة</span>
 </label>
 <label className="flex items-center gap-2 cursor-pointer">
 <Checkbox
 checked={stocktakeColumns.creator}
 onCheckedChange={(c) => setStocktakeColumns((p) => ({ ...p, creator: !!c }))}
 />
 <span>بواسطة</span>
 </label>
 </div>
 </PopoverContent>
 </Popover>

 {/* Page Size */}
 <div className="flex items-center gap-1.5 mr-2">
 <span className="text-2xs font-bold text-slate-400">عرض</span>
 <Select value={String(stPageSize)} onValueChange={(v) => setStPageSize(Number(v))}>
 <SelectTrigger className="h-9 w-20 rounded-xl bg-slate-50 dark:bg-slate-900 text-xs font-mono font-black">
 <SelectValue />
 </SelectTrigger>
 <SelectContent>
 <SelectItem value="25">25</SelectItem>
 <SelectItem value="50">50</SelectItem>
 <SelectItem value="100">100</SelectItem>
 </SelectContent>
 </Select>
 <span className="text-2xs font-bold text-slate-400">إدخالات</span>
 </div>
 </div>

 {/* Search */}
 <div className="relative w-full md:w-80">
 <div className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none">
 <Barcode className="w-4 h-4"/>
 </div>
 <Input
 type="text"
 placeholder="بحث سريع في الجدول..."
 value={stSearch}
 onChange={(e) => setStSearch(e.target.value)}
 className="h-10 pr-9 pl-20 bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-xs font-bold rounded-xl"
 />
 <div className="absolute left-2.5 top-1/2 -translate-y-1/2">
 <Badge className="bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300 border border-emerald-200 text-3xs font-mono font-black h-5 px-1.5 flex items-center gap-1">
 <Search className="w-3 h-3 text-emerald-600"/>
 <span>{filteredStocktake.length}</span>
 </Badge>
 </div>
 </div>
 </div>

 {/* Table matching Screenshot 2 */}
 <div className="bg-surface rounded-2xl border border-slate-200/80 dark:border-slate-800 overflow-hidden shadow-md">
 <Table>
 <TableHeader className="bg-slate-50/90 dark:bg-slate-900/90 border-b border-slate-200/80 dark:border-slate-800">
 <TableRow>
 {stocktakeColumns.reference && (
 <TableHead
 onClick={() => handleStSort('session_number')}
 className="text-2xs font-black uppercase text-right cursor-pointer select-none hover:text-blue-600 transition-colors"
 >
 <div className="flex items-center gap-1">
 <span>الرقم المرجعي</span>
 <span className="text-3xs text-slate-400">⇅</span>
 </div>
 </TableHead>
 )}
 {stocktakeColumns.datetime && (
 <TableHead
 onClick={() => handleStSort('created_at')}
 className="text-2xs font-black uppercase text-right cursor-pointer select-none hover:text-blue-600 transition-colors"
 >
 <div className="flex items-center gap-1">
 <span>التاريخ والوقت</span>
 <span className="text-3xs text-slate-400">⇅</span>
 </div>
 </TableHead>
 )}
 {stocktakeColumns.previous_quantity && (
 <TableHead
 onClick={() => handleStSort('system_quantity')}
 className="text-2xs font-black uppercase text-center cursor-pointer select-none hover:text-blue-600 transition-colors"
 >
 <div className="flex items-center justify-center gap-1">
 <span>الكمية السابقة</span>
 <span className="text-3xs text-slate-400">⇅</span>
 </div>
 </TableHead>
 )}
 {stocktakeColumns.adjusted_quantity && (
 <TableHead
 onClick={() => handleStSort('actual_quantity')}
 className="text-2xs font-black uppercase text-center cursor-pointer select-none hover:text-blue-600 transition-colors"
 >
 <div className="flex items-center justify-center gap-1">
 <span>الكمية المسواة</span>
 <span className="text-3xs text-slate-400">⇅</span>
 </div>
 </TableHead>
 )}
 {stocktakeColumns.creator && (
 <TableHead className="text-2xs font-black uppercase text-left">بواسطة ⇅</TableHead>
 )}
 </TableRow>
 </TableHeader>
 <TableBody className="text-xs font-bold divide-y divide-slate-100 dark:divide-slate-800/80">
 {paginatedStocktake.length === 0 ? (
 <TableRow>
 <TableCell colSpan={5} className="py-20 text-center">
 {/* Empty state exactly matching Screenshot 2 */}
 <div className="flex flex-col items-center justify-center space-y-3">
 <div className="w-16 h-16 rounded-3xl bg-blue-50/80 dark:bg-blue-950/50 border border-blue-100 dark:border-blue-900/60 flex items-center justify-center text-blue-600 shadow-xs">
 <ClipboardList className="w-8 h-8 text-blue-500"/>
 </div>
 <div className="space-y-1">
 <h4 className="text-base font-black text-slate-800 dark:text-white">لا توجد عمليات جرد</h4>
 <p className="text-xs text-slate-400 font-medium">
 لم يتم إجراء أي عمليات جرد مسجلة لهذا الصنف.
 </p>
 </div>
 <Link href="/inventory/adjustments">
 <Button size="sm"variant="outline"className="mt-2 rounded-xl text-xs font-bold cursor-pointer">
 الانتقال لجلسات الجرد
 </Button>
 </Link>
 </div>
 </TableCell>
 </TableRow>
 ) : (
 paginatedStocktake.map((st) => (
 <TableRow key={st.id} className="hover:bg-slate-50/70 dark:hover:bg-slate-800/40">
 {/* الرقم المرجعي */}
 {stocktakeColumns.reference && (
 <TableCell className={cn(rowPadding,'font-mono font-bold text-slate-800 dark:text-slate-200 text-right')}>
 {st.session_number}
 </TableCell>
 )}

 {/* التاريخ والوقت */}
 {stocktakeColumns.datetime && (
 <TableCell className={cn(rowPadding,'text-slate-500 font-mono text-2xs text-right')}>
 {formatDateTime(st.created_at)}
 </TableCell>
 )}

 {/* الكمية السابقة */}
 {stocktakeColumns.previous_quantity && (
 <TableCell className={cn(rowPadding,'text-center font-mono font-black text-slate-900 dark:text-white')}>
 {formatNumber(st.system_quantity)} {baseUName}
 </TableCell>
 )}

 {/* الكمية المسواة */}
 {stocktakeColumns.adjusted_quantity && (
 <TableCell className={cn(rowPadding,'text-center font-mono font-black text-emerald-600 dark:text-emerald-400')}>
 {formatNumber(st.actual_quantity)} {baseUName}
 </TableCell>
 )}

 {/* بواسطة */}
 {stocktakeColumns.creator && (
 <TableCell className={cn(rowPadding,'text-left font-sans text-slate-600 dark:text-slate-300')}>
 {st.created_by}
 </TableCell>
 )}
 </TableRow>
 ))
 )}
 </TableBody>
 </Table>

 {/* Bottom pagination matching Screenshot 2 */}
 <div className="p-4 border-t border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/40 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs font-bold">
 <span className="text-slate-500">
 {filteredStocktake.length === 0
 ?'لا توجد بيانات متاحة حالياً'
 :`عرض ${(stCurrentPage - 1) * stPageSize + 1} إلى ${Math.min(
 stCurrentPage * stPageSize,
 filteredStocktake.length
 )} من إجمالي ${filteredStocktake.length} عملية`}
 </span>

 <div className="flex items-center gap-1.5"dir="ltr">
 <Button
 variant="outline"
 size="icon"
 onClick={() => setStCurrentPage(1)}
 disabled={stCurrentPage === 1}
 className="w-8 h-8 rounded-lg cursor-pointer"
 >
 <ChevronsLeft className="w-4 h-4"/>
 </Button>
 <Button
 variant="outline"
 size="icon"
 onClick={() => setStCurrentPage((p) => Math.max(1, p - 1))}
 disabled={stCurrentPage === 1}
 className="w-8 h-8 rounded-lg cursor-pointer"
 >
 <ChevronLeft className="w-4 h-4"/>
 </Button>
 <div className="px-3 py-1 bg-surface border border-slate-200 dark:border-slate-700 rounded-lg text-xs font-mono font-black">
 {stCurrentPage} / {stTotalPages}
 </div>
 <Button
 variant="outline"
 size="icon"
 onClick={() => setStCurrentPage((p) => Math.min(stTotalPages, p + 1))}
 disabled={stCurrentPage >= stTotalPages}
 className="w-8 h-8 rounded-lg cursor-pointer"
 >
 <ChevronRight className="w-4 h-4"/>
 </Button>
 <Button
 variant="outline"
 size="icon"
 onClick={() => setStCurrentPage(stTotalPages)}
 disabled={stCurrentPage >= stTotalPages}
 className="w-8 h-8 rounded-lg cursor-pointer"
 >
 <ChevronsRight className="w-4 h-4"/>
 </Button>
 </div>
 </div>
 </div>
 </div>
 );
}