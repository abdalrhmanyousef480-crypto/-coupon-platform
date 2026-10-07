import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Candidate = {
  url: string;
  score: number;
};

function resolveUrl(base: string, value: string) {
  try {
    if (!value || value.startsWith("data:")) return null;
    return new URL(value.replace(/&amp;/g, "&"), base).href;
  } catch {
    return null;
  }
}

function isSafePublicHttpUrl(value: string) {
  try {
    const url = new URL(value);
    if (!["http:", "https:"].includes(url.protocol)) return false;
    const h = url.hostname.toLowerCase();
    if (
      h === "localhost" ||
      h === "0.0.0.0" ||
      h === "::1" ||
      /^127\./.test(h) ||
      /^10\./.test(h) ||
      /^192\.168\./.test(h) ||
      /^169\.254\./.test(h) ||
      /^172\.(1[6-9]|2\d|3[01])\./.test(h) ||
      h.endsWith(".local")
    ) return false;
    return true;
  } catch {
    return false;
  }
}

function decodeHtml(value: string) {
  return value
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">");
}

function addCandidate(map: Map<string, number>, base: string, raw: string | undefined, score: number) {
  if (!raw) return;
  const clean = decodeHtml(raw.trim());
  const resolved = resolveUrl(base, clean);
  if (!resolved || !isSafePublicHttpUrl(resolved)) return;

  let adjusted = score;
  const low = resolved.toLowerCase();
  if (/logo/.test(low)) adjusted += 18;
  if (/header|brand|wordmark/.test(low)) adjusted += 12;
  if (/favicon|icon[-_.]|apple-touch|payment|badge|footer/.test(low)) adjusted -= 45;
  if (/mobile|small|mini/.test(low)) adjusted -= 8;
  if (/white|light|inverse/.test(low)) adjusted -= 4;

  const prev = map.get(resolved) ?? -999;
  if (adjusted > prev) map.set(resolved, adjusted);
}

function collectCandidates(html: string, base: string, storeName: string): Candidate[] {
  const map = new Map<string, number>();
  const normalizedName = storeName
    .replace(/[|｜].*$/g, "")
    .replace(/[^\p{L}\p{N}]+/gu, " ")
    .trim()
    .toLowerCase();

  // Structured data is usually the cleanest logo source.
  for (const m of html.matchAll(/"logo"\s*:\s*"([^"]+)"/gi)) {
    addCandidate(map, base, m[1], 120);
  }
  for (const m of html.matchAll(/"logo"\s*:\s*\{[\s\S]{0,600}?"url"\s*:\s*"([^"]+)"/gi)) {
    addCandidate(map, base, m[1], 125);
  }

  // Common logo-related link/meta fields.
  for (const m of html.matchAll(/<meta\b[^>]*(?:property|name)=["'](?:og:logo|logo)["'][^>]*content=["']([^"']+)["'][^>]*>/gi)) {
    addCandidate(map, base, m[1], 115);
  }
  for (const m of html.matchAll(/<meta\b[^>]*content=["']([^"']+)["'][^>]*(?:property|name)=["'](?:og:logo|logo)["'][^>]*>/gi)) {
    addCandidate(map, base, m[1], 115);
  }

  // Header logo images. We score semantic hints rather than taking the first image.
  for (const match of html.matchAll(/<img\b[^>]*>/gi)) {
    const tag = match[0];
    const src =
      tag.match(/\bsrc=["']([^"']+)["']/i)?.[1] ||
      tag.match(/\bdata-src=["']([^"']+)["']/i)?.[1] ||
      tag.match(/\bdata-lazy-src=["']([^"']+)["']/i)?.[1];
    if (!src) continue;

    const alt = tag.match(/\balt=["']([^"']*)["']/i)?.[1] ?? "";
    const cls = tag.match(/\bclass=["']([^"']*)["']/i)?.[1] ?? "";
    const id = tag.match(/\bid=["']([^"']*)["']/i)?.[1] ?? "";
    const title = tag.match(/\btitle=["']([^"']*)["']/i)?.[1] ?? "";
    const context = `${alt} ${cls} ${id} ${title} ${src}`.toLowerCase();

    let score = 0;
    if (/logo|site-logo|brand-logo|header-logo|navbar-brand|custom-logo/.test(context)) score += 95;
    if (/header|navbar|site-header|brand/.test(context)) score += 24;
    if (normalizedName && context.includes(normalizedName)) score += 30;
    if (/footer/.test(context)) score -= 20;
    if (/product|payment|visa|mastercard|mada|tabby|tamara/.test(context)) score -= 80;

    const width = Number(tag.match(/\bwidth=["']?(\d+)/i)?.[1] ?? 0);
    const height = Number(tag.match(/\bheight=["']?(\d+)/i)?.[1] ?? 0);
    if (width >= 100 || height >= 50) score += 8;
    if (score >= 40) addCandidate(map, base, src, score);
  }

  // Logo-ish srcset / CSS asset references as a fallback.
  for (const m of html.matchAll(/(?:srcset|href|src)=["']([^"']*(?:logo|wordmark|brand)[^"']*)["']/gi)) {
    const first = m[1].split(",")[0]?.trim().split(/\s+/)[0];
    addCandidate(map, base, first, 58);
  }

  return [...map.entries()]
    .map(([url, score]) => ({ url, score }))
    .sort((a, b) => b.score - a.score)
    .slice(0, 18);
}

async function fetchUsableLogo(candidates: Candidate[]) {
  for (const candidate of candidates) {
    try {
      const res = await fetch(candidate.url, {
        redirect: "follow",
        headers: {
          "user-agent": "Mozilla/5.0 (compatible; CouponsNoorLogoBot/1.0)",
          accept: "image/avif,image/webp,image/svg+xml,image/png,image/jpeg,image/*,*/*;q=0.8",
        },
        signal: AbortSignal.timeout(8000),
      });
      if (!res.ok) continue;
      const type = (res.headers.get("content-type") || "").split(";")[0].trim().toLowerCase();
      if (!type.startsWith("image/")) continue;

      const buffer = await res.arrayBuffer();
      if (buffer.byteLength < 120 || buffer.byteLength > 4_000_000) continue;

      return { buffer, type, source: candidate.url };
    } catch {
      // Try the next candidate.
    }
  }
  return null;
}

export async function GET(_req: NextRequest, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const store = await db.store.findUnique({
    where: { slug },
    select: { name: true, website: true, isPublished: true },
  });

  if (!store?.isPublished || !store.website || !isSafePublicHttpUrl(store.website)) {
    return new NextResponse(null, { status: 404 });
  }

  try {
    const page = await fetch(store.website, {
      redirect: "follow",
      headers: {
        "user-agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/154 Safari/537.36",
        accept: "text/html,application/xhtml+xml",
        "accept-language": "ar,en;q=0.8",
      },
      signal: AbortSignal.timeout(10000),
      cache: "no-store",
    });

    if (!page.ok) return new NextResponse(null, { status: 404 });
    const contentType = page.headers.get("content-type") || "";
    if (!contentType.includes("text/html")) return new NextResponse(null, { status: 404 });

    const html = await page.text();
    const base = page.url || store.website;
    const candidates = collectCandidates(html, base, store.name);
    const logo = await fetchUsableLogo(candidates);

    if (!logo) return new NextResponse(null, { status: 404 });

    return new NextResponse(logo.buffer, {
      status: 200,
      headers: {
        "Content-Type": logo.type,
        "Cache-Control": "public, s-maxage=86400, stale-while-revalidate=604800",
        "X-Logo-Source": logo.source,
      },
    });
  } catch {
    return new NextResponse(null, { status: 404 });
  }
}
