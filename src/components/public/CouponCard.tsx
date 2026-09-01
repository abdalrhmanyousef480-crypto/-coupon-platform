"use client";

import { useState } from "react";
import Link from "next/link";
import { toast } from "sonner";
import { ExternalLink, ShieldCheck, Clock, Copy } from "lucide-react";
import { cn, copyToClipboard, expiryLabel, isExpiringSoon } from "@/lib/utils";
import { trackCouponClick } from "@/lib/actions";
import { getTranslator } from "@/lib/i18n";
import { StoreLogo } from "@/components/ui/StoreLogo";
import { CouponCode } from "@/components/public/CouponCode";

type Locale = "ar" | "en";

interface CouponCardProps {
  coupon: {
    id: string;
    slug: string;
    type: "CODE" | "DEAL" | "CASHBACK";
    code: string | null;
    discountLabel: string;
    title: string;
    titleAr: string;
    description: string;
    descriptionAr: string;
    isVerified: boolean;
    isFeatured: boolean;
    expiresAt: Date | null;
    storeUrl: string;
    affiliateUrl: string | null;
  };
  store: { slug: string; name: string; logoUrl: string };
  locale: Locale;
  showStore?: boolean;
  className?: string;
  /** "lg" renders a larger, single-card layout for standalone/hero use
   *  (e.g. the individual coupon page) — same one-card structure as the
   *  default grid card, just bigger and more spacious throughout. */
  size?: "default" | "lg";
  /** حمّل شعار المتجر فورًا بدل lazy-load — فقط للكروت الظاهرة فوق الطية
   *  مباشرة (أول عناصر شبكة الرئيسية مثلًا)، تحسين لـ LCP. */
  priority?: boolean;
}

type CodePhase = "copy" | "store";

