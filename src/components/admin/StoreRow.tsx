"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Pencil, Trash2, ExternalLink } from "lucide-react";
import { toast } from "sonner";
import { toggleStorePublish, deleteStore } from "@/lib/actions-store";
import { StoreLogo } from "@/components/ui/StoreLogo";
import type { Store, Category } from "@prisma/client";

type StoreWithRelations = Store & { category: Category; _count: { coupons: number } };

// منطق مشترك بين صف الجدول (ديسكتوب) وبطاقة الموبايل — كل واحد منهم
// يستخدم نسخته الخاصة (state مستقل)، بس اثنينهم موجودين بالـ DOM دائمًا
// ويتحكم بإظهار أيهما CSS فقط (hidden md:table-row / md:hidden)، فمفيش
// داعي لمزامنة state بينهم.
function useStoreActions(store: StoreWithRelations) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [confirmDelete, setConfirmDelete] = useState(false);

  function handleTogglePublish() {
    startTransition(async () => {
      await toggleStorePublish(store.id, !store.isPublished);
      router.refresh();
    });
  }

  function handleDelete() {
    startTransition(async () => {
      const result = await deleteStore(store.id);
      if (!result.success) {
        toast.error(result.error);
        setConfirmDelete(false);
      } else {
        toast.success("تم حذف المتجر");
        router.refresh();
      }
    });
  }

  return { isPending, confirmDelete, setConfirmDelete, handleTogglePublish, handleDelete };
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
export function StoreRow({ store }: { store: StoreWithRelations }) {
  const { isPending, confirmDelete, setConfirmDelete, handleTogglePublish, handleDelete } = useStoreActions(store);

  return (
    <tr className="hidden md:table-row">
      <td>
        <div className="flex items-center gap-2.5">
          <StoreLogo name={store.name} logoUrl={store.logoUrl} size={26} className="w-9 h-9 rounded-md" />
          <div>
            <div className="font-semibold text-ink">{store.name}</div>
            <div className="text-xs text-ink-faint">/store/{store.slug}</div>
          </div>
        </div>
      </td>
      <td className="text-ink-muted">{store.category.nameAr}</td>
      <td className="text-ink-muted">{store._count.coupons}</td>
      <td>
        <button onClick={handleTogglePublish} disabled={isPending} className={store.isPublished ? "badge-success" : "badge-neutral"}>
          {store.isPublished ? "منشور" : "غير منشور"}
        </button>
      </td>
      <td className="text-ink-muted">{store.isFeatured ? "✓" : "—"}</td>
      <td>
        <div className="flex items-center gap-1 justify-end">
          <Link href={`/store/${store.slug}`} target="_blank" className="icon-btn-sm" title="معاينة">
            <ExternalLink className="h-4 w-4" />
          </Link>
          <Link href={`/admin/stores/${store.id}`} className="icon-btn-sm" title="تعديل">
            <Pencil className="h-4 w-4" />
          </Link>
          <DeleteControl confirmDelete={confirmDelete} setConfirmDelete={setConfirmDelete} isPending={isPending} handleDelete={handleDelete} />
        </div>
      </td>
    </tr>
  );
}

/** بطاقة — موبايل فقط (أصغر من md)، بديل عن صف الجدول اللي ما بينعرض
 *  منيح بشاشات ضيقة (أعمدة كتير ما بتنلَمّ). */
export function StoreCard({ store }: { store: StoreWithRelations }) {
  const { isPending, confirmDelete, setConfirmDelete, handleTogglePublish, handleDelete } = useStoreActions(store);

  return (
    <div className="md:hidden p-4 flex flex-col gap-3">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-2.5 min-w-0">
          <StoreLogo name={store.name} logoUrl={store.logoUrl} size={26} className="w-9 h-9 rounded-md shrink-0" />
          <div className="min-w-0">
            <div className="font-semibold text-ink truncate">{store.name}</div>
            <div className="text-xs text-ink-faint truncate">/store/{store.slug}</div>
          </div>
        </div>
        <div className="flex items-center gap-1 shrink-0">
          <Link href={`/store/${store.slug}`} target="_blank" className="icon-btn-sm" title="معاينة">
            <ExternalLink className="h-4 w-4" />
          </Link>
          <Link href={`/admin/stores/${store.id}`} className="icon-btn-sm" title="تعديل">
            <Pencil className="h-4 w-4" />
          </Link>
          <DeleteControl confirmDelete={confirmDelete} setConfirmDelete={setConfirmDelete} isPending={isPending} handleDelete={handleDelete} />
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 text-xs text-ink-muted">
        <span>التصنيف: {store.category.nameAr}</span>
        <span>الكوبونات: {store._count.coupons}</span>
        {store.isFeatured && <span className="badge-accent">مميز</span>}
      </div>

      <button onClick={handleTogglePublish} disabled={isPending} className={`self-start ${store.isPublished ? "badge-success" : "badge-neutral"}`}>
        {store.isPublished ? "منشور" : "غير منشور"}
      </button>
    </div>
  );
}
