import "server-only";
import { loadHub } from "@/lib/store-hub-data";
import { hubImages } from "@/components/public/StoreHubView";
import { GENERATED_COUPON_IMAGE_PREFIX } from "@/lib/coupon-image";

/**
 * Owner decision (Nov 2026): once a store page shows its NEW generated image,
 * every OLD image URL of that store (historical card-image routes, old
 * code-named files) answers 301 → the current image, so Google Images drops
 * the old pictures and moves their value to the new one. Stores whose page
 * still uses the historical image are untouched (null).
 */
export async function currentGeneratedPageImage(storeSlug: string): Promise<string | null> {
  const hub = await loadHub(storeSlug);
  if (!hub) return null;
  const url = hubImages(hub.store, hub.coupons, hub.hubCouponSlug).main[0]?.url;
  if (!url) return null;
  const path = url.replace(/^https?:\/\/[^/]+/, "").split("?")[0];
  return path.startsWith(GENERATED_COUPON_IMAGE_PREFIX) ? path : null;
}

export function permanentImageRedirect(path: string): Response {
  return new Response(null, {
    status: 301,
    headers: { Location: path, "Cache-Control": "public, max-age=3600, s-maxage=3600" },
  });
}
