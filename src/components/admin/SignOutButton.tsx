"use client";

import { signOut } from "next-auth/react";
import { LogOut } from "lucide-react";

export function SignOutButton() {
  return (
    <button
      onClick={() => signOut({ callbackUrl: "/admin/login" })}
      className="text-white/60 hover:text-white p-1.5 rounded-md hover:bg-white/10"
      aria-label="تسجيل الخروج"
      title="تسجيل الخروج"
    >
      <LogOut className="h-4 w-4" />
    </button>
  );
}
