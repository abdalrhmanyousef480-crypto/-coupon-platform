// ============================================================
// تقرير سلامة علاقة Store ↔ Category (قراءة فقط، لا يعدّل شيئًا)
// شغّله: npx tsx scripts/verify-store-categories.ts
// exit code 1 لو وُجد: تكرار / علاقات يتيمة / إسناد قديم لم ينتقل.
// ============================================================
import { createScriptClient } from "./_client";

const db = createScriptClient();

async function main() {
  const [stores, categories, relations, multi, noCategory, duplicates, orphans, legacy] = await Promise.all([
    db.store.count(),
    db.category.count(),
    db.storeCategory.count(),
    db.$queryRaw<{ n: bigint }[]>`SELECT count(*)::bigint AS n FROM (SELECT "storeId" FROM store_categories GROUP BY "storeId" HAVING count(*) > 1) t`,
    db.store.count({ where: { categories: { none: {} } } }),
    db.$queryRaw<{ n: bigint }[]>`SELECT count(*)::bigint AS n FROM (SELECT 1 FROM store_categories GROUP BY "storeId", "categoryId" HAVING count(*) > 1) t`,
    db.$queryRaw<{ n: bigint }[]>`
      SELECT count(*)::bigint AS n FROM store_categories sc
      LEFT JOIN stores s ON s.id = sc."storeId"
      LEFT JOIN categories c ON c.id = sc."categoryId"
      WHERE s.id IS NULL OR c.id IS NULL`,
    db.$queryRaw<{ total: bigint; preserved: bigint }[]>`
      SELECT count(*)::bigint AS total,
             count(sc."storeId")::bigint AS preserved
      FROM stores s
      LEFT JOIN store_categories sc ON sc."storeId" = s.id AND sc."categoryId" = s."categoryId"
      WHERE s."categoryId" IS NOT NULL`,
  ]);

  const dupCount = Number(duplicates[0].n);
  const orphanCount = Number(orphans[0].n);
  const legacyTotal = Number(legacy[0].total);
  const legacyPreserved = Number(legacy[0].preserved);

  console.log("── Store ↔ Category verification ──");
  console.log(`total stores                        : ${stores}`);
  console.log(`total categories                    : ${categories}`);
  console.log(`total StoreCategory relationships   : ${relations}`);
  console.log(`stores with multiple categories     : ${Number(multi[0].n)}`);
  console.log(`duplicate StoreCategory pairs       : ${dupCount}`);
  console.log(`orphan relationships                : ${orphanCount}`);
  console.log(`stores with no category             : ${noCategory}`);
  console.log(`legacy assignments preserved        : ${legacyPreserved} / ${legacyTotal}`);

  const problems: string[] = [];
  if (dupCount) problems.push(`${dupCount} duplicate pair(s)`);
  if (orphanCount) problems.push(`${orphanCount} orphan relationship(s)`);
  if (legacyPreserved !== legacyTotal) problems.push(`${legacyTotal - legacyPreserved} legacy assignment(s) missing from store_categories`);
  if (noCategory) console.log(`⚠ ${noCategory} store(s) have no category (allowed by the DB; the admin form requires at least one)`);

  if (problems.length) {
    console.error(`✗ FAILED: ${problems.join("; ")}`);
    process.exitCode = 1;
  } else {
    console.log("✓ OK — no duplicates, no orphans, all legacy assignments preserved");
  }
}

main().catch((e) => { console.error("✗", (e as Error).message.split("\n")[0]); process.exitCode = 1; }).finally(() => db.$disconnect());
