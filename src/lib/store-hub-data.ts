import { cache } from "react";
import { db } from "@/lib/db";
import { publicStoreCategoriesInclude, categoriesOf, storesInCategoriesWhere } from "@/lib/store-categories";
import { buildStoreFaqItems } from "@/lib/seo";
import { storeTipsBySlug } from "@/lib/store-tips";
import { getGuideForStore } from "@/lib/guides/registry";
import { effectiveHubCouponSlug, storeHubPath } from "@/lib/store-hub";

// Hand-picked topical navigation between complementary stores (text links only).
const EDITORIAL_STORE_LINKS: Record<string, { slug: string; name: string }[]> = {
  namshi: [
    { slug: "opera-fashion", name: "أوبرا فاشن — فساتين المناسبات" },
    { slug: "fashionsecert", name: "فاشن سيكرت — جلابيات وقفاطين" },
    { slug: "hawraaabaya", name: "عبايات حوراء — عبايات نسائية" },
  ],
  shein: [
    { slug: "fashionsecert", name: "فاشن سيكرت — جلابيات وقفاطين" },
    { slug: "opera-fashion", name: "أوبرا فاشن — أزياء المناسبات" },
  ],
  "mtrw-brazyl-or-metro-brazil": [
    { slug: "hawraaabaya", name: "عبايات حوراء" },
    { slug: "fashionsecert", name: "فاشن سيكرت" },
  ],
  "nice-one": [
    { slug: "faisalaldayel", name: "عطور فيصل الدايل" },
    { slug: "mbarkpe", name: "المبارك للعطور" },
    { slug: "ajwaak-llatwr", name: "أجواءك للعطور" },
  ],
  iherb: [{ slug: "may-brwtyn-or-myprotein", name: "ماي بروتين — تغذية رياضية" }],
  sporter: [{ slug: "may-brwtyn-or-myprotein", name: "ماي بروتين — تغذية رياضية" }],
  temu: [
    { slug: "elevent", name: "الفنت — إكسسوارات الهواتف" },
    { slug: "mobcogroup", name: "موبكو — لوازم السيارات" },
    { slug: "givtaat", name: "قيفتات — أفكار للهدايا" },
  ],
  noon: [
    { slug: "pets-houses", name: "بتس هاوسس — مستلزمات الحيوانات" },
    { slug: "givtaat", name: "قيفتات — الهدايا" },
  ],
  alsaifgallery: [
    { slug: "blendshome", name: "بلندز هوم — مستلزمات الضيافة" },
    { slug: "givtaat", name: "قيفتات — الهدايا" },
  ],
};

// Shared between generateMetadata and the page within one request.
export const getHubStore = cache(async (storeSlug: string) =>
  db.store.findUnique({ where: { slug: storeSlug, isPublished: true }, include: publicStoreCategoriesInclude })
);

export const getHubCoupons = cache(async (storeId: string) =>
  db.coupon.findMany({
    where: { storeId, isPublished: true },
    orderBy: [{ isFeatured: "desc" }, { createdAt: "desc" }],
  })
);

/** The published store, its published coupons and where its single page lives. */
export const loadHub = cache(async (storeSlug: string) => {
  const store = await getHubStore(storeSlug);
  if (!store) return null;
  const coupons = await getHubCoupons(store.id);
  const hubCouponSlug = effectiveHubCouponSlug(store, coupons.map((c) => c.slug));
  return {
    store,
    categories: categoriesOf(store),
    coupons,
    hubCouponSlug,
    hubPath: storeHubPath({ slug: store.slug, hubCouponSlug }),
  };
});

export type LoadedHub = NonNullable<Awaited<ReturnType<typeof loadHub>>>;

/** Everything else the page shows around the codes. */
export async function loadHubExtras(hub: LoadedHub) {
  const { store, categories, coupons } = hub;
  const guideCandidate = getGuideForStore(store.slug);
  const editorial = EDITORIAL_STORE_LINKS[store.slug] ?? [];
  const [relatedStores, guideArticle, editorialStores] = await Promise.all([
    db.store.findMany({
      where: { ...storesInCategoriesWhere(categories.map((c) => c.id)), isPublished: true, id: { not: store.id } },
      take: 4,
      include: { _count: { select: { coupons: { where: { isPublished: true } } } } },
    }),
    guideCandidate
      ? db.article.findUnique({ where: { slug: guideCandidate.articleSlug, status: "PUBLISHED", noindex: false }, select: { slug: true } })
      : Promise.resolve(null),
    editorial.length > 0
      ? db.store.findMany({ where: { slug: { in: editorial.map((e) => e.slug) }, isPublished: true }, select: { slug: true, hubCouponSlug: true } })
      : Promise.resolve([]),
  ]);
  const hubBySlug = new Map(editorialStores.map((s) => [s.slug, s.hubCouponSlug]));
  return {
    relatedStores,
    guideSlug: guideArticle ? guideCandidate?.articleSlug ?? null : null,
    tips: storeTipsBySlug[store.slug] ?? null,
    faqItems: buildStoreFaqItems(store, categories, coupons),
    editorialLinks: editorial.filter((e) => hubBySlug.has(e.slug)).map((e) => ({ ...e, hubCouponSlug: hubBySlug.get(e.slug) ?? null })),
  };
}
