'use client';

import React, { useState } from 'react';
import { AppShell } from '@/components/layout/AppShell';
import {
  QrCode,
  CheckCircle2,
  AlertCircle,
  Search,
  UserCheck,
  Send,
  Clock,
  GraduationCap,
  Users,
  Calendar,
  Sparkles,
  Phone,
  FileSpreadsheet,
  RefreshCw,
  Printer
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { formatNumber } from '@/lib/format';
import { toast } from 'sonner';

interface AttendanceRecord {
  id: string;
  studentCode: string;
  studentName: string;
  grade: string;
  subject: string;
  teacherName: string;
  hall: string;
  status: 'paid' | 'due';
  dueAmount: number;
  parentPhone: string;
  checkInTime: string;
  whatsappSent: boolean;
}

const INITIAL_RECORDS: AttendanceRecord[] = [
  {
    id: 'att-1',
    studentCode: '101',
    studentName: 'أحمد علاء الدين الشامي',
    grade: 'الصف الثالث الثانوي',
    subject: 'الفيزياء',
    teacherName: 'أ. محمد عبد الفتاح',
    hall: 'قاعة 1 (ابن الهيثم)',
    status: 'paid',
    dueAmount: 0,
    parentPhone: '01012345678',
    checkInTime: '03:45 م',
    whatsappSent: true,
  },
  {
    id: 'att-2',
    studentCode: '102',
    studentName: 'مريم حسام البدري',
    grade: 'الصف الثالث الثانوي',
    subject: 'الفيزياء',
    teacherName: 'أ. محمد عبد الفتاح',
    hall: 'قاعة 1 (ابن الهيثم)',
    status: 'due',
    dueAmount: 80,
    parentPhone: '01123456789',
    checkInTime: '03:50 م',
    whatsappSent: false,
  },
  {
    id: 'att-3',
    studentCode: '103',
    studentName: 'عمر خالد الصاوي',
    grade: 'الصف الثاني الثانوي',
    subject: 'الأحياء والجيولوجيا',
    teacherName: 'د. سارة المنشاوي',
    hall: 'قاعة 2 (ابن النفيس)',
    status: 'paid',
    dueAmount: 0,
    parentPhone: '01234567890',
    checkInTime: '03:52 م',
    whatsappSent: true,
  },
  {
    id: 'att-4',
    studentCode: '104',
    studentName: 'ندى شريف الهواري',
    grade: 'الصف الثالث الثانوي',
    subject: 'الرياضيات التطبيقية',
    teacherName: 'م. أحمد الشناوي',
    hall: 'المدرج الكبير',
    status: 'paid',
    dueAmount: 0,
    parentPhone: '01098765432',
    checkInTime: '03:58 م',
    whatsappSent: false,
  },
];

export default function FastAttendancePage() {
  const [scanCode, setScanCode] = useState('');
  const [records, setRecords] = useState<AttendanceRecord[]>(INITIAL_RECORDS);
  const [searchFilter, setSearchFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'paid' | 'due'>('all');

  const handleManualScan = (e: React.FormEvent) => {
    e.preventDefault();
    if (!scanCode.trim()) return;

    const isDue = Math.random() > 0.6;
    const newRecord: AttendanceRecord = {
      id: `att-${Date.now()}`,
      studentCode: scanCode.trim(),
      studentName: scanCode.startsWith('1') ? 'ياسين محمود زكريا' : scanCode.startsWith('2') ? 'فاطمة إبراهيم الشناوي' : 'حازم عادل مرسي',
      grade: 'الصف الثالث الثانوي',
      subject: 'الفيزياء',
      teacherName: 'أ. محمد عبد الفتاح',
      hall: 'قاعة 1 (ابن الهيثم)',
      status: isDue ? 'due' : 'paid',
      dueAmount: isDue ? 80 : 0,
      parentPhone: '01023456789',
      checkInTime: new Date().toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' }),
      whatsappSent: false,
    };

    setRecords([newRecord, ...records]);
    setScanCode('');

    if (newRecord.status === 'paid') {
      toast.success(`تم تسجيل حضور: ${newRecord.studentName} بنجاح ✅`);
    } else {
      toast.warning(`تم تسجيل الحضور مع وجود متأخرات ${newRecord.dueAmount} ج.م للطالب ${newRecord.studentName} ⚠️`);
    }
  };

  const handleSendWhatsapp = (rec: AttendanceRecord) => {
    const text = encodeURIComponent(
      `السلام عليكم ورحمة الله وبركاته،\nولي أمر الطالب (${rec.studentName})،\nنحيطكم علماً بحضور نجلكم لحصة (${rec.subject}) مع (${rec.teacherName}) في سنتر التعليم اليوم الساعة (${rec.checkInTime}).${
        rec.status === 'due' ? `\nيرجى التكرم بسداد المستحقات المتأخرة وقدرها (${rec.dueAmount} ج.م).` : ''
      }\nمع تحيات إدارة السنتر.`
    );
    window.open(`https://wa.me/2${rec.parentPhone}?text=${text}`, '_blank');
    setRecords(records.map(r => r.id === rec.id ? { ...r, whatsappSent: true } : r));
    toast.success(`تم فتح رسالة الواتساب لولي أمر ${rec.studentName}`);
  };

  const filteredRecords = records.filter(r => {
    const matchSearch = !searchFilter || r.studentName.includes(searchFilter) || r.studentCode.includes(searchFilter) || r.teacherName.includes(searchFilter);
    const matchStatus = statusFilter === 'all' || r.status === statusFilter;
    return matchSearch && matchStatus;
  });

  const totalAttendees = records.length;
  const paidCount = records.filter(r => r.status === 'paid').length;
  const dueCount = records.filter(r => r.status === 'due').length;
  const whatsappSentCount = records.filter(r => r.whatsappSent).length;

  return (
    <AppShell
      title="شاشة الحضور السريع للطلاب (QR / باركود)"
      subtitle="مسح سريع لكروت الطلاب، كشف فوري لحالة السداد، وإرسال إشعارات الحضور لأولياء الأمور عبر الواتساب"
    >
      <div className="space-y-5" dir="rtl">
        
        {/* KPI Summary Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4">
          <div className="bg-surface rounded-2xl border border-slate-200 dark:border-slate-800 p-4 shadow-xs flex items-center justify-between">
            <div>
              <span className="text-3xs font-bold text-slate-400 block">إجمالي الحضور اليوم</span>
              <span className="text-xl font-black text-slate-900 dark:text-white font-mono">{totalAttendees}</span>
            </div>
            <div className="w-10 h-10 rounded-xl bg-blue-50 dark:bg-blue-950/40 text-blue-600 flex items-center justify-center">
              <Users className="w-5 h-5" />
            </div>
          </div>

          <div className="bg-surface rounded-2xl border border-slate-200 dark:border-slate-800 p-4 shadow-xs flex items-center justify-between">
            <div>
              <span className="text-3xs font-bold text-slate-400 block">سداد خالص (مدفوع)</span>
              <span className="text-xl font-black text-emerald-600 dark:text-emerald-400 font-mono">{paidCount}</span>
            </div>
            <div className="w-10 h-10 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 flex items-center justify-center">
              <CheckCircle2 className="w-5 h-5" />
            </div>
          </div>

          <div className="bg-surface rounded-2xl border border-slate-200 dark:border-slate-800 p-4 shadow-xs flex items-center justify-between">
            <div>
              <span className="text-3xs font-bold text-slate-400 block">عليهم متأخرات</span>
              <span className="text-xl font-black text-amber-600 font-mono">{dueCount}</span>
            </div>
            <div className="w-10 h-10 rounded-xl bg-amber-50 dark:bg-amber-950/40 text-amber-600 flex items-center justify-center">
              <AlertCircle className="w-5 h-5" />
            </div>
          </div>

          <div className="bg-surface rounded-2xl border border-slate-200 dark:border-slate-800 p-4 shadow-xs flex items-center justify-between">
            <div>
              <span className="text-3xs font-bold text-slate-400 block">إشعارات واتساب أرسلت</span>
              <span className="text-xl font-black text-green-600 font-mono">{whatsappSentCount}</span>
            </div>
            <div className="w-10 h-10 rounded-xl bg-green-50 dark:bg-green-950/40 text-green-600 flex items-center justify-center">
              <Send className="w-5 h-5" />
            </div>
          </div>
        </div>

        {/* Scanner Form Hero Box */}
        <div className="bg-gradient-to-r from-emerald-600 to-teal-700 rounded-2xl p-5 text-white shadow-lg space-y-4">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <div className="flex items-center gap-2">
              <div className="w-9 h-9 rounded-xl bg-white/20 backdrop-blur-md flex items-center justify-center">
                <QrCode className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-sm font-black">ماسح الباركود السريع عند بوابة الدخول</h3>
                <p className="text-3xs opacity-80">وجّه ماسح الباركود الضوئي (Scanner) أو اكتب كود الطالب واضغط Enter</p>
              </div>
            </div>

            <Badge className="bg-white/20 text-white border-0 text-3xs font-bold">
              جاهز للمسح الضوئي اللحظي 🟢
            </Badge>
          </div>

          <form onSubmit={handleManualScan} className="flex gap-2">
            <div className="relative flex-1">
              <input
                type="text"
                autoFocus
                placeholder="امسح كود الطالب بالباركود (مثال: 101, 102, 103)..."
                value={scanCode}
                onChange={(e) => setScanCode(e.target.value)}
                className="w-full h-12 pr-11 pl-4 rounded-xl bg-white text-slate-900 text-sm font-mono font-bold focus:outline-none focus:ring-2 focus:ring-emerald-300 shadow-inner"
                dir="ltr"
              />
              <QrCode className="w-5 h-5 text-slate-400 absolute right-3.5 top-1/2 -translate-y-1/2" />
            </div>
            <button
              type="submit"
              className="h-12 px-6 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-black text-xs transition-colors cursor-pointer shadow-md shrink-0 flex items-center gap-1.5"
            >
              <UserCheck className="w-4 h-4" />
              <span>تسجيل الحضور</span>
            </button>
          </form>
        </div>

        {/* Attendance Records Table & Filters */}
        <div className="bg-surface rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs overflow-hidden">
          
          {/* Table Header Filter Bar */}
          <div className="p-3 sm:p-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between flex-wrap gap-3">
            <div className="flex items-center gap-2 flex-1 max-w-sm">
              <div className="relative w-full">
                <input
                  type="text"
                  placeholder="بحث باسم الطالب، الكود، المدرس..."
                  value={searchFilter}
                  onChange={(e) => setSearchFilter(e.target.value)}
                  className="w-full h-9 pr-8 pl-3 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-xs font-bold focus:outline-none"
                />
                <Search className="w-3.5 h-3.5 text-slate-400 absolute right-2.5 top-1/2 -translate-y-1/2" />
              </div>
            </div>

            <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-800 p-0.5 rounded-lg text-3xs font-bold">
              <button
                onClick={() => setStatusFilter('all')}
                className={`px-2.5 py-1 rounded-md transition-colors cursor-pointer ${
                  statusFilter === 'all' ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-xs font-black' : 'text-slate-500'
                }`}
              >
                الكل ({records.length})
              </button>
              <button
                onClick={() => setStatusFilter('paid')}
                className={`px-2.5 py-1 rounded-md transition-colors cursor-pointer ${
                  statusFilter === 'paid' ? 'bg-white dark:bg-slate-700 text-emerald-600 shadow-xs font-black' : 'text-slate-500'
                }`}
              >
                خالص ({paidCount})
              </button>
              <button
                onClick={() => setStatusFilter('due')}
                className={`px-2.5 py-1 rounded-md transition-colors cursor-pointer ${
                  statusFilter === 'due' ? 'bg-white dark:bg-slate-700 text-amber-600 shadow-xs font-black' : 'text-slate-500'
                }`}
              >
                متأخرات ({dueCount})
              </button>
            </div>
          </div>

          {/* Table */}
          <div className="overflow-x-auto">
            <table className="w-full text-right text-xs">
              <thead className="bg-slate-50/80 dark:bg-slate-900/60 border-b border-slate-200 dark:border-slate-800 text-2xs font-black text-slate-400">
                <tr>
                  <th className="py-3 px-4">كود الطالب</th>
                  <th className="py-3 px-4">اسم الطالب</th>
                  <th className="py-3 px-4">المادة والمدرس</th>
                  <th className="py-3 px-4">القاعة</th>
                  <th className="py-3 px-4">وقت الحضور</th>
                  <th className="py-3 px-4">حالة السداد</th>
                  <th className="py-3 px-4 text-center">إشعار ولي الأمر</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800/80 font-bold">
                {filteredRecords.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-12 text-center text-slate-400">
                      لا توجد سجلات حضور مطابقة
                    </td>
                  </tr>
                ) : (
                  filteredRecords.map((r) => (
                    <tr key={r.id} className="hover:bg-slate-50/60 dark:hover:bg-slate-900/40 transition-colors">
                      <td className="py-3 px-4 font-mono font-bold text-slate-500">#{r.studentCode}</td>
                      <td className="py-3 px-4">
                        <span className="font-black text-slate-900 dark:text-white block">{r.studentName}</span>
                        <span className="text-3xs text-slate-400">{r.grade}</span>
                      </td>
                      <td className="py-3 px-4">
                        <span className="text-slate-900 dark:text-white block">{r.subject}</span>
                        <span className="text-3xs text-slate-400">{r.teacherName}</span>
                      </td>
                      <td className="py-3 px-4 text-slate-600 dark:text-slate-300 text-2xs">{r.hall}</td>
                      <td className="py-3 px-4 font-mono text-2xs text-slate-500">{r.checkInTime}</td>
                      <td className="py-3 px-4">
                        {r.status === 'paid' ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-3xs font-black bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-400 border border-emerald-200/60 dark:border-emerald-800/60">
                            <CheckCircle2 className="w-3 h-3 text-emerald-500" />
                            <span>خالص السداد</span>
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-3xs font-black bg-amber-50 dark:bg-amber-950/60 text-amber-700 dark:text-amber-400 border border-amber-200/60 dark:border-amber-800/60">
                            <AlertCircle className="w-3 h-3 text-amber-500" />
                            <span>متأخر {formatNumber(r.dueAmount)} ج.م</span>
                          </span>
                        )}
                      </td>
                      <td className="py-3 px-4 text-center">
                        <button
                          onClick={() => handleSendWhatsapp(r)}
                          className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-3xs font-black transition-colors cursor-pointer ${
                            r.whatsappSent
                              ? 'bg-slate-100 dark:bg-slate-800 text-green-600 hover:bg-slate-200'
                              : 'bg-green-600 hover:bg-green-700 text-white shadow-xs'
                          }`}
                        >
                          <Send className="w-3 h-3" />
                          <span>{r.whatsappSent ? 'أُرسل إشعار (إعادة)' : 'إرسال واتساب'}</span>
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

      </div>
    </AppShell>
  );
}
