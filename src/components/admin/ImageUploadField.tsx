"use client";

import { useRef, useState } from "react";
import { toast } from "sonner";
import { UploadCloud, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { uploadStoreLogo, type UploadResult } from "@/lib/actions-upload";

const MAX_FILE_SIZE = 2 * 1024 * 1024; // 2MB
const ACCEPTED_TYPES = ["image/jpeg", "image/png", "image/webp", "image/svg+xml"];

interface ImageUploadFieldProps {
  value: string;
  onChange: (url: string) => void;
  /** يرفع الملف ويحوّله لـ WebP على الخادم — افتراضيًا شعار متجر، مرّر
   *  uploadArticleImage (أو أي رافع آخر يتّبع نفس التوقيع) لسياق مختلف. */
  uploadAction?: (formData: FormData) => Promise<UploadResult>;
  /** النص الظاهر تحت المعاينة لما فيه صورة مرفوعة أصلًا */
  replaceHint?: string;
  /** رسالة النجاح بعد الرفع */
  successMessage?: string;
}

/** Drag-and-drop / click-to-browse uploader — converts to WebP and uploads
 *  to Supabase Storage server-side, then hands the resulting public URL
 *  back to the caller (which just stores it like any other URL). */
export function ImageUploadField({
  value,
  onChange,
  uploadAction = uploadStoreLogo,
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
      setError("حجم الملف كبير جدًا — الحد الأقصى 2 ميجابايت");
      return;
    }

    setUploading(true);
    try {
      const formData = new FormData();
      formData.append("file", file);
      const result = await uploadAction(formData);

      if (!result.success) {
        setError(result.error);
        toast.error(result.error);
        return;
      }
      onChange(result.url);
      toast.success(successMessage);
    } catch {
      const message = "تعذّر الاتصال بالخادم، حاول مرة أخرى";
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
            <span className="text-sm text-ink-muted">جارٍ الرفع والتحويل لصيغة WebP...</span>
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
            <span className="text-xs text-ink-faint">JPG, PNG, WEBP أو SVG — حتى 2 ميجابايت</span>
          </>
        )}
      </div>

      {error && <p className="form-error">{error}</p>}
    </div>
  );
}
