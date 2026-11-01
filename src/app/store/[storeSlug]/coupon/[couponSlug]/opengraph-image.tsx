import { db } from "@/lib/db";
// Legacy social image URL. No runtime image generation or font downloading.
export default async function Image({ params }: {
  params: Promise<{ storeSlug: string; couponSlug: string }>;
}): Promise<Response> {
  const { storeSlug, couponSlug } = await params;
  const coupon = await db.coupon.findFirst({
    where: { slug: couponSlug, store: { slug: storeSlug, isPublished: true } },
    select: { cardImageUrl: true, store: { select: { logoUrl: true } } },
  });
  if (!coupon) return new Response("Not found", { status: 404 });
  return Response.redirect(coupon.cardImageUrl || coupon.store.logoUrl, 307);
}
