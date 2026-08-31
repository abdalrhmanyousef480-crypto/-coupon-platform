import { notFound, redirect } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import { db } from "@/lib/db";
import { getTranslator } from "@/lib/i18n";
import { articleMetadata, breadcrumbJsonLd, articleJsonLd } from "@/lib/seo";
import { findRedirect } from "@/lib/redirects";
import { SiteHeader } from "@/components/public/SiteHeader";
import { SiteFooter } from "@/components/public/SiteFooter";
import { ArticleCard, StoreCard } from "@/components/public/ContentCards";
import { CouponCard } from "@/components/public/CouponCard";
import { formatDate, readingTime } from "@/lib/utils";
import type { Metadata } from "next";

export const revalidate = 3600;

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

  const [relatedArticles, relatedStores] = await Promise.all([
    article.categoryId
      ? db.article.findMany({ where: { categoryId: article.categoryId, id: { not: article.id }, status: "PUBLISHED" }, take: 3 })
      : Promise.resolve([]),
    article.categoryId
      ? db.store.findMany({
          where: { categoryId: article.categoryId, isPublished: true },
          take: 4,
          include: { _count: { select: { coupons: { where: { isPublished: true } } } } },
        })
      : Promise.resolve([]),
  ]);

  const breadcrumbs = breadcrumbJsonLd([
    { name: t("nav.blog"), path: "/blog" },
    { name: article.titleAr, path: `/blog/${article.slug}` },
  ]);
  const articleSchema = articleJsonLd(article, article.author.name, locale);

  const paragraphs = article.contentAr.split("\n\n").filter(Boolean);

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify([breadcrumbs, articleSchema]) }} />
      <SiteHeader locale={locale} />
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
              <p key={i} className="text-ink/90 leading-[1.75] mb-4">{para}</p>
            )
          )}
        </article>

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
      <SiteFooter locale={locale} />
    </>
  );
}