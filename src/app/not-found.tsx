import Link from "next/link";
import { SiteHeader } from "@/components/public/SiteHeader";
import { SiteFooter } from "@/components/public/SiteFooter";
import { AlertCircle } from "lucide-react";

export default function NotFound() {
  const locale = "ar" as const;
  return (
    <>
      <SiteHeader locale={locale} />
      <main className="max-w-container mx-auto px-5 py-24 flex flex-col items-center text-center gap-3">
        <AlertCircle className="h-12 w-12 text-ink-faint" />
        <h1 className="text-2xl">الصفحة غير موجودة</h1>
        <p className="text-ink-muted">الصفحة التي تبحث عنها غير متاحة أو تم نقلها.</p>
        <Link href="/" className="btn-primary mt-2">العودة للرئيسية</Link>
      </main>
      <SiteFooter locale={locale} />
    </>
  );
}
