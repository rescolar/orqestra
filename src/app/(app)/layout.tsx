import { auth, signOut } from "@/lib/auth";
import { redirect } from "next/navigation";
import { NavLinks } from "@/components/shared/nav-links";
import { db } from "@/lib/db";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();
  if (!session?.user) redirect("/login");

  // Check if user is also a participant in any event → show "Mis eventos" link
  const hasParticipantEvents =
    (await db.person.count({
      where: { self_user_id: session.user.id },
    })) > 0;

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-primary text-white">
        <div className="mx-auto flex h-14 max-w-7xl items-center justify-between px-6">
          <div className="flex items-center gap-6">
            <span className="text-lg font-bold tracking-tight">Orqestra</span>
            <NavLinks showMyEvents={hasParticipantEvents} />
          </div>
          <div className="flex items-center gap-4">
            <span className="text-sm opacity-90">{session.user.name}</span>
            <form
              action={async () => {
                "use server";
                await signOut({ redirectTo: "/login" });
              }}
            >
              <button
                type="submit"
                className="text-sm opacity-75 hover:opacity-100 transition-opacity"
              >
                Cerrar sesión
              </button>
            </form>
          </div>
        </div>
      </header>
      <main>{children}</main>
    </div>
  );
}
