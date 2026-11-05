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

/**
 * Link to a specific code = the store's hub page itself, with NO "#code-…"
 * fragment: owner decision (Nov 2026) — copied/shared links must be the clean
 * page URL that Google indexes. Codes are listed on the hub anyway.
 */
export function couponHubHref(store: HubStoreRef, _couponSlug: string): string {
  return storeHubPath(store);
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

/**
 * Which single image the hub shows. A saved choice is honoured while it is
 * still valid (the store image needs a live code; a coupon image needs that
 * coupon to be live); otherwise the image of the URL that hosts the hub.
 */
export function pickHubImage(input: {
  source?: string | null;
  hubCouponSlug: string | null;
  hasActiveCode: boolean;
  activeCouponSlugs: string[];
  primarySlug: string | null;
  /** New store with no store image of its own: show the (auto-generated) coupon image. */
  preferCoupon?: boolean;
}): { kind: "store" } | { kind: "coupon"; slug: string } | null {
  const { source, hubCouponSlug, hasActiveCode, activeCouponSlugs, primarySlug, preferCoupon } = input;
  if (source === "store" && hasActiveCode) return { kind: "store" };
  if (source?.startsWith("coupon:")) {
    const slug = source.slice("coupon:".length);
    if (activeCouponSlugs.includes(slug)) return { kind: "coupon", slug };
  }
  if ((hubCouponSlug || preferCoupon) && primarySlug) return { kind: "coupon", slug: primarySlug };
  if (hasActiveCode && primarySlug) return { kind: "store" };
  return primarySlug ? { kind: "coupon", slug: primarySlug } : null;
}

// Stores added after automatic coupon images started (Nov 2026) and with no
// manual or archived store image default to the coupon image instead of the
// live-rendered store card. Older stores keep their current (ranked) image.
export const AUTO_IMAGE_SINCE = new Date("2026-11-01T00:00:00Z");

//
// Also: a store with no manual image whose main code has a freshly generated
// image (i.e. the code changed after the old store card was made) shows that
// coupon image — the old store card may still show the previous code.
export function storePrefersCouponImage(
  store: { createdAt: Date; cardImageUrl: string | null; legacyImageSnapshotUrl: string | null },
  primary?: { code: string | null; autoImageUrl?: string | null; autoImageCode?: string | null } | null,
): boolean {
  if (store.cardImageUrl) return false;
  const code = primary?.code?.trim();
  if (code && primary?.autoImageUrl && primary.autoImageCode === code) return true;
  return !store.legacyImageSnapshotUrl && store.createdAt >= AUTO_IMAGE_SINCE;
}
