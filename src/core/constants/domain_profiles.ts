/**
 * 🦅 Falcon ERP - Business Domain & Activity Type Profiles
 * Provides specialized styling, icons, labels, and domain-specific terminology
 * for retail, pharmacy, supermarket, clothing, electronics, hardware, and services.
 */

export interface DomainProfile {
  id: string;
  nameAr: string;
  nameEn: string;
  icon: string;
  badgeStyle: string;
  itemsCategoryLabel: string;
  itemsListLabel: string;
  itemsAddLabel: string;
  substitutesLabel: string;
  expiryAlertsLabel: string;
  brandsLabel: string;
  posTitle: string;
}

export const DOMAIN_PROFILES: Record<string, DomainProfile> = {
  pharmacy: {
    id: 'pharmacy',
    nameAr: 'صيدلية ومستلزمات طبية',
    nameEn: 'Pharmacy & Medical',
    icon: '💊',
    badgeStyle: 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20 dark:bg-emerald-500/20 dark:text-emerald-400',
    itemsCategoryLabel: 'الأدوية والمستحضرات',
    itemsListLabel: 'دليل الأدوية والمستلزمات',
    itemsAddLabel: 'إضافة دواء / مستحضر جديد',
    substitutesLabel: 'بدائل ومثائل الأدوية (المادة الفعالة)',
    expiryAlertsLabel: 'صلاحيات الأدوية والتشغيلات (Lots)',
    brandsLabel: 'الشركات ومصانع الأدوية',
    posTitle: 'نقطة بيع الصيدلية (POS)',
  },
  supermarket: {
    id: 'supermarket',
    nameAr: 'سوبرماركت ومواد غذائية',
    nameEn: 'Supermarket & Grocery',
    icon: '🛒',
    badgeStyle: 'bg-blue-500/10 text-blue-600 border-blue-500/20 dark:bg-blue-500/20 dark:text-blue-400',
    itemsCategoryLabel: 'السلع والمواد الغذائية',
    itemsListLabel: 'دليل السلع والمنتجات',
    itemsAddLabel: 'إضافة سلعة غذائية',
    substitutesLabel: 'السلع والمنتجات البديلة',
    expiryAlertsLabel: 'تواريخ الصلاحية وتنبيهات الركود',
    brandsLabel: 'العلامات التجارية والشركات',
    posTitle: 'كاشير السوبرماركت (POS)',
  },
  clothing: {
    id: 'clothing',
    nameAr: 'أزياء وملابس وأحذية',
    nameEn: 'Apparel & Fashion',
    icon: '👔',
    badgeStyle: 'bg-purple-500/10 text-purple-600 border-purple-500/20 dark:bg-purple-500/20 dark:text-purple-400',
    itemsCategoryLabel: 'الملابس والأزياء',
    itemsListLabel: 'دليل الموديلات والمقاسات',
    itemsAddLabel: 'إضافة موديل / قطعة جديدة',
    substitutesLabel: 'الموديلات البديلة',
    expiryAlertsLabel: 'مواسم وتصفيات الموديلات',
    brandsLabel: 'الماركات ودور الأزياء',
    posTitle: 'كاشير متجر الملابس (POS)',
  },
  electronics: {
    id: 'electronics',
    nameAr: 'أجهزة وإلكترونيات',
    nameEn: 'Electronics & Hardware',
    icon: '💻',
    badgeStyle: 'bg-cyan-500/10 text-cyan-600 border-cyan-500/20 dark:bg-cyan-500/20 dark:text-cyan-400',
    itemsCategoryLabel: 'الأجهزة والإلكترونيات',
    itemsListLabel: 'دليل الأجهزة والقطع',
    itemsAddLabel: 'إضافة جهاز / معدة إلكترونية',
    substitutesLabel: 'الأجهزة والبدائل المتوافقة',
    expiryAlertsLabel: 'فترات الضمان وسيريال الأجهزة',
    brandsLabel: 'الشركات المصنعة والماركات',
    posTitle: 'كاشير الإلكترونيات والضمانات (POS)',
  },
  hardware: {
    id: 'hardware',
    nameAr: 'حدايد وبويات ومواد بناء',
    nameEn: 'Hardware & Building',
    icon: '🔨',
    badgeStyle: 'bg-amber-500/10 text-amber-600 border-amber-500/20 dark:bg-amber-500/20 dark:text-amber-400',
    itemsCategoryLabel: 'الخامات ومواد البناء',
    itemsListLabel: 'دليل الخامات والمعدات',
    itemsAddLabel: 'إضافة مادة / خامة جديدة',
    substitutesLabel: 'الخامات البديلة والمكافئة',
    expiryAlertsLabel: 'صلاحيات الكيماويات والبويات',
    brandsLabel: 'المصانع والشركات الموردة',
    posTitle: 'نقطة بيع مواد البناء (POS)',
  },
  services: {
    id: 'services',
    nameAr: 'مراكز طبية وخدمات',
    nameEn: 'Centers & Services',
    icon: '🏥',
    badgeStyle: 'bg-rose-500/10 text-rose-600 border-rose-500/20 dark:bg-rose-500/20 dark:text-rose-400',
    itemsCategoryLabel: 'الخدمات الطبية والمستلزمات',
    itemsListLabel: 'دليل الخدمات والأسعار',
    itemsAddLabel: 'إضافة خدمة أو مستلزم جديد',
    substitutesLabel: 'الخدمات والخيارات البديلة',
    expiryAlertsLabel: 'صلاحيات المستلزمات الطبية',
    brandsLabel: 'الجهات والمصادر',
    posTitle: 'استقبال ونقطة محاسبة المركز (POS)',
  },
  retail: {
    id: 'retail',
    nameAr: 'تجارة عامة وتجزئة وجملة',
    nameEn: 'General Retail',
    icon: '🏢',
    badgeStyle: 'bg-indigo-500/10 text-indigo-600 border-indigo-500/20 dark:bg-indigo-500/20 dark:text-indigo-400',
    itemsCategoryLabel: 'الأصناف والمنتجات',
    itemsListLabel: 'قائمة الأصناف والمنتجات',
    itemsAddLabel: 'إضافة صنف جديد',
    substitutesLabel: 'بدائل ومثائل الأصناف',
    expiryAlertsLabel: 'تنبيهات الصلاحية والانتهاء',
    brandsLabel: 'الشركات المصنعة والماركات',
    posTitle: 'نقطة البيع الكلاسيكية السريعة (POS)',
  },
};

export const getDomainProfile = (activityType?: string | null): DomainProfile => {
  if (!activityType) return DOMAIN_PROFILES.retail;
  const key = activityType.trim().toLowerCase();
  return DOMAIN_PROFILES[key] || DOMAIN_PROFILES.retail;
};
