import { AdminPageHeader } from "@/components/admin/AdminPageHeader";
import { ChangePasswordForm } from "@/components/admin/ChangePasswordForm";
import { SocialLinksForm } from "@/components/admin/SocialLinksForm";
import { getSiteSettings } from "@/lib/site-settings";

export default async function AdminSettingsPage() {
  const settings = await getSiteSettings();

  return (
    <div>
      <AdminPageHeader title="الإعدادات" />
      <div className="grid grid-cols-1 gap-8 lg:grid-cols-2">
        <SocialLinksForm settings={settings} />
        <ChangePasswordForm />
      </div>
    </div>
  );
}
