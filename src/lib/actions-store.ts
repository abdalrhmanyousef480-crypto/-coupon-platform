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

async function requireAdmin() {
  const session = await getServerSession(authOptions);
  if (!session) throw new Error("غير مصرّح");
  return session;
}

export type ActionResult = { success: true } | { success: false; error: string };

export async function createStore(data: StoreInput): Promise<ActionResult> {
  await requireAdmin();
  const parsed = storeSchema.safeParse(data);
  if (!parsed.success) return { success: false, error: parsed.error.errors[0].message };

  const existing = await db.store.findUnique({ where: { slug: parsed.data.slug } });
  if (existing) return { success: false, error: "الرابط (slug) مستخدم بالفعل، اختر رابطًا آخر" };

  await db.store.create({
    data: {
      ...parsed.data,
      ogImage: parsed.data.ogImage || null,
      canonicalUrl: parsed.data.canonicalUrl || null,
      seoTitle: parsed.data.seoTitle || null,
      seoDescription: parsed.data.seoDescription || null,
      seoTitleAr: parsed.data.seoTitleAr || null,
      seoDescriptionAr: parsed.data.seoDescriptionAr || null,
    },
  });

  revalidateStorePaths(parsed.data.slug);
  redirect("/admin/stores");
}

export async function updateStore(id: string, data: StoreInput): Promise<ActionResult> {
  await requireAdmin();
  const parsed = storeSchema.safeParse(data);
  if (!parsed.success) return { success: false, error: parsed.error.errors[0].message };

  const existing = await db.store.findFirst({ where: { slug: parsed.data.slug, id: { not: id } } });
  if (existing) return { success: false, error: "الرابط (slug) مستخدم بالفعل بمتجر آخر" };

  const oldStore = await db.store.findUnique({ where: { id } });

  await db.store.update({
    where: { id },
    data: {
      ...parsed.data,
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
    revalidateStorePaths(oldStore.slug);
  }

  revalidateStorePaths(parsed.data.slug);
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

  await db.store.delete({ where: { id } });
  revalidateStorePaths(store.slug);
  return { success: true };
}

export async function toggleStorePublish(id: string, isPublished: boolean) {
  await requireAdmin();
  const store = await db.store.update({ where: { id }, data: { isPublished } });
  revalidateStorePaths(store.slug);
}

function revalidateStorePaths(slug: string) {
  revalidatePath("/");
  revalidatePath("/stores");
  revalidatePath(`/store/${slug}`);
  revalidatePath("/admin/stores");
  revalidatePath("/sitemap.xml");
}
