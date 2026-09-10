"use client";

import { useMemo, useState } from "react";
import { AdminSearchInput } from "@/components/admin/AdminSearchInput";
import { StoreRow, StoreCard } from "@/components/admin/StoreRow";
import type { Store, Category } from "@prisma/client";

type StoreWithRelations = Store & { category: Category; _count: { coupons: number } };

export function StoreSearchList({ stores }: { stores: StoreWithRelations[] }) {
  const [query, setQuery] = useState("");

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return stores;
    return stores.filter(
      (store) => store.name.toLowerCase().includes(q) || store.slug.toLowerCase().includes(q)
    );
  }, [stores, query]);

  return (
    <>
      <AdminSearchInput value={query} onChange={setQuery} placeholder="ابحث عن متجر..." />
      <div className="card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="data-table">
            <thead>
              <tr className="hidden md:table-row">
                <th>المتجر</th>
                <th>التصنيف</th>
                <th>الكوبونات</th>
                <th>الحالة</th>
                <th>مميز</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((store) => (
                <StoreRow key={store.id} store={store} />
              ))}
            </tbody>
          </table>
        </div>
        <div className="md:hidden divide-y divide-border">
          {filtered.map((store) => (
            <StoreCard key={store.id} store={store} />
          ))}
        </div>
        {stores.length === 0 && (
          <p className="text-center text-ink-muted py-10">لا توجد متاجر بعد. أضف أول متجر للبدء.</p>
        )}
        {stores.length > 0 && filtered.length === 0 && (
          <p className="text-center text-ink-muted py-10">لا توجد نتائج مطابقة.</p>
        )}
      </div>
    </>
  );
}
