/**
 * 🦅 Logixa Falcon ERP - Organization Subscription Tier Profiles
 * Manages organization account classification & hierarchy:
 * 1. vip_gold   -> VIP Gold (VIP جولد - ذهبي 👑)
 * 2. vip_silver -> VIP Silver (VIP سيلفر - فضي 🥈)
 * 3. vip_bronze -> VIP Bronze (VIP برونز - برونزي 🥉)
 * 4. standard   -> Standard / Regular Owner Plan (اشتراك منشأة قياسي 🏢)
 *
 * Upgrades and tier assignments are managed externally via the Logixa Control Panel.
 */

export interface SubscriptionProfile {
  id: string;
  nameAr: string;
  nameEn: string;
  badgeName: string;
  icon: string;
  isVip: boolean;
  badgeStyle: string;
  cardStyle: string;
  gradientText: string;
  glowEffect: string;
  description: string;
  maxUsers: string;
  maxBranches: string;
  supportLevel: string;
}

export const SUBSCRIPTION_PROFILES: Record<string, SubscriptionProfile> = {
  vip_gold: {
    id: 'vip_gold',
    nameAr: 'VIP جولد الذهبية',
    nameEn: 'VIP Gold Tier',
    badgeName: 'VIP جولد 👑',
    icon: '👑',
    isVip: true,
    badgeStyle: 'bg-amber-500/15 text-amber-700 border-amber-500/30 dark:bg-amber-500/20 dark:text-amber-400 font-black',
    cardStyle: 'border-amber-400/60 dark:border-amber-500/40 bg-gradient-to-br from-amber-50/80 via-white to-amber-100/30 dark:from-amber-950/20 dark:via-[#131b2e] dark:to-amber-900/10 shadow-amber-500/10 shadow-md',
    gradientText: 'bg-gradient-to-r from-amber-600 via-yellow-500 to-amber-700 bg-clip-text text-transparent font-black',
    glowEffect: 'ring-2 ring-amber-400/40 shadow-lg shadow-amber-500/10',
    description: 'الباقة الذهبية VIP كأعلى مستوى للمنشآت الكبرى مع دعم ومزامنة غير محدودة.',
    maxUsers: 'غير محدود',
    maxBranches: 'فروع متعددة غير محدودة',
    supportLevel: 'دعم فني مخصص VIP على مدار الساعة 24/7',
  },
  vip_silver: {
    id: 'vip_silver',
    nameAr: 'VIP سيلفر الفضية',
    nameEn: 'VIP Silver Tier',
    badgeName: 'VIP سيلفر 🥈',
    icon: '🥈',
    isVip: true,
    badgeStyle: 'bg-slate-400/15 text-slate-800 border-slate-400/30 dark:bg-slate-400/20 dark:text-slate-200 font-black',
    cardStyle: 'border-slate-300 dark:border-slate-700 bg-gradient-to-br from-slate-50/80 via-white to-slate-100/40 dark:from-slate-900/40 dark:via-[#131b2e] dark:to-slate-800/20 shadow-sm',
    gradientText: 'bg-gradient-to-r from-slate-700 via-slate-500 to-slate-900 dark:from-slate-200 dark:to-slate-400 bg-clip-text text-transparent font-black',
    glowEffect: 'ring-1 ring-slate-400/30',
    description: 'الباقة الفضية VIP للمنشآت المتوسطة والكبيرة المتقدمة.',
    maxUsers: 'حتى 25 موظف',
    maxBranches: 'حتى 10 فروع',
    supportLevel: 'دعم فني أولوية عالية VIP',
  },
  vip_bronze: {
    id: 'vip_bronze',
    nameAr: 'VIP برونز البرونزية',
    nameEn: 'VIP Bronze Tier',
    badgeName: 'VIP برونز 🥉',
    icon: '🥉',
    isVip: true,
    badgeStyle: 'bg-orange-600/15 text-orange-800 border-orange-500/30 dark:bg-orange-600/20 dark:text-orange-400 font-black',
    cardStyle: 'border-orange-300 dark:border-orange-800/60 bg-gradient-to-br from-orange-50/60 via-white to-amber-50/30 dark:from-orange-950/20 dark:via-[#131b2e] dark:to-orange-900/10 shadow-xs',
    gradientText: 'bg-gradient-to-r from-orange-700 via-amber-700 to-orange-800 dark:from-orange-300 dark:to-amber-400 bg-clip-text text-transparent font-black',
    glowEffect: 'ring-1 ring-orange-400/30',
    description: 'الباقة البرونزية VIP للمنشآت المتميزة النامية.',
    maxUsers: 'حتى 10 موظفين',
    maxBranches: 'حتى 3 فروع',
    supportLevel: 'دعم فني متميز',
  },
  standard: {
    id: 'standard',
    nameAr: 'اشتراك منشأة قياسي',
    nameEn: 'Standard Business Plan',
    badgeName: 'منشأة قياسي 🏢',
    icon: '🏢',
    isVip: false,
    badgeStyle: 'bg-indigo-500/10 text-indigo-700 border-indigo-500/20 dark:bg-indigo-500/20 dark:text-indigo-300 font-bold',
    cardStyle: 'border-slate-200 dark:border-slate-800 bg-white dark:bg-[#131b2e]',
    gradientText: 'text-slate-900 dark:text-white font-bold',
    glowEffect: '',
    description: 'الباقة القياسية الأساسية لأصحاب المنشآت.',
    maxUsers: 'حسب ترخيص الحساب',
    maxBranches: 'الفرع الرئيسي والفروع المعتمدة',
    supportLevel: 'دعم فني قياسي',
  },
};

export const getSubscriptionProfile = (tier?: string | null): SubscriptionProfile => {
  if (!tier) return SUBSCRIPTION_PROFILES.standard;
  const key = tier.trim().toLowerCase();
  return SUBSCRIPTION_PROFILES[key] || SUBSCRIPTION_PROFILES.standard;
};
