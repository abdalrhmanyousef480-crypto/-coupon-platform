import { notFound, redirect } from "next/navigation";
import { db } from "@/lib/db";
import { getTranslator } from "@/lib/i18n";
import { couponMetadata, breadcrumbJsonLd, faqJsonLd, isExpired } from "@/lib/seo";
import { findRedirect } from "@/lib/redirects";
import { SiteHeader } from "@/components/public/SiteHeader";
import { SiteFooter } from "@/components/public/SiteFooter";
import { CouponCard } from "@/components/public/CouponCard";
import { StoreCard } from "@/components/public/ContentCards";
import { SectionTitle } from "@/components/public/SectionTitle";
import { FaqAccordion } from "@/components/public/FaqAccordion";
import { Breadcrumbs } from "@/components/public/Breadcrumbs";
import { CouponViewTracker } from "@/components/public/CouponViewTracker";
import { FileText, HelpCircle, Tag, Store, Info } from "lucide-react";
import type { Metadata } from "next";

/** Extra lift for the coupon/store cards on this page — matches the
 *  stronger homepage hover treatment, applied here via each card's
 *  optional `className` passthrough so other pages keep the site default. */
const PREMIUM_CARD_HOVER = "hover:shadow-2xl hover:-translate-y-1.5";

export const revalidate = 3600;

export async function generateStaticParams() {
  const coupons = await db.coupon.findMany({
    where: { isPublished: true, store: { isPublished: true } },
    take: 200,
    select: { slug: true, store: { select: { slug: true } } },
  });
  return coupons.map((c) => ({ storeSlug: c.store.slug, couponSlug: c.slug }));
}

async function getCouponData(storeSlug: string, couponSlug: string) {
  const coupon = await db.coupon.findFirst({
    where: { slug: couponSlug, isPublished: true, store: { slug: storeSlug, isPublished: true } },
    include: { store: { include: { category: true } } },
  });
  if (!coupon) return null;

  const [relatedCoupons, relatedStores] = await Promise.all([
    db.coupon.findMany({
      where: { storeId: coupon.storeId, id: { not: coupon.id }, isPublished: true },
      orderBy: [{ isFeatured: "desc" }, { createdAt: "desc" }],
      take: 3,
      include: { store: true },
    }),
    db.store.findMany({
      where: { categoryId: coupon.store.categoryId, isPublished: true, id: { not: coupon.storeId } },
      take: 4,
      include: { _count: { select: { coupons: { where: { isPublished: true } } } } },
    }),
  ]);

  return { coupon, relatedCoupons, relatedStores };
}

export async function generateMetadata({
  params,
}: { params: Promise<{ storeSlug: string; couponSlug: string }> }): Promise<Metadata> {
  const { storeSlug, couponSlug } = await params;
  const coupon = await db.coupon.findFirst({
    where: { slug: couponSlug, store: { slug: storeSlug } },
    include: { store: true },
  });
  if (!coupon) return {};
  return couponMetadata(coupon, coupon.store, "ar");
}

