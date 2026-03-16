import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { notFound } from "next/navigation";
import Link from "next/link";
import { EventService } from "@/lib/services/event.service";
import { EventDetailForm } from "@/components/event/event-detail-form";
import { WizardStepper } from "@/components/event/wizard-stepper";
import { db } from "@/lib/db";

const STEPS = [
  { label: "Datos" },
  { label: "Centro" },
  { label: "Detalles" },
];

export default async function DetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ from?: string }>;
}) {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const { id } = await params;
  const { from } = await searchParams;
  const isWizard = from === "wizard";
  const ctx = { userId: session.user.id, role: session.user.role };
  const event = await EventService.getEventForDetail(id, ctx);

  if (!event) notFound();

  const [roomPricings, roomTypes] = await Promise.all([
    event.pricing_by_room_type ? EventService.getRoomPricings(id, ctx) : Promise.resolve([]),
    EventService.getRoomTypes(id, ctx),
  ]);

  // Load venue room types with occupancy pricings (for new UI)
  let venueRoomTypes: {
    id: string;
    name: string;
    description: string | null;
    capacity: number;
    has_private_bathroom: boolean;
    base_price: number | null;
    position: number;
    occupancy_pricings: { occupancy: number; price: number }[];
    roomCount: number;
  }[] = [];
  let venueId: string | null = null;

  if (event.venue_id) {
    venueId = event.venue_id;
    const venue = await db.venue.findFirst({
      where: { id: event.venue_id },
      include: {
        room_types: {
          orderBy: { position: "asc" },
          include: {
            occupancy_pricings: { orderBy: { occupancy: "asc" } },
            _count: { select: { rooms: { where: { event_id: id } } } },
          },
        },
      },
    });

    if (venue) {
      venueRoomTypes = venue.room_types.map((rt) => ({
        id: rt.id,
        name: rt.name,
        description: rt.description,
        capacity: rt.capacity,
        has_private_bathroom: rt.has_private_bathroom,
        base_price: rt.base_price != null ? Number(rt.base_price) : null,
        position: rt.position,
        occupancy_pricings: rt.occupancy_pricings.map((op) => ({
          occupancy: op.occupancy,
          price: Number(op.price),
        })),
        roomCount: rt._count.rooms,
      }));
    }
  }

  return (
    <div className="min-h-screen bg-surface">
      <div className="mx-auto max-w-3xl px-4 py-10">
        {isWizard && <WizardStepper steps={STEPS} currentStep={2} />}

        {isWizard && (
          <div className="mb-6">
            <h1 className="text-2xl font-bold text-gray-900">{event.name}</h1>
            <p className="mt-1 text-sm text-gray-500">Detalles opcionales del evento</p>
          </div>
        )}

        {!isWizard && (
          <div className="mb-6 flex flex-wrap gap-2">
            {[
              { href: `/events/${id}/board`, label: "Tablero", icon: "dashboard" },
              { href: `/events/${id}/kitchen`, label: "Informe cocina", icon: "restaurant" },
              { href: `/events/${id}/collaborators`, label: "Co-organizadores", icon: "group" },
              { href: `/events/${id}/schedule`, label: "Programa", icon: "calendar_month" },
              { href: `/events/${id}/reception`, label: "Recepción", icon: "how_to_reg" },
            ].map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className="flex items-center gap-1 rounded-lg border border-primary/30 bg-primary/5 px-3 py-2 text-sm text-primary hover:bg-primary/10"
              >
                <span className="material-symbols-outlined text-base">{link.icon}</span>
                {link.label}
              </Link>
            ))}
          </div>
        )}

        <EventDetailForm
          isWizard={isWizard}
          venueId={venueId}
          venueRoomTypes={venueRoomTypes}
          event={{
            id: event.id,
            name: event.name,
            description: event.description,
            location: event.location,
            image_url: event.image_url,
            date_start: event.date_start.toISOString(),
            date_end: event.date_end.toISOString(),
            estimated_participants: event.estimated_participants,
            roomCount: event.roomCount,
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
            meal_cost_breakfast: event.meal_cost_breakfast ? Number(event.meal_cost_breakfast) : null,
            meal_cost_lunch: event.meal_cost_lunch ? Number(event.meal_cost_lunch) : null,
            meal_cost_dinner: event.meal_cost_dinner ? Number(event.meal_cost_dinner) : null,
            room_types: roomTypes.map((rt) => {
              const pricing = roomPricings.find(
                (rp) => rp.capacity === rt.capacity && rp.has_private_bathroom === rt.hasPrivateBathroom
              );
              return {
                ...rt,
                price: pricing ? Number(pricing.price) : undefined,
                dailyRate: pricing?.daily_rate ? Number(pricing.daily_rate) : undefined,
              };
            }),
          }}
        />

      </div>
    </div>
  );
}
