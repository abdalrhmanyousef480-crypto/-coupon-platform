"use client";

import { useLayoutEffect, useRef, useState } from "react";

/**
 * Paragraph shown as 2 lines on mobile with "اقرأ المزيد". The full text is
 * always in the HTML (only clamped with CSS), so search engines read all of it.
 * Desktop shows it in full.
 */
export function ExpandableText({ text, className = "", buttonClassName = "" }: {
  text: string; className?: string; buttonClassName?: string;
}) {
  const ref = useRef<HTMLParagraphElement>(null);
  const [open, setOpen] = useState(false);
  const [clamped, setClamped] = useState(false);

  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    const check = () => setClamped(el.scrollHeight > el.clientHeight + 1);
    check();
    const observer = new ResizeObserver(check);
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  return (
    <div>
      <p ref={ref} className={`${className} ${open ? "" : "line-clamp-2 md:line-clamp-none"}`}>{text}</p>
      {(clamped || open) && (
        <button type="button" onClick={() => setOpen((v) => !v)} aria-expanded={open}
          className={`mt-1 text-sm font-bold underline underline-offset-4 md:hidden ${buttonClassName}`}>
          {open ? "عرض أقل" : "اقرأ المزيد"}
        </button>
      )}
    </div>
  );
}
