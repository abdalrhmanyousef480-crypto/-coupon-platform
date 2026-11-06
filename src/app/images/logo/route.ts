// Store logos for the public pages, resized once and cached for a year at the
// CDN. Sent with X-Robots-Tag: noimageindex so Google Images never picks a
// logo instead of the page's coupon card image (it happened: «غيم» showed its
// logo in Google). Only logos stored in our Supabase bucket are accepted.
import sharp from "sharp";

const ALLOWED_PREFIX = /^https:\/\/[a-z0-9]+\.supabase\.co\/storage\/v1\/object\/public\/store-logos\//;
const WIDTHS = [64, 96, 128, 192, 256];

const NOT_FOUND = () =>
  new Response(null, { status: 404, headers: { "Cache-Control": "public, max-age=300", "X-Robots-Tag": "noindex, noimageindex" } });

export async function GET(request: Request) {
  const params = new URL(request.url).searchParams;
  const src = params.get("src") ?? "";
  if (!ALLOWED_PREFIX.test(src)) return NOT_FOUND();
  const asked = Number(params.get("w")) || 128;
  const width = WIDTHS.find((w) => w >= asked) ?? WIDTHS[WIDTHS.length - 1];

  try {
    const upstream = await fetch(src, { signal: AbortSignal.timeout(8000) });
    if (!upstream.ok) return NOT_FOUND();
    const input = Buffer.from(await upstream.arrayBuffer());
    const out = await sharp(input)
      .resize({ width, height: width, fit: "inside", withoutEnlargement: true })
      .webp({ quality: 82 })
      .toBuffer();
    return new Response(new Uint8Array(out), {
      headers: {
        "Content-Type": "image/webp",
        "Cache-Control": "public, max-age=31536000, s-maxage=31536000, immutable",
        "X-Robots-Tag": "noindex, noimageindex",
        "X-Content-Type-Options": "nosniff",
      },
    });
  } catch {
    return NOT_FOUND();
  }
}
