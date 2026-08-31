"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Pencil, Trash2, ExternalLink } from "lucide-react";
import { toast } from "sonner";
import { deleteCategory } from "@/lib/actions-category";
import type { Category } from "@prisma/client";

type CategoryWithCount = Category & { _count: { stores: number; coupons: number } };

export function CategoryRow({ category }: { category: CategoryWithCount }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [confirmDelete, setConfirmDelete] = useState(false);

  function handleDelete() {
    startTransition(async () => {
      const result = await deleteCategory(category.id);
      if (!result.success) { toast.error(result.error); setConfirmDelete(false); }
      else { toast.success("تم حذف التصنيف"); router.refresh(); }
    });
  }

  return (
    <tr>
      <td>
        <div className="font-semibold text-ink">{category.nameAr}</div>
        <div className="text-xs text-ink-faint">/category/{category.slug}</div>
      </td>
      <td className="text-ink-muted">{category._count.stores}</td>
      <td className="text-ink-muted">{category._count.coupons}</td>
      <td><span className={category.isPublished ? "badge-success" : "badge-neutral"}>{category.isPublished ? "منشور" : "غير منشور"}</span></td>
      <td>
        <div className="flex items-center gap-1 justify-end">
          <Link href={`/category/${category.slug}`} target="_blank" className="icon-btn-sm"><ExternalLink className="h-4 w-4" /></Link>
          <Link href={`/admin/categories/${category.id}`} className="icon-btn-sm"><Pencil className="h-4 w-4" /></Link>
          {confirmDelete ? (
            <div className="flex items-center gap-1">
              <button onClick={handleDelete} disabled={isPending} className="text-xs text-danger font-semibold px-2">تأكيد؟</button>
              <button onClick={() => setConfirmDelete(false)} className="text-xs text-ink-muted px-1">إلغاء</button>
            </div>
          ) : (
            <button onClick={() => setConfirmDelete(true)} className="icon-btn-sm text-danger"><Trash2 className="h-4 w-4" /></button>
          )}
        </div>
      </td>
    </tr>
  );
}
