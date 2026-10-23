import Link from "next/link";
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
      <p className="text-ink-muted leading-relaxed mb-4">لا. نحرص على عرض الكوبونات بناءً على صلاحيتها وقيمتها للمستخدم، وليس بناءً على قيمة العمولة.</p>
      <h2 className="text-lg mt-6 mb-2">ما الفرق بين كود الخصم ورابط المتجر؟</h2>
      <p className="text-ink-muted leading-relaxed mb-4">كود الخصم رمز يُدخل أثناء إتمام الطلب إذا كانت شروط العرض تسمح بذلك، بينما رابط المتجر ينقلك إلى موقع التاجر لإتمام الشراء. قد تتضمن بعض روابط الانتقال معرفات شراكة تسويقية.</p>
      <h2 className="text-lg mt-6 mb-2">من يحدد الأسعار وشروط العرض؟</h2>
      <p className="text-ink-muted leading-relaxed mb-4">المتجر هو المرجع للأسعار النهائية ورسوم الشحن وشروط استخدام الكود والاسترجاع. راجع إجمالي الطلب والشروط على موقع المتجر قبل تأكيد الدفع، فقد تتغير العروض دون إشعار.</p>
      <h2 className="text-lg mt-6 mb-2">كيف أتحقق من صلاحية الكوبون؟</h2>
      <p className="text-ink-muted leading-relaxed">اقرأ <Link href="/coupon-verification-policy" className="font-semibold text-accent underline-offset-2 hover:underline">سياسة التحقق من الكوبونات</Link> لمعرفة معنى علامة التحقق وما الذي تفعله إذا لم يُقبل الرمز في سلة الشراء.</p>
    </StaticPage>
  );
}
