// ============================================================
// اختبار سلوك المتجر متعدد التصنيفات على قاعدة البيانات الفعلية — بدون ترك أي أثر:
// كل العمليات داخل ترانزاكشن تفاعلية واحدة بتنتهي بـ throw متعمّد (= rollback)،
// وبعدها نتأكد من خارج الترانزاكشن إن الجدول رجع بالضبط كما كان.
//
//   Noon ← [إلكترونيات, أزياء, المنزل]  => 3 علاقات بالضبط
//   ثم حذف "المنزل"                      => تبقى إلكترونيات + أزياء فقط
//
// يستخدم نفس دالة المزامنة (storeCategoriesSync) اللي يستخدمها الأدمن.
// شغّله: npx tsx scripts/test-store-multi-category.ts
// ============================================================
import { createScriptClient } from "./_client";
import { storeCategoriesSync } from "../src/lib/store-categories";

const db = createScriptClient();

class Rollback extends Error {}
let failures = 0;
function check(label: string, ok: boolean) {
  console.log(`${ok ? "✓" : "✗"} ${label}`);
  if (!ok) failures++;
}
const sorted = (a: string[]) => [...a].sort().join(",");

async function main() {
  const snapshot = async () =>
    (await db.storeCategory.findMany({ select: { storeId: true, categoryId: true }, orderBy: [{ storeId: "asc" }, { categoryId: "asc" }] }))
      .map((r) => `${r.storeId}:${r.categoryId}`).join("|");
  const before = await snapshot();

  const noon = await db.store.findUnique({ where: { slug: "noon" }, select: { id: true } });
  const cats = await db.category.findMany({ where: { slug: { in: ["electronics", "fashion", "home"] } }, select: { id: true, slug: true } });
  const id = (slug: string) => cats.find((c) => c.slug === slug)?.id as string;
  if (!noon || cats.length !== 3) throw new Error("Noon أو أحد التصنيفات (electronics/fashion/home) غير موجود بالقاعدة");

  try {
    await db.$transaction(async (tx) => {
      const idsOf = async () => (await tx.storeCategory.findMany({ where: { storeId: noon.id }, select: { categoryId: true } })).map((r) => r.categoryId);

      // 1) إسناد 3 تصنيفات
      await tx.store.update({ where: { id: noon.id }, data: { categories: storeCategoriesSync([id("electronics"), id("fashion"), id("home")]) } });
      const three = await idsOf();
      check("Noon has exactly 3 category relationships", three.length === 3);
      check("…Electronics + Fashion + Home", sorted(three) === sorted([id("electronics"), id("fashion"), id("home")]));
      check("still ONE Noon store record", (await tx.store.count({ where: { slug: "noon" } })) === 1);

      // 2) نفس الزوج مرة ثانية ما بيتكرر
      const dup = await tx.storeCategory.createMany({ data: [{ storeId: noon.id, categoryId: id("electronics") }], skipDuplicates: true });
      check("re-adding Noon + Electronics creates no second relationship", dup.count === 0 && (await idsOf()).length === 3);

      // 3) حذف "المنزل"
      await tx.store.update({ where: { id: noon.id }, data: { categories: storeCategoriesSync([id("electronics"), id("fashion")]) } });
      const two = await idsOf();
      check("after removing Home, Noon has Electronics + Fashion", sorted(two) === sorted([id("electronics"), id("fashion")]));
      check("…and no longer has Home", !two.includes(id("home")));
      check("…Noon still exists (one record)", (await tx.store.count({ where: { slug: "noon" } })) === 1);

      // 4) الاتجاه المعاكس: التصنيف الواحد يحتوي عدة متاجر، والمتجر يظهر مرة وحدة
      const inElectronics = await tx.store.findMany({ where: { categories: { some: { categoryId: id("electronics") } } }, select: { id: true } });
      check("Electronics lists Noon exactly once", inElectronics.filter((s) => s.id === noon.id).length === 1);

      throw new Rollback(); // ← rollback متعمّد: لا يبقى أي أثر
    }, { timeout: 30_000 });
  } catch (e) {
    if (!(e instanceof Rollback)) throw e;
  }

  check("no permanent test data left (store_categories identical to before)", (await snapshot()) === before);
  console.log(failures ? `\n✗ ${failures} check(s) FAILED` : "\n✓ multi-category behavior verified (transaction rolled back, nothing persisted)");
  if (failures) process.exitCode = 1;
}

main().catch((e) => { console.error("✗", (e as Error).message.split("\n")[0]); process.exitCode = 1; }).finally(() => db.$disconnect());
