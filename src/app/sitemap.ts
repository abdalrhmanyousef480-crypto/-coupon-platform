// ============================================================
// SITEMAP الديناميكي — بنمط Next.js الرسمي (MetadataRoute.Sitemap).
// يُبنى مباشرة من قاعدة البيانات، فأي متجر/كوبون/تصنيف/مقال
// جديد يُضاف من الـ Admin Dashboard يظهر هون تلقائيًا بدون
// أي تدخل يدوي أو إعادة نشر.
// راجع: https://nextjs.org/docs/app/api-reference/file-conventions/metadata/sitemap
// ============================================================
import type { MetadataRoute } from "next";
import { db } from "@/lib/db";
import { SITE_URL, isExpired } from "@/lib/seo";
import { countCouponsByCategory } from "@/lib/category-coupons";

export const revalidate = 3600;

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const [stores, coupons, categories, articles] = await Promise.all([
    db.store.findMany({ where: { isPublished: true, noindex: false }, select: { id: true, slug: true, updatedAt: true } }),
    // فلترة isPublished/noindex الخاصة بالمتجر التابع كمان (مو الكوبون بس) —
    // لإلغاء نشر متجر (toggleStorePublish) ما بيلمس isPublished بتاع كوبوناته،
    // فبدون هالشرط تفضل صفحة الكوبون بالسايتماب حتى لو متجرها اتلغى نشره
    // وصفحته بتعطي 404 فعليًا (راجع Site Audit: "2 incorrect pages found in sitemap.xml").
    db.coupon.findMany({
      where: { isPublished: true, noindex: false, store: { isPublished: true, noindex: false } },
      select: { slug: true, updatedAt: true, expiresAt: true, store: { select: { slug: true } } },
    }),
    db.category.findMany({ where: { isPublished: true, noindex: false }, select: { id: true, slug: true, updatedAt: true } }),
    db.article.findMany({ where: { status: "PUBLISHED", noindex: false }, select: { slug: true, updatedAt: true } }),
  ]);

  // كوبون منشور بس منتهي الصلاحية يصير noindex تلقائيًا (نفس isExpired
  // بـ seo.ts، راجع couponMetadata) — استبعاده هون كمان يوقف تناقض
  // "sitemap يأشر على صفحة noindex" ويوفّر crawl budget. أما `noindex`
  // اليدوي (حقل Boolean بالموديل، مو nullable) فمُستبعد فوق مباشرة
  // بالـ where لكل موديل (store/coupon/category/article) عشان أي صف
  // انعلّم noindex يدويًا من الـ Admin ما يظهر أبدًا بالـ sitemap.
  const activeCoupons = coupons.filter((c) => !isExpired(c.expiresAt));

  // تصنيف بصفر كوبون فعّال حاليًا يصير noindex تلقائيًا (راجع generateMetadata
  // بصفحة التصنيف) — استبعاده هون كمان يوقف نفس تناقض "sitemap يأشر على
  // صفحة noindex" المذكور فوق لحالة الكوبونات المنتهية.
  const categoryCounts = await countCouponsByCategory(categories.map((c) => c.id), { isPublished: true });
  const nonEmptyCategories = categories.filter((c) => categoryCounts[c.id] > 0);
  // متجر بدون أي كوبون منشور حاليًا (نفس منطق التصنيف فوق، ونفس تعريف
  // isEmpty بـ generateMetadata لصفحة المتجر) — يُستبعد من الـ sitemap كمان.
  const storeIdsWithCoupons = new Set(coupons.map((c) => c.store.slug));
  const nonEmptyStores = stores.filter((s) => storeIdsWithCoupons.has(s.slug));
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

  const storePages: MetadataRoute.Sitemap = nonEmptyStores.map((s) => ({
    url: `${SITE_URL}/store/${s.slug}`, lastModified: s.updatedAt, changeFrequency: "daily", priority: 0.7,
  }));

  const couponPages: MetadataRoute.Sitemap = activeCoupons.map((c) => ({
    url: `${SITE_URL}/store/${c.store.slug}/coupon/${c.slug}`, lastModified: c.updatedAt, changeFrequency: "daily", priority: 0.6,
  }));

  const categoryPages: MetadataRoute.Sitemap = nonEmptyCategories.map((c) => ({
    url: `${SITE_URL}/category/${c.slug}`, lastModified: c.updatedAt, changeFrequency: "weekly", priority: 0.7,
  }));

  const articlePages: MetadataRoute.Sitemap = articles.map((a) => ({
    url: `${SITE_URL}/blog/${a.slug}`, lastModified: a.updatedAt, changeFrequency: "monthly", priority: 0.6,
  }));

  return [...staticPages, ...storePages, ...couponPages, ...categoryPages, ...articlePages];
}
