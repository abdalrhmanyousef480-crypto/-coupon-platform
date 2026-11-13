"use server";

import { randomUUID } from "node:crypto";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { STORE_LOGOS_BUCKET, getSupabaseAdmin } from "@/lib/supabase";

export type DirectImageKind = "store-logo" | "store-card" | "coupon-card" | "coupon-proof";
export type SignedImageTicket =
  | { success: true; signedUrl: string; publicUrl: string }
  | { success: false; error: string };

// This action never receives the image bytes: the upload goes browser -> Supabase.
// The signed URL is short lived and scoped to one random, non-overwritable path.
export async function createSignedImageTicket(kind: DirectImageKind, mime: string): Promise<SignedImageTicket> {
  const session = await getServerSession(authOptions);
  if (!session) return { success: false, error: "انتهت جلسة الدخول، سجّل الدخول مجددًا" };

  const prefix: Record<DirectImageKind, string> = {
    "store-logo": "stores",
    "store-card": "manual-card-images/stores",
    "coupon-card": "manual-card-images/coupons",
    "coupon-proof": "proof-images/coupons",
  };
  // Signed uploads of raster cards must always produce a real WebP file.

  if (!Object.prototype.hasOwnProperty.call(prefix, kind) || mime !== "image/webp") {
    return { success: false, error: "نوع الصورة غير مدعوم" };
  }

  const path = `${prefix[kind]}/${randomUUID()}.webp`;
  try {
    const storage = getSupabaseAdmin().storage.from(STORE_LOGOS_BUCKET);
    const { data, error } = await storage.createSignedUploadUrl(path, { upsert: false });
    if (error || !data) {
      console.error("[createSignedImageTicket] Supabase rejected upload ticket:", error);
      return { success: false, error: "تعذّر تجهيز رفع الصورة إلى Supabase" };
    }
    return { success: true, signedUrl: data.signedUrl, publicUrl: storage.getPublicUrl(path).data.publicUrl };
  } catch (error) {
    console.error("[createSignedImageTicket] failed:", error);
    return { success: false, error: "تعذّر الاتصال بمخزن الصور، أعد المحاولة" };
  }
}
