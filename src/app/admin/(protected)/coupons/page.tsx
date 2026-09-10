import { db } from "@/lib/db";
import { AdminPageHeader } from "@/components/admin/AdminPageHeader";
import { CouponSearchList } from "@/components/admin/CouponSearchList";

export default async function AdminCouponsPage() {
  const coupons = await db.coupon.findMany({
    orderBy: { createdAt: "desc" },
    include: { store: true },
  });

  return (
    <div>
      <AdminPageHeader title="الكوبونات" count={coupons.length} newHref="/admin/coupons/new" newLabel="إضافة كوبون" />
      <CouponSearchList coupons={coupons} />
    </div>
  );
}
