"use server";

// ============================================================
// Server Actions للجزء التفاعلي بصفحة /coupons العامة (بحث حي) —
// بدون تسجيل دخول (عكس lib/actions-coupon.ts المخصص للوحة التحكم).
// التنقّل بين الصفحات صار عبر روابط <Link> حقيقية بترقيم صفحات
// (راجع src/app/coupons/page.tsx)، مش Server Action. كل دالة هون
// قراءة فقط.
// ============================================================
import { db } from "@/lib/db";
import {
  SEARCH_RESULT_LIMIT,
  COUPON_PRIORITY_ORDER,
  COUPON_INCLUDE,
  couponsWhere,
  type PublicCouponWithStore,
} from "@/lib/coupons-query";

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
