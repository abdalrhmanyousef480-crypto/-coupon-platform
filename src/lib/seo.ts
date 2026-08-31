// ============================================================
// SEO UTILITY SYSTEM — مركز التحكم بكل الـ Metadata بالموقع
// ============================================================
// المبدأ: كل صفحة SEO تجيب بياناتها من قاعدة البيانات (Store,
// Coupon, Category, Article)، ولو الحقول اليدوية (seoTitle,
// seoDescription) فاضية، نولّد قيمة افتراضية ذكية هون —
// بدل ما تكون فاضية أو مكررة بكل الموقع.
//
// هذا الملف يُستخدم من generateMetadata() بكل صفحة (راجع أي
// page.tsx تحت src/app) — نمط Next.js الرسمي للـ Dynamic Metadata.
// ============================================================

import type { Metadata } from "next";
import type { Store, Coupon, Category, Article } from "@prisma/client";

export const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || "https://couponeta.example.com";
export const SITE_NAME = { ar: "كوبون نور", en: "Couponeta" };

type Locale = "ar" | "en";

// ------------------------------------------------------------
// دوال توليد العنوان/الوصف الافتراضي لكل نوع محتوى
// تُستخدم فقط لو الحقل اليدوي بقاعدة البيانات فاضي
// ------------------------------------------------------------
function defaultStoreTitle(store: Store, locale: Locale) {
  return locale === "ar"
    ? `أفضل أكواد خصم وكوبونات ${store.name} ${new Date().getFullYear()} | ${SITE_NAME.ar}`
    : `${store.name} Coupons & Promo Codes ${new Date().getFullYear()} | ${SITE_NAME.en}`;
}
function defaultStoreDescription(store: Store, locale: Locale) {
  const desc = locale === "ar" ? store.descriptionAr : store.description;
  return desc.slice(0, 155);
}

function defaultCouponTitle(coupon: Coupon, store: Store, locale: Locale) {
  const title = locale === "ar" ? coupon.titleAr : coupon.title;
  return locale === "ar"
    ? `${title} — ${store.name} | ${SITE_NAME.ar}`
    : `${title} — ${store.name} | ${SITE_NAME.en}`;
}
function defaultCouponDescription(coupon: Coupon, locale: Locale) {
  const desc = locale === "ar" ? coupon.descriptionAr : coupon.description;
  return desc.slice(0, 155);
}

function defaultCategoryTitle(category: Category, locale: Locale) {
  const name = locale === "ar" ? category.nameAr : category.name;
  return locale === "ar"
    ? `أفضل كوبونات وخصومات ${name} | ${SITE_NAME.ar}`
    : `Best ${name} Coupons & Deals | ${SITE_NAME.en}`;
}
function defaultCategoryDescription(category: Category, locale: Locale) {
  const desc = locale === "ar" ? category.descriptionAr : category.description;
  return desc.slice(0, 155);
}

function defaultArticleTitle(article: Article, locale: Locale) {
  const title = locale === "ar" ? article.titleAr : article.title;
  return `${title} | ${locale === "ar" ? SITE_NAME.ar : SITE_NAME.en}`;
}
function defaultArticleDescription(article: Article, locale: Locale) {
  const desc = locale === "ar" ? article.excerptAr : article.excerpt;
  return desc.slice(0, 155);
}

// ------------------------------------------------------------
// بناء كائن Metadata كامل (يُستخدم مباشرة كـ return من generateMetadata)
// ------------------------------------------------------------
interface BuildMetaOptions {
  title: string;
  description: string;
  path: string;         // مثال: "/store/iherb" (بدون دومين)
  locale: Locale;
  ogImage?: string | null;
  noindex?: boolean;
  type?: "website" | "article";
}

export function buildMetadata({
  title, description, path, locale, ogImage, noindex, type = "website",
}: BuildMetaOptions): Metadata {
  const canonical = `${SITE_URL}${path}`;

  return {
    title,
    description,
    metadataBase: new URL(SITE_URL),
    alternates: {
      canonical,
      // ملاحظة: ما فيه نسخة إنجليزية فعلية بعد (لا يوجد /en بالموقع).
      // إضافة hreflang="en" هون كانت بتأشر لروابط 404 على كل صفحة —
      // نعيدها فقط لما نبني نسخة /en حقيقية.
    },
    robots: noindex ? { index: false, follow: true } : { index: true, follow: true },
    openGraph: {
      title,
      description,
      url: canonical,
      siteName: locale === "ar" ? SITE_NAME.ar : SITE_NAME.en,
      images: ogImage ? [{ url: ogImage }] : undefined,
      locale: locale === "ar" ? "ar_AR" : "en_US",
      type,
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: ogImage ? [ogImage] : undefined,
    },
  };
}

