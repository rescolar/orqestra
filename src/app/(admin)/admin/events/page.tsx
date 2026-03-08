import { getAllEvents, getAllUsers } from "@/lib/actions/admin";
import { AdminEventsPageClient } from "@/components/admin/admin-events-page-client";

export default async function AdminEventsPage() {
  const [events, users] = await Promise.all([
    getAllEvents(),
    getAllUsers(),
  ]);

  const organizers = users.map((u) => ({
    id: u.id,
    name: u.name,
    email: u.email,
  }));

  return (
    <div className="mx-auto max-w-7xl px-6 py-8">
      <h1 className="text-2xl font-bold text-gray-900 mb-6">Todos los eventos</h1>
      <AdminEventsPageClient initialEvents={events} organizers={organizers} />
    </div>
  );
}
