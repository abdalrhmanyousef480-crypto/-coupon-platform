import Link from "next/link";
import { Plus } from "lucide-react";
import { db } from "@/lib/db";
import { effectiveHubCouponSlug, storeHubPath } from "@/lib/store-hub";
import { currentAutoImagePath, isAwaitingAutoImage } from "@/lib/coupon-image";
import { StoreSearchList, type StoreListItem } from "@/components/admin/StoreSearchList";

const DAY = 86_400_000;

export default async function AdminStoresPage() {
  const [stores, coupons] = await Promise.all([
    db.store.findMany({
      orderBy: { createdAt: "desc" },
      select: { id: true, name: true, slug: true, logoUrl: true, isPublished: true, isFeatured: true, hubCouponSlug: true },
    }),
    db.coupon.findMany({
      orderBy: [{ isFeatured: "desc" }, { createdAt: "desc" }],
      select: {
        storeId: true, slug: true, code: true, type: true, isPublished: true, isFeatured: true, expiresAt: true,
        isVerified: true, manuallyVerifiedAt: true, cardImageUrl: true, autoImageUrl: true, autoImageCode: true,
        legacyImageSnapshotUrl: true,
      },
    }),
  ]);

  const now = Date.now();
  const byStore = new Map<string, typeof coupons>();
  for (const c of coupons) byStore.set(c.storeId, [...(byStore.get(c.storeId) ?? []), c]);

  const items: StoreListItem[] = stores.map((s) => {
    const all = byStore.get(s.id) ?? [];
    const published = all.filter((c) => c.isPublished);
    const active = published.filter((c) => !c.expiresAt || c.expiresAt.getTime() >= now);
    const hubCouponSlug = effectiveHubCouponSlug(s, published.map((c) => c.slug));
    const primary = (hubCouponSlug && active.find((c) => c.slug === hubCouponSlug))
      || active.find((c) => c.type === "CODE" && c.code?.trim()) || active[0];
    const expiringSoon = active.some((c) => c.expiresAt && c.expiresAt.getTime() - now <= 7 * DAY);
    const untested = active.some((c) => !(c.isVerified && c.manuallyVerifiedAt));
    const pendingImages = active.filter((c) => isAwaitingAutoImage(c)).length;
    const lastVerified = active.reduce<number | null>((max, c) => {
      const t = c.isVerified && c.manuallyVerifiedAt ? c.manuallyVerifiedAt.getTime() : null;
      return t && (!max || t > max) ? t : max;
    }, null);
    const image: StoreListItem["image"] = !primary || primary.type !== "CODE" || !primary.code?.trim() ? "none"
      : primary.cardImageUrl ? "manual"
      : currentAutoImagePath(primary) ? "auto"
      : isAwaitingAutoImage(primary) ? "pending"
      : "legacy";
    return {
      id: s.id,
      name: s.name,
      logoUrl: s.logoUrl,
      path: storeHubPath({ slug: s.slug, hubCouponSlug }),
      isPublished: s.isPublished,
      primaryCode: primary?.code?.trim() || null,
      activeCount: active.length,
      image,
      lastVerified: lastVerified ? new Date(lastVerified).toISOString() : null,
      expiringSoon,
      untested,
      pendingImages,
      noActiveCode: active.length === 0,
    };
  });

  const publishedStores = items.filter((s) => s.isPublished);
  const stats = {
    published: publishedStores.length,
    activeCodes: publishedStores.reduce((n, s) => n + s.activeCount, 0),
    attention: publishedStores.filter((s) => s.noActiveCode || s.expiringSoon || s.untested).length,
    pendingImages: items.reduce((n, s) => n + s.pendingImages, 0),
  };

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex flex-col gap-1">
          <h1 className="text-2xl font-extrabold text-ink sm:text-[28px]">المتاجر والأكواد</h1>
          <p className="text-[15px] text-ink-muted">كل متجر صفحة واحدة، وأكواده بداخلها</p>
        </div>
        <Link href="/admin/stores/new" className="inline-flex h-11 items-center gap-2 rounded-md bg-accent px-5 text-[15px] font-extrabold text-white hover:bg-accent-hover">
          <Plus className="h-4 w-4" /> متجر جديد
        </Link>
      </div>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <div className="card flex flex-col gap-1 p-4">
          <span className="text-sm text-ink-muted">متاجر منشورة</span>
          <span className="text-3xl font-extrabold text-ink">{stats.published}</span>
        </div>
        <div className="card flex flex-col gap-1 p-4">
          <span className="text-sm text-ink-muted">أكواد فعّالة</span>
          <span className="text-3xl font-extrabold text-ink">{stats.activeCodes}</span>
        </div>
        <div className={`card flex flex-col gap-1 p-4 ${stats.attention ? "border-warning/30 bg-warning-soft" : ""}`}>
          <span className="text-sm text-ink">تحتاج انتباهك</span>
          <span className="text-3xl font-extrabold text-ink">{stats.attention}</span>
          <span className="text-xs text-ink-muted">بدون كود، قرب الانتهاء، أو لم تُختبر</span>
        </div>
        <div className="card flex flex-col gap-1 p-4">
          <span className="text-sm text-ink-muted">صور قيد التوليد</span>
          <span className="text-3xl font-extrabold text-ink">{stats.pendingImages}</span>
        </div>
      </div>

      <StoreSearchList stores={items} />
    </div>
  );
}
