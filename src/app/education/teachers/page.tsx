'use client';

import React, { useState } from 'react';
import { AppShell } from '@/components/layout/AppShell';
import {
  UserCheck,
  Search,
  Plus,
  BookOpen,
  Calendar,
  Clock,
  Building,
  Calculator,
  Phone,
  Edit2,
  Trash2,
  TrendingUp,
  Percent
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { formatNumber } from '@/lib/format';
import { toast } from 'sonner';

interface Teacher {
  id: string;
  name: string;
  subject: string;
  phone: string;
  sharePercent: number; // Center share %
  sessionPrice: number;
  monthlyPrice: number;
  hallName: string;
  timeSlot: string;
  totalStudents: number;
  grade: string;
}

const INITIAL_TEACHERS: Teacher[] = [
  {
    id: 't-1',
    name: 'أ. محمد عبد الفتاح',
    subject: 'الفيزياء',
    phone: '01012345678',
    sharePercent: 30,
    sessionPrice: 80,
    monthlyPrice: 550,
    hallName: 'قاعة 1 (ابن الهيثم)',
    timeSlot: 'السبت والثلاثاء 04:00 م',
    totalStudents: 125,
    grade: 'الصف الثالث الثانوي',
  },
  {
    id: 't-2',
    name: 'م. أحمد الشناوي',
    subject: 'الرياضيات التطبيقية',
    phone: '01123456789',
    sharePercent: 25,
    sessionPrice: 90,
    monthlyPrice: 650,
    hallName: 'المدرج الكبير',
    timeSlot: 'الأحد والأربعاء 06:00 م',
    totalStudents: 160,
    grade: 'الصف الثالث الثانوي',
  },
  {
    id: 't-3',
    name: 'د. سارة المنشاوي',
    subject: 'الأحياء والجيولوجيا',
    phone: '01234567890',
    sharePercent: 30,
    sessionPrice: 70,
    monthlyPrice: 500,
    hallName: 'قاعة 2 (ابن النفيس)',
    timeSlot: 'الإثنين والخميس 03:00 م',
    totalStudents: 95,
    grade: 'الصف الثاني الثانوي',
  },
  {
    id: 't-4',
    name: 'أ. محمود رضوان',
    subject: 'اللغة العربية واللغويات',
    phone: '01098765432',
    sharePercent: 30,
    sessionPrice: 60,
    monthlyPrice: 420,
    hallName: 'قاعة 3 (المتنبي)',
    timeSlot: 'السبت والثلاثاء 01:00 م',
    totalStudents: 85,
    grade: 'الصف الثالث الإعدادي',
  },
];

export default function TeachersDirectoryPage() {
  const [teachers, setTeachers] = useState<Teacher[]>(INITIAL_TEACHERS);
  const [searchTerm, setSearchTerm] = useState('');
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);

  // New Teacher Form
  const [name, setName] = useState('');
  const [subject, setSubject] = useState('');
  const [phone, setPhone] = useState('');
  const [sharePercent, setSharePercent] = useState<number>(30);
  const [sessionPrice, setSessionPrice] = useState<number>(80);
  const [hallName, setHallName] = useState('قاعة 1');
  const [timeSlot, setTimeSlot] = useState('السبت والثلاثاء 04:00 م');
  const [grade, setGrade] = useState('الصف الثالث الثانوي');

  const handleAddTeacher = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !subject.trim()) {
      toast.error('يرجى كتابة اسم المدرس والمادة');
      return;
    }

    const newTeacher: Teacher = {
      id: `t-${Date.now()}`,
      name: name.trim(),
      subject: subject.trim(),
      phone: phone.trim() || 'غير محدد',
      sharePercent,
      sessionPrice,
      monthlyPrice: sessionPrice * 7,
      hallName,
      timeSlot,
      totalStudents: 0,
      grade,
    };

    setTeachers([newTeacher, ...teachers]);
    setIsAddModalOpen(false);
    setName('');
    setSubject('');
    setPhone('');
    toast.success(`تمت إضافة المدرس ${newTeacher.name} بنجاح`);
  };

  const filtered = teachers.filter(t => {
    return !searchTerm || t.name.includes(searchTerm) || t.subject.includes(searchTerm) || t.grade.includes(searchTerm);
  });

  return (
    <AppShell
      title="سجل المدرسين والمجموعات الدراسية"
      subtitle="إدارة بيانات المدرسين، نسب أرباح السنتر، مواعيد المجموعات وجداول القاعات"
      actions={
        <button
          onClick={() => setIsAddModalOpen(true)}
          className="h-9 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-black flex items-center gap-1.5 shadow-sm transition-colors cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          <span>إضافة مدرس / مجموعة</span>
        </button>
      }
    >
      <div className="space-y-4" dir="rtl">
        
        {/* Search */}
        <div className="bg-surface rounded-2xl border border-slate-200 dark:border-slate-800 p-3 sm:p-4 shadow-xs flex items-center justify-between gap-3">
          <div className="relative w-full max-w-sm">
            <input
              type="text"
              placeholder="بحث باسم المدرس أو المادة..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full h-9 pr-8 pl-3 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-xs font-bold focus:outline-none"
            />
            <Search className="w-3.5 h-3.5 text-slate-400 absolute right-2.5 top-1/2 -translate-y-1/2" />
          </div>
          <span className="text-2xs font-bold text-slate-400">إجمالي المدرسين: {teachers.length}</span>
        </div>

        {/* Teachers Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filtered.map((t) => (
            <div
              key={t.id}
              className="bg-surface rounded-2xl border border-slate-200 dark:border-slate-800 p-4 shadow-2xs hover:shadow-md transition-all space-y-3"
            >
              <div className="flex items-start justify-between">
                <div>
                  <span className="text-3xs font-black px-2 py-0.5 rounded-md bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-400">
                    {t.subject} — {t.grade}
                  </span>
                  <h4 className="text-base font-black text-slate-900 dark:text-white mt-1">
                    {t.name}
                  </h4>
                  <span className="text-2xs text-slate-400 font-mono" dir="ltr">{t.phone}</span>
                </div>

                <div className="text-left font-mono">
                  <span className="text-sm font-black text-emerald-600 block">
                    {formatNumber(t.sessionPrice)} ج.م / حصة
                  </span>
                  <span className="text-3xs font-bold text-slate-400 block">
                    نسبة السنتر: {t.sharePercent}%
                  </span>
                </div>
              </div>

              <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-slate-100 dark:border-slate-800 text-2xs font-semibold text-slate-500 space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className="flex items-center gap-1.5">
                    <Clock className="w-3.5 h-3.5 text-slate-400" />
                    <span>الموعد: {t.timeSlot}</span>
                  </span>
                  <span className="flex items-center gap-1.5">
                    <Building className="w-3.5 h-3.5 text-slate-400" />
                    <span>{t.hallName}</span>
                  </span>
                </div>
                <div className="flex items-center justify-between pt-1 border-t border-slate-200/50 dark:border-slate-800">
                  <span>إجمالي الطلاب المسجلين:</span>
                  <span className="font-bold text-slate-900 dark:text-white font-mono">{t.totalStudents} طالب</span>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Modal: Add Teacher */}
        {isAddModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
            <div className="bg-surface rounded-2xl border border-slate-200 dark:border-slate-800 max-w-md w-full p-5 space-y-4 shadow-2xl">
              <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
                <h3 className="text-sm font-black text-slate-900 dark:text-white flex items-center gap-2">
                  <UserCheck className="w-4 h-4 text-emerald-600" />
                  <span>تسجيل مدرس ومجموعة دراسية جديدة</span>
                </h3>
                <button onClick={() => setIsAddModalOpen(false)} className="text-slate-400 hover:text-slate-600 text-xs">✕</button>
              </div>

              <form onSubmit={handleAddTeacher} className="space-y-3">
                <div className="grid grid-cols-2 gap-2">
                  <div className="space-y-1">
                    <label className="text-2xs font-bold text-slate-600 dark:text-slate-400">اسم المدرس: *</label>
                    <input
                      type="text"
                      required
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder="أ. محمد أحمد"
                      className="w-full h-10 px-3 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-xs font-bold"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-2xs font-bold text-slate-600 dark:text-slate-400">المادة الدراسية: *</label>
                    <input
                      type="text"
                      required
                      value={subject}
                      onChange={(e) => setSubject(e.target.value)}
                      placeholder="الفيزياء / الكيمياء"
                      className="w-full h-10 px-3 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-xs font-bold"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div className="space-y-1">
                    <label className="text-2xs font-bold text-slate-600 dark:text-slate-400">سعر الحصة (ج.م):</label>
                    <input
                      type="number"
                      value={sessionPrice}
                      onChange={(e) => setSessionPrice(Number(e.target.value) || 0)}
                      className="w-full h-10 px-3 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-xs font-bold font-mono"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-2xs font-bold text-slate-600 dark:text-slate-400">نسبة السنتر (%):</label>
                    <input
                      type="number"
                      value={sharePercent}
                      onChange={(e) => setSharePercent(Number(e.target.value) || 0)}
                      className="w-full h-10 px-3 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-xs font-bold font-mono"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div className="space-y-1">
                    <label className="text-2xs font-bold text-slate-600 dark:text-slate-400">القاعة المخصصة:</label>
                    <input
                      type="text"
                      value={hallName}
                      onChange={(e) => setHallName(e.target.value)}
                      placeholder="قاعة 1"
                      className="w-full h-10 px-3 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-xs font-bold"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-2xs font-bold text-slate-600 dark:text-slate-400">الموعد الأسبوعي:</label>
                    <input
                      type="text"
                      value={timeSlot}
                      onChange={(e) => setTimeSlot(e.target.value)}
                      placeholder="السبت والثلاثاء 04:00 م"
                      className="w-full h-10 px-3 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-xs font-bold"
                    />
                  </div>
                </div>

                <div className="pt-2 flex items-center justify-end gap-2 border-t border-slate-100 dark:border-slate-800">
                  <button
                    type="button"
                    onClick={() => setIsAddModalOpen(false)}
                    className="h-9 px-4 rounded-xl text-xs font-bold text-slate-500 hover:bg-slate-100"
                  >
                    إلغاء
                  </button>
                  <button
                    type="submit"
                    className="h-9 px-5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-black shadow-xs cursor-pointer"
                  >
                    حفظ المدرس والمجموعة
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
