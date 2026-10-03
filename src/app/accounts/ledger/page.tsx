'use client';

import React, { useCallback, useEffect, useMemo, useState, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { AppShell } from '@/components/layout/AppShell';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { KpiCard } from '@/components/ui/kpi-card';
import { EmptyState } from '@/components/ui/empty-state';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useSessionStore } from '@/core/state/useSessionStore';
import { formatNumber } from '@/lib/format';
import { toast } from 'sonner';
import {
  RefreshCw,
  BookOpen,
  Printer,
  Calendar,
  Layers,
  ArrowUpRight,
  ArrowDownLeft,
  FilterX,
  FileSpreadsheet,
} from 'lucide-react';
import { AccountingRepository } from '@/modules/accounting/accounting_repository';
import { getAccountStatement, type LedgerRow } from '@/modules/accounting/accounting_reports';
import type { Account } from '@/types';

function LedgerContent() {
  const searchParams = useSearchParams();
  const urlAccountId = searchParams.get('account') || searchParams.get('id');

  const { currentUser } = useSessionStore();
  const orgId = currentUser?.org_id || '';

  const [accounts, setAccounts] = useState<Account[]>([]);
  const [accountId, setAccountId] = useState('');
  const [rows, setRows] = useState<LedgerRow[]>([]);
  const [opening, setOpening] = useState(0);
  const [closing, setClosing] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');

  useEffect(() => {
    if (!orgId) return;
    Promise.resolve()
      .then(async () => {
        await AccountingRepository.ensureDefaultChartOfAccounts(orgId);
        const list = await AccountingRepository.listLeafAccounts(orgId);
        const sorted = list.sort((a, b) => a.code.localeCompare(b.code));
        setAccounts(sorted);
        // Pre-select account from URL if valid, or default
        if (urlAccountId && sorted.some((a) => a.id === urlAccountId)) {
          setAccountId(urlAccountId);
        } else if (!accountId && sorted.length > 0) {
          const cashAcc = sorted.find((a) => a.code.startsWith('101') || a.type === 'asset') || sorted[0];
          setAccountId(cashAcc.id);
        }
      })
      .catch((err) => console.error('Ledger accounts error:', err));
  }, [orgId, accountId, urlAccountId]);

  const loadData = useCallback(async () => {
    if (!orgId || !accountId) {
      setRows([]);
      setOpening(0);
      setClosing(0);
      return;
    }
    try {
      setIsLoading(true);
      const result = await getAccountStatement(orgId, accountId, from || null, to || null);
      setRows(result.rows);
      setOpening(result.opening);
      setClosing(result.closing);
    } catch (err) {
      console.error('Ledger error:', err);
      toast.error('حدث خطأ أثناء تحميل كشف الحساب');
    } finally {
      setIsLoading(false);
    }
  }, [orgId, accountId, from, to]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const selectedAccount = useMemo(() => {
    return accounts.find((a) => a.id === accountId);
  }, [accounts, accountId]);

  const { totalDebit, totalCredit } = useMemo(() => {
    let d = 0;
    let c = 0;
    for (const r of rows) {
      d += r.debit || 0;
      c += r.credit || 0;
    }
    return { totalDebit: d, totalCredit: c };
  }, [rows]);

  const handlePrint = () => {
    if (!selectedAccount) {
      toast.warning('يرجى تحديد حساب أولاً لطباعة كشف الحساب');
      return;
    }
    window.print();
  };

  const headerActions = (
    <div className="flex items-center gap-2">
      <Button
        variant="outline"
        onClick={handlePrint}
        className="h-10 px-3.5 rounded-xl text-xs font-bold gap-2 border-slate-200 dark:border-slate-800 shadow-2xs hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
      >
        <Printer className="w-4 h-4 text-slate-500" />
        <span className="hidden sm:inline">طباعة الكشف</span>
      </Button>

      <Button
        onClick={loadData}
        className="h-10 px-4 bg-primary hover:bg-primary/90 text-white rounded-xl font-bold text-xs flex items-center gap-2 shadow-xs hover:shadow-md transition-all cursor-pointer"
      >
        <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
        <span>تحديث</span>
      </Button>
    </div>
  );

  return (
    <AppShell
      title="دفتر الأستاذ العام"
      subtitle="حركة الحساب التفصيلية مع الرصيد الجاري (Running Balance) وسجل الحركات المحاسبية"
      actions={headerActions}
    >
      <div className="space-y-5 text-right select-none" dir="rtl">
        {/* Financial KPI Summary Cards — Linear / Stripe Style */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <KpiCard
            label="الرصيد الافتتاحي"
            value={formatNumber(opening)}
            unit="ج.م"
            variant="blue"
            icon={<BookOpen className="w-5 h-5" />}
          />
          <KpiCard
            label="إجمالي الحركات المدينة (+)"
            value={formatNumber(totalDebit)}
            unit="ج.م"
            variant="emerald"
            icon={<ArrowDownLeft className="w-5 h-5" />}
          />
          <KpiCard
            label="إجمالي الحركات الدائنة (-)"
            value={formatNumber(totalCredit)}
            unit="ج.م"
            variant="amber"
            icon={<ArrowUpRight className="w-5 h-5" />}
          />
          <KpiCard
            label="الرصيد الختامي الحالي"
            value={formatNumber(closing)}
            unit="ج.م"
            variant={closing >= 0 ? 'indigo' : 'rose'}
            icon={<Layers className="w-5 h-5" />}
          />
        </div>

        {/* Unified Filter & Account Selector Toolbar */}
        <div className="bg-surface rounded-2xl border border-slate-200/80 dark:border-slate-800/80 p-4 shadow-2xs flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          {/* Account Selector */}
          <div className="flex-1 max-w-md">
            <label className="block text-2xs font-black text-slate-500 dark:text-slate-400 mb-1.5 pr-0.5">
              الحساب المالي المستهدف
            </label>
            <Select value={accountId} onValueChange={setAccountId}>
              <SelectTrigger className="h-10 rounded-xl text-xs font-bold bg-slate-50/70 dark:bg-slate-900/60 border-slate-200/80 dark:border-slate-800 w-full">
                <SelectValue placeholder="اختر الحساب لعرض دفتر الأستاذ..." />
              </SelectTrigger>
              <SelectContent className="max-h-72 z-50 rounded-xl border-slate-200 dark:border-slate-800 shadow-xl">
                {accounts.map((acc) => (
                  <SelectItem key={acc.id} value={acc.id} className="text-xs font-bold py-2">
                    <span className="font-mono text-primary font-black ml-2">[{acc.code}]</span>
                    {acc.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Date Range & Clear */}
          <div className="flex flex-wrap items-end gap-3">
            <div>
              <label className="block text-2xs font-black text-slate-500 dark:text-slate-400 mb-1.5 pr-0.5">
                من تاريخ
              </label>
              <div className="relative">
                <Input
                  type="date"
                  value={from}
                  onChange={(e) => setFrom(e.target.value)}
                  className="h-10 w-40 rounded-xl text-xs font-bold bg-slate-50/70 dark:bg-slate-900/60 border-slate-200/80 dark:border-slate-800"
                />
              </div>
            </div>

            <div>
              <label className="block text-2xs font-black text-slate-500 dark:text-slate-400 mb-1.5 pr-0.5">
                إلى تاريخ
              </label>
              <div className="relative">
                <Input
                  type="date"
                  value={to}
                  onChange={(e) => setTo(e.target.value)}
                  className="h-10 w-40 rounded-xl text-xs font-bold bg-slate-50/70 dark:bg-slate-900/60 border-slate-200/80 dark:border-slate-800"
                />
              </div>
            </div>

            {(from || to) && (
              <Button
                variant="ghost"
                onClick={() => {
                  setFrom('');
                  setTo('');
                }}
                className="h-10 px-3 rounded-xl text-xs font-bold text-slate-500 hover:text-rose-600 gap-1.5 cursor-pointer"
                title="مسح نطاق التاريخ"
              >
                <FilterX className="w-3.5 h-3.5" />
                <span>مسح الفلتر</span>
              </Button>
            )}
          </div>
        </div>

        {/* Ledger Table Container */}
        <div className="bg-surface rounded-2xl border border-slate-200/80 dark:border-slate-800/80 shadow-2xs overflow-hidden">
          {/* Table Header Context Bar */}
          {selectedAccount && (
            <div className="px-5 py-3 border-b border-slate-100 dark:border-slate-800/80 bg-slate-50/40 dark:bg-slate-900/30 flex items-center justify-between flex-wrap gap-2 text-xs">
              <div className="flex items-center gap-2">
                <span className="font-bold text-slate-500">كشف حساب:</span>
                <span className="font-black text-slate-900 dark:text-white">
                  {selectedAccount.name}
                </span>
                <Badge variant="outline" className="font-mono text-2xs px-2 py-0.5 rounded-lg border-primary/30 text-primary font-bold">
                  {selectedAccount.code}
                </Badge>
              </div>

              <div className="text-3xs font-semibold text-slate-400">
                إجمالي الحركات: <span className="font-bold text-foreground">{rows.length}</span> حركة
              </div>
            </div>
          )}

          <div className="overflow-x-auto">
            <Table className="w-full text-right">
              <TableHeader className="bg-slate-50/70 dark:bg-slate-900/50">
                <TableRow className="border-b border-slate-200/80 dark:border-slate-800">
                  <TableHead className="py-3.5 px-4 w-32 text-xs font-black">التاريخ</TableHead>
                  <TableHead className="py-3.5 px-4 w-28 text-xs font-black">رقم القيد</TableHead>
                  <TableHead className="py-3.5 px-4 text-xs font-black">البيان والوصف</TableHead>
                  <TableHead className="py-3.5 px-4 text-left w-32 text-xs font-black">مدين (+)</TableHead>
                  <TableHead className="py-3.5 px-4 text-left w-32 text-xs font-black">دائن (-)</TableHead>
                  <TableHead className="py-3.5 px-4 text-left w-36 text-xs font-black">الرصيد الجاري</TableHead>
                </TableRow>
              </TableHeader>

              <TableBody>
                {rows.map((row, idx) => (
                  <TableRow
                    key={`${row.entryNo}-${idx}`}
                    className="hover:bg-slate-50/60 dark:hover:bg-slate-900/40 border-b border-slate-100 dark:border-slate-800/60 transition-colors"
                  >
                    <TableCell className="py-3 px-4 text-slate-500 dark:text-slate-400 font-mono text-xs font-semibold">
                      {new Date(row.date).toLocaleDateString('en-GB')}
                    </TableCell>

                    <TableCell className="py-3 px-4">
                      <span className="font-mono font-black text-primary text-xs bg-primary/5 dark:bg-primary/15 px-2 py-1 rounded-md">
                        #{row.entryNo}
                      </span>
                    </TableCell>

                    <TableCell className="py-3 px-4 text-slate-900 dark:text-slate-100 font-medium text-xs max-w-sm truncate">
                      {row.description}
                    </TableCell>

                    <TableCell className="py-3 px-4 text-left font-mono font-bold text-xs text-emerald-600 dark:text-emerald-400">
                      {row.debit ? `${formatNumber(row.debit)} ج.م` : '—'}
                    </TableCell>

                    <TableCell className="py-3 px-4 text-left font-mono font-bold text-xs text-amber-600 dark:text-amber-400">
                      {row.credit ? `${formatNumber(row.credit)} ج.م` : '—'}
                    </TableCell>

                    <TableCell className="py-3 px-4 text-left font-mono font-black text-xs text-slate-900 dark:text-white">
                      {formatNumber(row.running)} <span className="text-3xs font-semibold text-slate-400">ج.م</span>
                    </TableCell>
                  </TableRow>
                ))}

                {!isLoading && rows.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={6} className="py-12">
                      <EmptyState
                        icon={<BookOpen className="w-8 h-8 text-slate-400" />}
                        title={accountId ? 'لا توجد حركات مسجلة لهذا الحساب' : 'اختر حساباً لعرض دفتر الأستاذ'}
                        description={
                          accountId
                            ? 'لم يتم العثور على أي قيود محاسبية أو حركات مالية خلال الفترة المحددة.'
                            : 'قم بتحديد أحد الحسابات المالية من القائمة أعلاه لمراجعة كافة الحركات والقيود والرصيد الجاري.'
                        }
                      />
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </div>
      </div>
    </AppShell>
  );
}

export default function GeneralLedgerPage() {
  return (
    <Suspense
      fallback={
        <div className="p-8 text-center text-xs font-bold text-slate-400">
          جاري تحميل كشف الحساب...
        </div>
      }
    >
      <LedgerContent />
    </Suspense>
  );
}