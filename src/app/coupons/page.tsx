import { db } from "@/lib/db";
import { getTranslator } from "@/lib/i18n";
import { buildMetadata } from "@/lib/seo";
import { SiteHeader } from "@/components/public/SiteHeader";
import { SiteFooter } from "@/components/public/SiteFooter";
import { CouponCard } from "@/components/public/CouponCard";
import { Pagination } from "@/components/public/Pagination";
import type { Metadata } from "next";
import type { Prisma } from "@prisma/client";

export const metadata: Metadata = buildMetadata({
  title: "جميع الكوبونات — كوبون نور",
  description: "تصفح جميع أكواد الخصم والعروض من متاجرك المفضلة.",
  path: "/coupons",
  locale: "ar",
});

// عدد الكوبونات بكل صفحة — بدون هذا الحد كانت الصفحة تجيب كل الكوبونات
// المنشورة دفعة وحدة بغض النظر عن عددها (راجع نقاش الأداء بالتذكرة).
const PAGE_SIZE = 24;

export default async function CouponsPage({
  searchParams,
}: { searchParams: Promise<{ q?: string; page?: string }> }) {
  const { q, page: pageParam } = await searchParams;
  const page = Math.max(1, Number(pageParam) || 1);
  const locale = "ar" as const;
  const t = getTranslator(locale);

  const where: Prisma.CouponWhereInput = {
    isPublished: true,
    ...(q ? {
      OR: [
        { titleAr: { contains: q, mode: "insensitive" } },
        { title: { contains: q, mode: "insensitive" } },
        { store: { name: { contains: q, mode: "insensitive" } } },
      ],
    } : {}),
  };

  const [coupons, totalCount] = await Promise.all([
    db.coupon.findMany({
      where,
      orderBy: [{ isFeatured: "desc" }, { createdAt: "desc" }],
      include: { store: true },
      skip: (page - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
    }),
    db.coupon.count({ where }),
  ]);
  const totalPages = Math.max(1, Math.ceil(totalCount / PAGE_SIZE));

  function buildHref(targetPage: number) {
    const params = new URLSearchParams();
    if (q) params.set("q", q);
    if (targetPage > 1) params.set("page", String(targetPage));
    const qs = params.toString();
    return qs ? `/coupons?${qs}` : "/coupons";
  }

  return (
    <>
      <SiteHeader locale={locale} />
      <main className="max-w-container mx-auto px-5 py-9">
        <h1 className="text-2xl mb-1.5">{t("nav.coupons")}</h1>
        <p className="text-ink-muted text-sm mb-7">
          {q ? (locale === "ar" ? `نتائج البحث عن: "${q}"` : `Search results for: "${q}"`) : (locale === "ar" ? "تصفح جميع أكواد الخصم والعروض" : "Browse all discount codes and deals")}
        </p>
        {coupons.length === 0 ? (
          <div className="rounded-lg border border-dashed border-border bg-surface-alt/60 py-16 text-center text-ink-muted">
            {locale === "ar" ? "لم يتم العثور على كوبونات مطابقة" : "No matching coupons found"}
          </div>
        ) : (
          <>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-5">
              {coupons.map((coupon) => (
                <CouponCard key={coupon.id} coupon={coupon} store={coupon.store} locale={locale} />
              ))}
            </div>
            <Pagination page={page} totalPages={totalPages} buildHref={buildHref} locale={locale} />
          </>
        )}
      </main>
      <SiteFooter locale={locale} />
    </>
  );
}