// ============================================================
// كوبون بيُحسب ضمن تصنيف معيّن في حالتين:
// 1) لو categoryId بتاعه محدد صراحة على هذا التصنيف (override يدوي).
// 2) لو مفيش categoryId صريح، بيرث تصنيفات المتجر التابع له — والمتجر
//    ممكن ينتمي لعدة تصنيفات، فالكوبون بيُحسب بكل واحد منها.
//
// من غير المنطق ده، الكوبونات اللي اتضافت من غير ما حد يحدد لها
// تصنيف صريح (وده معظم الكوبونات، لأن الحقل اختياري بفورم الأدمن)
// بتختفي من عداد التصنيف حتى لو متجرها تابع له فعليًا.
//
// store.isPublished/noindex لازم يتفلتر هون كمان (مو بس بصفحة المتجر نفسها):
// إلغاء نشر متجر ما بيلمس Coupon.isPublished بتاعه إطلاقًا (toggleStorePublish
// بـ actions-store.ts بيعدّل عمود المتجر بس) — فبدون هالشرط، كوبون متجر
// اتلغى نشره يضل يظهر بصفحة التصنيف (وبعدّاد countCouponsByCategory) حتى
// بعد revalidate كامل وبدون أي كاش، لأنه مو خلل كاش أصلًا — الاستعلام نفسه
// كان يرجّع الصف ده دايمًا. رابط المتجر لحاله (`/store/[slug]`) كان سليم
// لأنه بيفلتر isPublished هناك مباشرة، فالفرق بين "المتجر يعطي 404" و"كوبونه
// لسه ظاهر بصفحة التصنيف" كان بالضبط هالفجوة.
// ============================================================
import type { Prisma } from "@prisma/client";
import { db } from "@/lib/db";

export function couponsInCategoryWhere(
  categoryId: string,
  extra?: Prisma.CouponWhereInput
): Prisma.CouponWhereInput {
  const inCategory: Prisma.CouponWhereInput = {
    store: { isPublished: true, noindex: false },
    OR: [{ categoryId }, { categoryId: null, store: { categories: { some: { categoryId } } } }],
  };
  return extra ? { AND: [inCategory, extra] } : inCategory;
}

// كانت هذه الدالة تعمل query منفصل (count) لكل تصنيف على حدة (N+1) —
// بدل هيك، نجيب كل الكوبونات المرشحة (بتصنيف صريح من الليستة، أو
// بدون تصنيف صريح عشان نفحص تصنيف متجرها) بـ query واحد فقط، ونعدّهم
// بالذاكرة. أعمدة قليلة جدًا (categoryId + معرّفات تصنيفات المتجر) فالحمل خفيف.
export async function countCouponsByCategory(
  categoryIds: string[],
  extra?: Prisma.CouponWhereInput
): Promise<Record<string, number>> {
  const counts = Object.fromEntries(categoryIds.map((id) => [id, 0])) as Record<string, number>;
  if (categoryIds.length === 0) return counts;

  const idSet = new Set(categoryIds);
  // store.isPublished/noindex بالـ where مباشرة (مو فلترة بالذاكرة بعدين) —
  // نفس الفجوة المذكورة فوق بـ couponsInCategoryWhere: بدونها، متجر اتلغى
  // نشره يخلي تصنيفه يبان "غير فارغ" بالعدّاد (وبالتالي بالسايتماب) حتى لو
  // كل كوبوناته المتبقية تابعة لمتاجر ملغى نشرها فعليًا.
  const candidateWhere: Prisma.CouponWhereInput = {
    store: { isPublished: true, noindex: false },
    OR: [{ categoryId: { in: categoryIds } }, { categoryId: null }],
  };

  const coupons = await db.coupon.findMany({
    where: extra ? { AND: [candidateWhere, extra] } : candidateWhere,
    select: { categoryId: true, store: { select: { categories: { select: { categoryId: true } } } } },
  });

  for (const coupon of coupons) {
    // تصنيف صريح = ينحسب فيه فقط. بدونه = ينحسب بكل تصنيف من تصنيفات متجره
    // (StoreCategory فريد بـ (storeId, categoryId) فما في عدّ مزدوج لنفس التصنيف).
    const effectiveIds = coupon.categoryId ? [coupon.categoryId] : coupon.store.categories.map((sc) => sc.categoryId);
    for (const id of effectiveIds) if (idSet.has(id)) counts[id]++;
  }
  return counts;
}
