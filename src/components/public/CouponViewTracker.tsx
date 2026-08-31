"use client";

import { useEffect, useRef } from "react";
import { trackCouponView } from "@/lib/actions";

// مكوّن بدون أي واجهة مرئية — غرضه الوحيد تسجيل "مشاهدة" للكوبون
// مرة واحدة فعليًا عند كل زيارة من متصفح حقيقي، بعيدًا عن دورة
// الـ ISR/revalidate الخاصة بالصفحة نفسها (لو استدعينا التحديث
// مباشرة داخل الصفحة كـ Server Component، كان بيصير مرة وحدة لكل
// إعادة توليد للصفحة المخزنة، مش لكل زائر فعلي).
export function CouponViewTracker({ couponId }: { couponId: string }) {
  const tracked = useRef(false);
  useEffect(() => {
    if (tracked.current) return;
    tracked.current = true;
    trackCouponView(couponId).catch(() => {});
  }, [couponId]);
  return null;
}
