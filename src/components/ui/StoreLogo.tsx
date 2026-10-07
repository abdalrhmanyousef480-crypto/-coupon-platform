"use client";

import { useState } from "react";
import { cn, getAvatarColor } from "@/lib/utils";

interface StoreLogoProps {
  name: string;
  logoUrl: string;
  size: number;
  className?: string;
  imgClassName?: string;
  priority?: boolean;
}

/**
 * شعارات المتاجر تُعرض كاملة بدون قص (object-contain).
 * نستخدم img عاديًا بدل next/image لأن بعض الشعارات الرسمية قد تكون SVG
 * أو تأتي من مسار داخلي proxy يُرجع نوع صورة مختلف حسب موقع المتجر.
 */
export function StoreLogo({ name, logoUrl, size, className, imgClassName, priority }: StoreLogoProps) {
  const [failed, setFailed] = useState(!logoUrl);

  if (failed) {
    return (
      <div
        className={cn("flex items-center justify-center shrink-0 overflow-hidden", className)}
        style={{ backgroundColor: getAvatarColor(name) }}
      >
        <span
          className="font-bold text-white leading-none select-none"
          style={{ fontSize: size * 0.42 }}
          aria-hidden="true"
        >
          {name.trim().charAt(0).toUpperCase()}
        </span>
        <span className="sr-only">{name}</span>
      </div>
    );
  }

  return (
    <div className={cn("relative bg-surface-alt overflow-hidden shrink-0", className)}>
      <img
        src={logoUrl}
        alt={name}
        loading={priority ? "eager" : "lazy"}
        fetchPriority={priority ? "high" : "auto"}
        decoding="async"
        className={cn("h-full w-full object-contain p-1.5", imgClassName)}
        onError={() => setFailed(true)}
      />
    </div>
  );
}
