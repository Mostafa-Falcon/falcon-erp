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
import { formatNumber, formatDate } from '@/lib/format';
import { exportToCsv, triggerReportPrint } from '@/lib/export';
import type { Expense, ExpenseCategory, Treasury } from '@/types';
import {
  RefreshCw,
  Printer,
  FileSpreadsheet,
  Search,
  Receipt,
  CreditCard,
  Layers,
  FilterX,
} from 'lucide-react';

export default function ExpensesReportPage() {
  const { currentUser } = useSessionStore();
  const orgId = currentUser?.org_id || '';

  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [categories, setCategories] = useState<ExpenseCategory[]>([]);
  const [treasuries, setTreasuries] = useState<Treasury[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Filters State
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [treasuryFilter, setTreasuryFilter] = useState('all');

  const loadData = async () => {
    if (!orgId) return;
    try {
      setIsLoading(true);
      const { db } = await import('@/core/db/app_database');
      const [exps, cats, tres] = await Promise.all([
        db.expenses.where('org_id').equals(orgId).toArray(),
        db.expense_categories.where('org_id').equals(orgId).toArray(),
        db.treasuries.where('org_id').equals(orgId).toArray(),
      ]);
      setExpenses(exps);
      setCategories(cats);
      setTreasuries(tres);
    } catch (err) {
      console.error('Load expenses report error:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [orgId]);

  const catMap = useMemo(() => {
    const map: Record<string, string> = {};
    for (const c of categories) {
      map[c.id] = c.name;
    }
    return map;
  }, [categories]);

  const treasuryMap = useMemo(() => {
    const map: Record<string, string> = {};
    for (const t of treasuries) {
      map[t.id] = t.name;
    }
    return map;
  }, [treasuries]);

  const filteredExpenses = useMemo(() => {
    return expenses.filter((exp) => {
      const q = searchQuery.trim().toLowerCase();
      const catName = (catMap[exp.category_id || ''] || '').toLowerCase();
      const desc = (exp.description || '').toLowerCase();
      const matchQuery =
        !q ||
        catName.includes(q) ||
        desc.includes(q) ||
        (exp.receipt_number && exp.receipt_number.toLowerCase().includes(q));

      const matchCategory =
        categoryFilter === 'all' || exp.category_id === categoryFilter;

      const matchTreasury =
        treasuryFilter === 'all' || exp.treasury_id === treasuryFilter;

      return matchQuery && matchCategory && matchTreasury;
    });
  }, [expenses, searchQuery, categoryFilter, treasuryFilter, catMap]);

  // Statistics
  const stats = useMemo(() => {
    let totalAmount = 0;

    for (const exp of filteredExpenses) {
      totalAmount += exp.amount || 0;
    }

    return {
      count: filteredExpenses.length,
      totalAmount,
    };
  }, [filteredExpenses]);

  const handleExportCsv = () => {
    const data = filteredExpenses.map((exp) => ({
      'رقم السند / الإيصال': exp.receipt_number || exp.id.slice(0, 8),
      'الفئة / البند': catMap[exp.category_id || ''] || 'عام',
      'الخزينة / الحساب': treasuryMap[exp.treasury_id || ''] || 'الخزينة الرئيسية',
      'التاريخ': formatDate(exp.created_at),
      'المبلغ': exp.amount,
      'البيان / ملاحظات': exp.description || '-',
    }));
    exportToCsv('تقرير_المصاريف', data);
  };

  return (
    <AppShell
      title="تقرير المصاريف والنفقات"
      subtitle="تحليل وتقارير بنود المصروفات والإيعازات النقدية المسجلة في المنشأة"
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
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
          <div className="bg-white dark:bg-[#111726] p-4 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-xs flex items-center justify-between">
            <div>
              <span className="text-xs font-bold text-slate-500">عدد سندات المصروفات</span>
              <div className="text-2xl font-black text-slate-900 dark:text-white font-mono mt-0.5">
                {stats.count}
              </div>
            </div>
            <div className="w-10 h-10 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center">
              <Receipt className="w-5 h-5" />
            </div>
          </div>

          <div className="bg-white dark:bg-[#111726] p-4 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-xs flex items-center justify-between">
            <div>
              <span className="text-xs font-bold text-slate-500">إجمالي قيمة المصروفات</span>
              <div className="text-2xl font-black text-rose-600 dark:text-rose-400 font-mono mt-0.5">
                {formatNumber(stats.totalAmount)} <span className="text-xs font-bold">ج.م</span>
              </div>
            </div>
            <div className="w-10 h-10 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center">
              <CreditCard className="w-5 h-5" />
            </div>
          </div>

          <div className="bg-white dark:bg-[#111726] p-4 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-xs flex items-center justify-between">
            <div>
              <span className="text-xs font-bold text-slate-500">عدد الفئات والبنود</span>
              <div className="text-2xl font-black text-blue-600 dark:text-blue-400 font-mono mt-0.5">
                {categories.length}
              </div>
            </div>
            <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
              <Layers className="w-5 h-5" />
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
              placeholder="البحث بالبيان، البند، أو رقم السند..."
              className="h-10 pr-9 bg-slate-50 dark:bg-slate-900 border-slate-200 text-xs font-bold rounded-xl"
            />
          </div>

          <div className="flex flex-wrap items-center gap-2 w-full md:w-auto">
            {/* Category Filter */}
            <Select value={categoryFilter} onValueChange={setCategoryFilter}>
              <SelectTrigger className="h-10 w-44 rounded-xl bg-slate-50 dark:bg-slate-900 border-slate-200 text-xs font-bold">
                <SelectValue placeholder="فئة المصروف" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">كافة الفئات</SelectItem>
                {categories.map((c) => (
                  <SelectItem key={c.id} value={c.id}>
                    {c.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {/* Treasury Filter */}
            <Select value={treasuryFilter} onValueChange={setTreasuryFilter}>
              <SelectTrigger className="h-10 w-44 rounded-xl bg-slate-50 dark:bg-slate-900 border-slate-200 text-xs font-bold">
                <SelectValue placeholder="الخزينة / الحساب" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">كافة الخزائن</SelectItem>
                {treasuries.map((t) => (
                  <SelectItem key={t.id} value={t.id}>
                    {t.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setSearchQuery('');
                setCategoryFilter('all');
                setTreasuryFilter('all');
              }}
              className="h-10 px-3 text-xs font-bold rounded-xl border-slate-200 text-slate-500 gap-1.5"
            >
              <FilterX className="w-3.5 h-3.5" />
              <span>إعادة ضبط</span>
            </Button>
          </div>
        </div>

        {/* Data Table */}
        <div id="expenses-report-table" className="bg-white dark:bg-[#111726] rounded-2xl border border-slate-200/80 dark:border-slate-800 overflow-hidden shadow-xs">
          <div className="overflow-x-auto">
            <table className="w-full text-right text-xs">
              <thead className="bg-slate-50/80 dark:bg-slate-900/60 border-b border-slate-200 dark:border-slate-800 text-slate-500 font-bold">
                <tr>
                  <th className="py-3.5 px-4">رقم السند</th>
                  <th className="py-3.5 px-4">البند / الفئة</th>
                  <th className="py-3.5 px-4">الخزينة / الحساب</th>
                  <th className="py-3.5 px-4">التاريخ</th>
                  <th className="py-3.5 px-4">البيان / الملاحظات</th>
                  <th className="py-3.5 px-4 text-center">المبلغ</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800 font-bold">
                {isLoading ? (
                  <tr>
                    <td colSpan={6} className="py-12 text-center text-slate-400">
                      جاري تحميل بيانات تقارير المصروفات...
                    </td>
                  </tr>
                ) : filteredExpenses.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-12 text-center text-slate-400">
                      لا توجد مصروفات تطابق شروط الفلترة
                    </td>
                  </tr>
                ) : (
                  filteredExpenses.map((exp) => (
                    <tr key={exp.id} className="hover:bg-slate-50/60 dark:hover:bg-slate-800/40 transition-colors">
                      <td className="py-3.5 px-4 font-mono font-black text-slate-900 dark:text-white">
                        {exp.receipt_number || exp.id.slice(0, 8)}
                      </td>
                      <td className="py-3.5 px-4 text-slate-800 dark:text-slate-200">
                        {catMap[exp.category_id || ''] || 'عام'}
                      </td>
                      <td className="py-3.5 px-4 text-slate-600 dark:text-slate-300">
                        {treasuryMap[exp.treasury_id || ''] || 'الخزينة الرئيسية'}
                      </td>
                      <td className="py-3.5 px-4 text-slate-500 font-mono">
                        {formatDate(exp.created_at)}
                      </td>
                      <td className="py-3.5 px-4 text-slate-500">
                        {exp.description || '-'}
                      </td>
                      <td className="py-3.5 px-4 text-center font-mono font-black text-rose-600 dark:text-rose-400">
                        {formatNumber(exp.amount)} ج.م
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </AppShell>
  );
}
