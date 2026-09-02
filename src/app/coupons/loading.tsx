import { SiteHeader } from "@/components/public/SiteHeader";
import { SiteFooter } from "@/components/public/SiteFooter";

// نعرض SiteHeader/SiteFooter هون كمان (زي أي صفحة عامة تانية بالموقع —
// ما فيه layout مشترك بينهم، راجع src/app/layout.tsx) عشان ما يختفوا
// للحظة وقت التنقل ثم يرجعوا يظهروا بعد التحميل.
export default function CouponsLoading() {
  const locale = "ar" as const;
  return (
    <>
      <SiteHeader locale={locale} />
      <main className="max-w-container mx-auto px-5 py-9">
        <div className="mb-1.5 h-8 w-40 animate-pulse rounded-md bg-surface-alt" />
        <div className="mb-7 h-4 w-64 animate-pulse rounded-md bg-surface-alt" />
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 md:grid-cols-3">
          {Array.from({ length: 9 }).map((_, i) => (
            <div key={i} className="h-64 animate-pulse rounded-lg border border-border bg-surface-alt" />
          ))}
        </div>
      </main>
      <SiteFooter locale={locale} />
    </>
  );
}
