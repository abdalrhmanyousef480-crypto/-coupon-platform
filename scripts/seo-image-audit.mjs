// Full image audit of every page in the live sitemap (no secrets, read-only).
// For each page: which images Google can see (og/twitter, JSON-LD, <img>,
// preload, /_next/image), whether they agree with the sitemap image, whether
// each image URL answers 200 image/*, and whether the store's OLD image URLs
// redirect to the current one. Writes a Markdown report + JSON.
import { writeFileSync, appendFileSync } from "node:fs";

const SITE = "https://www.couponsnoor.com";
const UA = "Mozilla/5.0 (compatible; CouponsnoorAudit/1.0)";
const norm = (u) => { try { const x = new URL(u, SITE); return x.origin === SITE ? x.pathname + (x.search && !x.pathname.startsWith("/images/coupons/") ? x.search : "") : x.href; } catch { return u; } };
const unesc = (s) => s.replace(/&amp;/g, "&").replace(/\\u0026/g, "&");

async function get(url, manual = false) {
  for (let i = 0; i < 3; i++) {
    try {
      const r = await fetch(url, { redirect: manual ? "manual" : "follow", headers: { "user-agent": UA } });
      return r;
    } catch (e) { if (i === 2) throw e; await new Promise((s) => setTimeout(s, 1500)); }
  }
}

function collectJsonLdImages(node, out) {
  if (!node || typeof node !== "object") return;
  if (Array.isArray(node)) { node.forEach((n) => collectJsonLdImages(n, out)); return; }
  for (const [k, v] of Object.entries(node)) {
    if (k === "image" || k === "primaryImageOfPage" || k === "thumbnailUrl" || k === "contentUrl") {
      const vals = Array.isArray(v) ? v : [v];
      for (const x of vals) {
        if (typeof x === "string") out.push({ where: `jsonld:${node["@type"] || "?"}.${k}`, url: x });
        else if (x && typeof x === "object") { const u = x.url || x.contentUrl; if (u) out.push({ where: `jsonld:${node["@type"] || "?"}.${k}`, url: u }); }
      }
    }
    if (k === "logo") continue; // logos are fine (seller/org logos)
    if (v && typeof v === "object") collectJsonLdImages(v, out);
  }
}

const isLogoish = (u) => u.startsWith("/images/logo") || /store-logos\/stores\//.test(u) || /\/logo\.(png|svg|webp)/.test(u);
const imageCache = new Map();
async function checkImage(u) {
  if (imageCache.has(u)) return imageCache.get(u);
  const p = (async () => {
    const r = await get(new URL(u, SITE).href, true);
    const loc = r.headers.get("location");
    const out = { status: r.status, type: r.headers.get("content-type") || "", location: loc ? norm(loc) : null, robots: r.headers.get("x-robots-tag") || "" };
    try { await r.arrayBuffer(); } catch {}
    return out;
  })();
  imageCache.set(u, p);
  return p;
}

