import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { EventService } from "@/lib/services/event.service";
import { PersonService } from "@/lib/services/person.service";
import { notFound } from "next/navigation";
import { BoardHeader } from "@/components/board/board-header";
import { BoardDndProvider } from "@/components/board/board-dnd-provider";

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

  const unassigned = await PersonService.getUnassignedPersons(
    id,
    session.user.id
  );

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

      <BoardDndProvider
        eventId={event.id}
        initialRooms={event.rooms}
        initialUnassigned={unassigned}
      />
    </div>
  );
}
