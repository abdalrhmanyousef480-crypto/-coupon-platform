import { db } from "@/lib/db";
import { SiteHeader } from "@/components/public/SiteHeader";
import { SiteFooter } from "@/components/public/SiteFooter";
import { countCouponsByCategory } from "@/lib/category-coupons";
import { PremiumHero } from "@/components/home/PremiumHero";
import { CouponCollection, StoreShowcase, CategoryShowcase, TrustSection, InteractiveCoupon, HomeJournal } from "@/components/home/HomeCollections";
import styles from "@/components/home/home.module.css";

export const revalidate = 3600;

export default async function HomePage() {
  const locale = "ar" as const;

  const [popularStores, bestCoupons, categories, latestDeals, latestArticles, verifiedCouponCount] = await Promise.all([
    db.store.findMany({ where: { isPublished: true, isFeatured: true }, take: 6, include: { _count: { select: { coupons: true } } } }),
    // store.isPublished/noindex هون كمان — toggleStorePublish ما بيلمس
    // Coupon.isPublished بتاع كوبونات المتجر، فبدون هالشرط يضل كوبون متجر
    // اتلغى نشره ممكن يظهر بالرئيسية (نفس فجوة couponsInCategoryWhere
    // المصلّحة بـ commit d43acab).
    db.coupon.findMany({
      where: { isPublished: true, isTopCoupon: true, store: { isPublished: true, noindex: false } },
      take: 6, orderBy: [{ topCouponOrder: "asc" }, { createdAt: "desc" }],
      include: { store: true },
    }),
    db.category.findMany({ where: { isPublished: true }, take: 8 }),
    db.coupon.findMany({
      where: { isPublished: true, store: { isPublished: true, noindex: false } },
      take: 4, orderBy: { createdAt: "desc" },
      include: { store: true },
    }),
    db.article.findMany({ where: { status: "PUBLISHED" }, take: 3, orderBy: { publishedAt: "desc" } }),
    // إحصائية ثقة حقيقية للهيرو — عدد الكوبونات المنشورة والموثّقة فعليًا الآن
    // (isVerified تُضبط يدويًا من فريق التحرير بعد تأكد فعلي من عمل الكود، راجع markCouponVerified)
    db.coupon.count({ where: { isPublished: true, isVerified: true, store: { isPublished: true, noindex: false } } }),
  ]);

  const categoryCounts = await countCouponsByCategory(categories.map((c) => c.id));

  // Presentation only: use an existing, current offer for the decorative scene.
  const currentOffers = [...bestCoupons, ...latestDeals].filter((coupon) => !coupon.expiresAt || coupon.expiresAt >= new Date());
  const sceneCoupon = currentOffers.find((coupon) => coupon.type === "CODE" && coupon.code) ?? currentOffers[0];

  return (
    <div className={styles.home}>
      <SiteHeader locale={locale} premium />
      <main id="home-main">
        <PremiumHero verifiedCount={verifiedCouponCount} coupon={sceneCoupon ? {
          storeName: sceneCoupon.store.name, discountLabel: sceneCoupon.discountLabel,
          code: sceneCoupon.code, isVerified: sceneCoupon.isVerified,
        } : undefined} />
        <CouponCollection coupons={bestCoupons} />
        <StoreShowcase stores={popularStores} />
        <CategoryShowcase categories={categories} counts={categoryCounts} />
        <TrustSection />
        <InteractiveCoupon coupon={sceneCoupon} />
        <CouponCollection coupons={latestDeals} latest />
        <HomeJournal articles={latestArticles} />
      </main>
      <SiteFooter locale={locale} />
    </div>
  );
}
