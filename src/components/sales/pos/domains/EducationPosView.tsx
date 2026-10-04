'use client';

import React, { useState, useMemo } from 'react';
import {
  GraduationCap,
  BookOpen,
  Users,
  Calendar,
  Clock,
  Printer,
  Search,
  CheckCircle2,
  AlertCircle,
  QrCode,
  Calculator,
  UserCheck,
  Plus,
  Trash2,
  Minus,
  Sparkles,
  CreditCard,
  Banknote,
  Send,
  Building,
  Receipt,
  FileText,
  BadgeDollarSign
} from 'lucide-react';
import { toast } from 'sonner';
import { Badge } from '@/components/ui/badge';
import { formatNumber } from '@/lib/format';
import type { Product, Unit } from '@/types';
import type { CartLine, UnitOption } from '../types';

interface EducationPosViewProps {
  cart: CartLine[];
  products: Product[];
  unitsById: Record<string, Unit>;
  unitOptions: Record<string, UnitOption[]>;
  availableFor: (pId: string, unitId?: string, factor?: number, batchId?: string) => number;
  onAddToCart: (product: Product, options?: any) => void;
  onUpdateQty: (key: string, delta: number) => void;
  onSetQty: (key: string, qty: number) => void;
  onRemoveLine: (key: string) => void;
  onUnitChange: (key: string, newUnitId: string, factor: number, price?: number) => void;
  onClearCart: () => void;
  orgId: string;
  branchId: string;
  onCheckout: (type: 'cash' | 'card' | 'credit' | 'split') => void;
  isSaving: boolean;
  subtotal: number;
  totalDiscount: number;
  shippingFee: number;
  totalTax: number;
  total: number;
  customerMode?: string;
  selectedCustomerId?: string | null;
  onOpenCustomerModal: () => void;
  onOpenDiscountsModal: () => void;
  onOpenSplitModal: () => void;
  lastAddedKey?: string | null;
  activeShift: any;
}

// نموذج المدرسين والمجموعات الافتراضية للسنتر
interface TeacherCourse {
  id: string;
  teacherName: string;
  subject: string;
  grade: string;
  timeSlot: string;
  hall: string;
  sessionPrice: number;
  monthlyPrice: number;
  centerSharePercent: number;
  color: string;
}

const DEFAULT_COURSES: TeacherCourse[] = [
  {
    id: 'c1',
    teacherName: 'أ. محمد عبد الفتاح',
    subject: 'الفيزياء',
    grade: 'الصف الثالث الثانوي',
    timeSlot: 'السبت والثلاثاء 04:00 م',
    hall: 'قاعة 1 (ابن الهيثم)',
    sessionPrice: 80,
    monthlyPrice: 550,
    centerSharePercent: 30,
    color: 'from-blue-600 to-indigo-600',
  },
  {
    id: 'c2',
    teacherName: 'م. أحمد الشناوي',
    subject: 'الرياضيات التطبيقية',
    grade: 'الصف الثالث الثانوي',
    timeSlot: 'الأحد والأربعاء 06:00 م',
    hall: 'المدرج الكبير',
    sessionPrice: 90,
    monthlyPrice: 650,
    centerSharePercent: 25,
    color: 'from-amber-600 to-orange-600',
  },
  {
    id: 'c3',
    teacherName: 'د. سارة المنشاوي',
    subject: 'الأحياء والجيولوجيا',
    grade: 'الصف الثاني الثانوي',
    timeSlot: 'الإثنين والخميس 03:00 م',
    hall: 'قاعة 2 (ابن النفيس)',
    sessionPrice: 70,
    monthlyPrice: 500,
    centerSharePercent: 30,
    color: 'from-emerald-600 to-teal-600',
  },
  {
    id: 'c4',
    teacherName: 'أ. محمود رضوان',
    subject: 'اللغة العربية واللغويات',
    grade: 'الصف الثالث الإعدادي',
    timeSlot: 'السبت والثلاثاء 01:00 م',
    hall: 'قاعة 3 (المتنبي)',
    sessionPrice: 60,
    monthlyPrice: 420,
    centerSharePercent: 30,
    color: 'from-purple-600 to-pink-600',
  },
  {
    id: 'c5',
    teacherName: 'مستر جون فؤاد',
    subject: 'اللغة الإنجليزية',
    grade: 'الصف الأول الثانوي',
    timeSlot: 'الأحد والأربعاء 04:00 م',
    hall: 'قاعة اللغات التفاعلية',
    sessionPrice: 75,
    monthlyPrice: 520,
    centerSharePercent: 30,
    color: 'from-cyan-600 to-blue-600',
  },
];

