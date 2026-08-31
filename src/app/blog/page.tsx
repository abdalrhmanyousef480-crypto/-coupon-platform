import { db } from "@/lib/db";
import { getTranslator } from "@/lib/i18n";
import { buildMetadata } from "@/lib/seo";
import { SiteHeader } from "@/components/public/SiteHeader";
import { SiteFooter } from "@/components/public/SiteFooter";
import { ArticleCard } from "@/components/public/ContentCards";
import type { Metadata } from "next";

export const revalidate = 3600;

export const metadata: Metadata = buildMetadata({
  title: "المدونة — كوبون نور",
  description: "نصائح ومقالات لمساعدتك على التوفير أكثر عند التسوق.",
  path: "/blog",
  locale: "ar",
});

export default async function BlogPage() {
  const locale = "ar" as const;
  const t = getTranslator(locale);
  const articles = await db.article.findMany({
    where: { status: "PUBLISHED" },
    orderBy: { publishedAt: "desc" },
    include: { category: true },
  });

  return (
    <>
      <SiteHeader locale={locale} />
      <main className="max-w-container mx-auto px-5 py-9">
        <h1 className="text-2xl mb-1.5">{t("nav.blog")}</h1>
        <p className="text-ink-muted text-sm mb-7">{locale === "ar" ? "نصائح ومقالات لمساعدتك على التوفير أكثر" : "Tips and articles to help you save"}</p>
        {articles.length === 0 ? (
          <p className="rounded-lg border border-dashed border-border bg-surface-alt/60 text-ink-muted text-center py-16">{locale === "ar" ? "لا توجد مقالات بعد" : "No articles yet"}</p>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            {articles.map((article) => (
              <ArticleCard key={article.id} article={article} categoryName={article.category?.nameAr} locale={locale} />
            ))}
          </div>
        )}
      </main>
      <SiteFooter locale={locale} />
    </>
  );
}
