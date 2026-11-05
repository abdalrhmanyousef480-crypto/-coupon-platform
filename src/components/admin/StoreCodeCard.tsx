"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { regenerateCouponImage } from "@/lib/actions-coupon";
import Link from "next/link";
import { Check, Copy, MoreHorizontal, Star, Eye, EyeOff, Trash2, ShieldX, Clock } from "lucide-react";
import { toast } from "sonner";
import { useCouponActions } from "@/components/admin/CouponRow";
import { couponHubHref } from "@/lib/store-hub";
import { couponImageSrc, currentAutoImagePath, isAwaitingAutoImage } from "@/lib/coupon-image";
import { expiryLabel, formatDate, isExpiringSoon } from "@/lib/utils";
import type { Coupon, Store } from "@prisma/client";

type ImageState = { kind: "manual" | "auto" | "pending" | "legacy" | "none"; url: string | null; label: string };

export function codeImageState(store: Pick<Store, "slug">, coupon: Coupon): ImageState {
  if (coupon.type !== "CODE" || !coupon.code?.trim()) return { kind: "none", url: null, label: "عرض بدون صورة" };
  if (coupon.cardImageUrl) return { kind: "manual", url: coupon.cardImageUrl, label: "صورة يدوية" };
  if (currentAutoImagePath(coupon)) return { kind: "auto", url: couponImageSrc(store.slug, coupon, { version: 3 }), label: "صورة تلقائية جاهزة" };
  if (isAwaitingAutoImage(coupon)) return { kind: "pending", url: null, label: "جاري التوليد" };
  return { kind: "legacy", url: couponImageSrc(store.slug, coupon, { version: 3 }), label: "صورة تاريخية" };
}

export function shortDiscount(label: string) {
  const t = label.trim();
  return /\d/.test(t) ? `خصم ${t.replace(/^خصم\s*/, "")}` : t;
}

const imageBadge: Record<ImageState["kind"], string> = {
  manual: "badge-neutral",
  auto: "badge-success",
  pending: "badge-warning",
  legacy: "badge-neutral",
  none: "badge-neutral",
};

