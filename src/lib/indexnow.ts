/**
 * IndexNow change notifications for published site URLs.
 * This is a public ownership key, NOT a Bing Webmaster Tools API token.
 * IndexNow is for newly published, substantially changed, deleted or redirected URLs.
 * Existing unchanged pages are discovered from sitemap.xml.
 */
import "server-only";
import { SITE_URL } from "@/lib/seo";

const KEY = "429794f595bec5295fc9f40e07a22875";
const ENDPOINT = "https://api.indexnow.org/indexnow";
const SAFE_PATH = /^\/(?:store\/[a-z0-9-]+(?:\/coupon\/[a-z0-9-]+)?|blog\/[a-z0-9-]+)$/i;

export async function notifyIndexNow(paths: string[]): Promise<void> {
  // Preview builds must never generate public indexing notifications.
  if (process.env.VERCEL_ENV !== "production") return;

  let origin: URL;
  try {
    origin = new URL(SITE_URL);
  } catch {
    return;
  }
  if (origin.protocol !== "https:" || origin.hostname !== "www.couponsnoor.com") return;

  const urlList = [...new Set(paths.filter((path) => SAFE_PATH.test(path)))]
    .map((path) => new URL(path, origin).href);
  if (!urlList.length) return;
  try {
    const response = await fetch(ENDPOINT, {
      method: "POST",
      headers: { "Content-Type": "application/json; charset=utf-8" },
      body: JSON.stringify({
        host: origin.hostname,
        key: KEY,
        keyLocation: new URL(`/${KEY}.txt`, origin).href,
        urlList,
      }),
      cache: "no-store",
      signal: AbortSignal.timeout(4000),
    });
    if (response.status !== 200 && response.status !== 202) {
      console.warn("[indexnow] submission rejected, status", response.status);
    }
  } catch (error) {
    // Search-engine downtime must never block admin publishing.
    console.warn("[indexnow] notification failed", error instanceof Error ? error.message : "unavailable");
  }
}
