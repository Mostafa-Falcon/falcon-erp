'use client';

import React, { useEffect, useMemo, useState, Suspense } from 'react';
import { AppShell } from '@/components/layout/AppShell';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { KpiCard } from '@/components/ui/kpi-card';
import { EmptyState } from '@/components/ui/empty-state';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Users, Plus, Search, Tag, Percent, ShieldCheck, Layers } from 'lucide-react';
import { useSessionStore } from '@/core/state/useSessionStore';
import { CrmRepository } from '@/modules/contacts/crm_repository';
import type { CustomerGroup } from '@/types';
import { toast } from 'sonner';

function CustomerGroupsContent() {
  const { currentUser } = useSessionStore();
  const orgId = currentUser?.org_id || '';

  const [groups, setGroups] = useState<CustomerGroup[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState('');

  // Dialog State
  const [isOpen, setIsOpen] = useState(false);
  const [name, setName] = useState('');
  const [code, setCode] = useState('');
  const [discountPercentage, setDiscountPercentage] = useState<number>(0);
  const [creditLimitMultiplier, setCreditLimitMultiplier] = useState<number>(1.0);
  const [description, setDescription] = useState('');

  const loadData = async () => {
    if (!orgId) return;
    try {
      setIsLoading(true);
      const list = await CrmRepository.getCustomerGroups(orgId);
      setGroups(list);
    } catch (err) {
      console.error(err);
      toast.error('حدث خطأ أثناء تحميل مجموعات العملاء');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [orgId]);

  const handleCreate = async () => {
    if (!name.trim()) {
      toast.error('يرجى كتابة اسم المجموعة');
      return;
    }

    try {
      await CrmRepository.createCustomerGroup({
        orgId,
        name,
        code,
        discountPercentage,
        creditLimitMultiplier,
        description,
      });

      toast.success('تمت إضافة مجموعة العملاء بنجاح');
      setIsOpen(false);
      setName('');
      setCode('');
      setDiscountPercentage(0);
      setCreditLimitMultiplier(1.0);
      setDescription('');
      loadData();
    } catch (err) {
      console.error(err);
      toast.error('فشل إضافة المجموعة');
    }
  };

  const filtered = useMemo(() => {
    return groups.filter((g) => g.name.toLowerCase().includes(search.toLowerCase()));
  }, [groups, search]);

  const stats = useMemo(() => {
    const avgDiscount =
      groups.length > 0
        ? groups.reduce((s, g) => s + (g.discount_percentage || 0), 0) / groups.length
        : 0;
    const avgCredit =
      groups.length > 0
        ? groups.reduce((s, g) => s + (g.credit_limit_multiplier || 1), 0) / groups.length
        : 1;
    return {
      total: groups.length,
      avgDiscount,
      avgCredit,
    };
  }, [groups]);

  const headerActions = (
    <Button
      onClick={() => setIsOpen(true)}
      className="h-10 px-4 bg-primary hover:bg-primary/90 text-white font-bold text-xs rounded-xl flex items-center gap-2 shadow-xs hover:shadow-md transition-all cursor-pointer"
    >
      <Plus className="w-4 h-4" />
      <span>إضافة مجموعة جديدة</span>
    </Button>
  );

  return (
    <AppShell
      title="مجموعات وشرائح العملاء"
      subtitle="تصنيف العملاء (VIP، جملة، تجزئة، صيدليات) وتحديد الخصومات التلقائية والتسهيلات الائتمانية"
      actions={headerActions}
    >
      <div className="space-y-5 text-right select-none" dir="rtl">
        {/* KPI Cards — Linear / Stripe Style */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <KpiCard
            label="إجمالي المجموعات المسجلة"
            value={stats.total}
            unit="مجموعة"
            variant="blue"
            icon={<Users className="w-5 h-5" />}
          />
          <KpiCard
            label="متوسط نسبة الخصم"
            value={stats.avgDiscount.toFixed(1)}
            unit="%"
            variant="emerald"
            icon={<Percent className="w-5 h-5" />}
          />
          <KpiCard
            label="متوسط مضاعف الائتمان"
            value={stats.avgCredit.toFixed(1)}
            unit="x"
            variant="indigo"
            icon={<Layers className="w-5 h-5" />}
          />
        </div>

        {/* Toolbar & Search */}
        <div className="bg-surface rounded-2xl border border-slate-200/80 dark:border-slate-800/80 p-3.5 shadow-2xs flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="relative flex-1 w-full max-w-md">
            <Search className="w-4 h-4 absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
            <Input
              placeholder="ابحث باسم شريحة أو مجموعة العملاء..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pr-10 h-10 text-xs font-bold rounded-xl bg-slate-50/70 dark:bg-slate-900/60 border-slate-200/80 dark:border-slate-800"
            />
          </div>

          <div className="text-3xs font-bold text-slate-400 self-end sm:self-center">
            إجمالي الشرائح: <span className="text-foreground font-black">{filtered.length}</span>
          </div>
        </div>

        {/* Table Container */}
        <div className="bg-surface rounded-2xl border border-slate-200/80 dark:border-slate-800/80 shadow-2xs overflow-hidden">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader className="bg-slate-50/70 dark:bg-slate-900/50">
                <TableRow className="border-b border-slate-200/80 dark:border-slate-800">
                  <TableHead className="text-right font-black text-xs w-32">رمز المجموعة</TableHead>
                  <TableHead className="text-right font-black text-xs">اسم المجموعة / الشريحة</TableHead>
                  <TableHead className="text-left font-black text-xs w-36">نسبة الخصم التلقائي</TableHead>
                  <TableHead className="text-left font-black text-xs w-36">مضاعف الحد الائتماني</TableHead>
                  <TableHead className="text-right font-black text-xs">الوصف والملاحظات</TableHead>
                  <TableHead className="text-center font-black text-xs w-28">الحالة</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  <TableRow>
                    <TableCell colSpan={6} className="py-16 text-center text-xs font-bold text-slate-400">
                      <div className="w-8 h-8 border-3 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-3" />
                      <span>جاري تحميل مجموعات العملاء...</span>
                    </TableCell>
                  </TableRow>
                ) : filtered.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="py-12">
                      <EmptyState
                        icon={<Users className="w-8 h-8 text-slate-400" />}
                        title="لا توجد مجموعات عملاء مسجلة"
                        description="أنشئ أول شريحة عملاء لتحديد الخصومات التلقائية وحدود الائتمان."
                        action={{
                          label: 'إضافة مجموعة جديدة',
                          onClick: () => setIsOpen(true),
                          icon: <Plus className="w-4 h-4" />,
                        }}
                      />
                    </TableCell>
                  </TableRow>
                ) : (
                  filtered.map((g) => (
                    <TableRow
                      key={g.id}
                      className="hover:bg-slate-50/60 dark:hover:bg-slate-900/40 border-b border-slate-100 dark:border-slate-800/60"
                    >
                      <TableCell className="font-mono font-bold text-slate-500 text-xs">
                        {g.code ? `#${g.code}` : '—'}
                      </TableCell>
                      <TableCell className="font-black text-slate-900 dark:text-white text-xs">
                        {g.name}
                      </TableCell>
                      <TableCell className="text-left">
                        <Badge variant="outline" className="font-mono font-black text-emerald-600 dark:text-emerald-400 border-emerald-200 bg-emerald-50 dark:bg-emerald-950/40">
                          {g.discount_percentage}%
                        </Badge>
                      </TableCell>
                      <TableCell className="font-mono font-bold text-slate-700 dark:text-slate-300 text-xs text-left">
                        {g.credit_limit_multiplier}x
                      </TableCell>
                      <TableCell className="text-xs text-slate-500 max-w-xs truncate font-medium">
                        {g.description || '—'}
                      </TableCell>
                      <TableCell className="text-center">
                        <span className="inline-flex items-center gap-1 text-3xs font-bold px-2 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-950/80 text-emerald-700 dark:text-emerald-300">
                          <ShieldCheck className="w-3 h-3" />
                          نشطة
                        </span>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </div>

        {/* Modal: Add Customer Group */}
        <Dialog open={isOpen} onOpenChange={setIsOpen}>
          <DialogContent className="max-w-md rounded-2xl p-6" dir="rtl">
            <DialogHeader>
              <DialogTitle className="text-base font-black text-foreground">
                إضافة شريحة عملاء جديدة
              </DialogTitle>
              <p className="text-xs text-muted-foreground mt-0.5">
                حدد اسم المجموعة ونسبة الخصم الممنوحة ومضاعف التسهيل الائتماني.
              </p>
            </DialogHeader>

            <div className="space-y-3.5 pt-2">
              <div>
                <label className="text-xs font-bold block mb-1.5 pr-0.5">اسم المجموعة / الشريحة *</label>
                <Input
                  placeholder="مثال: عملاء الجملة، كبار العملاء VIP..."
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="h-10 text-xs font-bold rounded-xl"
                />
              </div>

              <div>
                <label className="text-xs font-bold block mb-1.5 pr-0.5">كود المجموعة</label>
                <Input
                  placeholder="GRP-01"
                  value={code}
                  onChange={(e) => setCode(e.target.value)}
                  className="h-10 text-xs font-bold rounded-xl font-mono"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-bold block mb-1.5 pr-0.5">نسبة الخصم التلقائي (%)</label>
                  <Input
                    type="number"
                    value={discountPercentage}
                    onChange={(e) => setDiscountPercentage(parseFloat(e.target.value) || 0)}
                    className="h-10 text-xs font-bold rounded-xl font-mono"
                  />
                </div>
                <div>
                  <label className="text-xs font-bold block mb-1.5 pr-0.5">مضاعف الحد الائتماني</label>
                  <Input
                    type="number"
                    step="0.1"
                    value={creditLimitMultiplier}
                    onChange={(e) => setCreditLimitMultiplier(parseFloat(e.target.value) || 1)}
                    className="h-10 text-xs font-bold rounded-xl font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-bold block mb-1.5 pr-0.5">الوصف والملاحظات</label>
                <Textarea
                  placeholder="أدخل وصفاً للمجموعة وشروط الانضمام إليها..."
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  rows={3}
                  className="text-xs font-bold rounded-xl resize-none"
                />
              </div>

              <div className="pt-2">
                <Button
                  onClick={handleCreate}
                  className="w-full bg-primary hover:bg-primary/90 text-white font-bold h-10 rounded-xl cursor-pointer shadow-xs hover:shadow-md transition-all"
                >
                  حفظ شريحة العملاء
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </AppShell>
  );
}

export default function CustomerGroupsPage() {
  return (
    <Suspense fallback={<div className="p-8 text-center text-xs font-bold text-slate-400">جاري التحميل...</div>}>
      <CustomerGroupsContent />
    </Suspense>
  );
}