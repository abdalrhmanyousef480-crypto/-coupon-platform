"use server";

// ============================================================
// IMAGE UPLOAD — تحويل الصورة إلى WebP (لتحسين الأداء/SEO) ثم رفعها
// إلى Supabase Storage. الصور المتجهية (SVG) تُرفع كما هي بدون تحويل
// لأنها أصلًا vector صغيرة الحجم ولأن تحويلها لـ WebP يفقدها ميزة
// القياس بلا فقدان جودة (rasterization).
//
// الصور الأخرى (JPG/PNG/WEBP) تُقصّ لتملأ مربعها/نسبتها المستهدفة
// بالكامل بأسلوب "cover" (زي CSS object-fit: cover) — الصورة كاملة
// بخلفيتها كما هي، بدون أي trim للمحتوى وبدون أي فراغ حول الحواف —
// ثم تُضغط لصيغة WebP بجودة 82% وأقصى جهد ضغط ممكن (effort: 6). القص
// لأبعاد ثابتة قبل الضغط هو اللي يضمن حجم ملف نهائي صغير بغض النظر
// عن دقة/حجم الصورة الأصلية (صورة كاميرا جوال بعدة ميجابكسل بترجع
// لنفس الحجم النهائي الصغير زي أي صورة تانية) — فمسموح برفع ملفات
// أصلية أكبر (حتى 10 ميجا) لأن المعالجة هي اللي بتصغّرها فعليًا، مش
// حد الرفع.
// ============================================================
import { randomUUID } from "crypto";
import sharp from "sharp";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getSupabaseAdmin, STORE_LOGOS_BUCKET, ARTICLE_IMAGES_BUCKET } from "@/lib/supabase";

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB — حد الملف الأصلي قبل المعالجة (راجع الشرح أعلاه)
const WEBP_QUALITY = 82; // ضمن نطاق 80-85% المتعارف عليه لتوازن جودة/حجم جيد
const ACCEPTED_TYPES = ["image/jpeg", "image/png", "image/webp", "image/svg+xml"];

export type UploadResult = { success: true; url: string } | { success: false; error: string };

interface UploadImageOptions {
  bucket: string;
  pathPrefix: string;
  /** أبعاد القص المستهدفة (fit: cover) — مختلفة حسب مكان استخدام الصورة */
  width: number;
  height: number;
  logLabel: string;
}

async function uploadImage(formData: FormData, options: UploadImageOptions): Promise<UploadResult> {
  const session = await getServerSession(authOptions);
  if (!session) return { success: false, error: "غير مصرّح" };

  const file = formData.get("file");
  if (!(file instanceof File)) return { success: false, error: "لم يتم اختيار ملف" };

  if (!ACCEPTED_TYPES.includes(file.type)) {
    return { success: false, error: "صيغة غير مدعومة — استخدم JPG أو PNG أو WEBP أو SVG" };
  }
  if (file.size > MAX_FILE_SIZE) {
    return { success: false, error: "حجم الملف كبير جدًا — الحد الأقصى 10 ميجابايت" };
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
        // cover: يكبّر الصورة حتى تطابق النسبة المستهدفة، ثم يقص أي
        // زيادة من المنتصف — الصورة كاملة (بما فيها خلفيتها) تملأ
        // المربع/المستطيل بالكامل بدون أي فراغ حول الحواف. هذا القص
        // لأبعاد ثابتة هو خطوة الضغط الأساسية (بيلغي أي وزن زائد ناتج
        // عن دقة الصورة الأصلية العالية) — quality وeffort بعده يضغطون
        // الترميز نفسه فوق هيك.
        .resize(options.width, options.height, { fit: "cover", position: "centre" })
        .webp({ quality: WEBP_QUALITY, effort: 6 })
        .toBuffer();
      extension = "webp";
      contentType = "image/webp";
    }
  } catch (err) {
    console.error(`[${options.logLabel}] image processing (sharp) failed:`, err);
    return { success: false, error: "تعذّر معالجة الصورة، تأكد أنها ملف صورة صالح" };
  }

  let supabase;
  try {
    supabase = getSupabaseAdmin();
  } catch (err) {
    console.error(`[${options.logLabel}] Supabase client init failed:`, err);
    return { success: false, error: "التخزين غير مُعد بعد على الخادم — تحقق من متغيرات البيئة (راجع .env.example) وشغّل npm run storage:setup" };
  }

  const path = `${options.pathPrefix}/${randomUUID()}.${extension}`;
  try {
    const { error: uploadError } = await supabase.storage
      .from(options.bucket)
      .upload(path, uploadBuffer, { contentType, cacheControl: "31536000", upsert: false });

    if (uploadError) {
      console.error(`[${options.logLabel}] Supabase Storage upload failed:`, uploadError);
      const hint = /bucket.*not.*found/i.test(uploadError.message)
        ? ` — تأكد أن bucket باسم "${options.bucket}" موجود فعلًا (شغّل npm run storage:setup)`
        : "";
      return { success: false, error: `تعذّر رفع الصورة: ${uploadError.message}${hint}` };
    }

    const { data } = supabase.storage.from(options.bucket).getPublicUrl(path);
    return { success: true, url: data.publicUrl };
  } catch (err) {
    console.error(`[${options.logLabel}] unexpected error during upload:`, err);
    return { success: false, error: "تعذّر رفع الصورة، حاول مرة أخرى" };
  }
}

export async function uploadStoreLogo(formData: FormData): Promise<UploadResult> {
  return uploadImage(formData, {
    bucket: STORE_LOGOS_BUCKET,
    pathPrefix: "stores",
    // أبعاد كافية جدًا لأي مكان يظهر فيه شعار متجر بالموقع (أكبر استخدام حاليًا 104px)
    width: 512,
    height: 512,
    logLabel: "uploadStoreLogo",
  });
}

export async function uploadArticleImage(formData: FormData): Promise<UploadResult> {
  return uploadImage(formData, {
    bucket: ARTICLE_IMAGES_BUCKET,
    pathPrefix: "articles",
    // نفس نسبة العرض للطول اللي تُعرض فيها صورة المقال بالموقع (aspect-[16/10])
    width: 1280,
    height: 800,
    logLabel: "uploadArticleImage",
  });
}
