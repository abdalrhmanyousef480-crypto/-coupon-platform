import { STABLE_COUPON_IMAGE_RE, GENERATED_COUPON_IMAGE_PREFIX } from "@/lib/coupon-image";
import { db } from "@/lib/db";
import { currentGeneratedPageImage, permanentImageRedirect } from "@/lib/legacy-image-redirect";

/** Old code-named file → its store (DB first, then the "<store>-discount-code-<code>" name). */
async function storeOfOldFile(file: string): Promise<string | null> {
  const owner = await db.coupon.findFirst({
    where: { autoImageUrl: `${GENERATED_COUPON_IMAGE_PREFIX}${file}` },
    select: { store: { select: { slug: true } } },
  });
  if (owner) return owner.store.slug;
  const m = file.match(/^(.*)-discount-code-[a-z0-9-]+\.webp$/);
  if (!m) return null;
  const store = await db.store.findUnique({ where: { slug: m[1] }, select: { slug: true } });
  return store?.slug ?? null;
}

// Serves auto-generated coupon images on the site's own domain:
//   /images/coupons/<store-slug>-discount-code.webp  (stable, overwritten when the code changes)
// The file lives in Supabase Storage. We proxy it with our own headers because
// Supabase adds `x-robots-tag: none`, which would keep the image out of Google
// Images. Stable names are cached for an hour so a new code shows up quickly;
// older code-named files never change and keep a one-year cache.
const FILE_RE = /^[a-z0-9-]+\.webp$/;

export async function GET(_request: Request, { params }: { params: Promise<{ file: string }> }) {
  const { file } = await params;
  const supabase = process.env.NEXT_PUBLIC_SUPABASE_URL?.replace(/\/+$/, "");
  if (!supabase || !FILE_RE.test(file)) return new Response("Not found", { status: 404 });

  const stable = STABLE_COUPON_IMAGE_RE.test(file);
  if (!stable) {
    // Old code-named image: 301 to the store's current image (owner decision).
    const storeSlug = await storeOfOldFile(file).catch(() => null);
    const current = storeSlug ? await currentGeneratedPageImage(storeSlug).catch(() => null) : null;
    if (current && current !== `${GENERATED_COUPON_IMAGE_PREFIX}${file}`) return permanentImageRedirect(current);
  }
  // Bypass the storage CDN's copy of an overwritten file (5-minute buckets).
  const bust = stable ? `?v=${Math.floor(Date.now() / 300_000)}` : "";
  try {
    const upstream = await fetch(`${supabase}/storage/v1/object/public/store-logos/generated/coupons/${file}${bust}`, {
      cache: "no-store",
      signal: AbortSignal.timeout(8000),
    });
    if (upstream.status === 400 || upstream.status === 404) {
      return new Response("Not found", { status: 404, headers: { "Cache-Control": "public, max-age=60, s-maxage=300" } });
    }
    if (!upstream.ok || !upstream.body || !upstream.headers.get("content-type")?.includes("image/webp")) {
      throw new Error(`storage HTTP ${upstream.status}`);
    }
    return new Response(upstream.body, {
      headers: {
        "Content-Type": "image/webp",
        "Cache-Control": stable
          ? "public, max-age=3600, s-maxage=3600, stale-while-revalidate=86400"
          : "public, max-age=31536000, s-maxage=31536000, immutable",
        "X-Content-Type-Options": "nosniff",
      },
    });
  } catch (error) {
    console.error("[generated-coupon-image]", error);
    return new Response("Image temporarily unavailable", {
      status: 503,
      headers: { "Retry-After": "120", "Cache-Control": "no-store" },
    });
  }
}
