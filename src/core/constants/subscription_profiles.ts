/**
 * 🦅 Logixa Falcon ERP - Organization Subscription Tier Profiles & Permission Hierarchy
 * Manages organization account classification:
 * 1. trial      -> 7-Day Demo Trial Mode (حساب تجريبي ⏳)
 * 2. standard   -> Standard Business Plan (اشتراك منشأة قياسي 🏢)
 * 3. vip_bronze -> VIP Bronze Tier (VIP برونز 🥉)
 * 4. vip_silver -> VIP Silver Tier (VIP سيلفر 🥈)
 * 5. vip_gold   -> VIP Gold Tier (VIP جولد 👑)
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
  trial: {
    id: 'trial',
    nameAr: 'حساب تجريبي (7 أيام)',
    nameEn: '7-Day Demo Trial',
    badgeName: 'حساب تجريبي ⏳',
    icon: '⏳',
    isVip: false,
    badgeStyle: 'bg-rose-500/15 text-rose-700 border-rose-500/30 dark:bg-rose-500/20 dark:text-rose-400 font-black',
    cardStyle: 'border-rose-300 dark:border-rose-800 bg-gradient-to-br from-rose-50/60 via-white to-pink-50/30 dark:from-rose-950/20 dark:via-[#131b2e] dark:to-rose-900/10 shadow-xs',
    gradientText: 'text-rose-600 dark:text-rose-400 font-black',
    glowEffect: 'ring-1 ring-rose-400/30',
    description: 'حساب استكشافي لمدة 7 أيام للتعرف على واجهات النظام وإضافة أصناف تجريبية (البيع والمشتريات محجوبة حتى الترقية).',
    maxUsers: 'مالك الحساب فقط (معاينة)',
    maxBranches: 'الفرع التجريبي الرئيسي',
    supportLevel: 'دعم تجريبي استكشافي',
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
    description: 'الباقة القياسية الأساسية لأصحاب المنشآت (صاحب المنشأة والفرع الرئيسي مع إمكانية فتح نفس الحساب على عدة أجهزة).',
    maxUsers: 'صاحب المنشأة (فتح نفس الحساب على عدة أجهزة)',
    maxBranches: 'الفرع الرئيسي فقط',
    supportLevel: 'دعم فني قياسي',
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
    description: 'الباقة البرونزية VIP للمنشآت النامية المتميزة.',
    maxUsers: 'حتى 10 موظفين',
    maxBranches: 'حتى 3 فروع',
    supportLevel: 'دعم فني متميز',
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
    description: 'الباقة الذهبية VIP كأعلى مستوى للمنشآت الكبرى مع دعم ومزامنة غير محدودة وتخصيص كامل للألوان.',
    maxUsers: 'غير محدود',
    maxBranches: 'فروع متعددة غير محدودة',
    supportLevel: 'دعم فني مخصص VIP على مدار الساعة 24/7',
  },
};

export const getSubscriptionProfile = (tier?: string | null): SubscriptionProfile => {
  if (!tier) return SUBSCRIPTION_PROFILES.standard;
  const key = tier.trim().toLowerCase();
  return SUBSCRIPTION_PROFILES[key] || SUBSCRIPTION_PROFILES.standard;
};

export interface SubscriptionPermissions {
  canExecuteSales: boolean;
  canExecutePurchases: boolean;
  canAddProducts: boolean;
  canManageEmployees: boolean;
  canManageBranches: boolean;
  canChangeActivityType: boolean;
  canResetByDateRange: boolean;
  maxProductsLimit?: number;
  reasonIfBlocked?: string;
}

/**
 * فحص الصلاحيات والإمكانيات المتاحة لكل منشأة استناداً إلى نوع الباقة وانتهاء التاريخ
 */
export function getSubscriptionPermissions(
  tier?: string | null,
  isExpired?: boolean
): SubscriptionPermissions {
  const key = (tier || 'standard').trim().toLowerCase();

  if (isExpired) {
    return {
      canExecuteSales: false,
      canExecutePurchases: false,
      canAddProducts: false,
      canManageEmployees: false,
      canManageBranches: false,
      canChangeActivityType: false,
      canResetByDateRange: false,
      reasonIfBlocked: 'انتهت فترة اشتراك أو تجربة المنشأة. يرجى الترقية للتفعيل.',
    };
  }

  switch (key) {
    case 'trial':
      return {
        canExecuteSales: false, // الكاشير وشاشة POS للمعاينة والاستعراض فقط (لا تنفذ بيع)
        canExecutePurchases: false, // فواتير المشتريات غير متاحة
        canAddProducts: true, // مسموح إضافة أصناف تجريبية للمعاينة
        canManageEmployees: false,
        canManageBranches: false,
        canChangeActivityType: false,
        canResetByDateRange: false,
        maxProductsLimit: 15,
        reasonIfBlocked:
          'الحساب التجريبي مخصص للمعاينة واستكشاف النظام فقط (يمكنك استعراض الكاشير وإضافة أصناف تجريبية، بينما تنفيذ البيع والمشتريات محجوب لحين الترقية).',
      };
    case 'standard':
      return {
        canExecuteSales: true,
        canExecutePurchases: true,
        canAddProducts: true,
        canManageEmployees: false, // صاحب المنشأة فقط (يمكنه فتح نفس الحساب على عدة أجهزة)
        canManageBranches: false, // الفرع الرئيسي فقط
        canChangeActivityType: false, // معتمد من لوحة تحكم لوجيسكا
        canResetByDateRange: false, // غير متاح في الحساب القياسي
      };
    case 'vip_bronze':
    case 'vip_silver':
      return {
        canExecuteSales: true,
        canExecutePurchases: true,
        canAddProducts: true,
        canManageEmployees: true,
        canManageBranches: true,
        canChangeActivityType: false,
        canResetByDateRange: true,
      };
    case 'vip_gold':
    default:
      return {
        canExecuteSales: true,
        canExecutePurchases: true,
        canAddProducts: true,
        canManageEmployees: true,
        canManageBranches: true,
        canChangeActivityType: true,
        canResetByDateRange: true,
      };
  }
}
