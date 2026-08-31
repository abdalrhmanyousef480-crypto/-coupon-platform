import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
import slugify from "slugify";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function toSlug(text: string): string {
  return slugify(text, { lower: true, strict: true });
}

export function formatDate(date: Date, locale: "ar" | "en"): string {
  return new Intl.DateTimeFormat(locale === "ar" ? "ar-EG" : "en-US", {
    year: "numeric", month: "long", day: "numeric",
  }).format(date);
}

export function daysUntil(date: Date | null): number | null {
  if (!date) return null;
  const diff = new Date(date).getTime() - Date.now();
  return Math.ceil(diff / (1000 * 60 * 60 * 24));
}

export function expiryLabel(date: Date | null, locale: "ar" | "en"): string {
  const days = daysUntil(date);
  if (days === null) return "";
  if (days < 0) return locale === "ar" ? "منتهي الصلاحية" : "Expired";
  if (days === 0) return locale === "ar" ? "ينتهي اليوم" : "Expires today";
  return locale === "ar" ? `ينتهي خلال ${days} يوم` : `Expires in ${days} days`;
}

export function isExpiringSoon(date: Date | null, thresholdDays = 3): boolean {
  const days = daysUntil(date);
  return days !== null && days >= 0 && days <= thresholdDays;
}

export function readingTime(text: string, locale: "ar" | "en"): string {
  const words = text.trim().split(/\s+/).length;
  const minutes = Math.max(1, Math.round(words / 200));
  return locale === "ar" ? `${minutes} دقائق قراءة` : `${minutes} min read`;
}

export function truncate(text: string, max: number): string {
  return text.length > max ? text.slice(0, max).trim() + "…" : text;
}

/** يهرّب نص المستخدم قبل حقنه بجسم HTML (زي رسائل نموذج التواصل)، لمنع
 *  حقن HTML/سكربت لو فُتحت الرسالة بعميل بريد يعرض HTML. */
export function escapeHtml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

/** ينسخ نصًا للحافظة عبر Clipboard API، مع fallback لـ execCommand بالسياقات غير الآمنة/المتصفحات القديمة. */
export async function copyToClipboard(text: string): Promise<boolean> {
  if (typeof navigator !== "undefined" && navigator.clipboard && window.isSecureContext) {
    try {
      await navigator.clipboard.writeText(text);
      return true;
    } catch {
      // تابع لمحاولة الـ fallback أدناه
    }
  }
  try {
    const textarea = document.createElement("textarea");
    textarea.value = text;
    textarea.style.position = "fixed";
    textarea.style.top = "-9999px";
    textarea.style.left = "-9999px";
    textarea.setAttribute("readonly", "");
    document.body.appendChild(textarea);
    textarea.select();
    textarea.setSelectionRange(0, textarea.value.length);
    const success = document.execCommand("copy");
    document.body.removeChild(textarea);
    return success;
  } catch {
    return false;
  }
}

// لوحة ألوان لبدائل شعارات المتاجر (avatar fallback) — متناسقة مع
// هوية التصميم (Premium, Minimal, Trustworthy) بدون تكرار primary/accent.
const AVATAR_PALETTE = [
  "#0F766E", "#7C3AED", "#C2410C", "#1D4ED8", "#B45309",
  "#BE185D", "#4D7C0F", "#0369A1", "#6D28D9", "#B91C1C",
] as const;

/** يحوّل اسم المتجر لرقم ثابت (hash) لاختيار نفس اللون دائمًا لنفس الاسم. */
export function getAvatarColor(seed: string): string {
  let hash = 0;
  for (let i = 0; i < seed.length; i++) {
    hash = seed.charCodeAt(i) + ((hash << 5) - hash);
    hash |= 0;
  }
  return AVATAR_PALETTE[Math.abs(hash) % AVATAR_PALETTE.length];
}
