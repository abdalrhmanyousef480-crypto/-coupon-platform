"use client";

import { useState } from "react";
import Image from "next/image";
import { cn, getAvatarColor } from "@/lib/utils";

interface StoreLogoProps {
  name: string;
  logoUrl: string;
  size: number;
  className?: string;
  imgClassName?: string;
  priority?: boolean;
}

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

  // المتاجر الجديدة فقط تستخدم مسار الشعار الرسمي الداخلي وتُعرض كاملة بدون قص.
  if (logoUrl.startsWith("/api/store-logo/")) {
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

  // كل المتاجر السابقة تبقى بنفس طريقة العرض الأصلية تمامًا.
  return (
    <div className={cn("relative bg-surface-alt overflow-hidden shrink-0", className)}>
      <Image
        src={logoUrl}
        alt={name}
        fill
        sizes={`${size}px`}
        priority={priority}
        className={cn("object-cover", imgClassName)}
        onError={() => setFailed(true)}
      />
    </div>
  );
}
