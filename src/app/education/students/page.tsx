'use client';

import React, { useState } from 'react';
import { AppShell } from '@/components/layout/AppShell';
import {
  Users,
  Search,
  Plus,
  QrCode,
  GraduationCap,
  Calendar,
  CreditCard,
  Printer,
  Edit2,
  Trash2,
  CheckCircle2,
  AlertCircle,
  Phone,
  FileSpreadsheet
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { formatNumber } from '@/lib/format';
import { toast } from 'sonner';

interface Student {
  id: string;
  code: string;
  name: string;
  grade: string;
  phone: string;
  parentPhone: string;
  enrolledCourses: string[];
  balanceDue: number;
  status: 'active' | 'suspended';
}

const INITIAL_STUDENTS: Student[] = [
  {
    id: 's-1',
    code: '101',
    name: 'أحمد علاء الدين الشامي',
    grade: 'الصف الثالث الثانوي (علمي علوم)',
    phone: '01012345678',
    parentPhone: '01123456789',
    enrolledCourses: ['فيزياء 3 ثانوي', 'أحياء 3 ثانوي'],
    balanceDue: 0,
    status: 'active',
  },
  {
    id: 's-2',
    code: '102',
    name: 'مريم حسام البدري',
    grade: 'الصف الثالث الثانوي (علمي رياضة)',
    phone: '01223456780',
    parentPhone: '01098765432',
    enrolledCourses: ['رياضيات تطبيقية 3 ثانوي', 'فيزياء 3 ثانوي'],
    balanceDue: 80,
    status: 'active',
  },
  {
    id: 's-3',
    code: '103',
    name: 'عمر خالد الصاوي',
    grade: 'الصف الثاني الثانوي (علمي)',
    phone: '01512345678',
    parentPhone: '01055566677',
    enrolledCourses: ['كيمياء 2 ثانوي'],
    balanceDue: 0,
    status: 'active',
  },
  {
    id: 's-4',
    code: '104',
    name: 'ندى شريف الهواري',
    grade: 'الصف الثالث الإعدادي',
    phone: '01199887766',
    parentPhone: '01244332211',
    enrolledCourses: ['لغة عربية 3 إعدادي', 'لغة إنجليزية 3 إعدادي'],
    balanceDue: 120,
    status: 'active',
  },
];

export default function StudentsDirectoryPage() {
  const [students, setStudents] = useState<Student[]>(INITIAL_STUDENTS);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedGrade, setSelectedGrade] = useState('all');
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [printingStudent, setPrintingStudent] = useState<Student | null>(null);

  // New Student Form State
  const [newName, setNewName] = useState('');
  const [newGrade, setNewGrade] = useState('الصف الثالث الثانوي');
  const [newPhone, setNewPhone] = useState('');
  const [newParentPhone, setNewParentPhone] = useState('');

  const handleAddStudent = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName.trim()) {
      toast.error('يرجى إدخال اسم الطالب');
      return;
    }

    const nextCode = (100 + students.length + 1).toString();
    const newStudent: Student = {
      id: `s-${Date.now()}`,
      code: nextCode,
      name: newName.trim(),
      grade: newGrade,
      phone: newPhone.trim() || 'غير محدد',
      parentPhone: newParentPhone.trim() || 'غير محدد',
      enrolledCourses: ['حصة تجريبية'],
      balanceDue: 0,
      status: 'active',
    };

    setStudents([newStudent, ...students]);
    setIsAddModalOpen(false);
    setNewName('');
    setNewPhone('');
    setNewParentPhone('');
    toast.success(`تمت إضافة الطالب ${newStudent.name} وتوليد الكود #${nextCode} بنجاح`);
  };

  const filteredStudents = students.filter(s => {
    const matchSearch = !searchTerm || s.name.includes(searchTerm) || s.code.includes(searchTerm) || s.phone.includes(searchTerm);
    const matchGrade = selectedGrade === 'all' || s.grade.includes(selectedGrade);
    return matchSearch && matchGrade;
  });

  return (
    <AppShell
      title="سجل الطلاب والاشتراكات"
      subtitle="إدارة بيانات الطلاب، كروت الباركود الذكية، الاشتراكات ومتابعة المديونيات"
      actions={
        <button
          onClick={() => setIsAddModalOpen(true)}
          className="h-9 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-black flex items-center gap-1.5 shadow-sm transition-colors cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          <span>إضافة طالب جديد</span>
        </button>
      }
    >
      <div className="space-y-4" dir="rtl">
        
        {/* Filters and Search Bar */}
        <div className="bg-surface rounded-2xl border border-slate-200 dark:border-slate-800 p-3 sm:p-4 shadow-xs flex items-center justify-between flex-wrap gap-3">
          <div className="flex items-center gap-2 flex-1 max-w-sm">
            <div className="relative w-full">
              <input
                type="text"
                placeholder="بحث باسم الطالب، الكود، رقم الهاتف..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full h-9 pr-8 pl-3 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-xs font-bold focus:outline-none"
              />
              <Search className="w-3.5 h-3.5 text-slate-400 absolute right-2.5 top-1/2 -translate-y-1/2" />
            </div>
          </div>

          <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-800 p-0.5 rounded-lg text-3xs font-bold overflow-x-auto no-scrollbar">
            {['all', 'الثالث الثانوي', 'الثاني الثانوي', 'الإعدادي'].map(g => (
              <button
                key={g}
                onClick={() => setSelectedGrade(g)}
                className={`px-2.5 py-1 rounded-md transition-colors cursor-pointer shrink-0 ${
                  selectedGrade === g ? 'bg-white dark:bg-slate-700 text-emerald-600 font-black shadow-xs' : 'text-slate-500'
                }`}
              >
                {g === 'all' ? 'كافة المراحل' : g}
              </button>
            ))}
          </div>
        </div>

        {/* Students Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {filteredStudents.map((s) => (
            <div
              key={s.id}
              className="bg-surface rounded-2xl border border-slate-200 dark:border-slate-800 p-4 shadow-2xs hover:shadow-md transition-all flex flex-col justify-between group"
            >
              <div className="space-y-3">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-2.5">
                    <div className="w-10 h-10 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 flex items-center justify-center font-black text-sm">
                      {s.name.charAt(0)}
                    </div>
                    <div>
                      <h4 className="text-sm font-black text-slate-900 dark:text-white group-hover:text-emerald-600 transition-colors">
                        {s.name}
                      </h4>
                      <span className="text-3xs font-mono font-bold text-slate-400 block" dir="ltr">
                        #{s.code}
                      </span>
                    </div>
                  </div>

                  <div>
                    {s.balanceDue > 0 ? (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-4xs font-black bg-amber-50 dark:bg-amber-950/60 text-amber-700 dark:text-amber-400 border border-amber-200 dark:border-amber-800">
                        متبقي: {formatNumber(s.balanceDue)} ج.م
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-4xs font-black bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800">
                        خالص
                      </span>
                    )}
                  </div>
                </div>

                <div className="text-2xs font-semibold text-slate-500 space-y-1">
                  <div>المرحلة: <span className="font-bold text-slate-700 dark:text-slate-300">{s.grade}</span></div>
                  <div>هاتف ولي الأمر: <span className="font-mono text-slate-700 dark:text-slate-300" dir="ltr">{s.parentPhone}</span></div>
                  <div className="flex flex-wrap gap-1 pt-1">
                    {s.enrolledCourses.map((c, i) => (
                      <span key={i} className="px-1.5 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 text-3xs font-bold text-slate-600 dark:text-slate-400">
                        {c}
                      </span>
                    ))}
                  </div>
                </div>
              </div>

              <div className="pt-3 mt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
                <button
                  onClick={() => {
                    setPrintingStudent(s);
                    setTimeout(() => window.print(), 100);
                  }}
                  className="inline-flex items-center gap-1 text-3xs font-black text-slate-600 hover:text-emerald-600 cursor-pointer"
                >
                  <Printer className="w-3.5 h-3.5" />
                  <span>طباعة كارت الباركود</span>
                </button>

                <div className="flex items-center gap-1">
                  <a
                    href={`https://wa.me/2${s.parentPhone}`}
                    target="_blank"
                    rel="noreferrer"
                    className="p-1.5 rounded-lg bg-green-50 dark:bg-green-950/40 text-green-600 hover:bg-green-100"
                    title="محادثة واتساب"
                  >
                    <Phone className="w-3.5 h-3.5" />
                  </a>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Modal: Add Student */}
        {isAddModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
            <div className="bg-surface rounded-2xl border border-slate-200 dark:border-slate-800 max-w-md w-full p-5 space-y-4 shadow-2xl">
              <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
                <h3 className="text-sm font-black text-slate-900 dark:text-white flex items-center gap-2">
                  <GraduationCap className="w-4 h-4 text-emerald-600" />
                  <span>تسجيل طالب جديد بالسنتر</span>
                </h3>
                <button onClick={() => setIsAddModalOpen(false)} className="text-slate-400 hover:text-slate-600 text-xs">✕</button>
              </div>

              <form onSubmit={handleAddStudent} className="space-y-3">
                <div className="space-y-1">
                  <label className="text-2xs font-bold text-slate-600 dark:text-slate-400">اسم الطالب الرباعي: *</label>
                  <input
                    type="text"
                    required
                    value={newName}
                    onChange={(e) => setNewName(e.target.value)}
                    placeholder="مثال: يوسف حسام الدين عبد الله"
                    className="w-full h-10 px-3 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-xs font-bold"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-2xs font-bold text-slate-600 dark:text-slate-400">الصف الدراسي: *</label>
                  <select
                    value={newGrade}
                    onChange={(e) => setNewGrade(e.target.value)}
                    className="w-full h-10 px-3 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-xs font-bold"
                  >
                    <option value="الصف الثالث الثانوي">الصف الثالث الثانوي</option>
                    <option value="الصف الثاني الثانوي">الصف الثاني الثانوي</option>
                    <option value="الصف الأول الثانوي">الصف الأول الثانوي</option>
                    <option value="الصف الثالث الإعدادي">الصف الثالث الإعدادي</option>
                    <option value="كورس حر / تدريب مهني">كورس حر / تدريب مهني</option>
                  </select>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div className="space-y-1">
                    <label className="text-2xs font-bold text-slate-600 dark:text-slate-400">هاتف الطالب:</label>
                    <input
                      type="text"
                      value={newPhone}
                      onChange={(e) => setNewPhone(e.target.value)}
                      placeholder="010..."
                      className="w-full h-10 px-3 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-xs font-bold font-mono text-left"
                      dir="ltr"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-2xs font-bold text-slate-600 dark:text-slate-400">هاتف ولي الأمر (للواتساب):</label>
                    <input
                      type="text"
                      value={newParentPhone}
                      onChange={(e) => setNewParentPhone(e.target.value)}
                      placeholder="011..."
                      className="w-full h-10 px-3 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-xs font-bold font-mono text-left"
                      dir="ltr"
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
                    حفظ وإصدار الكارت
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Printable Student Card Container (Hidden on screen, shown in print) */}
        {printingStudent && (
          <div className="hidden print:block fixed inset-0 bg-white text-black p-6 z-9999 text-center space-y-4">
            <div className="border-2 border-black rounded-2xl p-6 max-w-sm mx-auto space-y-3">
              <h2 className="text-lg font-black">سنتر التعليم والتدريب</h2>
              <div className="w-16 h-16 mx-auto bg-slate-200 flex items-center justify-center font-bold text-xl rounded-full">
                {printingStudent.name.charAt(0)}
              </div>
              <h3 className="text-base font-black">{printingStudent.name}</h3>
              <p className="text-xs font-bold">{printingStudent.grade}</p>
              <div className="border-t border-dashed border-black pt-3">
                <span className="font-mono text-xl font-black block tracking-widest">
                  |||||| {printingStudent.code} ||||||
                </span>
                <span className="text-2xs font-bold block mt-1">كود الطالب: #{printingStudent.code}</span>
              </div>
            </div>
          </div>
        )}

      </div>
    </AppShell>
  );
}
