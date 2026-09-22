// ============================================================
// ROBOTS.TXT الديناميكي — يمنع فهرسة لوحة التحكم والـ API
// ويسمح بكل شي تاني، ويشير لمكان الـ sitemap تلقائيًا.
// ============================================================
import type { MetadataRoute } from "next";
import { SITE_URL } from "@/lib/seo";

// قرار مالك الموقع (GEO): السماح صراحة لكل زواحف الذكاء الاصطناعي
// المعروفة بدل الاعتماد على قاعدة `*` الافتراضية بشكل ضمني — عشان
// نضمن أهلية الظهور/الاقتباس بمحركات الإجابة (ChatGPT/Perplexity/...)
// ونوثّق القرار صراحة بدل ما يكون "سهو" ممكن ينعكس لاحقًا بالغلط.
const AI_CRAWLER_USER_AGENTS = [
  "GPTBot",
  "ChatGPT-User",
  "OAI-SearchBot",
  "CCBot",
  "ClaudeBot",
  "anthropic-ai",
  "PerplexityBot",
  "Google-Extended",
  "Bingbot",
];

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: ["/admin", "/api"],
      },
      ...AI_CRAWLER_USER_AGENTS.map((userAgent) => ({
        userAgent,
        allow: "/",
        disallow: ["/admin", "/api"],
      })),
    ],
    sitemap: `${SITE_URL}/sitemap.xml`,
  };
}
