import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { notFound } from "next/navigation";
import { EventService } from "@/lib/services/event.service";
import { EventDetailForm } from "@/components/event-detail-form";
import { WizardStepper } from "@/components/wizard-stepper";

const STEPS = [
  { label: "Datos" },
  { label: "Habitaciones" },
  { label: "Detalles" },
];

export default async function DetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const { id } = await params;
  const event = await EventService.getEventForDetail(id, session.user.id);

  if (!event) notFound();

  return (
    <div className="min-h-screen bg-surface">
      <div className="mx-auto max-w-3xl px-4 py-10">
        <WizardStepper steps={STEPS} currentStep={2} />

        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900">{event.name}</h1>
          <p className="mt-1 text-sm text-gray-500">
            Detalles opcionales del evento
          </p>
        </div>

        <EventDetailForm
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
          }}
        />
      </div>
    </div>
  );
}
