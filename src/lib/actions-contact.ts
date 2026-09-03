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
import { contactFormEmailHtml } from "@/lib/email-templates";

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
      // couponsnoor.com موثّق بلوحة Resend (كان onboarding@resend.dev مؤقتًا للتجربة)
      from: "كوبون نور <noreply@couponsnoor.com>",
      to,
      replyTo: email,
      subject: "رسالة جديدة من نموذج التواصل - كوبون نور",
      text: `الاسم: ${name}\nالبريد الإلكتروني: ${email}\n\nالرسالة:\n${message}`,
      html: contactFormEmailHtml({ name, email, message }),
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
