import { StaticPage } from "@/components/public/StaticPage";
import { buildMetadata } from "@/lib/seo";
import { ContactForm } from "@/components/public/ContactForm";
import type { Metadata } from "next";

export const metadata: Metadata = buildMetadata({
  title: "تواصل معنا — كوبون نور", description: "تواصل مع فريق كوبون نور لأي استفسار.", path: "/contact", locale: "ar",
});

export default function ContactPage() {
  return (
    <StaticPage title="تواصل معنا">
      <p className="text-ink-muted mb-6">يسعدنا سماع رأيك أو مساعدتك في أي استفسار.</p>
      <ContactForm />
    </StaticPage>
  );
}
