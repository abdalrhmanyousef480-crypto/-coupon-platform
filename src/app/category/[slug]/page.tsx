import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { db } from "@/lib/db";
import { getTranslator } from "@/lib/i18n";
import { categoryMetadata, breadcrumbJsonLd, collectionPageJsonLd, faqJsonLd, buildCategoryFaqItems, SITE_URL } from "@/lib/seo";
import { findRedirect } from "@/lib/redirects";
import { couponsInCategoryWhere } from "@/lib/category-coupons";
import { storesInCategoriesWhere } from "@/lib/store-categories";
import { SiteHeader } from "@/components/public/SiteHeader";
import { SiteFooter } from "@/components/public/SiteFooter";
import { CouponCard } from "@/components/public/CouponCard";
import { StoreCard, ArticleCard } from "@/components/public/ContentCards";
import { FaqAccordion } from "@/components/public/FaqAccordion";
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

  const [coupons, stores, articles, couponCount, storeCount] = await Promise.all([
    db.coupon.findMany({
      where: couponsInCategoryWhere(category.id, { isPublished: true }),
      take: 12,
      include: { store: true },
      orderBy: { createdAt: "desc" },
    }),
    db.store.findMany({
      where: { ...storesInCategoriesWhere([category.id]), isPublished: true },
      take: 8,
      include: { _count: { select: { coupons: { where: { isPublished: true } } } } },
    }),
    db.article.findMany({ where: { categoryId: category.id, status: "PUBLISHED" }, take: 3 }),
    // عدد حقيقي كامل (مو محدود بـ take:12) — يُستخدم بالـ FAQ التوليدية تحت
    db.coupon.count({ where: couponsInCategoryWhere(category.id, { isPublished: true }) }),
    db.store.count({ where: { ...storesInCategoriesWhere([category.id]), isPublished: true } }),
  ]);

  const breadcrumbs = breadcrumbJsonLd([
    { name: t("nav.categories"), path: "/categories" },
    { name: category.nameAr, path: `/category/${category.slug}` },
  ]);

  // ItemList من نفس روابط الكوبونات/المتاجر المعروضة فعليًا تحت (نفس
  // المصفوفتين، بدون استعلام إضافي ولا ترتيب مختلف).
  const collection = collectionPageJsonLd({
    name: category.nameAr,
    description: category.descriptionAr,
    url: `${SITE_URL}/category/${category.slug}`,
    itemUrls: [
      ...coupons.map((c) => `${SITE_URL}/store/${c.store.slug}/coupon/${c.slug}`),
      ...stores.map((s) => `${SITE_URL}/store/${s.slug}`),
    ],
  });

  const faqItems = buildCategoryFaqItems(category, couponCount, storeCount);
  const faq = faqJsonLd(faqItems);

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify([breadcrumbs, collection, faq].filter(Boolean)) }} />
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
            <h1 className="text-2xl">{category.nameAr}</h1>
            <p className="text-ink-muted text-sm mt-1.5 max-w-xl">{category.descriptionAr}</p>
            {/* فقرة ثانية بمحتوى حقيقي مشتق من نفس استعلامات الصفحة (couponCount/storeCount/أسماء
                المتاجر) — مو نص مختلق — لتوسيع المحتوى الفريد بصفحات التصنيف الرقيقة أصلًا. */}
            {couponCount > 0 && (
              <p className="text-ink-muted text-sm mt-2 max-w-xl">
                {locale === "ar"
                  ? `نجمع لك حاليًا ${couponCount} كود خصم وعرض فعّال ${storeCount > 0 ? `من ${storeCount} متجر` : ""} في تصنيف ${category.nameAr}${
                      stores.length > 0 ? `، من ضمنهم ${stores.slice(0, 4).map((s) => s.name).join("، ")}` : ""
                    }.`
                  : `We currently track ${couponCount} active coupons${storeCount > 0 ? ` from ${storeCount} stores` : ""} in ${category.nameAr}${
                      stores.length > 0 ? `, including ${stores.slice(0, 4).map((s) => s.name).join(", ")}` : ""
                    }.`}
              </p>
            )}
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
            <div className="mb-10">
              <h2 className="text-lg mb-4">{t("section.blog")}</h2>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                {articles.map((a) => <ArticleCard key={a.id} article={a} locale={locale} />)}
              </div>
            </div>
          )}

          <div className="max-w-2xl">
            <h2 className="text-lg mb-4">{locale === "ar" ? `أسئلة شائعة حول ${category.nameAr}` : `FAQ about ${category.nameAr}`}</h2>
            <FaqAccordion items={faqItems} />
          </div>
        </div>
      </main>
      <SiteFooter locale={locale} />
    </>
  );
}