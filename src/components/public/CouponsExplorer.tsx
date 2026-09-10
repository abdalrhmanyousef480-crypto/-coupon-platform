"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import Link from "next/link";
import { Search, X, Loader2, SearchX, ChevronRight, ChevronLeft } from "lucide-react";
import { CouponCard } from "@/components/public/CouponCard";
import { searchCoupons } from "@/lib/actions-coupons-public";
import { getTranslator } from "@/lib/i18n";
import type { PublicCouponWithStore } from "@/lib/coupons-query";

type Locale = "ar" | "en";

// بندي البحث الحي ديباونس عشان ما نطلق طلب سيرفر بكل ضغطة زر —
// كافي يخلي البحث "حي" بحس المستخدم بدون تحميل زائد على السيرفر.
const SEARCH_DEBOUNCE_MS = 350;

interface CouponsExplorerProps {
  initialCoupons: PublicCouponWithStore[];
  initialQuery: string;
  locale: Locale;
  /** رقم الصفحة الحالية (تصفح عادي بدون بحث) — 1 وقت وضع البحث. */
  page: number;
  /** إجمالي عدد الصفحات المتاحة — 1 وقت وضع البحث. */
  totalPages: number;
}

function pageHref(page: number) {
  return page <= 1 ? "/coupons" : `/coupons?page=${page}`;
}

/** الجزء التفاعلي بصفحة /coupons: مربع بحث حي + شبكة الكروت.
 *  أول دفعة كوبونات (صفحة `page` الحالية من السيرفر، أو كل نتائج بحث
 *  ?q= لو الزائر إجى من هوم بيج) بتوصل جاهزة من السيرفر (Server
 *  Component بالأب)، والبحث الحي فقط هو اللي بيصير بالكامل هون.
 *  التنقّل بين الصفحات (page=1, page=2, ...) روابط <Link> حقيقية —
 *  كل صفحة رابط مستقل قابل للزحف والفهرسة بدل تحميل تدريجي عبر JS
 *  بلا رابط خاص فيه (كان النمط القديم "عرض المزيد"). */
