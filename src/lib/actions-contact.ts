"use server";

// ============================================================
// CONTACT FORM — إرسال رسائل نموذج التواصل عبر Resend
// ============================================================
// البريد الوجهة (CONTACT_RECIPIENT_EMAIL) يُقرأ فقط هون، بكود خادم
// (Server Action) خلف "use server" — ما يوصل أبدًا لأي bundle عميل،
// ولا يظهر بأي HTML أو JSON مُرسل للمتصفح. لا تضيف بادئة NEXT_PUBLIC_
// له بملف .env مهما كان السبب.
// ============================================================
import { Resend } from "resend";
import { contactSchema, type ContactInput } from "@/lib/validations";
import { escapeHtml } from "@/lib/utils";

export type ContactResult = { success: true } | { success: false; error: string };

export async function sendContactMessage(data: ContactInput): Promise<ContactResult> {
  const parsed = contactSchema.safeParse(data);
  if (!parsed.success) return { success: false, error: parsed.error.errors[0].message };

  const apiKey = process.env.RESEND_API_KEY;
  const to = process.env.CONTACT_RECIPIENT_EMAIL;
  if (!apiKey || !to) {
    console.error("[sendContactMessage] missing RESEND_API_KEY or CONTACT_RECIPIENT_EMAIL env vars");
    return { success: false, error: "تعذّر إرسال الرسالة حاليًا، حاول لاحقًا" };
  }

  const { name, email, message } = parsed.data;

  try {
    const resend = new Resend(apiKey);
    const { error } = await resend.emails.send({
      // onboarding@resend.dev صالح للتجربة/التطوير بدون توثيق دومين —
      // قبل الإطلاق الفعلي لازم نوثّق دومين حقيقي بلوحة Resend ونستبدله
      from: "كوبون نور <onboarding@resend.dev>",
      to,
      replyTo: email,
      subject: "رسالة جديدة من نموذج التواصل - كوبون نور",
      text: `الاسم: ${name}\nالبريد الإلكتروني: ${email}\n\nالرسالة:\n${message}`,
      html: `
        <div style="font-family: sans-serif; line-height: 1.7; color: #1A1D29;">
          <p><strong>الاسم:</strong> ${escapeHtml(name)}</p>
          <p><strong>البريد الإلكتروني:</strong> ${escapeHtml(email)}</p>
          <p><strong>الرسالة:</strong></p>
          <p>${escapeHtml(message).replace(/\n/g, "<br />")}</p>
        </div>
      `,
    });

    if (error) {
      console.error("[sendContactMessage] Resend error:", error);
      return { success: false, error: "تعذّر إرسال الرسالة، حاول مرة أخرى" };
    }

    return { success: true };
  } catch (err) {
    console.error("[sendContactMessage] unexpected error:", err);
    return { success: false, error: "تعذّر إرسال الرسالة، حاول مرة أخرى" };
  }
}
