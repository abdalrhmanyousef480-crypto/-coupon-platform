"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { MailCheck } from "lucide-react";
import { contactSchema, type ContactInput } from "@/lib/validations";
import { sendContactMessage } from "@/lib/actions-contact";
import { Field, Input, Textarea } from "@/components/ui/Form";
import { Button } from "@/components/ui/Button";

export function ContactForm() {
  const [sent, setSent] = useState(false);
  const {
    register, handleSubmit, formState: { errors, isSubmitting },
  } = useForm<ContactInput>({ resolver: zodResolver(contactSchema) });

  async function onSubmit(data: ContactInput) {
    const result = await sendContactMessage(data);
    if (result.success) {
      setSent(true);
    } else {
      toast.error(result.error);
    }
  }

  if (sent) {
    return (
      <div className="card mx-auto max-w-lg p-8 text-center shadow-md md:p-10">
        <span className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-full bg-success-soft text-success ring-1 ring-inset ring-success/15">
          <MailCheck className="h-8 w-8" />
        </span>
        <h2 className="mb-2 text-lg font-bold text-primary">تم إرسال رسالتك بنجاح</h2>
        <p className="text-sm leading-relaxed text-ink-muted">سنتواصل معك قريبًا عبر البريد الإلكتروني الذي أدخلته.</p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="card mx-auto max-w-lg p-6 shadow-md md:p-10">
      <Field label="الاسم" required error={errors.name?.message}>
        <Input {...register("name")} placeholder="اسمك الكامل" />
      </Field>
      <Field label="البريد الإلكتروني" required error={errors.email?.message}>
        <Input type="email" {...register("email")} placeholder="example@email.com" />
      </Field>
      <Field label="الرسالة" required error={errors.message?.message}>
        <Textarea {...register("message")} placeholder="اكتب رسالتك هنا…" className="min-h-[160px]" />
      </Field>
      <Button type="submit" loading={isSubmitting} className="w-full">إرسال الرسالة</Button>
    </form>
  );
}
