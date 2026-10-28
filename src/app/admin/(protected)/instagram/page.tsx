import Link from "next/link";
import { db } from "@/lib/db";
import { makeInstagramCouponCaption } from "@/lib/instagram-caption";

export const dynamic = "force-dynamic";

export default async function InstagramReviewPage() {
  const coupons = await db.coupon.findMany({
    where: {
      isPublished: true,
      store: { isPublished: true },
      OR: [{ expiresAt: null }, { expiresAt: { gt: new Date() } }],
    },
    include: { store: true },
    orderBy: [{ createdAt: "asc" }, { id: "asc" }],
    take: 3,
  });

  return (
    <main className="space-y-6" dir="rtl">
      <div>
        <h1 className="text-2xl font-bold">مراجعة أول 3 منشورات إنستغرام</h1>
        <p className="mt-2 text-sm text-slate-600">
          معاينات من صور الكوبونات الأصلية في الموقع. هذه الصفحة لا تنشر شيئًا على إنستغرام.
          النشر التلقائي سيظل معطلًا حتى إتمام الموافقة والربط الآمن مع Meta.
        </p>
      </div>
      {coupons.length === 0 && <p>لا توجد كوبونات منشورة وصالحة للمعاينة.</p>}
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
