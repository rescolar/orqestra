import { getBranding } from "@/lib/actions/settings";
import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { SettingsForm } from "./settings-form";

export default async function SettingsPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const branding = await getBranding();

  return (
    <div className="mx-auto max-w-2xl px-6 py-8">
      <h1 className="text-2xl font-bold text-gray-900">Ajustes</h1>
      <p className="mt-1 text-sm text-muted-foreground">
        Personaliza cómo ven los participantes tus invitaciones
      </p>
      <div className="mt-8">
        <SettingsForm
          userId={session.user.id}
          initial={{
            avatar_url: branding?.avatar_url ?? null,
            brand_name: branding?.brand_name ?? "",
            brand_welcome_msg: branding?.brand_welcome_msg ?? "",
            brand_bg_color: branding?.brand_bg_color ?? "",
            brand_text_color: branding?.brand_text_color ?? "",
            environment: branding?.environment ?? "open",
          }}
        />
      </div>
    </div>
  );
}
