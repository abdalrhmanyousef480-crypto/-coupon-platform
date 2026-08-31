import { db } from "@/lib/db";
import { AdminPageHeader } from "@/components/admin/AdminPageHeader";
import { CouponRow } from "@/components/admin/CouponRow";

export default async function AdminCouponsPage() {
  const coupons = await db.coupon.findMany({
    orderBy: { createdAt: "desc" },
    include: { store: true },
  });

  return (
    <div>
      <AdminPageHeader title="الكوبونات" count={coupons.length} newHref="/admin/coupons/new" newLabel="إضافة كوبون" />
      <div className="card overflow-x-auto">
        <table className="data-table">
          <thead>
            <tr>
              <th>الكوبون</th>
              <th>المتجر</th>
              <th>النوع</th>
              <th>موثّق</th>
              <th>الحالة</th>
              <th>الانتهاء</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {coupons.map((coupon) => (
              <CouponRow key={coupon.id} coupon={coupon} />
            ))}
          </tbody>
        </table>
        {coupons.length === 0 && (
          <p className="text-center text-ink-muted py-10">لا توجد كوبونات بعد. أضف أول كوبون للبدء.</p>
        )}
      </div>
    </div>
  );
}
