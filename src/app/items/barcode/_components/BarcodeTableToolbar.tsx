'use client';

import React from'react';
import {
 Printer,
 FileSpreadsheet,
 BarChart3,
 SlidersHorizontal,
 Search,
 Trash2,
} from'lucide-react';
import { Button } from'@/components/ui/button';
import { Input } from'@/components/ui/input';
import { Badge } from'@/components/ui/badge';
import {
 Select,
 SelectContent,
 SelectItem,
 SelectTrigger,
 SelectValue,
} from'@/components/ui/select';

interface BarcodeTableToolbarProps {
 totalLabelsCount: number;
 printItemsCount: number;
 pageSize: number;
 setPageSize: (v: number) => void;
 tableFilter: string;
 setTableFilter: (v: string) => void;
 handlePrint: () => void;
 handleClearAll: () => void;
 openSettings: () => void;
}

export function BarcodeTableToolbar({
 totalLabelsCount,
 printItemsCount,
 pageSize,
 setPageSize,
 tableFilter,
 setTableFilter,
 handlePrint,
 handleClearAll,
 openSettings,
}: BarcodeTableToolbarProps) {
 return (
 <div className="p-4 border-b border-border flex flex-col sm:flex-row items-center justify-between gap-3 bg-muted/30">
 {/* Action Tools */}
 <div className="flex items-center gap-2 self-start sm:self-auto flex-wrap">
 <Button
 onClick={handlePrint}
 disabled={totalLabelsCount === 0}
 size="sm"
 className="h-9 px-3 gap-1.5 bg-[#0f766e] hover:bg-[#0f766e]/90 text-white font-bold shadow-xs cursor-pointer"
 >
 <Printer className="w-4 h-4"/>
 <span>طباعة الملصقات</span>
 {totalLabelsCount > 0 && (
 <Badge variant="secondary"className="mr-1 bg-white/20 text-white hover:bg-white/30 h-5 px-1.5 text-2xs">
 {totalLabelsCount}
 </Badge>
 )}
 </Button>

 <Button
 variant="outline"
 size="sm"
 onClick={openSettings}
 className="h-9 px-3 gap-1.5 font-bold cursor-pointer"
 >
 <SlidersHorizontal className="w-3.5 h-3.5"/>
 <span>إعدادات الملصق</span>
 </Button>

 {printItemsCount > 0 && (
 <Button
 variant="ghost"
 size="sm"
 onClick={handleClearAll}
 className="h-9 px-2.5 text-xs font-bold text-destructive hover:text-destructive hover:bg-destructive/10 cursor-pointer gap-1"
 >
 <Trash2 className="w-3.5 h-3.5"/>
 <span>تفريغ القائمة ({printItemsCount})</span>
 </Button>
 )}
 </div>

 {/* Pagination & Filter */}
 <div className="flex items-center gap-3 w-full sm:w-auto">
 <div className="flex items-center gap-1.5 text-xs font-bold text-muted-foreground whitespace-nowrap">
 <span>عرض</span>
 <Select
 value={String(pageSize)}
 onValueChange={(val) => setPageSize(Number(val))}
 >
 <SelectTrigger className="h-9 w-18 text-xs font-bold bg-background">
 <SelectValue />
 </SelectTrigger>
 <SelectContent>
 <SelectItem value="10">10</SelectItem>
 <SelectItem value="25">25</SelectItem>
 <SelectItem value="50">50</SelectItem>
 <SelectItem value="100">100</SelectItem>
 </SelectContent>
 </Select>
 <span>سجل</span>
 </div>

 <div className="relative flex-1 sm:w-60">
 <Input
 type="text"
 value={tableFilter}
 onChange={(e) => setTableFilter(e.target.value)}
 placeholder="بحث سريع في الجدول..."
 className="h-9 text-xs bg-background"
 icon={<Search className="w-3.5 h-3.5 text-muted-foreground"/>}
 />
 </div>
 </div>
 </div>
 );
}