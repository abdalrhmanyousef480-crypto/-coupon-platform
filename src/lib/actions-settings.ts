"use server";

// ============================================================
// SITE SETTINGS ADMIN ACTIONS — روابط التواصل الاجتماعي وغيرها من
// الإعدادات العامة (صف واحد singleton بجدول site_settings).
// revalidatePath("/", "layout") يمسح كاش كل صفحات الموقع دفعة واحدة
// لأن الفوتر (اللي يعرض هاي الروابط) موجود بكل صفحة عامة على حدة.
// ============================================================
import { revalidatePath } from "next/cache";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import { socialLinksSchema, type SocialLinksInput } from "@/lib/validations";
import type { ActionResult } from "@/lib/actions-store";

async function requireAdmin() {
  const session = await getServerSession(authOptions);
  if (!session) throw new Error("غير مصرّح");
  return session;
}

export async function updateSocialLinks(data: SocialLinksInput): Promise<ActionResult> {
  await requireAdmin();
  const parsed = socialLinksSchema.safeParse(data);
  if (!parsed.success) return { success: false, error: parsed.error.errors[0].message };

  const values = {
    facebookUrl: parsed.data.facebookUrl || null,
    instagramUrl: parsed.data.instagramUrl || null,
    twitterUrl: parsed.data.twitterUrl || null,
    tiktokUrl: parsed.data.tiktokUrl || null,
    snapchatUrl: parsed.data.snapchatUrl || null,
  };

  await db.siteSettings.upsert({
    where: { id: "singleton" },
    update: values,
    create: { id: "singleton", ...values },
  });

  revalidatePath("/", "layout");
  return { success: true };
}
