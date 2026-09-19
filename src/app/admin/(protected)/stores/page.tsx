import { db } from "@/lib/db";
import { storeCategoriesInclude } from "@/lib/store-categories";
import { AdminPageHeader } from "@/components/admin/AdminPageHeader";
import { StoreSearchList } from "@/components/admin/StoreSearchList";

export default async function AdminStoresPage() {
  const stores = await db.store.findMany({
    orderBy: { createdAt: "desc" },
    include: { ...storeCategoriesInclude, _count: { select: { coupons: true } } },
  });

  return (
    <div>
      <AdminPageHeader title="المتاجر" count={stores.length} newHref="/admin/stores/new" newLabel="إضافة متجر" />
      <StoreSearchList stores={stores} />
    </div>
  );
}
