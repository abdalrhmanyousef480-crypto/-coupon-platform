import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { db } from "@/lib/db";
import { getTranslator } from "@/lib/i18n";
import { categoryMetadata, breadcrumbJsonLd } from "@/lib/seo";
import { findRedirect } from "@/lib/redirects";
import { couponsInCategoryWhere } from "@/lib/category-coupons";
import { SiteHeader } from "@/components/public/SiteHeader";
import { SiteFooter } from "@/components/public/SiteFooter";
import { CouponCard } from "@/components/public/CouponCard";
import { StoreCard, ArticleCard } from "@/components/public/ContentCards";
import type { Metadata } from "next";

export const revalidate = 3600;

export async function generateStaticParams() {
  const categories = await db.category.findMany({ where: { isPublished: true }, select: { slug: true } });
  return categories.map((c) => ({ slug: c.slug }));
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const category = await db.category.findUnique({ where: { slug } });
  if (!category) return {};
  return categoryMetadata(category, "ar");
}

export default async function CategoryPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const locale = "ar" as const;
  const t = getTranslator(locale);

  const category = await db.category.findUnique({ where: { slug, isPublished: true } });
  if (!category) {
    const redirectEntry = await findRedirect(`/category/${slug}`);
    if (redirectEntry) redirect(redirectEntry.toPath);
    notFound();
  }

  const [coupons, stores, articles] = await Promise.all([
    db.coupon.findMany({
      where: couponsInCategoryWhere(category.id, { isPublished: true }),
      take: 12,
      include: { store: true },
      orderBy: { createdAt: "desc" },
    }),
    db.store.findMany({
      where: { categoryId: category.id, isPublished: true },
      take: 8,
      include: { _count: { select: { coupons: { where: { isPublished: true } } } } },
    }),
    db.article.findMany({ where: { categoryId: category.id, status: "PUBLISHED" }, take: 3 }),
  ]);

  const breadcrumbs = breadcrumbJsonLd([
    { name: t("nav.categories"), path: "/categories" },
    { name: category.nameAr, path: `/category/${category.slug}` },
  ]);

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbs) }} />
      <SiteHeader locale={locale} />
      <main>
        <div className="border-b border-border bg-surface py-9">
          <div className="max-w-container mx-auto px-5">
            <nav className="flex items-center gap-1.5 text-[13px] text-ink-muted mb-5">
              <Link href="/" className="hover:text-primary transition-colors">الرئيسية</Link>
              <span className="text-ink-faint">‹</span>
              <Link href="/categories" className="hover:text-primary transition-colors">{t("nav.categories")}</Link>
              <span className="text-ink-faint">‹</span>
              <span aria-current="page" className="text-ink">{category.nameAr}</span>
            </nav>
            <h1 className="text-2xl">{category.emoji} {category.nameAr}</h1>
            <p className="text-ink-muted text-sm mt-1.5 max-w-xl">{category.descriptionAr}</p>
          </div>
        </div>
        <div className="max-w-container mx-auto px-5 py-9">
          {coupons.length > 0 && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-5 mb-12">
              {coupons.map((c) => (
                <CouponCard key={c.id} coupon={c} store={c.store} locale={locale} />
              ))}
            </div>
          )}

          {stores.length > 0 && (
            <div className="mb-10">
              <h2 className="text-lg mb-4">{locale === "ar" ? "أفضل المتاجر في هذا التصنيف" : "Top Stores in This Category"}</h2>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-5">
                {stores.map((s) => <StoreCard key={s.id} store={s} couponCount={s._count.coupons} t={t} />)}
              </div>
            </div>
          )}

          {articles.length > 0 && (
            <div>
              <h2 className="text-lg mb-4">{t("section.blog")}</h2>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                {articles.map((a) => <ArticleCard key={a.id} article={a} locale={locale} />)}
              </div>
            </div>
          )}
        </div>
      </main>
      <SiteFooter locale={locale} />
    </>
  );
}