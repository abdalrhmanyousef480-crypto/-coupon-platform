import { notFound, redirect } from "next/navigation";
import { db } from "@/lib/db";
import { getTranslator } from "@/lib/i18n";
import { storeMetadata, breadcrumbJsonLd, collectionPageJsonLd, faqJsonLd, buildStoreFaqItems, isExpired, SITE_URL } from "@/lib/seo";
import { findRedirect } from "@/lib/redirects";
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
import Link from "next/link";
import { ExternalLink, Tag, Clock, Info, HelpCircle, Store } from "lucide-react";
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
  const store = await db.store.findUnique({ where: { slug: storeSlug } });
  if (!store) return {};
  // متجر بصفر كوبون فعّال حاليًا يصير noindex تلقائيًا (نفس منطق التصنيف).
  const couponCount = await db.coupon.count({ where: { isPublished: true, storeId: store.id } });
  return storeMetadata(store, "ar", couponCount === 0);
}

export default async function StorePage({ params }: { params: Promise<{ storeSlug: string }> }) {
  const { storeSlug } = await params;
  const data = await getStoreData(storeSlug);
  if (!data) {
    const redirectEntry = await findRedirect(`/store/${storeSlug}`);
    if (redirectEntry) redirect(redirectEntry.toPath);
    notFound();
  }

  const { store, categories, coupons, relatedStores } = data;
  // التصنيف "الأساسي" (الأقدم إسنادًا) = مسار الـ breadcrumb الواحد كما كان قبل تعدد التصنيفات
  const primaryCategory = categories[0];
  const locale = "ar" as const;
  const t = getTranslator(locale);
  const activeCoupons = coupons.filter((c) => !isExpired(c.expiresAt));
  // آخر مراجعة فعلية للكوبونات (مو store.updatedAt العام اللي ممكن ينحدّث
  // بأي تعديل إداري ما إله علاقة بمراجعة الكوبونات) — نفس الحساب المستخدم
  // جوا buildStoreFaqItems لسؤال "متى آخر تحديث؟"، معروض هون كمان بالـ
  // badge المرئي عشان التاريخ المعروض يطابق فعليًا آخر مراجعة حقيقية.
  // لو ما فيه كوبونات نشطة أصلًا (فما فيه lastCheckedAt نأخذ max منه)
  // منخفي البادج بدل ما نرجع لـ store.updatedAt غير الدقيق.
  const lastCheckedAt = activeCoupons.reduce<Date | null>((latest, c) => {
    if (!c.lastCheckedAt) return latest;
    return !latest || c.lastCheckedAt > latest ? c.lastCheckedAt : latest;
  }, null);

  const breadcrumbs = breadcrumbJsonLd([
    { name: t("nav.stores"), path: "/stores" },
    { name: store.name, path: `/store/${store.slug}` },
  ]);

  const faqItems = buildStoreFaqItems(store, categories, coupons);
  const faq = faqJsonLd(faqItems);

  // ItemList من نفس الكوبونات الفعّالة المعروضة فعليًا تحت (نفس المصفوفة،
  // بدون استعلام إضافي ولا ترتيب مختلف) — نفس نمط صفحة التصنيف بالضبط.
  const collection = collectionPageJsonLd({
    name: store.name,
    description: store.descriptionAr,
    url: `${SITE_URL}/store/${store.slug}`,
    itemUrls: activeCoupons.map((c) => `${SITE_URL}/store/${store.slug}/coupon/${c.slug}`),
  });

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify([breadcrumbs, collection, faq].filter(Boolean)) }} />
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
                <h1 className="text-3xl font-extrabold tracking-normal text-primary md:text-4xl">{store.name}</h1>
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
                  {lastCheckedAt && (
                    <span className="inline-flex items-center gap-1.5 rounded-full bg-surface-alt px-3.5 py-1.5 text-xs font-semibold text-ink-muted ring-1 ring-inset ring-border">
                      <Clock className="h-3.5 w-3.5" />
                      {locale === "ar" ? "آخر تحديث" : "Last updated"}: <strong className="text-primary">{formatDate(lastCheckedAt, locale)}</strong>
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
          <SectionTitle icon={Tag}>{locale === "ar" ? `أفضل أكواد خصم ${store.name}` : `Best ${store.name} Coupons`}</SectionTitle>
          {activeCoupons.length === 0 ? (
            <p className="rounded-lg border border-dashed border-border bg-surface-alt/60 text-ink-muted py-10 text-center">{locale === "ar" ? "لا توجد كوبونات متاحة حاليًا" : "No coupons available right now"}</p>
          ) : (
            <div className="mb-16 grid grid-cols-1 gap-6 md:grid-cols-3">
              {activeCoupons.map((coupon) => (
                <CouponCard key={coupon.id} coupon={coupon} store={coupon.store} locale={locale} showStore={false} className={PREMIUM_CARD_HOVER} />
              ))}
            </div>
          )}

          <div className="mb-14 max-w-2xl">
            <SectionTitle icon={Info}>{t("store.about")} {store.name}</SectionTitle>
            <div className="rounded-xl border border-border bg-surface-alt/60 p-6 shadow-sm">
              <p className="leading-relaxed text-ink/90">{store.descriptionAr}</p>
            </div>
          </div>

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