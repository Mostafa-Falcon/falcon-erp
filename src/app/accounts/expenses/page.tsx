'use client';

import React, { useEffect, useMemo, useState } from'react';
import { AppShell } from'@/components/layout/AppShell';
import { Input } from'@/components/ui/input';
import { Button } from'@/components/ui/button';
import { Icons } from'@/components/ui/Icons';
import { useSessionStore } from'@/core/state/useSessionStore';
import { TreasuryRepository } from'@/modules/treasury/treasury_repository';
import { formatNumber, formatDateTime } from'@/lib/format';
import { RotateCcw, DollarSign, Receipt, FolderTree, TrendingUp, Plus, Search } from 'lucide-react';
import { toast } from'sonner';
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
import { Badge } from'@/components/ui/badge';
import {
 Dialog,
 DialogContent,
 DialogHeader,
 DialogTitle,
} from'@/components/ui/dialog';
import type { Expense, ExpenseCategory, Treasury, User } from'@/types';

function ExpensesContent() {
 const { currentUser } = useSessionStore();
 const orgId = currentUser?.org_id ||'';

 const [expenses, setExpenses] = useState<Expense[]>([]);
 const [categories, setCategories] = useState<ExpenseCategory[]>([]);
 const [treasuries, setTreasuries] = useState<Treasury[]>([]);
 const [users, setUsers] = useState<User[]>([]);
 const [isLoading, setIsLoading] = useState(true);

 const [search, setSearch] = useState('');
 const [categoryFilter, setCategoryFilter] = useState('');
 const [treasuryFilter, setTreasuryFilter] = useState('');
 const [viewId, setViewId] = useState<string | null>(null);
 const [showReversed, setShowReversed] = useState(false);
 const [reversingId, setReversingId] = useState<string | null>(null);

 const [showCreate, setShowCreate] = useState(false);
 const [showCategories, setShowCategories] = useState(false);
 const [catName, setCatName] = useState('');
 const [eCategoryId, setECategoryId] = useState('');
 const [eTreasuryId, setETreasuryId] = useState('');
 const [eAmount, setEAmount] = useState('');
 const [eDescription, setEDescription] = useState('');
 const [eReceipt, setEReceipt] = useState('');
 const [formError, setFormError] = useState('');
 const [isBusy, setIsBusy] = useState(false);

 const loadData = async () => {
 if (!orgId) return;
 try {
 const { db } = await import('@/core/db/app_database');
 const [exp, cats, tres, usr] = await Promise.all([
 TreasuryRepository.getExpenses(orgId),
 TreasuryRepository.getExpenseCategories(orgId),
 TreasuryRepository.getTreasuries(orgId),
 db.users.where('org_id').equals(orgId).toArray(),
 ]);
 setExpenses(exp);
 setCategories(cats);
 setTreasuries(tres);
 setUsers(usr);
 const activeCat = cats.find((c) => c.is_active)?.id;
 setECategoryId((prev) => prev || activeCat ||'');
 setETreasuryId((prev) => prev || tres.find((t) => t.is_default)?.id || tres[0]?.id ||'');
 } catch (err) {
 console.error('Load expenses error:', err);
 } finally {
 setIsLoading(false);
 }
 };

 useEffect(() => {
 if (!orgId) return;
 Promise.resolve().then(loadData);
 // eslint-disable-next-line react-hooks/exhaustive-deps
 }, [orgId]);

 const activeCategories = useMemo(() => categories.filter((c) => c.is_active), [categories]);
 const categoryName = (id: string) => categories.find((c) => c.id === id)?.name ||'—';

 const filtered = useMemo(() => {
 return expenses.filter((e) => {
 if (e.is_deleted && !showReversed) return false;
 if (categoryFilter && categoryFilter !=='all'&& e.category_id !== categoryFilter) return false;
 if (treasuryFilter && treasuryFilter !=='all'&& e.treasury_id !== treasuryFilter) return false;
 if (!search.trim()) return true;
 const q = search.trim().toLowerCase();
 const eCategoryName = categories.find((c) => c.id === e.category_id)?.name ||'';
 return (
 e.description.toLowerCase().includes(q) ||
 (e.receipt_number ||'').toLowerCase().includes(q) ||
 eCategoryName.toLowerCase().includes(q)
 );
 });
 }, [expenses, search, categoryFilter, treasuryFilter, categories, showReversed]);

 const totals = useMemo(() => {
 const byCat: Record<string, number> = {};
 let total = 0;
 let count = 0;
 for (const e of filtered) {
 if (e.is_deleted) continue;
 total += e.amount;
 count += 1;
 byCat[e.category_id] = (byCat[e.category_id] || 0) + e.amount;
 }
 return { total, count, byCat };
 }, [filtered]);

 const handleReverse = async (expense: Expense) => {
 if (!currentUser) return;
 const reason = window.prompt('اكتب سبب عكس المصروف:');
 if (reason === null) return;
 if (!reason.trim()) {
 toast.error('سبب العكس مطلوب.');
 return;
 }
 setReversingId(expense.id);
 try {
 const result = await TreasuryRepository.reverseExpense(expense.id, reason.trim(), currentUser.id);
 if (!result.success) {
 toast.error(result.error ||'تعذر عكس المصروف.');
 return;
 }
 toast.success('تم عكس المصروف ورد المبلغ للخزينة.');
 setViewId(null);
 await loadData();
 } finally {
 setReversingId(null);
 }
 };

 const createExpense = async () => {
 setFormError('');
 if (!currentUser) return;
 if (!eCategoryId) {
 setFormError('أضف فئة مصروفات أولاً أو اختر الفئة.');
 return;
 }
 if (!eTreasuryId) {
 setFormError('اختر الخزينة.');
 return;
 }
 const amount = Number(eAmount);
 if (!amount || amount <= 0) {
 setFormError('أدخل مبلغاً صحيحاً أكبر من صفر.');
 return;
 }
 if (!eDescription.trim()) {
 setFormError('أدخل بيان المصروف.');
 return;
 }
 setIsBusy(true);
 try {
 await TreasuryRepository.recordExpense({
 orgId,
 categoryId: eCategoryId,
 treasuryId: eTreasuryId,
 amount,
 description: eDescription.trim(),
 receiptNumber: eReceipt.trim() || undefined,
 userId: currentUser.id,
 });
 setEAmount('');
 setEDescription('');
 setEReceipt('');
 setShowCreate(false);
 await loadData();
 } catch (err) {
 setFormError(err instanceof Error ? err.message :'حدث خطأ أثناء تسجيل المصروف.');
 } finally {
 setIsBusy(false);
 }
 };

 const addCategory = async () => {
 setFormError('');
 if (!catName.trim()) {
 setFormError('أدخل اسم الفئة.');
 return;
 }
 setIsBusy(true);
 try {
 await TreasuryRepository.createExpenseCategory(orgId, catName.trim());
 setCatName('');
 await loadData();
 } catch (err) {
 setFormError(err instanceof Error ? err.message :'حدث خطأ أثناء إنشاء الفئة.');
 } finally {
 setIsBusy(false);
 }
 };

 const toggleCategory = async (id: string) => {
 try {
 await TreasuryRepository.toggleExpenseCategoryActive(id);
 await loadData();
 } catch (err) {
 toast.error(err instanceof Error ? err.message :'خطأ أثناء تحديث الفئة.');
 }
 };

 const treasuryName = (id: string) => treasuries.find((t) => t.id === id)?.name ||'—';
 const userName = (id: string) => users.find((u) => u.id === id)?.full_name || users.find((u) => u.id === id)?.username ||'—';

 const viewExpense = viewId ? expenses.find((e) => e.id === viewId) : undefined;

 const topCategory = useMemo(() => {
 const entries = Object.entries(totals.byCat);
 if (entries.length === 0) return null;
 entries.sort((a, b) => b[1] - a[1]);
 return { id: entries[0][0], amount: entries[0][1] };
 }, [totals.byCat]);

 return (
 <AppShell
 title="المصروفات التشغيلية"
 subtitle="تسجيل مصروفات التشغيل (إيجار، كهرباء، رواتب، نقل...) مع خصمها تلقائياً من الخزينة"
 actions={
 <Button
 onClick={() => setShowCreate((v) => !v)}
 className="h-11 px-5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-2xl text-xs font-black flex items-center gap-2 shadow-md hover:shadow-lg transition-all cursor-pointer"
 >
 {showCreate ? <Icons.X className="w-4 h-4"/> : <Plus className="w-4 h-4"/>}
 <span>{showCreate ?'إغلاق النماذج':'تسجيل مصروف جديد'}</span>
 </Button>
 }
 >
 <div className="space-y-6 text-right"dir="rtl">
 {/* KPIs */}
 <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
 <Kpi
 label="إجمالي المصروفات"
 value={`${formatNumber(totals.total)} ج.م`}
 textColor="text-rose-600 dark:text-rose-400"
 accentBg="bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20"
 icon={<DollarSign className="w-6 h-6"/>}
 />
 <Kpi
 label="عدد العمليات"
 value={`${totals.count} عملية`}
 textColor="text-slate-900 dark:text-white"
 accentBg="bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20"
 icon={<Receipt className="w-6 h-6"/>}
 />
 <Kpi
 label="أعلى فئة مصروفات"
 value={topCategory ? categoryName(topCategory.id) :'—'}
 textColor="text-amber-600 dark:text-amber-400"
 accentBg="bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20"
 icon={<FolderTree className="w-6 h-6"/>}
 />
 <Kpi
 label="قيمة أعلى فئة"
 value={`${formatNumber(topCategory?.amount || 0)} ج.م`}
 textColor="text-indigo-600 dark:text-indigo-400"
 accentBg="bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border border-indigo-500/20"
 icon={<TrendingUp className="w-6 h-6"/>}
 />
 </div>

 {/* Toolbar & Main Content Card */}
 <Card className="rounded-2xl border border-slate-200/80 dark:border-slate-800 bg-surface overflow-hidden">
 <CardContent className="p-4 space-y-4">
 <div className="flex flex-wrap items-center gap-3">
 <div className="relative flex-1 max-w-xs">
 <Input
 type="text"
 value={search}
 onChange={(e) => setSearch(e.target.value)}
 placeholder="بحث بالبيان أو رقم الإيصال..."
 className="h-11 bg-slate-50 dark:bg-slate-900 text-xs font-semibold rounded-xl pr-10 border-slate-200 dark:border-slate-800"
 icon={<Icons.Search />}
 />
 </div>
 <div className="w-48">
 <Select value={categoryFilter ||'all'} onValueChange={setCategoryFilter}>
 <SelectTrigger className="w-full h-11 rounded-xl bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-xs font-bold">
 <SelectValue placeholder="كل الفئات"/>
 </SelectTrigger>
 <SelectContent className="z-50 bg-popover border border-slate-200 dark:border-slate-800 rounded-xl shadow-xl max-h-60">
 <SelectItem value="all">كل الفئات</SelectItem>
 {categories.map((c) => (
 <SelectItem key={c.id} value={c.id}>
 {c.name}
 </SelectItem>
 ))}
 </SelectContent>
 </Select>
 </div>

 <div className="w-48">
 <Select value={treasuryFilter ||'all'} onValueChange={setTreasuryFilter}>
 <SelectTrigger className="w-full h-11 rounded-xl bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-xs font-bold">
 <SelectValue placeholder="كل الخزائن"/>
 </SelectTrigger>
 <SelectContent className="z-50 bg-popover border border-slate-200 dark:border-slate-800 rounded-xl shadow-xl">
 <SelectItem value="all">كل الخزائن</SelectItem>
 {treasuries.map((t) => (
 <SelectItem key={t.id} value={t.id}>
 {t.name}
 </SelectItem>
 ))}
 </SelectContent>
 </Select>
 </div>
 <div className="flex-1"/>
 <Button
 variant={showReversed ?'secondary':'outline'}
 onClick={() => setShowReversed((v) => !v)}
 className={`h-11 px-4 rounded-xl text-xs font-bold flex items-center gap-1.5 cursor-pointer ${
 showReversed ?'bg-amber-100 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300':''
 }`}
 >
 <RotateCcw className="w-4 h-4"/> {showReversed ?'إخفاء المعكوس':'إظهار المعكوس'}
 </Button>
 <Button
 variant="outline"
 onClick={() => setShowCategories((v) => !v)}
 className="h-11 px-4 rounded-xl text-xs font-bold flex items-center gap-1.5 border-slate-200 dark:border-slate-800 cursor-pointer"
 >
 <Icons.Filter /> الفئات
 </Button>
 </div>

 {/* Categories panel */}
 {showCategories && (
 <Card className="rounded-xl border-dashed border-slate-300 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/40">
 <CardContent className="p-4 space-y-3">
 <div className="flex items-center justify-between">
 <h4 className="text-xs font-black text-slate-800 dark:text-slate-100">فئات المصروفات</h4>
 </div>
 <div className="flex gap-2 items-center">
 <Input
 type="text"
 value={catName}
 onChange={(e) => setCatName(e.target.value)}
 className="h-9 bg-surface text-xs max-w-xs"
 placeholder="اسم الفئة الجديدة"
 />
 <Button
 onClick={addCategory}
 disabled={isBusy}
 className="h-9 px-4 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold flex items-center gap-1"
 >
 <Icons.Plus /> إضافة
 </Button>
 </div>
 <div className="flex flex-wrap gap-2">
 {categories.map((c) => (
 <Badge
 key={c.id}
 variant={c.is_active ?'default':'secondary'}
 className={`flex items-center gap-2 px-3 py-1 text-xs font-bold ${
 c.is_active
 ?'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-200 dark:border-emerald-800 text-emerald-700 dark:text-emerald-300'
 :'bg-slate-100 dark:bg-slate-800 text-slate-400'
 }`}
 >
 {c.name}
 <button onClick={() => toggleCategory(c.id)} className="hover:text-red-500"title={c.is_active ?'إيقاف الفئة':'تفعيل الفئة'}>
 <Icons.X className="w-3 h-3"/>
 </button>
 </Badge>
 ))}
 {categories.length === 0 && <span className="text-2xs font-bold text-slate-400">لا توجد فئات بعد — أضف أول فئة.</span>}
 </div>
 </CardContent>
 </Card>
 )}

 {/* Create form */}
 {showCreate && (
 <Card className="rounded-xl border-emerald-200 dark:border-emerald-900/50 bg-emerald-50/20 dark:bg-emerald-950/10">
 <CardContent className="p-4 space-y-3">
 {formError && (
 <div className="rounded-xl bg-destructive/15 border border-destructive/30 px-4 py-3 text-xs font-bold text-destructive">
 {formError}
 </div>
 )}
 <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-3">
 <div>
 <span className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">الفئة</span>
 <Select value={eCategoryId} onValueChange={setECategoryId}>
 <SelectTrigger className="w-full h-10 rounded-xl bg-surface border-slate-200 dark:border-slate-800 text-xs font-bold">
 <SelectValue placeholder="اختر الفئة"/>
 </SelectTrigger>
 <SelectContent className="z-50 bg-popover border border-slate-200 dark:border-slate-800 rounded-xl shadow-xl max-h-60">
 {activeCategories.map((c) => (
 <SelectItem key={c.id} value={c.id}>
 {c.name}
 </SelectItem>
 ))}
 </SelectContent>
 </Select>
 </div>
 <div>
 <span className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">الخزينة</span>
 <Select value={eTreasuryId} onValueChange={setETreasuryId}>
 <SelectTrigger className="w-full h-10 rounded-xl bg-surface border-slate-200 dark:border-slate-800 text-xs font-bold">
 <SelectValue placeholder="اختر الخزينة"/>
 </SelectTrigger>
 <SelectContent className="z-50 bg-popover border border-slate-200 dark:border-slate-800 rounded-xl shadow-xl">
 {treasuries.map((t) => (
 <SelectItem key={t.id} value={t.id}>
 {t.name}
 </SelectItem>
 ))}
 </SelectContent>
 </Select>
 </div>
 <div>
 <span className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">المبلغ</span>
 <Input
 type="number"
 min={0}
 step="any"
 value={eAmount}
 onChange={(e) => setEAmount(e.target.value)}
 className="h-10 bg-surface text-xs"
 placeholder="0.00"
 />
 </div>
 <div>
 <span className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">رقم الإيصال (اختياري)</span>
 <Input
 type="text"
 value={eReceipt}
 onChange={(e) => setEReceipt(e.target.value)}
 className="h-10 bg-surface text-xs"
 placeholder="رقم الإيصال / الفاتورة"
 />
 </div>
 <div>
 <span className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">البيان</span>
 <Input
 type="text"
 value={eDescription}
 onChange={(e) => setEDescription(e.target.value)}
 className="h-10 bg-surface text-xs"
 placeholder="مثال: فاتورة كهرباء الشهر"
 />
 </div>
 </div>
 <div className="flex justify-end pt-2">
 <Button
 onClick={createExpense}
 disabled={isBusy || activeCategories.length === 0 || treasuries.length === 0}
 className="h-10 px-5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold shadow-sm"
 >
 {isBusy ?'جارِ الحفظ...':'تسجيل المصروف'}
 </Button>
 </div>
 </CardContent>
 </Card>
 )}

 {isLoading ? (
 <div className="py-12 text-center text-sm font-bold text-slate-400">جارٍ تحميل المصروفات...</div>
 ) : filtered.length === 0 ? (
 <div className="py-12 text-center">
 <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-100 dark:bg-slate-800 text-slate-400">
 <Icons.Calculator />
 </div>
 <p className="text-sm font-bold text-slate-500 dark:text-slate-400">لا توجد مصروفات مطابقة.</p>
 <p className="mt-1 text-xs text-slate-400">سجّل أول مصروف تشغيلي.</p>
 </div>
 ) : (
 <div className="rounded-xl border border-slate-100 dark:border-slate-800 overflow-hidden">
 <Table className="w-full text-right">
 <TableHeader className="bg-slate-50/75 dark:bg-slate-900/50">
 <TableRow>
 <TableHead className="py-2.5 pr-4 text-xs font-black">الفئة</TableHead>
 <TableHead className="py-2.5 text-xs font-black">الخزينة</TableHead>
 <TableHead className="py-2.5 text-xs font-black">البيان</TableHead>
 <TableHead className="py-2.5 text-xs font-black">الإيصال</TableHead>
 <TableHead className="py-2.5 text-xs font-black">التاريخ</TableHead>
 <TableHead className="py-2.5 text-xs font-black">بواسطة</TableHead>
 <TableHead className="py-2.5 pl-4 text-xs font-black text-left">المبلغ</TableHead>
 </TableRow>
 </TableHeader>
 <TableBody>
 {filtered.map((e) => (
 <TableRow
 key={e.id}
 onClick={() => setViewId(e.id)}
 className={`cursor-pointer transition-colors ${
 e.is_deleted ?'opacity-60 line-through':''
 }`}
 >
 <TableCell className="py-3 pr-4 font-bold">
 <div className="flex items-center gap-1.5">
 <Badge variant="outline"className="bg-orange-50 dark:bg-orange-950/40 text-orange-600 dark:text-orange-400 border-orange-200 dark:border-orange-800 text-3xs font-black">
 {categoryName(e.category_id)}
 </Badge>
 {e.is_deleted && (
 <Badge variant="secondary"className="text-3xs font-black">
 معكوس
 </Badge>
 )}
 </div>
 </TableCell>
 <TableCell className="py-3 text-xs font-medium">{treasuryName(e.treasury_id)}</TableCell>
 <TableCell className="py-3 text-xs font-medium max-w-[220px] truncate">{e.description}</TableCell>
 <TableCell className="py-3 text-xs text-muted-foreground">{e.receipt_number ||'—'}</TableCell>
 <TableCell className="py-3 text-xs text-muted-foreground">{formatDateTime(e.created_at)}</TableCell>
 <TableCell className="py-3 text-xs text-muted-foreground">{userName(e.created_by)}</TableCell>
 <TableCell className="py-3 pl-4 font-black text-destructive text-left">
 -{formatNumber(e.amount)}
 </TableCell>
 </TableRow>
 ))}
 </TableBody>
 </Table>
 </div>
 )}
 </CardContent>
 </Card>
 </div>

 {/* View Dialog */}
 <Dialog open={!!viewExpense} onOpenChange={(open) => !open && setViewId(null)}>
 <DialogContent className="max-w-md rounded-2xl p-6"dir="rtl">
 {viewExpense && (
 <div className="space-y-4">
 <DialogHeader>
 <DialogTitle className="text-base font-black text-slate-900 dark:text-white">
 {categoryName(viewExpense.category_id)}
 </DialogTitle>
 <p className="text-2xs font-semibold text-slate-400">
 {formatDateTime(viewExpense.created_at)}
 </p>
 </DialogHeader>

 <Card className="rounded-xl border-destructive/20 bg-destructive/5">
 <CardContent className="p-4">
 <div className="text-3xs font-black text-muted-foreground">المبلغ</div>
 <div className="mt-0.5 text-2xl font-black text-destructive">
 -{formatNumber(viewExpense.amount)}
 </div>
 </CardContent>
 </Card>

 <div className="space-y-3 text-xs font-medium">
 <Info label="البيان"value={viewExpense.description} />
 <Info label="الخزينة"value={treasuryName(viewExpense.treasury_id)} />
 {viewExpense.receipt_number && <Info label="رقم الإيصال"value={viewExpense.receipt_number} />}
 <Info label="بواسطة"value={userName(viewExpense.created_by)} />
 </div>

 {viewExpense.is_deleted ? (
 <div className="rounded-xl bg-muted/60 p-3 text-center text-xs font-black text-muted-foreground">
 هذا المصروف معكوس وتم رد مبلغه للخزينة.
 </div>
 ) : (
 <div className="flex justify-end pt-2">
 <Button
 variant="destructive"
 onClick={() => handleReverse(viewExpense)}
 disabled={reversingId === viewExpense.id}
 className="h-10 px-5 rounded-xl text-xs font-black flex items-center gap-1.5"
 >
 <RotateCcw className={`w-4 h-4 ${reversingId === viewExpense.id ?'animate-spin':''}`} />
 عكس المصروف ورد المبلغ
 </Button>
 </div>
 )}
 </div>
 )}
 </DialogContent>
 </Dialog>
 </AppShell>
 );
}

function Kpi({
 label,
 value,
 icon,
 accentBg,
 textColor,
}: {
 label: string;
 value: string;
 icon: React.ReactNode;
 accentBg: string;
 textColor: string;
}) {
 return (
 <Card className="rounded-2xl border border-slate-200/80 dark:border-slate-800 bg-surface hover:border-slate-300 dark:hover:border-slate-700 transition-all hover:shadow-md">
 <CardContent className="p-5 flex items-center justify-between gap-3">
 <div className="space-y-1">
 <span className="text-xs font-bold text-slate-500 dark:text-slate-400 block tracking-tight">{label}</span>
 <span className={`text-2xl font-black font-mono block ${textColor}`}>{value}</span>
 </div>
 <div className={`w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 shadow-xs ${accentBg}`}>
 {icon}
 </div>
 </CardContent>
 </Card>
 );
}

function Info({ label, value }: { label: string; value: string }) {
 return (
 <div>
 <div className="text-3xs font-black text-muted-foreground">{label}</div>
 <div className="mt-0.5 text-xs font-bold text-foreground">{value}</div>
 </div>
 );
}

export default function ExpensesPage() {
 return <ExpensesContent />;
}