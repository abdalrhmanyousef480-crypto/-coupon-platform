import sharp from "sharp";
import { db } from "@/lib/db";

/**
 * Instagram preview derived directly from the site's existing coupon card.
 * This does not alter the public card-image route, OG image, or SEO metadata.
 * The existing card already includes the merchant logo and coupon code.
 */
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ storeSlug: string; couponSlug: string }> }
) {
  const { storeSlug, couponSlug } = await params;
  const coupon = await db.coupon.findFirst({
    where: { slug: couponSlug, store: { slug: storeSlug, isPublished: true }, isPublished: true },
    select: { expiresAt: true },
  });
  if (!coupon || (coupon.expiresAt && coupon.expiresAt <= new Date())) {
    return new Response("Coupon unavailable", { status: 404 });
  }

  try {
    const base = new URL(request.url);
    // Reuse the original site's image instead of creating a different design.
    const source = new URL(
      `/store/${encodeURIComponent(storeSlug)}/coupon/${encodeURIComponent(couponSlug)}/card-image`,
      base.origin
    );
    const response = await fetch(source, { signal: AbortSignal.timeout(12000) });
    if (!response.ok) throw new Error(`Card image returned ${response.status}`);
    const bytes = Buffer.from(await response.arrayBuffer());
    if (!bytes.length || bytes.length > 5_000_000) throw new Error("Invalid card image");

    // 1080x1350 portrait, with the 1080px square card intact and centered.
    const output = await sharp(bytes)
      .resize(1080, 1080, { fit: "contain", background: "#ffffff" })
      .extend({
        top: 135,
        bottom: 135,
        left: 0,
        right: 0,
        background: "#ffffff",
      })
      .jpeg({ quality: 90, mozjpeg: true })
      .toBuffer();

    return new Response(new Uint8Array(output), {
      headers: {
        "Content-Type": "image/jpeg",
        "Cache-Control": "private, no-store",
        "X-Content-Type-Options": "nosniff",
      },
    });
  } catch (error) {
    console.error("[instagram-preview] image generation failed", error);
    return new Response("Preview temporarily unavailable", {
      status: 503,
      headers: { "Cache-Control": "no-store", "Retry-After": "120" },
    });
  }
}
