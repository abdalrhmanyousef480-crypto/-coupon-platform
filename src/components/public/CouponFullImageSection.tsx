"use client";

import { useState } from "react";
import { ChevronDown } from "lucide-react";

/** قسم قابل للطي بصفحة الكوبون يعرض صورة كاملة (1200×630) تتضمن شعار
 *  المتجر وقيمة الخصم وكود الكوبون كنص ظاهر — مولّدة تلقائيًا لكل كوبون
 *  عبر coupon-image/route.tsx (next/og). الصورة <img> ما تُركّب بالـ DOM
 *  إلا بعد أول فتح للقسم (بدل الاعتماد على loading="lazy" وحده)، عشان ما
 *  يصير أي طلب شبكة للصورة وهي مطوية افتراضيًا. */
export function CouponFullImageSection({
  storeSlug,
  couponSlug,
  storeName,
  discountLabel,
}: {
  storeSlug: string;
  couponSlug: string;
  storeName: string;
  discountLabel: string;
}) {
  const [loaded, setLoaded] = useState(false);
  const imageSrc = `/store/${storeSlug}/coupon/${couponSlug}/coupon-image`;
  const alt = `صورة كوبون ${storeName} — خصم ${discountLabel} من كوبون نور`;

  return (
    <details
      className="group mt-12 overflow-hidden rounded-xl border border-border bg-surface shadow-sm"
      onToggle={(e) => {
        if ((e.target as HTMLDetailsElement).open) setLoaded(true);
      }}
    >
      <summary className="flex cursor-pointer list-none items-center justify-between gap-4 px-5 py-4 font-semibold text-primary transition-colors hover:text-accent md:px-6">
        عرض صورة الكوبون الكاملة
        <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-surface-alt text-ink-muted transition-transform duration-300 ease-out group-open:rotate-180">
          <ChevronDown className="h-4 w-4" />
        </span>
      </summary>
      <div className="border-t border-border bg-surface-alt/40 p-5 md:p-6">
        {loaded && (
          <img
            src={imageSrc}
            alt={alt}
            width={1200}
            height={630}
            loading="lazy"
            className="mx-auto w-full max-w-2xl rounded-lg border border-border"
          />
        )}
      </div>
    </details>
  );
}
