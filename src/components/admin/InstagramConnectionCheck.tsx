"use client";

import { useState } from "react";

type CheckResult =
  | { status: "connected"; username: string }
  | { status: "unconfigured" | "error"; message: string };

export function InstagramConnectionCheck() {
  const [result, setResult] = useState<CheckResult | null>(null);
  const [loading, setLoading] = useState(false);

  async function check() {
    setLoading(true);
    setResult(null);
    try {
      const response = await fetch("/api/admin/instagram/connection", { cache: "no-store" });
      const data = (await response.json()) as CheckResult;
      setResult(data);
    } catch {
      setResult({ status: "error", message: "تعذر الاتصال بالخادم. حاول لاحقًا." });
    } finally {
      setLoading(false);
    }
  }

  return (
    <section className="rounded-xl border bg-white p-4">
      <div className="flex flex-wrap items-center gap-3">
        <strong>فحص ربط حساب إنستغرام</strong>
        <button type="button" onClick={check} disabled={loading}
          className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white disabled:opacity-60">
          {loading ? "جاري الفحص..." : "فحص الاتصال دون نشر"}
        </button>
      </div>
      {result && (
        <p role="status" className="mt-3 text-sm text-slate-700">
          {result.status === "connected"
            ? `تم الاتصال بـ @${result.username}. صلاحية النشر لم تُختبر بعد.`
            : result.message}
        </p>
      )}
      <p className="mt-2 text-xs text-slate-500">
        هذا الفحص لا ينشر أي صورة ولا يعرض رمز الوصول.
      </p>
    </section>
  );
}
