import Link from "next/link";
import { db } from "@/lib/db";
import { getTranslator } from "@/lib/i18n";
import { SiteHeader } from "@/components/public/SiteHeader";
import { SiteFooter } from "@/components/public/SiteFooter";
import { CouponCard } from "@/components/public/CouponCard";
import { StoreCard, CategoryCard, ArticleCard } from "@/components/public/ContentCards";
import { HeroSearch } from "@/components/public/HeroSearch";
import { HeroVisual } from "@/components/public/HeroVisual";
import { countCouponsByCategory } from "@/lib/category-coupons";
import { Store, Percent, LayoutGrid, Clock, BookOpen, ShieldCheck } from "lucide-react";
import type { LucideIcon } from "lucide-react";

/** Extra lift applied only to store/coupon cards on the homepage — a
 *  stronger hover than the site-wide .card-hover default, kept local to
 *  this page via each card's optional `className` passthrough. */
const PREMIUM_CARD_HOVER = "hover:shadow-2xl hover:-translate-y-1.5";

export const revalidate = 3600;

export default async function HomePage() {
  const locale = "ar" as const;
  const t = getTranslator(locale);

  const [popularStores, bestCoupons, categories, latestDeals, latestArticles, verifiedCouponCount] = await Promise.all([
    db.store.findMany({ where: { isPublished: true, isFeatured: true }, take: 6, include: { _count: { select: { coupons: true } } } }),
    db.coupon.findMany({
      where: { isPublished: true, isTopCoupon: true },
      take: 6, orderBy: [{ topCouponOrder: "asc" }, { createdAt: "desc" }],
      include: { store: true },
    }),
    db.category.findMany({ where: { isPublished: true }, take: 8 }),
    db.coupon.findMany({
      where: { isPublished: true },
      take: 4, orderBy: { createdAt: "desc" },
      include: { store: true },
    }),
    db.article.findMany({ where: { status: "PUBLISHED" }, take: 3, orderBy: { publishedAt: "desc" } }),
    // إحصائية ثقة حقيقية للهيرو — عدد الكوبونات المنشورة والموثّقة فعليًا الآن
    // (isVerified تُضبط يدويًا من فريق التحرير بعد تأكد فعلي من عمل الكود، راجع markCouponVerified)
    db.coupon.count({ where: { isPublished: true, isVerified: true } }),
  ]);

  const categoryCounts = await countCouponsByCategory(categories.map((c) => c.id));

  // Splits the approved hero.title copy so only its last word can be colored
  // like the reference design — same exact words/text, no wording changed.
  const heroTitle = t("hero.title");
  const heroTitleWords = heroTitle.split(" ");
  const heroTitleLead = heroTitleWords.slice(0, -1).join(" ");
  const heroTitleLast = heroTitleWords[heroTitleWords.length - 1];

  return (
    <>
      <SiteHeader locale={locale} />
      <main>
        <section className="relative overflow-hidden py-24 md:py-32">
          {/* Soft blush-pink wash concentrated on the physical right side (behind
              the decorative visual), plus the original navy/coral depth blobs —
              decorative only, no new content. Physical left/right (not logical
              start/end) because the wash must stay pinned under the visual
              regardless of the page's RTL direction. */}
          <div aria-hidden="true" className="pointer-events-none absolute inset-0 -z-10">
            <div className="absolute inset-y-0 right-0 w-full bg-gradient-to-l from-accent-soft/70 via-accent-soft/20 to-transparent md:w-[70%]" />
            <div className="absolute -top-28 right-[12%] h-[380px] w-[380px] rounded-full bg-accent/[0.08] blur-3xl" />
            <div className="absolute -bottom-16 left-[8%] h-64 w-64 rounded-full bg-primary/[0.05] blur-3xl" />
          </div>

          {/* Decorative visual — absolutely positioned against the full-bleed
              section (not the inner container) so it can sit in the background
              whitespace to the physical right of the centered content column
              without ever taking part in that column's centering/box model.
              Physical `right` (not logical `end`) so it stays pinned to the
              right regardless of the page's RTL direction.

              Only shown from xl: (1280px) up — below that, the centered content
              column (max-w-2xl, always dead-center of the viewport) leaves too
              little side clearance for a visual that isn't tiny, so lg/md/mobile
              all use the stacked-below version further down instead. Sizes/offsets
              below are solved against the content column's actual measured edge
              at each width (676px column, always viewport-centered) so the two
              never collide: 220px/right-4% clears the 1280px worst case by ~33px,
              300px/right-2.5% clears 1400–1536px by 29–93px. */}
          <div
            aria-hidden="true"
            className="pointer-events-none absolute inset-y-0 right-[4%] z-0 hidden items-center xl:flex min-[1400px]:right-[2.5%]"
          >
            <HeroVisual className="w-[220px] min-[1400px]:w-[300px]" />
          </div>

          <div className="max-w-container relative z-10 mx-auto px-5">
            {/* Main content stays truly centered — same centering as the
                site's original hero — and is never shifted to make room for
                the visual above; the visual only uses background whitespace
                that already exists beyond this column's max-width. */}
            <div className="mx-auto max-w-2xl text-center">
              {/* علامة البراند "كوبون نور" — نص فقط بلا أي إطار/خلفية/أيقونة، بخط
                  Tajawal شبه-bold وtracking-wide خفيف يعطيها طابع wordmark تحريري،
                  مع خط تحتي رفيع بلون accent ومسافة (underline-offset) مريحة عنه. */}
              <span className="mb-4 inline-block text-sm font-semibold tracking-wide text-primary underline decoration-accent decoration-1 underline-offset-8 sm:text-base">
                {t("site.name")}
              </span>
              {/* tracking-normal overrides the global h1-h4 negative letter-spacing
                  (tuned for the Latin font-display stack) — it over-compresses
                  Tajawal's Arabic glyphs at this size, same fix already applied to
                  the store <h1> and SectionTitle headings. leading-[1.35] gives
                  Arabic ascenders/descenders enough room to not crowd across the
                  wrapped lines. Sizes are arbitrary ([Npx]) at every breakpoint,
                  not Tailwind's named text-5xl/text-6xl scale — those bundle
                  their own line-height:1 that silently wins over leading-[1.35]
                  (same specificity, later in the compiled stylesheet), which was
                  the real cause of "الخصم" colliding with the line above it.
                  The last word is wrapped in its own span only to color it like
                  the reference — same exact copy, split for styling only. */}
              <h1 className="mx-auto mb-5 max-w-3xl text-[42px] font-extrabold leading-[1.35] tracking-normal sm:text-[48px] md:text-[60px] lg:text-[64px]">
                {heroTitleLead} <span className="text-accent">{heroTitleLast}</span>
              </h1>
              <p className="mx-auto mb-10 max-w-lg text-base text-ink-muted md:text-lg">{t("hero.subtitle")}</p>
              <HeroSearch />

              {verifiedCouponCount > 0 && (
                <div className="mt-6 flex justify-center">
                  <span className="inline-flex items-center gap-2 rounded-full bg-success-soft px-4 py-1.5 text-[13px] font-semibold text-success ring-1 ring-inset ring-success/15">
                    <ShieldCheck className="h-4 w-4 shrink-0" />
                    <span>
                      <strong className="font-extrabold">{verifiedCouponCount}</strong> {t("trust.verifiedCoupons")}
                    </span>
                  </span>
                </div>
              )}
            </div>

            {/* Mobile/tablet/small-desktop: no reliable side whitespace exists
                to overlay the visual into without risking overlap with the
                centered content, so it renders in normal flow below the
                content instead, also centered. Hidden at xl: where the
                absolute right-side version above takes over. */}
            <div aria-hidden="true" className="mt-14 flex justify-center xl:hidden">
              <HeroVisual className="w-56 sm:w-64 lg:w-72" />
            </div>
          </div>
        </section>

        <Section title={t("section.popularStores")} href="/stores" t={t} icon={Store}>
          <div className="grid grid-cols-2 gap-6 sm:grid-cols-3 md:grid-cols-6">
            {popularStores.map((store, i) => (
              <StoreCard key={store.id} store={store} couponCount={store._count.coupons} t={t} className={PREMIUM_CARD_HOVER} priority={i < 3} />
            ))}
          </div>
        </Section>

        <section className="relative overflow-hidden border-y border-border bg-surface-alt py-20">
          <span aria-hidden="true" className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-accent/40 to-transparent" />
          <div className="max-w-container mx-auto px-5">
            <SectionHead title={t("section.bestCoupons")} href="/coupons" t={t} icon={Percent} />
            <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
              {bestCoupons.map((coupon, i) => (
                <CouponCard key={coupon.id} coupon={coupon} store={coupon.store} locale={locale} className={PREMIUM_CARD_HOVER} priority={i < 3} />
              ))}
            </div>
          </div>
        </section>

        <Section title={t("section.categories")} href="/categories" t={t} icon={LayoutGrid}>
          <div className="grid grid-cols-2 gap-6 md:grid-cols-4">
            {categories.map((cat) => (
              <CategoryCard key={cat.id} category={cat} couponCount={categoryCounts[cat.id] ?? 0} locale={locale} />
            ))}
          </div>
        </Section>

        <section className="relative overflow-hidden border-y border-border bg-surface-alt py-20">
          <span aria-hidden="true" className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-accent/40 to-transparent" />
          <div className="max-w-container mx-auto px-5">
            <SectionHead title={t("section.latestDeals")} href="/coupons" t={t} icon={Clock} />
            <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 md:grid-cols-4">
              {latestDeals.map((coupon) => (
                <CouponCard key={coupon.id} coupon={coupon} store={coupon.store} locale={locale} className={PREMIUM_CARD_HOVER} />
              ))}
            </div>
          </div>
        </section>

        {latestArticles.length > 0 && (
          <Section title={t("section.blog")} href="/blog" t={t} icon={BookOpen}>
            <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
              {latestArticles.map((article) => (
                <ArticleCard key={article.id} article={article} locale={locale} />
              ))}
            </div>
          </Section>
        )}
      </main>
      <SiteFooter locale={locale} />
    </>
  );
}

function Section({
  title, href, t, icon, children,
}: { title: string; href: string; t: (k: string) => string; icon: LucideIcon; children: React.ReactNode }) {
  return (
    <section className="py-20">
      <div className="max-w-container mx-auto px-5">
        <SectionHead title={title} href={href} t={t} icon={icon} />
        {children}
      </div>
    </section>
  );
}

function SectionHead({
  title, href, t, icon: Icon,
}: { title: string; href: string; t: (k: string) => string; icon: LucideIcon }) {
  return (
    <div className="mb-9 flex items-end justify-between gap-4">
      <div className="flex items-center gap-3.5">
        <span className="hidden h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-accent-soft text-accent ring-1 ring-inset ring-accent/15 sm:flex">
          <Icon className="h-5 w-5" />
        </span>
        <div>
          <h2 className="text-[26px] font-extrabold leading-tight tracking-tight text-primary md:text-[28px]">{title}</h2>
          <span aria-hidden="true" className="mt-2 block h-[3px] w-10 rounded-full bg-gradient-to-r from-accent to-accent-hover" />
        </div>
      </div>
      <Link href={href} className="btn-outline btn-sm shrink-0">{t("viewAll")}</Link>
    </div>
  );
}