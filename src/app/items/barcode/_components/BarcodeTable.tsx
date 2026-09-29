'use client';

import React from'react';
import { Minus, Plus, Trash2, Printer, ChevronRight, ChevronLeft } from'lucide-react';
import {
 Table,
 TableBody,
 TableCell,
 TableHead,
 TableHeader,
 TableRow,
} from'@/components/ui/table';
import { Button } from'@/components/ui/button';
import { Badge } from'@/components/ui/badge';
import { Input } from'@/components/ui/input';
import { formatNumber } from'@/lib/format';
import type { PrintItem } from'../types';

interface BarcodeTableProps {
 pagedItems: PrintItem[];
 printItemsLength: number;
 totalLabelsCount: number;
 currentPage: number;
 totalPages: number;
 setCurrentPage: (updater: (p: number) => number) => void;
 handleUpdateCopies: (productId: string, delta: number) => void;
 handleSetCopies: (productId: string, val: number) => void;
 handleRemoveItem: (productId: string) => void;
 currency?: string;
}

export function BarcodeTable({
 pagedItems,
 printItemsLength,
 totalLabelsCount,
 currentPage,
 totalPages,
 setCurrentPage,
 handleUpdateCopies,
 handleSetCopies,
 handleRemoveItem,
 currency ='ر.س',
}: BarcodeTableProps) {
 return (
 <>
 <Table>
 <TableHeader>
 <TableRow className="text-2xs font-black bg-muted/50 hover:bg-muted/50">
 <TableHead className="text-right font-black">الصنف / المنتج</TableHead>
 <TableHead className="text-right font-black">SKU / Barcode</TableHead>
 <TableHead className="text-right font-black">السعر</TableHead>
 <TableHead className="text-center font-black w-44">عدد الملصقات</TableHead>
 <TableHead className="text-center font-black w-24">الخيارات</TableHead>
 </TableRow>
 </TableHeader>
 <TableBody>
 {pagedItems.length > 0 ? (
 pagedItems.map((item) => (
 <TableRow key={item.product.id} className="text-xs transition-colors">
 <TableCell className="py-3 font-medium">
 <div className="font-bold text-foreground">
 {item.product.name}
 </div>
 <div className="text-2xs text-muted-foreground mt-0.5">
 {item.unitName ||'الوحدة الأساسية'}
 </div>
 </TableCell>
 <TableCell className="py-3">
 <Badge variant="outline"className="font-mono text-xs font-semibold">
 {item.barcode ||'—'}
 </Badge>
 </TableCell>
 <TableCell className="py-3 font-black text-emerald-600 dark:text-emerald-400">
 {formatNumber(item.price)} {currency}
 </TableCell>
 <TableCell className="py-3">
 <div className="flex items-center justify-center gap-1.5">
 <Button
 type="button"
 variant="outline"
 size="icon"
 onClick={() => handleUpdateCopies(item.product.id, -1)}
 className="h-8 w-8 rounded-lg cursor-pointer"
 >
 <Minus className="w-3.5 h-3.5"/>
 </Button>
 <Input
 type="number"
 min={1}
 value={item.copies}
 onChange={(e) =>
 handleSetCopies(item.product.id, parseInt(e.target.value) || 1)
 }
 className="w-16 h-8 text-center font-bold text-xs rounded-lg [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
 />
 <Button
 type="button"
 variant="outline"
 size="icon"
 onClick={() => handleUpdateCopies(item.product.id, 1)}
 className="h-8 w-8 rounded-lg cursor-pointer"
 >
 <Plus className="w-3.5 h-3.5"/>
 </Button>
 </div>
 </TableCell>
 <TableCell className="py-3 text-center">
 <Button
 type="button"
 variant="ghost"
 size="icon"
 onClick={() => handleRemoveItem(item.product.id)}
 className="h-8 w-8 text-muted-foreground hover:text-destructive hover:bg-destructive/10 cursor-pointer"
 title="حذف من قائمة الطباعة"
 >
 <Trash2 className="w-4 h-4"/>
 </Button>
 </TableCell>
 </TableRow>
 ))
 ) : (
 <TableRow>
 <TableCell colSpan={5} className="py-16 text-center">
 <div className="flex flex-col items-center justify-center gap-3">
 <div className="w-14 h-14 rounded-2xl bg-teal-50 dark:bg-teal-950/40 flex items-center justify-center text-[#0f766e] dark:text-teal-400">
 <Printer className="w-7 h-7"/>
 </div>
 <div className="text-sm font-black text-foreground">
 لا توجد أصناف مختارة للطباعة
 </div>
 <p className="text-xs text-muted-foreground font-medium max-w-sm">
 ابدأ بالبحث عن الأصناف لإضافتها لقائمة طباعة الباركود.
 </p>
 </div>
 </TableCell>
 </TableRow>
 )}
 </TableBody>
 </Table>

 {/* Table Footer / Pagination */}
 <div className="p-4 border-t border-border flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-muted-foreground bg-muted/20">
 <div>
 {printItemsLength === 0 ? (
'لا توجد بيانات متاحة حالياً'
 ) : (
 <div className="flex items-center gap-2">
 <span>إجمالي الأصناف:</span>
 <Badge variant="secondary"className="font-bold">{printItemsLength} صنف</Badge>
 <span>•</span>
 <span>إجمالي الملصقات:</span>
 <Badge variant="default"className="bg-[#0f766e] text-white hover:bg-[#0f766e] font-bold">
 {totalLabelsCount} ملصق
 </Badge>
 </div>
 )}
 </div>
 {totalPages > 1 && (
 <div className="flex items-center gap-1.5">
 <Button
 type="button"
 variant="outline"
 size="sm"
 disabled={currentPage === 1}
 onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
 className="h-8 px-2.5 text-xs font-bold gap-1 cursor-pointer"
 >
 <ChevronRight className="w-3.5 h-3.5"/>
 <span>السابق</span>
 </Button>
 <span className="px-2 font-mono font-bold text-xs text-foreground">
 {currentPage} / {totalPages}
 </span>
 <Button
 type="button"
 variant="outline"
 size="sm"
 disabled={currentPage === totalPages}
 onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
 className="h-8 px-2.5 text-xs font-bold gap-1 cursor-pointer"
 >
 <span>التالي</span>
 <ChevronLeft className="w-3.5 h-3.5"/>
 </Button>
 </div>
 )}
 </div>
 </>
 );
}