import Link from "next/link";
import { buildMetadata } from "@/lib/seo";
import { SiteHeader } from "@/components/public/SiteHeader";
import { SiteFooter } from "@/components/public/SiteFooter";
import { ContactForm } from "@/components/public/ContactForm";
import { MessageCircle } from "lucide-react";
import type { Metadata } from "next";

export const metadata: Metadata = buildMetadata({
  title: "تواصل معنا — كوبون نور", description: "تواصل مع فريق كوبون نور لأي استفسار.", path: "/contact", locale: "ar",
});

export default function ContactPage() {
  const locale = "ar" as const;
  return (
    <>
      <SiteHeader locale={locale} />
      <main>
        <div className="max-w-container mx-auto px-5 pt-6">
          <nav className="flex items-center gap-1.5 text-[13px] text-ink-muted">
            <Link href="/" className="transition-colors hover:text-primary">الرئيسية</Link>
            <span className="text-ink-faint">‹</span>
            <span aria-current="page" className="text-ink">تواصل معنا</span>
          </nav>
        </div>

        {/* ---------- HERO ---------- */}
        <section className="relative overflow-hidden py-14 text-center md:py-20">
          <div aria-hidden="true" className="pointer-events-none absolute inset-0 -z-10">
            <div
              className="absolute inset-0"
              style={{ backgroundImage: "radial-gradient(rgba(20,33,61,0.07) 1px, transparent 1px)", backgroundSize: "26px 26px" }}
            />
            <div className="absolute -top-32 start-1/2 h-[440px] w-[440px] -translate-x-1/2 rounded-full bg-primary/[0.06] blur-3xl" />
            <div className="absolute top-4 end-[8%] h-72 w-72 rounded-full bg-accent/[0.10] blur-3xl" />
            <div className="absolute -bottom-20 start-[6%] h-64 w-64 rounded-full bg-primary/[0.05] blur-3xl" />
          </div>

          <div className="max-w-container mx-auto px-5">
            <span className="mb-6 inline-flex items-center gap-1.5 rounded-full bg-accent-soft px-4 py-1.5 text-xs font-bold text-accent ring-1 ring-inset ring-accent/15">
              <MessageCircle className="h-3.5 w-3.5" /> تواصل معنا
            </span>
            <h1 className="mx-auto mb-5 max-w-2xl text-[34px] font-extrabold leading-[1.15] tracking-tight sm:text-5xl">
              نحب نسمع منك
            </h1>
            <p className="mx-auto max-w-lg text-base text-ink-muted md:text-lg">
              سؤال، اقتراح، أو كوبون متوقف عن العمل — راسلنا وسنرد عليك بأقرب وقت.
            </p>
          </div>
        </section>

        {/* ---------- FORM ---------- */}
        <section className="px-5 pb-20">
          <ContactForm />
        </section>
      </main>
      <SiteFooter locale={locale} />
    </>
  );
}
