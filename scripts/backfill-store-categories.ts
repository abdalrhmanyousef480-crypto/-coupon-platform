// ============================================================
// Backfill: stores.categoryId (العمود القديم) → store_categories
// آمن للتكرار (idempotent): createMany + skipDuplicates، وما بيحذف ولا
// بيعدّل أي شيء موجود. شغّله: npx tsx scripts/backfill-store-categories.ts
// (الـ migration SQL بيعمل نفس النقل — هذا السكربت للتأكد/لإعادة التشغيل لو
// انضاف متجر بالنظام القديم أثناء فترة الانتقال.)
// ============================================================
import { createScriptClient } from "./_client";

const db = createScriptClient();

async function main() {
  const [storesTotal, relationsBefore] = await Promise.all([db.store.count(), db.storeCategory.count()]);

  const legacy = await db.store.findMany({
    where: { legacyCategoryId: { not: null } },
    select: { id: true, name: true, legacyCategoryId: true, createdAt: true },
  });
  const categoryIds = new Set((await db.category.findMany({ select: { id: true } })).map((c) => c.id));

  const valid = legacy.filter((s) => s.legacyCategoryId && categoryIds.has(s.legacyCategoryId));
  const dangling = legacy.filter((s) => !s.legacyCategoryId || !categoryIds.has(s.legacyCategoryId));

  const result = await db.storeCategory.createMany({
    data: valid.map((s) => ({ storeId: s.id, categoryId: s.legacyCategoryId!, createdAt: s.createdAt })),
    skipDuplicates: true,
  });

  // تحقق: كل إسناد قديم صحيح لازم يكون موجود الآن بالجدول الجديد
  const existing = await db.storeCategory.findMany({
    where: { storeId: { in: valid.map((s) => s.id) } },
    select: { storeId: true, categoryId: true },
  });
  const have = new Set(existing.map((r) => `${r.storeId}:${r.categoryId}`));
  const missing = valid.filter((s) => !have.has(`${s.id}:${s.legacyCategoryId}`));

  console.log("── Backfill store_categories ──");
  console.log(`stores (total)                      : ${storesTotal}`);
  console.log(`stores with a legacy categoryId     : ${legacy.length}`);
  console.log(`store_categories rows before        : ${relationsBefore}`);
  console.log(`rows inserted now                   : ${result.count}`);
  console.log(`rows already present (skipped)      : ${valid.length - result.count}`);
  console.log(`store_categories rows after         : ${await db.storeCategory.count()}`);
  console.log(`legacy assignments preserved        : ${valid.length - missing.length} / ${valid.length}`);
  if (dangling.length) console.log(`⚠ legacy categoryId points to a missing category: ${dangling.map((s) => s.name).join(", ")}`);
  if (missing.length) {
    console.error(`✗ NOT preserved: ${missing.map((s) => s.name).join(", ")}`);
    process.exitCode = 1;
  } else {
    console.log("✓ every legacy Store → Category assignment exists in store_categories");
  }
}

main().catch((e) => { console.error("✗", (e as Error).message.split("\n")[0]); process.exitCode = 1; }).finally(() => db.$disconnect());