export function StoreCodeCard({ store, coupon, isHub, onEdit }: {
  store: Store;
  coupon: Coupon;
  /** This coupon's URL hosts the store page. */
  isHub: boolean;
  onEdit: () => void;
}) {
  const actions = useCouponActions({ ...coupon, store });
  const [menuOpen, setMenuOpen] = useState(false);
  const [regenerating, startRegenerate] = useTransition();
  const router = useRouter();

  function regenerate() {
    if (!window.confirm("إنشاء صورة جديدة بالكود الحالي؟ تستبدل الصورة القديمة في الصفحة (الصورة القديمة تبقى محفوظة برابطها).")) return;
    startRegenerate(async () => {
      const result = await regenerateCouponImage(coupon.id);
      if (result.success) { toast.success("تم إنشاء الصورة الجديدة"); router.refresh(); }
      else toast.error(result.error);
    });
  }
  const image = codeImageState(store, coupon);
  const verified = coupon.isVerified && coupon.manuallyVerifiedAt;
  const soon = isExpiringSoon(coupon.expiresAt, 7);

  async function copyCode() {
    if (!coupon.code) return;
    try { await navigator.clipboard.writeText(coupon.code); toast.success("تم نسخ الكود"); } catch { /* clipboard blocked */ }
  }

  return (
    <article className={`card flex flex-col gap-5 rounded-xl p-5 sm:flex-row ${coupon.isPublished ? "" : "opacity-70"}`}>
      <div className="flex min-w-0 flex-1 flex-col gap-3.5">
        <div className="flex flex-wrap items-center gap-2">
          {isHub && <span className="badge-neutral font-extrabold text-primary">الكود الرئيسي · يستضيف الصفحة</span>}
          {!isHub && coupon.isFeatured && <span className="badge-neutral font-extrabold text-primary">الكود الرئيسي</span>}
          {coupon.discountLabel && <span className="badge-accent font-extrabold">{shortDiscount(coupon.discountLabel)}</span>}
          {!coupon.isPublished && <span className="badge-neutral">غير منشور</span>}
          {coupon.isTopCoupon && <span className="badge-neutral"><Star className="h-3 w-3" fill="currentColor" /> أفضل الكوبونات{coupon.topCouponOrder != null ? ` · #${coupon.topCouponOrder}` : ""}</span>}
        </div>
        <h3 className="text-lg font-extrabold text-ink">{coupon.titleAr}</h3>

        {coupon.type === "CODE" && coupon.code ? (
          <div className="flex h-[54px] max-w-[420px] gap-1.5 rounded-xl border-[1.5px] border-dashed border-border-strong bg-surface-alt p-1.5">
            <span dir="ltr" className="flex flex-1 items-center justify-center font-mono text-xl font-bold tracking-[0.16em] text-primary">{coupon.code}</span>
            <button type="button" onClick={copyCode} aria-label="نسخ الكود" className="flex w-12 items-center justify-center rounded-lg bg-surface text-primary hover:text-accent">
              <Copy className="h-4 w-4" />
            </button>
          </div>
        ) : (
          <p className="text-sm text-ink-muted">عرض بدون كود — يفتح المتجر مباشرة.</p>
        )}

        <dl className="flex flex-wrap gap-x-6 gap-y-1.5 text-sm">
          <div className="flex gap-1.5">
            <dt className="text-ink-muted">ينتهي:</dt>
            <dd className={`font-bold ${soon ? "text-warning" : "text-ink"}`}>{coupon.expiresAt ? expiryLabel(coupon.expiresAt, "ar") : "بدون تاريخ"}</dd>
          </div>
          <div className="flex gap-1.5">
            <dt className="text-ink-muted">آخر تحقق فعلي:</dt>
            <dd className={`font-bold ${verified ? "text-success" : "text-warning"}`}>{verified ? formatDate(coupon.manuallyVerifiedAt!, "ar") : "لم يُختبر بعد"}</dd>
          </div>
        </dl>

        <div className="flex flex-wrap items-center gap-2">
          <button type="button" onClick={actions.handleVerify} disabled={actions.isPending}
            title="اضغط بعد ما تجرّب الكود بنفسك في سلة المتجر"
            className="inline-flex h-10 items-center gap-1.5 rounded-md border border-success/25 bg-success-soft px-3.5 text-sm font-extrabold text-success hover:border-success/50 disabled:opacity-60">
            <Check className="h-4 w-4" />
            {verified ? "جرّبته مجددًا — يعمل" : "جرّبته الآن — يعمل"}
          </button>
          <button type="button" onClick={onEdit} className="h-10 rounded-md border border-border-strong bg-surface px-3.5 text-sm font-bold text-primary hover:border-primary">تعديل</button>
          <Link href={couponHubHref(store, coupon.slug)} target="_blank" className="inline-flex h-10 items-center rounded-md border border-border-strong bg-surface px-3.5 text-sm font-bold text-primary hover:border-primary">معاينة</Link>
          <div className="relative">
            <button type="button" onClick={() => setMenuOpen((v) => !v)} aria-expanded={menuOpen} aria-label="خيارات أخرى"
              className="flex h-10 w-10 items-center justify-center rounded-md border border-border-strong bg-surface text-primary hover:border-primary">
              <MoreHorizontal className="h-4 w-4" />
            </button>
            {menuOpen && (
              <div className="absolute end-0 top-12 z-20 flex w-60 flex-col rounded-lg border border-border bg-surface p-1.5 shadow-lg" onMouseLeave={() => setMenuOpen(false)}>
                <button type="button" onClick={() => { setMenuOpen(false); actions.handleToggleTopPick(); }} disabled={actions.isPending}
                  className="flex items-center gap-2 rounded-md px-3 py-2.5 text-start text-sm font-bold text-ink hover:bg-surface-alt">
                  <Star className="h-4 w-4" fill={coupon.isTopCoupon ? "currentColor" : "none"} />
                  {coupon.isTopCoupon ? "إزالة من «أفضل الكوبونات»" : "إضافة إلى «أفضل الكوبونات»"}
                </button>
                <button type="button" onClick={() => { setMenuOpen(false); actions.handleTogglePublish(); }} disabled={actions.isPending}
                  className="flex items-center gap-2 rounded-md px-3 py-2.5 text-start text-sm font-bold text-ink hover:bg-surface-alt">
                  {coupon.isPublished ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  {coupon.isPublished ? "إيقاف النشر (إخفاء من الموقع)" : "نشر على الموقع"}
                </button>
                {coupon.isVerified && (
                  <button type="button" onClick={() => { setMenuOpen(false); actions.handleUnverify(); }} disabled={actions.isPending}
                    className="flex items-center gap-2 rounded-md px-3 py-2.5 text-start text-sm font-bold text-ink hover:bg-surface-alt">
                    <ShieldX className="h-4 w-4" /> إلغاء التوثيق
                  </button>
                )}
                {actions.confirmDelete ? (
                  <div className="flex items-center gap-2 px-3 py-2.5 text-sm">
                    <button type="button" onClick={actions.handleDelete} disabled={actions.isPending} className="font-extrabold text-danger">تأكيد الحذف</button>
                    <button type="button" onClick={() => actions.setConfirmDelete(false)} className="text-ink-muted">إلغاء</button>
                  </div>
                ) : (
                  <button type="button" onClick={() => actions.setConfirmDelete(true)}
                    className="flex items-center gap-2 rounded-md px-3 py-2.5 text-start text-sm font-bold text-danger hover:bg-danger-soft">
                    <Trash2 className="h-4 w-4" /> حذف الكود
                  </button>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {coupon.type === "CODE" && (
        <div className="flex w-full flex-col gap-2 sm:w-[160px] sm:shrink-0">
          {image.url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={image.url} alt={`صورة الكود ${coupon.code}`} loading="lazy" className="aspect-square w-full max-w-[160px] rounded-lg border border-border bg-surface object-contain" />
          ) : (
            <div className="flex aspect-square w-full max-w-[160px] flex-col items-center justify-center gap-2 rounded-lg border-[1.5px] border-dashed border-warning/40 bg-warning-soft p-3 text-center">
              <Clock className="h-6 w-6 text-warning" />
              <span className="text-xs font-bold leading-6 text-ink">تُصمَّم الآن<br />خلال دقائق</span>
            </div>
          )}
          <span className={`${imageBadge[image.kind]} justify-center`}>{image.label}</span>
          {image.kind === "legacy" && (
            <button type="button" onClick={regenerate} disabled={regenerating}
              className="rounded-md border border-border-strong bg-surface px-2 py-2 text-xs font-bold leading-5 text-primary hover:border-primary disabled:opacity-60">
              {regenerating ? "جاري الإنشاء…" : "إنشاء صورة بالكود الحالي"}
            </button>
          )}
        </div>
      )}
    </article>
  );
}
