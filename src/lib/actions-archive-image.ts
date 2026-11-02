"use server";

import { randomUUID, createHash } from "node:crypto";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import { STORE_LOGOS_BUCKET, getSupabaseAdmin } from "@/lib/supabase";
import { COUPON_IMAGE_VERSION, SITE_URL } from "@/lib/seo";

type Result = { success: true } | { success: false; error: string };
const sha256 = (buffer: Buffer) => createHash("sha256").update(buffer).digest("hex");

async function saveExactWebp(kind: "store" | "coupon", id: string, source: string): Promise<string> {
  // Exactly one old image request per admin click. No cron, queue, or batch.
  const response = await fetch(source, { cache: "no-store", signal: AbortSignal.timeout(25000) });
  const bytes = Buffer.from(await response.arrayBuffer());
  if (!response.ok || !response.headers.get("content-type")?.includes("image/webp") ||
      bytes.length < 80 || bytes.length > 3_500_000 ||
      bytes.toString("ascii", 0, 4) !== "RIFF" || bytes.toString("ascii", 8, 12) !== "WEBP") {
    throw new Error("تعذر الحصول على صورة WebP الأصلية سليمة، لم تُغيّر بيانات الصورة");
  }
  const storage = getSupabaseAdmin().storage.from(STORE_LOGOS_BUCKET);
  const path = `legacy-image-snapshots/${kind}/${id}/${randomUUID()}.webp`;
  const uploaded = await storage.upload(path, bytes, { upsert: false, contentType: "image/webp", cacheControl: "31536000" });
  if (uploaded.error) throw new Error("فشل حفظ نسخة الصورة في Supabase");
  const url = storage.getPublicUrl(path).data.publicUrl;
  const verified = await fetch(url, { cache: "no-store", signal: AbortSignal.timeout(10000) });
  const copiedBytes = Buffer.from(await verified.arrayBuffer());
  if (!verified.ok || sha256(bytes) !== sha256(copiedBytes)) {
    throw new Error("الصورة المنسوخة غير مطابقة للأصل، لم يتم تغيير رابط الصورة");
  }
  return url;
}

async function requireAdmin(): Promise<boolean> {
  return Boolean(await getServerSession(authOptions));
}

/** Saves one old store image with identical bytes while keeping its public URL. */
export async function archiveOneStoreImage(id: string): Promise<Result> {
  if (!await requireAdmin()) return { success: false, error: "غير مصرح" };
  const store = await db.store.findUnique({
    where: { id }, select: { id: true, slug: true, isPublished: true, cardImageUrl: true, legacyImageSnapshotUrl: true },
  });
  if (!store || !store.isPublished) return { success: false, error: "المتجر غير منشور أو غير موجود" };
  if (store.cardImageUrl) return { success: false, error: "هذا المتجر يستخدم صورة ثابتة بالفعل" };
  if (store.legacyImageSnapshotUrl) return { success: true };
  try {
    const src = `${SITE_URL}/store/${encodeURIComponent(store.slug)}/card-image?v=2`;
    const image = await saveExactWebp("store", store.id, src);
    await db.store.update({ where: { id }, data: { legacyImageSnapshotUrl: image } });
    return { success: true };
  } catch (error) {
    console.error("[archive-old-store-card]", error);
    return { success: false, error: error instanceof Error ? error.message : "تعذر تثبيت الصورة" };
  }
}

/** Saves one old coupon image with identical bytes while keeping its public URL. */
export async function archiveOneCouponImage(id: string): Promise<Result> {
  if (!await requireAdmin()) return { success: false, error: "غير مصرح" };
  const coupon = await db.coupon.findUnique({
    where: { id }, select: { id: true, slug: true, isPublished: true, cardImageUrl: true, legacyImageSnapshotUrl: true,
      store: { select: { slug: true, isPublished: true } } },
  });
  if (!coupon || !coupon.isPublished || !coupon.store.isPublished) return { success: false, error: "الكوبون غير منشور أو غير موجود" };
  if (coupon.cardImageUrl) return { success: false, error: "هذا الكوبون يستخدم صورة ثابتة بالفعل" };
  if (coupon.legacyImageSnapshotUrl) return { success: true };
  try {
    const src = `${SITE_URL}/store/${encodeURIComponent(coupon.store.slug)}/coupon/${encodeURIComponent(coupon.slug)}/card-image?v=${COUPON_IMAGE_VERSION}`;
    const image = await saveExactWebp("coupon", coupon.id, src);
    await db.coupon.update({ where: { id }, data: { legacyImageSnapshotUrl: image } });
    return { success: true };
  } catch (error) {
    console.error("[archive-old-coupon-card]", error);
    return { success: false, error: error instanceof Error ? error.message : "تعذر تثبيت الصورة" };
  }
}
