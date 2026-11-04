"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Copy, ExternalLink } from "lucide-react";
import { cn, copyToClipboard } from "@/lib/utils";
import { trackCouponClick } from "@/lib/actions";

interface HubCodeActionsProps {
  couponId: string;
  code: string | null;
  storeName: string;
  /** Affiliate destination when set, otherwise the merchant URL. */
  href: string;
  variant?: "primary" | "secondary";
}

/**
 * The single button of a code card on the unified store page: it copies the
 * code first, then turns into the "go to store" link. A deal without a code
 * shows the store link straight away.
 */
export function HubCodeActions({ couponId, code, storeName, href, variant = "primary" }: HubCodeActionsProps) {
  const trimmed = code?.trim() || null;
  const [copied, setCopied] = useState(!trimmed);
  const big = variant === "primary";

  async function handleCopy() {
    if (!trimmed) return;
    const ok = await copyToClipboard(trimmed);
    if (ok) {
      toast.success(`تم نسخ الكود ${trimmed}`, { duration: 2000 });
      setCopied(true);
    } else {
      toast.error("تعذّر النسخ، انسخ الكود يدويًا");
    }
  }

  function handleGo() {
    trackCouponClick(couponId).catch(() => {});
  }

  return (
    <div className={cn("flex gap-3", big ? "flex-col sm:flex-row" : "flex-row")}>
      {trimmed && (
        <div
          className={cn(
            "flex min-w-0 flex-1 items-center justify-center rounded-md border-2 border-dashed border-accent bg-accent-soft/60",
            big ? "h-16" : "h-12",
          )}
        >
          <span
            dir="ltr"
            className={cn("select-all truncate px-3 font-code font-bold text-accent", big ? "text-[26px] tracking-[0.18em]" : "text-lg tracking-[0.14em]")}
          >
            {trimmed}
          </span>
        </div>
      )}
      {!copied ? (
        <button
          type="button"
          onClick={handleCopy}
          className={cn(
            "flex flex-1 items-center justify-center gap-2 rounded-md font-extrabold transition-colors",
            big
              ? "h-16 bg-primary text-[17px] text-white hover:bg-primary-hover"
              : "h-12 border-2 border-primary bg-surface text-[15px] text-primary hover:bg-surface-alt",
          )}
        >
          {big && <Copy className="h-[18px] w-[18px]" aria-hidden="true" />}
          نسخ الكوبون
        </button>
      ) : (
        <a
          href={href}
          target="_blank"
          rel="nofollow sponsored noopener noreferrer"
          onClick={handleGo}
          className={cn(
            "flex flex-1 items-center justify-center gap-2 rounded-md bg-accent font-extrabold text-white transition-colors hover:bg-accent-hover",
            big ? "h-16 text-[17px]" : "h-12 text-[15px]",
          )}
        >
          {big ? `الذهاب إلى متجر ${storeName}` : "الذهاب للمتجر"}
          <ExternalLink className="h-4 w-4" aria-hidden="true" />
        </a>
      )}
    </div>
  );
}
