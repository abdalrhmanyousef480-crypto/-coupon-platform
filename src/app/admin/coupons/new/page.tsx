import { db } from "@/lib/db";
import { AdminPageHeader } from "@/components/admin/AdminPageHeader";
import { CouponForm } from "@/components/admin/CouponForm";

export default async function NewCouponPage() {
  const [stores, categories] = await Promise.all([
    db.store.findMany({ orderBy: { name: "asc" } }),
    db.category.findMany({ orderBy: { nameAr: "asc" } }),
  ]);
  return (
    <div>
      <AdminPageHeader title="إضافة كوبون جديد" />
      <CouponForm stores={stores} categories={categories} />
    </div>
  );
}