export function CouponCard({ coupon, store, locale, showStore = true, className, size = "default", priority }: CouponCardProps) {
  const [phase, setPhase] = useState<CodePhase>("copy");
  const t = getTranslator(locale);

  const title = locale === "ar" ? coupon.titleAr : coupon.title;
  const desc = locale === "ar" ? coupon.descriptionAr : coupon.description;
  const expiring = isExpiringSoon(coupon.expiresAt);

  async function handleCopy() {
    if (!coupon.code || phase !== "copy") return;
    const success = await copyToClipboard(coupon.code.trim());
    if (success) {
      toast.success(t("coupon.codeCopiedToast"), { duration: 2000 });
      setPhase("store");
    } else {
      toast.error(t("coupon.copyFailed"));
    }
  }

  async function handleUse() {
    trackCouponClick(coupon.id).catch(() => {});
    window.open(coupon.affiliateUrl || coupon.storeUrl, "_blank", "noopener,noreferrer");
  }

  if (size === "lg") {
    return (
      <div
        className={cn(
          "group relative flex flex-col gap-5 overflow-hidden rounded-lg border bg-surface p-7 shadow-sm transition-all duration-300 ease-out hover:-translate-y-1 hover:shadow-lg",
          coupon.isFeatured ? "border-accent/30 hover:border-accent/50" : "border-border hover:border-border-strong",
          className
        )}
      >
        {coupon.isFeatured && (
          <span className="absolute inset-x-0 top-0 h-[3px] bg-gradient-to-r from-accent via-accent-hover to-accent" />
        )}

        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-3.5">
            {showStore && (
              <Link href={`/store/${store.slug}`} className="shrink-0 overflow-hidden rounded-lg ring-1 ring-border shadow-sm transition-transform duration-300 group-hover:scale-105">
                <StoreLogo name={store.name} logoUrl={store.logoUrl} size={40} priority={priority} className="h-16 w-16 rounded-lg" />
              </Link>
            )}
            {showStore && (
              <Link href={`/store/${store.slug}`} className="min-w-0 truncate text-lg font-bold text-primary">
                {store.name}
              </Link>
            )}
          </div>

          <div className="flex shrink-0 flex-col items-end gap-1.5">
            {coupon.isVerified && (
              <span className="badge-success px-3.5 py-1.5 text-[13px] shadow-sm">
                <ShieldCheck className="h-3.5 w-3.5" /> {t("coupon.verified")}
              </span>
            )}
            {expiring && (
              <span className="badge-warning px-3.5 py-1.5 text-[13px] shadow-sm">
                <Clock className="h-3.5 w-3.5" /> {expiryLabel(coupon.expiresAt, locale)}
              </span>
            )}
          </div>
        </div>

        {/* Primary info: title + code are the two things that matter —
            everything else (description, meta) is deliberately quieter. */}
        <div>
          <Link
            href={`/store/${store.slug}/coupon/${coupon.slug}`}
            className="block text-xl font-bold leading-snug text-ink transition-colors hover:text-accent"
          >
            {title}
          </Link>
          <p className="mt-2.5 text-[15px] leading-relaxed text-ink-muted">{desc}</p>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <span className="badge-neutral px-3.5 py-1.5 text-[13px]">{t(`coupon.type.${coupon.type.toLowerCase()}`)}</span>
            <span className="inline-flex items-center rounded-full bg-accent-soft px-3.5 py-1.5 text-[13px] font-extrabold text-accent ring-1 ring-inset ring-accent/15">
              {coupon.discountLabel}
            </span>
          </div>
          {!expiring && coupon.expiresAt && (
            <span className="text-xs text-ink-faint">{expiryLabel(coupon.expiresAt, locale)}</span>
          )}
        </div>

        {coupon.code ? (
          <div className="-mx-7 -mb-7 mt-1 flex overflow-hidden">
            <div className="flex min-w-0 flex-1 items-center justify-center border-e border-border bg-surface-alt px-4 py-6 sm:px-6 sm:py-7">
              <CouponCode code={coupon.code} variant="lg" />
            </div>
            <button
              type="button"
              onClick={phase === "store" ? handleUse : handleCopy}
              aria-label={phase === "copy" ? t("coupon.copyAction") : t("coupon.goToStore")}
              className={cn(
                "flex shrink-0 items-center gap-2 px-5 py-6 text-base font-bold text-white transition-colors duration-300 ease-out active:scale-[0.98] sm:px-8 sm:py-7",
                phase === "store" ? "bg-accent hover:bg-accent-hover" : "bg-primary hover:bg-primary-hover"
              )}
            >
              <span key={phase} className="flex animate-coupon-pop items-center gap-2">
                {phase === "copy" ? <Copy className="h-5 w-5" /> : <ExternalLink className="h-5 w-5" />}
                {phase === "copy" ? t("coupon.copyAction") : t("coupon.goToStore")}
              </span>
            </button>
          </div>
        ) : (
          <button
            type="button"
            onClick={handleUse}
            className="-mx-7 -mb-7 mt-1 flex w-[calc(100%+56px)] items-center justify-center gap-2 bg-primary py-7 text-base font-bold text-white transition-colors duration-300 ease-out hover:bg-primary-hover active:scale-[0.98]"
          >
            <ExternalLink className="h-5 w-5" /> {t("coupon.getDeal")}
          </button>
        )}
      </div>
    );
  }

  return (
    <div
      className={cn(
        "group relative flex flex-col gap-3.5 overflow-hidden rounded-lg border bg-surface p-[18px] shadow-sm transition-all duration-300 ease-out hover:-translate-y-1 hover:shadow-lg",
        coupon.isFeatured ? "border-accent/30 hover:border-accent/50" : "border-border hover:border-border-strong",
        className
      )}
    >
      {/* Featured accent wash + top bar — purely decorative, no new content */}
      {coupon.isFeatured && (
        <>
          <span className="absolute inset-x-0 top-0 h-[3px] bg-gradient-to-r from-accent via-accent-hover to-accent" />
          <div className="pointer-events-none absolute inset-x-0 top-0 h-20 bg-gradient-to-b from-accent-soft/70 to-transparent" />
        </>
      )}

      <div className="relative flex items-start justify-between gap-2">
        <div className="flex items-center gap-3">
          {showStore && (
            <Link href={`/store/${store.slug}`} className="shrink-0 overflow-hidden rounded-md ring-1 ring-border transition-transform duration-300 group-hover:scale-105">
              <StoreLogo name={store.name} logoUrl={store.logoUrl} size={32} priority={priority} className="h-[46px] w-[46px] rounded-md" />
            </Link>
          )}
          {showStore && (
            <Link href={`/store/${store.slug}`} className="min-w-0 truncate text-sm font-bold text-primary">
              {store.name}
            </Link>
          )}
        </div>

        {coupon.isVerified && (
          <span className="badge-success shrink-0 shadow-sm">
            <ShieldCheck className="h-3 w-3" /> {t("coupon.verified")}
          </span>
        )}
      </div>

      <Link
        href={`/store/${store.slug}/coupon/${coupon.slug}`}
        className="line-clamp-2 text-sm font-semibold leading-snug text-ink transition-colors hover:text-accent"
      >
        {title}
      </Link>
      <p className="line-clamp-2 text-xs leading-relaxed text-ink-muted">{desc}</p>

      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <span className="badge-neutral">{t(`coupon.type.${coupon.type.toLowerCase()}`)}</span>
          <span className="font-display text-base font-extrabold tracking-tight text-accent">{coupon.discountLabel}</span>
        </div>
        {coupon.expiresAt && (
          expiring ? (
            <span className="inline-flex items-center gap-1 text-xs font-semibold text-warning">
              <Clock className="h-3 w-3" /> {expiryLabel(coupon.expiresAt, locale)}
            </span>
          ) : (
            <span className="text-xs text-ink-faint">{expiryLabel(coupon.expiresAt, locale)}</span>
          )
        )}
      </div>

      <div className="coupon-perforation" />

      {coupon.code ? (
        <div className="flex min-h-[64px] -mx-[18px] -mb-[18px] overflow-hidden">
          <div className="flex min-w-0 flex-1 items-center justify-center border-e border-dashed border-border-strong bg-surface-alt px-4 py-3.5">
            <CouponCode code={coupon.code} variant="default" />
          </div>
          <button
            type="button"
            onClick={phase === "store" ? handleUse : handleCopy}
            aria-label={phase === "copy" ? t("coupon.copyAction") : t("coupon.goToStore")}
            title={phase === "copy" ? t("coupon.copyAction") : t("coupon.goToStore")}
            className={`flex shrink-0 items-center gap-1.5 px-5 py-3.5 text-sm font-bold text-white transition-colors duration-300 ease-out active:scale-[0.98] ${
              phase === "store" ? "bg-accent hover:bg-accent-hover" : "bg-primary hover:bg-primary-hover"
            }`}
          >
            <span key={phase} className="flex animate-coupon-pop items-center gap-1.5">
              {phase === "copy" ? <Copy className="h-4 w-4" /> : <ExternalLink className="h-4 w-4" />}
              {phase === "copy" ? t("coupon.copyAction") : t("coupon.goToStore")}
            </span>
          </button>
        </div>
      ) : (
        <button
          onClick={handleUse}
          className="flex min-h-[64px] w-[calc(100%+36px)] -mx-[18px] -mb-[18px] items-center justify-center gap-2 bg-primary py-3.5 text-base font-bold text-white transition-all duration-200 hover:bg-primary-hover active:scale-[0.99]"
        >
          <ExternalLink className="h-[18px] w-[18px]" /> {t("coupon.getDeal")}
        </button>
      )}
    </div>
  );
}
