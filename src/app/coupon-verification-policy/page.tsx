import Link from "next/link";
import { StaticPage } from "@/components/public/StaticPage";
import { buildMetadata } from "@/lib/seo";
import type { Metadata } from "next";

export const metadata: Metadata = buildMetadata({
  title: "سياسة التحقق من الكوبونات — كوبون نور", description: "تعرّف على طريقة مراجعة أكواد الخصم في كوبون نور، ومعنى علامة تم التحقق، وأسباب اختلاف صلاحية الأكواد، وكيف تتأكد من تطبيق الخصم قبل الدفع.", path: "/coupon-verification-policy", locale: "ar",
});

export default function CouponVerificationPolicyPage() {
  return (
    <StaticPage title="سياسة التحقق من الكوبونات">
      <p className="text-ink-muted leading-relaxed mb-4">يقوم فريقنا بمراجعة أكواد الخصم بشكل دوري عبر اختبارها فعليًا، والتأكد من أنها لا تزال تعمل قبل وضع علامة «تم التحقق» عليها.</p>
      <h2 className="text-lg mt-6 mb-2">لماذا قد يظهر كوبون غير موثق؟</h2>
      <p className="text-ink-muted leading-relaxed mb-4">بعض الأكواد تُضاف حديثًا ولم تتم مراجعتها بعد. ننصح دومًا باستخدام كوبون موثق كلما أمكن.</p>
      <h2 className="text-lg mt-6 mb-2">هل تعني علامة «تم التحقق» أن الخصم مضمون؟</h2>
      <p className="text-ink-muted leading-relaxed mb-4">تشير العلامة إلى مراجعة سابقة للكود، لكنها ليست ضمانًا لقبوله في كل طلب. قد يقصر المتجر العرض على منتجات أو عملاء محددين، أو يغيّر شروطه بعد التحقق.</p>
      <h2 className="text-lg mt-6 mb-2">كيف تختبر الكود قبل إتمام الشراء؟</h2>
      <p className="text-ink-muted leading-relaxed mb-4">انسخ الرمز من صفحة الكوبون، وانتقل إلى المتجر وأضف المنتجات التي تريدها إلى السلة. أدخل الرمز في خانة الخصم، وتأكد من ظهور التخفيض في إجمالي الطلب قبل الدفع. اقرأ الحد الأدنى للطلب والاستثناءات إن وجدت.</p>
      <h2 className="text-lg mt-6 mb-2">ماذا أفعل إذا لم يعمل الكود؟</h2>
      <p className="text-ink-muted leading-relaxed">تحقق من كتابة الرمز دون مسافات زائدة ومن استيفاء شروط العرض. إذا استمرت المشكلة، <Link href="/contact" className="font-semibold text-accent underline-offset-2 hover:underline">أبلغنا عبر صفحة التواصل</Link> مع اسم المتجر ورابط الكوبون ورسالة الخطأ، دون إرسال أي بيانات دفع أو معلومات حساسة.</p>
    </StaticPage>
  );
}
