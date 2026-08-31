import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { AdminPageHeader } from "@/components/admin/AdminPageHeader";
import { ArticleForm } from "@/components/admin/ArticleForm";

export default async function EditArticlePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [article, categories] = await Promise.all([
    db.article.findUnique({ where: { id } }),
    db.category.findMany({ orderBy: { nameAr: "asc" } }),
  ]);
  if (!article) notFound();

  return (
    <div>
      <AdminPageHeader title={`تعديل: ${article.titleAr}`} />
      <ArticleForm categories={categories} article={article} />
    </div>
  );
}
