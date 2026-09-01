// ============================================================
// SUPABASE STORAGE — عميل خادم فقط (service role)
// ============================================================
// هذا العميل يستخدم مفتاح service role اللي يتجاوز RLS بالكامل،
// لذلك يُستدعى فقط من كود الخادم (Server Actions) وممنوع منعًا
// باتًا استيراده بأي مكوّن client ("use client") — المفتاح لازم
// يبقى سري ولا يوصل للمتصفح إطلاقًا.
//
// القراءة العامة (عرض الشعارات بالموقع) ما بتحتاج هذا العميل أصلًا:
// الـ bucket نفسه مضبوط public، فالروابط تُقرأ مباشرة بدون أي مصادقة.
// ============================================================
import { createClient, type SupabaseClient } from "@supabase/supabase-js";

export const STORE_LOGOS_BUCKET = "store-logos";
export const ARTICLE_IMAGES_BUCKET = "article-images";

let cachedClient: SupabaseClient | null = null;

export function getSupabaseAdmin(): SupabaseClient {
  if (cachedClient) return cachedClient;

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceKey) {
    throw new Error(
      "Supabase غير مضبوط: عبّي NEXT_PUBLIC_SUPABASE_URL و SUPABASE_SERVICE_ROLE_KEY بملف .env (راجع .env.example)"
    );
  }

  cachedClient = createClient(url, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  return cachedClient;
}
