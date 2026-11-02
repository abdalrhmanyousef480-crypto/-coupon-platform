// ============================================================
// إعداد Supabase Storage — سكربت لمرة واحدة (وقابل لإعادة التشغيل)
// ينشئ buckets "store-logos" و"article-images" بقراءة عامة (public)
// لو مش موجودين أصلًا، ويحدّث إعداداتهم (fileSizeLimit) لو موجودين
// أصلًا بقيمة قديمة. شغّله بأمر: npm run storage:setup
// ============================================================
import "dotenv/config";
import { getSupabaseAdmin, STORE_LOGOS_BUCKET, ARTICLE_IMAGES_BUCKET } from "../src/lib/supabase";

// حد حجم الملف بالـ bucket نفسه — بيطبّق على الملف النهائي المرفوع
// (بعد الضغط لـ WebP، أو ملف SVG كما هو لأنه ما يُعاد ضغطه). أعلى
// بكثير من الحجم المتوقع فعليًا للـ WebP المضغوط (عادة أقل من 300KB)،
// بس كافي لتغطية ملفات SVG كبيرة نسبيًا كـ margin أمان.
const BUCKET_FILE_SIZE_LIMIT = "10MB";
// iOS Safari may output PNG when Canvas WebP encoding is unavailable. Accept
// raster fallbacks on store-logos, while article uploads remain unchanged.
const STORE_LOGOS_MIME_TYPES = ["image/webp", "image/svg+xml", "image/jpeg", "image/png"];
const ARTICLE_IMAGES_MIME_TYPES = ["image/webp", "image/svg+xml"];

async function ensureBucket(
  supabase: ReturnType<typeof getSupabaseAdmin>,
  name: string,
  existing: string[],
  allowedMimeTypes: string[]
) {
  if (existing.includes(name)) {
    const { error } = await supabase.storage.updateBucket(name, {
      public: true,
      fileSizeLimit: BUCKET_FILE_SIZE_LIMIT,
      allowedMimeTypes,
    });
    if (error) throw error;
    console.log(`✓ Bucket "${name}" already exists — settings synced (fileSizeLimit: ${BUCKET_FILE_SIZE_LIMIT}).`);
    return;
  }

  const { error } = await supabase.storage.createBucket(name, {
    public: true,
    fileSizeLimit: BUCKET_FILE_SIZE_LIMIT,
    allowedMimeTypes,
  });
  if (error) throw error;

  console.log(`✓ Created public bucket "${name}".`);
}

async function main() {
  const supabase = getSupabaseAdmin();

  const { data: buckets, error: listError } = await supabase.storage.listBuckets();
  if (listError) throw listError;

  const existing = buckets?.map((b) => b.name) ?? [];
  await ensureBucket(supabase, STORE_LOGOS_BUCKET, existing, STORE_LOGOS_MIME_TYPES);
  await ensureBucket(supabase, ARTICLE_IMAGES_BUCKET, existing, ARTICLE_IMAGES_MIME_TYPES);
}

main().catch((err) => {
  console.error("Failed to set up Supabase storage:", err.message || err);
  process.exit(1);
});
