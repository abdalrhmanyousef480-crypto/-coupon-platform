"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import { couponSchema, type CouponInput } from "@/lib/validations";
import type { ActionResult } from "@/lib/actions-store";

async function requireAdmin() {
  const session = await getServerSession(authOptions);
  if (!session) throw new Error("غير مصرّح");
  return session;
}

export async function createCoupon(data: CouponInput): Promise<ActionResult> {
  await requireAdmin();
  const parsed = couponSchema.safeParse(data);
  if (!parsed.success) return { success: false, error: parsed.error.errors[0].message };

  const existing = await db.coupon.findUnique({
    where: { storeId_slug: { storeId: parsed.data.storeId, slug: parsed.data.slug } },
  });
  if (existing) return { success: false, error: "هذا الرابط مستخدم بالفعل لكوبون آخر بنفس المتجر" };

  const store = await db.store.findUnique({ where: { id: parsed.data.storeId } });
  if (!store) return { success: false, error: "المتجر المختار غير موجود" };

  await db.coupon.create({
    data: {
      ...parsed.data,
      // لو الأدمن ما اختارش تصنيف صريح، بيرث تصنيف المتجر تلقائيًا
      // (يفضل قابل للتغيير يدويًا لو الكوبون فعلًا مختلف عن تصنيف متجره)
      categoryId: parsed.data.categoryId || store.categoryId,
      code: parsed.data.code || null,
      terms: parsed.data.terms || null,
      termsAr: parsed.data.termsAr || null,
      affiliateUrl: parsed.data.affiliateUrl || null,
      canonicalUrl: parsed.data.canonicalUrl || null,
      expiresAt: parsed.data.expiresAt ? new Date(parsed.data.expiresAt) : null,
      seoTitle: parsed.data.seoTitle || null,
      seoDescription: parsed.data.seoDescription || null,
      seoTitleAr: parsed.data.seoTitleAr || null,
      seoDescriptionAr: parsed.data.seoDescriptionAr || null,
      lastCheckedAt: new Date(),
    },
  });

  // النشر التلقائي: صفحة الكوبون + صفحة المتجر (اللي تحتوي قائمة الكوبونات) + السايتماب
  // تتحدث كلها فورًا، بدون أي كود إضافي — بالضبط زي ما طلب قسم 28 بالبرومبت
  revalidateCouponPaths(store.slug, parsed.data.slug);
  redirect("/admin/coupons");
}

export async function updateCoupon(id: string, data: CouponInput): Promise<ActionResult> {
  await requireAdmin();
  const parsed = couponSchema.safeParse(data);
  if (!parsed.success) return { success: false, error: parsed.error.errors[0].message };

  const oldCoupon = await db.coupon.findUnique({ where: { id }, include: { store: true } });
  if (!oldCoupon) return { success: false, error: "الكوبون غير موجود" };

  const existing = await db.coupon.findFirst({
    where: { storeId: parsed.data.storeId, slug: parsed.data.slug, id: { not: id } },
  });
  if (existing) return { success: false, error: "هذا الرابط مستخدم بالفعل لكوبون آخر بنفس المتجر" };

  const store = await db.store.findUnique({ where: { id: parsed.data.storeId } });
  if (!store) return { success: false, error: "المتجر المختار غير موجود" };

  await db.coupon.update({
    where: { id },
    data: {
      ...parsed.data,
      categoryId: parsed.data.categoryId || store.categoryId,
      code: parsed.data.code || null,
      terms: parsed.data.terms || null,
      termsAr: parsed.data.termsAr || null,
      affiliateUrl: parsed.data.affiliateUrl || null,
      canonicalUrl: parsed.data.canonicalUrl || null,
      expiresAt: parsed.data.expiresAt ? new Date(parsed.data.expiresAt) : null,
      seoTitle: parsed.data.seoTitle || null,
      seoDescription: parsed.data.seoDescription || null,
      seoTitleAr: parsed.data.seoTitleAr || null,
      seoDescriptionAr: parsed.data.seoDescriptionAr || null,
    },
  });

  // Redirect تلقائي لو تغيّر السلج أو المتجر (رابط الكوبون كامل يتغيّر بالحالتين)
  const oldPath = `/store/${oldCoupon.store.slug}/coupon/${oldCoupon.slug}`;
  const newPath = `/store/${store.slug}/coupon/${parsed.data.slug}`;
  if (oldPath !== newPath) {
    await db.redirect.create({ data: { fromPath: oldPath, toPath: newPath, statusCode: 301 } }).catch(() => {});
    revalidatePath(oldPath);
  }

  revalidateCouponPaths(store.slug, parsed.data.slug);
  redirect("/admin/coupons");
}

export async function deleteCoupon(id: string): Promise<ActionResult> {
  await requireAdmin();
  const coupon = await db.coupon.findUnique({ where: { id }, include: { store: true } });
  if (!coupon) return { success: false, error: "الكوبون غير موجود" };

  await db.coupon.delete({ where: { id } });
  revalidateCouponPaths(coupon.store.slug, coupon.slug);
  return { success: true };
}

export async function toggleCouponPublish(id: string, isPublished: boolean) {
  await requireAdmin();
  const coupon = await db.coupon.update({ where: { id }, data: { isPublished }, include: { store: true } });
  revalidateCouponPaths(coupon.store.slug, coupon.slug);
}

export async function markCouponVerified(id: string) {
  await requireAdmin();
  const coupon = await db.coupon.update({
    where: { id },
    data: { isVerified: true, lastCheckedAt: new Date() },
    include: { store: true },
  });
  revalidateCouponPaths(coupon.store.slug, coupon.slug);
}

function revalidateCouponPaths(storeSlug: string, couponSlug: string) {
  revalidatePath("/");
  revalidatePath("/coupons");
  revalidatePath(`/store/${storeSlug}`);
  revalidatePath(`/store/${storeSlug}/coupon/${couponSlug}`);
  revalidatePath("/admin/coupons");
  revalidatePath("/sitemap.xml");
}
