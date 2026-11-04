import Image from "next/image";
import Link from "next/link";
import type { Category, Coupon, Store } from "@prisma/client";
import { ShieldCheck, Copy, CircleDollarSign, ExternalLink, BookOpen, ArrowLeft } from "lucide-react";
import { getTranslator } from "@/lib/i18n";
import {
  SITE_URL, COUPON_IMAGE_VERSION, breadcrumbJsonLd, faqJsonLd, offerJsonLd, howToJsonLd,
  storeBrandName, storeHeading, isExpired,
} from "@/lib/seo";
import { couponAnchorId, pickHubImage } from "@/lib/store-hub";
import { formatDate } from "@/lib/utils";
import { SiteHeader } from "@/components/public/SiteHeader";
import { SiteFooter } from "@/components/public/SiteFooter";
import { Breadcrumbs } from "@/components/public/Breadcrumbs";
import { FaqAccordion } from "@/components/public/FaqAccordion";
import { StoreCard } from "@/components/public/ContentCards";
import { MerchantReferences } from "@/components/public/MerchantReferences";
import { StoreLogo } from "@/components/ui/StoreLogo";
import { HubCodeActions } from "@/components/public/HubCodeActions";

type StoreWithCount = Store & { _count: { coupons: number } };

export interface StoreHubViewProps {
  store: Store;
  categories: Category[];
  /** Published coupons of the store, already in display priority order. */
  coupons: Coupon[];
  /** Path of this page (the hub). */
  hubPath: string;
  /** Slug of the coupon whose URL hosts the hub, or null when it is the store URL. */
  hubCouponSlug: string | null;
  relatedStores: StoreWithCount[];
  faqItems: { question: string; answer: string }[];
  tips?: { paragraphs: string[]; sources?: { label: string; url: string }[] } | null;
  guideSlug?: string | null;
  editorialLinks?: { slug: string; name: string; hubCouponSlug?: string | null }[];
}

export function couponImageUrl(store: Store, coupon: Coupon): string {
  return coupon.cardImageUrl || `${SITE_URL}/store/${store.slug}/coupon/${coupon.slug}/card-image?v=${COUPON_IMAGE_VERSION}`;
}

export function storeImageUrl(store: Store): string {
  return store.cardImageUrl || `${SITE_URL}/store/${store.slug}/card-image?v=2`;
}

function imageAlt(store: Store, coupon: Coupon): string {
  return coupon.code?.trim()
    ? `كود خصم ${store.name} ${coupon.code.trim()}`
    : `عرض ${store.name} ${coupon.discountLabel}`;
}

function merchantSite(website: string): { url: string; host: string } | null {
  try {
    const parsed = new URL(website);
    if (parsed.protocol === "https:" || parsed.protocol === "http:") {
      return { url: website, host: parsed.hostname.replace(/^www\./, "") };
    }
  } catch {
    // Legacy store data may contain an invalid URL.
  }
  return null;
}

/** Ordered images of the hub: every existing image keeps its own URL. */
export function hubImages(store: Store, coupons: Coupon[], hubCouponSlug: string | null) {
  const active = coupons.filter((c) => !isExpired(c.expiresAt));
  const primary = pickPrimary(active, hubCouponSlug);
  const hasActiveCode = active.some((c) => c.type === "CODE" && Boolean(c.code?.trim()));
  const pick = pickHubImage({
    source: store.hubImageSource,
    hubCouponSlug,
    hasActiveCode,
    activeCouponSlugs: active.map((c) => c.slug),
    primarySlug: primary?.slug ?? null,
  });
  const altCoupon = primary;
  const main = !pick || !altCoupon ? null
    : pick.kind === "store"
      ? { url: storeImageUrl(store), alt: imageAlt(store, altCoupon), width: 1200 }
      : (() => {
          const c = active.find((x) => x.slug === pick.slug)!;
          return { url: couponImageUrl(store, c), alt: imageAlt(store, c), width: 800 };
        })();
  return { main: main ? [main] : [] };
}

export function pickPrimary(active: Coupon[], hubCouponSlug: string | null): Coupon | undefined {
  return (hubCouponSlug && active.find((c) => c.slug === hubCouponSlug))
    || active.find((c) => c.type === "CODE" && Boolean(c.code?.trim()))
    || active[0];
}

