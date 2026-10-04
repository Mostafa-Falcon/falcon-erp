'use client';

import React, { useState } from 'react';
import { AppShell } from '@/components/layout/AppShell';
import {
  Calculator,
  UserCheck,
  Calendar,
  Clock,
  Printer,
  Receipt,
  CheckCircle2,
  FileText,
  BadgeDollarSign,
  TrendingUp,
  Percent,
  Plus
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { formatNumber } from '@/lib/format';
import { toast } from 'sonner';

interface SettlementLog {
  id: string;
  teacherName: string;
  subject: string;
  sessionDate: string;
  studentsCount: number;
  sessionPrice: number;
  totalIncome: number;
  centerPercent: number;
  centerAmount: number;
  extraDeductions: number;
  netPayout: number;
  status: 'paid' | 'pending';
}

const INITIAL_SETTLEMENTS: SettlementLog[] = [
  {
    id: 'set-101',
    teacherName: 'أ. محمد عبد الفتاح',
    subject: 'الفيزياء 3 ثانوي',
    sessionDate: '2026-10-04 (اليوم)',
    studentsCount: 42,
    sessionPrice: 80,
    totalIncome: 3360,
    centerPercent: 30,
    centerAmount: 1008,
    extraDeductions: 100, // مذكرات ومشروبات
    netPayout: 2252,
    status: 'paid',
  },
  {
    id: 'set-102',
    teacherName: 'م. أحمد الشناوي',
    subject: 'الرياضيات التطبيقية 3 ثانوي',
    sessionDate: '2026-10-03 (أمس)',
    studentsCount: 55,
    sessionPrice: 90,
    totalIncome: 4950,
    centerPercent: 25,
    centerAmount: 1237.5,
    extraDeductions: 0,
    netPayout: 3712.5,
    status: 'paid',
  },
  {
    id: 'set-103',
    teacherName: 'د. سارة المنشاوي',
    subject: 'الأحياء 2 ثانوي',
    sessionDate: '2026-10-02',
    studentsCount: 30,
    sessionPrice: 70,
    totalIncome: 2100,
    centerPercent: 30,
    centerAmount: 630,
    extraDeductions: 50,
    netPayout: 1420,
    status: 'paid',
  },
];

export default function TeacherSettlementsPage() {
  const [settlements, setSettlements] = useState<SettlementLog[]>(INITIAL_SETTLEMENTS);
  
  // New Settlement Form State
  const [teacherName, setTeacherName] = useState('أ. محمد عبد الفتاح');
  const [subject, setSubject] = useState('الفيزياء 3 ثانوي');
  const [studentsCount, setStudentsCount] = useState<number>(38);
  const [sessionPrice, setSessionPrice] = useState<number>(80);
  const [centerPercent, setCenterPercent] = useState<number>(30);
  const [extraDeductions, setExtraDeductions] = useState<number>(0);
  const [printingSettlement, setPrintingSettlement] = useState<SettlementLog | null>(null);

  const totalIncome = studentsCount * sessionPrice;
  const centerAmount = (totalIncome * centerPercent) / 100;
  const netPayout = totalIncome - centerAmount - extraDeductions;

  const handleCreateSettlement = (e: React.FormEvent) => {
    e.preventDefault();
    const newRecord: SettlementLog = {
      id: `set-${Date.now().toString().slice(-4)}`,
      teacherName,
      subject,
      sessionDate: '2026-10-04 (اليوم)',
      studentsCount,
      sessionPrice,
      totalIncome,
      centerPercent,
      centerAmount,
      extraDeductions,
      netPayout,
      status: 'paid',
    };

    setSettlements([newRecord, ...settlements]);
    setPrintingSettlement(newRecord);
    toast.success(`تم استخراج وتثبيت تصفية الحصة للمدرس ${teacherName} بمبلغ ${formatNumber(netPayout)} ج.م`);
  };

  const totalCenterEarnings = settlements.reduce((acc, s) => acc + s.centerAmount, 0);
  const totalTeachersPayout = settlements.reduce((acc, s) => acc + s.netPayout, 0);
  const totalStudentsServed = settlements.reduce((acc, s) => acc + s.studentsCount, 0);

  return (
    <AppShell
      title="تصفية حسابات المدرسين والنسب"
      subtitle="حساب إيرادات الحصص، استقطاع عمولة ونسب السنتر، وإصدار سندات الصرف الفورية"
    >
      <div className="space-y-5" dir="rtl">
        
        {/* KPI Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4">
          <div className="bg-surface rounded-2xl border border-slate-200 dark:border-slate-800 p-4 shadow-xs">
            <span className="text-3xs font-bold text-slate-400 block">إجمالي أرباح وعمولات السنتر</span>
            <span className="text-xl font-black text-emerald-600 dark:text-emerald-400 font-mono">
              {formatNumber(totalCenterEarnings)} ج.م
            </span>
          </div>
          <div className="bg-surface rounded-2xl border border-slate-200 dark:border-slate-800 p-4 shadow-xs">
            <span className="text-3xs font-bold text-slate-400 block">إجمالي مدفوعات المدرسين</span>
            <span className="text-xl font-black text-blue-600 font-mono">
              {formatNumber(totalTeachersPayout)} ج.م
            </span>
          </div>
          <div className="bg-surface rounded-2xl border border-slate-200 dark:border-slate-800 p-4 shadow-xs">
            <span className="text-3xs font-bold text-slate-400 block">إجمالي الطلاب المخدومين</span>
            <span className="text-xl font-black text-slate-900 dark:text-white font-mono">
              {totalStudentsServed} طالب
            </span>
          </div>
        </div>

        {/* Live Settlement Calculator Hero Card */}
        <div className="bg-surface rounded-2xl border border-slate-200 dark:border-slate-800 p-5 shadow-sm space-y-4">
          <h3 className="text-sm font-black text-slate-900 dark:text-white flex items-center gap-2 border-b border-slate-100 dark:border-slate-800 pb-3">
            <Calculator className="w-4 h-4 text-emerald-600" />
            <span>حاسبة تصفية سريعة لحصة اليوم</span>
          </h3>

          <form onSubmit={handleCreateSettlement} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="space-y-1">
                <label className="text-2xs font-bold text-slate-600 dark:text-slate-400">اسم المدرس والمادة:</label>
                <input
                  type="text"
                  value={teacherName}
                  onChange={(e) => setTeacherName(e.target.value)}
                  className="w-full h-10 px-3 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-xs font-bold"
                />
              </div>

              <div className="space-y-1">
                <label className="text-2xs font-bold text-slate-600 dark:text-slate-400">عدد الطلاب الحاضرين:</label>
                <input
                  type="number"
                  value={studentsCount}
                  onChange={(e) => setStudentsCount(Number(e.target.value) || 0)}
                  className="w-full h-10 px-3 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-xs font-bold font-mono"
                />
              </div>

              <div className="space-y-1">
                <label className="text-2xs font-bold text-slate-600 dark:text-slate-400">سعر الحصة للطالب (ج.م):</label>
                <input
                  type="number"
                  value={sessionPrice}
                  onChange={(e) => setSessionPrice(Number(e.target.value) || 0)}
                  className="w-full h-10 px-3 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-xs font-bold font-mono"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="text-2xs font-bold text-slate-600 dark:text-slate-400">نسبة السنتر المستقطعة (%):</label>
                <input
                  type="number"
                  value={centerPercent}
                  onChange={(e) => setCenterPercent(Number(e.target.value) || 0)}
                  className="w-full h-10 px-3 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-xs font-bold font-mono"
                />
              </div>

              <div className="space-y-1">
                <label className="text-2xs font-bold text-slate-600 dark:text-slate-400">خصومات إضافية (مذكرات/مشروبات/سلف):</label>
                <input
                  type="number"
                  value={extraDeductions}
                  onChange={(e) => setExtraDeductions(Number(e.target.value) || 0)}
                  className="w-full h-10 px-3 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-xs font-bold font-mono"
                />
              </div>
            </div>

            {/* Calculations Breakdown */}
            <div className="bg-slate-50 dark:bg-slate-900/60 rounded-xl p-4 border border-slate-200/80 dark:border-slate-800 grid grid-cols-2 sm:grid-cols-4 gap-2 text-center">
              <div>
                <span className="text-3xs font-bold text-slate-400 block">إجمالي دخل الحصة</span>
                <span className="text-sm font-black font-mono">{formatNumber(totalIncome)} ج.م</span>
              </div>
              <div>
                <span className="text-3xs font-bold text-amber-500 block">نصيب السنتر ({centerPercent}%)</span>
                <span className="text-sm font-black text-amber-600 font-mono">+{formatNumber(centerAmount)} ج.م</span>
              </div>
              <div>
                <span className="text-3xs font-bold text-red-500 block">الخصومات الإضافية</span>
                <span className="text-sm font-black text-red-500 font-mono">-{formatNumber(extraDeductions)} ج.م</span>
              </div>
              <div>
                <span className="text-3xs font-bold text-emerald-500 block">صافي مستحق المدرس</span>
                <span className="text-base font-black text-emerald-600 font-mono">{formatNumber(netPayout)} ج.م</span>
              </div>
            </div>

            <div className="flex justify-end">
              <button
                type="submit"
                className="h-10 px-6 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-black text-xs flex items-center gap-1.5 transition-colors cursor-pointer shadow-xs"
              >
                <Printer className="w-4 h-4" />
                <span>اعتماد التصفية وطباعة سند الصرف</span>
              </button>
            </div>
          </form>
        </div>

        {/* History of Settlements */}
        <div className="bg-surface rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs overflow-hidden">
          <div className="p-4 border-b border-slate-200 dark:border-slate-800">
            <h4 className="text-xs font-black text-slate-900 dark:text-white">سجل التصفيات والتسويات السابقة</h4>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-right text-xs">
              <thead className="bg-slate-50 dark:bg-slate-900/60 text-2xs font-black text-slate-400 border-b border-slate-200 dark:border-slate-800">
                <tr>
                  <th className="py-3 px-4">رقم السند</th>
                  <th className="py-3 px-4">المدرس والمادة</th>
                  <th className="py-3 px-4">تاريخ الحصة</th>
                  <th className="py-3 px-4">الطلاب</th>
                  <th className="py-3 px-4">دخل الحصة</th>
                  <th className="py-3 px-4">نصيب السنتر</th>
                  <th className="py-3 px-4">الصافي للمدرس</th>
                  <th className="py-3 px-4 text-center">طباعة</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800/80 font-bold">
                {settlements.map((s) => (
                  <tr key={s.id} className="hover:bg-slate-50/60 dark:hover:bg-slate-900/40 transition-colors">
                    <td className="py-3 px-4 font-mono text-slate-500">#{s.id}</td>
                    <td className="py-3 px-4">
                      <span className="font-black text-slate-900 dark:text-white block">{s.teacherName}</span>
                      <span className="text-3xs text-slate-400">{s.subject}</span>
                    </td>
                    <td className="py-3 px-4 text-2xs text-slate-500">{s.sessionDate}</td>
                    <td className="py-3 px-4 font-mono">{s.studentsCount} طالب</td>
                    <td className="py-3 px-4 font-mono">{formatNumber(s.totalIncome)} ج.م</td>
                    <td className="py-3 px-4 font-mono text-amber-600">+{formatNumber(s.centerAmount)} ج.م</td>
                    <td className="py-3 px-4 font-mono text-emerald-600">{formatNumber(s.netPayout)} ج.م</td>
                    <td className="py-3 px-4 text-center">
                      <button
                        onClick={() => {
                          setPrintingSettlement(s);
                          setTimeout(() => window.print(), 100);
                        }}
                        className="p-1.5 rounded-lg text-slate-500 hover:text-emerald-600 hover:bg-slate-100 cursor-pointer"
                        title="طباعة السند"
                      >
                        <Printer className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Printable Settlement Receipt */}
        {printingSettlement && (
          <div className="hidden print:block fixed inset-0 bg-white text-black p-6 z-9999 text-center space-y-4">
            <div className="border-2 border-black rounded-2xl p-6 max-w-md mx-auto space-y-3">
              <h2 className="text-lg font-black">سنتر التعليم والتدريب</h2>
              <h3 className="text-sm font-bold border-b border-black pb-2">سند صرف وتصفية مستحقات مدرس</h3>
              <div className="text-right text-xs font-bold space-y-1 pt-2">
                <div>اسم المدرس: {printingSettlement.teacherName}</div>
                <div>المادة / الحصة: {printingSettlement.subject}</div>
                <div>تاريخ التصفية: {printingSettlement.sessionDate}</div>
                <div>عدد الطلاب الحاضرين: {printingSettlement.studentsCount} طالب</div>
                <div>إجمالي الدخل: {formatNumber(printingSettlement.totalIncome)} ج.م</div>
                <div>عمولة السنتر ({printingSettlement.centerPercent}%): {formatNumber(printingSettlement.centerAmount)} ج.م</div>
                <div className="border-t border-black pt-2 text-sm font-black">
                  الصافي المسلم للمدرس: {formatNumber(printingSettlement.netPayout)} ج.م
                </div>
              </div>
              <div className="pt-6 flex justify-between text-xs font-bold">
                <span>توقيع المستلم (المدرس)</span>
                <span>توقيع إدارة السنتر</span>
              </div>
            </div>
          </div>
        )}

      </div>
    </AppShell>
  );
}
