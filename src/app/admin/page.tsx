import Link from "next/link";
import { db } from "@/lib/db";
import { isExpiringSoon, expiryLabel } from "@/lib/utils";
import { Store, Tag, FolderTree, FileText, ShieldCheck, AlertTriangle, Plus } from "lucide-react";
import type { LucideIcon } from "lucide-react";

export default async function AdminDashboardPage() {
  const [
    storeCount, publishedStoreCount,
    couponCount, publishedCouponCount, verifiedCouponCount, unverifiedPublishedCount,
    categoryCount,
    articleCount, publishedArticleCount,
    expiringCandidates,
  ] = await Promise.all([
    db.store.count(),
    db.store.count({ where: { isPublished: true } }),
    db.coupon.count(),
    db.coupon.count({ where: { isPublished: true } }),
    db.coupon.count({ where: { isPublished: true, isVerified: true } }),
    db.coupon.count({ where: { isPublished: true, isVerified: false } }),
    db.category.count(),
    db.article.count(),
    db.article.count({ where: { status: "PUBLISHED" } }),
    db.coupon.findMany({
      where: { isPublished: true, expiresAt: { not: null } },
      include: { store: true },
      orderBy: { expiresAt: "asc" },
      take: 20,
    }),
  ]);

  const expiringSoon = expiringCandidates.filter((c) => isExpiringSoon(c.expiresAt)).slice(0, 5);

  return (
    <div>
      <h1 className="text-xl font-bold text-primary mb-1">لوحة التحكم</h1>
      <p className="text-ink-muted mb-6">نظرة سريعة على حالة الموقع الآن.</p>

      <div className="grid grid-cols-2 gap-4 mb-8 md:grid-cols-4">
        <StatCard href="/admin/stores" icon={Store} label="المتاجر" value={storeCount} sub={`${publishedStoreCount} منشور`} />
        <StatCard href="/admin/coupons" icon={Tag} label="الكوبونات" value={couponCount} sub={`${publishedCouponCount} منشور`} />
        <StatCard href="/admin/categories" icon={FolderTree} label="التصنيفات" value={categoryCount} />
        <StatCard href="/admin/articles" icon={FileText} label="المقالات" value={articleCount} sub={`${publishedArticleCount} منشور`} />
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <div className="card p-4 sm:p-6">
          <h2 className="font-bold text-primary mb-4 flex items-center gap-2">
            <AlertTriangle className="h-4 w-4 text-warning" /> يحتاج انتباه
          </h2>

          <div className="flex flex-wrap items-center justify-between gap-2 py-2.5 border-b border-border">
            <span className="text-sm text-ink-muted flex items-center gap-2">
              <ShieldCheck className="h-4 w-4 text-ink-faint shrink-0" /> كوبونات منشورة بدون توثيق
            </span>
            {unverifiedPublishedCount > 0 ? (
              <Link href="/admin/coupons" className="badge-warning">{unverifiedPublishedCount}</Link>
            ) : (
              <span className="badge-success">0</span>
            )}
          </div>

          <div className="pt-3.5">
            <div className="text-sm text-ink-muted mb-2.5">كوبونات تنتهي خلال 3 أيام</div>
            {expiringSoon.length === 0 ? (
              <p className="text-sm text-ink-faint">لا يوجد كوبونات قريبة من الانتهاء حاليًا.</p>
            ) : (
              <ul className="flex flex-col gap-1.5">
                {expiringSoon.map((coupon) => (
                  <li key={coupon.id}>
                    <Link
                      href={`/admin/coupons/${coupon.id}`}
                      className="flex items-center justify-between gap-2 rounded-md px-2.5 py-2 -mx-2.5 hover:bg-surface-alt transition-colors"
                    >
                      <span className="text-sm text-ink truncate min-w-0">{coupon.titleAr} <span className="text-ink-faint">— {coupon.store.name}</span></span>
                      <span className="badge-warning shrink-0">{expiryLabel(coupon.expiresAt, "ar")}</span>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>

        <div className="card p-4 sm:p-6">
          <h2 className="font-bold text-primary mb-4">إضافة سريعة</h2>
          <div className="grid grid-cols-2 gap-3">
            <QuickAddLink href="/admin/stores/new" icon={Store} label="متجر جديد" />
            <QuickAddLink href="/admin/coupons/new" icon={Tag} label="كوبون جديد" />
            <QuickAddLink href="/admin/categories/new" icon={FolderTree} label="تصنيف جديد" />
            <QuickAddLink href="/admin/articles/new" icon={FileText} label="مقال جديد" />
          </div>

          <div className="mt-5 pt-4 border-t border-border flex items-center gap-2 text-sm text-ink-muted">
            <ShieldCheck className="h-4 w-4 text-success shrink-0" />
            <span><strong className="text-ink font-semibold">{verifiedCouponCount}</strong> من {publishedCouponCount} كوبون منشور تم التحقق منه فعليًا</span>
          </div>
        </div>
      </div>
    </div>
  );
}

function StatCard({
  href, icon: Icon, label, value, sub,
}: { href: string; icon: LucideIcon; label: string; value: number; sub?: string }) {
  return (
    <Link href={href} className="card card-hover p-5 block">
      <div className="flex items-center justify-between mb-3">
        <span className="flex h-9 w-9 items-center justify-center rounded-md bg-accent-soft text-accent">
          <Icon className="h-[18px] w-[18px]" />
        </span>
      </div>
      <div className="text-2xl font-extrabold text-primary">{value}</div>
      <div className="text-xs text-ink-muted mt-0.5">{label}{sub ? ` — ${sub}` : ""}</div>
    </Link>
  );
}

function QuickAddLink({ href, icon: Icon, label }: { href: string; icon: LucideIcon; label: string }) {
  return (
    <Link
      href={href}
      className="flex items-center gap-2 rounded-md border border-border-strong px-3.5 py-2.5 text-sm font-medium text-primary hover:border-accent hover:bg-accent-soft/40 transition-colors"
    >
      <Plus className="h-4 w-4 text-accent shrink-0" />
      <Icon className="h-4 w-4 text-ink-faint shrink-0" />
      {label}
    </Link>
  );
}