export function StoreHubView({
  store, categories, coupons, hubPath, hubCouponSlug, relatedStores, faqItems, tips, guideSlug, editorialLinks = [],
}: StoreHubViewProps) {
  const locale = "ar" as const;
  const t = getTranslator(locale);
  const brand = storeBrandName(store.name);
  const primaryCategory = categories[0];
  const active = coupons.filter((c) => !isExpired(c.expiresAt));
  const primary = pickPrimary(active, hubCouponSlug);
  const others = active.filter((c) => c.id !== primary?.id);
  const images = hubImages(store, coupons, hubCouponSlug);
  const site = merchantSite(store.website);
  const hubUrl = `${SITE_URL}${hubPath}`;

  // H1 of each surviving URL stays what Google already ranks: the store
  // heading at the store URL, the hub coupon's title at a coupon URL.
  const heading = storeHeading(store.name, store.slug);
  const hubCoupon = hubCouponSlug ? coupons.find((c) => c.slug === hubCouponSlug) : undefined;
  const h1 = hubCoupon
    ? (/كود\s+خصم/.test(hubCoupon.titleAr) || !hubCoupon.code ? hubCoupon.titleAr : `كود خصم ${brand}: ${hubCoupon.titleAr}`)
    : heading.phrase;

  const lastVerifiedAt = active.filter((c) => c.isVerified && c.manuallyVerifiedAt)
    .reduce<Date | null>((latest, c) => (!latest || c.manuallyVerifiedAt! > latest ? c.manuallyVerifiedAt : latest), null);
  const lastUpdatedAt = active.reduce<Date | null>((latest, c) => (!latest || c.updatedAt > latest ? c.updatedAt : latest), null);
  const statusDate = lastVerifiedAt ?? lastUpdatedAt;

  const codeCount = active.length;
  const countLabel = codeCount === 1 ? "كوبون فعّال واحد" : codeCount === 2 ? "كوبونان فعّالان" : `${codeCount} كوبونات فعّالة`;

  const primaryCode = primary?.type === "CODE" ? primary.code?.trim() : null;
  const howToSteps = primaryCode
    ? [`انسخ كود الخصم "${primaryCode}" بالضغط على زر النسخ`, `انتقل إلى متجر ${store.name} وأضف منتجاتك إلى السلة`, "الصق الكود في خانة كود الخصم عند الدفع وتأكد من ظهور التخفيض"]
    : [`اذهب إلى العرض عبر متجر ${store.name}`, "أضف المنتجات التي تريدها إلى سلة التسوق", "أكمل الشراء — الخصم يُطبّق تلقائيًا بدون كود"];

  const breadcrumbItems = [
    { name: t("nav.stores"), path: "/stores" },
    ...(primaryCategory ? [{ name: primaryCategory.nameAr, path: `/category/${primaryCategory.slug}` }] : []),
    { name: store.name, path: hubPath },
  ];
  const jsonLd = [
    breadcrumbJsonLd(breadcrumbItems),
    faqJsonLd(faqItems),
    ...active.map((c) => offerJsonLd(c, store, c.id === primary?.id ? hubUrl : `${hubUrl}#${couponAnchorId(c.slug)}`)),
    howToJsonLd({ name: `طريقة استخدام كود خصم ${brand}`, steps: howToSteps }),
    images.main[0] ? {
      "@context": "https://schema.org",
      "@type": "WebPage",
      "@id": `${hubUrl}#webpage`,
      url: hubUrl,
      primaryImageOfPage: {
        "@type": "ImageObject",
        contentUrl: images.main[0].url,
        url: images.main[0].url,
        width: images.main[0].width,
        height: images.main[0].width,
        caption: `${images.main[0].alt} - كوبون نور`,
      },
    } : null,
  ].filter(Boolean);

  const destination = (c: Coupon) => c.affiliateUrl || c.storeUrl || store.website;
  
  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <SiteHeader locale={locale} />
      <main className="bg-bg">
        <section className="bg-primary text-white">
          <div className="max-w-container mx-auto px-5 pb-20 pt-6 md:pb-24 md:pt-8">
            <div className="[&_a]:text-white/75 [&_a:hover]:text-white [&_*]:text-white/90">
              <Breadcrumbs items={[
                { label: t("nav.stores"), href: "/stores" },
                ...(primaryCategory ? [{ label: primaryCategory.nameAr, href: `/category/${primaryCategory.slug}` }] : []),
                { label: store.name },
              ]} />
            </div>
            <div className="mt-2 flex items-start gap-4 md:gap-5">
              <div className="flex h-[72px] w-[72px] shrink-0 items-center justify-center rounded-lg bg-surface p-2 md:h-24 md:w-24">
                <StoreLogo name={store.name} logoUrl={store.logoUrl} size={64} priority className="h-full w-full rounded-md" />
              </div>
              <div className="min-w-0">
                <h1 className="text-[26px] font-extrabold leading-tight md:text-[40px]">
                  {h1}
                  {!hubCoupon && heading.fullName && (
                    <span className="block text-base font-bold text-white/70 md:text-xl">{heading.fullName}</span>
                  )}
                </h1>
              </div>
            </div>
            {primary && (
              <p className="mt-4 max-w-2xl text-[15px] leading-relaxed text-white/80 md:text-base">{primary.descriptionAr}</p>
            )}
            <div className="mt-5 flex flex-wrap gap-2">
              {codeCount > 0 && (
                <span className="rounded-full border border-white/20 bg-white/10 px-3 py-1 text-[13px] font-bold">{countLabel}</span>
              )}
              {statusDate && (
                <span className="inline-flex items-center gap-1.5 rounded-full border border-white/20 bg-white/10 px-3 py-1 text-[13px] font-bold">
                  <ShieldCheck className="h-3.5 w-3.5" aria-hidden="true" />
                  {lastVerifiedAt ? "تحقق يدوي" : "آخر تحديث"} · {formatDate(statusDate, locale)}
                </span>
              )}
            </div>
          </div>
        </section>

        <div className="max-w-container mx-auto -mt-12 flex flex-wrap items-start gap-7 px-5 pb-16">
          <div className="min-w-0 flex-[999_1_560px] space-y-10">
            {primary ? (
              <CodeCard
                store={store}
                coupon={primary}
                heading={primary.type === "CODE" && primary.code ? "كود خصم فعال لجميع العملاء" : "عرض فعال لجميع العملاء"}
                brand={brand}
                href={destination(primary)}
                elevated
              />
            ) : (
              <p className="rounded-lg border border-dashed border-border bg-surface py-10 text-center text-ink-muted">
                لا توجد كوبونات متاحة حاليًا لمتجر {store.name}
              </p>
            )}

            {others.length > 0 && (
              <section aria-labelledby="more-codes">
                <div className="flex items-baseline justify-between">
                  <h2 id="more-codes" className="text-xl font-extrabold text-primary md:text-2xl">كوبونات فعّالة أخرى</h2>
                  <span className="text-sm font-bold text-ink-muted">{others.length === 1 ? "كود واحد" : others.length === 2 ? "كودان" : `${others.length} أكواد`}</span>
                </div>
                <div className="mt-3 space-y-3">
                  {others.map((c) => (
                    <CodeCard key={c.id} store={store} coupon={c} heading={c.titleAr} brand={brand} href={destination(c)} />
                  ))}
                </div>
              </section>
            )}

            {images.main.length > 0 && (
              <section aria-label={`صورة كود خصم ${store.name}`} className="mx-auto max-w-[420px]">
                {images.main.map((img, i) => (
                  <figure key={img.url} className="rounded-lg border border-border bg-surface p-2.5">
                    <Image src={img.url} alt={img.alt} width={img.width} height={img.width} unoptimized loading={i === 0 ? "eager" : "lazy"}
                      className="h-auto w-full rounded-md" />
                    <figcaption className="px-1 pt-2 text-sm text-ink-muted">{img.alt}</figcaption>
                  </figure>
                ))}
              </section>
            )}

            <section aria-label="لماذا كوبون نور" className="grid grid-cols-3 gap-2 md:gap-3">
              {[
                { icon: ShieldCheck, label: "تحقق يدوي من الأكواد" },
                { icon: Copy, label: "نسخ بضغطة واحدة" },
                { icon: CircleDollarSign, label: "مجاني بالكامل" },
              ].map(({ icon: Icon, label }) => (
                <div key={label} className="rounded-lg border border-border bg-surface px-2 py-3 text-center">
                  <Icon className="mx-auto h-5 w-5 text-primary" aria-hidden="true" />
                  <p className="mt-1.5 text-xs font-bold leading-snug md:text-sm">{label}</p>
                </div>
              ))}
            </section>

            <section aria-labelledby="how-to">
              <h2 id="how-to" className="text-xl font-extrabold text-primary md:text-2xl">طريقة استخدام كوبون {brand}</h2>
              <ol className="mt-3 grid gap-3 md:grid-cols-3">
                {howToSteps.map((step, i) => (
                  <li key={i} className="flex gap-3 rounded-lg border border-border bg-surface p-4 md:block">
                    <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary text-sm font-extrabold text-white">{i + 1}</span>
                    <p className="text-sm leading-relaxed text-ink md:mt-3">{step}</p>
                  </li>
                ))}
              </ol>
            </section>

            <section aria-labelledby="faq">
              <h2 id="faq" className="mb-3 text-xl font-extrabold text-primary md:text-2xl">أسئلة شائعة حول {brand}</h2>
              <FaqAccordion items={faqItems} />
            </section>
          </div>

          <aside className="min-w-0 flex-[1_1_300px] space-y-4 md:mt-0">
            <section aria-labelledby="about-store" className="rounded-lg border border-border bg-surface p-5 md:p-6">
              <h2 id="about-store" className="text-lg font-extrabold text-primary">{t("store.about")} {store.name}</h2>
              <div className="mt-3 space-y-3 text-[15px] leading-relaxed text-ink/90">
                <p>{store.descriptionAr}</p>
                {tips?.paragraphs.map((p, i) => <p key={i}>{p}</p>)}
              </div>
              {tips?.sources && tips.sources.length > 0 && (
                <div className="mt-3 text-sm text-ink-muted">
                  <MerchantReferences sources={tips.sources} />
                </div>
              )}
              {site && (
                <a href={site.url} target="_blank" rel="noopener noreferrer"
                  className="mt-5 flex h-12 items-center justify-center gap-2 rounded-md border-[1.5px] border-primary text-[15px] font-extrabold text-primary hover:bg-surface-alt">
                  زيارة موقع {brand} <ExternalLink className="h-4 w-4" aria-hidden="true" />
                </a>
              )}
            </section>

            {guideSlug && (
              <Link href={`/blog/${guideSlug}`} className="group flex items-center gap-3 rounded-lg border border-border bg-surface p-4">
                <BookOpen className="h-5 w-5 shrink-0 text-accent" aria-hidden="true" />
                <span className="flex-1 text-sm font-bold text-primary">دليل متجر {store.name}: المنتجات والدفع والشحن</span>
                <ArrowLeft className="h-4 w-4 text-ink-faint" aria-hidden="true" />
              </Link>
            )}

            {editorialLinks.length > 0 && (
              <nav aria-label="متاجر مكملة" className="rounded-lg border border-border bg-surface p-5">
                <h2 className="text-lg font-extrabold text-primary">اكتشف متاجر أخرى</h2>
                <ul className="mt-2 space-y-1">
                  {editorialLinks.map((item) => (
                    <li key={item.slug}>
                      <Link href={item.hubCouponSlug ? `/store/${item.slug}/coupon/${item.hubCouponSlug}` : `/store/${item.slug}`} prefetch={false}
                        className="block py-1.5 text-sm font-bold text-primary hover:text-accent">{item.name}</Link>
                    </li>
                  ))}
                </ul>
              </nav>
            )}
          </aside>

          {relatedStores.length > 0 && (
            <section aria-labelledby="related-stores" className="w-full">
              <h2 id="related-stores" className="mb-3 text-xl font-extrabold text-primary md:text-2xl">متاجر مشابهة</h2>
              <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
                {relatedStores.map((s) => (
                  <StoreCard key={s.id} store={s} couponCount={s._count.coupons} t={t} />
                ))}
              </div>
            </section>
          )}
        </div>
      </main>
      <SiteFooter locale={locale} />
    </>
  );
}

