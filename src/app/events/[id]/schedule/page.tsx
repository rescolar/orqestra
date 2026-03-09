import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { ScheduleService } from "@/lib/services/schedule.service";
import { ScheduleClient } from "@/components/schedule/schedule-client";

export default async function SchedulePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const { id } = await params;

  const event = await db.event.findFirst({
    where: { id, user_id: session.user.id },
    select: { id: true, name: true, date_start: true, date_end: true, schedule_confirmed: true },
  });
  if (!event) notFound();

  const [schedule, totalConfirmedParticipants] = await Promise.all([
    ScheduleService.getSchedule(id, session.user.id),
    db.eventPerson.count({ where: { event_id: id, status: { not: "cancelado" } } }),
  ]);

  return (
    <div className="flex h-screen flex-col overflow-hidden bg-surface">
      <ScheduleClient
        eventId={event.id}
        eventName={event.name}
        dateStart={event.date_start}
        dateEnd={event.date_end}
        initialSchedule={schedule}
        scheduleConfirmed={event.schedule_confirmed}
        totalConfirmedParticipants={totalConfirmedParticipants}
      />
    </div>
  );
}
