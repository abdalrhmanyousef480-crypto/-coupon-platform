"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { Facebook, Instagram, Twitter, Music2, Ghost } from "lucide-react";
import { socialLinksSchema, type SocialLinksInput } from "@/lib/validations";
import { updateSocialLinks } from "@/lib/actions-settings";
import { Field, Input } from "@/components/ui/Form";
import { Button } from "@/components/ui/Button";
import type { SiteSettings } from "@prisma/client";

const PLATFORMS = [
  { key: "facebookUrl", label: "Facebook", icon: Facebook, placeholder: "https://facebook.com/your-page" },
  { key: "instagramUrl", label: "Instagram", icon: Instagram, placeholder: "https://instagram.com/your-account" },
  { key: "twitterUrl", label: "X (Twitter)", icon: Twitter, placeholder: "https://x.com/your-account" },
  { key: "tiktokUrl", label: "TikTok", icon: Music2, placeholder: "https://tiktok.com/@your-account" },
  { key: "snapchatUrl", label: "Snapchat", icon: Ghost, placeholder: "https://snapchat.com/add/your-account" },
] as const;

export function SocialLinksForm({ settings }: { settings: SiteSettings | null }) {
  const {
    register, handleSubmit, formState: { errors, isSubmitting },
  } = useForm<SocialLinksInput>({
    resolver: zodResolver(socialLinksSchema),
    defaultValues: {
      facebookUrl: settings?.facebookUrl || "",
      instagramUrl: settings?.instagramUrl || "",
      twitterUrl: settings?.twitterUrl || "",
      tiktokUrl: settings?.tiktokUrl || "",
      snapchatUrl: settings?.snapchatUrl || "",
    },
  });

  async function onSubmit(data: SocialLinksInput) {
    const result = await updateSocialLinks(data);
    if (result.success) toast.success("تم حفظ روابط التواصل الاجتماعي");
    else toast.error(result.error);
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="max-w-lg">
      <div className="card p-6 mb-5">
        <h2 className="font-bold text-primary mb-1">روابط التواصل الاجتماعي</h2>
        <p className="text-xs text-ink-faint mb-4">
          الصق رابط حسابك بكل منصة تملكها فعليًا. أي حقل تتركه فاضيًا ما تظهر أيقونته بفوتر الموقع نهائيًا —
          أفضل من عرض أيقونة لحساب غير موجود.
        </p>
        {PLATFORMS.map(({ key, label, icon: Icon, placeholder }) => (
          <Field key={key} label={label} error={errors[key]?.message}>
            <div className="relative">
              <Icon className="absolute top-1/2 -translate-y-1/2 start-3 h-4 w-4 text-ink-faint" />
              <Input {...register(key)} placeholder={placeholder} className="ps-9" dir="ltr" />
            </div>
          </Field>
        ))}
      </div>

      <Button type="submit" loading={isSubmitting}>حفظ روابط التواصل</Button>
    </form>
  );
}
