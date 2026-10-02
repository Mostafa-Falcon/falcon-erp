'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { AppShell } from '@/components/layout/AppShell';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Icons } from '@/components/ui/Icons';
import { useSessionStore } from '@/core/state/useSessionStore';
import { TreasuryRepository } from '@/modules/treasury/treasury_repository';
import { formatNumber, formatDateTime } from '@/lib/format';
import {
  RotateCcw,
  DollarSign,
  Receipt,
  FolderTree,
  TrendingUp,
  Plus,
  Search,
  Filter,
  Layers,
  ArrowDownLeft,
  X,
} from 'lucide-react';
import { toast } from 'sonner';
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
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { KpiCard } from '@/components/ui/kpi-card';
import { EmptyState } from '@/components/ui/empty-state';
import type { Expense, ExpenseCategory, Treasury, User } from '@/types';

function ExpensesContent() {
  const { currentUser } = useSessionStore();
  const orgId = currentUser?.org_id || '';

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
      setECategoryId((prev) => prev || activeCat || '');
      setETreasuryId((prev) => prev || tres.find((t) => t.is_default)?.id || tres[0]?.id || '');
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
  const categoryName = (id: string) => categories.find((c) => c.id === id)?.name || '—';

  const filtered = useMemo(() => {
    return expenses.filter((e) => {
      if (e.is_deleted && !showReversed) return false;
      if (categoryFilter && categoryFilter !== 'all' && e.category_id !== categoryFilter) return false;
      if (treasuryFilter && treasuryFilter !== 'all' && e.treasury_id !== treasuryFilter) return false;
      if (!search.trim()) return true;
      const q = search.trim().toLowerCase();
      const eCategoryName = categories.find((c) => c.id === e.category_id)?.name || '';
      return (
        e.description.toLowerCase().includes(q) ||
        (e.receipt_number || '').toLowerCase().includes(q) ||
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
        toast.error(result.error || 'تعذر عكس المصروف.');
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
      toast.success('تم تسجيل المصروف بنجاح');
    } catch (err) {
      setFormError(err instanceof Error ? err.message : 'حدث خطأ أثناء تسجيل المصروف.');
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
      toast.success('تمت إضافة فئة المصروف بنجاح');
    } catch (err) {
      setFormError(err instanceof Error ? err.message : 'حدث خطأ أثناء إنشاء الفئة.');
    } finally {
      setIsBusy(false);
    }
  };

  const toggleCategory = async (id: string) => {
    try {
      await TreasuryRepository.toggleExpenseCategoryActive(id);
      await loadData();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'خطأ أثناء تحديث الفئة.');
    }
  };

  const treasuryName = (id: string) => treasuries.find((t) => t.id === id)?.name || '—';
  const userName = (id: string) =>
    users.find((u) => u.id === id)?.full_name || users.find((u) => u.id === id)?.username || '—';

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
      subtitle="تسجيل ومتابعة مصروفات التشغيل (إيجار، كهرباء، رواتب، نقل) مع خصمها التلقائي من الخزائن"
      actions={
        <Button
          onClick={() => setShowCreate((v) => !v)}
          className="h-10 px-4 rounded-xl bg-primary hover:bg-primary/90 text-white font-bold text-xs flex items-center gap-2 shadow-xs hover:shadow-md transition-all cursor-pointer"
        >
          {showCreate ? <X className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
          <span>{showCreate ? 'إغلاق النموذج' : 'تسجيل مصروف جديد'}</span>
        </Button>
      }
    >
      <div className="space-y-5 text-right" dir="rtl">
        {/* KPI Cards — Linear / Stripe Modern Style */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <KpiCard
            label="إجمالي المصروفات"
            value={formatNumber(totals.total)}
            unit="ج.م"
            variant="rose"
            icon={<DollarSign className="w-5 h-5" />}
          />
          <KpiCard
            label="عدد العمليات"
            value={totals.count}
            unit="عملية مسجلة"
            variant="blue"
            icon={<Receipt className="w-5 h-5" />}
          />
          <KpiCard
            label="أعلى فئة إنفاق"
            value={topCategory ? categoryName(topCategory.id) : '—'}
            variant="amber"
            icon={<FolderTree className="w-5 h-5" />}
          />
          <KpiCard
            label="قيمة أعلى فئة"
            value={formatNumber(topCategory?.amount || 0)}
            unit="ج.م"
            variant="indigo"
            icon={<TrendingUp className="w-5 h-5" />}
          />
        </div>

        {/* Toolbar & Filter Bar */}
        <div className="flex flex-wrap items-center gap-3 bg-surface border border-slate-200/80 dark:border-slate-800/80 p-3.5 rounded-2xl shadow-2xs">
          {/* Search Input */}
          <div className="relative flex-1 min-w-[240px] max-w-sm">
            <Input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="بحث بالبيان أو رقم الإيصال..."
              className="h-10 bg-slate-50/70 dark:bg-slate-900/70 text-xs font-semibold rounded-xl pr-10 border-slate-200/80 dark:border-slate-800"
              icon={<Search className="w-4 h-4 text-slate-400" />}
            />
          </div>

          {/* Category Filter */}
          <div className="w-44">
            <Select value={categoryFilter || 'all'} onValueChange={setCategoryFilter}>
              <SelectTrigger className="w-full h-10 rounded-xl bg-slate-50/70 dark:bg-slate-900/70 border-slate-200/80 dark:border-slate-800 text-xs font-bold">
                <SelectValue placeholder="كل الفئات" />
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

          {/* Treasury Filter */}
          <div className="w-44">
            <Select value={treasuryFilter || 'all'} onValueChange={setTreasuryFilter}>
              <SelectTrigger className="w-full h-10 rounded-xl bg-slate-50/70 dark:bg-slate-900/70 border-slate-200/80 dark:border-slate-800 text-xs font-bold">
                <SelectValue placeholder="كل الخزائن" />
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

          <div className="flex-1" />

          {/* Show Reversed Toggle */}
          <Button
            variant={showReversed ? 'secondary' : 'outline'}
            onClick={() => setShowReversed((v) => !v)}
            className={`h-10 px-3.5 rounded-xl text-xs font-bold flex items-center gap-1.5 cursor-pointer border-slate-200/80 dark:border-slate-800 ${
              showReversed
                ? 'bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 border-amber-200/80 dark:border-amber-800/80'
                : 'text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800'
            }`}
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>{showReversed ? 'إخفاء المعكوس' : 'إظهار المعكوس'}</span>
          </Button>

          {/* Categories Manager Button */}
          <Button
            variant={showCategories ? 'secondary' : 'outline'}
            onClick={() => setShowCategories((v) => !v)}
            className="h-10 px-3.5 rounded-xl text-xs font-bold flex items-center gap-1.5 border-slate-200/80 dark:border-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 cursor-pointer"
          >
            <Layers className="w-3.5 h-3.5" />
            <span>إدارة الفئات</span>
          </Button>
        </div>

        {/* Categories panel */}
        {showCategories && (
          <Card className="rounded-2xl border border-slate-200/80 dark:border-slate-800 bg-surface/90 backdrop-blur-md shadow-xs animate-in fade-in slide-in-from-top-2 duration-150">
            <CardContent className="p-4 sm:p-5 space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="text-sm font-black text-slate-900 dark:text-white">
                    فئات المصروفات التشغيلية
                  </h4>
                  <p className="text-2xs text-muted-foreground mt-0.5">
                    قم بإضافة وتصنيف فئات الصرف (كهرباء، إيجار، بوفيه، نقل...)
                  </p>
                </div>
              </div>
              <div className="flex gap-2 items-center flex-wrap">
                <Input
                  type="text"
                  value={catName}
                  onChange={(e) => setCatName(e.target.value)}
                  className="h-10 bg-slate-50 dark:bg-slate-900 text-xs font-semibold max-w-xs rounded-xl"
                  placeholder="اسم الفئة الجديدة..."
                />
                <Button
                  onClick={addCategory}
                  disabled={isBusy}
                  className="h-10 px-4 bg-primary hover:bg-primary/90 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-xs cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>إضافة فئة</span>
                </Button>
              </div>
              <div className="flex flex-wrap gap-2 pt-1">
                {categories.map((c) => (
                  <Badge
                    key={c.id}
                    variant="outline"
                    className={`flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-bold transition-colors ${
                      c.is_active
                        ? 'bg-slate-50 dark:bg-slate-800/60 border-slate-200/80 dark:border-slate-700 text-slate-700 dark:text-slate-200'
                        : 'bg-slate-100/50 dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-400 line-through'
                    }`}
                  >
                    <span>{c.name}</span>
                    <button
                      onClick={() => toggleCategory(c.id)}
                      className="hover:text-red-500 cursor-pointer p-0.5"
                      title={c.is_active ? 'إيقاف الفئة' : 'تفعيل الفئة'}
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </Badge>
                ))}
                {categories.length === 0 && (
                  <span className="text-xs text-slate-400">لا توجد فئات بعد — أضف أول فئة الآن.</span>
                )}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Create form drawer */}
        {showCreate && (
          <Card className="rounded-2xl border border-blue-200/80 dark:border-blue-900/40 bg-gradient-to-br from-blue-50/30 to-indigo-50/20 dark:from-blue-950/20 dark:to-indigo-950/10 shadow-xs animate-in fade-in slide-in-from-top-2 duration-150">
            <CardContent className="p-5 space-y-4">
              <div className="flex items-center justify-between border-b border-blue-100/80 dark:border-blue-900/40 pb-3">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-lg bg-primary/10 text-primary flex items-center justify-center font-bold">
                    <ArrowDownLeft className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="text-sm font-black text-slate-900 dark:text-white">
                      تسجيل إيصال مصروف جديد
                    </h3>
                    <p className="text-2xs text-muted-foreground">
                      سيتم خصم المبلغ مباشرة من الخزينة المحددة وتسجيل القيد المالي
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setShowCreate(false)}
                  className="p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {formError && (
                <div className="rounded-xl bg-destructive/15 border border-destructive/30 px-4 py-2.5 text-xs font-bold text-destructive">
                  {formError}
                </div>
              )}

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-3.5">
                <div>
                  <span className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                    فئة المصروف
                  </span>
                  <Select value={eCategoryId} onValueChange={setECategoryId}>
                    <SelectTrigger className="w-full h-10 rounded-xl bg-surface border-slate-200 dark:border-slate-800 text-xs font-bold">
                      <SelectValue placeholder="اختر الفئة" />
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
                  <span className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                    الخزينة المسحوب منها
                  </span>
                  <Select value={eTreasuryId} onValueChange={setETreasuryId}>
                    <SelectTrigger className="w-full h-10 rounded-xl bg-surface border-slate-200 dark:border-slate-800 text-xs font-bold">
                      <SelectValue placeholder="اختر الخزينة" />
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
                  <span className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                    المبلغ (ج.م)
                  </span>
                  <Input
                    type="number"
                    min={0}
                    step="any"
                    value={eAmount}
                    onChange={(e) => setEAmount(e.target.value)}
                    className="h-10 bg-surface text-xs font-bold rounded-xl"
                    placeholder="0.00"
                  />
                </div>

                <div>
                  <span className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                    رقم الإيصال / الفاتورة (اختياري)
                  </span>
                  <Input
                    type="text"
                    value={eReceipt}
                    onChange={(e) => setEReceipt(e.target.value)}
                    className="h-10 bg-surface text-xs rounded-xl"
                    placeholder="مثال: REC-1024"
                  />
                </div>

                <div>
                  <span className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                    البيان / الشرح
                  </span>
                  <Input
                    type="text"
                    value={eDescription}
                    onChange={(e) => setEDescription(e.target.value)}
                    className="h-10 bg-surface text-xs rounded-xl"
                    placeholder="مثال: سداد فاتورة كهرباء الفرع"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-blue-100/60 dark:border-blue-900/30">
                <Button
                  variant="outline"
                  onClick={() => setShowCreate(false)}
                  className="h-10 px-4 rounded-xl text-xs font-bold cursor-pointer"
                >
                  إلغاء
                </Button>
                <Button
                  onClick={createExpense}
                  disabled={isBusy || activeCategories.length === 0 || treasuries.length === 0}
                  className="h-10 px-6 bg-primary hover:bg-primary/90 text-white rounded-xl text-xs font-bold shadow-xs hover:shadow-md cursor-pointer"
                >
                  {isBusy ? 'جارِ الحفظ...' : 'تسجيل وخصم المصروف'}
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Table & Data List */}
        <Card className="rounded-2xl border border-slate-200/80 dark:border-slate-800 bg-surface overflow-hidden shadow-2xs">
          <CardContent className="p-0">
            {isLoading ? (
              <div className="py-16 text-center text-xs font-bold text-slate-400">
                جارٍ تحميل المصروفات...
              </div>
            ) : filtered.length === 0 ? (
              <EmptyState
                icon={<Receipt className="w-7 h-7 text-slate-400" />}
                title="لا توجد مصروفات مسجلة"
                description={
                  search || categoryFilter || treasuryFilter
                    ? 'لم يتم العثور على أي مصروفات تطابق معايير البحث والتصفية المحددة.'
                    : 'لم يتم تسجيل أي مصروفات تشغيلية حتى الآن. ابدأ بتسجيل أول مصروف لإدارة نفقات المنشأة بدقة.'
                }
                action={
                  !search && !categoryFilter && !treasuryFilter
                    ? {
                        label: 'تسجيل أول مصروف الآن',
                        onClick: () => setShowCreate(true),
                        icon: <Plus className="w-4 h-4" />,
                      }
                    : undefined
                }
                className="border-none bg-transparent py-16"
              />
            ) : (
              <div className="overflow-x-auto">
                <Table className="w-full text-right">
                  <TableHeader>
                    <TableRow>
                      <TableHead className="py-3 pr-5">الفئة</TableHead>
                      <TableHead className="py-3">الخزينة</TableHead>
                      <TableHead className="py-3">البيان</TableHead>
                      <TableHead className="py-3">رقم الإيصال</TableHead>
                      <TableHead className="py-3">التاريخ والوقت</TableHead>
                      <TableHead className="py-3">بواسطة</TableHead>
                      <TableHead className="py-3 pl-5 text-left">المبلغ</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filtered.map((e) => (
                      <TableRow
                        key={e.id}
                        onClick={() => setViewId(e.id)}
                        className={`cursor-pointer transition-colors group ${
                          e.is_deleted ? 'opacity-60 line-through bg-slate-50/50 dark:bg-slate-900/30' : ''
                        }`}
                      >
                        <TableCell className="py-3.5 pr-5">
                          <div className="flex items-center gap-2">
                            <Badge
                              variant="outline"
                              className="bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700 text-3xs font-extrabold rounded-lg px-2.5 py-1"
                            >
                              {categoryName(e.category_id)}
                            </Badge>
                            {e.is_deleted && (
                              <Badge variant="destructive" className="text-4xs font-bold rounded-lg px-2 py-0.5">
                                معكوس
                              </Badge>
                            )}
                          </div>
                        </TableCell>
                        <TableCell className="py-3.5 font-semibold text-slate-700 dark:text-slate-300">
                          {treasuryName(e.treasury_id)}
                        </TableCell>
                        <TableCell className="py-3.5 font-bold text-slate-900 dark:text-white max-w-[260px] truncate">
                          {e.description}
                        </TableCell>
                        <TableCell className="py-3.5 text-xs text-muted-foreground font-mono">
                          {e.receipt_number || '—'}
                        </TableCell>
                        <TableCell className="py-3.5 text-xs text-muted-foreground">
                          {formatDateTime(e.created_at)}
                        </TableCell>
                        <TableCell className="py-3.5 text-xs text-muted-foreground">
                          {userName(e.created_by)}
                        </TableCell>
                        <TableCell className="py-3.5 pl-5 text-left font-black text-rose-600 dark:text-rose-400 tabular-nums text-sm">
                          -{formatNumber(e.amount)} ج.م
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

      {/* View Expense Detail Dialog */}
      <Dialog open={!!viewExpense} onOpenChange={(open) => !open && setViewId(null)}>
        <DialogContent className="max-w-md rounded-2xl p-6" dir="rtl">
          {viewExpense && (
            <div className="space-y-4">
              <DialogHeader>
                <div className="flex items-center justify-between">
                  <DialogTitle className="text-lg font-black text-slate-900 dark:text-white">
                    تفاصيل المصروف
                  </DialogTitle>
                  <Badge variant="outline" className="text-2xs font-bold">
                    {categoryName(viewExpense.category_id)}
                  </Badge>
                </div>
                <p className="text-2xs text-muted-foreground mt-0.5">
                  تاريخ التسجيل: {formatDateTime(viewExpense.created_at)}
                </p>
              </DialogHeader>

              <div className="rounded-2xl border border-rose-200/80 dark:border-rose-900/50 bg-rose-50/30 dark:bg-rose-950/20 p-4 flex items-center justify-between">
                <div>
                  <span className="text-3xs font-black text-slate-500 uppercase tracking-wider block">
                    مبلغ المصروف
                  </span>
                  <span className="text-2xl font-black text-rose-600 dark:text-rose-400 tabular-nums">
                    -{formatNumber(viewExpense.amount)} ج.م
                  </span>
                </div>
                <div className="w-10 h-10 rounded-xl bg-rose-100 dark:bg-rose-900/50 text-rose-600 dark:text-rose-400 flex items-center justify-center">
                  <DollarSign className="w-5 h-5" />
                </div>
              </div>

              <div className="space-y-3 rounded-xl border border-slate-100 dark:border-slate-800 p-4 bg-slate-50/50 dark:bg-slate-900/40 text-xs">
                <Info label="البيان" value={viewExpense.description} />
                <Info label="الخزينة المسحوب منها" value={treasuryName(viewExpense.treasury_id)} />
                {viewExpense.receipt_number && (
                  <Info label="رقم الإيصال" value={viewExpense.receipt_number} />
                )}
                <Info label="المستخدم المسجل" value={userName(viewExpense.created_by)} />
              </div>

              {viewExpense.is_deleted ? (
                <div className="rounded-xl bg-muted/60 p-3 text-center text-xs font-black text-muted-foreground">
                  هذا المصروف تم عكسه ورد مبلغه بالكامل إلى الخزينة.
                </div>
              ) : (
                <div className="flex justify-end gap-2 pt-2">
                  <Button
                    variant="outline"
                    onClick={() => setViewId(null)}
                    className="h-10 px-4 rounded-xl text-xs font-bold cursor-pointer"
                  >
                    إغلاق
                  </Button>
                  <Button
                    variant="destructive"
                    onClick={() => handleReverse(viewExpense)}
                    disabled={reversingId === viewExpense.id}
                    className="h-10 px-5 rounded-xl text-xs font-bold flex items-center gap-2 cursor-pointer shadow-xs"
                  >
                    <RotateCcw
                      className={`w-3.5 h-3.5 ${
                        reversingId === viewExpense.id ? 'animate-spin' : ''
                      }`}
                    />
                    <span>عكس المصروف ورد المبلغ</span>
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

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800/60 pb-2 last:border-b-0 last:pb-0">
      <span className="text-3xs font-bold text-muted-foreground">{label}</span>
      <span className="text-xs font-bold text-foreground">{value}</span>
    </div>
  );
}

export default function ExpensesPage() {
  return <ExpensesContent />;
}