"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import { categorySchema, type CategoryInput } from "@/lib/validations";
import type { ActionResult } from "@/lib/actions-store";

async function requireAdmin() {
  const session = await getServerSession(authOptions);
  if (!session) throw new Error("غير مصرّح");
  return session;
}

export async function createCategory(data: CategoryInput): Promise<ActionResult> {
  await requireAdmin();
  const parsed = categorySchema.safeParse(data);
  if (!parsed.success) return { success: false, error: parsed.error.errors[0].message };

  const existing = await db.category.findUnique({ where: { slug: parsed.data.slug } });
  if (existing) return { success: false, error: "الرابط مستخدم بالفعل" };

  await db.category.create({
    data: {
      ...parsed.data,
      seoTitle: parsed.data.seoTitle || null,
      seoDescription: parsed.data.seoDescription || null,
      seoTitleAr: parsed.data.seoTitleAr || null,
      seoDescriptionAr: parsed.data.seoDescriptionAr || null,
    },
  });
  revalidateCategoryPaths(parsed.data.slug);
  redirect("/admin/categories");
}

export async function updateCategory(id: string, data: CategoryInput): Promise<ActionResult> {
  await requireAdmin();
  const parsed = categorySchema.safeParse(data);
  if (!parsed.success) return { success: false, error: parsed.error.errors[0].message };

  const existing = await db.category.findFirst({ where: { slug: parsed.data.slug, id: { not: id } } });
  if (existing) return { success: false, error: "الرابط مستخدم بالفعل بتصنيف آخر" };

  const old = await db.category.findUnique({ where: { id } });
  await db.category.update({
    where: { id },
    data: {
      ...parsed.data,
      seoTitle: parsed.data.seoTitle || null,
      seoDescription: parsed.data.seoDescription || null,
      seoTitleAr: parsed.data.seoTitleAr || null,
      seoDescriptionAr: parsed.data.seoDescriptionAr || null,
    },
  });

  if (old && old.slug !== parsed.data.slug) {
    await db.redirect.create({ data: { fromPath: `/category/${old.slug}`, toPath: `/category/${parsed.data.slug}`, statusCode: 301 } }).catch(() => {});
    revalidateCategoryPaths(old.slug);
  }
  revalidateCategoryPaths(parsed.data.slug);
  redirect("/admin/categories");
}

export async function deleteCategory(id: string): Promise<ActionResult> {
  await requireAdmin();
  const category = await db.category.findUnique({ where: { id } });
  if (!category) return { success: false, error: "التصنيف غير موجود" };

  const [storeCount, couponCount] = await Promise.all([
    db.store.count({ where: { categoryId: id } }),
    db.coupon.count({ where: { categoryId: id } }),
  ]);
  if (storeCount > 0 || couponCount > 0) {
    return { success: false, error: `لا يمكن حذف هذا التصنيف لارتباطه بـ ${storeCount} متجر و ${couponCount} كوبون. أعد تصنيفهم أولًا.` };
  }

  await db.category.delete({ where: { id } });
  revalidateCategoryPaths(category.slug);
  return { success: true };
}

function revalidateCategoryPaths(slug: string) {
  revalidatePath("/");
  revalidatePath("/categories");
  revalidatePath(`/category/${slug}`);
  revalidatePath("/admin/categories");
  revalidatePath("/sitemap.xml");
}