export const EducationPosView: React.FC<EducationPosViewProps> = ({
  cart,
  products,
  onAddToCart,
  onUpdateQty,
  onRemoveLine,
  onClearCart,
  onCheckout,
  orgId,
  isSaving,
  subtotal,
  totalDiscount,
  total,
  onOpenCustomerModal,
  onOpenDiscountsModal,
  onOpenSplitModal,
}) => {
  // Tab State
  const [activeTab, setActiveTab] = useState<'tickets' | 'books' | 'scanner' | 'settlement'>('tickets');
  
  // Student Context State for Ticket Generation
  const [studentName, setStudentName] = useState('');
  const [studentCode, setStudentCode] = useState('');
  const [studentPhone, setStudentPhone] = useState('');
  const [ticketType, setTicketType] = useState<'session' | 'monthly'>('session');
  const [selectedGrade, setSelectedGrade] = useState<string>('all');
  const [searchBook, setSearchBook] = useState('');

  // Fast QR Scanner State
  const [scanInput, setScanInput] = useState('');
  const [lastScannedStudent, setLastScannedStudent] = useState<{
    code: string;
    name: string;
    course: string;
    teacher: string;
    status: 'paid' | 'due';
    dueAmount: number;
    parentPhone: string;
    timestamp: string;
  } | null>(null);

  // Teacher Settlement Calculator State
  const [settleTeacherId, setSettleTeacherId] = useState(DEFAULT_COURSES[0].id);
  const [settleAttendanceCount, setSettleAttendanceCount] = useState<number>(35);
  const [settleExtraDeductions, setSettleExtraDeductions] = useState<number>(0);

  // Filtered courses
  const filteredCourses = useMemo(() => {
    if (selectedGrade === 'all') return DEFAULT_COURSES;
    return DEFAULT_COURSES.filter(c => c.grade.includes(selectedGrade));
  }, [selectedGrade]);

  // Book & Material Products
  const studyMaterials = useMemo(() => {
    return products.filter(p => {
      const matchSearch = !searchBook || p.name.toLowerCase().includes(searchBook.toLowerCase()) || p.sku?.includes(searchBook);
      return matchSearch;
    });
  }, [products, searchBook]);

  // Add Course Ticket as Custom Product to Cart
  const handleAddTicketToCart = (course: TeacherCourse, type: 'session' | 'monthly') => {
    const isMonthly = type === 'monthly';
    const price = isMonthly ? course.monthlyPrice : course.sessionPrice;
    const ticketTitle = `${isMonthly ? 'اشتراك شهري' : 'تذكرة حصة'}: ${course.subject} (${course.teacherName})`;
    
    // Create an ephemeral product matching Product interface
    const ticketProduct: Product = {
      id: `ticket_${course.id}_${Date.now()}`,
      org_id: orgId || '',
      sku: `TKT${Date.now().toString().slice(-6)}`,
      name: `${ticketTitle} ${studentName ? `- الطالب: ${studentName}` : ''}`,
      category_id: null,
      base_unit_id: 'session',
      item_type: 'service',
      purchase_price: 0,
      sale_price: price,
      min_sale_price: price,
      min_stock_alert: 0,
      is_active: true,
      tax_rate: 0,
      is_tax_inclusive: true,
      tracks_batch: false,
      tracks_expiry: false,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    onAddToCart(ticketProduct);
    toast.success(`تمت إضافة ${ticketTitle} إلى الفاتورة`);
  };

  // Handle Quick Barcode Attendance Scan
  const handleScanSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!scanInput.trim()) return;

    const mockStatus: 'paid' | 'due' = Math.random() > 0.3 ? 'paid' : 'due';
    const scanned = {
      code: scanInput.trim(),
      name: scanInput.startsWith('1') ? 'أحمد علاء الدين الشامي' : scanInput.startsWith('2') ? 'مريم حسام البدري' : 'عمر خالد الصاوي',
      course: 'فيزياء 3 ثانوي',
      teacher: 'أ. محمد عبد الفتاح',
      status: mockStatus,
      dueAmount: mockStatus === 'due' ? 80 : 0,
      parentPhone: '01012345678',
      timestamp: new Date().toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' }),
    };

    setLastScannedStudent(scanned);
    setScanInput('');

    if (scanned.status === 'paid') {
      toast.success(`تم تسجيل حضور الطالب: ${scanned.name} بنجاح`);
    } else {
      toast.warning(`تنبيه: الطالب ${scanned.name} عليه متأخرات ${scanned.dueAmount} ج.م`);
    }
  };

  // Teacher Settlement Calculations
  const selectedSettleCourse = DEFAULT_COURSES.find(c => c.id === settleTeacherId) || DEFAULT_COURSES[0];
  const settleTotalIncome = settleAttendanceCount * selectedSettleCourse.sessionPrice;
  const settleCenterShare = (settleTotalIncome * selectedSettleCourse.centerSharePercent) / 100;
  const settleTeacherNet = settleTotalIncome - settleCenterShare - settleExtraDeductions;

  return (
    <div className="flex-1 flex flex-col lg:flex-row overflow-hidden bg-slate-100 dark:bg-slate-950 font-sans" dir="rtl">
      
      {/* =========================================================================
          LEFT / CENTER: EDUCATIONAL SUITE (TICKETS, BOOKS, ATTENDANCE, SETTLEMENT)
         ========================================================================= */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden border-b lg:border-b-0 lg:border-l border-slate-200 dark:border-slate-800">
        
        {/* Sub-Header Navigation Tabs */}
        <div className="bg-surface border-b border-slate-200 dark:border-slate-800 p-2 sm:p-3 flex items-center justify-between gap-2 overflow-x-auto no-scrollbar shadow-2xs">
          <div className="flex items-center gap-1.5 sm:gap-2">
            <button
              onClick={() => setActiveTab('tickets')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-black transition-all cursor-pointer shrink-0 ${
                activeTab === 'tickets'
                  ? 'bg-emerald-600 text-white shadow-md shadow-emerald-600/20'
                  : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
              }`}
            >
              <GraduationCap className="w-4 h-4" />
              <span>تذاكر الحصص والاشتراكات</span>
            </button>

            <button
              onClick={() => setActiveTab('books')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-black transition-all cursor-pointer shrink-0 ${
                activeTab === 'books'
                  ? 'bg-emerald-600 text-white shadow-md shadow-emerald-600/20'
                  : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
              }`}
            >
              <BookOpen className="w-4 h-4" />
              <span>الملازم والمذكرات</span>
            </button>

            <button
              onClick={() => setActiveTab('scanner')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-black transition-all cursor-pointer shrink-0 ${
                activeTab === 'scanner'
                  ? 'bg-emerald-600 text-white shadow-md shadow-emerald-600/20'
                  : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
              }`}
            >
              <QrCode className="w-4 h-4" />
              <span>الحضور السريع (QR)</span>
            </button>

            <button
              onClick={() => setActiveTab('settlement')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-black transition-all cursor-pointer shrink-0 ${
                activeTab === 'settlement'
                  ? 'bg-emerald-600 text-white shadow-md shadow-emerald-600/20'
                  : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
              }`}
            >
              <Calculator className="w-4 h-4" />
              <span>تصفية المدرس الفورية</span>
            </button>
          </div>

          <Badge className="bg-emerald-50 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800 hidden sm:flex items-center gap-1 text-3xs font-black">
            <Sparkles className="w-3 h-3 text-emerald-500" />
            <span>كاشير سناتر الدروس والتدريب</span>
          </Badge>
        </div>

        {/* ==================== TAB 1: TICKETS & SUBSCRIPTIONS ==================== */}
        {activeTab === 'tickets' && (
          <div className="flex-1 overflow-y-auto p-3 sm:p-4 space-y-4">
            
            {/* Quick Student Context Inputs */}
            <div className="bg-surface rounded-2xl p-3 sm:p-4 border border-slate-200 dark:border-slate-800 shadow-2xs space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-black text-slate-900 dark:text-white flex items-center gap-1.5">
                  <UserCheck className="w-4 h-4 text-emerald-600" />
                  <span>بيانات الطالب المصدر له التذكرة (اختياري للطباعة)</span>
                </span>
                <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-800 p-0.5 rounded-lg text-3xs font-bold">
                  <button
                    onClick={() => setTicketType('session')}
                    className={`px-2 py-0.5 rounded-md transition-colors cursor-pointer ${
                      ticketType === 'session' ? 'bg-white dark:bg-slate-700 text-emerald-600 shadow-xs' : 'text-slate-500'
                    }`}
                  >
                    تذكرة حصة
                  </button>
                  <button
                    onClick={() => setTicketType('monthly')}
                    className={`px-2 py-0.5 rounded-md transition-colors cursor-pointer ${
                      ticketType === 'monthly' ? 'bg-white dark:bg-slate-700 text-emerald-600 shadow-xs' : 'text-slate-500'
                    }`}
                  >
                    اشتراك شهري
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                <input
                  type="text"
                  placeholder="اسم الطالب..."
                  value={studentName}
                  onChange={(e) => setStudentName(e.target.value)}
                  className="h-9 px-3 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-xs font-bold focus:outline-none focus:ring-1 focus:ring-emerald-500"
                />
                <input
                  type="text"
                  placeholder="كود الطالب / الباركود..."
                  value={studentCode}
                  onChange={(e) => setStudentCode(e.target.value)}
                  className="h-9 px-3 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-xs font-mono font-bold focus:outline-none focus:ring-1 focus:ring-emerald-500 text-left"
                  dir="ltr"
                />
                <input
                  type="text"
                  placeholder="رقم هاتف ولي الأمر..."
                  value={studentPhone}
                  onChange={(e) => setStudentPhone(e.target.value)}
                  className="h-9 px-3 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-xs font-mono font-bold focus:outline-none focus:ring-1 focus:ring-emerald-500 text-left"
                  dir="ltr"
                />
              </div>

              {/* Grade Filter Pills */}
              <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar pt-1">
                {[
                  { id: 'all', label: 'كافة المراحل' },
                  { id: 'الثالث الثانوي', label: '3 ثانوي' },
                  { id: 'الثاني الثانوي', label: '2 ثانوي' },
                  { id: 'الأول الثانوي', label: '1 ثانوي' },
                  { id: 'الإعدادي', label: 'المرحلة الإعدادية' },
                ].map(g => (
                  <button
                    key={g.id}
                    onClick={() => setSelectedGrade(g.id)}
                    className={`px-2.5 py-1 rounded-lg text-3xs font-black transition-all cursor-pointer shrink-0 ${
                      selectedGrade === g.id
                        ? 'bg-slate-900 dark:bg-white text-white dark:text-slate-950'
                        : 'bg-slate-100 dark:bg-slate-800/80 text-slate-600 dark:text-slate-400 hover:bg-slate-200'
                    }`}
                  >
                    {g.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Courses & Teachers Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {filteredCourses.map((c) => (
                <div
                  key={c.id}
                  className="bg-surface rounded-2xl border border-slate-200 dark:border-slate-800 p-4 shadow-2xs hover:shadow-md transition-all flex flex-col justify-between group"
                >
                  <div className="space-y-2">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <span className="text-3xs font-black px-2 py-0.5 rounded-md bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-400 border border-emerald-200/50 dark:border-emerald-800/50">
                          {c.grade}
                        </span>
                        <h4 className="text-sm font-black text-slate-900 dark:text-white mt-1 group-hover:text-emerald-600 transition-colors">
                          {c.subject}
                        </h4>
                        <p className="text-xs font-bold text-slate-500 dark:text-slate-400">
                          {c.teacherName}
                        </p>
                      </div>

                      <div className="text-left font-mono">
                        <span className="text-base font-black text-emerald-600 dark:text-emerald-400 block">
                          {formatNumber(ticketType === 'monthly' ? c.monthlyPrice : c.sessionPrice)} ج.م
                        </span>
                        <span className="text-4xs text-slate-400 font-bold block">
                          {ticketType === 'monthly' ? 'اشتراك 8 حصص' : 'سعر الحصة الواحدة'}
                        </span>
                      </div>
                    </div>

                    <div className="pt-2 border-t border-slate-100 dark:border-slate-800/80 text-3xs font-semibold text-slate-500 space-y-1">
                      <div className="flex items-center gap-1.5">
                        <Clock className="w-3 h-3 text-slate-400" />
                        <span>{c.timeSlot}</span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <Building className="w-3 h-3 text-slate-400" />
                        <span>{c.hall}</span>
                      </div>
                    </div>
                  </div>

                  <div className="pt-3 mt-3 border-t border-slate-100 dark:border-slate-800 flex items-center gap-2">
                    <button
                      onClick={() => handleAddTicketToCart(c, 'session')}
                      className="flex-1 h-8 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-emerald-50 hover:text-emerald-700 text-slate-700 dark:text-slate-200 text-2xs font-black flex items-center justify-center gap-1 transition-colors cursor-pointer"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>تذكرة حصة ({formatNumber(c.sessionPrice)}ج)</span>
                    </button>
                    <button
                      onClick={() => handleAddTicketToCart(c, 'monthly')}
                      className="flex-1 h-8 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-2xs font-black flex items-center justify-center gap-1 transition-colors cursor-pointer shadow-xs"
                    >
                      <Calendar className="w-3.5 h-3.5" />
                      <span>شهر ({formatNumber(c.monthlyPrice)}ج)</span>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ==================== TAB 2: BOOKS & STUDY MATERIALS ==================== */}
        {activeTab === 'books' && (
          <div className="flex-1 overflow-y-auto p-3 sm:p-4 space-y-4">
            <div className="relative">
              <input
                type="text"
                placeholder="بحث في الملازم، المذكرات، الكتب بالاسم أو الباركود..."
                value={searchBook}
                onChange={(e) => setSearchBook(e.target.value)}
                className="w-full h-10 pr-9 pl-4 rounded-xl bg-surface border border-slate-200 dark:border-slate-800 text-xs font-bold focus:outline-none focus:ring-1 focus:ring-emerald-500 shadow-2xs"
              />
              <Search className="w-4 h-4 text-slate-400 absolute right-3 top-1/2 -translate-y-1/2" />
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
              {studyMaterials.map((p) => (
                <div
                  key={p.id}
                  onClick={() => onAddToCart(p)}
                  className="bg-surface rounded-2xl border border-slate-200 dark:border-slate-800 p-3 shadow-2xs hover:shadow-md hover:border-emerald-500 transition-all cursor-pointer flex flex-col justify-between"
                >
                  <div className="space-y-1.5">
                    <div className="w-8 h-8 rounded-lg bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 flex items-center justify-center">
                      <BookOpen className="w-4 h-4" />
                    </div>
                    <h5 className="text-xs font-black text-slate-900 dark:text-white line-clamp-2">
                      {p.name}
                    </h5>
                    {p.sku && (
                      <span className="text-4xs font-mono text-slate-400 block" dir="ltr">
                        {p.sku}
                      </span>
                    )}
                  </div>

                  <div className="pt-2 mt-2 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
                    <span className="text-xs font-black text-emerald-600 dark:text-emerald-400 font-mono">
                      {formatNumber(p.sale_price)} ج.م
                    </span>
                    <button className="w-6 h-6 rounded-lg bg-emerald-600 text-white flex items-center justify-center hover:bg-emerald-700">
                      <Plus className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ==================== TAB 3: FAST ATTENDANCE SCANNER (QR) ==================== */}
        {activeTab === 'scanner' && (
          <div className="flex-1 overflow-y-auto p-4 max-w-2xl mx-auto w-full space-y-5">
            <div className="text-center space-y-1">
              <h3 className="text-base font-black text-slate-900 dark:text-white flex items-center justify-center gap-2">
                <QrCode className="w-5 h-5 text-emerald-600" />
                <span>شاشة الحضور السريع بالباركود وكارت الطالب</span>
              </h3>
              <p className="text-2xs text-slate-400 font-bold">
                مرر كارت الطالب عبر الماسح الضوئي (Scanner) أو أدخل الكود يدوياً لتسجيل الحضور فوراً
              </p>
            </div>

            <form onSubmit={handleScanSubmit} className="space-y-2">
              <div className="relative">
                <input
                  type="text"
                  autoFocus
                  placeholder="امسح باركود الطالب أو اكتب الكود (مثال: 101)..."
                  value={scanInput}
                  onChange={(e) => setScanInput(e.target.value)}
                  className="w-full h-12 pr-11 pl-4 rounded-2xl bg-surface border-2 border-emerald-500/50 focus:border-emerald-600 text-sm font-mono font-bold focus:outline-none shadow-md shadow-emerald-500/5"
                  dir="ltr"
                />
                <QrCode className="w-5 h-5 text-emerald-600 absolute right-4 top-1/2 -translate-y-1/2" />
              </div>
              <button
                type="submit"
                className="w-full h-10 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-black text-xs transition-colors cursor-pointer shadow-xs"
              >
                تسجيل الحضور وفحص السداد
              </button>
            </form>

            {/* Last Scanned Result Card */}
            {lastScannedStudent && (
              <div className={`p-4 rounded-2xl border transition-all ${
                lastScannedStudent.status === 'paid'
                  ? 'bg-emerald-50/70 dark:bg-emerald-950/40 border-emerald-300 dark:border-emerald-800'
                  : 'bg-amber-50/70 dark:bg-amber-950/40 border-amber-300 dark:border-amber-800'
              }`}>
                <div className="flex items-start justify-between">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-black text-slate-900 dark:text-white">
                        {lastScannedStudent.name}
                      </span>
                      <span className="text-3xs font-mono font-bold text-slate-400" dir="ltr">
                        #{lastScannedStudent.code}
                      </span>
                    </div>
                    <p className="text-xs font-bold text-slate-600 dark:text-slate-300">
                      {lastScannedStudent.course} — {lastScannedStudent.teacher}
                    </p>
                    <span className="text-3xs text-slate-400 font-semibold block">
                      وقت تسجيل الحضور: {lastScannedStudent.timestamp}
                    </span>
                  </div>

                  <div>
                    {lastScannedStudent.status === 'paid' ? (
                      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-3xs font-black bg-emerald-600 text-white shadow-xs">
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        <span>خالص تماماً</span>
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-3xs font-black bg-amber-500 text-slate-950 shadow-xs">
                        <AlertCircle className="w-3.5 h-3.5" />
                        <span>متأخرات {lastScannedStudent.dueAmount} ج.م</span>
                      </span>
                    )}
                  </div>
                </div>

                <div className="pt-3 mt-3 border-t border-slate-200/60 dark:border-slate-800 flex items-center justify-between flex-wrap gap-2">
                  <span className="text-3xs font-bold text-slate-500">
                    هاتف ولي الأمر: <span className="font-mono" dir="ltr">{lastScannedStudent.parentPhone}</span>
                  </span>
                  
                  <a
                    href={`https://wa.me/2${lastScannedStudent.parentPhone}?text=${encodeURIComponent(
                      `نحيطكم علماً بحضور الطالب (${lastScannedStudent.name}) لحصة (${lastScannedStudent.course}) مع (${lastScannedStudent.teacher}) اليوم بنجاح.`
                    )}`}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-green-600 hover:bg-green-700 text-white text-3xs font-black transition-colors"
                  >
                    <Send className="w-3 h-3" />
                    <span>إرسال إشعار واتساب لولي الأمر</span>
                  </a>
                </div>
              </div>
            )}
          </div>
        )}

        {/* ==================== TAB 4: TEACHER SETTLEMENT CALCULATOR ==================== */}
        {activeTab === 'settlement' && (
          <div className="flex-1 overflow-y-auto p-4 max-w-xl mx-auto w-full space-y-4">
            <div className="bg-surface rounded-2xl border border-slate-200 dark:border-slate-800 p-5 shadow-xs space-y-4">
              <h3 className="text-sm font-black text-slate-900 dark:text-white flex items-center gap-2 border-b border-slate-100 dark:border-slate-800 pb-3">
                <Calculator className="w-4 h-4 text-emerald-600" />
                <span>حاسبة تصفية مستحقات المدرس للحصة</span>
              </h3>

              <div className="space-y-3">
                <div className="space-y-1">
                  <label className="text-2xs font-bold text-slate-600 dark:text-slate-400">اختر المدرس / المجموعة:</label>
                  <select
                    value={settleTeacherId}
                    onChange={(e) => setSettleTeacherId(e.target.value)}
                    className="w-full h-10 px-3 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-xs font-bold"
                  >
                    {DEFAULT_COURSES.map(c => (
                      <option key={c.id} value={c.id}>
                        {c.teacherName} — {c.subject} (سعر الحصة: {c.sessionPrice}ج - نسبة السنتر: {c.centerSharePercent}%)
                      </option>
                    ))}
                  </select>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="text-2xs font-bold text-slate-600 dark:text-slate-400">عدد الطلاب الحاضرين:</label>
                    <input
                      type="number"
                      value={settleAttendanceCount}
                      onChange={(e) => setSettleAttendanceCount(Number(e.target.value) || 0)}
                      className="w-full h-10 px-3 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-xs font-bold font-mono"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-2xs font-bold text-slate-600 dark:text-slate-400">خصومات إضافية (مذكرات/مشروبات):</label>
                    <input
                      type="number"
                      value={settleExtraDeductions}
                      onChange={(e) => setSettleExtraDeductions(Number(e.target.value) || 0)}
                      className="w-full h-10 px-3 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-xs font-bold font-mono"
                    />
                  </div>
                </div>
              </div>

              {/* Settlement Summary Breakdown */}
              <div className="bg-slate-50 dark:bg-slate-900/60 rounded-xl p-4 border border-slate-200/80 dark:border-slate-800 space-y-2 text-xs font-bold">
                <div className="flex justify-between text-slate-600 dark:text-slate-400">
                  <span>إجمالي دخل الحصة ({settleAttendanceCount} × {selectedSettleCourse.sessionPrice}ج):</span>
                  <span className="font-mono">{formatNumber(settleTotalIncome)} ج.م</span>
                </div>
                <div className="flex justify-between text-amber-600 dark:text-amber-400">
                  <span>نسبة السنتر ({selectedSettleCourse.centerSharePercent}%):</span>
                  <span className="font-mono">-{formatNumber(settleCenterShare)} ج.م</span>
                </div>
                {settleExtraDeductions > 0 && (
                  <div className="flex justify-between text-red-600">
                    <span>خصومات ومصاريف إضافية:</span>
                    <span className="font-mono">-{formatNumber(settleExtraDeductions)} ج.م</span>
                  </div>
                )}
                <div className="pt-2 border-t border-slate-200 dark:border-slate-800 flex justify-between text-sm font-black text-emerald-600 dark:text-emerald-400">
                  <span>صافي مستحقات المدرس المستلمة:</span>
                  <span className="font-mono text-base">{formatNumber(settleTeacherNet)} ج.م</span>
                </div>
              </div>

              <button
                onClick={() => {
                  toast.success(`تم استخراج تصفية الحساب للمدرس ${selectedSettleCourse.teacherName} بمبلغ ${formatNumber(settleTeacherNet)} ج.م`);
                }}
                className="w-full h-10 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-black flex items-center justify-center gap-1.5 transition-colors cursor-pointer shadow-xs"
              >
                <Printer className="w-4 h-4" />
                <span>طباعة إيصال تصفية المدرس وتسجيل السند</span>
              </button>
            </div>
          </div>
        )}
      </div>

      {/* =========================================================================
          RIGHT: CENTER BILLING & CART (INVOICE, TICKET PRINTING & CHECKOUT)
         ========================================================================= */}
      <div className="w-full lg:w-96 flex flex-col bg-surface border-t lg:border-t-0 shadow-lg">
        
        {/* Cart Header */}
        <div className="p-3 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-emerald-50 dark:bg-emerald-950/50 text-emerald-600 flex items-center justify-center">
              <Receipt className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-xs font-black text-slate-900 dark:text-white">إيصال الحصص والمبيعات</h3>
              <span className="text-4xs font-bold text-slate-400">{cart.length} بنود في الفاتورة</span>
            </div>
          </div>

          {cart.length > 0 && (
            <button
              onClick={onClearCart}
              className="text-4xs font-bold text-red-500 hover:text-red-700 cursor-pointer"
            >
              مسح الكل
            </button>
          )}
        </div>

        {/* Cart Lines Scrollable Area */}
        <div className="flex-1 overflow-y-auto p-3 space-y-2 max-h-[35vh] lg:max-h-none">
          {cart.length === 0 ? (
            <div className="h-44 flex flex-col items-center justify-center text-slate-400 text-center gap-2">
              <GraduationCap className="w-8 h-8 opacity-30" />
              <p className="text-xs font-bold">لا توجد تذاكر أو ملازم مضافة</p>
              <span className="text-3xs">اختر حصة أو ملزمة للإضافة إلى الفاتورة</span>
            </div>
          ) : (
            cart.map((line) => {
              const prod = products.find((p) => p.id === line.productId);
              return (
                <div
                  key={line.key}
                  className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 flex items-center justify-between gap-2"
                >
                  <div className="min-w-0 flex-1">
                    <h5 className="text-xs font-black text-slate-900 dark:text-white truncate">
                      {prod?.name || 'تذكرة حصة'}
                    </h5>
                    <span className="text-3xs text-emerald-600 font-bold font-mono">
                      {formatNumber(line.price)} ج.م
                    </span>
                  </div>

                  <div className="flex items-center gap-1.5 shrink-0">
                    <button
                      onClick={() => onUpdateQty(line.key, -1)}
                      className="w-6 h-6 rounded-lg bg-slate-200 dark:bg-slate-800 flex items-center justify-center text-slate-700 dark:text-slate-300 hover:bg-slate-300 cursor-pointer"
                    >
                      <Minus className="w-3 h-3" />
                    </button>
                    <span className="w-5 text-center text-xs font-black font-mono">
                      {line.qty}
                    </span>
                    <button
                      onClick={() => onUpdateQty(line.key, 1)}
                      className="w-6 h-6 rounded-lg bg-slate-200 dark:bg-slate-800 flex items-center justify-center text-slate-700 dark:text-slate-300 hover:bg-slate-300 cursor-pointer"
                    >
                      <Plus className="w-3 h-3" />
                    </button>
                    <button
                      onClick={() => onRemoveLine(line.key)}
                      className="w-6 h-6 rounded-lg text-red-500 hover:bg-red-50 dark:hover:bg-red-950/40 flex items-center justify-center cursor-pointer ml-1"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Invoice Summary & Checkout Buttons */}
        <div className="p-3 border-t border-slate-200 dark:border-slate-800 space-y-2 bg-slate-50/50 dark:bg-slate-900/30">
          <div className="flex justify-between text-xs font-bold text-slate-500">
            <span>المجموع الفرعي:</span>
            <span className="font-mono">{formatNumber(subtotal)} ج.م</span>
          </div>
          {totalDiscount > 0 && (
            <div className="flex justify-between text-xs font-bold text-emerald-600">
              <span>الخصم المطبق:</span>
              <span className="font-mono">-{formatNumber(totalDiscount)} ج.م</span>
            </div>
          )}
          <div className="flex justify-between text-sm font-black text-slate-900 dark:text-white pt-1 border-t border-slate-200 dark:border-slate-800">
            <span>المبلغ الإجمالي:</span>
            <span className="text-base text-emerald-600 dark:text-emerald-400 font-mono">
              {formatNumber(total)} ج.م
            </span>
          </div>

          {/* Quick Pay Action Buttons */}
          <div className="grid grid-cols-2 gap-2 pt-2">
            <button
              onClick={() => onCheckout('cash')}
              disabled={isSaving || cart.length === 0}
              className="h-10 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-black text-xs flex items-center justify-center gap-1.5 transition-colors cursor-pointer shadow-xs disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Banknote className="w-4 h-4" />
              <span>دفع كاش وطباعة</span>
            </button>
            <button
              onClick={() => onCheckout('card')}
              disabled={isSaving || cart.length === 0}
              className="h-10 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-black text-xs flex items-center justify-center gap-1.5 transition-colors cursor-pointer shadow-xs disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <CreditCard className="w-4 h-4" />
              <span>بطاقة / فيزا</span>
            </button>
          </div>
        </div>

      </div>
    </div>
  );
};
