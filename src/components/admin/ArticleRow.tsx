"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Pencil, Trash2, ExternalLink } from "lucide-react";
import { toast } from "sonner";
import { deleteArticle } from "@/lib/actions-article";
import type { Article, User, Category } from "@prisma/client";

type ArticleWithRelations = Article & { author: User; category: Category | null };

// نفس نمط StoreRow.tsx — منطق مشترك بين صف الجدول (ديسكتوب) وبطاقة
// الموبايل، كل واحد فيهم يستخدم نسخته الخاصة من الـ hook.
function useArticleActions(article: ArticleWithRelations) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [confirmDelete, setConfirmDelete] = useState(false);

  function handleDelete() {
    startTransition(async () => {
      const result = await deleteArticle(article.id);
      if (!result.success) { toast.error(result.error); setConfirmDelete(false); }
      else { toast.success("تم حذف المقال"); router.refresh(); }
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
export function ArticleRow({ article }: { article: ArticleWithRelations }) {
  const { isPending, confirmDelete, setConfirmDelete, handleDelete } = useArticleActions(article);

  return (
    <tr className="hidden md:table-row">
      <td>
        <div className="font-semibold text-ink">{article.titleAr}</div>
        <div className="text-xs text-ink-faint">/blog/{article.slug}</div>
      </td>
      <td className="text-ink-muted">{article.author.name}</td>
      <td className="text-ink-muted">{article.category?.nameAr || "—"}</td>
      <td>
        <span className={article.status === "PUBLISHED" ? "badge-success" : "badge-warning"}>
          {article.status === "PUBLISHED" ? "منشور" : "مسودة"}
        </span>
      </td>
      <td>
        <div className="flex items-center gap-1 justify-end">
          {article.status === "PUBLISHED" && (
            <Link href={`/blog/${article.slug}`} target="_blank" className="icon-btn-sm"><ExternalLink className="h-4 w-4" /></Link>
          )}
          <Link href={`/admin/articles/${article.id}`} className="icon-btn-sm"><Pencil className="h-4 w-4" /></Link>
          <DeleteControl confirmDelete={confirmDelete} setConfirmDelete={setConfirmDelete} isPending={isPending} handleDelete={handleDelete} />
        </div>
      </td>
    </tr>
  );
}

/** بطاقة — موبايل فقط (أصغر من md). */
export function ArticleCard({ article }: { article: ArticleWithRelations }) {
  const { isPending, confirmDelete, setConfirmDelete, handleDelete } = useArticleActions(article);

  return (
    <div className="md:hidden p-4 flex flex-col gap-3">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="font-semibold text-ink truncate">{article.titleAr}</div>
          <div className="text-xs text-ink-faint truncate">/blog/{article.slug}</div>
        </div>
        <div className="flex items-center gap-1 shrink-0">
          {article.status === "PUBLISHED" && (
            <Link href={`/blog/${article.slug}`} target="_blank" className="icon-btn-sm"><ExternalLink className="h-4 w-4" /></Link>
          )}
          <Link href={`/admin/articles/${article.id}`} className="icon-btn-sm"><Pencil className="h-4 w-4" /></Link>
          <DeleteControl confirmDelete={confirmDelete} setConfirmDelete={setConfirmDelete} isPending={isPending} handleDelete={handleDelete} />
        </div>
      </div>
      <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 text-xs text-ink-muted">
        <span>الكاتب: {article.author.name}</span>
        <span>التصنيف: {article.category?.nameAr || "—"}</span>
      </div>
      <span className={`self-start ${article.status === "PUBLISHED" ? "badge-success" : "badge-warning"}`}>
        {article.status === "PUBLISHED" ? "منشور" : "مسودة"}
      </span>
    </div>
  );
}
