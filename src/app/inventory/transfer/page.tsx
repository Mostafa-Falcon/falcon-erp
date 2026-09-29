'use client';

import React from'react';
import { useRouter } from'next/navigation';
import { AppShell } from'@/components/layout/AppShell';
import { Icons } from'@/components/ui/Icons';
import { useStockTransfers } from'@/components/inventory/transfer/hooks/useStockTransfers';
import { TransferStatsCards } from'@/components/inventory/transfer/TransferStatsCards';
import { TransferFilters } from'@/components/inventory/transfer/TransferFilters';
import { TransferTable } from'@/components/inventory/transfer/TransferTable';
import { TransferDetailsModal } from'@/components/inventory/transfer/TransferDetailsModal';

export default function StockTransfersPage() {
 const router = useRouter();
 const {
 transfers,
 stats,
 isLoading,
 searchQuery,
 setSearchQuery,
 statusFilter,
 setStatusFilter,
 branchMap,
 warehouseMap,
 viewTransfer,
 setViewTransfer,
 loadData,
 handleShip,
 handleReceive,
 handleCancel,
 } = useStockTransfers();

 return (
 <AppShell
 title="تحويلات المخزون"
 subtitle="متابعة حركات نقل الأصناف بين الفروع والمخازن"
 actions={
 <div className="flex items-center gap-2">
 <button
 type="button"
 onClick={loadData}
 title="تحديث البيانات"
 className="h-9 px-3.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700/60 text-slate-700 dark:text-slate-200 text-xs font-bold rounded-xl shadow-2xs flex items-center gap-1.5 cursor-pointer transition-all active:scale-95"
 >
 <Icons.Refresh />
 تحديث
 </button>

 <button
 type="button"
 onClick={() => router.push('/inventory/transfer/new')}
 className="h-9 px-4 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl shadow-xs flex items-center gap-1.5 cursor-pointer transition-all active:scale-95"
 >
 <Icons.SwapHorizontal />
 تحويل جديد
 </button>
 </div>
 }
 >
 <div className="flex flex-col gap-5 max-w-7xl mx-auto w-full pb-10">
 {/* 1. Statistics Cards */}
 <TransferStatsCards stats={stats} />

 {/* 2. Search & Status Filter Toolbar */}
 <TransferFilters
 searchQuery={searchQuery}
 onSearchChange={setSearchQuery}
 statusFilter={statusFilter}
 onStatusFilterChange={setStatusFilter}
 />

 {/* 3. Transfers Data Table */}
 <TransferTable
 transfers={transfers}
 branchMap={branchMap}
 warehouseMap={warehouseMap}
 onView={(t) => setViewTransfer(t)}
 onShip={handleShip}
 onReceive={handleReceive}
 onCancel={handleCancel}
 />
 </div>

 {/* 4. Details Modal */}
 <TransferDetailsModal
 transfer={viewTransfer}
 branchMap={branchMap}
 warehouseMap={warehouseMap}
 onClose={() => setViewTransfer(null)}
 />
 </AppShell>
 );
}