import { StaticPage } from "@/components/public/StaticPage";
import { buildMetadata } from "@/lib/seo";
import type { Metadata } from "next";

export const metadata: Metadata = buildMetadata({
  title: "إفصاح الشراكة التسويقية — كوبون نور", description: "كيف تحقق كوبون نور دخلها.", path: "/affiliate-disclosure", locale: "ar",
});

export default function AffiliateDisclosurePage() {
  return (
    <StaticPage title="إفصاح الشراكة التسويقية">
      <p className="text-ink-muted leading-relaxed mb-4">الشفافية مهمة بالنسبة لنا. إليك كيف يعمل نموذج عملنا.</p>
      <h2 className="text-lg mt-6 mb-2">كيف نحقق الدخل</h2>
      <p className="text-ink-muted leading-relaxed mb-4">قد نحصل على عمولة تسويقية عند قيامك بالشراء عبر بعض الروابط الموجودة في موقعنا، دون أي تكلفة إضافية عليك.</p>
      <h2 className="text-lg mt-6 mb-2">هل هذا يؤثر على ترتيب الكوبونات؟</h2>
      <p className="text-ink-muted leading-relaxed">لا. نحرص على عرض الكوبونات بناءً على صلاحيتها وقيمتها للمستخدم، وليس بناءً على قيمة العمولة.</p>
    </StaticPage>
  );
}
