import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { AdminPageHeader } from "@/components/admin/AdminPageHeader";
import { StoreForm } from "@/components/admin/StoreForm";

export default async function EditStorePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [store, categories] = await Promise.all([
    db.store.findUnique({ where: { id } }),
    db.category.findMany({ orderBy: { nameAr: "asc" }, select: { id: true, nameAr: true } }),
  ]);
  if (!store) notFound();

  return (
    <div>
      <AdminPageHeader title={`تعديل: ${store.name}`} />
      <StoreForm categories={categories} store={store} />
    </div>
  );
}
