import { notFound, redirect } from "next/navigation";
import { db } from "@/lib/db";
import { getTranslator } from "@/lib/i18n";
import { storeMetadata, breadcrumbJsonLd, faqJsonLd, buildStoreFaqItems, isExpired } from "@/lib/seo";
import { findRedirect } from "@/lib/redirects";
import { SiteHeader } from "@/components/public/SiteHeader";
import { SiteFooter } from "@/components/public/SiteFooter";
import { CouponCard } from "@/components/public/CouponCard";
import { StoreCard } from "@/components/public/ContentCards";
import { StoreLogo } from "@/components/ui/StoreLogo";
import { SectionTitle } from "@/components/public/SectionTitle";
import { FaqAccordion } from "@/components/public/FaqAccordion";
import { Breadcrumbs } from "@/components/public/Breadcrumbs";
import { formatDate } from "@/lib/utils";
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
    include: { category: true },
  });
  if (!store) return null;

  const [coupons, relatedStores] = await Promise.all([
    db.coupon.findMany({
      where: { storeId: store.id, isPublished: true },
      orderBy: [{ isFeatured: "desc" }, { createdAt: "desc" }],
      include: { store: true },
    }),
    db.store.findMany({
      where: { categoryId: store.categoryId, isPublished: true, id: { not: store.id } },
      take: 4,
      include: { _count: { select: { coupons: { where: { isPublished: true } } } } },
    }),
  ]);

  return { store, coupons, relatedStores };
}

export async function generateMetadata({ params }: { params: Promise<{ storeSlug: string }> }): Promise<Metadata> {
  const { storeSlug } = await params;
  const store = await db.store.findUnique({ where: { slug: storeSlug } });
  if (!store) return {};
  return storeMetadata(store, "ar");
}

export default async function StorePage({ params }: { params: Promise<{ storeSlug: string }> }) {
  const { storeSlug } = await params;
  const data = await getStoreData(storeSlug);
  if (!data) {
    const redirectEntry = await findRedirect(`/store/${storeSlug}`);
    if (redirectEntry) redirect(redirectEntry.toPath);
    notFound();
  }

  const { store, coupons, relatedStores } = data;
  const locale = "ar" as const;
  const t = getTranslator(locale);
  const activeCoupons = coupons.filter((c) => !isExpired(c.expiresAt));

  const breadcrumbs = breadcrumbJsonLd([
    { name: t("nav.stores"), path: "/stores" },
    { name: store.name, path: `/store/${store.slug}` },
  ]);

  const faqItems = buildStoreFaqItems(store, store.category, coupons);
  const faq = faqJsonLd(faqItems);

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify([breadcrumbs, faq].filter(Boolean)) }} />
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
            <Breadcrumbs items={[{ label: t("nav.stores"), href: "/stores" }, { label: store.category.nameAr, href: `/category/${store.category.slug}` }, { label: store.name }]} />
            <div className="flex flex-wrap items-center gap-7">
              <div className="flex h-[104px] w-[104px] shrink-0 items-center justify-center rounded-2xl border border-border bg-surface p-2.5 shadow-md">
                <StoreLogo name={store.name} logoUrl={store.logoUrl} size={60} className="h-full w-full rounded-xl" />
              </div>
              <div className="min-w-[220px] flex-1">
                <h1 className="text-3xl font-extrabold tracking-tight text-primary md:text-4xl">{store.name}</h1>
                <p className="mt-2 max-w-xl text-sm leading-relaxed text-ink-muted">{store.descriptionAr}</p>
                <div className="mt-4 flex flex-wrap gap-2.5">
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-accent-soft px-3.5 py-1.5 text-xs font-bold text-accent ring-1 ring-inset ring-accent/15">
                    <Tag className="h-3.5 w-3.5" /> {activeCoupons.length} {t("store.couponsCount")}
                  </span>
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-surface-alt px-3.5 py-1.5 text-xs font-semibold text-ink-muted ring-1 ring-inset ring-border">
                    <Clock className="h-3.5 w-3.5" />
                    {locale === "ar" ? "آخر تحديث" : "Last updated"}: <strong className="text-primary">{formatDate(store.updatedAt, locale)}</strong>
                  </span>
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