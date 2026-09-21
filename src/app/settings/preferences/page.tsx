'use client';

import React, { useEffect, useState } from 'react';
import { AppShell } from '@/components/layout/AppShell';
import { Button } from '@/components/ui/button';
import { useSessionStore } from '@/core/state/useSessionStore';
import { SettingsRepository } from '@/modules/settings/settings_repository';
import { toast } from 'sonner';
import { db } from '@/core/db/app_database';
import { SUBSCRIPTION_PROFILES, getSubscriptionProfile, getSubscriptionPermissions } from '@/core/constants/subscription_profiles';
import {
  Save,
  Palette,
  Volume2,
  Moon,
  CalendarDays,
  Sparkles,
  Lock,
  Check,
  Play,
  CheckCircle2,
  SlidersHorizontal,
  Bell,
  VolumeX,
} from 'lucide-react';

interface ColorPreset {
  id: string;
  nameAr: string;
  icon: string;
  colorHex: string;
  previewBg: string;
  badgeStyle: string;
}

const COLOR_PRESETS: ColorPreset[] = [
  {
    id: 'gold',
    nameAr: 'الذهب الملكي (Royal Gold)',
    icon: '👑',
    colorHex: '#d97706',
    previewBg: 'bg-amber-500',
    badgeStyle: 'bg-amber-500/20 text-amber-700 dark:text-amber-300 border-amber-500/40',
  },
  {
    id: 'blue',
    nameAr: 'الياقوت الأزرق (Sapphire Blue)',
    icon: '🔵',
    colorHex: '#2563eb',
    previewBg: 'bg-blue-600',
    badgeStyle: 'bg-blue-500/20 text-blue-700 dark:text-blue-300 border-blue-500/40',
  },
  {
    id: 'purple',
    nameAr: 'الأرجواني الفاخر (Amethyst Purple)',
    icon: '🟣',
    colorHex: '#7c3aed',
    previewBg: 'bg-purple-600',
    badgeStyle: 'bg-purple-500/20 text-purple-700 dark:text-purple-300 border-purple-500/40',
  },
  {
    id: 'emerald',
    nameAr: 'الزمرد الصيدلاني (Emerald Green)',
    icon: '🟢',
    colorHex: '#059669',
    previewBg: 'bg-emerald-600',
    badgeStyle: 'bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 border-emerald-500/40',
  },
  {
    id: 'ruby',
    nameAr: 'الروبي العنابي (Ruby Rose)',
    icon: '🌹',
    colorHex: '#e11d48',
    previewBg: 'bg-rose-600',
    badgeStyle: 'bg-rose-500/20 text-rose-700 dark:text-rose-300 border-rose-500/40',
  },
];

interface SoundTheme {
  id: string;
  nameAr: string;
  icon: string;
  description: string;
}

const SOUND_THEMES: SoundTheme[] = [
  { id: 'classic', nameAr: 'الكاشير الكلاسيكي (Classic Beep)', icon: '🔔', description: 'تنبيه مسح الباركود الصوتي القياسي الكلاسيكي' },
  { id: 'chime', nameAr: 'النغمة الناعمة (Soft Chime)', icon: '🎵', description: 'نغمة هادئة ناعمة عند إتمام الفاتورة المسجلة' },
  { id: 'register', nameAr: 'جرس الخزينة (Cash Register Bell)', icon: '🛎️', description: 'جرس مالي تقليدي ممتع عند الدفع الكاش' },
  { id: 'pulse', nameAr: 'التنبيه الرقمي الهادئ (Synth Pulse)', icon: '🔮', description: 'نبضة صوتية حديثة ومريحة للأذن' },
];

