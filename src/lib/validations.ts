// ============================================================
// VALIDATION SCHEMAS — نفس الـ Schema تُستخدم بالـ Form
// (react-hook-form + zodResolver) وبالـ API Route وقت الحفظ،
// عشان ما يكون فيه تكرار قواعد أو تناقض بين الطرفين.
// ============================================================
import { z } from "zod";

// حقول النص الحرة تستخدم .trim() — بدون هذا، مسافات زايدة بأول/آخر النص
// (لصق من Word/واتساب) كانت تنحفظ بقاعدة البيانات كما هي وتطلع لاحقًا
// بـ <title>/JSON-LD كمسافة مزدوجة ظاهرة (seo.ts، دالة clean() بتنضّف
// نفس المشكلة وقت العرض للبيانات القديمة).
const seoFields = {
  seoTitle: z.string().trim().max(70).optional().or(z.literal("")),
  seoDescription: z.string().trim().max(160).optional().or(z.literal("")),
  seoTitleAr: z.string().trim().max(70).optional().or(z.literal("")),
  seoDescriptionAr: z.string().trim().max(160).optional().or(z.literal("")),
  noindex: z.boolean().default(false),
};

export const storeSchema = z.object({
  name: z.string().trim().min(2, "اسم المتجر مطلوب"),
  slug: z.string().min(2, "الرابط مطلوب").regex(/^[a-z0-9-]+$/, "أحرف إنجليزية صغيرة وأرقام وشرطات فقط"),
  logoUrl: z.string().url("رابط الشعار غير صالح"),
  website: z.string().url("رابط الموقع غير صالح"),
  // الإنجليزي اختياري مؤقتًا — الموقع الإنجليزي غير موجود بعد
  description: z.string().trim(),
  descriptionAr: z.string().trim().min(10, "الوصف بالعربي مطلوب (10 أحرف على الأقل)"),
  // متجر واحد ← عدة تصنيفات. تصنيف واحد على الأقل (نفس قاعدة "التصنيف مطلوب" السابقة)،
  // وبدون تكرار. التحقق من وجود الـ IDs فعليًا بقاعدة البيانات يتم بالـ action.
  categoryIds: z
    .array(z.string().min(1, "تصنيف غير صالح"))
    .min(1, "اختر تصنيفًا واحدًا على الأقل")
    .refine((ids) => new Set(ids).size === ids.length, "لا يمكن تكرار نفس التصنيف"),
  isPublished: z.boolean().default(true),
  isFeatured: z.boolean().default(false),
  ogImage: z.string().url().optional().or(z.literal("")),
  canonicalUrl: z.string().url().optional().or(z.literal("")),
  ...seoFields,
});
export type StoreInput = z.infer<typeof storeSchema>;

export const couponSchema = z.object({
  storeId: z.string().min(1, "المتجر مطلوب"),
  categoryId: z.string().optional().or(z.literal("")),
  slug: z.string().min(2, "الرابط مطلوب").regex(/^[a-z0-9-]+$/, "أحرف إنجليزية صغيرة وأرقام وشرطات فقط"),
  // الإنجليزي اختياري مؤقتًا — الموقع الإنجليزي غير موجود بعد
  title: z.string().trim(),
  titleAr: z.string().trim().min(3, "العنوان بالعربي مطلوب"),
  description: z.string().trim(),
  descriptionAr: z.string().trim().min(10, "الوصف بالعربي مطلوب"),
  terms: z.string().trim().optional().or(z.literal("")),
  termsAr: z.string().trim().optional().or(z.literal("")),
  type: z.enum(["CODE", "DEAL", "CASHBACK"]),
  code: z.string().trim().optional().or(z.literal("")),
  discountLabel: z.string().trim().min(1, "نص الخصم مطلوب (مثال: 20% أو Free Shipping)"),
  storeUrl: z.string().url("رابط المتجر غير صالح"),
  affiliateUrl: z.string().url().optional().or(z.literal("")),
  isVerified: z.boolean().default(false),
  isPublished: z.boolean().default(true),
  isFeatured: z.boolean().default(false),
  isTopCoupon: z.boolean().default(false),
  topCouponOrder: z.string().optional().or(z.literal("")), // رقم كنص من الـ form، زي expiresAt أدناه
  expiresAt: z.string().optional().or(z.literal("")), // date string من الـ form
  canonicalUrl: z.string().url().optional().or(z.literal("")),
  ...seoFields,
}).refine((data) => data.type !== "CODE" || (data.code && data.code.length > 0), {
  message: "الكود مطلوب لو النوع 'كود خصم'",
  path: ["code"],
});
export type CouponInput = z.infer<typeof couponSchema>;

