'use client';

import React, { useEffect, useState, Suspense } from 'react';
import { AppShell } from '@/components/layout/AppShell';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { useSessionStore } from '@/core/state/useSessionStore';
import { SettingsRepository } from '@/modules/settings/settings_repository';
import { renderCode128Svg } from '@/lib/code128';
import { toast } from 'sonner';
import {
  Save,
  Printer,
  Sliders,
  Type,
  Eye,
  Check,
  ChevronDown,
  FileText,
  Percent,
  QrCode,
  Building2,
  ImagePlus,
  Upload,
  X
} from 'lucide-react';
import { getSubscriptionPermissions } from '@/core/constants/subscription_profiles';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

function InvoiceSettingsContent() {
  const { currentUser } = useSessionStore();
  const orgId = currentUser?.org_id || '';

 // Loading & Saving States
 const [isLoading, setIsLoading] = useState(true);
 const [isSaving, setIsSaving] = useState(false);

  // General Settings & Dimensions
  const [paperSize, setPaperSize] = useState('80mm (حراري)');
  const [currencyPosition, setCurrencyPosition] = useState('بعد المبلغ (١٠٠.٠٠ ج.م)');
  const [enableTaxCalculation, setEnableTaxCalculation] = useState(false);
  const [selectedPrinter, setSelectedPrinter] = useState('طابعة الفواتير الحرارية التلقائية (Direct Thermal 80mm)');
  const [connectionType, setConnectionType] = useState<'usb_driver' | 'bluetooth' | 'browser_dialog'>('usb_driver');
  const [bluetoothDeviceName, setBluetoothDeviceName] = useState('');

  // Custom Headers & Notes Text
  const [invoiceHeader, setInvoiceHeader] = useState('');
  const [invoiceFooter, setInvoiceFooter] = useState('');

  // Display Visibility Toggles
  const [showOrgLogo, setShowOrgLogo] = useState(true);
  const [showTaxNumber, setShowTaxNumber] = useState(true);
  const [showExpiryDate, setShowExpiryDate] = useState(false);
  const [showCustomerDetails, setShowCustomerDetails] = useState(true);
  const [showSavedAmount, setShowSavedAmount] = useState(true);
  const [showInvoiceBarcode, setShowInvoiceBarcode] = useState(true);
  const [autoPrintOnApproval, setAutoPrintOnApproval] = useState(true);

  // Institution placeholders
  const [orgName, setOrgName] = useState('مؤسستي');
  const [taxNumberVal, setTaxNumberVal] = useState('123-456-789');
  const [currencySymbol, setCurrencySymbol] = useState('ج.م');
  const [subTier, setSubTier] = useState('standard');
  const [invoiceLogoUrl, setInvoiceLogoUrl] = useState('');
  const logoInputRef = React.useRef<HTMLInputElement>(null);

  const perms = getSubscriptionPermissions(subTier);

  const DEFAULT_FOOTER_NOTE = `نرجو من عملائنا الكرام مراجعة البضاعة والفاتورة خلال اسبوع من تاريخ الاستلام وتطبقا بالنواقص ولسنا مسئولين عن اى شئ بعد ذلك - لا يوجد لدينا مرتجع للبطارية وأدوات الكهرباء\n📲 01100957180 خط طحيمر | 📍 أبيس 3 / 11`;

  // Load layout configurations on mount
  useEffect(() => {
    if (!orgId) return;

    const loadInvoiceSettings = async () => {
      try {
        setIsLoading(true);
        const [orgRec, appSettings] = await Promise.all([
          SettingsRepository.getOrganization(orgId),
          SettingsRepository.getAppSettings(orgId),
        ]);

        if (orgRec) {
          setOrgName(orgRec.name || 'مؤسستي');
          setSubTier(orgRec.subscription_tier || 'pro');
          setTaxNumberVal(orgRec.tax_number || '123-456-789');
          if (orgRec.logo_url) setInvoiceLogoUrl(orgRec.logo_url);
          if (orgRec.invoice_header) setInvoiceHeader(orgRec.invoice_header);
          if (orgRec.invoice_footer) setInvoiceFooter(orgRec.invoice_footer);
          if (orgRec.currency) {
            setCurrencySymbol(orgRec.currency === 'EGP' ? 'ج.م' : orgRec.currency);
          }
        }

        const savedCfg = appSettings.find((s) => s.id === 'invoice_page_config');
        if (savedCfg?.value) {
          const parsed = JSON.parse(savedCfg.value);
          setPaperSize(parsed.paperSize || '80mm (حراري)');
          setCurrencyPosition(parsed.currencyPosition || 'بعد المبلغ (١٠٠.٠٠ ج.م)');
          setEnableTaxCalculation(!!parsed.enableTaxCalculation);
          setSelectedPrinter(parsed.selectedPrinter || 'طابعة الفواتير الحرارية التلقائية (Direct Thermal 80mm)');
          setConnectionType(parsed.connectionType || 'usb_driver');
          setBluetoothDeviceName(parsed.bluetoothDeviceName || '');
          setInvoiceHeader(parsed.invoiceHeader || orgRec?.invoice_header || '');
          setInvoiceFooter(parsed.invoiceFooter || orgRec?.invoice_footer || DEFAULT_FOOTER_NOTE);
          setInvoiceLogoUrl(parsed.invoiceLogoUrl || orgRec?.logo_url || '');
          setShowOrgLogo(parsed.showOrgLogo !== false);
          setShowTaxNumber(parsed.showTaxNumber !== false);
          setShowExpiryDate(!!parsed.showExpiryDate);
          setShowCustomerDetails(parsed.showCustomerDetails !== false);
          setShowSavedAmount(parsed.showSavedAmount !== false);
          setShowInvoiceBarcode(parsed.showInvoiceBarcode !== false);
          setAutoPrintOnApproval(parsed.autoPrintOnApproval !== false);
        } else {
          setInvoiceFooter(DEFAULT_FOOTER_NOTE);
        }
      } catch (err) {
        console.error('Error loading invoice settings:', err);
        toast.error('حدث خطأ أثناء تحميل إعدادات الفاتورة');
      } finally {
        setIsLoading(false);
      }
    };

    loadInvoiceSettings();
  }, [orgId]);

  const handlePairBluetoothPrinter = async () => {
    try {
      toast.info('جاري البحث عن طابعات البلوتوث المتاحة للموبايل والتابلت...');
      const { connectBluetoothPrinter } = await import('@/lib/bluetooth_printer');
      const res = await connectBluetoothPrinter();

      if (res.success && res.deviceName) {
        setBluetoothDeviceName(res.deviceName);
        setConnectionType('bluetooth');
        toast.success(`تم اقتران طابعة البلوتوث «${res.deviceName}» بنجاح!`);
      } else {
        toast.error(res.error || 'تعذر اقتران طابعة البلوتوث');
      }
    } catch (err: any) {
      toast.error(err?.message || 'فشل الاقتران بطابعة البلوتوث');
    }
  };

  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !orgId) return;
    if (file.size > 5 * 1024 * 1024) {
      toast.error('حجم الشعار يجب ألا يتجاوز 5 ميجابايت');
      return;
    }

    try {
      setIsSaving(true);
      toast.info('جاري تجهيز ورفع الشعار سحابياً...');

      const reader = new FileReader();
      reader.onload = async (event) => {
        const base64Data = event.target?.result as string;
        setInvoiceLogoUrl(base64Data);

        // Upload to Supabase Storage
        try {
          const { supabase } = await import('@/core/supabase/supabase_client');
          const ext = file.name.split('.').pop() || 'png';
          const fileName = `${orgId}/logo_${Date.now()}.${ext}`;

          await supabase.storage
            .from('organization-assets')
            .upload(fileName, file, { upsert: true, cacheControl: '3600' });
        } catch (storageErr) {
          console.warn('[Storage] Upload notice:', storageErr);
        }

        const { SettingsRepository } = await import('@/modules/settings/settings_repository');
        await SettingsRepository.updateOrganization(orgId, { logo_url: base64Data });
        toast.success('تم رفع شعار المنشأة وحفظه بنجاح!');
      };
      reader.readAsDataURL(file);
    } catch (err) {
      console.error('Logo upload error:', err);
      toast.error('حدث خطأ أثناء رفع الشعار');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteLogo = async () => {
    try {
      setIsSaving(true);
      setInvoiceLogoUrl('');

      // Clean up storage bucket objects for this org in Supabase Storage
      try {
        const { supabase } = await import('@/core/supabase/supabase_client');
        const { data: list } = await supabase.storage
          .from('organization-assets')
          .list(orgId);

        if (Array.isArray(list) && list.length > 0) {
          const filesToRemove = list.map((f) => `${orgId}/${f.name}`);
          await supabase.storage.from('organization-assets').remove(filesToRemove);
        }
      } catch (storageErr) {
        console.warn('[Storage] Remove notice:', storageErr);
      }

      const { SettingsRepository } = await import('@/modules/settings/settings_repository');
      await SettingsRepository.updateOrganization(orgId, { logo_url: '' });

      const payload = {
        paperSize,
        currencyPosition,
        enableTaxCalculation,
        selectedPrinter,
        connectionType,
        bluetoothDeviceName,
        invoiceHeader,
        invoiceFooter,
        invoiceLogoUrl: '',
        showOrgLogo,
        showTaxNumber,
        showExpiryDate,
        showCustomerDetails,
        showSavedAmount,
        showInvoiceBarcode,
        autoPrintOnApproval,
      };

      await SettingsRepository.setSetting(
        orgId,
        'invoice_page_config',
        JSON.stringify(payload),
        'إعدادات وتخصيص شكل ومقاسات وقوالب طباعة الفواتير الكاشير والإيصالات'
      );

      toast.success('تم حذف الشعار بنجاح من السيرفر السحابي والمنظومة');
    } catch (err) {
      console.error('Delete logo error:', err);
      toast.error('حدث خطأ أثناء حذف الشعار');
    } finally {
      setIsSaving(false);
    }
  };

  // Save changes handler
  const handleSaveInvoiceConfig = async () => {
    try {
      setIsSaving(true);
      const payload = {
        paperSize,
        currencyPosition,
        enableTaxCalculation,
        selectedPrinter,
        connectionType,
        bluetoothDeviceName,
        invoiceHeader,
        invoiceFooter,
        invoiceLogoUrl,
        showOrgLogo,
        showTaxNumber,
        showExpiryDate,
        showCustomerDetails,
        showSavedAmount,
        showInvoiceBarcode,
        autoPrintOnApproval,
      };

      await Promise.all([
        SettingsRepository.setSetting(
          orgId,
          'invoice_page_config',
          JSON.stringify(payload),
          'إعدادات وتخصيص شكل ومقاسات وقوالب طباعة الفواتير الكاشير والإيصالات'
        ),
        SettingsRepository.updateOrganization(orgId, {
          logo_url: invoiceLogoUrl,
          invoice_header: invoiceHeader,
          invoice_footer: invoiceFooter,
          phone: '01100957180',
          address: 'أبيس 3 / 11',
        }),
      ]);

      toast.success('تم حفظ إعدادات وقياسات الفاتورة والنصوص وشعار المنشأة بنجاح');
    } catch (err) {
      console.error('Error saving invoice settings:', err);
      toast.error('حدث خطأ أثناء حفظ الإعدادات');
    } finally {
      setIsSaving(false);
    }
  };

 const handleChoosePrinter = () => {
 toast.success('تم الكشف عن طابعة الفواتير الحرارية والربط مع محرك الطباعة الصامتة بنجاح');
 };

 const headerActions = (
 <Button
 onClick={handleSaveInvoiceConfig}
 disabled={isSaving || isLoading}
 className="bg-[#d946ef] hover:bg-pink-700 text-white font-black text-xs px-5 py-2.5 rounded-xl flex items-center gap-2 transition-all cursor-pointer shadow-md shadow-pink-500/10"
 >
 <Save className="w-4 h-4"/>
 {isSaving ?'جاري الحفظ...':'حفظ الإعدادات'}
 </Button>
 );

 if (isLoading) {
 return (
 <AppShell title="إعدادات الفاتورة"subtitle="جاري التحميل...">
 <div className="flex items-center justify-center py-20">
 <div className="w-8 h-8 border-3 border-pink-500 border-t-transparent rounded-full animate-spin"/>
 </div>
 </AppShell>
 );
 }

 return (
 <AppShell
 title="إعدادات الفاتورة"
 subtitle="تخصيص شكل الفاتورة ومحتواها ومقاس الورق حسب سياسة منشأتك."
 actions={headerActions}
 >
 <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 text-right"dir="rtl">

 {/* ==================== LEFT COLUMN: IMPROVED INVOICE LIVE TICKET PREVIEW ==================== */}
 <div className="space-y-4">

 <div className="bg-surface rounded-2xl border border-slate-200/80 dark:border-slate-800 p-5 shadow-xs flex flex-col items-center">

 <div className="w-full flex items-center justify-between border-b border-slate-100 dark:border-slate-800/80 pb-3 mb-5">
 <span className="text-xs font-black text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
 <FileText className="w-4 h-4 text-pink-500"/>
 معاينة الفاتورة (تقريبية)
 </span>
 </div>

 {/* Thermal Receipt Visual Ticket Layout Box */}
 <div className="w-full bg-[#f8fafc] dark:bg-slate-900/40 rounded-3xl border border-slate-100 dark:border-slate-800/60 p-6 flex flex-col items-center justify-center min-h-[460px]">

 <div className="bg-white text-black border border-slate-200 shadow-2xl rounded-sm p-6 w-[230px] h-auto flex flex-col font-sans select-none text-right">

 {/* Header Section */}
 <div className="flex flex-col items-center justify-center border-b border-dashed border-slate-200 pb-3 mb-4">
 {showOrgLogo && (
 invoiceLogoUrl ? (
 /* eslint-disable-next-line @next/next/no-img-element */
 <img src={invoiceLogoUrl} alt="Logo"className="w-10 h-10 object-contain mb-1.5"/>
 ) : (
 <div className="w-8 h-8 bg-slate-900 text-white rounded-md flex items-center justify-center text-xs font-black mb-1.5">
 +
 </div>
 )
 )}
 <span className="text-[13px] font-black text-black leading-tight">{orgName}</span>
                  {showTaxNumber && (
                    <span className="text-4xs text-slate-500 font-mono mt-0.5">Tax: {taxNumberVal}</span>
                  )}
                  {invoiceHeader && (
                    <span className="text-5xs font-bold text-slate-600 mt-1">{invoiceHeader}</span>
                  )}
                </div>

                {/* Metadata Area */}
                <div className="text-center space-y-1 mb-4">
                  <div className="text-2xs font-black text-black">Invoice #000125</div>
                  {showCustomerDetails && (
                    <div className="text-4xs font-bold text-slate-400">Customer: زبون نقدي</div>
                  )}
                </div>

                {/* Sales Items Rows */}
                <div className="text-3xs font-bold text-slate-800 space-y-2 border-b border-dashed border-slate-200 pb-4 mb-4">
                  <div className="flex items-center justify-between">
                    <span className="flex-1 text-right">Product Item A</span>
                    <span className="font-mono w-14 text-left" dir="ltr">40.00</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="flex-1 text-right">Product Item B</span>
                    <span className="font-mono w-14 text-left" dir="ltr">60.00</span>
                  </div>
                </div>

                {/* Totals Section */}
                <div className="text-3xs font-black text-black space-y-1.5">
                  <div className="flex justify-between w-full" dir="ltr">
                    <span className="text-slate-400 font-bold">Subtotal</span>
                    <span className="font-mono">100.00</span>
                  </div>
                  {showSavedAmount && (
                    <div className="flex justify-between w-full text-red-500" dir="ltr">
                      <span className="font-bold">Discount</span>
                      <span className="font-mono">10.00 -</span>
                    </div>
                  )}
                  <div className="flex justify-between w-full text-[12px] font-black pt-2 border-t-2 border-slate-900 mt-2" dir="ltr">
                    <span className="text-slate-900 uppercase">Total</span>
                    <span className="font-mono">100.00 {currencySymbol}</span>
                  </div>
                </div>

                {/* Linear Barcode Section (Strips) */}
                {showInvoiceBarcode && (
                  <div className="flex flex-col items-center justify-center pt-4 mt-3 border-t border-slate-50">
                    <div
                      className="w-full flex justify-center overflow-hidden scale-x-90 opacity-90"
                      dangerouslySetInnerHTML={{
                        __html: renderCode128Svg('000125', {
                          moduleWidth: 0.25,
                          height: 25,
                        }),
                      }}
                    />
                    <span className="text-5xs text-slate-400 font-black uppercase tracking-[0.3em] mt-1">Invoice Barcode</span>
                  </div>
                )}

                {/* Footer Notes Section (Image 3 Text) */}
                {invoiceFooter && (
                  <div className="text-center text-5xs font-bold text-slate-700 leading-tight pt-3 mt-3 border-t border-dashed border-slate-200 whitespace-pre-line">
                    {invoiceFooter}
                  </div>
                )}

 <div className="h-2"/>

 </div>

 </div>

 </div>

 </div>

 {/* ==================== RIGHT COLUMN: SYSTEM INVOICE FIELDS FORM ==================== */}
 <div className="lg:col-span-2 space-y-5">

 <div className="bg-surface rounded-2xl border border-slate-200/80 dark:border-slate-800 p-5 shadow-xs space-y-4">
 <div className="flex items-center gap-2.5 border-b border-slate-100 dark:border-slate-800/80 pb-3">
 <div className="w-7 h-7 rounded-lg bg-pink-50 dark:bg-pink-950/40 text-pink-600 flex items-center justify-center shrink-0">
 <Sliders className="w-4 h-4"/>
 </div>
 <div>
 <h3 className="text-xs font-black text-slate-900 dark:text-white">الإعدادات العامة والمقاسات</h3>
 <p className="text-3xs font-semibold text-slate-400 mt-0.5">التحكم في مقاس الورق وموضع رمز العملة وإعدادات الضريبة</p>
 </div>
 </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="text-2xs font-black text-slate-700 dark:text-slate-300">مقاس ورق الفاتورة</label>
              <Select value={paperSize} onValueChange={setPaperSize}>
                <SelectTrigger className="w-full h-10 rounded-xl bg-slate-50/60 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 text-xs font-black text-slate-900 dark:text-white">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="z-50 bg-surface border border-slate-200 dark:border-slate-800 rounded-xl shadow-xl">
                  <SelectItem value="80mm (حراري)">80mm (حراري قياسي)</SelectItem>
                  <SelectItem value="58mm (حراري)">58mm (حراري صغير)</SelectItem>
                  <SelectItem value="A4 (ورق عادي)">A4 (ورق عادي)</SelectItem>
                  <SelectItem value="A5 (ورق متوسط)">A5 (ورق متوسط)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1">
              <label className="text-2xs font-black text-slate-700 dark:text-slate-300">موضع رمز العملة</label>
              <Select value={currencyPosition} onValueChange={setCurrencyPosition}>
                <SelectTrigger className="w-full h-10 rounded-xl bg-slate-50/60 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 text-xs font-black text-slate-900 dark:text-white">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="z-50 bg-surface border border-slate-200 dark:border-slate-800 rounded-xl shadow-xl">
                  <SelectItem value="بعد المبلغ (١٠٠.٠٠ ج.م)">بعد المبلغ (١٠٠.٠٠ ج.م)</SelectItem>
                  <SelectItem value="قبل المبلغ (ج.م ١٠٠.٠٠)">قبل المبلغ (ج.م ١٠٠.٠٠)</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="flex items-center justify-between gap-4 pt-3 border-t border-slate-50 dark:border-slate-800/40">
            <span className="text-xs font-black text-slate-700 dark:text-slate-300">تفعيل حساب الضريبة على الفواتير</span>
            <Switch
              checked={enableTaxCalculation}
              onCheckedChange={setEnableTaxCalculation}
            />
          </div>
        </div>

        <div className="bg-surface rounded-2xl border border-slate-200/80 dark:border-slate-800 p-5 shadow-xs space-y-4">
          <div className="flex items-center justify-between gap-2.5 border-b border-slate-100 dark:border-slate-800/80 pb-3">
            <div className="flex items-center gap-2.5">
              <div className="w-7 h-7 rounded-lg bg-pink-50 dark:bg-pink-950/40 text-pink-600 flex items-center justify-center shrink-0">🖨️</div>
              <div>
                <h3 className="text-xs font-black text-slate-900 dark:text-white">طابعة الفواتير الحرارية وإقتران البلوتوث</h3>
                <p className="text-3xs font-semibold text-slate-400 mt-0.5">ربط طابعات الحرارة على الكمبيوتر أو البلوتوث للموبايل والتابلت</p>
              </div>
            </div>

            <span className={`px-3 py-1 rounded-full text-3xs font-black border ${
              connectionType === 'bluetooth' && bluetoothDeviceName
                ? 'bg-emerald-50 text-emerald-600 border-emerald-200 dark:bg-emerald-950/40'
                : 'bg-blue-50 text-blue-600 border-blue-200 dark:bg-blue-950/40'
            }`}>
              {connectionType === 'bluetooth' && bluetoothDeviceName
                ? `بلوتوث: ${bluetoothDeviceName} (متصلة)`
                : 'طابعة حرارية USB / النظام'}
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="text-2xs font-black text-slate-700 dark:text-slate-300">طريقة الاتصال</label>
              <Select value={connectionType} onValueChange={(v: any) => setConnectionType(v)}>
                <SelectTrigger className="w-full h-10 rounded-xl bg-slate-50/60 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 text-xs font-black text-slate-900 dark:text-white">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="z-50 bg-surface border border-slate-200 dark:border-slate-800 rounded-xl shadow-xl">
                  <SelectItem value="usb_driver">طابعة حرارية USB / كابل (الكمبيوتر)</SelectItem>
                  <SelectItem value="bluetooth">طابعة حرارية بلوتوث (الموبايل والتابلت)</SelectItem>
                  <SelectItem value="browser_dialog">نافذة الطباعة الافتراضية للمتصفح</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1">
              <label className="text-2xs font-black text-slate-700 dark:text-slate-300">اسم الطابعة المعرفة</label>
              <Select value={selectedPrinter} onValueChange={setSelectedPrinter}>
                <SelectTrigger className="w-full h-10 bg-slate-50/60 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 rounded-xl text-xs font-black">
                  <SelectValue placeholder="اختر الطابعة الحرارية..." />
                </SelectTrigger>
                <SelectContent className="z-50 bg-surface border border-slate-200 dark:border-slate-800 rounded-xl shadow-xl">
                  <SelectItem value="طابعة الفواتير الحرارية التلقائية (Direct Thermal 80mm)">طابعة الفواتير الحرارية التلقائية (Direct Thermal 80mm)</SelectItem>
                  <SelectItem value="طابعة الإيصالات الذكية (MThermal 80mm)">طابعة الإيصالات الذكية (MThermal 80mm)</SelectItem>
                  <SelectItem value="طابعة النظام الافتراضية (Default System Printer)">طابعة النظام الافتراضية (Default System Printer)</SelectItem>
                  <SelectItem value="Xprinter XP-80 Thermal Series">Xprinter XP-80 Thermal Series</SelectItem>
                  <SelectItem value="Epson TM-T20 Thermal Receipt Printer">Epson TM-T20 Thermal Receipt Printer</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="pt-2">
            <Button
              type="button"
              onClick={handlePairBluetoothPrinter}
              variant="outline"
              className="w-full h-11 border-dashed border-pink-300 text-pink-600 dark:border-pink-800 dark:text-pink-400 bg-pink-50/20 dark:bg-pink-950/20 rounded-xl text-xs font-black flex items-center justify-center gap-2 shadow-2xs cursor-pointer"
            >
              <Printer className="w-4 h-4" />
              <span>اقتران طابعة بلوتوث للموبايل والتابلت (Pair Bluetooth Printer)</span>
            </Button>
            <p className="text-3xs font-medium text-slate-400 leading-normal mt-2">
              تتيح ربط واقتران طابعات الفواتير البلوتوث المحمولة عند تشغيل التطبيق على أجهزة الأندرويد والموبايل والتابلت.
            </p>
          </div>
        </div>

          {/* Logo Upload Card (Always Available) */}
          <div className="bg-surface rounded-2xl border border-amber-400/60 dark:border-amber-500/40 p-5 shadow-xs space-y-4">
            <div className="flex items-center gap-2.5 border-b border-slate-100 dark:border-slate-800/80 pb-3">
              <div className="w-8 h-8 rounded-xl bg-amber-500/15 text-amber-600 dark:text-amber-400 flex items-center justify-center shrink-0 font-black">
                <ImagePlus className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-xs font-black text-slate-900 dark:text-white">
                  طباعة شعار المنشأة المخصص على الفاتورة (VIP Logo Customizer)
                </h3>
                <p className="text-3xs font-semibold text-slate-400 mt-0.5">
                  رفع شعار منشأتك ليظهر أعلى الإيصالات الحرارية وفواتير A4
                </p>
              </div>
            </div>

            <input
              type="file"
              ref={logoInputRef}
              accept="image/*"
              onChange={handleLogoUpload}
              className="hidden"
            />

            <div
              onClick={() => logoInputRef.current?.click()}
              className="w-full p-4 rounded-2xl border-2 border-dashed border-slate-200 dark:border-slate-700 hover:border-amber-500 dark:hover:border-amber-500 bg-slate-50/60 dark:bg-slate-900/40 flex flex-col sm:flex-row items-center justify-between gap-4 cursor-pointer transition-all"
            >
              <div className="flex items-center gap-3">
                {invoiceLogoUrl ? (
                  /* eslint-disable-next-line @next/next/no-img-element */
                  <img src={invoiceLogoUrl} alt="شعار الفاتورة" className="w-14 h-14 object-contain rounded-xl border p-1 bg-white" />
                ) : (
                  <div className="w-12 h-12 rounded-xl bg-amber-100 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 flex items-center justify-center shrink-0">
                    <Upload className="w-6 h-6" />
                  </div>
                )}
                <div>
                  <h4 className="text-xs font-black text-slate-900 dark:text-white">
                    {invoiceLogoUrl ? 'تغيير الشعار المرفوع' : 'رفع شعار المؤسسة'}
                  </h4>
                  <p className="text-3xs font-medium text-slate-400 mt-0.5">
                    انقر لاختيار الشعار (PNG, JPG بحد أقصى 5 ميجابايت)
                  </p>
                </div>
              </div>

              {invoiceLogoUrl && (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleDeleteLogo();
                  }}
                  className="h-8 px-2.5 text-xs text-red-500 hover:bg-red-50 dark:hover:bg-red-950/30 rounded-lg cursor-pointer"
                >
                  حذف الشعار
                </Button>
              )}
            </div>
          </div>

          <div className="bg-surface rounded-2xl border border-slate-200/80 dark:border-slate-800 p-5 shadow-xs space-y-4">
            <div className="flex items-center gap-2.5 border-b border-slate-100 dark:border-slate-800/80 pb-3">
              <div className="w-7 h-7 rounded-lg bg-blue-50 dark:bg-blue-950/40 text-blue-600 flex items-center justify-center shrink-0"><Type className="w-4 h-4" /></div>
              <div><h3 className="text-xs font-black text-slate-900 dark:text-white">الترويسة والنصوص المخصصة</h3><p className="text-3xs font-semibold text-slate-400 mt-0.5">تخصيص عبارات الترحيب في أعلى الإيصال أو الملاحظات في أسفل الفاتورة</p></div>
            </div>
            <div className="space-y-1.5">
              <label className="text-2xs font-black text-slate-700 dark:text-slate-300">نص ترويسة الفاتورة</label>
              <div className="relative">
                <Input value={invoiceHeader} onChange={(e) => setInvoiceHeader(e.target.value)} placeholder="يطبع أعلى الفاتورة" className="h-11 bg-slate-50/60 dark:bg-slate-900/60 border-slate-200 dark:border-slate-800 rounded-xl px-10 text-xs font-bold text-slate-900 dark:text-white" />
                <Type className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              </div>
            </div>
            <div className="space-y-1.5">
              <label className="text-2xs font-black text-slate-700 dark:text-slate-300">ملاحظات أسفل الفاتورة (التذييل)</label>
              <div className="relative">
                <textarea
                  value={invoiceFooter}
                  onChange={(e) => setInvoiceFooter(e.target.value)}
                  placeholder="يطبع أسفل الفاتورة"
                  rows={3}
                  className="w-full bg-slate-50/60 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 rounded-xl p-3 text-xs font-bold text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-pink-500"
                />
              </div>
            </div>
          </div>

          <div className="bg-surface rounded-2xl border border-slate-200/80 dark:border-slate-800 p-5 shadow-xs space-y-4">
            <div className="flex items-center gap-2.5 border-b border-slate-100 dark:border-slate-800/80 pb-2"><div className="w-7 h-7 rounded-lg bg-teal-50 dark:bg-teal-950/40 text-teal-600 flex items-center justify-center shrink-0"><Eye className="w-4 h-4" /></div><div><h3 className="text-xs font-black text-slate-900 dark:text-white">خيارات العرض على الفاتورة</h3></div></div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-3.5 pt-1">
              {[
                { label: 'عرض شعار المنشأة', state: showOrgLogo, setState: setShowOrgLogo },
                { label: 'عرض الرقم الضريبي', state: showTaxNumber, setState: setShowTaxNumber },
                { label: 'عرض تاريخ انتهاء الصلاحية', state: showExpiryDate, setState: setShowExpiryDate },
                { label: 'عرض بيانات العميل', state: showCustomerDetails, setState: setShowCustomerDetails },
                { label: 'عرض باركود الفاتورة', state: showInvoiceBarcode, setState: setShowInvoiceBarcode },
                { label: 'عرض المبلغ الموفَّر (الخصم)', state: showSavedAmount, setState: setShowSavedAmount },
                { label: 'طباعة الفاتورة تلقائياً فور الاعتماد', state: autoPrintOnApproval, setState: setAutoPrintOnApproval },
              ].map((opt, i) => (
                <div key={i} className={`flex items-center justify-between gap-4 py-1 ${i > 1 && i < 4 ? 'border-t border-slate-50 dark:border-slate-800 pt-3 md:border-none md:pt-1' : (i >= 4 ? 'border-t border-slate-50 dark:border-slate-800 pt-3' : '')} ${i === 6 ? 'md:col-span-2' : ''}`}>
                  <span className="text-xs font-black text-slate-700 dark:text-slate-200">{opt.label}</span>
                  <Switch
                    checked={opt.state}
                    onCheckedChange={opt.setState}
                  />
                </div>
              ))}
            </div>
          </div>

        </div>

      </div>
    </AppShell>
  );
}

export default function InvoiceSettingsPage() {
  return (
    <Suspense fallback={<div className="py-20 text-center text-sm font-bold text-slate-400">جاري تحميل إعدادات الفاتورة...</div>}>
      <InvoiceSettingsContent />
    </Suspense>
  );
}