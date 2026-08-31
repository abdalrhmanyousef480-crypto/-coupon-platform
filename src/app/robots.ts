// ============================================================
// ROBOTS.TXT الديناميكي — يمنع فهرسة لوحة التحكم والـ API
// ويسمح بكل شي تاني، ويشير لمكان الـ sitemap تلقائيًا.
// ============================================================
import type { MetadataRoute } from "next";
import { SITE_URL } from "@/lib/seo";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: ["/admin", "/api"],
      },
    ],
    sitemap: `${SITE_URL}/sitemap.xml`,
  };
}
