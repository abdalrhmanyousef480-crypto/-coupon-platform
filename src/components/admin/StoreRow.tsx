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

export function StoreRow({ store }: { store: StoreWithRelations }) {
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

  return (
    <tr>
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
          {confirmDelete ? (
            <div className="flex items-center gap-1">
              <button onClick={handleDelete} disabled={isPending} className="text-xs text-danger font-semibold px-2">تأكيد؟</button>
              <button onClick={() => setConfirmDelete(false)} className="text-xs text-ink-muted px-1">إلغاء</button>
            </div>
          ) : (
            <button onClick={() => setConfirmDelete(true)} className="icon-btn-sm text-danger" title="حذف">
              <Trash2 className="h-4 w-4" />
            </button>
          )}
        </div>
      </td>
    </tr>
  );
}
