"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { CalendarCheck } from "lucide-react";
import { toast } from "sonner";
import { AdminSearchInput } from "@/components/admin/AdminSearchInput";
import { CouponRow, CouponCardRow } from "@/components/admin/CouponRow";
import { markAllCouponsCheckedToday } from "@/lib/actions-coupon";
import type { Coupon, Store } from "@prisma/client";

type CouponWithStore = Coupon & { store: Store };

// زر جماعي بجانب البحث — بدل ما يضغط الأدمن على كل كوبون لحاله بـ
// CheckedTodayButton (CouponRow.tsx)، هذا يحدّث lastCheckedAt لكل الكوبونات
// المنشورة دفعة واحدة عبر markAllCouponsCheckedToday. نفس نمط confirm
// البسيط بـ DeleteControl (CouponRow.tsx) لكن هون كإجراء واسع النطاق
// window.confirm كافي وأبسط بدل ما نبني حالة confirm/إلغاء إضافية.
function CheckAllTodayButton() {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  function handleClick() {
    if (!window.confirm("هل تريد تسجيل \"تم التحقق اليوم\" لكل الكوبونات المنشورة؟")) return;
    startTransition(async () => {
      const { count } = await markAllCouponsCheckedToday();
      toast.success(`تم تحديث ${count} كوبون`);
      router.refresh();
    });
  }

  return (
    <button onClick={handleClick} disabled={isPending} className="btn-secondary btn-sm shrink-0 gap-1.5 whitespace-nowrap">
      <CalendarCheck className="h-4 w-4" />
      تحقّق من الكل اليوم
    </button>
  );
}

export function CouponSearchList({ coupons }: { coupons: CouponWithStore[] }) {
  const [query, setQuery] = useState("");

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return coupons;
    return coupons.filter(
      (coupon) =>
        coupon.titleAr.toLowerCase().includes(q) ||
        coupon.title.toLowerCase().includes(q) ||
        (coupon.code ?? "").toLowerCase().includes(q) ||
        coupon.slug.toLowerCase().includes(q) ||
        coupon.store.name.toLowerCase().includes(q)
    );
  }, [coupons, query]);

  return (
    <>
      <div className="flex flex-wrap items-center gap-3 mb-3">
        <div className="flex-1 min-w-[200px]">
          <AdminSearchInput value={query} onChange={setQuery} placeholder="ابحث عن كوبون..." />
        </div>
        <CheckAllTodayButton />
      </div>
      <div className="card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="data-table">
            <thead>
              <tr className="hidden md:table-row">
                <th>الكوبون</th>
                <th>المتجر</th>
                <th>النوع</th>
                <th>موثّق</th>
                <th>الحالة</th>
                <th>الانتهاء</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((coupon) => (
                <CouponRow key={coupon.id} coupon={coupon} />
              ))}
            </tbody>
          </table>
        </div>
        <div className="md:hidden divide-y divide-border">
          {filtered.map((coupon) => (
            <CouponCardRow key={coupon.id} coupon={coupon} />
          ))}
        </div>
        {coupons.length === 0 && (
          <p className="text-center text-ink-muted py-10">لا توجد كوبونات بعد. أضف أول كوبون للبدء.</p>
        )}
        {coupons.length > 0 && filtered.length === 0 && (
          <p className="text-center text-ink-muted py-10">لا توجد نتائج مطابقة.</p>
        )}
      </div>
    </>
  );
}
