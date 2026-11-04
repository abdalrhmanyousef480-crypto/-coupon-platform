// Coupon image writer for the GitHub Actions generator — no secrets stored in GitHub.
//
// Auth: the workflow sends its GitHub OIDC token. We accept it only if GitHub
// signed it for this repository's coupon-images workflow on main. The service
// role key never leaves Supabase (it is injected into Edge Functions).
//
// GET  ?limit=N                       → coupons whose current code has no generated image
// POST { couponId, code, image }      → stores generated/coupons/<slug>-<code>.webp and
//                                        points the coupon at /images/coupons/<file>
// Manual images (cardImageUrl) and historical snapshots are never touched.
import { createClient } from "npm:@supabase/supabase-js@2";
import { createRemoteJWKSet, jwtVerify } from "npm:jose@5";

const REPO = "abdalrhmanyousef480-crypto/-coupon-platform";
const WORKFLOW_REF = `${REPO}/.github/workflows/coupon-images.yml@refs/heads/main`;
const AUDIENCE = "couponsnoor-coupon-images";
const ISSUER = "https://token.actions.githubusercontent.com";
const jwks = createRemoteJWKSet(new URL(`${ISSUER}/.well-known/jwks`));

const BUCKET = "store-logos";
const STORAGE_DIR = "generated/coupons";
const PUBLIC_PREFIX = "/images/coupons/";
const MAX_BYTES = 3_000_000;

const supabase = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!, {
  auth: { persistSession: false, autoRefreshToken: false },
});

// Must match generatedCouponImageFile in src/lib/coupon-image.ts.
function fileName(couponSlug: string, code: string): string {
  const safe = (v: string) => v.toLowerCase().normalize("NFKD").replace(/[^a-z0-9-]+/g, "-").replace(/-+/g, "-").replace(/^-|-$/g, "");
  return `${safe(couponSlug) || "coupon"}-${safe(code) || "code"}.webp`;
}

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } });

async function authorized(req: Request): Promise<boolean> {
  const token = req.headers.get("authorization")?.replace(/^Bearer\s+/i, "");
  if (!token) return false;
  try {
    const { payload } = await jwtVerify(token, jwks, { issuer: ISSUER, audience: AUDIENCE });
    return payload.repository === REPO && payload.ref === "refs/heads/main" && payload.job_workflow_ref === WORKFLOW_REF;
  } catch {
    return false;
  }
}

type Row = {
  id: string; slug: string; code: string | null; autoImageCode: string | null; expiresAt: string | null;
  store: { slug: string; name: string; logoUrl: string | null } | { slug: string; name: string; logoUrl: string | null }[] | null;
};

async function pendingCoupons(): Promise<Array<Row & { store: { slug: string; name: string; logoUrl: string | null } }>> {
  const { data, error } = await supabase
    .from("coupons")
    .select("id, slug, code, autoImageCode, expiresAt, updatedAt, store:stores!inner(slug, name, logoUrl, isPublished)")
    .eq("isPublished", true)
    .eq("type", "CODE")
    .not("code", "is", null)
    .is("cardImageUrl", null)
    .eq("store.isPublished", true)
    .order("updatedAt", { ascending: false });
  if (error) throw new Error(error.message);
  const now = Date.now();
  return ((data ?? []) as Row[])
    .map((r) => ({ ...r, store: Array.isArray(r.store) ? r.store[0] : r.store }))
    .filter((c): c is Row & { store: { slug: string; name: string; logoUrl: string | null } } =>
      Boolean(c.store && c.code?.trim() && c.autoImageCode !== c.code.trim()))
    .filter((c) => !c.expiresAt || new Date(c.expiresAt).getTime() > now);
}

Deno.serve(async (req) => {
  if (!(await authorized(req))) return json({ error: "unauthorized" }, 401);

  try {
    if (req.method === "GET") {
      const limit = Math.max(1, Math.min(100, Number(new URL(req.url).searchParams.get("limit")) || 25));
      const list = (await pendingCoupons()).slice(0, limit).map((c) => ({
        id: c.id, slug: c.slug, code: c.code!.trim(), storeSlug: c.store.slug, storeName: c.store.name, logoUrl: c.store.logoUrl,
      }));
      return json({ coupons: list });
    }

    if (req.method === "POST") {
      const { couponId, code, image } = await req.json() as { couponId?: string; code?: string; image?: string };
      if (!couponId || !code || !image) return json({ error: "couponId, code and image are required" }, 400);

      // Only a coupon that still needs an image for exactly this code.
      const target = (await pendingCoupons()).find((c) => c.id === couponId);
      if (!target || target.code!.trim() !== code) return json({ error: "coupon does not need an image for this code" }, 409);

      const bytes = Uint8Array.from(atob(image), (ch) => ch.charCodeAt(0));
      const ascii = (a: number, b: number) => String.fromCharCode(...bytes.slice(a, b));
      if (bytes.length < 1000 || bytes.length > MAX_BYTES || ascii(0, 4) !== "RIFF" || ascii(8, 12) !== "WEBP") {
        return json({ error: "image must be a WebP under 3 MB" }, 400);
      }

      const file = fileName(target.slug, code);
      const objectPath = `${STORAGE_DIR}/${file}`;
      const up = await supabase.storage.from(BUCKET).upload(objectPath, bytes, {
        upsert: true, contentType: "image/webp", cacheControl: "31536000",
      });
      if (up.error) throw new Error(`upload failed: ${up.error.message}`);

      const { data: updated, error } = await supabase
        .from("coupons")
        .update({ autoImageUrl: `${PUBLIC_PREFIX}${file}`, autoImageCode: code })
        .eq("id", target.id)
        .eq("code", target.code!)
        .is("cardImageUrl", null)
        .select("id");
      if (error) throw new Error(`database update failed: ${error.message}`);

      const publicUrl = supabase.storage.from(BUCKET).getPublicUrl(objectPath).data.publicUrl;
      return json({ ok: Boolean(updated?.length), path: `${PUBLIC_PREFIX}${file}`, publicUrl, bytes: bytes.length });
    }

    return json({ error: "method not allowed" }, 405);
  } catch (error) {
    console.error("[coupon-images]", error);
    return json({ error: error instanceof Error ? error.message : "failed" }, 500);
  }
});
