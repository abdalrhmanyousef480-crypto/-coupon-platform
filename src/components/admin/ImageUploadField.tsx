"use client";

import { useRef, useState } from "react";
import { toast } from "sonner";
import { UploadCloud, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { uploadStoreLogo, type UploadResult } from "@/lib/actions-upload";
import { createSignedImageTicket, type DirectImageKind } from "@/lib/actions-signed-image";

// الحد الأقصى للملف الأصلي قبل المعالجة — أعلى بكثير من حجم الملف النهائي
// المتوقع لأن الخادم يقصّ الصورة لأبعاد ثابتة ويضغطها WebP (راجع
// actions-upload.ts)، فصورة كاميرا جوال بعدة ميجابايت بترجع لملف صغير
// بعد المعالجة — هذا الحد فقط لمنع رفع ملفات ضخمة غير منطقية.
const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
const ACCEPTED_TYPES = ["image/jpeg", "image/png", "image/webp", "image/svg+xml"];

interface ImageUploadFieldProps {
  value: string;
  onChange: (url: string) => void;
  /** يرفع الملف ويحوّله لـ WebP على الخادم — افتراضيًا شعار متجر، مرّر
   *  uploadArticleImage (أو أي رافع آخر يتّبع نفس التوقيع) لسياق مختلف. */
  uploadAction?: (formData: FormData) => Promise<UploadResult>;
  /** New uploads: resize on the device then upload directly to Supabase, not Vercel. */
  directKind?: DirectImageKind;
  /** النص الظاهر تحت المعاينة لما فيه صورة مرفوعة أصلًا */
  replaceHint?: string;
  /** رسالة النجاح بعد الرفع */
  successMessage?: string;
}

const TARGET_SIZE: Record<DirectImageKind, number> = {
  "store-logo": 512,
  "store-card": 1200,
  "coupon-card": 800,
};

function renderToWebp(file: File, dimension: number): Promise<Blob> {
  return new Promise((resolve, reject) => {
    const objectUrl = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(objectUrl);
      try {
        const canvas = document.createElement("canvas");
        canvas.width = dimension;
        canvas.height = dimension;
        const ctx = canvas.getContext("2d");
        if (!ctx) { reject(new Error("Canvas unavailable")); return; }

        // Contain + white background preserves every letter / logo in both
        // square and portrait/landscape images. "cover" cropped the old artwork.
        const scale = Math.min(dimension / img.naturalWidth, dimension / img.naturalHeight);
        const w = Math.round(img.naturalWidth * scale);
        const h = Math.round(img.naturalHeight * scale);
        ctx.fillStyle = "#ffffff";
        ctx.fillRect(0, 0, dimension, dimension);
        ctx.drawImage(img, Math.floor((dimension - w) / 2), Math.floor((dimension - h) / 2), w, h);
        // Safari can return PNG despite requesting WebP. Use the local
        // WebAssembly encoder only in that case; never upload JPEG or PNG.
        canvas.toBlob(async (webp) => {
          if (webp?.type === "image/webp" && webp.size > 0) {
            resolve(webp);
            return;
          }
          try {
            const { default: encodeWebp } = await import("@jsquash/webp/encode");
            const encoded = new Uint8Array(
              await encodeWebp(ctx.getImageData(0, 0, dimension, dimension), { quality: 82 })
            );
            const header = new TextDecoder("ascii").decode(encoded.subarray(0, 12));
            if (encoded.byteLength < 80 || header.slice(0, 4) !== "RIFF" || header.slice(8, 12) !== "WEBP") {
              throw new Error("WASM encoder did not return valid WebP");
            }
            resolve(new Blob([encoded], { type: "image/webp" }));
          } catch (error) {
            console.error("[renderToWebp] browser WebP encoder unavailable:", error);
            reject(new Error("تعذّر تحويل الصورة إلى WebP على هذا المتصفح"));
          }
        }, "image/webp", 0.82);
      } catch (e) { reject(e); }
    };
    img.onerror = () => { URL.revokeObjectURL(objectUrl); reject(new Error("Could not decode image")); };
    img.src = objectUrl;
  });
}

/** A single small Server Action authorizes the user. Image bytes go directly
 * from the browser to Supabase Storage with a signed, unique upload URL.
 * No Sharp, image-generation function, or large request body on Vercel. */