export const categorySchema = z.object({
  // الإنجليزي اختياري مؤقتًا — الموقع الإنجليزي غير موجود بعد
  name: z.string().trim(),
  nameAr: z.string().trim().min(2, "الاسم بالعربي مطلوب"),
  slug: z.string().min(2, "الرابط مطلوب").regex(/^[a-z0-9-]+$/, "أحرف إنجليزية صغيرة وأرقام وشرطات فقط"),
  description: z.string().trim(),
  descriptionAr: z.string().trim().min(10, "الوصف بالعربي مطلوب"),
  icon: z.string().default("tag"),
  emoji: z.string().min(1, "الإيموجي مطلوب").default("🏷️"),
  isPublished: z.boolean().default(true),
  ...seoFields,
});
export type CategoryInput = z.infer<typeof categorySchema>;

export const articleSchema = z.object({
  // الإنجليزي اختياري مؤقتًا — الموقع الإنجليزي غير موجود بعد
  title: z.string().trim(),
  titleAr: z.string().trim().min(3, "العنوان بالعربي مطلوب"),
  slug: z.string().min(2, "الرابط مطلوب").regex(/^[a-z0-9-]+$/, "أحرف إنجليزية صغيرة وأرقام وشرطات فقط"),
  excerpt: z.string().trim(),
  excerptAr: z.string().trim().min(10, "المقتطف بالعربي مطلوب"),
  content: z.string().trim(),
  contentAr: z.string().trim().min(50, "المحتوى بالعربي قصير جدًا"),
  featuredImage: z.string().url("رابط الصورة غير صالح"),
  categoryId: z.string().optional().or(z.literal("")),
  status: z.enum(["DRAFT", "PUBLISHED"]),
  canonicalUrl: z.string().url().optional().or(z.literal("")),
  ...seoFields,
});
export type ArticleInput = z.infer<typeof articleSchema>;

export const contactSchema = z.object({
  name: z.string().trim().min(2, "الاسم مطلوب"),
  email: z.string().trim().email("بريد إلكتروني غير صالح"),
  message: z.string().trim().min(10, "الرسالة قصيرة جدًا (10 أحرف على الأقل)"),
});
export type ContactInput = z.infer<typeof contactSchema>;

export const loginSchema = z.object({
  email: z.string().email("بريد إلكتروني غير صالح"),
  password: z.string().min(6, "كلمة المرور 6 أحرف على الأقل"),
});
export type LoginInput = z.infer<typeof loginSchema>;

export const socialLinksSchema = z.object({
  facebookUrl: z.string().url("رابط غير صالح").optional().or(z.literal("")),
  instagramUrl: z.string().url("رابط غير صالح").optional().or(z.literal("")),
  twitterUrl: z.string().url("رابط غير صالح").optional().or(z.literal("")),
  tiktokUrl: z.string().url("رابط غير صالح").optional().or(z.literal("")),
  snapchatUrl: z.string().url("رابط غير صالح").optional().or(z.literal("")),
});
export type SocialLinksInput = z.infer<typeof socialLinksSchema>;

export const changePasswordSchema = z.object({
  currentPassword: z.string().min(1, "كلمة المرور الحالية مطلوبة"),
  newPassword: z.string().min(8, "كلمة المرور الجديدة يجب أن تكون 8 أحرف على الأقل"),
  confirmPassword: z.string().min(1, "تأكيد كلمة المرور مطلوب"),
}).refine((data) => data.newPassword === data.confirmPassword, {
  message: "كلمتا المرور غير متطابقتين",
  path: ["confirmPassword"],
});
export type ChangePasswordInput = z.infer<typeof changePasswordSchema>;
