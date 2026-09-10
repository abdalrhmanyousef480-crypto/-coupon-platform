import Link from "next/link";
import { ShieldCheck, Clock, ArrowLeft } from "lucide-react";
import { CouponCode } from "@/components/public/CouponCode";
import { formatDate } from "@/lib/utils";
import { isExpired } from "@/lib/seo";

/** بطاقة كوبون خفيفة داخل الدليل — مش نسخة من CouponCard (بلا نسخ/زر
 *  استخدام تفاعلي هون)، بس عرض + رابط واضح لصفحة الكوبون الحقيقية،
 *  حيث تفاصيل الاستخدام والشروط الكاملة. الكود والحالة وتاريخ آخر
 *  تحقق كلها من بيانات قاعدة البيانات الحيّة، بدون أي قيمة ثابتة هون. */
export function GuideCouponCTA({
  intro, coupon, store, locale,
}: {
  intro: string;
  coupon: {
    slug: string; titleAr: string; code: string | null; discountLabel: string;
    isVerified: boolean; lastCheckedAt: Date; expiresAt: Date | null;
  };
  store: { slug: string; name: string };
  locale: "ar" | "en";
}) {
  const expired = isExpired(coupon.expiresAt);
  const href = `/store/${store.slug}/coupon/${coupon.slug}`;

  return (
    <div className="overflow-hidden rounded-xl border border-accent/30 bg-surface shadow-sm">
      <div className="border-b border-border bg-surface-alt/60 px-5 py-3.5 text-[13.5px] text-ink-muted">{intro}</div>

      <div className="flex flex-col gap-4 p-5 md:flex-row md:items-center md:justify-between">
        <div className="min-w-0">
          <div className="mb-1.5 flex flex-wrap items-center gap-2">
            {coupon.isVerified && (
              <span className="badge-success">
                <ShieldCheck className="h-3 w-3" /> {locale === "ar" ? "تم التحقق" : "Verified"}
              </span>
            )}
            {expired && (
              <span className="badge-danger">{locale === "ar" ? "منتهي" : "Expired"}</span>
            )}
          </div>
          <p className="truncate text-[15px] font-bold text-primary">{coupon.titleAr}</p>
          <p className="mt-1 flex items-center gap-1.5 text-xs text-ink-faint">
            <Clock className="h-3 w-3" />
            {locale === "ar" ? `آخر تحقق: ${formatDate(coupon.lastCheckedAt, locale)}` : `Last verified: ${formatDate(coupon.lastCheckedAt, locale)}`}
          </p>
        </div>

        {coupon.code && (
          <div className="w-full shrink-0 rounded-lg border border-dashed border-border-strong bg-surface-alt/60 px-5 py-3 md:w-auto">
            <CouponCode code={coupon.code} />
          </div>
        )}
      </div>

      <Link
        href={href}
        className="flex items-center justify-center gap-2 bg-primary py-3.5 text-sm font-bold text-white transition-colors hover:bg-primary-hover"
      >
        {locale === "ar" ? "التفاصيل الكاملة وطريقة الاستخدام" : "Full details & how to use"}
        <ArrowLeft className="h-4 w-4" />
      </Link>
    </div>
  );
}
