/**
 * Generates only four offline previews (no service keys, no Vercel requests,
 * no publishing or Supabase writes) using the site's existing visual templates.
 */
import { readFile, mkdir, writeFile } from "node:fs/promises";
import { join, resolve } from "node:path";
import { createHash } from "node:crypto";
import { ImageResponse } from "next/og";
import sharp from "sharp";
import { getTajawalBold } from "../src/lib/og-font";
import {
  NAVY, CORAL, SURFACE_ALT, BORDER, INK_MUTED,
  Sparkle, CopyIcon, ArabicText, logoToPngDataUri,
  measureWordWidths, tajawalOgFonts,
} from "../src/lib/coupon-og";

type BaseTarget = { id: string; slug: string; name: string; logoUrl: string;
  code: string; currentCardImageUrl: string };
type StoreTarget = BaseTarget & { type: "store" };
type CouponTarget = BaseTarget & { type: "coupon"; storeSlug: string };
type Target = StoreTarget | CouponTarget;
const origin = "gwqtzjqmvrcrvchqdvdi.supabase.co";
const allowed = new Set([
  "store:max", "store:option-b", "store:firstcry", "coupon:faisalaldayel-discount-code",
]);
const dir = resolve(process.cwd(), "artifacts/offvercel-image-pilot");
const file = (value: string) => join(dir, value);
function validate(t: Target): void {
  const key = t.type + ":" + t.slug;
  if (!allowed.has(key) || !t.id || !t.name || !t.logoUrl || !t.code ||
      !t.currentCardImageUrl) throw new Error("Invalid target " + key);
  for (const v of [t.logoUrl, t.currentCardImageUrl]) {
    const url = new URL(v);
    if (url.protocol !== "https:" || url.hostname !== origin ||
      !url.pathname.startsWith("/storage/v1/object/public/store-logos/") ||
      !url.pathname.endsWith(".webp")) throw new Error("Unexpected URL " + key);
  }
}

async function storeCard(t: StoreTarget): Promise<Buffer> {
  const [font, logo] = await Promise.all([getTajawalBold(), logoToPngDataUri(t.logoUrl)]);
  const fonts = tajawalOgFonts(font);
  const [nameWidths, titleWidths, hintWidths] = await Promise.all([
    measureWordWidths(t.name, 64, fonts),
    measureWordWidths("كود الخصم", 70, fonts),
    measureWordWidths("استخدم الكود عند الدفع", 34, fonts),
  ]);
  const codeSize = t.code.length > 17 ? 58 : t.code.length > 12 ? 76
    : t.code.length > 8 ? 94 : 112;
  const response = new ImageResponse(
    <div style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center", background: "#f5f2ed", padding: 56 }}>
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", width: "100%", height: "100%", background: "#fff", border: "2px solid #e9e1d8", borderRadius: 64, boxShadow: "0 20px 50px rgba(16,26,49,0.07)" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 28 }}>
          <div style={{ width: 72, height: 2, background: "#cbbfb0" }} />
          <div style={{ width: 260, height: 260, borderRadius: 46, background: SURFACE_ALT, display: "flex", alignItems: "center", justifyContent: "center", overflow: "hidden", border: "2px solid #eeeeed" }}>
            {logo ? <img src={logo} width={194} height={194} style={{ objectFit: "contain" }} /> : <div style={{ fontFamily: "Tajawal", fontSize: 104, fontWeight: 700, color: NAVY }}>{t.name.trim().charAt(0)}</div>}
          </div>
          <div style={{ width: 72, height: 2, background: "#cbbfb0" }} />
        </div>
        <ArabicText text={t.name} widths={nameWidths} style={{ marginTop: 40, fontFamily: "Tajawal", fontSize: 64, fontWeight: 700, color: NAVY, maxWidth: "82%" }} />
        <div style={{ display: "flex", alignItems: "center", gap: 16, marginTop: 46 }}>
          <div style={{ width: 46, height: 3, background: CORAL }} />
          <ArabicText text="كود الخصم" widths={titleWidths} style={{ fontFamily: "Tajawal", fontSize: 70, fontWeight: 700, color: CORAL }} />
          <div style={{ width: 46, height: 3, background: CORAL }} />
        </div>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 26, marginTop: 30, padding: "42px 62px", background: NAVY, borderRadius: 30, border: "3px solid #344362", maxWidth: "86%" }}>
          <div style={{ display: "flex", fontFamily: "Tajawal", fontSize: codeSize, fontWeight: 700, color: "#fff", letterSpacing: 2 }}>{t.code}</div>
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
  return sharp(Buffer.from(await response.arrayBuffer())).webp({ quality: 90, effort: 5 }).toBuffer();
}

