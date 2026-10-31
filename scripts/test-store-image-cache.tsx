import React from "react";
import assert from "node:assert/strict";
import { test } from "node:test";
import sharp from "sharp";

Object.assign(globalThis, { React });

// Exercise the real route with in-memory fixtures only. No database or font
// network requests, and no production cache entries are written by this test.
test("store image cache reuses rendering without caching coupon eligibility", async (t) => {
  const nextCache = require("next/cache") as typeof import("next/cache");
  const originalCache = nextCache.unstable_cache;
  const imageModule = require.cache[require.resolve("next/og")] ?? (require("next/og"), require.cache[require.resolve("next/og")])!;
  const originalImages = imageModule.exports;
  const fontModule = require("../src/lib/og-font");
  const fontCacheModule = require.cache[require.resolve("../src/lib/og-font")]!;
  const ogModule = require("../src/lib/coupon-og");
  const ogCacheModule = require.cache[require.resolve("../src/lib/coupon-og")]!;
  const { db } = require("../src/lib/db") as typeof import("../src/lib/db");
  const originalStore = db.store.findFirst;
  const originalCoupon = db.coupon.findFirst;
  const png = await sharp({ create: { width: 1200, height: 1200, channels: 3, background: "white" } }).png().toBuffer();
  let renders = 0;
  let failRender = false;
  let published = true;
  let code: string | null = "SAVE20";
  let name = "متجر تجريبي";
  let logo = "https://example.invalid/logo-v1.webp";
  const entries = new Map<string, string>();
  nextCache.unstable_cache = ((fn: (...args: string[]) => Promise<string>, keys: string[], options: { revalidate: number }) => {
    assert.deepEqual(keys, ["store-card-image-webp-v1"]);
    assert.equal(options.revalidate, 3600);
    return async (...args: string[]) => {
      const key = JSON.stringify(args);
      if (entries.has(key)) return entries.get(key)!;
      const result = await fn(...args);
      entries.set(key, result);
      return result;
    };
  }) as typeof nextCache.unstable_cache;
  imageModule.exports = { ImageResponse: class extends Response {
    constructor() {
      if (failRender) throw new Error("fixture rendering failure");
      renders++;
      super(new Uint8Array(png), { headers: { "Content-Type": "image/png" } });
    }
  } };
  fontCacheModule.exports = { ...fontModule, getTajawalBold: async () => [] };
  ogCacheModule.exports = { ...ogModule, logoToPngDataUri: async () => null };
  db.store.findFirst = (async (args: unknown) => {
    assert.deepEqual(args, { where: { slug: "fixture", isPublished: true } });
    return published ? { id: "store-fixture", name, logoUrl: logo } : null;
  }) as unknown as typeof db.store.findFirst;
  db.coupon.findFirst = (async (args: any) => {
    assert.equal(args.where.isPublished, true);
    assert.equal(args.where.type, "CODE");
    assert.equal(args.where.storeId, "store-fixture");
    assert.ok(args.where.OR[1].expiresAt.gt instanceof Date);
    return code === null ? null : { code };
  }) as unknown as typeof db.coupon.findFirst;
  try {
    const { GET } = require("../src/app/store/[storeSlug]/card-image/route");
    const get = (suffix = "") => GET(new Request(`https://example.invalid/store/fixture/card-image${suffix}`), { params: Promise.resolve({ storeSlug: "fixture" }) });
    await t.test("repeated requests and query variants reuse identical WebP bytes", async () => {
      const first = await get(); const bytes = Buffer.from(await first.arrayBuffer());
      assert.equal(first.status, 200);
      assert.equal(first.headers.get("Content-Type"), "image/webp");
      assert.equal(first.headers.get("X-Content-Type-Options"), "nosniff");
      assert.equal((await sharp(bytes).metadata()).width, 1200);
      const second = await get("?v=another");
      assert.deepEqual(Buffer.from(await second.arrayBuffer()), bytes);
      assert.equal(renders, 1);
    });
    await t.test("a changed code renders again", async () => {
      code = "NEW30"; assert.equal((await get()).status, 200); assert.equal(renders, 2);
    });
    await t.test("a changed merchant name or logo renders again", async () => {
      name = "اسم محدث"; await get(); assert.equal(renders, 3);
      logo = "https://example.invalid/logo-v2.webp"; await get(); assert.equal(renders, 4);
    });
    await t.test("an unpublished store cannot reuse a previously rendered image", async () => {
      published = false; assert.equal((await get()).status, 404); assert.equal(renders, 4); published = true;
    });
    await t.test("a store without an active code cannot reuse an expired code", async () => {
      code = null; assert.equal((await get()).status, 404); assert.equal(renders, 4);
      code = "   "; assert.equal((await get()).status, 404); assert.equal(renders, 4);
    });
    await t.test("transient rendering failures remain retryable and are not cached", async () => {
      code = "RETRY40"; failRender = true;
      const error = await get(); assert.equal(error.status, 503);
      assert.equal(error.headers.get("Cache-Control"), "no-store");
      assert.equal(error.headers.get("Retry-After"), "120");
      failRender = false; assert.equal((await get()).status, 200); assert.equal(renders, 5);
    });
  } finally {
    nextCache.unstable_cache = originalCache;
    imageModule.exports = originalImages;
    fontCacheModule.exports = fontModule;
    ogCacheModule.exports = ogModule;
    db.store.findFirst = originalStore;
    db.coupon.findFirst = originalCoupon;
  }
});
