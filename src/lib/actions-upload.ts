"use server";

// ============================================================
// IMAGE UPLOAD — تحويل الصورة إلى WebP (لتحسين الأداء/SEO) ثم رفعها
// إلى Supabase Storage. الصور المتجهية (SVG) تُرفع كما هي بدون تحويل
// لأنها أصلًا vector صغيرة الحجم ولأن تحويلها لـ WebP يفقدها ميزة
// القياس بلا فقدان جودة (rasterization).
//
// الصور الأخرى (JPG/PNG/WEBP) تُقصّ لتملأ مربع 512×512 بالكامل بأسلوب
// "cover" (زي CSS object-fit: cover) — الصورة كاملة بخلفيتها كما هي،
// بدون أي trim للمحتوى وبدون أي فراغ حول الحواف.
// ============================================================
import { randomUUID } from "crypto";
import sharp from "sharp";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getSupabaseAdmin, STORE_LOGOS_BUCKET } from "@/lib/supabase";

const MAX_FILE_SIZE = 2 * 1024 * 1024; // 2MB
const ACCEPTED_TYPES = ["image/jpeg", "image/png", "image/webp", "image/svg+xml"];
// أبعاد كافية جدًا لأي مكان يظهر فيه شعار متجر بالموقع (أكبر استخدام حاليًا 104px)
const MAX_DIMENSION = 512;

export type UploadResult = { success: true; url: string } | { success: false; error: string };

export async function uploadStoreLogo(formData: FormData): Promise<UploadResult> {
  const session = await getServerSession(authOptions);
  if (!session) return { success: false, error: "غير مصرّح" };

  const file = formData.get("file");
  if (!(file instanceof File)) return { success: false, error: "لم يتم اختيار ملف" };

  if (!ACCEPTED_TYPES.includes(file.type)) {
    return { success: false, error: "صيغة غير مدعومة — استخدم JPG أو PNG أو WEBP أو SVG" };
  }
  if (file.size > MAX_FILE_SIZE) {
    return { success: false, error: "حجم الملف كبير جدًا — الحد الأقصى 2 ميجابايت" };
  }

  // كل مرحلة بـ try/catch منفصل: خطأ إعداد Supabase (env vars ناقصة)
  // مختلف تمامًا عن خطأ بملف الصورة نفسه، وخلطهم بكتلة catch واحدة
  // كان يعرض "الصورة غير صالحة" حتى لو المشكلة الفعلية إعداد ناقص.
  // كل خطأ يُطبع كامل التفاصيل بـ console.error (سجلات الخادم) قبل
  // ما نرجع رسالة عامة آمنة للمستخدم.

  let uploadBuffer: Buffer;
  let extension: string;
  let contentType: string;

  try {
    const inputBuffer = Buffer.from(await file.arrayBuffer());

    if (file.type === "image/svg+xml") {
      // SVG فيكتور صغير أصلًا — نرفعه كما هو بدون معالجة
      uploadBuffer = inputBuffer;
      extension = "svg";
      contentType = "image/svg+xml";
    } else {
      uploadBuffer = await sharp(inputBuffer)
        // cover: يكبّر الصورة حتى يطابق البعد الأقصر 512px، ثم يقص أي
        // زيادة بالبعد الأطول من المنتصف — الصورة كاملة (بما فيها خلفيتها)
        // تملأ المربع بالكامل بدون أي فراغ حول الحواف
        .resize(MAX_DIMENSION, MAX_DIMENSION, { fit: "cover", position: "centre" })
        .webp({ quality: 82 })
        .toBuffer();
      extension = "webp";
      contentType = "image/webp";
    }
  } catch (err) {
    console.error("[uploadStoreLogo] image processing (sharp) failed:", err);
    return { success: false, error: "تعذّر معالجة الصورة، تأكد أنها ملف صورة صالح" };
  }

  let supabase;
  try {
    supabase = getSupabaseAdmin();
  } catch (err) {
    console.error("[uploadStoreLogo] Supabase client init failed:", err);
    return { success: false, error: "التخزين غير مُعد بعد على الخادم — تحقق من متغيرات البيئة (راجع .env.example) وشغّل npm run storage:setup" };
  }

  const path = `stores/${randomUUID()}.${extension}`;
  try {
    const { error: uploadError } = await supabase.storage
      .from(STORE_LOGOS_BUCKET)
      .upload(path, uploadBuffer, { contentType, cacheControl: "31536000", upsert: false });

    if (uploadError) {
      console.error("[uploadStoreLogo] Supabase Storage upload failed:", uploadError);
      const hint = /bucket.*not.*found/i.test(uploadError.message)
        ? ` — تأكد أن bucket باسم "${STORE_LOGOS_BUCKET}" موجود فعلًا (شغّل npm run storage:setup)`
        : "";
      return { success: false, error: `تعذّر رفع الصورة: ${uploadError.message}${hint}` };
    }

    const { data } = supabase.storage.from(STORE_LOGOS_BUCKET).getPublicUrl(path);
    return { success: true, url: data.publicUrl };
  } catch (err) {
    console.error("[uploadStoreLogo] unexpected error during upload:", err);
    return { success: false, error: "تعذّر رفع الصورة، حاول مرة أخرى" };
  }
}
