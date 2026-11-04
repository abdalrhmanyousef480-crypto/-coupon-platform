import assert from "node:assert/strict";
import sharp from "sharp";
import { cardSvg, renderCardWebp, splitStoreName } from "./card-image-renderer";

async function main() {
assert.deepEqual(splitStoreName("عطور فيصل الدايل"), { arabic: "عطور فيصل الدايل", latin: "" });
assert.deepEqual(splitStoreName("اوبشن بي | option b"), { arabic: "اوبشن بي", latin: "option b" });
assert.deepEqual(splitStoreName("فيرستكراي | firstcry"), { arabic: "فيرستكراي", latin: "firstcry" });
const input = { kind: "coupon" as const, storeName: "اوبشن بي | option b", code: "AA62", logoUrl: "" };
const svg = cardSvg(input, null);
assert.ok(svg.includes("اوبشن بي"));
assert.ok(svg.includes(">option b</text>"));
assert.ok(!svg.includes(">b option</text>"));
const buffer = await renderCardWebp(input, false);
assert.equal(buffer.toString("ascii", 0, 4), "RIFF");
assert.equal(buffer.toString("ascii", 8, 12), "WEBP");
assert.equal((await sharp(buffer).metadata()).width, 800);
const store = await renderCardWebp({ ...input, kind: "store" }, false);
assert.equal((await sharp(store).metadata()).width, 1200);
console.log("Arabic/Latin typography and store/coupon WebP tests passed");
}
void main().catch((error) => { console.error(error); process.exitCode = 1; });
