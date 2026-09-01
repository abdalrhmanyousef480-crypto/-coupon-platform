// ============================================================
// إعداد Supabase Storage — سكربت لمرة واحدة
// ينشئ buckets "store-logos" و"article-images" بقراءة عامة (public)
// لو مش موجودين أصلًا. شغّله بأمر: npm run storage:setup
// ============================================================
import "dotenv/config";
import { getSupabaseAdmin, STORE_LOGOS_BUCKET, ARTICLE_IMAGES_BUCKET } from "../src/lib/supabase";

async function ensureBucket(
  supabase: ReturnType<typeof getSupabaseAdmin>,
  name: string,
  existing: string[]
) {
  if (existing.includes(name)) {
    console.log(`✓ Bucket "${name}" already exists — nothing to do.`);
    return;
  }

  const { error } = await supabase.storage.createBucket(name, {
    public: true,
    fileSizeLimit: "2MB",
    allowedMimeTypes: ["image/webp", "image/svg+xml"],
  });
  if (error) throw error;

  console.log(`✓ Created public bucket "${name}".`);
}

async function main() {
  const supabase = getSupabaseAdmin();

  const { data: buckets, error: listError } = await supabase.storage.listBuckets();
  if (listError) throw listError;

  const existing = buckets?.map((b) => b.name) ?? [];
  await ensureBucket(supabase, STORE_LOGOS_BUCKET, existing);
  await ensureBucket(supabase, ARTICLE_IMAGES_BUCKET, existing);
}

main().catch((err) => {
  console.error("Failed to set up Supabase storage:", err.message || err);
  process.exit(1);
});
