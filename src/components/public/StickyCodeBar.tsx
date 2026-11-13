"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { ArrowUpLeft, Check, Copy } from "lucide-react";
import { copyToClipboard } from "@/lib/utils";
import { trackCouponClick } from "@/lib/actions";

interface StickyCodeBarProps {
  couponId: string;
  code: string | null;
  storeName: string;
  href: string;
  /** id of the main code card: the bar shows once it has scrolled off the top. */
  targetId: string;
}

/**
 * Mobile-only bar pinned to the bottom of the store page. Appears after the
 * visitor scrolls past the main code card (reading shipping/FAQ) and hides
 * again over the footer, so copy + "go to store" are always one tap away.
 */
export function StickyCodeBar({ couponId, code, storeName, href, targetId }: StickyCodeBarProps) {
  const trimmed = code?.trim() || null;
  const [pastCard, setPastCard] = useState(false);
  const [footerVisible, setFooterVisible] = useState(false);
  const [copied, setCopied] = useState(false);
  const show = pastCard && !footerVisible;

  useEffect(() => {
    const card = document.getElementById(targetId);
    const footer = document.querySelector("footer");
    const observers: IntersectionObserver[] = [];
    if (card) {
      const io = new IntersectionObserver(([e]) => setPastCard(!e.isIntersecting && e.boundingClientRect.top < 0));
      io.observe(card);
      observers.push(io);
    }
    if (footer) {
      const io = new IntersectionObserver(([e]) => setFooterVisible(e.isIntersecting));
      io.observe(footer);
      observers.push(io);
    }
    return () => observers.forEach((o) => o.disconnect());
  }, [targetId]);

  // Lets the scroll-to-top button move above the bar.
  useEffect(() => {
    const root = document.documentElement;
    if (show) root.dataset.stickyBar = "1";
    else delete root.dataset.stickyBar;
    return () => { delete root.dataset.stickyBar; };
  }, [show]);

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

  return (
    <div
      aria-hidden={!show}
      className={`fixed inset-x-0 bottom-0 z-40 border-t border-border bg-surface/95 px-4 pt-3 shadow-lg backdrop-blur transition-transform duration-300 ease-out md:hidden ${show ? "translate-y-0" : "pointer-events-none translate-y-full"}`}
      style={{ paddingBottom: "calc(env(safe-area-inset-bottom) + 12px)" }}
    >
      <div className="flex h-12 gap-2">
        {trimmed && (
          <button
            type="button"
            onClick={handleCopy}
            tabIndex={show ? 0 : -1}
            className={`flex min-w-0 flex-1 items-center justify-center gap-2 rounded-md border border-dashed px-3 font-extrabold transition-colors ${copied ? "border-success bg-success text-white" : "border-border-strong bg-surface-alt text-primary"}`}
          >
            <span dir="ltr" className="truncate font-code text-[17px] tracking-[0.12em]">{trimmed}</span>
            {copied
              ? <Check className="h-4 w-4 shrink-0" aria-hidden="true" />
              : <Copy className="h-4 w-4 shrink-0 text-accent" aria-hidden="true" />}
            <span className="sr-only">{copied ? "تم النسخ" : "نسخ الكود"}</span>
          </button>
        )}
        <a
          href={href}
          target="_blank"
          rel="nofollow sponsored noopener noreferrer"
          tabIndex={show ? 0 : -1}
          onClick={() => { trackCouponClick(couponId).catch(() => {}); }}
          className={`flex items-center justify-center gap-1.5 rounded-md bg-accent px-4 text-[14px] font-extrabold text-white transition-colors hover:bg-accent-hover ${trimmed ? "shrink-0" : "flex-1"}`}
        >
          {trimmed ? "روح للمتجر" : `الذهاب إلى متجر ${storeName}`} <ArrowUpLeft className="h-4 w-4" aria-hidden="true" />
        </a>
      </div>
    </div>
  );
}
