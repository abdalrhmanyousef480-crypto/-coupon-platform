"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Pencil, Trash2, ExternalLink, ShieldCheck, Star, CalendarCheck, ShieldX } from "lucide-react";
import { toast } from "sonner";
import { toggleCouponPublish, deleteCoupon, markCouponVerified, markCouponUnverified, toggleCouponTopPick } from "@/lib/actions-coupon";
import { expiryLabel, formatDate } from "@/lib/utils";
import type { Coupon, Store } from "@prisma/client";

type CouponWithStore = Coupon & { store: Store };

const typeLabels: Record<string, string> = { CODE: "كود", DEAL: "عرض", CASHBACK: "كاش باك" };

// نفس نمط StoreRow.tsx — منطق مشترك بين صف الجدول (ديسكتوب) وبطاقة
// الموبايل، كل واحد فيهم يستخدم نسخته الخاصة من الـ hook.
function useCouponActions(coupon: CouponWithStore) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [confirmDelete, setConfirmDelete] = useState(false);

  function handleTogglePublish() {
    startTransition(async () => {
      await toggleCouponPublish(coupon.id, !coupon.isPublished);
      router.refresh();
    });
  }

  function handleVerify() {
    if (!window.confirm(`هل اختبرت ${coupon.code ? `الكود ${coupon.code}` : "العرض"} بنفسك على موقع ${coupon.store.name} وتأكدت أن الخصم يعمل فعلًا؟ لا تعتمد على مجرد فتح الصفحة.`)) return;
    startTransition(async () => {
      const result = await markCouponVerified(coupon.id, true);
      if (result.success) { toast.success("تم اعتماد التحقق الفردي"); router.refresh(); }
      else toast.error(result.error);
    });
  }

  function handleUnverify() {
    if (!window.confirm("إلغاء توثيق هذا الكوبون؟ سيظل منشورًا لكن لن يظهر ككوبون موثق.")) return;
    startTransition(async () => {
      const result = await markCouponUnverified(coupon.id);
      if (result.success) { toast.success("تم إلغاء التوثيق"); router.refresh(); }
      else toast.error(result.error);
    });
  }

  function handleToggleTopPick() {
    startTransition(async () => {
      await toggleCouponTopPick(coupon.id, !coupon.isTopCoupon);
      toast.success(coupon.isTopCoupon ? "تمت الإزالة من أفضل الكوبونات" : "تمت الإضافة إلى أفضل الكوبونات");
      router.refresh();
    });
  }

  function handleDelete() {
    startTransition(async () => {
      const result = await deleteCoupon(coupon.id);
      if (!result.success) { toast.error(result.error); setConfirmDelete(false); }
      else { toast.success("تم حذف الكوبون"); router.refresh(); }
    });
  }

  return { isPending, confirmDelete, setConfirmDelete, handleTogglePublish, handleVerify, handleUnverify, handleToggleTopPick, handleDelete };
}

function TopPickButton({ coupon, isPending, onClick }: { coupon: CouponWithStore; isPending: boolean; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      disabled={isPending}
      className={`icon-btn-sm ${coupon.isTopCoupon ? "text-accent" : ""}`}
      title={coupon.isTopCoupon ? "إزالة من أفضل الكوبونات" : "إضافة إلى أفضل الكوبونات"}
    >
      <Star className="h-4 w-4" fill={coupon.isTopCoupon ? "currentColor" : "none"} />
    </button>
  );
}

function VerificationActions({ coupon, isPending, onVerify, onUnverify }: {
  coupon: CouponWithStore; isPending: boolean; onVerify: () => void; onUnverify: () => void;
}) {
  return (
    <div className="flex items-center gap-1">
      <button type="button" onClick={onVerify} disabled={isPending}
        className="badge-neutral hover:bg-success-soft hover:text-success gap-1 whitespace-nowrap"
        title="اعتماد تحقق جديد بعد اختبار العرض فعليًا في سلة المتجر">
        <CalendarCheck className="h-3 w-3" />
        {coupon.manuallyVerifiedAt && coupon.isVerified ? "إعادة اختبار" : "تأكيد بعد الاختبار"}
      </button>
      {coupon.isVerified && (
        <button type="button" onClick={onUnverify} disabled={isPending} className="icon-btn-sm text-danger"
          title="إلغاء التوثيق دون حذف الكوبون">
          <ShieldX className="h-4 w-4" />
        </button>
      )}
    </div>
  );
}

function DeleteControl({
  confirmDelete, setConfirmDelete, isPending, handleDelete,
}: { confirmDelete: boolean; setConfirmDelete: (v: boolean) => void; isPending: boolean; handleDelete: () => void }) {
  if (confirmDelete) {
    return (
      <div className="flex items-center gap-1">
        <button onClick={handleDelete} disabled={isPending} className="text-xs text-danger font-semibold px-2">تأكيد؟</button>
        <button onClick={() => setConfirmDelete(false)} className="text-xs text-ink-muted px-1">إلغاء</button>
      </div>
    );
  }
  return (
    <button onClick={() => setConfirmDelete(true)} className="icon-btn-sm text-danger" title="حذف">
      <Trash2 className="h-4 w-4" />
    </button>
  );
}

