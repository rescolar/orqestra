import { getAllEvents } from "@/lib/actions/admin";
import { EventsTable } from "@/components/admin/events-table";

export default async function AdminEventsPage() {
  const events = await getAllEvents();

  return (
    <div className="mx-auto max-w-7xl px-6 py-8">
      <h1 className="text-2xl font-bold text-gray-900 mb-6">Todos los eventos</h1>
      <EventsTable events={events} />
    </div>
  );
}
