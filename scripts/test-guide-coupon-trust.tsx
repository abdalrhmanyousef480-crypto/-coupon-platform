import React from "react";
import assert from "node:assert/strict";
import { test } from "node:test";
import { renderToStaticMarkup } from "react-dom/server";
import type { Article } from "@prisma/client";
import { db } from "../src/lib/db";
import { GuideTemplate } from "../src/components/public/guide/GuideTemplate";
import { GuideCouponCTA } from "../src/components/public/guide/GuideCouponCTA";
import { alessaeiGuide } from "../src/lib/guides/alessaei";
Object.assign(globalThis, { React });

const store = { slug: "alesaei-aes", name: "العيسائي للأطفال" };
const coupon = { slug: "fixture-code", titleAr: "عرض للاختبار", code: "FIXTURE123", discountLabel: "كوبون", isVerified: true,
  lastCheckedAt: new Date("2026-10-29"), manuallyVerifiedAt: null as Date | null, updatedAt: new Date("2026-09-15"), expiresAt: null as Date | null };
const render = (item = coupon) => renderToStaticMarkup(<GuideCouponCTA intro="تفاصيل العرض" coupon={item} store={store} locale="ar" />);

test("a legacy bulk timestamp never becomes a manual verification claim", () => {
  const html = render();
  assert.ok(html.includes("التوثيق قيد المراجعة"));
  assert.ok(html.includes("آخر تحديث للبيانات"));
  assert.ok(!html.includes("تم التحقق"));
  assert.ok(!html.includes("آخر تحقق"));
  assert.ok(html.includes("FIXTURE123"));
  assert.ok(html.includes("/store/alesaei-aes/coupon/fixture-code"));
});
test("only a real timestamp plus the verification flag displays recorded verification", () => {
  const html = render({ ...coupon, manuallyVerifiedAt: new Date("2026-10-10") });
  assert.ok(html.includes("تم التحقق"));
  assert.ok(html.includes("آخر تحقق مسجل"));
  for (const item of [
    { ...coupon, isVerified: false, manuallyVerifiedAt: new Date("2026-10-10") },
    { ...coupon, expiresAt: new Date(0), manuallyVerifiedAt: new Date("2026-10-10") },
  ]) assert.ok(!render(item).includes("تم التحقق"));
});
test("guide selection excludes expired, unpublished and noindex coupons before limiting the result", async () => {
  const original = db.store.findUnique;
  let query: unknown;
  db.store.findUnique = (async (args: unknown) => { query = args; return null; }) as unknown as typeof db.store.findUnique;
  try {
    const article = { titleAr: "دليل العيسائي", contentAr: "", updatedAt: new Date(), publishedAt: new Date() } as Article;
    const html = renderToStaticMarkup(await GuideTemplate({ article, config: alessaeiGuide, locale: "ar", relatedArticles: [] }));
    const args = query as { where: { isPublished: boolean; noindex: boolean }; include: { coupons: { where: { isPublished: boolean; noindex: boolean; OR: { expiresAt: unknown }[] }; take: number } } };
    assert.equal(args.where.isPublished, true); assert.equal(args.where.noindex, false);
    assert.equal(args.include.coupons.where.isPublished, true); assert.equal(args.include.coupons.where.noindex, false);
    assert.equal(args.include.coupons.where.OR[0].expiresAt, null);
    assert.ok((args.include.coupons.where.OR[1].expiresAt as { gte: Date }).gte instanceof Date);
    assert.equal(args.include.coupons.take, 1);
    assert.equal((html.match(/<h1\b/g) || []).length, 1);
    assert.ok(!html.includes("FIXTURE123"));
  } finally { db.store.findUnique = original; }
});

test("a store without an eligible coupon shows a store link instead of promising a code", async () => {
  const original = db.store.findUnique;
  db.store.findUnique = (async () => ({ ...store, logoUrl: "", coupons: [] })) as unknown as typeof db.store.findUnique;
  try {
    const article = { titleAr: "دليل العيسائي", contentAr: "", updatedAt: new Date(), publishedAt: new Date() } as Article;
    const html = renderToStaticMarkup(await GuideTemplate({ article, config: alessaeiGuide, locale: "ar", relatedArticles: [] }));
    assert.ok(html.includes("عرض صفحة المتجر"));
    assert.ok(!html.includes('href="/store/alesaei-aes/coupon/'));
    assert.ok(!html.includes(alessaeiGuide.heroCtaLabel));
  } finally { db.store.findUnique = original; }
});
