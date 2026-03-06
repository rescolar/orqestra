import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { notFound } from "next/navigation";
import { ReceptionService } from "@/lib/services/reception.service";
import { ReceptionClient } from "@/components/reception/reception-client";

export default async function ReceptionPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const { id } = await params;

  try {
    const { event, participants } = await ReceptionService.getReceptionData(
      id,
      session.user.id
    );

    return (
      <ReceptionClient
        eventId={id}
        eventName={event.name}
        dateStart={event.date_start}
        dateEnd={event.date_end}
        initialParticipants={participants}
      />
    );
  } catch {
    notFound();
  }
}
