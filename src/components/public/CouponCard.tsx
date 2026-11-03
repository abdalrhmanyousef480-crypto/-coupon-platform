"use client";

import { useState } from "react";
import Link from "next/link";
import { toast } from "sonner";
import { ExternalLink, ShieldCheck, Clock, Copy, ArrowLeft } from "lucide-react";
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
    manuallyVerifiedAt?: Date | null;
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
  size?: "default" | "lg" | "hub";
  /** حمّل شعار المتجر فورًا بدل lazy-load — فقط للكروت الظاهرة فوق الطية
   *  مباشرة (أول عناصر شبكة الرئيسية مثلًا)، تحسين لـ LCP. */
  priority?: boolean;
  /** size="lg" فقط: سطر صغير بأول الـ <h1> (عبارة البحث "كود خصم <المتجر>"
   *  لو عنوان الكوبون الحر ما فيها أصلًا — راجع storeCodePhrase بـ seo.ts). */
  headingEyebrow?: string;
  /** Only on the standalone coupon page, add a real code when the H1
   *  would otherwise be identical to the parent store's H1. */
  headingCode?: string;
  /** Optional canonical collection href for a coupon card inside its shared hub. */
  detailHref?: string;
  /** Hide summary in multi-offer hubs; full descriptions follow all cards. */
  hideDescription?: boolean;
  /** Use h2 for secondary full-size cards, preserving a single page h1. */
  headingTag?: "h1" | "h2";
  /** Original coupon within the collection. */
  hubPrimary?: boolean;
  /** Editorial title and short excerpt for collection cards. */
  hubTitle?: string;
  hubDescription?: string;
}

type CodePhase = "copy" | "store";

// كل روابط <Link> بهالملف prefetch={false}: الكارد بيترندر جوا شبكات
// كوبونات (الرئيسية، /coupons، صفحة الفئة/المتجر)، وكل كارت فيه 2-4 روابط —
// prefetch الافتراضي بيطلق RSC fetch منفصل لكل واحد فور دخوله الـ viewport،
// وهذا قاس فعليًا 47 طلب متزامن على الرئيسية لحالها (30 منها أخذت أكتر من
// 3 ثواني) بسبب صفحات مو محفوظة بكاش ISR بتعمل رندر سيرفر + Prisma كامل
// لكل طلب. نفس المنطق المطبّق بـ ContentCards.tsx.

