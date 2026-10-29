import { ImageResponse } from "next/og";
import sharp from "sharp";
import { db } from "@/lib/db";
import { getTajawalBold } from "@/lib/og-font";
import { ArabicText, logoToPngDataUri, tajawalOgFonts } from "@/lib/coupon-og";

/**
 * Separate, dynamic social artwork: real store logo, current coupon data.
 * Does NOT alter store images, coupon card images, or Google OG metadata.
 * ?format=webp can be used for a crawlable web image, default JPEG for Meta.
 */
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ storeSlug: string; couponSlug: string }> }
) {
  const { storeSlug, couponSlug } = await params;
  const coupon = await db.coupon.findFirst({
    where: {
      slug: couponSlug,
      isPublished: true,
      store: { slug: storeSlug, isPublished: true },
    },
    include: { store: true },
  });
  if (!coupon || (coupon.expiresAt && coupon.expiresAt <= new Date())) {
    return new Response("Coupon unavailable", { status: 404 });
  }

  try {
    const [fontBuffers, logo] = await Promise.all([
      getTajawalBold(),
      logoToPngDataUri(coupon.store.logoUrl),
    ]);
    const fonts = tajawalOgFonts(fontBuffers);
    const name = coupon.store.name.trim();
    const code = coupon.code?.trim() || "";
    const isCode = code.length > 0;
    // Use the Arabic merchant name on the artwork; the actual store logo
    // already carries any English translation. This avoids wide mixed-RTL
    // headings such as "Sporter | سبورتر كود خصم".
    const localizedName = name.match(/[\u0600-\u06FF]+(?:\s+[\u0600-\u06FF]+)*/g)
      ?.sort((a, b) => b.length - a.length)[0]?.trim()
      || name.split("|")[0].trim();
    const headingWords = (isCode ? `كود خصم ${localizedName}` : `عرض ${localizedName}`).split(/\s+/);
    const headingFontSize = headingWords.join("").length > 25 ? 42
      : headingWords.join("").length > 18 ? 50 : 61;

    const image = new ImageResponse(
      (
        <div style={{
          width: "100%", height: "100%", display: "flex", flexDirection: "column",
          alignItems: "center", justifyContent: "flex-start", background: "#fbfdff",
          fontFamily: "Tajawal", color: "#0b2344", overflow: "hidden", position: "relative",
        }}>
          <div style={{ display: "flex", position: "absolute", top: -200, left: -300,
            width: 810, height: 540, background: "#e2f1ff", borderRadius: 300,
            transform: "rotate(-24deg)" }} />
          <div style={{ display: "flex", position: "absolute", bottom: -230, right: -200,
            width: 670, height: 450, background: "#d8edff", borderRadius: 300,
            transform: "rotate(-28deg)" }} />
          <div style={{ display: "flex", position: "absolute", top: 0, left: 0,
            width: 200, height: 18, background: "#1479ee", borderBottomRightRadius: 28 }} />

          {/* The exact brand wordmark from the website header (% + site name). */}
          <div style={{ display: "flex", position: "absolute", top: 55, right: 52,
            alignItems: "center", gap: 14, flexDirection: "row-reverse" }}>
            <div style={{ display: "flex", width: 58, height: 58, borderRadius: 14,
              background: "#1479ee", color: "#fff", fontSize: 37, fontWeight: 700,
              justifyContent: "center", alignItems: "center" }}>%</div>
            <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end" }}>
              <ArabicText text="كوبون نور" style={{ fontSize: 39, fontWeight: 700, color: "#0b2344" }} />
              <div style={{ display: "flex", fontSize: 21, color: "#677790", marginTop: 4 }}>couponsnoor.com</div>
            </div>
          </div>

          <div style={{ display: "flex", marginTop: 176, width: 336, height: 310,
            background: "#ffffff", borderRadius: 48, border: "3px solid #e9f1fa",
            justifyContent: "center", alignItems: "center", overflow: "hidden",
            boxShadow: "0 18px 35px rgba(20,61,110,0.09)" }}>
            {logo ? (
              <img src={logo} width={244} height={244} style={{ objectFit: "contain" }} />
            ) : (
              <ArabicText text={name} style={{ fontSize: name.length > 15 ? 36 : 48,
                fontWeight: 700, color: "#14213d", maxWidth: 290 }} />
            )}
          </div>

          <div style={{ display: "flex", marginTop: 38, justifyContent: "center", alignItems: "center" }}>
            <div style={{ display: "flex", flexDirection: "row-reverse",
              alignItems: "center", justifyContent: "center", gap: 8,
              flexWrap: "nowrap", whiteSpace: "nowrap",
              fontSize: headingFontSize, fontWeight: 700, color: "#102748",
              lineHeight: 1.1 }}>
              {headingWords.map((word, index) => (
                <span key={index} style={{ display: "flex", flexShrink: 0,
                  whiteSpace: "nowrap" }}>{word}</span>
              ))}
            </div>
          </div>
          <div style={{ display: "flex", width: 870, minHeight: 186,
            marginTop: 92, border: "5px dashed #2988f0", borderRadius: 32,
            background: "#f1f8ff", flexDirection: "column", alignItems: "center",
            justifyContent: "center", padding: "19px 36px" }}>
            <div style={{ display: "flex", flexDirection: "row-reverse",
              justifyContent: "center", alignItems: "center", gap: 5,
              fontSize: 29, color: "#52647e", fontWeight: 700,
              lineHeight: 1.1, whiteSpace: "nowrap" }}>
              {(isCode ? ["رمز", "كود", "الخصم"] : ["تفاصيل", "العرض"]).map((word, index) => (
                <span key={index} style={{ display: "flex", flexShrink: 0,
                  whiteSpace: "nowrap" }}>{word}</span>
              ))}
            </div>
            <div style={{ display: "flex", marginTop: 4,
              fontSize: code.length > 18 ? 58 : code.length > 11 ? 78 : 113,
              fontWeight: 700, letterSpacing: 1, color: "#0b2344",
              maxWidth: 810, textAlign: "center" }}>
              {isCode ? code : "بدون كود"}
            </div>
          </div>

          <div style={{ display: "flex", marginTop: 70, fontSize: 24,
            color: "#506985", letterSpacing: 0.5 }}>couponsnoor.com</div>
        </div>
      ),
      { width: 1080, height: 1350, fonts }
    );
    const png = Buffer.from(await image.arrayBuffer());
    const url = new URL(request.url);
    const webp = url.searchParams.get("format") === "webp";
    const output = webp
      ? await sharp(png).webp({ quality: 88 }).toBuffer()
      : await sharp(png).jpeg({ quality: 90, mozjpeg: true }).toBuffer();

    return new Response(new Uint8Array(output), {
      headers: {
        "Content-Type": webp ? "image/webp" : "image/jpeg",
        "Cache-Control": "public, max-age=300, s-maxage=300",
        "X-Content-Type-Options": "nosniff",
      },
    });
  } catch (error) {
    console.error("[instagram-preview] image generation failed", error);
    return new Response("Preview temporarily unavailable", {
      status: 503,
      headers: { "Cache-Control": "no-store", "Retry-After": "120" },
    });
  }
}
