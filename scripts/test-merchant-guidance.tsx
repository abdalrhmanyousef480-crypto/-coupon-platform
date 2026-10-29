import React from "react";
import assert from "node:assert/strict";
import { test } from "node:test";
import { renderToStaticMarkup } from "react-dom/server";
import type { Article } from "@prisma/client";
import { db } from "../src/lib/db";
import { GuideTemplate } from "../src/components/public/guide/GuideTemplate";
import { alessaeiGuide } from "../src/lib/guides/alessaei";
import { storeTipsBySlug } from "../src/lib/store-tips";
import { MerchantReferences } from "../src/components/public/MerchantReferences";

// Offline server rendering only: no network requests or database writes.
Object.assign(globalThis, { React });
const article = {
  titleAr: "دليل العيسائي للأطفال", contentAr: "## ما هو متجر العيسائي للأطفال؟\n\nمحتوى المقال القابل للتحرير يبقى ظاهرًا.",
  publishedAt: new Date("2026-10-01"), updatedAt: new Date("2026-10-01"), updatedAtContent: null,
} as Article;

test("the guide renders editable article copy alongside policy references and the live coupon", async () => {
  const original = db.store.findUnique;
  db.store.findUnique = (async () => ({
    slug: "alesaei-aes", name: "العيسائي للأطفال", logoUrl: "",
    coupons: [{ slug: "fixture-coupon", titleAr: "عرض تجريبي للاختبار", code: "FIXTURE123", discountLabel: "كوبون", isVerified: false, lastCheckedAt: new Date("2026-10-01"), expiresAt: null }],
  })) as unknown as typeof db.store.findUnique;
  try {
    const html = renderToStaticMarkup(await GuideTemplate({ article, config: alessaeiGuide, locale: "ar", relatedArticles: [] }));
    assert.equal((html.match(/<h1\b/g) || []).length, 1);
    assert.ok(html.includes("محتوى المقال القابل للتحرير يبقى ظاهرًا."));
    assert.ok(html.includes("FIXTURE123"));
    assert.ok(html.includes('/store/alesaei-aes/coupon/fixture-coupon'));
    for (const source of alessaeiGuide.officialSources || []) assert.ok(html.includes(source.url));
    assert.ok(!html.includes("undefined"));
  } finally { db.store.findUnique = original; }
});

test("an unpublished store does not remove the guide title or its policy sources", async () => {
  const original = db.store.findUnique;
  db.store.findUnique = (async () => null) as unknown as typeof db.store.findUnique;
  try {
    const html = renderToStaticMarkup(await GuideTemplate({ article, config: alessaeiGuide, locale: "ar", relatedArticles: [] }));
    assert.equal((html.match(/<h1\b/g) || []).length, 1);
    assert.ok(html.includes("مصادر المتجر الرسمية"));
    assert.ok(!html.includes('href="/store/alesaei-aes/coupon/'));
  } finally { db.store.findUnique = original; }
});

test("merchant references use official HTTPS destinations and accessible external links", () => {
  const hosts = new Set(["help.namshi.com", "www.temu.com", "daralamirat.com.sa", "alesaei-aes.com", "niceonesa.com", "help.niceonesa.com", "www.mumzworld.com"]);
  for (const slug of ["namshi", "temu", "daralamirat", "alesaei-aes", "nice-one", "mmzwrld-or-mumzworld"]) {
    const sources = storeTipsBySlug[slug].sources || [];
    assert.ok(sources.length > 0);
    for (const source of sources) {
      const url = new URL(source.url);
      assert.equal(url.protocol, "https:");
      assert.ok(hosts.has(url.hostname));
    }
    const html = renderToStaticMarkup(<MerchantReferences sources={sources} />);
    assert.ok(html.includes("noopener noreferrer"));
    assert.ok(html.includes("يفتح في علامة تبويب جديدة"));
  }
  assert.equal(renderToStaticMarkup(<MerchantReferences sources={[]} />), "");
});
