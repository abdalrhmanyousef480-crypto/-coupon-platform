import assert from "node:assert/strict";
import sharp from "sharp";
import { cardSvg, renderCardWebp, splitStoreName } from "./card-image-renderer";
import { isGeneratedCardImageUrl, waitingForAutoCard } from "../src/lib/auto-card-images";

async function main() {
const oldRecord = { createdAt: new Date("2026-11-03T12:00:00Z"), cardImageUrl: null, legacyImageSnapshotUrl: null };
const newRecord = { createdAt: new Date("2026-11-04T12:00:00Z"), cardImageUrl: null, legacyImageSnapshotUrl: null };
assert.equal(waitingForAutoCard(oldRecord), false);
assert.equal(waitingForAutoCard(newRecord), true);
assert.equal(waitingForAutoCard({ ...newRecord, cardImageUrl: "https://example.com/photo.webp" }), false);
assert.equal(waitingForAutoCard({ ...newRecord, legacyImageSnapshotUrl: "https://example.com/original.webp" }), false);
const autoStore = "https://gwqtzjqmvrcrvchqdvdi.supabase.co/storage/v1/object/public/store-logos/auto-card-images/stores/test.webp";
assert.equal(isGeneratedCardImageUrl(autoStore, "store"), true);
assert.equal(isGeneratedCardImageUrl(autoStore, "coupon"), false);
assert.equal(isGeneratedCardImageUrl("https://example.com/storage/v1/object/public/store-logos/auto-card-images/stores/test.webp", "store"), false);
assert.equal(isGeneratedCardImageUrl("https://gwqtzjqmvrcrvchqdvdi.supabase.co/storage/v1/object/public/store-logos/manual-card-images/stores/test.webp", "store"), false);
assert.deepEqual(splitStoreName("عطور فيصل الدايل"), { arabic: "عطور فيصل الدايل", latin: "" });
assert.deepEqual(splitStoreName("اوبشن بي | option b"), { arabic: "اوبشن بي", latin: "option b" });
assert.deepEqual(splitStoreName("فيرستكراي | firstcry"), { arabic: "فيرستكراي", latin: "firstcry" });
const input = { kind: "coupon" as const, storeName: "اوبشن بي | option b", code: "AA62", logoUrl: "" };
const svg = cardSvg(input, null);
assert.ok(svg.includes("اوبشن بي"));
assert.ok(svg.includes(">option b</text>"));
assert.ok(!svg.includes(">b option</text>"));
assert.ok(svg.includes("كود الخصم"));
const offerSvg = cardSvg({ ...input, hasCode: false }, null);
assert.ok(offerSvg.includes("كوبونات وعروض"));
await assert.rejects(() => renderCardWebp({ ...input, logoUrl: "https://untrusted.example/logo.png" }, true), /logo/);
const buffer = await renderCardWebp(input, false);
assert.equal(buffer.toString("ascii", 0, 4), "RIFF");
assert.equal(buffer.toString("ascii", 8, 12), "WEBP");
assert.equal((await sharp(buffer).metadata()).width, 800);
const store = await renderCardWebp({ ...input, kind: "store" }, false);
assert.equal((await sharp(store).metadata()).width, 1200);
console.log("Arabic/Latin typography and store/coupon WebP tests passed");
}
void main().catch((error) => { console.error(error); process.exitCode = 1; });
