import "dotenv/config";
import assert from "node:assert/strict";
import { test } from "node:test";
import type { Article, Coupon, Store } from "@prisma/client";
import {
  SITE_URL, activePublishedCouponsWhere, articleJsonLd, articleMetadata, buildMetadata,
  canonicalUrlFor, couponMetadata, isSelfCanonical, offerJsonLd, storeMetadata,
} from "../src/lib/seo";
import { parsePageParam, searchParamValue } from "../src/lib/coupons-query";
import { redirectTo, resolveRedirect } from "../src/lib/redirects";
import { db } from "../src/lib/db";
import sitemap from "../src/app/sitemap";
import robots from "../src/app/robots";

// In-memory fixtures/mocks only: this suite never writes to or queries a database.
const store = {
  id: "store", slug: "noon", name: "Noon", isPublished: true, noindex: false,
  description: "Store description", descriptionAr: "وصف المتجر", logoUrl: "/logo.png",
  canonicalUrl: null,
} as Store;
const coupon = {
  slug: "discount", title: "Discount", titleAr: "خصم موثّق", description: "Discount description",
  descriptionAr: "تفاصيل الخصم", code: "SAVE20", discountLabel: "20%", isPublished: true,
  noindex: false, expiresAt: null, canonicalUrl: null,
} as Coupon;
const article = {
  slug: "guide", title: "Guide", titleAr: "دليل التوفير", excerpt: "Guide excerpt",
  excerptAr: "مقدمة المقال", status: "PUBLISHED", noindex: false, canonicalUrl: null,
  featuredImage: "/image.png", publishedAt: new Date(), updatedAt: new Date(),
} as Article;

test("default canonical is absolute and has no duplicate base slash", () => {
  assert.equal(canonicalUrlFor("/store/noon"), `${SITE_URL}/store/noon`);
  assert.ok(!SITE_URL.endsWith("/"));
});
test("canonical overrides are used consistently in HTML and Open Graph metadata", () => {
  const target = "https://example.com/preferred";
  for (const metadata of [
    storeMetadata({ ...store, canonicalUrl: target }, "ar"),
    couponMetadata({ ...coupon, canonicalUrl: target }, store, "ar"),
    articleMetadata({ ...article, canonicalUrl: target }, "ar"),
  ]) {
    assert.equal(metadata.alternates?.canonical, target);
    assert.equal(metadata.openGraph?.url, target);
  }
});
test("canonical fragments and local trailing-slash redirects are removed", () => {
  assert.equal(canonicalUrlFor("/store/noon", `${SITE_URL}/store/noon/#section`), `${SITE_URL}/store/noon`);
  assert.equal(canonicalUrlFor("/store/noon", "https://example.com/path/#section"), "https://example.com/path/");
});
test("invalid/non-web canonical values fall back to the page's own URL", () => {
  for (const value of ["", "not-a-url", "javascript:alert(1)", "ftp://example.com/file"]) {
    assert.equal(canonicalUrlFor("/store/noon", value), `${SITE_URL}/store/noon`);
  }
});
test("alternate canonicals are not treated as sitemap candidates", () => {
  assert.equal(isSelfCanonical("/store/noon", null), true);
  assert.equal(isSelfCanonical("/store/noon", `${SITE_URL}/store/noon/`), true);
  assert.equal(isSelfCanonical("/store/noon", `${SITE_URL}/store/other`), false);
  assert.equal(isSelfCanonical("/store/noon", "https://example.com/store/noon"), false);
});
test("private/error pages have no inherited homepage canonical", () => {
  const metadata = buildMetadata({ title: "Private", description: "Private page", path: null, locale: "ar", noindex: true });
  assert.equal(metadata.alternates?.canonical, null);
  assert.deepEqual(metadata.robots, { index: false, follow: true });
});
test("coupon robots inherit store publication and noindex status", () => {
  for (const parent of [{ ...store, noindex: true }, { ...store, isPublished: false }]) {
    assert.deepEqual(couponMetadata(coupon, parent, "ar").robots, { index: false, follow: true });
  }
});
test("expired/unpublished coupons remain noindex without removing their pages", () => {
  for (const item of [{ ...coupon, expiresAt: new Date(0) }, { ...coupon, isPublished: false }]) {
    assert.deepEqual(couponMetadata(item, store, "ar").robots, { index: false, follow: true });
  }
});
test("store indexability distinguishes active content from an empty page", () => {
  assert.deepEqual(storeMetadata(store, "ar", true).robots, { index: false, follow: true });
  assert.deepEqual(storeMetadata(store, "ar", false).robots, { index: true, follow: true });
});
test("structured data uses the selected coupon/article canonical", () => {
  const target = "https://example.com/preferred";
  assert.equal(offerJsonLd({ ...coupon, canonicalUrl: target }, store).url, target);
  assert.equal(articleJsonLd({ ...article, canonicalUrl: target }, "Author", "ar").mainEntityOfPage["@id"], target);
});
test("active content conditions consistently exclude unpublished/expired offers", () => {
  const now = new Date("2026-01-01T00:00:00Z");
  assert.deepEqual(activePublishedCouponsWhere(now), { isPublished: true, OR: [{ expiresAt: null }, { expiresAt: { gte: now } }] });
});
test("pagination rejects malformed, unsafe and oversized values", () => {
  for (const value of [undefined, "", "0", "-1", "foo", "2junk", "2.5", "999999999999", "9007199254740993"]) {
    assert.equal(parsePageParam(value), 1, String(value));
  }
  assert.equal(parsePageParam("2"), 2);
  assert.equal(parsePageParam(["3", "4"]), 3);
});
test("duplicate search parameters use the first query without throwing", () => {
  assert.equal(searchParamValue([" noon ", "other"]), "noon");
  assert.equal(searchParamValue([]), "");
});

