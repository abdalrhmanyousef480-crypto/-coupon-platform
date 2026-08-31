"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { signIn } from "next-auth/react";
import { Field, Input } from "@/components/ui/Form";
import { Button } from "@/components/ui/Button";

export default function AdminLoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");
    const result = await signIn("credentials", { email, password, redirect: false });
    setLoading(false);
    if (result?.error) {
      setError("البريد الإلكتروني أو كلمة المرور غير صحيحة");
    } else {
      router.push("/admin");
      router.refresh();
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-bg px-5">
      <div className="w-full max-w-sm">
        <div className="flex items-center gap-2 justify-center mb-8">
          <span className="w-9 h-9 rounded-md bg-primary text-white flex items-center justify-center font-bold">%</span>
          <span className="font-display font-extrabold text-xl text-primary">كوبون نور — لوحة التحكم</span>
        </div>
        <form onSubmit={handleSubmit} className="card p-7">
          <Field label="البريد الإلكتروني" required>
            <Input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} placeholder="admin@example.com" />
          </Field>
          <Field label="كلمة المرور" required>
            <Input type="password" required value={password} onChange={(e) => setPassword(e.target.value)} placeholder="••••••••" />
          </Field>
          {error && <p className="text-danger text-sm mb-4">{error}</p>}
          <Button type="submit" loading={loading} className="w-full">تسجيل الدخول</Button>
        </form>
      </div>
    </div>
  );
}
