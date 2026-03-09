import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { notFound } from "next/navigation";
import { ReceptionService } from "@/lib/services/reception.service";
import { ReceptionPrintClient } from "@/components/reception/reception-print-client";

export default async function ReceptionPrintPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const { id } = await params;

  try {
    const { event, participants, rooms, pricing } =
      await ReceptionService.getReceptionPrintData(id, { userId: session.user.id, role: session.user.role });

    return (
      <ReceptionPrintClient
        eventId={id}
        eventName={event.name}
        dateStart={event.date_start}
        dateEnd={event.date_end}
        participants={participants}
        rooms={rooms}
        pricing={pricing}
      />
    );
  } catch {
    notFound();
  }
}
