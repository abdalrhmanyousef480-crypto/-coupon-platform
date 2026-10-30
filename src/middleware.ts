// ============================================================
// MIDDLEWARE — يحمي كل صفحات /admin/* بدون استثناء.
// أي محاولة وصول بدون تسجيل دخول صحيح تتحول تلقائيًا لصفحة الدخول.
// هذا يشتغل قبل عرض الصفحة،
// فما فيه احتمال "تسريب" محتوى الداشبورد ولو للحظة.
// ============================================================
import { withAuth, type NextRequestWithAuth } from "next-auth/middleware";
import { NextResponse, type NextFetchEvent } from "next/server";

const adminMiddleware = withAuth(
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

export default async function middleware(request: NextRequestWithAuth, event: NextFetchEvent) {
  return adminMiddleware(request, event);
}

export const config = {
  // كل شي تحت /admin محمي، ما عدا /admin/login نفسها (وإلا صار Redirect loop).
  // الصيغتين مطلوبتين معًا: الأولى تغطي /admin نفسها، والثانية أي مسار فرعي تحتها.
  // Public pagination validates bounds in its page. Keep /coupons without a
  // loading.tsx boundary so redirects resolve before a fallback can flush 200.
  matcher: ["/admin", "/admin/((?!login).*)"],
  runtime: "nodejs",
};