const xml = await (await get(`${SITE}/sitemap.xml`)).text();
const entries = [...xml.matchAll(/<url>([\s\S]*?)<\/url>/g)].map((m) => ({
  loc: m[1].match(/<loc>([^<]+)<\/loc>/)?.[1],
  img: m[1].match(/<image:loc>([^<]+)<\/image:loc>/)?.[1] || null,
})).filter((e) => e.loc && /\/store\//.test(e.loc));

const results = [];
let idx = 0;
async function worker() {
  while (idx < entries.length) {
    const e = entries[idx++];
    const path = new URL(e.loc).pathname;
    const res = { page: path, sitemapImage: e.img ? norm(e.img) : null, problems: [], images: [] };
    try {
      const r = await get(e.loc, true);
      res.status = r.status;
      if (r.status !== 200) { res.problems.push(`page status ${r.status}${r.headers.get("location") ? " → " + r.headers.get("location") : ""}`); results.push(res); continue; }
      const html = await r.text();
      const imgs = [];
      for (const m of html.matchAll(/<meta[^>]+(?:property|name)="(og:image|twitter:image)"[^>]+content="([^"]+)"/g)) imgs.push({ where: m[1], url: unesc(m[2]) });
      for (const m of html.matchAll(/<link[^>]+rel="preload"[^>]+as="image"[^>]*>/g)) { const h = m[0].match(/href="([^"]+)"/); if (h) imgs.push({ where: "preload", url: unesc(h[1]) }); }
      const body = html.replace(/<script[\s\S]*?<\/script>/g, "");
      for (const m of body.matchAll(/<img[^>]*>/g)) { const s = m[0].match(/\ssrc="([^"]+)"/); if (s) imgs.push({ where: "img", url: unesc(s[1]) }); const ss = m[0].match(/srcSet="([^"]+)"/i); if (ss) unesc(ss[1]).split(",").forEach((p) => imgs.push({ where: "img-srcset", url: p.trim().split(/\s+/)[0] })); }
      for (const m of html.matchAll(/<script type="application\/ld\+json"[^>]*>([\s\S]*?)<\/script>/g)) { try { collectJsonLdImages(JSON.parse(m[1]), imgs); } catch { res.problems.push("invalid JSON-LD"); } }
      for (const i of imgs) i.url = norm(i.url);
      res.images = imgs;

      const nextImgLogos = imgs.filter((i) => i.url.includes("/_next/image") && /store-logos|supabase/.test(decodeURIComponent(i.url)));
      if (nextImgLogos.length) res.problems.push(`logo served via /_next/image (indexable): ${nextImgLogos.length}`);
      const candidates = [...new Set(imgs.filter((i) => !isLogoish(i.url) && !i.url.startsWith("data:") && !i.url.includes("/_next/static/")).map((i) => i.url))];
      res.indexableImages = candidates;
      if (candidates.length > 1) res.problems.push(`more than one indexable image: ${candidates.join(" | ")}`);
      const og = imgs.find((i) => i.where === "og:image")?.url;
      if (!og) res.problems.push("no og:image");
      if (res.sitemapImage && og && og !== res.sitemapImage) res.problems.push(`og:image ≠ sitemap image (${og} vs ${res.sitemapImage})`);
      const primary = imgs.find((i) => i.where.endsWith(".primaryImageOfPage"))?.url;
      if (res.sitemapImage && primary && primary !== res.sitemapImage) res.problems.push(`primaryImageOfPage ≠ sitemap image`);
      if (!res.sitemapImage) res.problems.push("no image in sitemap");
      for (const u of candidates) {
        const c = await checkImage(u);
        if (c.status !== 200 || !c.type.startsWith("image/")) res.problems.push(`image ${u} → ${c.status} ${c.type}${c.location ? " → " + c.location : ""}`);
        if (/noindex|none|noimageindex/.test(c.robots) && !/vercel\.app/.test(SITE)) res.problems.push(`image ${u} has x-robots-tag: ${c.robots}`);
      }
      // Old image URLs of this store must 301 to the current generated image.
      const slug = path.split("/")[2];
      const current = res.sitemapImage;
      const olds = [`/store/${slug}/card-image`];
      const hub = path.match(/^\/store\/[^/]+\/coupon\/([^/]+)/)?.[1];
      if (hub) olds.push(`/store/${slug}/coupon/${hub}/card-image`, `/store/${slug}/coupon/${hub}/opengraph-image`);
      res.oldUrls = [];
      for (const o of olds) {
        const c = await checkImage(o);
        res.oldUrls.push({ url: o, ...c });
        if (current && current.startsWith("/images/coupons/")) {
          if (!(c.status === 301 || c.status === 308) || c.location !== current) res.problems.push(`old image ${o} → ${c.status}${c.location ? " " + c.location : ""} (expected 301 → ${current})`);
        }
      }
    } catch (err) { res.problems.push(`fetch error: ${err.message}`); }
    results.push(res);
  }
}
await Promise.all(Array.from({ length: 4 }, worker));
results.sort((a, b) => a.page.localeCompare(b.page));

const bad = results.filter((r) => r.problems.length);
let md = `# Image audit — ${new Date().toISOString()}\n\nPages checked: ${results.length} · with problems: ${bad.length}\n\n`;
const tally = {};
for (const r of bad) for (const p of r.problems) { const k = p.replace(/\/[^\s|()]+/g, "…").slice(0, 90); tally[k] = (tally[k] || 0) + 1; }
md += "## Problem types\n\n" + Object.entries(tally).sort((a, b) => b[1] - a[1]).map(([k, n]) => `- ${n} × ${k}`).join("\n") + "\n\n## Pages\n\n";
for (const r of bad) md += `### ${r.page}\n- sitemap: ${r.sitemapImage}\n${r.problems.map((p) => `- ${p}`).join("\n")}\n\n`;
writeFileSync("seo-image-audit.md", md);
writeFileSync("seo-image-audit.json", JSON.stringify(results, null, 2));
if (process.env.GITHUB_STEP_SUMMARY) appendFileSync(process.env.GITHUB_STEP_SUMMARY, md);
console.log(md);
