// ============================================================
// MIDDLEWARE — يحمي كل صفحات /admin/* بدون استثناء.
// أي محاولة وصول بدون تسجيل دخول صحيح تتحول تلقائيًا لصفحة الدخول.
// هذا يشتغل قبل عرض الصفحة، باستخدام Node لدعم فحص ترقيم الكوبونات عبر Prisma،
// فما فيه احتمال "تسريب" محتوى الداشبورد ولو للحظة.
// ============================================================
import { withAuth, type NextRequestWithAuth } from "next-auth/middleware";
import { NextResponse, type NextFetchEvent } from "next/server";
import { db } from "@/lib/db";
import { COUPONS_PAGE_SIZE, couponsWhere, parsePageParam } from "@/lib/coupons-query";

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
  if (request.nextUrl.pathname === "/coupons") {
    const page = parsePageParam(request.nextUrl.searchParams.get("page") ?? undefined);
    if (!request.nextUrl.searchParams.get("q")?.trim() && page > 1) {
      const total = await db.coupon.count({ where: couponsWhere() });
      const lastPage = Math.max(1, Math.ceil(total / COUPONS_PAGE_SIZE));
      if (page > lastPage) {
        const destination = new URL(lastPage > 1 ? `/coupons?page=${lastPage}` : "/coupons", request.url);
        // A loading.tsx boundary can flush HTTP 200 before a page-level redirect.
        return NextResponse.redirect(destination, 307);
      }
    }
    return NextResponse.next();
  }
  return adminMiddleware(request, event);
}

export const config = {
  // كل شي تحت /admin محمي، ما عدا /admin/login نفسها (وإلا صار Redirect loop).
  // الصيغتين مطلوبتين معًا: الأولى تغطي /admin نفسها، والثانية أي مسار فرعي تحتها.
  matcher: ["/admin", "/admin/((?!login).*)", "/coupons"],
  // Next 15.5 supports Node middleware; Prisma cannot run in the Edge runtime.
  runtime: "nodejs",
};
