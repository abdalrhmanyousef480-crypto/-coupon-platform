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
import { storeHubPath } from "@/lib/store-hub";

export const revalidate = 3600;

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const [stores, coupons, categories, articles] = await Promise.all([
    db.store.findMany({
      where: { isPublished: true, noindex: false },
      select: { id: true, slug: true, updatedAt: true, canonicalUrl: true, cardImageUrl: true, logoUrl: true, hubCouponSlug: true },
    }),
    // فلترة isPublished/noindex الخاصة بالمتجر التابع كمان (مو الكوبون بس) —
    // لإلغاء نشر متجر (toggleStorePublish) ما بيلمس isPublished بتاع كوبوناته،
    // فبدون هالشرط تفضل صفحة الكوبون بالسايتماب حتى لو متجرها اتلغى نشره
    // وصفحته بتعطي 404 فعليًا (راجع Site Audit: "2 incorrect pages found in sitemap.xml").
    db.coupon.findMany({
      where: { isPublished: true, noindex: false, store: { isPublished: true, noindex: false } },
      select: { slug: true, storeId: true, type: true, code: true, updatedAt: true, expiresAt: true, canonicalUrl: true, cardImageUrl: true, store: { select: { slug: true } } },
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

  // Unified store page (Nov 2026): one URL per store — the hub — carrying
  // every image shown on it, each at its existing URL. Non-hub store/coupon
  // URLs permanently redirect to the hub, so they are not listed.
  const couponsByStore = new Map<string, typeof activeCoupons>();
  for (const coupon of activeCoupons) {
    const list = couponsByStore.get(coupon.storeId) ?? [];
    list.push(coupon);
    couponsByStore.set(coupon.storeId, list);
  }
  const publishedSlugsByStore = new Map<string, Set<string>>();
  for (const coupon of coupons) {
    const set = publishedSlugsByStore.get(coupon.storeId) ?? new Set<string>();
    set.add(coupon.slug);
    publishedSlugsByStore.set(coupon.storeId, set);
  }

  const storePages: MetadataRoute.Sitemap = stores.flatMap((s) => {
    const hubCouponSlug = s.hubCouponSlug && publishedSlugsByStore.get(s.id)?.has(s.hubCouponSlug) ? s.hubCouponSlug : null;
    const hubPath = storeHubPath({ slug: s.slug, hubCouponSlug });
    const hubCanonical = hubCouponSlug ? coupons.find((c) => c.storeId === s.id && c.slug === hubCouponSlug)?.canonicalUrl : s.canonicalUrl;
    if (!isSelfCanonical(hubPath, hubCanonical)) return [];
    const storeCoupons = couponsByStore.get(s.id) ?? [];
    const hasActiveCode = storeCoupons.some((c) => c.type === "CODE" && Boolean(c.code?.trim()));
    const couponImage = (c: (typeof storeCoupons)[number]) => c.cardImageUrl || `${SITE_URL}/store/${s.slug}/coupon/${c.slug}/card-image?v=${COUPON_IMAGE_VERSION}`;
    const images = [
      ...(hasActiveCode ? [s.cardImageUrl || `${SITE_URL}/store/${s.slug}/card-image?v=2`] : []),
      ...storeCoupons.map(couponImage),
      // Distinct Instagram artwork of each live code stays discoverable.
      ...storeCoupons.filter((c) => !c.cardImageUrl && c.type === "CODE" && Boolean(c.code?.trim()))
        .map((c) => `${SITE_URL}/store/${s.slug}/coupon/${c.slug}/instagram-preview`),
    ];
    const latestCoupon = storeCoupons.reduce<Date | null>((latest, c) => (!latest || c.updatedAt > latest ? c.updatedAt : latest), null);
    return [{
      url: `${SITE_URL}${hubPath}`,
      lastModified: latestCoupon && latestCoupon > s.updatedAt ? latestCoupon : s.updatedAt,
      changeFrequency: "daily" as const,
      priority: 0.7,
      ...(images.length > 0 ? { images: Array.from(new Set(images)) } : {}),
    }];
  });

  const categoryPages: MetadataRoute.Sitemap = nonEmptyCategories.map((c) => ({
    url: `${SITE_URL}/category/${c.slug}`, lastModified: c.updatedAt, changeFrequency: "weekly", priority: 0.7,
  }));

  const articlePages: MetadataRoute.Sitemap = articles.filter((a) => isSelfCanonical(`/blog/${a.slug}`, a.canonicalUrl)).map((a) => ({
    url: `${SITE_URL}/blog/${a.slug}`, lastModified: a.updatedAt, changeFrequency: "monthly", priority: 0.6,
  }));

  return [...staticPages, ...storePages, ...categoryPages, ...articlePages];
}
