"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { AdminSearchInput } from "@/components/admin/AdminSearchInput";
import { StoreLogo } from "@/components/ui/StoreLogo";
import { formatDate } from "@/lib/utils";

export interface StoreListItem {
  id: string;
  name: string;
  logoUrl: string;
  path: string;
  isPublished: boolean;
  primaryCode: string | null;
  activeCount: number;
  image: "manual" | "auto" | "pending" | "legacy" | "none";
  lastVerified: string | null;
  expiringSoon: boolean;
  untested: boolean;
  pendingImages: number;
  noActiveCode: boolean;
}

type Filter = "all" | "attention" | "expiring" | "nocode" | "unpublished";

const FILTERS: { id: Filter; label: string }[] = [
  { id: "all", label: "الكل" },
  { id: "attention", label: "تحتاج انتباه" },
  { id: "expiring", label: "قرب الانتهاء" },
  { id: "nocode", label: "بدون كود فعّال" },
  { id: "unpublished", label: "غير منشور" },
];

const IMAGE: Record<StoreListItem["image"], { label: string; cls: string }> = {
  auto: { label: "تلقائية جاهزة", cls: "badge-success" },
  pending: { label: "جاري التوليد", cls: "badge-warning" },
  manual: { label: "يدوية", cls: "badge-neutral" },
  legacy: { label: "تاريخية", cls: "badge-neutral" },
  none: { label: "—", cls: "text-ink-faint text-sm" },
};

function matches(s: StoreListItem, f: Filter) {
  switch (f) {
    case "attention": return s.isPublished && (s.noActiveCode || s.expiringSoon || s.untested);
    case "expiring": return s.expiringSoon;
    case "nocode": return s.noActiveCode;
    case "unpublished": return !s.isPublished;
    default: return true;
  }
}

export function StoreSearchList({ stores }: { stores: StoreListItem[] }) {
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<Filter>("all");

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return stores.filter((s) => matches(s, filter) && (!q
      || s.name.toLowerCase().includes(q)
      || s.path.toLowerCase().includes(q)
      || (s.primaryCode ?? "").toLowerCase().includes(q)));
  }, [stores, query, filter]);

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
        <div className="min-w-0 flex-1 [&>*]:mb-0">
          <AdminSearchInput value={query} onChange={setQuery} placeholder="ابحث باسم المتجر أو الكود…" />
        </div>
        <div className="flex flex-wrap gap-2" role="group" aria-label="تصفية المتاجر">
          {FILTERS.map((f) => (
            <button key={f.id} type="button" aria-pressed={filter === f.id} onClick={() => setFilter(f.id)}
              className={`h-10 rounded-full px-4 text-sm font-bold transition-colors ${filter === f.id ? "bg-primary text-white" : "border border-border-strong bg-surface text-ink hover:border-primary"}`}>
              {f.label}
            </button>
          ))}
        </div>
      </div>

      {/* Phones: stacked cards (a wide table would stretch the whole page). */}
      <div className="flex flex-col gap-3 md:hidden">
        {filtered.map((s) => (
          <Link key={s.id} href={`/admin/stores/${s.id}`} className="card flex flex-col gap-3 rounded-xl p-4 active:bg-surface-alt">
            <div className="flex items-center gap-3">
              <StoreLogo name={s.name} logoUrl={s.logoUrl} size={44} className="h-11 w-11 rounded-md bg-surface-alt" />
              <span className="flex min-w-0 flex-1 flex-col">
                <span className="truncate font-extrabold text-ink">{s.name}</span>
                <span dir="ltr" className="truncate text-end text-xs text-ink-muted">{s.path}</span>
              </span>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              {s.primaryCode
                ? <span dir="ltr" className="rounded-md border border-dashed border-border-strong bg-surface-alt px-2.5 py-1 font-mono text-sm font-bold tracking-wider text-primary">{s.primaryCode}</span>
                : <span className={s.noActiveCode ? "badge-warning" : "badge-neutral"}>{s.noActiveCode ? "لا يوجد كود" : "عرض"}</span>}
              <span className="badge-neutral">{s.activeCount} {s.activeCount === 1 ? "كود" : "أكواد"}</span>
              {s.image !== "none" && <span className={IMAGE[s.image].cls}>{IMAGE[s.image].label}</span>}
              {!s.isPublished && <span className="badge-neutral">غير منشور</span>}
              {s.expiringSoon && <span className="badge-warning">قرب الانتهاء</span>}
              {!s.noActiveCode && s.untested && <span className="badge-warning">يحتاج اختبار</span>}
            </div>
          </Link>
        ))}
        {stores.length > 0 && filtered.length === 0 && <p className="py-10 text-center text-ink-muted">لا توجد نتائج مطابقة.</p>}
      </div>

      <div className="card hidden overflow-hidden rounded-xl md:block">
        <div className="overflow-x-auto">
          <table className="data-table min-w-[860px]">
            <thead>
              <tr>
                <th>المتجر</th>
                <th>الكود الرئيسي</th>
                <th>الأكواد</th>
                <th>الصورة</th>
                <th>آخر تحقق</th>
                <th><span className="sr-only">إجراء</span></th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((s) => (
                <tr key={s.id}>
                  <td>
                    <Link href={`/admin/stores/${s.id}`} className="flex items-center gap-3">
                      <StoreLogo name={s.name} logoUrl={s.logoUrl} size={44} className="h-11 w-11 rounded-md bg-surface-alt" />
                      <span className="flex min-w-0 flex-col">
                        <span className="font-extrabold text-ink">{s.name}{!s.isPublished && <span className="badge-neutral ms-2 text-[11px]">غير منشور</span>}</span>
                        <span dir="ltr" className="truncate text-end text-xs text-ink-muted">{s.path}</span>
                      </span>
                    </Link>
                  </td>
                  <td>
                    {s.primaryCode
                      ? <span dir="ltr" className="rounded-md border border-dashed border-border-strong bg-surface-alt px-2.5 py-1 font-mono text-[15px] font-bold tracking-wider text-primary">{s.primaryCode}</span>
                      : <span className={s.noActiveCode ? "badge-warning" : "text-ink-faint"}>{s.noActiveCode ? "لا يوجد كود" : "عرض"}</span>}
                  </td>
                  <td className="font-bold text-ink">{s.activeCount}</td>
                  <td><span className={IMAGE[s.image].cls}>{IMAGE[s.image].label}</span></td>
                  <td>
                    {s.lastVerified && !s.untested
                      ? <span className="text-sm font-bold text-success">{formatDate(new Date(s.lastVerified), "ar")}</span>
                      : <span className="text-sm font-bold text-warning">{s.noActiveCode ? "—" : "يحتاج اختبار"}</span>}
                    {s.expiringSoon && <span className="badge-warning ms-2">قرب الانتهاء</span>}
                  </td>
                  <td className="text-end">
                    <Link href={`/admin/stores/${s.id}`} className="inline-flex h-9 items-center rounded-md border border-border-strong px-4 text-sm font-bold text-primary hover:border-primary">إدارة</Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {stores.length === 0 && <p className="py-10 text-center text-ink-muted">لا توجد متاجر بعد. أضف أول متجر للبدء.</p>}
        {stores.length > 0 && filtered.length === 0 && <p className="py-10 text-center text-ink-muted">لا توجد نتائج مطابقة.</p>}
      </div>
    </div>
  );
}
