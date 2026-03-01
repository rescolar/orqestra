import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { EventService } from "@/lib/services/event.service";
import { notFound } from "next/navigation";
import Link from "next/link";

export default async function BoardPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const { id } = await params;
  const event = await EventService.getEventWithRooms(id, session.user.id);
  if (!event) notFound();

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="border-b bg-white">
        <div className="mx-auto flex h-14 max-w-7xl items-center gap-4 px-6">
          <Link
            href="/dashboard"
            className="text-sm text-gray-500 hover:text-gray-900"
          >
            ← Mis Eventos
          </Link>
          <span className="text-sm text-gray-300">|</span>
          <h1 className="text-lg font-semibold text-gray-900">{event.name}</h1>
          <span className="text-sm text-gray-500">
            {event.rooms.length} habitaciones
          </span>
        </div>
      </header>
      <main className="mx-auto max-w-7xl px-6 py-10">
        <p className="text-sm text-gray-500">
          El tablero se implementará en el siguiente epic.
        </p>
      </main>
    </div>
  );
}
