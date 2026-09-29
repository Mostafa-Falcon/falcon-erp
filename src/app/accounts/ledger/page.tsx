'use client';

import React, { useCallback, useEffect, useState } from'react';
import { AppShell } from'@/components/layout/AppShell';
import { Button } from'@/components/ui/button';
import { Input } from'@/components/ui/input';
import {
 Select,
 SelectContent,
 SelectItem,
 SelectTrigger,
 SelectValue,
} from'@/components/ui/select';
import {
 Table,
 TableBody,
 TableCell,
 TableHead,
 TableHeader,
 TableRow,
} from'@/components/ui/table';
import { Card, CardContent } from'@/components/ui/card';
import { useSessionStore } from'@/core/state/useSessionStore';
import { formatNumber } from'@/lib/format';
import { toast } from'sonner';
import { RefreshCw, BookOpen, Printer } from'lucide-react';
import { AccountingRepository } from'@/modules/accounting/accounting_repository';
import { getAccountStatement, type LedgerRow } from'@/modules/accounting/accounting_reports';
import type { Account } from'@/types';

export default function GeneralLedgerPage() {
 const { currentUser } = useSessionStore();
 const orgId = currentUser?.org_id ||'';

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
 setAccounts(list.sort((a, b) => a.code.localeCompare(b.code)));
 })
 .catch((err) => console.error('Ledger accounts error:', err));
 }, [orgId]);

 const loadData = useCallback(async () => {
 if (!orgId || !accountId) {
 setRows([]);
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
 toast.error('حدث خطأ أثناء تحميل دفتر الأستاذ');
 } finally {
 setIsLoading(false);
 }
 }, [orgId, accountId, from, to]);

 useEffect(() => {
 loadData();
 }, [loadData]);

 return (
 <AppShell
 title="دفتر الأستاذ العام"
 subtitle="حركة الحساب التفصيلية مع الرصيد الجاري (Running Balance) لكل حساب."
 actions={
 <Button
 onClick={loadData}
 className="h-10 px-4 bg-primary hover:bg-primary/90 text-primary-foreground rounded-xl font-black text-xs gap-2 shadow-sm transition-all active:scale-95"
 >
 <RefreshCw className={`w-4 h-4 ${isLoading ?'animate-spin':''}`} /> تحديث
 </Button>
 }
 >
 <div className="space-y-6 text-right"dir="rtl">
 {/* Filters Card */}
 <Card className="rounded-2xl border-slate-200/80 dark:border-slate-800 shadow-sm">
 <CardContent className="p-4 flex flex-wrap items-end gap-4">
 <div className="flex flex-col gap-1.5 min-w-[280px]">
 <label className="text-xs font-black text-muted-foreground">الحساب</label>
 <Select value={accountId} onValueChange={setAccountId}>
 <SelectTrigger className="h-10 rounded-xl text-xs font-bold bg-background border-slate-200 dark:border-slate-800">
 <SelectValue placeholder="اختر الحساب لعرض حركته"/>
 </SelectTrigger>
 <SelectContent className="max-h-72">
 {accounts.map((acc) => (
 <SelectItem key={acc.id} value={acc.id}>
 {acc.code} - {acc.name}
 </SelectItem>
 ))}
 </SelectContent>
 </Select>
 </div>

 <div className="flex flex-col gap-1.5">
 <label className="text-xs font-black text-muted-foreground">من تاريخ</label>
 <Input
 type="date"
 value={from}
 onChange={(e) => setFrom(e.target.value)}
 className="h-10 w-44 rounded-xl text-xs font-bold bg-background"
 />
 </div>

 <div className="flex flex-col gap-1.5">
 <label className="text-xs font-black text-muted-foreground">إلى تاريخ</label>
 <Input
 type="date"
 value={to}
 onChange={(e) => setTo(e.target.value)}
 className="h-10 w-44 rounded-xl text-xs font-bold bg-background"
 />
 </div>

 <Button
 variant="outline"
 onClick={() => {
 setFrom('');
 setTo('');
 }}
 className="h-10 rounded-xl text-xs font-bold"
 >
 مسح الفلتر
 </Button>

 <div className="flex items-center gap-6 ms-auto bg-muted/40 px-4 py-2 rounded-xl border border-border">
 <div className="text-xs font-black text-muted-foreground">
 رصيد افتتاحي:{''}
 <span className="font-mono text-foreground text-sm font-black mr-1">
 {formatNumber(opening)}
 </span>{''}
 <span className="text-3xs">ج.م</span>
 </div>
 <div className="text-xs font-black text-muted-foreground">
 رصيد ختامي:{''}
 <span className="font-mono text-primary text-sm font-black mr-1">
 {formatNumber(closing)}
 </span>{''}
 <span className="text-3xs">ج.م</span>
 </div>
 </div>
 </CardContent>
 </Card>

 {/* Ledger Table Card */}
 <Card className="rounded-2xl border-slate-200/80 dark:border-slate-800 shadow-sm overflow-hidden">
 <div className="overflow-x-auto">
 <Table className="w-full text-right">
 <TableHeader className="bg-slate-50/70 dark:bg-slate-900/50">
 <TableRow>
 <TableHead className="py-3.5 px-4 w-32 text-xs font-black">التاريخ</TableHead>
 <TableHead className="py-3.5 px-4 w-32 text-xs font-black">رقم القيد</TableHead>
 <TableHead className="py-3.5 px-4 text-xs font-black">البيان</TableHead>
 <TableHead className="py-3.5 px-4 text-left w-28 text-xs font-black">مدين</TableHead>
 <TableHead className="py-3.5 px-4 text-left w-28 text-xs font-black">دائن</TableHead>
 <TableHead className="py-3.5 px-4 text-left w-32 text-xs font-black">الرصيد الجاري</TableHead>
 </TableRow>
 </TableHeader>
 <TableBody>
 {rows.map((row, idx) => (
 <TableRow key={`${row.entryNo}-${idx}`} className="hover:bg-muted/40 transition-colors">
 <TableCell className="py-3 px-4 text-muted-foreground font-mono text-xs">
 {new Date(row.date).toLocaleDateString('en-GB')}
 </TableCell>
 <TableCell className="py-3 px-4 text-primary font-black text-xs">
 #{row.entryNo}
 </TableCell>
 <TableCell className="py-3 px-4 text-foreground font-medium truncate max-w-xs text-xs">
 {row.description}
 </TableCell>
 <TableCell className="py-3 px-4 text-left font-mono font-bold text-xs text-blue-600">
 {row.debit ? formatNumber(row.debit) :'-'}
 </TableCell>
 <TableCell className="py-3 px-4 text-left font-mono font-bold text-xs text-amber-600">
 {row.credit ? formatNumber(row.credit) :'-'}
 </TableCell>
 <TableCell className="py-3 px-4 text-left font-mono font-black text-xs text-foreground">
 {formatNumber(row.running)}
 </TableCell>
 </TableRow>
 ))}
 {!isLoading && rows.length === 0 && (
 <TableRow>
 <TableCell colSpan={6} className="py-20 text-center text-muted-foreground font-black text-sm">
 {accountId ?'لا توجد حركات لهذا الحساب في الفترة المحددة.':'اختر حساباً لعرض دفتر الأستاذ.'}
 </TableCell>
 </TableRow>
 )}
 </TableBody>
 </Table>
 </div>
 </Card>

 <div className="flex justify-end">
 <Button
 variant="outline"
 onClick={() => window.print()}
 className="h-10 rounded-xl text-xs font-bold gap-2"
 >
 <BookOpen className="w-4 h-4"/> <Printer className="w-4 h-4"/> طباعة دفتر الأستاذ
 </Button>
 </div>
 </div>
 </AppShell>
 );
}