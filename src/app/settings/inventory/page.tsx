'use client';

import React, { useEffect, useState } from'react';
import { AppShell } from'@/components/layout/AppShell';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { useSessionStore } from '@/core/state/useSessionStore';
import { SettingsRepository } from'@/modules/settings/settings_repository';
import { toast } from'sonner';
import {
 Save,
 ShieldCheck,
 PackageCheck,
 Printer,
 Coins,
 AlertTriangle,
 History,
 TrendingUp,
 Clock,
 Layers
} from'lucide-react';

export default function InventoryPoliciesPage() {
 const { currentUser } = useSessionStore();
 const orgId = currentUser?.org_id ||'';

 // Action / Loading states
 const [isLoading, setIsLoading] = useState(true);
 const [isSaving, setIsSaving] = useState(false);

 // Stats / Inputs Form State
 const [defaultReorderQty, setDefaultReorderQty] = useState('1');
 const [expiryAlertDays, setExpiryAlertDays] = useState('90');
 const [smartExpiryNotifications, setSmartExpiryNotifications] = useState(false);
 const [autoPrintInvoice, setAutoPrintInvoice] = useState(true);
 const [autoOpenCashDrawer, setAutoOpenCashDrawer] = useState(true);

 // Load configuration from repository on mount
 useEffect(() => {
 if (!orgId) return;

 const loadSettings = async () => {
 try {
 setIsLoading(true);
 const settings = await SettingsRepository.getAppSettings(orgId);

 const reorderQty = settings.find((s) => s.id ==='default_reorder_qty');
 const alertDays = settings.find((s) => s.id ==='expiry_alert_days');
 const smartExpiry = settings.find((s) => s.id ==='smart_expiry_notifications');
 const printInv = settings.find((s) => s.id ==='auto_print_invoice_pos');
 const openDrawer = settings.find((s) => s.id ==='auto_open_cash_drawer');

 if (reorderQty) setDefaultReorderQty(reorderQty.value);
 if (alertDays) setExpiryAlertDays(alertDays.value);
 if (smartExpiry) setSmartExpiryNotifications(smartExpiry.value ==='true');
 if (printInv) setAutoPrintInvoice(printInv.value ==='true');
 if (openDrawer) setAutoOpenCashDrawer(openDrawer.value ==='true');
 } catch (err) {
 console.error('Error loading inventory policy settings:', err);
 toast.error('حدث خطأ أثناء تحميل سياسات المخزون');
 } finally {
 setIsLoading(false);
 }
 };

 loadSettings();
 }, [orgId]);

 // Save changes handler
 const handleSavePolicies = async () => {
 try {
 setIsSaving(true);
 await Promise.all([
 SettingsRepository.setSetting(orgId,'default_reorder_qty', defaultReorderQty,'حد تنبيه النواقص الافتراضي (قطع)'),
 SettingsRepository.setSetting(orgId,'expiry_alert_days', expiryAlertDays,'أيام التنبيه قبل انتهاء الصلاحية'),
 SettingsRepository.setSetting(orgId,'smart_expiry_notifications', String(smartExpiryNotifications),'أتمتة وتوليد تنبيهات الصلاحية الذكية'),
 SettingsRepository.setSetting(orgId,'auto_print_invoice_pos', String(autoPrintInvoice),'طباعة الفاتورة تلقائياً فور الاعتماد في الـ POS'),
 SettingsRepository.setSetting(orgId,'auto_open_cash_drawer', String(autoOpenCashDrawer),'فتح درج النقدية تلقائياً (Cash Drawer Pulse)'),
 ]);
 toast.success('تم حفظ إعدادات وسياسات المخزون بنجاح');
 } catch (err) {
 console.error('Error saving inventory policies:', err);
 toast.error('حدث خطأ أثناء حفظ السياسات والإعدادات');
 } finally {
 setIsSaving(false);
 }
 };

 // Top action bar button layout component
 const headerActions = (
 <Button
 onClick={handleSavePolicies}
 disabled={isSaving || isLoading}
 className="bg-primary hover:bg-blue-700 text-white font-black text-xs px-5 py-2.5 rounded-xl flex items-center gap-2 transition-all cursor-pointer shadow-md shadow-blue-500/10"
 >
 <Save className="w-4 h-4"/>
 {isSaving ?'جاري الحفظ...':'حفظ الإعدادات'}
 </Button>
 );

 if (isLoading) {
 return (
 <AppShell title="سياسات المخزون"subtitle="إعدادات الأمان، النواقص، وخيارات الطباعة الآلية للمخزون.">
 <div className="flex flex-col items-center justify-center py-20 gap-3">
 <div className="w-8 h-8 border-3 border-blue-600 border-t-transparent rounded-full animate-spin"/>
 <span className="text-xs font-bold text-slate-400">جاري تحميل السياسات والضوابط...</span>
 </div>
 </AppShell>
 );
 }

 return (
 <AppShell
 title="سياسات المخزون"
 subtitle="إعدادات الأمان، النواقص، وخيارات الطباعة الآلية للمخزون."
 actions={headerActions}
 >
 <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 text-right"dir="rtl">

 {/* ==================== LEFT COLUMN: WORKFLOW CONTROLS SUMMARY ==================== */}
 <div className="space-y-4">

 <div className="bg-surface rounded-2xl border border-slate-200/80 dark:border-slate-800 p-5 shadow-2xs space-y-4">
 <div className="flex items-center gap-2.5 text-slate-800 dark:text-slate-200 border-b border-slate-100 dark:border-slate-800/80 pb-3">
 <div className="w-7 h-7 rounded-lg bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 flex items-center justify-center shrink-0">
 <Layers className="w-4 h-4"/>
 </div>
 <h3 className="text-xs font-black uppercase tracking-wider">الضوابط التشغيلية للمخزون</h3>
 </div>

 {/* Block 1: Default Reorder Alert Notice */}
 <div className="border border-amber-200/60 dark:border-amber-900/40 bg-amber-50/40 dark:bg-amber-950/10 rounded-xl p-3.5 space-y-1">
 <div className="flex items-center gap-2 text-amber-700 dark:text-amber-400 text-xs font-black">
 <AlertTriangle className="w-3.5 h-3.5"/>
 <span>تنبيه النواقص الافتراضي:</span>
 </div>
 <p className="text-2xs font-semibold text-slate-500 dark:text-slate-400 leading-normal pt-0.5">
 يتم استخدامه كقيمة قياسية عند إضافة صنف جديد، مع إمكانية تخصيص حد مستقل لكل منتج على حدة.
 </p>
 </div>

 {/* Block 2: Early Expiry Alert */}
 <div className="border border-teal-200/60 dark:border-teal-900/40 bg-teal-50/30 dark:bg-teal-950/10 rounded-xl p-3.5 space-y-1">
 <div className="flex items-center gap-2 text-teal-700 dark:text-teal-400 text-xs font-black">
 <Clock className="w-3.5 h-3.5"/>
 <span>إنذار الصلاحية المبكر:</span>
 </div>
 <p className="text-2xs font-semibold text-slate-500 dark:text-slate-400 leading-normal pt-0.5">
 يمنحك الفرصة لإرجاع السلع والمنتجات للشركات والموردين أو عمل عروض ترويجية قبل حلول تاريخ الانتهاء.
 </p>
 </div>

 {/* Block 3: Smart Dispatch (FEFO) */}
 <div className="border border-emerald-200/60 dark:border-emerald-900/40 bg-emerald-50/30 dark:bg-emerald-950/10 rounded-xl p-3.5 space-y-1">
 <div className="flex items-center gap-2 text-emerald-700 dark:text-emerald-400 text-xs font-black">
 <PackageCheck className="w-3.5 h-3.5"/>
 <span>الصرف الذكي (FEFO):</span>
 </div>
 <p className="text-2xs font-semibold text-slate-500 dark:text-slate-400 leading-normal pt-0.5">
 يقترح النظام التشغيلات الأقرب انتهاءً أولاً تلقائياً لمنع ركود وتلف المنتجات القديمة.
 </p>
 </div>

 </div>

 </div>

 {/* ==================== RIGHT COLUMN: MAIN SETTINGS CARDS ==================== */}
 <div className="lg:col-span-2 space-y-6">

 {/* Card 1: Reorder Levels & Stock Control */}
 <div className="bg-surface rounded-2xl border border-slate-200/80 dark:border-slate-800 p-5 shadow-2xs space-y-5">
 <div className="flex items-center gap-2.5 border-b border-slate-100 dark:border-slate-800/80 pb-3">
 <div className="w-7 h-7 rounded-lg bg-amber-50 dark:bg-amber-950/40 text-amber-600 flex items-center justify-center shrink-0">
 <ShieldCheck className="w-4 h-4"/>
 </div>
 <div>
 <h3 className="text-xs font-black text-slate-900 dark:text-white">رقابة المخزون ومستويات الأمان</h3>
 <p className="text-3xs font-semibold text-slate-400 mt-0.5">
 تحديد الحدود الدنيا للتنبيه بالنواقص وأيام الإنذار المبكر لانتهاء الصلاحية
 </p>
 </div>
 </div>

 {/* Fields Grid */}
 <div className="grid grid-cols-1 md:grid-cols-2 gap-4">

 {/* Field 1: Default Reorder Threshold */}
 <div className="space-y-2">
 <label className="text-2xs font-black text-slate-700 dark:text-slate-300">
 حد تنبيه النواقص الافتراضي (قطع)
 </label>
 <div className="relative group">
 <Input
 type="number"
 min={0}
 value={defaultReorderQty}
 onChange={(e) => setDefaultReorderQty(e.target.value)}
 className="h-10 bg-slate-50/60 dark:bg-slate-900/60 border-slate-200 dark:border-slate-800 rounded-xl pr-3 pl-10 text-xs font-bold font-mono focus:bg-white transition-colors"
 />
 <Layers className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400"/>
 </div>
 </div>

 {/* Field 2: Expiry Alert Days */}
 <div className="space-y-2">
 <label className="text-2xs font-black text-slate-700 dark:text-slate-300">
 أيام التنبيه قبل الانتهاء (يوم)
 </label>
 <div className="relative group">
 <Input
 type="number"
 min={0}
 value={expiryAlertDays}
 onChange={(e) => setExpiryAlertDays(e.target.value)}
 className="h-10 bg-slate-50/60 dark:bg-slate-900/60 border-slate-200 dark:border-slate-800 rounded-xl pr-3 pl-10 text-xs font-bold font-mono focus:bg-white transition-colors"
 />
 <Clock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400"/>
 </div>
 </div>

 </div>

 {/* Toggle Row: Smart Expiry Notifications */}
 <div className="flex items-center justify-between gap-4 pt-3 border-t border-slate-50 dark:border-slate-800/40">
 <div className="flex items-start gap-3">
 <div className="w-8 h-8 rounded-lg bg-blue-50 dark:bg-blue-950/40 text-blue-600 flex items-center justify-center shrink-0 mt-0.5">
 <TrendingUp className="w-4 h-4"/>
 </div>
            <div>
              <h4 className="text-xs font-black text-slate-800 dark:text-slate-200">أتمتة وتوليد تنبيهات الصلاحية الذكية</h4>
              <p className="text-3xs font-medium text-slate-400 mt-0.5 leading-relaxed">
                توليد إشعارات تنبيهية للمدير والمستخدمين تلقائياً للسلع والتشغيلات التي تقترب من تاريخ انتهائها.
              </p>
            </div>
          </div>
          <Switch
            checked={smartExpiryNotifications}
            onCheckedChange={setSmartExpiryNotifications}
          />
        </div>

      </div>

      {/* Card 2: Cashier & POS Devices Integration */}
      <div className="bg-surface rounded-2xl border border-slate-200/80 dark:border-slate-800 p-5 shadow-2xs space-y-4">
        <div className="flex items-center gap-2.5 border-b border-slate-100 dark:border-slate-800/80 pb-3">
          <div className="w-7 h-7 rounded-lg bg-blue-50 dark:bg-blue-950/40 text-blue-600 flex items-center justify-center shrink-0">
            <Printer className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-xs font-black text-slate-900 dark:text-white">خيارات الكاشير وأجهزة نقاط البيع POS</h3>
            <p className="text-3xs font-semibold text-slate-400 mt-0.5">
              التحكم في الأتمتة المباشرة أثناء إصدار الفواتير وصرف الأصناف للمشتري
            </p>
          </div>
        </div>

        <div className="space-y-4 divide-y divide-slate-100 dark:divide-slate-800/60">

          {/* Option 1: Auto Print Invoice */}
          <div className="flex items-center justify-between gap-4 py-2">
            <div className="flex items-start gap-3">
              <div className="w-8 h-8 rounded-lg bg-slate-100 dark:bg-slate-900 text-slate-500 flex items-center justify-center shrink-0 mt-0.5">
                <Printer className="w-4 h-4 text-indigo-500" />
              </div>
              <div>
                <h4 className="text-xs font-black text-slate-800 dark:text-slate-200">طباعة الفاتورة تلقائياً فور الاعتماد</h4>
                <p className="text-3xs font-medium text-slate-400 mt-0.5 leading-relaxed">
                  إرسال أمر الطباعة المباشر إلى الطابعة الحرارية بمجرد تأكيد عملية البيع دون فتح نافذة الطباعة.
                </p>
              </div>
            </div>
            <Switch
              checked={autoPrintInvoice}
              onCheckedChange={setAutoPrintInvoice}
            />
          </div>

          {/* Option 2: Auto Open Cash Drawer */}
          <div className="flex items-center justify-between gap-4 py-2 border-t border-slate-50 dark:border-slate-800/40 pt-4">
            <div className="flex items-start gap-3">
              <div className="w-8 h-8 rounded-lg bg-slate-100 dark:bg-slate-900 text-slate-500 flex items-center justify-center shrink-0 mt-0.5">
                <Coins className="w-4 h-4 text-emerald-500" />
              </div>
              <div>
                <h4 className="text-xs font-black text-slate-800 dark:text-slate-200">فتح درج النقدية تلقائياً (Cash Drawer Pulse)</h4>
                <p className="text-3xs font-medium text-slate-400 mt-0.5 leading-relaxed">
                  إرسال نبضة إلكترونية لفتح درج الكاشير فور إتمام عملية البيع النقدي.
                </p>
              </div>
            </div>
            <Switch
              checked={autoOpenCashDrawer}
              onCheckedChange={setAutoOpenCashDrawer}
            />
          </div>

        </div>
      </div>

 </div>

 </div>
 </AppShell>
 );
}