import { getMyEvents } from "@/lib/actions/participant";
import { MyEventsList } from "@/components/participant/my-events-list";

export default async function MyEventsPage() {
  const events = await getMyEvents();

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-gray-900">Mis Eventos</h1>
      <MyEventsList events={events} />
    </div>
  );
}
