import { db } from "@/lib/db";
import { AdminPageHeader } from "@/components/admin/AdminPageHeader";
import { StoreRow, StoreCard } from "@/components/admin/StoreRow";

export default async function AdminStoresPage() {
  const stores = await db.store.findMany({
    orderBy: { createdAt: "desc" },
    include: { category: true, _count: { select: { coupons: true } } },
  });

  return (
    <div>
      <AdminPageHeader title="المتاجر" count={stores.length} newHref="/admin/stores/new" newLabel="إضافة متجر" />
      <div className="card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="data-table">
            <thead>
              <tr className="hidden md:table-row">
                <th>المتجر</th>
                <th>التصنيف</th>
                <th>الكوبونات</th>
                <th>الحالة</th>
                <th>مميز</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {stores.map((store) => (
                <StoreRow key={store.id} store={store} />
              ))}
            </tbody>
          </table>
        </div>
        <div className="md:hidden divide-y divide-border">
          {stores.map((store) => (
            <StoreCard key={store.id} store={store} />
          ))}
        </div>
        {stores.length === 0 && (
          <p className="text-center text-ink-muted py-10">لا توجد متاجر بعد. أضف أول متجر للبدء.</p>
        )}
      </div>
    </div>
  );
}
