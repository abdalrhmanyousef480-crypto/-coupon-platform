"use client";

import { useState } from "react";
import { Download } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/Button";

/** زر بصفحة الكوبون يجيب صورة الكوبون الكاملة (1200×630، شعار المتجر +
 *  الكود بارز + علامة كوبون نور — مولّدة تلقائيًا عبر coupon-image/route.tsx)
 *  ويشغّل تنزيلها فعليًا بجهاز المستخدم (fetch → blob → <a download>)
 *  بدل عرضها بالصفحة. لا طلب شبكة يصير إلا عند الضغط. */
export function CouponFullImageSection({
  storeSlug,
  couponSlug,
  storeName,
}: {
  storeSlug: string;
  couponSlug: string;
  storeName: string;
}) {
  const [downloading, setDownloading] = useState(false);

  async function handleDownload() {
    if (downloading) return;
    setDownloading(true);
    try {
      const res = await fetch(`/store/${storeSlug}/coupon/${couponSlug}/coupon-image`);
      if (!res.ok) throw new Error("fetch failed");
      const blob = await res.blob();
      const objectUrl = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = objectUrl;
      link.download = `coupon-${storeSlug}-${couponSlug}.png`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(objectUrl);
    } catch {
      toast.error("تعذّر تنزيل صورة الكوبون، حاول مرة أخرى");
    } finally {
      setDownloading(false);
    }
  }

  return (
    <div className="mt-12">
      <Button
        type="button"
        variant="secondary"
        size="lg"
        loading={downloading}
        onClick={handleDownload}
        aria-label={`تنزيل صورة كوبون ${storeName}`}
        className="w-full"
      >
        {!downloading && <Download className="h-5 w-5" />}
        {downloading ? "جارٍ تجهيز الصورة..." : "تنزيل صورة الكوبون"}
      </Button>
    </div>
  );
}
