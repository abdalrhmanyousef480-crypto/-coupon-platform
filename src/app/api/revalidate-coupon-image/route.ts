// Called by the Supabase `coupon-images` Edge Function right after it stores a
// generated image, so the store page and sitemap show it immediately instead
// of after the 1-hour ISR window. The shared secret is stored in the
// public.app_secrets table (RLS on, no anon/authenticated access) — never in
// browsers, env files or the repo.
import { timingSafeEqual } from "node:crypto";
import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { effectiveHubCouponSlug, storeHubPath } from "@/lib/store-hub";

async function validSecret(header: string | null): Promise<boolean> {
  const rows = await db.$queryRaw<{ value: string }[]>`SELECT value FROM app_secrets WHERE key = 'revalidate_coupon_image' LIMIT 1`;
  const secret = rows[0]?.value;
  const given = header?.replace(/^Bearer\s+/i, "") ?? "";
  if (!secret || secret.length < 32 || given.length !== secret.length) return false;
  return timingSafeEqual(Buffer.from(given), Buffer.from(secret));
}

export async function POST(request: Request) {
  if (!(await validSecret(request.headers.get("authorization")))) {
    return Response.json({ error: "unauthorized" }, { status: 401 });
  }
  const { couponId } = (await request.json().catch(() => ({}))) as { couponId?: string };
  if (!couponId) return Response.json({ error: "couponId required" }, { status: 400 });

  const coupon = await db.coupon.findUnique({
    where: { id: couponId },
    select: { slug: true, store: { select: { id: true, slug: true, hubCouponSlug: true } } },
  });
  if (!coupon) return Response.json({ error: "not found" }, { status: 404 });

  const published = await db.coupon.findMany({
    where: { storeId: coupon.store.id, isPublished: true },
    select: { slug: true },
  });
  const hubCouponSlug = effectiveHubCouponSlug(coupon.store, published.map((c) => c.slug));
  const hubPath = storeHubPath({ slug: coupon.store.slug, hubCouponSlug });
  revalidatePath(hubPath, "page");
  revalidatePath("/sitemap.xml");
  return Response.json({ revalidated: [hubPath, "/sitemap.xml"] });
}
