import Link from "next/link";
import { db } from "@/lib/db";
import { makeInstagramCouponCaption } from "@/lib/instagram-caption";
import { InstagramConnectionCheck } from "@/components/admin/InstagramConnectionCheck";

export const dynamic = "force-dynamic";

export default async function InstagramReviewPage() {
  const candidates = await db.coupon.findMany({
    where: {
      isPublished: true,
      type: "CODE",
      code: { not: null },
      store: { isPublished: true },
      OR: [{ expiresAt: null }, { expiresAt: { gt: new Date() } }],
    },
    include: { store: true },
    orderBy: [{ createdAt: "asc" }, { id: "asc" }],
    take: 150,
  });

  // One draft per merchant to make the first review visibly varied.
  const seenStores = new Set<string>();
  const coupons = candidates.filter((coupon) => {
    if (!coupon.code?.trim() || seenStores.has(coupon.storeId)) return false;
    seenStores.add(coupon.storeId);
    return true;
  }).slice(0, 3);

  return (
    <main className="space-y-6" dir="rtl">
      <div>
        <h1 className="text-2xl font-bold">مراجعة أول 3 منشورات إنستغرام</h1>
        <p className="mt-2 text-sm text-slate-600">
          تصميم خاص بإنستغرام مستمد من بيانات الكوبونات الحقيقية، دون نسبة الخصم داخل الصورة. هذه الصفحة لا تنشر شيئًا.
          النشر التلقائي سيظل معطلًا حتى إتمام الموافقة والربط الآمن مع Meta.
        </p>
      </div>
      <InstagramConnectionCheck />
      {coupons.length === 0 && <p>لا توجد كوبونات صالحة للمراجعة.</p>}
      <div className="grid gap-6 lg:grid-cols-3">
        {coupons.map((coupon, index) => {
          const draft = makeInstagramCouponCaption({
            storeName: coupon.store.name,
            storeSlug: coupon.store.slug,
            couponSlug: coupon.slug,
            code: coupon.code,
            discountLabel: coupon.discountLabel,
            titleAr: coupon.titleAr,
            termsAr: coupon.termsAr,
            isVerified: coupon.isVerified,
          });
          const image = `/store/${encodeURIComponent(coupon.store.slug)}/coupon/${encodeURIComponent(coupon.slug)}/instagram-preview`;
          return (
            <section key={coupon.id} className="overflow-hidden rounded-xl border bg-white">
              <div className="p-4">
                <h2 className="font-bold">المعاينة {index + 1}: {coupon.store.name}</h2>
                <p className="text-xs text-slate-500">للمراجعة فقط — غير منشور</p>
              </div>
              {/* Plain img intentionally displays the original server-rendered JPEG without optimization. */}
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={image} alt={draft.headline} width={1080} height={1350} className="h-auto w-full bg-white" />
              <div className="space-y-3 p-4">
                <h3 className="font-semibold">{draft.headline}</h3>
                <p className="whitespace-pre-line break-words text-sm leading-7">{draft.caption}</p>
                <Link className="text-sm underline" href={draft.couponUrl} target="_blank" rel="noopener noreferrer">صفحة الكوبون الأصلية</Link>
              </div>
            </section>
          );
        })}
      </div>
    </main>
  );
}
