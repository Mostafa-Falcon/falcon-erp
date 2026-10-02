'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { AppShell } from '@/components/layout/AppShell';
import { db } from '@/core/db/app_database';
import { InstallmentsRepository } from '@/modules/sales/installments_repository';
import { useSessionStore } from '@/core/state/useSessionStore';
import { formatNumber, formatDateTime } from '@/lib/format';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { KpiCard } from '@/components/ui/kpi-card';
import { EmptyState } from '@/components/ui/empty-state';
import {
  CreditCard,
  Plus,
  Search,
  CheckCircle2,
  Calendar,
  UserCheck,
  Phone,
  User,
  Printer,
  Loader2,
  ShieldCheck,
  AlertTriangle,
  DollarSign,
  Receipt,
  Building2,
  Coins,
} from 'lucide-react';
import type {
  InstallmentPlan,
  InstallmentSchedule,
  Guarantor,
  Contact,
  Treasury,
  PlanStatus,
  InstallmentStatus,
} from '@/types';
import { toast } from 'sonner';

const PLAN_STATUS_LABELS: Record<PlanStatus, { label: string; color: string }> = {
  active: { label: 'نشط (جاري السداد)', color: 'bg-emerald-100 text-emerald-800 border-emerald-300 dark:bg-emerald-950/60 dark:text-emerald-300' },
  completed: { label: 'مكتمل (خالص السداد)', color: 'bg-blue-100 text-blue-800 border-blue-300 dark:bg-blue-950/60 dark:text-blue-300' },
  defaulted: { label: 'تعثر في السداد', color: 'bg-rose-100 text-rose-800 border-rose-300 dark:bg-rose-950/60 dark:text-rose-300' },
  cancelled: { label: 'ملغي', color: 'bg-slate-100 text-slate-800 border-slate-300 dark:bg-slate-900 dark:text-slate-300' },
};

