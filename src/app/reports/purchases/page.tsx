'use client';

import React, { useEffect, useMemo, useState } from 'react';
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
import { PurchasesRepository } from '@/modules/purchases/purchases_repository';
import { formatNumber, formatDate } from '@/lib/format';
import { exportToCsv, triggerReportPrint } from '@/lib/export';
import type { Contact, PurchaseInvoice } from '@/types';
import {
  RefreshCw,
  Printer,
  FileSpreadsheet,
  Search,
  ShoppingCart,
  Wallet,
  CreditCard,
  Receipt,
  FilterX,
} from 'lucide-react';

export default function PurchasesReportPage() {
  const { currentUser } = useSessionStore();
  const orgId = currentUser?.org_id || '';

  const [invoices, setInvoices] = useState<PurchaseInvoice[]>([]);
  const [suppliers, setSuppliers] = useState<Contact[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Filters State
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [supplierFilter, setSupplierFilter] = useState('all');

  const loadData = async () => {
    if (!orgId) return;
    try {
      setIsLoading(true);
      const { db } = await import('@/core/db/app_database');
      const [invs, supps] = await Promise.all([
        PurchasesRepository.getPurchaseInvoices(orgId),
        db.contacts.where('org_id').equals(orgId).and((c) => c.type === 'supplier' || c.type === 'both').toArray(),
      ]);
      setInvoices(invs);
      setSuppliers(supps);
    } catch (err) {
      console.error('Load purchases report error:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [orgId]);

  const supplierMap = useMemo(() => {
    const map: Record<string, string> = {};
    for (const s of suppliers) {
      map[s.id] = s.name;
    }
    return map;
  }, [suppliers]);

  const filteredInvoices = useMemo(() => {
    return invoices.filter((inv) => {
      const q = searchQuery.trim().toLowerCase();
      const suppName = (supplierMap[inv.supplier_id || ''] || '').toLowerCase();
      const matchQuery =
        !q ||
        inv.invoice_number.toLowerCase().includes(q) ||
        suppName.includes(q);

      const matchStatus =
        statusFilter === 'all' ||
        (statusFilter === 'paid' && inv.status === 'completed') ||
        (statusFilter === 'unpaid' && inv.status === 'draft') ||
        (statusFilter === 'cancelled' && inv.status === 'cancelled');

      const matchSupplier =
        supplierFilter === 'all' || inv.supplier_id === supplierFilter;

      return matchQuery && matchStatus && matchSupplier;
    });
  }, [invoices, searchQuery, statusFilter, supplierFilter, supplierMap]);

  // Statistics
  const stats = useMemo(() => {
    let totalPurchases = 0;
    let totalPaid = 0;
    let totalUnpaid = 0;

    for (const inv of filteredInvoices) {
      if (inv.status !== 'cancelled') {
        const val = inv.total || 0;
        const paid = inv.paid_amount || 0;
        totalPurchases += val;
        totalPaid += paid;
        totalUnpaid += Math.max(0, val - paid);
      }
    }

    return {
      count: filteredInvoices.length,
      totalPurchases,
      totalPaid,
      totalUnpaid,
    };
  }, [filteredInvoices]);

  const handleExportCsv = () => {
    const data = filteredInvoices.map((inv) => ({
      'رقم الفاتورة': inv.invoice_number,
      'المورد': supplierMap[inv.supplier_id || ''] || 'مورد عام',
      'تاريخ الفاتورة': formatDate(inv.invoice_date || inv.created_at),
      'إجمالي الفاتورة': inv.total || 0,
      'المدفوع': inv.paid_amount || 0,
      'المتبقي': Math.max(0, (inv.total || 0) - (inv.paid_amount || 0)),
      'الحالة': inv.status === 'completed' ? 'مكتملة' : inv.status === 'cancelled' ? 'ملغاة' : 'مسودة',
    }));
    exportToCsv('تقرير_المشتريات', data);
  };

  return (
    <AppShell
      title="تقرير المشتريات الشامل"
      subtitle="تحليل وتقارير حركات الشراء مع الموردين ومتابعة المستحقات والمدفوعات"
      actions={
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={loadData}
            className="h-9 px-3 text-xs font-bold rounded-xl border-slate-200 gap-1.5"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
            <span>تحديث</span>
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={handleExportCsv}
            className="h-9 px-3 text-xs font-bold text-emerald-700 bg-emerald-50 border-emerald-200 rounded-xl gap-1.5 hover:bg-emerald-100"
          >
            <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-600" />
            <span>تصدير Excel</span>
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={() => triggerReportPrint()}
            className="h-9 px-3 text-xs font-bold rounded-xl border-slate-200 gap-1.5"
          >
            <Printer className="w-3.5 h-3.5 text-slate-600" />
            <span>طباعة</span>
          </Button>
        </div>
      }
    >
      <div className="space-y-4">
        {/* KPI Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-4 gap-3.5">
          <div className="bg-white dark:bg-[#111726] p-4 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-xs flex items-center justify-between">
            <div>
              <span className="text-xs font-bold text-slate-500">عدد الفواتير</span>
              <div className="text-2xl font-black text-slate-900 dark:text-white font-mono mt-0.5">
                {stats.count}
              </div>
            </div>
            <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
              <Receipt className="w-5 h-5" />
            </div>
          </div>

          <div className="bg-white dark:bg-[#111726] p-4 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-xs flex items-center justify-between">
            <div>
              <span className="text-xs font-bold text-slate-500">إجمالي قيمة المشتريات</span>
              <div className="text-2xl font-black text-blue-600 dark:text-blue-400 font-mono mt-0.5">
                {formatNumber(stats.totalPurchases)} <span className="text-xs font-bold">ج.م</span>
              </div>
            </div>
            <div className="w-10 h-10 rounded-xl bg-blue-100/80 text-blue-600 flex items-center justify-center">
              <ShoppingCart className="w-5 h-5" />
            </div>
          </div>

          <div className="bg-white dark:bg-[#111726] p-4 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-xs flex items-center justify-between">
            <div>
              <span className="text-xs font-bold text-slate-500">إجمالي المدفوع للموردين</span>
              <div className="text-2xl font-black text-emerald-600 dark:text-emerald-400 font-mono mt-0.5">
                {formatNumber(stats.totalPaid)} <span className="text-xs font-bold">ج.م</span>
              </div>
            </div>
            <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <Wallet className="w-5 h-5" />
            </div>
          </div>

          <div className="bg-white dark:bg-[#111726] p-4 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-xs flex items-center justify-between">
            <div>
              <span className="text-xs font-bold text-slate-500">إجمالي المتبقي (آجل)</span>
              <div className="text-2xl font-black text-amber-600 dark:text-amber-400 font-mono mt-0.5">
                {formatNumber(stats.totalUnpaid)} <span className="text-xs font-bold">ج.م</span>
              </div>
            </div>
            <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center">
              <CreditCard className="w-5 h-5" />
            </div>
          </div>
        </div>

        {/* Toolbar Filters */}
        <div className="bg-white dark:bg-[#111726] p-3 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-xs flex flex-col md:flex-row items-center justify-between gap-3">
          <div className="relative w-full md:w-80">
            <Search className="w-4 h-4 absolute right-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <Input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="البحث برقم الفاتورة أو اسم المورد..."
              className="h-10 pr-9 bg-slate-50 dark:bg-slate-900 border-slate-200 text-xs font-bold rounded-xl"
            />
          </div>

          <div className="flex flex-wrap items-center gap-2 w-full md:w-auto">
            {/* Supplier Filter */}
            <Select value={supplierFilter} onValueChange={setSupplierFilter}>
              <SelectTrigger className="h-10 w-44 rounded-xl bg-slate-50 dark:bg-slate-900 border-slate-200 text-xs font-bold">
                <SelectValue placeholder="المورد" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">كافة الموردين</SelectItem>
                {suppliers.map((s) => (
                  <SelectItem key={s.id} value={s.id}>
                    {s.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {/* Status Filter */}
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="h-10 w-36 rounded-xl bg-slate-50 dark:bg-slate-900 border-slate-200 text-xs font-bold">
                <SelectValue placeholder="الحالة" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">كافة الحالات</SelectItem>
                <SelectItem value="paid">مكتملة</SelectItem>
                <SelectItem value="unpaid">مسودة / آجل</SelectItem>
                <SelectItem value="cancelled">ملغاة</SelectItem>
              </SelectContent>
            </Select>

            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setSearchQuery('');
                setStatusFilter('all');
                setSupplierFilter('all');
              }}
              className="h-10 px-3 text-xs font-bold rounded-xl border-slate-200 text-slate-500 gap-1.5"
            >
              <FilterX className="w-3.5 h-3.5" />
              <span>إعادة ضبط</span>
            </Button>
          </div>
        </div>

        {/* Data Table */}
        <div id="purchases-report-table" className="bg-white dark:bg-[#111726] rounded-2xl border border-slate-200/80 dark:border-slate-800 overflow-hidden shadow-xs">
          <div className="overflow-x-auto">
            <table className="w-full text-right text-xs">
              <thead className="bg-slate-50/80 dark:bg-slate-900/60 border-b border-slate-200 dark:border-slate-800 text-slate-500 font-bold">
                <tr>
                  <th className="py-3.5 px-4">رقم الفاتورة</th>
                  <th className="py-3.5 px-4">المورد</th>
                  <th className="py-3.5 px-4">تاريخ الفاتورة</th>
                  <th className="py-3.5 px-4 text-center">الإجمالي</th>
                  <th className="py-3.5 px-4 text-center">المدفوع</th>
                  <th className="py-3.5 px-4 text-center">المتبقي</th>
                  <th className="py-3.5 px-4 text-center">الحالة</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800 font-bold">
                {isLoading ? (
                  <tr>
                    <td colSpan={7} className="py-12 text-center text-slate-400">
                      جاري تحميل بيانات تقارير المشتريات...
                    </td>
                  </tr>
                ) : filteredInvoices.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-12 text-center text-slate-400">
                      لا توجد فواتير مشتريات تطابق شروط الفلترة
                    </td>
                  </tr>
                ) : (
                  filteredInvoices.map((inv) => {
                    const remaining = Math.max(0, (inv.total || 0) - (inv.paid_amount || 0));
                    return (
                      <tr key={inv.id} className="hover:bg-slate-50/60 dark:hover:bg-slate-800/40 transition-colors">
                        <td className="py-3.5 px-4 font-mono font-black text-slate-900 dark:text-white">
                          {inv.invoice_number}
                        </td>
                        <td className="py-3.5 px-4 text-slate-800 dark:text-slate-200">
                          {supplierMap[inv.supplier_id || ''] || 'مورد عام'}
                        </td>
                        <td className="py-3.5 px-4 text-slate-500 font-mono">
                          {formatDate(inv.invoice_date || inv.created_at)}
                        </td>
                        <td className="py-3.5 px-4 text-center font-mono font-black text-slate-900 dark:text-white">
                          {formatNumber(inv.total)} ج.م
                        </td>
                        <td className="py-3.5 px-4 text-center font-mono text-emerald-600">
                          {formatNumber(inv.paid_amount)} ج.م
                        </td>
                        <td className="py-3.5 px-4 text-center font-mono text-amber-600">
                          {formatNumber(remaining)} ج.م
                        </td>
                        <td className="py-3.5 px-4 text-center">
                          <span
                            className={`inline-block px-2.5 py-0.5 rounded-full text-[10px] font-black ${
                              inv.status === 'completed'
                                ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40'
                                : inv.status === 'cancelled'
                                ? 'bg-rose-50 text-rose-600 dark:bg-rose-950/40'
                                : 'bg-amber-50 text-amber-700 dark:bg-amber-950/40'
                            }`}
                          >
                            {inv.status === 'completed' ? 'مكتملة' : inv.status === 'cancelled' ? 'ملغاة' : 'مسودة'}
                          </span>
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
    </AppShell>
  );
}
