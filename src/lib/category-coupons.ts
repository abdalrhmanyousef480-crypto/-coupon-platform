// ============================================================
// كوبون بيُحسب ضمن تصنيف معيّن في حالتين:
// 1) لو categoryId بتاعه محدد صراحة على هذا التصنيف (override يدوي).
// 2) لو مفيش categoryId صريح، بيرث تصنيف المتجر التابع له.
//
// من غير المنطق ده، الكوبونات اللي اتضافت من غير ما حد يحدد لها
// تصنيف صريح (وده معظم الكوبونات، لأن الحقل اختياري بفورم الأدمن)
// بتختفي من عداد التصنيف حتى لو متجرها تابع له فعليًا.
// ============================================================
import type { Prisma } from "@prisma/client";
import { db } from "@/lib/db";

export function couponsInCategoryWhere(
  categoryId: string,
  extra?: Prisma.CouponWhereInput
): Prisma.CouponWhereInput {
  const inCategory: Prisma.CouponWhereInput = {
    OR: [{ categoryId }, { categoryId: null, store: { categoryId } }],
  };
  return extra ? { AND: [inCategory, extra] } : inCategory;
}

// كانت هذه الدالة تعمل query منفصل (count) لكل تصنيف على حدة (N+1) —
// بدل هيك، نجيب كل الكوبونات المرشحة (بتصنيف صريح من الليستة، أو
// بدون تصنيف صريح عشان نفحص تصنيف متجرها) بـ query واحد فقط، ونعدّهم
// بالذاكرة. أعمدة قليلة جدًا (categoryId + store.categoryId) فالحمل خفيف.
export async function countCouponsByCategory(
  categoryIds: string[],
  extra?: Prisma.CouponWhereInput
): Promise<Record<string, number>> {
  const counts = Object.fromEntries(categoryIds.map((id) => [id, 0])) as Record<string, number>;
  if (categoryIds.length === 0) return counts;

  const idSet = new Set(categoryIds);
  const candidateWhere: Prisma.CouponWhereInput = {
    OR: [{ categoryId: { in: categoryIds } }, { categoryId: null }],
  };

  const coupons = await db.coupon.findMany({
    where: extra ? { AND: [candidateWhere, extra] } : candidateWhere,
    select: { categoryId: true, store: { select: { categoryId: true } } },
  });

  for (const coupon of coupons) {
    const effectiveId = coupon.categoryId ?? coupon.store.categoryId;
    if (effectiveId && idSet.has(effectiveId)) counts[effectiveId]++;
  }
  return counts;
}
