"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { changePasswordSchema, type ChangePasswordInput } from "@/lib/validations";
import { changePassword } from "@/lib/actions-user";
import { Field, Input } from "@/components/ui/Form";
import { Button } from "@/components/ui/Button";

export function ChangePasswordForm() {
  const {
    register, handleSubmit, reset, formState: { errors, isSubmitting },
  } = useForm<ChangePasswordInput>({
    resolver: zodResolver(changePasswordSchema),
    defaultValues: { currentPassword: "", newPassword: "", confirmPassword: "" },
  });

  async function onSubmit(data: ChangePasswordInput) {
    const result = await changePassword(data);
    if (result.success) {
      toast.success("تم تغيير كلمة المرور بنجاح");
      reset();
    } else {
      toast.error(result.error);
    }
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="max-w-lg">
      <div className="card p-6 mb-5">
        <h2 className="font-bold text-primary mb-4">تغيير كلمة المرور</h2>
        <Field label="كلمة المرور الحالية" required error={errors.currentPassword?.message}>
          <Input type="password" autoComplete="current-password" {...register("currentPassword")} />
        </Field>
        <Field label="كلمة المرور الجديدة" required error={errors.newPassword?.message} hint="8 أحرف على الأقل">
          <Input type="password" autoComplete="new-password" {...register("newPassword")} />
        </Field>
        <Field label="تأكيد كلمة المرور الجديدة" required error={errors.confirmPassword?.message}>
          <Input type="password" autoComplete="new-password" {...register("confirmPassword")} />
        </Field>
      </div>

      <div className="flex gap-3">
        <Button type="submit" loading={isSubmitting}>حفظ كلمة المرور</Button>
      </div>
    </form>
  );
}
