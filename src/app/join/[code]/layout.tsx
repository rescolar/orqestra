import { resolveInviteCode } from "@/lib/actions/invite";
import { notFound } from "next/navigation";

export default async function JoinLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ code: string }>;
}) {
  const { code } = await params;
  const resolved = await resolveInviteCode(code);
  if (!resolved) notFound();

  const bg = resolved.organizer.brand_bg_color || undefined;

  return (
    <div
      className="flex min-h-screen items-center justify-center px-4"
      style={{ backgroundColor: bg ?? "#F9FAFB" }}
    >
      {children}
    </div>
  );
}
