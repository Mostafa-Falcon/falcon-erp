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
import { SalesRepository } from '@/modules/sales/sales_repository';
import { format } from 'date-fns';
import {
  RefreshCw,
  Printer,
  FileText,
  FileSpreadsheet,
  SlidersHorizontal,
  Search,
  ShoppingCart,
  Wallet,
  CreditCard,
  Receipt,
  FilterX
} from 'lucide-react';
import { formatNumber } from '@/lib/format';
import { exportToCsv, triggerReportPrint } from '@/lib/export';
import { getSubscriptionPermissions } from '@/core/constants/subscription_profiles';
import type { Contact, SalesInvoice } from '@/types';

export default function SalesReportPage() {
  const { currentUser } = useSessionStore();
  const orgId = currentUser?.org_id || '';

  const [invoices, setInvoices] = useState<SalesInvoice[]>([]);
  const [customers, setCustomers] = useState<Contact[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [subTier, setSubTier] = useState('standard');

  const perms = getSubscriptionPermissions(subTier);

  // Filters State
  const [searchQuery, setSearchQuery] = useState('');
  const [period, setPeriod] = useState('all');
  const [paymentType, setPaymentType] = useState('all');
  const [pageSize, setPageSize] = useState('25');

  const loadData = async () => {
    if (!orgId) return;
    try {
      setIsLoading(true);
      const { db } = await import('@/core/db/app_database');
      const [inv, custs, orgRec] = await Promise.all([
        SalesRepository.getSalesInvoices(orgId),
        db.contacts.where('org_id').equals(orgId).toArray(),
        db.organizations.get(orgId),
      ]);
      setInvoices(inv);
      setCustomers(custs);
      if (orgRec) {
        setSubTier(orgRec.subscription_tier || 'standard');
      }
    } catch (err) {
      console.error('Load sales report error:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [orgId]);

  const filteredInvoices = useMemo(() => {
    return invoices.filter((inv) => {
      // Search
      const matchesSearch = !searchQuery ||
        inv.invoice_number.toLowerCase().includes(searchQuery.toLowerCase()) ||
        customers.find(c => c.id === inv.customer_id)?.name.toLowerCase().includes(searchQuery.toLowerCase());

      // Payment Type
      const matchesPayment = paymentType === 'all' || inv.payment_type === paymentType;

      // Period Filter (Logic for Today, Yesterday, etc.)
      let matchesPeriod = true;
      const invDate = new Date(inv.invoice_date);
      const now = new Date();
      if (period === 'today') {
        matchesPeriod = invDate.toDateString() === now.toDateString();
      } else if (period === 'yesterday') {
        const yesterday = new Date();
        yesterday.setDate(now.getDate() - 1);
        matchesPeriod = invDate.toDateString() === yesterday.toDateString();
      } else if (period === 'month') {
        matchesPeriod = invDate.getMonth() === now.getMonth() && invDate.getFullYear() === now.getFullYear();
      }

      return matchesSearch && matchesPayment && matchesPeriod;
    });
  }, [invoices, searchQuery, paymentType, period, customers]);

  // Calculated Stats
  const stats = useMemo(() => {
    let total = 0;
    let cash = 0;
    let credit = 0;
    for (const inv of filteredInvoices) {
      total += inv.total;
      cash += inv.cash_amount;
      credit += inv.remaining_amount;
    }
    return {
      totalSales: total,
      cashCollection: cash,
      creditSales: credit,
      invoiceCount: filteredInvoices.length
    };
  }, [filteredInvoices]);

  const customerName = (id?: string | null) => (id ? customers.find((c) => c.id === id)?.name : 'عميل نقدي');

  const handleExportCsv = () => {
    const exportRows = filteredInvoices.map((inv) => ({
      'رقم الفاتورة': inv.invoice_number,
      'اسم العميل': customerName(inv.customer_id),
      'التاريخ والوقت': inv.invoice_date || inv.created_at,
      'طريقة الدفع': inv.payment_type === 'cash' ? 'نقدي' : inv.payment_type === 'card' ? 'بطاقة' : 'آجل',
      'الإجمالي (ج.م)': inv.total,
    }));
    exportToCsv('تقرير_المبيعات', exportRows);
  };

  return (
    <AppShell
      title="تقرير المبيعات"
      subtitle="تحليل أداء المبيعات والتدفقات النقدية والآجلة بشكل لحظي."
    >
      <div className="space-y-6 text-right" dir="rtl">

        {/* ==================== SUMMARY CARDS ==================== */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard label="إجمالي المبيعات" value={stats.totalSales} icon={<ShoppingCart className="w-6 h-6" />} color="blue" />
          <StatCard label="التحصيل النقدي" value={stats.cashCollection} icon={<Wallet className="w-6 h-6" />} color="emerald" />
          <StatCard label="المبيعات الآجلة" value={stats.creditSales} icon={<CreditCard className="w-6 h-6" />} color="amber" />
          <StatCard label="عدد الفواتير" value={stats.invoiceCount} icon={<Receipt className="w-6 h-6" />} color="sky" isNumber />
        </div>

        {/* ==================== FILTERS & TOOLBAR ==================== */}
        <div className="bg-white dark:bg-[#131b2e] rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-sm overflow-hidden">

          {/* Quick Filters Row */}
          <div className="p-4 border-b border-slate-100 dark:border-slate-800/80 flex flex-wrap items-center justify-between gap-4">
            <div className="flex flex-wrap items-center gap-4">
              <div className="flex items-center gap-2">
                <span className="text-xs font-black text-slate-400">الفترة الزمنية</span>
                <Select value={period} onValueChange={setPeriod}>
                  <SelectTrigger className="w-40 h-10 rounded-xl bg-slate-50/50 dark:bg-slate-900/50 border-slate-200 dark:border-slate-800 text-xs font-bold">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">الكل</SelectItem>
                    <SelectItem value="today">اليوم</SelectItem>
                    <SelectItem value="yesterday">أمس</SelectItem>
                    <SelectItem value="month">هذا الشهر</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="flex items-center gap-2">
                <span className="text-xs font-black text-slate-400">نوع الدفع</span>
                <Select value={paymentType} onValueChange={setPaymentType}>
                  <SelectTrigger className="w-32 h-10 rounded-xl bg-slate-50/50 dark:bg-slate-900/50 border-slate-200 dark:border-slate-800 text-xs font-bold">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">الكل</SelectItem>
                    <SelectItem value="cash">نقدي</SelectItem>
                    <SelectItem value="card">بطاقة</SelectItem>
                    <SelectItem value="credit">آجل</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <Button
                variant="ghost"
                onClick={() => { setPeriod('all'); setPaymentType('all'); setSearchQuery(''); }}
                className="h-10 text-red-500 hover:text-red-600 hover:bg-red-50 text-xs font-bold gap-1.5"
              >
                <FilterX className="w-4 h-4" /> مسح الفلاتر
              </Button>
            </div>

            <div className="flex items-center gap-2 text-xs font-bold text-slate-500">
              <span>عرض</span>
              <Select value={pageSize} onValueChange={setPageSize}>
                <SelectTrigger className="w-16 h-10 rounded-xl bg-slate-50/60 dark:bg-slate-900/60 border-slate-200 dark:border-slate-800 text-xs font-bold">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="10">10</SelectItem>
                  <SelectItem value="25">25</SelectItem>
                  <SelectItem value="50">50</SelectItem>
                  <SelectItem value="100">100</SelectItem>
                </SelectContent>
              </Select>
              <span>إدخالات</span>
            </div>
          </div>

          {/* Main Toolbar */}
          <div className="p-4 bg-slate-50/30 dark:bg-slate-900/30 flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <button onClick={loadData} className="w-10 h-10 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-500 hover:bg-slate-50 flex items-center justify-center transition-colors shadow-xs cursor-pointer" title="تحديث البيانات">
                <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
              </button>

              {perms.canExportReports && (
                <>
                  <button onClick={triggerReportPrint} className="w-10 h-10 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-500 hover:bg-slate-50 flex items-center justify-center transition-colors shadow-xs cursor-pointer" title="طباعة التقرير">
                    <Printer className="w-4 h-4 text-blue-600" />
                  </button>
                  <button onClick={handleExportCsv} className="w-10 h-10 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-500 hover:bg-slate-50 flex items-center justify-center transition-colors shadow-xs cursor-pointer" title="تصدير لملف Excel">
                    <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
                  </button>
                </>
              )}

              <div className="h-6 w-[1px] bg-slate-200 dark:bg-slate-800 mx-2" />

              <Button variant="outline" className="h-10 border-slate-200 dark:border-slate-800 text-xs font-bold gap-1.5 rounded-xl">
                <SlidersHorizontal className="w-4 h-4" /> تخصيص الأعمدة
              </Button>
            </div>

            <div className="relative group">
              <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 group-focus-within:text-pink-500 transition-colors" />
              <Input
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="بحث سريع في الجدول..."
                className="h-10 pr-9 w-64 bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 rounded-xl text-xs font-bold"
              />
              <span className="absolute left-3 top-1/2 -translate-y-1/2 bg-pink-50 text-pink-600 px-1.5 py-0.5 rounded text-[10px] font-black">
                {filteredInvoices.length}
              </span>
            </div>
          </div>

          {/* ==================== DATA GRID ==================== */}
          <div className="overflow-x-auto">
            <table className="w-full text-right border-collapse">
              <thead>
                <tr className="bg-slate-50/50 dark:bg-slate-900/50 border-b border-slate-100 dark:border-slate-800 text-[11px] font-black text-slate-400 uppercase tracking-wider">
                  <th className="py-4 px-5 w-10 text-center"><input type="checkbox" className="rounded accent-pink-500" /></th>
                  <th className="py-4 px-4">رقم الفاتورة</th>
                  <th className="py-4 px-4">العميل</th>
                  <th className="py-4 px-4">التاريخ والوقت</th>
                  <th className="py-4 px-4 text-center">طريقة الدفع</th>
                  <th className="py-4 px-4 text-left">القيمة الإجمالية</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50 dark:divide-slate-800/50 text-xs font-bold">
                {filteredInvoices.map((inv) => (
                  <tr key={inv.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-900/30 transition-colors group">
                    <td className="py-4 px-5 text-center"><input type="checkbox" className="rounded accent-pink-500" /></td>
                    <td className="py-4 px-4 text-slate-900 dark:text-white font-black">{inv.invoice_number}</td>
                    <td className="py-4 px-4 text-slate-600 dark:text-slate-400">{customerName(inv.customer_id)}</td>
                    <td className="py-4 px-4 text-slate-500 font-medium">
                      {format(new Date(inv.invoice_date), 'yyyy-MM-dd')} <span className="mr-1 text-[10px] opacity-70">{format(new Date(inv.invoice_date), 'hh:mm a')}</span>
                    </td>
                    <td className="py-4 px-4 text-center">
                      <span className={`px-2.5 py-1 rounded-lg text-[10px] font-black ${
                        inv.payment_type === 'cash' ? 'bg-emerald-50 text-emerald-600' :
                        inv.payment_type === 'card' ? 'bg-blue-50 text-blue-600' : 'bg-amber-50 text-amber-600'
                      }`}>
                        {inv.payment_type === 'cash' ? 'نقدي' : inv.payment_type === 'card' ? 'بطاقة' : 'آجل'}
                      </span>
                    </td>
                    <td className="py-4 px-4 text-left text-blue-600 font-black text-sm">
                      {formatNumber(inv.total)} <span className="text-[10px] opacity-70">ج.م</span>
                    </td>
                  </tr>
                ))}
                {filteredInvoices.length === 0 && (
                  <tr>
                    <td colSpan={6} className="py-20 text-center text-slate-400 font-black">لا توجد بيانات متاحة للعرض في هذه الفترة.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {/* Footer Bar */}
          <div className="p-4 bg-slate-50/20 dark:bg-slate-900/20 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-[11px] font-bold text-slate-400">
            <div>عرض 1 إلى {filteredInvoices.length} من إجمالي {invoices.length} فاتورة</div>
            <div className="flex items-center gap-1.5">
              <button className="w-8 h-8 rounded-lg border border-slate-200 flex items-center justify-center hover:bg-white transition-colors cursor-pointer">«</button>
              <button className="w-8 h-8 rounded-lg bg-pink-600 text-white flex items-center justify-center shadow-sm">1</button>
              <button className="w-8 h-8 rounded-lg border border-slate-200 flex items-center justify-center hover:bg-white transition-colors cursor-pointer">»</button>
            </div>
          </div>

        </div>

      </div>
    </AppShell>
  );
}

function StatCard({ label, value, icon, color, isNumber = false }: { label: string, value: number, icon: React.ReactNode, color: 'blue' | 'emerald' | 'amber' | 'sky', isNumber?: boolean }) {
  const colors = {
    blue: 'bg-blue-50 text-blue-600 border-blue-100',
    emerald: 'bg-emerald-50 text-emerald-600 border-emerald-100',
    amber: 'bg-amber-50 text-amber-600 border-amber-100',
    sky: 'bg-sky-50 text-sky-600 border-sky-100'
  };

  return (
    <div className="bg-white dark:bg-[#131b2e] rounded-2xl border border-slate-200/80 dark:border-slate-800 p-5 flex items-center justify-between shadow-xs">
      <div className="flex items-center gap-4">
        <div className={`w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 shadow-inner ${colors[color]}`}>
          {icon}
        </div>
        <div>
          <span className="text-xs font-bold text-slate-400 block mb-1">{label}</span>
          <span className={`text-xl font-black ${colors[color].split(' ')[1]}`}>
            {isNumber ? value : formatNumber(value)} {!isNumber && <span className="text-[10px] font-bold mr-0.5">ج.م</span>}
          </span>
        </div>
      </div>
    </div>
  );
}
