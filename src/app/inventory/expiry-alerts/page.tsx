'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { Suspense } from 'react';
import { AppShell } from '@/components/layout/AppShell';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useSessionStore } from '@/core/state/useSessionStore';
import { db } from '@/core/db/app_database';
import { formatNumber, formatDate } from '@/lib/format';
import type { ProductBatch, Product, Warehouse } from '@/types';
import { Bell, AlertTriangle, CheckCircle, Clock, Search, ShieldAlert, ArrowRight, Tag } from 'lucide-react';
import Link from 'next/link';

interface ExpiryItem {
  batch: ProductBatch;
  product?: Product;
  daysRemaining: number;
  status: 'expired' | 'critical' | 'warning' | 'good';
}

function ExpiryAlertsContent() {
  const { currentUser } = useSessionStore();
  const orgId = currentUser?.org_id || '';

  const [batches, setBatches] = useState<ProductBatch[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [warehouses, setWarehouses] = useState<Warehouse[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [urgencyFilter, setUrgencyFilter] = useState<string>('all');

  const loadData = async () => {
    if (!orgId) return;
    try {
      setIsLoading(true);

      let allBatches: ProductBatch[] = [];
      try {
        allBatches = await db.product_batches.where('org_id').equals(orgId).toArray();
      } catch {
        const rawBatches = await db.product_batches.toArray();
        allBatches = rawBatches.filter((b) => b.org_id === orgId || !b.org_id);
      }

      const [allProds, allWh] = await Promise.all([
        db.products.where('org_id').equals(orgId).toArray(),
        db.warehouses.where('org_id').equals(orgId).toArray(),
      ]);

      setBatches(allBatches);
      setProducts(allProds);
      setWarehouses(allWh);
    } catch (err) {
      console.error('Error loading expiry data:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [orgId]);

  const items: ExpiryItem[] = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    return batches
      .filter((b) => b.expiry_date && (b.current_quantity ?? b.quantity_in) > 0)
      .map((batch) => {
        const prod = products.find((p) => p.id === batch.product_id);
        const expDate = new Date(batch.expiry_date!);
        const diffMs = expDate.getTime() - today.getTime();
        const days = Math.ceil(diffMs / (1000 * 60 * 60 * 24));

        let status: 'expired' | 'critical' | 'warning' | 'good' = 'good';
        if (days < 0) status = 'expired';
        else if (days <= 30) status = 'critical';
        else if (days <= 90) status = 'warning';

        return {
          batch,
          product: prod,
          daysRemaining: days,
          status,
        };
      })
      .sort((a, b) => a.daysRemaining - b.daysRemaining);
  }, [batches, products]);

  const filteredItems = useMemo(() => {
    return items.filter((it) => {
      const q = searchQuery.toLowerCase();
      const matchSearch =
        !q ||
        (it.product?.name && it.product.name.toLowerCase().includes(q)) ||
        (it.batch.batch_number && it.batch.batch_number.toLowerCase().includes(q));

      const matchUrgency =
        urgencyFilter === 'all' ||
        (urgencyFilter === 'expired' && it.status === 'expired') ||
        (urgencyFilter === 'critical' && it.status === 'critical') ||
        (urgencyFilter === 'warning' && it.status === 'warning') ||
        (urgencyFilter === 'near' && (it.status === 'critical' || it.status === 'warning'));

      return matchSearch && matchUrgency;
    });
  }, [items, searchQuery, urgencyFilter]);

  const expiredCount = items.filter((i) => i.status === 'expired').length;
  const criticalCount = items.filter((i) => i.status === 'critical').length;
  const warningCount = items.filter((i) => i.status === 'warning').length;

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto" dir="rtl">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-xl bg-amber-50 dark:bg-amber-950/50 flex items-center justify-center text-amber-600">
            <Bell className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-xl font-black text-slate-900 dark:text-white">تنبيهات ومراقبة الصلاحية</h1>
            <p className="text-xs text-slate-500 dark:text-slate-400 font-bold mt-0.5">
              متابعة دفعات وتشغيلات الأصناف القريبة من الانتهاء لحمايتها من التلف والحد من الخسائر
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Link href="/inventory/damages">
            <Button variant="outline" className="h-10 text-xs font-bold rounded-xl border-slate-200">
              تسجيل مخزون تالف
            </Button>
          </Link>
          <Link href="/items/discounts">
            <Button className="h-10 bg-[#2563eb] hover:bg-blue-700 text-white text-xs font-black rounded-xl flex items-center gap-1.5">
              <Tag className="w-4 h-4" />
              تطبيق عروض وخصومات
            </Button>
          </Link>
        </div>
      </div>

      {/* KPI Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
        <div className="bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-800 flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-rose-50 dark:bg-rose-950/40 text-rose-600 flex items-center justify-center font-bold">
            <ShieldAlert className="w-5 h-5" />
          </div>
          <div>
            <span className="text-xs font-bold text-slate-500">منتهية الصلاحية تماماً</span>
            <div className="text-lg font-black text-rose-600">{expiredCount} تشغيلة</div>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-800 flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-amber-50 dark:bg-amber-950/40 text-amber-600 flex items-center justify-center font-bold">
            <AlertTriangle className="w-5 h-5" />
          </div>
          <div>
            <span className="text-xs font-bold text-slate-500">تنتهي خلال 30 يوم (حرج)</span>
            <div className="text-lg font-black text-amber-600">{criticalCount} تشغيلة</div>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-800 flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-blue-50 dark:bg-blue-950/40 text-blue-600 flex items-center justify-center font-bold">
            <Clock className="w-5 h-5" />
          </div>
          <div>
            <span className="text-xs font-bold text-slate-500">تنتهي خلال 90 يوم (تنبيه)</span>
            <div className="text-lg font-black text-blue-600">{warningCount} تشغيلة</div>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-800 flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 flex items-center justify-center font-bold">
            <CheckCircle className="w-5 h-5" />
          </div>
          <div>
            <span className="text-xs font-bold text-slate-500">دفعات صالحة وآمنة</span>
            <div className="text-lg font-black text-emerald-600">
              {items.filter((i) => i.status === 'good').length}
            </div>
          </div>
        </div>
      </div>

      {/* Filter and Search */}
      <div className="flex flex-col sm:flex-row items-center gap-3 bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-800">
        <div className="relative flex-1 w-full">
          <Search className="w-4 h-4 absolute right-3 top-3 text-slate-400" />
          <Input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="البحث باسم الصنف أو رقم التشغيلة (Batch)..."
            className="pr-9 h-10 text-xs font-bold rounded-lg"
          />
        </div>

        <Select value={urgencyFilter} onValueChange={setUrgencyFilter}>
          <SelectTrigger className="w-full sm:w-56 h-10 text-xs font-bold rounded-lg">
            <SelectValue placeholder="مستوى الخطورة" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">كافة الحالات</SelectItem>
            <SelectItem value="near">القريبة والمنتهية (أولوية قصوى)</SelectItem>
            <SelectItem value="expired">منتهية الصلاحية فقط</SelectItem>
            <SelectItem value="critical">أقل من شهر (30 يوم)</SelectItem>
            <SelectItem value="warning">خلال 3 أشهر (90 يوم)</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Batches Table */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-right border-collapse">
            <thead>
              <tr className="bg-slate-50 dark:bg-slate-800/60 border-b border-slate-200 dark:border-slate-800 text-[11px] font-black text-slate-500">
                <th className="py-3.5 px-4">الصنف</th>
                <th className="py-3.5 px-4">رقم التشغيلة (Batch)</th>
                <th className="py-3.5 px-4">تاريخ الانتهاء</th>
                <th className="py-3.5 px-4">المدة المتبقية</th>
                <th className="py-3.5 px-4">الكمية المتوفرة</th>
                <th className="py-3.5 px-4 text-center">الإجراء</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-xs font-bold text-slate-700 dark:text-slate-300">
              {isLoading ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-slate-400 font-bold">
                    جاري فحص صلاحية التشغيلات المخزنية...
                  </td>
                </tr>
              ) : filteredItems.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-slate-400 font-bold">
                    لا توجد تشغيلات تطابق شروط البحث الحالية
                  </td>
                </tr>
              ) : (
                filteredItems.map((it) => {
                  const qty = it.batch.current_quantity ?? it.batch.quantity_in;
                  return (
                    <tr key={it.batch.id} className="hover:bg-slate-50/70 dark:hover:bg-slate-800/40 transition-colors">
                      <td className="py-3 px-4">
                        <span className="font-black text-slate-900 dark:text-white block">
                          {it.product?.name || 'صنف غير معرف'}
                        </span>
                        <span className="text-[10px] text-slate-400">{it.product?.sku}</span>
                      </td>
                      <td className="py-3 px-4 font-mono text-slate-600 dark:text-slate-400">
                        {it.batch.batch_number || 'بدون رقم'}
                      </td>
                      <td className="py-3 px-4 text-slate-700 dark:text-slate-300">
                        {it.batch.expiry_date ? formatDate(it.batch.expiry_date) : '-'}
                      </td>
                      <td className="py-3 px-4">
                        {it.status === 'expired' && (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-black bg-rose-50 text-rose-600 dark:bg-rose-950/40">
                            منتهي منذ {Math.abs(it.daysRemaining)} يوم
                          </span>
                        )}
                        {it.status === 'critical' && (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-black bg-amber-50 text-amber-600 dark:bg-amber-950/40">
                            متبقي {it.daysRemaining} يوم فقط
                          </span>
                        )}
                        {it.status === 'warning' && (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-black bg-blue-50 text-blue-600 dark:bg-blue-950/40">
                            متبقي {it.daysRemaining} يوم
                          </span>
                        )}
                        {it.status === 'good' && (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-black bg-emerald-50 text-emerald-600 dark:bg-emerald-950/40">
                            آمن ({it.daysRemaining} يوم)
                          </span>
                        )}
                      </td>
                      <td className="py-3 px-4 font-black text-slate-900 dark:text-white">
                        {formatNumber(qty)}
                      </td>
                      <td className="py-3 px-4 text-center">
                        {it.product && (
                          <Link href={`/items/${it.product.id}`}>
                            <Button
                              variant="outline"
                              size="sm"
                              className="h-8 text-xs font-bold rounded-lg border-slate-200 hover:bg-blue-50 hover:text-blue-600"
                            >
                              بطاقة الصنف
                            </Button>
                          </Link>
                        )}
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

export default function ExpiryAlertsPage() {
  return (
    <AppShell>
      <Suspense fallback={<div className="p-8 text-center text-xs font-bold">جاري تحميل تنبيهات الصلاحية...</div>}>
        <ExpiryAlertsContent />
      </Suspense>
    </AppShell>
  );
}
