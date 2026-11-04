import { cache } from "react";
import { db } from "@/lib/db";

/**
 * Keep the oldest earned/selected coupon URL as the per-store collection hub.
 * Never derive it from volatile visit counters or a newly added coupon's slug.
 * These eleven choices were reviewed against Search Console data (Sep-Oct 2026);
 * three were explicitly selected by the site owner.
 */
export const PINNED_COUPON_HUBS: Readonly<Record<string, string>> = {
  ghym: "ghym-discount-code",
  faisalaldayel: "faisalaldayel-discount-code",
  asnasstore: "abbba1-discount-code",
  swytr: "swytr-discount-code",
  arushi: "abbba1-discount-code",
  osma: "osma-discount-code",
  "eseven-store": "abbba1-discount-code",
  almatar: "almatar-discount-code",
  rebunesastore: "rebunesastore-discount-code",
  "reef-perfumes": "reef-perfumes-discount-code",
  ntshop: "ntshop-discount-code",
};

type HubCandidate = {
  id: string;
  slug: string;
  createdAt: Date;
  isPublished?: boolean;
  noindex?: boolean;
};

/** Stable winner; newly created coupons never create another indexable page. */
export function primaryCouponSlug(storeSlug: string, coupons: readonly HubCandidate[]): string | null {
  const eligible = coupons.filter((c) => c.isPublished !== false && c.noindex !== true);
  const pinned = PINNED_COUPON_HUBS[storeSlug];
  if (pinned && eligible.some((c) => c.slug === pinned)) return pinned;
  if (!eligible.length) return null;
  const oldest = [...eligible].sort((a, b) =>
    a.createdAt.getTime() - b.createdAt.getTime() || a.id.localeCompare(b.id)
  );
  return oldest[0].slug;
}

/** React request cache avoids duplicate Prisma reads by page + metadata. */
export const getCouponHubSlug = cache(async (storeId: string, storeSlug: string): Promise<string | null> => {
  const coupons = await db.coupon.findMany({
    where: { storeId, isPublished: true },
    select: { id: true, slug: true, createdAt: true, isPublished: true, noindex: true },
    orderBy: [{ createdAt: "asc" }, { id: "asc" }],
  });
  return primaryCouponSlug(storeSlug, coupons);
});
