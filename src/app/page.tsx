import Link from "next/link";
import { db } from "@/lib/db";
import { getTranslator } from "@/lib/i18n";
import { SiteHeader } from "@/components/public/SiteHeader";
import { SiteFooter } from "@/components/public/SiteFooter";
import { CouponCard } from "@/components/public/CouponCard";
import { StoreCard, CategoryCard, ArticleCard } from "@/components/public/ContentCards";
import { HeroSearch } from "@/components/public/HeroSearch";
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

  // العنوان يُعرض على سطرين — الكلمة الأخيرة ("الخصم") مفصولة وباللون الأحمر
  // للتأكيد البصري، لكن النص المصدر يبقى جملة واحدة بـ hero.title بملف i18n.
  const heroTitleWords = t("hero.title").trim().split(" ");
  const heroTitleAccentWord = heroTitleWords.pop() ?? "";
  const heroTitleLead = heroTitleWords.join(" ");

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

  return (
    <>
      <SiteHeader locale={locale} />
      <main>
        <section className="py-20 text-center md:py-28">
          <div className="max-w-container mx-auto px-5">
            <span className="mb-4 inline-block text-sm font-semibold text-primary underline decoration-accent decoration-1 underline-offset-[6px] sm:text-base">
              {t("site.name")}
            </span>
            {/* tracking-normal overrides the global h1-h4 negative letter-spacing
                (tuned for the Latin font-display stack) — it over-compresses
                Tajawal's Arabic glyphs at this size, same fix already applied to
                the store <h1> and SectionTitle headings. leading-[1.4] gives the
                two lines (last word broken out in accent color) enough room to
                not crowd each other. */}
            <h1 className="mx-auto mb-5 max-w-3xl text-[38px] font-extrabold leading-[1.4] tracking-normal sm:text-5xl md:text-6xl lg:text-[64px]">
              {heroTitleLead}
              <br />
              <span className="text-accent">{heroTitleAccentWord}</span>
            </h1>
            <p className="mx-auto mb-9 max-w-lg text-base text-ink-muted md:text-lg">{t("hero.subtitle")}</p>
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