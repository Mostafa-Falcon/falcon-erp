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
 Sparkles,
 Plus,
 Trash2,
 ExternalLink,
 ChevronLeft,
 ChevronRight,
 ChevronsLeft,
 ChevronsRight,
} from'lucide-react';
import { formatNumber } from'@/lib/format';
import { cn } from'@/lib/utils';
import type { TableDensity, SubstituteColumnsState, SubstituteProductWithStock } from'./types';

interface SubstitutesTabProps {
 density: TableDensity;
 setDensity: (d: TableDensity) => void;
 substituteColumns: SubstituteColumnsState;
 setSubstituteColumns: React.Dispatch<React.SetStateAction<SubstituteColumnsState>>;
 subSearch: string;
 setSubSearch: (q: string) => void;
 subPageSize: number;
 setSubPageSize: (s: number) => void;
 subCurrentPage: number;
 setSubCurrentPage: React.Dispatch<React.SetStateAction<number>>;
 subTotalPages: number;
 filteredSubstitutes: SubstituteProductWithStock[];
 paginatedSubstitutes: SubstituteProductWithStock[];
 handleSubSort: (field:'name'|'sale_price'|'available_stock') => void;
 exportSubstitutesToCsv: () => void;
 onOpenAddModal: () => void;
 onRemoveSubstitute: (subId: string) => void;
 baseUName: string;
 rowPadding: string;
}

