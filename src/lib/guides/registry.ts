import type { GuideConfig } from "@/lib/guides/types";
import { ghymGuide } from "@/lib/guides/ghym";
import { iherbGuide } from "@/lib/guides/iherb";
import { uniformplusGuide } from "@/lib/guides/uniformplues";
import { alhawwajGuide } from "@/lib/guides/alhawwaj";
import { faisalaldayelGuide } from "@/lib/guides/faisalaldayel";
import { temuGuide } from "@/lib/guides/temu";

/** سجل كل الأدلة المفعّلة — مفتاحه article.slug. لإضافة دليل مستقبلي
 *  (نون، نمشي، iHerb...): ملف بيانات جديد بنفس شكل ghym.ts + سطر هون. */
export const GUIDE_REGISTRY: Record<string, GuideConfig> = {
  [ghymGuide.articleSlug]: ghymGuide,
  [iherbGuide.articleSlug]: iherbGuide,
  [uniformplusGuide.articleSlug]: uniformplusGuide,
  [alhawwajGuide.articleSlug]: alhawwajGuide,
  [faisalaldayelGuide.articleSlug]: faisalaldayelGuide,
  [temuGuide.articleSlug]: temuGuide,
};

/** يبحث لو فيه دليل مفعّل لمتجر معيّن — يُستخدم من صفحة الكوبون عشان
 *  تعرف تربط لدليله (لو موجود) بدون أي كود مخصص لكل متجر بالصفحة نفسها. */
export function getGuideForStore(storeSlug: string): GuideConfig | null {
  return Object.values(GUIDE_REGISTRY).find((g) => g.storeSlug === storeSlug) ?? null;
}