/** صف الجدول — ديسكتوب فقط (md فأعلى). */
export function CouponRow({ coupon }: { coupon: CouponWithStore }) {
  const { isPending, confirmDelete, setConfirmDelete, handleTogglePublish, handleVerify, handleUnverify, handleToggleTopPick, handleDelete } = useCouponActions(coupon);

  return (
    <tr className="hidden md:table-row">
      <td>
        <div className="font-semibold text-ink">{coupon.titleAr}</div>
        <div className="text-xs text-ink-faint font-mono">{coupon.code || "—"}</div>
      </td>
      <td className="text-ink-muted">{coupon.store.name}</td>
      <td className="text-ink-muted">{typeLabels[coupon.type]}</td>
      <td>
        {coupon.isVerified && coupon.manuallyVerifiedAt ? (
          <span className="badge-success"><ShieldCheck className="h-3 w-3" /> تم التحقق فرديًا</span>
        ) : coupon.isVerified ? (
          <span className="badge-neutral">توثيق سابق بحاجة مراجعة</span>
        ) : (
          <span className="badge-neutral">غير موثّق</span>
        )}
      </td>
      <td>
        <button onClick={handleTogglePublish} disabled={isPending} className={coupon.isPublished ? "badge-success" : "badge-neutral"}>
          {coupon.isPublished ? "منشور" : "غير منشور"}
        </button>
      </td>
      <td className="text-ink-muted text-xs">
        <div>{coupon.expiresAt ? expiryLabel(coupon.expiresAt, "ar") : "—"}</div>
        <div className="text-ink-faint">{coupon.isVerified && coupon.manuallyVerifiedAt ? "آخر تحقق فعلي: " : "آخر تحديث بيانات: "}{formatDate(coupon.isVerified && coupon.manuallyVerifiedAt ? coupon.manuallyVerifiedAt : coupon.updatedAt, "ar")}</div>
      </td>
      <td>
        <div className="flex items-center gap-1 justify-end">
          <VerificationActions coupon={coupon} isPending={isPending} onVerify={handleVerify} onUnverify={handleUnverify} />
          <TopPickButton coupon={coupon} isPending={isPending} onClick={handleToggleTopPick} />
          <Link href={`/store/${coupon.store.slug}/coupon/${coupon.slug}`} target="_blank" className="icon-btn-sm" title="معاينة">
            <ExternalLink className="h-4 w-4" />
          </Link>
          <Link href={`/admin/coupons/${coupon.id}`} className="icon-btn-sm" title="تعديل">
            <Pencil className="h-4 w-4" />
          </Link>
          <DeleteControl confirmDelete={confirmDelete} setConfirmDelete={setConfirmDelete} isPending={isPending} handleDelete={handleDelete} />
        </div>
      </td>
    </tr>
  );
}

/** بطاقة — موبايل فقط (أصغر من md). */
export function CouponCardRow({ coupon }: { coupon: CouponWithStore }) {
  const { isPending, confirmDelete, setConfirmDelete, handleTogglePublish, handleVerify, handleUnverify, handleToggleTopPick, handleDelete } = useCouponActions(coupon);

  return (
    <div className="md:hidden p-4 flex flex-col gap-3">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="font-semibold text-ink truncate">{coupon.titleAr}</div>
          <div className="text-xs text-ink-faint font-mono truncate">{coupon.code || "—"} <span className="font-sans text-ink-faint">— {coupon.store.name}</span></div>
        </div>
        <div className="flex items-center gap-1 shrink-0">
          <TopPickButton coupon={coupon} isPending={isPending} onClick={handleToggleTopPick} />
          <Link href={`/store/${coupon.store.slug}/coupon/${coupon.slug}`} target="_blank" className="icon-btn-sm" title="معاينة">
            <ExternalLink className="h-4 w-4" />
          </Link>
          <Link href={`/admin/coupons/${coupon.id}`} className="icon-btn-sm" title="تعديل">
            <Pencil className="h-4 w-4" />
          </Link>
          <DeleteControl confirmDelete={confirmDelete} setConfirmDelete={setConfirmDelete} isPending={isPending} handleDelete={handleDelete} />
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 text-xs text-ink-muted">
        <span>النوع: {typeLabels[coupon.type]}</span>
        {coupon.expiresAt && <span>الانتهاء: {expiryLabel(coupon.expiresAt, "ar")}</span>}
        <span>{coupon.isVerified && coupon.manuallyVerifiedAt ? "آخر تحقق فعلي: " : "آخر تحديث بيانات: "}{formatDate(coupon.isVerified && coupon.manuallyVerifiedAt ? coupon.manuallyVerifiedAt : coupon.updatedAt, "ar")}</span>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <button onClick={handleTogglePublish} disabled={isPending} className={coupon.isPublished ? "badge-success" : "badge-neutral"}>
          {coupon.isPublished ? "منشور" : "غير منشور"}
        </button>
        {coupon.isVerified && coupon.manuallyVerifiedAt ? (
          <span className="badge-success"><ShieldCheck className="h-3 w-3" /> تم التحقق فرديًا</span>
        ) : coupon.isVerified ? (
          <span className="badge-neutral">توثيق سابق بحاجة مراجعة</span>
        ) : (
          <span className="badge-neutral">غير موثّق</span>
        )}
        <VerificationActions coupon={coupon} isPending={isPending} onVerify={handleVerify} onUnverify={handleUnverify} />
      </div>
    </div>
  );
}
