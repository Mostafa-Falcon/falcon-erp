'use client';

import React from'react';
import { Button } from'@/components/ui/button';
import {
 ChevronsRight,
 ChevronsLeft,
 ChevronRight,
 ChevronLeft,
} from'lucide-react';

interface ItemPaginationProps {
 currentPage: number;
 totalPages: number;
 setCurrentPage: (page: number | ((prev: number) => number)) => void;
 pageSize: number;
 totalFiltered: number;
}

export function ItemPagination({
 currentPage,
 totalPages,
 setCurrentPage,
 pageSize,
 totalFiltered,
}: ItemPaginationProps) {
 return (
 <div className="p-4 border-t border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/40 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs font-bold rounded-b-2xl">
 <span className="text-slate-500">
 عرض {totalFiltered === 0 ? 0 : (currentPage - 1) * pageSize + 1} إلى{''}
 {Math.min(currentPage * pageSize, totalFiltered)} من إجمالي {totalFiltered} صنف
 </span>

 <div className="flex items-center gap-1.5"dir="ltr">
 <Button
 variant="outline"
 size="icon"
 onClick={() => setCurrentPage(1)}
 disabled={currentPage === 1}
 className="w-8 h-8 rounded-lg"
 >
 <ChevronsLeft className="w-4 h-4"/>
 </Button>

 <Button
 variant="outline"
 size="icon"
 onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
 disabled={currentPage === 1}
 className="w-8 h-8 rounded-lg"
 >
 <ChevronLeft className="w-4 h-4"/>
 </Button>

 <div className="px-3 py-1 bg-surface border border-slate-200 dark:border-slate-700 rounded-lg text-xs font-mono font-black">
 {currentPage} / {totalPages}
 </div>

 <Button
 variant="outline"
 size="icon"
 onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
 disabled={currentPage >= totalPages}
 className="w-8 h-8 rounded-lg"
 >
 <ChevronRight className="w-4 h-4"/>
 </Button>

 <Button
 variant="outline"
 size="icon"
 onClick={() => setCurrentPage(totalPages)}
 disabled={currentPage >= totalPages}
 className="w-8 h-8 rounded-lg"
 >
 <ChevronsRight className="w-4 h-4"/>
 </Button>
 </div>
 </div>
 );
}