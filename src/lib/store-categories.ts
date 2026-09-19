// ============================================================
// Store ↔ Category (many-to-many عبر جدول StoreCategory)
// نقطة واحدة لكل المنطق المشترك: الـ includes، ترتيب "التصنيف الأساسي"،
// وكتابات المزامنة — عشان الأدمن والصفحات العامة والسكربتات تستخدم نفس
// التعريف بدل ما كل ملف يعيد كتابته.
// ============================================================
import type { Category, Prisma } from "@prisma/client";

/** أقدم علاقة = التصنيف "الأساسي" للمتجر (الأصلي قبل الـ migration). عند تساوي
 *  التاريخ (أُسندت بنفس العملية) نرتّب أبجديًا بالاسم العربي عشان الترتيب ثابت. */
const CATEGORY_ORDER = [{ createdAt: "asc" }, { category: { nameAr: "asc" } }] satisfies Prisma.StoreCategoryOrderByWithRelationInput[];

/** كل تصنيفات المتجر (للأدمن) — بدون فلترة النشر. */
export const storeCategoriesInclude = {
  categories: { orderBy: CATEGORY_ORDER, include: { category: true } },
} satisfies Prisma.StoreInclude;

/** التصنيفات المنشورة فقط (للموقع العام) — رابط لتصنيف غير منشور يعطي 404. */
export const publicStoreCategoriesInclude = {
  categories: { where: { category: { isPublished: true } }, orderBy: CATEGORY_ORDER, include: { category: true } },
} satisfies Prisma.StoreInclude;

/** يفرد مصفوفة StoreCategory[] المحمّلة بأحد الـ includes أعلاه إلى Category[]. */
export function categoriesOf(store: { categories: { category: Category }[] }): Category[] {
  return store.categories.map((sc) => sc.category);
}

/** فلتر: متاجر تنتمي لأي تصنيف من القائمة (متجر واحد = صف واحد، بدون تكرار). */
export function storesInCategoriesWhere(categoryIds: string[]): Prisma.StoreWhereInput {
  return { categories: { some: { categoryId: { in: categoryIds } } } };
}

/** كتابة إنشاء علاقات التصنيفات مع متجر جديد (nested write داخل db.store.create). */
export function storeCategoriesCreate(categoryIds: string[]) {
  return { createMany: { data: categoryIds.map((categoryId) => ({ categoryId })), skipDuplicates: true } };
}

/** كتابة مزامنة العلاقات مع القائمة الجديدة (nested write داخل db.store.update):
 *  - deleteMany: يحذف فقط التصنيفات اللي انشالت من الاختيار
 *  - createMany(skipDuplicates): يضيف الجديدة فقط، والباقية تبقى كما هي (بتاريخها الأصلي)
 *  Prisma بيشغّلها كلها بترانزاكشن واحدة مع تحديث المتجر نفسه. */
export function storeCategoriesSync(categoryIds: string[]) {
  return {
    deleteMany: { categoryId: { notIn: categoryIds } },
    createMany: { data: categoryIds.map((categoryId) => ({ categoryId })), skipDuplicates: true },
  };
}
