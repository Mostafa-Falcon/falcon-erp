'use client';

import React, { useState, useMemo } from 'react';
import { AppShell } from '@/components/layout/AppShell';
import {
  Users,
  Search,
  Plus,
  Hammer,
  Phone,
  Briefcase,
  DollarSign,
  CheckCircle2,
  AlertCircle,
  Building,
  Printer,
  X,
  CreditCard,
  UserCheck
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { formatNumber } from '@/lib/format';
import { toast } from 'sonner';

interface Contractor {
  id: string;
  name: string;
  trade: 'نجارة وأثاث' | 'كلادينج وزجاج' | 'كهرباء وليد' | 'جبس بورد وأسقف' | 'دهانات ونقاشة' | 'أرضيات وباركيه';
  phone: string;
  activeProject: string;
  rateType: 'مقاولة مقطوعة' | 'بالمتر المربع (م²)' | 'يومية عمل';
  rateValue: number;
  totalEarned: number;
  totalPaid: number;
  status: 'active' | 'completed' | 'on_leave';
}

const INITIAL_CONTRACTORS: Contractor[] = [
  {
    id: 'cnt-1',
    name: 'الأسطى / محمود عبد ربه (معلم نجارة)',
    trade: 'نجارة وأثاث',
    phone: '01011223344',
    activeProject: 'تجهيز بوتيك أزياء "لو رويال"',
    rateType: 'مقاولة مقطوعة',
    rateValue: 18000,
    totalEarned: 18000,
    totalPaid: 12000,
    status: 'active',
  },
  {
    id: 'cnt-2',
    name: 'المعلم / صبري الحداد (فني كلادينج)',
    trade: 'كلادينج وزجاج',
    phone: '01222334455',
    activeProject: 'تجهيز بوتيك أزياء "لو رويال"',
    rateType: 'بالمتر المربع (م²)',
    rateValue: 220,
    totalEarned: 9500,
    totalPaid: 9500,
    status: 'completed',
  },
  {
    id: 'cnt-3',
    name: 'الأسطى / طارق ليد (كهرباء وسبوتات)',
    trade: 'كهرباء وليد',
    phone: '01155667788',
    activeProject: 'تشطيب وتجهيز كافيه "أروما روسترز"',
    rateType: 'يومية عمل',
    rateValue: 450,
    totalEarned: 7200,
    totalPaid: 5000,
    status: 'active',
  },
  {
    id: 'cnt-4',
    name: 'معلم / كريم شريف (جبس بورد وديكور)',
    trade: 'جبس بورد وأسقف',
    phone: '01599887766',
    activeProject: 'تجهيز صيدلية "د. مريم النور"',
    rateType: 'بالمتر المربع (م²)',
    rateValue: 120,
    totalEarned: 8400,
    totalPaid: 8400,
    status: 'completed',
  },
  {
    id: 'cnt-5',
    name: 'الأسطى / مجدي النجار (نقاشة ودهان دوكو)',
    trade: 'دهانات ونقاشة',
    phone: '01099112233',
    activeProject: 'تطوير سوبرماركت "البركة"',
    rateType: 'مقاولة مقطوعة',
    rateValue: 12000,
    totalEarned: 12000,
    totalPaid: 6000,
    status: 'active',
  },
];

export default function DecorContractorsPage() {
  const [contractors, setContractors] = useState<Contractor[]>(INITIAL_CONTRACTORS);
  const [searchQuery, setSearchQuery] = useState('');
  const [tradeFilter, setTradeFilter] = useState<string>('all');
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isPayModalOpen, setIsPayModalOpen] = useState(false);
  const [targetContractor, setTargetContractor] = useState<Contractor | null>(null);
  const [paymentAmount, setPaymentAmount] = useState<number>(0);

  // New Contractor Form State
  const [formName, setFormName] = useState('');
  const [formTrade, setFormTrade] = useState<Contractor['trade']>('نجارة وأثاث');
  const [formPhone, setFormPhone] = useState('');
  const [formProject, setFormProject] = useState('مشروع تجهيز محل جديد');
  const [formRateType, setFormRateType] = useState<Contractor['rateType']>('مقاولة مقطوعة');
  const [formRateValue, setFormRateValue] = useState('10000');

  // Filtered List
  const filtered = useMemo(() => {
    return contractors.filter((c) => {
      const matchTrade = tradeFilter === 'all' || c.trade === tradeFilter;
      const matchSearch =
        !searchQuery.trim() ||
        c.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        c.phone.includes(searchQuery) ||
        c.activeProject.toLowerCase().includes(searchQuery.toLowerCase());
      return matchTrade && matchSearch;
    });
  }, [contractors, tradeFilter, searchQuery]);

  // Overall Financial stats
  const totals = useMemo(() => {
    const totalEarnedSum = contractors.reduce((acc, c) => acc + c.totalEarned, 0);
    const totalPaidSum = contractors.reduce((acc, c) => acc + c.totalPaid, 0);
    const totalDue = totalEarnedSum - totalPaidSum;
    return { totalEarnedSum, totalPaidSum, totalDue };
  }, [contractors]);

  // Add Contractor
  const handleAddContractor = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formName.trim()) {
      toast.error('يرجى إدخال اسم الفني / المقاول');
      return;
    }

    const val = Number(formRateValue) || 5000;
    const newContractor: Contractor = {
      id: `cnt-${Date.now()}`,
      name: formName.trim(),
      trade: formTrade,
      phone: formPhone.trim() || '010XXXXXXXX',
      activeProject: formProject.trim(),
      rateType: formRateType,
      rateValue: val,
      totalEarned: val,
      totalPaid: 0,
      status: 'active',
    };

    setContractors([newContractor, ...contractors]);
    setIsAddModalOpen(false);
    setFormName('');
    setFormPhone('');
    toast.success(`تمت إضافة الفني "${newContractor.name}" بنجاح`);
  };

  // Open Payment Modal
  const handleOpenPay = (c: Contractor) => {
    setTargetContractor(c);
    setPaymentAmount(c.totalEarned - c.totalPaid);
    setIsPayModalOpen(true);
  };

  // Confirm Payment to Contractor
  const handleConfirmPay = (e: React.FormEvent) => {
    e.preventDefault();
    if (!targetContractor) return;

    setContractors((prev) =>
      prev.map((c) => {
        if (c.id !== targetContractor.id) return c;
        const newPaid = c.totalPaid + paymentAmount;
        return {
          ...c,
          totalPaid: newPaid,
        };
      })
    );

    setIsPayModalOpen(false);
    toast.success(`تم صرف دفعة ${formatNumber(paymentAmount)} ج.م للفني ${targetContractor.name}`);
  };

  return (
    <AppShell title="فنيين ومقاولي التنفيذ">
      <div className="flex flex-col gap-5 p-3 sm:p-6 select-none" dir="rtl">
        {/* Header */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-surface p-4 sm:p-5 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-2xs">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-amber-600 to-orange-700 flex items-center justify-center text-white text-xl shadow-xs shrink-0">
              🧰
            </div>
            <div>
              <h1 className="text-lg sm:text-xl font-black text-slate-900 dark:text-white">
                فنيين ومقاولي التنفيذ بالباطن (Site Craftsmen)
              </h1>
              <p className="text-xs text-slate-500 dark:text-slate-400 font-medium mt-0.5">
                إدارة أجور النجارين، الحدادين، النقاشين، وفنيي الكلادينج وحساب مستحقات المواقع
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={() => setIsAddModalOpen(true)}
            className="px-4 py-2.5 bg-amber-600 hover:bg-amber-700 text-white rounded-xl font-bold text-xs flex items-center gap-2 transition-all shadow-xs cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>تسجيل فني / صنايعي جديد</span>
          </button>
        </div>

        {/* 3 KPIs */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
          <div className="bg-surface p-4 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-2xs flex flex-col gap-1">
            <span className="text-slate-500 text-xs font-bold">إجمالي مصنعيات المواقع</span>
            <span className="text-2xl font-black text-slate-900 dark:text-white">
              {formatNumber(totals.totalEarnedSum)} <span className="text-xs">ج.م</span>
            </span>
            <span className="text-3xs text-slate-400">مستحقات الفنيين المعتمدة</span>
          </div>

          <div className="bg-surface p-4 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-2xs flex flex-col gap-1">
            <span className="text-slate-500 text-xs font-bold">المصروف والمسدد فعلياً</span>
            <span className="text-2xl font-black text-emerald-600 dark:text-emerald-400">
              {formatNumber(totals.totalPaidSum)} <span className="text-xs">ج.م</span>
            </span>
            <span className="text-3xs text-slate-400">دفعات تم صرفها من الخزينة</span>
          </div>

          <div className="bg-surface p-4 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-2xs flex flex-col gap-1">
            <span className="text-slate-500 text-xs font-bold">المتبقي للصنايعية والفنيين</span>
            <span className="text-2xl font-black text-rose-600 dark:text-rose-400">
              {formatNumber(totals.totalDue)} <span className="text-xs">ج.م</span>
            </span>
            <span className="text-3xs text-slate-400">مستحقات مؤجلة لحين التسليم</span>
          </div>
        </div>

        {/* Filters */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-surface p-3 sm:p-4 rounded-2xl border border-slate-200/80 dark:border-slate-800">
          <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar w-full sm:w-auto">
            {['all', 'نجارة وأثاث', 'كلادينج وزجاج', 'كهرباء وليد', 'جبس بورد وأسقف', 'دهانات ونقاشة'].map(
              (trade) => (
                <button
                  key={trade}
                  type="button"
                  onClick={() => setTradeFilter(trade)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all shrink-0 cursor-pointer ${
                    tradeFilter === trade
                      ? 'bg-amber-600 text-white shadow-2xs'
                      : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300'
                  }`}
                >
                  {trade === 'all' ? 'كافة التخصصات' : trade}
                </button>
              )
            )}
          </div>

          <div className="relative w-full sm:w-72">
            <Search className="w-4 h-4 text-slate-400 absolute right-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="بحث باسم الفني، الهاتف، المشروع..."
              className="w-full h-9 pr-9 pl-3 text-xs bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl focus:border-amber-500 font-medium"
            />
          </div>
        </div>

        {/* Contractors Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5">
          {filtered.map((c) => {
            const due = c.totalEarned - c.totalPaid;
            return (
              <div
                key={c.id}
                className="bg-surface rounded-2xl p-4 border border-slate-200/80 dark:border-slate-800 shadow-2xs hover:shadow-xs transition-shadow flex flex-col justify-between gap-3"
              >
                <div>
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <Badge className="bg-amber-50 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300 border-amber-200/60 text-3xs font-bold">
                        {c.trade}
                      </Badge>
                      <h3 className="font-black text-sm text-slate-900 dark:text-white mt-1">
                        {c.name}
                      </h3>
                      <span className="text-3xs text-slate-500 flex items-center gap-1 font-mono mt-0.5">
                        <Phone className="w-3 h-3 text-slate-400" />
                        {c.phone}
                      </span>
                    </div>

                    <span
                      className={`text-3xs font-bold px-2 py-0.5 rounded-md ${
                        c.status === 'active'
                          ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-400'
                          : 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400'
                      }`}
                    >
                      {c.status === 'active' ? 'نشط بالموقع' : 'أنهى أعماله'}
                    </span>
                  </div>

                  <div className="mt-3 pt-2.5 border-t border-slate-100 dark:border-slate-800/80 space-y-1 text-xs">
                    <div className="flex items-center justify-between text-3xs">
                      <span className="text-slate-400">المشروع الحالي:</span>
                      <span className="font-bold text-slate-700 dark:text-slate-300 truncate max-w-[180px]">
                        {c.activeProject}
                      </span>
                    </div>

                    <div className="flex items-center justify-between text-3xs">
                      <span className="text-slate-400">طريقة الاتفاق:</span>
                      <span className="font-bold text-slate-700 dark:text-slate-300">
                        {c.rateType} ({formatNumber(c.rateValue)} ج.م)
                      </span>
                    </div>
                  </div>
                </div>

                {/* Financial balances */}
                <div className="pt-2.5 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
                  <div>
                    <span className="text-3xs text-slate-400 block">المتبقي له</span>
                    <span
                      className={`text-sm font-black ${
                        due > 0 ? 'text-rose-600 dark:text-rose-400' : 'text-emerald-600 dark:text-emerald-400'
                      }`}
                    >
                      {formatNumber(due)} ج.م
                    </span>
                  </div>

                  {due > 0 ? (
                    <button
                      type="button"
                      onClick={() => handleOpenPay(c)}
                      className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold text-xs shadow-2xs cursor-pointer"
                    >
                      صرف دفعة
                    </button>
                  ) : (
                    <span className="text-3xs font-bold text-emerald-600 bg-emerald-50 dark:bg-emerald-950/40 px-2 py-1 rounded-lg">
                      خالص المستحقات
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* Modal: Add Contractor */}
        {isAddModalOpen && (
          <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-3">
            <div className="bg-surface w-full max-w-md rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xl overflow-hidden">
              <div className="p-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between bg-slate-50 dark:bg-slate-900">
                <h3 className="font-black text-sm text-slate-900 dark:text-white">
                  تسجيل فني أو مقاول تنفيذ جديد
                </h3>
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="p-1 text-slate-400 hover:text-slate-600"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <form onSubmit={handleAddContractor} className="p-4 space-y-3">
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block">
                    اسم الفني / الأسطى *
                  </label>
                  <input
                    type="text"
                    required
                    value={formName}
                    onChange={(e) => setFormName(e.target.value)}
                    placeholder="مثال: الأسطى فلان الفلاني"
                    className="w-full h-9 px-3 text-xs bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl focus:border-amber-500 font-bold"
                  />
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block">
                      التخصص الحرفي
                    </label>
                    <select
                      value={formTrade}
                      onChange={(e) => setFormTrade(e.target.value as any)}
                      className="w-full h-9 px-2 text-xs bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl focus:border-amber-500 font-medium"
                    >
                      <option value="نجارة وأثاث">نجارة وأثاث تجاري</option>
                      <option value="كلادينج وزجاج">واجهات كلادينج وسيكوريت</option>
                      <option value="كهرباء وليد">كهرباء وليد بروفايل</option>
                      <option value="جبس بورد وأسقف">أسقف وجبس بورد</option>
                      <option value="دهانات ونقاشة">دهانات ونقاشة</option>
                      <option value="أرضيات وباركيه">أرضيات وباركيه</option>
                    </select>
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block">
                      رقم الهاتف
                    </label>
                    <input
                      type="text"
                      value={formPhone}
                      onChange={(e) => setFormPhone(e.target.value)}
                      placeholder="010XXXXXXXX"
                      className="w-full h-9 px-3 text-xs bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl focus:border-amber-500 font-mono"
                    />
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block">
                    المشروع التابع له
                  </label>
                  <input
                    type="text"
                    value={formProject}
                    onChange={(e) => setFormProject(e.target.value)}
                    className="w-full h-9 px-3 text-xs bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl focus:border-amber-500 font-medium"
                  />
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block">
                      طريقة المحاسبة
                    </label>
                    <select
                      value={formRateType}
                      onChange={(e) => setFormRateType(e.target.value as any)}
                      className="w-full h-9 px-2 text-xs bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl focus:border-amber-500 font-medium"
                    >
                      <option value="مقاولة مقطوعة">مقاولة مقطوعة</option>
                      <option value="بالمتر المربع (م²)">بالمتر المربع (م²)</option>
                      <option value="يومية عمل">يومية عمل</option>
                    </select>
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block">
                      قيمة الاتفاق (ج.م)
                    </label>
                    <input
                      type="number"
                      value={formRateValue}
                      onChange={(e) => setFormRateValue(e.target.value)}
                      className="w-full h-9 px-3 text-xs bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl focus:border-amber-500 font-bold"
                    />
                  </div>
                </div>

                <div className="pt-2 flex items-center justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => setIsAddModalOpen(false)}
                    className="px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-xl"
                  >
                    إلغاء
                  </button>
                  <button
                    type="submit"
                    className="px-5 py-2 text-xs font-bold bg-amber-600 hover:bg-amber-700 text-white rounded-xl shadow-xs"
                  >
                    حفظ الفني
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Modal: Pay Contractor */}
        {isPayModalOpen && targetContractor && (
          <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-3">
            <div className="bg-surface w-full max-w-sm rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xl overflow-hidden">
              <div className="p-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between bg-slate-50 dark:bg-slate-900">
                <h3 className="font-black text-sm text-slate-900 dark:text-white">
                  صرف مستحقات للفني
                </h3>
                <button
                  type="button"
                  onClick={() => setIsPayModalOpen(false)}
                  className="p-1 text-slate-400 hover:text-slate-600"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <form onSubmit={handleConfirmPay} className="p-4 space-y-3">
                <div className="text-xs space-y-1">
                  <div className="font-bold text-slate-900 dark:text-white">
                    {targetContractor.name} ({targetContractor.trade})
                  </div>
                  <div className="text-3xs text-slate-400">
                    المتبقي له: {formatNumber(targetContractor.totalEarned - targetContractor.totalPaid)} ج.م
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block">
                    المبلغ المصروف الآن (ج.م) *
                  </label>
                  <input
                    type="number"
                    required
                    value={paymentAmount}
                    onChange={(e) => setPaymentAmount(Number(e.target.value) || 0)}
                    className="w-full h-9 px-3 text-sm font-black bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl focus:border-emerald-500 text-emerald-600"
                  />
                </div>

                <div className="pt-2 flex items-center justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => setIsPayModalOpen(false)}
                    className="px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-xl"
                  >
                    إلغاء
                  </button>
                  <button
                    type="submit"
                    className="px-5 py-2 text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl shadow-xs"
                  >
                    تأكيد الصرف
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
