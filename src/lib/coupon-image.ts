// Which image a coupon shows (page, sitemap, admin previews). No server-only
// imports here so admin client components can use it too.
//
// Priority:
// 1. cardImageUrl — manual upload by the admin. Always wins, never overwritten.
// 2. autoImageUrl — generated off-Vercel by GitHub Actions, on the site's own
//    domain (/images/coupons/<store-slug>-discount-code.webp, served by
//    src/app/images/coupons/[file]/route.ts). Used only while it shows the CURRENT code.
// 3. The legacy card-image route (historical snapshot or live render).
export const GENERATED_COUPON_IMAGE_PREFIX = "/images/coupons/";

type CouponImageFields = {
  slug: string;
  code: string | null;
  cardImageUrl: string | null;
  autoImageUrl?: string | null;
  autoImageCode?: string | null;
};

const safeSlug = (v: string) => v.toLowerCase().normalize("NFKD").replace(/[^a-z0-9-]+/g, "-").replace(/-+/g, "-").replace(/^-|-$/g, "");

/**
 * STABLE file name (owner decision, Nov 2026): the URL never changes when the
 * code changes — the file is overwritten in place, so Google keeps the same
 * image instead of dropping it while it discovers a new URL.
 *   main code of the store page → max-discount-code.webp
 *   any other code              → max-discount-code--a1b2c3.webp (coupon id)
 * Older code-named files (max-discount-code-qy7.webp) stay served unchanged.
 */
export function generatedCouponImageFile(storeSlug: string, opts: { main: boolean; couponId: string }): string {
  const storePart = safeSlug(storeSlug) || "store";
  if (opts.main) return `${storePart}-discount-code.webp`;
  const id = opts.couponId.toLowerCase().replace(/[^a-z0-9]/g, "").slice(-6) || "code";
  return `${storePart}-discount-code--${id}.webp`;
}

/** Stable (overwritten-in-place) names get a short cache; old code-named files a year. */
export const STABLE_COUPON_IMAGE_RE = /-discount-code(?:--[a-z0-9]{1,6})?\.webp$/;

/**
 * The coupon whose image is the store page's image: the hub coupon when the
 * page lives on a coupon URL, otherwise the first live code in page order
 * (featured first, then newest) — same rule as the page (pickPrimary).
 */
export function mainCouponId(
  hubCouponSlug: string | null | undefined,
  live: { id: string; slug: string; type: string; code: string | null }[],
): string | null {
  const hub = hubCouponSlug ? live.find((c) => c.slug === hubCouponSlug) : undefined;
  return (hub ?? live.find((c) => c.type === "CODE" && Boolean(c.code?.trim())) ?? live[0])?.id ?? null;
}

/** The generated image path, only if it matches the coupon's current code. */
export function currentAutoImagePath(c: CouponImageFields): string | null {
  const code = c.code?.trim();
  if (!code || !c.autoImageUrl || c.autoImageCode !== code) return null;
  return c.autoImageUrl.startsWith(GENERATED_COUPON_IMAGE_PREFIX) ? c.autoImageUrl : null;
}

/**
 * A new coupon, or one whose code changed, waits for GitHub Actions (every few
 * minutes) instead of showing a temporary image rendered by Vercel. Coupons
 * that existed before auto-generation keep their legacy image (autoImageCode
 * was set to their code with no autoImageUrl).
 */
export function isAwaitingAutoImage(c: CouponImageFields): boolean {
  const code = c.code?.trim();
  return !c.cardImageUrl && Boolean(code) && c.autoImageCode !== code;
}

/** null = no image yet (waiting for generation). */
export function couponImageSrc(
  storeSlug: string,
  c: CouponImageFields,
  opts: { siteUrl?: string; version: string | number }
): string | null {
  const base = opts.siteUrl ?? "";
  if (c.cardImageUrl) return c.cardImageUrl;
  const auto = currentAutoImagePath(c);
  if (auto) return `${base}${auto}`;
  if (isAwaitingAutoImage(c)) return null;
  return `${base}/store/${storeSlug}/coupon/${c.slug}/card-image?v=${opts.version}`;
}
