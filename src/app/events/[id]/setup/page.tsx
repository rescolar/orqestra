import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { RoomSetupForm } from "@/components/room-setup-form";
import { WizardStepper } from "@/components/event/wizard-stepper";

const STEPS = [
  { label: "Datos" },
  { label: "Habitaciones" },
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
      _count: { select: { rooms: true } },
    },
  });

  if (!event) notFound();

  // If rooms already exist, go straight to board
  if (event._count.rooms > 0) redirect(`/events/${id}/board`);

  return (
    <div className="min-h-screen bg-surface">
      <div className="mx-auto max-w-3xl px-4 py-10">
        <WizardStepper steps={STEPS} currentStep={1} />

        {/* Header */}
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900">{event.name}</h1>
          <p className="mt-1 text-sm text-gray-500">
            Participantes estimados: {event.estimated_participants}
          </p>
        </div>

        <RoomSetupForm
          eventId={event.id}
          estimatedParticipants={event.estimated_participants}
        />
      </div>
    </div>
  );
}
