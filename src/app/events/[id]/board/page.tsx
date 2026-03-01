import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { EventService } from "@/lib/services/event.service";
import { notFound } from "next/navigation";
import { BoardHeader } from "@/components/board/board-header";
import { RoomGrid } from "@/components/board/room-grid";

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
    <div className="flex h-screen flex-col overflow-hidden bg-surface">
      <BoardHeader
        eventName={event.name}
        dateStart={event.date_start}
        dateEnd={event.date_end}
        assignedCount={event.assignedCount}
        totalPersons={event.totalPersons}
        roomCount={event.rooms.length}
        unassignedCount={event.unassignedCount}
        userName={session.user.name}
      />

      <div className="flex flex-1 overflow-hidden">
        {/* Left panel — participants placeholder */}
        <aside className="w-64 shrink-0 border-r border-gray-200 bg-white">
          <div className="p-4">
            <h2 className="text-sm font-semibold uppercase tracking-wider text-gray-400">
              Participantes
            </h2>
            <p className="mt-2 text-xs text-gray-300">
              Se habilitará en el siguiente epic.
            </p>
          </div>
        </aside>

        {/* Center — room grid */}
        <main className="flex-1 overflow-y-auto p-8">
          <RoomGrid eventId={event.id} rooms={event.rooms} />
        </main>
      </div>
    </div>
  );
}
