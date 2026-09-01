import type { Config } from "tailwindcss";

// ============================================================
// DESIGN SYSTEM — نفس المبادئ اللي اعتمدناها بالنسخة الأولى:
// Premium, Minimal, Trustworthy. كل الألوان/الخطوط/الظلال موحّدة
// هون، وكل مكون بالموقع (أزرار، بطاقات، حقول إدخال) يسحب من هاي
// القيم فقط — ما فيه لون أو radius "طالع من فراغ" بأي مكون.
// ============================================================

const config: Config = {
  darkMode: "class",
  content: [
    "./src/app/**/*.{ts,tsx}",
    "./src/components/**/*.{ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        primary: {
          DEFAULT: "#14213D",
          hover: "#1E2E52",
        },
        accent: {
          DEFAULT: "#E8543E",
          hover: "#D6432E",
          soft: "#FDEEEB",
        },
        surface: {
          DEFAULT: "#FFFFFF",
          alt: "#F4F3EF",
        },
        bg: "#FAFAF8",
        ink: {
          DEFAULT: "#1A1D29",
          muted: "#6B7280",
          faint: "#9CA3AF",
        },
        border: {
          DEFAULT: "#E7E5E0",
          strong: "#D8D6CF",
        },
        success: { DEFAULT: "#0F9D58", soft: "#E7F6EE" },
        warning: { DEFAULT: "#D97706", soft: "#FEF3E2" },
        danger:  { DEFAULT: "#DC2626", soft: "#FDECEC" },
      },
      fontFamily: {
        display: ["var(--font-jakarta)", "var(--font-tajawal)", "sans-serif"],
        body: ["var(--font-inter)", "var(--font-tajawal)", "sans-serif"],
        mono: ["var(--font-mono)", "ui-monospace", "monospace"],
        code: ["var(--font-code)", "var(--font-mono)", "ui-monospace", "monospace"],
      },
      borderRadius: {
        sm: "8px",
        md: "12px",
        lg: "18px",
      },
      boxShadow: {
        sm: "0 1px 2px rgba(20,33,61,0.05), 0 1px 1px rgba(20,33,61,0.03)",
        md: "0 4px 16px rgba(20,33,61,0.07), 0 1px 2px rgba(20,33,61,0.04)",
        lg: "0 12px 32px rgba(20,33,61,0.10), 0 2px 6px rgba(20,33,61,0.05)",
      },
      maxWidth: {
        container: "1200px",
      },
    },
  },
  plugins: [],
};

export default config;
