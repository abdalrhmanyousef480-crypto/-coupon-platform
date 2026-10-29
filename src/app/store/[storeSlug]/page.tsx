import Image from "next/image";
import { db } from "@/lib/db";
import { getTranslator } from "@/lib/i18n";
import { storeMetadata, breadcrumbJsonLd, collectionPageJsonLd, faqJsonLd, buildStoreFaqItems, isExpired, SITE_URL, storeHeading, storeBrandName } from "@/lib/seo";
import { redirectOrNotFound } from "@/lib/redirects";
import { publicStoreCategoriesInclude, categoriesOf, storesInCategoriesWhere } from "@/lib/store-categories";
import { SiteHeader } from "@/components/public/SiteHeader";
import { SiteFooter } from "@/components/public/SiteFooter";
import { CouponCard } from "@/components/public/CouponCard";
import { StoreCard } from "@/components/public/ContentCards";
import { StoreLogo } from "@/components/ui/StoreLogo";
import { SectionTitle } from "@/components/public/SectionTitle";
import { FaqAccordion } from "@/components/public/FaqAccordion";
import { Breadcrumbs } from "@/components/public/Breadcrumbs";
import { formatDate } from "@/lib/utils";
import { storeTipsBySlug } from "@/lib/store-tips";
import { getGuideForStore } from "@/lib/guides/registry";
import { MerchantReferences } from "@/components/public/MerchantReferences";
import Link from "next/link";
import { ExternalLink, Tag, Clock, Info, HelpCircle, Store, Lightbulb } from "lucide-react";
import type { Metadata } from "next";

/** Extra lift for coupon/store cards on this page — matches the stronger
 *  homepage hover treatment, applied here via each card's optional
 *  `className` passthrough so other pages stay on the site-wide default. */
const PREMIUM_CARD_HOVER = "hover:shadow-2xl hover:-translate-y-1.5";

export const revalidate = 3600;

export async function generateStaticParams() {
  const stores = await db.store.findMany({ where: { isPublished: true }, select: { slug: true }, take: 50 });
  return stores.map((s) => ({ storeSlug: s.slug }));
}

async function getStoreData(storeSlug: string) {
  const store = await db.store.findUnique({
    where: { slug: storeSlug, isPublished: true },
    include: publicStoreCategoriesInclude,
  });
  if (!store) return null;

  const categories = categoriesOf(store);

  const [coupons, relatedStores] = await Promise.all([
    db.coupon.findMany({
      where: { storeId: store.id, isPublished: true },
      orderBy: [{ isFeatured: "desc" }, { createdAt: "desc" }],
      include: { store: true },
    }),
    db.store.findMany({
      where: { ...storesInCategoriesWhere(categories.map((c) => c.id)), isPublished: true, id: { not: store.id } },
      take: 4,
      include: { _count: { select: { coupons: { where: { isPublished: true } } } } },
    }),
  ]);

  return { store, categories, coupons, relatedStores };
}

export async function generateMetadata({ params }: { params: Promise<{ storeSlug: string }> }): Promise<Metadata> {
  const { storeSlug } = await params;
  const store = await db.store.findUnique({ where: { slug: storeSlug, isPublished: true } });
  if (!store) return redirectOrNotFound(`/store/${storeSlug}`);
  // Keep canonical/indexing rules unchanged; only prefer a real active-code image.
  const metadata = storeMetadata(store, "ar");
  const activeCode = await db.coupon.findFirst({
    where: { storeId: store.id, isPublished: true, type: "CODE", code: { not: null },
      OR: [{ expiresAt: null }, { expiresAt: { gt: new Date() } }] },
    orderBy: [{ isFeatured: "desc" }, { createdAt: "desc" }],
    select: { code: true },
  });
  if (!activeCode?.code?.trim()) return metadata;
  const imageUrl = `${SITE_URL}/store/${store.slug}/card-image?v=2`;
  return {
    ...metadata,
    openGraph: { ...metadata.openGraph, images: [{ url: imageUrl, width: 1200, height: 1200, alt: `كود خصم ${store.name} ${activeCode.code}` }] },
    twitter: { ...metadata.twitter, images: [imageUrl] },
  };
}