function shortLabel(label: string): string | null {
  const t = label.trim();
  if (!t || t.length > 12) return null;
  return /\d/.test(t) ? `خصم ${t}` : t;
}

/** One code card: heading + discount pill, then the code/copy control. */
function CodeCard({ store, coupon, heading, brand, href, elevated = false }: {
  store: Store; coupon: Coupon; heading: string; brand: string; href: string; elevated?: boolean;
}) {
  void store;
  const pill = shortLabel(coupon.discountLabel);
  return (
    <article
      id={couponAnchorId(coupon.slug)}
      aria-label={heading}
      className={`scroll-mt-24 rounded-lg border border-border bg-surface p-5 ${elevated ? "shadow-lg" : "shadow-sm"}`}
    >
      <div className="mb-4 flex items-center justify-between gap-3">
        {elevated
          ? <h2 className="min-w-0 text-[15px] font-extrabold leading-snug text-primary md:text-base">{heading}</h2>
          : <h3 className="min-w-0 text-[15px] font-extrabold leading-snug text-primary md:text-base">{heading}</h3>}
        {pill && (
          <span className="shrink-0 rounded-full bg-primary px-3 py-1 text-xs font-extrabold text-white">{pill}</span>
        )}
      </div>
      <HubCodeActions couponId={coupon.id} code={coupon.type === "CODE" ? coupon.code : null} storeName={brand} href={href} />
    </article>
  );
}
