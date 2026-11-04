/**
 * Runs on GitHub Actions, not on Vercel.
 * Reads only newly-created records without a manual card or legacy snapshot.
 * Default mode only lists candidates. --apply requires CI credentials.
 */
import { createHash } from "node:crypto";
import { createClient } from "@supabase/supabase-js";
import { AUTO_IMAGE_START_ISO } from "../src/lib/auto-card-images";
import { renderCardWebp, type CardKind } from "./card-image-renderer";

const APPLY = process.argv.includes("--apply");
const LIMIT_PER_KIND = 5;
const BUCKET = "store-logos";
const url = process.env.SUPABASE_URL;
const secret = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !secret) throw new Error("Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in GitHub Actions secrets");
const supabase = createClient(url, secret, { auth: { persistSession: false, autoRefreshToken: false } });

type Base = { id: string; slug: string; cardImageUrl: string | null; legacyImageSnapshotUrl: string | null;
  createdAt: string; updatedAt: string; isPublished: boolean };
type Store = Base & { name: string; logoUrl: string };
type Coupon = Base & { code: string | null; discountLabel: string; type: string; storeId: string; expiresAt: string | null };

async function candidates(kind: CardKind): Promise<Base[]> {
  const table = kind === "store" ? "stores" : "coupons";
  const columns = kind === "store" ?
    "id,slug,cardImageUrl,legacyImageSnapshotUrl,createdAt,updatedAt,isPublished,name,logoUrl" :
    "id,slug,cardImageUrl,legacyImageSnapshotUrl,createdAt,updatedAt,isPublished,code,discountLabel,type,storeId,expiresAt";
  const { data, error } = await supabase.from(table).select(columns)
    .gte("createdAt", AUTO_IMAGE_START_ISO).is("cardImageUrl", null)
    .is("legacyImageSnapshotUrl", null).eq("isPublished", true).order("createdAt", { ascending: true })
    .limit(LIMIT_PER_KIND);
  if (error) throw new Error(table + ": " + error.message);
  return (data || []) as unknown as Base[];
}

async function codeForStore(storeId: string): Promise<string> {
  const { data, error } = await supabase.from("coupons")
    .select("code,expiresAt,isFeatured,createdAt").eq("storeId", storeId)
    .eq("type", "CODE").eq("isPublished", true)
    .order("isFeatured", { ascending: false }).order("createdAt", { ascending: false }).limit(20);
  if (error) throw new Error("Cannot read active store offers: " + error.message);
  const code = (data || []).find((row) => row.code?.trim() &&
    (!row.expiresAt || Date.parse(row.expiresAt) > Date.now()));
  return code?.code?.trim() || "أحدث العروض";
}

async function getInput(kind: CardKind, row: Base) {
  if (kind === "store") {
    const store = row as Store;
    const code = await codeForStore(store.id);
    return { kind, storeName: store.name, logoUrl: store.logoUrl, code, hasCode: code !== "أحدث العروض" };
  }
  const coupon = row as Coupon;
  const { data, error } = await supabase.from("stores")
    .select("name,logoUrl,updatedAt,isPublished").eq("id", coupon.storeId).maybeSingle();
  if (error || !data || !data.isPublished) throw new Error("Coupon store is unavailable or unpublished");
  return { kind, storeName: data.name, logoUrl: data.logoUrl,
    code: coupon.code?.trim() || coupon.discountLabel, hasCode: Boolean(coupon.type === "CODE" && coupon.code?.trim()) };
}

function slugPart(text: string): string {
  return text.toLowerCase().replace(/[^a-z0-9-]/g, "-").replace(/-+/g, "-").replace(/^-|-$/g, "").slice(0, 48) || "offer";
}
function sha(bytes: Buffer): string {
  return createHash("sha256").update(bytes).digest("hex");
}

async function publishOne(kind: CardKind, row: Base): Promise<void> {
  if (row.cardImageUrl || row.legacyImageSnapshotUrl ||
      Date.parse(row.createdAt) < Date.parse(AUTO_IMAGE_START_ISO)) return;
  const input = await getInput(kind, row);
  if (kind === "coupon") {
    const coupon = row as Coupon;
    if (coupon.expiresAt && Date.parse(coupon.expiresAt) < Date.now()) return;
  }
  const webp = await renderCardWebp(input);
  if (webp.toString("ascii", 0, 4) !== "RIFF" ||
      webp.toString("ascii", 8, 12) !== "WEBP" || webp.length > 3_500_000)
    throw new Error("Generated image is not a valid reasonably sized WebP");
  // Each version has a unique immutable path; retrying does not overwrite a file.
  const key = "auto-card-images/" + (kind === "store" ? "stores/" : "coupons/") +
    slugPart(row.slug) + "-" + slugPart(input.code) + "-" +
    slugPart(row.id) + "-" + Date.parse(row.updatedAt) + ".webp";
  const storage = supabase.storage.from(BUCKET);
  const uploaded = await storage.upload(key, webp, {
    contentType: "image/webp", cacheControl: "31536000", upsert: false,
  });
  if (uploaded.error && !/already exists|duplicate/i.test(uploaded.error.message))
    throw new Error("Storage upload: " + uploaded.error.message);
  const publicUrl = storage.getPublicUrl(key).data.publicUrl;
  const verified = await fetch(publicUrl, { signal: AbortSignal.timeout(12000), cache: "no-store" });
  if (!verified.ok) throw new Error("Uploaded image URL does not return HTTP 200");
  const saved = Buffer.from(await verified.arrayBuffer());
  if (sha(saved) !== sha(webp)) throw new Error("Public image bytes do not match original WebP");

  // Prevent overwriting a manual upload, an old snapshot, or an edited record
  // even if one was saved while the runner was rendering the card.
  const table = kind === "store" ? "stores" : "coupons";
  const { data, error } = await supabase.from(table)
    .update({ cardImageUrl: publicUrl, updatedAt: new Date().toISOString() })
    .eq("id", row.id).eq("updatedAt", row.updatedAt)
    .gte("createdAt", AUTO_IMAGE_START_ISO)
    .is("cardImageUrl", null).is("legacyImageSnapshotUrl", null)
    .select("id");
  if (error) throw new Error("Safe DB update: " + error.message);
  if (!data?.length) {
    console.log("Skipped stale record (manual upload/edit won race):", kind, row.id);
    return;
  }
  console.log("Saved", kind, row.id, publicUrl);
}

async function main(): Promise<void> {
  let failed = 0;
  for (const kind of ["store", "coupon"] as CardKind[]) {
    const rows = await candidates(kind);
    console.log(kind, "pending new images:", rows.length, "apply:", APPLY);
    for (const row of rows) {
      if (!APPLY) {
        console.log("Dry-run candidate:", kind, row.id, row.slug);
        continue;
      }
      try {
        await publishOne(kind, row);
      } catch (err) {
        failed++;
        console.error("Auto image error:", kind, row.id, err instanceof Error ? err.message : "unknown");
      }
    }
  }
  if (failed) throw new Error(failed + " image(s) failed and will be retried; existing URLs unchanged");
}
void main().catch((err) => { console.error(err instanceof Error ? err.message : "Unknown failure"); process.exitCode = 1; });
