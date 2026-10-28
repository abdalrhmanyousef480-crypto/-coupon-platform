import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user || session.user.role !== "ADMIN") {
    return Response.json({ status: "error", message: "غير مصرح." }, { status: 403 });
  }

  // Store credentials only in the server's Vercel environment settings.
  const token = process.env.INSTAGRAM_ACCESS_TOKEN?.trim();
  if (!token) {
    return Response.json({
      status: "unconfigured",
      message: "لم يتم ربط رمز وصول إنستغرام في إعدادات الخادم بعد.",
    }, { headers: { "Cache-Control": "no-store" } });
  }

  try {
    // Instagram API with Instagram Login, never the Facebook Page-token API.
    const response = await fetch("https://graph.instagram.com/v26.0/me?fields=id,username", {
      method: "GET",
      headers: { Authorization: `Bearer ${token}` },
      signal: AbortSignal.timeout(8000),
      cache: "no-store",
    });
    if (!response.ok) {
      return Response.json({
        status: "error",
        message: "فشل التحقق من حساب إنستغرام. راجع صلاحية الرمز ومدته.",
      }, { status: 502, headers: { "Cache-Control": "no-store" } });
    }
    const payload = (await response.json()) as { id?: string; username?: string };
    if (!payload.id || !payload.username) {
      return Response.json({
        status: "error",
        message: "استجابة إنستغرام غير مكتملة.",
      }, { status: 502, headers: { "Cache-Control": "no-store" } });
    }
    if (payload.username.toLowerCase() !== "couponsnoor") {
      return Response.json({
        status: "error",
        message: "الرمز مرتبط بحساب مختلف عن @couponsnoor، لن نستخدمه للنشر.",
      }, { status: 409, headers: { "Cache-Control": "no-store" } });
    }
    return Response.json({
      status: "connected", username: payload.username,
    }, { headers: { "Cache-Control": "no-store" } });
  } catch {
    return Response.json({
      status: "error",
      message: "تعذر التحقق من اتصال Meta حاليًا.",
    }, { status: 502, headers: { "Cache-Control": "no-store" } });
  }
}
