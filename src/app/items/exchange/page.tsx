'use client';

import React, { useEffect, useState } from 'react';
import { Suspense } from 'react';
import { AppShell } from '@/components/layout/AppShell';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useSessionStore } from '@/core/state/useSessionStore';
import { db } from '@/core/db/app_database';
import { SyncQueueManager } from '@/core/sync/sync_queue_manager';
import { formatNumber } from '@/lib/format';
import type { Product, Warehouse, StockLevel } from '@/types';
import { Repeat2, ArrowLeftRight, Search, CheckCircle2, AlertCircle, Box } from 'lucide-react';
import { v4 as uuidv4 } from 'uuid';

function ExchangeContent() {
  const { currentUser, activeBranchId } = useSessionStore();
  const orgId = currentUser?.org_id || '';
  const branchId = activeBranchId || currentUser?.branch_id || '';

  const [products, setProducts] = useState<Product[]>([]);
  const [warehouses, setWarehouses] = useState<Warehouse[]>([]);
  const [stockLevels, setStockLevels] = useState<StockLevel[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Exchange Form State
  const [sourceWarehouseId, setSourceWarehouseId] = useState('');
  const [sourceProductId, setSourceProductId] = useState('');
  const [targetProductId, setTargetProductId] = useState('');
  const [exchangeQty, setExchangeQty] = useState('1');
  const [exchangeNotes, setExchangeNotes] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');
  const [errorMessage, setErrorMessage] = useState('');

  const loadData = async () => {
    if (!orgId) return;
    try {
      setIsLoading(true);
      const [prods, whs, stocks] = await Promise.all([
        db.products.where('org_id').equals(orgId).toArray(),
        db.warehouses.where('org_id').equals(orgId).toArray(),
        db.stock_levels.toArray(),
      ]);
      setProducts(prods);
      setWarehouses(whs);
      setStockLevels(stocks);

      if (whs.length > 0 && !sourceWarehouseId) {
        setSourceWarehouseId(whs[0].id);
      }
      if (prods.length > 1) {
        if (!sourceProductId) setSourceProductId(prods[0].id);
        if (!targetProductId) setTargetProductId(prods[1].id);
      }
    } catch (err) {
      console.error('Error loading exchange data:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [orgId, branchId]);

  const sourceProduct = products.find((p) => p.id === sourceProductId);
  const targetProduct = products.find((p) => p.id === targetProductId);

  const sourceStock = stockLevels
    .filter((s) => s.product_id === sourceProductId && s.warehouse_id === sourceWarehouseId)
    .reduce((acc, s) => acc + s.quantity, 0);

  const targetStock = stockLevels
    .filter((s) => s.product_id === targetProductId && s.warehouse_id === sourceWarehouseId)
    .reduce((acc, s) => acc + s.quantity, 0);

  const handleExecuteExchange = async () => {
    setSuccessMessage('');
    setErrorMessage('');

    const qty = parseFloat(exchangeQty);
    if (!qty || qty <= 0) {
      setErrorMessage('يرجى إدخال كمية صحيحة');
      return;
    }

    if (sourceProductId === targetProductId) {
      setErrorMessage('لا يمكن تبادل نفس الصنف');
      return;
    }

    if (sourceStock < qty) {
      setErrorMessage(`الرصيد المتاح من (${sourceProduct?.name}) هو ${sourceStock} فقط`);
      return;
    }

    try {
      setIsProcessing(true);
      const now = new Date().toISOString();

      await db.transaction('rw', [db.stock_levels, db.inventory_transactions, db.sync_queue], async () => {
        // Decrease source product
        const sourceLevel = await db.stock_levels
          .where('product_id')
          .equals(sourceProductId)
          .and((s) => s.warehouse_id === sourceWarehouseId)
          .first();

        if (sourceLevel) {
          const updatedSource: StockLevel = {
            ...sourceLevel,
            quantity: sourceLevel.quantity - qty,
            available_quantity: sourceLevel.quantity - qty - (sourceLevel.reserved_quantity || 0),
            updated_at: now,
            sync_status: 'pending',
          };
          await db.stock_levels.put(updatedSource);
          await SyncQueueManager.enqueueDelta('stock_levels', updatedSource.id, { quantity: -qty, allow_negative: false }, { warehouse_id: sourceLevel.warehouse_id, product_id: sourceLevel.product_id });
        }

        // Increase target product
        const targetLevel = await db.stock_levels
          .where('product_id')
          .equals(targetProductId)
          .and((s) => s.warehouse_id === sourceWarehouseId)
          .first();

        if (targetLevel) {
          const updatedTarget: StockLevel = {
            ...targetLevel,
            quantity: targetLevel.quantity + qty,
            available_quantity: targetLevel.quantity + qty - (targetLevel.reserved_quantity || 0),
            updated_at: now,
            sync_status: 'pending',
          };
          await db.stock_levels.put(updatedTarget);
          await SyncQueueManager.enqueueDelta('stock_levels', updatedTarget.id, { quantity: qty, allow_negative: false }, { warehouse_id: targetLevel.warehouse_id, product_id: targetLevel.product_id });
        } else {
          const stockId = `${sourceWarehouseId}_${targetProductId}`;
          const newTarget: StockLevel = {
            id: stockId,
            org_id: orgId,
            product_id: targetProductId,
            warehouse_id: sourceWarehouseId,
            quantity: qty,
            reserved_quantity: 0,
            available_quantity: qty,
            updated_at: now,
            sync_status: 'pending',
          };
          await db.stock_levels.put(newTarget);
          await SyncQueueManager.enqueue('stock_levels', stockId, 'upsert', newTarget);
        }

        // Log transaction
        const outTxId = uuidv4();
        const outTx = {
          id: outTxId,
          org_id: orgId,
          warehouse_id: sourceWarehouseId,
          product_id: sourceProductId,
          transaction_type: 'adjustment_out' as const,
          quantity: -qty,
          unit_id: 'default_unit',
          unit_conversion_factor: 1,
          base_quantity: -qty,
          unit_cost: 0,
          total_cost: 0,
          balance_after: (sourceLevel?.quantity || 0) - qty,
          reference_type: 'adjustment' as const,
          reference_id: uuidv4(),
          notes: `تبادل صنف إلى (${targetProduct?.name}) - ${exchangeNotes}`,
          created_by: currentUser?.id || '',
          created_at: now,
          sync_status: 'pending' as const,
        };
        await db.inventory_transactions.add(outTx);
        await SyncQueueManager.enqueue('inventory_transactions', outTxId, 'insert', outTx);

        const inTxId = uuidv4();
        const inTx = {
          id: inTxId,
          org_id: orgId,
          warehouse_id: sourceWarehouseId,
          product_id: targetProductId,
          transaction_type: 'adjustment_in' as const,
          quantity: qty,
          unit_id: 'default_unit',
          unit_conversion_factor: 1,
          base_quantity: qty,
          unit_cost: 0,
          total_cost: 0,
          balance_after: (targetLevel?.quantity || 0) + qty,
          reference_type: 'adjustment' as const,
          reference_id: uuidv4(),
          notes: `تبادل صنف وارد من (${sourceProduct?.name}) - ${exchangeNotes}`,
          created_by: currentUser?.id || '',
          created_at: now,
          sync_status: 'pending' as const,
        };
        await db.inventory_transactions.add(inTx);
        await SyncQueueManager.enqueue('inventory_transactions', inTxId, 'insert', inTx);
      });

      setSuccessMessage('تمت عملية تبادل الأصناف وتحديث الأرصدة بنجاح');
      setExchangeNotes('');
      await loadData();
    } catch (err) {
      console.error('Exchange error:', err);
      setErrorMessage('حدث خطأ أثناء إجراء التبادل');
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="p-6 space-y-6 max-w-5xl mx-auto" dir="rtl">
      {/* Header */}
      <div className="flex items-center gap-3 bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
        <div className="w-12 h-12 rounded-xl bg-blue-50 dark:bg-blue-950/50 flex items-center justify-center text-[#2563eb]">
          <Repeat2 className="w-6 h-6" />
        </div>
        <div>
          <h1 className="text-xl font-black text-slate-900 dark:text-white">تبادل وتحويل الأصناف</h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 font-bold mt-0.5">
            استبدال كميات صنف بآخر داخلياً مع ضبط القيود المخزنية آلياً
          </p>
        </div>
      </div>

      {successMessage && (
        <div className="bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 text-emerald-700 p-4 rounded-xl text-xs font-black flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-600" />
          {successMessage}
        </div>
      )}

      {errorMessage && (
        <div className="bg-rose-50 dark:bg-rose-950/40 border border-rose-200 text-rose-700 p-4 rounded-xl text-xs font-black flex items-center gap-2">
          <AlertCircle className="w-4 h-4 text-rose-600" />
          {errorMessage}
        </div>
      )}

      {/* Exchange Card */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-6 space-y-6 shadow-sm">
        <div>
          <label className="text-xs font-black text-slate-700 dark:text-slate-300 block mb-1">
            المستودع الذي ستتم فيه العملية
          </label>
          <select
            value={sourceWarehouseId}
            onChange={(e) => setSourceWarehouseId(e.target.value)}
            className="w-full sm:w-72 h-10 px-3 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 text-xs font-bold"
          >
            {warehouses.map((w) => (
              <option key={w.id} value={w.id}>
                {w.name}
              </option>
            ))}
          </select>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-center">
          {/* Outgoing Product */}
          <div className="bg-slate-50 dark:bg-slate-800/40 p-5 rounded-2xl border border-slate-200/80 dark:border-slate-700 space-y-3">
            <span className="text-xs font-black text-rose-600">الصنف المنصرف (خصم من الرصيد)</span>
            <select
              value={sourceProductId}
              onChange={(e) => setSourceProductId(e.target.value)}
              className="w-full h-10 px-3 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs font-bold"
            >
              {products.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name} ({p.sku})
                </option>
              ))}
            </select>
            <div className="flex items-center justify-between text-xs text-slate-500 font-bold">
              <span>الرصيد المتاح:</span>
              <span className="font-black text-slate-900 dark:text-white">{formatNumber(sourceStock)}</span>
            </div>
            <div className="flex items-center justify-between text-xs text-slate-500 font-bold">
              <span>سعر البيع:</span>
              <span>{formatNumber(sourceProduct?.sale_price || 0)} ج.م</span>
            </div>
          </div>

          {/* Incoming Product */}
          <div className="bg-slate-50 dark:bg-slate-800/40 p-5 rounded-2xl border border-slate-200/80 dark:border-slate-700 space-y-3">
            <span className="text-xs font-black text-emerald-600">الصنف الوارد (إضافة إلى الرصيد)</span>
            <select
              value={targetProductId}
              onChange={(e) => setTargetProductId(e.target.value)}
              className="w-full h-10 px-3 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs font-bold"
            >
              {products.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name} ({p.sku})
                </option>
              ))}
            </select>
            <div className="flex items-center justify-between text-xs text-slate-500 font-bold">
              <span>الرصيد الحالي:</span>
              <span className="font-black text-slate-900 dark:text-white">{formatNumber(targetStock)}</span>
            </div>
            <div className="flex items-center justify-between text-xs text-slate-500 font-bold">
              <span>سعر البيع:</span>
              <span>{formatNumber(targetProduct?.sale_price || 0)} ج.م</span>
            </div>
          </div>
        </div>

        {/* Quantities & Notes */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
          <div>
            <label className="text-xs font-black text-slate-700 dark:text-slate-300 block mb-1">
              الكمية المراد استبدالها
            </label>
            <Input
              type="number"
              value={exchangeQty}
              onChange={(e) => setExchangeQty(e.target.value)}
              className="h-10 text-xs font-bold rounded-lg"
            />
          </div>

          <div>
            <label className="text-xs font-black text-slate-700 dark:text-slate-300 block mb-1">
              السبب أو الملاحظات
            </label>
            <Input
              value={exchangeNotes}
              onChange={(e) => setExchangeNotes(e.target.value)}
              placeholder="مثال: استبدال تشغيلة أو تسوية داخلية"
              className="h-10 text-xs font-bold rounded-lg"
            />
          </div>
        </div>

        <div className="flex justify-end pt-4 border-t border-slate-100 dark:border-slate-800">
          <Button
            disabled={isProcessing}
            onClick={handleExecuteExchange}
            className="bg-[#2563eb] hover:bg-blue-700 text-white font-black text-xs h-11 px-8 rounded-xl shadow-md shadow-blue-500/20 flex items-center gap-2"
          >
            <Repeat2 className="w-4 h-4" />
            {isProcessing ? 'جاري تنفيذ التبادل...' : 'تأكيد التبادل وتحديث المخزون'}
          </Button>
        </div>
      </div>
    </div>
  );
}

export default function ExchangePage() {
  return (
    <AppShell>
      <Suspense fallback={<div className="p-8 text-center text-xs font-bold">جاري تحميل تبادل الأصناف...</div>}>
        <ExchangeContent />
      </Suspense>
    </AppShell>
  );
}
