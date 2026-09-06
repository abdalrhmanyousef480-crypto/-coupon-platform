"use client";

import { useEffect, useRef, useState } from "react";
import { toPng } from "html-to-image";
import { toast } from "sonner";
import { Download, X } from "lucide-react";
import { CouponCard, type CouponCardProps } from "@/components/public/CouponCard";
import { Button } from "@/components/ui/Button";

interface CouponCardWithDownloadProps {
  coupon: CouponCardProps["coupon"];
  store: CouponCardProps["store"];
  locale: "ar" | "en";
  expired: boolean;
  className?: string;
}

/** الكارت الفعلي بصفحة الكوبون + زر "تنزيل صورة الكوبون" — الصورة screenshot
 *  حقيقي للعنصر المعروض بالضبط (نفس الألوان/الشعار/الخط) عبر html-to-image،
 *  مو تصميم مولّد منفصل. يعرض معاينة بـ modal قبل التنزيل الفعلي، مو تنزيل
 *  أعمى مباشر. next/image (StoreLogo) بيخدم الشعار من مسار /_next/image
 *  بنفس الدومين، وnext/font يحمّل الخطوط محليًا — فمافيه مشاكل CORS وقت
 *  الالتقاط. */
export function CouponCardWithDownload({ coupon, store, locale, expired, className }: CouponCardWithDownloadProps) {
  const cardRef = useRef<HTMLDivElement>(null);
  const [capturing, setCapturing] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  useEffect(() => {
    if (!previewUrl) return;
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") setPreviewUrl(null);
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [previewUrl]);

  async function handleGenerate() {
    if (!cardRef.current || capturing) return;
    setCapturing(true);

    // اسم المتجر (truncate) بالكارت الحي عنده صفر هامش (scrollWidth ==
    // clientWidth بالضبط) — أي فرق بكسر بكسل بقياس الخط جوا محرّك رسم
    // html-to-image (SVG foreignObject، مش نفس مسار الرسم العادي للمتصفح)
    // كافي يفعّل الـ ellipsis ويقص الاسم لـ "..." بالصورة رغم إنه ظاهر
    // كامل بالصفحة. نلغي الـ truncate مؤقتًا بس وقت الالتقاط (inline style
    // بيغلب كلاس Tailwind) ونرجعه فورًا بعدها — المستخدم ما بيشوف أي تغيير
    // مرئي، والصورة النهائية دايمًا كاملة بدون قص.
    const nameEl = cardRef.current.querySelector<HTMLElement>("[data-capture-fullname]");
    const prevStyle = nameEl?.getAttribute("style") ?? null;
    if (nameEl) {
      nameEl.style.overflow = "visible";
      nameEl.style.textOverflow = "clip";
    }

    try {
      await document.fonts?.ready;
      const { width, height } = cardRef.current.getBoundingClientRect();
      const dataUrl = await toPng(cardRef.current, {
        width,
        height,
        pixelRatio: 2,
        cacheBust: true,
        backgroundColor: "#ffffff",
      });
      setPreviewUrl(dataUrl);
    } catch {
      toast.error(locale === "ar" ? "تعذّر إنشاء صورة الكوبون، حاول مرة أخرى" : "Couldn't generate the coupon image, please try again");
    } finally {
      if (nameEl) {
        if (prevStyle === null) nameEl.removeAttribute("style");
        else nameEl.setAttribute("style", prevStyle);
      }
      setCapturing(false);
    }
  }

  function handleDownload() {
    if (!previewUrl) return;
    const link = document.createElement("a");
    link.href = previewUrl;
    link.download = `coupon-${store.slug}-${coupon.slug}.png`;
    document.body.appendChild(link);
    link.click();
    link.remove();
  }

  return (
    <>
      <CouponCard ref={cardRef} coupon={coupon} store={store} locale={locale} size="lg" className={className} />

      {expired && (
        <p className="mt-4 rounded-lg border border-dashed border-border bg-surface-alt/60 py-3 text-center text-sm text-ink-muted">
          {locale === "ar" ? "انتهت صلاحية هذا الكوبون — جرّب كوبونات أخرى من نفس المتجر أدناه." : "This coupon has expired — try another coupon from this store below."}
        </p>
      )}

      <div className="mt-12">
        <Button
          type="button"
          variant="secondary"
          size="lg"
          loading={capturing}
          onClick={handleGenerate}
          aria-label={locale === "ar" ? `معاينة وتنزيل صورة كوبون ${store.name}` : `Preview and download ${store.name} coupon image`}
          className="w-full"
        >
          {!capturing && <Download className="h-5 w-5" />}
          {capturing
            ? locale === "ar" ? "جارٍ تجهيز الصورة..." : "Preparing image..."
            : locale === "ar" ? "تنزيل صورة الكوبون" : "Download coupon image"}
        </Button>
      </div>

      {previewUrl && (
        <div role="dialog" aria-modal="true" aria-label={locale === "ar" ? "معاينة صورة الكوبون" : "Coupon image preview"} className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <div onClick={() => setPreviewUrl(null)} aria-hidden="true" className="absolute inset-0 bg-ink/60" />
          <div className="relative z-10 flex max-h-[90vh] w-full max-w-lg flex-col overflow-hidden rounded-xl bg-surface shadow-lg">
            <div className="flex shrink-0 items-center justify-between border-b border-border px-5 py-4">
              <h3 className="font-bold text-primary">{locale === "ar" ? "معاينة صورة الكوبون" : "Coupon image preview"}</h3>
              <button
                type="button"
                onClick={() => setPreviewUrl(null)}
                aria-label={locale === "ar" ? "إغلاق" : "Close"}
                className="flex h-8 w-8 items-center justify-center rounded-full text-ink-muted transition-colors hover:bg-surface-alt hover:text-ink"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="overflow-y-auto p-5">
              {/* eslint-disable-next-line @next/next/no-img-element -- data URL من html-to-image، مش asset next/image */}
              <img src={previewUrl} alt={locale === "ar" ? `صورة كوبون ${store.name}` : `${store.name} coupon image`} className="mx-auto w-full rounded-lg border border-border" />
            </div>
            <div className="flex shrink-0 gap-3 border-t border-border p-5">
              <Button type="button" variant="outline" className="flex-1 justify-center" onClick={() => setPreviewUrl(null)}>
                {locale === "ar" ? "إغلاق" : "Close"}
              </Button>
              <Button type="button" variant="primary" className="flex-1 justify-center" onClick={handleDownload}>
                <Download className="h-4 w-4" /> {locale === "ar" ? "تنزيل" : "Download"}
              </Button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
