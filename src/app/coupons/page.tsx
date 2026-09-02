import { db } from "@/lib/db";
import { getTranslator } from "@/lib/i18n";
import { buildMetadata } from "@/lib/seo";
import { SiteHeader } from "@/components/public/SiteHeader";
import { SiteFooter } from "@/components/public/SiteFooter";
import { CouponsExplorer } from "@/components/public/CouponsExplorer";
import {
  COUPONS_PAGE_SIZE,
  SEARCH_RESULT_LIMIT,
  COUPON_PRIORITY_ORDER,
  COUPON_INCLUDE,
  couponsWhere,
  type PublicCouponWithStore,
} from "@/lib/coupons-query";
import type { Metadata } from "next";

export const metadata: Metadata = buildMetadata({
  title: "جميع الكوبونات — كوبون نور",
  description: "تصفح جميع أكواد الخصم والعروض من متاجرك المفضلة.",
  path: "/coupons",
  locale: "ar",
});

export default async function CouponsPage({
  searchParams,
}: { searchParams: Promise<{ q?: string }> }) {
  const { q } = await searchParams;
  const locale = "ar" as const;
  const t = getTranslator(locale);
  const initialQuery = q?.trim() || "";

  // لو الزائر إجى من صندوق بحث الرئيسية (/coupons?q=...)، منجيب كل
  // النتائج المطابقة مباشرة من السيرفر (وضع البحث بيتجاوز نظام "5 كل
  // مرة" أصلًا). غير هيك، أول 5 كوبونات بس حسب ترتيب الأولوية المعتاد.
  let initialCoupons: PublicCouponWithStore[];
  let initialHasMore: boolean;

  if (initialQuery) {
    initialCoupons = await db.coupon.findMany({
      where: couponsWhere(initialQuery),
      orderBy: COUPON_PRIORITY_ORDER,
      include: COUPON_INCLUDE,
      take: SEARCH_RESULT_LIMIT,
    });
    initialHasMore = false;
  } else {
    const rows = await db.coupon.findMany({
      where: couponsWhere(),
      orderBy: COUPON_PRIORITY_ORDER,
      include: COUPON_INCLUDE,
      take: COUPONS_PAGE_SIZE + 1,
    });
    initialHasMore = rows.length > COUPONS_PAGE_SIZE;
    initialCoupons = rows.slice(0, COUPONS_PAGE_SIZE);
  }

  return (
    <>
      <SiteHeader locale={locale} />
      <main className="max-w-container mx-auto px-5 py-9">
        <h1 className="text-2xl mb-1.5">{t("nav.coupons")}</h1>
        <p className="text-ink-muted text-sm mb-6">
          {locale === "ar" ? "تصفح جميع أكواد الخصم والعروض" : "Browse all discount codes and deals"}
        </p>
        <CouponsExplorer
          initialCoupons={initialCoupons}
          initialQuery={initialQuery}
          initialHasMore={initialHasMore}
          locale={locale}
        />
      </main>
      <SiteFooter locale={locale} />
    </>
  );
}
