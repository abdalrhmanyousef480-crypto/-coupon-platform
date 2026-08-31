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

export async function countCouponsByCategory(
  categoryIds: string[],
  extra?: Prisma.CouponWhereInput
): Promise<Record<string, number>> {
  const counts = await Promise.all(
    categoryIds.map((id) => db.coupon.count({ where: couponsInCategoryWhere(id, extra) }))
  );
  return Object.fromEntries(categoryIds.map((id, i) => [id, counts[i]]));
}
