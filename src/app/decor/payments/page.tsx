'use client';

import React, { useState, useMemo } from 'react';
import { AppShell } from '@/components/layout/AppShell';
import {
  Receipt,
  Search,
  Plus,
  CheckCircle2,
  Clock,
  AlertCircle,
  Building,
  Printer,
  Calendar,
  Banknote,
  CreditCard,
  TrendingUp,
  X,
  FileText
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { formatNumber } from '@/lib/format';
import { toast } from 'sonner';

interface ProjectMilestonePayment {
  id: string;
  receiptNo: string;
  projectName: string;
  clientName: string;
  milestoneTitle: string; // دفعة تعاقد، دفعة توريد، دفعة تشطيب، تسليم نهائي
  amountDue: number;
  amountPaid: number;
  dueDate: string;
  paidDate?: string;
  paymentMethod?: 'كاش خزينة' | 'تحويل بنكي / إنستاباي' | 'شيك بنكي';
  status: 'paid' | 'pending' | 'overdue';
}

const INITIAL_PAYMENTS: ProjectMilestonePayment[] = [
  {
    id: 'pay-1',
    receiptNo: 'REC-901',
    projectName: 'تجهيز بوتيك أزياء "لو رويال"',
    clientName: 'أ / حازم عبد الرحمن الشريف',
    milestoneTitle: 'عربون التعاقد واعتماد التصاميم (40%)',
    amountDue: 58000,
    amountPaid: 58000,
    dueDate: '2026-09-10',
    paidDate: '2026-09-10',
    paymentMethod: 'تحويل بنكي / إنستاباي',
    status: 'paid',
  },
  {
    id: 'pay-2',
    receiptNo: 'REC-902',
    projectName: 'تجهيز بوتيك أزياء "لو رويال"',
    clientName: 'أ / حازم عبد الرحمن الشريف',
    milestoneTitle: 'دفعة توريد الكلادينج والزجاج (30%)',
    amountDue: 42000,
    amountPaid: 42000,
    dueDate: '2026-09-25',
    paidDate: '2026-09-26',
    paymentMethod: 'كاش خزينة',
    status: 'paid',
  },
  {
    id: 'pay-3',
    receiptNo: 'REC-903',
    projectName: 'تجهيز بوتيك أزياء "لو رويال"',
    clientName: 'أ / حازم عبد الرحمن الشريف',
    milestoneTitle: 'مستخلص إنهاء التركيبات والأرضيات (20%)',
    amountDue: 29000,
    amountPaid: 0,
    dueDate: '2026-10-15',
    status: 'pending',
  },
  {
    id: 'pay-4',
    receiptNo: 'REC-904',
    projectName: 'تشطيب وتجهيز كافيه "أروما روسترز"',
    clientName: 'م / إيهاب المنشاوي',
    milestoneTitle: 'دفعة التعاقد والمقاسات الميدانية (40%)',
    amountDue: 80000,
    amountPaid: 80000,
    dueDate: '2026-09-22',
    paidDate: '2026-09-22',
    paymentMethod: 'تحويل بنكي / إنستاباي',
    status: 'paid',
  },
  {
    id: 'pay-5',
    receiptNo: 'REC-905',
    projectName: 'تشطيب وتجهيز كافيه "أروما روسترز"',
    clientName: 'م / إيهاب المنشاوي',
    milestoneTitle: 'دفعة تصنيع البار والأثاث الداخلي (30%)',
    amountDue: 60000,
    amountPaid: 0,
    dueDate: '2026-10-02',
    status: 'overdue',
  },
  {
    id: 'pay-6',
    receiptNo: 'REC-906',
    projectName: 'تجهيز صيدلية "د. مريم النور"',
    clientName: 'د / مريم كمال زكي',
    milestoneTitle: 'دفعة التسليم النهائي والضمان (10%)',
    amountDue: 18000,
    amountPaid: 18000,
    dueDate: '2026-10-05',
    paidDate: '2026-10-05',
    paymentMethod: 'شيك بنكي',
    status: 'paid',
  },
];

export default function DecorPaymentsPage() {
  const [payments, setPayments] = useState<ProjectMilestonePayment[]>(INITIAL_PAYMENTS);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'paid' | 'pending' | 'overdue'>('all');
  const [isCollectModalOpen, setIsCollectModalOpen] = useState(false);
  const [targetPayment, setTargetPayment] = useState<ProjectMilestonePayment | null>(null);

  // Form State for payment collection
  const [collectAmount, setCollectAmount] = useState<number>(0);
  const [collectMethod, setCollectMethod] = useState<'كاش خزينة' | 'تحويل بنكي / إنستاباي' | 'شيك بنكي'>('كاش خزينة');

  // Filtered Payments
  const filteredPayments = useMemo(() => {
    return payments.filter((p) => {
      const matchStatus = statusFilter === 'all' || p.status === statusFilter;
      const matchSearch =
        !searchQuery.trim() ||
        p.projectName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        p.clientName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        p.receiptNo.toLowerCase().includes(searchQuery.toLowerCase()) ||
        p.milestoneTitle.toLowerCase().includes(searchQuery.toLowerCase());
      return matchStatus && matchSearch;
    });
  }, [payments, statusFilter, searchQuery]);

  // Overall Financial Stats
  const stats = useMemo(() => {
    const totalCollected = payments.reduce((acc, p) => acc + p.amountPaid, 0);
    const totalPending = payments
      .filter((p) => p.status === 'pending')
      .reduce((acc, p) => acc + (p.amountDue - p.amountPaid), 0);
    const totalOverdue = payments
      .filter((p) => p.status === 'overdue')
      .reduce((acc, p) => acc + (p.amountDue - p.amountPaid), 0);
    return { totalCollected, totalPending, totalOverdue };
  }, [payments]);

  // Handle open collection modal
  const handleOpenCollect = (item: ProjectMilestonePayment) => {
    setTargetPayment(item);
    setCollectAmount(item.amountDue - item.amountPaid);
    setIsCollectModalOpen(true);
  };

  // Confirm Collection
  const handleConfirmCollect = (e: React.FormEvent) => {
    e.preventDefault();
    if (!targetPayment) return;

    setPayments((prev) =>
      prev.map((p) => {
        if (p.id !== targetPayment.id) return p;
        return {
          ...p,
          amountPaid: p.amountDue,
          paidDate: new Date().toISOString().slice(0, 10),
          paymentMethod: collectMethod,
          status: 'paid',
        };
      })
    );

    setIsCollectModalOpen(false);
    toast.success(`تم تحصيل وسداد مبلغ ${formatNumber(collectAmount)} ج.م بنجاح`);
  };

  return (
    <AppShell title="مستخلصات ودفعات المشاريع">
      <div className="flex flex-col gap-5 p-3 sm:p-6 select-none" dir="rtl">
        {/* Header */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-surface p-4 sm:p-5 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-2xs">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-emerald-600 to-teal-700 flex items-center justify-center text-white text-xl shadow-xs shrink-0">
              🧾
            </div>
            <div>
              <h1 className="text-lg sm:text-xl font-black text-slate-900 dark:text-white">
                مستخلصات ودفعات مشاريع التجهيز والديكور
              </h1>
              <p className="text-xs text-slate-500 dark:text-slate-400 font-medium mt-0.5">
                تتبع دفعات التعاقد، مستخلصات التوريد والتركيب، وتوثيق سندات القبض
              </p>
            </div>
          </div>
        </div>

        {/* 3 KPI Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5">
          <div className="bg-surface p-4 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-2xs flex flex-col gap-1">
            <div className="flex items-center justify-between text-slate-500 text-xs font-bold">
              <span>إجمالي المحصل نقداً وبنكياً</span>
              <CheckCircle2 className="w-4 h-4 text-emerald-500" />
            </div>
            <span className="text-2xl font-black text-emerald-600 dark:text-emerald-400">
              {formatNumber(stats.totalCollected)} <span className="text-xs">ج.م</span>
            </span>
            <span className="text-3xs text-slate-400">سندات قبض معتمدة بالخزينة</span>
          </div>

          <div className="bg-surface p-4 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-2xs flex flex-col gap-1">
            <div className="flex items-center justify-between text-slate-500 text-xs font-bold">
              <span>مستخلصات مجدولة قادمة</span>
              <Clock className="w-4 h-4 text-blue-500" />
            </div>
            <span className="text-2xl font-black text-blue-600 dark:text-blue-400">
              {formatNumber(stats.totalPending)} <span className="text-xs">ج.م</span>
            </span>
            <span className="text-3xs text-slate-400">دفعات مرتبطة بمراحل التركيب</span>
          </div>

          <div className="bg-surface p-4 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-2xs flex flex-col gap-1">
            <div className="flex items-center justify-between text-slate-500 text-xs font-bold">
              <span>مستخلصات متأخرة السداد</span>
              <AlertCircle className="w-4 h-4 text-rose-500" />
            </div>
            <span className="text-2xl font-black text-rose-600 dark:text-rose-400">
              {formatNumber(stats.totalOverdue)} <span className="text-xs">ج.م</span>
            </span>
            <span className="text-3xs text-slate-400">تجاوزت تاريخ الاستحقاق المحدد</span>
          </div>
        </div>

        {/* Filters and Search Bar */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-surface p-3 sm:p-4 rounded-2xl border border-slate-200/80 dark:border-slate-800">
          <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar w-full sm:w-auto">
            {[
              { id: 'all', label: 'كافة المستخلصات' },
              { id: 'paid', label: 'تم التحصيل' },
              { id: 'pending', label: 'قيد الاستحقاق' },
              { id: 'overdue', label: 'متأخرة' },
            ].map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setStatusFilter(tab.id as any)}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all shrink-0 cursor-pointer ${
                  statusFilter === tab.id
                    ? 'bg-amber-600 text-white shadow-2xs'
                    : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          <div className="relative w-full sm:w-72">
            <Search className="w-4 h-4 text-slate-400 absolute right-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="بحث بالمشروع، العميل، رقم السند..."
              className="w-full h-9 pr-9 pl-3 text-xs bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl focus:border-amber-500 font-medium"
            />
          </div>
        </div>

        {/* Payments Table */}
        <div className="bg-surface rounded-2xl border border-slate-200/80 dark:border-slate-800 overflow-hidden shadow-2xs">
          <div className="overflow-x-auto">
            <table className="w-full text-right text-xs">
              <thead className="bg-slate-50 dark:bg-slate-900/60 border-b border-slate-200 dark:border-slate-800 text-slate-500 text-3xs font-bold">
                <tr>
                  <th className="p-3.5">سند الدفعة</th>
                  <th className="p-3.5">المشروع والعميل</th>
                  <th className="p-3.5">المرحلة والمستخلص</th>
                  <th className="p-3.5 text-center">تاريخ الاستحقاق</th>
                  <th className="p-3.5 text-left">المبلغ المطلوب</th>
                  <th className="p-3.5 text-left">المسدد</th>
                  <th className="p-3.5 text-center">الحالة</th>
                  <th className="p-3.5 text-center">إجراءات</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800/80">
                {filteredPayments.map((p) => (
                  <tr key={p.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-900/40">
                    <td className="p-3.5 font-bold font-mono text-slate-900 dark:text-white">
                      {p.receiptNo}
                    </td>
                    <td className="p-3.5 font-bold">
                      <div className="text-slate-900 dark:text-white">{p.projectName}</div>
                      <span className="text-3xs text-slate-400 block font-normal">{p.clientName}</span>
                    </td>
                    <td className="p-3.5 text-slate-700 dark:text-slate-300 font-medium">
                      {p.milestoneTitle}
                    </td>
                    <td className="p-3.5 text-center text-slate-500 text-3xs font-mono">
                      {p.dueDate}
                    </td>
                    <td className="p-3.5 text-left font-black text-slate-900 dark:text-white">
                      {formatNumber(p.amountDue)} ج.م
                    </td>
                    <td className="p-3.5 text-left font-bold text-emerald-600 dark:text-emerald-400">
                      {formatNumber(p.amountPaid)} ج.م
                    </td>
                    <td className="p-3.5 text-center">
                      {p.status === 'paid' ? (
                        <Badge className="bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-400 border-none text-3xs font-bold">
                          مسدد بالكامل ({p.paymentMethod})
                        </Badge>
                      ) : p.status === 'overdue' ? (
                        <Badge className="bg-rose-50 text-rose-700 dark:bg-rose-950/60 dark:text-rose-400 border-none text-3xs font-bold">
                          متأخر
                        </Badge>
                      ) : (
                        <Badge className="bg-blue-50 text-blue-700 dark:bg-blue-950/60 dark:text-blue-400 border-none text-3xs font-bold">
                          مجدول
                        </Badge>
                      )}
                    </td>
                    <td className="p-3.5 text-center">
                      <div className="flex items-center justify-center gap-1.5">
                        {p.status !== 'paid' ? (
                          <button
                            type="button"
                            onClick={() => handleOpenCollect(p)}
                            className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-bold text-3xs transition-all cursor-pointer"
                          >
                            تحصيل الدفعة
                          </button>
                        ) : (
                          <button
                            type="button"
                            onClick={() => {
                              toast.info(`طباعة سند قبض ${p.receiptNo}`);
                              window.print();
                            }}
                            className="p-1.5 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500 rounded-lg cursor-pointer"
                            title="طباعة إيصال السند"
                          >
                            <Printer className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Modal: Collect Payment */}
        {isCollectModalOpen && targetPayment && (
          <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-3">
            <div className="bg-surface w-full max-w-md rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xl overflow-hidden">
              <div className="p-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between bg-slate-50 dark:bg-slate-900">
                <div className="flex items-center gap-2">
                  <Banknote className="w-5 h-5 text-emerald-600" />
                  <h3 className="font-black text-sm text-slate-900 dark:text-white">
                    تحصيل دفعة ومستخلص مشروع
                  </h3>
                </div>
                <button
                  type="button"
                  onClick={() => setIsCollectModalOpen(false)}
                  className="p-1 text-slate-400 hover:text-slate-600"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <form onSubmit={handleConfirmCollect} className="p-4 space-y-3.5">
                <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 space-y-1 text-xs">
                  <div>
                    <span className="text-3xs text-slate-400">المشروع:</span>
                    <span className="font-bold mr-1 text-slate-900 dark:text-white">
                      {targetPayment.projectName}
                    </span>
                  </div>
                  <div>
                    <span className="text-3xs text-slate-400">البند:</span>
                    <span className="font-medium mr-1 text-slate-700 dark:text-slate-300">
                      {targetPayment.milestoneTitle}
                    </span>
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block">
                    المبلغ المحصل (ج.م) *
                  </label>
                  <input
                    type="number"
                    required
                    value={collectAmount}
                    onChange={(e) => setCollectAmount(Number(e.target.value) || 0)}
                    className="w-full h-9 px-3 text-sm font-black bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl focus:border-emerald-500 text-emerald-600"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block">
                    طريقة الدفع / وسيلة الإيداع
                  </label>
                  <select
                    value={collectMethod}
                    onChange={(e) => setCollectMethod(e.target.value as any)}
                    className="w-full h-9 px-2 text-xs bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl focus:border-emerald-500 font-bold"
                  >
                    <option value="كاش خزينة">كاش خزينة المحل / الشركة</option>
                    <option value="تحويل بنكي / إنستاباي">تحويل بنكي / إنستاباي InstaPay</option>
                    <option value="شيك بنكي">شيك بنكي مؤجل / مسحوب</option>
                  </select>
                </div>

                <div className="pt-2 flex items-center justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => setIsCollectModalOpen(false)}
                    className="px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-xl"
                  >
                    إلغاء
                  </button>
                  <button
                    type="submit"
                    className="px-5 py-2 text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl shadow-xs"
                  >
                    تأكيد وإصدار السند
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </AppShell>
  );
}
