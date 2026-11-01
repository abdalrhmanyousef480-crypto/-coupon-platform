import { db } from "@/lib/db";
// Legacy image URL for Google / existing external references.
// It never renders PNG/WebP; redirect to an uploaded file or existing store logo.
export async function GET(_req: Request, { params }: { params: Promise<{ storeSlug: string; couponSlug: string }> }) {
  const { storeSlug, couponSlug } = await params;
  const coupon = await db.coupon.findFirst({
    where: { slug: couponSlug, store: { slug: storeSlug, isPublished: true } },
    select: { cardImageUrl: true, store: { select: { logoUrl: true } } },
  });
  if (!coupon) return new Response("Not found", { status: 404 });
  return new Response(null, {
    status: 307,
    headers: { Location: coupon.cardImageUrl || coupon.store.logoUrl, "Cache-Control": "public, max-age=3600" },
  });
}
