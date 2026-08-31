// ============================================================
// يوسّع أنواع NextAuth الافتراضية عشان TypeScript يعرف إن
// session.user فيه id و role (مش موجودين بالنوع الأساسي).
// بدون هذا الملف، كل استخدام لـ session.user.role يحتاج "as"
// يدوي في كل مكان — هيك مرة وحدة بس وينتشر تلقائيًا بالمشروع.
// ============================================================
import { type DefaultSession } from "next-auth";

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      role: string;
    } & DefaultSession["user"];
  }

  interface User {
    role: string;
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    id: string;
    role: string;
  }
}
