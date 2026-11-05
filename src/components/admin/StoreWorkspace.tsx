"use client";

import { useState } from "react";
import Link from "next/link";
import { Eye, Plus } from "lucide-react";
import { StoreForm } from "@/components/admin/StoreForm";
import { StoreCodeCard } from "@/components/admin/StoreCodeCard";
import { StoreCodeEditor } from "@/components/admin/StoreCodeEditor";
import { StoreLogo } from "@/components/ui/StoreLogo";
import type { Coupon, Store } from "@prisma/client";

export interface ReadinessItem { ok: boolean; text: string }

interface StoreWorkspaceProps {
  store: Store & { categories: { categoryId: string }[] };
  categories: { id: string; nameAr: string }[];
  /** Active (published, not expired) codes, display order. */
  activeCoupons: Coupon[];
  /** Expired or unpublished codes. */
  inactiveCoupons: Coupon[];
  hubCoupons: { slug: string; titleAr: string; code: string | null; cardImageUrl: string | null; autoImageUrl: string | null; autoImageCode: string | null }[];
  hubCouponSlug: string | null;
  hubPath: string;
  pageImage: { url: string | null; caption: string } | null;
  readiness: ReadinessItem[];
  hasTips: boolean;
  siteUrl: string;
}

/**
 * One screen per store: the store's codes on the right (main column), store
 * details + advanced settings on the left. Mirrors the unified public page.
 */
