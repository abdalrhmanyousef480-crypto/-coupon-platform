import { db } from "@/lib/db";
import { AdminPageHeader } from "@/components/admin/AdminPageHeader";
import { StoreForm } from "@/components/admin/StoreForm";

export default async function NewStorePage() {
  const categories = await db.category.findMany({ orderBy: { nameAr: "asc" } });
  return (
    <div>
      <AdminPageHeader title="إضافة متجر جديد" />
      <StoreForm categories={categories} />
    </div>
  );
}
