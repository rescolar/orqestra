import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { SetupStepClient } from "@/components/event/setup-step-client";
import { WizardStepper } from "@/components/event/wizard-stepper";

const STEPS = [
  { label: "Datos" },
  { label: "Centro" },
  { label: "Detalles" },
];

export default async function SetupPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const { id } = await params;
  const event = await db.event.findFirst({
    where: { id, user_id: session.user.id },
    select: {
      id: true,
      name: true,
      estimated_participants: true,
      date_start: true,
      date_end: true,
      location: true,
      event_price: true,
      deposit_amount: true,
      pricing_by_room_type: true,
      pricing_mode: true,
      facilitation_cost_day: true,
      management_cost_day: true,
      meal_cost_breakfast: true,
      meal_cost_lunch: true,
      meal_cost_dinner: true,
      venue_id: true,
      _count: { select: { rooms: true } },
    },
  });

  if (!event) notFound();

  const hasExistingRooms = event._count.rooms > 0;

  // Load existing room types if event has a venue
  let initialRoomTypes: {
    name: string;
    description: string | null;
    capacity: number;
    has_private_bathroom: boolean;
    base_price: number | null;
    occupancy_pricings: { occupancy: number; price: number }[];
  }[] = [];
  let initialQuantities: Record<string, number> = {};

  if (event.venue_id && hasExistingRooms) {
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
      initialRoomTypes = venue.room_types.map((rt) => ({
        name: rt.name,
        description: rt.description,
        capacity: rt.capacity,
        has_private_bathroom: rt.has_private_bathroom,
        base_price: rt.base_price != null ? Number(rt.base_price) : null,
        occupancy_pricings: rt.occupancy_pricings.map((op) => ({
          occupancy: op.occupancy,
          price: Number(op.price),
        })),
      }));
      // Count rooms per type
      venue.room_types.forEach((rt, idx) => {
        initialQuantities[String(idx)] = rt._count.rooms;
      });
    }
  }

  return (
    <div className="min-h-screen bg-surface">
      <div className="mx-auto max-w-3xl px-4 py-10">
        <WizardStepper steps={STEPS} currentStep={1} />

        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900">{event.name}</h1>
          <p className="mt-1 text-sm text-gray-500">
            Configura el centro, habitaciones y precios
          </p>
        </div>

        <SetupStepClient
          event={{
            id: event.id,
            name: event.name,
            estimated_participants: event.estimated_participants,
            date_start: event.date_start.toISOString(),
            date_end: event.date_end.toISOString(),
            location: event.location,
            event_price: event.event_price ? Number(event.event_price) : null,
            deposit_amount: event.deposit_amount ? Number(event.deposit_amount) : null,
            pricing_by_room_type: event.pricing_by_room_type,
            pricing_mode: event.pricing_mode,
            facilitation_cost_day: event.facilitation_cost_day ? Number(event.facilitation_cost_day) : null,
            management_cost_day: event.management_cost_day ? Number(event.management_cost_day) : null,
            meal_cost_breakfast: event.meal_cost_breakfast ? Number(event.meal_cost_breakfast) : null,
            meal_cost_lunch: event.meal_cost_lunch ? Number(event.meal_cost_lunch) : null,
            meal_cost_dinner: event.meal_cost_dinner ? Number(event.meal_cost_dinner) : null,
          }}
          hasExistingRooms={hasExistingRooms}
          initialRoomTypes={initialRoomTypes}
          initialQuantities={initialQuantities}
        />
      </div>
    </div>
  );
}
