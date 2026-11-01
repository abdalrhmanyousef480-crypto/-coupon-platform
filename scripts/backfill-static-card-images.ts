import "dotenv/config";
import { randomUUID } from "node:crypto";
import { db } from "../src/lib/db";
import { getSupabaseAdmin, STORE_LOGOS_BUCKET } from "../src/lib/supabase";
import { COUPON_IMAGE_VERSION, SITE_URL } from "../src/lib/seo";

// Only run from a local machine or other outside-Vercel worker.
// Start with: npx tsx scripts/backfill-static-card-images.ts (read-only preview).
// To persist at most 2 store images and 2 coupon images:
// npx tsx scripts/backfill-static-card-images.ts --apply --limit=2
const apply = process.argv.includes("--apply");
const requestedLimit = Number(process.argv.find(a => a.startsWith("--limit="))?.split("=")[1] || "2");
const limit = Number.isInteger(requestedLimit) ? Math.max(1, Math.min(requestedLimit, 5)) : 2;
const pause = () => new Promise<void>(r => setTimeout(r, 2500));
function imageValid(buffer: Buffer): boolean {
  return buffer.length > 32 && buffer.length < 4_000_000
    && buffer.toString("ascii", 0, 4) === "RIFF"
    && buffer.toString("ascii", 8, 12) === "WEBP";
}
async function saveImage(kind: "store" | "coupon", id: string, url: string): Promise<boolean> {
  try {
    const result = await fetch(url, { headers: { Accept: "image/webp" }, signal: AbortSignal.timeout(20000), cache: "no-store" });
    const buf = Buffer.from(await result.arrayBuffer());
    if (!result.ok || !result.headers.get("content-type")?.includes("image/webp") || !imageValid(buf))
      throw new Error(`Invalid card image response: HTTP ${result.status}, ${result.headers.get("content-type")}`);
    const filePath = `static-card-images/${kind}/${id}/${randomUUID()}.webp`;
    const storage = getSupabaseAdmin().storage.from(STORE_LOGOS_BUCKET);
    const { error } = await storage.upload(filePath, buf, {
      contentType: "image/webp", cacheControl: "31536000", upsert: false,
    });
    if (error) throw new Error(`Storage upload failed: ${error.message}`);
    const stableUrl = storage.getPublicUrl(filePath).data.publicUrl;
    if (kind === "store") {
      await db.store.update({ where: { id }, data: { cardImageUrl: stableUrl } });
    } else {
      await db.coupon.update({ where: { id }, data: { cardImageUrl: stableUrl } });
    }
    console.log(`SAVED ${kind}: ${stableUrl}`);
    return true;
  } catch (err) {
    console.error(`SKIPPED ${kind} ${id}: ${err instanceof Error ? err.message : err}`);
    return false;
  }
}
async function main() {
  const now = new Date();
  const stores = await db.store.findMany({
    where: { isPublished: true, noindex: false, cardImageUrl: null, coupons: { some: {
      isPublished: true, type: "CODE", code: { not: null },
      OR: [{ expiresAt: null }, { expiresAt: { gt: now } }],
    } } },
    select: { id: true, slug: true },
    orderBy: { createdAt: "asc" }, take: limit,
  });
  const coupons = await db.coupon.findMany({
    where: { isPublished: true, noindex: false, cardImageUrl: null, store: { isPublished: true, noindex: false },
      OR: [{ expiresAt: null }, { expiresAt: { gt: now } }] },
    select: { id: true, slug: true, store: { select: { slug: true } } },
    orderBy: { createdAt: "asc" }, take: limit,
  });
  console.log(`Mode: ${apply ? "APPLY" : "READ-ONLY"}, maximum ${limit} per image type`);
  for (const s of stores) {
    const url = `${SITE_URL}/store/${s.slug}/card-image?v=2`;
    if (!apply) { console.log("WOULD SAVE store", url); continue; }
    await saveImage("store", s.id, url); await pause();
  }
  for (const c of coupons) {
    const url = `${SITE_URL}/store/${c.store.slug}/coupon/${c.slug}/card-image?v=${COUPON_IMAGE_VERSION}`;
    if (!apply) { console.log("WOULD SAVE coupon", url); continue; }
    await saveImage("coupon", c.id, url); await pause();
  }
}
main().catch(e => { console.error(e); process.exitCode = 1; }).finally(() => db.$disconnect());
