import { resolveInviteCode } from "@/lib/actions/invite";
import { notFound } from "next/navigation";
import { LoginForm } from "./login-form";

export default async function JoinLoginPage({
  params,
}: {
  params: Promise<{ code: string }>;
}) {
  const { code } = await params;
  const resolved = await resolveInviteCode(code);
  if (!resolved) notFound();

  return (
    <LoginForm
      code={code}
      branding={{
        avatar_url: resolved.organizer.avatar_url,
        brand_name: resolved.organizer.brand_name,
        brand_text_color: resolved.organizer.brand_text_color,
      }}
    />
  );
}
