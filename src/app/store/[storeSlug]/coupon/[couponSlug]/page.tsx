import { permanentRedirect } from "next/navigation";
import { db } from "@/lib/db";
import { couponMetadata, isExpired } from "@/lib/seo";
import { findRedirect, redirectOrNotFound, redirectTo } from "@/lib/redirects";
import { loadHub, loadHubExtras, type LoadedHub } from "@/lib/store-hub-data";
import { StoreHubView, hubImages } from "@/components/public/StoreHubView";
import { CouponViewTracker } from "@/components/public/CouponViewTracker";
import type { Metadata } from "next";

// Unified store page (Nov 2026): a coupon URL renders the store's single
// page only when it is the store's hub; every other coupon URL of the store
// permanently redirects to the hub. Image routes under this path
// (card-image, opengraph-image, instagram-preview) are separate route
// handlers and are never redirected. See src/lib/store-hub.ts.

export const revalidate = 3600;

export async function generateStaticParams() {
  const stores = await db.store.findMany({
    where: { isPublished: true, hubCouponSlug: { not: null } },
    select: { slug: true, hubCouponSlug: true },
    take: 200,
  });
  return stores.map((s) => ({ storeSlug: s.slug, couponSlug: s.hubCouponSlug! }));
}

/** Render this URL as the hub, or send it to the hub. Never returns for non-hub URLs. */
async function resolveCouponUrl(storeSlug: string, couponSlug: string): Promise<LoadedHub> {
  const path = `/store/${storeSlug}/coupon/${couponSlug}`;
  const hub = await loadHub(storeSlug);
  if (!hub) return redirectOrNotFound(path);
  if (hub.hubCouponSlug === couponSlug) return hub;
  const isKnownCoupon = hub.coupons.some((c) => c.slug === couponSlug);
  if (!isKnownCoupon) {
    // An old coupon URL saved in the redirects table keeps its own target.
    const saved = await findRedirect(path);
    if (saved) redirectTo(saved);
  }
  permanentRedirect(hub.hubPath);
}

export async function generateMetadata({
  params,
}: { params: Promise<{ storeSlug: string; couponSlug: string }> }): Promise<Metadata> {
  const { storeSlug, couponSlug } = await params;
  const hub = await resolveCouponUrl(storeSlug, couponSlug);
  const coupon = hub.coupons.find((c) => c.slug === couponSlug)!;
  const peers = hub.coupons
    .filter((c) => !c.noindex && c.type === "CODE")
    .map((c) => ({ slug: c.slug, code: c.code, expiresAt: c.expiresAt }));
  const base = couponMetadata(coupon, hub.store, "ar", peers);
  // One image per page (owner decision, Nov 2026): the share image is the same
  // card shown on the page, not the separate 1200×630 OG design — two different
  // pictures made Google pick (and keep) the wrong one.
  const image = hubImages(hub.store, hub.coupons, hub.hubCouponSlug).main[0];
  const metadata: Metadata = image ? {
    ...base,
    openGraph: { ...base.openGraph, images: [{ url: image.url, width: image.width, height: image.width, alt: image.alt }] },
    twitter: { ...base.twitter, images: [image.url] },
  } : base;
  // The hub hosts every code of the store, so it stays indexable even when
  // the coupon that gave it its URL has expired.
  if (isExpired(coupon.expiresAt) && !coupon.noindex && !hub.store.noindex) {
    return { ...metadata, robots: { index: true, follow: true, googleBot: { index: true, follow: true, "max-image-preview": "large" } } };
  }
  return metadata;
}

export default async function CouponHubPage({
  params,
}: { params: Promise<{ storeSlug: string; couponSlug: string }> }) {
  const { storeSlug, couponSlug } = await params;
  const hub = await resolveCouponUrl(storeSlug, couponSlug);
  const coupon = hub.coupons.find((c) => c.slug === couponSlug)!;
  const extras = await loadHubExtras(hub);
  return (
    <>
      <CouponViewTracker couponId={coupon.id} />
      <StoreHubView
        store={hub.store}
        categories={hub.categories}
        coupons={hub.coupons}
        hubPath={hub.hubPath}
        hubCouponSlug={hub.hubCouponSlug}
        {...extras}
      />
    </>
  );
}
