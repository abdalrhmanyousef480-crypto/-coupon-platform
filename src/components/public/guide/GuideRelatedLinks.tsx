import Link from "next/link";
import { Store, Tag, ArrowLeft } from "lucide-react";

/** كتلة الربط الداخلي الختامية للدليل — دائمًا رابط لصفحة المتجر
 *  ورابط لصفحة الكوبون (الاتجاه: دليل → متجر → كوبون)، بـ anchor text
 *  مختلف عن بعضه ومختلف عن باقي روابط الصفحة. */
export function GuideRelatedLinks({
  storeName, storeHref, couponHref, locale,
}: {
  storeName: string;
  storeHref: string;
  couponHref: string;
  locale: "ar" | "en";
}) {
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
      <Link href={storeHref} className="card card-hover group flex items-center gap-3 p-5">
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/[0.06] text-primary">
          <Store className="h-[18px] w-[18px]" />
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-xs text-ink-muted">{locale === "ar" ? "كل كوبونات المتجر" : "All store coupons"}</p>
          <p className="truncate text-sm font-bold text-primary">
            {locale === "ar" ? `صفحة متجر ${storeName}` : `${storeName} store page`}
          </p>
        </div>
        <ArrowLeft className="h-4 w-4 shrink-0 text-ink-faint transition-transform duration-200 group-hover:-translate-x-0.5" />
      </Link>

      <Link href={couponHref} className="card card-hover group flex items-center gap-3 border-accent/30 p-5">
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-accent-soft text-accent">
          <Tag className="h-[18px] w-[18px]" />
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-xs text-ink-muted">{locale === "ar" ? "احصل على الخصم الآن" : "Get the discount now"}</p>
          <p className="truncate text-sm font-bold text-primary">
            {locale === "ar" ? `كود خصم ${storeName}` : `${storeName} discount code`}
          </p>
        </div>
        <ArrowLeft className="h-4 w-4 shrink-0 text-ink-faint transition-transform duration-200 group-hover:-translate-x-0.5" />
      </Link>
    </div>
  );
}
