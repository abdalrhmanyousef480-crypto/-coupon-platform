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

  // شعارات Supabase تمر عبر /images/logo (مصغّرة، كاش سنة، noimageindex) عشان
  // جوجل ما يختار الشعار بدل صورة الكوبون بنتائج الصور. نفس الشكل (object-cover).
  if (/^(?:https:\/\/[a-z0-9]+\.supabase\.co\/storage\/v1\/object\/public\/store-logos\/|https:\/\/www\.google\.com\/s2\/favicons\?)/.test(logoUrl)) {
    const w = Math.min(256, Math.round(size * 3));
    return (
      <div className={cn("relative bg-surface-alt overflow-hidden shrink-0", className)}>
        <img
          src={`/images/logo?w=${w}&src=${encodeURIComponent(logoUrl)}`}
          alt={name}
          loading={priority ? "eager" : "lazy"}
          fetchPriority={priority ? "high" : "auto"}
          decoding="async"
          className={cn("absolute inset-0 h-full w-full object-cover", imgClassName)}
          onError={() => setFailed(true)}
        />
      </div>
    );
  }

  // باقي المصادر (قليلة) تبقى بنفس طريقة العرض الأصلية.
  return (
    <div className={cn("relative bg-surface-alt overflow-hidden shrink-0", className)}>
      <Image
          unoptimized
        src={logoUrl}
        alt={name}
        fill
        sizes={`${size}px`}
        priority={priority}
        fetchPriority={priority ? "high" : undefined}
        className={cn("object-cover", imgClassName)}
        onError={() => setFailed(true)}
      />
    </div>
  );
}
