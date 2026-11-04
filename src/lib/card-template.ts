/** Optional, manually triggered card artwork. All drawing runs on the admin's
 * device. No image rendering work or image bytes are sent to Vercel. */
export type CardTemplateOptions = {
  kind: "store" | "coupon";
  name: string;
  logoUrl?: string;
  code?: string;
};

function roundedRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + w - r, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + r);
  ctx.lineTo(x + w, y + h - r);
  ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  ctx.lineTo(x + r, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - r);
  ctx.lineTo(x, y + r);
  ctx.quadraticCurveTo(x, y, x + r, y);
  ctx.closePath();
}

function centeredText(ctx: CanvasRenderingContext2D, text: string, y: number, size: number, maxWidth: number, color: string, font = "Tajawal, Tahoma, Arial, sans-serif") {
  let n = size;
  ctx.fillStyle = color;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.direction = "rtl";
  do {
    ctx.font = `700 ${n}px ${font}`;
    if (ctx.measureText(text).width <= maxWidth) break;
    n -= 2;
  } while (n > 28);
  ctx.fillText(text, 500, y, maxWidth);
}

async function loadLogo(url?: string): Promise<HTMLImageElement | null> {
  if (!url) return null;
  return new Promise((resolve) => {
    const image = new Image();
    image.crossOrigin = "anonymous";
    let settled = false;
    const settle = (value: HTMLImageElement | null) => {
      if (settled) return;
      settled = true;
      clearTimeout(timeout);
      resolve(value);
    };
    const timeout = setTimeout(() => settle(null), 4000);
    image.onload = () => settle(image);
    image.onerror = () => settle(null);
    image.src = url;
  });
}

export async function createCardTemplateFile(options: CardTemplateOptions, dimension: number): Promise<File> {
  const name = options.name.trim();
  if (name.length < 2) throw new Error("أدخل اسم المتجر أولًا");
  const code = options.code?.trim() || "";
  if (options.kind === "coupon" && !code) throw new Error("أدخل كود الخصم أو نص العرض أولًا");

  const canvas = document.createElement("canvas");
  canvas.width = dimension;
  canvas.height = dimension;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("المتصفح لا يدعم إنشاء الصور");

  // Both images use exactly the same composition. Only the color palette
  // and the truthful content (store vs coupon) are different.
  const pink = options.kind === "coupon";
  const main = pink ? "#D5256B" : "#14213D";
  const pale = pink ? "#FFF0F5" : "#EFF3FA";
  const border = pink ? "#F7CCDC" : "#D7E0EF";
  ctx.scale(dimension / 1000, dimension / 1000);
  ctx.fillStyle = pale;
  ctx.fillRect(0, 0, 1000, 1000);

  ctx.shadowColor = "rgba(15, 25, 45, 0.13)";
  ctx.shadowBlur = 32;
  ctx.shadowOffsetY = 15;
  roundedRect(ctx, 42, 42, 916, 916, 66);
  ctx.fillStyle = "#FFFFFF";
  ctx.fill();
  ctx.shadowColor = "transparent";
  ctx.shadowBlur = 0;
  ctx.shadowOffsetY = 0;
  ctx.strokeStyle = border;
  ctx.lineWidth = 3;
  ctx.stroke();

  ctx.fillStyle = main;
  roundedRect(ctx, 786, 88, 104, 64, 19);
  ctx.fill();
  centeredText(ctx, "CN", 120, 41, 90, "#FFFFFF", "Arial, sans-serif");
  ctx.textAlign = "right";
  ctx.direction = "rtl";
  ctx.font = "700 30px Tajawal, Tahoma, sans-serif";
  ctx.fillStyle = main;
  ctx.fillText("كوبون نور", 760, 122);

  ctx.fillStyle = pale;
  roundedRect(ctx, 380, 198, 240, 240, 45);
  ctx.fill();
  ctx.strokeStyle = border;
  ctx.lineWidth = 2;
  ctx.stroke();

  const logo = await loadLogo(options.logoUrl);
  if (logo && logo.naturalWidth > 0 && logo.naturalHeight > 0) {
    const ratio = Math.min(180 / logo.naturalWidth, 180 / logo.naturalHeight);
    const w = logo.naturalWidth * ratio;
    const h = logo.naturalHeight * ratio;
    try {
      ctx.drawImage(logo, 500 - w / 2, 318 - h / 2, w, h);
    } catch {
      centeredText(ctx, name.charAt(0), 318, 100, 165, main);
    }
  } else {
    centeredText(ctx, name.charAt(0), 318, 100, 165, main);
  }

  centeredText(ctx, name, 498, 64, 760, "#14213D");
  ctx.fillStyle = main;
  roundedRect(ctx, 363, 550, 274, 64, 25);
  ctx.fill();
  centeredText(ctx, pink ? "كود الخصم" : "صفحة المتجر", 582, 37, 240, "#FFFFFF");

  roundedRect(ctx, 124, 657, 752, 144, 31);
  ctx.fillStyle = pale;
  ctx.fill();
  ctx.strokeStyle = border;
  ctx.lineWidth = 3;
  ctx.stroke();
  centeredText(ctx, pink ? code : "تسوّق الآن", 729, pink ? 77 : 68, 680, main, pink ? "Arial, Tajawal, sans-serif" : "Tajawal, Tahoma, sans-serif");

  centeredText(ctx, pink ? "استخدم الكود عند الدفع" : "اكتشف العروض والكوبونات", 864, 31, 650, "#667085");

  // PNG is a local intermediate only. ImageUploadField converts to a real
  // WebP before sending it directly to Supabase with the existing signed URL.
  const png = await new Promise<Blob>((resolve, reject) => {
    canvas.toBlob(blob => blob ? resolve(blob) : reject(new Error("تعذّر إنشاء الصورة")), "image/png");
  });
  return new File([png], `couponnoor-${options.kind}.png`, { type: "image/png" });
}
