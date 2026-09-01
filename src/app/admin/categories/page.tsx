import { db } from "@/lib/db";
import { AdminPageHeader } from "@/components/admin/AdminPageHeader";
import { CategoryRow, CategoryCard } from "@/components/admin/CategoryRow";
import { countCouponsByCategory } from "@/lib/category-coupons";

export default async function AdminCategoriesPage() {
  const rawCategories = await db.category.findMany({
    orderBy: { nameAr: "asc" },
    include: { _count: { select: { stores: true } } },
  });
  const couponCounts = await countCouponsByCategory(rawCategories.map((c) => c.id));
  const categories = rawCategories.map((cat) => ({
    ...cat,
    _count: { ...cat._count, coupons: couponCounts[cat.id] ?? 0 },
  }));

  return (
    <div>
      <AdminPageHeader title="التصنيفات" count={categories.length} newHref="/admin/categories/new" newLabel="إضافة تصنيف" />
      <div className="card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="data-table">
            <thead>
              <tr className="hidden md:table-row">
                <th>التصنيف</th>
                <th>المتاجر</th>
                <th>الكوبونات</th>
                <th>الحالة</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {categories.map((cat) => <CategoryRow key={cat.id} category={cat} />)}
            </tbody>
          </table>
        </div>
        <div className="md:hidden divide-y divide-border">
          {categories.map((cat) => <CategoryCard key={cat.id} category={cat} />)}
        </div>
        {categories.length === 0 && <p className="text-center text-ink-muted py-10">لا توجد تصنيفات بعد.</p>}
      </div>
    </div>
  );
}
