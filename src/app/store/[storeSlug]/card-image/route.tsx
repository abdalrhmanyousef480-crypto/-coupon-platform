import { ImageResponse } from "next/og";
import sharp from "sharp";
import { db } from "@/lib/db";
import { getTajawalBold } from "@/lib/og-font";
import { NAVY, CORAL, SURFACE_ALT, BORDER, INK_MUTED, Sparkle, CopyIcon, ArabicText, logoToPngDataUri, measureWordWidths, tajawalOgFonts } from "@/lib/coupon-og";

// Dedicated 1200×1200 store-page image. Existing coupon images and OG routes stay untouched.
export async function GET(_request: Request, { params }: { params: Promise<{ storeSlug: string }> }) {
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
    measureWordWidths("كود الخصم", 82, fonts),
    measureWordWidths("استخدم الكود عند الدفع", 34, fonts),
  ]);
  const codeSize = code.length > 17 ? 58 : code.length > 12 ? 76 : code.length > 8 ? 94 : 112;
  const image = new ImageResponse(
    <div style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center", background: "#f8f8f7", padding: 46 }}>
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", width: "100%", height: "100%", background: "#fff", border: "2px solid #e8e8e7", borderRadius: 72, boxShadow: "0 16px 40px rgba(16,26,49,0.08)" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 28 }}>
          <Sparkle scale={1.6} />
          <div style={{ width: 286, height: 286, borderRadius: 62, background: SURFACE_ALT, display: "flex", alignItems: "center", justifyContent: "center", overflow: "hidden", border: "2px solid #eeeeed" }}>
            {logo ? <img src={logo} width={208} height={208} style={{ objectFit: "contain" }} /> : <div style={{ fontFamily: "Tajawal", fontSize: 104, fontWeight: 700, color: NAVY }}>{store.name.trim().charAt(0)}</div>}
          </div>
          <Sparkle mirror scale={1.6} />
        </div>
        <ArabicText text={store.name} widths={nameWidths} style={{ marginTop: 32, fontFamily: "Tajawal", fontSize: 64, fontWeight: 700, color: NAVY, maxWidth: "82%" }} />
        <div style={{ display: "flex", alignItems: "center", gap: 16, marginTop: 36 }}>
          <Sparkle scale={1.1} />
          <ArabicText text="كود الخصم" widths={titleWidths} style={{ fontFamily: "Tajawal", fontSize: 82, fontWeight: 700, color: CORAL }} />
          <Sparkle mirror scale={1.1} />
        </div>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 26, marginTop: 34, padding: "35px 52px", background: NAVY, borderRadius: 42, border: "5px dashed rgba(255,255,255,0.5)", maxWidth: "86%" }}>
          <div style={{ display: "flex", fontFamily: "Tajawal", fontSize: codeSize, fontWeight: 700, color: "#fff", letterSpacing: 2 }}>{code}</div>
          <CopyIcon size={48} />
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 18, marginTop: 38 }}>
          <div style={{ display: "flex", width: 78, height: 4, background: BORDER }} />
          <ArabicText text="استخدم الكود عند الدفع" widths={hintWidths} style={{ fontFamily: "Tajawal", fontSize: 34, fontWeight: 700, color: INK_MUTED }} />
          <div style={{ display: "flex", width: 78, height: 4, background: BORDER }} />
        </div>
      </div>
    </div>,
    { width: 1200, height: 1200, fonts }
  );
  const webp = await sharp(Buffer.from(await image.arrayBuffer())).webp({ quality: 90, effort: 5 }).toBuffer();
  return new Response(new Uint8Array(webp), {
    headers: { "Content-Type": "image/webp", "Cache-Control": "public, max-age=3600, s-maxage=3600", "X-Content-Type-Options": "nosniff" },
  });
}
