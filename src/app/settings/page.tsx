'use client';

import React, { useEffect, useState } from 'react';
import { AppShell } from '@/components/layout/AppShell';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { useSessionStore } from '@/core/state/useSessionStore';
import { useSyncStore } from '@/core/state/useSyncStore';
import { SettingsRepository } from '@/modules/settings/settings_repository';
import { toast } from 'sonner';
import {
  Save,
  Building2,
  AlertTriangle,
  Trash2,
  Globe,
  X,
  Phone,
  Mail,
  FileText,
  MapPin,
  Volume2,
  Moon,
  CalendarDays,
  ShieldCheck,
  CheckCircle2,
  Percent
} from 'lucide-react';

import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ResetPeriodModal } from '@/components/settings/ResetPeriodModal';

import { useRouter } from 'next/navigation';

export default function SettingsPage() {
  const { currentUser } = useSessionStore();
  const orgId = currentUser?.org_id || '';
  const { isOnline } = useSyncStore();
  const router = useRouter();

  // Loading & Action states
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isResetting, setIsResetting] = useState(false);
  const [isPeriodResetOpen, setIsPeriodResetOpen] = useState(false);
  const [isDeletingAccount, setIsDeletingAccount] = useState(false);

  // Identity state
  const [nameAr, setNameAr] = useState('');
  const [nameEn, setNameEn] = useState('');
  const [activityType, setActivityType] = useState('retail');

  // Contact & Taxes state
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [address, setAddress] = useState('');
  const [taxNumber, setTaxNumber] = useState('');
  const [enableTax, setEnableTax] = useState(false);
  const [vatRate, setVatRate] = useState('14');
  const [isTaxInclusive, setIsTaxInclusive] = useState(false);
  const [currency, setCurrency] = useState('EGP');

  // Preferences state
  const [enableSounds, setEnableSounds] = useState(true);
  const [darkMode, setDarkMode] = useState(false);
  const [allowExpiredSales, setAllowExpiredSales] = useState(false);

  // Load settings on mount
  useEffect(() => {
    if (!orgId) return;

    const fetchSettings = async () => {
      try {
        setIsLoading(true);
        const [orgRec, appSettings] = await Promise.all([
          SettingsRepository.getOrganization(orgId),
          SettingsRepository.getAppSettings(orgId)
        ]);

        if (orgRec) {
          setNameAr(orgRec.name || '');
          setNameEn(orgRec.legal_name || ''); // maps English name to legal_name field
          setActivityType(orgRec.activity_type || 'retail');
          setPhone(orgRec.phone || '');
          setEmail(orgRec.email || '');
          setAddress(orgRec.address || '');
          setTaxNumber(orgRec.tax_number || '');
          setCurrency(orgRec.currency || 'EGP');
        }

        const soundSetting = appSettings.find((s) => s.id === 'enable_sounds');
        const expiredSetting = appSettings.find((s) => s.id === 'allow_expired_sales');
        const vatSetting = appSettings.find((s) => s.id === 'vat_rate');
        const enableTaxSetting = appSettings.find((s) => s.id === 'enable_tax');
        const taxInclusiveSetting = appSettings.find((s) => s.id === 'is_tax_inclusive');

        setEnableSounds(soundSetting ? soundSetting.value === 'true' : true);
        setAllowExpiredSales(expiredSetting ? expiredSetting.value === 'true' : false);
        setVatRate(vatSetting?.value || '14');
        setEnableTax(enableTaxSetting ? enableTaxSetting.value === 'true' : false);
        setIsTaxInclusive(taxInclusiveSetting ? taxInclusiveSetting.value === 'true' : false);

        // Check local storage for dark mode state
        const savedTheme = localStorage.getItem('falcon_theme');
        const prefersDark = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
        setDarkMode(savedTheme === 'dark' || (!savedTheme && prefersDark));
      } catch (err) {
        console.error('Error loading settings:', err);
        toast.error('حدث خطأ أثناء تحميل الإعدادات');
      } finally {
        setIsLoading(false);
      }
    };

    fetchSettings();
  }, [orgId]);

  // Save changes handler
  const handleSaveChanges = async () => {
    if (!nameAr.trim()) {
      toast.error('اسم المؤسسة باللغة العربية مطلوب');
      return;
    }

    try {
      setIsSaving(true);

      // Save organization details
      await SettingsRepository.updateOrganization(orgId, {
        name: nameAr.trim(),
        legal_name: nameEn.trim() || undefined,
        activity_type: activityType,
        phone: phone.trim() || undefined,
        email: email.trim() || undefined,
        address: address.trim() || undefined,
        tax_number: taxNumber.trim() || undefined,
        currency: currency,
      });

      // Save app settings preferences
      await Promise.all([
        SettingsRepository.setSetting(orgId, 'enable_sounds', String(enableSounds), 'تفعيل الأصوات والتنبيهات الصوتية'),
        SettingsRepository.setSetting(orgId, 'allow_expired_sales', String(allowExpiredSales), 'السماح ببيع المنتجات منتهية الصلاحية'),
        SettingsRepository.setSetting(orgId, 'enable_tax', String(enableTax), 'تفعيل ضريبة القيمة المضافة (اختيارية)'),
        SettingsRepository.setSetting(orgId, 'is_tax_inclusive', String(isTaxInclusive), 'هل الأسعار المعروضة شاملة الضريبة'),
        SettingsRepository.setSetting(orgId, 'vat_rate', vatRate, 'نسبة ضريبة القيمة المضافة الافتراضية (%)')
      ]);

      toast.success('تم حفظ التغييرات وإعدادات النظام بنجاح');

      // Dispatch custom event to notify layout of name change if needed
      window.dispatchEvent(new Event('storage'));
    } catch (err) {
      console.error('Error saving settings:', err);
      toast.error('حدث خطأ أثناء حفظ الإعدادات');
    } finally {
      setIsSaving(false);
    }
  };

  // Toggle Dark Mode natively with layout
  const handleToggleDarkMode = (checked: boolean) => {
    setDarkMode(checked);
    localStorage.setItem('falcon_theme', checked ? 'dark' : 'light');
    window.dispatchEvent(new Event('falcon_theme_change'));
  };

  // Advanced Operations: Clear all transactional and stock history
  const handleResetOperations = async () => {
    const confirmed = window.confirm(
      'تحذير حرج: هل أنت متأكد من تصفير كافة العمليات والمخزون؟\n\nسيقوم هذا الإجراء بحذف جميع فواتير المبيعات، المشتريات، المرتجعات، المصروفات، والورديات بالكامل وتصفير كميات المخزون مع الحفاظ على المنتجات والعملاء والموردين كما هي.'
    );
    if (!confirmed) return;

    try {
      setIsResetting(true);
      await SettingsRepository.resetOperationsAndInventory();
      toast.success('تم تصفير العمليات وحسابات المخزون بالكامل بنجاح');
    } catch (err) {
      console.error('Error resetting operations:', err);
      toast.error('حدث خطأ أثناء محاولة تصفير العمليات');
    } finally {
      setIsResetting(false);
    }
  };

  // Advanced Operations: Factory Reset/Delete Local Account entirely
  const handleDeleteAccount = async () => {
    const firstConfirm = window.confirm(
      'خطر شديد: أنت على وشك حذف كافة بيانات هذا الحساب نهائياً ومسح المنظومة بالكامل!\n\nسيتم حذف المؤسسة، الفروع، المستخدمين، المنتجات، وجميع المعاملات المالية والمخزنية بلا استثناء. هل تود الاستمرار؟'
    );
    if (!firstConfirm) return;

    const secondConfirm = window.prompt(
      'لتأكيد الحذف النهائي الشامل، يرجى كتابة كلمة "مسح" في الحقل أدناه:'
    );
    if (secondConfirm !== 'مسح') {
      toast.error('تم إلغاء عملية الحذف لعدم تطابق كلمة التأكيد');
      return;
    }

    try {
      setIsDeletingAccount(true);
      await SettingsRepository.deleteAccountEntirely();
      localStorage.clear();
      toast.success('تم حذف كافة بيانات الحساب بنجاح، جاري إعادة توجيهك...');
      setTimeout(() => {
        router.push('/register');
      }, 1500);
    } catch (err) {
      console.error('Error deleting account:', err);
      toast.error('حدث خطأ أثناء حذف بيانات المنظومة');
    } finally {
      setIsDeletingAccount(false);
    }
  };

  // Save changes button component passed to top bar
  const headerActions = (
    <Button
      onClick={handleSaveChanges}
      disabled={isSaving || isLoading}
      className="bg-[#2563eb] hover:bg-blue-700 text-white font-black text-xs px-5 py-2.5 rounded-xl flex items-center gap-2 transition-all cursor-pointer shadow-md shadow-blue-500/10"
    >
      <Save className="w-4 h-4" />
      {isSaving ? 'جاري الحفظ...' : 'حفظ التغييرات'}
    </Button>
  );

  if (isLoading) {
    return (
      <AppShell title="إعدادات النظام" subtitle="تخصيص بيانات المؤسسة، الهوية، وتفضيلات الواجهة والأصوات.">
        <div className="flex flex-col items-center justify-center py-20 gap-3">
          <div className="w-8 h-8 border-3 border-blue-600 border-t-transparent rounded-full animate-spin" />
          <span className="text-xs font-bold text-slate-400">جاري تحميل إعدادات المنظومة...</span>
        </div>
      </AppShell>
    );
  }

  return (
    <AppShell
      title="إعدادات النظام"
      subtitle="تخصيص بيانات المؤسسة، الهوية، وتفضيلات الواجهة والأصوات."
      actions={headerActions}
    >
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 text-right" dir="rtl">

        {/* ==================== LEFT COLUMN: SUMMARY & DANGER ZONE ==================== */}
        <div className="space-y-6">

          {/* Card 1: Institution Summary Card */}
          <div className="bg-white dark:bg-[#131b2e] rounded-2xl border border-slate-200/80 dark:border-slate-800 p-5 shadow-xs transition-colors">
            <div className="flex items-center gap-4 border-b border-slate-100 dark:border-slate-800/80 pb-4 mb-4">
              <div className="w-14 h-14 rounded-2xl bg-blue-50 dark:bg-blue-950/50 text-[#2563eb] dark:text-blue-400 flex items-center justify-center shrink-0 shadow-inner">
                <Building2 className="w-7 h-7" />
              </div>
              <div className="min-w-0 flex-1">
                <h3 className="font-black text-slate-900 dark:text-white text-base truncate">
                  {nameAr || 'مؤسستي'}
                </h3>
                <p className="text-xs font-bold text-slate-400 mt-0.5 font-mono truncate">
                  {nameEn || 'My Business'}
                </p>
              </div>
            </div>

            <div className="space-y-3 text-xs font-bold text-slate-600 dark:text-slate-400">
              <div className="flex items-center justify-between">
                <span className="text-slate-400 font-medium">نوع النشاط</span>
                <span className="text-emerald-700 dark:text-emerald-400 font-black">
                  {activityType === 'supermarket' ? 'سوبرماركت ومواد غذائية' :
                   activityType === 'clothing' ? 'ملابس وأحذية وأزياء' :
                   activityType === 'electronics' ? 'أجهزة وإلكترونيات' :
                   activityType === 'hardware' ? 'حدايد وبويات وقطع غيار' :
                   activityType === 'pharmacy' ? 'صيدلية ومستلزمات' :
                   activityType === 'services' ? 'خدمات ومطاعم' : 'تجارة عامة وتجزئة'}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-400 font-medium">الفرع النشط</span>
                <span className="text-slate-900 dark:text-white">الفرع الرئيسي</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-400 font-medium">البريد المسجل</span>
                <span className="text-slate-900 dark:text-white font-mono truncate max-w-[180px]">
                  {email || 'غير محدد'}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-400 font-medium">الرقم الضريبي</span>
                <span className="text-slate-900 dark:text-white">
                  {taxNumber || 'غير محدد'}
                </span>
              </div>
              <div className="flex items-center justify-between pt-2 border-t border-slate-100 dark:border-slate-800/60">
                <span className="text-slate-400 font-medium">حالة النظام</span>
                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-emerald-50 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-400 text-[10px] font-black">
                  <CheckCircle2 className="w-3 h-3 text-emerald-500" />
                  مؤسسي نشط (Enterprise)
                </span>
              </div>
            </div>
          </div>

          {/* Card 2: Danger Zone Card */}
          <div className="bg-white dark:bg-[#131b2e] rounded-2xl border border-slate-200/80 dark:border-slate-800 p-5 shadow-xs space-y-4 transition-colors">
            <div className="flex items-center gap-2 text-red-600 dark:text-red-400 border-b border-slate-100 dark:border-slate-800/80 pb-3">
              <AlertTriangle className="w-5 h-5 animate-pulse" />
              <h3 className="text-xs font-black uppercase tracking-wider">منطقة الخطر والعمليات المتقدمة</h3>
            </div>

            {/* Sub-Action 1: Reset by Date Range (New Feature) */}
            <div className="bg-red-50/50 dark:bg-red-950/20 border border-red-200/60 dark:border-red-900/40 rounded-xl p-3.5 space-y-3">
              <div className="flex items-start gap-2.5">
                <div className="w-5 h-5 rounded-md bg-red-600 text-white flex items-center justify-center text-[10px] font-black shrink-0 mt-0.5">
                  <CalendarDays className="w-3.5 h-3.5" />
                </div>
                <div>
                  <h4 className="text-xs font-black text-red-900 dark:text-red-300">تصفير المبيعات والمشتريات حسب المدة</h4>
                  <p className="text-[10px] font-medium text-red-700/80 dark:text-red-400/80 leading-relaxed mt-1">
                    حذف فواتير المبيعات، المشتريات، والمرتجعات خلال فترة يحددها صاحب المنشأة، مع معاينة حية للأعداد وخيارات متقدمة للمخزون والخزينة.
                  </p>
                </div>
              </div>
              <Button
                onClick={() => setIsPeriodResetOpen(true)}
                className="w-full h-9 bg-red-600 hover:bg-red-700 text-white text-[11px] font-black rounded-lg transition-colors cursor-pointer shadow-xs flex items-center justify-center gap-1.5"
              >
                <CalendarDays className="w-3.5 h-3.5" />
                تحديد المدة وتصفير العمليات
              </Button>
            </div>

            {/* Sub-Action 2: Reset Operations & Inventory */}
            <div className="bg-amber-50/50 dark:bg-amber-950/20 border border-amber-200/60 dark:border-amber-900/40 rounded-xl p-3.5 space-y-3">
              <div className="flex items-start gap-2.5">
                <div className="w-5 h-5 rounded-md bg-amber-500 text-white flex items-center justify-center text-[10px] font-black shrink-0 mt-0.5">
                  🔄
                </div>
                <div>
                  <h4 className="text-xs font-black text-amber-800 dark:text-amber-400">تصفير العمليات والمخزون بالكامل</h4>
                  <p className="text-[10px] font-medium text-amber-600/90 dark:text-amber-500/80 leading-relaxed mt-1">
                    يمسح فواتير المبيعات، المشتريات، المرتجعات، المصروفات، والتشغيلات، ويصفر كميات المخزون إلى 0، مع الحفاظ التام على كروت الأصناف والمنتجات، العملاء، الموردين، والفروع.
                  </p>
                </div>
              </div>
              <Button
                onClick={handleResetOperations}
                disabled={isResetting}
                className="w-full h-9 bg-amber-600 hover:bg-amber-700 text-white text-[11px] font-black rounded-lg transition-colors cursor-pointer shadow-xs flex items-center justify-center gap-1.5"
              >
                {isResetting ? 'جاري تصفير البيانات...' : 'تصفير العمليات والمخزون بالكامل'}
              </Button>
            </div>

            {/* Sub-Action 2: Permanent Account Erasure */}
            <div className="space-y-2 pt-2">
              <p className="text-[11px] font-medium text-slate-400 leading-normal">
                حذف حساب المؤسسة نهائياً ومسح كافة الفروع والبيانات الأساسية والمستخدمين من هذا الجهاز بالكامل.
              </p>
              <Button
                onClick={handleDeleteAccount}
                disabled={isDeletingAccount}
                className="w-full h-9 bg-red-600 hover:bg-red-700 text-white text-[11px] font-black rounded-lg transition-colors cursor-pointer shadow-xs flex items-center justify-center gap-1.5"
              >
                <Trash2 className="w-3.5 h-3.5" />
                {isDeletingAccount ? 'جاري الحذف النهائي...' : 'حذف بيانات الحساب نهائياً'}
              </Button>
            </div>
          </div>

        </div>

        {/* ==================== RIGHT COLUMN: MAIN FORM CONTENT ==================== */}
        <div className="lg:col-span-2 space-y-6">

          {/* Card 1: Organization Identity */}
          <div className="bg-white dark:bg-[#131b2e] rounded-2xl border border-slate-200/80 dark:border-slate-800 p-5 shadow-xs space-y-4 transition-colors">
            <div className="flex items-center gap-2.5 border-b border-slate-100 dark:border-slate-800/80 pb-3">
              <div className="w-7 h-7 rounded-lg bg-blue-50 dark:bg-blue-950/40 text-[#2563eb] flex items-center justify-center shrink-0">
                <Building2 className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-xs font-black text-slate-900 dark:text-white">هوية المؤسسة والمنشأة</h3>
                <p className="text-[10px] font-semibold text-slate-400 mt-0.5">
                  الاسم الرسمي والبراند التجاري الذي يظهر في الفواتير والتقارير واللوحات الرسمية
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-[11px] font-black text-slate-700 dark:text-slate-300">
                  اسم المؤسسة / المنشأة (عربي) <span className="text-red-500">*</span>
                </label>
                <div className="relative group">
                  <Input
                    type="text"
                    value={nameAr}
                    onChange={(e) => setNameAr(e.target.value)}
                    placeholder="أدخل اسم منشأتك بالعربية"
                    className="h-10 bg-slate-50/60 dark:bg-slate-900/60 border-slate-200 dark:border-slate-800 rounded-xl pr-3 pl-9 text-xs font-bold text-slate-900 dark:text-white focus:bg-white transition-colors"
                  />
                  <Building2 className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  {nameAr && (
                    <button
                      onClick={() => setNameAr('')}
                      className="absolute left-8 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 rounded-full"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-[11px] font-black text-slate-700 dark:text-slate-300">
                  اسم المؤسسة / المنشأة (إنجليزي)
                </label>
                <div className="relative group">
                  <Input
                    type="text"
                    value={nameEn}
                    onChange={(e) => setNameEn(e.target.value)}
                    placeholder="Enter business name in English"
                    className="h-10 bg-slate-50/60 dark:bg-slate-900/60 border-slate-200 dark:border-slate-800 rounded-xl pr-3 pl-9 text-xs font-bold text-slate-900 dark:text-white focus:bg-white transition-colors font-mono text-left"
                    dir="ltr"
                  />
                  <Globe className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  {nameEn && (
                    <button
                      onClick={() => setNameEn('')}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 rounded-full"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              </div>

              <div className="space-y-1.5 md:col-span-2">
                <label className="text-[11px] font-black text-slate-700 dark:text-slate-300">
                  نوع النشاط التجاري
                </label>
                <Select value={activityType} onValueChange={setActivityType}>
                  <SelectTrigger className="h-10 bg-slate-50/60 dark:bg-slate-900/60 border-slate-200 dark:border-slate-800 rounded-xl text-xs font-bold text-slate-900 dark:text-white">
                    <SelectValue placeholder="اختر نوع النشاط" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="retail">تجارة عامة وتجزئة وجملة</SelectItem>
                    <SelectItem value="supermarket">سوبرماركت ومواد غذائية</SelectItem>
                    <SelectItem value="clothing">ملابس وأحذية وأزياء</SelectItem>
                    <SelectItem value="electronics">أجهزة وإلكترونيات وكمبيوتر</SelectItem>
                    <SelectItem value="hardware">حدايد وبويات وقطع غيار ومواد بناء</SelectItem>
                    <SelectItem value="pharmacy">صيدلية ومستلزمات طبية</SelectItem>
                    <SelectItem value="services">خدمات ومطاعم وكافيهات</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>

          {/* Card 2: Contact & Taxes Info */}
          <div className="bg-white dark:bg-[#131b2e] rounded-2xl border border-slate-200/80 dark:border-slate-800 p-5 shadow-xs space-y-4 transition-colors">
            <div className="flex items-center gap-2.5 border-b border-slate-100 dark:border-slate-800/80 pb-3">
              <div className="w-7 h-7 rounded-lg bg-teal-50 dark:bg-teal-950/40 text-teal-600 flex items-center justify-center shrink-0">
                <FileText className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-xs font-black text-slate-900 dark:text-white">معلومات الاتصال والضرائب</h3>
                <p className="text-[10px] font-semibold text-slate-400 mt-0.5">
                  بيانات التواصل الرسمي والرقم الضريبي لإصدار فواتير قانونية متوافقة مع الجهات الرقابية
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-[11px] font-black text-slate-700 dark:text-slate-300">
                  رقم الهاتف / الواتساب
                </label>
                <div className="relative group">
                  <Input
                    type="text"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="مثال: 0100XXXXXXX"
                    className="h-10 bg-slate-50/60 dark:bg-slate-900/60 border-slate-200 dark:border-slate-800 rounded-xl pr-9 pl-3 text-xs font-bold text-slate-900 dark:text-white focus:bg-white transition-colors"
                  />
                  <Phone className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-[11px] font-black text-slate-700 dark:text-slate-300">
                  البريد الإلكتروني الأساسي
                </label>
                <div className="relative group">
                  <Input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="business@example.com"
                    className="h-10 bg-slate-50/60 dark:bg-slate-900/60 border-slate-200 dark:border-slate-800 rounded-xl pr-9 pl-3 text-xs font-bold text-slate-900 dark:text-white focus:bg-white transition-colors font-mono"
                  />
                  <Mail className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-[11px] font-black text-slate-700 dark:text-slate-300">
                  الرقم الضريبي
                </label>
                <div className="relative group">
                  <Input
                    type="text"
                    value={taxNumber}
                    onChange={(e) => setTaxNumber(e.target.value)}
                    placeholder="سجل الرقم الضريبي للشركة"
                    className="h-10 bg-slate-50/60 dark:bg-slate-900/60 border-slate-200 dark:border-slate-800 rounded-xl pr-9 pl-3 text-xs font-bold text-slate-900 dark:text-white focus:bg-white transition-colors font-mono"
                  />
                  <FileText className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-[11px] font-black text-slate-700 dark:text-slate-300">
                  العنوان بالتفصيل
                </label>
                <div className="relative group">
                  <Input
                    type="text"
                    value={address}
                    onChange={(e) => setAddress(e.target.value)}
                    placeholder="المحافظة، المدينة، اسم الشارع، المبنى"
                    className="h-10 bg-slate-50/60 dark:bg-slate-900/60 border-slate-200 dark:border-slate-800 rounded-xl pr-9 pl-3 text-xs font-bold text-slate-900 dark:text-white focus:bg-white transition-colors"
                  />
                  <MapPin className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                </div>
              </div>
            </div>
          </div>

          {/* Card 3: Global Financial Settings */}
          <div className="bg-white dark:bg-[#131b2e] rounded-2xl border border-slate-200/80 dark:border-slate-800 p-5 shadow-xs space-y-4 transition-colors">
            <div className="flex items-center gap-2.5 border-b border-slate-100 dark:border-slate-800/80 pb-3">
              <div className="w-7 h-7 rounded-lg bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 flex items-center justify-center shrink-0">
                <Percent className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-xs font-black text-slate-900 dark:text-white">الإعدادات المالية والضرائب</h3>
                <p className="text-[10px] font-semibold text-slate-400 mt-0.5">
                  الضريبة اختيارية في المنظومة، يمكنك تفعيلها أو تعطيلها وتحديد نسبتها
                </p>
              </div>
            </div>

            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-[11px] font-black text-slate-700 dark:text-slate-300">العملة الافتراضية</label>
                  <Select value={currency} onValueChange={setCurrency}>
                    <SelectTrigger className="h-10 bg-slate-50/60 dark:bg-slate-900/60 border-slate-200 dark:border-slate-800 rounded-xl text-xs font-bold">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="EGP">جنيه مصري (EGP)</SelectItem>
                      <SelectItem value="SAR">ريال سعودي (SAR)</SelectItem>
                      <SelectItem value="USD">دولار أمريكي (USD)</SelectItem>
                      <SelectItem value="AED">درهم إماراتي (AED)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="flex items-center justify-between p-3 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
                  <div className="space-y-0.5">
                    <span className="text-xs font-black text-slate-900 dark:text-white block">تفعيل ضريبة القيمة المضافة (اختيارية)</span>
                    <span className="text-[10px] text-slate-400 block">
                      {enableTax ? 'الضريبة مفعلة لعمليات البيع والشراء' : 'الضريبة معطلة حالياً (0%)'}
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setEnableTax(!enableTax)}
                    className={`w-11 h-6 rounded-full transition-colors relative shrink-0 cursor-pointer ${
                      enableTax ? 'bg-emerald-500' : 'bg-slate-300 dark:bg-slate-700'
                    }`}
                  >
                    <span
                      className={`absolute top-0.5 w-5 h-5 rounded-full bg-white shadow-xs transition-all ${
                        enableTax ? 'right-0.5' : 'right-[22px]'
                      }`}
                    />
                  </button>
                </div>
              </div>

              {enableTax && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2 border-t border-slate-100 dark:border-slate-800 animate-in fade-in duration-150">
                  <div className="space-y-1.5">
                    <label className="text-[11px] font-black text-slate-700 dark:text-slate-300">نسبة الضريبة الافتراضية (%)</label>
                    <div className="relative group">
                      <Input
                        type="number"
                        value={vatRate}
                        onChange={(e) => setVatRate(e.target.value)}
                        className="h-10 bg-slate-50/60 dark:bg-slate-900/60 border-slate-200 dark:border-slate-800 rounded-xl pr-3 text-xs font-bold"
                      />
                      <Percent className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
                    </div>
                  </div>

                  <div className="flex items-center justify-between p-3 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
                    <div className="space-y-0.5">
                      <span className="text-xs font-black text-slate-900 dark:text-white block">الأسعار تشمل الضريبة</span>
                      <span className="text-[10px] text-slate-400 block">
                        {isTaxInclusive ? 'الأسعار المسجلة بالأصناف شاملة للضريبة' : 'تضاف الضريبة فوق سعر الصنف'}
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={() => setIsTaxInclusive(!isTaxInclusive)}
                      className={`w-11 h-6 rounded-full transition-colors relative shrink-0 cursor-pointer ${
                        isTaxInclusive ? 'bg-emerald-500' : 'bg-slate-300 dark:bg-slate-700'
                      }`}
                    >
                      <span
                        className={`absolute top-0.5 w-5 h-5 rounded-full bg-white shadow-xs transition-all ${
                          isTaxInclusive ? 'right-0.5' : 'right-[22px]'
                        }`}
                      />
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Card 4: System Preferences & Behaviors */}
          <div className="bg-white dark:bg-[#131b2e] rounded-2xl border border-slate-200/80 dark:border-slate-800 p-5 shadow-xs space-y-4 transition-colors">
            <div className="flex items-center gap-2.5 border-b border-slate-100 dark:border-slate-800/80 pb-3">
              <div className="w-7 h-7 rounded-lg bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 flex items-center justify-center shrink-0">
                <Volume2 className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-xs font-black text-slate-900 dark:text-white">تفضيلات وسلوك النظام</h3>
                <p className="text-[10px] font-semibold text-slate-400 mt-0.5">
                  التحكم في المؤثرات والوضع البصري وسياسات البيع الفورية داخل المنظومة
                </p>
              </div>
            </div>

            <div className="space-y-4 divider-y divider-slate-100 dark:divider-slate-800/60">

              {/* Preference 1: Sounds */}
              <div className="flex items-center justify-between gap-4 py-2">
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 rounded-lg bg-slate-100 dark:bg-slate-900 text-slate-500 flex items-center justify-center shrink-0 mt-0.5">
                    <Volume2 className="w-4 h-4 text-indigo-500" />
                  </div>
                  <div>
                    <h4 className="text-xs font-black text-slate-800 dark:text-slate-200">تفعيل الأصوات والتنبيهات الصوتية</h4>
                    <p className="text-[10px] font-medium text-slate-400 mt-0.5 leading-relaxed">
                      تشغيل نغمات تأكيد مسح الباركود، إضافة الأصناف، واعتماد الفواتير في شاشة الكاشير والمبيعات.
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setEnableSounds(!enableSounds)}
                  className={`w-11 h-6 rounded-full transition-colors relative shrink-0 cursor-pointer ${
                    enableSounds ? 'bg-emerald-500' : 'bg-slate-300 dark:bg-slate-700'
                  }`}
                >
                  <span
                    className={`absolute top-0.5 w-5 h-5 rounded-full bg-white shadow-xs transition-all ${
                      enableSounds ? 'right-0.5' : 'right-[22px]'
                    }`}
                  />
                </button>
              </div>

              {/* Preference 2: Dark Mode */}
              <div className="flex items-center justify-between gap-4 py-2 border-t border-slate-50 dark:border-slate-800/40 pt-4">
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 rounded-lg bg-slate-100 dark:bg-slate-900 text-slate-500 flex items-center justify-center shrink-0 mt-0.5">
                    <Moon className="w-4 h-4 text-purple-500" />
                  </div>
                  <div>
                    <h4 className="text-xs font-black text-slate-800 dark:text-slate-200">الوضع الليلي المريح (Dark Mode)</h4>
                    <p className="text-[10px] font-medium text-slate-400 mt-0.5 leading-relaxed">
                      تبديل ألوان الواجهة للنمط الداكن المريح للعين لتقليل الجهد البصري في فترات العمل الطويلة والمستمرة.
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => handleToggleDarkMode(!darkMode)}
                  className={`w-11 h-6 rounded-full transition-colors relative shrink-0 cursor-pointer ${
                    darkMode ? 'bg-emerald-500' : 'bg-slate-300 dark:bg-slate-700'
                  }`}
                >
                  <span
                    className={`absolute top-0.5 w-5 h-5 rounded-full bg-white shadow-xs transition-all ${
                      darkMode ? 'right-0.5' : 'right-[22px]'
                    }`}
                  />
                </button>
              </div>

              {/* Preference 3: Allow selling expired items */}
              <div className="flex items-center justify-between gap-4 py-2 border-t border-slate-50 dark:border-slate-800/40 pt-4">
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 rounded-lg bg-slate-100 dark:bg-slate-900 text-slate-500 flex items-center justify-center shrink-0 mt-0.5">
                    <CalendarDays className="w-4 h-4 text-amber-500" />
                  </div>
                  <div>
                    <h4 className="text-xs font-black text-slate-800 dark:text-slate-200">السماح ببيع المنتجات منتهية الصلاحية / التالفة</h4>
                    <p className="text-[10px] font-medium text-slate-400 mt-0.5 leading-relaxed">
                      عند التعطيل، سيمنع النظام تلقائياً إضافة أي صنف منتهي الصلاحية أو تم وسمه كتالف لسلة البيع حماية للجودة.
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setAllowExpiredSales(!allowExpiredSales)}
                  className={`w-11 h-6 rounded-full transition-colors relative shrink-0 cursor-pointer ${
                    allowExpiredSales ? 'bg-emerald-500' : 'bg-slate-300 dark:bg-slate-700'
                  }`}
                >
                  <span
                    className={`absolute top-0.5 w-5 h-5 rounded-full bg-white shadow-xs transition-all ${
                      allowExpiredSales ? 'right-0.5' : 'right-[22px]'
                    }`}
                  />
                </button>
              </div>

            </div>
          </div>

        </div>

      </div>

      {/* Period Reset Modal for Sales & Purchases */}
      <ResetPeriodModal
        isOpen={isPeriodResetOpen}
        onClose={() => setIsPeriodResetOpen(false)}
        orgId={orgId}
        userId={currentUser?.id}
        userName={currentUser?.full_name || currentUser?.username}
        currency={currency}
        onSuccess={() => {
          // Trigger re-render / reload if needed
          window.dispatchEvent(new Event('storage'));
        }}
      />
    </AppShell>
  );
}