async function uploadDirectImage(file: File, kind: DirectImageKind): Promise<UploadResult> {
  const img = await renderToWebp(file, TARGET_SIZE[kind]);
  if (img.size > 3 * 1024 * 1024) {
    return { success: false, error: "صورة WebP الناتجة أكبر من 3 ميجابايت. جرّب صورة أصغر." };
  }
  if (img.type !== "image/webp") {
    return { success: false, error: "تعذّر إنتاج WebP. لم يتم حفظ أي ملف بديل." };
  }
  // Verify WebP magic bytes as well as the MIME type.
  const header = new Uint8Array(await img.slice(0, 12).arrayBuffer());
  const tag = Array.from(header).map(n => String.fromCharCode(n)).join("");
  if (tag.slice(0, 4) !== "RIFF" || tag.slice(8, 12) !== "WEBP") {
    return { success: false, error: "الصورة الناتجة ليست ملف WebP صالحًا" };
  }

  const ticket = await createSignedImageTicket(kind, "image/webp");
  if (!ticket.success) return ticket;

  // Match supabase-js uploadToSignedUrl's wire format (multipart + PUT).
  const body = new FormData();
  body.append("cacheControl", "31536000");
  body.append("", img, "card.webp");
  const response = await fetch(ticket.signedUrl, {
    method: "PUT",
    body,
    headers: { "x-upsert": "false" },
  });
  if (!response.ok) {
    const failure = await response.json().catch(() => null);
    const errorCode = typeof failure?.errorCode === "string" ? failure.errorCode
      : typeof failure?.code === "string" ? failure.code
      : typeof failure?.error === "string" ? failure.error
      : "";
    console.error("[direct-image-upload] Supabase rejected upload:", response.status, errorCode);
    if (errorCode === "InvalidMimeType" || errorCode === "invalid_mime_type") {
      return { success: false, error: "صيغة الصورة الناتجة غير مسموحة في مخزن Supabase. حدّث الصفحة وحاول مجددًا." };
    }
    return { success: false, error: `فشل حفظ الصورة في Supabase (HTTP ${response.status}${errorCode ? `، ${errorCode}` : ""})` };
  }
  return { success: true, url: ticket.publicUrl };
}

/** Drag-and-drop / click-to-browse uploader — converts to WebP and uploads
 *  to Supabase Storage server-side, then hands the resulting public URL
 *  back to the caller (which just stores it like any other URL). */
export function ImageUploadField({
  value,
  onChange,
  uploadAction = uploadStoreLogo,
  directKind,
  replaceHint = "اضغط أو اسحب صورة جديدة هنا لاستبدال الشعار الحالي",
  successMessage = "تم رفع الشعار وتحويله بنجاح",
}: ImageUploadFieldProps) {
  const [uploading, setUploading] = useState(false);
  const [dragActive, setDragActive] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  async function handleFile(file: File) {
    setError(null);

    if (!ACCEPTED_TYPES.includes(file.type)) {
      setError("صيغة غير مدعومة — استخدم JPG أو PNG أو WEBP أو SVG");
      return;
    }
    if (file.size > MAX_FILE_SIZE) {
      setError("حجم الملف كبير جدًا — الحد الأقصى 10 ميجابايت");
      return;
    }

    setUploading(true);
    try {
      let result: UploadResult;
      if (directKind && file.type !== "image/svg+xml") {
        result = await uploadDirectImage(file, directKind);
      } else {
        // Keep existing vector SVG support and articles unchanged.
        const formData = new FormData();
        formData.append("file", file);
        result = await uploadAction(formData);
      }

      if (!result.success) {
        setError(result.error);
        toast.error(result.error);
        return;
      }
      onChange(result.url);
      toast.success(successMessage);
    } catch (cause) {
      console.error("[ImageUploadField] failed:", cause);
      const message = "تعذّر رفع الصورة. تحقق من الاتصال ثم حاول مرة أخرى (أو أعد تسجيل الدخول).";
      setError(message);
      toast.error(message);
    } finally {
      setUploading(false);
    }
  }

  function handleDrop(e: React.DragEvent<HTMLDivElement>) {
    e.preventDefault();
    setDragActive(false);
    if (uploading) return;
    const file = e.dataTransfer.files?.[0];
    if (file) handleFile(file);
  }

  return (
    <div>
      <div
        role="button"
        tabIndex={0}
        onClick={() => !uploading && inputRef.current?.click()}
        onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") inputRef.current?.click(); }}
        onDragOver={(e) => { e.preventDefault(); setDragActive(true); }}
        onDragLeave={() => setDragActive(false)}
        onDrop={handleDrop}
        className={cn(
          "flex cursor-pointer flex-col items-center justify-center gap-2.5 rounded-md border-2 border-dashed p-5 text-center transition-colors",
          dragActive ? "border-accent bg-accent-soft/40" : "border-border-strong hover:border-primary hover:bg-surface-alt",
          uploading && "pointer-events-none opacity-60"
        )}
      >
        <input
          ref={inputRef}
          type="file"
          accept={ACCEPTED_TYPES.join(",")}
          className="hidden"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) handleFile(file);
            e.target.value = ""; // يسمح باختيار نفس الملف مرة ثانية لو احتاج المستخدم يعيد الرفع
          }}
        />

        {uploading ? (
          <>
            <Loader2 className="h-6 w-6 animate-spin text-accent" />
            <span className="text-sm text-ink-muted">جارٍ تجهيز الصورة ورفعها إلى Supabase...</span>
          </>
        ) : value ? (
          <div className="flex items-center gap-3.5">
            <img src={value} alt="" className="h-16 w-16 rounded-md border border-border bg-surface-alt object-contain" />
            <div className="text-start text-sm text-ink-muted">
              {replaceHint}
            </div>
          </div>
        ) : (
          <>
            <UploadCloud className="h-6 w-6 text-ink-faint" />
            <span className="text-sm font-medium text-ink">اسحب صورة هنا أو اضغط للاختيار</span>
            <span className="text-xs text-ink-faint">JPG, PNG, WEBP أو SVG — مربعة أو مستطيلة، حتى 10 ميجابايت</span>
          </>
        )}
      </div>

      {error && <p className="form-error">{error}</p>}
    </div>
  );
}
