import { notFound, redirect } from "next/navigation";
import { getMyEventDetail, getEventSchedule } from "@/lib/actions/participant";
import { joinEvent } from "@/lib/actions/participant";
import { MyEventDetail } from "@/components/participant/my-event-detail";

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

  return (
    <MyEventDetail
      eventPerson={eventPerson}
      schedule={schedule}
    />
  );
}
