// ============================================================
// إعداد Supabase Storage — سكربت لمرة واحدة
// ينشئ bucket "store-logos" بقراءة عامة (public) لو مش موجود أصلًا.
// شغّله بأمر: npm run storage:setup
// ============================================================
import "dotenv/config";
import { getSupabaseAdmin, STORE_LOGOS_BUCKET } from "../src/lib/supabase";

async function main() {
  const supabase = getSupabaseAdmin();

  const { data: buckets, error: listError } = await supabase.storage.listBuckets();
  if (listError) throw listError;

  if (buckets?.some((b) => b.name === STORE_LOGOS_BUCKET)) {
    console.log(`✓ Bucket "${STORE_LOGOS_BUCKET}" already exists — nothing to do.`);
    return;
  }

  const { error } = await supabase.storage.createBucket(STORE_LOGOS_BUCKET, {
    public: true,
    fileSizeLimit: "2MB",
    allowedMimeTypes: ["image/webp", "image/svg+xml"],
  });
  if (error) throw error;

  console.log(`✓ Created public bucket "${STORE_LOGOS_BUCKET}".`);
}

main().catch((err) => {
  console.error("Failed to set up Supabase storage:", err.message || err);
  process.exit(1);
});
