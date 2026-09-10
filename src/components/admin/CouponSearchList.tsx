"use client";

import { useMemo, useState } from "react";
import { AdminSearchInput } from "@/components/admin/AdminSearchInput";
import { CouponRow, CouponCardRow } from "@/components/admin/CouponRow";
import type { Coupon, Store } from "@prisma/client";

type CouponWithStore = Coupon & { store: Store };

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
      <AdminSearchInput value={query} onChange={setQuery} placeholder="ابحث عن كوبون..." />
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
