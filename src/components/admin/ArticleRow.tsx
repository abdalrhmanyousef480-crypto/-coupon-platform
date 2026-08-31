"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Pencil, Trash2, ExternalLink } from "lucide-react";
import { toast } from "sonner";
import { deleteArticle } from "@/lib/actions-article";
import type { Article, User, Category } from "@prisma/client";

type ArticleWithRelations = Article & { author: User; category: Category | null };

export function ArticleRow({ article }: { article: ArticleWithRelations }) {
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

  return (
    <tr>
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
