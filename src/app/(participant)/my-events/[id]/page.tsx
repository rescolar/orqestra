import { notFound, redirect } from "next/navigation";
import { getMyEventDetail, getEventSchedule, getDiscoverableParticipants, getAccommodationOptions } from "@/lib/actions/participant";
import { joinEvent } from "@/lib/actions/participant";
import { MyEventDetail } from "@/components/participant/my-event-detail";
import { db } from "@/lib/db";

export default async function MyEventDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  let eventPerson = await getMyEventDetail(id);

  // If not joined yet, auto-join on visit
  if (!eventPerson) {
    await joinEvent(id);
    eventPerson = await getMyEventDetail(id);
    if (!eventPerson) notFound();
  }

  let schedule;
  try {
    schedule = await getEventSchedule(id);
  } catch {
    // No schedule available
  }

  const [event, discoverable] = await Promise.all([
    db.event.findFirst({
      where: { id },
      select: { schedule_confirmed: true, participant_discovery: true, show_accommodation: true, show_availability: true },
    }),
    getDiscoverableParticipants(id),
  ]);

  const accommodationOptions = event?.show_accommodation
    ? await getAccommodationOptions(id)
    : [];

  return (
    <MyEventDetail
      eventPerson={eventPerson}
      schedule={schedule}
      scheduleConfirmed={event?.schedule_confirmed ?? false}
      discoverableParticipants={event?.participant_discovery ? discoverable : []}
      accommodationOptions={accommodationOptions}
      showAvailability={event?.show_availability ?? false}
    />
  );
}
