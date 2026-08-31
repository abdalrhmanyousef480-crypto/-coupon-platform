// ============================================================
// MIDDLEWARE — يحمي كل صفحات /admin/* بدون استثناء.
// أي محاولة وصول بدون تسجيل دخول صحيح تتحول تلقائيًا لصفحة الدخول.
// هذا يشتغل على مستوى الشبكة (Edge) قبل ما تصل الصفحة أصلًا،
// فما فيه احتمال "تسريب" محتوى الداشبورد ولو للحظة.
// ============================================================
import { withAuth } from "next-auth/middleware";
import { NextResponse } from "next/server";

export default withAuth(
  function middleware() {
    return NextResponse.next();
  },
  {
    callbacks: {
      authorized: ({ token }) => !!token,
    },
    pages: {
      signIn: "/admin/login",
    },
  }
);

export const config = {
  // كل شي تحت /admin محمي، ما عدا /admin/login نفسها (وإلا صار Redirect loop).
  // الصيغتين مطلوبتين معًا: الأولى تغطي /admin نفسها، والثانية أي مسار فرعي تحتها.
  matcher: ["/admin", "/admin/((?!login).*)"],
};
