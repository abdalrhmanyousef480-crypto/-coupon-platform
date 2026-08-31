import { db } from "@/lib/db";
import { AdminPageHeader } from "@/components/admin/AdminPageHeader";
import { ArticleForm } from "@/components/admin/ArticleForm";

export default async function NewArticlePage() {
  const categories = await db.category.findMany({ orderBy: { nameAr: "asc" } });
  return (
    <div>
      <AdminPageHeader title="إضافة مقال جديد" />
      <ArticleForm categories={categories} />
    </div>
  );
}
