"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
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
    return <p className="font-medium text-success">✓ تم إرسال رسالتك بنجاح، سنتواصل معك قريبًا.</p>;
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="max-w-md">
      <Field label="الاسم" required error={errors.name?.message}>
        <Input {...register("name")} placeholder="اسمك الكامل" />
      </Field>
      <Field label="البريد الإلكتروني" required error={errors.email?.message}>
        <Input type="email" {...register("email")} placeholder="example@email.com" />
      </Field>
      <Field label="الرسالة" required error={errors.message?.message}>
        <Textarea {...register("message")} placeholder="اكتب رسالتك هنا…" />
      </Field>
      <Button type="submit" loading={isSubmitting} className="w-full">إرسال الرسالة</Button>
    </form>
  );
}