export function CouponCard({ coupon, store, locale, showStore = true, className, size = "default", priority, headingEyebrow, headingCode, detailHref, hideDescription = false, headingTag = "h1", hubPrimary = false, hubTitle, hubDescription }: CouponCardProps) {
  const [phase, setPhase] = useState<CodePhase>("copy");
  const t = getTranslator(locale);

  const title = locale === "ar" ? coupon.titleAr : coupon.title;
  const desc = locale === "ar" ? coupon.descriptionAr : coupon.description;
  const expiring = isExpiringSoon(coupon.expiresAt);
  const LargeHeading = headingTag;

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

  if (size === "hub") {
    // Match store-page coupon cards: logo/status, distinct headline, brief
    // description, offer label and one easy-to-copy code. Scoped to collection
    // pages; legacy standalone coupon cards stay unchanged.
    const offerLabelIsSpecific = /(?:\d+\s*[%٪]|\d+\s*ريال|حسب السلة|شحن مجاني|توصيل مجاني)/i.test(coupon.discountLabel);
    return (
      <article className={cn(
        "group relative overflow-hidden rounded-xl border border-accent/25 bg-surface shadow-sm",
        className,
      )}>
        <span aria-hidden="true" className="absolute inset-x-0 top-0 h-[3px] bg-accent" />
        <div className="space-y-3.5 px-4 pb-4 pt-5 sm:px-6 sm:pb-5">
          <div className="flex items-start justify-between gap-3">
            {showStore ? (
              <Link href={"/store/" + store.slug} prefetch={false} className="inline-flex min-w-0 items-center gap-2.5">
                <StoreLogo name={store.name} logoUrl={store.logoUrl} size={32} priority={priority} className="h-10 w-10 shrink-0 rounded-lg" />
                <span className="line-clamp-1 text-sm font-semibold text-primary">{store.name}</span>
              </Link>
            ) : (
              <span className="text-xs font-semibold text-ink-muted">{hubPrimary ? "الكود الرئيسي" : "عرض إضافي"}</span>
            )}
            {coupon.isVerified && coupon.manuallyVerifiedAt ? (
              <span className="badge-success shrink-0 text-xs">
                <ShieldCheck className="h-3 w-3" /> {t("coupon.verified")}
              </span>
            ) : null}
          </div>
          <div>
            <h2 className="font-body text-[17px] font-bold leading-7 tracking-normal text-ink sm:text-lg">
              {hubTitle || title}
            </h2>
            <p className="mt-1.5 line-clamp-2 text-sm leading-6 text-ink-muted">
              {hubDescription || desc}
            </p>
          </div>
          {offerLabelIsSpecific && (
            <span className="inline-flex rounded-full bg-accent-soft px-3 py-1 text-xs font-bold text-accent">
              {coupon.discountLabel}
            </span>
          )}
        </div>
        {coupon.code ? (
          <div className="flex min-h-14 items-stretch border-t border-border bg-surface-alt">
            <div dir="ltr" className="flex min-w-0 flex-1 items-center justify-center px-4 py-3 font-mono text-xl font-extrabold tracking-wider text-primary sm:text-2xl">
              {coupon.code}
            </div>
            <button
              type="button"
              onClick={async () => {
                if (await copyToClipboard(coupon.code!.trim())) {
                  toast.success(t("coupon.codeCopiedToast"), { duration: 2000 });
                } else {
                  toast.error(t("coupon.copyFailed"));
                }
              }}
              aria-label={"نسخ كود " + coupon.code}
              className="inline-flex shrink-0 items-center justify-center gap-2 bg-primary px-5 py-3 text-sm font-bold text-white transition-colors hover:bg-primary-hover">
              <Copy className="h-4 w-4" /> نسخ
            </button>
          </div>
        ) : (
          <button type="button" onClick={handleUse}
            className="flex min-h-14 w-full items-center justify-center gap-2 bg-primary px-5 py-3 font-bold text-white hover:bg-primary-hover">
            <ExternalLink className="h-4 w-4" /> {t("coupon.getDeal")}
          </button>
        )}
        {coupon.code && (
          <button type="button" onClick={handleUse}
            className="flex w-full items-center justify-center gap-1.5 py-2.5 text-xs font-semibold text-accent hover:text-accent-hover">
            زيارة المتجر <ExternalLink className="h-3.5 w-3.5" />
          </button>
        )}
      </article>
    );
  }

  if (size === "lg") {
    return (
      <div
        className={cn(
          "group relative flex flex-col gap-5 overflow-hidden rounded-lg border border-accent/30 bg-surface p-7 shadow-sm transition-all duration-300 ease-out hover:-translate-y-1 hover:border-accent/50 hover:shadow-lg",
          className
        )}
      >
        <span className="absolute inset-x-0 top-0 h-[3px] bg-gradient-to-r from-accent via-accent-hover to-accent" />

        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-3.5">
            {showStore && (
              <Link href={`/store/${store.slug}`} prefetch={false} className="shrink-0 overflow-hidden rounded-lg ring-1 ring-border shadow-sm transition-transform duration-300 group-hover:scale-105">
                <StoreLogo name={store.name} logoUrl={store.logoUrl} size={40} priority={priority} className="h-16 w-16 rounded-lg" />
              </Link>
            )}
            {showStore && (
              <Link href={`/store/${store.slug}`} prefetch={false} className="min-w-0 truncate text-lg font-bold text-primary">
                {store.name}
              </Link>
            )}
          </div>

          <div className="flex shrink-0 flex-col items-end gap-1.5">
            {coupon.isVerified && coupon.manuallyVerifiedAt ? (
              <span className="badge-success px-3.5 py-1.5 text-[13px] shadow-sm">
                <ShieldCheck className="h-3.5 w-3.5" /> {t("coupon.verified")}
              </span>
            ) : coupon.isVerified ? (
              <span className="badge-neutral px-3.5 py-1.5 text-[13px]">
                {locale === "ar" ? "التوثيق قيد المراجعة" : "Verification pending review"}
              </span>
            ) : null}
            {expiring && (
              <span className="badge-warning px-3.5 py-1.5 text-[13px] shadow-sm">
                <Clock className="h-3.5 w-3.5" /> {expiryLabel(coupon.expiresAt, locale)}
              </span>
            )}
          </div>
        </div>

        {/* Primary info: title + code are the two things that matter —
            everything else (description, meta) is deliberately quieter.
            This "lg" card is only ever used once per page (the standalone
            coupon page's hero), so its title is that page's single <h1> —
            classes are pinned explicitly to keep the exact look the plain
            <Link> had, overriding the global h1 { font-display/letter-spacing }
            rule in globals.css. */}
        <div>
          <LargeHeading className="font-body text-xl font-bold leading-snug tracking-normal text-ink">
            {headingEyebrow && (
              <span className="mb-1.5 block text-sm font-extrabold text-accent">
                {headingEyebrow}
                <span className="sr-only"> — </span>
              </span>
            )}
            <Link
              href={detailHref || `/store/${store.slug}/coupon/${coupon.slug}`}
              prefetch={false}
              className="block transition-colors hover:text-accent"
            >
              {title}
              {headingCode && <span className="ms-1 text-accent"> {headingCode}</span>}
            </Link>
          </LargeHeading>
          {!hideDescription && <p className="mt-2.5 text-[15px] leading-relaxed text-ink-muted">{desc}</p>}
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
        "group relative flex h-full flex-col gap-3.5 overflow-hidden rounded-lg border border-accent/30 bg-surface p-[18px] shadow-sm transition-all duration-300 ease-out hover:-translate-y-1 hover:border-accent/50 hover:shadow-lg",
        className
      )}
    >
      {/* Accent wash + top bar — purely decorative, no new content */}
      <span className="absolute inset-x-0 top-0 h-[3px] bg-gradient-to-r from-accent via-accent-hover to-accent" />
      <div className="pointer-events-none absolute inset-x-0 top-0 h-20 bg-gradient-to-b from-accent-soft/70 to-transparent" />

      <div className="relative flex min-h-[46px] items-center justify-between gap-2">
        {/* min-w-0 is required here: without it this flex item's automatic
            min-width is its content's min-content size, which can force the
            row wider than the card and let the verified badge get clipped
            by the card's overflow-hidden — the classic flexbox min-size bug. */}
        <div className="flex min-w-0 items-center gap-3">
          {showStore && (
            <Link href={`/store/${store.slug}`} prefetch={false} className="shrink-0 overflow-hidden rounded-md ring-1 ring-border transition-transform duration-300 group-hover:scale-105">
              <StoreLogo name={store.name} logoUrl={store.logoUrl} size={32} priority={priority} className="h-[46px] w-[46px] rounded-md" />
            </Link>
          )}
          {showStore && (
            <Link href={`/store/${store.slug}`} prefetch={false} className="min-w-0 truncate text-sm font-bold text-primary">
              {store.name}
            </Link>
          )}
        </div>

        {coupon.isVerified && coupon.manuallyVerifiedAt ? (
          <span className="badge-success shrink-0 shadow-sm">
            <ShieldCheck className="h-3 w-3" /> {t("coupon.verified")}
          </span>
        ) : coupon.isVerified ? (
          <span className="badge-neutral shrink-0">{locale === "ar" ? "التوثيق قيد المراجعة" : "Verification pending review"}</span>
        ) : null}
      </div>

      {/* min-h reserves the full 2-line box (line-height × 2) regardless of
          actual line count, so a 1-line title never sits at a different
          height than a 2-line one across cards in the same row. */}
      <Link
        href={detailHref || `/store/${store.slug}/coupon/${coupon.slug}`}
        prefetch={false}
        className="line-clamp-2 min-h-[2.5rem] text-sm font-semibold leading-snug text-ink transition-colors hover:text-accent"
      >
        {title}
      </Link>
      {!hideDescription && <p className="line-clamp-2 min-h-[2.375rem] text-xs leading-relaxed text-ink-muted">{desc}</p>}
      <Link
        href={detailHref || `/store/${store.slug}/coupon/${coupon.slug}`}
        prefetch={false}
        className="-mt-1 inline-flex items-center gap-1 self-start text-xs font-bold text-accent transition-colors hover:text-accent-hover"
      >
        {t("coupon.viewDetails")}
        <ArrowLeft className={cn("h-3 w-3", locale === "en" && "rotate-180")} />
      </Link>

      <div className="flex min-h-[26px] flex-wrap items-center justify-between gap-2">
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

      {/* mt-auto pins the ticket-notch + code/button block to the card's
          bottom edge, absorbing any leftover height instead of letting it
          collect as a gap above the code area. */}
      <div className="coupon-perforation mt-auto" />

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