function lookup(entries: Record<string, { toPath: string; statusCode: number }>) {
  return async (path: string) => entries[path] ?? null;
}
test("saved permanent redirect chains collapse to one destination", async () => {
  assert.deepEqual(await resolveRedirect("/old", lookup({
    "/old": { toPath: "/middle", statusCode: 301 }, "/middle": { toPath: "/final", statusCode: 308 },
  })), { toPath: "/final", statusCode: 301 });
});
test("a temporary hop keeps the complete redirect temporary", async () => {
  assert.deepEqual(await resolveRedirect("/old", lookup({
    "/old": { toPath: "/middle", statusCode: 301 }, "/middle": { toPath: "/final", statusCode: 302 },
  })), { toPath: "/final", statusCode: 302 });
});
test("store renames preserve old coupon routes without inserting redirect records", async () => {
  assert.deepEqual(await resolveRedirect("/store/old/coupon/save", lookup({
    "/store/old": { toPath: "/store/new", statusCode: 301 },
  })), { toPath: "/store/new/coupon/save", statusCode: 301 });
});
test("explicit coupon moves take precedence over store-prefix redirects", async () => {
  assert.deepEqual(await resolveRedirect("/store/old/coupon/save", lookup({
    "/store/old": { toPath: "/store/new", statusCode: 301 },
    "/store/old/coupon/save": { toPath: "/store/other/coupon/renamed", statusCode: 301 },
  })), { toPath: "/store/other/coupon/renamed", statusCode: 301 });
});
test("unknown Blogger URLs and cyclic redirects do not become homepage redirects", async () => {
  assert.equal(await resolveRedirect("/2020/01/unknown.html", lookup({})), null);
  assert.equal(await resolveRedirect("/a", lookup({ "/a": { toPath: "/b", statusCode: 301 }, "/b": { toPath: "/a", statusCode: 301 } })), null);
});
test("redirect resolution supports saved Blogger destinations and rejects invalid protocols", async () => {
  assert.deepEqual(await resolveRedirect("/2025/12/old.html", lookup({
    "/2025/12/old.html": { toPath: "/store/noon", statusCode: 301 },
  })), { toPath: "/store/noon", statusCode: 301 });
  assert.equal(await resolveRedirect("/old", lookup({ "/old": { toPath: "javascript:alert(1)", statusCode: 301 } })), null);
});
test("page redirects use permanent 308 and temporary 307 rather than ignoring the saved status", () => {
  for (const [saved, expected] of [[301, 308], [308, 308], [302, 307], [307, 307]]) {
    assert.throws(() => redirectTo({ toPath: "/final", statusCode: saved }), (error) =>
      error instanceof Error && "digest" in error && error.digest === `NEXT_REDIRECT;replace;/final;${expected};`);
  }
});
test("every robots group retains the admin/API exclusions and sitemap declaration", () => {
  const policy = robots();
  assert.equal(policy.sitemap, `${SITE_URL}/sitemap.xml`);
  for (const rule of Array.isArray(policy.rules) ? policy.rules : [policy.rules]) {
    assert.equal(rule.allow, "/");
    assert.deepEqual(rule.disallow, ["/admin", "/api"]);
  }
});
test("sitemap includes only active self-canonical pages without writing fixtures", async () => {
  const date = new Date();
  // Prisma delegates expose virtual proxy methods, so Node mock.method cannot find descriptors.
  const original = { stores: db.store.findMany, coupons: db.coupon.findMany, categories: db.category.findMany, articles: db.article.findMany };
  db.store.findMany = (async () => [
    { slug: "active", updatedAt: date, canonicalUrl: null, _count: { coupons: 1 } },
    { slug: "expired-only", updatedAt: date, canonicalUrl: null, _count: { coupons: 0 } },
    { slug: "alternate", updatedAt: date, canonicalUrl: "https://example.com/elsewhere", _count: { coupons: 1 } },
  ]) as unknown as typeof db.store.findMany;
  db.coupon.findMany = (async (args: unknown) => {
    if ((args as { select: { categoryId?: boolean } }).select.categoryId) {
      return [{ categoryId: "health", store: { categories: [] } }];
    }
    return [
      { slug: "active", updatedAt: date, expiresAt: null, canonicalUrl: null, store: { slug: "active" } },
      { slug: "expired", updatedAt: date, expiresAt: new Date(0), canonicalUrl: null, store: { slug: "active" } },
      { slug: "alternate", updatedAt: date, expiresAt: null, canonicalUrl: "https://example.com/elsewhere", store: { slug: "active" } },
    ];
  }) as unknown as typeof db.coupon.findMany;
  db.category.findMany = (async () => [{ id: "health", slug: "health", updatedAt: date }, { id: "empty", slug: "empty", updatedAt: date }]) as unknown as typeof db.category.findMany;
  db.article.findMany = (async () => [
    { slug: "guide", updatedAt: date, canonicalUrl: null },
    { slug: "alternate", updatedAt: date, canonicalUrl: "https://example.com/elsewhere" },
  ]) as unknown as typeof db.article.findMany;
  try {
    const urls = (await sitemap()).map((entry) => entry.url);
    for (const path of ["/store/active", "/store/active/coupon/active", "/category/health", "/blog/guide"]) {
      assert.ok(urls.includes(`${SITE_URL}${path}`), path);
    }
    for (const path of ["/store/expired-only", "/store/alternate", "/store/active/coupon/expired", "/store/active/coupon/alternate", "/category/empty", "/blog/alternate"]) {
      assert.ok(!urls.includes(`${SITE_URL}${path}`), path);
    }
  } finally {
    db.store.findMany = original.stores;
    db.coupon.findMany = original.coupons;
    db.category.findMany = original.categories;
    db.article.findMany = original.articles;
  }
});
