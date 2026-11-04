// Serves auto-generated coupon images on the site's own domain:
//   /images/coupons/<coupon-slug>-<code>.webp
// The file lives in Supabase Storage (written by GitHub Actions). We proxy it
// with our own headers because Supabase adds `x-robots-tag: none`, which would
// keep the image out of Google Images. File names change whenever the code
// changes, so the CDN can keep each one for a year: the function runs only on
// a CDN miss, never per visitor.
const FILE_RE = /^[a-z0-9-]+\.webp$/;

export async function GET(_request: Request, { params }: { params: Promise<{ file: string }> }) {
  const { file } = await params;
  const supabase = process.env.NEXT_PUBLIC_SUPABASE_URL?.replace(/\/+$/, "");
  if (!supabase || !FILE_RE.test(file)) return new Response("Not found", { status: 404 });

  try {
    const upstream = await fetch(`${supabase}/storage/v1/object/public/store-logos/generated/coupons/${file}`, {
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
        "Cache-Control": "public, max-age=31536000, s-maxage=31536000, immutable",
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
