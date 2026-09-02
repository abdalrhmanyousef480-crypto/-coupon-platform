"use server";

// ============================================================
// Server Actions للجزء التفاعلي بصفحة /coupons العامة (بحث حي +
// تحميل المزيد) — بدون تسجيل دخول (عكس lib/actions-coupon.ts
// المخصص للوحة التحكم). كل دالة هون قراءة فقط.
// ============================================================
import { db } from "@/lib/db";
import {
  COUPONS_PAGE_SIZE,
  SEARCH_RESULT_LIMIT,
  COUPON_PRIORITY_ORDER,
  COUPON_INCLUDE,
  couponsWhere,
  type PublicCouponWithStore,
} from "@/lib/coupons-query";

/** وضع التصفح العادي: صفحة من 5 كوبونات بدءًا من offset، مرتّبة حسب
 *  نفس منطق الأولوية الموجود أصلًا بالمشروع. بنجيب عنصر زيادة واحد
 *  فقط لمعرفة لو فيه صفحة تانية بعدها، بدل عمل query count منفصل. */
export async function fetchCoupons(offset: number): Promise<{ coupons: PublicCouponWithStore[]; hasMore: boolean }> {
  const safeOffset = Math.max(0, Math.trunc(offset) || 0);
  const rows = await db.coupon.findMany({
    where: couponsWhere(),
    orderBy: COUPON_PRIORITY_ORDER,
    include: COUPON_INCLUDE,
    skip: safeOffset,
    take: COUPONS_PAGE_SIZE + 1,
  });
  const hasMore = rows.length > COUPONS_PAGE_SIZE;
  return { coupons: rows.slice(0, COUPONS_PAGE_SIZE), hasMore };
}

/** بحث حي: بيتجاوز نظام "5 كل مرة" بالكامل ويرجّع كل النتائج المطابقة
 *  دفعة وحدة (لحد SEARCH_RESULT_LIMIT). */
export async function searchCoupons(query: string): Promise<PublicCouponWithStore[]> {
  const term = query.trim();
  if (!term) return [];
  return db.coupon.findMany({
    where: couponsWhere(term),
    orderBy: COUPON_PRIORITY_ORDER,
    include: COUPON_INCLUDE,
    take: SEARCH_RESULT_LIMIT,
  });
}