export function SubstitutesTab({
 density,
 setDensity,
 substituteColumns,
 setSubstituteColumns,
 subSearch,
 setSubSearch,
 subPageSize,
 setSubPageSize,
 subCurrentPage,
 setSubCurrentPage,
 subTotalPages,
 filteredSubstitutes,
 paginatedSubstitutes,
 handleSubSort,
 exportSubstitutesToCsv,
 onOpenAddModal,
 onRemoveSubstitute,
 baseUName,
 rowPadding,
}: SubstitutesTabProps) {
 return (
 <div className="space-y-3">
 {/* Toolbar matching Screenshot 1 */}
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
 onClick={exportSubstitutesToCsv}
 title="تصدير ملف CSV"
 className="w-9 h-9 rounded-xl text-emerald-600 border-emerald-200 hover:bg-emerald-50 dark:hover:bg-emerald-950/40 cursor-pointer"
 >
 <FileText className="w-4 h-4"/>
 </Button>

 {/* Excel */}
 <Button
 variant="outline"
 size="icon"
 onClick={exportSubstitutesToCsv}
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

 {/* Column Customizer */}
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
 checked={substituteColumns.name}
 onCheckedChange={(c) => setSubstituteColumns((p) => ({ ...p, name: !!c }))}
 />
 <span>الصنف البديل</span>
 </label>
 <label className="flex items-center gap-2 cursor-pointer">
 <Checkbox
 checked={substituteColumns.price}
 onCheckedChange={(c) => setSubstituteColumns((p) => ({ ...p, price: !!c }))}
 />
 <span>سعر البيع</span>
 </label>
 <label className="flex items-center gap-2 cursor-pointer">
 <Checkbox
 checked={substituteColumns.stock}
 onCheckedChange={(c) => setSubstituteColumns((p) => ({ ...p, stock: !!c }))}
 />
 <span>المخزون المتاح</span>
 </label>
 </div>
 </PopoverContent>
 </Popover>

 {/* Page Size */}
 <div className="flex items-center gap-1.5 mr-2">
 <span className="text-2xs font-bold text-slate-400">عرض</span>
 <Select value={String(subPageSize)} onValueChange={(v) => setSubPageSize(Number(v))}>
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

 {/* Button: إضافة صنف بديل (بواسطة صاحب المنشأة) */}
 <Button
 size="sm"
 onClick={onOpenAddModal}
 className="h-9 px-3 text-xs font-black rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white gap-1.5 shadow-xs cursor-pointer mr-2"
 >
 <Plus className="w-4 h-4"/>
 <span>إضافة صنف بديل</span>
 </Button>
 </div>

 {/* Search */}
 <div className="relative w-full md:w-80">
 <div className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none">
 <Barcode className="w-4 h-4"/>
 </div>
 <Input
 type="text"
 placeholder="بحث سريع في الجدول..."
 value={subSearch}
 onChange={(e) => setSubSearch(e.target.value)}
 className="h-10 pr-9 pl-20 bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-xs font-bold rounded-xl"
 />
 <div className="absolute left-2.5 top-1/2 -translate-y-1/2">
 <Badge className="bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300 border border-emerald-200 text-3xs font-mono font-black h-5 px-1.5 flex items-center gap-1">
 <Search className="w-3 h-3 text-emerald-600"/>
 <span>{filteredSubstitutes.length}</span>
 </Badge>
 </div>
 </div>
 </div>

 {/* Table matching Screenshot 1 */}
 <div className="bg-surface rounded-2xl border border-slate-200/80 dark:border-slate-800 overflow-hidden shadow-md">
 <Table>
 <TableHeader className="bg-slate-50/90 dark:bg-slate-900/90 border-b border-slate-200/80 dark:border-slate-800">
 <TableRow>
 {substituteColumns.name && (
 <TableHead
 onClick={() => handleSubSort('name')}
 className="text-2xs font-black uppercase text-right cursor-pointer select-none hover:text-blue-600 transition-colors"
 >
 <div className="flex items-center gap-1">
 <span>الصنف البديل</span>
 <span className="text-3xs text-slate-400">⇅</span>
 </div>
 </TableHead>
 )}
 {substituteColumns.price && (
 <TableHead
 onClick={() => handleSubSort('sale_price')}
 className="text-2xs font-black uppercase text-center cursor-pointer select-none hover:text-blue-600 transition-colors"
 >
 <div className="flex items-center justify-center gap-1">
 <span>سعر البيع</span>
 <span className="text-3xs text-slate-400">⇅</span>
 </div>
 </TableHead>
 )}
 {substituteColumns.stock && (
 <TableHead
 onClick={() => handleSubSort('available_stock')}
 className="text-2xs font-black uppercase text-center cursor-pointer select-none hover:text-blue-600 transition-colors"
 >
 <div className="flex items-center justify-center gap-1">
 <span>المخزون المتاح</span>
 <span className="text-3xs text-slate-400">⇅</span>
 </div>
 </TableHead>
 )}
 <TableHead className="text-2xs font-black uppercase text-left">إجراءات</TableHead>
 </TableRow>
 </TableHeader>
 <TableBody className="text-xs font-bold divide-y divide-slate-100 dark:divide-slate-800/80">
 {paginatedSubstitutes.length === 0 ? (
 <TableRow>
 <TableCell colSpan={4} className="py-20 text-center">
 {/* Empty state exactly matching Screenshot 1 */}
 <div className="flex flex-col items-center justify-center space-y-3">
 <div className="w-16 h-16 rounded-3xl bg-blue-50/80 dark:bg-blue-950/50 border border-blue-100 dark:border-blue-900/60 flex items-center justify-center text-blue-600 shadow-xs">
 <Sparkles className="w-8 h-8 text-blue-500"/>
 </div>
 <div className="space-y-1">
 <h4 className="text-base font-black text-slate-800 dark:text-white">لا توجد بدائل</h4>
 <p className="text-xs text-slate-400 font-medium">
 لم يتم إضافة أي بدائل مسجلة لهذا الصنف بواسطة صاحب المنشأة بعد.
 </p>
 </div>
 <Button
 size="sm"
 onClick={onOpenAddModal}
 className="mt-2 rounded-xl text-xs font-black bg-blue-600 hover:bg-blue-700 text-white gap-1.5 shadow-xs cursor-pointer"
 >
 <Plus className="w-4 h-4"/>
 <span>إضافة أول صنف بديل</span>
 </Button>
 </div>
 </TableCell>
 </TableRow>
 ) : (
 paginatedSubstitutes.map((s) => (
 <TableRow key={s.id} className="hover:bg-slate-50/70 dark:hover:bg-slate-800/40">
 {/* الصنف البديل */}
 {substituteColumns.name && (
 <TableCell className={rowPadding}>
 <div className="flex items-center gap-3">
 <div className="w-9 h-9 rounded-xl bg-blue-50 dark:bg-blue-950/40 text-blue-600 flex items-center justify-center font-black text-xs shrink-0">
 <Sparkles className="w-4 h-4 text-emerald-600"/>
 </div>
 <div>
 <div className="flex items-center gap-2">
 <span className="font-black text-slate-900 dark:text-white text-xs">{s.name}</span>
 <Badge variant="outline"className="text-3xs font-mono px-1.5 py-0">
 {s.sku}
 </Badge>
 </div>
 <span className="text-2xs text-slate-400">{s.name_en ||'بدون اسم لاتيني'}</span>
 </div>
 </div>
 </TableCell>
 )}

 {/* سعر البيع */}
 {substituteColumns.price && (
 <TableCell className={cn(rowPadding,'text-center font-mono font-black text-emerald-600 dark:text-emerald-400 text-xs')}>
 {formatNumber(s.sale_price)} ج.م
 </TableCell>
 )}

 {/* المخزون المتاح */}
 {substituteColumns.stock && (
 <TableCell className={cn(rowPadding,'text-center font-mono font-bold text-slate-800 dark:text-slate-200')}>
 <Badge
 variant="outline"
 className={cn(
'text-3xs font-mono font-bold px-2.5 py-0.5 rounded-full',
 s.available_stock > 0
 ?'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300'
 :'bg-red-50 text-red-700 border-red-200 dark:bg-red-950/40 dark:text-red-300'
 )}
 >
 {formatNumber(s.available_stock)} {baseUName}
 </Badge>
 </TableCell>
 )}

 {/* إجراءات */}
 <TableCell className={cn(rowPadding,'text-left')}>
 <div className="flex items-center gap-1.5 justify-end">
 <Link href={`/items/${s.id}`}>
 <Button
 variant="ghost"
 size="icon"
 title="عرض كرت البديل"
 className="w-8 h-8 rounded-lg text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-950/50 cursor-pointer"
 >
 <ExternalLink className="w-4 h-4"/>
 </Button>
 </Link>
 <Button
 variant="ghost"
 size="icon"
 onClick={() => onRemoveSubstitute(s.id)}
 title="إزالة من قائمة البدائل"
 className="w-8 h-8 rounded-lg text-red-500 hover:bg-red-50 dark:hover:bg-red-950/50 cursor-pointer"
 >
 <Trash2 className="w-4 h-4"/>
 </Button>
 </div>
 </TableCell>
 </TableRow>
 ))
 )}
 </TableBody>
 </Table>

 {/* Bottom pagination matching Screenshot 1 */}
 <div className="p-4 border-t border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/40 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs font-bold">
 <span className="text-slate-500">
 {filteredSubstitutes.length === 0
 ?'لا توجد بيانات متاحة حالياً'
 :`عرض ${(subCurrentPage - 1) * subPageSize + 1} إلى ${Math.min(
 subCurrentPage * subPageSize,
 filteredSubstitutes.length
 )} من إجمالي ${filteredSubstitutes.length} بديل`}
 </span>

 <div className="flex items-center gap-1.5"dir="ltr">
 <Button
 variant="outline"
 size="icon"
 onClick={() => setSubCurrentPage(1)}
 disabled={subCurrentPage === 1}
 className="w-8 h-8 rounded-lg cursor-pointer"
 >
 <ChevronsLeft className="w-4 h-4"/>
 </Button>
 <Button
 variant="outline"
 size="icon"
 onClick={() => setSubCurrentPage((p) => Math.max(1, p - 1))}
 disabled={subCurrentPage === 1}
 className="w-8 h-8 rounded-lg cursor-pointer"
 >
 <ChevronLeft className="w-4 h-4"/>
 </Button>
 <div className="px-3 py-1 bg-surface border border-slate-200 dark:border-slate-700 rounded-lg text-xs font-mono font-black">
 {subCurrentPage} / {subTotalPages}
 </div>
 <Button
 variant="outline"
 size="icon"
 onClick={() => setSubCurrentPage((p) => Math.min(subTotalPages, p + 1))}
 disabled={subCurrentPage >= subTotalPages}
 className="w-8 h-8 rounded-lg cursor-pointer"
 >
 <ChevronRight className="w-4 h-4"/>
 </Button>
 <Button
 variant="outline"
 size="icon"
 onClick={() => setSubCurrentPage(subTotalPages)}
 disabled={subCurrentPage >= subTotalPages}
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