import { StaticPage } from "@/components/public/StaticPage";
import { buildMetadata } from "@/lib/seo";
import type { Metadata } from "next";

export const metadata: Metadata = buildMetadata({
  title: "سياسة التحقق من الكوبونات — كوبون نور", description: "كيف نتحقق من صلاحية أكواد الخصم.", path: "/coupon-verification-policy", locale: "ar",
});

export default function CouponVerificationPolicyPage() {
  return (
    <StaticPage title="سياسة التحقق من الكوبونات">
      <p className="text-ink-muted leading-relaxed mb-4">يقوم فريقنا بمراجعة أكواد الخصم بشكل دوري عبر اختبارها فعليًا، والتأكد من أنها لا تزال تعمل قبل وضع علامة «تم التحقق» عليها.</p>
      <h2 className="text-lg mt-6 mb-2">لماذا قد يظهر كوبون غير موثق؟</h2>
      <p className="text-ink-muted leading-relaxed">بعض الأكواد تُضاف حديثًا ولم تتم مراجعتها بعد. ننصح دومًا باستخدام كوبون موثق كلما أمكن.</p>
    </StaticPage>
  );
}
