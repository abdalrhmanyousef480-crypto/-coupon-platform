// ============================================================
// نظام "الأدلة" (Guides) — مقالات مدونة Premium مخصصة لمتجر واحد
// (مثال: دليل غيم). كل دليل هو Article عادي بقاعدة البيانات (نفس
// نظام المدونة الحالي، نفس اصطلاح "## عنوان" لفقرات contentAr)، لكن
// بدل عرضه بالراوت العام (blog/[slug]/page.tsx) يتم التعرّف عليه عبر
// GUIDE_REGISTRY (بمفتاح article.slug) وعرضه بـ GuideTemplate —
// تركيبة مكوّنات Guide* مشتركة قابلة لإعادة الاستخدام لأي متجر مستقبلي
// (نون، نمشي، iHerb...) بدون تكرار الكود، فقط ملف بيانات دليل جديد
// + سطر تسجيل بالـ registry.
//
// المحتوى السردي (شرح، خطوات، سياسات) يظل بالكامل داخل article.contentAr
// كنص عادي قابل للتعديل من لوحة التحكم — الودجت المرئية (بطاقات
// المنتجات، بطاقة الكوبون، الأسئلة الشائعة) مبنية من بيانات محرَّرة
// يدويًا هون (products/faqItems) + بيانات حيّة من قاعدة البيانات
// (الكوبون الفعلي، مو نص ثابت).
// ============================================================
import type { LucideIcon } from "lucide-react";

export interface GuideQuickFact {
  icon: LucideIcon;
  label: string;
  value: string;
}

export interface GuideProduct {
  name: string;
  description: string;
}

export interface GuideFaqItem {
  question: string;
  answer: string;
}

/** خانة واحدة بترتيب عرض الدليل — إما فقرة سردية (لازم تطابق عنوان
 *  "## ..." موجود فعليًا بـ article.contentAr)، أو واحدة من الودجت
 *  الجاهزة (منتجات/كوبون/أسئلة شائعة). الترتيب هون هو نفسه ترتيب
 *  جدول المحتويات (TOC) تلقائيًا. */
export type GuideSectionSlot =
  | { type: "prose"; heading: string }
  | { type: "products" }
  | { type: "coupon" }
  | { type: "faq" };

export interface GuideConfig {
  /** لازم يطابق Article.slug بقاعدة البيانات. */
  articleSlug: string;
  /** المتجر اللي الدليل عنه — يُستخدم لجلب بيانات الكوبون الحقيقية
   *  ديناميكيًا (بدون أي كود مكتوب يدويًا بهالملف) ولبناء روابط
   *  صفحة المتجر/الكوبون. */
  storeSlug: string;

  heroBadge: string;
  heroDescription: string;
  heroCtaLabel: string;

  quickFacts: GuideQuickFact[];

  sections: GuideSectionSlot[];

  productsHeading: string;
  products: GuideProduct[];

  couponSectionHeading: string;
  couponIntro: string;

  faqHeading: string;
  faqItems: GuideFaqItem[];
}
