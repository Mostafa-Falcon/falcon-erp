'use client';

import React, { useState, useMemo } from 'react';
import { AppShell } from '@/components/layout/AppShell';
import {
  Briefcase,
  Search,
  Plus,
  Hammer,
  Ruler,
  Calendar,
  CheckCircle2,
  Clock,
  Printer,
  Edit2,
  Trash2,
  AlertCircle,
  Phone,
  Building,
  Maximize2,
  TrendingUp,
  Receipt,
  Sparkles,
  Layers,
  ChevronDown,
  X
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { formatNumber } from '@/lib/format';
import { toast } from 'sonner';

export interface DecorProject {
  id: string;
  code: string;
  title: string;
  shopType: string;
  clientName: string;
  clientPhone: string;
  location: string;
  totalArea: number; // m²
  status: 'survey' | 'design' | 'execution' | 'handover';
  progressPercent: number;
  totalBudget: number;
  paidAmount: number;
  startDate: string;
  targetEndDate: string;
  itemsSummary: string[];
}

const INITIAL_PROJECTS: DecorProject[] = [
  {
    id: 'proj-1',
    code: 'PRJ-101',
    title: 'تجهيز بوتيك أزياء "لو رويال"',
    shopType: 'ملابس وأزياء فاخرة',
    clientName: 'أ / حازم عبد الرحمن الشريف',
    clientPhone: '01099887766',
    location: 'مول العرب - التجمع الخامس، القاهرة',
    totalArea: 75,
    status: 'execution',
    progressPercent: 70,
    totalBudget: 145000,
    paidAmount: 100000,
    startDate: '2026-09-10',
    targetEndDate: '2026-10-25',
    itemsSummary: ['واجهة كلادينج وزجاج سيكوريت 10 مم', 'أسقف جبس بورد مع ليد بروفايل', 'ستاندات ستانلس جدارية وجزر وسطية', 'باركيه ألماني HDF'],
  },
  {
    id: 'proj-2',
    code: 'PRJ-102',
    title: 'تشطيب وتجهيز كافيه "أروما روسترز"',
    shopType: 'كافيهات ومشروبات',
    clientName: 'م / إيهاب المنشاوي',
    clientPhone: '01122334455',
    location: 'شارع الجامعة، المنصورة',
    totalArea: 110,
    status: 'design',
    progressPercent: 35,
    totalBudget: 195000,
    paidAmount: 80000,
    startDate: '2026-09-22',
    targetEndDate: '2026-11-15',
    itemsSummary: ['بار كافيه رخام صناعي مع إضاءة', 'تجليد جدران خشب وبديل رخام', 'شبكة تكييف مركزي ودكتات صاج', 'أرضيات إيبوكسي 3D'],
  },
  {
    id: 'proj-3',
    code: 'PRJ-103',
    title: 'تجهيز صيدلية "د. مريم النور"',
    shopType: 'صيدلية ومستلزمات طبية',
    clientName: 'د / مريم كمال زكي',
    clientPhone: '01234567891',
    location: 'شارع الثورة، مصر الجديدة',
    totalArea: 55,
    status: 'handover',
    progressPercent: 100,
    totalBudget: 128000,
    paidAmount: 128000,
    startDate: '2026-08-15',
    targetEndDate: '2026-10-05',
    itemsSummary: ['وحدات أدراج أدوية سحب ناعم', 'فاترينات عرض سيكوريت ليد', 'كاونتر استقبال وصرف روشتات', 'يافطة صيدلية 3D صليب ليد'],
  },
  {
    id: 'proj-4',
    code: 'PRJ-104',
    title: 'تجهيز وتطوير سوبرماركت "البركة"',
    shopType: 'سوبرماركت ومواد غذائية',
    clientName: 'الحاج / صبحي رضوان',
    clientPhone: '01555667788',
    location: 'فيصل، الجيزة',
    totalArea: 140,
    status: 'survey',
    progressPercent: 15,
    totalBudget: 175000,
    paidAmount: 50000,
    startDate: '2026-10-01',
    targetEndDate: '2026-11-30',
    itemsSummary: ['أرفف أحمال ثقيلة جدارية وجزر', 'كاونتر كاشير بحزام سير كهربائي', 'مظلة وواجهة كلادينج خارجية'],
  },
];

export default function DecorProjectsPage() {
  const [projects, setProjects] = useState<DecorProject[]>(INITIAL_PROJECTS);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | DecorProject['status']>('all');
  const [selectedProject, setSelectedProject] = useState<DecorProject | null>(null);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);

  // New Project Form State
  const [formTitle, setFormTitle] = useState('');
  const [formShopType, setFormShopType] = useState('ملابس وأزياء');
  const [formClientName, setFormClientName] = useState('');
  const [formClientPhone, setFormClientPhone] = useState('');
  const [formLocation, setFormLocation] = useState('');
  const [formArea, setFormArea] = useState('60');
  const [formBudget, setFormBudget] = useState('85000');
  const [formPaid, setFormPaid] = useState('35000');
  const [formTargetDate, setFormTargetDate] = useState('2026-11-20');

  // Filtered List
  const filteredProjects = useMemo(() => {
    return projects.filter((p) => {
      const matchStatus = statusFilter === 'all' || p.status === statusFilter;
      const matchSearch =
        !searchQuery.trim() ||
        p.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        p.code.toLowerCase().includes(searchQuery.toLowerCase()) ||
        p.clientName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        p.location.toLowerCase().includes(searchQuery.toLowerCase()) ||
        p.shopType.toLowerCase().includes(searchQuery.toLowerCase());
      return matchStatus && matchSearch;
    });
  }, [projects, statusFilter, searchQuery]);

  // Overall KPIs
  const stats = useMemo(() => {
    const totalCount = projects.length;
    const executionCount = projects.filter((p) => p.status === 'execution').length;
    const totalBudgetSum = projects.reduce((acc, p) => acc + p.totalBudget, 0);
    const totalPaidSum = projects.reduce((acc, p) => acc + p.paidAmount, 0);
    const totalRemaining = totalBudgetSum - totalPaidSum;
    return { totalCount, executionCount, totalBudgetSum, totalPaidSum, totalRemaining };
  }, [projects]);

  // Status Badge Helper
  const renderStatusBadge = (status: DecorProject['status']) => {
    switch (status) {
      case 'survey':
        return <Badge className="bg-blue-50 text-blue-700 dark:bg-blue-950/60 dark:text-blue-300 border-blue-200">📐 معاينة ورفع مقاسات</Badge>;
      case 'design':
        return <Badge className="bg-purple-50 text-purple-700 dark:bg-purple-950/60 dark:text-purple-300 border-purple-200">🎨 تصميم و3D معتمد</Badge>;
      case 'execution':
        return <Badge className="bg-amber-50 text-amber-700 dark:bg-amber-950/60 dark:text-amber-300 border-amber-200">🔨 قيد التنفيذ والتركيب</Badge>;
      case 'handover':
        return <Badge className="bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-400 border-emerald-200">✅ تم التسليم والاعتماد</Badge>;
    }
  };

  // Add Project Handler
  const handleAddProject = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formTitle.trim() || !formClientName.trim()) {
      toast.error('يرجى إدخال اسم المشروع واسم العميل');
      return;
    }

    const newProj: DecorProject = {
      id: `proj-${Date.now()}`,
      code: `PRJ-${Math.floor(100 + Math.random() * 900)}`,
      title: formTitle.trim(),
      shopType: formShopType,
      clientName: formClientName.trim(),
      clientPhone: formClientPhone.trim() || '01000000000',
      location: formLocation.trim() || 'الموقع غير محدد',
      totalArea: Number(formArea) || 50,
      status: 'survey',
      progressPercent: 10,
      totalBudget: Number(formBudget) || 50000,
      paidAmount: Number(formPaid) || 0,
      startDate: new Date().toISOString().slice(0, 10),
      targetEndDate: formTargetDate,
      itemsSummary: ['معاينة ومقايسة أولية للمحل', 'رفع مقاسات الواجهات والأسقف', 'تحديد جدول توريد الخامات'],
    };

    setProjects([newProj, ...projects]);
    setIsAddModalOpen(false);
    // Reset fields
    setFormTitle('');
    setFormClientName('');
    setFormClientPhone('');
    setFormLocation('');
    toast.success(`تم إنشاء مشروع "${newProj.title}" بنجاح`);
  };

  // Status advance
  const handleAdvanceStatus = (id: string) => {
    setProjects((prev) =>
      prev.map((p) => {
        if (p.id !== id) return p;
        if (p.status === 'survey') return { ...p, status: 'design', progressPercent: 35 };
        if (p.status === 'design') return { ...p, status: 'execution', progressPercent: 65 };
        if (p.status === 'execution') return { ...p, status: 'handover', progressPercent: 100 };
        return p;
      })
    );
    toast.success('تم ترقية مرحلة إنجاز المشروع');
  };

  return (
    <AppShell title="مشاريع التجهيز والمقايسات">
      <div className="flex flex-col gap-5 p-3 sm:p-6 select-none" dir="rtl">
        {/* Header Bar */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-surface p-4 sm:p-5 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-2xs">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-amber-500 to-amber-700 flex items-center justify-center text-white text-xl shadow-xs shrink-0">
              🏗️
            </div>
            <div>
              <h1 className="text-lg sm:text-xl font-black text-slate-900 dark:text-white">
                مشاريع تجهيز المحلات والديكور والمقايسات
              </h1>
              <p className="text-xs text-slate-500 dark:text-slate-400 font-medium mt-0.5">
                متابعة المقايسات، مراحل المعاينة والتنفيذ، موازنة الأعمال، ونسب إنجاز المواقع
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto">
            <button
              type="button"
              onClick={() => setIsAddModalOpen(true)}
              className="w-full sm:w-auto px-4 py-2.5 bg-amber-600 hover:bg-amber-700 text-white rounded-xl font-bold text-xs flex items-center justify-center gap-2 transition-all shadow-xs hover:shadow-sm cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>مشروع تجهيز جديد</span>
            </button>
          </div>
        </div>

        {/* 4 KPI Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5">
          <div className="bg-surface p-4 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-2xs flex flex-col gap-1">
            <div className="flex items-center justify-between text-slate-500 text-xs font-bold">
              <span>إجمالي المشاريع</span>
              <Briefcase className="w-4 h-4 text-amber-500" />
            </div>
            <span className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white">
              {stats.totalCount}
            </span>
            <span className="text-3xs text-slate-400">مشاريع مسجلة بالمنظومة</span>
          </div>

          <div className="bg-surface p-4 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-2xs flex flex-col gap-1">
            <div className="flex items-center justify-between text-slate-500 text-xs font-bold">
              <span>قيد التنفيذ بالموقع</span>
              <Hammer className="w-4 h-4 text-blue-500" />
            </div>
            <span className="text-xl sm:text-2xl font-black text-blue-600 dark:text-blue-400">
              {stats.executionCount}
            </span>
            <span className="text-3xs text-slate-400">مواقع نشطة حالياً</span>
          </div>

          <div className="bg-surface p-4 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-2xs flex flex-col gap-1">
            <div className="flex items-center justify-between text-slate-500 text-xs font-bold">
              <span>إجمالي المقايسات</span>
              <TrendingUp className="w-4 h-4 text-emerald-500" />
            </div>
            <span className="text-xl sm:text-2xl font-black text-emerald-600 dark:text-emerald-400">
              {formatNumber(stats.totalBudgetSum)} <span className="text-xs">ج.م</span>
            </span>
            <span className="text-3xs text-slate-400">قيمة عقود التجهيز الإجمالية</span>
          </div>

          <div className="bg-surface p-4 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-2xs flex flex-col gap-1">
            <div className="flex items-center justify-between text-slate-500 text-xs font-bold">
              <span>المتبقي تحصيله</span>
              <Receipt className="w-4 h-4 text-rose-500" />
            </div>
            <span className="text-xl sm:text-2xl font-black text-rose-600 dark:text-rose-400">
              {formatNumber(stats.totalRemaining)} <span className="text-xs">ج.م</span>
            </span>
            <span className="text-3xs text-slate-400">مستخلصات مؤجلة للتسليم</span>
          </div>
        </div>

        {/* Filter and Search Bar */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-surface p-3 sm:p-4 rounded-2xl border border-slate-200/80 dark:border-slate-800">
          {/* Status Tabs */}
          <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar w-full sm:w-auto">
            {[
              { id: 'all', label: 'كافة المشاريع' },
              { id: 'survey', label: 'المعاينة والمقاسات' },
              { id: 'design', label: 'التصميم 3D' },
              { id: 'execution', label: 'قيد التنفيذ' },
              { id: 'handover', label: 'تم التسليم' },
            ].map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setStatusFilter(tab.id as any)}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all shrink-0 cursor-pointer ${
                  statusFilter === tab.id
                    ? 'bg-amber-600 text-white shadow-2xs'
                    : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:text-slate-900'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* Search Input */}
          <div className="relative w-full sm:w-72">
            <Search className="w-4 h-4 text-slate-400 absolute right-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="بحث باسم المشروع، العميل، المحافظة..."
              className="w-full h-9 pr-9 pl-3 text-xs bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl focus:outline-hidden focus:border-amber-500 font-medium"
            />
          </div>
        </div>

        {/* Projects Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filteredProjects.map((project) => (
            <div
              key={project.id}
              className="bg-surface rounded-2xl p-4 sm:p-5 border border-slate-200/80 dark:border-slate-800 shadow-2xs hover:shadow-xs transition-shadow flex flex-col justify-between gap-4"
            >
              <div>
                {/* Header & Badges */}
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-3xs font-black text-amber-700 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/60 px-2 py-0.5 rounded-md border border-amber-200/60 dark:border-amber-900/50">
                        {project.code}
                      </span>
                      <span className="text-3xs text-slate-500 font-bold">
                        {project.shopType}
                      </span>
                    </div>
                    <h3 className="text-base font-black text-slate-900 dark:text-white mt-1 leading-snug">
                      {project.title}
                    </h3>
                  </div>
                  {renderStatusBadge(project.status)}
                </div>

                {/* Client & Location Specs */}
                <div className="grid grid-cols-2 gap-2 mt-3 pt-3 border-t border-slate-100 dark:border-slate-800/80 text-xs">
                  <div className="space-y-1">
                    <span className="text-3xs text-slate-400 block font-medium">العميل:</span>
                    <span className="font-bold text-slate-800 dark:text-slate-200 block truncate">
                      {project.clientName}
                    </span>
                    <span className="text-3xs text-slate-500 flex items-center gap-1 font-mono">
                      <Phone className="w-3 h-3 text-slate-400" />
                      {project.clientPhone}
                    </span>
                  </div>

                  <div className="space-y-1">
                    <span className="text-3xs text-slate-400 block font-medium">الموقع والمساحة:</span>
                    <span className="font-bold text-slate-800 dark:text-slate-200 block truncate">
                      {project.location}
                    </span>
                    <span className="text-3xs text-amber-600 dark:text-amber-400 font-bold">
                      المساحة: {project.totalArea} م²
                    </span>
                  </div>
                </div>

                {/* Progress Bar */}
                <div className="mt-3.5 space-y-1.5">
                  <div className="flex items-center justify-between text-xs font-bold">
                    <span className="text-slate-500 text-3xs">نسبة الإنجاز بالموقع:</span>
                    <span className="text-amber-600 dark:text-amber-400 font-black">
                      {project.progressPercent}%
                    </span>
                  </div>
                  <div className="w-full h-2 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-l from-amber-500 to-amber-600 transition-all duration-500 rounded-full"
                      style={{ width: `${project.progressPercent}%` }}
                    />
                  </div>
                </div>

                {/* Scope / Items Summary tags */}
                <div className="mt-3 flex flex-wrap gap-1.5">
                  {project.itemsSummary.map((item, idx) => (
                    <span
                      key={idx}
                      className="text-3xs font-medium text-slate-600 dark:text-slate-300 bg-slate-100 dark:bg-slate-800/80 px-2 py-0.5 rounded-md"
                    >
                      • {item}
                    </span>
                  ))}
                </div>
              </div>

              {/* Financial Breakdown & Actions Footer */}
              <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                <div className="flex items-center gap-4">
                  <div>
                    <span className="text-3xs text-slate-400 block">إجمالي المقايسة</span>
                    <span className="text-xs font-black text-slate-900 dark:text-white">
                      {formatNumber(project.totalBudget)} ج.م
                    </span>
                  </div>
                  <div>
                    <span className="text-3xs text-slate-400 block">المسدد</span>
                    <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400">
                      {formatNumber(project.paidAmount)} ج.م
                    </span>
                  </div>
                  <div>
                    <span className="text-3xs text-slate-400 block">المتبقي</span>
                    <span className="text-xs font-bold text-rose-600 dark:text-rose-400">
                      {formatNumber(project.totalBudget - project.paidAmount)} ج.م
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-1.5 w-full sm:w-auto justify-end">
                  {project.status !== 'handover' && (
                    <button
                      type="button"
                      onClick={() => handleAdvanceStatus(project.id)}
                      className="px-2.5 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 font-bold text-xs transition-colors cursor-pointer"
                    >
                      ترقية المرحلة ↗
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => {
                      toast.info(`جاري طباعة عقد ومقايسة ${project.title}`);
                      window.print();
                    }}
                    title="طباعة المقايسة والعقد"
                    className="p-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-300 transition-colors cursor-pointer"
                  >
                    <Printer className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Modal: Add New Project */}
        {isAddModalOpen && (
          <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-3 animate-in fade-in">
            <div className="bg-surface w-full max-w-xl rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xl overflow-hidden flex flex-col">
              {/* Header */}
              <div className="p-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between bg-slate-50 dark:bg-slate-900">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-xl bg-amber-600 text-white flex items-center justify-center font-bold">
                    🏗️
                  </div>
                  <div>
                    <h3 className="font-black text-sm text-slate-900 dark:text-white">
                      تسجيل مشروع تجهيز ومقايسة جديدة
                    </h3>
                    <p className="text-3xs text-slate-400">
                      إدخال بيانات المحل، العميل، المساحة والموازنة التقديرية
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-white"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Form Body */}
              <form onSubmit={handleAddProject} className="p-4 space-y-3.5">
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block">
                    اسم المشروع / المحل التجاري *
                  </label>
                  <input
                    type="text"
                    required
                    value={formTitle}
                    onChange={(e) => setFormTitle(e.target.value)}
                    placeholder="مثال: تجهيز صيدلية الشفاء، ديكور كافيه الأهرام"
                    className="w-full h-9 px-3 text-xs bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl focus:border-amber-500 font-medium"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block">
                      نوع النشاط التجاري
                    </label>
                    <select
                      value={formShopType}
                      onChange={(e) => setFormShopType(e.target.value)}
                      className="w-full h-9 px-2 text-xs bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl focus:border-amber-500 font-medium"
                    >
                      <option value="ملابس وأزياء">بوتيك ملابس وأزياء</option>
                      <option value="صيدلية ومستلزمات">صيدلية ومستلزمات</option>
                      <option value="كافيهات ومشروبات">كافيه ومطعم</option>
                      <option value="سوبرماركت ومواد غذائية">سوبرماركت وبقالة</option>
                      <option value="موبايل وإلكترونيات">محل موبايل وصيانة</option>
                      <option value="معرض وعيادة ومكتب">معرض أو عيادة أو مكتب</option>
                    </select>
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block">
                      المساحة الإجمالية (م²)
                    </label>
                    <input
                      type="number"
                      value={formArea}
                      onChange={(e) => setFormArea(e.target.value)}
                      placeholder="60"
                      className="w-full h-9 px-3 text-xs bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl focus:border-amber-500 font-medium"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block">
                      اسم العميل / المالك *
                    </label>
                    <input
                      type="text"
                      required
                      value={formClientName}
                      onChange={(e) => setFormClientName(e.target.value)}
                      placeholder="أ / أحمد شاكر"
                      className="w-full h-9 px-3 text-xs bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl focus:border-amber-500 font-medium"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block">
                      رقم هاتف العميل
                    </label>
                    <input
                      type="text"
                      value={formClientPhone}
                      onChange={(e) => setFormClientPhone(e.target.value)}
                      placeholder="010XXXXXXXX"
                      className="w-full h-9 px-3 text-xs bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl focus:border-amber-500 font-medium"
                    />
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block">
                    عنوان وموقع المحل التجاري
                  </label>
                  <input
                    type="text"
                    value={formLocation}
                    onChange={(e) => setFormLocation(e.target.value)}
                    placeholder="مثال: مول سيتي سنتر، مدينة نصر"
                    className="w-full h-9 px-3 text-xs bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl focus:border-amber-500 font-medium"
                  />
                </div>

                <div className="grid grid-cols-3 gap-3">
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block">
                      إجمالي المقايسة (ج.م)
                    </label>
                    <input
                      type="number"
                      value={formBudget}
                      onChange={(e) => setFormBudget(e.target.value)}
                      className="w-full h-9 px-2 text-xs bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl focus:border-amber-500 font-bold"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block">
                      عربون التعاقد (ج.م)
                    </label>
                    <input
                      type="number"
                      value={formPaid}
                      onChange={(e) => setFormPaid(e.target.value)}
                      className="w-full h-9 px-2 text-xs bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl focus:border-amber-500 font-bold"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block">
                      موعد التسليم المخطط
                    </label>
                    <input
                      type="date"
                      value={formTargetDate}
                      onChange={(e) => setFormTargetDate(e.target.value)}
                      className="w-full h-9 px-2 text-xs bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl focus:border-amber-500 font-bold"
                    />
                  </div>
                </div>

                {/* Footer Buttons */}
                <div className="pt-3 border-t border-slate-200 dark:border-slate-800 flex items-center justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => setIsAddModalOpen(false)}
                    className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
                  >
                    إلغاء
                  </button>
                  <button
                    type="submit"
                    className="px-5 py-2 rounded-xl text-xs font-bold bg-amber-600 hover:bg-amber-700 text-white shadow-xs cursor-pointer"
                  >
                    حفظ واعتماد المشروع
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
