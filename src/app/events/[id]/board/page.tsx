import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { EventService } from "@/lib/services/event.service";
import { PersonService } from "@/lib/services/person.service";
import { notFound } from "next/navigation";
import { BoardDndProvider } from "@/components/board/board-dnd-provider";

export default async function BoardPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const { id } = await params;
  const ctx = { userId: session.user.id, role: session.user.role };
  const event = await EventService.getEventWithRooms(id, ctx);
  if (!event) notFound();

  const [unassigned, roomPricings] = await Promise.all([
    PersonService.getUnassignedPersons(id, ctx),
    event.pricing_by_room_type
      ? EventService.getRoomPricings(id, ctx)
      : Promise.resolve([]),
  ]);

  return (
    <div className="flex h-screen flex-col overflow-hidden bg-surface">
      <BoardDndProvider
        eventId={event.id}
        initialRooms={event.rooms}
        initialUnassigned={unassigned}
        headerData={{
          eventName: event.name,
          dateStart: event.date_start,
          dateEnd: event.date_end,
          roomCount: event.rooms.length,
          userName: session.user.name,
        }}
        eventPricing={{
          event_price: event.event_price ? Number(event.event_price) : null,
          deposit_amount: event.deposit_amount ? Number(event.deposit_amount) : null,
          pricing_by_room_type: event.pricing_by_room_type,
          room_pricings: roomPricings.map((rp) => ({
            capacity: rp.capacity,
            has_private_bathroom: rp.has_private_bathroom,
            price: Number(rp.price),
          })),
        }}
      />
    </div>
  );
}
