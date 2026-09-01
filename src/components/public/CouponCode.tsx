"use client";

import { useLayoutEffect, useRef } from "react";
import { cn } from "@/lib/utils";

// أحجام أقصى/أدنى للخط حسب حجم البطاقة (default = كارت الشبكة، lg = كارت
// صفحة الكوبون المستقلة). النطاق واسع لأن عرض الحاوية الفعلي يختلف كثير
// بين شبكة متعددة الأعمدة (default) وبطاقة تملأ عرض الصفحة تقريبًا (lg).
const FONT_RANGE = {
  default: { max: 20, min: 10 },
  lg: { max: 30, min: 11 },
} as const;

interface CouponCodeProps {
  code: string;
  variant?: "default" | "lg";
  className?: string;
}

/** يعرض كود الكوبون بسطر واحد دائمًا: يقيس العرض الفعلي المتاح بالحاوية
 *  ويصغّر حجم الخط تدريجيًا (بدل الاعتماد على ellipsis) لحد ما النص يضل
 *  بالكامل بسطر واحد — يعيد القياس تلقائيًا عند تغيّر عرض الحاوية
 *  (تدوير الجهاز، تغيير حجم النافذة) عبر ResizeObserver. لو حتى أصغر
 *  حجم مسموح ما كفى (حالة شاذة جدًا)، overflow/ellipsis بالـ CSS هي
 *  شبكة الأمان الأخيرة. */
export function CouponCode({ code, variant = "default", className }: CouponCodeProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const textRef = useRef<HTMLSpanElement>(null);
  const trimmed = code.trim();

  useLayoutEffect(() => {
    const container = containerRef.current;
    const text = textRef.current;
    if (!container || !text) return;

    const { max, min } = FONT_RANGE[variant];

    function fit() {
      if (!container || !text) return;
      let size = max;
      text.style.fontSize = `${size}px`;
      while (size > min && text.scrollWidth > container.clientWidth) {
        size -= 1;
        text.style.fontSize = `${size}px`;
      }
    }

    fit();
    const observer = new ResizeObserver(fit);
    observer.observe(container);

    // إعادة القياس بعد اكتمال تحميل خط الكود (JetBrains Mono) — أول قياس
    // ممكن يصير بخط بديل أضيق قبل ما يوصل الخط الفعلي، فيعطي حجمًا أكبر
    // من اللازم يفيض عن الحاوية بعد التبديل للخط الحقيقي.
    let cancelled = false;
    document.fonts?.ready?.then(() => {
      if (!cancelled) fit();
    });

    return () => {
      cancelled = true;
      observer.disconnect();
    };
  }, [trimmed, variant]);

  return (
    <div ref={containerRef} className="w-full min-w-0 overflow-hidden">
      <span
        ref={textRef}
        title={trimmed}
        className={cn(
          "block w-full select-all overflow-hidden text-ellipsis whitespace-nowrap text-center font-code font-bold tracking-[0.06em] text-primary",
          className
        )}
        style={{ fontSize: FONT_RANGE[variant].max }}
      >
        {trimmed}
      </span>
    </div>
  );
}