export function StoreWorkspace(props: StoreWorkspaceProps) {
  const { store, activeCoupons, inactiveCoupons, hubCouponSlug, hubPath, pageImage, readiness, siteUrl } = props;
  const [editing, setEditing] = useState<string | null>(null); // "new" | coupon id
  const allCoupons = [...activeCoupons, ...inactiveCoupons];
  const editingCoupon = editing && editing !== "new" ? allCoupons.find((c) => c.id === editing) : undefined;
  const codeCount = activeCoupons.length;

  function openEditor(id: string) {
    setEditing(id);
    if (typeof window !== "undefined") window.scrollTo({ top: 0, behavior: "smooth" });
  }

  return (
    <div className="flex flex-col gap-6">
      {/* Top bar */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <nav aria-label="مسار الصفحة" className="flex items-center gap-2 text-sm text-ink-muted">
          <Link href="/admin/stores" className="hover:text-primary">المتاجر والأكواد</Link>
          <span aria-hidden="true">‹</span>
          <span className="font-bold text-ink">{store.name}</span>
        </nav>
        <div className="flex flex-wrap gap-2.5">
          <Link href={hubPath} target="_blank" className="inline-flex h-11 items-center gap-2 rounded-md border border-border-strong bg-surface px-4 text-[15px] font-bold text-primary hover:border-primary">
            <Eye className="h-4 w-4" /> معاينة الصفحة
          </Link>
          <button type="submit" form="store-form" className="inline-flex h-11 items-center rounded-md bg-accent px-5 text-[15px] font-extrabold text-white hover:bg-accent-hover">حفظ بيانات المتجر</button>
        </div>
      </div>

      {/* Store hero — same navy as the public page */}
      <section className="flex flex-wrap items-center gap-5 rounded-2xl bg-primary px-6 py-6 text-white sm:px-7">
        <StoreLogo name={store.name} logoUrl={store.logoUrl} size={76} className="h-[76px] w-[76px] shrink-0 rounded-xl bg-white" />
        <div className="flex min-w-0 flex-1 flex-col gap-1.5">
          <h1 className="text-2xl font-extrabold leading-snug sm:text-[28px]">{store.name}</h1>
          <a href={`${siteUrl}${hubPath}`} target="_blank" rel="noreferrer" dir="ltr" className="truncate text-end text-sm text-white/75 hover:text-white">
            {siteUrl.replace(/^https?:\/\//, "")}{hubPath}
          </a>
          <div className="mt-1.5 flex flex-wrap gap-2">
            <span className={`rounded-full px-3 py-1 text-[13px] font-bold ${store.isPublished ? "bg-success/25 text-white" : "bg-white/10 text-white/80"}`}>{store.isPublished ? "منشور" : "غير منشور"}</span>
            <span className="rounded-full bg-white/10 px-3 py-1 text-[13px] font-bold text-white/90">
              {codeCount === 0 ? "لا يوجد كود فعّال" : codeCount === 1 ? "كود فعّال واحد" : codeCount === 2 ? "كودان فعّالان" : `${codeCount} أكواد فعّالة`}
            </span>
            {store.isFeatured && <span className="rounded-full bg-white/10 px-3 py-1 text-[13px] font-bold text-white/90">مميز بالرئيسية</span>}
          </div>
        </div>
      </section>

      <div className="flex flex-col items-start gap-6 xl:flex-row">
        {/* Codes */}
        <section aria-labelledby="codes-h" className="flex w-full min-w-0 flex-1 flex-col gap-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex flex-wrap items-baseline gap-2.5">
              <h2 id="codes-h" className="text-xl font-extrabold text-ink">الأكواد</h2>
              <span className="text-sm text-ink-muted">تظهر كلها في صفحة المتجر بنفس الترتيب</span>
            </div>
            <button type="button" onClick={() => openEditor("new")}
              className="inline-flex h-11 items-center gap-2 rounded-md bg-primary px-4 text-[15px] font-extrabold text-white hover:bg-primary-hover">
              <Plus className="h-4 w-4" /> إضافة كود
            </button>
          </div>

          {editing && (
            <StoreCodeEditor
              key={editing}
              store={store}
              coupon={editingCoupon}
              usedSlugs={allCoupons.map((c) => c.slug)}
              onClose={() => setEditing(null)}
            />
          )}

          {activeCoupons.length === 0 && !editing && (
            <div className="card flex flex-col items-center gap-3 p-8 text-center">
              <p className="font-bold text-ink">لا يوجد كود فعّال لهذا المتجر</p>
              <p className="text-sm text-ink-muted">أضف كودًا ليظهر في صفحة المتجر.</p>
            </div>
          )}

          {activeCoupons.map((c, i) => (
            <StoreCodeCard key={c.id} store={store} coupon={c} isHub={c.slug === hubCouponSlug}
              canPromote={hubCouponSlug ? c.slug !== hubCouponSlug : i > 0} onEdit={() => openEditor(c.id)} />
          ))}

          {inactiveCoupons.length > 0 && (
            <details className="card p-4 sm:p-5">
              <summary className="cursor-pointer text-[15px] font-extrabold text-ink-muted">
                أكواد منتهية أو موقوفة ({inactiveCoupons.length}) — مخفية من الموقع
              </summary>
              <p className="mt-3 text-sm leading-7 text-ink-muted">عند انتهاء كود، الأفضل تعديله ووضع الكود الجديد بدل إضافة كود جديد — تتولد صورته الجديدة تلقائيًا.</p>
              <div className="mt-3 flex flex-col gap-3">
                {inactiveCoupons.map((c) => (
                  <StoreCodeCard key={c.id} store={store} coupon={c} isHub={false} onEdit={() => openEditor(c.id)} />
                ))}
              </div>
            </details>
          )}
        </section>

        {/* Side column */}
        <aside className="flex w-full flex-col gap-4 xl:w-[380px] xl:shrink-0">
          <section className="card p-5">
            <h2 className="mb-3 text-lg font-extrabold text-ink">جاهزية الصفحة</h2>
            <ul className="flex flex-col gap-2.5 text-sm">
              {readiness.map((item, i) => (
                <li key={i} className="flex items-start gap-2.5">
                  <span aria-hidden="true" className={`mt-0.5 flex h-[22px] w-[22px] shrink-0 items-center justify-center rounded-full text-xs font-extrabold ${item.ok ? "bg-success-soft text-success" : "bg-warning-soft text-warning"}`}>{item.ok ? "✓" : "!"}</span>
                  <span className="leading-6 text-ink">{item.text}</span>
                </li>
              ))}
            </ul>
          </section>

          <section className="card p-5">
            <div className="mb-3 flex items-center justify-between gap-2">
              <h2 className="text-lg font-extrabold text-ink">صورة الصفحة</h2>
              <span className="text-xs font-bold text-ink-muted">صورة واحدة في الصفحة وجوجل</span>
            </div>
            <div className="flex items-center gap-3.5">
              {pageImage?.url ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={pageImage.url} alt="" loading="lazy" className="h-[88px] w-[88px] shrink-0 rounded-lg border border-border object-contain" />
              ) : (
                <span className="flex h-[88px] w-[88px] shrink-0 items-center justify-center rounded-lg border border-dashed border-border-strong bg-surface-alt text-xs font-bold text-ink-muted">{pageImage ? "قيد التوليد" : "لا توجد"}</span>
              )}
              <p className="text-sm leading-7 text-ink-muted">{pageImage?.caption ?? "تظهر صورة عند إضافة كود فعّال."} تتغيّر من «إعدادات متقدمة» فقط عند الحاجة.</p>
            </div>
          </section>

          <StoreForm key={`${store.updatedAt.toString()}-${store.hubCouponSlug ?? ""}-${store.hubImageSource ?? ""}`} categories={props.categories} store={store} hubCoupons={props.hubCoupons} hasTips={props.hasTips} />
        </aside>
      </div>
    </div>
  );
}
