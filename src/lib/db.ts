// ============================================================
// Prisma Client singleton.
// بدون هذا النمط، كل Hot Reload بالتطوير أو كل Serverless Function
// على Vercel بيفتح اتصال جديد بقاعدة البيانات، وبسرعة توصل لحد
// الاتصالات المسموحة. هاي هي الطريقة الموصى فيها رسميًا من Prisma
// لمشاريع Next.js.
// ============================================================
import { PrismaClient } from "@prisma/client";

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

export const db =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: process.env.NODE_ENV === "development" ? ["error", "warn"] : ["error"],
  });

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = db;
