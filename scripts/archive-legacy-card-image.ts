import "dotenv/config";
import { randomUUID, createHash } from "node:crypto";
import { db } from "../src/lib/db";
import { getSupabaseAdmin, STORE_LOGOS_BUCKET } from "../src/lib/supabase";
import { COUPON_IMAGE_VERSION, SITE_URL } from "../src/lib/seo";

// Explicit manual, ONE image per invocation. Nothing runs on a schedule or in Vercel.
// Examples (run locally with your existing .env credentials):
// npx tsx scripts/archive-legacy-card-image.ts --store=ghym            (preview only)
// npx tsx scripts/archive-legacy-card-image.ts --store=ghym --apply    (archive once)
// npx tsx scripts/archive-legacy-card-image.ts --coupon-store=ghym --coupon=slug --apply
const args = process.argv.slice(2);
const flag = (name: string) => args.find(a => a.startsWith(name + "="))?.slice(name.length + 1);
const isApply = args.includes("--apply");
const storeSlug = flag("--store");
const couponStoreSlug = flag("--coupon-store");
const couponSlug = flag("--coupon");

const digest = (x: Buffer) => createHash("sha256").update(x).digest("hex");
async function archive(kind: "store" | "coupon", id: string, source: string) {
  console.log(`Mode: ${isApply ? "ONE-MANUAL-COPY" : "PREVIEW"}, source: ${source}`);
  if (!isApply) return;
  // This is the only invocation of the existing Vercel renderer; no bulk processing.
  const res = await fetch(source, { cache: "no-store", signal: AbortSignal.timeout(25000) });
  const bytes = Buffer.from(await res.arrayBuffer());
  if (!res.ok || !res.headers.get("content-type")?.includes("image/webp") ||
    bytes.length < 80 || bytes.length > 3_500_000 ||
    bytes.toString("ascii", 0, 4) !== "RIFF" || bytes.toString("ascii", 8, 12) !== "WEBP")
    throw new Error(`Source invalid: HTTP ${res.status}, ${res.headers.get("content-type")}, ${bytes.length} bytes; DB not touched`);

  const storage = getSupabaseAdmin().storage.from(STORE_LOGOS_BUCKET);
  const objectPath = `legacy-image-snapshots/${kind}/${id}/${randomUUID()}.webp`;
  const uploaded = await storage.upload(objectPath, bytes, {
    upsert: false, contentType: "image/webp", cacheControl: "31536000",
  });
  if (uploaded.error) throw new Error(`Upload error: ${uploaded.error.message}; DB not touched`);
  const url = storage.getPublicUrl(objectPath).data.publicUrl;
  const verify = await fetch(url, { cache: "no-store", signal: AbortSignal.timeout(10000) });
  const verifyingBytes = Buffer.from(await verify.arrayBuffer());
  if (!verify.ok || digest(verifyingBytes) !== digest(bytes))
    throw new Error("The stored file does not match byte-for-byte! DB not touched");

  if (kind === "store") {
    await db.store.update({ where: { id }, data: { legacyImageSnapshotUrl: url } });
  } else {
    await db.coupon.update({ where: { id }, data: { legacyImageSnapshotUrl: url } });
  }
  console.log(`VERIFIED: original HTTP URL unchanged; SHA-256 ${digest(bytes)}, ${bytes.length} bytes`);
}
async function main() {
  if (Boolean(storeSlug) === Boolean(couponStoreSlug && couponSlug))
    throw new Error("Specify either --store=slug, or BOTH --coupon-store=store --coupon=slug");
  if (storeSlug) {
    const store = await db.store.findUnique({ where: { slug: storeSlug } });
    if (!store) throw new Error("Store not found");
    if (store.legacyImageSnapshotUrl) return console.log("Already archived, skipping");
    await archive("store", store.id, `${SITE_URL}/store/${store.slug}/card-image?v=2`);
  } else {
    const coupon = await db.coupon.findFirst({
      where: { slug: couponSlug!, store: { slug: couponStoreSlug! } },
      include: { store: { select: { slug: true } } },
    });
    if (!coupon) throw new Error("Coupon not found");
    if (coupon.legacyImageSnapshotUrl) return console.log("Already archived, skipping");
    await archive("coupon", coupon.id, `${SITE_URL}/store/${coupon.store.slug}/coupon/${coupon.slug}/card-image?v=${COUPON_IMAGE_VERSION}`);
  }
}
main().catch(e => { console.error(e); process.exitCode = 1; }).finally(() => db.$disconnect());
