import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { SITE_URL, COUPON_IMAGE_VERSION } from "@/lib/seo";
import { effectiveHubCouponSlug, pickHubImage, storeHubPath, storePrefersCouponImage } from "@/lib/store-hub";
import { couponImageSrc, isAwaitingAutoImage } from "@/lib/coupon-image";
import { storeTipsBySlug } from "@/lib/store-tips";
import { StoreWorkspace, type ReadinessItem } from "@/components/admin/StoreWorkspace";

export default async function EditStorePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [store, categories, coupons] = await Promise.all([
    db.store.findUnique({ where: { id }, include: { categories: { select: { categoryId: true } } } }),
    db.category.findMany({ orderBy: { nameAr: "asc" }, select: { id: true, nameAr: true } }),
    db.coupon.findMany({ where: { storeId: id }, orderBy: [{ isFeatured: "desc" }, { createdAt: "desc" }] }),
  ]);
  if (!store) notFound();

  const now = new Date();
  const isActive = (c: (typeof coupons)[number]) => c.isPublished && (!c.expiresAt || c.expiresAt >= now);
  const published = coupons.filter((c) => c.isPublished);
  const hubCouponSlug = effectiveHubCouponSlug(store, published.map((c) => c.slug));
  const hubPath = storeHubPath({ slug: store.slug, hubCouponSlug });

  // Active codes in public-page order: the hub coupon first, then featured, newest.
  const active = coupons.filter(isActive).sort((a, b) =>
    Number(b.slug === hubCouponSlug) - Number(a.slug === hubCouponSlug)
    || Number(b.isFeatured) - Number(a.isFeatured)
    || b.createdAt.getTime() - a.createdAt.getTime());
  const inactive = coupons.filter((c) => !isActive(c));

  // The single page image, same rule as the public page (StoreHubView.hubImages).
  const primary = active[0];
  const pick = pickHubImage({
    source: store.hubImageSource,
    hubCouponSlug,
    hasActiveCode: active.some((c) => c.type === "CODE" && Boolean(c.code?.trim())),
    preferCoupon: storePrefersCouponImage(store, primary),
    activeCouponSlugs: active.map((c) => c.slug),
    primarySlug: primary?.slug ?? null,
  });
  const picked = pick?.kind === "coupon" ? active.find((c) => c.slug === pick.slug) : undefined;
  const pageImage = !pick ? null
    : pick.kind === "store"
      ? { url: store.cardImageUrl || `/store/${store.slug}/card-image?v=2`, caption: "صورة المتجر." }
      : picked
        ? { url: couponImageSrc(store.slug, picked, { version: COUPON_IMAGE_VERSION }), caption: `صورة الكود ${picked.code ?? ""}.` }
        : null;

  const untested = active.filter((c) => !(c.isVerified && c.manuallyVerifiedAt));
  const pending = active.filter((c) => isAwaitingAutoImage(c));
  const readiness: ReadinessItem[] = [
    { ok: active.length > 0, text: active.length > 0 ? "كود فعّال واحد على الأقل" : "لا يوجد كود فعّال — الصفحة بدون خصم" },
    { ok: Boolean(pageImage?.url), text: pageImage?.url ? "صورة الصفحة جاهزة" : pending.length ? "صورة الصفحة قيد التوليد (دقائق)" : "لا توجد صورة للصفحة" },
    { ok: store.descriptionAr.trim().length >= 40, text: store.descriptionAr.trim().length >= 40 ? "نص «عن المتجر» مكتوب" : "نص «عن المتجر» قصير — أضف تفاصيل" },
    { ok: Boolean(primary?.descriptionAr?.trim()), text: primary?.descriptionAr?.trim() ? "وصف أعلى الصفحة موجود (من الكود الرئيسي)" : "لا يوجد وصف أعلى الصفحة" },
    ...(untested.length
      ? [{ ok: false, text: `لم يُختبر بعد: ${untested.map((c) => c.code || c.titleAr).join("، ")}` }]
      : active.length ? [{ ok: true, text: "كل الأكواد الفعّالة مُختبرة" }] : []),
    ...(store.isPublished ? [] : [{ ok: false, text: "المتجر غير منشور — لا يظهر على الموقع" }]),
  ];

  return (
    <StoreWorkspace
      store={store}
      categories={categories}
      activeCoupons={active}
      inactiveCoupons={inactive}
      hubCoupons={published.map((c) => ({ slug: c.slug, titleAr: c.titleAr, code: c.code, cardImageUrl: c.cardImageUrl, autoImageUrl: c.autoImageUrl, autoImageCode: c.autoImageCode }))}
      hubCouponSlug={hubCouponSlug}
      hubPath={hubPath}
      pageImage={pageImage}
      readiness={readiness}
      hasTips={Boolean(storeTipsBySlug[store.slug])}
      siteUrl={SITE_URL}
    />
  );
}
