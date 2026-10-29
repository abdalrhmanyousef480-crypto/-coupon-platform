import React from "react";
import assert from "node:assert/strict";
import { test } from "node:test";
import { renderToStaticMarkup } from "react-dom/server";
import { StoreCard } from "../src/components/public/ContentCards";
Object.assign(globalThis, { React });

test("the first directory logo is eager while the remaining cards stay lazy", () => {
  const t = (key: string) => key;
  const remoteStore = { slug: "fixture", name: "Fixture store", logoUrl: "https://example.supabase.co/storage/v1/object/public/logos/fixture.png" };
  for (const logoUrl of [remoteStore.logoUrl, "/api/store-logo/fixture"]) {
    const store = { ...remoteStore, logoUrl };
    const first = renderToStaticMarkup(<StoreCard store={store} couponCount={1} t={t} priority />);
    const later = renderToStaticMarkup(<StoreCard store={store} couponCount={1} t={t} />);
    const firstImage = first.match(/<img\b[^>]*>/)?.[0] || "";
    const laterImage = later.match(/<img\b[^>]*>/)?.[0] || "";
    assert.ok(firstImage);
    assert.ok(!firstImage.includes('loading="lazy"'));
    assert.ok(firstImage.toLowerCase().includes('fetchpriority="high"'));
    assert.ok(laterImage.includes('loading="lazy"'));
    assert.ok(first.includes('href="/store/fixture"'));
    assert.ok(later.includes('href="/store/fixture"'));
  }
});