export default async function StorePage({ params }: { params: Promise<{ storeSlug: string }> }) {
  const { storeSlug } = await params;
  const guideCandidate = getGuideForStore(storeSlug);
  const [data, guideArticle] = await Promise.all([
    getStoreData(storeSlug),
    guideCandidate ? db.article.findUnique({
      where: { slug: guideCandidate.articleSlug, status: "PUBLISHED", noindex: false },
      select: { slug: true },
    }) : Promise.resolve(null),
  ]);
  if (!data) {
    return redirectOrNotFound(`/store/${storeSlug}`);
  }

  const { store, categories, coupons, relatedStores } = data;
  // التصنيف "الأساسي" (الأقدم إسنادًا) = مسار الـ breadcrumb الواحد كما كان قبل تعدد التصنيفات
  const primaryCategory = categories[0];
  const locale = "ar" as const;
  const t = getTranslator(locale);
  const heading = storeHeading(store.name, store.slug);
  const pilot = store.slug === "uniformplues" || store.slug === "osma";
  // Only link a registered guide while its actual article is public and indexable.
  const guide = guideArticle ? guideCandidate : null;
  const activeCoupons = coupons.filter((c) => !isExpired(c.expiresAt));
  const primaryCodeCoupon = activeCoupons.find((c) => c.type === "CODE" && Boolean(c.code));
  // آخر تحقق للكوبونات الموسومة «تم التحقق» فقط، وإلا نعرض تاريخ تحديث البيانات.
  // تاريخ lastCheckedAt لا يثبت التحقق اليدوي من كوبون غير موثق.
  const lastVerifiedAt = activeCoupons.filter((c) => c.isVerified && c.manuallyVerifiedAt).reduce<Date | null>((latest, c) => {
    if (!c.manuallyVerifiedAt) return latest;
    return !latest || c.manuallyVerifiedAt > latest ? c.manuallyVerifiedAt : latest;
  }, null);
  const lastUpdatedAt = activeCoupons.reduce<Date | null>((latest, c) =>
    !latest || c.updatedAt > latest ? c.updatedAt : latest, null);
  const statusDate = lastVerifiedAt ?? lastUpdatedAt;

  const breadcrumbs = breadcrumbJsonLd([
    { name: t("nav.stores"), path: "/stores" },
    { name: store.name, path: `/store/${store.slug}` },
  ]);

  const faqItems = buildStoreFaqItems(store, categories, coupons);
  const faq = faqJsonLd(faqItems);
  // محتوى إضافي حقيقي عن المتجر (شحن/دفع/إرجاع أو نصيحة عامة موثوقة لو ما
  // فيه مصدر مختص) — راجع src/lib/store-tips.ts لتفاصيل المصادر لكل متجر.
  const tips = storeTipsBySlug[store.slug];

  // ItemList من نفس الكوبونات الفعّالة المعروضة فعليًا تحت (نفس المصفوفة،
  // بدون استعلام إضافي ولا ترتيب مختلف) — نفس نمط صفحة التصنيف بالضبط.
  const collection = collectionPageJsonLd({
    name: store.name,
    description: store.descriptionAr,
    url: `${SITE_URL}/store/${store.slug}`,
    itemUrls: activeCoupons.map((c) => `${SITE_URL}/store/${store.slug}/coupon/${c.slug}`),
  });

  const storeImageUrl = primaryCodeCoupon ? `${SITE_URL}/store/${store.slug}/card-image?v=2` : null;
  const imageSchema = storeImageUrl ? {
    "@context": "https://schema.org",
    "@type": "WebPage",
    "@id": `${SITE_URL}/store/${store.slug}#webpage`,
    url: `${SITE_URL}/store/${store.slug}`,
    primaryImageOfPage: { "@type": "ImageObject", contentUrl: storeImageUrl, width: 1200, height: 1200,
      caption: `كود خصم ${store.name} ${primaryCodeCoupon?.code}` },
  } : null;

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify([breadcrumbs, collection, faq, imageSchema].filter(Boolean)) }} />
      <SiteHeader locale={locale} />
      <main>
        <div className="relative overflow-hidden bg-surface py-12 md:py-14">
          {/* Soft navy/coral glow — decorative only, no new content */}
          <div aria-hidden="true" className="pointer-events-none absolute inset-0 -z-10">
            <div className="absolute -top-24 end-[10%] h-72 w-72 rounded-full bg-accent/[0.07] blur-3xl" />
            <div className="absolute -bottom-28 start-[8%] h-64 w-64 rounded-full bg-primary/[0.05] blur-3xl" />
          </div>
          <span aria-hidden="true" className="absolute inset-x-0 bottom-0 h-px bg-gradient-to-r from-transparent via-border-strong to-transparent" />

          <div className="max-w-container mx-auto px-5">
            <Breadcrumbs items={[{ label: t("nav.stores"), href: "/stores" }, ...(primaryCategory ? [{ label: primaryCategory.nameAr, href: `/category/${primaryCategory.slug}` }] : []), { label: store.name }]} />
            <div className="flex flex-wrap items-center gap-7">
              <div className="flex h-[104px] w-[104px] shrink-0 items-center justify-center rounded-2xl border border-border bg-surface p-2.5 shadow-md">
                <StoreLogo name={store.name} logoUrl={store.logoUrl} size={60} priority className="h-full w-full rounded-xl" />
              </div>
              <div className="min-w-[220px] flex-1">
                {/* H1 لصفحة المتجر يعبّر عن مجموعة الكوبونات، بينما H1 الكوبون الفردي يبرز العرض/الكود.
                    الاسم التجاري الكامل يظهر بخط أصغر إذا اختلف عن صيغة العلامة المختصرة. */}
                <h1 className="text-3xl font-extrabold tracking-normal text-primary md:text-4xl">
                  {locale === "ar" ? heading.phrase : store.name}
                  {locale === "ar" && heading.fullName && (
                    <span className="text-xl font-bold text-ink-muted md:text-2xl"> — {heading.fullName}</span>
                  )}
                </h1>
                <p className="mt-2 max-w-xl text-sm leading-relaxed text-ink-muted">{store.descriptionAr}</p>
                {categories.length > 1 && (
                  <p className="mt-3 flex flex-wrap items-center gap-x-1.5 text-xs font-semibold text-ink-muted">
                    <span>{locale === "ar" ? "التصنيفات:" : "Categories:"}</span>
                    {categories.map((c, i) => (
                      <span key={c.id} className="inline-flex items-center gap-1.5">
                        {i > 0 && <span aria-hidden="true" className="text-ink-faint">·</span>}
                        <Link href={`/category/${c.slug}`} className="text-primary hover:text-accent transition-colors">{c.nameAr}</Link>
                      </span>
                    ))}
                  </p>
                )}
                <div className="mt-4 flex flex-wrap gap-2.5">
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-accent-soft px-3.5 py-1.5 text-xs font-bold text-accent ring-1 ring-inset ring-accent/15">
                    <Tag className="h-3.5 w-3.5" /> {activeCoupons.length} {t("store.couponsCount")}
                  </span>
                  {statusDate && (
                    <span className="inline-flex items-center gap-1.5 rounded-full bg-surface-alt px-3.5 py-1.5 text-xs font-semibold text-ink-muted ring-1 ring-inset ring-border">
                      <Clock className="h-3.5 w-3.5" />
                      {locale === "ar" ? (lastVerifiedAt ? "آخر تحقق موثق" : "آخر تحديث للبيانات") : (lastVerifiedAt ? "Last verified" : "Data updated")}: <strong className="text-primary">{formatDate(statusDate, locale)}</strong>
                    </span>
                  )}
                </div>
              </div>
              <a href={store.website} target="_blank" rel="noopener noreferrer" className="btn-secondary btn-lg group shrink-0">
                {t("store.visitStore")}
                <ExternalLink className="h-4 w-4 transition-transform duration-200 group-hover:translate-x-0.5 rtl:group-hover:-translate-x-0.5" />
              </a>
            </div>
          </div>
        </div>

        <div className="max-w-container mx-auto px-5 py-16">
          <SectionTitle icon={Tag}>{locale === "ar" && pilot ? `أكواد خصم ${storeBrandName(store.name)} المتاحة` : locale === "ar" ? `أفضل أكواد خصم ${store.name}` : `Best ${store.name} Coupons`}</SectionTitle>
          {pilot && activeCoupons.length > 0 && (
            <p className="mb-4 text-sm leading-relaxed text-ink-muted">
              هذه الصفحة تعرض أكواد خصم {storeBrandName(store.name)} المتاحة. انسخ الكود مباشرة من البطاقة، وتأكد من تطبيق الخصم في السلة قبل الدفع.
            </p>
          )}
          {activeCoupons.length === 0 ? (
            <p className="rounded-lg border border-dashed border-border bg-surface-alt/60 text-ink-muted py-10 text-center">{locale === "ar" ? "لا توجد كوبونات متاحة حاليًا" : "No coupons available right now"}</p>
          ) : (
            <div className="mb-16 grid grid-cols-1 gap-6 md:grid-cols-3">
              {activeCoupons.map((coupon) => (
                <CouponCard key={coupon.id} coupon={coupon} store={coupon.store} locale={locale} showStore={false} className={PREMIUM_CARD_HOVER} />
              ))}
            </div>
          )}

          {primaryCodeCoupon && (
            <figure className="mb-14 mx-auto max-w-[380px]">
              <Image
                src={`/store/${store.slug}/card-image?v=2`}
                alt={`كود خصم ${store.name} ${primaryCodeCoupon.code} - كوبون نور`}
                width={1200}
                height={1200}
                unoptimized
                className="h-auto w-full rounded-2xl border border-border shadow-sm"
              />
              <figcaption className="mt-3 text-center text-sm text-ink-muted">
                كود خصم {store.name} — {primaryCodeCoupon.code}
              </figcaption>
            </figure>
          )}

          <div className="mb-14 max-w-2xl">
            <SectionTitle icon={Info}>{t("store.about")} {store.name}</SectionTitle>
            <div className="rounded-xl border border-border bg-surface-alt/60 p-6 shadow-sm">
              <p className="leading-relaxed text-ink/90">{store.descriptionAr}</p>
              {/* فقرة ثانية بمحتوى حقيقي مشتق من استعلامات الصفحة نفسها (عدد
                  الكوبونات الفعّالة + التصنيفات + تاريخ آخر مراجعة) — نفس نمط
                  الفقرة الثانية بصفحة التصنيف (category/[slug]/page.tsx)، مو
                  نص مختلق. قبل هذا التعديل كانت الفقرة فوق تتكرر حرفيًا مرتين
                  بنفس الصفحة (بالـ hero وهون)، وهذا بالضبط سبب واحد من أسباب
                  "low text-HTML ratio" و"low word count" اللي كشفهم Site Audit —
                  محتوى مكرر بدل محتوى جديد فعلي. */}
              {activeCoupons.length > 0 && (
                <p className="mt-3 leading-relaxed text-ink-muted text-sm">
                  {locale === "ar"
                    ? `نعرض حاليًا ${activeCoupons.length} كوبونًا وعرضًا منشورًا لدى ${store.name}${
                        categories.length > 0 ? `، مصنّفة ضمن ${categories.map((c) => c.nameAr).join("، ")}` : ""
                      }${lastVerifiedAt ? `، وآخر تحقق مسجل للكوبونات الموثقة بتاريخ ${formatDate(lastVerifiedAt, locale)}` : lastUpdatedAt ? `، وآخر تحديث لبيانات العروض بتاريخ ${formatDate(lastUpdatedAt, locale)}` : ""}.`
                    : `We currently track ${activeCoupons.length} active coupons for ${store.name}${
                        categories.length > 0 ? `, listed under ${categories.map((c) => c.name).join(", ")}` : ""
                      }${lastVerifiedAt ? `, with the last recorded check of verified coupons on ${formatDate(lastVerifiedAt, locale)}` : lastUpdatedAt ? `, with offer data updated on ${formatDate(lastUpdatedAt, locale)}` : ""}.`}
                </p>
              )}
            </div>
          </div>

          {guide && (
            <div className="mb-14 max-w-2xl rounded-xl border border-border bg-surface-alt/60 p-5">
              <p className="text-sm leading-relaxed text-ink-muted">
                لمعرفة تفاصيل المنتجات والشحن والاسترجاع، اقرأ{" "}
                <Link href={`/blog/${guide.articleSlug}`} className="font-semibold text-primary hover:text-accent transition-colors">
                  دليل {store.name}
                </Link>
                . أكواد الخصم الفعلية وشروطها موجودة في صفحات الكوبونات أعلاه.
              </p>
            </div>
          )}

          {tips && (
            <div className="mb-14 max-w-2xl">
              <SectionTitle icon={Lightbulb}>{locale === "ar" ? `نصائح ومعلومات عن ${store.name}` : `Tips about ${store.name}`}</SectionTitle>
              <div className="space-y-3 rounded-xl border border-border bg-surface-alt/60 p-6 shadow-sm">
                {tips.paragraphs.map((p, i) => (
                  <p key={i} className="text-sm leading-relaxed text-ink/90">{p}</p>
                ))}
                {tips.sources && <MerchantReferences sources={tips.sources} />}
              </div>
            </div>
          )}

          <div className="mb-14 max-w-2xl">
            <SectionTitle icon={HelpCircle}>{locale === "ar" ? `أسئلة شائعة حول ${store.name}` : `FAQ about ${store.name}`}</SectionTitle>
            <FaqAccordion items={faqItems} />
          </div>

          {relatedStores.length > 0 && (
            <div>
              <SectionTitle icon={Store}>{locale === "ar" ? "متاجر ذات صلة" : "Related Stores"}</SectionTitle>
              <div className="grid grid-cols-2 gap-6 md:grid-cols-4">
                {relatedStores.map((s) => (
                  <StoreCard key={s.id} store={s} couponCount={s._count.coupons} t={t} className={PREMIUM_CARD_HOVER} />
                ))}
              </div>
            </div>
          )}
        </div>
      </main>
      <SiteFooter locale={locale} />
    </>
  );
}