export default function PreferencesSettingsPage() {
  const { currentUser } = useSessionStore();
  const orgId = currentUser?.org_id || '';

  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  // Subscription state
  const [subscriptionTier, setSubscriptionTier] = useState('standard');
  const subProfile = getSubscriptionProfile(subscriptionTier);

  // Preferences state
  const [accentColor, setAccentColor] = useState('emerald');
  const [soundTheme, setSoundTheme] = useState('classic');
  const [enableSounds, setEnableSounds] = useState(true);
  const [darkMode, setDarkMode] = useState(false);
  const [allowExpiredSales, setAllowExpiredSales] = useState(false);
  const [beepOnScan, setBeepOnScan] = useState(true);

  const isVipGold = subscriptionTier === 'vip_gold';

  useEffect(() => {
    if (!orgId) return;

    const loadPrefs = async () => {
      try {
        setIsLoading(true);
        const [orgRec, appSettings] = await Promise.all([
          SettingsRepository.getOrganization(orgId),
          SettingsRepository.getAppSettings(orgId),
        ]);

        if (orgRec) {
          setSubscriptionTier(orgRec.subscription_tier || 'standard');
        }

        const soundSetting = appSettings.find((s) => s.id === 'enable_sounds');
        const expiredSetting = appSettings.find((s) => s.id === 'allow_expired_sales');
        const colorSetting = appSettings.find((s) => s.id === 'falcon_accent_color');
        const soundThemeSetting = appSettings.find((s) => s.id === 'falcon_sound_theme');
        const beepSetting = appSettings.find((s) => s.id === 'beep_on_scan');

        setEnableSounds(soundSetting ? soundSetting.value === 'true' : true);
        setAllowExpiredSales(expiredSetting ? expiredSetting.value === 'true' : false);
        setBeepOnScan(beepSetting ? beepSetting.value === 'true' : true);
        if (colorSetting?.value) setAccentColor(colorSetting.value);
        if (soundThemeSetting?.value) setSoundTheme(soundThemeSetting.value);

        if (typeof window !== 'undefined') {
          const savedTheme = localStorage.getItem('falcon_theme');
          setDarkMode(savedTheme === 'dark');
          const savedAccent = localStorage.getItem('falcon_accent_color');
          if (savedAccent) setAccentColor(savedAccent);
        }
      } catch (err) {
        console.error('Error loading preferences:', err);
      } finally {
        setIsLoading(false);
      }
    };

    loadPrefs();
  }, [orgId]);

  const handleSelectAccentColor = (colorId: string) => {
    if (!isVipGold) {
      toast.error('تخصيص ألوان الثيم ميزة حصرية لباقة VIP جولد (👑). يرجى الترقية لتفعيل ألوانك المفضلة.');
      return;
    }
    setAccentColor(colorId);
    if (typeof window !== 'undefined') {
      localStorage.setItem('falcon_accent_color', colorId);
      document.documentElement.setAttribute('data-accent', colorId);
      window.dispatchEvent(new CustomEvent('falcon_accent_change', { detail: colorId }));
    }
    toast.success(`تم اختيار ثيم الألوان: ${COLOR_PRESETS.find((c) => c.id === colorId)?.nameAr}`);
  };

  const handleToggleDarkMode = (checked: boolean) => {
    setDarkMode(checked);
    if (typeof window !== 'undefined') {
      localStorage.setItem('falcon_theme', checked ? 'dark' : 'light');
      window.dispatchEvent(new Event('falcon_theme_change'));
    }
  };

  const handlePlaySoundPreview = () => {
    if (!enableSounds) {
      toast.warning('يرجى تفعيل التنبيهات الصوتية أولاً لسماع معاينة الصوت.');
      return;
    }
    try {
      const audioCtx = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();
      osc.connect(gain);
      gain.connect(audioCtx.destination);

      if (soundTheme === 'chime') {
        osc.frequency.setValueAtTime(523.25, audioCtx.currentTime); // C5
        osc.frequency.exponentialRampToValueAtTime(659.25, audioCtx.currentTime + 0.15); // E5
      } else if (soundTheme === 'register') {
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(880, audioCtx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(1200, audioCtx.currentTime + 0.2);
      } else if (soundTheme === 'pulse') {
        osc.type = 'sine';
        osc.frequency.setValueAtTime(440, audioCtx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(880, audioCtx.currentTime + 0.1);
      } else {
        osc.type = 'square';
        osc.frequency.setValueAtTime(1046.5, audioCtx.currentTime); // C6
      }

      gain.gain.setValueAtTime(0.15, audioCtx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.25);
      osc.start();
      osc.stop(audioCtx.currentTime + 0.25);
      toast.info(`معاينة نغمة (${SOUND_THEMES.find((s) => s.id === soundTheme)?.nameAr})`);
    } catch {
      toast.info('تم اختبار التنبيه الصوتي');
    }
  };

  const handleSavePreferences = async () => {
    if (!orgId) return;
    try {
      setIsSaving(true);
      await Promise.all([
        SettingsRepository.setSetting(orgId, 'enable_sounds', String(enableSounds), 'تفعيل الأصوات والتنبيهات الصوتية'),
        SettingsRepository.setSetting(orgId, 'allow_expired_sales', String(allowExpiredSales), 'السماح ببيع المنتجات منتهية الصلاحية'),
        SettingsRepository.setSetting(orgId, 'beep_on_scan', String(beepOnScan), 'التأكيد الصوتي عند مسح الباركود'),
        SettingsRepository.setSetting(orgId, 'falcon_accent_color', accentColor, 'ثيم الألوان المعتمد'),
        SettingsRepository.setSetting(orgId, 'falcon_sound_theme', soundTheme, 'نغمة الصوت المعتمدة'),
      ]);

      if (typeof window !== 'undefined') {
        localStorage.setItem('falcon_accent_color', accentColor);
        localStorage.setItem('falcon_sound_theme', soundTheme);
        document.documentElement.setAttribute('data-accent', accentColor);
      }

      toast.success('تم حفظ تفضيلات وتخصيص النظام بنجاح!');
    } catch (err) {
      console.error('Error saving preferences:', err);
      toast.error('حدث خطأ أثناء حفظ التفضيلات');
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <AppShell title="تفضيلات وتخصيص النظام">
        <div className="flex items-center justify-center py-24">
          <div className="w-8 h-8 border-3 border-[#16a34a] border-t-transparent rounded-full animate-spin" />
        </div>
      </AppShell>
    );
  }

  return (
    <AppShell
      title="تفضيلات وتخصيص النظام"
      subtitle="تخصيص ثيم الألوان الملكي، النغمات الصوتية، وسياسات بيع المخزون والصلاحية"
      actions={
        <Button
          onClick={handleSavePreferences}
          disabled={isSaving}
          className="h-10 px-6 bg-emerald-700 hover:bg-emerald-800 text-white font-black text-xs rounded-xl shadow-md flex items-center gap-2 cursor-pointer transition-all"
        >
          <Save className="w-4 h-4" />
          <span>{isSaving ? 'جاري الحفظ...' : 'حفظ التفضيلات'}</span>
        </Button>
      }
    >
      <div className="space-y-6 select-none" dir="rtl">
        {/* ==================== CARD 1: VIP GOLD THEME COLOR CUSTOMIZER (Visible ONLY to VIP Gold Accounts) ==================== */}
        {isVipGold && (
          <div className="bg-white dark:bg-[#131b2e] rounded-2xl border border-amber-400/60 dark:border-amber-500/40 p-5 shadow-xs space-y-4 transition-colors">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 dark:border-slate-800/80 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-amber-500/15 text-amber-600 dark:text-amber-400 flex items-center justify-center shrink-0">
                  <Palette className="w-4 h-4" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-xs font-black text-slate-900 dark:text-white">
                      تخصيص ثيم وألوان الواجهة الملكية (UI Theme Customizer)
                    </h3>
                    <span className={`px-2 py-0.5 rounded-md text-[10px] border ${subProfile.badgeStyle}`}>
                      {subProfile.badgeName}
                    </span>
                  </div>
                  <p className="text-[10px] font-semibold text-slate-400 mt-0.5">
                    ميزة حصرية لباقة VIP جولد: اختيار لون الثيم والتوهج الرئيسي للنظام من بين 5 لوحات ألوان ملكية
                  </p>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3 pt-1">
              {COLOR_PRESETS.map((preset) => {
                const isSelected = accentColor === preset.id;
                return (
                  <div
                    key={preset.id}
                    onClick={() => handleSelectAccentColor(preset.id)}
                    className={`p-3.5 rounded-2xl border text-right flex flex-col justify-between transition-all cursor-pointer relative overflow-hidden ${
                      isSelected
                        ? 'border-emerald-500 bg-emerald-50/40 dark:bg-emerald-950/30 ring-2 ring-emerald-500/40 shadow-sm'
                        : 'border-slate-200/80 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/30 hover:border-slate-300 dark:hover:border-slate-700'
                    }`}
                  >
                    <div>
                      <div className="flex items-center justify-between gap-1 mb-2">
                        <span className="text-lg">{preset.icon}</span>
                        <div className={`w-5 h-5 rounded-full ${preset.previewBg} shadow-2xs flex items-center justify-center text-white text-[10px]`}>
                          {isSelected && <Check className="w-3 h-3 stroke-[3]" />}
                        </div>
                      </div>
                      <h4 className="text-xs font-black text-slate-900 dark:text-white mb-1">
                        {preset.nameAr}
                      </h4>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* ==================== CARD 2: AUDIO SOUND ENGINE ==================== */}
        <div className="bg-white dark:bg-[#131b2e] rounded-2xl border border-slate-200/80 dark:border-slate-800 p-5 shadow-xs space-y-4 transition-colors">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 dark:border-slate-800/80 pb-3">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-blue-50 dark:bg-blue-950/40 text-blue-600 flex items-center justify-center shrink-0">
                <Volume2 className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-xs font-black text-slate-900 dark:text-white">المؤثرات والتنبيهات الصوتية</h3>
                <p className="text-[10px] font-semibold text-slate-400 mt-0.5">
                  التحكم في أصوات نغمات تأكيد مسح الباركود واعتماد الفواتير في شاشة الكاشير والمبيعات
                </p>
              </div>
            </div>

            {enableSounds && (
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handlePlaySoundPreview}
                className="h-8 px-3 rounded-xl border-slate-300 dark:border-slate-700 text-xs font-bold text-slate-700 dark:text-slate-200 flex items-center gap-1.5 cursor-pointer"
              >
                <Play className="w-3.5 h-3.5 text-blue-600 fill-blue-600" />
                <span>اختبار الصوت 🔊</span>
              </Button>
            )}
          </div>

          <div className="space-y-4">
            {/* Toggle Enable Sounds */}
            <div className="flex items-center justify-between gap-4 py-2">
              <div className="flex items-start gap-3">
                <div className="w-8 h-8 rounded-lg bg-slate-100 dark:bg-slate-900 text-slate-500 flex items-center justify-center shrink-0 mt-0.5">
                  {enableSounds ? <Bell className="w-4 h-4 text-emerald-600" /> : <VolumeX className="w-4 h-4 text-slate-400" />}
                </div>
                <div>
                  <h4 className="text-xs font-black text-slate-800 dark:text-slate-200">تفعيل الأصوات والتنبيهات الصوتية</h4>
                  <p className="text-[10px] font-medium text-slate-400 mt-0.5 leading-relaxed">
                    تشغيل أصوات تأكيد مسح الباركود، إضافة الأصناف، واعتماد الفواتير في شاشة الكاشير والمبيعات.
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setEnableSounds(!enableSounds)}
                className={`w-11 h-6 rounded-full transition-colors relative shrink-0 cursor-pointer ${
                  enableSounds ? 'bg-emerald-600' : 'bg-slate-300 dark:bg-slate-700'
                }`}
              >
                <span
                  className={`absolute top-0.5 w-5 h-5 rounded-full bg-white shadow-xs transition-all ${
                    enableSounds ? 'right-0.5' : 'right-[22px]'
                  }`}
                />
              </button>
            </div>

            {/* Sound Theme Selector (Visible ONLY to VIP Gold) */}
            {isVipGold && enableSounds && (
              <div className="space-y-2 pt-2 border-t border-slate-100 dark:border-slate-800/60">
                <label className="block text-[11px] font-black text-slate-700 dark:text-slate-300">
                  اختيار النغمة الصوتية المخصصة (VIP Sound Theme)
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {SOUND_THEMES.map((theme) => {
                    const isSelected = soundTheme === theme.id;
                    return (
                      <div
                        key={theme.id}
                        onClick={() => setSoundTheme(theme.id)}
                        className={`p-3 rounded-xl border flex items-center justify-between gap-3 cursor-pointer transition-all ${
                          isSelected
                            ? 'border-blue-600 bg-blue-50/50 dark:bg-blue-950/30 text-blue-900 dark:text-blue-200 shadow-2xs font-bold'
                            : 'border-slate-200/80 dark:border-slate-800 bg-slate-50/40 dark:bg-slate-900/30 text-slate-700 dark:text-slate-300'
                        }`}
                      >
                        <div className="flex items-center gap-2.5">
                          <span className="text-base">{theme.icon}</span>
                          <div>
                            <h5 className="text-xs font-black">{theme.nameAr}</h5>
                            <p className="text-[10px] opacity-75 mt-0.5">{theme.description}</p>
                          </div>
                        </div>
                        {isSelected && <CheckCircle2 className="w-4 h-4 text-blue-600 shrink-0" />}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* ==================== CARD 3: INVENTORY & SALES BEHAVIOR POLICIES ==================== */}
        <div className="bg-white dark:bg-[#131b2e] rounded-2xl border border-slate-200/80 dark:border-slate-800 p-5 shadow-xs space-y-4 transition-colors">
          <div className="flex items-center gap-2.5 border-b border-slate-100 dark:border-slate-800/80 pb-3">
            <div className="w-8 h-8 rounded-lg bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 flex items-center justify-center shrink-0">
              <SlidersHorizontal className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-xs font-black text-slate-900 dark:text-white">سياسات وسلوك الفواتير والمخزون</h3>
              <p className="text-[10px] font-semibold text-slate-400 mt-0.5">
                ضوابط الجودة ومنع بيع الأصناف منتهية الصلاحية والتنبيهات البصرية
              </p>
            </div>
          </div>

          <div className="space-y-3">
            {/* Policy 1: Dark Mode */}
            <div className="flex items-center justify-between gap-4 py-2 border-b border-slate-100 dark:border-slate-800/60 pb-3">
              <div className="flex items-start gap-3">
                <div className="w-8 h-8 rounded-lg bg-slate-100 dark:bg-slate-900 text-slate-500 flex items-center justify-center shrink-0 mt-0.5">
                  <Moon className="w-4 h-4 text-purple-500" />
                </div>
                <div>
                  <h4 className="text-xs font-black text-slate-800 dark:text-slate-200">الوضع الليلي المريح (Dark Mode)</h4>
                  <p className="text-[10px] font-medium text-slate-400 mt-0.5 leading-relaxed">
                    تبديل ألوان الواجهة للنمط الداكن المريح للعين لتقليل الجهد البصري في فترات العمل الطويلة.
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

            {/* Policy 2: Allow selling expired items */}
            <div className="flex items-center justify-between gap-4 py-2 border-b border-slate-100 dark:border-slate-800/60 pb-3">
              <div className="flex items-start gap-3">
                <div className="w-8 h-8 rounded-lg bg-slate-100 dark:bg-slate-900 text-slate-500 flex items-center justify-center shrink-0 mt-0.5">
                  <CalendarDays className="w-4 h-4 text-amber-500" />
                </div>
                <div>
                  <h4 className="text-xs font-black text-slate-800 dark:text-slate-200">السماح ببيع المنتجات منتهية الصلاحية / التالفة</h4>
                  <p className="text-[10px] font-medium text-slate-400 mt-0.5 leading-relaxed">
                    عند التعطيل، سيمنع النظام تلقائياً إضافة أي صنف منتهي الصلاحية لسلة البيع حماية للجودة.
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

            {/* Policy 3: Automatic Beep on Barcode Scan */}
            <div className="flex items-center justify-between gap-4 py-2">
              <div className="flex items-start gap-3">
                <div className="w-8 h-8 rounded-lg bg-slate-100 dark:bg-slate-900 text-slate-500 flex items-center justify-center shrink-0 mt-0.5">
                  <Sparkles className="w-4 h-4 text-emerald-500" />
                </div>
                <div>
                  <h4 className="text-xs font-black text-slate-800 dark:text-slate-200">التأكيد الصوتي التلقائي عند قراءة الباركود</h4>
                  <p className="text-[10px] font-medium text-slate-400 mt-0.5 leading-relaxed">
                    إصدار صفيح صوتي فوري عند التعرف المباشر على باركود الصنف في الكاشير والشاشات.
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setBeepOnScan(!beepOnScan)}
                className={`w-11 h-6 rounded-full transition-colors relative shrink-0 cursor-pointer ${
                  beepOnScan ? 'bg-emerald-500' : 'bg-slate-300 dark:bg-slate-700'
                }`}
              >
                <span
                  className={`absolute top-0.5 w-5 h-5 rounded-full bg-white shadow-xs transition-all ${
                    beepOnScan ? 'right-0.5' : 'right-[22px]'
                  }`}
                />
              </button>
            </div>
          </div>
        </div>

        {/* Bottom Actions Bar */}
        <div className="flex items-center justify-end pt-2">
          <Button
            onClick={handleSavePreferences}
            disabled={isSaving}
            className="h-11 px-8 bg-emerald-700 hover:bg-emerald-800 text-white font-black text-xs rounded-xl shadow-md flex items-center gap-2 cursor-pointer transition-all"
          >
            <Save className="w-4 h-4" />
            <span>{isSaving ? 'جاري الحفظ...' : 'حفظ تفضيلات وتخصيص النظام'}</span>
          </Button>
        </div>
      </div>
    </AppShell>
  );
}
