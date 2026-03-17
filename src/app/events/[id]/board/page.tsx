import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { EventService } from "@/lib/services/event.service";
import { PersonService } from "@/lib/services/person.service";
import { notFound } from "next/navigation";
import { BoardDndProvider } from "@/components/board/board-dnd-provider";
import { db } from "@/lib/db";

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

  // Load room types with occupancy pricings if event has a venue
  let occupancyPricingMap: Record<string, { occupancy: number; price: number }[]> = {};
  if (event.venue_id) {
    const roomTypes = await db.roomType.findMany({
      where: { venue_id: event.venue_id },
      select: {
        id: true,
        occupancy_pricings: {
          select: { occupancy: true, price: true },
          orderBy: { occupancy: "asc" },
        },
      },
    });
    for (const rt of roomTypes) {
      if (rt.occupancy_pricings.length > 0) {
        occupancyPricingMap[rt.id] = rt.occupancy_pricings.map((op) => ({
          occupancy: op.occupancy,
          price: Number(op.price),
        }));
      }
    }
  }

  return (
    <div className="flex h-screen flex-col overflow-hidden bg-surface">
      <BoardDndProvider
        eventId={event.id}
        initialRooms={event.rooms}
        initialUnassigned={unassigned}
        headerData={{
          eventName: event.name,
          eventStatus: event.status,
          dateStart: event.date_start,
          dateEnd: event.date_end,
          roomCount: event.rooms.length,
          userName: session.user.name,
        }}
        eventPricing={{
          event_price: event.event_price ? Number(event.event_price) : null,
          deposit_amount: event.deposit_amount ? Number(event.deposit_amount) : null,
          pricing_by_room_type: event.pricing_by_room_type,
          pricing_mode: event.pricing_mode,
          facilitation_cost_day: event.facilitation_cost_day ? Number(event.facilitation_cost_day) : null,
          management_cost_day: event.management_cost_day ? Number(event.management_cost_day) : null,
          room_pricings: roomPricings.map((rp) => ({
            capacity: rp.capacity,
            has_private_bathroom: rp.has_private_bathroom,
            price: Number(rp.price),
            daily_rate: rp.daily_rate ? Number(rp.daily_rate) : null,
          })),
          occupancy_pricings: occupancyPricingMap,
          meal_costs: {
            breakfast: event.meal_cost_breakfast ? Number(event.meal_cost_breakfast) : null,
            lunch: event.meal_cost_lunch ? Number(event.meal_cost_lunch) : null,
            dinner: event.meal_cost_dinner ? Number(event.meal_cost_dinner) : null,
          },
          event_dates: {
            start: event.date_start.toISOString(),
            end: event.date_end.toISOString(),
          },
        }}
      />
    </div>
  );
}
