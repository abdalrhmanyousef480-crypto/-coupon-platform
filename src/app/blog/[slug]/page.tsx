import { notFound, redirect } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import { db } from "@/lib/db";
import { getTranslator } from "@/lib/i18n";
import { articleMetadata, breadcrumbJsonLd, articleJsonLd, faqJsonLd } from "@/lib/seo";
import { findRedirect } from "@/lib/redirects";
import { couponsInCategoryWhere } from "@/lib/category-coupons";
import { storesInCategoriesWhere } from "@/lib/store-categories";
import { COUPON_PRIORITY_ORDER } from "@/lib/coupons-query";
import { GUIDE_REGISTRY } from "@/lib/guides/registry";
import { GuideTemplate } from "@/components/public/guide/GuideTemplate";
import { SiteHeader } from "@/components/public/SiteHeader";
import { SiteFooter } from "@/components/public/SiteFooter";
import { ArticleCard, StoreCard } from "@/components/public/ContentCards";
import { CouponCard } from "@/components/public/CouponCard";
import { formatDate, readingTime } from "@/lib/utils";
import type { Metadata } from "next";

export const revalidate = 3600;

type MentionTarget = { name: string; href: string };

/** يحوّل أول ذكر لاسم متجر داخل نص المقال إلى رابط لصفحة أفضل كوبون
 *  فعّال لهذا المتجر (كل متجر يُربط مرة وحدة فقط بالمقال كله، عبر `linked`)
 *  — بدون تعديل محتوى المقال المخزّن، فقط طريقة عرضه. */
