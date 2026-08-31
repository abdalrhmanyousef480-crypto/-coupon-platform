import { SiteHeader } from "@/components/public/SiteHeader";
import { SiteFooter } from "@/components/public/SiteFooter";
import Link from "next/link";

export function StaticPage({ title, children }: { title: string; children: React.ReactNode }) {
  const locale = "ar" as const;
  return (
    <>
      <SiteHeader locale={locale} />
      <main className="max-w-container mx-auto px-5 py-8">
        <nav className="flex items-center gap-1.5 text-[13px] text-ink-muted mb-5">
          <Link href="/">الرئيسية</Link>
          <span className="text-ink-faint">‹</span>
          <span aria-current="page">{title}</span>
        </nav>
        <h1 className="text-2xl mb-6">{title}</h1>
        <div className="prose max-w-[720px]">{children}</div>
      </main>
      <SiteFooter locale={locale} />
    </>
  );
}