async function couponCard(t: CouponTarget): Promise<Buffer> {
  const [font, logo] = await Promise.all([getTajawalBold(), logoToPngDataUri(t.logoUrl)]);
  const fonts = tajawalOgFonts(font);
  const [nameWidths, titleWidths, hintWidths] = await Promise.all([
    measureWordWidths(t.name, 40, fonts),
    measureWordWidths("كود الخصم", 68, fonts),
    measureWordWidths("استخدم الكود عند الدفع", 26, fonts),
  ]);
  const codeSize = t.code.length > 14 ? 52 : t.code.length > 8 ? 64 : 80;
  const response = new ImageResponse(
    <div style={{ width: "100%", height: "100%", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", background: "#FFFFFF" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
        <Sparkle scale={1.4} />
        <div style={{ display: "flex", alignItems: "center", justifyContent: "center", width: 220, height: 220, borderRadius: 48, background: SURFACE_ALT, overflow: "hidden" }}>
          {logo ? <img src={logo} width={152} height={152} style={{ objectFit: "contain" }} /> : <div style={{ display: "flex", fontFamily: "Tajawal", fontSize: 84, fontWeight: 700, color: NAVY }}>{t.name.trim().charAt(0)}</div>}
        </div>
        <Sparkle mirror scale={1.4} />
      </div>
      <ArabicText text={t.name} widths={nameWidths} style={{ marginTop: 24, fontFamily: "Tajawal", fontSize: 40, fontWeight: 700, color: NAVY, maxWidth: "85%" }} />
      <div style={{ display: "flex", alignItems: "center", gap: 12, marginTop: 36 }}>
        <Sparkle scale={1.1} />
        <ArabicText text="كود الخصم" widths={titleWidths} style={{ fontFamily: "Tajawal", fontSize: 68, fontWeight: 700, color: CORAL }} />
        <Sparkle mirror scale={1.1} />
      </div>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 24, marginTop: 28, background: NAVY, borderRadius: 36, border: "5px dashed rgba(255,255,255,0.5)", padding: "28px 52px", maxWidth: "82%" }}>
        <div style={{ display: "flex", fontFamily: "Tajawal", fontSize: codeSize, fontWeight: 700, color: "#FFFFFF", letterSpacing: 2, textAlign: "center" }}>{t.code}</div>
        <CopyIcon size={40} />
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: 14, marginTop: 28 }}>
        <div style={{ display: "flex", width: 64, height: 4, background: BORDER }} />
        <ArabicText text="استخدم الكود عند الدفع" widths={hintWidths} style={{ fontFamily: "Tajawal", fontSize: 26, fontWeight: 700, color: INK_MUTED }} />
        <div style={{ display: "flex", width: 64, height: 4, background: BORDER }} />
      </div>
    </div>,
    { width: 800, height: 800, fonts }
  );
  return sharp(Buffer.from(await response.arrayBuffer())).webp({ quality: 88, effort: 5 }).toBuffer();
}

async function main(): Promise<void> {
  if (process.argv.slice(2).some(arg => arg !== "--preview-only"))
    throw new Error("Preview only: refusing uploads and publishing");
  const manifest = JSON.parse(await readFile("scripts/offvercel-image-pilot.manifest.json", "utf8")) as { assets: Target[] };
  if (manifest.assets.length !== 4 || new Set(manifest.assets.map(t => t.type + ":" + t.slug)).size !== 4)
    throw new Error("Expected exactly four unique images");
  manifest.assets.forEach(validate);
  await mkdir(dir, { recursive: true });
  const results = [];
  for (const t of manifest.assets) {
    const key = t.type + "-" + t.slug;
    const bytes = t.type === "store" ? await storeCard(t) : await couponCard(t);
    const metadata = await sharp(bytes).metadata();
    const size = t.type === "store" ? 1200 : 800;
    if (metadata.format !== "webp" || metadata.width !== size || metadata.height !== size ||
      bytes.length < 2000 || bytes.toString("ascii", 0, 4) !== "RIFF" ||
      bytes.toString("ascii", 8, 12) !== "WEBP")
      throw new Error("Unexpected generated image " + key);
    await writeFile(file(key + ".webp"), bytes);
    results.push({ key, filename: key + ".webp", width: size, height: size, byteLength: bytes.length,
      sha256: createHash("sha256").update(bytes).digest("hex"), originalCardUrl: t.currentCardImageUrl });
    console.log("Generated " + key + ".webp");
  }
  await writeFile(file("report.json"), JSON.stringify({ mode: "preview-only", generatedAt: new Date().toISOString(),
    unchangedLiveRecords: true, results }, null, 2));
  console.log("Preview only complete. No data or public image changed.");
}
main().catch(error => { console.error(error); process.exitCode = 1; });
