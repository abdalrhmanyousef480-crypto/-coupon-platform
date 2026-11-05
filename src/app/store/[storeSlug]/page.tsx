import { permanentRedirect } from "next/navigation";
import { db } from "@/lib/db";
import { storeMetadata, isExpired } from "@/lib/seo";
import { redirectOrNotFound } from "@/lib/redirects";
import { loadHub, loadHubExtras } from "@/lib/store-hub-data";
import { StoreHubView, hubImages, pickPrimary } from "@/components/public/StoreHubView";
import type { Metadata } from "next";

// Unified store page (Nov 2026): this URL is the store's single page unless
// the store's hub lives at one of its coupon URLs, in which case it
// permanently redirects there. See src/lib/store-hub.ts.

export const revalidate = 3600;

export async function generateStaticParams() {
  const stores = await db.store.findMany({
    where: { isPublished: true, hubCouponSlug: null },
    select: { slug: true },
    take: 50,
  });
  return stores.map((s) => ({ storeSlug: s.slug }));
}

export async function generateMetadata({ params }: { params: Promise<{ storeSlug: string }> }): Promise<Metadata> {
  const { storeSlug } = await params;
  const hub = await loadHub(storeSlug);
  if (!hub) return redirectOrNotFound(`/store/${storeSlug}`);
  if (hub.hubCouponSlug) permanentRedirect(hub.hubPath);
  const primary = pickPrimary(hub.coupons.filter((c) => !isExpired(c.expiresAt)), null);
  const mainCode = primary?.type === "CODE" ? primary.code?.trim() || null : null;
  const metadata = storeMetadata(hub.store, "ar", { mainCode });
  const image = hubImages(hub.store, hub.coupons, null).main[0];
  if (!image) return metadata;
  return {
    ...metadata,
    openGraph: { ...metadata.openGraph, images: [{ url: image.url, width: image.width, height: image.width, alt: image.alt }] },
    twitter: { ...metadata.twitter, images: [image.url] },
  };
}

export default async function StorePage({ params }: { params: Promise<{ storeSlug: string }> }) {
  const { storeSlug } = await params;
  const hub = await loadHub(storeSlug);
  if (!hub) return redirectOrNotFound(`/store/${storeSlug}`);
  if (hub.hubCouponSlug) permanentRedirect(hub.hubPath);
  const extras = await loadHubExtras(hub);
  return (
    <StoreHubView
      store={hub.store}
      categories={hub.categories}
      coupons={hub.coupons}
      hubPath={hub.hubPath}
      hubCouponSlug={null}
      {...extras}
    />
  );
}
