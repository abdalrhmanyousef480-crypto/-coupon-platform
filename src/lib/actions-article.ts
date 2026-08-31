"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import { articleSchema, type ArticleInput } from "@/lib/validations";
import type { ActionResult } from "@/lib/actions-store";

async function requireAdmin() {
  const session = await getServerSession(authOptions);
  if (!session?.user) throw new Error("غير مصرّح");
  return session;
}

export async function createArticle(data: ArticleInput): Promise<ActionResult> {
  const session = await requireAdmin();
  const parsed = articleSchema.safeParse(data);
  if (!parsed.success) return { success: false, error: parsed.error.errors[0].message };

  const existing = await db.article.findUnique({ where: { slug: parsed.data.slug } });
  if (existing) return { success: false, error: "الرابط مستخدم بالفعل" };

  const userId = session.user.id;
  if (!userId) return { success: false, error: "تعذر تحديد هوية المستخدم" };

  await db.article.create({
    data: {
      ...parsed.data,
      categoryId: parsed.data.categoryId || null,
      canonicalUrl: parsed.data.canonicalUrl || null,
      seoTitle: parsed.data.seoTitle || null,
      seoDescription: parsed.data.seoDescription || null,
      seoTitleAr: parsed.data.seoTitleAr || null,
      seoDescriptionAr: parsed.data.seoDescriptionAr || null,
      authorId: userId,
      publishedAt: parsed.data.status === "PUBLISHED" ? new Date() : null,
    },
  });
  revalidateArticlePaths(parsed.data.slug);
  redirect("/admin/articles");
}

export async function updateArticle(id: string, data: ArticleInput): Promise<ActionResult> {
  await requireAdmin();
  const parsed = articleSchema.safeParse(data);
  if (!parsed.success) return { success: false, error: parsed.error.errors[0].message };

  const existing = await db.article.findFirst({ where: { slug: parsed.data.slug, id: { not: id } } });
  if (existing) return { success: false, error: "الرابط مستخدم بالفعل بمقال آخر" };

  const old = await db.article.findUnique({ where: { id } });
  if (!old) return { success: false, error: "المقال غير موجود" };

  const wasPublished = old.status === "PUBLISHED";
  const willBePublished = parsed.data.status === "PUBLISHED";

  await db.article.update({
    where: { id },
    data: {
      ...parsed.data,
      categoryId: parsed.data.categoryId || null,
      canonicalUrl: parsed.data.canonicalUrl || null,
      seoTitle: parsed.data.seoTitle || null,
      seoDescription: parsed.data.seoDescription || null,
      seoTitleAr: parsed.data.seoTitleAr || null,
      seoDescriptionAr: parsed.data.seoDescriptionAr || null,
      publishedAt: !wasPublished && willBePublished ? new Date() : old.publishedAt,
      updatedAtContent: new Date(),
    },
  });

  if (old.slug !== parsed.data.slug) {
    await db.redirect.create({ data: { fromPath: `/blog/${old.slug}`, toPath: `/blog/${parsed.data.slug}`, statusCode: 301 } }).catch(() => {});
    revalidateArticlePaths(old.slug);
  }
  revalidateArticlePaths(parsed.data.slug);
  redirect("/admin/articles");
}

export async function deleteArticle(id: string): Promise<ActionResult> {
  await requireAdmin();
  const article = await db.article.findUnique({ where: { id } });
  if (!article) return { success: false, error: "المقال غير موجود" };

  await db.article.delete({ where: { id } });
  revalidateArticlePaths(article.slug);
  return { success: true };
}

function revalidateArticlePaths(slug: string) {
  revalidatePath("/");
  revalidatePath("/blog");
  revalidatePath(`/blog/${slug}`);
  revalidatePath("/admin/articles");
  revalidatePath("/sitemap.xml");
}
