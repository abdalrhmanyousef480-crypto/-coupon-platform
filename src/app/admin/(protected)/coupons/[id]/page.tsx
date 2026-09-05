import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { AdminPageHeader } from "@/components/admin/AdminPageHeader";
import { CouponForm } from "@/components/admin/CouponForm";

export default async function EditCouponPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [coupon, stores, categories] = await Promise.all([
    db.coupon.findUnique({ where: { id } }),
    db.store.findMany({ orderBy: { name: "asc" }, select: { id: true, name: true, website: true, categoryId: true, descriptionAr: true } }),
    db.category.findMany({ orderBy: { nameAr: "asc" }, select: { id: true, nameAr: true } }),
  ]);
  if (!coupon) notFound();

  return (
    <div>
      <AdminPageHeader title={`تعديل: ${coupon.titleAr}`} />
      <CouponForm stores={stores} categories={categories} coupon={coupon} />
    </div>
  );
}
