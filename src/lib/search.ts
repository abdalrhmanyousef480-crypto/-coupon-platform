"use server";

// ============================================================
// بحث عام (Autocomplete) للصفحة الرئيسية — متاجر + كوبونات منشورة
// فقط، read-only بالكامل. Server Action مباشرة (بدون API route) عشان
// نستفيد من استدعاء الدالة مباشرة من مكوّن العميل بدون طبقة fetch إضافية.
// ============================================================
import { db } from "@/lib/db";

const MIN_QUERY_LENGTH = 2;
const CANDIDATE_LIMIT = 8;
const MAX_RESULTS = 8;

export type PublicSearchSuggestion = {
  type: "store" | "coupon";
  id: string;
  title: string;
  subtitle: string;
  href: string;
};

// أقوى تطابق بين الحقول المعطاة: بداية النص (0) قبل التطابق الجزئي (1) —
// عشان "بداية اسم المتجر" ترتّب قبل تطابق بمنتصف الكلمة.
function matchScore(term: string, fields: (string | null | undefined)[]): number {
  let best = Infinity;
  for (const field of fields) {
    if (!field) continue;
    const value = field.toLowerCase();
    if (value.startsWith(term)) return 0;
    if (value.includes(term)) best = Math.min(best, 1);
  }
  return best;
}

export async function searchSuggestions(rawQuery: string): Promise<PublicSearchSuggestion[]> {
  const term = rawQuery.trim().toLowerCase();
  if (term.length < MIN_QUERY_LENGTH) return [];

  const [stores, coupons] = await Promise.all([
    db.store.findMany({
      where: {
        isPublished: true,
        OR: [
          { name: { contains: term, mode: "insensitive" } },
          { slug: { contains: term, mode: "insensitive" } },
        ],
      },
      select: { id: true, name: true, slug: true },
      take: CANDIDATE_LIMIT,
    }),
    db.coupon.findMany({
      where: {
        isPublished: true,
        OR: [
          { titleAr: { contains: term, mode: "insensitive" } },
          { title: { contains: term, mode: "insensitive" } },
          { code: { contains: term, mode: "insensitive" } },
          { slug: { contains: term, mode: "insensitive" } },
          { store: { name: { contains: term, mode: "insensitive" } } },
          { store: { slug: { contains: term, mode: "insensitive" } } },
        ],
      },
      select: {
        id: true,
        titleAr: true,
        code: true,
        slug: true,
        store: { select: { name: true, slug: true } },
      },
      take: CANDIDATE_LIMIT,
    }),
  ]);

  const scoredStores = stores.map((store) => ({
    type: "store" as const,
    id: store.id,
    title: store.name,
    subtitle: "متجر",
    href: `/store/${store.slug}`,
    score: matchScore(term, [store.name, store.slug]),
  }));

  const scoredCoupons = coupons.map((coupon) => ({
    type: "coupon" as const,
    id: coupon.id,
    title: coupon.titleAr,
    subtitle: `كوبون — ${coupon.store.name}`,
    href: `/store/${coupon.store.slug}/coupon/${coupon.slug}`,
    score: matchScore(term, [coupon.titleAr, coupon.code, coupon.slug, coupon.store.name, coupon.store.slug]),
  }));

  return [...scoredStores, ...scoredCoupons]
    .sort((a, b) => a.score - b.score)
    .slice(0, MAX_RESULTS)
    .map(({ score: _score, ...suggestion }) => suggestion);
}
