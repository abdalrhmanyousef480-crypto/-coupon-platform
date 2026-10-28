"use server";

import { revalidatePath, revalidateTag } from "next/cache";
import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import { notifyIndexNow } from "@/lib/indexnow";
import { couponSchema, type CouponInput } from "@/lib/validations";
import type { ActionResult } from "@/lib/actions-store";
import { revalidateCategoriesForStore } from "@/lib/store-categories";

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

  const created = await db.coupon.create({
    data: {
      ...parsed.data,
      // لو الأدمن ما اختارش تصنيف صريح، بيرث تصنيف المتجر تلقائيًا
      // (يفضل قابل للتغيير يدويًا لو الكوبون فعلًا مختلف عن تصنيف متجره)
      categoryId: parsed.data.categoryId || null,
      code: parsed.data.code || null,
      terms: parsed.data.terms || null,
      termsAr: parsed.data.termsAr || null,
      affiliateUrl: parsed.data.affiliateUrl || null,
      canonicalUrl: parsed.data.canonicalUrl || null,
      expiresAt: parsed.data.expiresAt ? new Date(parsed.data.expiresAt) : null,
      topCouponOrder: parseTopCouponOrder(parsed.data.topCouponOrder),
      seoTitle: parsed.data.seoTitle || null,
      seoDescription: parsed.data.seoDescription || null,
      seoTitleAr: parsed.data.seoTitleAr || null,
      seoDescriptionAr: parsed.data.seoDescriptionAr || null,
      lastCheckedAt: new Date(),
      isVerified: false, // Verification must be an explicit per-coupon action after testing.
      manuallyVerifiedAt: null,
    },
  });

  // النشر التلقائي: صفحة الكوبون + صفحة المتجر (اللي تحتوي قائمة الكوبونات) + السايتماب
  // تتحدث كلها فورًا، بدون أي كود إضافي — بالضبط زي ما طلب قسم 28 بالبرومبت
  await revalidateCouponPaths(store.id, store.slug, parsed.data.slug, parsed.data.categoryId);
  if (created.isPublished && !created.noindex && store.isPublished && !store.noindex
      && (!created.expiresAt || created.expiresAt >= new Date())) {
    await notifyIndexNow([`/store/${store.slug}`, `/store/${store.slug}/coupon/${created.slug}`]);
  }
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

  // A different code, offer or merchant invalidates any earlier verification.
  // Never trust the isVerified checkbox value submitted from the edit form.
  const offerChanged = oldCoupon.storeId !== parsed.data.storeId
    || oldCoupon.type !== parsed.data.type
    || (oldCoupon.code || "") !== (parsed.data.code || "")
    || oldCoupon.discountLabel !== parsed.data.discountLabel;
  await db.coupon.update({
    where: { id },
    data: {
      ...parsed.data,
      isVerified: offerChanged ? false : oldCoupon.isVerified,
      manuallyVerifiedAt: offerChanged ? null : oldCoupon.manuallyVerifiedAt,
      categoryId: parsed.data.categoryId || null,
      code: parsed.data.code || null,
      terms: parsed.data.terms || null,
      termsAr: parsed.data.termsAr || null,
      affiliateUrl: parsed.data.affiliateUrl || null,
      canonicalUrl: parsed.data.canonicalUrl || null,
      expiresAt: parsed.data.expiresAt ? new Date(parsed.data.expiresAt) : null,
      topCouponOrder: parseTopCouponOrder(parsed.data.topCouponOrder),
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
    revalidatePath(oldPath, "page");
  }

  await revalidateCouponPaths(store.id, store.slug, parsed.data.slug, parsed.data.categoryId);
  await notifyIndexNow([oldPath, newPath, `/store/${oldCoupon.store.slug}`, `/store/${store.slug}`]);
  redirect("/admin/coupons");
}

export async function deleteCoupon(id: string): Promise<ActionResult> {
  await requireAdmin();
  const coupon = await db.coupon.findUnique({ where: { id }, include: { store: true } });
  if (!coupon) return { success: false, error: "الكوبون غير موجود" };

  await db.coupon.delete({ where: { id } });
  await revalidateCouponPaths(coupon.store.id, coupon.store.slug, coupon.slug, coupon.categoryId);
  await notifyIndexNow([`/store/${coupon.store.slug}/coupon/${coupon.slug}`, `/store/${coupon.store.slug}`]);
  return { success: true };
}

export async function toggleCouponPublish(id: string, isPublished: boolean) {
  await requireAdmin();
  const coupon = await db.coupon.update({ where: { id }, data: { isPublished }, include: { store: true } });
  await revalidateCouponPaths(coupon.store.id, coupon.store.slug, coupon.slug, coupon.categoryId);
  await notifyIndexNow([`/store/${coupon.store.slug}/coupon/${coupon.slug}`, `/store/${coupon.store.slug}`]);
}

// Verification is deliberately one coupon at a time, only after an admin has
// tested the offer on the merchant's checkout page. No bulk date-refresh action.
export async function markCouponVerified(id: string, confirmedTest: boolean): Promise<ActionResult> {
  await requireAdmin();
  if (!confirmedTest) return { success: false, error: "يجب تأكيد تجربة الكود قبل اعتماده" };
  const existing = await db.coupon.findUnique({ where: { id }, include: { store: true } });
  if (!existing) return { success: false, error: "الكوبون غير موجود" };
  if (!existing.isPublished || !existing.store.isPublished)
    return { success: false, error: "لا يمكن توثيق كوبون غير منشور" };
  if (existing.expiresAt && existing.expiresAt.getTime() <= Date.now())
    return { success: false, error: "انتهت صلاحية هذا الكوبون؛ لا يمكن توثيقه" };
  const timestamp = new Date();
  await db.coupon.update({
    where: { id },
    data: { isVerified: true, lastCheckedAt: timestamp, manuallyVerifiedAt: timestamp },
  });
  await revalidateCouponPaths(existing.store.id, existing.store.slug, existing.slug, existing.categoryId);
  await notifyIndexNow([`/store/${existing.store.slug}/coupon/${existing.slug}`, `/store/${existing.store.slug}`]);
  return { success: true };
}

// A failed real-world test can revoke a verification without deleting its URL.
export async function markCouponUnverified(id: string): Promise<ActionResult> {
  await requireAdmin();
  const existing = await db.coupon.findUnique({ where: { id }, include: { store: true } });
  if (!existing) return { success: false, error: "الكوبون غير موجود" };
  await db.coupon.update({
    where: { id },
    data: { isVerified: false, manuallyVerifiedAt: null },
  });
  await revalidateCouponPaths(existing.store.id, existing.store.slug, existing.slug, existing.categoryId);
  await notifyIndexNow([`/store/${existing.store.slug}/coupon/${existing.slug}`, `/store/${existing.store.slug}`]);
  return { success: true };
}

// تبديل سريع من قائمة الكوبونات لإضافة/إزالة كوبون من قسم "أفضل الكوبونات"
// بالرئيسية، بدون فتح فورم التعديل الكامل — الترتيب اليدوي (topCouponOrder)
// يبقى من الفورم فقط، هذا الزر بس للتشغيل/الإيقاف.
export async function toggleCouponTopPick(id: string, isTopCoupon: boolean) {
  await requireAdmin();
  const coupon = await db.coupon.update({ where: { id }, data: { isTopCoupon }, include: { store: true } });
  await revalidateCouponPaths(coupon.store.id, coupon.store.slug, coupon.slug);
}

// "" (فاضي) → null. رقم صحيح → نفسه. غير كده (نص مش رقم) → null بهدوء
// بدل ما نرمي خطأ على قيمة غير متوقعة بحقل اختياري بحت.
function parseTopCouponOrder(value: string | undefined): number | null {
  if (!value) return null;
  const n = parseInt(value, 10);
  return Number.isFinite(n) ? n : null;
}

// كوبون واحد بيظهر بصفحته + صفحة متجره + أي تصنيف يتبعه متجره (أو تصنيفه
// الصريح) + قائمة /coupons + السايتماب. بدون revalidate لكل هالأماكن،
// حذف/إلغاء نشر كوبون يخلي روابطه تفضل معروضة بصفحة التصنيف كرابط ميت
// لحد ما ينتهي revalidate=3600 لوحده (نفس مشكلة revalidateStorePaths،
// راجع التعليق هناك بـ actions-store.ts).
async function revalidateCouponPaths(storeId: string, storeSlug: string, couponSlug: string, explicitCategoryId?: string | null) {
  // Invalidate cached public listing rows AND total-page count after admin writes.
  revalidateTag("public-coupons-list");
  revalidatePath("/");
  revalidatePath("/coupons");
  // النوع الصريح "page" مقصود — راجع نفس التعليق بـ revalidateStorePaths
  // بـ actions-store.ts: صفحة رجّعت notFound() مرة (كوبون/متجر كان غير
  // منشور) ممكن تفضل عالقة على 404 بالكاش بدون النوع الصريح.
  revalidatePath(`/store/${storeSlug}`, "page");
  revalidatePath(`/store/${storeSlug}/coupon/${couponSlug}`, "page");
  revalidatePath("/admin/coupons");
  revalidatePath("/sitemap.xml");
  await revalidateCategoriesForStore(storeId);
  // كوبون بتصنيف صريح مختلف عن تصنيفات متجره (override يدوي) — تصنيفات
  // المتجر فوق ما تغطّي هالحالة، فنمسح كاش تصنيفه الصريح كمان لو موجود.
  if (explicitCategoryId) {
    const category = await db.category.findUnique({ where: { id: explicitCategoryId }, select: { slug: true } });
    if (category) revalidatePath(`/category/${category.slug}`);
  }
}
