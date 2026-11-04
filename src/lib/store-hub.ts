// ============================================================
// الصفحة الموحدة للمتجر (نوفمبر 2026)
// لكل متجر رابط واحد فقط يعرض كل أكواده: إما /store/[slug] أو رابط
// كوبون واحد مختار (Store.hubCouponSlug) حسب الصفحة الأقوى في Google.
// كل روابط المتجر/الكوبونات الأخرى تتحول تحويلًا دائمًا إلى هذا الرابط.
// روابط الصور (card-image / opengraph-image / instagram-preview) لا تتحول.
// ============================================================

export type HubStoreRef = { slug: string; hubCouponSlug?: string | null };

/** Path of the store's single public page. */
export function storeHubPath(store: HubStoreRef): string {
  return store.hubCouponSlug
    ? `/store/${store.slug}/coupon/${store.hubCouponSlug}`
    : `/store/${store.slug}`;
}

/** Element id of one code's card on the hub page. */
export function couponAnchorId(couponSlug: string): string {
  return `code-${couponSlug.replace(/[^A-Za-z0-9_-]/g, "")}`;
}

/** Link to a specific code: the hub page, scrolled to that code's card. */
export function couponHubHref(store: HubStoreRef, couponSlug: string): string {
  const base = storeHubPath(store);
  return couponSlug === store.hubCouponSlug ? base : `${base}#${couponAnchorId(couponSlug)}`;
}

/**
 * The hub slug that is actually usable right now. A configured hub coupon
 * that is no longer published falls back to the store URL, so the store
 * never loses its page because one coupon was unpublished or deleted.
 */
export function effectiveHubCouponSlug(
  store: { hubCouponSlug?: string | null },
  publishedCouponSlugs: string[],
): string | null {
  const slug = store.hubCouponSlug?.trim();
  return slug && publishedCouponSlugs.includes(slug) ? slug : null;
}
