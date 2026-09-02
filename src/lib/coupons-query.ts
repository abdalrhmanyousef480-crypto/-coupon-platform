// ============================================================
// منطق جلب الكوبونات العام (صفحة /coupons) — مشترك بين الـ Server
// Component (أول عرض للصفحة) والـ Server Actions (بحث حي + تحميل المزيد)،
// عشان يبقى نفس منطق الفلترة/الترتيب بمكان واحد وما يتكرر.
// ============================================================
import type { Prisma } from "@prisma/client";

// عدد الكوبونات بأول تحميل، وكل ضغطة "عرض المزيد" — 6 (مو 5) عشان تتوزع
// بالتساوي على أعمدة الشبكة (عمودين أو 3 أعمدة) بدون كارت يتيم بآخر صف.
export const COUPONS_PAGE_SIZE = 6;

// كابح أمان لنتائج البحث — البحث بيرجّع كل النتائج المطابقة دفعة وحدة
// (بدون تحميل تدريجي)، بس بحد أقصى معقول عشان لو الكتالوج كبر كتير
// مستقبلًا ما يصير عندنا query ضخم غير محدود. أي عدد كوبونات واقعي
// اليوم برجع كامل ضمن هذا الحد براحة.
export const SEARCH_RESULT_LIMIT = 60;

// نفس ترتيب الأولوية اللي كان موجود بالصفحة أصلًا (مميز أولًا، ثم الأحدث)
// + id كفاصل تعادل ثابت، ضروري عشان skip/take (تحميل المزيد) ما يكرر
// أو يتخطى كوبون لو فيه أكتر من كوبون بنفس createdAt بالضبط.
export const COUPON_PRIORITY_ORDER: Prisma.CouponOrderByWithRelationInput[] = [
  { isFeatured: "desc" },
  { createdAt: "desc" },
  { id: "desc" },
];

export const COUPON_INCLUDE = { store: true } as const;

export type PublicCouponWithStore = Prisma.CouponGetPayload<{ include: typeof COUPON_INCLUDE }>;

/** يبني شرط where لكوبونات منشورة، مع بحث اختياري بالعنوان/الوصف/الكود/اسم
 *  المتجر (الاسم العربي مدمج بحقل name أصلًا، راجع Store بالـ schema). */
export function couponsWhere(query?: string): Prisma.CouponWhereInput {
  const base: Prisma.CouponWhereInput = { isPublished: true };
  const term = query?.trim();
  if (!term) return base;

  return {
    ...base,
    OR: [
      { titleAr: { contains: term, mode: "insensitive" } },
      { title: { contains: term, mode: "insensitive" } },
      { descriptionAr: { contains: term, mode: "insensitive" } },
      { description: { contains: term, mode: "insensitive" } },
      { code: { contains: term, mode: "insensitive" } },
      { store: { name: { contains: term, mode: "insensitive" } } },
    ],
  };
}
