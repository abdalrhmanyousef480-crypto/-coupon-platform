import Link from "next/link";
import { db } from "@/lib/db";
import { NewStoreForm } from "@/components/admin/NewStoreForm";

export default async function NewStorePage() {
  const categories = await db.category.findMany({ orderBy: { nameAr: "asc" }, select: { id: true, nameAr: true } });
  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-1">
        <nav aria-label="مسار الصفحة" className="flex items-center gap-2 text-sm text-ink-muted">
          <Link href="/admin/stores" className="hover:text-primary">المتاجر والأكواد</Link>
          <span aria-hidden="true">‹</span>
          <span className="font-bold text-ink">متجر جديد</span>
        </nav>
        <h1 className="text-2xl font-extrabold text-ink sm:text-[28px]">متجر جديد مع كوده</h1>
        <p className="text-[15px] text-ink-muted">نموذج واحد وحفظ واحد — المتجر وكوده الأول معًا.</p>
      </div>
      <NewStoreForm categories={categories} />
    </div>
  );
}
