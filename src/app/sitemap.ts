// ============================================================
// SITEMAP الديناميكي — بنمط Next.js الرسمي (MetadataRoute.Sitemap).
// يُبنى مباشرة من قاعدة البيانات، فأي متجر/كوبون/تصنيف/مقال
// جديد يُضاف من الـ Admin Dashboard يظهر هون تلقائيًا بدون
// أي تدخل يدوي أو إعادة نشر.
// راجع: https://nextjs.org/docs/app/api-reference/file-conventions/metadata/sitemap
// ============================================================
import type { MetadataRoute } from "next";
import { db } from "@/lib/db";
import { SITE_URL } from "@/lib/seo";

export const revalidate = 3600;

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const [stores, coupons, categories, articles] = await Promise.all([
    db.store.findMany({ where: { isPublished: true }, select: { slug: true, updatedAt: true } }),
    db.coupon.findMany({
      where: { isPublished: true },
      select: { slug: true, updatedAt: true, store: { select: { slug: true } } },
    }),
    db.category.findMany({ where: { isPublished: true }, select: { slug: true, updatedAt: true } }),
    db.article.findMany({ where: { status: "PUBLISHED" }, select: { slug: true, updatedAt: true } }),
  ]);

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

  const storePages: MetadataRoute.Sitemap = stores.map((s) => ({
    url: `${SITE_URL}/store/${s.slug}`, lastModified: s.updatedAt, changeFrequency: "daily", priority: 0.7,
  }));

  const couponPages: MetadataRoute.Sitemap = coupons.map((c) => ({
    url: `${SITE_URL}/store/${c.store.slug}/coupon/${c.slug}`, lastModified: c.updatedAt, changeFrequency: "daily", priority: 0.6,
  }));

  const categoryPages: MetadataRoute.Sitemap = categories.map((c) => ({
    url: `${SITE_URL}/category/${c.slug}`, lastModified: c.updatedAt, changeFrequency: "weekly", priority: 0.7,
  }));

  const articlePages: MetadataRoute.Sitemap = articles.map((a) => ({
    url: `${SITE_URL}/blog/${a.slug}`, lastModified: a.updatedAt, changeFrequency: "monthly", priority: 0.6,
  }));

  return [...staticPages, ...storePages, ...couponPages, ...categoryPages, ...articlePages];
}
