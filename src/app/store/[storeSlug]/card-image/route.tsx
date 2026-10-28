import { ImageResponse } from "next/og";
import sharp from "sharp";
import { db } from "@/lib/db";
import { getTajawalBold } from "@/lib/og-font";
import { NAVY, CORAL, SURFACE_ALT, BORDER, INK_MUTED, ArabicText, logoToPngDataUri, measureWordWidths, tajawalOgFonts } from "@/lib/coupon-og";

// Dedicated 1200×1200 store-page image. Existing coupon images and OG routes stay untouched.
async function renderStoreCardImage(_request: Request, { params }: { params: Promise<{ storeSlug: string }> }) {
  const { storeSlug } = await params;
  const store = await db.store.findFirst({ where: { slug: storeSlug, isPublished: true } });
  if (!store) return new Response("Not found", { status: 404 });

  const coupon = await db.coupon.findFirst({
    where: { storeId: store.id, isPublished: true, type: "CODE", code: { not: null },
      OR: [{ expiresAt: null }, { expiresAt: { gt: new Date() } }] },
    orderBy: [{ isFeatured: "desc" }, { createdAt: "desc" }],
    select: { code: true },
  });
  // No active code: do not fabricate a coupon or expose an expired one.
  if (!coupon?.code?.trim()) return new Response("No active code", { status: 404 });

  const code = coupon.code.trim();
  const [bold, logo] = await Promise.all([getTajawalBold(), logoToPngDataUri(store.logoUrl)]);
  const fonts = tajawalOgFonts(bold);
  const [nameWidths, titleWidths, hintWidths] = await Promise.all([
    measureWordWidths(store.name, 64, fonts),
    measureWordWidths("كود الخصم", 70, fonts),
    measureWordWidths("استخدم الكود عند الدفع", 34, fonts),
  ]);
  const codeSize = code.length > 17 ? 58 : code.length > 12 ? 76 : code.length > 8 ? 94 : 112;
  const image = new ImageResponse(
    <div style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center", background: "#f5f2ed", padding: 56 }}>
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", width: "100%", height: "100%", background: "#fff", border: "2px solid #e9e1d8", borderRadius: 64, boxShadow: "0 20px 50px rgba(16,26,49,0.07)" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 28 }}>
          <div style={{ width: 72, height: 2, background: "#cbbfb0" }} />
          <div style={{ width: 260, height: 260, borderRadius: 46, background: SURFACE_ALT, display: "flex", alignItems: "center", justifyContent: "center", overflow: "hidden", border: "2px solid #eeeeed" }}>
            {logo ? <img src={logo} width={194} height={194} style={{ objectFit: "contain" }} /> : <div style={{ fontFamily: "Tajawal", fontSize: 104, fontWeight: 700, color: NAVY }}>{store.name.trim().charAt(0)}</div>}
          </div>
          <div style={{ width: 72, height: 2, background: "#cbbfb0" }} />
        </div>
        <ArabicText text={store.name} widths={nameWidths} style={{ marginTop: 40, fontFamily: "Tajawal", fontSize: 64, fontWeight: 700, color: NAVY, maxWidth: "82%" }} />
        <div style={{ display: "flex", alignItems: "center", gap: 16, marginTop: 46 }}>
          <div style={{ width: 46, height: 3, background: CORAL }} />
          <ArabicText text="كود الخصم" widths={titleWidths} style={{ fontFamily: "Tajawal", fontSize: 70, fontWeight: 700, color: CORAL }} />
          <div style={{ width: 46, height: 3, background: CORAL }} />
        </div>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 26, marginTop: 30, padding: "42px 62px", background: NAVY, borderRadius: 30, border: "3px solid #344362", maxWidth: "86%" }}>
          <div style={{ display: "flex", fontFamily: "Tajawal", fontSize: codeSize, fontWeight: 700, color: "#fff", letterSpacing: 2 }}>{code}</div>

        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 18, marginTop: 48 }}>
          <div style={{ display: "flex", width: 78, height: 2, background: BORDER }} />
          <ArabicText text="استخدم الكود عند الدفع" widths={hintWidths} style={{ fontFamily: "Tajawal", fontSize: 34, fontWeight: 700, color: INK_MUTED }} />
          <div style={{ display: "flex", width: 78, height: 4, background: BORDER }} />
        </div>
      </div>
    </div>,
    { width: 1200, height: 1200, fonts }
  );
  const webp = await sharp(Buffer.from(await image.arrayBuffer())).webp({ quality: 90, effort: 5 }).toBuffer();
  return new Response(new Uint8Array(webp), {
    headers: { "Content-Type": "image/webp", "Cache-Control": "public, max-age=3600, s-maxage=86400, stale-while-revalidate=604800, stale-if-error=604800", "X-Content-Type-Options": "nosniff" },
  });
}

// Report transient failures as retryable (not a cached 500) to image crawlers.
export async function GET(request: Request, context: { params: Promise<{ storeSlug: string }> }) {
  try {
    return await renderStoreCardImage(request, context);
  } catch (error) {
    console.error("[store-card-image] generation failed:", error);
    return new Response("Image temporarily unavailable", {
      status: 503,
      headers: { "Retry-After": "120", "Cache-Control": "no-store" },
    });
  }
}
