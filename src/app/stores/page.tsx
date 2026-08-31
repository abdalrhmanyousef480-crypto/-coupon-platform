import { db } from "@/lib/db";
import { getTranslator } from "@/lib/i18n";
import { buildMetadata } from "@/lib/seo";
import { SiteHeader } from "@/components/public/SiteHeader";
import { SiteFooter } from "@/components/public/SiteFooter";
import { StoreCard } from "@/components/public/ContentCards";
import type { Metadata } from "next";

export const revalidate = 3600;

export const metadata: Metadata = buildMetadata({
  title: "جميع المتاجر — كوبون نور",
  description: "تصفح جميع المتاجر المتوفرة على كوبون نور واحصل على أفضل أكواد الخصم.",
  path: "/stores",
  locale: "ar",
});

export default async function StoresPage() {
  const locale = "ar" as const;
  const t = getTranslator(locale);
  const stores = await db.store.findMany({
    where: { isPublished: true },
    orderBy: { name: "asc" },
    include: { _count: { select: { coupons: true } } },
  });

  return (
    <>
      <SiteHeader locale={locale} />
      <main className="max-w-container mx-auto px-5 py-9">
        <h1 className="text-2xl mb-1.5">{t("nav.stores")}</h1>
        <p className="text-ink-muted text-sm mb-7">{locale === "ar" ? "تصفح جميع المتاجر المتوفرة" : "Browse all available stores"}</p>
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-5">
          {stores.map((store) => (
            <StoreCard key={store.id} store={store} couponCount={store._count.coupons} t={t} />
          ))}
        </div>
      </main>
      <SiteFooter locale={locale} />
    </>
  );
}
