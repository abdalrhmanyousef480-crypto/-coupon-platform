"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Pencil, Trash2, ExternalLink } from "lucide-react";
import { toast } from "sonner";
import { deleteCategory } from "@/lib/actions-category";
import type { Category } from "@prisma/client";

type CategoryWithCount = Category & { _count: { stores: number; coupons: number } };

// نفس نمط StoreRow.tsx — منطق مشترك بين صف الجدول (ديسكتوب) وبطاقة
// الموبايل، كل واحد فيهم يستخدم نسخته الخاصة من الـ hook.
function useCategoryActions(category: CategoryWithCount) {
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

  return { isPending, confirmDelete, setConfirmDelete, handleDelete };
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
    <button onClick={() => setConfirmDelete(true)} className="icon-btn-sm text-danger"><Trash2 className="h-4 w-4" /></button>
  );
}

/** صف الجدول — ديسكتوب فقط (md فأعلى). */
export function CategoryRow({ category }: { category: CategoryWithCount }) {
  const { isPending, confirmDelete, setConfirmDelete, handleDelete } = useCategoryActions(category);

  return (
    <tr className="hidden md:table-row">
      <td>
        <div className="font-semibold text-ink">{category.emoji} {category.nameAr}</div>
        <div className="text-xs text-ink-faint">/category/{category.slug}</div>
      </td>
      <td className="text-ink-muted">{category._count.stores}</td>
      <td className="text-ink-muted">{category._count.coupons}</td>
      <td><span className={category.isPublished ? "badge-success" : "badge-neutral"}>{category.isPublished ? "منشور" : "غير منشور"}</span></td>
      <td>
        <div className="flex items-center gap-1 justify-end">
          <Link href={`/category/${category.slug}`} target="_blank" className="icon-btn-sm"><ExternalLink className="h-4 w-4" /></Link>
          <Link href={`/admin/categories/${category.id}`} className="icon-btn-sm"><Pencil className="h-4 w-4" /></Link>
          <DeleteControl confirmDelete={confirmDelete} setConfirmDelete={setConfirmDelete} isPending={isPending} handleDelete={handleDelete} />
        </div>
      </td>
    </tr>
  );
}

/** بطاقة — موبايل فقط (أصغر من md). */
export function CategoryCard({ category }: { category: CategoryWithCount }) {
  const { isPending, confirmDelete, setConfirmDelete, handleDelete } = useCategoryActions(category);

  return (
    <div className="md:hidden p-4 flex flex-col gap-3">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="font-semibold text-ink truncate">{category.emoji} {category.nameAr}</div>
          <div className="text-xs text-ink-faint truncate">/category/{category.slug}</div>
        </div>
        <div className="flex items-center gap-1 shrink-0">
          <Link href={`/category/${category.slug}`} target="_blank" className="icon-btn-sm"><ExternalLink className="h-4 w-4" /></Link>
          <Link href={`/admin/categories/${category.id}`} className="icon-btn-sm"><Pencil className="h-4 w-4" /></Link>
          <DeleteControl confirmDelete={confirmDelete} setConfirmDelete={setConfirmDelete} isPending={isPending} handleDelete={handleDelete} />
        </div>
      </div>
      <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 text-xs text-ink-muted">
        <span>المتاجر: {category._count.stores}</span>
        <span>الكوبونات: {category._count.coupons}</span>
      </div>
      <span className={`self-start ${category.isPublished ? "badge-success" : "badge-neutral"}`}>
        {category.isPublished ? "منشور" : "غير منشور"}
      </span>
    </div>
  );
}