export function CouponsExplorer({ initialCoupons, initialQuery, locale, page, totalPages }: CouponsExplorerProps) {
  const t = getTranslator(locale);
  const [query, setQuery] = useState(initialQuery);
  const [coupons, setCoupons] = useState(initialCoupons);
  const [isSearching, startSearchTransition] = useTransition();
  const mountedRef = useRef(false);

  // بحث حي بديباونس — يتجاهل أول render (البيانات الأولية خلاص جاية
  // من السيرفر، ما فيه داعي نطلبها من جديد).
  useEffect(() => {
    if (!mountedRef.current) {
      mountedRef.current = true;
      return;
    }
    const term = query.trim();
    const timeout = setTimeout(() => {
      startSearchTransition(async () => {
        if (!term) {
          // رجوع لنفس دفعة هذه الصفحة الأصلية اللي جاية من السيرفر —
          // بدون أي طلب إضافي، ومطابقة لعنوان /coupons الحالي بالضبط.
          setCoupons(initialCoupons);
          return;
        }
        const results = await searchCoupons(term);
        setCoupons(results);
      });
    }, SEARCH_DEBOUNCE_MS);
    return () => clearTimeout(timeout);
  }, [query, initialCoupons]);

  const isSearchMode = query.trim().length > 0;

  return (
    <div>
      <div className="mx-auto mb-8 max-w-xl">
        <div className="flex items-center gap-2.5 rounded-full border-2 border-border-strong bg-surface py-2.5 ps-5 pe-3 shadow-sm transition-all duration-300 focus-within:border-accent/40 focus-within:shadow-md">
          <Search className="h-[18px] w-[18px] shrink-0 text-ink-faint" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            type="text"
            inputMode="search"
            placeholder={t("search.placeholder")}
            aria-label={t("search.placeholder")}
            className="min-w-0 flex-1 border-none bg-transparent text-[15px] text-ink outline-none placeholder:text-ink-faint"
          />
          {isSearching ? (
            <Loader2 className="h-4 w-4 shrink-0 animate-spin text-ink-faint" />
          ) : query ? (
            <button
              type="button"
              onClick={() => setQuery("")}
              aria-label={locale === "ar" ? "مسح البحث" : "Clear search"}
              className="shrink-0 rounded-full p-1 text-ink-faint transition-colors hover:bg-surface-alt hover:text-ink"
            >
              <X className="h-4 w-4" />
            </button>
          ) : null}
        </div>
      </div>

      {coupons.length === 0 ? (
        <div className="flex flex-col items-center gap-3 rounded-lg border border-dashed border-border bg-surface-alt/60 py-16 text-center text-ink-muted">
          <SearchX className="h-8 w-8 text-ink-faint" />
          <p>{locale === "ar" ? "لم يتم العثور على كوبونات مطابقة" : "No matching coupons found"}</p>
        </div>
      ) : (
        <>
          {isSearchMode && !isSearching && (
            <p className="mb-4 text-sm text-ink-muted">
              {locale === "ar" ? `${coupons.length} نتيجة بحث` : `${coupons.length} results`}
            </p>
          )}

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 sm:gap-5 md:grid-cols-3">
            {coupons.map((coupon) => (
              <div key={coupon.id} className="animate-coupon-reveal">
                <CouponCard coupon={coupon} store={coupon.store} locale={locale} />
              </div>
            ))}
          </div>
        </>
      )}

      {/* ترقيم صفحات حقيقي (روابط <Link> فعلية بالـ HTML، مش زر "تحميل
          المزيد" عبر JS) — عشان جوجل يقدر يكتشف كل الكوبونات بكل صفحة
          بدون تنفيذ JavaScript. نخفيه وقت البحث الحي بس (مش ذي صلة
          لنتائج البحث)، بدون ما نشيله من الـ HTML الأصلي لصفحة التصفح
          العادية. */}
      {totalPages > 1 && (
        <nav
          aria-label={locale === "ar" ? "ترقيم صفحات الكوبونات" : "Coupons pagination"}
          className={`mt-10 flex items-center justify-center gap-3 ${isSearchMode ? "hidden" : ""}`}
        >
          {page > 1 ? (
            <Link href={pageHref(page - 1)} rel="prev" className="btn-outline btn-lg">
              {locale === "ar" ? (
                <>
                  السابق <ChevronRight className="h-4 w-4" />
                </>
              ) : (
                <>
                  <ChevronLeft className="h-4 w-4" /> Previous
                </>
              )}
            </Link>
          ) : (
            <span className="btn-outline btn-lg pointer-events-none opacity-40" aria-hidden="true">
              {locale === "ar" ? (
                <>
                  السابق <ChevronRight className="h-4 w-4" />
                </>
              ) : (
                <>
                  <ChevronLeft className="h-4 w-4" /> Previous
                </>
              )}
            </span>
          )}

          <span className="text-sm font-semibold text-ink-muted">
            {locale === "ar" ? `صفحة ${page} من ${totalPages}` : `Page ${page} of ${totalPages}`}
          </span>

          {page < totalPages ? (
            <Link href={pageHref(page + 1)} rel="next" className="btn-outline btn-lg">
              {locale === "ar" ? (
                <>
                  <ChevronLeft className="h-4 w-4" /> التالي
                </>
              ) : (
                <>
                  Next <ChevronRight className="h-4 w-4" />
                </>
              )}
            </Link>
          ) : (
            <span className="btn-outline btn-lg pointer-events-none opacity-40" aria-hidden="true">
              {locale === "ar" ? (
                <>
                  <ChevronLeft className="h-4 w-4" /> التالي
                </>
              ) : (
                <>
                  Next <ChevronRight className="h-4 w-4" />
                </>
              )}
            </span>
          )}
        </nav>
      )}
    </div>
  );
}