export default function InstallmentsPage() {
  const { currentUser, activeBranchId } = useSessionStore();
  const orgId = currentUser?.org_id || '';
  const branchId = activeBranchId || currentUser?.branch_id || '';

  const [plans, setPlans] = useState<InstallmentPlan[]>([]);
  const [customers, setCustomers] = useState<Contact[]>([]);
  const [treasuries, setTreasuries] = useState<Treasury[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');

  // Selected Plan Detail Modal
  const [selectedPlan, setSelectedPlan] = useState<InstallmentPlan | null>(null);
  const [planSchedules, setPlanSchedules] = useState<InstallmentSchedule[]>([]);
  const [planGuarantors, setPlanGuarantors] = useState<Guarantor[]>([]);

  // New Plan Modal
  const [isNewPlanOpen, setIsNewPlanOpen] = useState(false);
  const [selectedCustomerId, setSelectedCustomerId] = useState('');
  const [invoiceNumber, setInvoiceNumber] = useState('');
  const [totalInvoiceAmount, setTotalInvoiceAmount] = useState('');
  const [downPayment, setDownPayment] = useState('');
  const [interestRatePercent, setInterestRatePercent] = useState('10');
  const [numberOfInstallments, setNumberOfInstallments] = useState('12');
  const [startDate, setStartDate] = useState(new Date().toISOString().split('T')[0]);
  const [targetTreasuryId, setTargetTreasuryId] = useState('');
  const [notes, setNotes] = useState('');

  // Guarantor Form inside New Plan
  const [gFullName, setGFullName] = useState('');
  const [gNationalId, setGNationalId] = useState('');
  const [gPhone, setGPhone] = useState('');

  // Pay Schedule Item Modal
  const [selectedScheduleToPay, setSelectedScheduleToPay] = useState<InstallmentSchedule | null>(null);
  const [payAmount, setPayAmount] = useState('');
  const [payTreasuryId, setPayTreasuryId] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  const loadData = async () => {
    if (!orgId) return;
    setIsLoading(true);
    try {
      const [pList, cList, trList] = await Promise.all([
        db.installment_plans.where('org_id').equals(orgId).reverse().toArray(),
        db.contacts.where('org_id').equals(orgId).toArray(),
        db.treasuries.where('org_id').equals(orgId).and((t) => t.is_active).toArray(),
      ]);

      setPlans(pList);
      setCustomers(cList.filter((c) => c.type === 'customer' || c.type === 'both'));
      setTreasuries(trList);

      if (trList.length > 0) {
        const defId = trList.find((t) => t.is_default)?.id || trList[0].id;
        setTargetTreasuryId(defId);
        setPayTreasuryId(defId);
      }
    } catch (err) {
      console.error('Error loading installments data:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [orgId]);

  const loadPlanDetail = async (plan: InstallmentPlan) => {
    setSelectedPlan(plan);
    try {
      const [sList, gList] = await Promise.all([
        db.installment_schedules.where('plan_id').equals(plan.id).sortBy('installment_number'),
        db.guarantors.where('plan_id').equals(plan.id).toArray(),
      ]);
      setPlanSchedules(sList);
      setPlanGuarantors(gList);
    } catch (err) {
      console.error(err);
    }
  };

  const filteredPlans = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return plans.filter((p) => {
      const matchesSearch =
        !q ||
        p.plan_number.toLowerCase().includes(q) ||
        p.customer_name.toLowerCase().includes(q) ||
        p.customer_phone.includes(q) ||
        (p.invoice_number || '').toLowerCase().includes(q);

      const matchesStatus = statusFilter === 'all' || p.status === statusFilter;

      return matchesSearch && matchesStatus;
    });
  }, [plans, searchQuery, statusFilter]);

  const kpis = useMemo(() => {
    const totalOriginal = filteredPlans.reduce((acc, p) => acc + (p.total_invoice_amount || 0), 0);
    const totalDownPayment = filteredPlans.reduce((acc, p) => acc + (p.down_payment || 0), 0);
    const totalFinancedWithInterest = filteredPlans.reduce((acc, p) => acc + (p.total_financed_with_interest || p.financed_amount || 0), 0);
    const activeCount = filteredPlans.filter((p) => p.status === 'active').length;
    return {
      totalCount: filteredPlans.length,
      activeCount,
      totalOriginal,
      totalDownPayment,
      totalFinancedWithInterest,
    };
  }, [filteredPlans]);

  // Live Plan Breakdown Preview
  const previewBreakdown = useMemo(() => {
    const total = parseFloat(totalInvoiceAmount) || 0;
    const down = parseFloat(downPayment) || 0;
    const rate = parseFloat(interestRatePercent) || 0;
    const num = parseInt(numberOfInstallments, 10) || 12;

    return InstallmentsRepository.calculatePlanBreakdown(total, down, rate, num);
  }, [totalInvoiceAmount, downPayment, interestRatePercent, numberOfInstallments]);

  const handleCreatePlan = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser || !selectedCustomerId || !totalInvoiceAmount) {
      toast.error('يرجى اختيار العميل وإدخال إجمالي مبلغ المبيعات المراد تقسيطه');
      return;
    }

    const cust = customers.find((c) => c.id === selectedCustomerId);
    if (!cust) return;

    try {
      setIsSaving(true);
      const guarantorsList = gFullName.trim() && gNationalId.trim()
        ? [{ fullName: gFullName, nationalId: gNationalId, phone: gPhone }]
        : [];

      await InstallmentsRepository.createPlan({
        orgId,
        branchId: branchId || currentUser.branch_id || '',
        invoiceNumber: invoiceNumber.trim(),
        customerId: cust.id,
        customerName: cust.name,
        customerPhone: cust.phone || '',
        totalInvoiceAmount: parseFloat(totalInvoiceAmount) || 0,
        downPayment: parseFloat(downPayment) || 0,
        interestRatePercent: parseFloat(interestRatePercent) || 0,
        numberOfInstallments: parseInt(numberOfInstallments, 10) || 12,
        startDate,
        treasuryIdForDownPayment: targetTreasuryId,
        notes: notes.trim(),
        guarantors: guarantorsList,
        userId: currentUser.id,
      });

      toast.success(`تم إنشاء خطة تقسيط جديدة للعميل «${cust.name}» وتوليد جدول الأقساط`);
      setIsNewPlanOpen(false);
      setSelectedCustomerId('');
      setInvoiceNumber('');
      setTotalInvoiceAmount('');
      setDownPayment('');
      setGFullName('');
      setGNationalId('');
      setGPhone('');
      setNotes('');
      loadData();
    } catch (err: any) {
      toast.error(err?.message || 'تعذر إنشاء خطة التقسيط');
    } finally {
      setIsSaving(false);
    }
  };

  const handlePayScheduleItem = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedScheduleToPay || !currentUser) return;
    if (!payTreasuryId) {
      toast.error('يرجى اختيار خزينة التحصيل');
      return;
    }

    try {
      setIsSaving(true);
      const { schedule, plan } = await InstallmentsRepository.payScheduleItem({
        scheduleId: selectedScheduleToPay.id,
        amountPaid: parseFloat(payAmount) || selectedScheduleToPay.remaining_amount,
        treasuryId: payTreasuryId,
        userId: currentUser.id,
      });

      toast.success(`تم تحصيل القسط رقم (${schedule.installment_number}) بنجاح بقيمة ${formatNumber(schedule.paid_amount)} ج.م`);
      setSelectedScheduleToPay(null);
      setPayAmount('');
      if (selectedPlan?.id === plan.id) {
        loadPlanDetail(plan);
      }
      setPlans((prev) => prev.map((p) => (p.id === plan.id ? plan : p)));
    } catch (err: any) {
      toast.error(err?.message || 'خطأ في سداد القسط');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <AppShell
      title="إدارة مبيعات التقسيط والضامنين"
      subtitle="جدولة الأقساط الشهرية للأجهزة والأثاث، حساب الفوائد، الضامنين، ومتابعة الأقساط المستحقة والمتأخرة"
      actions={
        <Button
          onClick={() => setIsNewPlanOpen(true)}
          className="h-10 px-4 rounded-xl bg-primary hover:bg-primary/90 text-white font-bold text-xs flex items-center gap-2 shadow-xs hover:shadow-md transition-all cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          <span>فتح خطة تقسيط جديدة</span>
        </Button>
      }
    >
      <div className="space-y-5 text-right select-none" dir="rtl">
        {/* KPI Cards — Unified Design System */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <KpiCard
            label="إجمالي خطط التقسيط"
            value={kpis.totalCount}
            unit="خطة مسجلة"
            variant="blue"
            icon={<CreditCard className="w-5 h-5" />}
            subtitle={`${kpis.activeCount} خطة سداد نشطة`}
          />
          <KpiCard
            label="إجمالي مبيعات التقسيط"
            value={formatNumber(kpis.totalOriginal)}
            unit="ج.م"
            variant="indigo"
            icon={<DollarSign className="w-5 h-5" />}
          />
          <KpiCard
            label="المقدمات النقدية المستلمة"
            value={formatNumber(kpis.totalDownPayment)}
            unit="ج.م"
            variant="emerald"
            icon={<Receipt className="w-5 h-5" />}
          />
          <KpiCard
            label="إجمالي الممول بالفوائد"
            value={formatNumber(kpis.totalFinancedWithInterest)}
            unit="ج.م"
            variant="amber"
            icon={<Coins className="w-5 h-5" />}
          />
        </div>

        {/* Toolbar & Filter Bar */}
        <div className="flex flex-wrap items-center justify-between gap-3 bg-surface border border-slate-200/80 dark:border-slate-800/80 p-3.5 rounded-2xl shadow-2xs">
          <div className="flex flex-wrap items-center gap-3 flex-1 min-w-[280px]">
            <div className="relative flex-1 max-w-sm">
              <Search className="w-4 h-4 text-slate-400 absolute right-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
              <Input
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="ابحث برقم الخطة، اسم العميل، الهاتف، أو رقم الفاتورة..."
                className="h-10 bg-slate-50/70 dark:bg-slate-900/70 text-xs font-semibold rounded-xl pr-10 border-slate-200/80 dark:border-slate-800"
              />
            </div>

            <div className="w-48">
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-full h-10 rounded-xl bg-slate-50/70 dark:bg-slate-900/70 border-slate-200/80 dark:border-slate-800 text-xs font-bold">
                  <SelectValue placeholder="تصفية بحالة التقسيط..." />
                </SelectTrigger>
                <SelectContent className="z-50 bg-popover border border-slate-200 dark:border-slate-800 rounded-xl shadow-xl max-h-60">
                  <SelectItem value="all">كافة الحالات</SelectItem>
                  {Object.entries(PLAN_STATUS_LABELS).map(([key, st]) => (
                    <SelectItem key={key} value={key}>
                      {st.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>

        {/* Plans List */}
        {isLoading ? (
          <div className="py-20 text-center text-xs font-bold text-slate-400 flex flex-col items-center gap-2">
            <Loader2 className="w-7 h-7 animate-spin text-primary" />
            <span>جاري تحميل خطط التقسيط...</span>
          </div>
        ) : filteredPlans.length === 0 ? (
          <EmptyState
            icon={<CreditCard className="w-7 h-7 text-slate-400" />}
            title="لا توجد خطط تقسيط مسجلة"
            description="ابدأ بجدولة أول عملية بيع بالتقسيط مع تحديد الدفعة المقدمة والفوائد والأقساط الشهرية."
            action={{
              label: "فتح خطة تقسيط جديدة",
              icon: <Plus className="w-4 h-4" />,
              onClick: () => setIsNewPlanOpen(true),
            }}
          />
        ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredPlans.map((plan) => {
            const st = PLAN_STATUS_LABELS[plan.status];
            return (
              <div
                key={plan.id}
                onClick={() => loadPlanDetail(plan)}
                className="p-4 rounded-3xl border border-slate-200/90 dark:border-slate-800 bg-surface hover:border-indigo-400 transition-all space-y-3 cursor-pointer group shadow-2xs hover:shadow-xs"
              >
                <div className="flex items-center justify-between">
                  <span className="font-mono font-black text-sm text-slate-900 dark:text-white group-hover:text-indigo-600 transition-colors">
                    #{plan.plan_number}
                  </span>
                  <span className={`px-2.5 py-1 rounded-full text-3xs font-bold border ${st.color}`}>
                    {st.label}
                  </span>
                </div>

                <div className="space-y-1">
                  <div className="font-bold text-xs text-slate-900 dark:text-white flex items-center gap-1.5">
                    <User className="w-3.5 h-3.5 text-indigo-500" />
                    <span>{plan.customer_name}</span>
                  </div>
                  <div className="text-2xs text-slate-500 font-mono flex items-center gap-1">
                    <Phone className="w-3 h-3" />
                    <span>{plan.customer_phone}</span>
                  </div>
                </div>

                <div className="p-2.5 rounded-2xl bg-indigo-50/50 dark:bg-indigo-950/20 border border-indigo-100 dark:border-indigo-900/40 grid grid-cols-2 gap-2 text-2xs font-semibold">
                  <div>
                    <span className="text-slate-400 block text-3xs">إجمالي الممول بالمرابحة:</span>
                    <span className="font-mono font-black text-indigo-600 dark:text-indigo-400">
                      {formatNumber(plan.total_financed_with_interest)} ج.م
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-400 block text-3xs">القسط الشهري:</span>
                    <span className="font-mono font-black text-emerald-600 dark:text-emerald-400">
                      {formatNumber(plan.installment_amount)} ج.م (×{plan.number_of_installments})
                    </span>
                  </div>
                </div>

                <div className="pt-2 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-2xs text-slate-500 font-semibold">
                  <span>المقدم: {formatNumber(plan.down_payment)} ج.م</span>
                  <span>المرابحة: {plan.interest_rate_percent}%</span>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Plan Detail Modal */}
      {selectedPlan && (
        <Dialog open={!!selectedPlan} onOpenChange={(open) => !open && setSelectedPlan(null)}>
          <DialogContent className="max-w-3xl max-h-[92vh] overflow-y-auto p-6 rounded-3xl bg-surface text-right" dir="rtl">
            <DialogHeader className="pb-2 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center justify-between">
                <DialogTitle className="text-base font-black flex items-center gap-2">
                  <CreditCard className="w-5 h-5 text-indigo-500" />
                  <span>تفاصيل جدول أقساط خطة #{selectedPlan.plan_number}</span>
                </DialogTitle>
                <span className={`px-3 py-1 rounded-full text-xs font-bold border ${PLAN_STATUS_LABELS[selectedPlan.status].color}`}>
                  {PLAN_STATUS_LABELS[selectedPlan.status].label}
                </span>
              </div>
            </DialogHeader>

            <div className="space-y-4 pt-2 text-xs">
              {/* Client & Plan Overview */}
              <div className="grid grid-cols-3 gap-3 p-3.5 rounded-2xl bg-surface-2 border border-slate-200 dark:border-slate-800 font-semibold text-2xs">
                <div>
                  <span className="text-slate-400 block">العميل:</span>
                  <span className="text-slate-900 dark:text-white font-bold text-xs">
                    {selectedPlan.customer_name} ({selectedPlan.customer_phone})
                  </span>
                </div>
                <div>
                  <span className="text-slate-400 block">المبلغ الممول + المرابحة:</span>
                  <span className="text-indigo-600 font-mono font-bold text-xs">
                    {formatNumber(selectedPlan.total_financed_with_interest)} ج.م
                  </span>
                </div>
                <div>
                  <span className="text-slate-400 block">القسط الشهري:</span>
                  <span className="text-emerald-600 font-mono font-bold text-xs">
                    {formatNumber(selectedPlan.installment_amount)} ج.م × {selectedPlan.number_of_installments} شهر
                  </span>
                </div>
              </div>

              {/* Guarantors Section */}
              {planGuarantors.length > 0 && (
                <div className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-1">
                  <span className="text-2xs font-bold text-slate-500 flex items-center gap-1">
                    <UserCheck className="w-3.5 h-3.5 text-indigo-500" />
                    <span>بيانات الضامن:</span>
                  </span>
                  {planGuarantors.map((g) => (
                    <div key={g.id} className="text-2xs font-semibold text-slate-800 dark:text-slate-200">
                      {g.full_name} — قومي: <span className="font-mono">{g.national_id}</span> — هاتف: <span className="font-mono">{g.phone}</span>
                    </div>
                  ))}
                </div>
              )}

              {/* Schedule Table */}
              <div className="border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden">
                <div className="px-4 py-2 bg-slate-50 dark:bg-slate-900 font-bold text-slate-800 dark:text-slate-200 text-xs">
                  جدول الأقساط الشهرية ({planSchedules.length} قسط)
                </div>
                <table className="w-full text-right text-2xs">
                  <thead className="bg-slate-50/50 dark:bg-slate-900/30 font-bold text-slate-500">
                    <tr>
                      <th className="py-2.5 px-3">رقم القسط</th>
                      <th className="py-2.5 px-3">تاريخ الاستحقاق</th>
                      <th className="py-2.5 px-3 text-center">قيمة القسط</th>
                      <th className="py-2.5 px-3 text-center">المسدد</th>
                      <th className="py-2.5 px-3 text-center">الحالة</th>
                      <th className="py-2.5 px-3 text-left">إجراء السداد</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800 font-medium">
                    {planSchedules.map((s) => (
                      <tr key={s.id} className={s.remaining_amount === 0 ? 'bg-emerald-50/20' : ''}>
                        <td className="py-2.5 px-3 font-bold font-mono text-center">{s.installment_number}</td>
                        <td className="py-2.5 px-3 font-mono font-bold text-slate-800 dark:text-slate-200">{s.due_date}</td>
                        <td className="py-2.5 px-3 text-center font-mono font-bold text-indigo-600">{formatNumber(s.amount)} ج.م</td>
                        <td className="py-2.5 px-3 text-center font-mono text-emerald-600">{formatNumber(s.paid_amount)} ج.م</td>
                        <td className="py-2.5 px-3 text-center">
                          {s.remaining_amount === 0 ? (
                            <span className="px-2 py-0.5 rounded bg-emerald-100 text-emerald-800 font-bold">مسدد</span>
                          ) : (
                            <span className="px-2 py-0.5 rounded bg-rose-100 text-rose-800 font-bold">مستحق ({formatNumber(s.remaining_amount)})</span>
                          )}
                        </td>
                        <td className="py-2.5 px-3 text-left">
                          {s.remaining_amount > 0 && (
                            <Button
                              type="button"
                              size="sm"
                              onClick={() => {
                                setSelectedScheduleToPay(s);
                                setPayAmount(String(s.remaining_amount));
                              }}
                              className="h-7 px-3 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-3xs rounded-lg cursor-pointer"
                            >
                              سداد القسط
                            </Button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="pt-2 flex justify-between border-t border-slate-100 dark:border-slate-800">
                <Button type="button" variant="outline" onClick={() => window.print()} className="gap-1 rounded-xl">
                  <Printer className="w-4 h-4" />
                  <span>طباعة عقد التقسيط</span>
                </Button>
                <Button type="button" variant="outline" onClick={() => setSelectedPlan(null)} className="rounded-xl">
                  إغلاق
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}

      {/* Modal: New Installment Plan */}
      <Dialog open={isNewPlanOpen} onOpenChange={setIsNewPlanOpen}>
        <DialogContent className="max-w-2xl max-h-[92vh] overflow-y-auto p-6 rounded-3xl bg-surface text-right" dir="rtl">
          <DialogHeader className="pb-2 border-b border-slate-100 dark:border-slate-800">
            <DialogTitle className="text-base font-black flex items-center gap-2">
              <CreditCard className="w-5 h-5 text-indigo-500" />
              <span>فتح خطة تقسيط وجدولة جديدة</span>
            </DialogTitle>
          </DialogHeader>

          <form onSubmit={handleCreatePlan} className="space-y-4 pt-2 text-xs">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1 col-span-2 sm:col-span-1">
                <Label className="font-bold">اختر العميل *</Label>
                <Select value={selectedCustomerId} onValueChange={setSelectedCustomerId}>
                  <SelectTrigger className="h-10 rounded-xl bg-slate-50 dark:bg-slate-900 font-bold">
                    <SelectValue placeholder="اختر العميل..." />
                  </SelectTrigger>
                  <SelectContent className="max-h-56">
                    {customers.map((c) => (
                      <SelectItem key={c.id} value={c.id}>
                        {c.name} {c.phone ? `(${c.phone})` : ''}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1">
                <Label className="font-bold">رقم الفاتورة المرتبطة (اختياري)</Label>
                <Input
                  value={invoiceNumber}
                  onChange={(e) => setInvoiceNumber(e.target.value)}
                  placeholder="مثال: INV-P1-00102..."
                  className="h-10 rounded-xl font-mono"
                />
              </div>

              <div className="space-y-1">
                <Label className="font-bold">إجمالي قيمة الفاتورة (ج.م) *</Label>
                <Input
                  type="number"
                  step="any"
                  required
                  value={totalInvoiceAmount}
                  onChange={(e) => setTotalInvoiceAmount(e.target.value)}
                  placeholder="0.00"
                  className="h-10 rounded-xl font-mono text-center font-bold"
                />
              </div>

              <div className="space-y-1">
                <Label className="font-bold">المقدم المدفوع كاش (ج.م)</Label>
                <Input
                  type="number"
                  step="any"
                  value={downPayment}
                  onChange={(e) => setDownPayment(e.target.value)}
                  placeholder="0.00"
                  className="h-10 rounded-xl font-mono text-center font-bold text-emerald-600"
                />
              </div>

              <div className="space-y-1">
                <Label className="font-bold">نسبة الفائدة / المرابحة (%)</Label>
                <Input
                  type="number"
                  step="any"
                  value={interestRatePercent}
                  onChange={(e) => setInterestRatePercent(e.target.value)}
                  placeholder="10"
                  className="h-10 rounded-xl font-mono text-center font-bold text-purple-600"
                />
              </div>

              <div className="space-y-1">
                <Label className="font-bold">عدد الأقساط (شهور)</Label>
                <Input
                  type="number"
                  value={numberOfInstallments}
                  onChange={(e) => setNumberOfInstallments(e.target.value)}
                  placeholder="12"
                  className="h-10 rounded-xl font-mono text-center font-bold"
                />
              </div>

              <div className="space-y-1">
                <Label className="font-bold">تاريخ استحقاق القسط الأول</Label>
                <Input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="h-10 rounded-xl font-mono text-center font-bold"
                />
              </div>

              <div className="space-y-1">
                <Label className="font-bold">خزينة استلام المقدم</Label>
                <Select value={targetTreasuryId} onValueChange={setTargetTreasuryId}>
                  <SelectTrigger className="h-10 rounded-xl bg-slate-50 dark:bg-slate-900 font-bold">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {treasuries.map((t) => (
                      <SelectItem key={t.id} value={t.id}>
                        {t.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Live Financial Breakdown Box */}
            <div className="p-3.5 rounded-2xl bg-indigo-50/70 dark:bg-indigo-950/30 border border-indigo-200 dark:border-indigo-900/50 grid grid-cols-2 sm:grid-cols-3 gap-2 text-2xs font-semibold">
              <div>
                <span className="text-slate-400 block">أصل المبلغ الممول:</span>
                <span className="font-mono font-bold text-slate-900 dark:text-white">
                  {formatNumber(previewBreakdown.financedAmount)} ج.م
                </span>
              </div>
              <div>
                <span className="text-slate-400 block">مبلغ الفائدة/المرابحة:</span>
                <span className="font-mono font-bold text-purple-600 dark:text-purple-400">
                  +{formatNumber(previewBreakdown.interestAmount)} ج.م
                </span>
              </div>
              <div className="col-span-2 sm:col-span-1">
                <span className="text-slate-400 block">القسط الشهري الثابت:</span>
                <span className="font-mono font-black text-emerald-600 dark:text-emerald-400 text-sm">
                  {formatNumber(previewBreakdown.installmentAmount)} ج.م / شهر
                </span>
              </div>
            </div>

            {/* Guarantor Details */}
            <div className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-2">
              <span className="font-bold text-slate-800 dark:text-slate-200 block text-2xs">بيانات الضامن الأول (اختياري)</span>
              <div className="grid grid-cols-3 gap-2">
                <Input
                  value={gFullName}
                  onChange={(e) => setGFullName(e.target.value)}
                  placeholder="اسم الضامن بالكامل..."
                  className="h-9 rounded-lg"
                />
                <Input
                  value={gNationalId}
                  onChange={(e) => setGNationalId(e.target.value)}
                  placeholder="الرقم القومي (14 رقم)..."
                  className="h-9 rounded-lg font-mono"
                />
                <Input
                  value={gPhone}
                  onChange={(e) => setGPhone(e.target.value)}
                  placeholder="رقم الهاتف..."
                  className="h-9 rounded-lg font-mono"
                />
              </div>
            </div>

            <div className="pt-2 flex justify-end gap-2 border-t border-slate-100 dark:border-slate-800">
              <Button type="button" variant="outline" onClick={() => setIsNewPlanOpen(false)}>
                إلغاء
              </Button>
              <Button type="submit" disabled={isSaving} className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold">
                {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : 'تأكيد وحفظ الجدول'}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Modal: Pay Schedule Item */}
      {selectedScheduleToPay && (
        <Dialog open={!!selectedScheduleToPay} onOpenChange={(open) => !open && setSelectedScheduleToPay(null)}>
          <DialogContent className="max-w-md p-6 rounded-3xl bg-surface text-right" dir="rtl">
            <DialogHeader className="pb-2">
              <DialogTitle className="text-sm font-black text-emerald-600">
                سداد قسط تقسيط شهرى - قسط #{selectedScheduleToPay.installment_number}
              </DialogTitle>
            </DialogHeader>

            <form onSubmit={handlePayScheduleItem} className="space-y-3 text-xs pt-1">
              <div className="space-y-1">
                <Label>المبلغ المسدد (ج.م) *</Label>
                <Input
                  type="number"
                  step="any"
                  required
                  value={payAmount}
                  onChange={(e) => setPayAmount(e.target.value)}
                  className="h-11 rounded-xl font-mono text-center font-black text-base text-emerald-600 bg-emerald-50/50"
                />
              </div>

              <div className="space-y-1">
                <Label>خزينة التحصيل *</Label>
                <Select value={payTreasuryId} onValueChange={setPayTreasuryId}>
                  <SelectTrigger className="h-10 rounded-xl bg-slate-50 dark:bg-slate-900 font-bold">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {treasuries.map((t) => (
                      <SelectItem key={t.id} value={t.id}>
                        {t.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="pt-2 flex justify-end gap-2">
                <Button type="button" variant="outline" onClick={() => setSelectedScheduleToPay(null)}>
                  إلغاء
                </Button>
                <Button type="submit" disabled={isSaving} className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold">
                  تأكيد سداد القسط
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      )}
    </div>
    </AppShell>
  );
}