function linkStoreMentions(text: string, targets: MentionTarget[], linked: Set<string>) {
  const pending = targets.filter((t) => !linked.has(t.name));
  if (pending.length === 0) return text;
  const escaped = pending.map((t) => t.name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"));
  const re = new RegExp(`(${escaped.join("|")})`, "i");
  const parts = text.split(re);
  if (parts.length === 1) return text;
  const byName = new Map(pending.map((t) => [t.name.toLowerCase(), t]));
  return parts.map((part, i) => {
    if (i % 2 === 0) return part;
    const target = byName.get(part.toLowerCase());
    if (!target || linked.has(target.name)) return part;
    linked.add(target.name);
    return (
      <Link key={i} href={target.href} className="font-semibold text-accent underline-offset-2 hover:underline">
        {part}
      </Link>
    );
  });
}

export async function generateStaticParams() {
  const articles = await db.article.findMany({ where: { status: "PUBLISHED" }, select: { slug: true } });
  return articles.map((a) => ({ slug: a.slug }));
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const article = await db.article.findUnique({ where: { slug } });
  if (!article) return {};
  return articleMetadata(article, "ar");
}

export default async function ArticlePage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const locale = "ar" as const;
  const t = getTranslator(locale);

  const article = await db.article.findUnique({
    where: { slug, status: "PUBLISHED" },
    include: { author: true, category: true },
  });
  if (!article) {
    const redirectEntry = await findRedirect(`/blog/${slug}`);
    if (redirectEntry) redirect(redirectEntry.toPath);
    notFound();
  }

  // دليل Premium مخصص لمتجر واحد (راجع src/lib/guides) — يُعرض بتركيبة
  // Guide* بدل الراوت العام تحت، بنفس الـ Article DB row بالضبط.
  const guideConfig = GUIDE_REGISTRY[article.slug];

  const [relatedArticles, relatedStores, relatedCoupons, mentionStores] = await Promise.all([
    article.categoryId
      ? db.article.findMany({ where: { categoryId: article.categoryId, id: { not: article.id }, status: "PUBLISHED" }, take: 3 })
      : Promise.resolve([]),
    // صفحة الدليل عندها روابطها الداخلية الخاصة (متجر/كوبون محددين
    // ديناميكيًا) — ما فيه داعي لنفس قسم "متاجر/كوبونات ذات صلة"
    // العام، فنتجنّب استعلامين إضافيين ما راح يُستخدموا.
    !guideConfig && article.categoryId
      ? db.store.findMany({
          where: { ...storesInCategoriesWhere([article.categoryId]), isPublished: true },
          take: 4,
          include: { _count: { select: { coupons: { where: { isPublished: true } } } } },
        })
      : Promise.resolve([]),
    !guideConfig && article.categoryId
      ? db.coupon.findMany({
          where: couponsInCategoryWhere(article.categoryId, {
            isPublished: true,
            OR: [{ expiresAt: null }, { expiresAt: { gt: new Date() } }],
          }),
          orderBy: COUPON_PRIORITY_ORDER,
          take: 3,
          include: { store: true },
        })
      : Promise.resolve([]),
    // متاجر منشورة عندها كوبون فعّال — لربط أي ذكر لاسمها داخل نص المقال
    // مباشرة بصفحة كوبونها الفردية.
    guideConfig
      ? Promise.resolve([])
      : db.store.findMany({
          where: { isPublished: true, coupons: { some: { isPublished: true, OR: [{ expiresAt: null }, { expiresAt: { gt: new Date() } }] } } },
          select: {
            slug: true,
            name: true,
            coupons: {
              where: { isPublished: true, OR: [{ expiresAt: null }, { expiresAt: { gt: new Date() } }] },
              orderBy: COUPON_PRIORITY_ORDER,
              take: 1,
              select: { slug: true },
            },
          },
        }),
  ]);

  const mentionTargets: MentionTarget[] = mentionStores
    .filter((s) => s.name.trim().length >= 3 && s.coupons[0])
    .map((s) => ({ name: s.name.trim(), href: `/store/${s.slug}/coupon/${s.coupons[0].slug}` }))
    .sort((a, b) => b.name.length - a.name.length);
  const linkedStores = new Set<string>();

  const breadcrumbs = breadcrumbJsonLd([
    { name: t("nav.blog"), path: "/blog" },
    { name: article.titleAr, path: `/blog/${article.slug}` },
  ]);
  const articleSchema = articleJsonLd(article, article.author.name, locale);
  // FAQ الخاصة بالدليل (لو موجودة) — نفس الدالة الموجودة أصلًا، مو
  // schema جديدة، وتُطابق حرفيًا الأسئلة/الأجوبة الظاهرة بـ GuideTemplate.
  const guideFaq = guideConfig ? faqJsonLd(guideConfig.faqItems) : null;

  const paragraphs = article.contentAr.split("\n\n").filter(Boolean);

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify([breadcrumbs, articleSchema, guideFaq].filter(Boolean)) }} />
      <SiteHeader locale={locale} />

      {guideConfig ? (
        <GuideTemplate article={article} config={guideConfig} locale={locale} relatedArticles={relatedArticles} />
      ) : (
        <main className="max-w-container mx-auto px-5 py-9">
          <nav className="flex items-center gap-1.5 text-[13px] text-ink-muted mb-5">
            <Link href="/" className="hover:text-primary transition-colors">الرئيسية</Link>
            <span className="text-ink-faint">‹</span>
            <Link href="/blog" className="hover:text-primary transition-colors">{t("nav.blog")}</Link>
            <span className="text-ink-faint">‹</span>
            <span aria-current="page" className="text-ink truncate max-w-[220px]">{article.titleAr}</span>
          </nav>

          <article className="max-w-[720px]">
            <h1 className="text-3xl mb-3.5 leading-tight">{article.titleAr}</h1>
            <div className="flex items-center gap-2.5 text-[13px] text-ink-muted mb-6">
              <span className="w-8 h-8 rounded-full bg-accent-soft text-accent flex items-center justify-center font-bold text-xs ring-1 ring-inset ring-accent/15">
                {article.author.name.charAt(0)}
              </span>
              <span>{t("blog.by")} {article.author.name}</span>
              <span className="text-ink-faint">·</span>
              <span>{article.publishedAt && formatDate(article.publishedAt, locale)}</span>
              <span className="text-ink-faint">·</span>
              <span>{readingTime(article.contentAr, locale)}</span>
            </div>

            <img
              src={article.featuredImage}
              alt={article.titleAr}
              fetchPriority="high"
              className="w-full rounded-lg border border-border shadow-sm mb-8"
            />

            {paragraphs.map((para, i) =>
              para.startsWith("## ") ? (
                <h2 key={i} className="text-xl mt-8 mb-3">{para.replace("## ", "")}</h2>
              ) : (
                <p key={i} className="text-ink/90 leading-[1.75] mb-4">{linkStoreMentions(para, mentionTargets, linkedStores)}</p>
              )
            )}
          </article>

          {relatedCoupons.length > 0 && (
            <div className="max-w-[780px] mt-11">
              <h2 className="text-lg mb-4">{locale === "ar" ? "كوبونات مرتبطة" : "Related Coupons"}</h2>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                {relatedCoupons.map((c) => (
                  <CouponCard key={c.id} coupon={c} store={c.store} locale={locale} />
                ))}
              </div>
            </div>
          )}

          {relatedStores.length > 0 && (
            <div className="max-w-[780px] mt-11">
              <h2 className="text-lg mb-4">{locale === "ar" ? "متاجر ذات صلة" : "Related Stores"}</h2>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-5">
                {relatedStores.map((s) => <StoreCard key={s.id} store={s} couponCount={s._count.coupons} t={t} />)}
              </div>
            </div>
          )}

          {relatedArticles.length > 0 && (
            <div className="max-w-[780px] mt-10">
              <h2 className="text-lg mb-4">{locale === "ar" ? "مقالات ذات صلة" : "Related Articles"}</h2>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                {relatedArticles.map((p) => <ArticleCard key={p.id} article={p} locale={locale} />)}
              </div>
            </div>
          )}
        </main>
      )}

      <SiteFooter locale={locale} />
    </>
  );
}
