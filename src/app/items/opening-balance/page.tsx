'use client';

import React, { useEffect, useRef, useState } from 'react';
import { Suspense } from 'react';
import { AppShell } from '@/components/layout/AppShell';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useSessionStore } from '@/core/state/useSessionStore';
import { db } from '@/core/db/app_database';
import { SyncQueueManager } from '@/core/sync/sync_queue_manager';
import { formatNumber } from '@/lib/format';
import { roundQty, roundMoney, toNumber, moneyProduct } from '@/lib/decimal';
import type { Product, Warehouse, StockLevel } from '@/types';
import { ArrowRightToLine, Search, Save, CheckCircle2, CalendarClock } from 'lucide-react';
import { v4 as uuidv4 } from 'uuid';

function OpeningBalanceContent() {
  const { currentUser, activeBranchId } = useSessionStore();
  const orgId = currentUser?.org_id || '';
  const branchId = activeBranchId || currentUser?.branch_id || '';

  const [products, setProducts] = useState<Product[]>([]);
  const [warehouses, setWarehouses] = useState<Warehouse[]>([]);
  const [stockLevels, setStockLevels] = useState<StockLevel[]>([]);
  const [selectedWarehouseId, setSelectedWarehouseId] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [isLoading, setIsLoading] = useState(true);

  // Editable rows state: productId -> { quantity, cost }
  const [editValues, setEditValues] = useState<Record<string, { qty: string; cost: string }>>({});
  const [isSaving, setIsSaving] = useState(false);
  const [savedSuccess, setSavedSuccess] = useState(false);
  const inputRefs = useRef<Record<string, HTMLInputElement | null>>({});

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

      const targetWh = selectedWarehouseId || whs[0]?.id || '';
      if (!selectedWarehouseId && whs.length > 0) {
        setSelectedWarehouseId(whs[0].id);
      }

      // Initialize edit values
      const initial: Record<string, { qty: string; cost: string }> = {};
      for (const p of prods) {
        const sl = stocks.find((s) => s.product_id === p.id && s.warehouse_id === targetWh);
        initial[p.id] = {
          qty: sl ? sl.quantity.toString() : '0',
          cost: (p.cost_price || 0).toString(),
        };
      }
      setEditValues(initial);
    } catch (err) {
      console.error('Error loading opening balance:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [orgId, branchId]);

  const handleWarehouseChange = (whId: string) => {
    setSelectedWarehouseId(whId);
    const initial: Record<string, { qty: string; cost: string }> = {};
    for (const p of products) {
      const sl = stockLevels.find((s) => s.product_id === p.id && s.warehouse_id === whId);
      initial[p.id] = {
        qty: sl ? sl.quantity.toString() : '0',
        cost: (p.cost_price || 0).toString(),
      };
    }
    setEditValues(initial);
  };

  const handleRowChange = (prodId: string, field: 'qty' | 'cost', value: string) => {
    setEditValues((prev) => ({
      ...prev,
      [prodId]: {
        ...prev[prodId],
        [field]: value,
      },
    }));
  };

  // Keyboard navigation: Enter moves qty -> cost -> next row qty.
  const handleEnterNav = (prodId: string, field: 'qty' | 'cost') => (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key !== 'Enter') return;
    e.preventDefault();
    if (field === 'qty') {
      inputRefs.current[`cost-${prodId}`]?.focus();
      return;
    }
    const idx = filteredProducts.findIndex((p) => p.id === prodId);
    const next = filteredProducts[idx + 1];
    if (next) inputRefs.current[`qty-${next.id}`]?.focus();
  };

  const handleSaveAll = async () => {
    if (!selectedWarehouseId) return;
    try {
      setIsSaving(true);
      setSavedSuccess(false);
      const now = new Date().toISOString();

      await db.transaction('rw', [db.stock_levels, db.products, db.inventory_transactions, db.sync_queue], async () => {
        for (const [prodId, val] of Object.entries(editValues)) {
          const qty = roundQty(toNumber(val.qty));
          const cost = roundMoney(toNumber(val.cost));

          // Update cost price on product if changed
          const prod = products.find((p) => p.id === prodId);
          if (prod && prod.cost_price !== cost) {
            const updatedProd: Product = {
              ...prod,
              cost_price: cost,
              updated_at: now,
              sync_status: 'pending',
            };
            await db.products.put(updatedProd);
            await SyncQueueManager.enqueue('products', prodId, 'update', updatedProd);
          }

          // Update stock level
          const existingLevel = await db.stock_levels
            .where('product_id')
            .equals(prodId)
            .and((s) => s.warehouse_id === selectedWarehouseId)
            .first();

          if (existingLevel) {
            if (existingLevel.quantity !== qty) {
              const updatedLevel: StockLevel = {
                ...existingLevel,
                quantity: qty,
                available_quantity: qty - (existingLevel.reserved_quantity || 0),
                updated_at: now,
                sync_status: 'pending',
              };
              await db.stock_levels.put(updatedLevel);
              await SyncQueueManager.enqueue('stock_levels', updatedLevel.id, 'upsert', updatedLevel);

              // Log opening balance change
              const txId = uuidv4();
              const txChange = qty - existingLevel.quantity;
              const tx = {
                id: txId,
                org_id: orgId,
                warehouse_id: selectedWarehouseId,
                product_id: prodId,
                transaction_type: 'opening_balance' as const,
                quantity: txChange,
                unit_id: 'default_unit',
                unit_conversion_factor: 1,
                base_quantity: txChange,
                unit_cost: cost,
                total_cost: moneyProduct(txChange, cost),
                balance_after: qty,
                notes: 'تسجيل / تعديل رصيد أول المدة',
                created_by: currentUser?.id || '',
                created_at: now,
                sync_status: 'pending' as const,
              };
              await db.inventory_transactions.add(tx);
              await SyncQueueManager.enqueue('inventory_transactions', txId, 'insert', tx);
            }
          } else if (qty > 0) {
            const stockId = `${selectedWarehouseId}_${prodId}`;
            const newLevel: StockLevel = {
              id: stockId,
              org_id: orgId,
              product_id: prodId,
              warehouse_id: selectedWarehouseId,
              quantity: qty,
              reserved_quantity: 0,
              available_quantity: qty,
              updated_at: now,
              sync_status: 'pending',
            };
            await db.stock_levels.put(newLevel);
            await SyncQueueManager.enqueue('stock_levels', stockId, 'upsert', newLevel);

            const txId = uuidv4();
            const tx = {
              id: txId,
              org_id: orgId,
              warehouse_id: selectedWarehouseId,
              product_id: prodId,
              transaction_type: 'opening_balance' as const,
              quantity: qty,
              unit_id: 'default_unit',
              unit_conversion_factor: 1,
              base_quantity: qty,
              unit_cost: cost,
              total_cost: moneyProduct(qty, cost),
              balance_after: qty,
              notes: 'تسجيل رصيد أول المدة الافتتاحي',
              created_by: currentUser?.id || '',
              created_at: now,
              sync_status: 'pending' as const,
            };
            await db.inventory_transactions.add(tx);
            await SyncQueueManager.enqueue('inventory_transactions', txId, 'insert', tx);
          }
        }
      });

      setSavedSuccess(true);
      await loadData();
    } catch (err) {
      console.error('Error saving opening balance:', err);
    } finally {
      setIsSaving(false);
    }
  };

  const filteredProducts = products.filter(
    (p) =>
      p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (p.sku && p.sku.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto" dir="rtl">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-xl bg-blue-50 dark:bg-blue-950/50 flex items-center justify-center text-[#2563eb]">
            <ArrowRightToLine className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-xl font-black text-slate-900 dark:text-white">أرصدة أول المدة للأصناف</h1>
            <p className="text-xs text-slate-500 dark:text-slate-400 font-bold mt-0.5">
              إدخال وتثبيت الأرصدة الافتتاحية وتكلفة البضاعة لبدء الدورة المخزنية والمحاسبية
            </p>
          </div>
        </div>

        <Button
          disabled={isSaving}
          onClick={handleSaveAll}
          className="bg-[#2563eb] hover:bg-blue-700 text-white font-black text-xs h-10 px-6 rounded-xl flex items-center gap-2 shadow-md shadow-blue-500/20"
        >
          <Save className="w-4 h-4" />
          {isSaving ? 'جاري الحفظ...' : 'حفظ وتثبيت الأرصدة'}
        </Button>
      </div>

      {savedSuccess && (
        <div className="bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 text-emerald-700 p-4 rounded-xl text-xs font-black flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-600" />
          تم حفظ وتحديث أرصدة أول المدة بنجاح لكافة الأصناف
        </div>
      )}

      {/* إرشاد دقيق: تقسيم الرصيد الفعلي على تواريخ الصلاحية يتم من كرت الصنف */}
      <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200/80 dark:border-slate-800 flex items-start gap-2.5 text-[11px] font-bold text-slate-600 dark:text-slate-300">
        <CalendarClock className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
        <p>
          الأصناف التي يُتبع لها تاريخ الصلاحية: قسّم الكمية الفعلية على تواريخ الصلاحية من
          <span className="text-blue-600 font-black"> كرت الصنف → إضافة رصيد / تشغيلة </span>
          ليُعرض كل تاريخ بكميته ويُتتبّع تلقائياً. هذا الجدول اضغط <kbd className="px-1.5 py-0.5 rounded bg-slate-200 dark:bg-slate-800 text-[10px] font-mono">Enter</kbd> للتنقل بين الخلايا.
        </p>
      </div>

      {/* Warehouse & Search Filters */}
      <div className="flex flex-col sm:flex-row items-center gap-3 bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-800">
        <div className="w-full sm:w-64">
          <select
            value={selectedWarehouseId}
            onChange={(e) => handleWarehouseChange(e.target.value)}
            className="w-full h-10 px-3 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 text-xs font-bold"
          >
            {warehouses.map((w) => (
              <option key={w.id} value={w.id}>
                {w.name}
              </option>
            ))}
          </select>
        </div>

        <div className="relative flex-1 w-full">
          <Search className="w-4 h-4 absolute right-3 top-3 text-slate-400" />
          <Input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="البحث باسم الصنف أو الباركود لتعديل رصيده..."
            className="pr-9 h-10 text-xs font-bold rounded-lg border-slate-200"
          />
        </div>
      </div>

      {/* Grid / Table of Items */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-right border-collapse">
            <thead>
              <tr className="bg-slate-50 dark:bg-slate-800/60 border-b border-slate-200 dark:border-slate-800 text-[11px] font-black text-slate-500">
                <th className="py-3.5 px-4">الصنف</th>
                <th className="py-3.5 px-4">الباركود / الكود</th>
                <th className="py-3.5 px-4 w-40">رصيد أول المدة</th>
                <th className="py-3.5 px-4 w-40">سعر التكلفة (ج.م)</th>
                <th className="py-3.5 px-4">إجمالي القيمة الافتتاحية</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-xs font-bold text-slate-700 dark:text-slate-300">
              {isLoading ? (
                <tr>
                  <td colSpan={5} className="py-12 text-center text-slate-400 font-bold">
                    جاري تحميل الأصناف...
                  </td>
                </tr>
              ) : filteredProducts.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-12 text-center text-slate-400 font-bold">
                    لا توجد أصناف مطابقة
                  </td>
                </tr>
              ) : (
                filteredProducts.map((p) => {
                  const val = editValues[p.id] || { qty: '0', cost: '0' };
                  const total = moneyProduct(roundQty(toNumber(val.qty)), roundMoney(toNumber(val.cost)));

                  return (
                    <tr key={p.id} className="hover:bg-slate-50/70 dark:hover:bg-slate-800/40 transition-colors">
                      <td className="py-3 px-4 font-black text-slate-900 dark:text-white">{p.name}</td>
                      <td className="py-3 px-4 font-mono text-slate-400 text-[11px]">{p.sku}</td>
                      <td className="py-3 px-4">
                        <Input
                          type="number"
                          value={val.qty}
                          onChange={(e) => handleRowChange(p.id, 'qty', e.target.value)}
                          onKeyDown={handleEnterNav(p.id, 'qty')}
                          ref={(el) => {
                            inputRefs.current[`qty-${p.id}`] = el;
                          }}
                          className="h-8 text-xs font-black rounded-lg w-32 bg-slate-50 dark:bg-slate-800"
                        />
                      </td>
                      <td className="py-3 px-4">
                        <Input
                          type="number"
                          value={val.cost}
                          onChange={(e) => handleRowChange(p.id, 'cost', e.target.value)}
                          onKeyDown={handleEnterNav(p.id, 'cost')}
                          ref={(el) => {
                            inputRefs.current[`cost-${p.id}`] = el;
                          }}
                          className="h-8 text-xs font-black rounded-lg w-32 bg-slate-50 dark:bg-slate-800"
                        />
                      </td>
                      <td className="py-3 px-4 font-black text-[#2563eb]">
                        {formatNumber(total, 2)} ج.م
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

export default function OpeningBalancePage() {
  return (
    <AppShell>
      <Suspense fallback={<div className="p-8 text-center text-xs font-bold">جاري تحميل أرصدة أول المدة...</div>}>
        <OpeningBalanceContent />
      </Suspense>
    </AppShell>
  );
}
