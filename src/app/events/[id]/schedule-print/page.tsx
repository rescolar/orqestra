import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { ScheduleService } from "@/lib/services/schedule.service";
import { SchedulePrintClient } from "@/components/schedule/schedule-print-client";

export default async function SchedulePrintPage({
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
      date_start: true,
      date_end: true,
      schedule_confirmed: true,
    },
  });
  if (!event) notFound();

  const [printData, confirmedCount] = await Promise.all([
    ScheduleService.getSchedulePrintData(id, session.user.id),
    db.eventPerson.count({ where: { event_id: id, status: "confirmed" } }),
  ]);

  return (
    <SchedulePrintClient
      eventId={event.id}
      eventName={event.name}
      dateStart={event.date_start}
      dateEnd={event.date_end}
      scheduleConfirmed={event.schedule_confirmed}
      schedule={printData}
      confirmedParticipants={confirmedCount}
    />
  );
}
