"use client";

import { useState } from "react";
import Image from "next/image";
import { cn, getAvatarColor } from "@/lib/utils";

interface StoreLogoProps {
  name: string;
  logoUrl: string;
  /** حجم الصورة الفعلي (px) — تُستخدم لحساب حجم الحرف بديل الشعار، وكتلميح
   *  للمُحسِّن (sizes) عن العرض التقريبي المعروض. */
  size: number;
  /** كلاسات الحاوية (الأبعاد الخارجية + الاستدارة)، بنفس أسلوب باقي المشروع. */
  className?: string;
  imgClassName?: string;
  /** حمّل هذه الصورة فورًا بدل lazy-load — فقط للشعارات الظاهرة فوق الطية
   *  مباشرة (أول عناصر شبكة الرئيسية مثلًا)، تحسين لـ LCP. */
  priority?: boolean;
}

/**
 * غلاف حول next/image لشعارات المتاجر: لو فشل تحميل الشعار (مثلاً
 * logo.clearbit.com غير متاح)، يعرض دائرة/مربع ملوّن بأول حرف من اسم
 * المتجر بدل الصورة المكسورة — نفس فكرة avatar fallback بمواقع زي
 * GitHub/Twitter. اللون ثابت لكل متجر (مبني على hash للاسم).
 *
 * الصورة تملأ الحاوية بالكامل (fill + object-cover) بدل ما تُحسب أبعادها
 * يدويًا — الشعارات المرفوعة عبر لوحة التحكم أصلًا مربّعة 512×512 بعد
 * معالجة القص والحشو (راجع src/lib/actions-upload.ts)، فالتغطية الكاملة
 * ما بتقص أي محتوى مهم لها. الشعارات الخارجية الملصقة كرابط (زي
 * logo.clearbit.com) ممكن ما تكون مربّعة، فنظريًا ممكن تُقص حوافها قليلًا.
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
