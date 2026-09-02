// ============================================================
// VALIDATION SCHEMAS — نفس الـ Schema تُستخدم بالـ Form
// (react-hook-form + zodResolver) وبالـ API Route وقت الحفظ،
// عشان ما يكون فيه تكرار قواعد أو تناقض بين الطرفين.
// ============================================================
import { z } from "zod";

const seoFields = {
  seoTitle: z.string().max(70).optional().or(z.literal("")),
  seoDescription: z.string().max(160).optional().or(z.literal("")),
  seoTitleAr: z.string().max(70).optional().or(z.literal("")),
  seoDescriptionAr: z.string().max(160).optional().or(z.literal("")),
  noindex: z.boolean().default(false),
};

export const storeSchema = z.object({
  name: z.string().min(2, "اسم المتجر مطلوب"),
  slug: z.string().min(2, "الرابط مطلوب").regex(/^[a-z0-9-]+$/, "أحرف إنجليزية صغيرة وأرقام وشرطات فقط"),
  logoUrl: z.string().url("رابط الشعار غير صالح"),
  website: z.string().url("رابط الموقع غير صالح"),
  // الإنجليزي اختياري مؤقتًا — الموقع الإنجليزي غير موجود بعد
  description: z.string(),
  descriptionAr: z.string().min(10, "الوصف بالعربي مطلوب (10 أحرف على الأقل)"),
  categoryId: z.string().min(1, "التصنيف مطلوب"),
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
  title: z.string(),
  titleAr: z.string().min(3, "العنوان بالعربي مطلوب"),
  description: z.string(),
  descriptionAr: z.string().min(10, "الوصف بالعربي مطلوب"),
  terms: z.string().optional().or(z.literal("")),
  termsAr: z.string().optional().or(z.literal("")),
  type: z.enum(["CODE", "DEAL", "CASHBACK"]),
  code: z.string().optional().or(z.literal("")),
  discountLabel: z.string().min(1, "نص الخصم مطلوب (مثال: 20% أو Free Shipping)"),
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
  name: z.string(),
  nameAr: z.string().min(2, "الاسم بالعربي مطلوب"),
  slug: z.string().min(2, "الرابط مطلوب").regex(/^[a-z0-9-]+$/, "أحرف إنجليزية صغيرة وأرقام وشرطات فقط"),
  description: z.string(),
  descriptionAr: z.string().min(10, "الوصف بالعربي مطلوب"),
  icon: z.string().default("tag"),
  isPublished: z.boolean().default(true),
  ...seoFields,
});
export type CategoryInput = z.infer<typeof categorySchema>;

export const articleSchema = z.object({
  // الإنجليزي اختياري مؤقتًا — الموقع الإنجليزي غير موجود بعد
  title: z.string(),
  titleAr: z.string().min(3, "العنوان بالعربي مطلوب"),
  slug: z.string().min(2, "الرابط مطلوب").regex(/^[a-z0-9-]+$/, "أحرف إنجليزية صغيرة وأرقام وشرطات فقط"),
  excerpt: z.string(),
  excerptAr: z.string().min(10, "المقتطف بالعربي مطلوب"),
  content: z.string(),
  contentAr: z.string().min(50, "المحتوى بالعربي قصير جدًا"),
  featuredImage: z.string().url("رابط الصورة غير صالح"),
  categoryId: z.string().optional().or(z.literal("")),
  status: z.enum(["DRAFT", "PUBLISHED"]),
  canonicalUrl: z.string().url().optional().or(z.literal("")),
  ...seoFields,
});
export type ArticleInput = z.infer<typeof articleSchema>;

export const contactSchema = z.object({
  name: z.string().min(2, "الاسم مطلوب"),
  email: z.string().email("بريد إلكتروني غير صالح"),
  message: z.string().min(10, "الرسالة قصيرة جدًا (10 أحرف على الأقل)"),
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
