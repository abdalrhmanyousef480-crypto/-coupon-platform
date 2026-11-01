import { db } from "@/lib/db";
// Deprecated expensive social renderer. Reuse the manually uploaded image.
export async function GET(_req: Request, { params }: { params: Promise<{ storeSlug: string; couponSlug: string }> }) {
  const { storeSlug, couponSlug } = await params;
  const coupon = await db.coupon.findFirst({
    where: { slug: couponSlug, isPublished: true, store: { slug: storeSlug, isPublished: true } },
    select: { cardImageUrl: true, store: { select: { logoUrl: true } } },
  });
  if (!coupon) return new Response("Not found", { status: 404 });
  return new Response(null, { status: 307,
    headers: { Location: coupon.cardImageUrl || coupon.store.logoUrl, "Cache-Control": "public, max-age=3600" },
  });
}
