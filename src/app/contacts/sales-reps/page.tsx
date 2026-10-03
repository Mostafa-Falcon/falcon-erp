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
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  UserCheck,
  Plus,
  Search,
  Phone,
  Mail,
  Target,
  Percent,
  Users,
  Award,
  TrendingUp,
} from 'lucide-react';
import { useSessionStore } from '@/core/state/useSessionStore';
import { CrmRepository } from '@/modules/contacts/crm_repository';
import { formatNumber } from '@/lib/format';
import type { SalesRep } from '@/types';
import { toast } from 'sonner';

function SalesRepsContent() {
  const { currentUser } = useSessionStore();
  const orgId = currentUser?.org_id || '';

  const [reps, setReps] = useState<SalesRep[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState('');

  // Dialog State
  const [isOpen, setIsOpen] = useState(false);
  const [name, setName] = useState('');
  const [code, setCode] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [commissionRate, setCommissionRate] = useState<number>(3);
  const [targetMonthly, setTargetMonthly] = useState<number>(50000);

  const loadData = async () => {
    if (!orgId) return;
    try {
      setIsLoading(true);
      const list = await CrmRepository.getSalesReps(orgId);
      setReps(list);
    } catch (err) {
      console.error(err);
      toast.error('حدث خطأ أثناء تحميل مندوبي المبيعات');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [orgId]);

  const handleCreate = async () => {
    if (!name.trim() || !phone.trim()) {
      toast.error('يرجى كتابة اسم مندوب المبيعات ورقم الهاتف');
      return;
    }

    try {
      await CrmRepository.createSalesRep({
        orgId,
        name,
        code,
        phone,
        email,
        commissionRate,
        targetMonthly,
      });

      toast.success('تمت إضافة مندوب المبيعات بنجاح');
      setIsOpen(false);
      setName('');
      setCode('');
      setPhone('');
      setEmail('');
      loadData();
    } catch (err) {
      console.error(err);
      toast.error('فشل إضافة مندوب المبيعات');
    }
  };

  const filtered = useMemo(() => {
    return reps.filter(
      (r) =>
        r.name.toLowerCase().includes(search.toLowerCase()) ||
        r.phone.includes(search)
    );
  }, [reps, search]);

  const stats = useMemo(() => {
    const totalTarget = reps.reduce((s, r) => s + (r.target_monthly || 0), 0);
    const avgCommission =
      reps.length > 0
        ? reps.reduce((s, r) => s + (r.commission_rate || 0), 0) / reps.length
        : 0;
    return {
      total: reps.length,
      totalTarget,
      avgCommission,
    };
  }, [reps]);

  const headerActions = (
    <Button
      onClick={() => setIsOpen(true)}
      className="h-10 px-4 bg-primary hover:bg-primary/90 text-white font-bold text-xs rounded-xl flex items-center gap-2 shadow-xs hover:shadow-md transition-all cursor-pointer"
    >
      <Plus className="w-4 h-4" />
      <span>إضافة مندوب مبيعات</span>
    </Button>
  );

  return (
    <AppShell
      title="مندوبي المبيعات والعمولات"
      subtitle="إدارة أهداف المبيعات الشهرية للمندوبين وحساب نِسَب العمولات ومتابعة الأداء"
      actions={headerActions}
    >
      <div className="space-y-5 text-right select-none" dir="rtl">
        {/* KPI Cards — Linear / Stripe Style */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <KpiCard
            label="إجمالي مندوبي المبيعات"
            value={stats.total}
            unit="مندوب"
            variant="blue"
            icon={<Users className="w-5 h-5" />}
          />
          <KpiCard
            label="إجمالي المستهدف الشهري"
            value={formatNumber(stats.totalTarget)}
            unit="ج.م"
            variant="indigo"
            icon={<Target className="w-5 h-5" />}
          />
          <KpiCard
            label="متوسط نسبة العمولة"
            value={stats.avgCommission.toFixed(1)}
            unit="%"
            variant="amber"
            icon={<Percent className="w-5 h-5" />}
          />
        </div>

        {/* Toolbar & Search Bar */}
        <div className="bg-surface rounded-2xl border border-slate-200/80 dark:border-slate-800/80 p-3.5 shadow-2xs flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="relative flex-1 w-full max-w-md">
            <Search className="w-4 h-4 absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
            <Input
              placeholder="البحث باسم المندوب، الكود، أو رقم الهاتف..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pr-10 h-10 text-xs font-bold rounded-xl bg-slate-50/70 dark:bg-slate-900/60 border-slate-200/80 dark:border-slate-800"
            />
          </div>

          <div className="text-3xs font-bold text-slate-400 self-end sm:self-center">
            إجمالي السجلات: <span className="text-foreground font-black">{filtered.length}</span>
          </div>
        </div>

        {/* Cards Grid */}
        {isLoading ? (
          <div className="py-20 text-center text-xs font-bold text-slate-400">
            <div className="w-8 h-8 border-3 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-3" />
            <span>جاري تحميل بيانات المندوبين...</span>
          </div>
        ) : filtered.length === 0 ? (
          <EmptyState
            icon={<UserCheck className="w-8 h-8 text-slate-400" />}
            title="لا يوجد مندوبي مبيعات مسجلين بعد"
            description="ابدأ بإضافة أول مندوب مبيعات لتحديد أهداف المبيعات وحساب العمولات التلقائية."
            action={{
              label: 'إضافة مندوب مبيعات جديد',
              onClick: () => setIsOpen(true),
              icon: <Plus className="w-4 h-4" />,
            }}
          />
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {filtered.map((r) => (
              <div
                key={r.id}
                className="bg-surface rounded-2xl border border-slate-200/80 dark:border-slate-800/80 p-5 shadow-2xs hover:shadow-md hover:border-slate-300 dark:hover:border-slate-700 transition-all flex flex-col justify-between gap-4 group"
              >
                {/* Header Profile */}
                <div className="flex items-start gap-3">
                  <div className="w-11 h-11 rounded-xl bg-blue-50 dark:bg-blue-950/50 border border-blue-100 dark:border-blue-900/40 flex items-center justify-center text-primary font-black text-sm shrink-0 shadow-2xs group-hover:scale-105 transition-transform">
                    {r.name.charAt(0)}
                  </div>
                  <div className="min-w-0 flex-1">
                    <h3 className="font-black text-slate-900 dark:text-white text-sm truncate">
                      {r.name}
                    </h3>
                    <div className="flex items-center gap-1.5 mt-0.5 text-2xs text-slate-500 font-medium">
                      <Phone className="w-3 h-3 text-slate-400" />
                      <span dir="ltr" className="font-mono">{r.phone}</span>
                    </div>
                  </div>
                </div>

                {/* Targets & Commission */}
                <div className="bg-slate-50/70 dark:bg-slate-900/50 rounded-xl p-3 border border-slate-100 dark:border-slate-800/60 space-y-2 text-xs">
                  <div className="flex items-center justify-between text-slate-600 dark:text-slate-400">
                    <span className="font-semibold text-2xs">نسبة العمولة:</span>
                    <Badge variant="outline" className="font-mono font-black text-primary border-primary/20 bg-primary/5">
                      {r.commission_rate}%
                    </Badge>
                  </div>
                  <div className="flex items-center justify-between text-slate-600 dark:text-slate-400">
                    <span className="font-semibold text-2xs">الهدف الشهري:</span>
                    <span className="font-mono font-black text-slate-900 dark:text-white">
                      {formatNumber(r.target_monthly)} <span className="text-3xs font-semibold text-slate-400">ج.م</span>
                    </span>
                  </div>
                </div>

                {/* Footer Status */}
                <div className="flex items-center justify-between pt-1 border-t border-slate-100 dark:border-slate-800/60 text-2xs">
                  <span className="inline-flex items-center gap-1 text-emerald-600 dark:text-emerald-400 font-bold">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                    مندوب نشط
                  </span>
                  {r.code && (
                    <span className="font-mono text-slate-400 font-bold">
                      #{r.code}
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Modal */}
        <Dialog open={isOpen} onOpenChange={setIsOpen}>
          <DialogContent className="max-w-md rounded-2xl p-6" dir="rtl">
            <DialogHeader>
              <DialogTitle className="text-base font-black text-foreground">
                إضافة مندوب مبيعات جديد
              </DialogTitle>
              <p className="text-xs text-muted-foreground mt-0.5">
                سجل بيانات المندوب لربطه بالفواتير وتحديد نسبة العمولة التلقائية.
              </p>
            </DialogHeader>

            <div className="space-y-3.5 pt-2">
              <div>
                <label className="text-xs font-bold block mb-1.5 pr-0.5">اسم المندوب *</label>
                <Input
                  placeholder="أدخل اسم المندوب..."
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="h-10 text-xs font-bold rounded-xl"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-bold block mb-1.5 pr-0.5">رقم الهاتف *</label>
                  <Input
                    placeholder="01xxxxxxxxx"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    className="h-10 text-xs font-bold rounded-xl"
                  />
                </div>
                <div>
                  <label className="text-xs font-bold block mb-1.5 pr-0.5">الكود الوظيفي</label>
                  <Input
                    placeholder="REP-01"
                    value={code}
                    onChange={(e) => setCode(e.target.value)}
                    className="h-10 text-xs font-bold rounded-xl"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-bold block mb-1.5 pr-0.5">البريد الإلكتروني</label>
                <Input
                  placeholder="rep@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="h-10 text-xs font-bold rounded-xl"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-bold block mb-1.5 pr-0.5">نسبة العمولة (%)</label>
                  <Input
                    type="number"
                    value={commissionRate}
                    onChange={(e) => setCommissionRate(parseFloat(e.target.value) || 0)}
                    className="h-10 text-xs font-bold rounded-xl font-mono"
                  />
                </div>
                <div>
                  <label className="text-xs font-bold block mb-1.5 pr-0.5">الهدف الشهري (ج.م)</label>
                  <Input
                    type="number"
                    value={targetMonthly}
                    onChange={(e) => setTargetMonthly(parseFloat(e.target.value) || 0)}
                    className="h-10 text-xs font-bold rounded-xl font-mono"
                  />
                </div>
              </div>

              <div className="pt-2">
                <Button
                  onClick={handleCreate}
                  className="w-full bg-primary hover:bg-primary/90 text-white font-bold h-10 rounded-xl cursor-pointer shadow-xs hover:shadow-md transition-all"
                >
                  حفظ بيانات المندوب
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </AppShell>
  );
}

export default function SalesRepsPage() {
  return (
    <Suspense fallback={<div className="p-8 text-center text-xs font-bold text-slate-400">جاري التحميل...</div>}>
      <SalesRepsContent />
    </Suspense>
  );
}