// ------------------------------------------------------------
// Metadata جاهزة لكل نوع محتوى — تُستدعى مباشرة من page.tsx
// ------------------------------------------------------------
export function storeMetadata(store: Store, locale: Locale): Metadata {
  const title = locale === "ar"
    ? (store.seoTitleAr || defaultStoreTitle(store, locale))
    : (store.seoTitle || defaultStoreTitle(store, locale));
  const description = locale === "ar"
    ? (store.seoDescriptionAr || defaultStoreDescription(store, locale))
    : (store.seoDescription || defaultStoreDescription(store, locale));
  return buildMetadata({
    title, description, path: `/store/${store.slug}`, locale,
    ogImage: store.ogImage || store.logoUrl, noindex: store.noindex || !store.isPublished,
  });
}

export function couponMetadata(coupon: Coupon, store: Store, locale: Locale): Metadata {
  const title = locale === "ar"
    ? (coupon.seoTitleAr || defaultCouponTitle(coupon, store, locale))
    : (coupon.seoTitle || defaultCouponTitle(coupon, store, locale));
  const description = locale === "ar"
    ? (coupon.seoDescriptionAr || defaultCouponDescription(coupon, locale))
    : (coupon.seoDescription || defaultCouponDescription(coupon, locale));
  return buildMetadata({
    title, description, path: `/store/${store.slug}/coupon/${coupon.slug}`, locale,
    // بدون ogImage يدوي هون عمدًا — بيلتقط تلقائيًا صورة OG الديناميكية
    // المولّدة من opengraph-image.tsx بنفس مسار الكوبون (تعرض قيمة
    // الخصم الفعلية، مو شعار المتجر المصغّر فقط)
    noindex: coupon.noindex || !coupon.isPublished || isExpired(coupon.expiresAt),
  });
}

export function categoryMetadata(category: Category, locale: Locale): Metadata {
  const title = locale === "ar"
    ? (category.seoTitleAr || defaultCategoryTitle(category, locale))
    : (category.seoTitle || defaultCategoryTitle(category, locale));
  const description = locale === "ar"
    ? (category.seoDescriptionAr || defaultCategoryDescription(category, locale))
    : (category.seoDescription || defaultCategoryDescription(category, locale));
  return buildMetadata({
    title, description, path: `/category/${category.slug}`, locale,
    noindex: category.noindex || !category.isPublished,
  });
}

export function articleMetadata(article: Article, locale: Locale): Metadata {
  const title = locale === "ar"
    ? (article.seoTitleAr || defaultArticleTitle(article, locale))
    : (article.seoTitle || defaultArticleTitle(article, locale));
  const description = locale === "ar"
    ? (article.seoDescriptionAr || defaultArticleDescription(article, locale))
    : (article.seoDescription || defaultArticleDescription(article, locale));
  return buildMetadata({
    title, description, path: `/blog/${article.slug}`, locale,
    ogImage: article.featuredImage, type: "article",
    noindex: article.noindex || article.status !== "PUBLISHED",
  });
}

// ------------------------------------------------------------
// حالة انتهاء الصلاحية — كوبون منتهي يصير noindex تلقائيًا
// (قيمة حقيقية = مؤهل للفهرسة، راجع قسم 20 بالبرومبت)
// ------------------------------------------------------------
export function isExpired(expiresAt: Date | null): boolean {
  if (!expiresAt) return false;
  return new Date(expiresAt).getTime() < Date.now();
}

// ------------------------------------------------------------
// Structured Data (JSON-LD) builders
// ------------------------------------------------------------
export function breadcrumbJsonLd(items: { name: string; path: string }[]) {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: items.map((item, i) => ({
      "@type": "ListItem",
      position: i + 1,
      name: item.name,
      item: `${SITE_URL}${item.path}`,
    })),
  };
}

export function organizationJsonLd(locale: Locale) {
  return {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: locale === "ar" ? SITE_NAME.ar : SITE_NAME.en,
    url: SITE_URL,
  };
}

export function websiteJsonLd(locale: Locale) {
  return {
    "@context": "https://schema.org",
    "@type": "WebSite",
    name: locale === "ar" ? SITE_NAME.ar : SITE_NAME.en,
    url: SITE_URL,
    potentialAction: {
      "@type": "SearchAction",
      target: `${SITE_URL}/coupons?q={search_term_string}`,
      "query-input": "required name=search_term_string",
    },
  };
}

export function articleJsonLd(article: Article, authorName: string, locale: Locale) {
  return {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: locale === "ar" ? article.titleAr : article.title,
    image: article.featuredImage,
    datePublished: article.publishedAt?.toISOString(),
    dateModified: (article.updatedAtContent || article.updatedAt).toISOString(),
    author: { "@type": "Person", name: authorName },
  };
}

// FAQPage schema — يُستخدم فقط لو فيه محتوى FAQ فعلي (مو Schema Spam، حسب قسم 18)
export function faqJsonLd(items: { question: string; answer: string }[]) {
  if (items.length === 0) return null;
  return {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: items.map((item) => ({
      "@type": "Question",
      name: item.question,
      acceptedAnswer: { "@type": "Answer", text: item.answer },
    })),
  };
}
