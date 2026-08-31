"use server";

// ============================================================
// SERVER ACTIONS — تُستدعى مباشرة من مكونات Client بدون الحاجة
// لبناء API route منفصل لكل حدث بسيط. هذا هو النمط الموصى فيه
// بـ Next.js App Router للعمليات الخفيفة (تسجيل حدث، زيادة عداد).
// ============================================================
import { db } from "@/lib/db";

export async function revealCoupon(couponId: string) {
  await db.coupon.update({
    where: { id: couponId },
    data: { revealCount: { increment: 1 } },
  });
}

export async function trackCouponClick(couponId: string) {
  await db.coupon.update({
    where: { id: couponId },
    data: { clickCount: { increment: 1 } },
  });
}

export async function trackCouponView(couponId: string) {
  await db.coupon.update({
    where: { id: couponId },
    data: { viewCount: { increment: 1 } },
  });
}
