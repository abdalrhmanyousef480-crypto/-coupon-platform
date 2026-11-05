import "server-only";
import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { getSupabaseAdmin } from "@/lib/supabase";
import { renderCouponCardWebp } from "@/lib/coupon-card-render";
import { GENERATED_COUPON_IMAGE_PREFIX, generatedCouponImageFile, isAwaitingAutoImage, mainCouponId } from "@/lib/coupon-image";
import { effectiveHubCouponSlug, storeHubPath } from "@/lib/store-hub";

const BUCKET = "store-logos";
const STORAGE_DIR = "generated/coupons";

/**
 * Renders and stores the card image for ONE coupon, right after the admin saves
 * it (called via `after()` so the save itself stays instant). One render per
 * code change — never per visitor. Same output, storage path and DB fields as
 * the GitHub Actions generator, which stays as a backup.
 * Manual images and coupons that already have an image for their code are skipped.
 */
export async function generateCouponImageNow(couponId: string): Promise<void> {
  const coupon = await db.coupon.findUnique({
    where: { id: couponId },
    include: { store: { select: { id: true, slug: true, name: true, logoUrl: true, hubCouponSlug: true, isPublished: true } } },
  });
  if (!coupon || !coupon.isPublished || coupon.type !== "CODE" || !isAwaitingAutoImage(coupon)) return;
  const code = coupon.code!.trim();

  const live = await db.coupon.findMany({
    where: { storeId: coupon.store.id, isPublished: true, OR: [{ expiresAt: null }, { expiresAt: { gt: new Date() } }] },
    orderBy: [{ isFeatured: "desc" }, { createdAt: "desc" }],
    select: { id: true, slug: true, type: true, code: true },
  });
  const isMain = mainCouponId(effectiveHubCouponSlug(coupon.store, live.map((c) => c.slug)), live) === coupon.id;

  const webp = await renderCouponCardWebp({ storeName: coupon.store.name, codeValue: code, logoUrl: coupon.store.logoUrl });
  const file = generatedCouponImageFile(coupon.store.slug, { main: isMain, couponId: coupon.id });
  const storage = getSupabaseAdmin().storage.from(BUCKET);
  // Stable names are overwritten in place, so keep the storage CDN cache short.
  const { error } = await storage.upload(`${STORAGE_DIR}/${file}`, webp, {
    upsert: true, contentType: "image/webp", cacheControl: "300",
  });
  if (error) throw new Error(`upload failed: ${error.message}`);

  // Only if nothing changed meanwhile (new code typed, manual image uploaded).
  const updated = await db.coupon.updateMany({
    where: { id: coupon.id, code: coupon.code, cardImageUrl: null },
    data: { autoImageUrl: `${GENERATED_COUPON_IMAGE_PREFIX}${file}`, autoImageCode: code },
  });
  if (!updated.count) return;

  // The main image file now shows THIS code: any other coupon that pointed at
  // it gets its own file on the next pass.
  const displaced = await db.coupon.findMany({
    where: { storeId: coupon.store.id, id: { not: coupon.id }, autoImageUrl: `${GENERATED_COUPON_IMAGE_PREFIX}${file}` },
    select: { id: true },
  });
  if (displaced.length) {
    await db.coupon.updateMany({ where: { id: { in: displaced.map((d) => d.id) } }, data: { autoImageUrl: null, autoImageCode: null } });
  }

  const published = await db.coupon.findMany({ where: { storeId: coupon.store.id, isPublished: true }, select: { slug: true } });
  const hubPath = storeHubPath({ slug: coupon.store.slug, hubCouponSlug: effectiveHubCouponSlug(coupon.store, published.map((c) => c.slug)) });
  revalidatePath(hubPath);
  revalidatePath("/sitemap.xml");
  revalidatePath(`/admin/stores/${coupon.store.id}`);

  for (const d of displaced) await generateCouponImageSafely(d.id);
}

/** Fire-and-forget wrapper for `after()`: logs instead of throwing. */
export async function generateCouponImageSafely(couponId: string): Promise<void> {
  try {
    await generateCouponImageNow(couponId);
  } catch (error) {
    console.error("[coupon-image] generate on save failed (GitHub Actions will retry):", error);
  }
}
