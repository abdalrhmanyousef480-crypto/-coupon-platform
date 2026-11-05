// Which image a coupon shows (page, sitemap, admin previews). No server-only
// imports here so admin client components can use it too.
//
// Priority:
// 1. cardImageUrl — manual upload by the admin. Always wins, never overwritten.
// 2. autoImageUrl — generated off-Vercel by GitHub Actions, on the site's own
//    domain (/images/coupons/<store-slug>-discount-code-<code>.webp, served by
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

/**
 * Descriptive, stable file name built from the STORE slug (not the coupon slug,
 * which can be an old code like "abbba1-discount-code"): max-discount-code-qy7.webp
 */
export function generatedCouponImageFile(storeSlug: string, code: string): string {
  const safe = (v: string) => v.toLowerCase().normalize("NFKD").replace(/[^a-z0-9-]+/g, "-").replace(/-+/g, "-").replace(/^-|-$/g, "");
  const storePart = safe(storeSlug) || "store";
  const codePart = safe(code) || "code";
  return `${storePart}-discount-code-${codePart}.webp`;
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
