import Link from "next/link";
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
  title: "تصنيفات أكواد الخصم والكوبونات حسب المتجر | كوبون نور",
  description: "استعرض تصنيفات كوبون نور للوصول إلى أكواد الخصم والعروض بحسب نوع المتجر، مثل الأزياء والجمال والإلكترونيات، وقارن بين الكوبونات المتاحة قبل التسوق.",
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
        <section className="mt-12 max-w-3xl" aria-labelledby="categories-help-title">
          <h2 id="categories-help-title" className="text-lg font-bold text-ink mb-3">كيف تجد الكوبون المناسب لتسوقك؟</h2>
          <p className="text-sm leading-relaxed text-ink-muted mb-3">ابدأ باختيار القسم المرتبط بمشترياتك، مثل الأزياء أو الإلكترونيات أو الخدمات الرقمية، لتصل إلى المتاجر والعروض المرتبطة به. تتيح لك صفحة كل تصنيف مقارنة الكوبونات والمتاجر المتوفرة في ذلك القسم.</p>
          <p className="text-sm leading-relaxed text-ink-muted">إذا كنت تعرف اسم المتجر بالفعل، يمكنك البحث عنه من <Link href="/stores" className="font-semibold text-accent hover:underline">دليل المتاجر</Link>، أو استعراض <Link href="/coupons" className="font-semibold text-accent hover:underline">جميع الكوبونات</Link>. قبل الشراء، راجع شروط الكود وتحقق من ظهور الخصم في سلة المتجر.</p>
        </section>
      </main>
      <SiteFooter locale={locale} />
    </>
  );
}
