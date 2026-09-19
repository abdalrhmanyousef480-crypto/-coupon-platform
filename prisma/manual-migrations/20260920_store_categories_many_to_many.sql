-- ============================================================
-- Store ↔ Category: من (متجر ← تصنيف واحد) إلى many-to-many
-- ============================================================
-- هذا المشروع ما بيستخدم "prisma migrate" (ما في مجلد migrations ولا baseline)،
-- بل "prisma db push". لذلك ما نقدر نستخدم migrate dev/deploy بأمان على
-- قاعدة موجودة (بيطلب reset). بدل هيك: SQL يدوي، additive، idempotent
-- (بيتكرر تشغيله بأمان)، وبيتنفّذ بأمر:
--
--   npx prisma db execute --file prisma/manual-migrations/20260920_store_categories_many_to_many.sql --schema prisma/schema.prisma
--
-- ثم نتأكد إن الـ schema بالـ DB مطابقة لـ schema.prisma (بدون diff):
--
--   npx prisma migrate diff --from-url "$DIRECT_URL" --to-schema-datamodel prisma/schema.prisma --exit-code
--
-- ترتيب الأمان (كله بترانزاكشن واحدة — أي فشل = rollback كامل):
--   1) إنشاء جدول store_categories (+ PK مركّب + index + FKs)
--   2) نقل (backfill) كل إسناد قديم stores.categoryId إلى الجدول الجديد
--   3) التحقق: لو أي متجر ما انتقل تصنيفه => نرمي استثناء (rollback)
--   4) فقط بعد نجاح 1-3: نجعل stores.categoryId اختياري ونفك FK/index القديمين
--      (العمود نفسه وبياناته تبقى كما هي — ما بنحذف أي عمود ولا صف)
-- ============================================================

BEGIN;

-- 1) الجدول الجديد -------------------------------------------------
CREATE TABLE IF NOT EXISTS "store_categories" (
    "storeId"    TEXT NOT NULL,
    "categoryId" TEXT NOT NULL,
    "createdAt"  TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "store_categories_pkey" PRIMARY KEY ("storeId", "categoryId")
);

CREATE INDEX IF NOT EXISTS "store_categories_categoryId_idx" ON "store_categories"("categoryId");

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'store_categories_storeId_fkey') THEN
    ALTER TABLE "store_categories"
      ADD CONSTRAINT "store_categories_storeId_fkey"
      FOREIGN KEY ("storeId") REFERENCES "stores"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'store_categories_categoryId_fkey') THEN
    ALTER TABLE "store_categories"
      ADD CONSTRAINT "store_categories_categoryId_fkey"
      FOREIGN KEY ("categoryId") REFERENCES "categories"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
  END IF;
END $$;

-- 2) Backfill: كل إسناد قديم => صف بالجدول الجديد -------------------
-- createdAt = تاريخ إنشاء المتجر، فيبقى التصنيف الأصلي هو الأقدم
-- (= التصنيف "الأساسي") حتى بعد إضافة تصنيفات أخرى لاحقًا.
INSERT INTO "store_categories" ("storeId", "categoryId", "createdAt")
SELECT s."id", s."categoryId", s."createdAt"
FROM "stores" s
WHERE s."categoryId" IS NOT NULL
ON CONFLICT ("storeId", "categoryId") DO NOTHING;

-- 3) التحقق قبل أي تغيير على العمود القديم --------------------------
DO $$
DECLARE
  missing integer;
BEGIN
  SELECT count(*) INTO missing
  FROM "stores" s
  WHERE s."categoryId" IS NOT NULL
    AND NOT EXISTS (
      SELECT 1 FROM "store_categories" sc
      WHERE sc."storeId" = s."id" AND sc."categoryId" = s."categoryId"
    );
  IF missing > 0 THEN
    RAISE EXCEPTION 'Backfill incomplete: % store(s) were not copied to store_categories — aborting (rollback).', missing;
  END IF;
END $$;

-- 4) العمود القديم: اختياري بدل إلزامي، وبدون FK/index --------------
-- (لا حذف للعمود ولا لبياناته — يبقى نسخة أمان، ويُحذف بخطوة لاحقة منفصلة)
ALTER TABLE "stores" ALTER COLUMN "categoryId" DROP NOT NULL;
ALTER TABLE "stores" DROP CONSTRAINT IF EXISTS "stores_categoryId_fkey";
DROP INDEX IF EXISTS "stores_categoryId_idx";

COMMIT;
