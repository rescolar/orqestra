import { auth, signOut } from "@/lib/auth";
import { redirect } from "next/navigation";
import Link from "next/link";
import { db } from "@/lib/db";

export default async function ParticipantLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();
  if (!session?.user) redirect("/login");

  // Check if user has organizer/collab access → show Dashboard link
  const showDashboard =
    session.user.role === "organizer" ||
    session.user.role === "admin" ||
    (await db.eventCollaborator.count({ where: { user_id: session.user.id } })) > 0;

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-primary text-white">
        <div className="mx-auto flex h-14 max-w-2xl items-center justify-between px-4">
          <Link href="/my-events" className="text-lg font-bold tracking-tight">
            Ordenaia
          </Link>
          <div className="flex items-center gap-3">
            {showDashboard && (
              <Link
                href="/dashboard"
                className="text-sm opacity-90 hover:opacity-100 transition-opacity"
              >
                Dashboard
              </Link>
            )}
            <Link
              href="/my-events"
              className="text-sm opacity-90 hover:opacity-100 transition-opacity"
            >
              Mis eventos
            </Link>
            <Link
              href="/my-profile"
              className="text-sm opacity-90 hover:opacity-100 transition-opacity"
            >
              Mi perfil
            </Link>
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
                Salir
              </button>
            </form>
          </div>
        </div>
      </header>
      <main className="mx-auto max-w-2xl px-4 py-6">{children}</main>
    </div>
  );
}
