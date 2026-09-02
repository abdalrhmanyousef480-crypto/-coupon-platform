"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { Search, X, Loader2, SearchX } from "lucide-react";
import { CouponCard } from "@/components/public/CouponCard";
import { fetchCoupons, searchCoupons } from "@/lib/actions-coupons-public";
import { getTranslator } from "@/lib/i18n";
import type { PublicCouponWithStore } from "@/lib/coupons-query";

type Locale = "ar" | "en";

// بندي البحث الحي ديباونس عشان ما نطلق طلب سيرفر بكل ضغطة زر —
// كافي يخلي البحث "حي" بحس المستخدم بدون تحميل زائد على السيرفر.
const SEARCH_DEBOUNCE_MS = 350;

interface CouponsExplorerProps {
  initialCoupons: PublicCouponWithStore[];
  initialQuery: string;
  initialHasMore: boolean;
  locale: Locale;
}

/** الجزء التفاعلي بصفحة /coupons: مربع بحث حي + شبكة الكروت + "عرض
 *  المزيد" — كله بدون أي إعادة تحميل للصفحة (Server Actions فقط).
 *  أول دفعة كوبونات (أو كل نتائج بحث ?q= لو الزائر إجى من هوم بيج) بتوصل
 *  جاهزة من السيرفر (Server Component بالأب)، وأي تفاعل بعد هيك
 *  (بحث/تحميل المزيد) بيصير بالكامل هون. */
export function CouponsExplorer({ initialCoupons, initialQuery, initialHasMore, locale }: CouponsExplorerProps) {
  const t = getTranslator(locale);
  const [query, setQuery] = useState(initialQuery);
  const [coupons, setCoupons] = useState(initialCoupons);
  const [hasMore, setHasMore] = useState(initialHasMore);
  const [isSearching, startSearchTransition] = useTransition();
  const [isLoadingMore, startLoadMoreTransition] = useTransition();
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
          const { coupons: fresh, hasMore: freshHasMore } = await fetchCoupons(0);
          setCoupons(fresh);
          setHasMore(freshHasMore);
          return;
        }
        const results = await searchCoupons(term);
        setCoupons(results);
        setHasMore(false);
      });
    }, SEARCH_DEBOUNCE_MS);
    return () => clearTimeout(timeout);
  }, [query]);

  function handleLoadMore() {
    startLoadMoreTransition(async () => {
      const { coupons: more, hasMore: nextHasMore } = await fetchCoupons(coupons.length);
      setCoupons((prev) => [...prev, ...more]);
      setHasMore(nextHasMore);
    });
  }

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

          {!isSearchMode && (
            hasMore ? (
              <div className="mt-8 flex justify-center">
                <button type="button" onClick={handleLoadMore} disabled={isLoadingMore} className="btn-outline btn-lg">
                  {isLoadingMore ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      {locale === "ar" ? "جارٍ التحميل..." : "Loading..."}
                    </>
                  ) : locale === "ar" ? "عرض المزيد من الكوبونات" : "Show More Coupons"}
                </button>
              </div>
            ) : (
              <p className="mt-8 text-center text-sm text-ink-faint">
                {locale === "ar" ? "تم عرض جميع الكوبونات" : "All coupons shown"}
              </p>
            )
          )}
        </>
      )}
    </div>
  );
}
