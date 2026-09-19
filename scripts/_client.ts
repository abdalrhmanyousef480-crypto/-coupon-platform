// عميل Prisma مشترك للسكربتات: بيستخدم DIRECT_URL (Session pooler) لأن سكربتات
// الصيانة بتحتاج session-level semantics (ترانزاكشن تفاعلية)، وما بنطبع أي
// رابط/بيانات دخول أبدًا.
import "dotenv/config";
import { PrismaClient } from "@prisma/client";

export function createScriptClient() {
  const url = process.env.DIRECT_URL || process.env.DATABASE_URL;
  if (!url) throw new Error("DIRECT_URL/DATABASE_URL غير مضبوط بـ .env");
  return new PrismaClient({ datasourceUrl: url });
}
