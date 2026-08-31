import { db } from "@/lib/db";
import { getTranslator } from "@/lib/i18n";
import { buildMetadata } from "@/lib/seo";
import { SiteHeader } from "@/components/public/SiteHeader";
import { SiteFooter } from "@/components/public/SiteFooter";
import { CategoryCard } from "@/components/public/ContentCards";
import { countCouponsByCategory } from "@/lib/category-coupons";
import type { Metadata } from "next";

export const revalidate = 3600;

export const metadata: Metadata = buildMetadata({
  title: "جميع التصنيفات — كوبون نور",
  description: "تصفح جميع تصنيفات الكوبونات والعروض المتوفرة.",
  path: "/categories",
  locale: "ar",
});

export default async function CategoriesPage() {
  const locale = "ar" as const;
  const t = getTranslator(locale);
  const categories = await db.category.findMany({
    where: { isPublished: true },
    orderBy: { name: "asc" },
  });
  const categoryCounts = await countCouponsByCategory(categories.map((c) => c.id));

  return (
    <>
      <SiteHeader locale={locale} />
      <main className="max-w-container mx-auto px-5 py-9">
        <h1 className="text-2xl mb-1.5">{t("nav.categories")}</h1>
        <p className="text-ink-muted text-sm mb-7">{locale === "ar" ? "تصفح جميع التصنيفات" : "Browse all categories"}</p>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-5">
          {categories.map((cat) => (
            <CategoryCard key={cat.id} category={cat} couponCount={categoryCounts[cat.id] ?? 0} locale={locale} />
          ))}
        </div>
      </main>
      <SiteFooter locale={locale} />
    </>
  );
}
