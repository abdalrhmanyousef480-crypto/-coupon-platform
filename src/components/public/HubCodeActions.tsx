"use client";

import { useLayoutEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { Check, Copy, ArrowUpLeft } from "lucide-react";
import { copyToClipboard } from "@/lib/utils";
import { trackCouponClick } from "@/lib/actions";

interface HubCodeActionsProps {
  couponId: string;
  code: string | null;
  storeName: string;
  /** Affiliate destination when set, otherwise the merchant URL. */
  href: string;
}

/**
 * Code + copy as one segmented control. After copying, the button turns into
 * "تم النسخ" and a "go to store" link appears under it. A deal without a code
 * shows the store link straight away.
 */
export function HubCodeActions({ couponId, code, storeName, href }: HubCodeActionsProps) {
  const trimmed = code?.trim() || null;
  const [copied, setCopied] = useState(!trimmed);
  const boxRef = useRef<HTMLDivElement>(null);
  const textRef = useRef<HTMLSpanElement>(null);

  // Long codes shrink to fit on one line instead of being cut ("DGK08…").
  useLayoutEffect(() => {
    const box = boxRef.current;
    const text = textRef.current;
    if (!box || !text) return;
    const fit = () => {
      let size = 26;
      let spacing = 0.2;
      text.style.fontSize = `${size}px`;
      text.style.letterSpacing = `${spacing}em`;
      while (size > 13 && text.scrollWidth > box.clientWidth) {
        if (spacing > 0.04) spacing = Math.max(0.04, spacing - 0.04);
        else size -= 1;
        text.style.fontSize = `${size}px`;
        text.style.letterSpacing = `${spacing}em`;
      }
    };
    fit();
    const observer = new ResizeObserver(fit);
    observer.observe(box);
    let cancelled = false;
    document.fonts?.ready?.then(() => { if (!cancelled) fit(); });
    return () => { cancelled = true; observer.disconnect(); };
  }, [trimmed]);

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
    <div className="space-y-3">
      {trimmed && (
        <div className="flex h-[60px] gap-1.5 rounded-md border border-dashed border-border-strong bg-surface-alt p-1.5">
          <div ref={boxRef} className="flex min-w-0 flex-1 items-center justify-center overflow-hidden px-2">
            <span ref={textRef} dir="ltr" className="select-all whitespace-nowrap font-code text-[26px] font-bold tracking-[0.2em] text-primary">
              {trimmed}
            </span>
          </div>
          {copied ? (
            <span className="flex w-[118px] shrink-0 items-center justify-center gap-1.5 rounded-[10px] bg-success text-[15px] font-extrabold text-white" role="status">
              تم النسخ <Check className="h-4 w-4" aria-hidden="true" />
            </span>
          ) : (
            <button
              type="button"
              onClick={handleCopy}
              className="flex w-[118px] shrink-0 items-center justify-center gap-1.5 rounded-[10px] bg-accent text-[15px] font-extrabold text-white transition-colors hover:bg-accent-hover"
            >
              <Copy className="h-[18px] w-[18px]" aria-hidden="true" /> نسخ
            </button>
          )}
        </div>
      )}
      {copied && (
        <a
          href={href}
          target="_blank"
          rel="nofollow sponsored noopener noreferrer"
          onClick={() => { trackCouponClick(couponId).catch(() => {}); }}
          className="flex h-[52px] items-center justify-center gap-2 rounded-md border-[1.5px] border-primary text-[15px] font-extrabold text-primary transition-colors hover:bg-surface-alt"
        >
          الذهاب إلى متجر {storeName} <ArrowUpLeft className="h-4 w-4" aria-hidden="true" />
        </a>
      )}
    </div>
  );
}
