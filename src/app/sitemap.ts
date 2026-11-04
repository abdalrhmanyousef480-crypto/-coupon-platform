// ============================================================
// SITEMAP الديناميكي — بنمط Next.js الرسمي (MetadataRoute.Sitemap).
// يُبنى مباشرة من قاعدة البيانات، فأي متجر/كوبون/تصنيف/مقال
// جديد يُضاف من الـ Admin Dashboard يظهر هون تلقائيًا بدون
// أي تدخل يدوي أو إعادة نشر.
// راجع: https://nextjs.org/docs/app/api-reference/file-conventions/metadata/sitemap
// ============================================================
import type { MetadataRoute } from "next";
import { db } from "@/lib/db";
import { SITE_URL, isExpired, isSelfCanonical, activePublishedCouponsWhere, COUPON_IMAGE_VERSION } from "@/lib/seo";
import { countCouponsByCategory } from "@/lib/category-coupons";
import { primaryCouponSlug } from "@/lib/coupon-hub";

export const revalidate = 3600;

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const [stores, coupons, categories, articles] = await Promise.all([
    db.store.findMany({
      where: { isPublished: true, noindex: false },
      select: { id: true, slug: true, updatedAt: true, canonicalUrl: true, cardImageUrl: true, logoUrl: true },
    }),
    // فلترة isPublished/noindex الخاصة بالمتجر التابع كمان (مو الكوبون بس) —
    // لإلغاء نشر متجر (toggleStorePublish) ما بيلمس isPublished بتاع كوبوناته،
    // فبدون هالشرط تفضل صفحة الكوبون بالسايتماب حتى لو متجرها اتلغى نشره
    // وصفحته بتعطي 404 فعليًا (راجع Site Audit: "2 incorrect pages found in sitemap.xml").
    db.coupon.findMany({
      where: { isPublished: true, noindex: false, store: { isPublished: true, noindex: false } },
      select: { id: true, slug: true, storeId: true, type: true, code: true, createdAt: true, updatedAt: true, expiresAt: true, canonicalUrl: true, cardImageUrl: true, store: { select: { slug: true } } },
    }),
    db.category.findMany({ where: { isPublished: true, noindex: false }, select: { id: true, slug: true, updatedAt: true } }),
    db.article.findMany({ where: { status: "PUBLISHED", noindex: false }, select: { slug: true, updatedAt: true, canonicalUrl: true } }),
  ]);

  // كوبون منشور بس منتهي الصلاحية يصير noindex تلقائيًا (نفس isExpired
  // بـ seo.ts، راجع couponMetadata) — استبعاده هون كمان يوقف تناقض
  // "sitemap يأشر على صفحة noindex" ويوفّر crawl budget. أما `noindex`
  // اليدوي (حقل Boolean بالموديل، مو nullable) فمُستبعد فوق مباشرة
  // بالـ where لكل موديل (store/coupon/category/article) عشان أي صف
  // انعلّم noindex يدويًا من الـ Admin ما يظهر أبدًا بالـ sitemap.
  const activeCoupons = coupons.filter((c) => !isExpired(c.expiresAt) && isSelfCanonical(`/store/${c.store.slug}/coupon/${c.slug}`, c.canonicalUrl));

  // تصنيف بصفر كوبون فعّال حاليًا يصير noindex تلقائيًا (راجع generateMetadata
  // بصفحة التصنيف) — استبعاده هون كمان يوقف نفس تناقض "sitemap يأشر على
  // صفحة noindex" المذكور فوق لحالة الكوبونات المنتهية.
  const categoryCounts = await countCouponsByCategory(categories.map((c) => c.id), activePublishedCouponsWhere());
  const nonEmptyCategories = categories.filter((c) => categoryCounts[c.id] > 0);
  // Published, explicitly indexable stores stay in the sitemap even with zero active coupons.
  const staticPages: MetadataRoute.Sitemap = [
    { url: SITE_URL, changeFrequency: "daily", priority: 1.0 },
    { url: `${SITE_URL}/coupons`, changeFrequency: "daily", priority: 0.9 },
    { url: `${SITE_URL}/stores`, changeFrequency: "daily", priority: 0.9 },
    { url: `${SITE_URL}/categories`, changeFrequency: "weekly", priority: 0.8 },
    { url: `${SITE_URL}/blog`, changeFrequency: "weekly", priority: 0.8 },
    { url: `${SITE_URL}/about`, changeFrequency: "monthly", priority: 0.3 },
    { url: `${SITE_URL}/contact`, changeFrequency: "monthly", priority: 0.3 },
    { url: `${SITE_URL}/privacy`, changeFrequency: "yearly", priority: 0.2 },
    { url: `${SITE_URL}/terms`, changeFrequency: "yearly", priority: 0.2 },
    { url: `${SITE_URL}/affiliate-disclosure`, changeFrequency: "yearly", priority: 0.2 },
    { url: `${SITE_URL}/editorial-policy`, changeFrequency: "yearly", priority: 0.2 },
    { url: `${SITE_URL}/coupon-verification-policy`, changeFrequency: "yearly", priority: 0.2 },
  ];

  // Store image sitemap entry only when the image endpoint has a published active code.
  const storesWithActiveCodes = new Set(
    coupons.filter((c) => c.type === "CODE" && Boolean(c.code?.trim()) && !isExpired(c.expiresAt))
      .map((c) => c.storeId)
  );

  // Updating a coupon changes the store page's visible content and primary
  // image, even if the stores table's updatedAt did not change. Keep lastmod
  // truthful for both pages so Google can schedule an appropriate recrawl.
  const latestCouponUpdateByStore = new Map<string, Date>();
  for (const coupon of activeCoupons) {
    const previous = latestCouponUpdateByStore.get(coupon.storeId);
    if (!previous || coupon.updatedAt > previous) latestCouponUpdateByStore.set(coupon.storeId, coupon.updatedAt);
  }

  const storePages: MetadataRoute.Sitemap = stores
    .filter((s) => isSelfCanonical(`/store/${s.slug}`, s.canonicalUrl))
    .map((s) => ({
      url: `${SITE_URL}/store/${s.slug}`,
      lastModified: latestCouponUpdateByStore.get(s.id) && latestCouponUpdateByStore.get(s.id)! > s.updatedAt
        ? latestCouponUpdateByStore.get(s.id)!
        : s.updatedAt,
      changeFrequency: "daily", priority: 0.7,
      ...(storesWithActiveCodes.has(s.id) ? { images: [s.cardImageUrl || `${SITE_URL}/store/${s.slug}/card-image?v=2`] } : {}),
    }));

  // One indexable coupon collection URL and one visible coupon image per store.
  // Secondary legacy image URLs remain served, but not listed as collection images.
  const couponsByStore = new Map<string, typeof coupons>();
  for (const coupon of coupons) {
    const group = couponsByStore.get(coupon.storeId) ?? [];
    group.push(coupon);
    couponsByStore.set(coupon.storeId, group);
  }
  const couponPages: MetadataRoute.Sitemap = [...couponsByStore.values()].flatMap((group) => {
    const storeSlug = group[0].store.slug;
    const hubSlug = primaryCouponSlug(storeSlug, group);
    const anchor = group.find((c) => c.slug === hubSlug);
    const live = group.filter((c) => !isExpired(c.expiresAt));
    if (!anchor || !live.length || !isSelfCanonical(`/store/${storeSlug}/coupon/${anchor.slug}`, anchor.canonicalUrl)) {
      return [];
    }
    const mainImageUrl = anchor.cardImageUrl ||
      `${SITE_URL}/store/${storeSlug}/coupon/${anchor.slug}/card-image?v=${COUPON_IMAGE_VERSION}`;
    const latestUpdated = live.reduce((latest, c) => c.updatedAt > latest ? c.updatedAt : latest, anchor.updatedAt);
    return [{
      url: `${SITE_URL}/store/${storeSlug}/coupon/${anchor.slug}`,
      lastModified: latestUpdated,
      changeFrequency: "daily" as const,
      priority: 0.6,
      images: [mainImageUrl],
    }];
  });

  const categoryPages: MetadataRoute.Sitemap = nonEmptyCategories.map((c) => ({
    url: `${SITE_URL}/category/${c.slug}`, lastModified: c.updatedAt, changeFrequency: "weekly", priority: 0.7,
  }));

  const articlePages: MetadataRoute.Sitemap = articles.filter((a) => isSelfCanonical(`/blog/${a.slug}`, a.canonicalUrl)).map((a) => ({
    url: `${SITE_URL}/blog/${a.slug}`, lastModified: a.updatedAt, changeFrequency: "monthly", priority: 0.6,
  }));

  return [...staticPages, ...storePages, ...couponPages, ...categoryPages, ...articlePages];
}
