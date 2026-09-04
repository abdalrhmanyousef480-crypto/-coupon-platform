// ============================================================
// قوالب HTML للإيميلات المُرسلة عبر Resend — تصميم بجداول (tables)
// وأنماط inline بالكامل عمدًا (بدون <style> خارجي أو أصناف CSS)، لأن
// أغلب برامج البريد (خصوصًا Outlook سطح المكتب) بتشيل أي CSS خارجي أو
// حتى بعض خصائص <style> جوّا <head>. جداول + أنماط inline هي المعيار
// المتعارف عليه للحصول على نفس الشكل تقريبًا بكل برامج البريد.
//
// نفس ألوان هوية الموقع (راجع tailwind.config.ts): primary #14213D،
// accent #CD3018. خصائص CSS المنطقية (border-inline-start...) متجنّبة
// عمدًا لصالح left/right فعلية — Outlook القديم ما بيفهم الخصائص
// المنطقية، فبنحدد الجهة يدويًا حسب اتجاه RTL.
// ============================================================
import { escapeHtml } from "@/lib/utils";

interface ContactEmailParams {
  name: string;
  email: string;
  message: string;
}

export function contactFormEmailHtml({ name, email, message }: ContactEmailParams): string {
  const receivedAt = new Intl.DateTimeFormat("ar-EG", {
    dateStyle: "long",
    timeStyle: "short",
    timeZone: "Asia/Riyadh",
  }).format(new Date());

  const safeName = escapeHtml(name);
  const safeEmail = escapeHtml(email);
  const safeMessage = escapeHtml(message).replace(/\n/g, "<br />");

  return `<!doctype html>
<html lang="ar" dir="rtl">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>رسالة جديدة من نموذج التواصل</title>
  </head>
  <body style="margin:0; padding:0; background-color:#FAFAF8;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color:#FAFAF8;">
      <tr>
        <td align="center" style="padding:32px 16px;">
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="max-width:560px; background-color:#FFFFFF; border-radius:16px; overflow:hidden; border:1px solid #E7E5E0;">

            <!-- Header banner: شعار كوبون نور -->
            <tr>
              <td align="center" style="background-color:#14213D; padding:26px 32px;">
                <table role="presentation" cellpadding="0" cellspacing="0" border="0">
                  <tr>
                    <td valign="middle" style="padding-left:10px;">
                      <table role="presentation" width="40" height="40" cellpadding="0" cellspacing="0" border="0" style="background-color:#CD3018; border-radius:10px;">
                        <tr>
                          <td align="center" valign="middle" style="width:40px; height:40px; color:#FFFFFF; font-family:Arial, sans-serif; font-size:18px; font-weight:bold;">%</td>
                        </tr>
                      </table>
                    </td>
                    <td valign="middle" style="color:#FFFFFF; font-family:Tahoma, 'Segoe UI', Arial, sans-serif; font-size:20px; font-weight:bold;">كوبون نور</td>
                  </tr>
                </table>
              </td>
            </tr>

            <!-- عنوان الرسالة -->
            <tr>
              <td style="padding:28px 32px 4px; font-family:Tahoma, 'Segoe UI', Arial, sans-serif;">
                <p style="margin:0 0 6px; font-size:12px; font-weight:bold; letter-spacing:0.5px; color:#CD3018; text-transform:uppercase;">رسالة جديدة</p>
                <h1 style="margin:0; font-size:20px; font-weight:800; color:#14213D;">وصلتك رسالة من نموذج التواصل</h1>
              </td>
            </tr>

            <!-- بيانات المرسل -->
            <tr>
              <td style="padding:20px 32px 0;">
                <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color:#F4F3EF; border-radius:12px; font-family:Tahoma, 'Segoe UI', Arial, sans-serif;">
                  <tr>
                    <td style="padding:16px 18px; border-bottom:1px solid #E7E5E0;">
                      <p style="margin:0 0 4px; font-size:12px; color:#6B7280; font-weight:bold;">&#128100; الاسم</p>
                      <p style="margin:0; font-size:15px; color:#1A1D29; font-weight:bold;">${safeName}</p>
                    </td>
                  </tr>
                  <tr>
                    <td style="padding:16px 18px;">
                      <p style="margin:0 0 4px; font-size:12px; color:#6B7280; font-weight:bold;">&#9993; البريد الإلكتروني</p>
                      <a href="mailto:${safeEmail}" style="font-size:15px; color:#CD3018; font-weight:bold; text-decoration:none;">${safeEmail}</a>
                    </td>
                  </tr>
                </table>
              </td>
            </tr>

            <!-- الرسالة -->
            <tr>
              <td style="padding:18px 32px 28px; font-family:Tahoma, 'Segoe UI', Arial, sans-serif;">
                <p style="margin:0 0 8px; font-size:12px; color:#6B7280; font-weight:bold;">&#128172; الرسالة</p>
                <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color:#FFFFFF; border:1px solid #E7E5E0; border-right:3px solid #CD3018; border-radius:10px;">
                  <tr>
                    <td style="padding:16px 18px; font-size:14.5px; line-height:1.8; color:#1A1D29;">${safeMessage}</td>
                  </tr>
                </table>
              </td>
            </tr>

            <!-- الفوتر -->
            <tr>
              <td style="padding:18px 32px 26px; border-top:1px solid #E7E5E0; font-family:Tahoma, 'Segoe UI', Arial, sans-serif;">
                <p style="margin:0; font-size:12px; color:#9CA3AF; text-align:center;">تم الإرسال من نموذج التواصل في كوبون نور &mdash; ${receivedAt}</p>
              </td>
            </tr>

          </table>
        </td>
      </tr>
    </table>
  </body>
</html>`;
}
