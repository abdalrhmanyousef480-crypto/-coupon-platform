// Serve an exact, manually archived image at its original couponsnoor.com URL.
// Not a redirect: Google sees HTTP 200 WebP with unchanged old URL.
// Never fetch arbitrary remote hosts from database values (SSRF guard).
export async function serveStoredWebp(rawUrl: string | null | undefined): Promise<Response | null> {
  if (!rawUrl) return null;
  try {
    const project = process.env.NEXT_PUBLIC_SUPABASE_URL;
    if (!project) return null;
    const wantedOrigin = new URL(project).origin;
    const url = new URL(rawUrl);
    if (url.protocol !== "https:" || url.origin !== wantedOrigin ||
        !url.pathname.startsWith("/storage/v1/object/public/store-logos/") ||
        !url.pathname.endsWith(".webp")) return null;
    const r = await fetch(url.toString(), { cache: "no-store", signal: AbortSignal.timeout(6500) });
    if (!r.ok || !r.body || !r.headers.get("content-type")?.toLowerCase().includes("image/webp")) return null;
    return new Response(r.body, {
      headers: {
        "Content-Type": "image/webp",
        "Cache-Control": "public, max-age=86400, s-maxage=86400, stale-while-revalidate=604800, stale-if-error=604800",
        "X-Content-Type-Options": "nosniff",
      },
    });
  } catch (error) {
    console.error("[serve-stored-webp] storage unavailable, legacy renderer retained", error);
    return null;
  }
}
