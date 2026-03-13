import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { notFound } from "next/navigation";
import Link from "next/link";
import { EventService } from "@/lib/services/event.service";
import { CollabService } from "@/lib/services/collab.service";
import { EventDetailForm } from "@/components/event/event-detail-form";
import { CollaboratorsSection } from "@/components/event/collaborators-section";
import { DiscoveryToggle } from "@/components/event/discovery-toggle";
import { WizardStepper } from "@/components/event/wizard-stepper";

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

  const [collaborators, roomPricings, roomTypes] = await Promise.all([
    event.isOwner ? CollabService.getCollaborators(id) : Promise.resolve([]),
    event.pricing_by_room_type ? EventService.getRoomPricings(id, ctx) : Promise.resolve([]),
    EventService.getRoomTypes(id, ctx),
  ]);

  return (
    <div className="min-h-screen bg-surface">
      <div className="mx-auto max-w-3xl px-4 py-10">
        {isWizard && <WizardStepper steps={STEPS} currentStep={2} />}

        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900">{event.name}</h1>
          <p className="mt-1 text-sm text-gray-500">
            {isWizard ? "Detalles opcionales del evento" : "Editar evento"}
          </p>
          {!isWizard && (
            <div className="mt-3 flex flex-wrap gap-2">
              {[
                { href: `/events/${id}/kitchen`, label: "Informe cocina" },
                { href: `/events/${id}/detail#collaborators`, label: "Co-organizadores" },
                { href: `/events/${id}/schedule`, label: "Programa" },
                { href: `/events/${id}/reception`, label: "Recepción" },
              ].map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  className="rounded-full border border-gray-200 px-3 py-1 text-xs font-medium text-gray-600 transition-colors hover:border-primary/30 hover:bg-primary/5 hover:text-primary"
                >
                  {link.label}
                </Link>
              ))}
            </div>
          )}
        </div>

        <EventDetailForm
          isWizard={isWizard}
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
            room_pricings: roomPricings.map((rp) => ({
              capacity: rp.capacity,
              has_private_bathroom: rp.has_private_bathroom,
              price: Number(rp.price),
              daily_rate: rp.daily_rate ? Number(rp.daily_rate) : null,
            })),
            meal_cost_breakfast: event.meal_cost_breakfast ? Number(event.meal_cost_breakfast) : null,
            meal_cost_lunch: event.meal_cost_lunch ? Number(event.meal_cost_lunch) : null,
            meal_cost_dinner: event.meal_cost_dinner ? Number(event.meal_cost_dinner) : null,
            room_types: roomTypes,
          }}
        />

        <div id="collaborators" className="mt-8 space-y-6 rounded-2xl border bg-white p-6">
          <CollaboratorsSection
            eventId={id}
            collaborators={collaborators}
            isOwner={event.isOwner}
          />
          {event.isOwner && (
            <DiscoveryToggle
              eventId={id}
              initial={event.participant_discovery}
            />
          )}
        </div>
      </div>
    </div>
  );
}
