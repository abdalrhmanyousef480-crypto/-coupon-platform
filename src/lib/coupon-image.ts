// Which image a coupon shows (page, sitemap, admin previews). No server-only
// imports here so admin client components can use it too.
//
// Priority:
// 1. cardImageUrl — manual upload by the admin. Always wins, never overwritten.
// 2. autoImageUrl — generated off-Vercel by GitHub Actions, on the site's own
//    domain (/images/coupons/<coupon-slug>-<code>.webp → Supabase via a rewrite
//    in next.config.ts). Used only while it shows the CURRENT code.
// 3. The legacy card-image route (historical snapshot or live render).
export const GENERATED_COUPON_IMAGE_PREFIX = "/images/coupons/";

type CouponImageFields = {
  slug: string;
  code: string | null;
  cardImageUrl: string | null;
  autoImageUrl?: string | null;
  autoImageCode?: string | null;
};

/** Descriptive, stable file name: max-discount-code-qy7.webp */
export function generatedCouponImageFile(couponSlug: string, code: string): string {
  const safe = (v: string) => v.toLowerCase().normalize("NFKD").replace(/[^a-z0-9-]+/g, "-").replace(/-+/g, "-").replace(/^-|-$/g, "");
  const slugPart = safe(couponSlug) || "coupon";
  const codePart = safe(code) || "code";
  return `${slugPart}-${codePart}.webp`;
}

/** The generated image path, only if it matches the coupon's current code. */
export function currentAutoImagePath(c: CouponImageFields): string | null {
  const code = c.code?.trim();
  if (!code || !c.autoImageUrl || c.autoImageCode !== code) return null;
  return c.autoImageUrl.startsWith(GENERATED_COUPON_IMAGE_PREFIX) ? c.autoImageUrl : null;
}

export function couponImageSrc(
  storeSlug: string,
  c: CouponImageFields,
  opts: { siteUrl?: string; version: string | number }
): string {
  const base = opts.siteUrl ?? "";
  if (c.cardImageUrl) return c.cardImageUrl;
  const auto = currentAutoImagePath(c);
  if (auto) return `${base}${auto}`;
  return `${base}/store/${storeSlug}/coupon/${c.slug}/card-image?v=${opts.version}`;
}
