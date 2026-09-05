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
import { formatDate } from "@/lib/utils";

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

function couponTitleFromParts(title: string, storeName: string, locale: Locale) {
  return locale === "ar"
    ? `${title} — ${storeName} | ${SITE_NAME.ar}`
    : `${title} — ${storeName} | ${SITE_NAME.en}`;
}
function defaultCouponTitle(coupon: Coupon, store: Store, locale: Locale) {
  const title = locale === "ar" ? coupon.titleAr : coupon.title;
  return couponTitleFromParts(title, store.name, locale);
}
function defaultCouponDescription(coupon: Coupon, locale: Locale) {
  const desc = locale === "ar" ? coupon.descriptionAr : coupon.description;
  return desc.slice(0, 155);
}

// ------------------------------------------------------------
// توليد اقتراحات SEO بنفس نمط الافتراضي أعلاه، لاستخدامها من فورم
// لوحة التحكم (زر "توليد تلقائي") قبل الحفظ الفعلي — بخلاف الدوال
// أعلاه اللي تُستخدم وقت العرض فقط لو الحقول اليدوية فاضية بقاعدة
// البيانات. القيم هون مقصوصة لحدود الـ schema (70/160 حرف).
// ------------------------------------------------------------
export function couponSeoSuggestions(input: {
  titleAr: string;
  descriptionAr: string;
  storeName: string;
  title?: string;
  description?: string;
}): { seoTitleAr: string; seoDescriptionAr: string; seoTitle: string; seoDescription: string } {
  return {
    seoTitleAr: couponTitleFromParts(input.titleAr, input.storeName, "ar").slice(0, 70),
    seoDescriptionAr: input.descriptionAr.slice(0, 160),
    seoTitle: input.title ? couponTitleFromParts(input.title, input.storeName, "en").slice(0, 70) : "",
    seoDescription: input.description ? input.description.slice(0, 160) : "",
  };
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

// Offer schema لصفحة الكوبون — priceValidUntil مربوط بـ expiresAt الفعلي،
// availability يعكس حالة الانتهاء الحقيقية (Discontinued بدل ما يبقى InStock
// لكوبون منتهي). ما فيه price/priceCurrency لأنه مو منتج فعلي وما عنا سعر
// حقيقي بقاعدة البيانات — discountLabel نص عرض حر ("20%", "$10", شحن مجاني...)
// مش قيمة سعرية قابلة للتحويل بأمان.
export function offerJsonLd(coupon: Coupon, store: Store) {
  const url = `${SITE_URL}/store/${store.slug}/coupon/${coupon.slug}`;
  return {
    "@context": "https://schema.org",
    "@type": "Offer",
    name: coupon.titleAr,
    description: coupon.descriptionAr,
    url,
    seller: { "@type": "Organization", name: store.name, url: store.website },
    ...(coupon.expiresAt
      ? { priceValidUntil: new Date(coupon.expiresAt).toISOString().slice(0, 10) }
      : {}),
    availability: isExpired(coupon.expiresAt)
      ? "https://schema.org/Discontinued"
      : "https://schema.org/InStock",
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

// ------------------------------------------------------------
// FAQ توليدية — مبنية على بيانات حقيقية (عدد الكوبونات الموثقة،
// نوعها، التصنيف، تاريخ آخر مراجعة) بدل سؤالين ثابتين بس يتبدل فيهم
// اسم المتجر. كل متجر بياخد أسئلة/أجوبة مختلفة فعليًا حسب وضعه.
// ------------------------------------------------------------

/** أول جملة من نص عربي طويل (حتى أول نقطة)، أو أول ~140 حرف لو ما
 *  فيه نقطة — تُستخدم لأخذ "مقتطف" بدل تكرار النص الكامل حرفيًا. */
function firstSentence(text: string, maxLen = 140): string {
  const trimmed = text.trim();
  const dotIndex = trimmed.indexOf(".");
  if (dotIndex > 10 && dotIndex < maxLen * 1.5) return trimmed.slice(0, dotIndex + 1);
  return trimmed.length > maxLen ? `${trimmed.slice(0, maxLen).trim()}…` : trimmed;
}

export function buildStoreFaqItems(store: Store, category: Category, coupons: Coupon[]): { question: string; answer: string }[] {
  const active = coupons.filter((c) => !isExpired(c.expiresAt));
  const totalCount = active.length;
  const verifiedCount = active.filter((c) => c.isVerified).length;
  const hasCode = active.some((c) => !!c.code);
  const hasNoCode = active.some((c) => !c.code);

  const items: { question: string; answer: string }[] = [];

  // س1: التحقق — الرقم الفعلي بيتغيّر حسب حالة المتجر، مو جملة ثابتة
  items.push({
    question: `هل جميع كوبونات ${store.name} تعمل؟`,
    answer:
      totalCount === 0
        ? `لا تتوفر كوبونات نشطة لمتجر ${store.name} حاليًا، لكن القائمة تُحدَّث باستمرار فتابعها من وقت لآخر.`
        : verifiedCount > 0
        ? `راجعنا ${verifiedCount} من أصل ${totalCount} كوبون${totalCount > 1 ? "ات" : ""} ${store.name} الحالية ووسمناها بـ«تم التحقق». مع ذلك قد يتوقف أي كود فجأة، فإذا واجهت مشكلة جرّب كوبونًا آخر من نفس المتجر.`
        : `لم تخضع كوبونات ${store.name} الحالية (${totalCount}) للتحقق اليدوي بعد، لكننا نراجعها بانتظام. إذا لم يعمل كود معيّن جرّب كوبونًا آخر من القائمة.`,
  });

  // س2: طريقة الاستخدام — تتغيّر حسب وجود أكواد فعلية أو عروض بدون كود
  items.push({
    question:
      hasCode && !hasNoCode
        ? `كيف أستخدم كود خصم ${store.name}؟`
        : !hasCode && hasNoCode
        ? `كيف أحصل على عروض ${store.name} بدون كود؟`
        : `كيف أستخدم كوبونات ${store.name}؟`,
    answer:
      hasCode && !hasNoCode
        ? "انسخ الكود من البطاقة، ثم اضغط «اذهب للمتجر» وأدخله في خانة كود الخصم عند إتمام الطلب."
        : !hasCode && hasNoCode
        ? `بعض عروض ${store.name} لا تحتاج كودًا — فقط اضغط «اذهب للمتجر» من البطاقة وسيُطبَّق الخصم تلقائيًا عند الدخول من الرابط.`
        : `يختلف الأمر من عرض لآخر: لو ظهر كود على البطاقة انسخه وأدخله عند الدفع، ولو كانت بدون كود فالخصم يُطبَّق تلقائيًا بمجرد الانتقال إلى ${store.name}.`,
  });

  // س3: سياق التصنيف — مبني على تصنيف المتجر الفعلي ووصفه (مش موجود بأي
  // مكان تاني بصفحة المتجر، فما فيه تكرار لنفس نص "عن المتجر")
  const sampleCoupon = active.find((c) => c.isVerified) || active.find((c) => c.isFeatured) || active[0];
  items.push({
    question: `لماذا أتسوق من ${store.name} ضمن تصنيف ${category.nameAr}؟`,
    answer: `${store.name} من متاجر تصنيف ${category.nameAr} على ${SITE_NAME.ar}. ${firstSentence(category.descriptionAr)}${
      sampleCoupon ? ` من العروض الحالية من ${store.name}: ${sampleCoupon.discountLabel}.` : ""
    }`,
  });

  // س4: تاريخ آخر مراجعة — تاريخ حقيقي مختلف لكل متجر، مو نص ثابت
  const lastChecked = active.reduce<Date | null>((latest, c) => {
    if (!c.lastCheckedAt) return latest;
    return !latest || c.lastCheckedAt > latest ? c.lastCheckedAt : latest;
  }, null) || store.updatedAt;
  items.push({
    question: `متى آخر تحديث لكوبونات ${store.name}؟`,
    answer: `راجعنا كوبونات ${store.name} آخر مرة بتاريخ ${formatDate(lastChecked, "ar")}. القائمة تُحدَّث بانتظام لإزالة أي كود منتهي الصلاحية.`,
  });

  return items;
}

export function buildCouponFaqItems(coupon: Coupon, store: Store, category: Category): { question: string; answer: string }[] {
  const items: { question: string; answer: string }[] = [];

  // س1: يعمل الآن؟ — يعتمد على isVerified الفعلي لنفس الكوبون
  items.push({
    question: `هل ${coupon.titleAr} يعمل الآن؟`,
    answer: coupon.isVerified
      ? "نعم، تم التحقق من هذا الكوبون مؤخرًا وهو يحمل علامة «تم التحقق». مع ذلك قد ينتهي فجأة، فإذا واجهت مشكلة جرّب كوبونًا آخر من نفس المتجر."
      : "نراجع الكوبونات بانتظام، لكن هذا الكوبون لم يخضع للتحقق اليدوي بعد. إذا لم يعمل الكود، جرّب كوبونًا آخر موثقًا من نفس المتجر.",
  });

  // س2: طريقة الاستخدام — كود أو بدون كود، لنفس الكوبون تحديدًا
  items.push({
    question: coupon.code ? `كيف أستخدم كود ${store.name}؟` : `كيف أحصل على هذا العرض من ${store.name}؟`,
    answer: coupon.code
      ? "الكود ظاهر مباشرة أعلى الصفحة، اضغط «نسخ» لنسخه ثم اضغط «اذهب للمتجر» للانتقال إلى الموقع وإدخاله عند إتمام الطلب."
      : "اضغط زر الحصول على العرض للانتقال مباشرة إلى صفحة العرض على موقع المتجر — لا حاجة لأي كود.",
  });

  // س3: تاريخ الانتهاء — تاريخ فعلي لهذا الكوبون تحديدًا لو موجود
  items.push({
    question: "متى ينتهي هذا العرض؟",
    answer: coupon.expiresAt
      ? `هذا العرض من ${store.name} صالح حتى ${formatDate(coupon.expiresAt, "ar")}. بعد هذا التاريخ قد يتوقف الكود عن العمل، فيُفضّل استخدامه قبل ذلك.`
      : `لم يحدد ${store.name} تاريخ انتهاء لهذا العرض، لكن الكوبونات قد تتوقف فجأة دون إشعار مسبق — إذا لم يعمل جرّب كوبونًا آخر من نفس المتجر.`,
  });

  // س4: سياق التصنيف — يربط الكوبون بباقي متاجر نفس التصنيف
  items.push({
    question: `هل يوجد عروض مشابهة ضمن تصنيف ${category.nameAr}؟`,
    answer: `نعم، ${store.name} أحد متاجر تصنيف ${category.nameAr} على ${SITE_NAME.ar}، ويمكنك تصفح بقية متاجر هذا التصنيف ومقارنة عروضها من صفحة "${category.nameAr}".`,
  });

  return items;
}
