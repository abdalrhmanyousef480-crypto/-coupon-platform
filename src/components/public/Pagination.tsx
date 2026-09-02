import Link from "next/link";
import { ChevronRight, ChevronLeft } from "lucide-react";

interface PaginationProps {
  page: number;
  totalPages: number;
  /** يبني رابط صفحة معيّنة، محافظًا على أي query params أخرى (زي بحث q) */
  buildHref: (page: number) => string;
  locale: "ar" | "en";
}

/** ترقيم صفحات بسيط (السابق/التالي + "صفحة X من Y") — Server Component
 *  بالكامل (روابط <Link> عادية، بدون أي JS إضافي على العميل). */
export function Pagination({ page, totalPages, buildHref, locale }: PaginationProps) {
  if (totalPages <= 1) return null;

  const hasPrev = page > 1;
  const hasNext = page < totalPages;
  // بالعربي (RTL) "السابق" بصريًا لليمين و"التالي" لليسار — الأيقونات معكوسة عمدًا
  const PrevIcon = locale === "ar" ? ChevronRight : ChevronLeft;
  const NextIcon = locale === "ar" ? ChevronLeft : ChevronRight;

  return (
    <nav aria-label={locale === "ar" ? "ترقيم الصفحات" : "Pagination"} className="mt-10 flex items-center justify-center gap-3">
      {hasPrev ? (
        <Link href={buildHref(page - 1)} className="btn-outline btn-sm flex items-center gap-1.5">
          <PrevIcon className="h-4 w-4" /> {locale === "ar" ? "السابق" : "Previous"}
        </Link>
      ) : (
        <span className="btn-outline btn-sm flex cursor-not-allowed items-center gap-1.5 opacity-40">
          <PrevIcon className="h-4 w-4" /> {locale === "ar" ? "السابق" : "Previous"}
        </span>
      )}

      <span className="text-sm text-ink-muted">
        {locale === "ar" ? `صفحة ${page} من ${totalPages}` : `Page ${page} of ${totalPages}`}
      </span>

      {hasNext ? (
        <Link href={buildHref(page + 1)} className="btn-outline btn-sm flex items-center gap-1.5">
          {locale === "ar" ? "التالي" : "Next"} <NextIcon className="h-4 w-4" />
        </Link>
      ) : (
        <span className="btn-outline btn-sm flex cursor-not-allowed items-center gap-1.5 opacity-40">
          {locale === "ar" ? "التالي" : "Next"} <NextIcon className="h-4 w-4" />
        </span>
      )}
    </nav>
  );
}
