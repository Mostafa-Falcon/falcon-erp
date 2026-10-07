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
 id:'pharmacy',
 nameAr:'صيدلية ومستلزمات طبية',
 nameEn:'Pharmacy & Medical',
 icon:'💊',
 badgeStyle:'bg-emerald-500/10 text-emerald-600 border-emerald-500/20 dark:bg-emerald-500/20 dark:text-emerald-400',
 itemsCategoryLabel:'الأدوية والمستحضرات',
 itemsListLabel:'دليل الأدوية والمستلزمات',
 itemsAddLabel:'إضافة دواء / مستحضر جديد',
 substitutesLabel:'بدائل ومثائل الأدوية (المادة الفعالة)',
 expiryAlertsLabel:'صلاحيات الأدوية والتشغيلات (Lots)',
 brandsLabel:'الشركات ومصانع الأدوية',
 posTitle:'نقطة بيع الصيدلية (POS)',
 },
 supermarket: {
 id:'supermarket',
 nameAr:'سوبرماركت ومواد غذائية',
 nameEn:'Supermarket & Grocery',
 icon:'🛒',
 badgeStyle:'bg-blue-500/10 text-blue-600 border-blue-500/20 dark:bg-blue-500/20 dark:text-blue-400',
 itemsCategoryLabel:'السلع والمواد الغذائية',
 itemsListLabel:'دليل السلع والمنتجات',
 itemsAddLabel:'إضافة سلعة غذائية',
 substitutesLabel:'السلع والمنتجات البديلة',
 expiryAlertsLabel:'تواريخ الصلاحية وتنبيهات الركود',
 brandsLabel:'العلامات التجارية والشركات',
 posTitle:'كاشير السوبرماركت (POS)',
 },
 clothing: {
 id:'clothing',
 nameAr:'أزياء وملابس وأحذية',
 nameEn:'Apparel & Fashion',
 icon:'👔',
 badgeStyle:'bg-purple-500/10 text-purple-600 border-purple-500/20 dark:bg-purple-500/20 dark:text-purple-400',
 itemsCategoryLabel:'الملابس والأزياء',
 itemsListLabel:'دليل الموديلات والمقاسات',
 itemsAddLabel:'إضافة موديل / قطعة جديدة',
 substitutesLabel:'الموديلات البديلة',
 expiryAlertsLabel:'مواسم وتصفيات الموديلات',
 brandsLabel:'الماركات ودور الأزياء',
 posTitle:'كاشير متجر الملابس (POS)',
 },
 electronics: {
 id:'electronics',
 nameAr:'أجهزة وإلكترونيات',
 nameEn:'Electronics & Hardware',
 icon:'💻',
 badgeStyle:'bg-cyan-500/10 text-cyan-600 border-cyan-500/20 dark:bg-cyan-500/20 dark:text-cyan-400',
 itemsCategoryLabel:'الأجهزة والإلكترونيات',
 itemsListLabel:'دليل الأجهزة والقطع',
 itemsAddLabel:'إضافة جهاز / معدة إلكترونية',
 substitutesLabel:'الأجهزة والبدائل المتوافقة',
 expiryAlertsLabel:'فترات الضمان وسيريال الأجهزة',
 brandsLabel:'الشركات المصنعة والماركات',
 posTitle:'كاشير الإلكترونيات والضمانات (POS)',
 },
 hardware: {
 id:'hardware',
 nameAr:'حدايد وبويات ومواد بناء',
 nameEn:'Hardware & Building',
 icon:'🔨',
 badgeStyle:'bg-amber-500/10 text-amber-600 border-amber-500/20 dark:bg-amber-500/20 dark:text-amber-400',
 itemsCategoryLabel:'الخامات ومواد البناء',
 itemsListLabel:'دليل الخامات والمعدات',
 itemsAddLabel:'إضافة مادة / خامة جديدة',
 substitutesLabel:'الخامات البديلة والمكافئة',
 expiryAlertsLabel:'صلاحيات الكيماويات والبويات',
 brandsLabel:'المصانع والشركات الموردة',
 posTitle:'نقطة بيع مواد البناء (POS)',
 },
 services: {
 id:'services',
 nameAr:'مراكز طبية وخدمات',
 nameEn:'Centers & Services',
 icon:'🏥',
 badgeStyle:'bg-rose-500/10 text-rose-600 border-rose-500/20 dark:bg-rose-500/20 dark:text-rose-400',
 itemsCategoryLabel:'الخدمات الطبية والمستلزمات',
 itemsListLabel:'دليل الخدمات والأسعار',
 itemsAddLabel:'إضافة خدمة أو مستلزم جديد',
 substitutesLabel:'الخدمات والخيارات البديلة',
 expiryAlertsLabel:'صلاحيات المستلزمات الطبية',
 brandsLabel:'الجهات والمصادر',
 posTitle:'استقبال ونقطة محاسبة المركز (POS)',
 },
  restaurant: {
    id: 'restaurant',
    nameAr: 'المطاعم والمأكولات السريعة',
    nameEn: 'Restaurants & Food Service',
    icon: '🍽️',
    badgeStyle: 'bg-amber-500/10 text-amber-600 border-amber-500/20 dark:bg-amber-500/20 dark:text-amber-400',
    itemsCategoryLabel: 'أقسام المأكولات والوجبات',
    itemsListLabel: 'قائمة الطعام والمنيو (Menu)',
    itemsAddLabel: 'إضافة وجبة / صنف طعام',
    substitutesLabel: 'الوجبات والبدائل المقترحة',
    expiryAlertsLabel: 'صلاحيات وتوريد اللحوم والمواد الطازجة',
    brandsLabel: 'المطابخ وأقسام التحضير',
    posTitle: 'كاشير المطاعم والصالة (POS)',
  },
  cafe: {
    id: 'cafe',
    nameAr: 'الكافيهات والمقاهي ومحلات المشروبات',
    nameEn: 'Cafes & Coffee Shops',
    icon: '☕',
    badgeStyle: 'bg-orange-500/10 text-orange-600 border-orange-500/20 dark:bg-orange-500/20 dark:text-orange-400',
    itemsCategoryLabel: 'قوائم المشروبات والحلويات',
    itemsListLabel: 'منيو المشروبات والبار (Barista)',
    itemsAddLabel: 'إضافة مشروب / صنف جديد',
    substitutesLabel: 'المشروبات والخيارات البديلة',
    expiryAlertsLabel: 'صلاحيات البن والحليب والمثلجات',
    brandsLabel: 'المحامص والشركات الموردة',
    posTitle: 'كاشير الكافيه والباريستا (POS)',
  },
  mobile_shop: {
    id: 'mobile_shop',
    nameAr: 'محلات وتجارة الموبايل والصيانة',
    nameEn: 'Mobile & Device Repair',
    icon: '📱',
    badgeStyle: 'bg-sky-500/10 text-sky-600 border-sky-500/20 dark:bg-sky-500/20 dark:text-sky-400',
    itemsCategoryLabel: 'الأجهزة وقطع الغيار',
    itemsListLabel: 'دليل الأجهزة والإكسسوارات',
    itemsAddLabel: 'إضافة جهاز أو قطعة جديدة',
    substitutesLabel: 'الأجهزة والبدائل المتوافقة',
    expiryAlertsLabel: 'فترات وسجلات الضمان',
    brandsLabel: 'الماركات والشركات المصنعة',
    posTitle: 'كاشير الموبايل والصيانة (POS)',
  },
  education: {
    id: 'education',
    nameAr: 'سناتر الدروس والأنشطة التعليمية والتدريب',
    nameEn: 'Educational Centers & Academies',
    icon: '🎓',
    badgeStyle: 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20 dark:bg-emerald-500/20 dark:text-emerald-400',
    itemsCategoryLabel: 'الكورسات والمذكرات الدراسية',
    itemsListLabel: 'دليل الكورسات والملازم',
    itemsAddLabel: 'إضافة كورس / مذكرات جديدة',
    substitutesLabel: 'المجموعات البديلة والمكافئة',
    expiryAlertsLabel: 'مواعيد انتهاء الاشتراكات والشهور',
    brandsLabel: 'المدرسين والمحاضرين',
    posTitle: 'كاشير السنتر وحجز الحصص (POS)',
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
  shop_fitting: {
    id: 'shop_fitting',
    nameAr: 'تجهيز المحلات والديكور والتشطيبات',
    nameEn: 'Shop Fitting & Interior Decor',
    icon: '🏗️',
    badgeStyle: 'bg-amber-600/10 text-amber-700 border-amber-500/20 dark:bg-amber-500/20 dark:text-amber-300',
    itemsCategoryLabel: 'الخامات وبنود المقايسة والديكور',
    itemsListLabel: 'دليل الخامات وبنود الأعمال',
    itemsAddLabel: 'إضافة خامة / بند تشطيب',
    substitutesLabel: 'الخامات وبدائل التشطيب',
    expiryAlertsLabel: 'مواعيد تسليم المشاريع والمقايسات',
    brandsLabel: 'المصانع وشركات التوريد',
    posTitle: 'شاشة المقايسات وفواتير التجهيز (POS)',
  },
};

export const getDomainProfile = (activityType?: string | null): DomainProfile => {
  if (!activityType) return DOMAIN_PROFILES.retail;
  const key = activityType.trim().toLowerCase();
  if (key === 'restaurant' || key === 'restaurants') return DOMAIN_PROFILES.restaurant;
  if (key === 'cafe' || key === 'cafes' || key === 'coffee') return DOMAIN_PROFILES.cafe;
  if (key === 'mobile' || key === 'mobile_shop' || key === 'mobiles') return DOMAIN_PROFILES.mobile_shop;
  if (key === 'education' || key === 'center' || key === 'academy') return DOMAIN_PROFILES.education;
  if (key === 'shop_fitting' || key === 'decoration' || key === 'decor' || key === 'fitout' || key === 'interior_design') return DOMAIN_PROFILES.shop_fitting;
  return DOMAIN_PROFILES[key] || DOMAIN_PROFILES.retail;
};