'use client';

import React, { useState, useMemo } from'react';
import { Printer, Filter, Calendar } from'lucide-react';
import { Button } from'@/components/ui/button';
import { Input } from'@/components/ui/input';
import { DatePicker } from'@/components/ui/date-picker';
import { formatNumber } from'@/lib/format';
import type { ContactTransaction } from'@/types';

interface StatementTabProps {
 transactions: ContactTransaction[];
 customerName: string;
}

export function StatementTab({ transactions, customerName }: StatementTabProps) {
 const [startDate, setStartDate] = useState('');
 const [endDate, setEndDate] = useState('');
 const [query, setQuery] = useState('');

 const filtered = useMemo(() => {
 return transactions.filter((tx) => {
 if (startDate && tx.created_at < startDate) return false;
 if (endDate && tx.created_at > endDate +'T23:59:59') return false;
 if (query) {
 const matchNotes = (tx.notes ||'').toLowerCase().includes(query.toLowerCase());
 const matchType = (tx.reference_type ||'').toLowerCase().includes(query.toLowerCase());
 if (!matchNotes && !matchType) return false;
 }
 return true;
 });
 }, [transactions, startDate, endDate, query]);

 return (
 <div className="bg-surface rounded-3xl border border-slate-200/80 dark:border-slate-800 p-5 shadow-xs space-y-4">
 {/* Header with Title and Print */}
 <div className="flex flex-wrap items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800 gap-3">
 <div>
 <h3 className="text-sm font-black text-slate-900 dark:text-white">
 كشف حساب المعاملات المالية
 </h3>
 <p className="text-xs text-slate-400 mt-0.5">
 سجل كافة الفواتير، سندات القبض، والصرف المسجلة
 </p>
 </div>

 <Button
 variant="outline"
 size="sm"
 onClick={() => window.print()}
 className="rounded-xl text-xs font-bold gap-1.5 cursor-pointer"
 >
 <Printer className="w-3.5 h-3.5"/>
 <span>طباعة كشف الحساب</span>
 </Button>
 </div>

 {/* Date Range & Search Filters */}
 <div className="flex flex-wrap items-center gap-3 bg-slate-50/60 dark:bg-slate-900/40 p-3 rounded-2xl border border-slate-100 dark:border-slate-800 text-xs">
        <div className="flex items-center gap-2">
          <span className="font-bold text-slate-400">من:</span>
          <DatePicker
            value={startDate}
            onChange={setStartDate}
            placeholder="من تاريخ..."
            className="h-9 w-36"
          />
        </div>

        <div className="flex items-center gap-2">
          <span className="font-bold text-slate-400">إلى:</span>
          <DatePicker
            value={endDate}
            onChange={setEndDate}
            placeholder="إلى تاريخ..."
            className="h-9 w-36"
          />
        </div>

 <div className="flex-1 min-w-[180px]">
 <Input
 value={query}
 onChange={(e) => setQuery(e.target.value)}
 placeholder="بحث في البيان أو نوع الحركة..."
 className="h-9 text-xs rounded-xl bg-surface"
 />
 </div>

 {(startDate || endDate || query) && (
 <Button
 variant="ghost"
 size="sm"
 onClick={() => {
 setStartDate('');
 setEndDate('');
 setQuery('');
 }}
 className="text-xs text-rose-500 font-bold h-9 rounded-xl"
 >
 إلغاء الفلتر
 </Button>
 )}
 </div>

 {/* Transactions Table */}
 <div className="overflow-x-auto">
 <table className="w-full text-right text-xs">
 <thead>
 <tr className="bg-slate-50 dark:bg-slate-900/60 text-2xs font-black text-slate-400 border-b border-slate-100 dark:border-slate-800">
 <th className="py-3 px-4">التاريخ</th>
 <th className="py-3 px-4">نوع الحركة</th>
 <th className="py-3 px-4">البيان / ملاحظات</th>
 <th className="py-3 px-4 text-left">مدين (+)</th>
 <th className="py-3 px-4 text-left">دائن (-)</th>
 <th className="py-3 px-4 text-left">الرصيد بعد</th>
 </tr>
 </thead>
 <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60 font-bold">
 {filtered.length === 0 ? (
 <tr>
 <td colSpan={6} className="py-12 text-center text-slate-400 font-bold">
 لا توجد حركات مالية مسجلة في هذه الفترة.
 </td>
 </tr>
 ) : (
 filtered.map((tx) => (
 <tr key={tx.id} className="hover:bg-slate-50/50 transition-colors">
 <td className="py-3 px-4 text-slate-500 font-mono">
 {new Date(tx.created_at).toLocaleDateString('ar-EG')}
 </td>
 <td className="py-3 px-4">
 <span className="inline-block px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 text-3xs font-black">
 {tx.reference_type ==='sale_invoice'
 ?'فاتورة بيع'
 : tx.reference_type ==='receipt_voucher'
 ?'سند قبض'
 : tx.reference_type ==='payment_voucher'
 ?'سند صرف'
 :'رصيد افتتاحي'}
 </span>
 </td>
 <td className="py-3 px-4 text-slate-700 dark:text-slate-300">{tx.notes ||'—'}</td>
 <td className="py-3 px-4 text-left font-mono text-rose-600 font-black">
 {tx.debit > 0 ? formatNumber(tx.debit) :'—'}
 </td>
 <td className="py-3 px-4 text-left font-mono text-emerald-600 font-black">
 {tx.credit > 0 ? formatNumber(tx.credit) :'—'}
 </td>
 <td className="py-3 px-4 text-left font-mono font-black"dir="ltr">
 {formatNumber(tx.balance_after)} ج.م
 </td>
 </tr>
 ))
 )}
 </tbody>
 </table>
 </div>
 </div>
 );
}