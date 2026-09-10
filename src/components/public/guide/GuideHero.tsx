import Link from "next/link";
import { Sparkles, ArrowLeft } from "lucide-react";
import { StoreLogo } from "@/components/ui/StoreLogo";

/** رأس صفحة الدليل — Badge + H1 + وصف قصير + تاريخ آخر تحديث + CTA
 *  لصفحة الكوبون. بدون gradient/animation/فيديو مبالغ فيه — خلفية
 *  ثابتة هادئة بنفس لغة باقي صفحات الموقع (راجع صفحة الكوبون/المتجر). */
export function GuideHero({
  badge, title, description, updatedLabel, ctaLabel, ctaHref, store,
}: {
  badge: string;
  title: string;
  description: string;
  updatedLabel: string;
  ctaLabel: string;
  ctaHref: string;
  store: { name: string; logoUrl: string };
}) {
  return (
    <div className="relative overflow-hidden bg-surface pt-10 pb-12 md:pt-14 md:pb-16">
      <div aria-hidden="true" className="pointer-events-none absolute inset-0 -z-10">
        <div className="absolute -top-24 end-[10%] h-72 w-72 rounded-full bg-accent/[0.06] blur-3xl" />
        <div className="absolute -bottom-28 start-[8%] h-64 w-64 rounded-full bg-primary/[0.04] blur-3xl" />
      </div>
      <span aria-hidden="true" className="absolute inset-x-0 bottom-0 h-px bg-gradient-to-r from-transparent via-border-strong to-transparent" />

      <div className="max-w-container mx-auto px-5">
        <div className="mx-auto flex max-w-3xl flex-col items-center gap-5 text-center">
          <div className="flex items-center gap-3">
            <StoreLogo name={store.name} logoUrl={store.logoUrl} size={44} className="h-14 w-14 rounded-xl ring-1 ring-border shadow-sm" />
            <span className="badge-accent">
              <Sparkles className="h-3 w-3" /> {badge}
            </span>
          </div>

          <h1 className="text-[32px] font-extrabold leading-[1.2] tracking-tight text-primary md:text-4xl">{title}</h1>
          <p className="max-w-2xl text-[15px] leading-relaxed text-ink-muted">{description}</p>
          <p className="text-xs text-ink-faint">{updatedLabel}</p>

          <Link href={ctaHref} className="btn-primary btn-lg group">
            {ctaLabel}
            <ArrowLeft className="h-4 w-4 transition-transform duration-200 group-hover:-translate-x-0.5" />
          </Link>
        </div>
      </div>
    </div>
  );
}
