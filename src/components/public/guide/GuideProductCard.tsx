import { Package } from "lucide-react";
import type { GuideProduct } from "@/lib/guides/types";

/** بطاقة منتج/باقة داخل الدليل — نص فقط عمدًا (بدون صورة منتج مأخوذة
 *  من موقع المتجر الرسمي)، تفاديًا لأي مشكلة استخدام صور خارجية غير
 *  مرخّصة. الاسم والوصف يجيان من بيانات الدليل المُتحقق منها يدويًا. */
export function GuideProductCard({ product }: { product: GuideProduct }) {
  return (
    <div className="card p-5">
      <span className="mb-3 flex h-9 w-9 items-center justify-center rounded-lg bg-primary/[0.06] text-primary">
        <Package className="h-4 w-4" />
      </span>
      <h3 className="mb-1.5 text-[15px] font-bold leading-snug text-primary">{product.name}</h3>
      <p className="text-[13.5px] leading-relaxed text-ink-muted">{product.description}</p>
    </div>
  );
}