export default async function CouponPage({
  params,
}: { params: Promise<{ storeSlug: string; couponSlug: string }> }) {
  const { storeSlug, couponSlug } = await params;
  const data = await getCouponData(storeSlug, couponSlug);
  if (!data) {
    const redirectEntry = await findRedirect(`/store/${storeSlug}/coupon/${couponSlug}`);
    if (redirectEntry) redirect(redirectEntry.toPath);
    notFound();
  }

  const { coupon, relatedCoupons, relatedStores } = data;
  const { store } = coupon;
  const locale = "ar" as const;
  const t = getTranslator(locale);
  const expired = isExpired(coupon.expiresAt);
  const termsAr = coupon.termsAr?.trim();

  const breadcrumbs = breadcrumbJsonLd([
    { name: t("nav.stores"), path: "/stores" },
    { name: store.name, path: `/store/${store.slug}` },
    { name: coupon.titleAr, path: `/store/${store.slug}/coupon/${coupon.slug}` },
  ]);

  const faqItems = [
    {
      question: `هل ${coupon.titleAr} يعمل الآن؟`,
      answer: coupon.isVerified
        ? "نعم، تم التحقق من هذا الكوبون مؤخرًا وهو يحمل علامة «تم التحقق». مع ذلك قد ينتهي فجأة، فإذا واجهت مشكلة أخبرنا أو جرّب كوبونًا آخر من نفس المتجر."
        : "نراجع الكوبونات بانتظام، لكن هذا الكوبون لم يخضع للتحقق اليدوي بعد. إذا لم يعمل الكود، جرّب كوبونًا آخر موثقًا من نفس المتجر.",
    },
    {
      question: coupon.code ? `كيف أستخدم كود ${store.name}؟` : `كيف أحصل على هذا العرض من ${store.name}؟`,
      answer: coupon.code
        ? "الكود ظاهر مباشرة أعلى الصفحة، اضغط «نسخ» لنسخه ثم اضغط «اذهب للمتجر» للانتقال إلى الموقع وإدخاله عند إتمام الطلب."
        : "اضغط زر الحصول على العرض للانتقال مباشرة إلى صفحة العرض على موقع المتجر — لا حاجة لأي كود.",
    },
  ];
  const faq = faqJsonLd(faqItems);

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify([breadcrumbs, faq].filter(Boolean)) }} />
      <CouponViewTracker couponId={coupon.id} />
      <SiteHeader locale={locale} />
      <main>
        <div className="relative overflow-hidden bg-surface pt-12 pb-16 md:pt-14 md:pb-20">
          {/* Soft navy/coral glow — decorative only, no new content */}
          <div aria-hidden="true" className="pointer-events-none absolute inset-0 -z-10">
            <div className="absolute -top-24 end-[10%] h-72 w-72 rounded-full bg-accent/[0.07] blur-3xl" />
            <div className="absolute -bottom-28 start-[8%] h-64 w-64 rounded-full bg-primary/[0.05] blur-3xl" />
          </div>
          <span aria-hidden="true" className="absolute inset-x-0 bottom-0 h-px bg-gradient-to-r from-transparent via-border-strong to-transparent" />

          <div className="max-w-container mx-auto px-5">
            <Breadcrumbs
              items={[
                { label: t("nav.stores"), href: "/stores" },
                { label: store.name, href: `/store/${store.slug}` },
                { label: coupon.titleAr },
              ]}
            />

            {/* Single continuous column: the card and everything that's
                really "about this coupon" (terms, FAQ) share one rhythm
                instead of being split across separate padded sections. */}
            <div className="mx-auto max-w-2xl">
              <CouponCard coupon={coupon} store={store} locale={locale} size="lg" className={PREMIUM_CARD_HOVER} />

              {expired && (
                <p className="mt-4 rounded-lg border border-dashed border-border bg-surface-alt/60 py-3 text-center text-sm text-ink-muted">
                  {locale === "ar" ? "انتهت صلاحية هذا الكوبون — جرّب كوبونات أخرى من نفس المتجر أدناه." : "This coupon has expired — try another coupon from this store below."}
                </p>
              )}

              <div className="mt-12">
                <SectionTitle icon={Info}>{locale === "ar" ? `عن ${store.name}` : `About ${store.name}`}</SectionTitle>
                <div className="rounded-xl border border-border bg-surface-alt/60 p-6 shadow-sm">
                  <p className="leading-relaxed text-ink/90">{store.descriptionAr}</p>
                </div>
              </div>

              {termsAr && (
                <div className="mt-12">
                  <SectionTitle icon={FileText}>{locale === "ar" ? "الشروط والأحكام" : "Terms & Conditions"}</SectionTitle>
                  <div className="rounded-xl border border-border bg-surface-alt/60 p-6 shadow-sm">
                    <p className="whitespace-pre-line leading-relaxed text-ink/90">{termsAr}</p>
                  </div>
                </div>
              )}

              <div className="mt-12">
                <SectionTitle icon={HelpCircle}>{locale === "ar" ? "أسئلة شائعة" : "FAQ"}</SectionTitle>
                <FaqAccordion items={faqItems} />
              </div>
            </div>
          </div>
        </div>

        <div className="max-w-container mx-auto px-5 pb-16">
          {relatedCoupons.length > 0 && (
            <div className="mb-14">
              <SectionTitle icon={Tag}>{locale === "ar" ? `المزيد من كوبونات ${store.name}` : `More ${store.name} Coupons`}</SectionTitle>
              <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
                {relatedCoupons.map((c) => (
                  <CouponCard key={c.id} coupon={c} store={c.store} locale={locale} showStore={false} className={PREMIUM_CARD_HOVER} />
                ))}
              </div>
            </div>
          )}

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
