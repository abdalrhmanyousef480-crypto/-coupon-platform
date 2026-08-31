import { db } from "@/lib/db";

// ============================================================
// يُستدعى من داخل أي صفحة ديناميكية (store/[slug], coupon، إلخ)
// قبل استدعاء notFound() — لو فيه Redirect محفوظ لهذا المسار
// القديم (لأنه اتغيّر من الأدمن)، نرجّعه بدل ما نعرض 404 ونخسر
// الفهرسة القديمة. راجع قسم 38 بالبرومبت.
// ============================================================
export async function findRedirect(fromPath: string) {
  const redirect = await db.redirect.findUnique({ where: { fromPath } });
  return redirect;
}
