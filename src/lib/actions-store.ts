"use server";

// ============================================================
// STORE ADMIN ACTIONS
// ============================================================
// كل دالة هون بتشتغل مباشرة على قاعدة البيانات من نموذج الداشبورد.
// بعد كل تعديل، revalidatePath بيمسح الكاش لصفحات الموقع المتأثرة
// فورًا (الصفحة العامة + صفحة القائمة + السايتماب) — هيك أي تغيير
// من لوحة التحكم يظهر على الموقع الحي مباشرة بدون انتظار.
// ============================================================
import { storeHubPath } from "@/lib/store-hub";
import { revalidatePath, revalidateTag } from "next/cache";
import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import { notifyIndexNow } from "@/lib/indexnow";
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
  // Only NEW store records require a manual image; previously published stores stay intact.
  // A manual store image is optional: new stores show their coupon's auto-generated image.

  const existing = await db.store.findUnique({ where: { slug: parsed.data.slug } });
  if (existing) return { success: false, error: "الرابط (slug) مستخدم بالفعل، اختر رابطًا آخر" };

  const { categoryIds, ...storeData } = parsed.data;
  if (!(await categoryIdsExist(categoryIds))) return { success: false, error: "أحد التصنيفات المختارة غير موجود" };

  const created = await db.store.create({
    data: {
      ...storeData,
      categories: storeCategoriesCreate(categoryIds),
      hubCouponSlug: null,
      hubImageSource: null,
      cardImageUrl: parsed.data.cardImageUrl || null,
      ogImage: parsed.data.ogImage || null,
      canonicalUrl: parsed.data.canonicalUrl || null,
      seoTitle: parsed.data.seoTitle || null,
      seoDescription: parsed.data.seoDescription || null,
      seoTitleAr: parsed.data.seoTitleAr || null,
      seoDescriptionAr: parsed.data.seoDescriptionAr || null,
    },
  });

  await revalidateStorePaths(created.id, parsed.data.slug);
  if (created.isPublished && !created.noindex) await notifyIndexNow([`/store/${created.slug}`]);
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

  const oldStore = await db.store.findUnique({
    where: { id },
    include: { categories: { select: { category: { select: { slug: true } } } } },
  });

  // Unified store page choices must point at this store's own published coupons.
  const publishedSlugs = (await db.coupon.findMany({ where: { storeId: id, isPublished: true }, select: { slug: true } })).map((c) => c.slug);
  const hubCouponSlug = parsed.data.hubCouponSlug || null;
  if (hubCouponSlug && !publishedSlugs.includes(hubCouponSlug)) return { success: false, error: "رابط الصفحة المختار لا يطابق كوبونًا منشورًا لهذا المتجر" };
  const hubImageSource = parsed.data.hubImageSource || null;
  if (hubImageSource && hubImageSource !== "store" && !(hubImageSource.startsWith("coupon:") && publishedSlugs.includes(hubImageSource.slice(7)))) {
    return { success: false, error: "الصورة المختارة لا تطابق صورة متاحة لهذا المتجر" };
  }

  // تحديث المتجر + مزامنة تصنيفاته بعملية (ترانزاكشن) واحدة: المحذوف ينحذف،
  // الجديد ينضاف، والباقي ما بينلمس — والمتجر نفسه يبقى سجل واحد.
  await db.store.update({
    where: { id },
    data: {
      ...storeData,
      categories: storeCategoriesSync(categoryIds),
      hubCouponSlug,
      hubImageSource,
      cardImageUrl: oldStore && (oldStore.logoUrl !== parsed.data.logoUrl || oldStore.name !== parsed.data.name) && parsed.data.cardImageUrl === (oldStore.cardImageUrl || "") ? null : (parsed.data.cardImageUrl || null),
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

  await revalidateStorePaths(id, parsed.data.slug, oldStore?.categories.map(({ category }) => category.slug));
  const updated = await db.store.findUnique({ where: { id }, select: { slug: true, isPublished: true, noindex: true, hubCouponSlug: true } });
  const oldPath = oldStore ? storeHubPath(oldStore) : null;
  const newPath = storeHubPath({ slug: parsed.data.slug, hubCouponSlug: updated?.hubCouponSlug ?? null });
  const changedPaths = [
    ...(oldPath && oldPath !== newPath ? [oldPath] : []),
    ...(updated?.isPublished && !updated.noindex ? [newPath] : []),
    ...(oldStore?.isPublished && !oldStore.noindex && (!updated?.isPublished || updated.noindex) && oldPath ? [oldPath] : []),
  ];
  await notifyIndexNow(changedPaths);
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
  if (store.isPublished) await notifyIndexNow([`/store/${store.slug}`]);
  return { success: true };
}

export async function toggleStorePublish(id: string, isPublished: boolean) {
  await requireAdmin();
  const store = await db.store.update({ where: { id }, data: { isPublished } });
  await revalidateStorePaths(id, store.slug);
  await notifyIndexNow([`/store/${store.slug}`]);
}

// كل متجر بيظهر بأكتر من مكان: صفحته + كل كوبوناته + كل تصنيف منتمي له +
// قائمة /coupons العامة (لو عنده كوبونات منشورة) + السايتماب. حذف/إلغاء نشر/
// تعديل المتجر لازم يمسح كاش كل هالأماكن دفعة وحدة، وإلا تضل روابط ميتة
// (404) معروضة بصفحات تصنيف أو بالسايتماب لحد ما ينتهي revalidate=3600
// لوحده — بالضبط المشكلة اللي كشفها Site Audit (متجرين ملغى نشرهم ضلوا
// يظهروا بـ /category/fashion و/category/home و/coupons وبالسايتماب).
async function revalidateStorePaths(storeId: string, slug: string, previousCategorySlugs: string[] = []) {
  // Store visibility and SEO eligibility also change which coupons are listed.
  revalidateTag("public-coupons-list");
  revalidatePath("/");
  revalidatePath("/stores");
  revalidatePath("/coupons");
  // النوع الصريح "page" هون مقصود، مو زيادة: صفحة متجر رجّعت notFound() مرة
  // (متجر كان isPublished:false) بتخزن كنتيجة "404" بكاش Next.js، وrevalidatePath
  // بدون النوع الصريح لصفحة dynamic segment أحيانًا ما بيمسح هالنسخة الخاصة
  // بـ notFound فعليًا (مشكلة موثقة بـ Next.js App Router) — يعني إعادة نشر
  // متجر بعد إلغاء نشره ممكن تفضل تعطي 404 لحد ما ينتهي revalidate=3600
  // لوحده، حتى لو isPublished رجع true فعليًا بقاعدة البيانات فورًا.
  revalidatePath(`/store/${slug}`, "page");
  revalidatePath("/admin/stores");
  revalidatePath("/sitemap.xml");
  await revalidateCategoriesForStore(storeId, previousCategorySlugs);
  // صفحة كل كوبون تابع للمتجر فيها منطق مستقل (بيتأكد إن المتجر نفسه
  // isPublished وإلا 404) — بدون هالسطر، إلغاء نشر/حذف المتجر يخلي صفحة
  // الكوبون تفضل بالكاش القديم (منشورة) لحد ما ينتهي revalidate=3600 لوحده.
  const coupons = await db.coupon.findMany({ where: { storeId }, select: { slug: true } });
  for (const c of coupons) revalidatePath(`/store/${slug}/coupon/${c.slug}`, "page");
}
