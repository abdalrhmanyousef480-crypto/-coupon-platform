import "dotenv/config";
import assert from "node:assert/strict";
import { db } from "../src/lib/db";
import nextConfig from "../next.config";
import { SITE_URL } from "../src/lib/seo";
import { COUPONS_PAGE_SIZE, couponsWhere } from "../src/lib/coupons-query";

// Read-only HTTP/SQL audit of the running local app. No fixture inserts or analytics actions.
const base = new URL(process.env.SEO_BASE_URL || "http://localhost:3000");
assert.ok(["localhost", "127.0.0.1"].includes(base.hostname), "Use a local application server");
let checks = 0;
function check(label: string, ok: boolean) {
  assert.ok(ok, label);
  checks++;
  console.log(`PASS ${label}`);
}
async function read(path: string, userAgent = "Googlebot") {
  const response = await fetch(new URL(path, base), { redirect: "manual", headers: { "User-Agent": userAgent }, signal: AbortSignal.timeout(30_000) });
  return { status: response.status, location: response.headers.get("location"), body: await response.text() };
}
const canonicals = (html: string) => [...html.matchAll(/<link rel="canonical" href="([^"]+)"/g)].map((m) => m[1].replaceAll("&amp;", "&"));
const robotsMeta = (html: string) => [...html.matchAll(/<meta name="robots" content="([^"]+)"/g)].flatMap((m) => m[1].split(/,\s*/));
const absolute = (url: string) => new URL(url).href;

async function main() {
  const xml = await read("/sitemap.xml");
  check("sitemap responds with HTTP 200", xml.status === 200);
  const urls = [...xml.body.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => m[1].replaceAll("&amp;", "&"));
  check("sitemap is nonempty with no duplicate URLs", urls.length > 0 && new Set(urls).size === urls.length);
  const titles = new Set<string>();
  for (const url of urls) {
    const parsed = new URL(url);
    check(`sitemap origin ${parsed.pathname}`, parsed.origin === new URL(SITE_URL).origin);
    const page = await read(parsed.pathname + parsed.search);
    const canonical = canonicals(page.body);
    const title = page.body.match(/<title>([^<]+)<\/title>/)?.[1];
    check(`indexable canonical HTTP 200 ${parsed.pathname}`, page.status === 200 && !robotsMeta(page.body).includes("noindex") && canonical.length === 1 && absolute(canonical[0]) === absolute(url));
    check(`unique title and nonempty description ${parsed.pathname}`, !!title && !titles.has(title) && /<meta name="description" content="[^"]+"/.test(page.body));
    titles.add(title!);
  }
  const policy = await read("/robots.txt");
  check("robots declares the sitemap and private-route exclusions", policy.status === 200 && policy.body.includes(`Sitemap: ${SITE_URL}/sitemap.xml`) && policy.body.includes("Disallow: /admin") && policy.body.includes("Disallow: /api"));

  const total = await db.coupon.count({ where: couponsWhere() });
  const lastPage = Math.max(1, Math.ceil(total / COUPONS_PAGE_SIZE));
  for (const userAgent of ["Googlebot", "Mozilla/5.0"]) {
    const missingPage = await read(`/coupons?page=${lastPage + 1}`, userAgent);
    const destination = lastPage > 1 ? `/coupons?page=${lastPage}` : "/coupons";
    check(`${userAgent}: out-of-range pagination uses a real HTTP 307`, missingPage.status === 307 && !!missingPage.location && new URL(missingPage.location, base).pathname + new URL(missingPage.location, base).search === destination);
    const first = await read("/coupons?page=999999999999", userAgent);
    check(`${userAgent}: oversized pagination is safely canonicalized`, first.status === 200 && canonicals(first.body)[0] === `${SITE_URL}/coupons`);
    const search = await read("/coupons?q=iherb&q=noon", userAgent);
    check(`${userAgent}: search variants are noindex with a clean canonical`, search.status === 200 && robotsMeta(search.body).includes("noindex") && canonicals(search.body)[0] === `${SITE_URL}/coupons`);
    const admin = await read("/admin/login", userAgent);
    check(`${userAgent}: login is noindex without homepage canonical`, admin.status === 200 && robotsMeta(admin.body).includes("noindex") && canonicals(admin.body).length === 0);
    for (const path of ["/store/seo-missing", "/store/iherb/coupon/seo-missing", "/category/seo-missing", "/blog/seo-missing", "/2020/01/seo-unknown.html"]) {
      const missing = await read(path, userAgent);
      check(`${userAgent}: real noindex 404 ${path}`, missing.status === 404 && robotsMeta(missing.body).includes("noindex") && !robotsMeta(missing.body).includes("index") && canonicals(missing.body).length === 0);
    }
  }
  const stores = await db.store.findMany({ where: { isPublished: true, noindex: false }, select: { slug: true } });
  for (const store of stores) {
    check(`published store is in sitemap regardless of coupon count: ${store.slug}`, urls.includes(`${SITE_URL}/store/${store.slug}`));
  }
  const legacyRules = await nextConfig.redirects!();
  for (const rule of legacyRules) {
    for (const query of ["", "?m=1"]) {
      const path = rule.source + query;
      const legacy = await read(path);
      check(`confirmed Blogger 301 ${path}`, legacy.status === 301 && !!legacy.location && new URL(legacy.location, base).pathname === rule.destination);
    }
  }
  console.log(`${checks} read-only technical SEO checks passed (${urls.length} sitemap URLs)`);
}
main().catch((error) => { console.error(error); process.exitCode = 1; }).finally(() => db.$disconnect());
