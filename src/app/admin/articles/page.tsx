import { db } from "@/lib/db";
import { AdminPageHeader } from "@/components/admin/AdminPageHeader";
import { ArticleRow } from "@/components/admin/ArticleRow";

export default async function AdminArticlesPage() {
  const articles = await db.article.findMany({
    orderBy: { createdAt: "desc" },
    include: { author: true, category: true },
  });

  return (
    <div>
      <AdminPageHeader title="المقالات" count={articles.length} newHref="/admin/articles/new" newLabel="إضافة مقال" />
      <div className="card overflow-x-auto">
        <table className="data-table">
          <thead>
            <tr>
              <th>المقال</th>
              <th>الكاتب</th>
              <th>التصنيف</th>
              <th>الحالة</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {articles.map((a) => <ArticleRow key={a.id} article={a} />)}
          </tbody>
        </table>
        {articles.length === 0 && <p className="text-center text-ink-muted py-10">لا توجد مقالات بعد.</p>}
      </div>
    </div>
  );
}
