import { useState, useEffect, useMemo, useCallback } from 'react';
import { toast } from 'sonner';
import { StockTransfer, Branch, Warehouse } from'@/types';
import { StockTransferRepository } from'@/modules/inventory/stock_transfer_repository';
import { db } from'@/core/db/app_database';
import { TransferStats, TransferFilterStatus } from'../types';

export function useStockTransfers() {
 const [transfers, setTransfers] = useState<StockTransfer[]>([]);
 const [branches, setBranches] = useState<Branch[]>([]);
 const [warehouses, setWarehouses] = useState<Warehouse[]>([]);
 const [isLoading, setIsLoading] = useState(true);
 const [searchQuery, setSearchQuery] = useState('');
 const [statusFilter, setStatusFilter] = useState<TransferFilterStatus>('all');
 const [viewTransfer, setViewTransfer] = useState<StockTransfer | null>(null);

 const orgId ='org-default';

 const loadData = useCallback(async () => {
 setIsLoading(true);
 try {
 const [rawTransfers, allBranches, allWarehouses, allItems, allProducts, allUnits] = await Promise.all([
 StockTransferRepository.getTransfers(orgId),
 db.branches.toArray(),
 db.warehouses.toArray(),
 db.stock_transfer_items.toArray(),
 db.products.toArray(),
 db.product_units.toArray(),
 ]);

 const productMap = new Map(allProducts.map((p) => [p.id, p]));
 const unitMap = new Map(allUnits.map((u) => [u.id, u]));

 // Attach items & counts to transfers for unified view
 const enrichedTransfers: StockTransfer[] = rawTransfers.map((t) => {
 const transferItems = allItems.filter((i) => i.transfer_id === t.id);
 const detailedItems = transferItems.map((i) => {
 const product = productMap.get(i.product_id);
 const unit = unitMap.get(i.unit_id);
 return {
 ...i,
 product_name: product?.name || i.product_id,
 unit_name: unit?.unit_id ||'قطعة',
 };
 });
 return {
 ...t,
 items_count: detailedItems.length,
 items: detailedItems,
 };
 });

 setTransfers(enrichedTransfers);
 setBranches(allBranches);
 setWarehouses(allWarehouses);
 } catch (err) {
 console.error('Failed to load transfers:', err);
 } finally {
 setIsLoading(false);
 }
 }, [orgId]);

 useEffect(() => {
 loadData();
 }, [loadData]);

 // Branch & Warehouse lookup maps
 const branchMap = useMemo(() => {
 const map: Record<string, string> = {};
 branches.forEach((b) => {
 map[b.id] = b.name;
 });
 return map;
 }, [branches]);

 const warehouseMap = useMemo(() => {
 const map: Record<string, string> = {};
 warehouses.forEach((w) => {
 map[w.id] = w.name;
 });
 return map;
 }, [warehouses]);

 // Real-time calculated stats
 const stats: TransferStats = useMemo(() => {
 return {
 total: transfers.length,
 pending: transfers.filter((t) => t.status ==='pending'|| t.status ==='draft').length,
 inTransit: transfers.filter((t) => t.status ==='in_transit').length,
 completed: transfers.filter((t) => t.status ==='completed').length,
 };
 }, [transfers]);

 // Filtered transfers based on search and status dropdown
 const filteredTransfers = useMemo(() => {
 return transfers.filter((t) => {
 // 1. Status Filter
 if (statusFilter !=='all') {
 if (statusFilter ==='pending'&& t.status !=='pending'&& t.status !=='draft') {
 return false;
 }
 if (statusFilter !=='pending'&& t.status !== statusFilter) {
 return false;
 }
 }

 // 2. Search Query
 if (searchQuery.trim()) {
 const q = searchQuery.toLowerCase().trim();
 const matchNumber = t.transfer_no.toLowerCase().includes(q);
 const fromName = (t.from_branch_id && branchMap[t.from_branch_id]) ||'';
 const toName = (t.to_branch_id && branchMap[t.to_branch_id]) ||'';
 const matchBranch = fromName.toLowerCase().includes(q) || toName.toLowerCase().includes(q);
 return matchNumber || matchBranch;
 }

 return true;
 });
 }, [transfers, statusFilter, searchQuery, branchMap]);

  // Actions
  const handleShip = async (transferId: string) => {
    if (!confirm('هل أنت متأكد من تأكيد شحن هذا التحويل؟')) return;
    try {
      const res = await StockTransferRepository.shipTransfer(transferId);
      if (!res.success) {
        toast.error(res.error || 'حدث خطأ أثناء تحديث حالة الشحن');
        return;
      }
      toast.success('تم تأكيد شحن التحويل المخزني بنجاح');
      await loadData();
    } catch (err: any) {
      toast.error(err.message || 'حدث خطأ أثناء تحديث حالة الشحن');
    }
  };

  const handleReceive = async (transferId: string) => {
    if (!confirm('هل أنت متأكد من استلام الأصناف وإيداعها في مخزون الفرع المستلم؟')) return;
    try {
      const res = await StockTransferRepository.completeTransfer(transferId);
      if (!res.success) {
        toast.error(res.error || 'حدث خطأ أثناء استلام التحويل');
        return;
      }
      toast.success('تم استلام التحويل وإيداع الكميات في المخزون بنجاح');
      await loadData();
    } catch (err: any) {
      toast.error(err.message || 'حدث خطأ أثناء استلام التحويل');
    }
  };

  const handleCancel = async (transferId: string) => {
    if (!confirm('هل أنت متأكد من إلغاء هذا التحويل؟')) return;
    try {
      const res = await StockTransferRepository.cancelTransfer(transferId);
      if (!res.success) {
        toast.error(res.error || 'حدث خطأ أثناء إلغاء التحويل');
        return;
      }
      toast.success('تم إلغاء التحويل بنجاح');
      await loadData();
    } catch (err: any) {
      toast.error(err.message || 'حدث خطأ أثناء إلغاء التحويل');
    }
  };

 return {
 transfers: filteredTransfers,
 rawTransfers: transfers,
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
 };
}