import { cache } from "react";
import { db } from "@/lib/db";

/** يُستخدم بالفوتر (يظهر على كل صفحة) وبصفحة إعدادات الأدمن —
 *  cache() يمنع تكرار نفس الاستعلام أكثر من مرة بنفس الطلب. */
export const getSiteSettings = cache(async function getSiteSettings() {
  return db.siteSettings.findUnique({ where: { id: "singleton" } });
});
