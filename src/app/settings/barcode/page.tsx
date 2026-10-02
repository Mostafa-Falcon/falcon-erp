'use client';

import React, { useEffect, useState } from'react';
import { AppShell } from'@/components/layout/AppShell';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { useSessionStore } from'@/core/state/useSessionStore';
import { SettingsRepository } from'@/modules/settings/settings_repository';
import { renderCode128Svg } from'@/lib/code128';
import { toast } from'sonner';
import {
 Save,
 QrCode,
 Printer,
 Sliders,
 Maximize2,
 X,
 RefreshCw,
 Info,
 ChevronDown,
 Layout,
 CheckCircle2
} from'lucide-react';

export default function BarcodeSettingsPage() {
 const { currentUser } = useSessionStore();
 const orgId = currentUser?.org_id ||'';

 // Core state matching screenshot variables
 const [isLoading, setIsLoading] = useState(true);
 const [isSaving, setIsSaving] = useState(false);

 // Measurements & Symbology
 const [symbology, setSymbology] = useState('CODE 128');
 const [labelWidth, setLabelWidth] = useState('38.0');
 const [labelHeight, setLabelHeight] = useState('25.0');
 const [sideMargin, setSideMargin] = useState('1');
 const [labelsPerRow, setLabelsPerRow] = useState('1');

 // Hardware & Printers
 const [printerName, setPrinterName] = useState('');
 const [scannerTestInput, setScannerTestInput] = useState('');

 // Display Options (Toggles)
 const [showItemName, setShowItemName] = useState(true);
 const [showSalePrice, setShowSalePrice] = useState(true);
 const [showExpiryDate, setShowExpiryDate] = useState(false);
 const [showBatchNumber, setShowBatchNumber] = useState(false);
 const [showUnitName, setShowUnitName] = useState(true);
 const [showOrgName, setShowOrgName] = useState(false);

 // Institution placeholder name & currency
 const [orgName, setOrgName] = useState('مؤسستي');
 const [currencyText, setCurrencyText] = useState('ج.م');

 // Load configuration from database
 useEffect(() => {
 if (!orgId) return;

 const loadBarcodeSettings = async () => {
 try {
 setIsLoading(true);
 const [orgRec, appSettings] = await Promise.all([
 SettingsRepository.getOrganization(orgId),
 SettingsRepository.getAppSettings(orgId)
 ]);

 if (orgRec) {
 setOrgName(orgRec.name ||'مؤسستي');
 if (orgRec.currency) {
 setCurrencyText(orgRec.currency ==='EGP'?'ج.م': orgRec.currency);
 }
 }

 const savedCfg = appSettings.find((s) => s.id ==='barcode_page_config');
 if (savedCfg?.value) {
 const parsed = JSON.parse(savedCfg.value);
 setSymbology(parsed.symbology ||'CODE 128');
 setLabelWidth(parsed.labelWidth ||'38.0');
 setLabelHeight(parsed.labelHeight ||'25.0');
 setSideMargin(parsed.sideMargin ||'1');
 setLabelsPerRow(parsed.labelsPerRow ||'1');
 setPrinterName(parsed.printerName ||'');
 setShowItemName(parsed.showItemName !== false);
 setShowSalePrice(parsed.showSalePrice !== false);
 setShowExpiryDate(!!parsed.showExpiryDate);
 setShowBatchNumber(!!parsed.showBatchNumber);
 setShowUnitName(parsed.showUnitName !== false);
 setShowOrgName(!!parsed.showOrgName);
 }
 } catch (err) {
 console.error('Error loading barcode settings:', err);
 toast.error('حدث خطأ أثناء تحميل إعدادات الباركود');
 } finally {
 setIsLoading(false);
 }
 };

 loadBarcodeSettings();
 }, [orgId]);

 // Save changes handler
 const handleSaveConfig = async () => {
 try {
 setIsSaving(true);
 const payload = {
 symbology,
 labelWidth,
 labelHeight,
 sideMargin,
 labelsPerRow,
 printerName,
 showItemName,
 showSalePrice,
 showExpiryDate,
 showBatchNumber,
 showUnitName,
 showOrgName,
 };

 await SettingsRepository.setSetting(
 orgId,
'barcode_page_config',
 JSON.stringify(payload),
'إعدادات وتفضيلات قوالب وقياسات ملصقات الباركود وطابعات الأجهزة'
 );

 toast.success('تم حفظ إعدادات مقاسات وخيارات الباركود بنجاح');
 } catch (err) {
 console.error('Error saving barcode settings:', err);
 toast.error('حدث خطأ أثناء حفظ الإعدادات');
 } finally {
 setIsSaving(false);
 }
 };

 // Device discovery simulator
 const handleDiscoverDevices = () => {
 toast.info('جاري البحث عن الطابعات...');
 setTimeout(() => {
 setPrinterName('Xprinter XP-365B');
 toast.success('تم التوصيل: Xprinter XP-365B');
 }, 1000);
 };

 const headerActions = (
 <Button
 onClick={handleSaveConfig}
 disabled={isSaving || isLoading}
 className="bg-[#0f766e] hover:bg-teal-800 text-white font-black text-xs px-5 py-2.5 rounded-xl flex items-center gap-2 transition-all cursor-pointer shadow-md shadow-teal-500/10"
 >
 <Save className="w-4 h-4"/>
 {isSaving ?'جاري الحفظ...':'حفظ الإعدادات'}
 </Button>
 );

 if (isLoading) {
 return (
 <AppShell title="إعدادات الباركود"subtitle="جاري تحميل الإعدادات...">
 <div className="flex items-center justify-center py-20">
 <div className="w-8 h-8 border-3 border-teal-600 border-t-transparent rounded-full animate-spin"/>
 </div>
 </AppShell>
 );
 }

 return (
 <AppShell
 title="إعدادات الباركود"
 subtitle="تخصيص قياسات الملصقات ومعلومات الطباعة حسب متطلبات العمل."
 actions={headerActions}
 >
 <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 text-right"dir="rtl">

 {/* ==================== LEFT COLUMN: PROFESSIONAL STICKER PREVIEW ==================== */}
 <div className="space-y-4">

 <div className="bg-surface rounded-2xl border border-slate-200/80 dark:border-slate-800 p-5 shadow-xs flex flex-col items-center">

 <div className="w-full border-b border-slate-100 dark:border-slate-800/80 pb-3 mb-5">
 <span className="text-xs font-black text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
 <span className="w-2 h-2 rounded-full bg-emerald-500"/>
 معاينة الملصق (تقريبية)
 </span>
 </div>

 {/* Sticker Graphic Container - Properly Spaced and Non-overlapping */}
 <div className="w-full bg-[#f8fafc] dark:bg-slate-900/40 rounded-3xl border border-slate-100 dark:border-slate-800 p-6 flex flex-col items-center justify-center min-h-[240px]">

 <div className="bg-white text-black rounded-lg border border-slate-300 shadow-xl p-3 flex flex-col items-center transition-all duration-300 w-[200px] min-h-[140px] overflow-hidden">

 {/* 1. Header: Org Name */}
 <div className="w-full h-4 flex items-center justify-center mb-1">
 {showOrgName && (
 <span className="text-5xs font-black text-slate-400 truncate uppercase tracking-tighter">
 {orgName}
 </span>
 )}
 </div>

 {/* 2. Item Name: Strong Visibility */}
 <div className="w-full h-5 flex items-center justify-center mb-1.5 px-1 overflow-hidden">
 {showItemName && (
 <span className="text-3xs font-black text-black text-center line-clamp-1">
 اسم الصنف التجاري
 </span>
 )}
 </div>

 {/* 3. Barcode SVG Area: Fixed Height to prevent overlapping */}
 <div className="w-full h-[35px] flex items-center justify-center bg-white overflow-hidden my-1">
 <div
 className="scale-x-110"
 dangerouslySetInnerHTML={{
 __html: renderCode128Svg('6221234567891', {
 moduleWidth: 0.20,
 height: 22, // Reduced height to fix overlap
 }),
 }}
 />
 </div>

 {/* 4. Barcode Numeric Text Area */}
 <div className="w-full h-3 flex items-center justify-center mt-0.5">
 <span className="text-5xs font-mono font-black tracking-[0.2em] text-slate-700">
 6221234567891
 </span>
 </div>

 {/* 5. Footer Area: Price and Unit */}
 <div className="w-full h-6 flex items-center justify-between mt-auto pt-2 px-1 border-t border-slate-50">
 {showUnitName ? (
 <span className="text-5xs text-slate-400 font-bold bg-slate-50 px-1.5 py-0.5 rounded">علبة</span>
 ) : (
 <div />
 )}
 {showSalePrice && (
 <div className="flex items-baseline gap-0.5">
 <span className="text-[12px] font-black text-emerald-800">75.00</span>
 <span className="text-5xs text-emerald-600 font-bold">{currencyText}</span>
 </div>
 )}
 </div>

 </div>

 </div>

 {/* Current Selected Size Button Badge */}
 <div className="mt-5 w-full">
 <div className="inline-flex w-full items-center justify-center gap-1.5 h-9 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400 font-black text-xs rounded-xl border border-emerald-100">
 <Printer className="w-4 h-4"/>
 <span>المقاس الحالي: {labelWidth}x{labelHeight} مم</span>
 </div>
 </div>

 </div>

 {/* Bottom Tip Box */}
 <div className="rounded-2xl border border-teal-100 bg-teal-50/40 p-4 flex items-start gap-2.5">
 <Info className="w-4 h-4 text-teal-600 shrink-0 mt-0.5"/>
 <p className="text-2xs font-semibold text-teal-800 leading-relaxed">
 تأكد من أن عرض الملصق يتناسب مع طابعتك (مثلاً: 38x25 هو المقاس الأكثر شيوعاً).
 </p>
 </div>

 </div>

 {/* ==================== RIGHT COLUMN: SETTINGS FIELDS ==================== */}
 <div className="lg:col-span-2 space-y-5">

 <div className="bg-surface rounded-2xl border border-slate-200/80 dark:border-slate-800 p-4 shadow-xs flex flex-wrap items-center justify-between gap-3">
 <div className="flex items-center gap-2.5">
 <div className="w-8 h-8 rounded-xl bg-teal-50 dark:bg-teal-950/40 text-[#0f766e] flex items-center justify-center shrink-0">
 <Layout className="w-4 h-4"/>
 </div>
 <div>
 <h4 className="text-xs font-black text-slate-900 dark:text-white">قوالب مقاسات الباركود المحفوظة</h4>
 <p className="text-3xs font-semibold text-slate-400 mt-0.5">
 القياس القياسي الشائع: 38x25 مم.
 </p>
 </div>
 </div>
 <Button variant="outline"className="h-8 px-3 border-teal-200 text-[#0f766e] text-3xs font-black rounded-lg">
 <span>+ حفظ القياس الحالي كقالب</span>
 </Button>
 </div>

 <div className="bg-surface rounded-2xl border border-slate-200/80 dark:border-slate-800 p-5 shadow-xs space-y-3">
 <div className="flex items-center gap-2 font-black text-xs">
 <QrCode className="w-4 h-4 text-teal-600"/>
 <span>نظام الترميز</span>
 </div>
 <div className="w-full h-11 rounded-xl bg-slate-50/60 border border-slate-200 px-3 flex items-center justify-between text-xs font-black">
 <span className="font-mono">{symbology}</span>
 <ChevronDown className="w-4 h-4 text-slate-400"/>
 </div>
 </div>

 <div className="bg-surface rounded-2xl border border-slate-200/80 dark:border-slate-800 p-5 shadow-xs space-y-4">
 <div className="flex items-center gap-2 font-black text-xs border-b border-slate-50 pb-2">
 <Sliders className="w-4 h-4 text-teal-600"/>
 <span>قياسات الملصق (بالمليمتر)</span>
 </div>

 <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
 <div className="space-y-1.5">
 <label className="text-2xs font-black text-slate-700 dark:text-slate-300">عرض الملصق (mm)</label>
 <Input value={labelWidth} onChange={(e) => setLabelWidth(e.target.value)} className="h-11 bg-slate-50/60 border-slate-200 rounded-xl"/>
 </div>
 <div className="space-y-1.5">
 <label className="text-2xs font-black text-slate-700 dark:text-slate-300">ارتفاع الملصق (mm)</label>
 <Input value={labelHeight} onChange={(e) => setLabelHeight(e.target.value)} className="h-11 bg-slate-50/60 border-slate-200 rounded-xl"/>
 </div>
 <div className="space-y-1.5">
 <label className="text-2xs font-black text-slate-700 dark:text-slate-300">الهامش الجانبي</label>
 <Input value={sideMargin} onChange={(e) => setSideMargin(e.target.value)} className="h-11 bg-slate-50/60 border-slate-200 rounded-xl"/>
 </div>
 <div className="space-y-1.5">
 <label className="text-2xs font-black text-slate-700 dark:text-slate-300">ملصقات في الصف</label>
 <Input value={labelsPerRow} onChange={(e) => setLabelsPerRow(e.target.value)} className="h-11 bg-slate-50/60 border-slate-200 rounded-xl"/>
 </div>
 </div>
 </div>

 <div className="bg-surface rounded-2xl border border-slate-200/80 dark:border-slate-800 p-5 shadow-xs space-y-4">
 <div className="flex items-center justify-between border-b border-slate-50 pb-2">
 <div className="flex items-center gap-2 font-black text-xs"><Printer className="w-4 h-4 text-teal-600"/><span>إعدادات الطابعة والأجهزة</span></div>
 <Button onClick={handleDiscoverDevices} className="h-8 px-3 bg-teal-50 text-[#0f766e] text-2xs font-black rounded-lg">اكتشاف الأجهزة</Button>
 </div>
 <Input value={printerName} onChange={(e) => setPrinterName(e.target.value)} placeholder="اسم طابعة الباركود"className="h-11 bg-slate-50/60 border-slate-200 rounded-xl px-10"/>
 </div>

 <div className="bg-surface rounded-2xl border border-slate-200/80 dark:border-slate-800 p-5 shadow-xs space-y-4">
 <div className="flex items-center gap-2 border-b border-slate-50 pb-2">
 <div className="w-7 h-7 rounded-lg bg-slate-50 flex items-center justify-center shrink-0">🔄</div>
 <div><h3 className="text-xs font-black">خيارات العرض والبيانات</h3></div>
 </div>

        <div className="space-y-3.5 divide-y divide-slate-100 dark:divide-slate-800">
          {[
            { label: 'إظهر اسم الصنف', state: showItemName, setState: setShowItemName },
            { label: 'عرض سعر البيع', state: showSalePrice, setState: setShowSalePrice },
            { label: 'عرض تاريخ انتهاء الصلاحية', state: showExpiryDate, setState: setShowExpiryDate },
            { label: 'عرض رقم التشغيلة (Batch)', state: showBatchNumber, setState: setShowBatchNumber },
            { label: 'عرض اسم الوحدة', state: showUnitName, setState: setShowUnitName },
            { label: 'عرض اسم المؤسسة / الشركة', state: showOrgName, setState: setShowOrgName },
          ].map((opt, i) => (
            <div key={i} className="flex items-center justify-between gap-4 py-2">
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