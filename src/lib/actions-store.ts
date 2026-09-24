"use server";

// ============================================================
// STORE ADMIN ACTIONS
// ============================================================
// كل دالة هون بتشتغل مباشرة على قاعدة البيانات من نموذج الداشبورد.
// بعد كل تعديل، revalidatePath بيمسح الكاش لصفحات الموقع المتأثرة
// فورًا (الصفحة العامة + صفحة القائمة + السايتماب) — هيك أي تغيير
// من لوحة التحكم يظهر على الموقع الحي مباشرة بدون انتظار.
// ============================================================
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import { storeSchema, type StoreInput } from "@/lib/validations";
import { storeCategoriesCreate, storeCategoriesSync, revalidateCategoriesForStore } from "@/lib/store-categories";

async function requireAdmin() {
  const session = await getServerSession(authOptions);
  if (!session) throw new Error("غير مصرّح");
  return session;
}

export type ActionResult = { success: true } | { success: false; error: string };

// كل الـ IDs لازم تكون تصنيفات موجودة فعلًا (الـ Zod بيضمن بس الشكل + عدم التكرار)
async function categoryIdsExist(categoryIds: string[]) {
  const found = await db.category.count({ where: { id: { in: categoryIds } } });
  return found === categoryIds.length;
}

export async function createStore(data: StoreInput): Promise<ActionResult> {
  await requireAdmin();
  const parsed = storeSchema.safeParse(data);
  if (!parsed.success) return { success: false, error: parsed.error.errors[0].message };

  const existing = await db.store.findUnique({ where: { slug: parsed.data.slug } });
  if (existing) return { success: false, error: "الرابط (slug) مستخدم بالفعل، اختر رابطًا آخر" };

  const { categoryIds, ...storeData } = parsed.data;
  if (!(await categoryIdsExist(categoryIds))) return { success: false, error: "أحد التصنيفات المختارة غير موجود" };

  const created = await db.store.create({
    data: {
      ...storeData,
      categories: storeCategoriesCreate(categoryIds),
      ogImage: parsed.data.ogImage || null,
      canonicalUrl: parsed.data.canonicalUrl || null,
      seoTitle: parsed.data.seoTitle || null,
      seoDescription: parsed.data.seoDescription || null,
      seoTitleAr: parsed.data.seoTitleAr || null,
      seoDescriptionAr: parsed.data.seoDescriptionAr || null,
    },
  });

  await revalidateStorePaths(created.id, parsed.data.slug);
  redirect("/admin/stores");
}

export async function updateStore(id: string, data: StoreInput): Promise<ActionResult> {
  await requireAdmin();
  const parsed = storeSchema.safeParse(data);
  if (!parsed.success) return { success: false, error: parsed.error.errors[0].message };

  const existing = await db.store.findFirst({ where: { slug: parsed.data.slug, id: { not: id } } });
  if (existing) return { success: false, error: "الرابط (slug) مستخدم بالفعل بمتجر آخر" };

  const { categoryIds, ...storeData } = parsed.data;
  if (!(await categoryIdsExist(categoryIds))) return { success: false, error: "أحد التصنيفات المختارة غير موجود" };

  const oldStore = await db.store.findUnique({ where: { id } });

  // تحديث المتجر + مزامنة تصنيفاته بعملية (ترانزاكشن) واحدة: المحذوف ينحذف،
  // الجديد ينضاف، والباقي ما بينلمس — والمتجر نفسه يبقى سجل واحد.
  await db.store.update({
    where: { id },
    data: {
      ...storeData,
      categories: storeCategoriesSync(categoryIds),
      ogImage: parsed.data.ogImage || null,
      canonicalUrl: parsed.data.canonicalUrl || null,
      seoTitle: parsed.data.seoTitle || null,
      seoDescription: parsed.data.seoDescription || null,
      seoTitleAr: parsed.data.seoTitleAr || null,
      seoDescriptionAr: parsed.data.seoDescriptionAr || null,
    },
  });

  // لو تغيّر الـ slug، ننشئ Redirect 301 تلقائيًا عشان ما نخسر أي فهرسة قديمة (قسم 38 بالبرومبت)
  if (oldStore && oldStore.slug !== parsed.data.slug) {
    await db.redirect.create({
      data: { fromPath: `/store/${oldStore.slug}`, toPath: `/store/${parsed.data.slug}`, statusCode: 301 },
    }).catch(() => {}); // لو فيه تعارض على fromPath القديم، نتجاهله بهدوء
    await revalidateStorePaths(id, oldStore.slug);
  }

  await revalidateStorePaths(id, parsed.data.slug);
  redirect("/admin/stores");
}

export async function deleteStore(id: string): Promise<ActionResult> {
  await requireAdmin();
  const store = await db.store.findUnique({ where: { id } });
  if (!store) return { success: false, error: "المتجر غير موجود" };

  const couponCount = await db.coupon.count({ where: { storeId: id } });
  if (couponCount > 0) {
    return { success: false, error: `لا يمكن حذف هذا المتجر لوجود ${couponCount} كوبون مرتبط به. احذف الكوبونات أولًا أو قم بإلغاء نشر المتجر بدلًا من حذفه.` };
  }

  // نعمل revalidate لتصنيفات المتجر *قبل* الحذف (لسه StoreCategory موجودة
  // بالجدول) — لو نفّذناها بعد db.store.delete، الـ cascade بيكون مسح
  // صفوف StoreCategory أصلًا فما تلاقي الاستعلام أي تصنيف يرجّعه.
  await revalidateCategoriesForStore(id);
  await db.store.delete({ where: { id } });
  await revalidateStorePaths(id, store.slug);
  return { success: true };
}

export async function toggleStorePublish(id: string, isPublished: boolean) {
  await requireAdmin();
  const store = await db.store.update({ where: { id }, data: { isPublished } });
  await revalidateStorePaths(id, store.slug);
}

// كل متجر بيظهر بأكتر من مكان: صفحته + كل كوبوناته + كل تصنيف منتمي له +
// قائمة /coupons العامة (لو عنده كوبونات منشورة) + السايتماب. حذف/إلغاء نشر/
// تعديل المتجر لازم يمسح كاش كل هالأماكن دفعة وحدة، وإلا تضل روابط ميتة
// (404) معروضة بصفحات تصنيف أو بالسايتماب لحد ما ينتهي revalidate=3600
// لوحده — بالضبط المشكلة اللي كشفها Site Audit (متجرين ملغى نشرهم ضلوا
// يظهروا بـ /category/fashion و/category/home و/coupons وبالسايتماب).
async function revalidateStorePaths(storeId: string, slug: string) {
  revalidatePath("/");
  revalidatePath("/stores");
  revalidatePath("/coupons");
  revalidatePath(`/store/${slug}`);
  revalidatePath("/admin/stores");
  revalidatePath("/sitemap.xml");
  await revalidateCategoriesForStore(storeId);
  // صفحة كل كوبون تابع للمتجر فيها منطق مستقل (بيتأكد إن المتجر نفسه
  // isPublished وإلا 404) — بدون هالسطر، إلغاء نشر/حذف المتجر يخلي صفحة
  // الكوبون تفضل بالكاش القديم (منشورة) لحد ما ينتهي revalidate=3600 لوحده.
  const coupons = await db.coupon.findMany({ where: { storeId }, select: { slug: true } });
  for (const c of coupons) revalidatePath(`/store/${slug}/coupon/${c.slug}`);
}
