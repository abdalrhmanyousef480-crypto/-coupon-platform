"use server";

// ============================================================
// USER ACCOUNT ACTIONS
// ============================================================
// تغيير كلمة مرور المستخدم الحالي (الأدمن المسجّل دخوله) — نتحقق
// من كلمة المرور الحالية عبر bcrypt قبل السماح بأي تعديل.
// ============================================================
import bcrypt from "bcryptjs";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import { changePasswordSchema, type ChangePasswordInput } from "@/lib/validations";
import type { ActionResult } from "@/lib/actions-store";

export async function changePassword(data: ChangePasswordInput): Promise<ActionResult> {
  const session = await getServerSession(authOptions);
  if (!session) return { success: false, error: "غير مصرّح" };

  const parsed = changePasswordSchema.safeParse(data);
  if (!parsed.success) return { success: false, error: parsed.error.errors[0].message };

  const user = await db.user.findUnique({ where: { id: session.user.id } });
  if (!user) return { success: false, error: "المستخدم غير موجود" };

  const isValid = await bcrypt.compare(parsed.data.currentPassword, user.passwordHash);
  if (!isValid) return { success: false, error: "كلمة المرور الحالية غير صحيحة" };

  const passwordHash = await bcrypt.hash(parsed.data.newPassword, 10);
  await db.user.update({ where: { id: user.id }, data: { passwordHash } });

  return { success: true };
}
