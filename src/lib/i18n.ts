// ============================================================
// TRANSLATIONS — كل نصوص الواجهة الثابتة (عربي/إنجليزي).
// المحتوى الفعلي (أسماء المتاجر، الكوبونات) موجود بقاعدة البيانات،
// هذا الملف فقط لنصوص الواجهة الثابتة (أزرار، عناوين أقسام...).
// ============================================================

export const STRINGS = {
  ar: {
    "site.name": "كوبون نور",
    "nav.home": "الرئيسية",
    "nav.coupons": "الكوبونات",
    "nav.stores": "المتاجر",
    "nav.categories": "التصنيفات",
    "nav.blog": "المدونة",
    "nav.about": "من نحن",
    "nav.contact": "تواصل معنا",
    "search.placeholder": "ابحث عن متجر أو كود خصم…",
    "hero.title": "وفر أكثر مع أفضل أكواد الخصم",
    "hero.subtitle": "آلاف الكوبونات الموثقة من متاجرك المفضلة، محدثة يوميًا.",
    "trust.verifiedCoupons": "كوبون تم التحقق منه ومتاح الآن",
    "section.popularStores": "متاجر شائعة",
    "section.bestCoupons": "أفضل الكوبونات",
    "section.categories": "تسوق حسب التصنيف",
    "section.latestDeals": "أحدث العروض",
    "section.blog": "من المدونة",
    "viewAll": "عرض الكل",
    "coupon.viewCoupons": "عرض الكوبونات",
    "coupon.showCode": "إظهار الكود",
    "coupon.getDeal": "الحصول على العرض",
    "coupon.copied": "تم النسخ ✓",
    "coupon.copyAction": "نسخ",
    "coupon.goToStore": "اذهب للمتجر",
    "coupon.useCode": "استخدام الكود",
    "coupon.copyCode": "نسخ الكود",
    "coupon.codeCopiedToast": "تم نسخ الكود ✓",
    "coupon.copyFailed": "تعذّر نسخ الكود، انسخه يدويًا",
    "coupon.verified": "تم التحقق",
    "coupon.type.code": "كود خصم",
    "coupon.type.deal": "عرض",
    "coupon.type.cashback": "كاش باك",
    "store.couponsCount": "كوبون متاح",
    "store.visitStore": "زيارة المتجر",
    "store.about": "عن",
    "footer.rights": "جميع الحقوق محفوظة.",
    "breadcrumb.home": "الرئيسية",
  },
  en: {
    "site.name": "Couponeta",
    "nav.home": "Home",
    "nav.coupons": "Coupons",
    "nav.stores": "Stores",
    "nav.categories": "Categories",
    "nav.blog": "Blog",
    "nav.about": "About",
    "nav.contact": "Contact",
    "search.placeholder": "Search for a store or coupon code…",
    "hero.title": "Save more with the best discount codes",
    "hero.subtitle": "Thousands of verified coupons from your favorite stores, updated daily.",
    "trust.verifiedCoupons": "verified coupons available right now",
    "section.popularStores": "Popular Stores",
    "section.bestCoupons": "Best Coupons",
    "section.categories": "Shop by Category",
    "section.latestDeals": "Latest Deals",
    "section.blog": "From the Blog",
    "viewAll": "View all",
    "coupon.viewCoupons": "View Coupons",
    "coupon.showCode": "Show Code",
    "coupon.getDeal": "Get Deal",
    "coupon.copied": "Copied ✓",
    "coupon.copyAction": "Copy",
    "coupon.goToStore": "Go to Store",
    "coupon.useCode": "Use Code",
    "coupon.copyCode": "Copy code",
    "coupon.codeCopiedToast": "Code copied",
    "coupon.copyFailed": "Couldn't copy code, please copy it manually",
    "coupon.verified": "Verified",
    "coupon.type.code": "Coupon Code",
    "coupon.type.deal": "Deal",
    "coupon.type.cashback": "Cashback",
    "store.couponsCount": "coupons available",
    "store.visitStore": "Visit Store",
    "store.about": "About",
    "footer.rights": "All rights reserved.",
    "breadcrumb.home": "Home",
  },
} as const;

export type Locale = "ar" | "en";
export type TranslationKey = keyof typeof STRINGS.ar;

export function getTranslator(locale: Locale) {
  return function t(key: TranslationKey | string): string {
    return (STRINGS[locale] as Record<string, string>)[key] || (STRINGS.en as Record<string, string>)[key] || key;
  };
}
