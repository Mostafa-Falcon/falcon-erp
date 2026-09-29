'use client';

import React, { useCallback, useEffect, useState } from'react';
import { AppShell } from'@/components/layout/AppShell';
import { Button } from'@/components/ui/button';
import { Input } from'@/components/ui/input';
import { useSessionStore } from'@/core/state/useSessionStore';
import { formatNumber } from'@/lib/format';
import { toast } from'sonner';
import { RefreshCw, Scale, Printer } from'lucide-react';
import { getTrialBalance, type TrialBalanceRow } from'@/modules/accounting/accounting_reports';

export default function TrialBalancePage() {
 const { currentUser } = useSessionStore();
 const orgId = currentUser?.org_id ||'';

 const [rows, setRows] = useState<TrialBalanceRow[]>([]);
 const [totals, setTotals] = useState({ totalDebit: 0, totalCredit: 0 });
 const [isLoading, setIsLoading] = useState(true);
 const [from, setFrom] = useState('');
 const [to, setTo] = useState('');

 const loadData = useCallback(async () => {
 if (!orgId) return;
 try {
 setIsLoading(true);
 const result = await getTrialBalance(orgId, from || null, to || null);
 setRows(result.rows);
 setTotals({ totalDebit: result.totalDebit, totalCredit: result.totalCredit });
 } catch (err) {
 console.error('Trial balance error:', err);
 toast.error('حدث خطأ أثناء تحميل ميزان المراجعة');
 } finally {
 setIsLoading(false);
 }
 }, [orgId, from, to]);

 useEffect(() => {
 void Promise.resolve().then(() => loadData());
 }, [loadData]);

 const balanced = Math.abs(totals.totalDebit - totals.totalCredit) < 0.01;

 return (
 <AppShell
 title="ميزان المراجعة"
 subtitle="أرصدة كافة الحسابات المدينة والدائنة المستخرجة من قيود اليومية."
 actions={
 <Button
 onClick={loadData}
 className="h-10 px-4 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-black text-xs gap-2 shadow-sm transition-all active:scale-95"
 >
 <RefreshCw className={`w-4 h-4 ${isLoading ?'animate-spin':''}`} /> تحديث
 </Button>
 }
 >
 <div className="space-y-6 text-right"dir="rtl">
 <div className="bg-surface rounded-2xl border border-slate-200/80 dark:border-slate-800 p-4 flex flex-wrap items-end justify-between gap-4">
 <div className="flex flex-wrap items-end gap-3">
 <div className="flex flex-col gap-1">
 <label className="text-2xs font-black text-slate-400">من تاريخ</label>
 <Input type="date"value={from} onChange={(e) => setFrom(e.target.value)} className="h-10 w-40 rounded-xl text-xs font-bold"/>
 </div>
 <div className="flex flex-col gap-1">
 <label className="text-2xs font-black text-slate-400">إلى تاريخ</label>
 <Input type="date"value={to} onChange={(e) => setTo(e.target.value)} className="h-10 w-40 rounded-xl text-xs font-bold"/>
 </div>
 <Button variant="outline"onClick={() => { setFrom(''); setTo(''); }} className="h-10 rounded-xl text-xs font-bold">
 مسح الفلتر
 </Button>
 </div>
 <div className={`flex items-center gap-2 px-4 h-10 rounded-xl text-xs font-black ${balanced ?'bg-emerald-50 text-emerald-600':'bg-red-50 text-red-600'}`}>
 <Scale className="w-4 h-4"/>
 {balanced ?'الميزان متوازن':'الميزان غير متوازن'}
 </div>
 </div>

 <div className="bg-surface rounded-2xl border border-slate-200/80 dark:border-slate-800 overflow-hidden shadow-xs">
 <div className="overflow-x-auto">
 <table className="w-full text-right border-collapse">
 <thead>
 <tr className="bg-slate-50/50 dark:bg-slate-900/50 border-b border-slate-100 dark:border-slate-800 text-2xs font-black text-slate-400 uppercase tracking-wider">
 <th className="py-4 px-4 w-24">الكود</th>
 <th className="py-4 px-4">اسم الحساب</th>
 <th className="py-4 px-4 text-left w-32">رصيد افتتاحي</th>
 <th className="py-4 px-4 text-left w-32">حركة مدين</th>
 <th className="py-4 px-4 text-left w-32">حركة دائن</th>
 <th className="py-4 px-4 text-left w-32">الرصيد الختامي</th>
 </tr>
 </thead>
 <tbody className="divide-y divide-slate-50 dark:divide-slate-800/50 text-xs font-bold">
 {rows.map((row) => (
 <tr key={row.account.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-900/30 transition-colors">
 <td className="py-3 px-4 text-slate-400 font-mono">{row.account.code}</td>
 <td className="py-3 px-4 text-slate-700 dark:text-slate-200">{row.account.name}</td>
 <td className="py-3 px-4 text-left font-mono text-slate-500">{formatNumber(row.opening)}</td>
 <td className="py-3 px-4 text-left font-mono text-blue-600">{formatNumber(row.periodDebit)}</td>
 <td className="py-3 px-4 text-left font-mono text-amber-600">{formatNumber(row.periodCredit)}</td>
 <td className="py-3 px-4 text-left font-mono text-slate-900 dark:text-white">{formatNumber(row.closing)}</td>
 </tr>
 ))}
 {!isLoading && rows.length === 0 && (
 <tr>
 <td colSpan={6} className="py-20 text-center text-slate-400 font-black">لا توجد حركات محاسبية مرحّلة بعد.</td>
 </tr>
 )}
 </tbody>
 <tfoot>
 <tr className="bg-slate-50 dark:bg-slate-900/60 border-t-2 border-slate-200 dark:border-slate-700 text-xs font-black">
 <td className="py-4 px-4"colSpan={3}>الإجمالي</td>
 <td className="py-4 px-4 text-left font-mono text-blue-700">{formatNumber(totals.totalDebit)}</td>
 <td className="py-4 px-4 text-left font-mono text-amber-700">{formatNumber(totals.totalCredit)}</td>
 <td className="py-4 px-4 text-left font-mono">
 {formatNumber(Math.abs(totals.totalDebit - totals.totalCredit))}
 </td>
 </tr>
 </tfoot>
 </table>
 </div>
 </div>

 <div className="flex justify-end">
 <Button variant="outline"onClick={() => window.print()} className="h-10 rounded-xl text-xs font-bold gap-2">
 <Printer className="w-4 h-4"/> طباعة
 </Button>
 </div>
 </div>
 </AppShell>
 );
}